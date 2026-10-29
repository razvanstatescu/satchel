/** Shared pieces of the testnet e2e scripts (spec §12.4). Pure helpers first, then read-only NEAR views. */
import { deriveSatchelAddresses, tokenPath, type ChainSlug } from '@satchel/core/derive'
import { decodeOnSignedResult, signForCall, signRequestChain, signRequestCount, type MpcSignature, type SignRequest } from '@satchel/core/near'
import { classifySignRequest } from '@satchel/core/policy'
import type { SigRecordView } from '@satchel/core/clean-history'
import { contractForRole, resolveAccount, type ToolConfig } from '../lib/config'
import type { Ctx, Sent } from '../lib/run'
import { txSuccessValue } from '../lib/outcome'
import { functionCall, type TxPlan } from '../lib/tx'
import { formatNear } from '../lib/units'

export interface SatchelView {
  token_id: string
  owner_id: string
  sig_count: number
  last_sign_height: number
  listable_at: number
  listing: { id: number; seller: string; price: string; currency: 'near' | 'usdc'; listed_at: number; sig_count: number } | null
  paths: Record<ChainSlug, string>
}

export const addressesOf = (cfg: ToolConfig, tokenId: string, contract = cfg.contract) => deriveSatchelAddresses(cfg.network, contract, tokenId)

/** Throws (before anything is signed) if the contract would refuse the request: same rules, same vectors. */
export function precheck(request: SignRequest): void {
  const r = classifySignRequest(request)
  if (!r.ok) throw new Error(`the contract would refuse this request: ${r.error} (checked locally with @satchel/core/policy)`)
}

/** The sign_for tx for one request (gas/deposit from the §5.5 formulas in @satchel/core/near). */
export function signForPlan(cfg: ToolConfig, owner: string, tokenId: string, request: SignRequest, title?: string): TxPlan {
  precheck(request)
  const call = signForCall(tokenId, request)
  return {
    title: title ?? `sign_for #${tokenId} (${signRequestChain(request)}, ${signRequestCount(request)} request${signRequestCount(request) > 1 ? 's' : ''})`,
    signerId: owner,
    receiverId: cfg.contract,
    actions: [functionCall(call.methodName, call.args, BigInt(call.gas), BigInt(call.deposit))],
  }
}

/** What the MPC will sign, for the printout (path, domain, payloads). */
export function describeSignRequest(tokenId: string, request: SignRequest): string[] {
  const r = classifySignRequest(request)
  if (!r.ok) return [`    REFUSED locally: ${r.error}`]
  const chain = signRequestChain(request)
  const lines = [`    MPC path  ${tokenPath(tokenId, chain)} (domain ${chain === 'sol' ? 1 : 0})`]
  r.mpcPayloads.forEach((p, i) => lines.push(`    payload ${i}  ${JSON.stringify(p)}`.slice(0, 220)))
  lines.push(`    fields    ${jsonish(r.fields).slice(0, 600)}`)
  return lines
}

/** JSON with bigint → decimal string and bytes → hex (for printouts). */
export const jsonish = (x: unknown): string =>
  JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v))

/** on_signed's array (the tx SuccessValue) → one signature per request; throws if any is missing. */
export function signaturesFrom(sent: Sent, n: number): MpcSignature[] {
  const v = txSuccessValue(sent.outcome)
  if (!v.ok) throw new Error(`sign_for failed: ${sent.errors.join(', ') || 'see the tx'}`)
  const { signatures, invalid } = decodeOnSignedResult(v.value)
  if (signatures.length !== n) throw new Error(`expected ${n} signatures, got ${signatures.length}`)
  const missing = signatures.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0)
  if (missing.length) throw new Error(`MPC returned no signature for request(s) ${missing.join(', ')}${invalid.length ? ` (unparsed: ${invalid.join(', ')})` : ''}`)
  return signatures as MpcSignature[]
}

/** `<set>#<ids>` → contract account; set = dev1|devN|rc|rcN|final|satchel or a full account id. */
export function resolveSet(cfg: ToolConfig, set: string): string {
  if (set === 'final' || set === 'satchel') return contractForRole('final', cfg.team)
  if (set === 'rc') return contractForRole('rc', cfg.team)
  const dev = /^dev(\d+)$/.exec(set)
  if (dev) return contractForRole('dev', cfg.team, Number(dev[1]))
  if (/^rc\d+$/.test(set)) return `${set}.${cfg.team}.testnet`
  return resolveAccount(cfg, set)
}

