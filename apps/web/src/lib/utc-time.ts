/** UTC time labels. Deterministic (no locale data), so the server and every browser agree. Kept out of
 * `components/Timeline.tsx` so small client islands can use them without that file's imports. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

/** "Oct 20" (UTC). Deterministic: no locale data, so the server and every browser agree. */
export function utcDay(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
/** "02:40 UTC". */
export function utcClock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
/** "Oct 20, 02:40 UTC". */
export function utcShort(ms: number): string {
  return `${utcDay(ms)}, ${utcClock(ms)}`;
}
/** "Oct 20, 2026, 02:40:00 UTC". */
export function utcLong(ms: number): string {
  const d = new Date(ms);
  return `${utcDay(ms)}, ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
