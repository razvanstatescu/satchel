/**
 * Every release script runs in its safe mode (offline / print), signs nothing and never names the deprecated RPC.
 * Spawns real processes; no network (all runs are --offline or --print).
 */
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { reproMeta, wasmWith } from './helpers'
import { load } from 'js-yaml'

const TOOLS = resolve(import.meta.dirname, '..')
const ROOT = resolve(TOOLS, '..')
const env = { ...process.env, NEAR_CREDENTIALS_DIR: join(TOOLS, 'test', 'no-such-credentials-dir') }

function tsx(args: string[]) {
  return spawnSync(join(TOOLS, 'node_modules/.bin/tsx'), args, { cwd: TOOLS, env, encoding: 'utf8', timeout: 60_000 })
}

describe('e2e scripts: offline dry runs print the plan and sign nothing', () => {
  const runs: [string, string[]][] = [
    ['e2e/mint.ts', []],
    ['e2e/evm.ts', ['--to', 'final#2']],
    ['e2e/evm.ts', ['--fanout', '--preset', 'funding', '--sets', 'rc']],
    ['e2e/btc.ts', ['--utxo', `${'a'.repeat(64)}:0:100000`, '--utxo', `${'b'.repeat(64)}:1:50000`]],
    ['e2e/sol.ts', []],
    ['e2e/transfer.ts', []],
    ['e2e/sale-near.ts', []],
    ['e2e/sale-usdc.ts', ['--refund-only']],
    ['e2e/clean-history.ts', ['--role', 'rc']],
    ['e2e/clean-history.ts', ['--role', 'rc', '--from-step', '3', '--btc-token', '1']],
    ['e2e/message.ts', ['--chain', 'evm']],
    ['e2e/message.ts', ['--chain', 'sol']],
    ['e2e/allowance.ts', ['--action', 'set', '--token', '1', '--delegate', 'bob', '--asset', 'btc', '--limit', '50000']],
  ]
  for (const [script, extra] of runs) {
    it(`${script} ${extra.join(' ')}`, () => {
      const r = tsx([script, '--offline', ...extra])
      expect(r.status, r.stderr).toBe(0)
      expect(r.stdout).toContain('DRY RUN')
      expect(r.stdout).toMatch(/^TX  /m)
      expect(r.stdout).not.toMatch(/tx hash|sent  |SEND MODE/)
    })
  }
  it('--send with --offline is refused', () => {
    const r = tsx(['e2e/evm.ts', '--offline', '--send'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/mutually exclusive/)
  })
  it('--send without a key fails before signing', () => {
    const r = spawnSync(join(TOOLS, 'node_modules/.bin/tsx'), ['e2e/mint.ts', '--send', '--yes'], {
      cwd: TOOLS,
      env: { ...env, SATCHEL_NEAR_RPCS: 'http://127.0.0.1:9' }, // nothing listens: no network
      encoding: 'utf8',
      timeout: 60_000,
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/no key for alice\.satchelhq\.testnet/)
  })
})

describe('e2e scripts that always read live state (market, allowance view/sign, history): --offline prints a note, signs nothing', () => {
  const runs: [string, string[]][] = [
    ['e2e/market.ts', ['--action', 'totals']],
    ['e2e/market.ts', ['--action', 'inside', '--token', '1']],
    ['e2e/allowance.ts', ['--action', 'view', '--token', '1']],
    ['e2e/history.ts', ['--token', '1']],
  ]
  for (const [script, extra] of runs) {
    it(`${script} ${extra.join(' ')}`, () => {
      const r = tsx([script, '--offline', ...extra])
      expect(r.status, r.stderr).toBe(0)
      expect(r.stdout).toContain('DRY RUN')
      expect(r.stdout).toContain('note')
      expect(r.stdout).not.toMatch(/tx hash|sent  |SEND MODE/)
    })
  }
})

describe('keyless-birth tool', () => {
  const tiny = join(TOOLS, 'test/fixtures/tiny.wasm')
  const tinyH = createHash('sha256').update(readFileSync(tiny)).digest('hex')
  it('dry run prints the 11 actions and H; refuses --yes; requires H for rc and the final', () => {
    const base = ['deploy/keyless-birth.ts', '--offline', '--base-uri', 'https://usesatchel.xyz/api/card/', '--wasm', 'tools/test/fixtures/tiny.wasm']
    const r = tsx([...base, '--child', 'rc.satchelhq.testnet', '--expected-sha256', tinyH])
    // tiny.wasm has no reproducible build_info, so the dry run prints everything, flags it and exits 1
    expect(r.status, r.stderr).toBe(1)
    expect(r.stdout).toMatch(/wasm +PASS +INV-22 import check/)
    expect(r.stdout).toMatch(/wasm +FAIL +reproducible build_info/)
    expect(r.stdout).toContain('--send would refuse to sign')
    expect(r.stdout).toContain('CreateAccount · Transfer · DeployContract · FunctionCall')
    expect(r.stdout).toContain('(no AddKey: checked)')
    expect(r.stdout).toMatch(/H {9}[0-9a-f]{64}/)
    expect(r.stdout).toContain('shasum -a 256')
    expect(r.stdout).toContain('sha256sum')
    expect(r.stdout).toContain('DRY RUN')
    expect(tsx([...base, '--child', 'rc.satchelhq.testnet', '--send', '--yes']).stderr).toMatch(/--yes is not accepted/)
    expect(tsx([...base, '--child', 'rc.satchelhq.testnet']).stderr).toMatch(/rc birth requires --expected-sha256/)
    expect(tsx([...base, '--child', 'satchel.satchelhq.testnet']).stderr).toMatch(/final birth requires --expected-sha256/)
    const bad = tsx([...base, '--child', 'rc.satchelhq.testnet', '--expected-sha256', 'ab'.repeat(32)])
    expect(bad.status).toBe(1)
    expect(bad.stderr).toMatch(/wasm sha256 [0-9a-f]{64} != --expected-sha256 (ab){32}/)
    expect(bad.stdout).not.toContain('TX  KEYLESS BIRTH')
  })
  it('a wasm with the release build_info passes every local check (exit 0)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'satchel-birth-'))
    try {
      const wasm = join(dir, 'repro.wasm')
      const rev = '843d35334f7fc7a88644fc39424bb137e7460094'
      const digest = /^image_digest\s*=\s*"([^"]+)"/m.exec(readFileSync(join(ROOT, 'contracts/satchel/Cargo.toml'), 'utf8'))![1]!
      writeFileSync(wasm, wasmWith(reproMeta(rev, digest)))
      const h = createHash('sha256').update(readFileSync(wasm)).digest('hex')
      const r = tsx(['deploy/keyless-birth.ts', '--offline', '--base-uri', 'https://usesatchel.xyz/api/card/', '--wasm', wasm, '--child', 'rc.satchelhq.testnet', '--expected-sha256', h, '--expected-rev', rev])
      expect(r.status, r.stdout + r.stderr).toBe(0)
      expect(r.stdout).toMatch(new RegExp(`wasm +PASS +reproducible build_info names rev ${rev}`))
      expect(r.stdout).not.toMatch(/FAIL/)
      // the same artifact against another commit is refused
      const other = tsx(['deploy/keyless-birth.ts', '--offline', '--base-uri', 'https://usesatchel.xyz/api/card/', '--wasm', wasm, '--child', 'satchel.satchelhq.testnet', '--expected-sha256', h, '--expected-rev', 'f'.repeat(40)])
      expect(other.status).toBe(1)
      expect(other.stdout).toMatch(/wasm +FAIL +reproducible build_info.*!= f{40}/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('shell scripts', () => {
  it('judge-snippets --print lists every README command with an expected output', () => {
    const out = execFileSync('bash', [join(TOOLS, 'judge-snippets.sh'), '--print'], { encoding: 'utf8' })
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14']) expect(out).toContain(`[${id}]`)
    expect(out).toContain('tx.test.fastnear.com/v0/transactions')
    expect(out).toContain('near-testnet.drpc.org')
    expect(out).toContain('shasum -a 256')
    expect(out).toContain('sha256sum')
    expect(out).toContain('Account is locked (no access keys)')
    expect(out.match(/expect: /g)!.length).toBeGreaterThanOrEqual(13)
  })
  it('monitor --offline lists the checks without network', () => {
    const out = execFileSync('bash', [join(TOOLS, 'monitor.sh'), '--offline'], { encoding: 'utf8' })
    expect(out).toContain('nothing was fetched')
    expect(out).toContain('free balance')
    expect(out).toContain('< 3 NEAR')
  })
  it('free-balance.py: verdict on spare = free − escrow; FAIL below 3 NEAR, WARN below the 5 NEAR floor, PASS above (review S-02, M-01)', () => {
    const yocto = (near: number) => (BigInt(Math.round(near * 1000)) * 10n ** 21n).toString()
    // a call_function(market_totals) JSON-RPC response: the view's JSON as a byte array
    const totalsResp = (t: Record<string, string>) =>
      JSON.stringify({ result: { result: [...Buffer.from(JSON.stringify(t))], logs: [] } })
    const run = (amountNear: number, storageBytes: number, totals?: string) => {
      const resp = JSON.stringify({ result: { amount: yocto(amountNear), storage_usage: storageBytes } })
      const args = [join(TOOLS, 'lib/free-balance.py'), resp, '3', '5', ...(totals === undefined ? [] : [totals])]
      return spawnSync('python3', args, { encoding: 'utf8' }).stdout.trim()
    }
    const none = totalsResp({ inside_near: '0', offers_near: '0', storage_credit: '0', proceeds_near: '0', escrow_near: '0' })
    // 290 KB of code ≈ 2.9 NEAR of storage stake
    expect(run(20, 290_000, none)).toMatch(/^PASS spare 17\.1000 NEAR \(free 17\.1000 − escrow 0\.0000/)
    expect(run(7, 290_000, none)).toMatch(/^WARN spare 4\.1000 NEAR/)
    expect(run(5.8, 290_000, none)).toMatch(/^FAIL spare 2\.9000 NEAR .*top up/)
    // M-01: 17.1 NEAR free, but 15 NEAR of it is user escrow → only 2.1 NEAR can pay S-02 storage
    const escrow = totalsResp({ inside_near: yocto(12), offers_near: yocto(2), storage_credit: yocto(0.5), proceeds_near: yocto(0.5), escrow_near: yocto(15) })
    expect(run(20, 290_000, escrow)).toMatch(/^FAIL spare 2\.1000 NEAR \(free 17\.1000 − escrow 15\.0000.*top up/)
    // an older view without escrow_near: the parts are summed
    const parts = totalsResp({ inside_near: yocto(12), offers_near: yocto(2), storage_credit: yocto(1) })
    expect(run(20, 290_000, parts)).toMatch(/^FAIL spare 2\.1000 NEAR \(free 17\.1000 − escrow 15\.0000/)
    // escrow unreadable (no totals, a contract error, a pre-C4 contract): never PASS, since free overstates the buffer
    expect(run(20, 290_000)).toMatch(/^WARN free 17\.1000 NEAR, escrow unknown/)
    expect(run(20, 290_000, JSON.stringify({ result: { error: 'MethodNotFound', logs: [] } }))).toMatch(/^WARN .*escrow unknown/)
    expect(run(5.8, 290_000, '{}')).toMatch(/^FAIL free 2\.9000 NEAR, escrow unknown.*top up/)
    const err = spawnSync('python3', [join(TOOLS, 'lib/free-balance.py'), '{"error":{"cause":{"name":"UNKNOWN_ACCOUNT"}}}', '3', '5'], { encoding: 'utf8' })
    expect(err.stdout.trim()).toBe('FAIL account UNKNOWN_ACCOUNT')
  })
  it('visible-facts.py separates visible, hidden and missing text', () => {
    const r = spawnSync('python3', [join(TOOLS, 'lib/visible-facts.py'), 'owner alice', 'tb1qhidden', 'gone'], {
      input: '<main><dl><dt>Owner</dt> <dd>owner alice</dd></dl><div hidden><p>tb1qhidden</p></div><template><b>x</b></template><br></main>',
      encoding: 'utf8',
    })
    expect(r.status).toBe(1)
    expect(r.stdout).toMatch(/visible +owner alice/)
    expect(r.stdout).toMatch(/HIDDEN +tb1qhidden/)
    expect(r.stdout).toMatch(/MISSING +gone/)
  })
})

describe('repo hygiene for release files', () => {
  const NEEDLE = ['rpc', 'testnet', 'near', 'org'].join('.')
  function walk(dir: string, out: string[] = []): string[] {
    for (const n of readdirSync(dir)) {
      if (n === 'node_modules' || n === '.next') continue
      const p = join(dir, n)
      if (statSync(p).isDirectory()) walk(p, out)
      else out.push(p)
    }
    return out
  }
  it('the deprecated RPC appears in no release file', () => {
    const files = [...walk(TOOLS), join(ROOT, 'README.md'), join(ROOT, '.env.example'), ...walk(join(ROOT, '.github'))]
    const hits = files.filter((f) => readFileSync(f).includes(NEEDLE))
    expect(hits).toEqual([])
  })
  it('.env.example lists every spec §8.4 and apps/web variable, with no values', () => {
    const lines = readFileSync(join(ROOT, '.env.example'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l))
    const keys = lines.map((l) => l.split('=')[0])
    for (const k of [
      'NEXT_PUBLIC_NETWORK', 'NEXT_PUBLIC_SATCHEL_CONTRACT', 'NEXT_PUBLIC_CONTRACT_ROLE', 'NEXT_PUBLIC_MPC_CONTRACT', 'NEXT_PUBLIC_USDC_CONTRACT',
      'NEXT_PUBLIC_EXPECTED_CODE_HASH', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_NEAR_RPCS', 'NEXT_PUBLIC_SEPOLIA_RPCS', 'NEXT_PUBLIC_BTC_APIS',
      'NEXT_PUBLIC_SOL_RPCS', 'FASTNEAR_API_KEY', 'NEXT_PUBLIC_DATA_MODE', 'NEXT_PUBLIC_NEAR_TX_API',
    ])
      expect(keys, k).toContain(k)
    expect(lines.every((l) => l.endsWith('='))).toBe(true)
  })
  it('ci.yml has the contracts / reproducible / web / smoke jobs (spec §12.6) and needs no secrets', () => {
    const text = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8')
    const y = load(text) as { jobs: Record<string, { steps: { run?: string; uses?: string; with?: Record<string, unknown> }[] }>; permissions: Record<string, string> }
    expect(Object.keys(y.jobs)).toEqual(['contracts', 'reproducible', 'web', 'smoke'])
    expect(y.permissions).toEqual({ contents: 'read' })
    expect(text).not.toMatch(/secrets\./)
    const runs = (job: string) => y.jobs[job]!.steps.map((s) => s.run ?? '').join('\n')
    expect(runs('contracts')).toContain('cargo near build non-reproducible-wasm --locked')
    expect(runs('contracts')).toContain('cargo test --locked -p satchel --lib')
    expect(runs('contracts')).toContain('cargo test --locked -p satchel-tests')
    expect(runs('contracts')).toContain('tools/check-wasm-imports.sh')
    expect(runs('web')).toContain('pnpm install --frozen-lockfile')
    expect(runs('web')).toContain('pnpm --filter web build')
    expect(runs('web')).toContain('rpc[.]testnet[.]near[.]org')
    expect(runs('smoke')).toContain('playwright test test/e2e/judge.spec.ts')
    // H for rc and the final comes from this job (the pinned linux/amd64 image): build, hash, INV-22, upload
    expect(runs('reproducible')).toContain('cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml')
    expect(runs('reproducible')).toContain('sha256sum target/near/satchel/satchel.wasm')
    expect(runs('reproducible')).toContain('tools/check-wasm-imports.sh')
    const upload = y.jobs.reproducible!.steps.find((st) => st.uses?.startsWith('actions/upload-artifact'))
    expect(upload?.with?.name).toBe('satchel-reproducible-wasm-${{ github.sha }}')
  })
})