export interface Target {
  /** where the coins go (an address on the chain) */
  address: string
  /** for display: "final#3" or the raw address */
  label: string
  contract?: string
  tokenId?: string
}

/** Expand "1-3,5" → ["1","2","3","5"]. */
export function expandIds(spec: string): string[] {
  const out: string[] = []
  for (const part of spec.split(/[,+]/).filter(Boolean)) {
    const m = /^(\d+)-(\d+)$/.exec(part)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (b < a || b - a > 100) throw new Error(`bad id range ${part}`)
      for (let i = a; i <= b; i++) out.push(String(i))
    } else if (/^[1-9]\d*$/.test(part)) out.push(part)
    else throw new Error(`bad token id ${part}`)
  }
  return out
}

/**
 * Parse `--targets`: space/semicolon separated items, each `<set>#<ids>` (e.g. `final#1-7`, `rc#1+2`) or a raw
 * address on the chain. Satchel targets resolve to the derived address of that token on that chain.
 */
export function parseTargets(cfg: ToolConfig, spec: string, chain: ChainSlug): Target[] {
  const out: Target[] = []
  for (const item of spec.split(/[;\s]+/).filter(Boolean)) {
    const hashAt = item.indexOf('#')
    if (hashAt > 0) {
      const set = item.slice(0, hashAt)
      const contract = resolveSet(cfg, set)
      for (const id of expandIds(item.slice(hashAt + 1))) {
        const a = addressesOf(cfg, id, contract)
        out.push({ address: a[chain], label: `${set}#${id}`, contract, tokenId: id })
      }
    } else out.push({ address: item, label: item })
  }
  return out
}

// ---------------------------------------------------------------------------------------------------- read-only views

/** null when the contract / token does not exist yet, or when offline. */
export async function readSatchel(ctx: Ctx, tokenId: string, contract = ctx.cfg.contract): Promise<SatchelView | null> {
  if (ctx.offline) return null
  try {
    return await ctx.rpc.view<SatchelView | null>(contract, 'satchel', { token_id: tokenId })
  } catch (e) {
    ctx.log(`    note      satchel(${tokenId}) on ${contract} unavailable: ${(e as Error).message.slice(0, 140)}`)
    return null
  }
}

export async function readAllRecords(ctx: Ctx, tokenId: string, sigCount: number, contract = ctx.cfg.contract): Promise<SigRecordView[]> {
  const out: SigRecordView[] = []
  for (let from = 0; from < sigCount; from += 50) {
    const chunk = await ctx.rpc.view<SigRecordView[]>(contract, 'sig_records', { token_id: tokenId, from_seq: from, limit: 50 })
    if (!Array.isArray(chunk) || chunk.length === 0) break
    out.push(...chunk)
  }
  return out
}

/** The current owner, or the configured default when it cannot be read (dry run before the contract exists). */
export async function ownerOr(ctx: Ctx, tokenId: string, fallback: string): Promise<string> {
  const s = await readSatchel(ctx, tokenId)
  if (s) return s.owner_id
  ctx.log(`    note      owner of #${tokenId} unknown (contract not readable); assuming ${fallback}`)
  return fallback
}

export async function nearBalance(ctx: Ctx, account: string): Promise<bigint | null> {
  if (ctx.offline) return null
  const a = await ctx.rpc.viewAccount(account).catch(() => null)
  return a ? BigInt(a.amount) : null
}

export const showNear = (v: bigint | null) => (v === null ? 'unknown' : formatNear(v))

export async function waitForHeight(ctx: Ctx, height: number, pollMs = 5_000): Promise<number> {
  for (;;) {
    const b = await ctx.rpc.finalBlock()
    if (b.height >= height) return b.height
    ctx.log(`    wait      block ${b.height} → ${height} (${height - b.height} blocks ≈ ${Math.ceil((height - b.height) * 0.56)} s)`)
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

export const HELP_COMMON = `Common flags:
  --send            actually sign and send (default: dry run that prints exactly what would be signed)
  --yes             skip the typed "yes" prompt (standing approval H-20 b only)
  --offline         no network at all (placeholders for nonces, fees, UTXOs)
  --team <name>     default satchelhq (D-38)        --role dev|rc|final (default dev)
  --contract <id>   default dev1.<team>.testnet / rc.<team>.testnet / satchel.<team>.testnet by role
  --alice/--bob/--carol <id>   persona accounts (default <name>.<team>.testnet)
Keys come from ~/.near-credentials/testnet (NEAR_CREDENTIALS_DIR overrides); never from the repo.`
