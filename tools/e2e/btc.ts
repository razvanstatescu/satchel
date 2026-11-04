/**
 * BTC e2e (kb/90 §12.4): a 2-input testnet4 P2WPKH send from Satchel #N. One `sign_for` carries both BIP143
 * preimages; the contract fans out one MPC `sign` receipt per input (never two in one receipt). The script attaches
 * the signatures (strict low-S verify), checks the txid did not change, and broadcasts to mempool.space/testnet4.
 * The builder refuses any txid an existing record already references (R-05, INV-32).
 * `--fanout` (R-14) sends one output per leg in sequence, chaining the unconfirmed change.
 *
 *   pnpm --filter @satchel/tools e2e:btc                       # dry run: 2 largest UTXOs of #1 swept back to #1
 *   pnpm --filter @satchel/tools e2e:btc --to final#2 --amount 30000 --send
 *   pnpm --filter @satchel/tools e2e:btc --fanout --preset funding --sets final   # dry run of the Day-5 fan-out
 */
import {
  attachBtcSignatures,
  buildBtcSend,
  btcTxUrl,
  MempoolClient,
  referencedTxids,
  testnet4FeeRate,
  type BuiltBtcSend,
  type Utxo,
} from '@satchel/core/chains/btc'
import { toHex } from '@satchel/core/bytes'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, parseTargets, readAllRecords, readSatchel, signaturesFrom, signForPlan } from './common'
import { evenLegs, fundingLegs, legsTotal, type FanoutLeg } from './funding'

