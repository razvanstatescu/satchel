/**
 * Pure-part unit tests for the live-tools sprint extensions (C1/C2/C3/C7 message + EVM-chain, C4/C6 market,
 * C5 allowance, C1 history-digest recompute). Mirrors the style of e2e.test.ts: construct plans/requests and assert
 * their shape, never hitting the network.
 */
import { describe, expect, it } from 'vitest'
import { eip191Bytes, solOffchainMessageBytes } from '@satchel/core/policy'
import { evmMessageSignRequest, solMessageSignRequest } from '@satchel/core/near'
import { historyDigest } from '@satchel/core/clean-history'
import type { SigRecordView } from '@satchel/core/clean-history'
import {
  acceptOfferCall,
  depositNearCall,
  makeOfferCall,
  offerAcceptBlock,
  withdrawNearCall,
} from '@satchel/core/near'
import { checkDelegatedSign, type AllowanceView } from '@satchel/core/policy'
import { loadConfig } from '../lib/config'
import { buildLegTx, buildUsdcLegTx } from '../e2e/evm'
import { toPlan as marketToPlan } from '../e2e/market'
import { TGAS } from '../lib/units'

const cfg = loadConfig({}, {})
const fees = { maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n }

describe('C7 message requests (evm_message / sol_message)', () => {
  it('evmMessageSignRequest wraps EIP-191 and the hex body matches the UTF-8 text', () => {
    const req = evmMessageSignRequest('hello')
    expect(req).toEqual({ evm_message: { message: '68656c6c6f' } })
    const wrapped = eip191Bytes(new TextEncoder().encode('hello'))
    expect(new TextDecoder().decode(wrapped)).toBe('\x19Ethereum Signed Message:\n5hello')
  })
  it('solMessageSignRequest wraps the Solana off-chain v0 header', () => {
    const req = solMessageSignRequest('hi')
    expect(req).toEqual({ sol_message: { message: '6869' } })
    const wrapped = solOffchainMessageBytes(new TextEncoder().encode('hi'))
    expect(wrapped[0]).toBe(0xff) // can never be a valid transaction message (spec §3.3)
    expect(wrapped.length).toBe(16 + 1 + 1 + 2 + 2) // domain(16) + version + format + u16(len) + "hi"
  })
})

describe('C3 EVM chains: buildLegTx / buildUsdcLegTx carry the chain id', () => {
  it('a native leg on Base Sepolia (84532) serializes with that chain id', () => {
    const leg = buildLegTx(0, '0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad', 10n ** 15n, fees, 21_000n, 84532)
    expect(leg.unsigned.slice(0, 4)).toBe('0x02') // type-2
    expect(leg.payload).toMatch(/^[0-9a-f]{64}$/)
  })
  it('a USDC leg builds transfer(to,amount) calldata to the chain USDC, value 0', () => {
    const leg = buildUsdcLegTx(1, 11155111, '0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad', 1_500_000n, fees, 90_000n)
    expect(leg.tx.to?.toLowerCase()).toBe('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') // Sepolia USDC
    expect(leg.tx.value).toBe(0n)
    expect(leg.tx.data).toMatch(/^0xa9059cbb/)
  })
})

describe('C1 history_digest: recompute from sig_records and detect tampering', () => {
  const makeRow = (seq: number): SigRecordView =>
    ({
      seq,
      request_id: seq,
      input_index: 0,
      height: 100 + seq,
      timestamp_ms: 1_793_000_000_000 + seq,
      requester: 'alice.satchelhq.testnet',
      payload: 'a'.repeat(64),
      status: 'unused',
      signature: null,
      detail: { evm: { chain_id: 11155111, nonce: seq, unsigned_tx: '02ee80' } },
    }) as unknown as SigRecordView
  it('is deterministic and order-independent (sorted by seq)', () => {
    const rows = [makeRow(0), makeRow(1), makeRow(2)]
    const d1 = historyDigest('dev1.satchelhq.testnet', '1', rows)
    const d2 = historyDigest('dev1.satchelhq.testnet', '1', [rows[2]!, rows[0]!, rows[1]!])
    expect(d1).toBe(d2)
    expect(d1).toMatch(/^[0-9a-f]{64}$/)
  })
  it('changes if the contract id, token id, or any immutable field changes', () => {
    const rows = [makeRow(0)]
    const base = historyDigest('dev1.satchelhq.testnet', '1', rows)
    expect(historyDigest('dev2.satchelhq.testnet', '1', rows)).not.toBe(base)
    expect(historyDigest('dev1.satchelhq.testnet', '2', rows)).not.toBe(base)
    const tampered = [{ ...rows[0]!, height: 999 }]
    expect(historyDigest('dev1.satchelhq.testnet', '1', tampered)).not.toBe(base)
  })
  it('throws on a non-contiguous record set (a partial read can never produce a plausible digest)', () => {
    expect(() => historyDigest('dev1.satchelhq.testnet', '1', [makeRow(0), makeRow(2)])).toThrow(/contiguous/)
  })
})

