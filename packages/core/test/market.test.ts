import { describe, expect, it } from 'vitest'
import {
  acceptOfferCall,
  ATTACH_MARKET,
  cancelOfferCall,
  depositNearCall,
  ftBuyMsg,
  ftDepositCall,
  ftDepositMsg,
  ftOfferMsg,
  makeOfferCall,
  MAX_OFFER_TTL_MS,
  MAX_OFFERS_PER_ACCOUNT,
  MILLINEAR,
  offerAcceptBlock,
  offerExpiryValid,
  prepayStorageCall,
  TGAS,
  usdcOfferCall,
  withdrawFtCall,
  withdrawNearCall,
  withdrawStorageCreditCall,
  WNEAR_TESTNET,
} from '../src/near'

const SATCHEL = 'satchel.satchelhq.testnet'
const USDC = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af'
const NEAR = 10n ** 24n

describe('market: ft_on_transfer messages (docs/specs/C4-C6.md §1.2)', () => {
  // The same literal strings are parsed by the contract in market_tests::ft_msg_shapes_are_exact.
  it('emits the exact shapes the contract parses', () => {
    expect(ftBuyMsg('3', 7, 4)).toBe('{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}')
    expect(ftDepositMsg('3')).toBe('{"deposit":"3"}')
    expect(ftOfferMsg({ tokenId: '3', expectedSigCount: 4, expectedInsideEpoch: 0, expiresAtMs: 1793000000000 })).toBe(
      '{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1793000000000}}',
    )
  })
  it('refuses non-canonical token ids and bad integers', () => {
    expect(() => ftDepositMsg('03')).toThrow(/non-canonical/)
    expect(() => ftBuyMsg('3', -1, 0)).toThrow(RangeError)
    expect(() => ftOfferMsg({ tokenId: '3', expectedSigCount: 1.5, expectedInsideEpoch: 0, expiresAtMs: 1 })).toThrow(RangeError)
  })
})

describe('market: C6 call builders', () => {
  it('deposit_near attaches the amount, 30 Tgas', () => {
    expect(depositNearCall(SATCHEL, '1', 2n * NEAR)).toEqual({
      receiverId: SATCHEL,
      params: { methodName: 'deposit_near', args: { token_id: '1' }, gas: (30n * TGAS).toString(), deposit: (2n * NEAR).toString() },
    })
    expect(() => depositNearCall(SATCHEL, '1', 0n)).toThrow(RangeError)
  })
  it('withdrawals: exactly 1 yocto, 50 Tgas, receiver optional', () => {
    const w = withdrawNearCall(SATCHEL, '1', 5n)
    expect(w.params).toEqual({ methodName: 'withdraw_near', args: { token_id: '1', amount: '5' }, gas: (50n * TGAS).toString(), deposit: '1' })
    expect(withdrawNearCall(SATCHEL, '1', 5n, 'carol.testnet').params.args).toEqual({ token_id: '1', amount: '5', receiver_id: 'carol.testnet' })
    expect(withdrawFtCall(SATCHEL, '2', USDC, 5_000_000n).params).toEqual({
      methodName: 'withdraw_ft',
      args: { token_id: '2', ft: USDC, amount: '5000000' },
      gas: (50n * TGAS).toString(),
      deposit: '1',
    })
    expect(() => withdrawNearCall(SATCHEL, '1', 0n)).toThrow(RangeError)
  })
  it('FT deposit goes to the FT contract with the deposit msg', () => {
    const c = ftDepositCall(WNEAR_TESTNET, SATCHEL, '4', NEAR)
    expect(c.receiverId).toBe('wrap.testnet')
    expect(c.params).toEqual({
      methodName: 'ft_transfer_call',
      args: { receiver_id: SATCHEL, amount: NEAR.toString(), msg: '{"deposit":"4"}' },
      gas: (150n * TGAS).toString(),
      deposit: '1',
    })
  })
  it('storage credit', () => {
    expect(prepayStorageCall(SATCHEL).params).toEqual({ methodName: 'prepay_storage', args: {}, gas: (30n * TGAS).toString(), deposit: (10n * MILLINEAR).toString() })
    expect(prepayStorageCall(SATCHEL, 5n, 'bob.testnet').params.args).toEqual({ account_id: 'bob.testnet' })
    expect(withdrawStorageCreditCall(SATCHEL).params.deposit).toBe('1')
  })
})

