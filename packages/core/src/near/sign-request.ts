/**
 * JSON encoders for the contract's `sign_for` (spec §5.3, §5.6). Pure: the wallet call lives in apps/web.
 *
 *   {"token_id":"1","request":{"evm":{"unsigned_tx":"02ee…80c0"}}}
 *   {"token_id":"1","request":{"btc":{"preimages":["0200…01000000"],"outputs":"409c…"}},"mpc_deposit":"1"}
 *   {"token_id":"1","request":{"sol":{"message":"0100…"}}}
 */
import { strip0x, toHex } from '../bytes'
import { tokenPath, type ChainSlug } from '../derive'
import { signAttachDeposit, signAttachGas } from './constants'

export type SignRequest =
  | { evm: { unsigned_tx: string } }
  | { btc: { preimages: string[]; outputs: string } }
  | { sol: { message: string } }

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

export function signRequestChain(req: SignRequest): ChainSlug {
  if ('evm' in req) return 'evm'
  if ('btc' in req) return 'btc'
  return 'sol'
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

/** Complete `FunctionCall` params for near-connect `signAndSendTransaction` (spec §8.5). */
export function signForCall(tokenId: string, request: SignRequest, mpcDeposit?: bigint): FunctionCallParams {
  const n = signRequestCount(request)
  return {
    methodName: 'sign_for',
    args: signForArgs(tokenId, request, mpcDeposit) as unknown as Record<string, unknown>,
    gas: signAttachGas(n).toString(),
    deposit: signAttachDeposit(n, mpcDeposit).toString(),
  }
}

/** The exact MPC request the contract will send per promise (spec §5.8), for display and for tests. */
export function mpcSignArgs(tokenId: string, chain: ChainSlug, payloadV2: { Ecdsa: string } | { Eddsa: string }) {
  return { request: { path: tokenPath(tokenId, chain), payload_v2: payloadV2, domain_id: chain === 'sol' ? 1 : 0 } }
}
