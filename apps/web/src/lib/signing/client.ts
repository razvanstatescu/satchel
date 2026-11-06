"use client";

import { IS_FIXTURE, NEAR_RPCS, SATCHEL_CONTRACT } from "@/lib/config";
import { dataSource } from "@/lib/data/source";
import { contractViews } from "@/lib/near/contract";
import { trackTx, type TrackResult } from "@/lib/near/track-tx";
import { ensureRunner, resumeAll, type RunnerDeps } from "@/lib/signing/runner";
import { intentStore } from "@/lib/signing/store";
import type { PendingIntent } from "@/lib/signing/types";

/** Browser wiring of the signing runtime (store + watcher + tracker + chain adapter). Module-level, never in effects. */

let deps: RunnerDeps | null = null;

export function runnerDeps(): RunnerDeps {
  if (deps) return deps;
  const src = dataSource();
  const views = contractViews(src.view, SATCHEL_CONTRACT);
  deps = {
    store: intentStore(),
    sigRecords: (tokenId, from, limit) => views.sigRecords(tokenId, from, limit),
    blockHeight: () => src.blockHeight(),
    trackTx: (hash, signerId, signal) =>
      IS_FIXTURE
        ? new Promise<TrackResult>((resolve) => signal.addEventListener("abort", () => resolve({ ok: false, aborted: true })))
        : trackTx({ txHash: hash, senderId: signerId, rpcUrls: NEAR_RPCS, signal }),
    chainFor: (intent) => {
      // Lazy: chain libraries load only when a send actually needs them (kb/90 §8.2 rules).
      return lazyAdapter(intent);
    },
  };
  return deps;
}

type Adapter = ReturnType<RunnerDeps["chainFor"]>;
function lazyAdapter(intent: PendingIntent): Adapter {
  const load = () => import("@/lib/chains/adapter").then((m) => m.chainAdapterFor(intent));
  return {
    verify: (i, s) => load().then((a) => a.verify(i, s)),
    broadcast: (i, s) => load().then((a) => a.broadcast(i, s)),
    isConfirmed: (i) => load().then((a) => a.isConfirmed(i)),
  };
}

let resumed = false;
/** Resume on load (kb/90 §8.6): call once per tab after hydration. */
export function resumeOnLoad() {
  if (resumed || typeof window === "undefined") return;
  resumed = true;
  resumeAll(runnerDeps(), (i) => i.contract === SATCHEL_CONTRACT);
}

export function startRunner(id: string) {
  void ensureRunner(id, runnerDeps());
}

export { useIntent, useIntents } from "@/lib/signing/intents";
