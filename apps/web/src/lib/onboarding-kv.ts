/**
 * Upstash Redis REST client for the onboarding survey (plain `fetch`, no dependency; kb/90's "no new dependency
 * unless clearly better" applies). Server-only: never import from a client component.
 *
 * Env vars (server-only, apps/web/README.md): `KV_REST_API_URL` / `KV_REST_API_TOKEN` (what the Vercel Marketplace
 * Upstash integration injects), with `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` as fallbacks (the plain
 * Upstash dashboard's names). Unset in fixture mode, local dev and e2e: `upstashConfig()` returns null and the route
 * answers 204 without writing anything.
 */
export function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** Runs several Redis commands as one Upstash REST pipeline call (https://upstash.com/docs/redis/features/restapi
 * #pipelining). Not atomic, but one round trip; failures are swallowed by the caller (a lost write here must never
 * fail the request the user is waiting on). */
export async function upstashPipeline(config: { url: string; token: string }, commands: (string | number)[][]): Promise<void> {
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash pipeline failed: ${res.status}`);
}
