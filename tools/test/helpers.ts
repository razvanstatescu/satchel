/** Test doubles: an in-memory NEAR JSON-RPC (no network) and a throwaway key directory. */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KeyPair } from 'near-api-js'
import { base58 } from '@scure/base'
import type { FetchLike } from '../lib/near-rpc'

export interface RpcCall {
  url: string
  method: string
  params: unknown
  headers: Record<string, string>
}

export type Handler = (method: string, params: any, url: string) => { status?: number; body: unknown } | undefined

/** A fetch that answers JSON-RPC from `handler` and records every call. */
export function mockFetch(handler: Handler): { fetch: FetchLike; calls: RpcCall[] } {
  const calls: RpcCall[] = []
  const fetch: FetchLike = async (url, init) => {
    const req = JSON.parse(init.body) as { method: string; params: unknown }
    calls.push({ url, method: req.method, params: req.params, headers: init.headers })
    const r = handler(req.method, req.params, url) ?? { status: 500, body: 'no handler' }
    const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
    return { status: r.status ?? 200, text: async () => text }
  }
  return { fetch, calls }
}

export const ok = (result: unknown) => ({ body: { jsonrpc: '2.0', id: 1, result } })
export const rpcErr = (name: string, cause: string, status = 200) => ({ status, body: { jsonrpc: '2.0', id: 1, error: { name, cause: { name: cause }, code: -32000, message: 'Server error', data: cause } } })
export const b64 = (x: unknown) => Buffer.from(JSON.stringify(x)).toString('base64')
export const viewResult = (x: unknown) => ok({ result: [...Buffer.from(JSON.stringify(x))], logs: [], block_height: 1, block_hash: 'x' })
export const BLOCK_HASH = base58.encode(new Uint8Array(32).fill(7))

/** A temp ~/.near-credentials with one random key per account (never a real key). */
export function tempCredentials(accounts: string[], layout: 'file' | 'folder' = 'file'): { dir: string; keys: Record<string, KeyPair> } {
  const dir = mkdtempSync(join(tmpdir(), 'satchel-creds-'))
  mkdirSync(join(dir, 'testnet'), { recursive: true })
  const keys: Record<string, KeyPair> = {}
  for (const a of accounts) {
    const kp = KeyPair.fromRandom('ed25519')
    keys[a] = kp
    const body = JSON.stringify({ account_id: a, public_key: kp.getPublicKey().toString(), private_key: kp.toString() })
    if (layout === 'file') writeFileSync(join(dir, 'testnet', `${a}.json`), body)
    else {
      mkdirSync(join(dir, 'testnet', a), { recursive: true })
      writeFileSync(join(dir, 'testnet', a, `${kp.getPublicKey().toString().replace(':', '_')}.json`), body)
    }
  }
  return { dir, keys }
}
