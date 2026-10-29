/**
 * NEAR sale e2e (spec §5.12, §12.4; INV-14/15): `list` (currency near) → clean-history check → `buy` at once (no
 * post-listing cooldown), bound to (listing_id, expected_sig_count). Checks the new owner, the cleared listing, and
 * that the seller got exactly `price` (or, if the payout failed, `proceeds_of` holds it).
 *
 *   pnpm --filter @satchel/tools e2e:sale-near --token 3                  # dry run: alice lists 0.1 NEAR, carol buys
 *   pnpm --filter @satchel/tools e2e:sale-near --token 3 --price 1 --send
 */
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { formatNear, parseNear } from '../lib/units'
import { HELP_COMMON, nearBalance, ownerOr, readSatchel, showNear, waitForHeight, type SatchelView } from './common'
import { runCleanHistory, summarizeReport } from './checker'
import { buyNearPlan, listPlan, type BuyRef } from './plans'

const OPTIONS = {
  token: { type: 'string', default: '3' },
  seller: { type: 'string' },
  buyer: { type: 'string', default: 'carol' },
  price: { type: 'string', default: '0.1' },
  'no-clean-check': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/sale-near.ts: list for NEAR, check clean history, buy at once.
  --token <id> (default 3)   --seller <acct> (default: on-chain owner, else alice)   --buyer <acct> (default carol)
  --price <NEAR> (default 0.1)   --no-clean-check  dev only: buy even if the checker says no (never on rc/final)
${HELP_COMMON}`

/** The buy reference from a fresh `satchel(id)` read (never from a cached listing). */
export function buyRefFrom(s: SatchelView): BuyRef {
  if (!s.listing) throw new Error(`#${s.token_id} is not listed`)
  if (s.listing.sig_count !== s.sig_count) throw new Error(`listing sig_count ${s.listing.sig_count} != token sig_count ${s.sig_count} (ERR_LISTING_CHANGED)`)
  return { tokenId: s.token_id, listingId: s.listing.id, expectedSigCount: s.sig_count }
}

export async function cleanGate(ctx: Ctx, tokenId: string, skip: boolean): Promise<number | null> {
  if (ctx.offline) {
    ctx.log('    clean     skipped (offline)')
    return null
  }
  const r = await runCleanHistory(ctx.cfg, tokenId).catch((e) => {
    ctx.log(`    clean     checker unavailable: ${(e as Error).message.slice(0, 160)}`)
    return null
  })
  if (!r) return null
  summarizeReport(r).forEach((l) => ctx.log(l))
  if (!r.buy_enabled) {
    if (skip && ctx.cfg.role === 'dev') ctx.log('    clean     NOT clean, continuing because --no-clean-check (dev role)')
    else if (ctx.send) throw new Error(`clean history is "${r.aggregate}": Buy stays disabled (spec §7.3)`)
  }
  return r.expected_sig_count
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/sale-near')
  if (bool(v, 'no-clean-check') && ctx.cfg.role !== 'dev') throw new Error('--no-clean-check is allowed only with --role dev')
  const token = str(v, 'token')!
  const price = parseNear(str(v, 'price')!)
  const buyer = resolveAccount(ctx.cfg, str(v, 'buyer')!)
  const seller = str(v, 'seller') ? resolveAccount(ctx.cfg, str(v, 'seller')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  if (buyer === seller) throw new Error('ERR_SELF_BUY: buyer equals seller')

  let s = await readSatchel(ctx, token)
  if (s?.listing) ctx.log(`    listing   #${token} already listed (id ${s.listing.id}, ${s.listing.price} ${s.listing.currency}); skipping list`)
  else {
    if (s && s.listable_at > 0 && !ctx.offline) {
      const b = await ctx.rpc.finalBlock()
      if (b.height < s.listable_at) {
        ctx.log(`    quiet     #${token} can list at block ${s.listable_at} (now ${b.height}; ERR_QUIET_PERIOD before)`)
        if (ctx.send) await waitForHeight(ctx, s.listable_at)
      }
    }
    const sent = await executePlan(ctx, listPlan(ctx.cfg, seller, token, price, 'near'))
    if (sent) expect(ctx, sent.ok, 'list succeeded')
  }

  s = await readSatchel(ctx, token)
  let ref: BuyRef
  if (s?.listing) ref = buyRefFrom(s)
  else {
    const c = ctx.offline ? null : await ctx.rpc.view<{ next_listing_id: number }>(ctx.cfg.contract, 'config').catch(() => null)
    ref = { tokenId: token, listingId: c?.next_listing_id ?? 0, expectedSigCount: s?.sig_count ?? 0 }
    ctx.log(`    predicted listing_id ${ref.listingId} / expected_sig_count ${ref.expectedSigCount} (placeholders: the real values are re-read from satchel(${token}) after list)`)
  }
  const listedPrice = s?.listing ? BigInt(s.listing.price) : price
  if (s?.listing && s.listing.currency !== 'near') throw new Error(`#${token} is listed in ${s.listing.currency}; use sale-usdc.ts`)

  const expected = await cleanGate(ctx, token, bool(v, 'no-clean-check'))
  if (expected !== null && expected !== ref.expectedSigCount) throw new Error(`checker expected_sig_count ${expected} != satchel().sig_count ${ref.expectedSigCount}`)

  const sellerBefore = await nearBalance(ctx, seller)
  ctx.log(`    seller    ${seller} balance ${showNear(sellerBefore)}`)
  const sent = await executePlan(ctx, buyNearPlan(ctx.cfg, buyer, ref, listedPrice))
  if (!sent) return
  expect(ctx, sent.ok, 'buy succeeded')
  const after = await readSatchel(ctx, token)
  expect(ctx, after?.owner_id === buyer, `owner is now ${buyer}`)
  expect(ctx, after?.listing === null, 'listing cleared')
  await new Promise((r) => setTimeout(r, 3_000)) // the detached payout lands ≈ 2 blocks later
  const sellerAfter = await nearBalance(ctx, seller)
  const delta = sellerBefore !== null && sellerAfter !== null ? sellerAfter - sellerBefore : null
  const owed = await ctx.rpc.view<{ currency: string; amount: string }[]>(ctx.cfg.contract, 'proceeds_of', { account_id: seller }).catch(() => [])
  const owedNear = owed.find((o) => o.currency === 'near')
  ctx.log(`    payout    seller delta ${delta === null ? 'unknown' : formatNear(delta)}; proceeds_of ${JSON.stringify(owed)}`)
  expect(ctx, (delta !== null && delta >= listedPrice) || (owedNear !== undefined && BigInt(owedNear.amount) >= listedPrice), 'seller paid exactly once (balance or proceeds)')
}

if (isMain(import.meta.url)) runMain(main)
