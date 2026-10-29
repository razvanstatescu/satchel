/**
 * The scripted clean-history scenario (SAT-085, R-09; spec §12.4). Run it on rc with `--role rc` so the strict gate
 * applies (set SATCHEL_EXPECTED_CODE_HASH):
 *   1. sign an EVM tx WITHOUT broadcasting it, wait out the quiet period, list → checker says `blocked`, Buy disabled
 *   2. delist, broadcast the logged signature ("Broadcast now", rebuilt from sig_records only), wait 3 confirmations,
 *      relist → checker says `clean`
 *   3. buy with a stale expected_sig_count → ERR_LISTING_CHANGED; buy with the current pair → success
 *   4. separately (--btc-token): one BTC record of that token is `spent` at K = 1 (read-only)
 *
 *   pnpm --filter @satchel/tools e2e:clean-history --role rc --token 2 --btc-token 1            # dry run
 *   SATCHEL_EXPECTED_CODE_HASH=<H> pnpm --filter @satchel/tools e2e:clean-history --role rc --token 2 --send
 */
import { createSepoliaClient, broadcastEvm, finalizeEvmTx, parseUnsignedEvmTx, waitEvmReceipt, sepoliaTxUrl } from '@satchel/core/chains/evm'
import { evmSignRequest, signatureFromRecordView } from '@satchel/core/near'
import type { CleanHistoryReport } from '@satchel/core/clean-history'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { hasError } from '../lib/outcome'
import { parseNear, parseUnits } from '../lib/units'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, readAllRecords, readSatchel, signForPlan, waitForHeight } from './common'
import { runCleanHistory, summarizeReport } from './checker'
import { buildLegTx } from './evm'
import { buyNearPlan, delistPlan, listPlan, type BuyRef } from './plans'
import { buyRefFrom } from './sale-near'

const OPTIONS = {
  token: { type: 'string', default: '2' },
  'btc-token': { type: 'string' },
  seller: { type: 'string' },
  buyer: { type: 'string', default: 'carol' },
  price: { type: 'string', default: '0.1' },
  value: { type: 'string', default: '0.00001' },
} as const

const HELP = `tools/e2e/clean-history.ts: the rc clean-history scenario (blocked → settle → clean → state-bound buy).
  --token <id>      EVM scenario token (default 2 = rc #2)   --btc-token <id>  check one BTC record is spent (rc #1)
  --seller/--buyer  default on-chain owner / carol          --price <NEAR> (default 0.1)   --value <ETH> self-send (default 0.00001)
${HELP_COMMON}`

/** Expected verdict per step; the scenario fails loudly on anything else. */
export const EXPECT = { afterUnbroadcastSign: 'blocked', afterSettle: 'clean' } as const

export function assertAggregate(ctx: Ctx, r: CleanHistoryReport | null, want: CleanHistoryReport['aggregate'], step: string): void {
  if (!r) return void ctx.log(`    check     SKIP  ${step}: checker not run`)
  summarizeReport(r).forEach((l) => ctx.log(l))
  expect(ctx, r.aggregate === want, `${step}: aggregate ${r.aggregate} == ${want}`)
  expect(ctx, r.buy_enabled === (want === 'clean' || want === 'empty'), `${step}: Buy ${r.buy_enabled ? 'enabled' : 'disabled'}`)
}

