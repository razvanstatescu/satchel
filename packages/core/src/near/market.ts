/**
 * C4 offers + C6 inside assets: call builders, `ft_on_transfer` messages and view types for the Satchel contract
 * (docs/specs/C4-C6.md). Pure: the wallet call lives in apps/web. Amounts are bigint in, decimal strings out.
 *
 *   ft msgs:  {"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}
 *             {"deposit":"3"}
 *             {"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1793000000000}}
 */
import { tokenPath } from '../derive'
import { COOLDOWN_BLOCKS, MILLINEAR, ONE_YOCTO, TGAS } from './constants'
import type { FunctionCallParams } from './sign-request'

export const WNEAR_TESTNET = 'wrap.testnet'
export const MAX_OFFERS_PER_ACCOUNT = 20
export const MAX_OFFER_TTL_MS = 90 * 24 * 3600 * 1000

/** Attachments for the C4/C6 calls (spec C4-C6 §1.1). Deposits in yocto, gas in gas units. */
export const ATTACH_MARKET = {
  depositNear: { gas: 30n * TGAS },
  withdraw: { gas: 50n * TGAS, deposit: ONE_YOCTO },
  prepayStorage: { gas: 30n * TGAS, deposit: 10n * MILLINEAR },
  withdrawStorageCredit: { gas: 30n * TGAS, deposit: ONE_YOCTO },
  /** NEAR offers attach `amount + storageExtra`; the excess over the measured storage is refunded */
  makeOffer: { gas: 30n * TGAS, storageExtra: 10n * MILLINEAR },
  cancelOffer: { gas: 50n * TGAS, deposit: ONE_YOCTO },
  acceptOffer: { gas: 50n * TGAS, deposit: ONE_YOCTO },
  /** ft.ft_transfer_call to the Satchel contract (deposit or USDC offer) */
  ftTransferCall: { gas: 150n * TGAS, deposit: ONE_YOCTO },
} as const

export type Currency = 'near' | 'usdc'

export interface FtBalanceView {
  token: string
  amount: string
}
/** `inside_of(token_id)`; null for a token that doesn't exist. `fts` lists only non-zero balances. */
export interface InsideView {
  near: string
  fts: FtBalanceView[]
  inside_epoch: number
}
/** `offer(id)`, `offers_for(token_id, from, limit)`, `offers_by(account_id, from, limit)` */
export interface OfferView {
  id: number
  token_id: string
  offerer_id: string
  amount: string
  currency: Currency
  expected_sig_count: number
  expected_inside_epoch: number
  expires_at_ms: number
  created_at_ms: number
}
export interface MarketConfigView {
  inside_fts: string[]
  max_offers_per_account: number
  max_offer_ttl_ms: number
  next_offer_id: number
}
/** `market_totals()`: the NEAR the contract owes its users (I-M1). `escrow_near` is the sum of the other four (M-01). */
export interface MarketTotalsView {
  inside_near: string
  offers_near: string
  storage_credit: string
  /** Σ NEAR proceeds (failed payouts and refunds waiting for `withdraw_proceeds`). */
  proceeds_near: string
  /** inside_near + offers_near + storage_credit + proceeds_near. The contract's own spare NEAR is free − this. */
  escrow_near: string
}

/**
 * The contract's own spare NEAR (M-01): `amount − storage_usage × 1e19 − escrow_near`, in yocto. Only this pays
 * the storage of transfers and buys to new holders; below the ≈ 250 B one costs, they fail with `ERR_INSOLVENT`
 * until anyone tops the contract up with a plain transfer. Negative means I-M1 is broken.
 */
export function spareNear(account: { amount: string; storage_usage: number }, totals: MarketTotalsView): bigint {
  return BigInt(account.amount) - BigInt(account.storage_usage) * 10n ** 19n - BigInt(totals.escrow_near)
}

/** A call to send: `receiverId` is the Satchel contract, or the FT contract for `ft_transfer_call`. */
export interface MarketCall {
  receiverId: string
  params: FunctionCallParams
}

