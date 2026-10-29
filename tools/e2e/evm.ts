/**
 * EVM e2e (spec §12.4): build a Sepolia type-2 transfer from Satchel #N's derived address, `sign_for` it on NEAR
 * (send_tx INCLUDED + long-poll), verify the MPC signature recovers to the Satchel address, broadcast, wait for the
 * receipt. `--fanout` (R-14) splits one balance across Satchel addresses, one sign_for per leg, sequential nonces.
 *
 *   pnpm --filter @satchel/tools e2e:evm                          # dry run, token 1 → itself, 0.0001 ETH
 *   pnpm --filter @satchel/tools e2e:evm --token 1 --to final#2 --value 0.001 --send
 *   pnpm --filter @satchel/tools e2e:evm --fanout --preset funding --sets final,rc   # dry run of the Day-5 fan-out
 */
import type { TransactionSerializableEIP1559 } from 'viem'
import {
  broadcastEvm,
  buildUnsignedEvmTx,
  createSepoliaClient,
  evmPayloadHash,
  finalizeEvmTx,
  sepoliaTxUrl,
  serializeUnsignedEvmTx,
  waitEvmReceipt,
  EVM_TRANSFER_GAS,
  estimateTransferGas,
} from '@satchel/core/chains/evm'
import { evmSignRequest } from '@satchel/core/near'
import { toHex } from '@satchel/core/bytes'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { formatUnits, parseUnits } from '../lib/units'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, parseTargets, signaturesFrom, signForPlan } from './common'
import { evenLegs, fundingLegs, legsTotal, type FanoutLeg } from './funding'

