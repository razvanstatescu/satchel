/**
 * C4 + C6 e2e (docs/specs/C4-C6.md): deposit/withdraw NEAR inside a Satchel, and make/accept/cancel an offer.
 * One script, dispatched by `--action`, in the house dry-run / --send style.
 *
 *   pnpm --filter @satchel/tools e2e:market --action deposit --token 2 --amount 0.1
 *   pnpm --filter @satchel/tools e2e:market --action inside --token 2
 *   pnpm --filter @satchel/tools e2e:market --action withdraw --token 2 --amount 0.1 --send
 *   pnpm --filter @satchel/tools e2e:market --action make-offer --token 2 --offerer carol --amount 0.2 --send
 *   pnpm --filter @satchel/tools e2e:market --action accept-offer --offer-id 4 --send
 *   pnpm --filter @satchel/tools e2e:market --action cancel-offer --offer-id 5 --send
 *   pnpm --filter @satchel/tools e2e:market --action totals
 */
import {
  acceptOfferCall,
  cancelOfferCall,
  depositNearCall,
  makeOfferCall,
  offerAcceptBlock,
  withdrawNearCall,
  type InsideView,
  type MarketCall,
  type MarketTotalsView,
  type OfferView,
} from '@satchel/core/near'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { functionCall, type TxPlan } from '../lib/tx'
import { formatNear, parseNear } from '../lib/units'
import { HELP_COMMON, ownerOr, readSatchel } from './common'

const OPTIONS = {
  action: { type: 'string', default: 'totals' },
  token: { type: 'string' },
  owner: { type: 'string' },
  offerer: { type: 'string' },
  amount: { type: 'string' },
  'offer-id': { type: 'string' },
  'expires-in-ms': { type: 'string', default: String(3 * 24 * 3600 * 1000) },
} as const

const HELP = `tools/e2e/market.ts: C4 offers + C6 inside-NEAR, dispatched by --action.
  --action deposit|inside|withdraw|make-offer|offers-for|accept-offer|cancel-offer|totals
  --token <id>            --owner <acct> (default: on-chain owner, else alice)   --offerer <acct> (default: carol)
  --amount <NEAR>          --offer-id <n>          --expires-in-ms <n> (default 3 days)
${HELP_COMMON}`

export function toPlan(title: string, signerId: string, mc: MarketCall): TxPlan {
  return { title, signerId, receiverId: mc.receiverId, actions: [functionCall(mc.params.methodName, mc.params.args, BigInt(mc.params.gas), BigInt(mc.params.deposit))] }
}

export async function marketTotals(ctx: Ctx): Promise<MarketTotalsView> {
  return ctx.rpc.view<MarketTotalsView>(ctx.cfg.contract, 'market_totals', {})
}

