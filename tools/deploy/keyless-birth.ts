/**
 * Keyless birth (kb/90 §5.16, D-02/D-28, SAT-084): ONE transaction from the parent (`<team>.testnet`) that
 *   CreateAccount · Transfer · DeployContract · FunctionCall new · FunctionCall nft_mint ×7
 * and contains NO AddKey, so the contract account never has a key. If any action fails, the receipt reverts and no
 * account is left behind; a SUCCESSFUL birth with a wrong argument is permanent (rehearse on rc first).
 *
 * Dry run by default: prints the 11 actions, the init args and the wasm SHA-256 H, plus read-only pre-checks.
 * Sending needs `--send` AND a typed "yes" in an interactive terminal (no --yes, no piped stdin).
 * The final `satchel.<team>.testnet` birth additionally needs the human's explicit "yes" (H-15) quoting the receiver
 * and H. Runbook: tools/deploy/keyless-birth.md.
 *
 *   pnpm --filter @satchel/tools deploy:keyless-birth --child rc.satchelhq.testnet --base-uri https://usesatchel.xyz/api/card/
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { base58 } from '@scure/base'
import { assertAccountId, DEFAULT_TEAM, MPC_TESTNET, USDC_TESTNET } from '../lib/config'
import { bool, executePlan, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { actionKinds, functionCall, sha256Hex, totalDeposit, totalGas, type TxPlan } from '../lib/tx'
import { formatNear, formatTgas, parseNear, TGAS } from '../lib/units'

/** MPC versions whose `sign` interface was verified live (A-01). Add one only after a sign-only check passes. */
export const MPC_VERIFIED_VERSIONS: readonly string[] = ['3.17.0', '3.18.0']

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export interface BirthOptions {
  parent: string
  child: string
  wasm: Uint8Array
  wasmPath?: string
  /** required for the final contract; when given it must equal sha256(wasm) */
  expectedSha256?: string
  mpc: string
  usdc: string | null
  baseUri: string
  mintTo: string
  mints: number
  transfer: bigint
  newGas: bigint
  mintGas: bigint
  mintDeposit: bigint
}

export const BIRTH_DEFAULTS = { mints: 7, newGas: 30n * TGAS, mintGas: 20n * TGAS, mintDeposit: parseNear('0.02') } as const

/** The protocol's transaction size limit is 1.5 MiB; the wasm is the bulk of the tx (spec §5.5). */
export const MAX_WASM_BYTES = 1_500_000

/**
 * 10 NEAR for rc*, 20 NEAR for satchel.* (D-34 as revised by the security review S-02: ownership changes cost the
 * contract storage, so the final keeps a deep free balance; tools/monitor.sh alerts below 3 NEAR free). Otherwise the
 * caller must say.
 */
export function defaultTransfer(child: string, parent: string): bigint | null {
  if (child === `satchel.${parent}`) return parseNear('20')
  if (/^rc\d*\./.test(child)) return parseNear('10')
  return null
}

export const isFinalChild = (child: string, parent: string): boolean => child === `satchel.${parent}`

/** wNEAR on testnet: the contract allowlists it for inside deposits (`market.rs` WNEAR), so it is never the USDC. */
export const WNEAR_TESTNET = 'wrap.testnet'

/**
 * Review R3-D-1: `usdc` is immutable after birth, and the contract prices USDC listings and offers in 6-decimal base
 * units, so the account must really be USDC. null when `ft_metadata` says USDC with 6 decimals, else what is wrong.
 */
export function usdcMetadataProblem(meta: unknown): string | null {
  if (meta === null || typeof meta !== 'object') return 'ft_metadata unreadable'
  const m = meta as { symbol?: unknown; decimals?: unknown }
  if (m.symbol !== 'USDC') return `symbol ${JSON.stringify(m.symbol)}, expected "USDC"`
  if (m.decimals !== 6) return `decimals ${JSON.stringify(m.decimals)}, expected 6`
  return null
}

/** The contract's compile-time quiet period (`COOLDOWN_BLOCKS` in contracts/satchel/src/lib.rs); bound by H, read back from `config`. */
export const EXPECTED_COOLDOWN_BLOCKS = 250

/** The tag whose commit the rc and final wasm must be built from (cargo-near embeds the rev in NEP-330 build_info). */
export const RELEASE_TAG = 'contract-v1.0.0-rc1'

