/**
 * After the final keyless birth (launch checklist E-02, F-01): fill the three values that exist only from then on into
 * every file that waits for them, and turn the "until the birth" notes into their final wording.
 *
 *   H         the SHA-256 of the reproducible wasm deployed at the birth (64 hex)
 *   birth tx  the hash of the one birth transaction (base58, 32 bytes)
 *   block A   the block height of that transaction (the oldest entry of the account's history)
 *
 *   pnpm --filter @satchel/tools fill-final --h <hex64> --birth-tx <base58> --block <int>            # dry run: diff summary
 *   pnpm --filter @satchel/tools fill-final --h … --birth-tx … --block … --verify                   # + read-only on-chain check
 *   pnpm --filter @satchel/tools fill-final --h … --birth-tx … --block … --verify --write           # apply
 *   pnpm --filter @satchel/tools fill-final --h … --birth-tx … --block … --env --write              # + the E-03 production switch
 *   pnpm --filter @satchel/tools fill-final --from-evidence --verify                                # values from the birth record
 *
 * Every edit is an exact string with an expected count. If any target is missing or appears a different number of
 * times, nothing is written and every problem is listed (a doc changed since this script was written, or the values
 * are already filled). `--env` also rewrites apps/web/.env.production for the final contract (role final, H); pushing
 * that to main deploys production (Vercel builds every push to main), so it is opt-in. It signs nothing and sends
 * nothing; `--verify` only reads (NEAR RPC view_account / view_access_key_list, the FastNEAR tx API).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { base58 } from '@scure/base'
import { loadConfig } from '../lib/config'
import { NearRpc } from '../lib/near-rpc'
import { isMain, runMain } from '../lib/run'
import { BIRTH_DEFAULTS } from './keyless-birth'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(HERE, '..', '..')

export interface FinalValues {
  /** lowercase hex SHA-256 of the deployed wasm */
  h: string
  birthTx: string
  block: number
}

