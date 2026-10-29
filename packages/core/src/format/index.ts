/**
 * Amount and time formatting (kb/80 R3 §Formatting; spec §8.9).
 * - BTC up to 8 decimals, ETH/SOL up to 6, NEAR up to 4, USDC exactly 2; crypto keeps ≥ 4 decimals, trailing zeros trimmed.
 * - Balances round DOWN (truncate); "Max" uses exact base units (never a formatted string).
 * - "−" (U+2212) for outgoing, "+" for incoming; a no-break space (U+00A0) before the ticker.
 * - Tabular-friendly: plain ASCII digits and fixed separators, so `font-variant-numeric: tabular-nums` aligns them.
 */

export const NBSP = '\u00A0'
export const MINUS = '\u2212'

export type Ticker = 'BTC' | 'ETH' | 'SOL' | 'NEAR' | 'USDC'

export interface AmountRule {
  /** base-unit decimals of the asset */
  decimals: number
  /** max decimals shown */
  max: number
  /** min decimals shown (zeros padded up to this) */
  min: number
  /** smallest positive value shown as a number; anything below is "< {floor}" (null = never) */
  floor: string | null
}

export const RULES: Record<Ticker, AmountRule> = {
  BTC: { decimals: 8, max: 8, min: 4, floor: null },
  ETH: { decimals: 18, max: 6, min: 4, floor: '0.000001' },
  SOL: { decimals: 9, max: 6, min: 4, floor: '0.000001' },
  NEAR: { decimals: 24, max: 4, min: 0, floor: '0.0001' },
  USDC: { decimals: 6, max: 2, min: 2, floor: null },
}

export interface AmountParts {
  /** "", "−" or "+" */
  sign: string
  /** "< " when the value is below the display floor */
  prefix: string
  /** integer part with thousands separators */
  int: string
  /** fractional digits (may be empty) */
  frac: string
  ticker: Ticker
  /** the full string, e.g. "−0.0100 BTC" */
  text: string
}

function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format base units (sats, wei, lamports, yocto, USDC units). `direction` adds the sign.
 * Zero renders with the minimum decimals ("0.0000 BTC").
 */
export function formatAmountParts(base: bigint, ticker: Ticker, opts: { direction?: 'in' | 'out'; ticker?: boolean } = {}): AmountParts {
  const r = RULES[ticker]
  const neg = base < 0n
  const abs = neg ? -base : base
  const sign = opts.direction === 'out' || (neg && !opts.direction) ? MINUS : opts.direction === 'in' ? '+' : ''
  const unit = 10n ** BigInt(r.decimals)
  const scale = 10n ** BigInt(r.decimals - r.max)
  const truncated = (abs / scale) * scale // round down to `max` decimals
  let prefix = ''
  let int: string
  let frac: string
  if (abs > 0n && truncated === 0n && r.floor) {
    prefix = '< '
    ;[int, frac] = r.floor.split('.') as [string, string]
  } else {
    int = (truncated / unit).toString()
    frac = (truncated % unit).toString().padStart(r.decimals, '0').slice(0, r.max)
    frac = frac.replace(/0+$/, '')
    if (frac.length < r.min) frac = frac.padEnd(r.min, '0')
  }
  const num = `${prefix}${group(int)}${frac ? `.${frac}` : ''}`
  const text = `${sign}${num}${opts.ticker === false ? '' : `${NBSP}${ticker}`}`
  return { sign, prefix, int: group(int), frac, ticker, text }
}

export const formatAmount = (base: bigint, ticker: Ticker, opts?: { direction?: 'in' | 'out'; ticker?: boolean }): string =>
  formatAmountParts(base, ticker, opts).text

export const formatBtc = (sats: bigint, o?: { direction?: 'in' | 'out' }) => formatAmount(sats, 'BTC', o)
export const formatEth = (wei: bigint, o?: { direction?: 'in' | 'out' }) => formatAmount(wei, 'ETH', o)
export const formatSol = (lamports: bigint, o?: { direction?: 'in' | 'out' }) => formatAmount(lamports, 'SOL', o)
export const formatNear = (yocto: bigint, o?: { direction?: 'in' | 'out' }) => formatAmount(yocto, 'NEAR', o)
export const formatUsdc = (units: bigint, o?: { direction?: 'in' | 'out' }) => formatAmount(units, 'USDC', o)

/** Fees in sats: "282 sats", "~282 sats" for an estimate, "1 sat". */
export function formatSats(sats: bigint | number, opts: { approx?: boolean } = {}): string {
  const n = BigInt(sats)
  return `${opts.approx ? '~' : ''}${group(n.toString())}${NBSP}${n === 1n ? 'sat' : 'sats'}`
}

/** Fiat (UX-1, card total only): "≈ $1,148.72"; positive amounts below $0.01 → "< $0.01". Rounds down to cents. */
export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) throw new RangeError('bad USD amount')
  if (usd === 0) return '≈ $0.00'
  if (usd < 0.01) return '< $0.01'
  const cents = BigInt(Math.floor(usd * 100 + 1e-9))
  return `≈ $${group((cents / 100n).toString())}.${(cents % 100n).toString().padStart(2, '0')}`
}

/** Parse a user-typed decimal ("0.01", "1,234.5") into base units; null if invalid or too precise. */
export function parseAmount(input: string, decimals: number): bigint | null {
  const s = input.trim().replace(/,/g, '')
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null
  const [i = '0', f = ''] = s.split('.')
  if (f.length > decimals) return null
  return BigInt(i || '0') * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, '0') || '0')
}

/** "12 s", "1 min 20 s", "2 h 5 min", "3 d 4 h" (two units at most). */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}${NBSP}s`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 ? `${m}${NBSP}min ${s % 60}${NBSP}s` : `${m}${NBSP}min`
  const h = Math.floor(m / 60)
  if (h < 24) return m % 60 ? `${h}${NBSP}h ${m % 60}${NBSP}min` : `${h}${NBSP}h`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d}${NBSP}d ${h % 24}${NBSP}h` : `${d}${NBSP}d`
}

/** "{n} blocks (~{t})" from the measured block time (spec §8.9; 100-block average ≈ 0.56 s on testnet). */
export function formatBlocks(n: number, avgBlockMs = 560): string {
  return `${n}${NBSP}${n === 1 ? 'block' : 'blocks'} (~${formatDuration(n * avgBlockMs)})`
}

/** "12 s ago" / "3 min ago"; use the absolute UTC string in `title`/`<time>`. */
export function formatAgo(thenMs: number, nowMs: number): string {
  return `${formatDuration(nowMs - thenMs)} ago`
}

/** Clock time inside flows (tracker, receipt): "14:02:11" (UTC unless a timeZone is given). */
export function formatClock(ms: number, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone }).format(ms)
}

/** Accounts: full if ≤ 24 characters, otherwise middle-truncated with "…" (kb/80 R3). */
export function truncateMiddle(s: string, max = 24, keepEnd = 8): string {
  if (s.length <= max) return s
  const keepStart = Math.max(1, max - keepEnd - 1)
  return `${s.slice(0, keepStart)}…${s.slice(-keepEnd)}`
}

export const NETWORK_LABEL = {
  btc: 'Bitcoin testnet4',
  evm: 'Ethereum Sepolia',
  sol: 'Solana devnet',
  near: 'NEAR testnet',
} as const
