/**
 * C5 spending allowance (delegated signer): TS mirror of `contracts/satchel/src/allowance.rs` (docs/specs/C5.md).
 * The contract is authoritative. This mirror computes what a request debits, rolls the 24 h window forward from an
 * `allowance(token_id, delegate)` view, and tells the UI (or an agent) before the wallet opens whether `sign_for` by a
 * delegate would pass. `vectors/allowance.json` keeps both sides in exact agreement.
 */
import { bytesToBigIntBE, hexToBytesStrict, strip0x, toHex } from '../bytes'
import { EVM_CHAIN_IDS } from '../near/constants'
import type { SignRequest } from '../near/sign-request'
import { classifyBtc } from './btc'
import { classifyEvm } from './evm'
import { decodeRlpExact, RlpError, type RlpItem } from './rlp'
import { classifySol } from './sol'
import type { BtcFields, PolicyError } from './types'

export const ALLOWANCE_WINDOW_MS = 86_400_000
export const MAX_DELEGATES = 4
export const MAX_CAPS = 8
export const MAX_SPENDS = 32
export const SOL_FEE_LAMPORTS = 5_000n
/** Chain ids a cap may name: the contract's `EVM_CHAIN_IDS` (the same list `config().evm_chain_ids` returns). */
export const ALLOWANCE_EVM_CHAIN_IDS: readonly number[] = EVM_CHAIN_IDS
const ERC20_TRANSFER = 'a9059cbb'
const U128_MAX = 2n ** 128n - 1n

export type AllowanceError =
  | 'ERR_ALLOWANCE_DELEGATE'
  | 'ERR_ALLOWANCE_CAPS'
  | 'ERR_ALLOWANCE_EXPIRY'
  | 'ERR_ALLOWANCE_LIMIT'
  | 'ERR_ALLOWANCE_NOT_FOUND'
  | 'ERR_ALLOWANCE_EXPIRED'
  | 'ERR_ALLOWANCE_KIND'
  | 'ERR_ALLOWANCE_ASSET'
  | 'ERR_ALLOWANCE_EXCEEDED'
  | 'ERR_ALLOWANCE_RATE'

/** JSON form of the contract's `Asset`: `"btc"` | `"sol"` | `{evm:{chain_id}}` | `{erc20:{chain_id, token}}`. */
export type Asset = 'btc' | 'sol' | { evm: { chain_id: number } } | { erc20: { chain_id: number; token: string } }

export interface Debit {
  asset: Asset
  amount: bigint
}

export class AllowanceRefusal extends Error {
  constructor(public readonly code: AllowanceError, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
  }
}

/** Canonical key for comparing assets (ERC-20 tokens compare as 40 lowercase hex). */
export function assetKey(a: Asset): string {
  if (a === 'btc' || a === 'sol') return a
  if ('evm' in a) return `evm:${a.evm.chain_id}`
  return `erc20:${a.erc20.chain_id}:${strip0x(a.erc20.token).toLowerCase()}`
}

export const sameAsset = (a: Asset, b: Asset): boolean => assetKey(a) === assetKey(b)

// ── debits (spec §3) ─────────────────────────────────────────────────────────────────────────────

const kind = () => new AllowanceRefusal('ERR_ALLOWANCE_KIND', 'delegates may only sign plain transfers')
const overflow = () => new AllowanceRefusal('ERR_ALLOWANCE_EXCEEDED', 'amount overflows u128')

function beUint(it: RlpItem | undefined, maxLen: number): bigint {
  if (!it || it.kind !== 'bytes' || it.value.length > maxLen) throw kind()
  return bytesToBigIntBE(it.value)
}

/**
 * EVM type-2 tx bytes → debits (the contract's `evm_debits`). Native: `value + gas_limit × max_fee_per_gas`.
 * ERC-20 `transfer(address,uint256)`: the token amount, then the native debit (gas is paid in ETH). Other calldata →
 * `ERR_ALLOWANCE_KIND`. Throws `AllowanceRefusal`.
 */
export function evmDebits(tx: Uint8Array): Debit[] {
  if (tx.length === 0 || tx[0] !== 0x02) throw kind()
  let root: RlpItem
  try {
    root = decodeRlpExact(tx.subarray(1))
  } catch (e) {
    if (e instanceof RlpError) throw kind()
    throw e
  }
  if (root.kind !== 'list' || root.items.length !== 9) throw kind()
  const f = root.items
  const chainId = Number(beUint(f[0], 8))
  const maxFee = beUint(f[3], 16)
  const gas = beUint(f[4], 8)
  const to = f[5]!
  const value = beUint(f[6], 16)
  const data = f[7]!
  if (to.kind !== 'bytes' || data.kind !== 'bytes') throw kind()
  const native = gas * maxFee + value
  if (native > U128_MAX) throw overflow()
  const evm: Asset = { evm: { chain_id: chainId } }
  if (data.value.length === 0) return [{ asset: evm, amount: native }]
  const d = data.value
  if (d.length === 68 && toHex(d.subarray(0, 4)) === ERC20_TRANSFER && to.value.length === 20) {
    if (d.subarray(36, 52).some((x) => x !== 0)) throw overflow()
    const amount = bytesToBigIntBE(d.subarray(52, 68))
    return [
      { asset: { erc20: { chain_id: chainId, token: toHex(to.value) } }, amount },
      { asset: evm, amount: native },
    ]
  }
  throw kind()
}

