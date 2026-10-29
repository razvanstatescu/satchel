/**
 * Minimal NEAR JSON-RPC client for the release tools: FastNEAR → dRPC failover, views, `send_tx` with
 * `wait_until: INCLUDED`, and a long-poll `tx` tracker (spec §8.3, §12.4; kb/40 §TL;DR 7).
 * Never talks to the deprecated near.org RPC (config.ts refuses it).
 */
import { isForbiddenRpc } from './config'

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  status: number
  text(): Promise<string>
}>

export class RpcError extends Error {
  constructor(
    message: string,
    /** e.g. UNKNOWN_ACCOUNT, TIMEOUT_ERROR, INVALID_TRANSACTION, HTTP_429, NETWORK */
    readonly kind: string,
    readonly retryable: boolean,
    readonly data?: unknown,
  ) {
    super(message)
  }
}

/** Kinds that mean "ask again (maybe another provider)" rather than a definite answer (kb/40 §TL;DR 7). */
const RETRYABLE_KINDS = new Set(['TIMEOUT_ERROR', 'UNKNOWN_TRANSACTION', 'HTTP_408', 'HTTP_429', 'HTTP_5XX', 'NETWORK', 'BAD_JSON', 'DRPC_TIMEOUT', 'NO_SYNCED_BLOCKS', 'INTERNAL_ERROR'])

/** Classify an HTTP status + JSON-RPC body into a result or an RpcError (both nearcore error shapes, dRPC code 30). */
export function classifyRpcResponse(status: number, bodyText: string): { ok: true; result: unknown } | { ok: false; error: RpcError } {
  let body: { result?: unknown; error?: { name?: string; cause?: { name?: string; info?: unknown }; code?: number; message?: string; data?: unknown } } | null = null
  try {
    body = JSON.parse(bodyText)
  } catch {
    if (status === 408) return { ok: false, error: new RpcError('HTTP 408', 'HTTP_408', true) }
    if (status === 429) return { ok: false, error: new RpcError('HTTP 429 (rate limited)', 'HTTP_429', true) }
    if (status >= 500) return { ok: false, error: new RpcError(`HTTP ${status}`, 'HTTP_5XX', true) }
    return { ok: false, error: new RpcError(`non-JSON response (HTTP ${status})`, 'BAD_JSON', true) }
  }
  if (body && body.error) {
    const e = body.error
    const cause = e.cause?.name
    const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data ?? '')
    let kind = cause ?? e.name ?? 'RPC_ERROR'
    if (!cause && /timeout/i.test(dataStr)) kind = 'TIMEOUT_ERROR' // legacy shape {"code":-32000,"data":"Timeout"}
    if (e.code === 30) kind = 'DRPC_TIMEOUT' // dRPC cuts long requests at ≈ 2 s
    if (status === 429 && !cause) kind = 'HTTP_429'
    const retryable = RETRYABLE_KINDS.has(kind) || status === 408 || status === 429 || status >= 500
    return { ok: false, error: new RpcError(`${kind}: ${e.message ?? ''} ${dataStr}`.trim(), kind, retryable, e) }
  }
  if (status === 408) return { ok: false, error: new RpcError('HTTP 408', 'HTTP_408', true) }
  if (status === 429) return { ok: false, error: new RpcError('HTTP 429 (rate limited)', 'HTTP_429', true) }
  if (status >= 500) return { ok: false, error: new RpcError(`HTTP ${status}`, 'HTTP_5XX', true) }
  if (!body || !('result' in body)) return { ok: false, error: new RpcError('JSON-RPC response without result', 'BAD_JSON', true) }
  return { ok: true, result: body.result }
}