const OPTIONS = {
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  to: { type: 'string' },
  amount: { type: 'string', default: 'max' },
  inputs: { type: 'string', default: '2' },
  'fee-rate': { type: 'string' },
  utxo: { type: 'string', multiple: true },
  fanout: { type: 'boolean', default: false },
  targets: { type: 'string' },
  preset: { type: 'string' },
  sets: { type: 'string' },
  'amount-each': { type: 'string' },
  'sign-only': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/btc.ts: testnet4 send from a Satchel via one multi-input sign_for.
  --token <id>         source Satchel (default 1)          --owner <acct>  signer (default: on-chain owner, else alice)
  --to <tb1…|set#id>   recipient (default: the Satchel's own address = consolidation)
  --amount <sats|max>  default max (sweep the chosen inputs)   --inputs <n>  exactly n inputs (default 2; 0 = coin selection)
  --fee-rate <sat/vB>  default max(2, halfHourFee)        --utxo txid:vout:sats[:u]  (repeatable; required with --offline)
  --sign-only          sign_for + strict low-S verify + txid check, print the raw tx, do not broadcast
                       (with --utxo it works unfunded: the MPC signs any preimage the contract accepts)
  --fanout             one send per leg: --targets "final#1-7" --amount-each 50000, or --preset funding [--sets final,rc,dev1]
${HELP_COMMON}`

export function parseUtxoFlag(s: string): Utxo {
  const m = /^([0-9a-fA-F]{64}):(\d+):(\d+)(:u)?$/.exec(s)
  if (!m) throw new Error(`--utxo must be txid:vout:sats[:u], got ${s}`)
  return { txid: m[1]!.toLowerCase(), vout: Number(m[2]), value: BigInt(m[3]!), confirmed: !m[4] }
}

/** Exactly n inputs, largest first (the 2-input e2e). n = 0 → let the builder select. */
export function pickInputs(utxos: Utxo[], n: number, allowUnconfirmed = false): Utxo[] | undefined {
  if (n === 0) return undefined
  const pool = utxos.filter((u) => allowUnconfirmed || u.confirmed).sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1))
  if (pool.length < n) throw new Error(`need ${n} ${allowUnconfirmed ? '' : 'confirmed '}UTXOs, the address has ${pool.length}`)
  return pool.slice(0, n)
}

/** After a (planned) send: drop the spent inputs and add our change as an unconfirmed UTXO (fan-out chaining). */
export function simulateSpend(utxos: Utxo[], built: Pick<BuiltBtcSend, 'txid' | 'inputOutpoints' | 'changeIndex' | 'change'>): Utxo[] {
  const spent = new Set(built.inputOutpoints)
  const left = utxos.filter((u) => !spent.has(`${u.txid}:${u.vout}`))
  if (built.changeIndex !== null && built.change > 0n) left.push({ txid: built.txid, vout: built.changeIndex, value: built.change, confirmed: false })
  return left
}

export function describeBtc(b: BuiltBtcSend): string[] {
  return [
    `    inputs    ${b.inputOutpoints.join(', ')}`,
    `    outputs   ${b.tx.outputs.map((o, i) => `${i}: ${o.value} sats → ${o.address ?? toHex(o.script)}${i === b.changeIndex ? ' (change)' : ''}`).join(' · ')}`,
    `    fee       ${b.fee} sats, vsize ${b.vsize}${b.perturbations.length ? `, perturbed: ${b.perturbations.join(', ')}` : ''}`,
    `    txid      ${b.txid} (unsigned; must not change after signing)`,
    `    payloads  ${b.payloads.map(toHex).join(', ')}`,
  ]
}

async function forbiddenFor(ctx: Ctx, tokenId: string, contract?: string): Promise<Set<string>> {
  const s = await readSatchel(ctx, tokenId, contract)
  if (!s || s.sig_count === 0) return new Set()
  return referencedTxids(await readAllRecords(ctx, tokenId, s.sig_count, contract))
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/btc')
  const token = str(v, 'token')!
  const a = addressesOf(ctx.cfg, token)
  const owner = str(v, 'owner') ?? (await ownerOr(ctx, token, ctx.cfg.personas.alice))
  const from = { address: a.btc, pubkey: a.btcPubkey }
  ctx.log(`    from      #${token} ${a.btc} (pubkey ${a.btcPubkey}); signer ${owner}`)

  let legs: FanoutLeg[]
  if (bool(v, 'fanout')) {
    if (str(v, 'preset') === 'funding') legs = fundingLegs(ctx.cfg, 'btc', str(v, 'sets')?.split(','))
    else if (str(v, 'targets') && str(v, 'amount-each')) legs = evenLegs(parseTargets(ctx.cfg, str(v, 'targets')!, 'btc'), BigInt(str(v, 'amount-each')!))
    else throw new Error('--fanout needs --preset funding or --targets … --amount-each …')
    legs = legs.filter((l) => l.address !== a.btc)
  } else {
    const to = str(v, 'to') ? parseTargets(ctx.cfg, str(v, 'to')!, 'btc')[0]! : { address: a.btc, label: `self (#${token})` }
    const amt = str(v, 'amount')!
    legs = [{ ...to, amount: amt === 'max' ? -1n : BigInt(amt) }]
  }
  const fanout = bool(v, 'fanout')

  const mempool = ctx.offline ? null : new MempoolClient({ primary: ctx.cfg.btcApis[0], fallbacks: ctx.cfg.btcApis.slice(1) })
  let utxos: Utxo[] = (v.utxo as string[] | undefined)?.map(parseUtxoFlag) ?? []
  let feeRate = Number(str(v, 'fee-rate') ?? '2')
  if (mempool) {
    if (utxos.length === 0) utxos = (await mempool.utxos(a.btc)).map((u) => ({ txid: u.txid, vout: u.vout, value: BigInt(u.value), confirmed: u.status.confirmed }))
    if (!str(v, 'fee-rate')) feeRate = testnet4FeeRate(await mempool.fees())
  } else if (utxos.length === 0) throw new Error('--offline needs --utxo txid:vout:sats (repeatable)')
  const total = utxos.reduce((s, u) => s + u.value, 0n)
  ctx.log(`    utxos     ${utxos.length} (${total} sats; ${utxos.filter((u) => u.confirmed).length} confirmed); fee rate ${feeRate} sat/vB`)
  if (fanout) ctx.log(`    legs      ${legs.length}, total ${legsTotal(legs)} sats`)

  const forbidden = await forbiddenFor(ctx, token)
  ctx.log(`    records   ${forbidden.size} txid(s) referenced by #${token}'s records are forbidden`)

  for (const [i, leg] of legs.entries()) {
    const recipientForbidden = leg.contract && leg.tokenId ? await forbiddenFor(ctx, leg.tokenId, leg.contract) : new Set<string>()
    const nInputs = fanout ? 0 : Number(str(v, 'inputs'))
    const inputs = pickInputs(utxos, nInputs, fanout)
    const built = buildBtcSend({
      from,
      to: leg.address,
      amount: leg.amount < 0n ? 'max' : leg.amount,
      utxos,
      feeRate,
      forbiddenTxids: [...forbidden, ...recipientForbidden],
      ...(inputs ? { inputs } : {}),
      allowUnconfirmed: fanout,
    })
    ctx.log(`\n-- leg ${i + 1}/${legs.length}: ${built.amount} sats → ${leg.label} ${leg.address}`)
    describeBtc(built).forEach((l) => ctx.log(l))
    describeSignRequest(token, built.signRequest).forEach((l) => ctx.log(l))
    const sent = await executePlan(ctx, signForPlan(ctx.cfg, owner, token, built.signRequest, `sign_for #${token} BTC ${built.preimages.length} input(s) → ${leg.label}`))
    if (sent) {
      const signed = attachBtcSignatures(built.tx, signaturesFrom(sent, built.preimages.length), built.pubkey)
      expect(ctx, signed.txid === built.txid, `signed txid ${signed.txid} == the txid computed before signing`)
      if (bool(v, 'sign-only')) {
        ctx.log(`    signed    ${signed.hex}\n    note      --sign-only: not broadcast`)
        utxos = simulateSpend(utxos, built)
        continue
      }
      const txid = await mempool!.broadcast(signed.hex)
      expect(ctx, txid === built.txid, `mempool accepted ${txid}`)
      ctx.log(`    broadcast ${btcTxUrl(txid)} (vsize ${signed.vsize})`)
    }
    utxos = simulateSpend(utxos, built)
  }
}

if (isMain(import.meta.url)) runMain(main)