describe('market: C4 call builders', () => {
  const terms = { tokenId: '3', expectedSigCount: 4, expectedInsideEpoch: 1, expiresAtMs: 1793000000000 }
  it('make_offer attaches amount + 0.01 NEAR', () => {
    expect(makeOfferCall(SATCHEL, 5n * NEAR, terms)).toEqual({
      receiverId: SATCHEL,
      params: {
        methodName: 'make_offer',
        args: { token_id: '3', amount: (5n * NEAR).toString(), expected_sig_count: 4, expected_inside_epoch: 1, expires_at_ms: 1793000000000 },
        gas: (30n * TGAS).toString(),
        deposit: (5n * NEAR + ATTACH_MARKET.makeOffer.storageExtra).toString(),
      },
    })
    expect(() => makeOfferCall(SATCHEL, 0n, terms)).toThrow(RangeError)
  })
  it('USDC offer is an ft_transfer_call with the offer msg', () => {
    const c = usdcOfferCall(USDC, SATCHEL, 5_000_000n, terms)
    expect(c.receiverId).toBe(USDC)
    expect(c.params.args).toEqual({
      receiver_id: SATCHEL,
      amount: '5000000',
      msg: '{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":1,"expires_at_ms":1793000000000}}',
    })
    expect(c.params.deposit).toBe('1')
  })
  it('cancel / accept: exactly 1 yocto, 50 Tgas', () => {
    expect(cancelOfferCall(SATCHEL, 9).params).toEqual({ methodName: 'cancel_offer', args: { offer_id: 9 }, gas: (50n * TGAS).toString(), deposit: '1' })
    expect(acceptOfferCall(SATCHEL, 9).params).toEqual({ methodName: 'accept_offer', args: { offer_id: 9 }, gas: (50n * TGAS).toString(), deposit: '1' })
  })
  it('limits mirror the contract', () => {
    expect(MAX_OFFERS_PER_ACCOUNT).toBe(20)
    expect(MAX_OFFER_TTL_MS).toBe(7_776_000_000)
  })
})

describe('market: client-side mirrors of the contract checks', () => {
  const now = 1_793_000_000_000
  it('expiry window', () => {
    expect(offerExpiryValid(now, now)).toBe(false)
    expect(offerExpiryValid(now + 1, now)).toBe(true)
    expect(offerExpiryValid(now + MAX_OFFER_TTL_MS, now)).toBe(true)
    expect(offerExpiryValid(now + MAX_OFFER_TTL_MS + 1, now)).toBe(false)
  })
  it('accept_offer checks 4–7, in the contract order', () => {
    const offer = { offerer_id: 'bob.testnet', expected_sig_count: 1, expected_inside_epoch: 0, expires_at_ms: now + 1000 }
    const sat = { owner_id: 'alice.testnet', sig_count: 1, last_sign_height: 1000 }
    expect(offerAcceptBlock(offer, sat, 0, { ms: now, height: 1250 })).toBeNull()
    expect(offerAcceptBlock(offer, sat, 0, { ms: now, height: 1249 })).toBe('ERR_QUIET_PERIOD')
    expect(offerAcceptBlock(offer, sat, 1, { ms: now, height: 2000 })).toBe('ERR_OFFER_STALE')
    expect(offerAcceptBlock(offer, { ...sat, sig_count: 2 }, 0, { ms: now, height: 2000 })).toBe('ERR_OFFER_STALE')
    expect(offerAcceptBlock(offer, sat, 0, { ms: now + 1000, height: 2000 })).toBe('ERR_OFFER_EXPIRED')
    expect(offerAcceptBlock(offer, { ...sat, owner_id: 'bob.testnet' }, 0, { ms: now, height: 2000 })).toBe('ERR_SELF_BUY')
    // a token that never signed has no quiet period
    expect(offerAcceptBlock({ ...offer, expected_sig_count: 0 }, { ...sat, sig_count: 0, last_sign_height: 0 }, 0, { ms: now, height: 1 })).toBeNull()
  })
})
