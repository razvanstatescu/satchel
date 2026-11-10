/**
 * The live proof set (docs/evidence): the read-only verifier (tools/proofs.sh + lib/proofs.py) and the generator's
 * pure parts (tools/e2e/proofs.ts). Offline: the verifier runs on recorded FastNEAR / Sepolia / testnet4 / devnet
 * answers in test/fixtures/proofs, and nothing here signs.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { keccak_256 } from '@noble/hashes/sha3.js'
import {
  appContractOf,
  archivePrevious,
  buildEntry,
  historyFiles,
  predictedNextId,
  proofTokenProblems,
  renderContract,
  renderReadme,
  renderStatus,
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

describe('proofs on the final contract (D-32 demo states, #4, the README)', () => {
  const FINAL = 'satchel.satchelhq.testnet'
  const realReadme = readFileSync(join(ROOT, 'docs', 'evidence', 'README.md'), 'utf8')
  const realDoc = JSON.parse(readFileSync(join(ROOT, 'docs', 'evidence', 'proofs.json'), 'utf8')) as ProofsDoc
  // the development set (dev2), archived when the proofs were regenerated on the final contract
  const devDoc = JSON.parse(readFileSync(join(ROOT, 'docs', 'evidence', 'history', 'dev2.satchelhq.testnet.json'), 'utf8')) as ProofsDoc
  // the dev2 set, as if it had been made in one run on the final contract with fresh Satchels #8 (sale), #9 (USDC)
  const fresh: Record<string, string> = { '5': '8', '6': '9', '7': '10' }
  const finalDoc: ProofsDoc = {
    ...devDoc,
    contract: FINAL,
    contract_role: 'final',
    proofs: devDoc.proofs.map(({ adopted: _a, ...p }) => ({ ...p, ...(p.token_id ? { token_id: fresh[p.token_id] ?? p.token_id } : {}) })),
  }

  it('never signs with #4; on the final contract never touches the staged demo Satchels', () => {
    expect(proofTokenProblems('dev', '4', {})).toEqual([expect.stringMatching(/#4 is the blocked demo/)])
    expect(proofTokenProblems('final', '4', {})).toHaveLength(1)
    expect(proofTokenProblems('dev', '1', { sale: '4' })).toEqual([expect.stringMatching(/sale=4: #4 is the blocked demo/)])
    for (const t of ['2', '3', '5']) expect(proofTokenProblems('final', t, {})).toEqual([expect.stringMatching(/staged demo Satchel/)])
    for (const t of ['1', '6', '7', '12']) expect(proofTokenProblems('final', t, {})).toEqual([])
    expect(proofTokenProblems('dev', '2', {})).toEqual([])
    expect(proofTokenProblems('final', '1', { sale: '5', inside: '7', btc: '8' })).toHaveLength(2)
    expect(proofTokenProblems('final', '1', { sale: '8', inside: '9', btc: '10' })).toEqual([])
    expect(proofTokenProblems('dev', '1', { sale: '5', inside: '6' })).toEqual([])
  })

  it('predicts the fresh Satchels after the birth mints (#8 on), not #1, when the contract cannot be read yet', () => {
    expect(predictedNextId('final')).toBe(8)
    expect(predictedNextId('rc')).toBe(8)
    expect(predictedNextId('dev')).toBe(1)
  })

  it('a dry run on the final signs the L2 transaction with a fresh Satchel, never the chain token (#1)', () => {
    const tsx = join(TOOLS, 'node_modules', '.bin', 'tsx')
    const r = spawnSync(tsx, [join(TOOLS, 'e2e', 'proofs.ts'), '--contract', FINAL, '--offline', '--only', 'evm-l2-sign'], { encoding: 'utf8', env: { ...process.env, NEAR_CREDENTIALS_DIR: join(tmpdir(), 'no-keys-here') } })
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toContain('(role final)')
    expect(r.stdout).toMatch(/btc Satchel = #8 \(predicted/)
    expect(r.stdout).toContain('satchel/8/evm')
    expect(r.stdout).not.toContain('satchel/1/evm')
    expect(r.stdout).toContain('DRY RUN: nothing was signed')
    const bad = spawnSync(tsx, [join(TOOLS, 'e2e', 'proofs.ts'), '--contract', FINAL, '--offline', '--chain-token', '4'], { encoding: 'utf8' })
    expect(bad.status).toBe(1)
    expect(bad.stderr).toMatch(/refusing these Satchels[\s\S]*#4 is the blocked demo/)
  })

  it('the README blocks describe the final contract, with no development-contract wording', () => {
    const out = renderReadme(realReadme, finalDoc, ['dev2.satchelhq.testnet.json'], FINAL)
    const blocks = [out.slice(out.indexOf('proofs:contract:start'), out.indexOf('proofs:contract:end')), out.slice(out.indexOf('proofs:status:start'), out.indexOf('proofs:status:end'))].join('\n')
    expect(blocks).toContain('the release contract the hosted app reads')
    expect(blocks).toContain('Every proof was made for this page')
    expect(blocks).toContain('https://usesatchel.xyz/api/clean-history/8')
    expect(blocks).toContain('**Satchel #9**, listed for USDC')
    expect(blocks).toMatch(/Demo Satchel #4 is blocked on purpose/)
    expect(blocks).toContain('SATCHEL_PROOFS=docs/evidence/history/dev2.satchelhq.testnet.json tools/proofs.sh')
    expect(blocks).not.toMatch(/development contract|keeps its access key|Nov 10|will then|until the final/i)
    expect(out).not.toContain('/s/5 (the page)')
  })

  it('links the app only when it reads the set\'s contract (after the switch, dev2\'s #5 is not the app\'s #5)', () => {
    const dev = renderStatus(devDoc, FINAL)
    expect(dev).not.toContain('usesatchel.xyz')
    expect(dev).toContain(`The hosted app reads \`${FINAL}\` now`)
    expect(renderStatus(devDoc, devDoc.contract)).toContain('https://usesatchel.xyz/api/clean-history/5')
    expect(renderContract(devDoc)).toMatch(/marked \*earlier\*/)
    const timedOut = renderStatus({ ...finalDoc, mpc_timeouts: ['3r5zp3ucdPAmizKQmULoG53fdL1Ybj7n5Xo8LLjHnDht'] })
    expect(timedOut).toContain('## Timed-out MPC requests')
    expect(timedOut).not.toContain('none did during this run')
    expect(renderStatus(finalDoc)).toContain('none did during this run')
  })

  it('the committed set was made on the final contract and never names Satchel #4', () => {
    expect(realDoc.contract).toBe(FINAL)
    expect(realDoc.contract_role).toBe('final')
    expect(realDoc.proofs.filter((p) => p.token_id === '4')).toEqual([])
    expect(devDoc.contract).toBe('dev2.satchelhq.testnet')
  })

  it('the committed README is exactly what the generator renders from the committed proofs.json', () => {
    expect(renderReadme(realReadme, realDoc, historyFiles(join(ROOT, 'docs', 'evidence', 'proofs.json')), appContractOf(ROOT))).toBe(realReadme)
  })

  it('a run on another contract keeps the previous set as history/<contract>.json first (a copy, idempotent)', () => {
    const d = mkdtempSync(join(tmpdir(), 'proofs-hist-'))
    try {
      const out = join(d, 'proofs.json')
      expect(archivePrevious(out, FINAL)).toBeNull()
      writeFileSync(out, JSON.stringify(devDoc))
      expect(archivePrevious(out, devDoc.contract)).toBeNull()
      const dest = archivePrevious(out, FINAL)!
      expect(dest).toBe(join(d, 'history', `${devDoc.contract}.json`))
      expect(readFileSync(dest, 'utf8')).toBe(readFileSync(out, 'utf8'))
      expect(existsSync(out)).toBe(true)
      expect(archivePrevious(out, FINAL)).toBe(dest)
      expect(historyFiles(out)).toEqual([`${devDoc.contract}.json`])
      writeFileSync(out, JSON.stringify({ ...devDoc, note: 'changed' }))
      expect(() => archivePrevious(out, FINAL)).toThrow(/exists already with other content/)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  })
})
