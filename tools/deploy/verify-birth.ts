/**
 * Read-only proofs of a keyless birth (tools/deploy/keyless-birth.md §3, kb/90 §5.16 proofs 1–4 and 6) plus the
 * post-birth state the rehearsal relies on: config = init args, NEP-330 build_info = the release rev, the 7 tokens
 * owned by alice, and the USDC and wrap.testnet storage registrations. No key is read and nothing is signed.
 * Every line is PASS / FAIL / INFO; the exit code is 1 when any line FAILs.
 *
 *   pnpm --filter @satchel/tools deploy:verify-birth --child rc.satchelhq.testnet --expected-sha256 <H>
 *     (the birth tx is read from docs/evidence/birth-<child>.json; or pass --tx <hash>)
 *
 * Proof 5 (rebuild = H) is the CI `reproducible` job plus `near contract verify` once the repo is public; this tool
 * prints the command but cannot run it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { base58 } from '@scure/base'
import { DEFAULT_TEAM, MPC_TESTNET, USDC_TESTNET } from '../lib/config'
import { bool, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { BIRTH_DEFAULTS, buildInfoProblem, configProblems, gitRev, RELEASE_TAG, ROOT, WNEAR_TESTNET, type SourceMetadata } from './keyless-birth'

export interface Check {
  pass: boolean | null
  what: string
}
const ok = (pass: boolean, what: string): Check => ({ pass, what })

/** FastNEAR action → its kind: `"CreateAccount"` or `{ "Transfer": {...} }`. */
export const fastnearActionKind = (a: unknown): string => (typeof a === 'string' ? a : a && typeof a === 'object' ? (Object.keys(a)[0] ?? '?') : '?')

const isFailure = (status: unknown): boolean => !!status && typeof status === 'object' && 'Failure' in status

interface FastnearTx {
  transaction: { hash: string; signer_id: string; receiver_id: string; actions: unknown[] }
  execution_outcome?: { block_height?: number; outcome?: { status?: unknown } }
  receipts?: { execution_outcome?: { outcome?: { status?: unknown } } }[]
}

/**
 * Proof 1: `POST /v0/transactions` → one tx from the parent to the child: CreateAccount · Transfer · DeployContract
 * (code sha256 = H) · FunctionCall `new` (args = init args) · FunctionCall `nft_mint` ×7, no AddKey, no failed receipt.
 * Returns the checks and the tx block height (FastNEAR's execution_outcome.block_height).
 */
