/**
 * C7: message records (`evm_message`, `sol_message`). A message signature can't move the coins a buyer checks
 * (docs/specs/C1-C2-C3-C7.md §3.4), so its item is `message`, which never blocks Buy; the report carries the text so the
 * Buy tab can list it. A record whose payload doesn't match its message is `unknown` (fail closed).
 */
import { keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hexToBytesStrict, toHex } from '../bytes'
import { checkMessage, decodeMessageText, eip191Bytes, solOffchainMessageBytes } from '../policy/msg'
import type { ItemReport, SigRecordView } from './types'
import { baseItem } from './util'

export function isMessageRecord(r: SigRecordView): boolean {
  return 'evm_message' in r.detail || 'sol_message' in r.detail
}

export function checkMessages(records: readonly SigRecordView[]): ItemReport[] {
  return records.map((r) => {
    const kind = 'evm_message' in r.detail ? 'evm_message' : 'sol_message'
    const hex = 'evm_message' in r.detail ? r.detail.evm_message.message : 'sol_message' in r.detail ? r.detail.sol_message.message : ''
    const base = { ...baseItem(r), message_kind: kind, cached: false, sources: 0 } as const
    let m: Uint8Array
    try {
      m = hexToBytesStrict(hex)
    } catch {
      return { ...base, status: 'unknown', reason: 'record_unparseable', evidence: {} }
    }
    const text = decodeMessageText(m)
    if (checkMessage(m) !== null || text === null) return { ...base, status: 'unknown', reason: 'record_unparseable', evidence: {} }
    const want = kind === 'evm_message' ? keccak_256(eip191Bytes(m)) : sha256(solOffchainMessageBytes(m))
    if (toHex(want) !== r.payload.toLowerCase()) return { ...base, status: 'unknown', reason: 'record_inconsistent', evidence: {} }
    const chainOk = (kind === 'evm_message' && r.chain === 'evm') || (kind === 'sol_message' && r.chain === 'sol')
    if (!chainOk) return { ...base, status: 'unknown', reason: 'record_inconsistent', evidence: {} }
    return { ...base, status: 'message', reason: 'message_signature', message_text: text, evidence: { bytes: m.length } }
  })
}
