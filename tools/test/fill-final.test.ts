/**
 * tools/deploy/fill-final.ts: the post-birth fill of H, the birth tx and block A. Every test works on a copy of the
 * files in a temp directory (or on synthetic ones); the real files are hashed before and after to prove they are
 * untouched. `--verify` runs against a mocked RPC and tx API. Nothing here touches the network or signs.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { base58 } from '@scure/base'
import {
  applyFill,
  codeHashHex,
  EDITS,
  ENV_EDITS,
  lineDiff,
  planFill,
  residualTbd,
  validateValues,
  verifyOnChain,
  type FinalValues,
  type VerifyDeps,
} from '../deploy/fill-final'

const TOOLS = resolve(import.meta.dirname, '..')
const ROOT = resolve(TOOLS, '..')
const FILES = [...new Set([...EDITS, ...ENV_EDITS].map((e) => e.file))]

const H = createHash('sha256').update('satchel final').digest('hex')
const TX = base58.encode(Uint8Array.from({ length: 32 }, (_, i) => i + 7))
const V: FinalValues = { h: H, birthTx: TX, block: 276_543_210 }

const digestIn = (base: string, files: string[]) => files.map((f) => (existsSync(join(base, f)) ? createHash('sha256').update(readFileSync(join(base, f))).digest('hex') : 'missing')).join(',')
const digest = (files: string[]) => digestIn(ROOT, files)
const realBefore = digest(FILES)
// After the real fill (post-birth) the placeholders are gone from the repo: the copy-of-the-repo tests then skip.
const repoStillWaiting = existsSync(join(ROOT, 'README.md')) && readFileSync(join(ROOT, 'README.md'), 'utf8').includes('the code hash `[TBD: H]`')

let dir = ''
function copyRepoFiles(): string {
  const d = mkdtempSync(join(tmpdir(), 'fill-final-'))
  for (const f of FILES) {
    mkdirSync(dirname(join(d, f)), { recursive: true })
    cpSync(join(ROOT, f), join(d, f))
  }
  return d
}

beforeAll(() => {
  dir = copyRepoFiles()
})
afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
  // the real files were never written
  expect(digest(FILES)).toBe(realBefore)
})

describe('validateValues', () => {
  it('accepts H (any case), a 32-byte base58 tx hash and a block height', () => {
    expect(validateValues({ h: H.toUpperCase(), birthTx: TX, block: '276543210' })).toEqual(V)
  })
  it('refuses bad formats, listing every problem at once', () => {
    const err = (() => {
      try {
        validateValues({ h: 'abc', birthTx: '0OIl', block: '42' })
      } catch (e) {
        return (e as Error).message
      }
      return ''
    })()
    expect(err).toMatch(/--h must be 64 hex/)
    expect(err).toMatch(/--birth-tx must be a base58/)
    expect(err).toMatch(/--block must be the birth block height/)
    expect(() => validateValues({ h: H, birthTx: base58.encode(new Uint8Array(31).fill(9)), block: '276543210' })).toThrow(/--birth-tx/)
    expect(() => validateValues({ h: `${H}00`, birthTx: TX, block: '276543210' })).toThrow(/--h/)
    expect(() => validateValues({ h: H, birthTx: TX, block: '-276543210' })).toThrow(/--block/)
    expect(() => validateValues({ h: H, birthTx: TX, block: '2.7e8' })).toThrow(/--block/)
    expect(() => validateValues({})).toThrow(/--h[\s\S]*--birth-tx[\s\S]*--block/)
  })
})

describe.skipIf(!repoStillWaiting)('planFill on a copy of the repository files', () => {
  it('finds every placeholder exactly as often as expected and fills all of them', () => {
    const plans = planFill(dir, V)
    expect(plans.map((p) => p.file).sort()).toEqual(EDITS.map((e) => e.file).filter((f, i, a) => a.indexOf(f) === i).sort())
    const all = plans.map((p) => p.after).join('\n')
    expect(all).not.toMatch(/\[TBD: (H|birth tx hash|block A|reproducible wasm SHA-256)\]/)
    expect(all.split(H).length - 1).toBe(8) // README, verify ×3, security-model, AGENTS, judge-snippets, monitor
    expect(all).toContain(`BIRTH_TX="\${SATCHEL_BIRTH_TX:-${TX}}"`)
    expect(all).toContain(`BLOCK_A="\${SATCHEL_BIRTH_BLOCK:-${V.block}}"`)
    expect(all).toContain(`"tx_block_height":${V.block}`)
    // the dev2 "until the birth" notes are gone from the judge-facing docs
    const readme = plans.find((p) => p.file === 'README.md')!.after
    expect(readme).not.toMatch(/until the final contract/)
    expect(readme).toContain(`https://testnet.nearblocks.io/txns/${TX}`)
    expect(plans.find((p) => p.file === 'AGENTS.md')!.after).not.toMatch(/Until then the README values/)
  })

  it('leaves no [TBD] in judge-facing files (the scripts keep only their skip mechanism)', () => {
    const plans = planFill(dir, V)
    expect(residualTbd(dir, new Map(plans.map((p) => [p.file, p.after])))).toEqual([])
    // before the fill the same scan finds the placeholders
    expect(residualTbd(dir).length).toBeGreaterThanOrEqual(10)
  })

  it('without --env, apps/web/.env.production is not part of the plan; with it, the E-03 switch', () => {
    expect(planFill(dir, V).some((p) => p.file === 'apps/web/.env.production')).toBe(false)
    const env = planFill(dir, V, { env: true }).find((p) => p.file === 'apps/web/.env.production')!.after
    const vars = Object.fromEntries(env.split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
    expect(vars).toMatchObject({
      NEXT_PUBLIC_SATCHEL_CONTRACT: 'satchel.satchelhq.testnet',
      NEXT_PUBLIC_CONTRACT_ROLE: 'final',
      NEXT_PUBLIC_EXPECTED_CODE_HASH: H,
      NEXT_PUBLIC_DATA_MODE: 'live',
      NEXT_PUBLIC_NETWORK: 'testnet',
      NEXT_PUBLIC_MPC_CONTRACT: 'v1.signer-prod.testnet',
      NEXT_PUBLIC_APP_URL: 'https://usesatchel.xyz',
      FASTNEAR_API_KEY: '',
    })
    expect(env).not.toContain('dev2.satchelhq.testnet')
  })

  it('--write applies the plan; a second run refuses (the placeholders are gone) and says why', () => {
    const d = copyRepoFiles()
    try {
      applyFill(d, planFill(d, V, { env: true }))
      expect(readFileSync(join(d, 'docs/verify.md'), 'utf8')).toContain(`code sha256 = ${H}`)
      // the filled judge snippets expect the final values (and stay valid bash)
      const print = spawnSync('bash', [join(d, 'tools', 'judge-snippets.sh'), '--print'], { encoding: 'utf8' })
      expect(print.status, print.stderr).toBe(0)
      expect(print.stdout).toContain(`code sha256 = ${H}`)
      expect(print.stdout).toContain(`block = ${V.block}`)
      expect(print.stdout).toContain(`oldest tx = ${TX} block ${V.block}`)
      expect(print.stdout).not.toContain('[TBD: birth tx hash]')
      expect(() => planFill(d, V)).toThrow(/refusing to fill[\s\S]*appears 0×, expected 3×[\s\S]*already filled/)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  })

  it('the CLI is a dry run by default: it prints the changed lines and writes nothing', () => {
    const before = digestIn(dir, FILES)
    const tsx = join(TOOLS, 'node_modules', '.bin', 'tsx')
    const r = spawnSync(tsx, [join(TOOLS, 'deploy', 'fill-final.ts'), '--h', H, '--birth-tx', TX, '--block', String(V.block), '--root', dir], { encoding: 'utf8' })
    expect(r.status, r.stderr).toBe(0)
    expect(r.stdout).toContain('DRY RUN: nothing was written')
    expect(r.stdout).toMatch(/-- docs\/verify\.md {2}\(note, H×3, birth-tx×2, block\)/)
    expect(r.stdout).toMatch(/- +50: code sha256 = \[TBD: H\]/)
    expect(r.stdout).toContain(`+ code sha256 = ${H}`)
    expect(r.stdout).toContain('[TBD] left in judge-facing files after this fill: 0')
    expect(readFileSync(join(dir, 'docs/verify.md'), 'utf8')).toContain('[TBD: H]')
    expect(digestIn(dir, FILES)).toBe(before)
    const bad = spawnSync(tsx, [join(TOOLS, 'deploy', 'fill-final.ts'), '--h', 'nope', '--birth-tx', TX, '--block', '1', '--root', dir], { encoding: 'utf8' })
    expect(bad.status).toBe(1)
    expect(bad.stderr).toMatch(/--h must be 64 hex/)
  })
})

describe('planFill refuses drifted files (synthetic tree)', () => {
  const tree = (mutate: (f: string, s: string) => string) => {
    const d = mkdtempSync(join(tmpdir(), 'fill-final-syn-'))
    const byFile = new Map<string, string[]>()
    for (const e of [...EDITS, ...ENV_EDITS]) byFile.set(e.file, [...(byFile.get(e.file) ?? []), ...Array<string>(e.count).fill(e.find)])
    for (const [f, parts] of byFile) {
      mkdirSync(dirname(join(d, f)), { recursive: true })
      writeFileSync(join(d, f), mutate(f, parts.join('\n---\n')))
    }
    return d
  }

  it('a tree with each target exactly once (or its count) fills', () => {
    const d = tree((_f, s) => s)
    try {
      expect(planFill(d, V, { env: true }).length).toBe(FILES.length)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  })

  it('a missing placeholder, a duplicated one and a missing file are all reported, and nothing is written', () => {
    const d = tree((f, s) => (f === 'docs/security-model.md' ? s.replace('[TBD: H]', 'deadbeef') : f === 'tools/monitor.sh' ? `${s}\n${s}` : s))
    rmSync(join(d, 'docs/GLOSSARY.md'))
    const snapshot = readFileSync(join(d, 'README.md'), 'utf8')
    try {
      let msg = ''
      try {
        planFill(d, V)
      } catch (e) {
        msg = (e as Error).message
      }
      expect(msg).toMatch(/docs\/security-model\.md: \[H\] "\[TBD: H\]" appears 0×, expected 1×/)
      expect(msg).toMatch(/tools\/monitor\.sh: \[H\] .* appears 2×, expected 1×/)
      expect(msg).toMatch(/docs\/GLOSSARY\.md: missing/)
      expect(readFileSync(join(d, 'README.md'), 'utf8')).toBe(snapshot)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  })
})

describe('lineDiff', () => {
  it('lists removed lines with their old line number and the added lines', () => {
    expect(lineDiff('a\nb\nc\nd', 'a\nB\nc\nd')).toEqual(['  + B', '  -    2: b'])
    expect(lineDiff('a\nb', 'a\nb')).toEqual([])
    expect(lineDiff('a\nx\ny\nz', 'a\nq\nz')).toEqual(['  + q', '  -    2: x', '  -    3: y'])
  })
})

describe('verifyOnChain (mocked, read-only)', () => {
  const CONTRACT = 'satchel.satchelhq.testnet'
  const kinds = ['CreateAccount', { Transfer: { deposit: '1' } }, { DeployContract: { code: '' } }, ...Array.from({ length: 8 }, () => ({ FunctionCall: {} }))]
  const deps = (o: { codeHex?: string; keys?: number; signer?: string; actions?: unknown[]; height?: number; oldest?: string; signed?: number; exists?: boolean } = {}): VerifyDeps => ({
    contract: CONTRACT,
    parent: 'satchelhq.testnet',
    txApi: 'https://tx.example',
    rpc: {
      viewAccount: async () => (o.exists === false ? null : { amount: '0', locked: '0', storage_usage: 1, code_hash: base58.encode(Buffer.from(o.codeHex ?? H, 'hex')) }),
      viewAccessKeyList: async () => ({ keys: Array.from({ length: o.keys ?? 0 }, () => ({ public_key: 'ed25519:x', access_key: { nonce: 1, permission: 'FullAccess' } })) }),
    } as VerifyDeps['rpc'],
    fetch: async (url, init) => {
      const body = JSON.parse(init.body) as Record<string, unknown>
      if (url.endsWith('/v0/transactions')) {
        const known = (body.tx_hashes as string[])[0] === TX
        return { json: async () => ({ transactions: [known ? { transaction: { signer_id: o.signer ?? 'satchelhq.testnet', receiver_id: CONTRACT, actions: o.actions ?? kinds }, execution_outcome: { block_height: o.height ?? V.block } } : null] }) }
      }
      if (body.is_any_signer) return { json: async () => ({ account_txs: Array.from({ length: o.signed ?? 0 }, () => ({})), txs_count: o.signed ?? 0 }) }
      return { json: async () => ({ account_txs: [{ transaction_hash: o.oldest ?? TX, tx_block_height: o.height ?? V.block }] }) }
    },
  })

  it('passes when the chain agrees', async () => {
    const r = await verifyOnChain(V, deps())
    expect(r.ok, r.lines.join('\n')).toBe(true)
    expect(r.lines.every((l) => l.startsWith('  PASS'))).toBe(true)
  })

  it.each([
    ['another code hash', { codeHex: 'ab'.repeat(32) }, /FAIL {2}view_account code_hash = H/],
    ['an access key', { keys: 1 }, /FAIL {2}no access keys \(chain: 1\)/],
    ['another signer', { signer: 'mallory.testnet' }, /FAIL {2}signer mallory\.testnet/],
    ['an AddKey action', { actions: [...kinds.slice(0, 3), { AddKey: {} }, ...kinds.slice(3)] }, /FAIL {2}no AddKey/],
    ['another block', { height: V.block + 1 }, /FAIL {2}block 276543211 = 276543210/],
    ['an earlier tx on the account', { oldest: base58.encode(new Uint8Array(32).fill(3)) }, /FAIL {2}the account's history starts at the birth tx/],
    ['a tx signed by the contract', { signed: 1 }, /FAIL {2}.*never signed a transaction/],
    ['no account', { exists: false }, /FAIL {2}satchel\.satchelhq\.testnet exists/],
  ])('fails on %s', async (_what, o, line) => {
    const r = await verifyOnChain(V, deps(o))
    expect(r.ok).toBe(false)
    expect(r.lines.join('\n')).toMatch(line)
  })

  it('fails when the tx API does not know the birth tx', async () => {
    const r = await verifyOnChain({ ...V, birthTx: base58.encode(new Uint8Array(32).fill(1)) }, deps())
    expect(r.lines.join('\n')).toMatch(/FAIL {2}the FastNEAR tx API knows/)
  })

  it('decodes a NEAR code_hash (base58) to the hex SHA-256 the docs print', () => {
    expect(codeHashHex(base58.encode(Buffer.from(H, 'hex')))).toBe(H)
  })
})
