import { mapFailure, signaturesFromReceipts, signaturesFromSuccess, type MpcResponse } from "@/lib/near/outcome";
import type { TrackResult } from "@/lib/near/track-tx";
import type { SigRecordView } from "@/lib/near/types";
import type { WalletTx } from "@/lib/near/contract";
import { isRejection } from "@/lib/signing/machine";
import type { IntentStore } from "@/lib/signing/store";
import type { PendingIntent, StoredSignature } from "@/lib/signing/types";
import { anyOurRecord, matchRecords, WATCH_INTERVAL_MS, WATCH_PAGE } from "@/lib/signing/watcher";

/**
 * Drives one intent through kb/90 §8.6 from chain state. One runner per intent per tab (module-level registry),
 * so navigation, <Activity> and Minimize never stop it. `resumeAll` restarts every non-terminal intent on load.
 */

export interface ChainAdapter {
  /** Local verify before broadcast (EVM recoverTransactionAddress; BTC strict low-S; SOL ed25519). */
  verify(intent: PendingIntent, sigs: StoredSignature[]): Promise<boolean>;
  broadcast(intent: PendingIntent, sigs: StoredSignature[]): Promise<{ ok: true; chainTxId: string } | { ok: false; reason: string; expired?: boolean }>;
  isConfirmed(intent: PendingIntent): Promise<boolean>;
  /** Optional: assign MPC receipt signatures to payloads (fallback when on_signed failed). */
  verifiesPayload?(sig: MpcResponse, payloadHex: string): boolean;
}

export interface RunnerDeps {
  store: IntentStore;
  sigRecords(tokenId: string, fromSeq: number, limit: number): Promise<SigRecordView[]>;
  blockHeight(): Promise<number>;
  trackTx(hash: string, signerId: string, signal: AbortSignal): Promise<TrackResult>;
  chainFor(intent: PendingIntent): ChainAdapter;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  pollMs?: number;
  confirmPollMs?: (intent: PendingIntent) => number;
}

export interface WalletLike {
  signAndSendTransaction(tx: WalletTx & { signerId?: string }): Promise<unknown>;
}

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

function mpcToStored(sig: MpcResponse | null): StoredSignature | null {
  if (!sig) return null;
  if (sig.scheme === "Secp256k1") return { r: sig.big_r.affine_point.slice(2).toLowerCase(), s: sig.s.scalar.toLowerCase(), recoveryId: sig.recovery_id };
  return { ed25519: sig.signature.map((b) => b.toString(16).padStart(2, "0")).join("") };
}

const running = new Map<string, AbortController>();

export function isRunning(id: string) {
  return running.has(id);
}
export function stopRunner(id: string) {
  running.get(id)?.abort();
  running.delete(id);
}

/** Start (or keep) the runner for an intent. Idempotent. */
export function ensureRunner(id: string, deps: RunnerDeps): Promise<void> {
  if (running.has(id)) return Promise.resolve();
  const ctl = new AbortController();
  running.set(id, ctl);
  return runIntent(id, deps, ctl.signal).finally(() => {
    if (running.get(id) === ctl) running.delete(id);
  });
}