const canonicalToken = (tokenId: string): string => {
  tokenPath(tokenId, 'evm') // throws on a non-canonical id
  return tokenId
}
const positive = (x: bigint, what: string): string => {
  if (x <= 0n) throw new RangeError(`${what} must be > 0`)
  return x.toString()
}
const u64 = (x: number, what: string): number => {
  if (!Number.isSafeInteger(x) || x < 0) throw new RangeError(`${what} must be a non-negative safe integer`)
  return x
}
const call = (receiverId: string, methodName: string, args: Record<string, unknown>, gas: bigint, deposit: bigint): MarketCall => ({
  receiverId,
  params: { methodName, args, gas: gas.toString(), deposit: deposit.toString() },
})

// ── ft_on_transfer messages (exact strings; key order fixed) ──────────────────────────────────

export function ftBuyMsg(tokenId: string, listingId: number, expectedSigCount: number): string {
  return JSON.stringify({ buy: { token_id: canonicalToken(tokenId), listing_id: u64(listingId, 'listing_id'), expected_sig_count: u64(expectedSigCount, 'expected_sig_count') } })
}

export function ftDepositMsg(tokenId: string): string {
  return JSON.stringify({ deposit: canonicalToken(tokenId) })
}

export interface OfferTerms {
  tokenId: string
  expectedSigCount: number
  expectedInsideEpoch: number
  expiresAtMs: number
}

export function ftOfferMsg(t: OfferTerms): string {
  return JSON.stringify({
    offer: {
      token_id: canonicalToken(t.tokenId),
      expected_sig_count: u64(t.expectedSigCount, 'expected_sig_count'),
      expected_inside_epoch: u64(t.expectedInsideEpoch, 'expected_inside_epoch'),
      expires_at_ms: u64(t.expiresAtMs, 'expires_at_ms'),
    },
  })
}

// ── C6 calls ─────────────────────────────────────────────────────────────────────────────────

/** Anyone. Attach the amount; the token's first deposit keeps ≈ 0.0009 NEAR of it for storage. */
export function depositNearCall(contractId: string, tokenId: string, attached: bigint): MarketCall {
  positive(attached, 'deposit')
  return call(contractId, 'deposit_near', { token_id: canonicalToken(tokenId) }, ATTACH_MARKET.depositNear.gas, attached)
}

/** Owner only, not while listed. `receiverId` defaults to the owner (omitted from the args). */
export function withdrawNearCall(contractId: string, tokenId: string, amount: bigint, receiverId?: string): MarketCall {
  const args: Record<string, unknown> = { token_id: canonicalToken(tokenId), amount: positive(amount, 'amount') }
  if (receiverId !== undefined) args.receiver_id = receiverId
  return call(contractId, 'withdraw_near', args, ATTACH_MARKET.withdraw.gas, ATTACH_MARKET.withdraw.deposit)
}

export function withdrawFtCall(contractId: string, tokenId: string, ft: string, amount: bigint, receiverId?: string): MarketCall {
  const args: Record<string, unknown> = { token_id: canonicalToken(tokenId), ft, amount: positive(amount, 'amount') }
  if (receiverId !== undefined) args.receiver_id = receiverId
  return call(contractId, 'withdraw_ft', args, ATTACH_MARKET.withdraw.gas, ATTACH_MARKET.withdraw.deposit)
}

/** `ft.ft_transfer_call(satchel, amount, {"deposit": token_id})`. A new slot needs storage credit (`prepayStorageCall`). */
export function ftDepositCall(ftContract: string, contractId: string, tokenId: string, amount: bigint): MarketCall {
  return call(
    ftContract,
    'ft_transfer_call',
    { receiver_id: contractId, amount: positive(amount, 'amount'), msg: ftDepositMsg(tokenId) },
    ATTACH_MARKET.ftTransferCall.gas,
    ATTACH_MARKET.ftTransferCall.deposit,
  )
}

/** Storage credit for `ft_on_transfer` (FT deposits, USDC offers). `accountId` defaults to the caller. */
export function prepayStorageCall(contractId: string, attached: bigint = ATTACH_MARKET.prepayStorage.deposit, accountId?: string): MarketCall {
  positive(attached, 'deposit')
  const args: Record<string, unknown> = {}
  if (accountId !== undefined) args.account_id = accountId
  return call(contractId, 'prepay_storage', args, ATTACH_MARKET.prepayStorage.gas, attached)
}

