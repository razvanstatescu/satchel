/**
 * Review R3-S-1 (docs/security/review-round-3.md): past the R-20 cap of `maxBtcTxids` distinct uncached txids, the BTC
 * check used to query nothing and mark every BTC item `unknown / too_many_txids`. Only `spent` verdicts are cached, so a
 * fresh browser could never get past the cap: a history naming > 100 fabricated txids (≈ 0.26 NEAR of records), or an
 * honest one that spent from > 100 funding txs, made the token unbuyable for good.
 *
 * Fix: past the cap, the check lists the coins at the Satchel's address now (`GET /address/:a/utxo`). Only requests
 * that spend one of them need a verdict and count against the cap; every other request is `inactive` (non-blocking,
 * never cached, outpoints still encumbered). Without a coin list the cap still applies to every record (fail closed).
 */
import { describe, expect, it } from 'vitest'
import { checkBtc, checkCleanHistory, TESTNET_POLICY, type CheckDeps, type CheckInput, type SigRecordView } from '../src/clean-history'
import { deriveSatchelAddresses } from '../src/derive'
import { btcRecord, fakeBtc, fakeEvm, fakeSol, snapshot } from './helpers'

const CONTRACT = 'satchel-spk-chain-e9ea1a.testnet'
const NOW = Date.parse('2026-10-21T21:32:30Z')
const ADDR = deriveSatchelAddresses('testnet', CONTRACT, '1').btc
const txid = (i: number) => (0x1000 + i).toString(16).padStart(64, '0')
const LIVE = 'ab'.repeat(32) // a coin at the Satchel's address now
const OLD = 'cd'.repeat(32) // a coin it spent long ago

function input(records: SigRecordView[], o: Partial<CheckInput> = {}): CheckInput {
  return { network: 'testnet', contractId: CONTRACT, tokenId: '1', role: 'dev', near: [snapshot('fastnear', records), snapshot('drpc', records)], now: NOW, ...o }
}

type BtcOpts = Parameters<typeof fakeBtc>[1]
const deps = (a: BtcOpts, b: BtcOpts = a, calls?: string[]): CheckDeps => ({
  evm: [fakeEvm('e1', {}), fakeEvm('e2', {})],
  btc: [fakeBtc('m1', a, calls), fakeBtc('m2', b, calls)],
  sol: [fakeSol('s', {})],
})

/** 11 requests × 10 inputs naming 110 distinct txids that don't exist (the R3-S-1 poison). Seqs 0…109. */
const poison = (): SigRecordView[] => Array.from({ length: 110 }, (_, i) => btcRecord(i, Math.floor(i / 10) * 10, i % 10, txid(i), 0))

