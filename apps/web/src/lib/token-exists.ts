import { IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { FIXTURE_CONFIG } from "@/lib/data/fixtures";
import { nearView, withTimeout } from "@/lib/near/rpc";

/**
 * Does Satchel #id exist? Used by `src/proxy.ts` so an unknown id answers HTTP 404 before rendering starts (a status
 * thrown during a streamed render can no longer change the 200). Token ids run 1 … next_token_id − 1 and are never
 * burned, so one `config` read answers for every id. "unknown" (the RPC did not answer) lets the request through;
 * the `/s/[id]` layout then renders its own not-found view.
 */
export type TokenVerdict = "exists" | "missing" | "unknown";

const TOKEN_ID = /^[1-9]\d{0,9}$/;

export function tokenVerdict(id: string, nextTokenId: number | null): TokenVerdict {
  if (!TOKEN_ID.test(id)) return "missing";
  if (nextTokenId === null) return "unknown";
  return Number(id) < nextTokenId ? "exists" : "missing";
}

/** The `/s/<id>` segment of a path, or null when the path is not a Satchel page (the social images included). */
export function satchelPathId(pathname: string): string | null {
  const m = /^\/s\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!m) return null;
  if (m[2] && /^(opengraph-image|twitter-image)(?:$|[/?-])/.test(m[2])) return null;
  return decodeURIComponent(m[1]);
}

const FRESH_MS = 15_000; // a known id stays known
const RECHECK_MS = 3_000; // a higher id re-reads at most this often, so a fresh mint shows within seconds
let cached: { next: number; at: number } | null = null;

export async function nextTokenId(want: number, now = Date.now()): Promise<number | null> {
  if (IS_FIXTURE) return FIXTURE_CONFIG.next_token_id;
  const age = cached ? now - cached.at : Infinity;
  if (cached && age < FRESH_MS && (want < cached.next || age < RECHECK_MS)) return cached.next;
  try {
    const cfg = await withTimeout(nearView<{ next_token_id: number }>(SATCHEL_CONTRACT, "config", {}), 1500, "config");
    if (typeof cfg?.next_token_id !== "number") return cached?.next ?? null;
    cached = { next: cfg.next_token_id, at: now };
    return cached.next;
  } catch {
    return cached?.next ?? null;
  }
}