export function proof1(resp: unknown, o: { txHash: string; parent: string; child: string; sha256: string; initArgs: Record<string, unknown>; mintTo: string; mints: number }): { checks: Check[]; height: number | null } {
  const t = (resp as { transactions?: FastnearTx[] } | null)?.transactions?.[0]
  if (!t) return { checks: [ok(false, `proof 1: FastNEAR has no transaction ${o.txHash}`)], height: null }
  const tx = t.transaction
  const kinds = tx.actions.map(fastnearActionKind)
  const want = ['CreateAccount', 'Transfer', 'DeployContract', ...Array(1 + o.mints).fill('FunctionCall')]
  const fcs = tx.actions.filter((a) => fastnearActionKind(a) === 'FunctionCall').map((a) => (a as { FunctionCall: { method_name: string; args: string } }).FunctionCall)
  const args = (fc: { args: string } | undefined) => {
    try {
      return fc ? (JSON.parse(Buffer.from(fc.args, 'base64').toString('utf8')) as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  const deploy = tx.actions.find((a) => fastnearActionKind(a) === 'DeployContract') as { DeployContract: { code: string } } | undefined
  const codeHex = deploy ? Buffer.from(deploy.DeployContract.code, 'base64').toString('hex') : null
  const failed = [t.execution_outcome?.outcome?.status, ...(t.receipts ?? []).map((r) => r.execution_outcome?.outcome?.status)].filter(isFailure).length
  const mintsOk = fcs.slice(1).every((fc) => fc.method_name === 'nft_mint' && args(fc)?.receiver_id === o.mintTo)
  const height = t.execution_outcome?.block_height ?? null
  return {
    checks: [
      ok(tx.hash === o.txHash && tx.signer_id === o.parent && tx.receiver_id === o.child, `proof 1: tx ${o.txHash} is ${tx.signer_id} → ${tx.receiver_id}`),
      ok(JSON.stringify(kinds) === JSON.stringify(want), `proof 1: actions ${kinds.join(' · ')}`),
      ok(!kinds.some((k) => /Key|DeleteAccount|Stake|Global/.test(k)), 'proof 1: no AddKey (no key, delete or stake action)'),
      ok(codeHex === o.sha256, `proof 1: DeployContract code sha256 ${codeHex ?? '?'} = H`),
      ok(fcs[0]?.method_name === 'new' && JSON.stringify(args(fcs[0])) === JSON.stringify(o.initArgs), `proof 1: new ${JSON.stringify(args(fcs[0]))}`),
      ok(mintsOk && fcs.length === 1 + o.mints, `proof 1: ${fcs.length - 1} × nft_mint to ${o.mintTo}`),
      ok(failed === 0, `proof 1: ${failed} failed receipt(s) of ${(t.receipts ?? []).length}`),
    ],
    height,
  }
}

/** Proof 3: `POST /v0/account {is_any_signer:true}` → `{"account_txs":[],"txs_count":0}`. */
export function proof3(resp: unknown): Check {
  const r = resp as { account_txs?: unknown[]; txs_count?: number } | null
  return ok(!!r && Array.isArray(r.account_txs) && r.account_txs.length === 0 && r.txs_count === 0, `proof 3: the contract never signed a tx (is_any_signer txs_count ${r?.txs_count ?? '?'})`)
}

/** Proof 4: `POST /v0/account {desc:false,limit:1}` → the oldest entry is the birth tx, at block A. */
export function proof4(resp: unknown, txHash: string): { check: Check; blockA: number | null } {
  const first = (resp as { account_txs?: { transaction_hash?: string; tx_block_height?: number }[] } | null)?.account_txs?.[0]
  const pass = first?.transaction_hash === txHash
  return { check: ok(pass, `proof 4: oldest tx ${first?.transaction_hash ?? 'none'} is the birth tx, block A = ${first?.tx_block_height ?? '?'}`), blockA: pass ? (first?.tx_block_height ?? null) : null }
}

/** Proof 6: every token's first signature record is after block A. Tokens with no record yet are INFO. */
export function proof6(firstRecordHeights: Map<string, number | null>, blockA: number | null): Check[] {
  if (blockA === null) return [{ pass: false, what: 'proof 6: block A unknown (proof 4 failed)' }]
  return [...firstRecordHeights].map(([id, h]) =>
    h === null ? { pass: null, what: `proof 6: #${id} has no signature record yet` } : ok(h > blockA, `proof 6: #${id} first record at block ${h} > A ${blockA}`),
  )
}

/** Proof 2 (RPC form; the near CLI form is printed for humans): exists, code = H, 0 access keys. */
export function proof2(acct: { code_hash: string } | null, keys: number | null, sha256: string): Check[] {
  if (!acct) return [ok(false, 'proof 2: account does not exist')]
  const hex = Buffer.from(base58.decode(acct.code_hash)).toString('hex')
  return [ok(hex === sha256, `proof 2: code sha256 ${hex} = H`), ok(keys === 0, `proof 2: access keys ${keys} (Account is locked)`)]
}

const OPTIONS = {
  parent: { type: 'string' },
  child: { type: 'string' },
  tx: { type: 'string' },
  'expected-sha256': { type: 'string' },
  'expected-rev': { type: 'string' },
  mpc: { type: 'string', default: MPC_TESTNET },
  usdc: { type: 'string', default: USDC_TESTNET },
  'no-usdc': { type: 'boolean', default: false },
  'base-uri': { type: 'string', default: 'https://usesatchel.xyz/api/card/' },
  'mint-to': { type: 'string' },
  mints: { type: 'string', default: String(BIRTH_DEFAULTS.mints) },
  'no-registrations': { type: 'boolean', default: false },
} as const

const HELP = `tools/deploy/verify-birth.ts: read-only proofs 1–4 and 6 of a keyless birth, config, NEP-330, registrations.
  --child <acct>            REQUIRED: rc.<team>.testnet or satchel.<team>.testnet
  --expected-sha256 <H>     REQUIRED
  --tx <hash>               the birth tx (default: tx_hash in docs/evidence/birth-<child>.json)
  --expected-rev <commit>   default: git rev of ${RELEASE_TAG}
  --base-uri/--mpc/--usdc/--no-usdc/--mint-to/--mints   the birth's init args (defaults as keyless-birth.ts)
  --no-registrations        report the USDC and wrap.testnet registrations as INFO instead of FAIL`

async function postJson(url: string, body: unknown): Promise<unknown> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return r.json()
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx: Ctx = makeCtx(v)
  const team = str(v, 'team') ?? process.env.SATCHEL_TEAM ?? DEFAULT_TEAM
  const parent = str(v, 'parent') ?? `${team}.testnet`
  const child = str(v, 'child')
  if (!child) throw new Error('--child is required')
  const sha256 = str(v, 'expected-sha256')?.toLowerCase()
  if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('--expected-sha256 <H> (64 hex) is required')
  const evidencePath = join(ROOT, 'docs/evidence', `birth-${child}.json`)
  const txHash = str(v, 'tx') ?? (existsSync(evidencePath) ? (JSON.parse(readFileSync(evidencePath, 'utf8')) as { tx_hash?: string }).tx_hash : undefined)
  if (!txHash) throw new Error(`--tx <birth tx hash> is required (no ${evidencePath})`)
  const rev = str(v, 'expected-rev')?.toLowerCase() ?? gitRev(RELEASE_TAG)
  const mints = Number(str(v, 'mints'))
  const mintTo = str(v, 'mint-to') ?? `alice.${team}.testnet`
  const usdc = bool(v, 'no-usdc') ? null : str(v, 'usdc')!
  const init = { mpc: str(v, 'mpc')!, usdc, base_uri: str(v, 'base-uri')! }
  const api = ctx.cfg.nearTxApi
  const checks: Check[] = []
  const log = (c: Check) => (checks.push(c), ctx.log(`    ${c.pass === null ? 'INFO' : c.pass ? 'PASS' : 'FAIL'}  ${c.what}`))
  ctx.log(`== deploy/verify-birth · ${child} · birth tx ${txHash} · H ${sha256} (read-only)`)

  const p1 = proof1(await postJson(`${api}/v0/transactions`, { tx_hashes: [txHash] }).catch(() => null), { txHash, parent, child, sha256, initArgs: init, mintTo, mints })
  p1.checks.forEach(log)
  const acct = await ctx.rpc.viewAccount(child)
  const keys = acct ? (await ctx.rpc.viewAccessKeyList(child)).keys.length : null
  proof2(acct, keys, sha256).forEach(log)
  log(proof3(await postJson(`${api}/v0/account`, { account_id: child, is_any_signer: true }).catch(() => null)))
  const p4 = proof4(await postJson(`${api}/v0/account`, { account_id: child, desc: false, limit: 1 }).catch(() => null), txHash)
  log(p4.check)
  if (p1.height !== null && p4.blockA !== null && p1.height !== p4.blockA) log(ok(false, `proof 4: block A ${p4.blockA} != the tx's block ${p1.height}`))
  log({ pass: null, what: `proof 5: the CI reproducible job's sha256 = H; after the repo is public: near contract verify deployed-at ${child} network-config testnet-fastnear now` })

  const heights = new Map<string, number | null>()
  const owners: string[] = []
  for (let i = 1; i <= mints; i++) {
    const id = String(i)
    owners.push((await ctx.rpc.view<{ owner_id: string } | null>(child, 'nft_token', { token_id: id }).catch(() => null))?.owner_id ?? 'none')
    const recs = await ctx.rpc.view<{ height: number }[]>(child, 'sig_records', { token_id: id, from_seq: 0, limit: 1 }).catch(() => [])
    heights.set(id, recs[0]?.height ?? null)
  }
  proof6(heights, p4.blockA).forEach(log)
  log({ pass: null, what: `owners of #1–#${mints}: ${owners.join(', ')} (born to ${mintTo}; the rehearsal may have moved some)` })

  const cp = configProblems(await ctx.rpc.view<unknown>(child, 'config').catch(() => null), { mpc: init.mpc, usdc, baseUri: init.base_uri })
  log(ok(cp.length === 0, `config: mpc, usdc, base_uri and cooldown 250 as born${cp.length ? `: ${cp.join('; ')}` : ''}`))
  if (rev) {
    const p = buildInfoProblem(await ctx.rpc.view<SourceMetadata>(child, 'contract_source_metadata').catch(() => null), { rev })
    log(ok(p === null, `contract_source_metadata names rev ${rev}${p ? `: ${p}` : ''}`))
  } else log(ok(false, `cannot resolve ${RELEASE_TAG}: pass --expected-rev`))

  const reg = async (ft: string, name: string) => {
    const b = await ctx.rpc.view<unknown>(ft, 'storage_balance_of', { account_id: child }).catch(() => null)
    const what = `${name} storage_balance_of(${child}) ${b ? JSON.stringify(b) : 'null: run the registration (keyless-birth.md §4)'}`
    log(bool(v, 'no-registrations') ? { pass: null, what } : ok(b !== null, what))
  }
  if (usdc) await reg(usdc, 'USDC')
  await reg(WNEAR_TESTNET, 'wrap.testnet')

  const failed = checks.filter((c) => c.pass === false).length
  ctx.log(`    result    ${failed === 0 ? 'ALL PASS' : `${failed} FAIL`} (${checks.filter((c) => c.pass).length} pass, ${checks.filter((c) => c.pass === null).length} info)`)
  if (failed) process.exitCode = 1
}

if (isMain(import.meta.url)) runMain(main)