/** rc and the final both carry H and must go through the reproducible-build checks; dev children never use this tool. */
export const isReleaseChild = (child: string, parent: string): boolean => isFinalChild(child, parent) || /^rc\d*\./.test(child)

export interface SourceMetadata {
  version?: string
  link?: string
  standards?: unknown
  build_info?: { build_environment?: string; build_command?: string[]; contract_path?: string; source_code_snapshot?: string } | null
}

/**
 * The NEP-330 JSON that near-sdk embeds as a static string in the wasm (what `contract_source_metadata` returns).
 * null when there is none. Reads the bytes as latin1 and brace-matches from `{"version":`, respecting JSON strings.
 */
export function sourceMetadataFromWasm(wasm: Uint8Array): SourceMetadata | null {
  const s = Buffer.from(wasm).toString('latin1')
  for (let start = s.indexOf('{"version":'); start !== -1; start = s.indexOf('{"version":', start + 1)) {
    let depth = 0
    let inStr = false
    for (let i = start; i < s.length; i++) {
      const c = s[i]
      if (inStr) {
        if (c === '\\') i++
        else if (c === '"') inStr = false
      } else if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) {
        try {
          const m = JSON.parse(Buffer.from(s.slice(start, i + 1), 'latin1').toString('utf8')) as SourceMetadata
          if ('build_info' in m && 'standards' in m) return m
        } catch {
          /* not the metadata blob; keep looking */
        }
        break
      }
    }
  }
  return null
}

/**
 * The reproducible-build binding (D-01, SAT-081): build_info must name the release commit and the pinned image digest.
 * null when it does, else what is wrong. `imageDigest` is the `image_digest` from contracts/satchel/Cargo.toml.
 */
export function buildInfoProblem(meta: SourceMetadata | null, want: { rev: string; imageDigest?: string | null }): string | null {
  if (!meta) return 'no NEP-330 contract_source_metadata in the wasm'
  const bi = meta.build_info
  if (!bi) return 'build_info is null: this is a non-reproducible build, not the CI reproducible artifact'
  const snap = bi.source_code_snapshot ?? ''
  const m = /[?&]rev=([0-9a-f]{40})\b/.exec(snap)
  if (!m) return `source_code_snapshot ${JSON.stringify(snap)} has no full commit rev`
  if (m[1] !== want.rev.toLowerCase()) return `source_code_snapshot rev ${m[1]} != ${want.rev} (${RELEASE_TAG})`
  if (want.imageDigest && !(bi.build_environment ?? '').endsWith(`@${want.imageDigest}`))
    return `build_environment ${JSON.stringify(bi.build_environment)} is not the pinned image @${want.imageDigest}`
  return null
}

/**
 * What a born contract's `config` view must say; [] when everything matches. `mints` checks next_token_id = mints + 1
 * (right after the birth); leave it out for a contract that may have minted since (the rc twin, checked on Day 10).
 */
export function configProblems(config: unknown, o: Pick<BirthOptions, 'mpc' | 'usdc' | 'baseUri'> & { mints?: number }): string[] {
  if (config === null || typeof config !== 'object') return ['config unreadable']
  const c = config as Record<string, unknown>
  const want: [string, unknown][] = [
    ['mpc_contract_id', o.mpc],
    ['usdc_contract_id', o.usdc],
    ['base_uri', o.baseUri],
    ['cooldown_blocks', EXPECTED_COOLDOWN_BLOCKS],
    ...(o.mints === undefined ? [] : ([['next_token_id', o.mints + 1]] as [string, unknown][])),
  ]
  return want.filter(([k, v]) => c[k] !== v).map(([k, v]) => `${k} ${JSON.stringify(c[k])} != ${JSON.stringify(v)}`)
}

