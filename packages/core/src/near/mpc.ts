/**
 * MPC response decoding (spec §5.8 "Exact MPC response" and signature byte rules; kb/10 §Response; kb/11 snippet B).
 *
 *   {"scheme":"Secp256k1","big_r":{"affine_point":"02…"},"s":{"scalar":"…"},"recovery_id":1}
 *   {"scheme":"Ed25519","signature":[171,150,…]}           (64 numbers)
 *
 * Rules: r = affine_point minus its 02/03 prefix; s is already low-S (asserted, never "fixed");
 * EVM yParity = recovery_id, never the big_r prefix; BTC = DER(r, s) ‖ sighash byte; SOL = the 64 bytes as-is.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { base64ToBytes, bigIntToBytesBE, bytesToBigIntBE, concatBytes, hexToBytesStrict, toHex } from '../bytes'

export const SECP256K1_N = secp256k1.Point.Fn.ORDER
export const SECP256K1_HALF_N = SECP256K1_N >> 1n

export interface MpcSecp256k1Signature {
  scheme: 'Secp256k1'
  big_r: { affine_point: string }
  s: { scalar: string }
  recovery_id: number
}

export interface MpcEd25519Signature {
  scheme: 'Ed25519'
  signature: number[]
}

export type MpcSignature = MpcSecp256k1Signature | MpcEd25519Signature

export class MpcDecodeError extends Error {}

const HEX66 = /^0[23][0-9a-fA-F]{64}$/
const HEX64 = /^[0-9a-fA-F]{64}$/

/** Validate an untrusted JSON value as an MPC signature response. Throws MpcDecodeError. */
export function parseMpcSignature(x: unknown): MpcSignature {
  if (!x || typeof x !== 'object') throw new MpcDecodeError('not an object')
  const o = x as Record<string, unknown>
  // the MPC uses #[serde(tag = "scheme")]; tolerate a missing tag when the shape is unambiguous (kb/11 snippet B)
  if (o.scheme === 'Ed25519' || (o.scheme === undefined && Array.isArray(o.signature))) {
    const sig = o.signature
    if (!Array.isArray(sig) || sig.length !== 64 || !sig.every((n) => Number.isInteger(n) && n >= 0 && n <= 255))
      throw new MpcDecodeError('Ed25519 signature must be 64 bytes')
    return { scheme: 'Ed25519', signature: sig as number[] }
  }
  if (o.scheme === 'Secp256k1' || (o.scheme === undefined && 'big_r' in o)) {
    const ap = (o.big_r as { affine_point?: unknown } | undefined)?.affine_point
    const sc = (o.s as { scalar?: unknown } | undefined)?.scalar
    const rid = o.recovery_id
    if (typeof ap !== 'string' || !HEX66.test(ap)) throw new MpcDecodeError('big_r.affine_point must be 33-byte compressed hex')
    if (typeof sc !== 'string' || !HEX64.test(sc)) throw new MpcDecodeError('s.scalar must be 32-byte hex')
    if (rid !== 0 && rid !== 1) throw new MpcDecodeError(`recovery_id must be 0 or 1, got ${String(rid)}`)
    return { scheme: 'Secp256k1', big_r: { affine_point: ap.toLowerCase() }, s: { scalar: sc.toLowerCase() }, recovery_id: rid }
  }
  throw new MpcDecodeError(`unknown scheme ${String(o.scheme)}`)
}

/** Base64 `SuccessValue` → JSON (empty → null). */
export function decodeSuccessValue(b64: string): unknown {
  if (b64 === '') return null
  return JSON.parse(new TextDecoder().decode(base64ToBytes(b64)))
}

/**
 * `on_signed` returns `Vec<Option<Value>>`: one entry per MPC request, in input order, null where the request failed.
 * Accepts the base64 SuccessValue or the already-parsed JSON. Entries that are present but not a valid signature
 * (the contract marked them `unparsed`) come back as null too; `invalid` lists their indices.
 */
export function decodeOnSignedResult(value: string | unknown): { signatures: (MpcSignature | null)[]; invalid: number[] } {
  const json = typeof value === 'string' ? decodeSuccessValue(value) : value
  if (!Array.isArray(json)) throw new MpcDecodeError('on_signed result must be a JSON array')
  const invalid: number[] = []
  const signatures = json.map((e, i) => {
    if (e === null) return null
    try {
      return parseMpcSignature(e)
    } catch {
      invalid.push(i)
      return null
    }
  })
  return { signatures, invalid }
}

function asSecp(sig: MpcSignature): MpcSecp256k1Signature {
  if (sig.scheme !== 'Secp256k1') throw new MpcDecodeError('expected a Secp256k1 signature')
  return sig
}

