import { base58 } from '@scure/base'
import { hexToBytesStrict, toHex } from '../bytes'
import type { CachedVerdict, ItemReport, ItemStatus, SigRecordView, VerdictCache } from './types'

/** Run tasks with bounded concurrency, keeping order. */
export async function mapLimit<T, R>(xs: readonly T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(xs.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= xs.length) return
      out[i] = await fn(xs[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, xs.length) }, worker))
  return out
}

/** Settle a promise into ok/error without throwing. */
export async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await p }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** NEAR returns code_hash in base58; the expected hash is SHA-256 hex. Normalise both to lowercase hex (null if bad). */
export function normalizeCodeHash(h: string | null | undefined): string | null {
  if (!h) return null
  const s = h.trim()
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(s)) return s.replace(/^0x/, '').toLowerCase()
  try {
    const b = base58.decode(s)
    return b.length === 32 ? toHex(b) : null
  } catch {
    return null
  }
}

export const hexToBase58 = (hex: string): string => base58.encode(hexToBytesStrict(hex))

export function cacheKey(contractId: string, tokenId: string, r: SigRecordView): string {
  return `satchel:v1:${contractId}:${tokenId}:${r.seq}:${r.payload.toLowerCase()}`
}

export async function cacheGet(cache: VerdictCache | undefined, key: string): Promise<CachedVerdict | undefined> {
  if (!cache) return undefined
  try {
    return await cache.get(key)
  } catch {
    return undefined
  }
}

export async function cacheSet(cache: VerdictCache | undefined, key: string, v: CachedVerdict): Promise<void> {
  if (!cache) return
  try {
    await cache.set(key, v)
  } catch {
    /* a full or blocked localStorage must never break the check */
  }
}

/** In-memory cache (server routes, tests). Browsers wrap localStorage in the web app. */
export function memoryVerdictCache(): VerdictCache & { size(): number } {
  const m = new Map<string, CachedVerdict>()
  return { get: (k) => m.get(k), set: (k, v) => void m.set(k, v), size: () => m.size }
}

export function baseItem(r: SigRecordView): Pick<ItemReport, 'seq' | 'request_id' | 'input_index' | 'chain'> {
  return { seq: r.seq, request_id: r.request_id, input_index: r.input_index, chain: r.chain }
}

/**
 * Combine one chain's per-provider verdicts for an item. ≥ 2 answers must agree, else `unknown`.
 * One answer counts only if the policy allows single-source verdicts (H-25).
 */
export function agree(
  answers: { status: ItemStatus; reason: string; evidence: Record<string, unknown> }[],
  allowSingle: boolean,
): { status: ItemStatus; reason: string; evidence: Record<string, unknown>; sources: number } {
  if (answers.length === 0) return { status: 'unknown', reason: 'providers_down', evidence: {}, sources: 0 }
  if (answers.length === 1 && !allowSingle) return { status: 'unknown', reason: 'one_provider_down', evidence: answers[0]!.evidence, sources: 1 }
  const s = answers[0]!.status
  if (answers.some((a) => a.status !== s))
    return { status: 'unknown', reason: 'providers_disagree', evidence: { answers: answers.map((a) => a.status) }, sources: answers.length }
  return { ...answers[0]!, sources: answers.length }
}