/** I-M1: escrow_near ≤ balance − storage stake (spec §2.4, M-01). */
export async function checkSolvency(ctx: Ctx): Promise<{ totals: MarketTotalsView; spare: bigint; ok: boolean }> {
  const [totals, account] = await Promise.all([marketTotals(ctx), ctx.rpc.viewAccount(ctx.cfg.contract)])
  if (!account) throw new Error(`account ${ctx.cfg.contract} not found`)
  const spare = BigInt(account.amount) - BigInt(account.storage_usage) * 10n ** 19n - BigInt(totals.escrow_near)
  return { totals, spare, ok: spare >= 0n }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/market')
  const action = str(v, 'action')!
  const contract = ctx.cfg.contract

  if (ctx.offline) {
    ctx.log(`    note      --offline: e2e/market.ts actions all read live state first (expected_sig_count, inside balances); nothing to show without a network. Call ${action} planners directly in a unit test instead.`)
    return
  }

  if (action === 'totals') {
    const c = await checkSolvency(ctx)
    ctx.log(`    totals    ${JSON.stringify(c.totals)}`)
    ctx.log(`    spare     ${formatNear(c.spare)} (the contract's own buffer; I-M1 ${c.ok ? 'holds' : 'VIOLATED'})`)
    expect(ctx, c.ok, 'I-M1: escrow_near ≤ balance − storage stake')
    return
  }

  if (action === 'inside') {
    const token = str(v, 'token')!
    const inside = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    ctx.log(`    inside_of #${token} = ${JSON.stringify(inside)}`)
    return
  }

  if (action === 'offers-for') {
    const token = str(v, 'token')!
    const offers = await ctx.rpc.view<OfferView[]>(contract, 'offers_for', { token_id: token, from_index: 0, limit: 50 })
    ctx.log(`    offers_for #${token}: ${offers.length} open`)
    offers.forEach((o) => ctx.log(`      #${o.id} ${o.offerer_id} ${o.amount} ${o.currency} (expires ${new Date(o.expires_at_ms).toISOString()})`))
    return
  }

  if (action === 'deposit') {
    const token = str(v, 'token')!
    const owner = str(v, 'owner') ? resolveAccount(ctx.cfg, str(v, 'owner')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
    const amount = parseNear(str(v, 'amount') ?? '0.1')
    const before = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    ctx.log(`    before    inside_of #${token} = ${JSON.stringify(before)}`)
    const sent = await executePlan(ctx, toPlan(`deposit_near #${token} ${formatNear(amount)}`, owner, depositNearCall(contract, token, amount)))
    if (!sent) return
    expect(ctx, sent.ok, 'deposit_near succeeded')
    const after = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    ctx.log(`    after     inside_of #${token} = ${JSON.stringify(after)}`)
    expect(ctx, BigInt(after!.near) > BigInt(before?.near ?? '0'), 'inside NEAR increased')
    return
  }

  if (action === 'withdraw') {
    const token = str(v, 'token')!
    const owner = str(v, 'owner') ? resolveAccount(ctx.cfg, str(v, 'owner')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
    const amount = parseNear(str(v, 'amount') ?? '0.1')
    const before = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    ctx.log(`    before    inside_of #${token} = ${JSON.stringify(before)}`)
    const sent = await executePlan(ctx, toPlan(`withdraw_near #${token} ${formatNear(amount)}`, owner, withdrawNearCall(contract, token, amount)))
    if (!sent) return
    expect(ctx, sent.ok, 'withdraw_near succeeded')
    await new Promise((r) => setTimeout(r, 2_000))
    const after = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    ctx.log(`    after     inside_of #${token} = ${JSON.stringify(after)} (inside_epoch bumped: ${after?.inside_epoch} > ${before?.inside_epoch})`)
    expect(ctx, (after?.inside_epoch ?? 0) > (before?.inside_epoch ?? -1), 'inside_epoch bumped (I-M4)')
    return
  }

  if (action === 'make-offer') {
    const token = str(v, 'token')!
    const offerer = resolveAccount(ctx.cfg, str(v, 'offerer') ?? 'carol')
    const amount = parseNear(str(v, 'amount') ?? '0.1')
    const s = await readSatchel(ctx, token)
    if (!s) throw new Error(`#${token} not found`)
    const inside = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: token })
    const expiresAtMs = Date.now() + Number(str(v, 'expires-in-ms'))
    ctx.log(`    make      #${token} expected_sig_count ${s.sig_count}, expected_inside_epoch ${inside?.inside_epoch ?? 0}`)
    const call = makeOfferCall(contract, amount, { tokenId: token, expectedSigCount: s.sig_count, expectedInsideEpoch: inside?.inside_epoch ?? 0, expiresAtMs })
    const sent = await executePlan(ctx, toPlan(`make_offer #${token} ${formatNear(amount)} by ${offerer}`, offerer, call))
    if (!sent) return
    expect(ctx, sent.ok, 'make_offer succeeded')
    const offers = await ctx.rpc.view<OfferView[]>(contract, 'offers_for', { token_id: token, from_index: 0, limit: 50 })
    const mine = offers.filter((o) => o.offerer_id === offerer)
    ctx.log(`    offers    ${JSON.stringify(mine)}`)
    expect(ctx, mine.length > 0, `offerer ${offerer} now has an open offer on #${token}`)
    return
  }

  if (action === 'accept-offer') {
    const offerId = Number(str(v, 'offer-id'))
    const offer = await ctx.rpc.view<OfferView | null>(contract, 'offer', { offer_id: offerId })
    if (!offer) throw new Error(`offer ${offerId} not found`)
    const s = await readSatchel(ctx, offer.token_id)
    if (!s) throw new Error(`#${offer.token_id} not found`)
    const inside = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: offer.token_id })
    const owner = str(v, 'owner') ? resolveAccount(ctx.cfg, str(v, 'owner')!) : s.owner_id
    const block = offerAcceptBlock(offer, s, inside?.inside_epoch ?? 0, { ms: Date.now(), height: (await ctx.rpc.finalBlock()).height })
    ctx.log(`    offer     #${offerId} on #${offer.token_id}: ${offer.amount} ${offer.currency} from ${offer.offerer_id}; local precheck ${block ?? 'would accept'}`)
    const sent = await executePlan(ctx, toPlan(`accept_offer ${offerId} (#${offer.token_id})`, owner, acceptOfferCall(contract, offerId)))
    if (!sent) return
    expect(ctx, sent.ok, 'accept_offer succeeded')
    const after = await readSatchel(ctx, offer.token_id)
    expect(ctx, after?.owner_id === offer.offerer_id, `owner of #${offer.token_id} is now ${offer.offerer_id}`)
    const insideAfter = await ctx.rpc.view<InsideView | null>(contract, 'inside_of', { token_id: offer.token_id })
    expect(ctx, insideAfter?.near === inside?.near, 'inside NEAR intact across the sale (I-M8)')
    return
  }

  if (action === 'cancel-offer') {
    const offerId = Number(str(v, 'offer-id'))
    const offer = await ctx.rpc.view<OfferView | null>(contract, 'offer', { offer_id: offerId })
    if (!offer) throw new Error(`offer ${offerId} not found`)
    const sent = await executePlan(ctx, toPlan(`cancel_offer ${offerId}`, offer.offerer_id, cancelOfferCall(contract, offerId)))
    if (!sent) return
    expect(ctx, sent.ok, 'cancel_offer succeeded')
    const gone = await ctx.rpc.view<OfferView | null>(contract, 'offer', { offer_id: offerId })
    expect(ctx, gone === null, 'the offer no longer exists (refunded)')
    return
  }

  throw new Error(`unknown --action ${action}`)
}

if (isMain(import.meta.url)) runMain(main)
