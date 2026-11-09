import { describe, expect, it } from 'vitest'
import { base58 } from '@scure/base'
import {
  checkCleanHistory,
  memoryVerdictCache,
  ownBtcScripts,
  requestStatus,
  verifiedBtcBalance,
  type CheckDeps,
  type CheckInput,
  type SigRecordView,
} from '../src/clean-history'
import { toHex } from '../src/bytes'
import { deriveEd25519, deriveSatchelAddresses, deriveSecp256k1, hash160, nearKeyString } from '../src/derive'
import { hexToBytesStrict } from '../src/bytes'
import solana from './fixtures/solana-devnet.json' with { type: 'json' }
import {
  btcRecord,
  evmRecord,
  fakeBtc,
  fakeEvm,
  fakeSol,
  recordedBtcSources,
  recordedEvmSource,
  recordedSolSource,
  snapshot,
  solRecord,
  TX,
} from './helpers'

// The kb/11 spike contract: token 1's EVM address is 0x532b…832d (the kb/31 sender), its SOL address 6P6G…XPiA (kb/32).
const CONTRACT = 'satchel-spk-chain-e9ea1a.testnet'
const NOW = Date.parse('2026-10-21T21:32:30Z') // when the fixtures were recorded
const KB31_TX = '02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'
const kb31Nonce = (n: number) =>
  // same tx shape, other nonce (RLP: nonce 0 = 80, 1..127 = single byte; list length unchanged)
  `02ee83aa36a7${n === 0 ? '80' : n.toString(16).padStart(2, '0')}${KB31_TX.slice(14)}`

const recorded = (): CheckDeps => ({
  evm: [recordedEvmSource('publicnode'), recordedEvmSource('drpc')],
  btc: recordedBtcSources(),
  sol: [recordedSolSource()],
})

function input(records: SigRecordView[], o: Partial<CheckInput> = {}): CheckInput {
  return {
    network: 'testnet',
    contractId: CONTRACT,
    tokenId: '1',
    role: 'dev',
    near: [snapshot('fastnear', records), snapshot('drpc', records)],
    now: NOW,
    ...o,
  }
}

const KB32_BLOCKHASH_HEX = toHex(base58.decode('2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW'))
const FRESH_HEX = toHex(base58.decode(solana.fresh_blockhash))
const DAY = 86_400_000

