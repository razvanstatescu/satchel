/** EVM type-2 Sepolia native-transfer classifier (spec §5.9 EVM). */
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToBigIntBE, hexToBytesStrict, toHex } from '../bytes'
import { decodeRlpExact, isCanonicalInt, RlpError, type RlpItem } from './rlp'
import { type ClassifyResult, type EvmFields, type PolicyError, PolicyRefusal } from './types'

export const EVM_CHAIN_ID = 11155111n
export const EVM_MAX_TX_BYTES = 128
const U64_MAX = 0xffffffffffffffffn

function bytesItem(it: RlpItem): Uint8Array {
  if (it.kind !== 'bytes') throw new PolicyRefusal('ERR_EVM_RLP', 'expected a byte string')
  return it.value
}

function intItem(it: RlpItem): Uint8Array {
  const v = bytesItem(it)
  if (!isCanonicalInt(v)) throw new PolicyRefusal('ERR_EVM_RLP', 'integer with a leading zero')
  return v
}

/** Classify already-decoded bytes. Throws PolicyRefusal. */
export function classifyEvmBytes(p: Uint8Array): EvmFields {
  if (p.length > EVM_MAX_TX_BYTES) throw new PolicyRefusal('ERR_EVM_TOO_LONG')
  if (p.length === 0 || p[0] !== 0x02) throw new PolicyRefusal('ERR_EVM_TYPE')
  let root: RlpItem
  try {
    root = decodeRlpExact(p.subarray(1))
  } catch (e) {
    if (e instanceof RlpError) throw new PolicyRefusal('ERR_EVM_RLP', e.message)
    throw e
  }
  if (root.kind !== 'list' || root.items.length !== 9) throw new PolicyRefusal('ERR_EVM_RLP', 'expected a 9-item list')
  const it = root.items
  const chainId = intItem(it[0]!)
  const nonce = intItem(it[1]!)
  const tip = intItem(it[2]!)
  const maxFee = intItem(it[3]!)
  const gas = intItem(it[4]!)
  const to = bytesItem(it[5]!)
  const value = intItem(it[6]!)
  const data = bytesItem(it[7]!)
  const access = it[8]!
  if (access.kind !== 'list') throw new PolicyRefusal('ERR_EVM_RLP', 'access list must be a list')

  if (chainId.length > 8 || bytesToBigIntBE(chainId) !== EVM_CHAIN_ID) throw new PolicyRefusal('ERR_EVM_CHAIN_ID')
  if (nonce.length > 8 || gas.length > 8) throw new PolicyRefusal('ERR_EVM_INT_WIDTH')
  if (bytesToBigIntBE(nonce) === U64_MAX) throw new PolicyRefusal('ERR_EVM_INT_WIDTH', 'EIP-2681')
  if (tip.length > 16 || maxFee.length > 16 || value.length > 16) throw new PolicyRefusal('ERR_EVM_INT_WIDTH')
  if (to.length !== 20) throw new PolicyRefusal('ERR_EVM_TO')
  if (data.length !== 0) throw new PolicyRefusal('ERR_EVM_DATA')
  if (access.items.length !== 0) throw new PolicyRefusal('ERR_EVM_ACCESS_LIST')

  return {
    chainId: bytesToBigIntBE(chainId),
    nonce: bytesToBigIntBE(nonce),
    maxPriorityFeePerGas: bytesToBigIntBE(tip),
    maxFeePerGas: bytesToBigIntBE(maxFee),
    gasLimit: bytesToBigIntBE(gas),
    to: `0x${toHex(to)}`,
    value: bytesToBigIntBE(value),
    unsignedTx: p,
  }
}

/** `SignRequest::Evm { unsigned_tx }` → what the contract records and asks the MPC to sign. */
export function classifyEvm(unsignedTxHex: string): ClassifyResult<EvmFields> {
  try {
    const fields = classifyEvmBytes(hexToBytesStrict(unsignedTxHex))
    const h = keccak_256(fields.unsignedTx)
    return { ok: true, recordPayloads: [h], mpcPayloads: [{ Ecdsa: toHex(h) }], fields }
  } catch (e) {
    if (e instanceof PolicyRefusal) return { ok: false, error: e.code }
    if (e instanceof Error && e.message.startsWith('ERR_HEX')) return { ok: false, error: 'ERR_HEX' }
    throw e
  }
}

/**
 * Nonce-gap rule (spec §5.9, D-43; security review S-04), the contract's `evm::max_allowed_nonce`: only the contract can
 * advance a Satchel's EVM nonce, so a legitimate request never needs more than the highest signed nonce + 1. The first
 * EVM request may use 0 or 1 (a faucet deposit leaves the nonce at 0; 1 keeps demo #4's "current + 1" record possible).
 */
export function evmMaxAllowedNonce(maxSigned: bigint | null): bigint {
  return maxSigned === null ? 1n : maxSigned + 1n
}

/** `'ERR_EVM_NONCE_GAP'` if `sign_for` would refuse this nonce for a token whose highest signed nonce is `maxSigned`. */
export function checkEvmNonce(nonce: bigint, maxSigned: bigint | null): PolicyError | null {
  return nonce > evmMaxAllowedNonce(maxSigned) ? 'ERR_EVM_NONCE_GAP' : null
}

/** Highest EVM nonce among `sig_records` rows (any status: every record counts as issued), or null if none. */
export function maxSignedEvmNonce(records: readonly { detail: unknown }[]): bigint | null {
  let max: bigint | null = null
  for (const r of records) {
    const d = r.detail as { evm?: { nonce: number | string | bigint } }
    if (d && typeof d === 'object' && d.evm) {
      const n = BigInt(d.evm.nonce)
      if (max === null || n > max) max = n
    }
  }
  return max
}
