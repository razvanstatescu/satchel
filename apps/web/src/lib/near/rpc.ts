import { FailoverRpcProvider, JsonRpcProvider } from "near-api-js";
import { isForbiddenRpc, NEAR_RPCS } from "@/lib/config";

/**
 * NEAR RPC (kb/90 §8.3; kb/41 §RPC config). FailoverRpcProvider([FastNEAR, dRPC]) with low retries
 * (2 / 250 ms / ×2) so UI reads fail over fast. The server variant adds the FastNEAR key as a Bearer header.
 * The deprecated near.org endpoint is refused here as well as in config.
 */

const FAST = { retries: 2, wait: 250, backoff: 2 } as const;

export function assertAllowedRpc(url: string) {
  if (isForbiddenRpc(url)) throw new Error("refusing the deprecated near.org RPC");
  return url;
}

export function makeNearProvider(opts: { urls?: readonly string[]; apiKey?: string | null } = {}) {
  const urls = (opts.urls ?? NEAR_RPCS).map(assertAllowedRpc);
  const providers = urls.map((url) => {
    const isFastnear = url.includes("fastnear.com");
    const headers = isFastnear && opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : undefined;
    return new JsonRpcProvider({ url, headers }, FAST);
  });
  return new FailoverRpcProvider(providers);
}

let browserProvider: FailoverRpcProvider | null = null;
/** One provider per tab in the browser; a fresh keyed one per call on the server. */
export function nearProvider(): FailoverRpcProvider {
  if (typeof window === "undefined") {
    const key = process.env.FASTNEAR_API_KEY?.trim() || null;
    return makeNearProvider({ apiKey: key });
  }
  return (browserProvider ??= makeNearProvider());
}

export async function nearView<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const p = nearProvider();
  const out = await p.callFunction({ contractId, method, args, blockQuery: { finality: "final" } } as never);
  return (out ?? null) as T | null;
}

export async function nearViewAccount(accountId: string) {
  return nearProvider().viewAccount({ accountId, blockQuery: { finality: "final" } } as never) as Promise<{
    amount: bigint | string;
    code_hash: string;
    storage_usage: number | bigint;
    block_height?: number;
  }>;
}

export async function nearAccessKeys(accountId: string): Promise<{ keys: unknown[] }> {
  return nearProvider().viewAccessKeyList({ accountId, finalityQuery: { finality: "final" } } as never) as Promise<{ keys: unknown[] }>;
}

export async function nearBlockHeight(): Promise<number> {
  const b = await nearProvider().viewBlock({ finality: "final" } as never);
  return Number((b as { header: { height: number } }).header.height);
}

export type RawRpcResult = { http: number; body: unknown };

/** One raw JSON-RPC POST (used by the tx tracker, which needs the HTTP status and the error body). */
export async function rawRpc(
  url: string,
  method: string,
  params: unknown,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch; headers?: Record<string, string> } = {},
): Promise<RawRpcResult> {
  assertAllowedRpc(url);
  const f = opts.fetchImpl ?? fetch;
  const res = await f(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: "satchel", method, params }),
    signal: opts.signal,
  });
  const body = await res.json().catch(() => null);
  return { http: res.status, body };
}

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

/** Bound an upstream read (1.5 s on SSR, kb/90 §8.1 rule 3). */
export function withTimeout<T>(p: Promise<T>, ms: number, label = "upstream"): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}
