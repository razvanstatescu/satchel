/**
 * Message signing (C7, docs/specs/C1-C2-C3-C7.md §3.3): the TS mirror of the contract's `parse/msg.rs`.
 * The request carries only the UTF-8 body; the contract builds the signed bytes itself:
 * - `evm_message`: EIP-191 `personal_sign` = "\x19Ethereum Signed Message:\n" ‖ decimal(len) ‖ message (keccak256 signed)
 * - `sol_message`: Solana off-chain message v0 = "\xffsolana offchain" ‖ 0x00 ‖ format ‖ u16le(len) ‖ message (signed as-is)
 */
import { keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, hexToBytesStrict, toHex, utf8 } from '../bytes'
import { type ClassifyResult, type MessageFields, type PolicyError, PolicyRefusal } from './types'

export const MAX_MESSAGE_BYTES = 1024
export const SOL_OFFCHAIN_DOMAIN = Uint8Array.from([0xff, ...utf8('solana offchain')])

const fatalUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/** The UTF-8 text of a body, or null if it isn't valid UTF-8 (WHATWG decoder = Rust `str::from_utf8`). */
export function decodeMessageText(m: Uint8Array): string | null {
  try {
    return fatalUtf8.decode(m)
  } catch {
    return null
  }
}

/** The contract's rule: 1..=1024 bytes of valid UTF-8. */
export function checkMessage(m: Uint8Array): PolicyError | null {
  if (m.length === 0) return 'ERR_MSG_EMPTY'
  if (m.length > MAX_MESSAGE_BYTES) return 'ERR_MSG_TOO_LONG'
  if (decodeMessageText(m) === null) return 'ERR_MSG_ENCODING'
  return null
}

/** EIP-191 version 0x45: the bytes whose keccak256 a `personal_sign` signature signs (viem `toPrefixedMessage`). */
export function eip191Bytes(m: Uint8Array): Uint8Array {
  return concatBytes(utf8(`\x19Ethereum Signed Message:\n${m.length}`), m)
}

/** v0 format that solana-sdk's `OffchainMessage::new` picks: 0 = printable ASCII (0x20..0x7e), else 1 = UTF-8. */
export function solOffchainFormat(m: Uint8Array): 0 | 1 {
  return m.every((b) => b >= 0x20 && b <= 0x7e) ? 0 : 1
}

/** Solana off-chain message v0 bytes (`solana sign-offchain-message`); the Ed25519 signature is over these bytes. */
export function solOffchainMessageBytes(m: Uint8Array): Uint8Array {
  if (m.length > 0xffff) throw new RangeError('message too long')
  return concatBytes(SOL_OFFCHAIN_DOMAIN, Uint8Array.of(0, solOffchainFormat(m), m.length & 0xff, m.length >> 8), m)
}

function body(hex: string): { m: Uint8Array; text: string } {
  const m = hexToBytesStrict(hex)
  const err = checkMessage(m)
  if (err) throw new PolicyRefusal(err)
  return { m, text: decodeMessageText(m)! }
}

function run(hex: string, f: (m: Uint8Array, text: string) => ClassifyResult<MessageFields>): ClassifyResult<MessageFields> {
  try {
    const { m, text } = body(hex)
    return f(m, text)
  } catch (e) {
    if (e instanceof PolicyRefusal) return { ok: false, error: e.code }
    if (e instanceof Error && e.message.startsWith('ERR_HEX')) return { ok: false, error: 'ERR_HEX' }
    throw e
  }
}

/** `SignRequest::EvmMessage` → record payload keccak256(eip191(m)), MPC Ecdsa of the same hash (domain 0). */
export function classifyEvmMessage(messageHex: string): ClassifyResult<MessageFields> {
  return run(messageHex, (m, text) => {
    const signedBytes = eip191Bytes(m)
    const h = keccak_256(signedBytes)
    return { ok: true, recordPayloads: [h], mpcPayloads: [{ Ecdsa: toHex(h) }], fields: { message: m, text, signedBytes } }
  })
}

/** `SignRequest::SolMessage` → record payload sha256(offchain(m)), MPC Eddsa of the off-chain bytes (domain 1). */
export function classifySolMessage(messageHex: string): ClassifyResult<MessageFields> {
  return run(messageHex, (m, text) => {
    const signedBytes = solOffchainMessageBytes(m)
    return { ok: true, recordPayloads: [sha256(signedBytes)], mpcPayloads: [{ Eddsa: toHex(signedBytes) }], fields: { message: m, text, signedBytes } }
  })
}
