import { describe, expect, it } from 'vitest'
import { buildBtcSend, type Utxo } from '@satchel/core/chains/btc'
import { evmSignRequest } from '@satchel/core/near'
import { loadConfig } from '../lib/config'
import { addressesOf, expandIds, parseTargets, precheck, resolveSet, signaturesFrom, signForPlan } from '../e2e/common'
import { FUNDING_PLAN, fundingLegs, legsTotal } from '../e2e/funding'
import { buyMsg, buyNearPlan, buyUsdcPlan, directFtOnTransferPlan, listPlan, mintPlan, transferPlan, usdcStorageDepositPlan } from '../e2e/plans'
import { buildLegTx } from '../e2e/evm'
import { parseUtxoFlag, pickInputs, simulateSpend } from '../e2e/btc'
import { buyRefFrom } from '../e2e/sale-near'
import type { SatchelView } from '../e2e/common'
import { wrongRef } from '../e2e/sale-usdc'
import { parseFromStep, staleRef, strictGateProblem } from '../e2e/clean-history'
import { TGAS } from '../lib/units'
import { b64 } from './helpers'

const cfg = loadConfig({}, {})

/** research/final-addresses.md (computed 2026-10-21, live-checked against the MPC's derived_public_key). Data only. */
const FINAL_ADDRESSES: Record<string, { btc: string; evm: string; sol: string }> = {
  'dev1#1': { btc: 'tb1qcg94krv9g58qrtslkqlvyrv86el7w3p4ml5urc', evm: '0x355180f2d253833dfb736b05561588d7d4bc7db3', sol: '6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu' },
  'dev1#2': { btc: 'tb1qprcmru94v8kg0qqxdv6hradw4z29zk2wshs0vq', evm: '0xfcc7917829b63cf0b7efb724d55fa9dedc5943d1', sol: 'HNeHp8XJ7EGQBvhwAPNoRXprDYEWPvTrUvdwVEmCL64b' },
  'dev1#3': { btc: 'tb1qa3jnf4qlft24sam2slnmt3uas5c95mv7ual4ek', evm: '0x0d9fe39915e2b026ca9e3ab268ff8745f87522d6', sol: '491k3NitncmVHHh3gqDHtJLuw4Bh4Ns54YEuUAwkNrSG' },
  'final#1': { btc: 'tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5', evm: '0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad', sol: 'AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd' },
  'final#2': { btc: 'tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u', evm: '0xe7597038ce1030599fae70f4d6a9d1f9ea9dc76a', sol: '5Gn16DW98FYQj1soZqNiUiqSsT3qcQiUTBEFuDgH1HSf' },
  'final#3': { btc: 'tb1qylyljhhghv7xpqa5vw5e8v5dgjrsg6s6a3dngd', evm: '0x456d0c7e3f16b64385c9241fde45098aef2e997d', sol: 'AM6HVA7mygEZSPe6BswPcnE8RM2TpHNHHiH3iZa1citj' },
  'final#4': { btc: 'tb1qujvrkz47vga3razn2fpegp9gfqfcnwcvf6cl7f', evm: '0x8ccee6e631a0ba4197468c641b0348c01f1dbab0', sol: 'FX8L3eZk5xjDXENUHsJ8YBMpvvZ5ajd6sXcE7uwTniHN' },
  'final#5': { btc: 'tb1q70288g5fzuzdnawruykutg0ts9vrcfpaecfj55', evm: '0x630c522694cd9863a2770716d005a490d022f624', sol: 'C57DF5rkbw4ucCuDZUfG7suxXsrL5chtAsCsQrjeGhHb' },
  'final#6': { btc: 'tb1qntk56m402m03dsgm5wlg26lc5kr67g92wee7zv', evm: '0xdfb5013a1e7189dd26533b2fc80d536ae6748333', sol: 'FJcx3pryuz6xKniMsYbGGtt37jVg4vVUzTppnwgJjJj5' },
  'final#7': { btc: 'tb1qpvhr4f9dc6s84kqhx9dnqxef6ccmgxs6fl6l2t', evm: '0xec517d0c2c84fc30bb8f9b3ae9223c4f42e5640f', sol: 'JCt19yBHQGcxccjTPunnQzA6Tax37hCAJUfKZrkgnwmc' },
  'rc#1': { btc: 'tb1q5y8ttdym4snraa9ujay3stza7avyf9ltf40f5x', evm: '0x421ee6970e238e6fb0c08aa26e12bce686b1b7d7', sol: '9bGAhsR4fqJC2P52mzQJXNC1QfvN23e8LEgyHaWR6NoS' },
  'rc#2': { btc: 'tb1qlu9qfrl357n6e7mnamw8j0v5ftcgcyqd7vmfak', evm: '0x2f5b7846dcd708aa1d6f27224bb7a4f56f3a1ce5', sol: 'FU3kh2sxcRLSYc9g3ViHaNe8wFCzNcNEef78VQcAM54r' },
}