export interface NearRpcOptions {
  fetch?: FetchLike
  /** sent as `Authorization: Bearer` to fastnear hosts only */
  apiKey?: string | null
  timeoutMs?: number
  /** attempts per call across all providers (default: 2 rounds) */
  rounds?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as unknown as ReturnType<FetchLike>
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface AccountView {
  amount: string
  locked: string
  code_hash: string
  storage_usage: number
}

export interface AccessKeyView {
  nonce: number | string
  permission: unknown
  block_hash: string
  block_height: number
}

export type TxWait = 'NONE' | 'INCLUDED' | 'EXECUTED_OPTIMISTIC' | 'INCLUDED_FINAL' | 'EXECUTED' | 'FINAL'

export interface ExecutionOutcome {
  final_execution_status?: string
  status?: { SuccessValue?: string; Failure?: unknown } | string
  transaction?: { hash: string; signer_id: string; receiver_id: string }
  transaction_outcome?: { id: string; block_hash: string; outcome: { status: unknown; logs: string[] } }
  receipts_outcome?: { id: string; block_hash: string; outcome: { status: unknown; logs: string[]; executor_id: string } }[]
}

export class NearRpc {
  readonly urls: string[]
  private readonly f: FetchLike
  private readonly apiKey: string | null
  private readonly timeoutMs: number
  private readonly rounds: number
  private readonly sleep: (ms: number) => Promise<void>
  private idx = 0

  constructor(urls: string[], opts: NearRpcOptions = {}) {
    if (urls.length === 0) throw new Error('at least one NEAR RPC is required')
    const bad = urls.find(isForbiddenRpc)
    if (bad) throw new Error(`refusing the deprecated near.org testnet RPC (${bad})`)
    this.urls = urls
    this.f = opts.fetch ?? defaultFetch
    this.apiKey = opts.apiKey ?? null
    this.timeoutMs = opts.timeoutMs ?? 35_000
    this.rounds = opts.rounds ?? 2
    this.sleep = opts.sleep ?? defaultSleep
  }

  get current(): string {
    return this.urls[this.idx % this.urls.length]!
  }

  private headers(url: string): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' }
    if (this.apiKey && /fastnear\.com/.test(url)) h.authorization = `Bearer ${this.apiKey}`
    return h
  }

  /** One JSON-RPC call; transient errors rotate to the next provider, definite errors are thrown at once. */
  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    let last: RpcError | null = null
    const attempts = this.urls.length * this.rounds
    for (let a = 0; a < attempts; a++) {
      const url = this.current
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), this.timeoutMs)
      try {
        const res = await this.f(url, {
          method: 'POST',
          headers: this.headers(url),
          body: JSON.stringify({ jsonrpc: '2.0', id: 'satchel-tools', method, params }),
          signal: ctl.signal,
        })
        const c = classifyRpcResponse(res.status, await res.text())
        if (c.ok) return c.result as T
        if (!c.error.retryable) throw c.error
        last = c.error
      } catch (e) {
        if (e instanceof RpcError && !e.retryable) throw e
        last = e instanceof RpcError ? e : new RpcError(`network error on ${url}: ${(e as Error).message}`, 'NETWORK', true)
      } finally {
        clearTimeout(timer)
      }
      this.idx++
      await this.sleep(Math.min(250 * 2 ** a, 4_000))
    }
    throw last ?? new RpcError('no provider answered', 'NETWORK', true)
  }

  async view<T = unknown>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
    const r = await this.call<{ result?: number[]; error?: string }>('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    })
    // some nodes report view failures inside `result` (legacy shape) instead of as a JSON-RPC error
    if (r.error !== undefined || !Array.isArray(r.result)) throw new RpcError(`view ${contractId}.${method} failed: ${r.error ?? 'no result'}`, 'VIEW_ERROR', false)
    const text = Buffer.from(r.result).toString('utf8')
    return (text === '' ? null : JSON.parse(text)) as T
  }

  /** null when the account does not exist (UNKNOWN_ACCOUNT). */
  async viewAccount(accountId: string): Promise<AccountView | null> {
    try {
      return await this.call<AccountView>('query', { request_type: 'view_account', finality: 'final', account_id: accountId })
    } catch (e) {
      if (e instanceof RpcError && e.kind === 'UNKNOWN_ACCOUNT') return null
      throw e
    }
  }

  async viewAccessKeyList(accountId: string): Promise<{ keys: { public_key: string; access_key: { nonce: number; permission: unknown } }[] }> {
    return this.call('query', { request_type: 'view_access_key_list', finality: 'final', account_id: accountId })
  }

  async viewAccessKey(accountId: string, publicKey: string): Promise<AccessKeyView> {
    const r = await this.call<AccessKeyView & { error?: string }>('query', { request_type: 'view_access_key', finality: 'final', account_id: accountId, public_key: publicKey })
    if (r.error !== undefined || r.nonce === undefined) throw new RpcError(`no access key ${publicKey} on ${accountId}: ${r.error ?? 'missing nonce'}`, 'UNKNOWN_ACCESS_KEY', false)
    return r
  }

  async finalBlock(): Promise<{ hash: string; height: number }> {
    const b = await this.call<{ header: { hash: string; height: number } }>('block', { finality: 'final' })
    return { hash: b.header.hash, height: b.header.height }
  }

  /** The optimistic head: every receipt already executed is at or below it. */
  async optimisticHeight(): Promise<number> {
    const b = await this.call<{ header: { height: number } }>('block', { finality: 'optimistic' })
    return b.header.height
  }

  async gasPrice(): Promise<bigint> {
    const r = await this.call<{ gas_price: string }>('gas_price', [null])
    return BigInt(r.gas_price)
  }

  /**
   * Submit a signed tx and wait only until it is INCLUDED (spec §12.4): never a blocking commit. Re-sending the
   * identical signed tx after a transient error is safe (same hash; a duplicate is rejected, not executed twice).
   */
  async sendTx(signedTxBase64: string, waitUntil: TxWait = 'INCLUDED'): Promise<{ final_execution_status?: string }> {
    return this.call('send_tx', { signed_tx_base64: signedTxBase64, wait_until: waitUntil })
  }
}

