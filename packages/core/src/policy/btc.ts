/** BTC P2WPKH / SIGHASH_ALL classifier (kb/90 §5.9 BTC). One complete transaction per call. */
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, equalBytes, hexToBytesStrict, readU32le, readU64le, reverseBytes, toHex } from '../bytes'
import { type BtcFields, type BtcOutputFields, type ClassifyResult, PolicyRefusal } from './types'

export const BTC_PREIMAGE_LEN = 182
export const MAX_BTC_INPUTS = 10
export const BTC_MAX_OUTPUTS_BYTES = 1024
export const BTC_MAX_OUTPUTS = 16
export const BTC_MAX_SCRIPT = 520
export const BTC_MIN_SEQUENCE = 0xfffffffd

export const sha256d = (b: Uint8Array): Uint8Array => sha256(sha256(b))

/** Bitcoin CompactSize, canonical. */
export function encodeVarint(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n)
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8)
  if (n <= 0xffffffff) return Uint8Array.of(0xfe, n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24)
  throw new RangeError('varint too large')
}

/** Canonical CompactSize decode; returns [value, next]. Throws on truncation or non-minimal form. */
export function decodeVarint(b: Uint8Array, o: number): [number, number] {
  if (o >= b.length) throw new RangeError('truncated varint')
  const p = b[o]!
  if (p < 0xfd) return [p, o + 1]
  if (p === 0xfd) {
    if (o + 3 > b.length) throw new RangeError('truncated varint')
    const v = b[o + 1]! | (b[o + 2]! << 8)
    if (v < 0xfd) throw new RangeError('non-canonical varint')
    return [v, o + 3]
  }
  if (p === 0xfe) {
    const v = readU32le(b, o + 1)
    if (v <= 0xffff) throw new RangeError('non-canonical varint')
    return [v, o + 5]
  }
  const v = readU64le(b, o + 1)
  if (v <= 0xffffffffn) throw new RangeError('non-canonical varint')
  throw new RangeError('varint too large')
}

/** Σ(value u64 LE ‖ varint(len) ‖ script), exactly the bytes behind hashOutputs. */
export function parseOutputs(b: Uint8Array): BtcOutputFields[] {
  if (b.length > BTC_MAX_OUTPUTS_BYTES) throw new PolicyRefusal('ERR_BTC_OUTPUTS_MALFORMED', 'too long')
  const outs: BtcOutputFields[] = []
  let o = 0
  try {
    while (o < b.length) {
      const value = readU64le(b, o)
      const [len, q] = decodeVarint(b, o + 8)
      if (len > BTC_MAX_SCRIPT) throw new PolicyRefusal('ERR_BTC_OUTPUTS_MALFORMED', 'script too long')
      if (q + len > b.length) throw new RangeError('truncated script')
      outs.push({ value, script: b.slice(q, q + len) })
      o = q + len
      if (outs.length > BTC_MAX_OUTPUTS) throw new PolicyRefusal('ERR_BTC_OUTPUTS_MALFORMED', 'too many outputs')
    }
  } catch (e) {
    if (e instanceof PolicyRefusal) throw e
    throw new PolicyRefusal('ERR_BTC_OUTPUTS_MALFORMED', (e as Error).message)
  }
  if (outs.length === 0) throw new PolicyRefusal('ERR_BTC_OUTPUTS_MALFORMED', 'no outputs')
  return outs
}

const SCRIPTCODE_HEAD = Uint8Array.of(0x19, 0x76, 0xa9, 0x14)
const SCRIPTCODE_TAIL = Uint8Array.of(0x88, 0xac)

