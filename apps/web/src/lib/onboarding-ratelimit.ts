/**
 * A light, best-effort per-IP rate limit for POST /api/onboarding (in-memory). This is NOT a real limiter: on
 * serverless (Vercel), each warm lambda instance keeps its own `Map`, so a client hitting a different instance (or a
 * cold start) gets a fresh budget. That's fine for what this endpoint is — a 20-second survey nobody has a reason to
 * script — and keeps the route dependency-free. Documented in apps/web/README.md.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

const hits = new Map<string, { count: number; windowStart: number }>();

/** True if `ip` may make another request now; false past the limit. Also sweeps stale entries so the map can't
 * grow without bound across a long-lived instance. */
export function allowOnboardingRequest(ip: string, now = Date.now()): boolean {
  if (hits.size > 10_000) hits.clear(); // a crude backstop; a real deployment would use Upstash's own rate limiter
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count++;
  return true;
}