export async function runIntent(id: string, deps: RunnerDeps, signal: AbortSignal): Promise<void> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const pollMs = deps.pollMs ?? WATCH_INTERVAL_MS;
  const { store } = deps;
  let tracking: string | null = null;

  const startTracker = (intent: PendingIntent) => {
    if (!intent.nearTxHash || tracking === intent.nearTxHash) return;
    const hash = intent.nearTxHash;
    tracking = hash;
    void deps
      .trackTx(hash, intent.signerId ?? "", signal)
      .then((r) => {
        const cur = store.get(id);
        if (!cur || signal.aborted) return;
        if (r.ok) {
          let sigs = signaturesFromSuccess(r.value, cur.payloadHashes.length);
          if (!sigs.every(Boolean)) {
            const fromReceipts = signaturesFromReceipts(r.outcome, cur.payloadHashes, deps.chainFor(cur).verifiesPayload);
            sigs = sigs.map((s, i) => s ?? fromReceipts[i]);
          }
          // Only conclude from the tx value when it is complete; otherwise the watcher decides (records are authoritative).
          if (sigs.every(Boolean)) store.dispatch(id, { type: "TX_SUCCESS", signatures: sigs.map(mpcToStored), now: now() });
        } else if ("failure" in r) {
          const fromReceipts = signaturesFromReceipts(r.outcome, cur.payloadHashes, deps.chainFor(cur).verifiesPayload);
          if (fromReceipts.every(Boolean)) {
            store.dispatch(id, { type: "TX_SUCCESS", signatures: fromReceipts.map(mpcToStored), now: now() });
          } else {
            store.dispatch(id, { type: "TX_FAILURE", code: mapFailure(r.failure, r.outcome).code });
          }
        }
        // lost / deadline: the watcher and the h0 + 250 rule take over.
      })
      .catch(() => {
        tracking = null;
      });
  };

  while (!signal.aborted) {
    const intent = store.get(id);
    if (!intent) return;
    try {
      switch (intent.stage) {
        case "awaiting_wallet":
        case "signing": {
          startTracker(intent);
          const records = await deps.sigRecords(intent.tokenId, intent.sigCountBefore, WATCH_PAGE);
          const seen = anyOurRecord(records, intent.sigCountBefore, intent.payloadHashes);
          if (seen.length) store.dispatch(id, { type: "RECORD_SEEN", seqs: seen, now: now() });
          const m = matchRecords(records, intent.sigCountBefore, intent.payloadHashes);
          if (m) store.dispatch(id, { type: "RECORDS", statuses: m.statuses, signatures: m.signatures, now: now() });
          let height: number | null = null;
          try {
            height = await deps.blockHeight();
          } catch {
            height = null;
          }
          store.dispatch(id, { type: "TICK", now: now(), height });
          const after = store.get(id);
          if (after && (after.stage === "awaiting_wallet" || after.stage === "signing")) await sleep(pollMs, signal);
          break;
        }
        case "signed": {
          const sigs = (intent.signatures ?? []).filter(Boolean) as StoredSignature[];
          const ok = await deps.chainFor(intent).verify(intent, sigs);
          store.dispatch(id, ok ? { type: "VERIFIED" } : { type: "VERIFY_FAILED" });
          break;
        }
        case "broadcasting": {
          const sigs = (intent.signatures ?? []).filter(Boolean) as StoredSignature[];
          const r = await deps.chainFor(intent).broadcast(intent, sigs);
          if (r.ok) store.dispatch(id, { type: "BROADCAST_OK", chainTxId: r.chainTxId, now: now() });
          else if (r.expired) store.dispatch(id, { type: "SOL_EXPIRED" });
          else store.dispatch(id, { type: "BROADCAST_ERROR", reason: r.reason });
          break;
        }
        case "sent": {
          const done = await deps.chainFor(intent).isConfirmed(intent).catch(() => false);
          if (done) store.dispatch(id, { type: "CONFIRMED", now: now() });
          else await sleep(deps.confirmPollMs?.(intent) ?? (intent.chain === "btc" ? 30_000 : intent.chain === "evm" ? 3000 : 1000), signal);
          break;
        }
        default:
          // preparing (the UI owns it), terminal or waiting for a user action: stop.
          return;
      }
    } catch {
      await sleep(pollMs, signal); // transient read error: ask again
    }
  }
}

/**
 * Call the wallet SYNCHRONOUSLY inside the click handler (popup blockers, kb/40 §Gotchas 15). The intent must already be
 * persisted (stage awaiting_wallet). The wallet's resolution is a hint only: a hash moves us to `signing`; a rejection
 * counts only if no record appears within 10 s.
 */
export function callWallet(id: string, wallet: WalletLike, tx: WalletTx, deps: Pick<RunnerDeps, "store" | "now">) {
  const now = deps.now ?? Date.now;
  const p = wallet.signAndSendTransaction(tx);
  p.then((outcome) => {
    const hash = (outcome as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } } | null)?.transaction?.hash
      ?? (outcome as { transaction_outcome?: { id?: string } } | null)?.transaction_outcome?.id;
    if (hash) deps.store.dispatch(id, { type: "TX_HASH", hash, now: now() });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (isRejection(message)) deps.store.dispatch(id, { type: "WALLET_REJECTED", message, now: now() });
    else deps.store.patch(id, { error: message });
  });
  return p;
}

/** Resume on load (kb/90 §8.6): restart every intent whose stage needs chain polling. */
export const RELOAD_REASON = "The page was closed before it was broadcast.";

export function resumeAll(deps: RunnerDeps, filter?: (i: PendingIntent) => boolean) {
  for (const i of deps.store.getSnapshot()) {
    if (filter && !filter(i)) continue;
    if (isRunning(i.id)) continue;
    if (i.stage === "signed" || i.stage === "broadcasting") {
      // A reload found signatures with no confirmed chain tx: offer "Broadcast now" rather than broadcasting silently.
      deps.store.patch(i.id, { stage: "signed_not_sent", notSentReason: RELOAD_REASON });
      continue;
    }
    if (i.stage === "awaiting_wallet" || i.stage === "signing" || i.stage === "sent") void ensureRunner(i.id, deps);
  }
}
