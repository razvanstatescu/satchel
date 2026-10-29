/**
 * JSON encoders for the contract's `sign_for` (spec §5.3, §5.6). Pure: the wallet call lives in apps/web.
 *
 *   {"token_id":"1","request":{"evm":{"unsigned_tx":"02ee…80c0"}}}
 *   {"token_id":"1","request":{"btc":{"preimages":["0200…01000000"],"outputs":"409c…"}},"mpc_deposit":"1"}
 *   {"token_id":"1","request":{"sol":{"message":"0100…"}}}
 *   {"token_id":"1","request":{"evm_message":{"message":"68656c6c6f"}}}      (C7: hex of the UTF-8 body)
 *   {"token_id":"1","request":{"sol_message":{"message":"68656c6c6f"}}}
 */
import { strip0x, toHex, utf8 } from '../bytes'
import { tokenPath, type ChainSlug } from '../derive'
import { messageSignAttachDeposit, signAttachDeposit, signAttachGas } from './constants'

export type SignRequest =
  | { evm: { unsigned_tx: string } }
  | { btc: { preimages: string[]; outputs: string } }
  | { sol: { message: string } }
  | { evm_message: { message: string } }
  | { sol_message: { message: string } }

export interface SignForArgs {
  token_id: string
  request: SignRequest
  /** yocto per MPC call, decimal string; omitted = contract default (1 yocto) */
  mpc_deposit?: string
}

const hexOut = (x: Uint8Array | string): string => (typeof x === 'string' ? strip0x(x).toLowerCase() : toHex(x))

export const evmSignRequest = (unsignedTx: Uint8Array | string): SignRequest => ({ evm: { unsigned_tx: hexOut(unsignedTx) } })

export const btcSignRequest = (preimages: (Uint8Array | string)[], outputs: Uint8Array | string): SignRequest => ({
  btc: { preimages: preimages.map(hexOut), outputs: hexOut(outputs) },
})

export const solSignRequest = (message: Uint8Array | string): SignRequest => ({ sol: { message: hexOut(message) } })

/** C7: a text (encoded as UTF-8) or raw body bytes; the contract adds the EIP-191 prefix itself. */
const bodyHex = (m: string | Uint8Array): string => toHex(typeof m === 'string' ? utf8(m) : m)
export const evmMessageSignRequest = (message: string | Uint8Array): SignRequest => ({ evm_message: { message: bodyHex(message) } })
/** C7: the contract wraps the body in a Solana off-chain message v0 header itself. */
export const solMessageSignRequest = (message: string | Uint8Array): SignRequest => ({ sol_message: { message: bodyHex(message) } })

/** The key that signs (and the derivation path's chain slug): messages use the EVM or Solana key. */
export function signRequestChain(req: SignRequest): ChainSlug {
  if ('evm' in req || 'evm_message' in req) return 'evm'
  if ('btc' in req) return 'btc'
  return 'sol'
}

/** Byte length of a message request's body, or null for transactions. */
export function signRequestMessageLength(req: SignRequest): number | null {
  if ('evm_message' in req) return strip0x(req.evm_message.message).length / 2
  if ('sol_message' in req) return strip0x(req.sol_message.message).length / 2
  return null
}

/** Number of MPC requests (= records) the call creates: 1, or the number of BTC preimages. */
export function signRequestCount(req: SignRequest): number {
  return 'btc' in req ? req.btc.preimages.length : 1
}

export function signForArgs(tokenId: string, request: SignRequest, mpcDeposit?: bigint): SignForArgs {
  tokenPath(tokenId, 'evm') // throws on a non-canonical id
  const a: SignForArgs = { token_id: tokenId, request }
  if (mpcDeposit !== undefined) a.mpc_deposit = mpcDeposit.toString()
  return a
}

/** Exact JSON string of the args (key order fixed), as the wallet sends it. */
export function encodeSignForArgs(args: SignForArgs): string {
  return JSON.stringify(args)
}

export interface FunctionCallParams {
  methodName: string
  args: Record<string, unknown>
  /** gas units, decimal string */
  gas: string
  /** yoctoNEAR, decimal string */
  deposit: string
}

/** The deposit to attach for `request`: 0.005 NEAR × n, or for a message 0.005 NEAR + len × 1e19 yocto (C7). */
export function signAttachDepositFor(request: SignRequest, mpcDeposit?: bigint): bigint {
  const len = signRequestMessageLength(request)
  return len === null ? signAttachDeposit(signRequestCount(request), mpcDeposit) : messageSignAttachDeposit(Math.ceil(len), mpcDeposit)
}

/** Complete `FunctionCall` params for near-connect `signAndSendTransaction` (spec §8.5). */
export function signForCall(tokenId: string, request: SignRequest, mpcDeposit?: bigint): FunctionCallParams {
  const n = signRequestCount(request)
  return {
    methodName: 'sign_for',
    args: signForArgs(tokenId, request, mpcDeposit) as unknown as Record<string, unknown>,
    gas: signAttachGas(n).toString(),
    deposit: signAttachDepositFor(request, mpcDeposit).toString(),
  }
}

/** The exact MPC request the contract will send per promise (spec §5.8), for display and for tests. */
export function mpcSignArgs(tokenId: string, chain: ChainSlug, payloadV2: { Ecdsa: string } | { Eddsa: string }) {
  return { request: { path: tokenPath(tokenId, chain), payload_v2: payloadV2, domain_id: chain === 'sol' ? 1 : 0 } }
}