describe('C4/C6 market: call shapes and the accept-offer local precheck', () => {
  it('depositNearCall / withdrawNearCall attach the documented gas and deposits', () => {
    const dep = depositNearCall(cfg.contract, '2', 10n ** 23n)
    expect(dep.params.methodName).toBe('deposit_near')
    expect(BigInt(dep.params.gas)).toBe(30n * TGAS)
    expect(BigInt(dep.params.deposit)).toBe(10n ** 23n)
    const wd = withdrawNearCall(cfg.contract, '2', 10n ** 23n)
    expect(BigInt(wd.params.deposit)).toBe(1n) // exactly 1 yocto
    expect(marketToPlan('t', 'alice.satchelhq.testnet', dep).signerId).toBe('alice.satchelhq.testnet')
  })
  it('makeOfferCall attaches amount + storageExtra; acceptOfferCall is exactly 1 yocto', () => {
    const terms = { tokenId: '2', expectedSigCount: 3, expectedInsideEpoch: 0, expiresAtMs: Date.now() + 1000 }
    const mo = makeOfferCall(cfg.contract, 2n * 10n ** 23n, terms)
    expect(BigInt(mo.params.deposit)).toBe(2n * 10n ** 23n + 10n ** 22n)
    const acc = acceptOfferCall(cfg.contract, 4)
    expect(BigInt(acc.params.deposit)).toBe(1n)
  })
  it('offerAcceptBlock mirrors the contract order: self-buy, expiry, staleness, quiet period', () => {
    const offer = { offerer_id: 'carol.satchelhq.testnet', expected_sig_count: 2, expected_inside_epoch: 0, expires_at_ms: 2000 }
    const satchel = { owner_id: 'alice.satchelhq.testnet', sig_count: 2, last_sign_height: 100 }
    expect(offerAcceptBlock({ ...offer, offerer_id: satchel.owner_id }, satchel, 0, { ms: 1000, height: 400 })).toBe('ERR_SELF_BUY')
    expect(offerAcceptBlock(offer, satchel, 0, { ms: 3000, height: 400 })).toBe('ERR_OFFER_EXPIRED')
    expect(offerAcceptBlock(offer, { ...satchel, sig_count: 3 }, 0, { ms: 1000, height: 400 })).toBe('ERR_OFFER_STALE')
    expect(offerAcceptBlock(offer, satchel, 0, { ms: 1000, height: 200 })).toBe('ERR_QUIET_PERIOD') // listableAt = 100+250=350
    expect(offerAcceptBlock(offer, satchel, 0, { ms: 1000, height: 400 })).toBeNull()
  })
})

describe('C5 allowance: checkDelegatedSign mirrors the contract order (expiry, listing, classifier, caps)', () => {
  const baseView: AllowanceView = {
    token_id: '1',
    delegate: 'bob.satchelhq.testnet',
    owner_id: 'alice.satchelhq.testnet',
    set_at_ms: 0,
    expires_at_ms: 10_000,
    status: 'active',
    now_ms: 1000,
    window_ms: 86_400_000,
    spends_in_window: 0,
    max_spends: 32,
    caps: [{ asset: 'sol', limit: '1000000', spent: '0', remaining: '1000000', spends: [] }],
  }
  it('refuses once expired, and once the token is listed (ERR_FROZEN)', () => {
    const req = { sol: { message: '00' } } // any transfer kind: expiry and listing are checked before the classifier
    expect(checkDelegatedSign({ ...baseView, expires_at_ms: 500 }, req, { nowMs: 1000 })).toEqual({ ok: false, error: 'ERR_ALLOWANCE_EXPIRED' })
    expect(checkDelegatedSign(baseView, req, { nowMs: 1000, listed: true })).toEqual({ ok: false, error: 'ERR_FROZEN' })
  })
  it('refuses message signing for delegates unconditionally (ERR_ALLOWANCE_KIND), before expiry and listing like the contract', () => {
    expect(checkDelegatedSign(baseView, solMessageSignRequest('hi'), { nowMs: 1000 })).toEqual({ ok: false, error: 'ERR_ALLOWANCE_KIND' })
    // the contract's authorize_signer refuses a delegate's message kind first (R2-02, review round 3)
    expect(checkDelegatedSign({ ...baseView, expires_at_ms: 500 }, solMessageSignRequest('hi'), { nowMs: 1000 })).toEqual({ ok: false, error: 'ERR_ALLOWANCE_KIND' })
    expect(checkDelegatedSign(baseView, solMessageSignRequest('hi'), { nowMs: 1000, listed: true })).toEqual({ ok: false, error: 'ERR_ALLOWANCE_KIND' })
    // and whatever its body (an empty message would be ERR_MSG_EMPTY for the owner)
    expect(checkDelegatedSign(baseView, { evm_message: { message: '' } }, { nowMs: 1000 })).toEqual({ ok: false, error: 'ERR_ALLOWANCE_KIND' })
  })
  it('allows a sol transfer within the cap, refuses over it (ERR_ALLOWANCE_EXCEEDED)', async () => {
    const { solSignRequest } = await import('@satchel/core/near')
    const { buildSolTransfer } = await import('@satchel/core/chains/sol')
    const built = buildSolTransfer({
      from: '6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu',
      to: 'HNeHp8XJ7EGQBvhwAPNoRXprDYEWPvTrUvdwVEmCL64b',
      lamports: 900_000n,
      recentBlockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 0,
    })
    const ok = checkDelegatedSign(baseView, solSignRequest(built.message), { nowMs: 1000 })
    expect(ok.ok).toBe(true) // 900_000 + 5000 fee = 905_000 ≤ 1_000_000
    const built2 = buildSolTransfer({
      from: '6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu',
      to: 'HNeHp8XJ7EGQBvhwAPNoRXprDYEWPvTrUvdwVEmCL64b',
      lamports: 999_000n,
      recentBlockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 0,
    })
    const refused = checkDelegatedSign(baseView, solSignRequest(built2.message), { nowMs: 1000 })
    expect(refused.ok).toBe(false)
    expect((refused as { error: string }).error).toBe('ERR_ALLOWANCE_EXCEEDED')
  })
})