describe('clean history: recorded fixtures (live testnet4, Sepolia, devnet answers, 2026-10-21)', () => {
  it('EVM: the leaked kb/31 nonce-0 signature is still unused ⇒ blocked (two providers agree)', async () => {
    const r = await checkCleanHistory(input([evmRecord(0, KB31_TX)]), recorded())
    expect(r.addresses.evm).toBe('0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d')
    expect(r.items[0]).toMatchObject({ chain: 'evm', status: 'unused', reason: 'nonce_not_used', nonce: '0', sources: 2 })
    expect(r.accounts.find((a) => a.chain === 'evm')).toMatchObject({ status: 'ok', reason: 'no_code', sources: 2 })
    expect(r.aggregate).toBe('blocked')
    expect(r.buy_enabled).toBe(false)
    expect(r.expected_sig_count).toBeNull()
    expect(r.sources_note).toBeNull()
  })

  it('BTC: kb/30 verdicts (DEAD / LIVE / NOT_CREATED / BAD_VOUT) from one /outspends per txid on both providers', async () => {
    const calls: string[] = []
    const recs = [
      btcRecord(0, 0, 0, TX.dead, 429), // spent by 515f4966… (kb/30 §7)
      btcRecord(1, 1, 0, TX.live, 0),
      btcRecord(2, 2, 0, TX.fake, 0),
      btcRecord(3, 3, 0, TX.live, 5), // only 2 outputs
      btcRecord(4, 4, 0, TX.fake, 1), // same txid as seq 2: deduplicated
    ]
    const r = await checkCleanHistory(input(recs), { ...recorded(), btc: recordedBtcSources(calls) })
    const st = Object.fromEntries(r.items.map((i) => [i.seq, [i.status, i.reason]]))
    expect(st).toEqual({
      0: ['spent', 'outpoint_spent'],
      1: ['unused', 'outpoint_unspent'],
      2: ['unfunded', 'tx_not_found'],
      3: ['unfunded', 'vout_out_of_range'],
      4: ['unfunded', 'tx_not_found'],
    })
    expect(r.items[0]!.evidence).toMatchObject({ spending_txid: '515f4966b1ac04d2d3ecdc750c40e01d54138bd79be282b8d96d86c83491aa26', confirmations: 60 })
    expect(r.items[0]!.sources).toBe(2)
    expect(r.aggregate).toBe('blocked') // seq 1 is unused
    // one /outspends per DISTINCT txid per provider (3 txids × 2 providers), plus genesis + tip; never /outspend/:v or /status
    expect(calls.filter((c) => c.endsWith('/outspends')).length).toBe(6)
    expect(calls.some((c) => /\/outspend\/\d+$|\/status$/.test(c))).toBe(false)
    expect(calls.filter((c) => c === '/block-height/0').length).toBe(2)
    expect(r.encumbered_outpoints.sort()).toEqual([`${TX.fake}:0`, `${TX.fake}:1`, `${TX.live}:0`, `${TX.live}:5`].sort())
  })

  it('BTC: the Esplora trap — /outspend/0 says {"spent":false} for a txid that does not exist; we report unfunded, not unused', async () => {
    const res = await recordedBtcSources()[0]!.outspends(TX.fake)
    expect(res).toBeNull() // /outspends → 404
    const { default: fx } = await import('./fixtures/testnet4-esplora.json', { with: { type: 'json' } })
    expect(fx.providers['mempool.space'][`/tx/${TX.fake}/outspend/0` as keyof (typeof fx.providers)['mempool.space']]).toEqual({ status: 200, body: '{"spent":false}' })
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, TX.fake, 0)]), recorded())
    expect(r.items[0]!.status).toBe('unfunded')
    expect(r.aggregate).toBe('clean') // unfunded never blocks (D-04) …
    expect(r.encumbered_outpoints).toEqual([`${TX.fake}:0`]) // … but those coins are excluded if they ever appear
  })

  it('BTC per request: one spent input kills the whole request (SIGHASH_ALL + completeness) ⇒ clean', async () => {
    const recs = [btcRecord(0, 0, 0, TX.dead, 429), btcRecord(1, 0, 1, TX.live, 0)]
    const r = await checkCleanHistory(input(recs), recorded())
    expect(r.items.map((i) => [i.status, i.reason])).toEqual([
      ['spent', 'outpoint_spent'],
      ['spent', 'tx_conflict'],
    ])
    expect(r.items[1]!.evidence.input_status).toBe('unused')
    expect(r.aggregate).toBe('clean')
    expect(r.buy_enabled).toBe(true)
    expect(r.expected_sig_count).toBe(2)
    expect(r.encumbered_outpoints).toEqual([])
  })

  it('SOL: old record + blockhash invalid ⇒ expired; old + valid ⇒ unused; < 120 s ⇒ unused (young, no query)', async () => {
    const recs = [solRecord(0, KB32_BLOCKHASH_HEX, NOW - DAY), solRecord(1, FRESH_HEX, NOW - 130_000), solRecord(2, 'cd'.repeat(32), NOW - 60_000)]
    const r = await checkCleanHistory(input(recs), recorded())
    expect(r.items.map((i) => [i.status, i.reason])).toEqual([
      ['expired', 'blockhash_expired'],
      ['unused', 'blockhash_valid'],
      ['unused', 'young'],
    ])
    expect(r.items[0]!.recent_blockhash).toBe('2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW')
    expect(r.accounts.find((a) => a.chain === 'sol')).toMatchObject({ address: '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA', status: 'ok', reason: 'absent' })
    expect(r.aggregate).toBe('blocked')
  })

  it('mixed history, all dead ⇒ clean, sig_count echoed for buy()', async () => {
    const recs = [btcRecord(0, 0, 0, TX.dead, 429), solRecord(1, KB32_BLOCKHASH_HEX, NOW - DAY), btcRecord(2, 2, 0, TX.fake, 3)]
    const r = await checkCleanHistory(input(recs), recorded())
    expect(r.items.map((i) => i.status)).toEqual(['spent', 'expired', 'unfunded'])
    expect(r).toMatchObject({ aggregate: 'clean', buy_enabled: true, expected_sig_count: 3, sig_count: 3 })
  })
})