/** r and s as bigints, with the defensive low-S assert (spec §5.8; kb/30 §TL;DR 2). */
export function secpRS(sig: MpcSignature): { r: bigint; s: bigint; recovery: 0 | 1 } {
  const x = asSecp(sig)
  const r = bytesToBigIntBE(hexToBytesStrict(x.big_r.affine_point.slice(2)))
  const s = bytesToBigIntBE(hexToBytesStrict(x.s.scalar))
  if (r === 0n || r >= SECP256K1_N) throw new MpcDecodeError('r out of range')
  if (s === 0n || s >= SECP256K1_N) throw new MpcDecodeError('s out of range')
  if (s > SECP256K1_HALF_N) throw new MpcDecodeError('high-S signature (the MPC always returns low-S)')
  return { r, s, recovery: x.recovery_id as 0 | 1 }
}

const be32 = (v: bigint): Uint8Array => {
  const b = bigIntToBytesBE(v)
  const out = new Uint8Array(32)
  out.set(b, 32 - b.length)
  return out
}

/** viem signature for type-2 txs: yParity = recovery_id. */
export function toEvmSignature(sig: MpcSignature): { r: `0x${string}`; s: `0x${string}`; yParity: 0 | 1 } {
  const { r, s, recovery } = secpRS(sig)
  return { r: `0x${toHex(be32(r))}`, s: `0x${toHex(be32(s))}`, yParity: recovery }
}

/** 64-byte compact r‖s (low-S asserted). */
export function toSecpCompact64(sig: MpcSignature): Uint8Array {
  const { r, s } = secpRS(sig)
  return concatBytes(be32(r), be32(s))
}

function derInt(v: bigint): Uint8Array {
  let b = bigIntToBytesBE(v)
  if (b[0]! & 0x80) b = concatBytes(Uint8Array.of(0), b)
  return concatBytes(Uint8Array.of(0x02, b.length), b)
}

/** Bitcoin witness signature: strict DER(r, s) ‖ sighash type (default SIGHASH_ALL). */
export function toBtcDerSignature(sig: MpcSignature, sighashType = 0x01): Uint8Array {
  const { r, s } = secpRS(sig)
  const body = concatBytes(derInt(r), derInt(s))
  return concatBytes(Uint8Array.of(0x30, body.length), body, Uint8Array.of(sighashType))
}

/** Solana: the 64 bytes are the transaction signature as-is. */
export function toEd25519Signature(sig: MpcSignature): Uint8Array {
  if (sig.scheme !== 'Ed25519') throw new MpcDecodeError('expected an Ed25519 signature')
  return Uint8Array.from(sig.signature)
}

/** Strict verify of an MPC ECDSA signature over a 32-byte payload (noble v2: prehash false, lowS true). */
export function verifySecp256k1(sig: MpcSignature, payload32: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return secp256k1.verify(toSecpCompact64(sig), payload32, publicKey, { prehash: false, lowS: true })
  } catch {
    return false
  }
}

/** Public key (33-byte compressed) recovered from (r, s, recovery_id) over a 32-byte payload. */
export function recoverSecp256k1(sig: MpcSignature, payload32: Uint8Array): Uint8Array {
  const { r, s, recovery } = secpRS(sig)
  return new secp256k1.Signature(r, s, recovery).recoverPublicKey(payload32).toBytes(true)
}

export function verifyEd25519(sig: MpcSignature, message: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return ed25519.verify(toEd25519Signature(sig), message, publicKey)
  } catch {
    return false
  }
}

/** Signature as returned by the `sig_records` view (spec §5.14): secp `{r, s, recovery_id}`, ed `{signature: hex64}`. */
export type RecordSignatureView = { r: string; s: string; recovery_id: number } | { signature: string }

/** Convert a view signature back into the MPC shape so the same helpers apply. r has no prefix in the view. */
export function signatureFromRecordView(v: RecordSignatureView): MpcSignature {
  if ('signature' in v) {
    const b = hexToBytesStrict(v.signature)
    if (b.length !== 64) throw new MpcDecodeError('ed25519 view signature must be 64 bytes')
    return { scheme: 'Ed25519', signature: Array.from(b) }
  }
  if (!HEX64.test(v.r) || !HEX64.test(v.s)) throw new MpcDecodeError('bad r/s in view')
  // the prefix is irrelevant to every consumer (yParity comes from recovery_id); use 02 as a placeholder
  return parseMpcSignature({ scheme: 'Secp256k1', big_r: { affine_point: `02${v.r}` }, s: { scalar: v.s }, recovery_id: v.recovery_id })
}

/**
 * Receipts-scan fallback (spec §8.2 lib/near/outcome.ts): assign each candidate signature to the payload it verifies
 * against. Returns one entry per payload (null if none verified). Candidates are used at most once.
 */
export function matchSignaturesToPayloads(
  candidates: MpcSignature[],
  payloads: Uint8Array[],
  publicKey: Uint8Array,
  verify: (sig: MpcSignature, payload: Uint8Array, pub: Uint8Array) => boolean = verifySecp256k1,
): (MpcSignature | null)[] {
  const used = new Set<number>()
  return payloads.map((p) => {
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue
      if (verify(candidates[i]!, p, publicKey)) {
        used.add(i)
        return candidates[i]!
      }
    }
    return null
  })
}