export interface TrackOptions {
  waitUntil?: TxWait
  /** total budget; MPC timeouts resolve ≈ 120 s after the request, so the default is 4 min */
  deadlineMs?: number
  now?: () => number
  onPoll?: (attempt: number, note: string) => void
}

/**
 * Long-poll `tx` until the outcome reaches `waitUntil` (default EXECUTED_OPTIMISTIC). FastNEAR holds the request
 * 10–30 s and then answers 408/TIMEOUT with the pending status; dRPC cuts at ≈ 2 s. Both mean "ask again".
 */
export async function trackTx(rpc: NearRpc, txHash: string, senderId: string, opts: TrackOptions = {}): Promise<ExecutionOutcome> {
  const now = opts.now ?? Date.now
  const end = now() + (opts.deadlineMs ?? 240_000)
  const waitUntil = opts.waitUntil ?? 'EXECUTED_OPTIMISTIC'
  let attempt = 0
  for (;;) {
    attempt++
    try {
      const o = await rpc.call<ExecutionOutcome>('tx', { tx_hash: txHash, sender_account_id: senderId, wait_until: waitUntil })
      if (reached(o.final_execution_status, waitUntil)) return o
      opts.onPoll?.(attempt, `status ${o.final_execution_status ?? '?'}`)
    } catch (e) {
      if (!(e instanceof RpcError) || !e.retryable) throw e
      opts.onPoll?.(attempt, e.kind)
    }
    if (now() > end) throw new RpcError(`tx ${txHash} not ${waitUntil} before the deadline`, 'TRACK_DEADLINE', false)
  }
}

const ORDER: TxWait[] = ['NONE', 'INCLUDED', 'EXECUTED_OPTIMISTIC', 'INCLUDED_FINAL', 'EXECUTED', 'FINAL']
/** INCLUDED_FINAL does not imply EXECUTED_OPTIMISTIC; treat EXECUTED/FINAL as reaching anything. */
export function reached(status: string | undefined, target: TxWait): boolean {
  if (!status) return false
  if (status === target) return true
  if (status === 'FINAL') return true
  if (status === 'EXECUTED') return target !== 'FINAL'
  if (target === 'EXECUTED_OPTIMISTIC') return false
  if (target === 'INCLUDED') return ORDER.indexOf(status as TxWait) >= 1
  if (target === 'INCLUDED_FINAL') return status === 'INCLUDED_FINAL'
  return false
}