describe('targets and the funding fan-out (R-14)', () => {
  it('derives exactly the published Phase-0 addresses for satchelhq (D-38)', () => {
    for (const [label, want] of Object.entries(FINAL_ADDRESSES)) {
      const [set, id] = label.split('#') as [string, string]
      const a = addressesOf(cfg, id, resolveSet(cfg, set))
      expect({ btc: a.btc, evm: a.evm.toLowerCase(), sol: a.sol }, label).toEqual(want)
    }
  })
  it('expands ids and parses mixed target lists', () => {
    expect(expandIds('1-3,5+7')).toEqual(['1', '2', '3', '5', '7'])
    expect(() => expandIds('0')).toThrow()
    expect(() => expandIds('3-1')).toThrow()
    const t = parseTargets(cfg, 'final#1-2; rc#1 0x000000000000000000000000000000000000dEaD', 'evm')
    expect(t.map((x) => x.label)).toEqual(['final#1', 'final#2', 'rc#1', '0x000000000000000000000000000000000000dEaD'])
    expect(t[0]!.address.toLowerCase()).toBe(FINAL_ADDRESSES['final#1']!.evm)
    expect(t[2]!.contract).toBe('rc.satchelhq.testnet')
  })
  it('the funding preset matches plan §5.3 totals', () => {
    const evm = fundingLegs(cfg, 'evm')
    const btc = fundingLegs(cfg, 'btc')
    expect(evm).toHaveLength(11)
    expect(legsTotal(evm)).toBe(190_000_000_000_000_000n) // ≈ 0.19 ETH fanned out from dev1 #1 (plan §5.3)
    expect(btc).toHaveLength(14) // one output per planned UTXO
    expect(legsTotal(btc)).toBe(750_000n) // final 600k + rc 100k + dev1 50k
    expect(legsTotal(fundingLegs(cfg, 'btc', ['final']))).toBe(600_000n)
    expect(btc.every((l) => l.address.startsWith('tb1q'))).toBe(true)
    expect(FUNDING_PLAN.some((r) => r.set === 'dev1' && r.token === '1')).toBe(false) // dev1 #1 is the source
  })
})