/** Classify decoded preimages + outputs. Throws PolicyRefusal. Check order: docs/handoff/core.md §1. */
export function classifyBtcBytes(pre: Uint8Array[], outputs: Uint8Array): BtcFields {
  if (pre.length < 1 || pre.length > MAX_BTC_INPUTS) throw new PolicyRefusal('ERR_BTC_INPUT_COUNT')
  for (const p of pre) if (p.length !== BTC_PREIMAGE_LEN) throw new PolicyRefusal('ERR_BTC_PREIMAGE_LEN')
  for (const p of pre) {
    if (readU32le(p, 0) !== 2) throw new PolicyRefusal('ERR_BTC_VERSION')
    if (!equalBytes(p.subarray(104, 108), SCRIPTCODE_HEAD) || !equalBytes(p.subarray(128, 130), SCRIPTCODE_TAIL))
      throw new PolicyRefusal('ERR_BTC_SCRIPTCODE')
    if (readU32le(p, 138) < BTC_MIN_SEQUENCE) throw new PolicyRefusal('ERR_BTC_SEQUENCE')
    if (readU32le(p, 174) !== 0) throw new PolicyRefusal('ERR_BTC_LOCKTIME')
    if (readU32le(p, 178) !== 1) throw new PolicyRefusal('ERR_BTC_SIGHASH')
  }
  const f = pre[0]!
  for (const p of pre.slice(1)) {
    const same =
      equalBytes(p.subarray(4, 36), f.subarray(4, 36)) && // hashPrevouts
      equalBytes(p.subarray(36, 68), f.subarray(36, 68)) && // hashSequence
      equalBytes(p.subarray(108, 128), f.subarray(108, 128)) && // pkh
      equalBytes(p.subarray(142, 174), f.subarray(142, 174)) // hashOutputs
    if (!same) throw new PolicyRefusal('ERR_BTC_MIXED_TX')
  }
  const seen = new Set<string>()
  for (const p of pre) {
    const k = toHex(p.subarray(68, 104))
    if (seen.has(k)) throw new PolicyRefusal('ERR_BTC_DUPLICATE_INPUT')
    seen.add(k)
  }
  const outpoints = concatBytes(...pre.map((p) => p.subarray(68, 104)))
  if (!equalBytes(sha256d(outpoints), f.subarray(4, 36))) throw new PolicyRefusal('ERR_BTC_PREVOUTS_INCOMPLETE')
  const seqs = concatBytes(...pre.map((p) => p.subarray(138, 142)))
  if (!equalBytes(sha256d(seqs), f.subarray(36, 68))) throw new PolicyRefusal('ERR_BTC_SEQUENCES_MISMATCH')
  const outs = parseOutputs(outputs)
  if (!equalBytes(sha256d(outputs), f.subarray(142, 174))) throw new PolicyRefusal('ERR_BTC_OUTPUTS_MISMATCH')

  const raw = concatBytes(
    f.subarray(0, 4),
    encodeVarint(pre.length),
    ...pre.map((p) => concatBytes(p.subarray(68, 104), Uint8Array.of(0), p.subarray(138, 142))),
    encodeVarint(outs.length),
    outputs,
    f.subarray(174, 178),
  )
  return {
    inputs: pre.map((p) => ({
      txid: toHex(reverseBytes(p.subarray(68, 100))),
      vout: readU32le(p, 100),
      amountSats: readU64le(p, 130),
      sequence: readU32le(p, 138),
    })),
    pkh: f.slice(108, 128),
    hashPrevouts: f.slice(4, 36),
    hashSequence: f.slice(36, 68),
    hashOutputs: f.slice(142, 174),
    outputs: outs,
    txid: toHex(reverseBytes(sha256d(raw))),
  }
}

/** `SignRequest::Btc { preimages, outputs }` → records + MPC payloads. */
export function classifyBtc(preimagesHex: string[], outputsHex: string): ClassifyResult<BtcFields> {
  try {
    if (preimagesHex.length < 1 || preimagesHex.length > MAX_BTC_INPUTS) throw new PolicyRefusal('ERR_BTC_INPUT_COUNT')
    const pre = preimagesHex.map(hexToBytesStrict)
    const outputs = hexToBytesStrict(outputsHex)
    const fields = classifyBtcBytes(pre, outputs)
    const hashes = pre.map(sha256d)
    return { ok: true, recordPayloads: hashes, mpcPayloads: hashes.map((h) => ({ Ecdsa: toHex(h) })), fields }
  } catch (e) {
    if (e instanceof PolicyRefusal) return { ok: false, error: e.code }
    if (e instanceof Error && e.message.startsWith('ERR_HEX')) return { ok: false, error: 'ERR_HEX' }
    throw e
  }
}
