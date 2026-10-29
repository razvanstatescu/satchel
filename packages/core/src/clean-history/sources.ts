/**
 * Default fetchers for the checker (injectable; tests pass fixtures instead). Plain fetch + JSON-RPC, so the
 * checker bundle does not pull viem, bitcoinjs or web3.js.
 */
import { base64ToBytes } from '../bytes'
import { EsploraClient, type FetchLike } from '../chains/btc/mempool'
import type { BtcSource, EvmSource, NearSnapshotResult, SigRecordView, SolSource } from './types'
import { tokenPath } from '../derive'

async function jsonRpc<T>(f: FetchLike, url: string, method: string, params: unknown[], timeoutMs: number): Promise<T> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await f(url, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctl.signal,
      headers: { 'content-type': 'application/json' },
    })
    if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`)
    const j = (await r.json()) as { result?: T; error?: { message?: string } }
    if (j.error) throw new Error(`${method}: ${j.error.message ?? 'rpc error'}`)
    if (!('result' in j)) throw new Error(`${method}: no result`)
    return j.result as T
  } finally {
    clearTimeout(t)
  }
}

const hostOf = (u: string) => {
  try {
    return new URL(u).host
  } catch {
    return u
  }
}

/** Ethereum JSON-RPC source (Sepolia RPCs answer CORS preflights, kb/70 F23). */
export function jsonRpcEvmSource(url: string, opts: { fetch?: FetchLike; timeoutMs?: number; name?: string } = {}): EvmSource {
  const f: FetchLike = opts.fetch ?? ((u, i) => fetch(u, i))
  const to = opts.timeoutMs ?? 4_000
  const hex = (b: bigint) => `0x${b.toString(16)}`
  return {
    name: opts.name ?? hostOf(url),
    chainId: async () => Number(BigInt(await jsonRpc<string>(f, url, 'eth_chainId', [], to))),
    blockNumber: async () => BigInt(await jsonRpc<string>(f, url, 'eth_blockNumber', [], to)),
    getTransactionCount: async (a, block) =>
      BigInt(await jsonRpc<string>(f, url, 'eth_getTransactionCount', [a, block === 'latest' ? 'latest' : hex(block)], to)),
    getCode: (a) => jsonRpc<string>(f, url, 'eth_getCode', [a, 'latest'], to),
  }
}

/** Esplora source (mempool.space testnet4 / emzy); the client is genesis-guarded and never uses `/outspend/:v`. */
export function esploraBtcSource(base: string, opts: { fetch?: FetchLike; timeoutMs?: number } = {}): BtcSource {
  return new EsploraClient(base, opts)
}

/** Solana JSON-RPC source (devnet RPC echoes the origin for CORS). */
export function solRpcSource(url: string, opts: { fetch?: FetchLike; timeoutMs?: number; name?: string } = {}): SolSource {
  const f: FetchLike = opts.fetch ?? ((u, i) => fetch(u, i))
  const to = opts.timeoutMs ?? 4_000
  return {
    name: opts.name ?? hostOf(url),
    isBlockhashValid: async (h) => (await jsonRpc<{ value: boolean }>(f, url, 'isBlockhashValid', [h, { commitment: 'processed' }], to)).value,
    getAccountInfo: async (a) => {
      const r = await jsonRpc<{ value: null | { owner: string; data: [string, string] } }>(f, url, 'getAccountInfo', [a, { encoding: 'base64', commitment: 'confirmed' }], to)
      if (!r.value) return null
      return { owner: r.value.owner, dataLength: base64ToBytes(r.value.data[0]).length }
    },
  }
}

/** The NEAR calls one snapshot needs; the web app implements them over its FailoverRpcProvider (finality "final"). */
export interface NearViews {
  viewFunction(contractId: string, method: string, args: Record<string, unknown>): Promise<unknown>
  /** null if the account does not exist (UNKNOWN_ACCOUNT); throws on transport errors; else its base58 code_hash */
  viewAccount(accountId: string): Promise<{ code_hash: string } | null>
  viewAccessKeyList(accountId: string): Promise<{ keys: unknown[] }>
}

/**
 * Read one NEAR source's snapshot: satchel(id).sig_count, every sig_record (pages of 50), the contract's
 * existence/keys/code hash and (optionally) the MPC derived keys. Errors become `{source, error}`.
 */
export async function collectNearSnapshot(
  source: string,
  views: NearViews,
  contractId: string,
  tokenId: string,
  opts: { mpcContract?: string; pageSize?: number } = {},
): Promise<NearSnapshotResult> {
  try {
    const sat = (await views.viewFunction(contractId, 'satchel', { token_id: tokenId })) as { sig_count: number } | null
    if (!sat) return { source, error: 'token_not_found' }
    const sigCount = Number(sat.sig_count)
    const page = opts.pageSize ?? 50
    const records: SigRecordView[] = []
    for (let from = 0; from < sigCount; from += page) {
      const chunk = (await views.viewFunction(contractId, 'sig_records', { token_id: tokenId, from_seq: from, limit: page })) as SigRecordView[]
      if (!Array.isArray(chunk) || chunk.length === 0) break
      records.push(...chunk)
    }
    const acct = await views.viewAccount(contractId)
    const exists = acct !== null
    const codeHash = acct?.code_hash ?? null
    const keys = exists ? (await views.viewAccessKeyList(contractId)).keys.length : 0
    let mpcKeys: { btc?: string; evm?: string; sol?: string } | undefined
    if (opts.mpcContract) {
      const k = async (chain: 'btc' | 'evm' | 'sol') =>
        String(await views.viewFunction(opts.mpcContract!, 'derived_public_key', { path: tokenPath(tokenId, chain), predecessor: contractId, domain_id: chain === 'sol' ? 1 : 0 }))
      const [btc, evm, sol] = await Promise.all([k('btc'), k('evm'), k('sol')])
      mpcKeys = { btc, evm, sol }
    }
    return { source, sigCount, records, contract: { exists, accessKeyCount: keys, codeHash }, ...(mpcKeys ? { mpcKeys } : {}) }
  } catch (e) {
    return { source, error: e instanceof Error ? e.message : String(e) }
  }
}