describe('sign_for plans (spec §5.5 formulas via @satchel/core/near)', () => {
  const fees = { maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n }
  it('EVM: 80 Tgas, 0.005 NEAR, the exact unsigned tx; keccak matches', () => {
    const leg = buildLegTx(3, '0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad', 10n ** 15n, fees)
    const p = signForPlan(cfg, 'alice.satchelhq.testnet', '1', evmSignRequest(leg.unsigned))
    const a = p.actions[0]!
    expect(a.type === 'FunctionCall' && a.method).toBe('sign_for')
    expect(a.type === 'FunctionCall' && a.gas).toBe(80n * TGAS)
    expect(a.type === 'FunctionCall' && a.deposit).toBe(5_000_000_000_000_000_000_000n)
    expect(a.type === 'FunctionCall' && a.args).toEqual({ token_id: '1', request: { evm: { unsigned_tx: leg.unsigned.slice(2) } } })
    expect(p.receiverId).toBe('dev1.satchelhq.testnet')
    expect(leg.payload).toMatch(/^[0-9a-f]{64}$/)
  })
  it('refuses locally what the contract would refuse (same classifier)', () => {
    expect(() => precheck({ evm: { unsigned_tx: 'f86c80' } })).toThrow(/ERR_EVM_TYPE/)
    expect(() => precheck({ btc: { preimages: [], outputs: '' } })).toThrow(/ERR_BTC_INPUT_COUNT/)
    expect(() => buildLegTx(0, '0x1234' as `0x${string}`, 1n, fees)).toThrow(/bad recipient/)
  })
  it('BTC 2-input: one sign_for with 2 preimages → 100 Tgas, 0.01 NEAR; change chains into the next leg', () => {
    const a = addressesOf(cfg, '1')
    const utxos: Utxo[] = [parseUtxoFlag(`${'a'.repeat(64)}:0:100000`), parseUtxoFlag(`${'b'.repeat(64)}:1:50000`), parseUtxoFlag(`${'c'.repeat(64)}:2:10000:u`)]
    expect(utxos[2]!.confirmed).toBe(false)
    const inputs = pickInputs(utxos, 2)!
    expect(inputs.map((u) => u.value)).toEqual([100000n, 50000n])
    expect(() => pickInputs(utxos.slice(0, 1), 2)).toThrow(/need 2/)
    const built = buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to: FINAL_ADDRESSES['final#2']!.btc, amount: 120_000n, utxos, feeRate: 2, inputs })
    expect(built.preimages).toHaveLength(2)
    const p = signForPlan(cfg, 'alice.satchelhq.testnet', '1', built.signRequest)
    const fc = p.actions[0]!
    expect(fc.type === 'FunctionCall' && fc.gas).toBe(100n * TGAS)
    expect(fc.type === 'FunctionCall' && fc.deposit).toBe(10_000_000_000_000_000_000_000n)
    const next = simulateSpend(utxos, built)
    expect(next.map((u) => `${u.txid.slice(0, 1)}:${u.vout}:${u.confirmed}`)).toEqual(['c:2:false', `${built.txid.slice(0, 1)}:${built.changeIndex}:false`])
    expect(next[1]!.value).toBe(built.change)
    expect(() => parseUtxoFlag('zz:0:1')).toThrow(/--utxo/)
  })
  it('decodes on_signed (the tx SuccessValue) and insists on every signature', () => {
    const sig = { scheme: 'Secp256k1', big_r: { affine_point: `02${'11'.repeat(32)}` }, s: { scalar: '22'.repeat(32) }, recovery_id: 1 }
    const sent = (v: unknown) => ({ hash: 'h', ok: true, errors: [], outcome: { status: { SuccessValue: b64(v) } } })
    expect(signaturesFrom(sent([sig, sig]), 2)).toHaveLength(2)
    expect(() => signaturesFrom(sent([sig, null]), 2)).toThrow(/no signature for request\(s\) 1/)
    expect(() => signaturesFrom(sent([sig]), 2)).toThrow(/expected 2/)
    expect(() => signaturesFrom({ hash: 'h', ok: false, errors: ['ERR_FROZEN'], outcome: { status: { Failure: {} } } }, 1)).toThrow(/ERR_FROZEN/)
  })
})