describe('review R3-S-1: the BTC txid cap only covers requests that spend a current coin', () => {
  it('110 fabricated txids no longer block Buy: every request is inactive, with no outspends query', async () => {
    const calls: string[] = []
    const r = await checkCleanHistory(input(poison()), deps({ utxos: { [ADDR]: [{ txid: LIVE, vout: 0 }] } }, undefined, calls))
    expect(new Set(r.items.map((i) => `${i.status}/${i.reason}`))).toEqual(new Set(['inactive/not_a_current_coin']))
    expect(r.items[0]!.evidence).toMatchObject({ current_coins: 1, addresses: [ADDR], input_status: 'inactive' })
    expect(r.aggregate).toBe('clean')
    expect(r.buy_enabled).toBe(true)
    expect(calls).toEqual([`utxo:${ADDR}`, `utxo:${ADDR}`]) // one coin list per provider, no outspends
  })

  it('before the fix the same history was unknown forever; a source that cannot list coins still is (fail closed)', async () => {
    const r = await checkCleanHistory(input(poison()), deps({}))
    expect(new Set(r.items.map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
    expect(r.aggregate).toBe('unknown')
  })

  it('a live signature among them still blocks: the request spending a current coin is checked and is unused', async () => {
    const calls: string[] = []
    const recs = [...poison(), btcRecord(110, 110, 0, LIVE, 0)]
    const r = await checkCleanHistory(
      input(recs),
      deps({ utxos: { [ADDR]: [{ txid: LIVE, vout: 0 }] }, outs: { [LIVE]: [{ spent: false }] } }, undefined, calls),
    )
    const live = r.items.find((i) => i.seq === 110)!
    expect([live.status, live.reason]).toEqual(['unused', 'outpoint_unspent'])
    expect(r.items.filter((i) => i.seq < 110).every((i) => i.status === 'inactive')).toBe(true)
    expect(r.aggregate).toBe('blocked')
    expect(calls.filter((c) => !c.startsWith('utxo:'))).toEqual([LIVE, LIVE]) // only the touching txid, on both providers
  })

  it("a touching request's other inputs are checked too: one of them spent ⇒ the whole request is dead (tx_conflict)", async () => {
    const recs = [...poison(), btcRecord(110, 110, 0, LIVE, 0), btcRecord(111, 110, 1, OLD, 3)]
    const outs = {
      [LIVE]: [{ spent: false }],
      [OLD]: [{ spent: false }, { spent: false }, { spent: false }, { spent: true, txid: 'ee'.repeat(32), status: { confirmed: true, block_height: 900 } }],
    }
    const r = await checkCleanHistory(input(recs), deps({ tip: 1000, utxos: { [ADDR]: [{ txid: LIVE, vout: 0 }] }, outs }))
    const req = r.items.filter((i) => i.request_id === 110).map((i) => [i.seq, i.status, i.reason])
    expect(req).toEqual([
      [110, 'spent', 'tx_conflict'],
      [111, 'spent', 'outpoint_spent'],
    ])
    expect(r.aggregate).toBe('clean')
  })

  it('touching requests that still name > cap txids stay unknown (consolidating the coins is the remedy)', async () => {
    const coins = Array.from({ length: 101 }, (_, i) => ({ txid: txid(500 + i), vout: 0 }))
    const recs = [...poison(), ...coins.map((c, i) => btcRecord(110 + i, 110 + i, 0, c.txid, 0))]
    const r = await checkCleanHistory(input(recs), deps({ utxos: { [ADDR]: coins } }))
    expect(new Set(r.items.filter((i) => i.seq >= 110).map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
    expect(r.items.filter((i) => i.seq < 110).every((i) => i.status === 'inactive')).toBe(true)
    expect(r.items.find((i) => i.seq === 110)!.evidence).toMatchObject({ distinct_txids: 101, cap: 100 })
    expect(r.aggregate).toBe('unknown')
  })

  it('the coin list is the union over providers: a coin only one of them lists is still checked', async () => {
    const recs = [...poison(), btcRecord(110, 110, 0, LIVE, 0)]
    const r = await checkCleanHistory(
      input(recs),
      deps({ utxos: { [ADDR]: [] }, outs: { [LIVE]: [{ spent: false }] } }, { utxos: { [ADDR]: [{ txid: LIVE, vout: 0 }] }, outs: { [LIVE]: [{ spent: false }] } }),
    )
    expect(r.items.find((i) => i.seq === 110)!.status).toBe('unused')
    expect(r.aggregate).toBe('blocked')
  })

  it('no coin list (both providers fail) ⇒ the cap applies to every record; one provider is enough only if the policy allows it', async () => {
    const both = await checkCleanHistory(input(poison()), deps({ utxoFail: true }))
    expect(new Set(both.items.map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
    const one = deps({ utxoFail: true }, { utxos: { [ADDR]: [] } })
    expect((await checkCleanHistory(input(poison()), one)).aggregate).toBe('clean')
    const strict = await checkCleanHistory(input(poison(), { policy: { allowSingleSource: false } }), one)
    expect(new Set(strict.items.map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
    // a malformed coin list counts as a failed provider
    const bad = deps({ utxos: { [ADDR]: [{ txid: 'not-a-txid', vout: 0 }] } })
    expect(new Set((await checkCleanHistory(input(poison()), bad)).items.map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
  })

  it('under the cap nothing changes: no coin list is fetched and every record gets its own verdict', async () => {
    const calls: string[] = []
    const recs = [btcRecord(0, 0, 0, OLD, 3)]
    const outs = { [OLD]: [{ spent: false }, { spent: false }, { spent: false }, { spent: true, txid: 'ee'.repeat(32), status: { confirmed: true, block_height: 900 } }] }
    const r = await checkCleanHistory(input(recs), deps({ tip: 1000, utxos: { [ADDR]: [] }, outs }, undefined, calls))
    expect(r.items[0]).toMatchObject({ status: 'spent', reason: 'outpoint_spent' })
    expect(calls.some((c) => c.startsWith('utxo:'))).toBe(false)
  })

  it('inactive items are encumbered and never cached; cached spent records still count as spent', async () => {
    const recs = poison()
    const cached = new Map<number, Record<string, unknown>>([[0, { reason: 'outpoint_spent', sources: 2 }]])
    const res = await checkBtc(recs, [fakeBtc('m1', { utxos: { [ADDR]: [] } })], TESTNET_POLICY, cached, undefined, [ADDR])
    expect(res.items[0]).toMatchObject({ seq: 0, status: 'spent', cached: true })
    // the rest of request 0 is spent too (any input spent ⇒ the request is dead); other requests are inactive
    expect(res.items.filter((i) => i.request_id === 0).every((i) => i.status === 'spent')).toBe(true)
    expect(res.items.filter((i) => i.request_id !== 0).every((i) => i.status === 'inactive' && !i.cached)).toBe(true)
    // the dead request's other inputs are final too (tx_conflict) and get cached; inactive inputs never are
    expect(res.finals.map((f) => f.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(res.finals.every((f) => f.evidence.reason === 'tx_conflict')).toBe(true)
    expect(res.encumbered).toHaveLength(100) // requests 1…10, never the dead request 0
    expect(res.encumbered).toContain(`${txid(10)}:0`)
  })
})