export function validateBirth(o: BirthOptions): string {
  assertAccountId(o.parent, 'parent')
  assertAccountId(o.child, 'child')
  const label = o.child.slice(0, o.child.length - o.parent.length - 1)
  if (!o.child.endsWith(`.${o.parent}`) || label.length === 0 || label.includes('.'))
    throw new Error(`${o.child} is not a direct sub-account of ${o.parent} (only the parent can create it)`)
  assertAccountId(o.mpc, 'mpc')
  if (o.usdc !== null) assertAccountId(o.usdc, 'usdc')
  // R3-D-1: each of these has its own immutable role in the contract, so no two may be the same account
  const roles: [string, string | null][] = [['the contract', o.child], ['--mpc', o.mpc], ['--usdc', o.usdc], ['wNEAR', WNEAR_TESTNET]]
  for (const [i, [a, x]] of roles.entries())
    for (const [b, y] of roles.slice(i + 1))
      if (x !== null && x === y) throw new Error(`${a} and ${b} are the same account (${x}); each has its own role and is immutable after birth`)
  assertAccountId(o.mintTo, 'mint receiver')
  if (o.mintTo === o.child || o.mintTo === o.mpc || o.mintTo === o.usdc)
    throw new Error('the demo tokens must go to a persona, not the contract, the MPC or USDC (the contract refuses them, ERR_BAD_RECEIVER)')
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?\/api\/card\/$/.test(o.baseUri)) throw new Error(`base_uri must be https://<app-host>/api/card/ (got ${o.baseUri}); it is immutable after birth`)
  if (!Number.isInteger(o.mints) || o.mints < 1 || o.mints > 10) throw new Error('--mints must be 1..10')
  if (o.wasm.length === 0) throw new Error('empty wasm')
  if (o.wasm.length > MAX_WASM_BYTES) throw new Error(`wasm is ${o.wasm.length} B, above the ${MAX_WASM_BYTES} B tx budget`)
  if (o.wasm[0] !== 0x00 || o.wasm[1] !== 0x61 || o.wasm[2] !== 0x73 || o.wasm[3] !== 0x6d) throw new Error('not a wasm file (bad magic)')
  const h = sha256Hex(o.wasm)
  if (o.expectedSha256 !== undefined && o.expectedSha256.toLowerCase() !== h) throw new Error(`wasm sha256 ${h} != --expected-sha256 ${o.expectedSha256}`)
  if (isReleaseChild(o.child, o.parent) && o.expectedSha256 === undefined)
    throw new Error(`the ${isFinalChild(o.child, o.parent) ? 'final' : 'rc'} birth requires --expected-sha256 <H> (the CI reproducible build hash, SAT-081): rc and final run the same H`)
  if (o.transfer <= 0n) throw new Error('--transfer must be > 0')
  return h
}

/** `new` init args exactly as the contract expects (docs/handoff/contract.md §1). */
export const initArgs = (o: Pick<BirthOptions, 'mpc' | 'usdc' | 'baseUri'>) => ({ mpc: o.mpc, usdc: o.usdc, base_uri: o.baseUri })

export function buildBirthPlan(o: BirthOptions): { plan: TxPlan; sha256: string } {
  const sha256 = validateBirth(o)
  const plan: TxPlan = {
    title: `KEYLESS BIRTH of ${o.child}`,
    signerId: o.parent,
    receiverId: o.child,
    actions: [
      { type: 'CreateAccount' },
      { type: 'Transfer', deposit: o.transfer },
      { type: 'DeployContract', code: o.wasm, sha256, ...(o.wasmPath ? { source: o.wasmPath } : {}) },
      functionCall('new', initArgs(o), o.newGas, 0n),
      ...Array.from({ length: o.mints }, () => functionCall('nft_mint', { receiver_id: o.mintTo }, o.mintGas, o.mintDeposit)),
    ],
  }
  assertBirthShape(plan, o.mints)
  return { plan, sha256 }
}

/** The exact shape the runbook reviews: 4 + mints actions, in order, no key action anywhere. */
export function assertBirthShape(plan: TxPlan, mints: number): void {
  const kinds = actionKinds(plan)
  const want = ['CreateAccount', 'Transfer', 'DeployContract', ...Array(1 + mints).fill('FunctionCall')]
  if (JSON.stringify(kinds) !== JSON.stringify(want)) throw new Error(`unexpected action list ${kinds.join(',')}`)
  if (kinds.some((k) => /Key|DeleteAccount|Stake|Global/.test(k))) throw new Error('a key/account action is in the birth batch')
  const fc = plan.actions.filter((a) => a.type === 'FunctionCall') as Extract<TxPlan['actions'][number], { type: 'FunctionCall' }>[]
  if (fc[0]!.method !== 'new' || fc.slice(1).some((a) => a.method !== 'nft_mint')) throw new Error('function calls must be new, then nft_mint ×N')
  if (totalGas(plan) > 300n * TGAS) throw new Error('prepaid FunctionCall gas above 300 Tgas')
}