describe('NFT and sale plans (spec §5.7 attachments)', () => {
  const ref = { tokenId: '3', listingId: 7, expectedSigCount: 4 }
  it('mint / transfer / list', () => {
    const m = mintPlan(cfg, 'alice.satchelhq.testnet', 'bob.satchelhq.testnet').actions[0]!
    expect(m.type === 'FunctionCall' && [m.method, m.gas, m.deposit]).toEqual(['nft_mint', 30n * TGAS, 20_000_000_000_000_000_000_000n])
    const t = transferPlan(cfg, 'alice.satchelhq.testnet', '2', 'bob.satchelhq.testnet').actions[0]!
    expect(t.type === 'FunctionCall' && [t.method, t.deposit, t.args]).toEqual(['nft_transfer', 1n, { receiver_id: 'bob.satchelhq.testnet', token_id: '2' }])
    expect(() => transferPlan(cfg, 'alice.satchelhq.testnet', '2', cfg.contract)).toThrow(/ERR_BAD_RECEIVER/)
    expect(() => transferPlan(cfg, 'alice.satchelhq.testnet', '2', 'v1.signer-prod.testnet')).toThrow(/ERR_BAD_RECEIVER/)
    const l = listPlan(cfg, 'alice.satchelhq.testnet', '3', 5_000_000n, 'usdc').actions[0]!
    expect(l.type === 'FunctionCall' && l.args).toEqual({ token_id: '3', price: '5000000', currency: 'usdc' })
    expect(() => listPlan(cfg, 'a.testnet', '3', 0n, 'near')).toThrow(/ERR_PRICE/)
  })
  it('buy NEAR attaches exactly the price; buy USDC carries the exact FtMsg', () => {
    const b = buyNearPlan(cfg, 'carol.satchelhq.testnet', ref, 10n ** 24n).actions[0]!
    expect(b.type === 'FunctionCall' && [b.gas, b.deposit, b.args]).toEqual([50n * TGAS, 10n ** 24n, { token_id: '3', listing_id: 7, expected_sig_count: 4 }])
    expect(buyMsg(ref)).toBe('{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}')
    const u = buyUsdcPlan(cfg, 'carol.satchelhq.testnet', ref, 5_000_000n)
    expect(u.receiverId).toBe(cfg.usdc)
    const ua = u.actions[0]!
    expect(ua.type === 'FunctionCall' && [ua.method, ua.gas, ua.deposit]).toEqual(['ft_transfer_call', 150n * TGAS, 1n])
    expect(ua.type === 'FunctionCall' && ua.args.receiver_id).toBe(cfg.contract)
    const d = directFtOnTransferPlan(cfg, 'carol.satchelhq.testnet', ref, 5_000_000n)
    expect(d.receiverId).toBe(cfg.contract)
    const s = usdcStorageDepositPlan(cfg, 'satchelhq.testnet', cfg.contract).actions[0]!
    expect(s.type === 'FunctionCall' && s.deposit).toBe(1_250_000_000_000_000_000_000n)
  })
  it('buy references: read fresh, wrong and stale variants', () => {
    const view: SatchelView = {
      token_id: '3',
      owner_id: 'alice.satchelhq.testnet',
      sig_count: 4,
      last_sign_height: 100,
      listable_at: 350,
      listing: { id: 7, seller: 'alice.satchelhq.testnet', price: '5000000', currency: 'usdc', listed_at: 400, sig_count: 4 },
      paths: { btc: 'satchel/3/btc', evm: 'satchel/3/evm', sol: 'satchel/3/sol' },
    }
    expect(buyRefFrom(view)).toEqual(ref)
    expect(() => buyRefFrom({ ...view, listing: null })).toThrow(/not listed/)
    expect(() => buyRefFrom({ ...view, sig_count: 5 })).toThrow(/ERR_LISTING_CHANGED/)
    expect(wrongRef(ref).listingId).not.toBe(7)
    expect(staleRef(ref).expectedSigCount).toBe(3)
  })
})

describe('clean-history scenario guards (D-03)', () => {
  it('--from-step accepts 1..4 only', () => {
    expect(parseFromStep(undefined)).toBe(1)
    expect(parseFromStep('3')).toBe(3)
    for (const bad of ['0', '5', 'two', '2.5']) expect(() => parseFromStep(bad)).toThrow(/--from-step must be/)
  })
  it('an rc/final --send without H refuses to start; a dry run only warns; dev never needs H', () => {
    expect(strictGateProblem('rc', true, null)).toMatch(/needs SATCHEL_EXPECTED_CODE_HASH=<H> before --send/)
    expect(strictGateProblem('final', true, null)).toMatch(/before --send/)
    expect(strictGateProblem('rc', false, null)).toMatch(/strict gate will say "unsafe"/)
    expect(strictGateProblem('rc', true, 'ab'.repeat(32))).toBeNull()
    expect(strictGateProblem('dev', true, null)).toBeNull()
  })
})