describe('clean history: EVM rules', () => {
  const evm = (a: Parameters<typeof fakeEvm>[1], b: Parameters<typeof fakeEvm>[1] = a): CheckDeps => ({ evm: [fakeEvm('a', a), fakeEvm('b', b)], btc: [], sol: [fakeSol('s', {})] })

  it('spent when the count at latest−3 exceeds the nonce; settling when only latest does; else unused', async () => {
    const recs = [evmRecord(0, kb31Nonce(0)), evmRecord(1, kb31Nonce(1)), evmRecord(2, kb31Nonce(2))]
    const r = await checkCleanHistory(input(recs), evm({ safe: 1n, latest: 2n }))
    expect(r.items.map((i) => i.status)).toEqual(['spent', 'settling', 'unused'])
    expect(r.aggregate).toBe('blocked')
    const r2 = await checkCleanHistory(input(recs.slice(0, 2)), evm({ safe: 1n, latest: 2n }))
    expect(r2.aggregate).toBe('settling')
  })

  it('both providers are queried at the same block (min head − 3)', async () => {
    const tags: (bigint | 'latest')[] = []
    const spy = (name: string, head: bigint) => ({
      ...fakeEvm(name, { head, safe: 5n }),
      getTransactionCount: async (_a: string, b: bigint | 'latest') => (tags.push(b), 5n),
    })
    await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))]), { evm: [spy('a', 1000n), spy('b', 1002n)], btc: [], sol: [fakeSol('s', {})] })
    expect(tags.filter((t) => t !== 'latest')).toEqual([997n, 997n])
  })

  it('providers disagree ⇒ unknown', async () => {
    const r = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))]), evm({ safe: 1n }, { safe: 0n }))
    expect(r.items[0]).toMatchObject({ status: 'unknown', reason: 'providers_disagree' })
    expect(r.aggregate).toBe('unknown')
  })

  it('one provider down ⇒ the other decides, labelled "1 of 2 sources" (H-25); disallowed ⇒ unknown', async () => {
    const deps = evm({ safe: 1n }, { fail: true })
    const r = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))]), deps)
    expect(r.items[0]).toMatchObject({ status: 'spent', sources: 1 })
    expect(r).toMatchObject({ aggregate: 'clean', sources_note: '1 of 2 sources', buy_enabled: true })
    const strict = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))], { policy: { allowSingleSource: false } }), deps)
    expect(strict.items[0]).toMatchObject({ status: 'unknown', reason: 'one_provider_down' })
    expect(strict.aggregate).toBe('unknown')
  })

  it('a provider on the wrong chain is ignored (as if down), both down ⇒ unknown', async () => {
    const r = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))]), evm({ safe: 1n }, { safe: 1n, chainId: 1 }))
    expect(r.items[0]!.sources).toBe(1)
    const down = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0))]), evm({ fail: true }))
    expect(down.items[0]).toMatchObject({ status: 'unknown', reason: 'providers_down' })
    expect(down.accounts[0]!.status).toBe('unknown')
    expect(down.aggregate).toBe('unknown')
  })

  it('EIP-7702 delegation or any code on the Satchel EOA ⇒ unsafe in every mode', async () => {
    for (const role of ['dev', 'rc', 'final'] as const) {
      const r = await checkCleanHistory(input([], { role, expectedCodeHash: 'ab'.repeat(32) }), evm({ code: '0xef0100a34e1e389097409aa65ff374af50b402e4a8f5c3' }))
      expect(r.accounts[0]).toMatchObject({ status: 'unsafe', reason: 'eip7702_delegation' })
      expect(r.aggregate).toBe('unsafe')
    }
  })

  it('a record whose unsigned_tx does not hash to its payload is unknown (never trusted)', async () => {
    const bad = evmRecord(0, kb31Nonce(0), { payload: 'ff'.repeat(32) })
    const r = await checkCleanHistory(input([bad]), evm({ safe: 9n }))
    expect(r.items[0]).toMatchObject({ status: 'unknown', reason: 'record_inconsistent' })
  })
})