/** BTC: Σ outputs not paying `0014‖pkh` + max(0, Σ inputs − Σ outputs) (the contract's `btc_debit`). */
export function btcDebit(fields: Pick<BtcFields, 'inputs' | 'outputs' | 'pkh'>): bigint {
  const own = `0014${toHex(fields.pkh)}`
  const inputs = fields.inputs.reduce((a, i) => a + i.amountSats, 0n)
  const total = fields.outputs.reduce((a, o) => a + o.value, 0n)
  const external = fields.outputs.filter((o) => toHex(o.script) !== own).reduce((a, o) => a + o.value, 0n)
  return external + (inputs > total ? inputs - total : 0n)
}

export type DebitsResult = { ok: true; debits: Debit[] } | { ok: false; error: PolicyError | AllowanceError }

/**
 * What `sign_for` by a delegate would debit for `req` (spec §3): the stateless classifier first (its refusal wins, as
 * in the contract), then the worst-case amounts.
 */
export function allowanceDebits(req: SignRequest): DebitsResult {
  try {
    if ('evm' in req) {
      const r = classifyEvm(req.evm.unsigned_tx)
      return r.ok ? { ok: true, debits: evmDebits(r.fields.unsignedTx) } : { ok: false, error: r.error }
    }
    if ('btc' in req) {
      const r = classifyBtc(req.btc.preimages, req.btc.outputs)
      return r.ok ? { ok: true, debits: [{ asset: 'btc', amount: btcDebit(r.fields) }] } : { ok: false, error: r.error }
    }
    const r = classifySol(req.sol.message)
    return r.ok ? { ok: true, debits: [{ asset: 'sol', amount: r.fields.lamports + SOL_FEE_LAMPORTS }] } : { ok: false, error: r.error }
  } catch (e) {
    if (e instanceof AllowanceRefusal) return { ok: false, error: e.code }
    throw e
  }
}

// ── window (spec §4) ─────────────────────────────────────────────────────────────────────────────

export interface SpendState {
  at_ms: number
  amount: bigint
}

export interface CapState {
  asset: Asset
  limit: bigint
  spends: SpendState[]
}

/** A debit stamped `atMs` counts at `nowMs` iff `nowMs < atMs + window`. */
export const inWindow = (atMs: number, nowMs: number): boolean => nowMs < atMs + ALLOWANCE_WINDOW_MS

export function capSpent(c: CapState, nowMs: number): bigint {
  return c.spends.filter((s) => inWindow(s.at_ms, nowMs)).reduce((a, s) => a + s.amount, 0n)
}

export function capRemaining(c: CapState, nowMs: number): bigint {
  const s = capSpent(c, nowMs)
  return s >= c.limit ? 0n : c.limit - s
}

export type ApplyResult = { ok: true; caps: CapState[] } | { ok: false; error: AllowanceError; detail?: string }

/**
 * The contract's `Allowance::debit`: per debit in request order, ASSET then EXCEEDED; then RATE (≤ MAX_SPENDS debits
 * in the window). All or nothing. Returns the caps after the debits (pruned to the window).
 */
