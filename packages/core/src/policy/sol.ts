/** Solana legacy single-signer System Transfer classifier (kb/90 §5.9 SOL; check order per R-24, plan/decisions.md). */
import { sha256 } from '@noble/hashes/sha2.js'
import { equalBytes, hexToBytesStrict, readU64le, toHex } from '../bytes'
import { type ClassifyResult, PolicyRefusal, type SolFields } from './types'

export const SOL_MAX_MESSAGE_BYTES = 1232
export const SYSTEM_PROGRAM = new Uint8Array(32)

export interface SolInstruction {
  programIndex: number
  accounts: number[]
  data: Uint8Array
}

export interface SolMessage {
  header: { numRequiredSignatures: number; numReadonlySigned: number; numReadonlyUnsigned: number }
  keys: Uint8Array[]
  recentBlockhash: Uint8Array
  instructions: SolInstruction[]
}

/** Canonical compact-u16 (Solana shortvec). Throws RangeError on non-canonical / overflow / truncation. */
export function decodeCompactU16(b: Uint8Array, o: number): [number, number] {
  let v = 0
  for (let i = 0; i < 3; i++) {
    if (o + i >= b.length) throw new RangeError('truncated compact-u16')
    const x = b[o + i]!
    if (i === 2 && x > 0x03) throw new RangeError('compact-u16 overflow')
    if (i > 0 && x === 0) throw new RangeError('non-canonical compact-u16')
    v |= (x & 0x7f) << (7 * i)
    if ((x & 0x80) === 0) return [v, o + i + 1]
  }
  throw new RangeError('compact-u16 too long')
}

export function encodeCompactU16(n: number): Uint8Array {
  if (n < 0 || n > 0xffff) throw new RangeError('compact-u16 out of range')
  const out: number[] = []
  let v = n
  for (;;) {
    const x = v & 0x7f
    v >>= 7
    if (v === 0) {
      out.push(x)
      return Uint8Array.from(out)
    }
    out.push(x | 0x80)
  }
}

/** Parse a legacy message strictly (rule 3). Throws PolicyRefusal(ERR_SOL_HEADER | ERR_SOL_MALFORMED). */
export function parseLegacyMessage(b: Uint8Array): SolMessage {
  const malformed = (why: string) => new PolicyRefusal('ERR_SOL_MALFORMED', why)
  if (b.length < 3) throw malformed('truncated header')
  const header = { numRequiredSignatures: b[0]!, numReadonlySigned: b[1]!, numReadonlyUnsigned: b[2]! }
  if (header.numRequiredSignatures !== 1 || header.numReadonlySigned !== 0) throw new PolicyRefusal('ERR_SOL_HEADER')
  try {
    let o = 3
    let n: number
    ;[n, o] = decodeCompactU16(b, o)
    if (n < 2 || n > 16) throw malformed('num_keys out of range')
    // agreed with the contract (docs/handoff/contract.md §2): the header must fit the key list
    if (header.numRequiredSignatures + header.numReadonlyUnsigned > n) throw malformed('header exceeds num_keys')
    const keys: Uint8Array[] = []
    for (let i = 0; i < n; i++) {
      if (o + 32 > b.length) throw malformed('truncated key')
      keys.push(b.slice(o, o + 32))
      o += 32
    }
    if (o + 32 > b.length) throw malformed('truncated blockhash')
    const recentBlockhash = b.slice(o, o + 32)
    o += 32
    let nix: number
    ;[nix, o] = decodeCompactU16(b, o)
    const instructions: SolInstruction[] = []
    for (let i = 0; i < nix; i++) {
      if (o >= b.length) throw malformed('truncated instruction')
      const programIndex = b[o]!
      o += 1
      if (programIndex >= n) throw malformed('program index out of range')
      let na: number
      ;[na, o] = decodeCompactU16(b, o)
      if (o + na > b.length) throw malformed('truncated accounts')
      const accounts = Array.from(b.subarray(o, o + na))
      o += na
      if (accounts.some((a) => a >= n)) throw malformed('account index out of range')
      let nd: number
      ;[nd, o] = decodeCompactU16(b, o)
      if (o + nd > b.length) throw malformed('truncated data')
      instructions.push({ programIndex, accounts, data: b.slice(o, o + nd) })
      o += nd
    }
    if (o !== b.length) throw malformed('trailing bytes')
    return { header, keys, recentBlockhash, instructions }
  } catch (e) {
    if (e instanceof PolicyRefusal) throw e
    throw malformed((e as Error).message)
  }
}

const ADVANCE_NONCE = Uint8Array.of(4, 0, 0, 0)
const TRANSFER = Uint8Array.of(2, 0, 0, 0)

export function isDurableNonceMessage(m: SolMessage): boolean {
  return m.instructions.some(
    (ix) => equalBytes(m.keys[ix.programIndex]!, SYSTEM_PROGRAM) && ix.data.length >= 4 && equalBytes(ix.data.subarray(0, 4), ADVANCE_NONCE),
  )
}

export function classifySolBytes(b: Uint8Array): SolFields {
  if (b.length > SOL_MAX_MESSAGE_BYTES) throw new PolicyRefusal('ERR_SOL_TOO_LONG')
  if (b.length === 0) throw new PolicyRefusal('ERR_SOL_MALFORMED', 'empty')
  if (b[0]! & 0x80) throw new PolicyRefusal('ERR_SOL_VERSION')
  const m = parseLegacyMessage(b)
  if (isDurableNonceMessage(m)) throw new PolicyRefusal('ERR_SOL_DURABLE_NONCE')
  if (m.instructions.length !== 1) throw new PolicyRefusal('ERR_SOL_INSTRUCTION', 'exactly one instruction')
  const ix = m.instructions[0]!
  if (!equalBytes(m.keys[ix.programIndex]!, SYSTEM_PROGRAM)) throw new PolicyRefusal('ERR_SOL_INSTRUCTION', 'not System')
  if (ix.data.length !== 12 || !equalBytes(ix.data.subarray(0, 4), TRANSFER)) throw new PolicyRefusal('ERR_SOL_INSTRUCTION', 'not Transfer')
  if (ix.accounts.length !== 2 || ix.accounts[0] !== 0) throw new PolicyRefusal('ERR_SOL_INSTRUCTION', 'accounts')
  return {
    recentBlockhash: m.recentBlockhash,
    lamports: readU64le(ix.data, 4),
    from: m.keys[0]!,
    to: m.keys[ix.accounts[1]!]!,
    numKeys: m.keys.length,
  }
}

/** `SignRequest::Sol { message }` → record (sha256(message)) + MPC Eddsa payload (the message itself). */
export function classifySol(messageHex: string): ClassifyResult<SolFields> {
  try {
    const b = hexToBytesStrict(messageHex)
    const fields = classifySolBytes(b)
    return { ok: true, recordPayloads: [sha256(b)], mpcPayloads: [{ Eddsa: toHex(b) }], fields }
  } catch (e) {
    if (e instanceof PolicyRefusal) return { ok: false, error: e.code }
    if (e instanceof Error && e.message.startsWith('ERR_HEX')) return { ok: false, error: 'ERR_HEX' }
    throw e
  }
}

