/**
 * Where Mint's Close returns (app-screens §10: `?from=`): a same-site path only, never an external URL ("//host",
 * "/\host"), a scheme, or /mint itself. Anything else is null, and the flow falls back to /satchels (connected) or /.
 */
export function safeReturnPath(v: string | string[] | undefined): string | null {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  // browsers drop tabs and newlines from URLs ("/\t/host" would become "//host"): refuse every control character
  if ([...v].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return null;
  return /^\/mint(?:[/?#]|$)/.test(v) ? null : v;
}
