/**
 * The live proof set (docs/evidence): the read-only verifier (tools/proofs.sh + lib/proofs.py) and the generator's
 * pure parts (tools/e2e/proofs.ts). Offline: the verifier runs on recorded FastNEAR / Sepolia / testnet4 / devnet
 * answers in test/fixtures/proofs, and nothing here signs.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { keccak_256 } from '@noble/hashes/sha3.js'
import {
  buildEntry,
  externalTxOf,
  mpcSignatures,
  parseUse,
  readFastnearTx,
  renderTable,
  replaceTable,
  scriptModeFlags,
  STEPS,
  STEP_IDS,
  TABLE_END,
  TABLE_START,
  type ProofsDoc,
  type SigKind,
} from '../e2e/proofs'
import { makeCtx } from '../lib/run'

const TOOLS = resolve(import.meta.dirname, '..')
const ROOT = resolve(TOOLS, '..')
const FX = join(TOOLS, 'test', 'fixtures', 'proofs')
const fixtureDoc = JSON.parse(readFileSync(join(FX, 'proofs.json'), 'utf8')) as ProofsDoc
const fastnear = (hash: string) => JSON.parse(readFileSync(join(FX, `near-${hash}.json`), 'utf8')).transactions[0]

describe('tools/proofs.sh (read-only verifier)', () => {
  it('--self-test passes: crypto vectors, real recorded proofs pass, tampered ones fail', () => {
    const r = spawnSync('bash', [join(TOOLS, 'proofs.sh'), '--self-test'], { encoding: 'utf8' })
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toContain('self-test: all pass')
    expect(r.stdout).toMatch(/PASS fixture tampered-address: FAIL \(want FAIL\)/)
  })

  it('--print lists every committed proof with its explorer link and curl command, without network', () => {
    const out = execFileSync('bash', [join(TOOLS, 'proofs.sh'), '--print'], { encoding: 'utf8', env: { ...process.env, SATCHEL_TX_API: 'http://127.0.0.1:9' } })
    const doc = JSON.parse(readFileSync(join(ROOT, 'docs', 'evidence', 'proofs.json'), 'utf8')) as ProofsDoc
    for (const p of doc.proofs) {
      expect(out).toContain(`[${p.id}]`)
      expect(out).toContain(`https://testnet.nearblocks.io/txns/${p.tx}`)
    }
    expect(out).toContain('$ curl -s -m 30 -X POST')
    expect(out).not.toMatch(/rpc\.testnet\.near\.org/)
  })

  it('the committed proofs.json is well formed and covers the headline actions', () => {
    const doc = JSON.parse(readFileSync(join(ROOT, 'docs', 'evidence', 'proofs.json'), 'utf8')) as ProofsDoc
    expect(doc.schema).toBe('satchel-proofs/1')
    const ids = doc.proofs.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ['mint', 'gift', 'list', 'buy-near', 'buy-stale', 'sign-while-listed', 'sign-not-owner', 'sign-old-owner', 'evm-send', 'btc-send', 'sol-send', 'evm-message', 'sol-message'])
      expect(ids).toContain(id)
    for (const p of doc.proofs) {
      expect(p.tx).toMatch(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/)
      if (p.expect.outcome === 'failure') expect(p.expect.error).toMatch(/^ERR_[A-Z_]+$/)
      if (p.external) expect(p.signature).toBeDefined()
    }
  })

  it('python keccak-256 agrees with @noble/hashes across block boundaries', () => {
    const lens = [0, 1, 135, 136, 137, 300]
    const py = `import sys; sys.path.insert(0, ${JSON.stringify(join(TOOLS, 'lib'))}); import proofs
for n in [${lens.join(',')}]: print(proofs.keccak256(bytes(i % 251 for i in range(n))).hex())`
    const out = execFileSync('python3', ['-c', py], { encoding: 'utf8' }).trim().split('\n')
    lens.forEach((n, i) => expect(out[i]).toBe(Buffer.from(keccak_256(Uint8Array.from({ length: n }, (_, j) => j % 251))).toString('hex')))
  })
})

describe('tools/e2e/proofs.ts (generator)', () => {
  it('a dry run never passes --send to the chain scripts it calls (regression: the first dry run did)', () => {
    expect(scriptModeFlags({ send: false, yes: false, offline: false })).toEqual([])
    expect(scriptModeFlags({ send: false, yes: true, offline: false })).toEqual([])
    expect(scriptModeFlags({ send: false, yes: false, offline: true })).toEqual(['--offline'])
    expect(scriptModeFlags({ send: true, yes: true, offline: false })).toEqual(['--send', '--yes'])
    expect(scriptModeFlags({ send: true, yes: false, offline: false })).toEqual(['--send'])
  })

  it('every step has a unique id, a plain-English description, and refusals name their error', () => {
    expect(new Set(STEP_IDS).size).toBe(STEPS.length)
    for (const s of STEPS) {
      expect(s.shows.length).toBeGreaterThan(20)
      if (s.expect?.outcome === 'failure') expect(s.absent?.length).toBeGreaterThan(0)
      if (s.external) expect(s.sig).toBeDefined()
    }
  })

  it('--use parses id=hash lists and refuses unknown ids', () => {
    expect([...parseUse(['mint=abc,gift=def', 'list=ghi']).entries()]).toEqual([['mint', 'abc'], ['gift', 'def'], ['list', 'ghi']])
    expect(() => parseUse(['nope=abc'])).toThrow(/want <id>=<hash>/)
    expect(() => parseUse(['mint'])).toThrow()
  })

  it('rebuilds the external tx of each recorded send exactly as the verifier does', () => {
    const want: Record<string, SigKind> = { 'evm-send': 'evm_tx', 'btc-send': 'btc_tx', 'sol-send': 'sol_tx' }
    for (const [id, kind] of Object.entries(want)) {
      const p = fixtureDoc.proofs.find((x) => x.id === id)!
      const t = readFastnearTx(fastnear(p.tx))
      const ev = t.events.find((e) => e.event === 'sign_requested')!.data as Record<string, unknown>
      const sigs = mpcSignatures(t, fixtureDoc.contract) as Record<string, unknown>[]
      expect(externalTxOf(kind, ev, sigs)?.tx).toBe(p.external!.tx)
    }
  })

  it('buildEntry turns a recorded refusal into the same entry, and rejects a tx that does not prove its step', async () => {
    const ctx = makeCtx({ contract: fixtureDoc.contract }, { log: () => {} })
    const p = fixtureDoc.proofs.find((x) => x.id === 'allowance-over-cap')!
    const step = STEPS.find((s) => s.id === 'allowance-over-cap')!
    const t = readFastnearTx(fastnear(p.tx))
    const e = await buildEntry(ctx, step, p.tx, t)
    expect(e).toMatchObject({ id: 'allowance-over-cap', method: 'sign_for', expect: { outcome: 'failure', error: 'ERR_ALLOWANCE_EXCEEDED' }, token_id: '1' })
    await expect(buildEntry(ctx, STEPS.find((s) => s.id === 'sign-while-listed')!, p.tx, t)).rejects.toThrow(/no ERR_FROZEN/)
    await expect(buildEntry(ctx, STEPS.find((s) => s.id === 'mint')!, p.tx, t)).rejects.toThrow(/method sign_for, want nft_mint/)
  })

  it('buildEntry records a message signature with its text and the Satchel address it must recover to', async () => {
    const ctx = makeCtx({ contract: fixtureDoc.contract }, { log: () => {} })
    const p = fixtureDoc.proofs.find((x) => x.id === 'evm-message')!
    const e = await buildEntry(ctx, STEPS.find((s) => s.id === 'evm-message')!, p.tx, readFastnearTx(fastnear(p.tx)))
    expect(e.signature).toEqual(p.signature)
    expect(e.events?.map((x) => x.event)).toEqual(['satchel:sign_requested', 'satchel:sign_resolved'])
  })

  it('renders the README table between its markers', () => {
    const table = renderTable(fixtureDoc)
    expect(table.split('\n')).toHaveLength(fixtureDoc.proofs.length + 2)
    expect(table).toContain('Refused with `ERR_ALLOWANCE_EXCEEDED`')
    const doc = `intro\n${TABLE_START}\nold\n${TABLE_END}\noutro`
    expect(replaceTable(doc, table)).toBe(`intro\n${TABLE_START}\n${table}\n${TABLE_END}\noutro`)
    expect(replaceTable('no markers', table)).toBe('no markers')
  })
})
