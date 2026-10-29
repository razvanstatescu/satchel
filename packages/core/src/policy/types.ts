/** Shared types of the reference classifier (a TS mirror of the contract's `parse/*.rs`, spec §5.9). */

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

export interface EvmFields {
  chainId: bigint
  nonce: bigint
  maxPriorityFeePerGas: bigint
  maxFeePerGas: bigint
  gasLimit: bigint
  to: `0x${string}`
  value: bigint
  unsignedTx: Uint8Array
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
 * Token state that `sign_for` checks after the stateless classifier (spec §5.9 nonce-gap rule, D-43).
 * `evmMaxSignedNonce`: the highest nonce of the token's EVM records (`maxSignedEvmNonce(records)`), null if none.
 */
export interface SignContext {
  evmMaxSignedNonce: bigint | null
}

export class PolicyRefusal extends Error {
  constructor(public readonly code: PolicyError, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
  }
}
