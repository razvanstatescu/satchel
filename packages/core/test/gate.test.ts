/**
 * INV-33 (spec §6, §7.3): with CONTRACT_ROLE=dev, lock or code-hash failures yield a visible warning while every
 * other check still gates Buy; with rc/final they yield `unsafe`.
 */
import { describe, expect, it } from 'vitest'
import { checkCleanHistory, gate, roleBanner, type CheckDeps, type GateInput } from '../src/clean-history'
import { btcRecord, fakeBtc, fakeEvm, fakeSol, snapshot } from './helpers'

const H = 'ab'.repeat(32)
const OTHER = 'cd'.repeat(32)

const base = (o: Partial<GateInput> = {}): GateInput => ({
  role: 'final',
  sigCount: 1,
  nearOk: true,
  contract: { exists: true, accessKeys: 0, codeOk: true, expectedCodeHash: H },
  mpcKeysOk: true,
  addressesOk: true,
  accounts: ['ok', 'ok'],
  items: ['spent'],
  ...o,
})

describe('gate modes by CONTRACT_ROLE (INV-33)', () => {
  const lockFailures: [string, Partial<GateInput>, string][] = [
    ['contract has keys', { contract: { exists: true, accessKeys: 2, codeOk: true, expectedCodeHash: H } }, 'contract_has_keys'],
    ['contract missing', { contract: { exists: false, accessKeys: 0, codeOk: null, expectedCodeHash: H } }, 'contract_missing'],
    ['code hash mismatch', { contract: { exists: true, accessKeys: 0, codeOk: false, expectedCodeHash: H } }, 'code_hash_mismatch'],
  ]

  it.each(lockFailures)('%s: dev ⇒ warning only, Buy still decided by the other checks', (_n, o, code) => {
    const g = gate(base({ role: 'dev', ...o }))
    expect(g.aggregate).toBe('clean')
    expect(g.buyEnabled).toBe(true)
    expect(g.warnings).toEqual(expect.arrayContaining(['dev_contract_checks_skipped', code]))
  })

  it.each(lockFailures)('%s: rc and final ⇒ unsafe', (_n, o, code) => {
    for (const role of ['rc', 'final'] as const) {
      const g = gate(base({ role, ...o }))
      expect(g.aggregate).toBe('unsafe')
      expect(g.buyEnabled).toBe(false)
      expect(g.reasons).toContain(code)
    }
  })

  it('rc/final without NEXT_PUBLIC_EXPECTED_CODE_HASH ⇒ unsafe (misconfiguration fails closed); dev ignores it', () => {
    const c = { exists: true, accessKeys: 0, codeOk: null, expectedCodeHash: null }
    expect(gate(base({ role: 'rc', contract: c })).reasons).toContain('expected_code_hash_not_configured')
    expect(gate(base({ role: 'final', contract: c })).aggregate).toBe('unsafe')
    expect(gate(base({ role: 'dev', contract: c })).aggregate).toBe('clean')
  })

  it('dev: every other check still gates Buy', () => {
    const dev = (o: Partial<GateInput>) => gate(base({ role: 'dev', contract: { exists: true, accessKeys: 3, codeOk: false, expectedCodeHash: H }, ...o }))
    expect(dev({ items: ['unused'] }).aggregate).toBe('blocked')
    expect(dev({ items: ['settling'] }).aggregate).toBe('settling')
    expect(dev({ items: ['unknown'] }).aggregate).toBe('unknown')
    expect(dev({ accounts: ['unsafe', 'ok'] }).aggregate).toBe('unsafe')
    expect(dev({ mpcKeysOk: false }).aggregate).toBe('unsafe')
    expect(dev({ addressesOk: false }).aggregate).toBe('unsafe')
    expect(dev({ nearOk: false, sigCount: null }).aggregate).toBe('unknown')
  })

  it('aggregate precedence: unsafe > unknown > blocked > settling > empty/clean', () => {
    expect(gate(base({ accounts: ['unsafe', 'unknown'], items: ['unknown', 'unused'] })).aggregate).toBe('unsafe')
    expect(gate(base({ items: ['unknown', 'unused', 'settling'] })).aggregate).toBe('unknown')
    expect(gate(base({ items: ['unused', 'settling'] })).aggregate).toBe('blocked')
    expect(gate(base({ items: ['settling', 'spent'] })).aggregate).toBe('settling')
    expect(gate(base({ items: ['spent', 'expired', 'unfunded'] })).aggregate).toBe('clean')
    expect(gate(base({ sigCount: 0, items: [] })).aggregate).toBe('empty')
    expect(gate(base({ sigCount: 0, items: [], accounts: ['unknown', 'ok'] })).aggregate).toBe('unknown')
  })

  it('Buy is enabled only for clean and empty', () => {
    expect(gate(base()).buyEnabled).toBe(true)
    expect(gate(base({ sigCount: 0, items: [] })).buyEnabled).toBe(true)
    for (const items of [['unused'], ['settling'], ['unknown']] as const) expect(gate(base({ items: [...items] })).buyEnabled).toBe(false)
  })

  it('banners (kb/80 R3 role.dev / role.rc)', () => {
    expect(roleBanner('dev')).toBe('Dev contract: lock and code checks skipped')
    expect(roleBanner('rc')).toBe('Release candidate: testnet rehearsal')
    expect(roleBanner('final')).toBeNull()
  })

  it('end to end through the checker: a keyed rc contract is unsafe, the same history on dev is clean', async () => {
    const T = '11'.repeat(32)
    const deps: CheckDeps = {
      evm: [fakeEvm('a', {}), fakeEvm('b', {})],
      btc: [fakeBtc('m1', { tip: 1000, outs: { [T]: [{ spent: true, txid: 'aa'.repeat(32), status: { confirmed: true, block_height: 999 } }] } })],
      sol: [fakeSol('s', {})],
    }
    const recs = [btcRecord(0, 0, 0, T, 0)]
    const near = [snapshot('f', recs, { contract: { exists: true, accessKeyCount: 1, codeHash: OTHER } }), snapshot('d', recs, { contract: { exists: true, accessKeyCount: 1, codeHash: OTHER } })]
    const common = { network: 'testnet' as const, contractId: 'rc.satchelhq.testnet', tokenId: '1', near, now: Date.now(), expectedCodeHash: H }
    const rc = await checkCleanHistory({ ...common, role: 'rc' }, deps)
    expect(rc.aggregate).toBe('unsafe')
    expect(rc.reasons).toEqual(expect.arrayContaining(['contract_has_keys', 'code_hash_mismatch']))
    expect(rc.contract).toMatchObject({ locked: false, code_ok: false, access_keys: 1 })
    const dev = await checkCleanHistory({ ...common, role: 'dev' }, deps)
    expect(dev.aggregate).toBe('clean')
    expect(dev.warnings).toContain('dev_contract_checks_skipped')
  })

  it('code hashes compare across encodings (NEAR base58 vs SHA-256 hex)', async () => {
    const deps: CheckDeps = { evm: [fakeEvm('a', {}), fakeEvm('b', {})], btc: [], sol: [fakeSol('s', {})] }
    // base58 of 32 bytes of 0xab
    const { base58 } = await import('@scure/base')
    const b58 = base58.encode(new Uint8Array(32).fill(0xab))
    const near = [snapshot('f', [], { contract: { exists: true, accessKeyCount: 0, codeHash: b58 } }), snapshot('d', [], { contract: { exists: true, accessKeyCount: 0, codeHash: b58 } })]
    const r = await checkCleanHistory({ network: 'testnet', contractId: 'satchel.satchelhq.testnet', tokenId: '1', role: 'final', near, now: 0, expectedCodeHash: H.toUpperCase() }, deps)
    expect(r.contract.code_ok).toBe(true)
    expect(r.aggregate).toBe('empty')
  })
})
