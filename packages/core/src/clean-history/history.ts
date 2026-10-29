/**
 * C1: recompute the contract's `history_digest(token_id)` from `sig_records` rows (docs/specs/C1-C2-C3-C7.md §5.1).
 * Equal digests mean equal histories, so a client can check that the history it verified is the one a marketplace
 * order (or the contract) is bound to.
 *
 *   digest = SHA-256( H ‖ E(r_0) ‖ … ‖ E(r_{n−1}) ), all borsh:
 *   H    = str("satchel.history.v1") ‖ str(contract) ‖ str(token_id) ‖ u64(n)
 *   E(r) = u64(seq) ‖ u64(request_id) ‖ u8(input_index) ‖ u64(height) ‖ u64(timestamp_ms) ‖ str(requester)
 *          ‖ payload[32] ‖ D(detail)
 *   D    = 0 ‖ u64(chain_id) ‖ u64(nonce) ‖ bytes(unsigned_tx) | 1 ‖ txid[32] ‖ u32(vout) ‖ u64(amount_sats)
 *        | 2 ‖ blockhash[32] ‖ u64(lamports) | 3 ‖ bytes(message) | 4 ‖ bytes(message)
 *
 * `status` and `signature` are never part of it (on_signed rewrites them).
 */
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, hexToBytesStrict, toHex, u32le, u64le, utf8 } from '../bytes'
import type { SigRecordView } from './types'

export const HISTORY_DOMAIN = 'satchel.history.v1'

const str = (s: string): Uint8Array => {
  const b = utf8(s)
  return concatBytes(u32le(b.length), b)
}
const bytes = (hex: string): Uint8Array => {
  const b = hexToBytesStrict(hex)
  return concatBytes(u32le(b.length), b)
}
const fixed = (hex: string, n: number): Uint8Array => {
  const b = hexToBytesStrict(hex)
  if (b.length !== n) throw new Error(`expected ${n} bytes, got ${b.length}`)
  return b
}
const u64 = (v: number | string | bigint): Uint8Array => u64le(BigInt(v))

/** The header bytes `H`. */
export function historyHeader(contractId: string, tokenId: string, n: number): Uint8Array {
  return concatBytes(str(HISTORY_DOMAIN), str(contractId), str(tokenId), u64(n))
}

/** The entry bytes `E(r)` of one `sig_records` row. */
export function historyEntry(r: SigRecordView): Uint8Array {
  const d = r.detail as Record<string, Record<string, string | number>>
  let detail: Uint8Array
  if ('evm' in d) detail = concatBytes(Uint8Array.of(0), u64(d.evm!.chain_id!), u64(d.evm!.nonce!), bytes(String(d.evm!.unsigned_tx)))
  else if ('btc' in d) detail = concatBytes(Uint8Array.of(1), fixed(String(d.btc!.txid), 32), u32le(Number(d.btc!.vout)), u64(d.btc!.amount_sats!))
  else if ('sol' in d) detail = concatBytes(Uint8Array.of(2), fixed(String(d.sol!.recent_blockhash), 32), u64(d.sol!.lamports!))
  else if ('evm_message' in d) detail = concatBytes(Uint8Array.of(3), bytes(String(d.evm_message!.message)))
  else if ('sol_message' in d) detail = concatBytes(Uint8Array.of(4), bytes(String(d.sol_message!.message)))
  else throw new Error(`unknown record detail ${JSON.stringify(r.detail)}`)
  const ii = Number(r.input_index)
  if (!Number.isInteger(ii) || ii < 0 || ii > 255) throw new Error('input_index out of range')
  return concatBytes(
    u64(r.seq),
    u64(r.request_id),
    Uint8Array.of(ii),
    u64(r.height),
    u64(r.timestamp_ms),
    str(r.requester),
    fixed(r.payload, 32),
    detail,
  )
}

/**
 * The digest of a complete history: `records` must be every row `0..sig_count` (any order; they are sorted by seq and
 * must be contiguous from 0, else this throws, so a partial read can never produce a plausible digest).
 */
export function historyDigest(contractId: string, tokenId: string, records: readonly SigRecordView[]): string {
  const rows = [...records].sort((a, b) => Number(a.seq) - Number(b.seq))
  rows.forEach((r, i) => {
    if (Number(r.seq) !== i) throw new Error(`records are not contiguous from seq 0 (row ${i} has seq ${r.seq})`)
  })
  return toHex(sha256(concatBytes(historyHeader(contractId, tokenId, rows.length), ...rows.map(historyEntry))))
}
