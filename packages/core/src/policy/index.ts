/**
 * Reference classifier: a TS mirror of the contract's `sign_for` payload policy (spec §5.9).
 * The contract is authoritative. This mirror generates and cross-checks `vectors/*.json` and lets the UI
 * refuse a request before the wallet opens. Check order: docs/handoff/core.md §1.
 */
import type { SignRequest } from '../near/sign-request'
import { classifyBtc } from './btc'
import { checkEvmNonce, classifyEvm } from './evm'
import { classifySol } from './sol'
import type { BtcFields, ClassifyResult, EvmFields, SignContext, SolFields } from './types'

export * from './types'
export { checkEvmNonce, classifyEvm, classifyEvmBytes, EVM_CHAIN_ID, EVM_MAX_TX_BYTES, evmMaxAllowedNonce, maxSignedEvmNonce } from './evm'
export {
  classifyBtc,
  classifyBtcBytes,
  decodeVarint,
  encodeVarint,
  parseOutputs,
  sha256d,
  BTC_MIN_SEQUENCE,
  BTC_PREIMAGE_LEN,
  MAX_BTC_INPUTS,
} from './btc'
export {
  classifySol,
  classifySolBytes,
  decodeCompactU16,
  encodeCompactU16,
  isDurableNonceMessage,
  parseLegacyMessage,
  SOL_MAX_MESSAGE_BYTES,
  SYSTEM_PROGRAM,
  type SolInstruction,
  type SolMessage,
} from './sol'
export { decodeRlpExact, encodeRlp, RLP_MAX_DEPTH, type RlpInput, type RlpItem } from './rlp'

export type AnyClassifyResult =
  | ({ chain: 'evm' } & ClassifyResult<EvmFields>)
  | ({ chain: 'btc' } & ClassifyResult<BtcFields>)
  | ({ chain: 'sol' } & ClassifyResult<SolFields>)

/**
 * Without `ctx`: the stateless classifier only (what the shared fuzz corpus compares with `parse::classify`).
 * With `ctx`: exactly what `sign_for` decides for that token, including the EVM nonce-gap rule (D-43), which runs
 * after every stateless check. The UI must pass `ctx` (from the token's `sig_records`) before opening the wallet.
 */
export function classifySignRequest(req: SignRequest, ctx?: SignContext): AnyClassifyResult {
  if ('evm' in req) {
    const r = classifyEvm(req.evm.unsigned_tx)
    if (r.ok && ctx) {
      const gap = checkEvmNonce(r.fields.nonce, ctx.evmMaxSignedNonce)
      if (gap) return { chain: 'evm', ok: false, error: gap }
    }
    return { chain: 'evm', ...r }
  }
  if ('btc' in req) return { chain: 'btc', ...classifyBtc(req.btc.preimages, req.btc.outputs) }
  return { chain: 'sol', ...classifySol(req.sol.message) }
}