export function withdrawStorageCreditCall(contractId: string): MarketCall {
  return call(contractId, 'withdraw_storage_credit', {}, ATTACH_MARKET.withdrawStorageCredit.gas, ATTACH_MARKET.withdrawStorageCredit.deposit)
}

// ── C4 calls ─────────────────────────────────────────────────────────────────────────────────

/** NEAR offer of exactly `amount`; attaches `amount + 0.01 NEAR` (the unused storage part is refunded). */
export function makeOfferCall(contractId: string, amount: bigint, t: OfferTerms): MarketCall {
  return call(
    contractId,
    'make_offer',
    {
      token_id: canonicalToken(t.tokenId),
      amount: positive(amount, 'amount'),
      expected_sig_count: u64(t.expectedSigCount, 'expected_sig_count'),
      expected_inside_epoch: u64(t.expectedInsideEpoch, 'expected_inside_epoch'),
      expires_at_ms: u64(t.expiresAtMs, 'expires_at_ms'),
    },
    ATTACH_MARKET.makeOffer.gas,
    amount + ATTACH_MARKET.makeOffer.storageExtra,
  )
}

/** USDC offer: `usdc.ft_transfer_call(satchel, amount, {"offer":{…}})`. Needs storage credit (≈ 0.0045 NEAR). */
export function usdcOfferCall(usdcContract: string, contractId: string, amount: bigint, t: OfferTerms): MarketCall {
  return call(
    usdcContract,
    'ft_transfer_call',
    { receiver_id: contractId, amount: positive(amount, 'amount'), msg: ftOfferMsg(t) },
    ATTACH_MARKET.ftTransferCall.gas,
    ATTACH_MARKET.ftTransferCall.deposit,
  )
}

export function cancelOfferCall(contractId: string, offerId: number): MarketCall {
  return call(contractId, 'cancel_offer', { offer_id: u64(offerId, 'offer_id') }, ATTACH_MARKET.cancelOffer.gas, ATTACH_MARKET.cancelOffer.deposit)
}

export function acceptOfferCall(contractId: string, offerId: number): MarketCall {
  return call(contractId, 'accept_offer', { offer_id: u64(offerId, 'offer_id') }, ATTACH_MARKET.acceptOffer.gas, ATTACH_MARKET.acceptOffer.deposit)
}

// ── client-side mirrors of the contract checks (UX only; the contract decides) ──────────────────

/** `make_offer` expiry rule: `now < expires ≤ now + 90 days`. */
export function offerExpiryValid(expiresAtMs: number, nowMs: number): boolean {
  return nowMs < expiresAtMs && expiresAtMs <= nowMs + MAX_OFFER_TTL_MS
}

export type OfferBlock = 'ERR_SELF_BUY' | 'ERR_OFFER_EXPIRED' | 'ERR_OFFER_STALE' | 'ERR_QUIET_PERIOD'

/**
 * Mirrors `accept_offer` checks 4–7 (spec C4-C6 §3.2) for the owner's UI: returns null if the contract would accept,
 * else the code it would refuse with. `satchel` is the `satchel(id)` view; `insideEpoch` comes from `inside_of(id)`.
 */
export function offerAcceptBlock(
  offer: Pick<OfferView, 'offerer_id' | 'expected_sig_count' | 'expected_inside_epoch' | 'expires_at_ms'>,
  satchel: { owner_id: string; sig_count: number; last_sign_height: number },
  insideEpoch: number,
  now: { ms: number; height: number },
): OfferBlock | null {
  if (offer.offerer_id === satchel.owner_id) return 'ERR_SELF_BUY'
  if (now.ms >= offer.expires_at_ms) return 'ERR_OFFER_EXPIRED'
  if (satchel.sig_count !== offer.expected_sig_count || insideEpoch !== offer.expected_inside_epoch) return 'ERR_OFFER_STALE'
  const listableAt = satchel.sig_count === 0 ? 0 : satchel.last_sign_height + COOLDOWN_BLOCKS
  if (now.height < listableAt) return 'ERR_QUIET_PERIOD'
  return null
}