describe('clean history: BTC rules', () => {
  const T1 = '11'.repeat(32)
  const T2 = '22'.repeat(32)
  const deps = (a: Parameters<typeof fakeBtc>[1], b: Parameters<typeof fakeBtc>[1] = a, calls?: string[]): CheckDeps => ({
    evm: [fakeEvm('e1', {}), fakeEvm('e2', {})],
    btc: [fakeBtc('m1', a, calls), fakeBtc('m2', b, calls)],
    sol: [fakeSol('s', {})],
  })

  it('unconfirmed spend ⇒ settling (full-RBF); confirmed below K ⇒ settling; at K ⇒ spent', async () => {
    const outs = {
      [T1]: [{ spent: true, txid: 'aa'.repeat(32), status: { confirmed: false } }],
      [T2]: [{ spent: true, txid: 'bb'.repeat(32), status: { confirmed: true, block_height: 1000 } }],
    }
    const recs = [btcRecord(0, 0, 0, T1, 0), btcRecord(1, 1, 0, T2, 0)]
    const r = await checkCleanHistory(input(recs, { policy: { btcK: 2 } }), deps({ tip: 1000, outs }))
    expect(r.items.map((i) => [i.status, i.reason])).toEqual([
      ['settling', 'spend_unconfirmed'],
      ['settling', 'confirming'],
    ])
    expect(r.aggregate).toBe('settling')
    const k1 = await checkCleanHistory(input([btcRecord(0, 0, 0, T2, 0)]), deps({ tip: 1000, outs }))
    expect(k1.items[0]!.status).toBe('spent')
  })

  it('providers disagree ⇒ unknown; genesis guard failure drops a provider ⇒ "1 of 2 sources"', async () => {
    const spent = { [T1]: [{ spent: true, txid: 'aa'.repeat(32), status: { confirmed: true, block_height: 990 } }] }
    const unspent = { [T1]: [{ spent: false }] }
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs: spent }, { outs: unspent }))
    expect(r.items[0]).toMatchObject({ status: 'unknown', reason: 'providers_disagree' })
    const g = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs: spent }, { outs: unspent, genesisOk: false }))
    expect(g.items[0]).toMatchObject({ status: 'spent', sources: 1 })
    expect(g.sources_note).toBe('1 of 2 sources')
  })

  it('request precedence: spent > unused > unknown > settling > foreign > unfunded', () => {
    expect(requestStatus(['foreign', 'unfunded'])).toBe('foreign')
    expect(requestStatus(['foreign', 'settling'])).toBe('settling')
    expect(requestStatus(['foreign', 'unused'])).toBe('unused')
    expect(requestStatus(['unfunded', 'unused', 'spent'])).toBe('spent')
    expect(requestStatus(['unfunded', 'settling', 'unused'])).toBe('unused')
    expect(requestStatus(['settling', 'unknown'])).toBe('unknown')
    expect(requestStatus(['unfunded', 'settling'])).toBe('settling')
    expect(requestStatus(['unfunded', 'unfunded'])).toBe('unfunded')
  })

  it('a request with one unused and one unfunded input stays unused (blocks Buy)', async () => {
    const outs = { [T1]: [{ spent: false }], [T2]: null }
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0), btcRecord(1, 0, 1, T2, 0)]), deps({ outs }))
    expect(r.items.map((i) => [i.status, i.reason])).toEqual([
      ['unused', 'outpoint_unspent'],
      ['unused', 'request_unused'],
    ])
  })

  it('more than 100 distinct txids ⇒ unknown, with no queries (R-20 soft cap)', async () => {
    const calls: string[] = []
    const recs = Array.from({ length: 101 }, (_, i) => btcRecord(i, i, 0, i.toString(16).padStart(64, '0'), 0))
    const r = await checkCleanHistory(input(recs), deps({ outs: {} }, { outs: {} }, calls))
    expect(new Set(r.items.map((i) => i.reason))).toEqual(new Set(['too_many_txids']))
    expect(calls).toEqual([])
    expect(r.aggregate).toBe('unknown')
  })

  it('verified balance excludes encumbered and unconfirmed UTXOs', () => {
    const utxos = [
      { txid: T1, vout: 0, value: 10_000, status: { confirmed: true, block_height: 990 } },
      { txid: T2, vout: 1, value: 20_000, status: { confirmed: true, block_height: 991 } },
      { txid: T2, vout: 2, value: 5_000, status: { confirmed: false } },
    ]
    expect(verifiedBtcBalance(utxos, [`${T2}:1`], 1000, 1)).toEqual({ verified: 10_000n, encumbered: 20_000n, unconfirmed: 5_000n })
  })
})

