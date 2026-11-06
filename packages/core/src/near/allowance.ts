/**
 * C5 call builders (docs/specs/C5.md §1): `set_allowance` and `revoke_allowance`, as near-connect FunctionCall params.
 * A delegate's own `sign_for` uses the same `signForCall` as the owner.
 *
 *   {"token_id":"1","delegate":"bot.alice.testnet","caps":[{"asset":"btc","limit":"100000"}],"expires_at_ms":1794000000000}
 *   {"token_id":"1","delegate":"bot.alice.testnet"}
 */
import { tokenPath } from '../derive/path'
import { validateCaps, type Asset, type CapInput } from '../policy/allowance'
import { MILLINEAR, ONE_YOCTO, TGAS } from './constants'
import type { FunctionCallParams } from './sign-request'

/** set: 0.01 NEAR covers the largest entry (≈ 0.009 NEAR), excess refunded. revoke: exactly 1 yocto. */
export const ALLOWANCE_ATTACH = {
  set: { gas: 30n * TGAS, deposit: 10n * MILLINEAR },
  revoke: { gas: 30n * TGAS, deposit: ONE_YOCTO },
} as const

export interface SetAllowanceArgs {
  token_id: string
  delegate: string
  caps: { asset: Asset; limit: string }[]
  expires_at_ms?: number
}

export interface RevokeAllowanceArgs {
  token_id: string
  delegate: string
}

/** Validates the caps like the contract (throws RangeError with the contract's error code) and normalizes tokens. */
export function setAllowanceArgs(tokenId: string, delegate: string, caps: readonly CapInput[], expiresAtMs?: number): SetAllowanceArgs {
  tokenPath(tokenId, 'evm') // throws on a non-canonical id
  const v = validateCaps(caps)
  if (!v.ok) throw new RangeError(`${v.error}: ${v.detail}`)
  const a: SetAllowanceArgs = { token_id: tokenId, delegate, caps: v.caps.map((c) => ({ asset: c.asset, limit: c.limit.toString() })) }
  if (expiresAtMs !== undefined) {
    if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0) throw new RangeError('ERR_ALLOWANCE_EXPIRY: expires_at_ms must be a positive integer')
    a.expires_at_ms = expiresAtMs
  }
  return a
}

export function setAllowanceCall(tokenId: string, delegate: string, caps: readonly CapInput[], expiresAtMs?: number): FunctionCallParams {
  return {
    methodName: 'set_allowance',
    args: setAllowanceArgs(tokenId, delegate, caps, expiresAtMs) as unknown as Record<string, unknown>,
    gas: ALLOWANCE_ATTACH.set.gas.toString(),
    deposit: ALLOWANCE_ATTACH.set.deposit.toString(),
  }
}

export function revokeAllowanceCall(tokenId: string, delegate: string): FunctionCallParams {
  tokenPath(tokenId, 'evm')
  const args: RevokeAllowanceArgs = { token_id: tokenId, delegate }
  return {
    methodName: 'revoke_allowance',
    args: args as unknown as Record<string, unknown>,
    gas: ALLOWANCE_ATTACH.revoke.gas.toString(),
    deposit: ALLOWANCE_ATTACH.revoke.deposit.toString(),
  }
}

/** View args: `allowances_of({token_id})` and `allowance({token_id, delegate})`. */
export const allowancesOfArgs = (tokenId: string) => ({ token_id: tokenId })
export const allowanceArgs = (tokenId: string, delegate: string) => ({ token_id: tokenId, delegate })
