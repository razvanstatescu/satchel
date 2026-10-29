import { describe, expect, it } from 'vitest'
import {
  formatAgo,
  formatAmountParts,
  formatBlocks,
  formatBtc,
  formatClock,
  formatDuration,
  formatEth,
  formatNear,
  formatSats,
  formatSol,
  formatUsd,
  formatUsdc,
  MINUS,
  NBSP,
  parseAmount,
  truncateMiddle,
} from '../src/format'

const s = (x: string) => x.replaceAll(NBSP, ' ').replaceAll(MINUS, '-')

describe('format: amounts (kb/80 R3 §Formatting)', () => {
  it('BTC: up to 8 decimals, minimum 4, trailing zeros trimmed', () => {
    expect(s(formatBtc(1_230_000n))).toBe('0.0123 BTC')
    expect(s(formatBtc(100_000_000n))).toBe('1.0000 BTC')
    expect(s(formatBtc(1n))).toBe('0.00000001 BTC')
    expect(s(formatBtc(0n))).toBe('0.0000 BTC')
    expect(s(formatBtc(123_456_789_012n))).toBe('1,234.56789012 BTC')
  })
  it('ETH: up to 6 decimals, rounded DOWN; below that "< 0.000001 ETH"', () => {
    expect(s(formatEth(5n * 10n ** 16n))).toBe('0.0500 ETH')
    expect(s(formatEth(1_999_999n * 10n ** 11n))).toBe('0.199999 ETH')
    expect(s(formatEth(19_999_999n * 10n ** 10n))).toBe('0.199999 ETH') // 0.1999999 truncates, never rounds up
    expect(s(formatEth(4_200_588_000n))).toBe('< 0.000001 ETH') // a Sepolia transfer fee (kb/31)
    expect(s(formatEth(0n))).toBe('0.0000 ETH')
  })
  it('SOL: up to 6 decimals', () => {
    expect(s(formatSol(1_200_000_000n))).toBe('1.2000 SOL')
    expect(s(formatSol(5_000n))).toBe('0.000005 SOL')
    expect(s(formatSol(650_240n))).toBe('0.00065 SOL')
  })
  it('NEAR up to 4 decimals with a "< 0.0001" floor; USDC exactly 2', () => {
    expect(s(formatNear(4n * 10n ** 21n))).toBe('0.004 NEAR')
    expect(s(formatNear(10n ** 24n))).toBe('1 NEAR')
    expect(s(formatNear(1n))).toBe('< 0.0001 NEAR')
    expect(s(formatUsdc(250_000_000n))).toBe('250.00 USDC')
    expect(s(formatUsdc(5_000_009n))).toBe('5.00 USDC')
  })
  it('signs use U+2212 and "+"; a no-break space precedes the ticker; parts are exposed for tabular layout', () => {
    expect(formatBtc(1_000_000n, { direction: 'out' })).toBe(`${MINUS}0.0100${NBSP}BTC`)
    expect(formatBtc(1_000_000n, { direction: 'in' })).toBe(`+0.0100${NBSP}BTC`)
    expect(formatAmountParts(-1_000_000n, 'BTC').sign).toBe(MINUS)
    expect(formatAmountParts(123_400_000_000n, 'BTC')).toMatchObject({ int: '1,234', frac: '0000', ticker: 'BTC' })
    expect(formatAmountParts(1n, 'ETH', { ticker: false }).text).toBe('< 0.000001')
  })
  it('fees in sats, fiat card total', () => {
    expect(s(formatSats(282, { approx: true }))).toBe('~282 sats')
    expect(s(formatSats(1n))).toBe('1 sat')
    expect(formatUsd(1148.729)).toBe('≈ $1,148.72')
    expect(formatUsd(0.004)).toBe('< $0.01')
    expect(formatUsd(0)).toBe('≈ $0.00')
  })
  it('parses typed amounts into exact base units', () => {
    expect(parseAmount('0.0123', 8)).toBe(1_230_000n)
    expect(parseAmount('1,234.5', 8)).toBe(123_450_000_000n)
    expect(parseAmount('.5', 9)).toBe(500_000_000n)
    expect(parseAmount('0.000000001', 8)).toBeNull()
    expect(parseAmount('1e3', 8)).toBeNull()
    expect(parseAmount('-1', 8)).toBeNull()
  })
})

describe('format: time, blocks, accounts', () => {
  it('durations and "{n} blocks (~{t})"', () => {
    expect(s(formatDuration(12_000))).toBe('12 s')
    expect(s(formatDuration(80_000))).toBe('1 min 20 s')
    expect(s(formatDuration(7_500_000))).toBe('2 h 5 min')
    expect(s(formatBlocks(143))).toBe('143 blocks (~1 min 20 s)')
    expect(s(formatBlocks(250))).toBe('250 blocks (~2 min 20 s)')
    expect(s(formatBlocks(1, 600))).toBe('1 block (~1 s)')
    expect(s(formatAgo(0, 12_000))).toBe('12 s ago')
    expect(formatClock(Date.UTC(2026, 10, 10, 14, 2, 11))).toBe('14:02:11')
  })
  it('accounts: full when ≤ 24 characters, else middle-truncated', () => {
    expect(truncateMiddle('satchel-buyer.testnet')).toBe('satchel-buyer.testnet')
    const long = 'a-very-long-account-name.satchelhq.testnet'
    const t = truncateMiddle(long)
    expect(t.length).toBe(24)
    expect(t.endsWith('.testnet')).toBe(true)
    expect(t).toContain('…')
  })
})