describe('clean history: SOL rules', () => {
  it('one provider saying "invalid" is enough once the record is ≥ 120 s old (R-19)', async () => {
    const bh = 'ef'.repeat(32)
    const b58 = base58.encode(Uint8Array.from(Buffer.from(bh, 'hex')))
    const r = await checkCleanHistory(input([solRecord(0, bh, NOW - 121_000)]), {
      evm: [fakeEvm('e', {}), fakeEvm('f', {})],
      btc: [],
      sol: [fakeSol('a', { valid: { [b58]: true } }), fakeSol('b', { valid: { [b58]: false } })],
    })
    expect(r.items[0]).toMatchObject({ status: 'expired', sources: 1 })
    expect(r.sources_note).toBeNull() // SOL needs only one provider by design
  })

  it('account owned by another program, or with data ⇒ unsafe; all providers down ⇒ unknown', async () => {
    const base = { evm: [fakeEvm('e', {}), fakeEvm('f', {})], btc: [] }
    const owned = await checkCleanHistory(input([]), { ...base, sol: [fakeSol('a', { account: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', dataLength: 165 } })] })
    expect(owned.accounts[1]).toMatchObject({ status: 'unsafe', reason: 'not_system_owned' })
    const data = await checkCleanHistory(input([]), { ...base, sol: [fakeSol('a', { account: { owner: '11111111111111111111111111111111', dataLength: 80 } })] })
    expect(data.accounts[1]).toMatchObject({ status: 'unsafe', reason: 'has_data' })
    const plain = await checkCleanHistory(input([]), { ...base, sol: [fakeSol('a', { account: { owner: '11111111111111111111111111111111', dataLength: 0 } })] })
    expect(plain.accounts[1]).toMatchObject({ status: 'ok', reason: 'system' })
    const down = await checkCleanHistory(input([]), { ...base, sol: [fakeSol('a', { fail: true })] })
    expect(down.accounts[1]!.status).toBe('unknown')
    expect(down.aggregate).toBe('unknown')
  })
})

describe('clean history: NEAR sources, keys, cache', () => {
  const quiet = (): CheckDeps => ({ evm: [fakeEvm('e', {}), fakeEvm('f', {})], btc: [], sol: [fakeSol('s', {})] })

  it('no records and accounts ok ⇒ empty (Buy enabled with expected_sig_count 0)', async () => {
    const r = await checkCleanHistory(input([]), quiet())
    expect(r).toMatchObject({ aggregate: 'empty', buy_enabled: true, expected_sig_count: 0, sig_count: 0 })
  })

  it('the two NEAR RPCs must agree on the safety fields; status/signature lag is ignored', async () => {
    const a = [evmRecord(0, kb31Nonce(0))]
    const lagging = [{ ...a[0]!, status: 'pending' as const }]
    const ok = await checkCleanHistory(input(a, { near: [snapshot('f', a), snapshot('d', lagging)] }), quiet())
    expect(ok.contract.near_sources).toBe(2)
    expect(ok.reasons).not.toContain('near_disagree')
    const changed = [{ ...a[0]!, height: a[0]!.height + 1 }]
    const bad = await checkCleanHistory(input(a, { near: [snapshot('f', a), snapshot('d', changed)] }), quiet())
    expect(bad.aggregate).toBe('unknown')
    expect(bad.reasons).toContain('near_disagree')
    expect(bad.sig_count).toBeNull()
  })

  it('records must cover seq 0..sig_count exactly', async () => {
    const recs = [evmRecord(0, kb31Nonce(0))]
    const r = await checkCleanHistory(input(recs, { near: [snapshot('f', recs, { sigCount: 2 }), snapshot('d', recs, { sigCount: 2 })] }), quiet())
    expect(r.aggregate).toBe('unknown')
    expect(r.reasons).toContain('records_incomplete')
  })

  it('one NEAR RPC down ⇒ "1 of 2 sources"; both down ⇒ unknown', async () => {
    const one = await checkCleanHistory(input([], { near: [snapshot('f', []), { source: 'd', error: 'timeout' }] }), quiet())
    expect(one).toMatchObject({ aggregate: 'empty', sources_note: '1 of 2 sources' })
    const none = await checkCleanHistory(input([], { near: [{ source: 'f', error: 'x' }, { source: 'd', error: 'y' }] }), quiet())
    expect(none.aggregate).toBe('unknown')
    expect(none.reasons).toContain('near_unavailable')
  })

  it("MPC derived_public_key must match our derivation (kb/70 F19); a mismatch is unsafe even on dev", async () => {
    const keys = {
      btc: nearKeyString('secp256k1', deriveSecp256k1('testnet', CONTRACT, 'satchel/1/btc').uncompressed),
      evm: nearKeyString('secp256k1', deriveSecp256k1('testnet', CONTRACT, 'satchel/1/evm').uncompressed),
      sol: nearKeyString('ed25519', deriveEd25519('testnet', CONTRACT, 'satchel/1/sol')),
    }
    const good = await checkCleanHistory(input([], { near: [snapshot('f', [], { mpcKeys: keys }), snapshot('d', [], { mpcKeys: keys })] }), quiet())
    expect(good.contract.mpc_keys_ok).toBe(true)
    expect(good.warnings).not.toContain('mpc_keys_not_checked')
    const wrong = { ...keys, sol: nearKeyString('ed25519', deriveEd25519('testnet', CONTRACT, 'satchel/2/sol')) }
    const bad = await checkCleanHistory(input([], { near: [snapshot('f', [], { mpcKeys: wrong }), snapshot('d', [], { mpcKeys: wrong })] }), quiet())
    expect(bad.aggregate).toBe('unsafe')
    expect(bad.reasons).toContain('mpc_keys_mismatch')
  })

  it('addresses the UI shows must equal our derivation', async () => {
    const r = await checkCleanHistory(input([], { displayedAddresses: { evm: '0x61739f33AdbB7F76c1b5B222E4119085257528BE' } }), quiet())
    expect(r.aggregate).toBe('unsafe')
    expect(r.reasons).toContain('displayed_addresses_mismatch')
    const ok = await checkCleanHistory(input([], { displayedAddresses: { evm: '0x532b9aaea7803adcac5fb8fe53166147cee4832d' } }), quiet())
    expect(ok.contract.addresses_ok).toBe(true)
  })

  it('final verdicts are cached permanently and reused without queries; non-final ones are not cached', async () => {
    const cache = memoryVerdictCache()
    const recs = [btcRecord(0, 0, 0, TX.dead, 429), solRecord(1, KB32_BLOCKHASH_HEX, NOW - DAY), btcRecord(2, 2, 0, TX.live, 0)]
    const first = await checkCleanHistory(input(recs), { ...recorded(), cache })
    expect(first.items.map((i) => i.status)).toEqual(['spent', 'expired', 'unused'])
    expect(cache.size()).toBe(2)
    const calls: string[] = []
    const dead = { evm: [fakeEvm('e', {}), fakeEvm('f', {})], btc: [fakeBtc('x', { outs: { [TX.live]: [{ spent: false }] } }, calls)], sol: [fakeSol('s', { fail: true })], cache }
    const second = await checkCleanHistory(input(recs), dead)
    expect(second.items.map((i) => [i.status, i.cached])).toEqual([
      ['spent', true],
      ['expired', true],
      ['unused', false],
    ])
    expect(calls).toEqual([TX.live]) // the cached txid is not queried again
  })

  it('the report is plain JSON (the server route returns it as is)', async () => {
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, TX.dead, 429), evmRecord(1, KB31_TX)]), recorded())
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })
})

describe('clean history: BTC foreign prevouts (review S-07)', () => {
  const T1 = '11'.repeat(32)
  const T2 = '22'.repeat(32)
  const T3 = '33'.repeat(32)
  const pub = deriveSatchelAddresses('testnet', CONTRACT, '1').btcPubkey
  const pkh = toHex(hash160(hexToBytesStrict(pub)))
  const own = `0014${pkh}`
  const other = `0014${'ab'.repeat(20)}`
  const deps = (a: Parameters<typeof fakeBtc>[1], b: Parameters<typeof fakeBtc>[1] = a, calls?: string[]): CheckDeps => ({
    evm: [fakeEvm('e1', {}), fakeEvm('e2', {})],
    btc: [fakeBtc('m1', a, calls), fakeBtc('m2', b, calls)],
    sol: [fakeSol('s', {})],
  })
  const tx = (...scripts: string[]) => ({ vout: scripts.map((scriptpubkey) => ({ scriptpubkey, value: 1000 })) })

  it("the token's own scripts are P2WPKH, P2SH-P2WPKH and P2WSH(P2PKH) of its pkh", () => {
    const s = ownBtcScripts(pub)
    expect(s.has(own)).toBe(true)
    expect([...s].map((x) => x.slice(0, 4)).sort()).toEqual(['0014', '0020', 'a914'])
  })

  it('an unspent prevout at someone else\'s script is foreign: dead, non-blocking (Buy enabled)', async () => {
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 1)]), deps({ outs: { [T1]: [{ spent: false }, { spent: false }] }, txs: { [T1]: tx(own, other) } }))
    expect(r.items[0]).toMatchObject({ status: 'foreign', reason: 'prevout_not_ours', sources: 2 })
    expect(r.items[0]!.evidence).toMatchObject({ scriptpubkey: other, outspend: 'unused' })
    expect(r.aggregate).toBe('clean')
    expect(r.buy_enabled).toBe(true)
  })

  it("an unspent prevout at any of the token's own scripts stays unused (blocks Buy)", async () => {
    for (const script of ownBtcScripts(pub)) {
      const r = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs: { [T1]: [{ spent: false }] }, txs: { [T1]: tx(script) } }))
      expect(r.items[0]!.status, script).toBe('unused')
      expect(r.aggregate).toBe('blocked')
    }
  })

  it('a foreign input next to an unused own input keeps the whole request unused; next to an unfunded one it is foreign', async () => {
    const outs = { [T1]: [{ spent: false }], [T2]: [{ spent: false }], [T3]: null }
    const txs = { [T1]: tx(own), [T2]: tx(other) }
    const mixed = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0), btcRecord(1, 0, 1, T2, 0)]), deps({ outs, txs }))
    expect(mixed.items.map((i) => [i.status, i.evidence.input_status])).toEqual([
      ['unused', 'unused'],
      ['unused', 'foreign'],
    ])
    expect(mixed.aggregate).toBe('blocked')
    const dead = await checkCleanHistory(input([btcRecord(0, 0, 0, T2, 0), btcRecord(1, 0, 1, T3, 0)]), deps({ outs, txs }))
    expect(dead.items.map((i) => i.status)).toEqual(['foreign', 'foreign'])
    expect(dead.aggregate).toBe('clean')
  })

  it('an unconfirmed spend of a foreign prevout is foreign; a confirmed spend is spent and needs no /tx call', async () => {
    const calls: string[] = []
    const outs = {
      [T1]: [{ spent: true, txid: 'aa'.repeat(32), status: { confirmed: false } }],
      [T2]: [{ spent: true, txid: 'bb'.repeat(32), status: { confirmed: true, block_height: 990 } }],
    }
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0), btcRecord(1, 1, 0, T2, 0)]), deps({ outs, txs: { [T1]: tx(other) } }, undefined, calls))
    expect(r.items.map((i) => i.status)).toEqual(['foreign', 'spent'])
    expect(calls.filter((c) => c.startsWith('tx:'))).toEqual([`tx:${T1}`, `tx:${T1}`])
  })

  it('fails closed: no /tx support, a failed /tx call, or an unreadable answer leaves the verdict unused', async () => {
    const outs = { [T1]: [{ spent: false }] }
    const none = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs }))
    expect(none.items[0]!.status).toBe('unused')
    const failing = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs, txs: {} }))
    expect(failing.items[0]!.status).toBe('unused')
    const odd = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs, txs: { [T1]: { vout: 'nope' } } }))
    expect(odd.items[0]!.status).toBe('unused')
    // one provider sees the foreign script, the other cannot read it: they disagree ⇒ unknown (still blocks)
    const split = await checkCleanHistory(input([btcRecord(0, 0, 0, T1, 0)]), deps({ outs, txs: { [T1]: tx(other) } }, { outs }))
    expect(split.items[0]).toMatchObject({ status: 'unknown', reason: 'providers_disagree' })
    expect(split.buy_enabled).toBe(false)
  })
})


