/**
 * USDC sale e2e (kb/90 §5.12, §12.4; SAT-073, R-10, INV-16) with Circle testnet USDC:
 *   0. preconditions: the contract is USDC-storage-registered; the seller too (else the payout is re-credited);
 *      the buyer holds ≥ price
 *   1. list (currency usdc)
 *   2. refund path A: ft_transfer_call with a WRONG listing_id → tx SuccessValue "0", buyer balance unchanged,
 *      token still listed by the seller
 *   3. refund path B: a direct ft_on_transfer call (not from USDC) → fails ERR_WRONG_TOKEN
 *   4. happy path (skip with --refund-only): clean-history gate → ft_transfer_call → SuccessValue = price, owner = buyer
 * If 2 or 3 fails, the final contract is born with `usdc: null` (H-26).
 *
 *   pnpm --filter @satchel/tools e2e:sale-usdc --token 3                   # dry run, price 5 USDC
 *   pnpm --filter @satchel/tools e2e:sale-usdc --token 3 --refund-only --send
 */
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { hasError, interpretFtTransferCall } from '../lib/outcome'
import { formatUnits, parseUnits } from '../lib/units'
import { HELP_COMMON, ownerOr, readSatchel } from './common'
import { buyRefFrom, cleanGate } from './sale-near'
import { buyUsdcPlan, directFtOnTransferPlan, listPlan, usdcStorageDepositPlan, type BuyRef } from './plans'