/** Format checks only (`--verify` checks the values against the chain). Throws with every problem listed. */
export function validateValues(raw: { h?: string; birthTx?: string; block?: string }): FinalValues {
  const problems: string[] = []
  const h = (raw.h ?? '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(h)) problems.push(`--h must be 64 hex characters (the wasm SHA-256), got ${JSON.stringify(raw.h ?? '')}`)
  const tx = (raw.birthTx ?? '').trim()
  let txOk = false
  try {
    txOk = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(tx) && base58.decode(tx).length === 32
  } catch {
    txOk = false
  }
  if (!txOk) problems.push(`--birth-tx must be a base58 NEAR transaction hash (32 bytes), got ${JSON.stringify(raw.birthTx ?? '')}`)
  const b = (raw.block ?? '').trim()
  // testnet heights are in the hundreds of millions: a small number is a typo (a nonce, a token id)
  if (!/^[1-9]\d{8,11}$/.test(b)) problems.push(`--block must be the birth block height (an integer of 9 to 12 digits), got ${JSON.stringify(raw.block ?? '')}`)
  if (problems.length) throw new Error(problems.join('\n'))
  return { h, birthTx: tx, block: Number(b) }
}

export type Group = 'H' | 'birth-tx' | 'block' | 'note' | 'env'

export interface Edit {
  file: string
  group: Group
  /** exact text to find */
  find: string
  /** how many times it must appear */
  count: number
  replace: (v: FinalValues) => string
}

const FINAL = 'satchel.satchelhq.testnet'
const txLink = (tx: string) => `https://testnet.nearblocks.io/txns/${tx}`

/** The placeholders and "until the birth" notes, file by file. Exact text: keep in step with the docs. */
export const EDITS: Edit[] = [
  // ── README.md ──
  {
    file: 'README.md',
    group: 'note',
    count: 1,
    find:
      '> The app reads the development contract `dev2.satchelhq.testnet` until the final contract\n' +
      '> `satchel.satchelhq.testnet` is born keyless on **Nov 10**. Values marked `[TBD: …]` exist from then on.\n',
    replace: (v) =>
      `> The app reads the release contract \`${FINAL}\`, born keyless in transaction\n` +
      `> [\`${v.birthTx}\`](${txLink(v.birthTx)}) at block ${v.block}. [Verify on-chain](docs/verify.md) checks it.\n`,
  },
  { file: 'README.md', group: 'birth-tx', count: 1, find: 'the birth transaction `[TBD]`', replace: (v) => `the birth transaction \`${v.birthTx}\`` },
  { file: 'README.md', group: 'H', count: 1, find: 'the code hash `[TBD: H]`', replace: (v) => `the code hash \`${v.h}\`` },
  // ── docs/verify.md ──
  {
    file: 'docs/verify.md',
    group: 'note',
    count: 1,
    find:
      'Until the final contract is born (Nov 10), the checks that read it **skip** rather than fail, and so does any check\n' +
      'whose expected value is still `[TBD]`. To run the same checks against the development contract that the hosted app\n' +
      'reads today:\n' +
      '\n' +
      '```sh\n' +
      'SATCHEL_CONTRACT=dev2.satchelhq.testnet tools/judge-snippets.sh\n' +
      '```\n' +
      '\n' +
      'On a development contract the lock checks (2 and 4 below) skip, because a development contract keeps its key, and so\n' +
      'do the birth checks (3 and 5), which belong to the final contract. The\n' +
      "token's addresses come from the app when it serves that contract. Every other value can be overridden too:\n",
    replace: () =>
      `The checks run against the release contract, \`${FINAL}\`. They also run against a development\n` +
      'contract:\n' +
      '\n' +
      '```sh\n' +
      'SATCHEL_CONTRACT=dev2.satchelhq.testnet tools/judge-snippets.sh\n' +
      '```\n' +
      '\n' +
      'There the lock checks (2 and 4 below) skip, because a development contract keeps its key, and so do the birth checks\n' +
      "(3 and 5), which belong to the release contract. That token's addresses come from `SATCHEL_BTC_ADDRESS` and\n" +
      '`SATCHEL_EVM_ADDRESS`, or from the app when it serves that contract. Every other value can be overridden too:\n',
  },
  { file: 'docs/verify.md', group: 'H', count: 3, find: '[TBD: H]', replace: (v) => v.h },
  { file: 'docs/verify.md', group: 'birth-tx', count: 2, find: '[TBD: birth tx hash]', replace: (v) => v.birthTx },
  { file: 'docs/verify.md', group: 'block', count: 1, find: '[TBD: block A]', replace: (v) => String(v.block) },
  // ── docs/security-model.md ──
  { file: 'docs/security-model.md', group: 'birth-tx', count: 1, find: '[TBD: birth tx hash]', replace: (v) => v.birthTx },
  { file: 'docs/security-model.md', group: 'block', count: 1, find: '[TBD: block A]', replace: (v) => String(v.block) },
  { file: 'docs/security-model.md', group: 'H', count: 1, find: '[TBD: H]', replace: (v) => v.h },
  // ── AGENTS.md: Status ──
  {
    file: 'AGENTS.md',
    group: 'note',
    count: 1,
    find:
      '- Contract: complete and reviewed internally (three rounds); the freeze is set for Nov 9. Until the final birth\n' +
      '  the hosted app reads the development contract `dev2.satchelhq.testnet`.\n' +
      '- The final contract `satchel.satchelhq.testnet` is born keyless on Nov 10. Until then the README values marked\n' +
      '  `[TBD: …]` (code hash **H**, birth transaction) do not exist, and checks against the final account report\n' +
      '  "account does not exist". That is expected, not a failure: `tools/judge-snippets.sh` skips those checks, and\n' +
      '  `SATCHEL_CONTRACT=dev2.satchelhq.testnet tools/judge-snippets.sh` runs them against the development contract\n' +
      '  (the lock checks apply to the final contract only).\n',
    replace: (v) =>
      '- Contract: complete and reviewed internally (three rounds), frozen at tag `contract-v1.0.0`. The hosted app reads\n' +
      `  the release contract \`${FINAL}\`.\n` +
      `- That contract was born keyless in one transaction (\`${v.birthTx}\`, block ${v.block}) with no AddKey,\n` +
      `  and runs the code with SHA-256 \`${v.h}\`, reproducible at that tag.\n` +
      '  `tools/judge-snippets.sh` checks all of it read-only. The development contracts (`dev1`, `dev2.satchelhq.testnet`)\n' +
      '  keep their keys: they are for testing, not for trust (the lock checks skip there).\n',
  },
  // ── docs/GLOSSARY.md ──
  {
    file: 'docs/GLOSSARY.md',
    group: 'note',
    count: 1,
    find: '| `satchel.satchelhq.testnet` | The **final** contract. Born keyless on Day 10 (Nov 10); until then it does not exist. |\n',
    replace: () => '| `satchel.satchelhq.testnet` | The **final** (release) contract, read by the hosted app. Born keyless on Day 10 (Nov 10) in one transaction with no AddKey ([verify.md](verify.md) step 3). |\n',
  },
  {
    file: 'docs/GLOSSARY.md',
    group: 'note',
    count: 1,
    find: '| `dev1.…`, `dev2.…` (`devN`) | Development deployments. The hosted app at https://usesatchel.xyz reads `dev2.satchelhq.testnet` until the final contract exists. |\n',
    replace: () => '| `dev1.…`, `dev2.…` (`devN`) | Development deployments. They keep their access keys; the hosted app read `dev2.satchelhq.testnet` until the final contract was born. |\n',
  },
  // ── docs/development.md ──
  {
    file: 'docs/development.md',
    group: 'note',
    count: 1,
    find:
      'Until the final contract is born on Nov 10, live mode needs the development contract too:\n' +
      '`NEXT_PUBLIC_DATA_MODE=live NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet pnpm --filter web dev`.\n',
    replace: () =>
      `Live mode reads the release contract \`${FINAL}\` by default. The hosted app also sets\n` +
      '`NEXT_PUBLIC_CONTRACT_ROLE=final` and `NEXT_PUBLIC_EXPECTED_CODE_HASH` (H, from [verify.md](verify.md)) for the strict\n' +
      'checks; `apps/web/.env.production` has its exact settings.\n',
  },
  // ── the read-only scripts' defaults ──
  { file: 'tools/judge-snippets.sh', group: 'birth-tx', count: 1, find: 'BIRTH_TX="${SATCHEL_BIRTH_TX:-[TBD: birth tx hash]}"', replace: (v) => `BIRTH_TX="\${SATCHEL_BIRTH_TX:-${v.birthTx}}"` },
  { file: 'tools/judge-snippets.sh', group: 'block', count: 1, find: 'BLOCK_A="${SATCHEL_BIRTH_BLOCK:-[TBD: block A]}"', replace: (v) => `BLOCK_A="\${SATCHEL_BIRTH_BLOCK:-${v.block}}"` },
  { file: 'tools/judge-snippets.sh', group: 'H', count: 1, find: 'H="${SATCHEL_EXPECTED_CODE_HASH:-[TBD: reproducible wasm SHA-256]}"', replace: (v) => `H="\${SATCHEL_EXPECTED_CODE_HASH:-${v.h}}"` },
  { file: 'tools/monitor.sh', group: 'H', count: 1, find: 'H="${SATCHEL_EXPECTED_CODE_HASH:-[TBD: reproducible wasm SHA-256]}"', replace: (v) => `H="\${SATCHEL_EXPECTED_CODE_HASH:-${v.h}}"` },
]

/** E-03, opt-in (`--env`): the hosted app's public settings for the final contract. */
export const ENV_EDITS: Edit[] = [
  {
    file: 'apps/web/.env.production',
    group: 'env',
    count: 1,
    find:
      '# Until Day 9 the app runs on a dev contract (it keeps its key; D-48). dev2 (2026-10-29) carries every sprint feature\n' +
      "# (C1–C7 + the M-01 fix); dev1 is the pre-sprint contract and can't be upgraded in place (the state layout changed).\n" +
      '# Day 9: rc.satchelhq.testnet + ROLE=rc. Day 10: satchel.satchelhq.testnet + ROLE=final (launch checklist E-03).\n' +
      'NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet\n' +
      'NEXT_PUBLIC_CONTRACT_ROLE=dev\n',
    replace: () =>
      '# The release contract (launch checklist E-03): born keyless in one transaction with no AddKey, so it has no access\n' +
      '# key and its code can never change. Role final = the strict clean-history gate (lock + code hash, fail closed).\n' +
      '# The development contracts (dev1, dev2) keep their keys; they are history now.\n' +
      `NEXT_PUBLIC_SATCHEL_CONTRACT=${FINAL}\n` +
      'NEXT_PUBLIC_CONTRACT_ROLE=final\n',
  },
  {
    file: 'apps/web/.env.production',
    group: 'env',
    count: 1,
    find:
      '# SHA-256 of the wasm deployed on dev2 (a non-reproducible development build with the Q-03/Q-04 fixes; last deployed\n' +
      '# 2026-11-04, tx 5ZGwNbuaG648Q8rTmywGiKyKfTL5hSWBMSvGzHqZLeJc). The final contract runs the tagged reproducible build.\n' +
      '# It is required for rc/final, where the strict gate fails closed without it. Replace it with the reproducible-build\n' +
      '# hash H on Day 9.\n' +
      'NEXT_PUBLIC_EXPECTED_CODE_HASH=3a73b492d4142db92e9fd733447df63499d0a74563b2091ac870f7ac8a2f2361\n',
    replace: (v) =>
      '# H: the SHA-256 of the reproducible wasm at tag contract-v1.0.0, deployed at the birth (docs/verify.md steps 2 and\n' +
      '# 6). Required for role final: the strict gate fails closed when the deployed code does not match it.\n' +
      `NEXT_PUBLIC_EXPECTED_CODE_HASH=${v.h}\n`,
  },
  { file: 'apps/web/.env.production', group: 'env', count: 1, find: 'NEXT_PUBLIC_DATA_MODE=live\n', replace: () => 'NEXT_PUBLIC_DATA_MODE=live\n' },
]

const occurrences = (text: string, find: string): number => {
  let n = 0
  for (let i = text.indexOf(find); i >= 0; i = text.indexOf(find, i + find.length)) n++
  return n
}

export interface FilePlan {
  file: string
  before: string
  after: string
  edits: { group: Group; count: number }[]
}

/**
 * Apply every edit in memory. Throws (listing every problem) if a file is missing or a target does not appear exactly
 * the expected number of times; nothing is written in that case.
 */
export function planFill(root: string, v: FinalValues, opts: { env?: boolean } = {}): FilePlan[] {
  const edits = [...EDITS, ...(opts.env ? ENV_EDITS : [])]
  const problems: string[] = []
  const plans = new Map<string, FilePlan>()
  for (const e of edits) {
    let p = plans.get(e.file)
    if (!p) {
      const path = join(root, e.file)
      if (!existsSync(path)) {
        problems.push(`${e.file}: missing`)
        continue
      }
      const text = readFileSync(path, 'utf8')
      p = { file: e.file, before: text, after: text, edits: [] }
      plans.set(e.file, p)
    }
    const n = occurrences(p.after, e.find)
    if (n !== e.count) {
      const filled = occurrences(p.after, e.replace(v)) >= e.count ? ' (already filled with these values?)' : ''
      problems.push(`${e.file}: [${e.group}] ${JSON.stringify(firstLine(e.find))} appears ${n}×, expected ${e.count}×${filled}`)
      continue
    }
    p.after = p.after.split(e.find).join(e.replace(v))
    p.edits.push({ group: e.group, count: e.count })
  }
  if (problems.length) throw new Error(`refusing to fill (nothing was written):\n  ${problems.join('\n  ')}`)
  return [...plans.values()]
}

const firstLine = (s: string) => {
  const l = s.split('\n')[0]!
  return l.length > 90 ? `${l.slice(0, 90)}…` : l
}

/** Changed lines only (a line LCS), as `-`/`+` lines with 1-based line numbers of the old file. */
export function lineDiff(before: string, after: string): string[] {
  const a = before.split('\n')
  const b = after.split('\n')
  // trim the common head and tail so the LCS table stays small
  let s = 0
  while (s < a.length && s < b.length && a[s] === b[s]) s++
  let ea = a.length
  let eb = b.length
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--
    eb--
  }
  const A = a.slice(s, ea)
  const B = b.slice(s, eb)
  const L: number[][] = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i]![j] = A[i] === B[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!)
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) {
      i++
      j++
    } else if (j < B.length && (i >= A.length || L[i]![j + 1]! >= L[i + 1]![j]!)) out.push(`  + ${B[j++]}`)
    else out.push(`  - ${String(s + i + 1).padStart(4)}: ${A[i++]}`)
  }
  return out
}