// U-1 (docs/security/seller-threat-model.md): a record's status and signature come from the UX-only callback. A
// request that timed out (`failed`), is still waiting (`pending`) or whose answer did not parse (`unparsed`) may still
// have produced a valid signature somewhere, so the check must judge it exactly like a `signed` record of the same
// payload: by the chain state its nonce, outpoint or blockhash names.
describe('clean history: record status is never trusted', () => {
  const NOT_SIGNED = ['failed', 'pending', 'unparsed'] as const
  const SECP_SIG = { r: '11'.repeat(32), s: '22'.repeat(32), recovery_id: 1 }
  const ED_SIG = { signature: '33'.repeat(64) }

  it.each(NOT_SIGNED)('EVM: an unused nonce-0 record with status %s blocks Buy, exactly like a signed one', async (status) => {
    const signed = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0), { signature: SECP_SIG })]), recorded())
    const r = await checkCleanHistory(input([evmRecord(0, kb31Nonce(0), { status, signature: null })]), recorded())
    expect(r.items[0]).toMatchObject({ chain: 'evm', status: 'unused', reason: 'nonce_not_used', nonce: '0', sources: 2 })
    expect(r.aggregate).toBe('blocked')
    expect(r.buy_enabled).toBe(false)
    expect(r.expected_sig_count).toBeNull()
    expect(r).toEqual(signed)
  })

  it.each(NOT_SIGNED)('BTC: a record with status %s on the kb/30 LIVE outpoint stays unused and blocks Buy', async (status) => {
    const signed = await checkCleanHistory(input([btcRecord(0, 0, 0, TX.live, 0, { signature: SECP_SIG })]), { ...recorded(), btc: recordedBtcSources() })
    const r = await checkCleanHistory(input([btcRecord(0, 0, 0, TX.live, 0, { status, signature: null })]), { ...recorded(), btc: recordedBtcSources() })
    expect(r.items[0]).toMatchObject({ chain: 'btc', status: 'unused', reason: 'outpoint_unspent', sources: 2 })
    expect(r.aggregate).toBe('blocked')
    expect(r.buy_enabled).toBe(false)
    expect(r.encumbered_outpoints).toEqual([`${TX.live}:0`])
    expect(r).toEqual(signed)
  })

  it.each(NOT_SIGNED)('SOL: a 30 s old record with status %s is unused (young) and blocks Buy', async (status) => {
    const hex = 'cd'.repeat(32)
    const signed = await checkCleanHistory(input([solRecord(0, hex, NOW - 30_000, { signature: ED_SIG })]), recorded())
    const r = await checkCleanHistory(input([solRecord(0, hex, NOW - 30_000, { status, signature: null })]), recorded())
    expect(r.items[0]).toMatchObject({ chain: 'sol', status: 'unused', reason: 'young' })
    expect(r.aggregate).toBe('blocked')
    expect(r.buy_enabled).toBe(false)
    expect(r).toEqual(signed)
  })

  it('the same holds the other way: a not-signed record whose nonce, outpoint or blockhash is dead is dead (Buy enabled)', async () => {
    for (const status of NOT_SIGNED) {
      const recs = [btcRecord(0, 0, 0, TX.dead, 429, { status }), solRecord(1, KB32_BLOCKHASH_HEX, NOW - DAY, { status }), btcRecord(2, 2, 0, TX.fake, 3, { status })]
      const r = await checkCleanHistory(input(recs), recorded())
      expect(r.items.map((i) => i.status), status).toEqual(['spent', 'expired', 'unfunded'])
      expect(r, status).toMatchObject({ aggregate: 'clean', buy_enabled: true, expected_sig_count: 3, sig_count: 3 })
    }
  })

  it('a mixed history: one unused not-signed record among dead signed ones still blocks Buy', async () => {
    for (const status of NOT_SIGNED) {
      const recs = [btcRecord(0, 0, 0, TX.dead, 429, { signature: SECP_SIG }), solRecord(1, KB32_BLOCKHASH_HEX, NOW - DAY, { signature: ED_SIG }), btcRecord(2, 2, 0, TX.live, 0, { status })]
      const r = await checkCleanHistory(input(recs), recorded())
      expect(r.items.map((i) => i.status), status).toEqual(['spent', 'expired', 'unused'])
      expect(r, status).toMatchObject({ aggregate: 'blocked', buy_enabled: false, expected_sig_count: null })
    }
  })
})
