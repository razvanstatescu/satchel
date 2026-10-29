/** Amount parsing and display for the tools. Amounts are bigint base units everywhere. */
import { parseAmount } from '@satchel/core/format'

export const TGAS = 1_000_000_000_000n
export const YOCTO_PER_NEAR = 10n ** 24n

export const DECIMALS = { near: 24, eth: 18, sol: 9, btc: 8, usdc: 6 } as const
export type Unit = keyof typeof DECIMALS

/** "0.02" NEAR → yocto. Throws on malformed input or too many decimals (never rounds). */
export function parseUnits(input: string, unit: Unit): bigint {
  const v = parseAmount(input, DECIMALS[unit])
  if (v === null) throw new Error(`invalid ${unit.toUpperCase()} amount: ${JSON.stringify(input)}`)
  return v
}

export const parseNear = (s: string): bigint => parseUnits(s, 'near')

/** Exact decimal rendering (no rounding, trailing zeros trimmed). */
export function formatUnits(v: bigint, unit: Unit): string {
  const d = DECIMALS[unit]
  const neg = v < 0n
  const a = neg ? -v : v
  const base = 10n ** BigInt(d)
  const int = a / base
  const frac = (a % base).toString().padStart(d, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${int}${frac ? `.${frac}` : ''}`
}

export const formatNear = (yocto: bigint): string => `${formatUnits(yocto, 'near')} NEAR`
/** 80000000000000n → "80 Tgas"; non-integral values keep their decimals ("12.5 Tgas"). */
export const formatTgas = (gas: bigint): string => {
  const whole = gas / TGAS
  const frac = (gas % TGAS).toString().padStart(12, '0').replace(/0+$/, '')
  return `${whole}${frac ? `.${frac}` : ''} Tgas`
}
export const tgas = (n: number | bigint): bigint => BigInt(n) * TGAS