export function applyFill(root: string, plans: FilePlan[]): void {
  for (const p of plans) writeFileSync(join(root, p.file), p.after)
}

/**
 * The values from the record `deploy:keyless-birth --send` writes (docs/evidence/birth-<child>.json): tx_hash,
 * block_height, wasm_sha256. Only a final birth (`satchel.<team>.testnet`) record is accepted.
 */
export function valuesFromEvidence(path: string): { h?: string; birthTx?: string; block?: string } {
  if (!existsSync(path)) throw new Error(`no birth record at ${path} (pass --h, --birth-tx and --block instead)`)
  const e = JSON.parse(readFileSync(path, 'utf8')) as { kind?: string; child?: string; parent?: string; tx_hash?: string; block_height?: number | null; wasm_sha256?: string }
  if (e.kind !== 'keyless-birth') throw new Error(`${path} is not a keyless-birth record`)
  if (!e.child || e.child !== `satchel.${e.parent}`) throw new Error(`${path} records the birth of ${e.child}, not of the final contract satchel.${e.parent}`)
  return { h: e.wasm_sha256, birthTx: e.tx_hash, block: e.block_height == null ? undefined : String(e.block_height) }
}

// ------------------------------------------------------------------------------------------------ residual [TBD]

/** Not judge-facing, or [TBD] on purpose: planning, history, design rules, throwaway spikes, video notes, fixtures. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'target', 'test-results', 'research', 'plan', 'marketing', 'kb'])
const SKIP_PATHS = ['docs/handoff', 'docs/design', 'tools/test', 'apps/web/test', 'packages/core/test']
const TEXT = /\.(md|ts|tsx|mjs|js|sh|py|json|toml|ya?ml|txt)$|(^|\/)\.env[^/]*$/

/**
 * Every `[TBD` left in judge-facing files, as `file:line: text`. In the read-only scripts only the defaults count:
 * their other `[TBD: …]` strings are the skip mechanism itself (an override that is not set, a dev contract's lock).
 */
