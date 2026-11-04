/**
 * Byte helpers shared by every module. Isomorphic: Uint8Array only, no Buffer.
 */

export type Hex = string

const HEX_RE = /^[0-9a-fA-F]*$/

/** Strict hex decode, the same rule as the contract (kb/90 §5.9 Common): optional 0x/0X, even length, [0-9a-fA-F]. */
export function hexToBytesStrict(input: string): Uint8Array {
  const h = input.startsWith('0x') || input.startsWith('0X') ? input.slice(2) : input
  if (h.length % 2 !== 0 || !HEX_RE.test(h)) throw new Error('ERR_HEX: invalid hex string')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(h.slice(2 * i, 2 * i + 2), 16)
  return out
}

/** Lowercase hex, no 0x (the contract's output convention, spec §5.3). */
export function toHex(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += x.toString(16).padStart(2, '0')
  return s
}

/** Lowercase hex with 0x (viem convention). */
export function to0x(b: Uint8Array): `0x${string}` {
  return `0x${toHex(b)}`
}

export function strip0x(h: string): string {
  return h.startsWith('0x') || h.startsWith('0X') ? h.slice(2) : h
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i]! ^ b[i]!
  return d === 0
}

export function reverseBytes(b: Uint8Array): Uint8Array {
  return Uint8Array.from(b).reverse()
}

export function u32le(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new RangeError(`u32 out of range: ${n}`)
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

export function u64le(n: bigint): Uint8Array {
  if (n < 0n || n > 0xffffffffffffffffn) throw new RangeError(`u64 out of range: ${n}`)
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}

export function readU32le(b: Uint8Array, o: number): number {
  if (o + 4 > b.length) throw new RangeError('read past end')
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o, true)
}

export function readU64le(b: Uint8Array, o: number): bigint {
  if (o + 8 > b.length) throw new RangeError('read past end')
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getBigUint64(o, true)
}

/** Big-endian unsigned integer from bytes (empty = 0). */
export function bytesToBigIntBE(b: Uint8Array): bigint {
  let v = 0n
  for (const x of b) v = (v << 8n) | BigInt(x)
  return v
}

/** Minimal big-endian bytes of a non-negative bigint (0 → empty). */
export function bigIntToBytesBE(v: bigint): Uint8Array {
  if (v < 0n) throw new RangeError('negative')
  const out: number[] = []
  while (v > 0n) {
    out.unshift(Number(v & 0xffn))
    v >>= 8n
  }
  return Uint8Array.from(out)
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Base64 decode without Buffer (browser + Node 22 both have atob). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function bytesToBase64(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}