/** A stale reference: one signature behind (the buy must fail ERR_LISTING_CHANGED). */
export const staleRef = (r: BuyRef): BuyRef => ({ ...r, expectedSigCount: Math.max(0, r.expectedSigCount - 1) })

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/clean-history')
  if (ctx.cfg.role === 'dev') ctx.log('    WARNING   role dev: lock/code checks are only warnings; run with --role rc for the real scenario')
  if (ctx.cfg.role !== 'dev' && !ctx.cfg.expectedCodeHash) ctx.log('    WARNING   SATCHEL_EXPECTED_CODE_HASH is unset: the strict gate will say "unsafe"')
  const token = str(v, 'token')!
  const seller = str(v, 'seller') ? resolveAccount(ctx.cfg, str(v, 'seller')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  const buyer = resolveAccount(ctx.cfg, str(v, 'buyer')!)
  const price = parseNear(str(v, 'price')!)
  const from = addressesOf(ctx.cfg, token).evm as `0x${string}`
  const client = ctx.offline ? null : createSepoliaClient(ctx.cfg.sepoliaRpcs)
  const check = async () => (ctx.offline ? null : runCleanHistory(ctx.cfg, token).catch((e) => (ctx.log(`    checker   ${(e as Error).message}`), null)))

  // ---- step 1: sign without broadcasting, list, expect blocked
  ctx.log('\n== step 1: sign an EVM tx and do NOT broadcast it')
  let s = await readSatchel(ctx, token)
  if (s?.listing) throw new Error(`#${token} is listed: delist it before the scenario`)
  const nonce = client ? await client.getTransactionCount({ address: from, blockTag: 'pending' }) : 0
  const fees = client ? await client.estimateFeesPerGas() : { maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n }
  const leg = buildLegTx(nonce, from, parseUnits(str(v, 'value')!, 'eth'), { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas })
  ctx.log(`    unsigned  ${leg.unsigned} (self-send, nonce ${nonce})`)
  describeSignRequest(token, evmSignRequest(leg.unsigned)).forEach((l) => ctx.log(l))
  const signed = await executePlan(ctx, signForPlan(ctx.cfg, seller, token, evmSignRequest(leg.unsigned), `sign_for #${token} EVM nonce ${nonce} (kept unbroadcast)`))
  if (signed) expect(ctx, signed.ok, 'sign_for succeeded (signature exists, NOT broadcast)')
  s = await readSatchel(ctx, token)
  if (ctx.send && s) await waitForHeight(ctx, s.listable_at)
  else ctx.log(`    quiet     list is possible at block ${s?.listable_at ?? 'last_sign_height + 250'} (≈ 140 s)`)
  const l1 = await executePlan(ctx, listPlan(ctx.cfg, seller, token, price, 'near'))
  if (l1) expect(ctx, l1.ok, 'list succeeded')
  if (ctx.send) assertAggregate(ctx, await check(), EXPECT.afterUnbroadcastSign, 'step 1')
  else ctx.log(`    expect    checker → ${EXPECT.afterUnbroadcastSign} (an unused nonce blocks Buy)`)

  // ---- step 2: delist, broadcast from the record, 3 confirmations, relist, expect clean
  ctx.log('\n== step 2: delist, "Broadcast now" from sig_records, 3 confirmations, relist')
  const d = await executePlan(ctx, delistPlan(ctx.cfg, seller, token))
  if (d) expect(ctx, d.ok, 'delist succeeded')
  if (ctx.send) {
    s = await readSatchel(ctx, token)
    const recs = await readAllRecords(ctx, token, s!.sig_count)
    const rec = recs[recs.length - 1]!
    if (!('evm' in rec.detail) || !rec.signature) throw new Error('last record is not a signed EVM record')
    const tx = parseUnsignedEvmTx(rec.detail.evm.unsigned_tx, rec.payload) // checks keccak(unsigned_tx) == payload
    const fin = await finalizeEvmTx(tx, signatureFromRecordView(rec.signature), from)
    const b = await broadcastEvm(client!, fin.signed)
    ctx.log(`    broadcast ${sepoliaTxUrl(b.hash)} (rebuilt from on-chain data only)`)
    await waitEvmReceipt(client!, b.hash, { confirmations: 4, timeoutMs: 300_000 })
  } else ctx.log('    would     rebuild the tx from sig_records (unsigned_tx + signature), broadcast it, wait for 4 blocks (latest − 3)')
  const l2 = await executePlan(ctx, listPlan(ctx.cfg, seller, token, price, 'near'))
  if (l2) expect(ctx, l2.ok, 'relist succeeded (no new signature, so no quiet period)')
  const report = ctx.send ? await check() : null
  if (ctx.send) assertAggregate(ctx, report, EXPECT.afterSettle, 'step 2')
  else ctx.log(`    expect    checker → ${EXPECT.afterSettle}`)

  // ---- step 3: stale buy fails, current buy succeeds
  ctx.log('\n== step 3: state-bound buy')
  s = await readSatchel(ctx, token)
  const ref: BuyRef = s?.listing ? buyRefFrom(s) : { tokenId: token, listingId: 0, expectedSigCount: (s?.sig_count ?? 0) + 1 }
  if (report && report.expected_sig_count !== ref.expectedSigCount) throw new Error('checker and satchel() disagree on sig_count')
  const stale = await executePlan(ctx, buyNearPlan(ctx.cfg, buyer, staleRef(ref), price))
  if (stale) expect(ctx, !stale.ok && hasError(stale.outcome, 'ERR_LISTING_CHANGED'), 'stale buy failed with ERR_LISTING_CHANGED')
  const good = await executePlan(ctx, buyNearPlan(ctx.cfg, buyer, ref, price))
  if (good) {
    expect(ctx, good.ok, 'buy with the current (listing_id, expected_sig_count) succeeded')
    expect(ctx, (await readSatchel(ctx, token))?.owner_id === buyer, `owner is now ${buyer}`)
  }

  // ---- step 4: BTC spent at K = 1 (read-only)
  const btcToken = str(v, 'btc-token')
  if (btcToken) {
    ctx.log(`\n== step 4: #${btcToken} has a BTC record that is spent at K = 1`)
    const r = ctx.offline ? null : await runCleanHistory(ctx.cfg, btcToken).catch(() => null)
    if (r) {
      summarizeReport(r).forEach((l) => ctx.log(l))
      const ok = r.items.some((i) => i.chain === 'btc' && i.status === 'spent')
      if (ctx.send) expect(ctx, ok, 'a BTC item is spent')
      else ctx.log(`    check     ${ok ? 'PASS' : 'not yet'}  a BTC item is spent (read-only)`)
    } else ctx.log('    check     SKIP  checker not run (offline or contract unreadable)')
  }
}

if (isMain(import.meta.url)) runMain(main)
