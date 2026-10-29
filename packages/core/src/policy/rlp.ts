/** Minimal strict (canonical) RLP decoder, the same rules the contract applies (spec §5.9 EVM). */

export type RlpItem = { kind: 'bytes'; value: Uint8Array } | { kind: 'list'; items: RlpItem[] }

export class RlpError extends Error {}

function readLength(b: Uint8Array, o: number, lenOfLen: number): number {
  if (o + lenOfLen > b.length) throw new RlpError('truncated length')
  if (b[o] === 0) throw new RlpError('length with leading zero')
  let n = 0
  for (let i = 0; i < lenOfLen; i++) n = n * 256 + b[o + i]!
  if (n < 56) throw new RlpError('long form used for a short payload')
  return n
}

/**
 * Nesting limit, the same as the contract's `rlp.rs` (spec §5.9, fuzzing F-01): the outer item is depth 0, each list
 * level adds 1, and any item deeper than 16 is refused while decoding, so before every policy rule (`ERR_EVM_RLP`).
 */
export const RLP_MAX_DEPTH = 16

/** Decode one item at offset o (at nesting `depth`); returns [item, nextOffset]. */
export function decodeRlpItem(b: Uint8Array, o: number, depth = 0): [RlpItem, number] {
  if (depth > RLP_MAX_DEPTH) throw new RlpError('nested deeper than 16')
  if (o >= b.length) throw new RlpError('truncated')
  const p = b[o]!
  if (p < 0x80) return [{ kind: 'bytes', value: b.slice(o, o + 1) }, o + 1]
  if (p <= 0xb7) {
    const len = p - 0x80
    const end = o + 1 + len
    if (end > b.length) throw new RlpError('truncated string')
    if (len === 1 && b[o + 1]! < 0x80) throw new RlpError('single byte < 0x80 wrapped')
    return [{ kind: 'bytes', value: b.slice(o + 1, end) }, end]
  }
  if (p <= 0xbf) {
    const ll = p - 0xb7
    const len = readLength(b, o + 1, ll)
    const start = o + 1 + ll
    if (start + len > b.length) throw new RlpError('truncated long string')
    return [{ kind: 'bytes', value: b.slice(start, start + len) }, start + len]
  }
  let start: number
  let len: number
  if (p <= 0xf7) {
    len = p - 0xc0
    start = o + 1
  } else {
    const ll = p - 0xf7
    len = readLength(b, o + 1, ll)
    start = o + 1 + ll
  }
  const end = start + len
  if (end > b.length) throw new RlpError('truncated list')
  const items: RlpItem[] = []
  let q = start
  while (q < end) {
    const [it, next] = decodeRlpItem(b, q, depth + 1)
    if (next > end) throw new RlpError('item crosses list end')
    items.push(it)
    q = next
  }
  return [{ kind: 'list', items }, end]
}

/** Exactly one item consuming all bytes. */
export function decodeRlpExact(b: Uint8Array): RlpItem {
  const [it, end] = decodeRlpItem(b, 0)
  if (end !== b.length) throw new RlpError('trailing bytes')
  return it
}

/** Canonical integer: no leading zero byte (zero is the empty string). */
export function isCanonicalInt(v: Uint8Array): boolean {
  return v.length === 0 || v[0] !== 0
}

// ── encoder (used by the vector generator to craft refusal cases) ─────────────────────────────

function encodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) return Uint8Array.of(offset + len)
  const lb: number[] = []
  let n = len
  while (n > 0) {
    lb.unshift(n & 0xff)
    n = Math.floor(n / 256)
  }
  return Uint8Array.of(offset + 55 + lb.length, ...lb)
}

export type RlpInput = Uint8Array | RlpInput[]

export function encodeRlp(x: RlpInput): Uint8Array {
  if (x instanceof Uint8Array) {
    if (x.length === 1 && x[0]! < 0x80) return x
    const h = encodeLength(x.length, 0x80)
    const out = new Uint8Array(h.length + x.length)
    out.set(h)
    out.set(x, h.length)
    return out
  }
  const parts = x.map(encodeRlp)
  const n = parts.reduce((a, p) => a + p.length, 0)
  const h = encodeLength(n, 0xc0)
  const out = new Uint8Array(h.length + n)
  out.set(h)
  let o = h.length
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
