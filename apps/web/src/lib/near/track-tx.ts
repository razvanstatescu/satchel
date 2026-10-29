import { NEAR_RPCS } from "@/lib/config";
import { decodeSuccessValue } from "@/lib/near/outcome";
import { rawRpc } from "@/lib/near/rpc";

/**
 * Long-poll tx tracker (kb/40 §Tested tracker; kb/90 §8.3, §8.6).
 * - `tx` with wait_until EXECUTED_OPTIMISTIC; FastNEAR holds 10–30 s then answers 408 with the pending status.
 * - 408 / TIMEOUT_ERROR → pending (ask again, same provider); UNKNOWN_TRANSACTION → unknown (grace period);
 *   429 / 5xx / network / dRPC -32601 → retry with backoff and rotate providers; INVALID_TRANSACTION → fatal.
 * Wallet promises are never trusted: only this tracker and the contract watcher move the stages.
 */

const TERMINAL = new Set(["EXECUTED_OPTIMISTIC", "EXECUTED", "FINAL"]);

export interface TxOutcome {
  final_execution_status?: string;
  status?: unknown;
  transaction?: { hash?: string; signer_id?: string };
  transaction_outcome?: unknown;
  receipts_outcome?: Array<{
    id?: string;
    block_hash?: string;
    outcome: { executor_id?: string; status?: unknown; logs?: string[]; gas_burnt?: number };
  }>;
}

export type Classified =
  | { kind: "done"; outcome: TxOutcome }
  | { kind: "pending"; status: string; outcome?: TxOutcome }
  | { kind: "unknown" }
  | { kind: "fatal"; error: unknown }
  | { kind: "retry"; error: unknown; paceMs?: number };

interface RpcErrorBody {
  code?: number;
  message?: string;
  name?: string;
  cause?: { name?: string; info?: { status?: TxOutcome; Pending?: { status?: TxOutcome }; cause?: string } };
}

export function classify(http: number, body: unknown): Classified {
  const b = (body ?? null) as { result?: TxOutcome; error?: RpcErrorBody; code?: number; message?: string } | null;
  if (b?.result) {
    const r = b.result;
    const st = r.status;
    if (st && typeof st === "object" && ("SuccessValue" in st || "Failure" in st) && TERMINAL.has(r.final_execution_status ?? "")) {
      return { kind: "done", outcome: r };
    }
    return { kind: "pending", status: r.final_execution_status ?? "UNKNOWN", outcome: r };
  }
  const e = b?.error;
  const cause = e?.cause?.name;
  // dRPC free plan: HTTP 408 with {"message":"Request timeout on the free plan…","code":30} (top-level, not JSON-RPC)
  if (http === 408 && b && (b.code === 30 || e?.code === 30)) {
    return { kind: "pending", status: "UNKNOWN", outcome: undefined };
  }
  if (cause === "TIMEOUT_ERROR" || http === 408) {
    const pending = e?.cause?.info?.status ?? e?.cause?.info?.Pending?.status;
    return { kind: "pending", status: pending?.final_execution_status ?? "UNKNOWN", outcome: pending };
  }
  if (cause === "UNKNOWN_TRANSACTION") return { kind: "unknown" };
  if (cause === "INVALID_TRANSACTION") return { kind: "fatal", error: e };
  return { kind: "retry", error: e ?? { http } };
}

export type TrackStage = "submitted" | "included" | "executed";

export type TrackResult =
  | { ok: true; value: unknown; outcome: TxOutcome }
  | { ok: false; failure: unknown; outcome: TxOutcome }
  | { ok: false; fatal: unknown }
  | { ok: false; lost: true }
  | { ok: false; deadline: true }
  | { ok: false; aborted: true };

export interface TrackOptions {
  txHash: string;
  senderId: string;
  rpcUrls?: readonly string[];
  onStage?: (s: { stage: TrackStage; elapsedMs: number; detail?: unknown; provider: string }) => void;
  deadlineMs?: number;
  unknownGraceMs?: number;
  requestTimeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function trackTx(o: TrackOptions): Promise<TrackResult> {
  const urls = o.rpcUrls ?? NEAR_RPCS;
  const now = o.now ?? Date.now;
  const sleep = o.sleep ?? defaultSleep;
  const deadline = o.deadlineMs ?? 240_000;
  const grace = o.unknownGraceMs ?? 60_000;
  const t0 = now();
  let i = 0;
  let backoff = 500;
  let last = "";
  const stage = (s: TrackStage, provider: string, detail?: unknown) => {
    if (s !== last) {
      last = s;
      o.onStage?.({ stage: s, elapsedMs: now() - t0, detail, provider });
    }
  };
  stage("submitted", urls[0], { txHash: o.txHash });

  while (now() - t0 < deadline) {
    if (o.signal?.aborted) return { ok: false, aborted: true };
    const url = urls[i % urls.length];
    let http = 0;
    let body: unknown = null;
    let selfAborted = false;
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    o.signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      selfAborted = true;
      ctl.abort();
    }, o.requestTimeoutMs ?? 35_000);
    try {
      const r = await rawRpc(
        url,
        "tx",
        { tx_hash: o.txHash, sender_account_id: o.senderId, wait_until: "EXECUTED_OPTIMISTIC" },
        { signal: ctl.signal, fetchImpl: o.fetchImpl },
      );
      http = r.http;
      body = r.body;
    } catch {
      http = 0; // network error / "Failed to fetch" (may be a CORS-less 429) → retry
    } finally {
      clearTimeout(timer);
      o.signal?.removeEventListener("abort", onAbort);
    }
    if (o.signal?.aborted) return { ok: false, aborted: true };
    if (selfAborted) continue;

    const c = classify(http, body);
    if (c.kind === "done") {
      stage("executed", url, { final_execution_status: c.outcome.final_execution_status });
      const st = c.outcome.status as Record<string, unknown>;
      return "SuccessValue" in st
        ? { ok: true, value: decodeSuccessValue(st.SuccessValue as string), outcome: c.outcome }
        : { ok: false, failure: st.Failure, outcome: c.outcome };
    }
    if (c.kind === "fatal") return { ok: false, fatal: c.error };
    if (c.kind === "pending") {
      stage(c.status === "NONE" || c.status === "UNKNOWN" ? "submitted" : "included", url, { final_execution_status: c.status });
      backoff = 500;
      // dRPC answers in ~2 s; pace it so we don't hammer the free plan.
      if (http === 408 && (body as { code?: number } | null)?.code === 30) await sleep(1500);
      continue;
    }
    if (c.kind === "unknown") {
      if (now() - t0 > grace) return { ok: false, lost: true };
      await sleep(1000);
      continue;
    }
    i++; // rotate on errors
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 5000);
  }
  return { ok: false, deadline: true };
}