export function applyDebits(caps: readonly CapState[], debits: readonly Debit[], nowMs: number): ApplyResult {
  const next: CapState[] = caps.map((c) => ({ ...c, spends: c.spends.filter((s) => inWindow(s.at_ms, nowMs)) }))
  const pending: [number, bigint][] = []
  for (const d of debits) {
    const i = next.findIndex((c) => sameAsset(c.asset, d.asset))
    if (i < 0) return { ok: false, error: 'ERR_ALLOWANCE_ASSET' }
    const already = pending.filter(([j]) => j === i).reduce((a, [, x]) => a + x, 0n)
    const rem = capRemaining(next[i]!, nowMs)
    const remaining = rem > already ? rem - already : 0n
    if (d.amount > remaining) return { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED', detail: `remaining ${remaining}, request needs ${d.amount}` }
    pending.push([i, d.amount])
  }
  const count = next.reduce((a, c) => a + c.spends.length, 0)
  if (count + pending.length > MAX_SPENDS) return { ok: false, error: 'ERR_ALLOWANCE_RATE' }
  for (const [i, amount] of pending) next[i]!.spends.push({ at_ms: nowMs, amount })
  return { ok: true, caps: next }
}

// ── views (spec §1.2) ────────────────────────────────────────────────────────────────────────────

export type AllowanceStatus = 'active' | 'paused' | 'expired'

/** `allowance(token_id, delegate)` / `allowances_of(token_id)` row, as the contract returns it (JSON). */
export interface AllowanceView {
  token_id: string
  delegate: string
  owner_id: string
  set_at_ms: number
  expires_at_ms: number | null
  status: AllowanceStatus
  now_ms: number
  window_ms: number
  spends_in_window: number
  max_spends: number
  caps: {
    asset: Asset
    limit: string
    spent: string
    remaining: string
    spends: { at_ms: number; amount: string }[]
  }[]
}

export function capsOfView(view: AllowanceView): CapState[] {
  return view.caps.map((c) => ({
    asset: c.asset,
    limit: BigInt(c.limit),
    spends: c.spends.map((s) => ({ at_ms: s.at_ms, amount: BigInt(s.amount) })),
  }))
}

export interface RemainingRow {
  asset: Asset
  limit: bigint
  spent: bigint
  remaining: bigint
  /** when the oldest spend still counting leaves the window (ms), or null if nothing is spent */
  nextReleaseMs: number | null
}

/** Roll the view's window forward to `nowMs` (default: the view's own `now_ms`). */
export function allowanceRemaining(view: AllowanceView, nowMs: number = view.now_ms): RemainingRow[] {
  return capsOfView(view).map((c) => {
    const live = c.spends.filter((s) => inWindow(s.at_ms, nowMs))
    return {
      asset: c.asset,
      limit: c.limit,
      spent: capSpent(c, nowMs),
      remaining: capRemaining(c, nowMs),
      nextReleaseMs: live.length ? Math.min(...live.map((s) => s.at_ms)) + ALLOWANCE_WINDOW_MS : null,
    }
  })
}

export const isExpired = (expiresAtMs: number | null, nowMs: number): boolean => expiresAtMs !== null && nowMs >= expiresAtMs

export type DelegatedSignCheck =
  | { ok: true; debits: Debit[]; remainingAfter: RemainingRow[] }
  | { ok: false; error: PolicyError | AllowanceError | 'ERR_FROZEN'; detail?: string }

/**
 * Would `sign_for(req)` by this delegate pass at `nowMs`? Mirrors the contract's order: expiry (step 1), listing
 * (step 2, `ERR_FROZEN`), classifier, then the caps. `listed` defaults to the view's `paused` status. The nonce-gap
 * rule and deposits are checked elsewhere (`classifySignRequest(req, ctx)`, `signForCall`).
 */
export function checkDelegatedSign(view: AllowanceView, req: SignRequest, opts: { nowMs?: number; listed?: boolean } = {}): DelegatedSignCheck {
  const nowMs = opts.nowMs ?? view.now_ms
  if (isExpired(view.expires_at_ms, nowMs)) return { ok: false, error: 'ERR_ALLOWANCE_EXPIRED' }
  if (opts.listed ?? view.status === 'paused') return { ok: false, error: 'ERR_FROZEN' }
  const d = allowanceDebits(req)
  if (!d.ok) return d
  const r = applyDebits(capsOfView(view), d.debits, nowMs)
  if (!r.ok) return r
  const after: AllowanceView = {
    ...view,
    caps: r.caps.map((c) => ({
      asset: c.asset,
      limit: c.limit.toString(),
      spent: '0',
      remaining: '0',
      spends: c.spends.map((s) => ({ at_ms: s.at_ms, amount: s.amount.toString() })),
    })),
  }
  return { ok: true, debits: d.debits, remainingAfter: allowanceRemaining(after, nowMs) }
}

// ── set_allowance input validation (spec §2 step 5) ─────────────────────────────────────────────

export interface CapInput {
  asset: Asset
  limit: bigint
}

/** Normalizes ERC-20 tokens to 40 lowercase hex; returns the error `set_allowance` would raise, if any. */
export function validateCaps(
  caps: readonly CapInput[],
  evmChainIds: readonly number[] = ALLOWANCE_EVM_CHAIN_IDS,
): { ok: true; caps: CapInput[] } | { ok: false; error: 'ERR_ALLOWANCE_CAPS'; detail: string } {
  const bad = (detail: string) => ({ ok: false as const, error: 'ERR_ALLOWANCE_CAPS' as const, detail })
  if (caps.length === 0 || caps.length > MAX_CAPS) return bad('1 to 8 caps')
  const out: CapInput[] = []
  for (const c of caps) {
    if (c.limit <= 0n || c.limit > U128_MAX) return bad("a cap's limit must be > 0")
    let asset: Asset = c.asset
    if (typeof asset === 'object') {
      const chain = 'evm' in asset ? asset.evm.chain_id : asset.erc20.chain_id
      if (!evmChainIds.includes(chain)) return bad('EVM chain id not allowed')
      if ('erc20' in asset) {
        let t: Uint8Array
        try {
          t = hexToBytesStrict(asset.erc20.token)
        } catch {
          return bad('token must be a 20-byte hex address')
        }
        if (t.length !== 20) return bad('token must be a 20-byte hex address')
        asset = { erc20: { chain_id: chain, token: toHex(t) } }
      }
    }
    if (out.some((o) => sameAsset(o.asset, asset))) return bad('an asset appears twice')
    out.push({ asset, limit: c.limit })
  }
  return { ok: true, caps: out }
}