/** Balance the parent must hold up front, or the tx is rejected with NotEnoughBalance (keyless-birth RESULTS 3a). */
export function requiredParentBalance(plan: TxPlan, gasPrice: bigint): { deposits: bigint; gasHold: bigint; total: bigint } {
  const deposits = totalDeposit(plan)
  const gasHold = totalGas(plan) * gasPrice * 10n
  return { deposits, gasHold, total: deposits + gasHold }
}

/** The judge proofs 1–4 of spec §5.16, filled in. */
export function proofCommands(child: string, txHash: string | null, txApi = 'https://tx.test.fastnear.com'): string[] {
  const h = txHash ?? '<birth tx hash>'
  return [
    `curl -s -X POST ${txApi}/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["${h}"]}'`,
    `near account view-account-summary ${child} network-config testnet-fastnear now`,
    `curl -s -X POST ${txApi}/v0/account -H 'content-type: application/json' -d '{"account_id":"${child}","is_any_signer":true}'`,
    `curl -s -X POST ${txApi}/v0/account -H 'content-type: application/json' -d '{"account_id":"${child}","desc":false,"limit":1}'`,
  ]
}

const OPTIONS = {
  parent: { type: 'string' },
  child: { type: 'string' },
  wasm: { type: 'string', default: 'target/near/satchel/satchel.wasm' },
  'expected-sha256': { type: 'string' },
  'expected-rev': { type: 'string' },
  mpc: { type: 'string', default: MPC_TESTNET },
  usdc: { type: 'string', default: USDC_TESTNET },
  'no-usdc': { type: 'boolean', default: false },
  'base-uri': { type: 'string' },
  'mint-to': { type: 'string' },
  mints: { type: 'string', default: String(BIRTH_DEFAULTS.mints) },
  transfer: { type: 'string' },
  evidence: { type: 'string' },
} as const

const HELP = `tools/deploy/keyless-birth.ts: one tx, CreateAccount · Transfer · DeployContract · new · nft_mint ×7, no AddKey.
  --child <acct>            REQUIRED: rc.<team>.testnet (Day 9) or satchel.<team>.testnet (Day 10)
  --parent <acct>           default <team>.testnet (signer; key from ~/.near-credentials)
  --wasm <path>             default target/near/satchel/satchel.wasm (the reproducible artifact on rc/final)
  --expected-sha256 <H>     required for rc and the final; must equal sha256(wasm)
  --expected-rev <commit>   rc/final: the commit NEP-330 build_info must name (default: git rev of ${RELEASE_TAG})
  --base-uri <url>          REQUIRED: https://<app-host>/api/card/ (immutable)
  --mpc <acct>              default ${MPC_TESTNET}
  --usdc <acct> | --no-usdc default Circle testnet USDC; --no-usdc if H-26 chose usdc: null
  --mint-to <acct>          default alice.<team>.testnet      --mints <n> default 7
  --transfer <NEAR>         default 10 (rc*) / 20 (satchel.*)
  --evidence <path>         where --send writes the proof JSON (default docs/evidence/birth-<child>.json)
  --send                    sign and send (asks for a typed "yes" in a terminal; --yes is not accepted)
  --offline                 skip the read-only pre-checks`

type Line = (pass: boolean | null, s: string) => void
function checker(ctx: Ctx, tag: string): { line: Line; ok: () => boolean } {
  let ok = true
  return {
    line: (pass, s) => {
      ctx.log(`    ${tag.padEnd(9)} ${pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL'}  ${s}`)
      if (pass === false) ok = false
    },
    ok: () => ok,
  }
}

/** `git rev-parse <tag>^{commit}` in the repo, or null (no git, no tag). */
function gitRev(ref: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null
  } catch {
    return null
  }
}

/** `image_digest` pinned in contracts/satchel/Cargo.toml [package.metadata.near.reproducible_build]. */
function pinnedImageDigest(): string | null {
  try {
    return /^image_digest\s*=\s*"([^"]+)"/m.exec(readFileSync(join(ROOT, 'contracts/satchel/Cargo.toml'), 'utf8'))?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * Local checks of the artifact itself; they run even with --offline, and a FAIL blocks --send.
 * INV-22 (tools/check-wasm-imports.sh) for every child; the NEP-330 build_info binding for rc and the final.
 */