const OPTIONS = {
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  to: { type: 'string' },
  value: { type: 'string', default: '0.0001' },
  nonce: { type: 'string' },
  'max-fee-gwei': { type: 'string', default: '30' },
  'tip-gwei': { type: 'string', default: '1.5' },
  gas: { type: 'string' },
  fanout: { type: 'boolean', default: false },
  targets: { type: 'string' },
  preset: { type: 'string' },
  sets: { type: 'string' },
  'amount-each': { type: 'string' },
  'no-wait': { type: 'boolean', default: false },
  'sign-only': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/evm.ts: Sepolia send from a Satchel via sign_for.
  --token <id>          source Satchel (default 1)       --owner <acct>   signer (default: on-chain owner, else alice)
  --to <0x…|set#id>     recipient (default: the Satchel's own address)   --value <ETH> (default 0.0001)
  --nonce <n>           reuse a nonce (retry rule §8.7)
  --max-fee-gwei / --tip-gwei   fees used only with --offline
  --gas <n>             gas limit per leg (default: eth_estimateGas per recipient; 21000 offline). A transfer that
                        creates the recipient costs 204,600 on Sepolia since its 2026 fork
  --fanout              split across targets: --targets "final#1-7 rc#1+2" --amount-each 0.01, or --preset funding [--sets final,rc,dev1]
  --no-wait             do not wait for each receipt
  --sign-only           sign_for + verify the recovered address, print the raw tx, do not broadcast (works unfunded)
${HELP_COMMON}`

interface Fees {
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

export function buildLegTx(nonce: number, to: `0x${string}`, value: bigint, fees: Fees, gas: bigint = EVM_TRANSFER_GAS): { tx: TransactionSerializableEIP1559; unsigned: `0x${string}`; payload: string } {
  const tx = buildUnsignedEvmTx({ nonce, to, value, gas, ...fees })
  const unsigned = serializeUnsignedEvmTx(tx)
  return { tx, unsigned, payload: toHex(evmPayloadHash(unsigned)) }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/evm')
  const token = str(v, 'token')!
  const from = addressesOf(ctx.cfg, token).evm as `0x${string}`
  const owner = str(v, 'owner') ? str(v, 'owner')! : await ownerOr(ctx, token, ctx.cfg.personas.alice)

  let legs: FanoutLeg[]
  if (bool(v, 'fanout')) {
    if (str(v, 'preset') === 'funding') legs = fundingLegs(ctx.cfg, 'evm', str(v, 'sets')?.split(','))
    else if (str(v, 'targets') && str(v, 'amount-each')) legs = evenLegs(parseTargets(ctx.cfg, str(v, 'targets')!, 'evm'), parseUnits(str(v, 'amount-each')!, 'eth'))
    else throw new Error('--fanout needs --preset funding or --targets … --amount-each …')
    legs = legs.filter((l) => l.address.toLowerCase() !== from.toLowerCase())
  } else {
    const to = str(v, 'to') ? parseTargets(ctx.cfg, str(v, 'to')!, 'evm')[0]! : { address: from, label: `self (#${token})` }
    legs = [{ ...to, amount: parseUnits(str(v, 'value')!, 'eth') }]
  }
  ctx.log(`    from      #${token} ${from} (path satchel/${token}/evm on ${ctx.cfg.contract}); signer ${owner}`)
  ctx.log(`    legs      ${legs.length}, total ${formatUnits(legsTotal(legs), 'eth')} ETH`)

  const client = ctx.offline ? null : createSepoliaClient(ctx.cfg.sepoliaRpcs)
  let nonce: number
  let fees: Fees
  let gases: bigint[] = legs.map(() => (str(v, 'gas') ? BigInt(str(v, 'gas')!) : EVM_TRANSFER_GAS))
  if (client) {
    if (!str(v, 'gas')) gases = await Promise.all(legs.map((l) => estimateTransferGas(client, { from, to: l.address as `0x${string}` })))
    const [n, f, bal] = await Promise.all([
      str(v, 'nonce') ? Promise.resolve(Number(str(v, 'nonce'))) : client.getTransactionCount({ address: from, blockTag: 'pending' }),
      client.estimateFeesPerGas(),
      client.getBalance({ address: from }),
    ])
    nonce = n
    fees = { maxFeePerGas: f.maxFeePerGas, maxPriorityFeePerGas: f.maxPriorityFeePerGas }
    const need = legsTotal(legs) + gases.reduce((a, g) => a + g, 0n) * fees.maxFeePerGas
    ctx.log(`    sepolia   balance ${formatUnits(bal, 'eth')} ETH, pending nonce ${n}, maxFee ${formatUnits(fees.maxFeePerGas, 'eth')} ETH/gas; worst-case need ${formatUnits(need, 'eth')} ETH${bal < need ? '  ← INSUFFICIENT' : ''}`)
    if (ctx.send && bal < need && !bool(v, 'sign-only')) throw new Error('insufficient Sepolia balance for all legs')
  } else {
    nonce = Number(str(v, 'nonce') ?? '0')
    fees = { maxFeePerGas: parseUnits(str(v, 'max-fee-gwei')!, 'eth') / 10n ** 9n, maxPriorityFeePerGas: parseUnits(str(v, 'tip-gwei')!, 'eth') / 10n ** 9n }
    ctx.log(`    offline   nonce ${nonce} and fees are placeholders (--nonce, --max-fee-gwei, --tip-gwei)`)
  }

  for (const [i, leg] of legs.entries()) {
    const built = buildLegTx(nonce + i, leg.address as `0x${string}`, leg.amount, fees, gases[i]!)
    ctx.log(`\n-- leg ${i + 1}/${legs.length}: ${formatUnits(leg.amount, 'eth')} ETH → ${leg.label} ${leg.address} (gas limit ${gases[i]})`)
    ctx.log(`    unsigned  ${built.unsigned}\n    keccak    ${built.payload}`)
    const request = evmSignRequest(built.unsigned)
    describeSignRequest(token, request).forEach((l) => ctx.log(l))
    const sent = await executePlan(ctx, signForPlan(ctx.cfg, owner, token, request, `sign_for #${token} EVM nonce ${nonce + i} → ${leg.label}`))
    if (!sent) continue
    await finishLeg(ctx, client!, built.tx, signaturesFrom(sent, 1)[0]!, from, bool(v, 'no-wait'), bool(v, 'sign-only'))
  }
}

async function finishLeg(ctx: Ctx, client: ReturnType<typeof createSepoliaClient>, tx: TransactionSerializableEIP1559, sig: Parameters<typeof finalizeEvmTx>[1], from: string, noWait: boolean, signOnly = false) {
  const fin = await finalizeEvmTx(tx, sig, from) // verify-before-broadcast
  expect(ctx, fin.from.toLowerCase() === from.toLowerCase(), `signature recovers to the Satchel address ${from}`)
  if (signOnly) return void ctx.log(`    signed    ${fin.signed}\n    note      --sign-only: not broadcast (the record stays unused until this nonce is spent)`)
  const b = await broadcastEvm(client, fin.signed)
  ctx.log(`    broadcast ${sepoliaTxUrl(b.hash)}${b.alreadyKnown ? ' (already known)' : ''}`)
  if (noWait) return
  const r = await waitEvmReceipt(client, b.hash, { confirmations: 1 })
  expect(ctx, r.status === 'success', `Sepolia receipt status success (block ${r.blockNumber})`)
}

if (isMain(import.meta.url)) runMain(main)
