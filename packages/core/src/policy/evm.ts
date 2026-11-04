/**
 * EVM type-2 classifier (kb/90 §5.9 EVM; docs/specs/C1-C2-C3-C7.md §3.1): a native ETH transfer, or exactly one ERC-20
 * `transfer(to, amount)` to the chain's Circle testnet USDC (C2), on one of four testnets (C3).
 */
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToBigIntBE, hexToBytesStrict, toHex } from '../bytes'
import { decodeRlpExact, isCanonicalInt, RlpError, type RlpItem } from './rlp'
import { type ClassifyResult, type Erc20Transfer, type EvmFields, type PolicyError, PolicyRefusal, type SignContext } from './types'

/** Sepolia (the original chain; kept for existing callers). */
export const EVM_CHAIN_ID = 11155111n
/** Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia: the contract's frozen allowlist (C3). */
export const EVM_SUPPORTED_CHAIN_IDS = [11155111n, 84532n, 421614n, 11155420n] as const
/**
 * Circle testnet USDC per chain id (C2), lowercase. Verified read-only on 2026-10-29: `symbol() == "USDC"`,
 * `decimals() == 6` on two RPCs per chain. Must equal the contract's `ERC20_TOKENS`.
 */
export const EVM_TOKEN_ALLOWLIST: Readonly<Record<string, `0x${string}`>> = {
  '11155111': '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  '84532': '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
  '421614': '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d',
  '11155420': '0x5fd84259d66cd46123540766be93dfe6d43130d7',
}
/** A maximal native transfer is 99 B, a maximal USDC transfer 152 B. */
export const EVM_MAX_TX_BYTES = 160
export const ERC20_TRANSFER_SELECTOR = 'a9059cbb'
const U64_MAX = 0xffffffffffffffffn

/** `a9059cbb ‖ 12 zero ‖ recipient(20) ‖ 16 zero ‖ amount(16)`, exactly 68 bytes (canonical, amount < 2^128), else null. */
export function parseErc20TransferData(data: Uint8Array): { to: `0x${string}`; amount: bigint } | null {
  if (data.length !== 68 || toHex(data.subarray(0, 4)) !== ERC20_TRANSFER_SELECTOR) return null
  if (data.subarray(4, 16).some((b) => b !== 0) || data.subarray(36, 52).some((b) => b !== 0)) return null
  return { to: `0x${toHex(data.subarray(16, 36))}`, amount: bytesToBigIntBE(data.subarray(52, 68)) }
}

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

  const cid = bytesToBigIntBE(chainId)
  if (chainId.length > 8 || !(EVM_SUPPORTED_CHAIN_IDS as readonly bigint[]).includes(cid)) throw new PolicyRefusal('ERR_EVM_CHAIN_ID')
  if (nonce.length > 8 || gas.length > 8) throw new PolicyRefusal('ERR_EVM_INT_WIDTH')
  if (bytesToBigIntBE(nonce) === U64_MAX) throw new PolicyRefusal('ERR_EVM_INT_WIDTH', 'EIP-2681')
  if (tip.length > 16 || maxFee.length > 16 || value.length > 16) throw new PolicyRefusal('ERR_EVM_INT_WIDTH')
  if (to.length !== 20) throw new PolicyRefusal('ERR_EVM_TO')
  let erc20: Erc20Transfer | null = null
  if (data.length !== 0) {
    const t = parseErc20TransferData(data)
    if (!t) throw new PolicyRefusal('ERR_EVM_DATA', 'only one canonical transfer(address,uint256) is allowed')
    if (EVM_TOKEN_ALLOWLIST[cid.toString()] !== `0x${toHex(to)}`) throw new PolicyRefusal('ERR_EVM_TOKEN')
    if (value.length !== 0) throw new PolicyRefusal('ERR_EVM_VALUE')
    erc20 = { token: `0x${toHex(to)}`, to: t.to, amount: t.amount }
  }
  if (access.items.length !== 0) throw new PolicyRefusal('ERR_EVM_ACCESS_LIST')

  return {
    chainId: cid,
    nonce: bytesToBigIntBE(nonce),
    maxPriorityFeePerGas: bytesToBigIntBE(tip),
    maxFeePerGas: bytesToBigIntBE(maxFee),
    gasLimit: bytesToBigIntBE(gas),
    to: `0x${toHex(to)}`,
    value: bytesToBigIntBE(value),
    data,
    erc20,
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

/**
 * Highest EVM nonce among `sig_records` rows **on `chainId`** (default Sepolia; C3: the rule is per chain), any status
 * (every record counts as issued), or null if none. Message records (`evm_message`) never count.
 */
export function maxSignedEvmNonce(records: readonly { detail: unknown }[], chainId: bigint | number = EVM_CHAIN_ID): bigint | null {
  const want = BigInt(chainId)
  let max: bigint | null = null
  for (const r of records) {
    const d = r.detail as { evm?: { nonce: number | string | bigint; chain_id?: number | string | bigint } }
    if (d && typeof d === 'object' && d.evm && BigInt(d.evm.chain_id ?? EVM_CHAIN_ID) === want) {
      const n = BigInt(d.evm.nonce)
      if (max === null || n > max) max = n
    }
  }
  return max
}

/** The token context for `classifySignRequest`, per chain, from the token's `sig_records` (all pages). */
export function signContextFromRecords(records: readonly { detail: unknown }[]): SignContext {
  const byChain: Record<string, bigint | null> = {}
  for (const c of EVM_SUPPORTED_CHAIN_IDS) byChain[c.toString()] = maxSignedEvmNonce(records, c)
  return { evmMaxSignedNonce: byChain[EVM_CHAIN_ID.toString()] ?? null, evmMaxSignedNonceByChain: byChain }
}

/** The highest signed nonce `ctx` gives for `chainId` (byChain wins; else `evmMaxSignedNonce` applies to the request). */
export function contextMaxNonce(ctx: SignContext, chainId: bigint): bigint | null {
  if (ctx.evmMaxSignedNonceByChain) return ctx.evmMaxSignedNonceByChain[chainId.toString()] ?? null
  return ctx.evmMaxSignedNonce
}