function wasmChecks(ctx: Ctx, o: BirthOptions, wasmPath: string, rev: string | null): boolean {
  const { line, ok } = checker(ctx, 'wasm')
  const imp = spawnSync('bash', [join(ROOT, 'tools/check-wasm-imports.sh'), wasmPath], { encoding: 'utf8' })
  line(imp.status === 0, `INV-22 import check (tools/check-wasm-imports.sh): ${imp.status === 0 ? 'no AddKey/DeployContract/DeleteAccount host imports' : (imp.stdout + imp.stderr).trim().split('\n').pop()}`)
  const meta = sourceMetadataFromWasm(o.wasm)
  ctx.log(`    nep330    version ${meta?.version ?? '?'} · build_info ${meta?.build_info ? (meta.build_info.source_code_snapshot ?? '?') : 'null'}`)
  if (isReleaseChild(o.child, o.parent)) {
    if (!rev) line(false, `cannot resolve ${RELEASE_TAG} to a commit: pass --expected-rev <commit>`)
    else {
      const p = buildInfoProblem(meta, { rev, imageDigest: pinnedImageDigest() })
      line(p === null, `reproducible build_info names rev ${rev} and the pinned image${p ? `: ${p}` : ''}`)
    }
  } else line(null, 'build_info binding not checked (not an rc/final child)')
  return ok()
}

/** Day 10 (DP6): the final is born only after rc proved the same H and init args on chain. */
async function rcTwinChecks(ctx: Ctx, line: Line, o: BirthOptions, sha256: string): Promise<void> {
  const twin = `rc.${o.parent}`
  const acct = await ctx.rpc.viewAccount(twin)
  if (!acct) return line(false, `${twin} does not exist: rehearse on rc first (D-02)`)
  const code = Buffer.from(base58.decode(acct.code_hash)).toString('hex')
  line(code === sha256, `${twin} runs H (code ${code === sha256 ? 'matches' : `is ${code}`})`)
  const keys = (await ctx.rpc.viewAccessKeyList(twin)).keys.length
  line(keys === 0, `${twin} has 0 access keys (${keys})`)
  const probs = configProblems(await ctx.rpc.view<unknown>(twin, 'config').catch(() => null), o)
  line(probs.length === 0, `${twin} config has the same mpc, usdc, base_uri and cooldown ${EXPECTED_COOLDOWN_BLOCKS}${probs.length ? `: ${probs.join('; ')}` : ''}`)
}

async function preChecks(ctx: Ctx, plan: TxPlan, o: BirthOptions, sha256: string): Promise<boolean> {
  const { line, ok } = checker(ctx, 'pre')
  const child = await ctx.rpc.viewAccount(o.child)
  line(child === null, `${o.child} does not exist yet (view_account → UNKNOWN_ACCOUNT)`)
  const parent = await ctx.rpc.viewAccount(o.parent)
  line(parent !== null, `${o.parent} exists`)
  const gasPrice = await ctx.rpc.gasPrice().catch(() => 100_000_000n)
  const need = requiredParentBalance(plan, gasPrice)
  if (parent) {
    const bal = BigInt(parent.amount)
    line(bal >= need.total, `${o.parent} balance ${formatNear(bal)} ≥ ${formatNear(need.total)} (deposits ${formatNear(need.deposits)} + gas hold ${formatNear(need.gasHold)} at ${gasPrice} yocto/gas)`)
  } else line(null, `needs ≥ ${formatNear(need.total)} up front (deposits + 10× gas hold)`)
  const v = await ctx.rpc.view<string>(o.mpc, 'version').catch(() => null)
  // A-01: only versions whose `sign` interface was checked live (3.18.0: EVM and SOL sign-only on dev2, 2026-11-05).
  line(v !== null && MPC_VERIFIED_VERSIONS.includes(v), `MPC ${o.mpc} version ${v ?? 'unreadable'} (expected ${MPC_VERIFIED_VERSIONS.join(' or ')}, A-01)`)
  if (o.usdc) {
    line((await ctx.rpc.viewAccount(o.usdc)) !== null, `USDC contract ${o.usdc} exists`)
    const problem = usdcMetadataProblem(await ctx.rpc.view<unknown>(o.usdc, 'ft_metadata').catch(() => null))
    line(problem === null, `USDC contract ${o.usdc} is USDC with 6 decimals (ft_metadata)${problem ? `: ${problem}` : ''}`)
  }
  line((await ctx.rpc.viewAccount(o.mintTo)) !== null, `mint receiver ${o.mintTo} exists`)
  if (isFinalChild(o.child, o.parent)) await rcTwinChecks(ctx, line, o, sha256)
  return ok()
}

