/**
 * Display formatting (kb/80 R3 §Formatting). Balances round DOWN; amounts are tabular in the UI;
 * U+2212 for outgoing; a no-break space (U+00A0) before the ticker. No fiat anywhere (D-37).
 */

export const NBSP = " ";
export const MINUS = "−";

export type Ticker = "BTC" | "ETH" | "SOL" | "NEAR" | "USDC" | "wNEAR";

export const DECIMALS: Record<Ticker, number> = { BTC: 8, ETH: 18, SOL: 9, NEAR: 24, USDC: 6, wNEAR: 24 };
const MAX_SHOWN: Record<Ticker, number> = { BTC: 8, ETH: 6, SOL: 6, NEAR: 4, USDC: 2, wNEAR: 4 };
const MIN_SHOWN: Record<Ticker, number> = { BTC: 4, ETH: 4, SOL: 4, NEAR: 0, USDC: 2, wNEAR: 0 };

/** Base units → decimal string, rounded down to `maxDp`, trailing zeros trimmed to `minDp`. */
export function formatUnits(base: bigint | string | number, decimals: number, maxDp: number, minDp = 0): string {
  let v = typeof base === "bigint" ? base : BigInt(base);
  const neg = v < 0n;
  if (neg) v = -v;
  const unit = 10n ** BigInt(decimals);
  const whole = v / unit;
  let frac = (v % unit).toString().padStart(decimals, "0").slice(0, Math.min(maxDp, decimals));
  frac = frac.replace(/0+$/, "");
  if (frac.length < minDp) frac = frac.padEnd(minDp, "0");
  const w = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${w}${frac ? "." + frac : ""}`;
}

/** e.g. 1230000n BTC → "0.0123 BTC"; tiny ETH → "< 0.000001 ETH". */
export function formatAmount(base: bigint | string | number, ticker: Ticker, opts: { sign?: "out" | "in"; withTicker?: boolean } = {}): string {
  const b = typeof base === "bigint" ? base : BigInt(base);
  const dec = DECIMALS[ticker];
  const max = MAX_SHOWN[ticker];
  const min = MIN_SHOWN[ticker];
  const smallest = 10n ** BigInt(dec - max);
  let body: string;
  if (b > 0n && b < smallest && (ticker === "ETH" || ticker === "NEAR" || ticker === "SOL" || ticker === "wNEAR")) {
    body = `< ${formatUnits(smallest, dec, max, 0)}`;
  } else {
    body = formatUnits(b, dec, max, min);
  }
  const sign = opts.sign === "out" ? MINUS : opts.sign === "in" ? "+" : "";
  return `${sign}${body}${opts.withTicker === false ? "" : NBSP + ticker}`;
}

export const formatSats = (sats: bigint | number | string) => `${BigInt(sats).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${NBSP}sats`;

/** Middle-truncate: prefix + 4 … 4 for addresses; accounts are full if ≤ 24 chars. */
export function truncateMiddle(s: string, head = 8, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function truncateAddress(addr: string): string {
  if (addr.startsWith("0x")) return truncateMiddle(addr, 6, 4);
  if (/^(tb1|bc1)/.test(addr)) return truncateMiddle(addr, 8, 4);
  return truncateMiddle(addr, 4, 4);
}

export function formatAccount(id: string): string {
  return id.length <= 24 ? id : truncateMiddle(id, 12, 8);
}

/** 4-character groups (kb/81 R3 grouped addresses). Returns the groups; the component styles them. */
export function groupAddress(addr: string): string[] {
  const g: string[] = [];
  for (let i = 0; i < addr.length; i += 4) g.push(addr.slice(i, i + 4));
  return g;
}

/** "12 s ago", "4 min ago", "3 h ago", "2 d ago". */
export function relativeTime(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 60) return `${s}${NBSP}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${NBSP}min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}${NBSP}h ago`;
  return `${Math.floor(h / 24)}${NBSP}d ago`;
}

/** "143 blocks (~1 min 20 s)" from a block count and the measured block time. */
export function formatBlocks(n: number, blockMs: number): string {
  const total = Math.round((n * blockMs) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const t = m > 0 ? `${m}${NBSP}min${s ? ` ${s}${NBSP}s` : ""}` : `${s}${NBSP}s`;
  return `${n} ${n === 1 ? "block" : "blocks"} (~${t})`;
}

/** Elapsed timer m:ss. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Clock time inside flows (UTC), e.g. "14:02:11". */
export function clockTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}

export function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Parse a user-typed decimal ("," → ".") into base units; null if invalid or too many decimals. */
export function parseUnits(input: string, decimals: number): bigint | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null;
  const [w, f = ""] = s.split(".");
  if (f.length > decimals) return null;
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f || "").padEnd(decimals, "0") || "0");
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$1,148.72"; "< $0.01" for dust above zero; "$0.00" for nothing (kb/80 §Fiat: 2 decimals, US dollars). Pure, so the
 * landing's simulated sample can format a dollar figure without importing `lib/overview` → `lib/holdings` →
 * `@/lib/near/contract` (landing-no-data only scans direct imports). Re-exported from `lib/overview.ts`. */
export function usdText(v: number): string {
  if (v > 0 && v < 0.01) return "< $0.01";
  return USD.format(v);
}

/** "41%"; "< 1%" for a sliver; for the legend beside the value bar. */
export function shareText(share: number): string {
  if (share > 0 && share < 0.01) return "< 1%";
  return `${Math.round(share * 100)}%`;
}