const OPTIONS = {
  token: { type: 'string', default: '3' },
  seller: { type: 'string' },
  buyer: { type: 'string', default: 'carol' },
  price: { type: 'string', default: '5' },
  'refund-only': { type: 'boolean', default: false },
  register: { type: 'boolean', default: false },
  'no-clean-check': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/sale-usdc.ts: USDC listing, the two refund paths, then the purchase.
  --token <id> (default 3)  --seller <acct>  --buyer <acct> (default carol)  --price <USDC> (default 5)
  --refund-only     stop after the refund paths (the H-26 test)
  --register        also send the USDC storage_deposit for the contract from <team>.testnet if it is missing
${HELP_COMMON}`

/** A wrong listing id that cannot be the live one. */
export const wrongRef = (r: BuyRef): BuyRef => ({ ...r, listingId: r.listingId + 1_000_000 })

async function ftBalance(ctx: Ctx, account: string): Promise<bigint | null> {
  if (ctx.offline) return null
  const b = await ctx.rpc.view<string>(ctx.cfg.usdc, 'ft_balance_of', { account_id: account }).catch(() => null)
  return b === null ? null : BigInt(b)
}

async function registered(ctx: Ctx, account: string): Promise<boolean | null> {
  if (ctx.offline) return null
  try {
    return (await ctx.rpc.view(ctx.cfg.usdc, 'storage_balance_of', { account_id: account })) !== null
  } catch {
    return null
  }
}

const usdc = (v: bigint | null) => (v === null ? 'unknown' : `${formatUnits(v, 'usdc')} USDC`)

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/sale-usdc')
  if (bool(v, 'no-clean-check') && ctx.cfg.role !== 'dev') throw new Error('--no-clean-check is allowed only with --role dev')
  const token = str(v, 'token')!
  const price = parseUnits(str(v, 'price')!, 'usdc')
  const buyer = resolveAccount(ctx.cfg, str(v, 'buyer')!)
  const seller = str(v, 'seller') ? resolveAccount(ctx.cfg, str(v, 'seller')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  ctx.log(`    usdc      ${ctx.cfg.usdc}; price ${usdc(price)}; seller ${seller}; buyer ${buyer}`)

  // 0. preconditions
  const contractReg = await registered(ctx, ctx.cfg.contract)
  ctx.log(`    pre       contract USDC-registered: ${contractReg ?? 'unknown'}; seller registered: ${(await registered(ctx, seller)) ?? 'unknown'}`)
  if (contractReg === false || ctx.offline) {
    if (contractReg === false) ctx.log('    pre       every ft_transfer_call to an unregistered receiver panics (kb/51 §TL;DR 3): register first')
    if (bool(v, 'register') || !ctx.send) await executePlan(ctx, usdcStorageDepositPlan(ctx.cfg, ctx.cfg.teamAccount, ctx.cfg.contract))
    else if (contractReg === false) throw new Error('the contract is not registered at USDC (pass --register)')
  }
  const buyerBefore = await ftBalance(ctx, buyer)
  ctx.log(`    pre       buyer balance ${usdc(buyerBefore)}`)
  if (ctx.send && (buyerBefore === null || buyerBefore < price)) throw new Error('buyer has less USDC than the price (faucet.circle.com, 20 USDC / 2 h)')

  // 1. list
  let s = await readSatchel(ctx, token)
  if (!s?.listing) {
    const sent = await executePlan(ctx, listPlan(ctx.cfg, seller, token, price, 'usdc'))
    if (sent) expect(ctx, sent.ok, 'list (usdc) succeeded')
    s = await readSatchel(ctx, token)
  }
  if (s?.listing && (s.listing.currency !== 'usdc' || BigInt(s.listing.price) !== price)) throw new Error(`#${token} is listed as ${s.listing.price} ${s.listing.currency}; delist first`)
  const ref: BuyRef = s?.listing ? buyRefFrom(s) : { tokenId: token, listingId: 0, expectedSigCount: s?.sig_count ?? 0 }
  if (!s?.listing) ctx.log(`    predicted listing_id ${ref.listingId} (placeholder; re-read after list)`)

  // 2. refund path A: wrong listing id
  ctx.log('\n-- refund path A: wrong listing_id → must refund everything')
  const a = await executePlan(ctx, buyUsdcPlan(ctx.cfg, buyer, wrongRef(ref), price))
  if (a) {
    const verdict = interpretFtTransferCall(a.outcome, price)
    expect(ctx, verdict === 'refunded', `ft_transfer_call SuccessValue is "0" (got ${verdict})`)
    expect(ctx, hasError(a.outcome, 'ERR_LISTING_CHANGED'), 'ft_on_transfer failed with ERR_LISTING_CHANGED')
    const bal = await ftBalance(ctx, buyer)
    expect(ctx, bal === buyerBefore, `buyer balance unchanged (${usdc(bal)})`)
    const t = await readSatchel(ctx, token)
    expect(ctx, t?.owner_id === seller && t.listing?.id === ref.listingId, 'token still owned and listed by the seller')
  }

  // 3. refund path B: direct call
  ctx.log('\n-- refund path B: direct ft_on_transfer (not from USDC) → ERR_WRONG_TOKEN')
  const b = await executePlan(ctx, directFtOnTransferPlan(ctx.cfg, buyer, ref, price))
  if (b) {
    expect(ctx, !b.ok && hasError(b.outcome, 'ERR_WRONG_TOKEN'), 'direct ft_on_transfer failed with ERR_WRONG_TOKEN')
    const t = await readSatchel(ctx, token)
    expect(ctx, t?.owner_id === seller, 'token not moved')
  }
  if (bool(v, 'refund-only')) {
    ctx.log(ctx.send ? '\n    refund paths PASS: USDC can stay enabled (H-26)' : '')
    return
  }

  // 4. happy path
  ctx.log('\n-- purchase')
  const expected = await cleanGate(ctx, token, bool(v, 'no-clean-check'))
  if (expected !== null && expected !== ref.expectedSigCount) throw new Error(`checker expected_sig_count ${expected} != ${ref.expectedSigCount}`)
  const sellerBefore = await ftBalance(ctx, seller)
  const c = await executePlan(ctx, buyUsdcPlan(ctx.cfg, buyer, ref, price))
  if (!c) return
  expect(ctx, interpretFtTransferCall(c.outcome, price) === 'bought', `ft_transfer_call used the full price (${price})`)
  const t = await readSatchel(ctx, token)
  expect(ctx, t?.owner_id === buyer && t.listing === null, `owner is now ${buyer}, listing cleared`)
  await new Promise((r) => setTimeout(r, 3_000))
  const sellerAfter = await ftBalance(ctx, seller)
  const owed = await ctx.rpc.view<{ currency: string; amount: string }[]>(ctx.cfg.contract, 'proceeds_of', { account_id: seller }).catch(() => [])
  ctx.log(`    payout    seller ${usdc(sellerBefore)} → ${usdc(sellerAfter)}; proceeds_of ${JSON.stringify(owed)}`)
  const paid = sellerBefore !== null && sellerAfter !== null && sellerAfter - sellerBefore === price
  expect(ctx, paid || owed.some((o) => o.currency === 'usdc' && BigInt(o.amount) >= price), 'seller paid (USDC balance or proceeds)')
}

if (isMain(import.meta.url)) runMain(main)