export function residualTbd(root: string, override: Map<string, string> = new Map()): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = dir ? `${dir}/${name}` : name
      if (SKIP_DIRS.has(name) || SKIP_PATHS.includes(rel)) continue
      const st = statSync(join(root, rel))
      if (st.isDirectory()) walk(rel)
      else if (TEXT.test(rel) && st.size < 2_000_000) {
        const text = override.get(rel) ?? readFileSync(join(root, rel), 'utf8')
        if (!text.includes('[TBD')) continue
        text.split('\n').forEach((line, i) => {
          if (!line.includes('[TBD')) return
          if (rel.endsWith('.sh') && !/:-\[TBD: (birth|block|reproducible)/.test(line)) return
          if (rel === 'tools/deploy/fill-final.ts') return
          out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`)
        })
      }
    }
  }
  walk('')
  return out
}

// ------------------------------------------------------------------------------------------------ --verify

export interface VerifyDeps {
  rpc: Pick<NearRpc, 'viewAccount' | 'viewAccessKeyList'>
  txApi: string
  fetch?: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ json(): Promise<unknown> }>
  contract: string
  parent: string
  mints?: number
}

export const codeHashHex = (b58: string): string => Buffer.from(base58.decode(b58)).toString('hex')

/** Read-only: the chain agrees with the values. Returns the checks as PASS/FAIL lines; `ok` false on any FAIL. */
export async function verifyOnChain(v: FinalValues, d: VerifyDeps): Promise<{ ok: boolean; lines: string[] }> {
  const f = d.fetch ?? ((url, init) => fetch(url, init))
  const post = async (path: string, body: unknown) =>
    (await (await f(`${d.txApi}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()) as Record<string, unknown>
  const lines: string[] = []
  let ok = true
  const check = (cond: boolean, what: string) => {
    lines.push(`  ${cond ? 'PASS' : 'FAIL'}  ${what}`)
    if (!cond) ok = false
  }
  const acct = await d.rpc.viewAccount(d.contract)
  check(acct !== null, `${d.contract} exists`)
  if (acct) {
    const hex = codeHashHex(acct.code_hash)
    check(hex === v.h, `view_account code_hash = H (chain ${hex})`)
    const keys = (await d.rpc.viewAccessKeyList(d.contract)).keys
    check(keys.length === 0, `no access keys (chain: ${keys.length})`)
  }
  const txs = (await post('/v0/transactions', { tx_hashes: [v.birthTx] })).transactions as ({ transaction: { signer_id: string; receiver_id: string; actions: unknown[] }; execution_outcome: { block_height: number } } | null)[] | undefined
  const t = txs?.[0] ?? null
  check(!!t, `the FastNEAR tx API knows ${v.birthTx}`)
  if (t) {
    const kinds = t.transaction.actions.map((a) => (typeof a === 'string' ? a : Object.keys(a as object)[0]!))
    const want = ['CreateAccount', 'Transfer', 'DeployContract', ...Array<string>(1 + (d.mints ?? BIRTH_DEFAULTS.mints)).fill('FunctionCall')]
    check(t.transaction.signer_id === d.parent, `signer ${t.transaction.signer_id} = ${d.parent}`)
    check(t.transaction.receiver_id === d.contract, `receiver ${t.transaction.receiver_id} = ${d.contract}`)
    check(!kinds.includes('AddKey'), `no AddKey (actions: ${kinds.join(' ')})`)
    check(kinds.join(' ') === want.join(' '), `the birth shape: CreateAccount Transfer DeployContract FunctionCall ×${want.length - 3}`)
    check(t.execution_outcome.block_height === v.block, `block ${t.execution_outcome.block_height} = ${v.block}`)
  }
  const hist = (await post('/v0/account', { account_id: d.contract, desc: false, limit: 1 })).account_txs as { transaction_hash: string; tx_block_height: number }[] | undefined
  const first = hist?.[0]
  check(!!first && first.transaction_hash === v.birthTx && first.tx_block_height === v.block, `the account's history starts at the birth tx, block ${v.block}${first ? ` (oldest: ${first.transaction_hash} at ${first.tx_block_height})` : ''}`)
  const signer = await post('/v0/account', { account_id: d.contract, is_any_signer: true })
  check(Array.isArray(signer.account_txs) && (signer.account_txs as unknown[]).length === 0, `${d.contract} never signed a transaction (is_any_signer)`)
  return { ok, lines }
}

// ------------------------------------------------------------------------------------------------ main

const HELP = `tools/deploy/fill-final.ts: fill H, the birth tx and block A after the final keyless birth.
  --from-evidence     read H, the tx and block A from the birth record that deploy:keyless-birth --send writes
                      (docs/evidence/birth-satchel.<team>.testnet.json, or --evidence <file>); flags override it
  --h <hex64>         SHA-256 of the deployed reproducible wasm (H)
  --birth-tx <hash>   the birth transaction hash (base58)
  --block <height>    the birth transaction's block (block A)
  --verify            first check the values on-chain, read-only (code hash, no keys, birth tx shape, oldest tx)
  --env               also switch apps/web/.env.production to the final contract (E-03; a push to main deploys it)
  --write             apply (default: dry run, prints the changed lines and writes nothing)
  --root <dir>        repository root (default: this checkout)
  --team <name>       default satchelhq (contract satchel.<team>.testnet, parent <team>.testnet)`

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      h: { type: 'string' },
      'birth-tx': { type: 'string' },
      block: { type: 'string' },
      'from-evidence': { type: 'boolean', default: false },
      evidence: { type: 'string' },
      verify: { type: 'boolean', default: false },
      env: { type: 'boolean', default: false },
      write: { type: 'boolean', default: false },
      root: { type: 'string' },
      team: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })
  if (values.help) return void console.log(HELP)
  const root = resolve(values.root ?? REPO_ROOT)
  const fromFile =
    values['from-evidence'] || values.evidence
      ? valuesFromEvidence(values.evidence ? resolve(values.evidence) : join(root, 'docs', 'evidence', `birth-satchel.${values.team ?? 'satchelhq'}.testnet.json`))
      : {}
  const v = validateValues({ h: values.h ?? fromFile.h, birthTx: values['birth-tx'] ?? fromFile.birthTx, block: values.block ?? fromFile.block })
  console.log(`== fill-final · ${values.write ? 'WRITE' : 'DRY RUN'} · root ${root}`)
  console.log(`   H        ${v.h}\n   birth tx ${v.birthTx}\n   block A  ${v.block}`)
  if (values.verify) {
    const team = values.team ?? 'satchelhq'
    // the contract is always the final one here, whatever SATCHEL_CONTRACT says
    const cfg = loadConfig({ team, role: 'final', contract: `satchel.${team}.testnet` })
    const r = await verifyOnChain(v, { rpc: new NearRpc(cfg.nearRpcs, { apiKey: cfg.fastnearApiKey }), txApi: cfg.nearTxApi, contract: cfg.contract, parent: cfg.teamAccount })
    console.log(`\n-- on-chain (read-only) · ${cfg.contract}`)
    for (const l of r.lines) console.log(l)
    if (!r.ok) throw new Error('the chain does not match these values: nothing was written')
  }
  const plans = planFill(root, v, { env: values.env })
  for (const p of plans) {
    const groups = p.edits.map((e) => `${e.group}${e.count > 1 ? `×${e.count}` : ''}`).join(', ')
    console.log(`\n-- ${p.file}  (${groups})`)
    for (const l of lineDiff(p.before, p.after)) console.log(l)
  }
  const residual = residualTbd(root, new Map(plans.map((p) => [p.file, p.after])))
  console.log(`\n-- [TBD] left in judge-facing files after this fill: ${residual.length}`)
  for (const r of residual) console.log(`   ${r}`)
  if (!values.env) console.log('\nnote: apps/web/.env.production is unchanged (add --env for the E-03 production switch)')
  if (values.write) {
    applyFill(root, plans)
    console.log(`\nwrote ${plans.length} files: ${plans.map((p) => relative(root, join(root, p.file))).join(', ')}`)
  } else console.log('\nDRY RUN: nothing was written. Add --write to apply.')
}

if (isMain(import.meta.url)) runMain(main)
