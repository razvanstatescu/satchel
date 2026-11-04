/** Shared types of the reference classifier (a TS mirror of the contract's `parse/*.rs`, kb/90 §5.9). */

export type PolicyError =
  | 'ERR_HEX'
  | 'ERR_EVM_TOO_LONG'
  | 'ERR_EVM_TYPE'
  | 'ERR_EVM_RLP'
  | 'ERR_EVM_CHAIN_ID'
  | 'ERR_EVM_INT_WIDTH'
  | 'ERR_EVM_TO'
  | 'ERR_EVM_DATA'
  | 'ERR_EVM_ACCESS_LIST'
  | 'ERR_EVM_NONCE_GAP'
  | 'ERR_EVM_TOKEN'
  | 'ERR_EVM_VALUE'
  | 'ERR_MSG_EMPTY'
  | 'ERR_MSG_TOO_LONG'
  | 'ERR_MSG_ENCODING'
  | 'ERR_BTC_INPUT_COUNT'
  | 'ERR_BTC_PREIMAGE_LEN'
  | 'ERR_BTC_VERSION'
  | 'ERR_BTC_SIGHASH'
  | 'ERR_BTC_SCRIPTCODE'
  | 'ERR_BTC_LOCKTIME'
  | 'ERR_BTC_SEQUENCE'
  | 'ERR_BTC_MIXED_TX'
  | 'ERR_BTC_PREVOUTS_INCOMPLETE'
  | 'ERR_BTC_SEQUENCES_MISMATCH'
  | 'ERR_BTC_OUTPUTS_MISMATCH'
  | 'ERR_BTC_OUTPUTS_MALFORMED'
  | 'ERR_BTC_DUPLICATE_INPUT'
  | 'ERR_SOL_TOO_LONG'
  | 'ERR_SOL_VERSION'
  | 'ERR_SOL_HEADER'
  | 'ERR_SOL_MALFORMED'
  | 'ERR_SOL_INSTRUCTION'
  | 'ERR_SOL_DURABLE_NONCE'

export type MpcPayloadV2 = { Ecdsa: string } | { Eddsa: string }

/** C2: a canonical ERC-20 `transfer(to, amount)`; `token` is the tx's `to` (the chain's USDC). */
export interface Erc20Transfer {
  token: `0x${string}`
  to: `0x${string}`
  amount: bigint
}

export interface EvmFields {
  chainId: bigint
  nonce: bigint
  maxPriorityFeePerGas: bigint
  maxFeePerGas: bigint
  gasLimit: bigint
  /** the tx's `to`: the recipient of a native transfer, or the token contract of a USDC transfer */
  to: `0x${string}`
  value: bigint
  /** calldata: empty, or the 68-byte transfer call */
  data: Uint8Array
  erc20: Erc20Transfer | null
  unsignedTx: Uint8Array
}

/** C7: an `evm_message` / `sol_message` body and the exact bytes the contract builds from it. */
export interface MessageFields {
  message: Uint8Array
  /** the body decoded as UTF-8 (the contract refuses anything else) */
  text: string
  /** EVM: the EIP-191 bytes whose keccak256 is signed; SOL: the off-chain message v0 bytes signed as-is */
  signedBytes: Uint8Array
}

export interface BtcInputFields {
  /** display order (reverse of preimage[68..100]) */
  txid: string
  vout: number
  amountSats: bigint
  sequence: number
}

export interface BtcOutputFields {
  value: bigint
  script: Uint8Array
}

export interface BtcFields {
  inputs: BtcInputFields[]
  pkh: Uint8Array
  hashPrevouts: Uint8Array
  hashSequence: Uint8Array
  hashOutputs: Uint8Array
  outputs: BtcOutputFields[]
  /** id of the transaction these preimages describe (display order); computable because the contract has every field */
  txid: string
}

export interface SolFields {
  recentBlockhash: Uint8Array
  lamports: bigint
  from: Uint8Array
  to: Uint8Array
  numKeys: number
}

export type ClassifyResult<F> =
  | {
      ok: true
      /** record payload per MPC request (EVM keccak256(tx), BTC sha256d(p_i), SOL sha256(message)) */
      recordPayloads: Uint8Array[]
      /** exact MPC payload per request, in order */
      mpcPayloads: MpcPayloadV2[]
      fields: F
    }
  | { ok: false; error: PolicyError }

/**
 * Token state that `sign_for` checks after the stateless classifier (spec §5.9 nonce-gap rule, D-43; per chain, C3).
 * Build it with `signContextFromRecords(records)`.
 * - `evmMaxSignedNonceByChain`: the highest nonce of the token's EVM records per chain id (decimal key), null if none.
 *   When present it decides (a missing key means "no record on that chain").
 * - `evmMaxSignedNonce`: used only when `evmMaxSignedNonceByChain` is absent; it then applies to the request's chain
 *   (the pre-C3 meaning, when every record was on Sepolia).
 */
export interface SignContext {
  evmMaxSignedNonce: bigint | null
  evmMaxSignedNonceByChain?: Readonly<Record<string, bigint | null>>
}

export class PolicyRefusal extends Error {
  constructor(public readonly code: PolicyError, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
  }
}
