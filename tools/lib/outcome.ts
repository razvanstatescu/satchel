/** Reading a NEAR FinalExecutionOutcome: the tx value, failures (ERR_* codes), logs and NEP-297 events. */
import type { ExecutionOutcome } from './near-rpc'

export function decodeB64Json(b64: string): unknown {
  if (b64 === '') return null
  const text = Buffer.from(b64, 'base64').toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** The tx's final SuccessValue (decoded JSON), or undefined if the tx failed / is not final. */
export function txSuccessValue(o: ExecutionOutcome): { ok: true; value: unknown; raw: string } | { ok: false } {
  const s = o.status
  if (s && typeof s === 'object' && 'SuccessValue' in s && typeof s.SuccessValue === 'string') {
    return { ok: true, value: decodeB64Json(s.SuccessValue), raw: s.SuccessValue }
  }
  return { ok: false }
}

function collectStrings(x: unknown, out: string[]): void {
  if (typeof x === 'string') out.push(x)
  else if (Array.isArray(x)) x.forEach((v) => collectStrings(v, out))
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => collectStrings(v, out))
}

/** Every failure text in the tx status and in every receipt (FunctionCallError.ExecutionError strings, etc.). */
export function failureMessages(o: ExecutionOutcome): string[] {
  const out: string[] = []
  const add = (status: unknown) => {
    if (status && typeof status === 'object' && 'Failure' in status) {
      const parts: string[] = []
      collectStrings((status as { Failure: unknown }).Failure, parts)
      const kinds = JSON.stringify((status as { Failure: unknown }).Failure)
      out.push(parts.length ? parts.join(' | ') : kinds)
    }
  }
  add(o.status)
  add(o.transaction_outcome?.outcome.status)
  for (const r of o.receipts_outcome ?? []) add(r.outcome.status)
  return out
}

/** True if any receipt failed with the given contract error code (e.g. "ERR_LISTING_CHANGED"). */
export function hasError(o: ExecutionOutcome, code: string): boolean {
  return failureMessages(o).some((m) => m.includes(code))
}

/** The ERR_* codes present in the outcome's failures, in order, deduplicated. */
export function errorCodes(o: ExecutionOutcome): string[] {
  const set = new Set<string>()
  for (const m of failureMessages(o)) for (const c of m.match(/ERR_[A-Z0-9_]+/g) ?? []) set.add(c)
  return [...set]
}

export const isTxSuccess = (o: ExecutionOutcome): boolean => txSuccessValue(o).ok

export function allLogs(o: ExecutionOutcome): string[] {
  return [...(o.transaction_outcome?.outcome.logs ?? []), ...(o.receipts_outcome ?? []).flatMap((r) => r.outcome.logs)]
}

export interface Nep297 {
  standard: string
  version: string
  event: string
  data: unknown
}

export function events(o: ExecutionOutcome, standard?: string, event?: string): Nep297[] {
  const out: Nep297[] = []
  for (const l of allLogs(o)) {
    if (!l.startsWith('EVENT_JSON:')) continue
    try {
      const e = JSON.parse(l.slice('EVENT_JSON:'.length)) as Nep297
      if ((standard === undefined || e.standard === standard) && (event === undefined || e.event === event)) out.push(e)
    } catch {
      /* not ours */
    }
  }
  return out
}

/**
 * `usdc.ft_transfer_call` → the tx SuccessValue is the USED amount (ft_resolve_transfer). "price" = bought,
 * "0" = refunded. A refunded purchase is still a successful tx, so the value must be read (kb/51 §Gotchas 1).
 */
export function interpretFtTransferCall(o: ExecutionOutcome, price: bigint): 'bought' | 'refunded' | 'partial' | 'failed' {
  const v = txSuccessValue(o)
  if (!v.ok) return 'failed'
  const used = typeof v.value === 'string' && /^\d+$/.test(v.value) ? BigInt(v.value) : null
  if (used === null) return 'failed'
  if (used === price) return 'bought'
  if (used === 0n) return 'refunded'
  return 'partial'
}
