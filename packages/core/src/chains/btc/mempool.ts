/**
 * mempool.space testnet4 (Esplora) client (kb/30 §1; kb/90 §8.3).
 * Browser rules: simple requests only (preflight OPTIONS 404s): plain GETs, and POST bodies as a bare string
 * (fetch then sends text/plain). Never set Content-Type or custom headers.
 * Traps: `testnet4.mempool.space` is MAINNET; `/tx/:id/outspend/:v` and `/tx/:id/status` answer 200 for unknown txids,
 * so this client never exposes them alone.
 */

export const MEMPOOL_TESTNET4 = 'https://mempool.space/testnet4/api'
/** testnet4 mirror: tip, fees, tx, outspends, POST /tx; every /address/* is 404 */
export const EMZY_TESTNET4 = 'https://mempool.emzy.de/testnet4/api'
export const TESTNET4_GENESIS = '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043'

/** Subset of fetch. Esplora calls never pass `headers` (simple requests only); JSON-RPC sources do. */
export type FetchLike = (
  url: string,
  init?: { method?: string; body?: string; signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>

export interface EsploraUtxo {
  txid: string
  vout: number
  value: number
  status: { confirmed: boolean; block_height?: number; block_hash?: string; block_time?: number }
}

export interface EsploraOutspend {
  spent: boolean
  txid?: string
  vin?: number
  status?: { confirmed: boolean; block_height?: number; block_hash?: string; block_time?: number }
}

export interface EsploraFees {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

export interface EsploraAddressStats {
  funded_txo_count: number
  funded_txo_sum: number
  spent_txo_count: number
  spent_txo_sum: number
  tx_count: number
}

export interface EsploraAddress {
  address: string
  chain_stats: EsploraAddressStats
  mempool_stats: EsploraAddressStats
}

export class EsploraHttpError extends Error {
  constructor(public readonly status: number, public readonly url: string, public readonly body: string) {
    super(`esplora ${status} ${url}: ${body.slice(0, 200)}`)
  }
}

export class WrongNetworkError extends Error {}

export interface EsploraClientOptions {
  fetch?: FetchLike
  /** per-request timeout, ms (default 6000) */
  timeoutMs?: number
  name?: string
}

/** One Esplora endpoint. Every method is a simple request. */
export class EsploraClient {
  readonly name: string
  private readonly f: FetchLike
  private readonly timeoutMs: number
  private genesisChecked: Promise<void> | null = null

  constructor(readonly base: string, opts: EsploraClientOptions = {}) {
    if (/\/\/testnet4\.mempool\.space/.test(base)) throw new WrongNetworkError('testnet4.mempool.space is mainnet; use mempool.space/testnet4')
    this.f = opts.fetch ?? ((u, i) => fetch(u, i))
    this.timeoutMs = opts.timeoutMs ?? 6_000
    this.name = opts.name ?? new URL(base).host
  }

  private async req(path: string, init?: { method?: string; body?: string }): Promise<Response> {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : undefined
    const t = ctl ? setTimeout(() => ctl.abort(), this.timeoutMs) : undefined
    try {
      return await this.f(this.base + path, { ...init, ...(ctl ? { signal: ctl.signal } : {}) })
    } finally {
      if (t) clearTimeout(t)
    }
  }

  private async text(path: string): Promise<string> {
    const r = await this.req(path)
    const body = await r.text()
    if (!r.ok) throw new EsploraHttpError(r.status, path, body)
    return body
  }

  private async json<T>(path: string): Promise<T> {
    return JSON.parse(await this.text(path)) as T
  }

  /** null on 404 */
  private async jsonOrNull<T>(path: string): Promise<T | null> {
    const r = await this.req(path)
    const body = await r.text()
    if (r.status === 404) return null
    if (!r.ok) throw new EsploraHttpError(r.status, path, body)
    return JSON.parse(body) as T
  }

  /** Genesis guard (kb/30 §1): GET /block-height/0 must be the testnet4 genesis. Cached after the first success. */
  assertTestnet4(): Promise<void> {
    if (!this.genesisChecked) {
      this.genesisChecked = this.text('/block-height/0').then((h) => {
        if (h.trim() !== TESTNET4_GENESIS) throw new WrongNetworkError(`${this.name} is not testnet4 (genesis ${h.trim().slice(0, 16)}…)`)
      })
      this.genesisChecked.catch(() => {
        this.genesisChecked = null
      })
    }
    return this.genesisChecked
  }

  async tipHeight(): Promise<number> {
    await this.assertTestnet4()
    const n = Number((await this.text('/blocks/tip/height')).trim())
    if (!Number.isInteger(n) || n <= 0) throw new Error(`bad tip height from ${this.name}`)
    return n
  }

  async fees(): Promise<EsploraFees> {
    await this.assertTestnet4()
    return this.json<EsploraFees>('/v1/fees/recommended')
  }

  async address(addr: string): Promise<EsploraAddress> {
    await this.assertTestnet4()
    return this.json<EsploraAddress>(`/address/${addr}`)
  }

  /** Includes unconfirmed UTXOs (status.confirmed false). */
  async utxos(addr: string): Promise<EsploraUtxo[]> {
    await this.assertTestnet4()
    return this.json<EsploraUtxo[]>(`/address/${addr}/utxo`)
  }

  /** null if the tx is unknown (404). */
  async tx(txid: string): Promise<unknown | null> {
    await this.assertTestnet4()
    return this.jsonOrNull(`/tx/${txid}`)
  }

  /** Raw tx hex, null if unknown. */
  async txHex(txid: string): Promise<string | null> {
    await this.assertTestnet4()
    const r = await this.req(`/tx/${txid}/hex`)
    const body = await r.text()
    if (r.status === 404) return null
    if (!r.ok) throw new EsploraHttpError(r.status, `/tx/${txid}/hex`, body)
    return body.trim()
  }

  /**
   * One request per txid (R-20). **null = the tx does not exist (404)**, unlike `/outspend/:v`, which says
   * `{"spent":false}` for unknown txids (the Esplora trap, kb/30 §TL;DR 12).
   */
  async outspends(txid: string): Promise<EsploraOutspend[] | null> {
    await this.assertTestnet4()
    return this.jsonOrNull<EsploraOutspend[]>(`/tx/${txid}/outspends`)
  }

  /** Confirmation status of a tx we know exists; null if unknown (checked via /tx/:id first, never /status alone). */
  async txStatus(txid: string): Promise<{ confirmed: boolean; block_height?: number } | null> {
    const tx = (await this.tx(txid)) as { status?: { confirmed: boolean; block_height?: number } } | null
    return tx ? (tx.status ?? { confirmed: false }) : null
  }

  /** POST /tx, body = raw hex as a bare string (text/plain, no preflight). Returns the txid. */
  async broadcast(rawHex: string): Promise<string> {
    await this.assertTestnet4()
    const r = await this.req('/tx', { method: 'POST', body: rawHex })
    const body = await r.text()
    if (!r.ok) throw new EsploraHttpError(r.status, '/tx', body)
    return body.trim()
  }

  /** POST /txs/test (dry run), body = JSON array as a bare string. */
  async testMempoolAccept(rawHexes: string[]): Promise<{ txid: string; allowed: boolean; 'reject-reason'?: string }[]> {
    await this.assertTestnet4()
    const r = await this.req('/txs/test', { method: 'POST', body: JSON.stringify(rawHexes) })
    const body = await r.text()
    if (!r.ok) throw new EsploraHttpError(r.status, '/txs/test', body)
    return JSON.parse(body)
  }
}

/** Errors that mean "this provider is down / unusable", as opposed to a definite answer. */
export function isProviderFailure(e: unknown): boolean {
  if (e instanceof EsploraHttpError) return e.status >= 500 || e.status === 429 || e.status === 403
  return true // network errors, timeouts, wrong network, bad JSON
}

/**
 * Primary + fallback (spec §8.3): mempool.space, then emzy. Address/UTXO calls use the primary only (emzy has no
 * /address/*). Broadcast tries the primary, then the fallback on a provider failure (not on a 400 rejection).
 */
export class MempoolClient {
  readonly primary: EsploraClient
  readonly fallbacks: EsploraClient[]

  constructor(opts: { primary?: string; fallbacks?: string[]; fetch?: FetchLike; timeoutMs?: number } = {}) {
    const o = { ...(opts.fetch ? { fetch: opts.fetch } : {}), ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}) }
    this.primary = new EsploraClient(opts.primary ?? MEMPOOL_TESTNET4, o)
    this.fallbacks = (opts.fallbacks ?? [EMZY_TESTNET4]).map((b) => new EsploraClient(b, o))
  }

  get all(): EsploraClient[] {
    return [this.primary, ...this.fallbacks]
  }

  private async any<T>(fn: (c: EsploraClient) => Promise<T>): Promise<T> {
    let last: unknown
    for (const c of this.all) {
      try {
        return await fn(c)
      } catch (e) {
        if (!isProviderFailure(e)) throw e
        last = e
      }
    }
    throw last
  }

  tipHeight = () => this.any((c) => c.tipHeight())
  fees = () => this.any((c) => c.fees())
  tx = (txid: string) => this.any((c) => c.tx(txid))
  txHex = (txid: string) => this.any((c) => c.txHex(txid))
  txStatus = (txid: string) => this.any((c) => c.txStatus(txid))
  outspends = (txid: string) => this.any((c) => c.outspends(txid))
  broadcast = (rawHex: string) => this.any((c) => c.broadcast(rawHex))
  address = (addr: string) => this.primary.address(addr)
  utxos = (addr: string) => this.primary.utxos(addr)
}

/** Fee rate for testnet4 sends: max(2, halfHourFee) sat/vB (spec §8.9). */
export function testnet4FeeRate(fees: Pick<EsploraFees, 'halfHourFee'>): number {
  return Math.max(2, Math.ceil(fees.halfHourFee))
}

export const btcTxUrl = (txid: string) => `https://mempool.space/testnet4/tx/${txid}`
export const btcAddressUrl = (addr: string) => `https://mempool.space/testnet4/address/${addr}`