/** Read the born contract back; every check must PASS, or the tool exits non-zero after writing the evidence. */
async function verifyBirth(ctx: Ctx, o: BirthOptions, sha256: string, rev: string | null): Promise<Record<string, unknown> & { problems: string[] }> {
  const { line } = checker(ctx, 'verify')
  const problems: string[] = []
  const check = (pass: boolean, s: string) => (line(pass, s), pass || problems.push(s))
  const acct = await ctx.rpc.viewAccount(o.child)
  check(acct !== null, `${o.child} exists`)
  const keys = acct ? (await ctx.rpc.viewAccessKeyList(o.child)).keys.length : null
  check(keys === 0, `0 access keys (${keys})`)
  const codeHex = acct ? Buffer.from(base58.decode(acct.code_hash)).toString('hex') : null
  check(codeHex === sha256, `code = H (${codeHex})`)
  const owners: (string | null)[] = []
  for (let i = 1; i <= o.mints; i++)
    owners.push(acct ? ((await ctx.rpc.view<{ owner_id: string } | null>(o.child, 'nft_token', { token_id: String(i) }).catch(() => null))?.owner_id ?? null) : null)
  check(owners.every((x) => x === o.mintTo), `ids 1–${o.mints} owned by ${o.mintTo} (${owners.join(',')})`)
  const config = acct ? await ctx.rpc.view(o.child, 'config').catch(() => null) : null
  const cp = configProblems(config, o)
  check(cp.length === 0, `config mpc/usdc/base_uri/cooldown ${EXPECTED_COOLDOWN_BLOCKS}/next_token_id ${o.mints + 1}${cp.length ? `: ${cp.join('; ')}` : ''}`)
  const source = acct ? await ctx.rpc.view<SourceMetadata>(o.child, 'contract_source_metadata').catch(() => null) : null
  if (isReleaseChild(o.child, o.parent) && rev) {
    const p = buildInfoProblem(source, { rev, imageDigest: pinnedImageDigest() })
    check(p === null, `contract_source_metadata names rev ${rev}${p ? `: ${p}` : ''}`)
  }
  return { exists: acct !== null, access_keys: keys, code_sha256: codeHex, code_ok: codeHex === sha256, owners, config, contract_source_metadata: source, problems }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  if (bool(v, 'yes')) throw new Error('--yes is not accepted by the keyless-birth tool: type "yes" in the terminal')
  const ctx = makeCtx(v)
  const team = str(v, 'team') ?? process.env.SATCHEL_TEAM ?? DEFAULT_TEAM
  const parent = str(v, 'parent') ?? `${team}.testnet`
  const child = str(v, 'child')
  if (!child) throw new Error('--child is required (rc.<team>.testnet or satchel.<team>.testnet)')
  const baseUri = str(v, 'base-uri')
  if (!baseUri) throw new Error('--base-uri https://<app-host>/api/card/ is required (H-05; immutable after birth)')
  const wasmPath = resolve(ROOT, str(v, 'wasm')!)
  if (!existsSync(wasmPath)) throw new Error(`wasm not found: ${wasmPath} (build it: cargo near build reproducible-wasm …)`)
  const transfer = str(v, 'transfer') ? parseNear(str(v, 'transfer')!) : defaultTransfer(child, parent)
  if (transfer === null) throw new Error('--transfer <NEAR> is required for this child name')
  const o: BirthOptions = {
    parent,
    child,
    wasm: new Uint8Array(readFileSync(wasmPath)),
    wasmPath: str(v, 'wasm')!,
    ...(str(v, 'expected-sha256') ? { expectedSha256: str(v, 'expected-sha256')! } : {}),
    mpc: str(v, 'mpc')!,
    usdc: bool(v, 'no-usdc') ? null : str(v, 'usdc')!,
    baseUri,
    mintTo: str(v, 'mint-to') ?? `alice.${team}.testnet`,
    mints: Number(str(v, 'mints')),
    transfer,
    newGas: BIRTH_DEFAULTS.newGas,
    mintGas: BIRTH_DEFAULTS.mintGas,
    mintDeposit: BIRTH_DEFAULTS.mintDeposit,
  }
  const { plan, sha256 } = buildBirthPlan(o)
  const rev = str(v, 'expected-rev')?.toLowerCase() ?? gitRev(RELEASE_TAG)
  ctx.log(`== deploy/keyless-birth · ${ctx.send ? 'SEND MODE' : 'DRY RUN'}${isFinalChild(child, parent) ? ' · FINAL CONTRACT (H-15: needs the human\'s explicit "yes")' : ''}`)
  ctx.log(`    wasm      ${o.wasmPath} · ${o.wasm.length} bytes`)
  ctx.log(`    H         ${sha256}`)
  ctx.log(`    compare   shasum -a 256 ${o.wasmPath}    # macOS\n              sha256sum ${o.wasmPath}       # Linux`)
  ctx.log(`    init      new ${JSON.stringify(initArgs(o))}`)
  ctx.log(`    actions   ${actionKinds(plan).join(' · ')}  (no AddKey: checked)`)
  ctx.log(`    gas       ${formatTgas(totalGas(plan))} prepaid in FunctionCalls (measured 72–78 Tgas burnt in sandbox/spike)`)
  const wasmOk = wasmChecks(ctx, o, wasmPath, rev)
  const pre = ctx.offline ? true : await preChecks(ctx, plan, o, sha256)
  if (ctx.send && !(pre && wasmOk)) throw new Error('pre-checks failed: nothing was signed')
  if (!(pre && wasmOk)) {
    ctx.log('    NOTE      a check above is FAIL: --send would refuse to sign (exit 1)')
    process.exitCode = 1
  }
  const sent = await executePlan(ctx, plan, {
    allow: { deploy: true, createAccount: true },
    requireTty: true,
    noYesFlag: true,
    waitUntil: 'FINAL',
    prompt: (hash) => `\nThis creates ${child} WITHOUT ANY KEY, forever, running code H=${sha256}.\ntx ${hash}. Type "yes" to sign and send: `,
  })
  ctx.log('    proofs    (spec §5.16, run after the birth):')
  proofCommands(child, sent?.hash ?? null, ctx.cfg.nearTxApi).forEach((c, i) => ctx.log(`      ${i + 1}. ${c}`))
  if (!sent) return
  if (!sent.ok) throw new Error(`birth failed (${sent.errors.join(', ') || 'see the tx'}); the batch is atomic, so ${child} does not exist. Fix and re-run.`)
  const verify = await verifyBirth(ctx, o, sha256, rev)
  const blockHash = sent.outcome.transaction_outcome?.block_hash ?? null
  const block = blockHash ? await ctx.rpc.call<{ header: { height: number } }>('block', { block_id: blockHash }).catch(() => null) : null
  const evidence = {
    kind: 'keyless-birth',
    parent,
    child,
    tx_hash: sent.hash,
    block_hash: blockHash,
    block_height: block?.header.height ?? null,
    wasm_sha256: sha256,
    init_args: initArgs(o),
    actions: actionKinds(plan),
    transfer_yocto: transfer.toString(),
    verify,
    proofs: proofCommands(child, sent.hash, ctx.cfg.nearTxApi),
    recorded_at: new Date().toISOString(),
  }
  const out = resolve(ROOT, str(v, 'evidence') ?? join('docs/evidence', `birth-${child}.json`))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`)
  ctx.log(`    evidence  ${out}`)
  ctx.log(`    record    birth tx ${sent.hash} · block A = ${evidence.block_height ?? '(read it from proof 4)'}`)
  if (verify.problems.length) throw new Error(`the birth landed but ${verify.problems.length} check(s) FAILED: ${verify.problems.join(' | ')}. A wrong argument is permanent: see keyless-birth.md §5.`)
}

if (isMain(import.meta.url)) runMain(main)
