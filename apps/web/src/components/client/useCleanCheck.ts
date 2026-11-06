"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { simCleanState } from "@/components/client/fixture-switches";
import { IS_FIXTURE } from "@/lib/config";
import type { CleanReport } from "@/lib/data/types";

/**
 * The BROWSER clean-history check (kb/90 §7.5 place 1): runs on mount, silently every 10 s, and on demand right before
 * Buy. Only this result ever enables Buy; the server hint is shown (labelled as the server's) until it lands.
 */
export async function browserCheck(tokenId: string): Promise<CleanReport> {
  if (IS_FIXTURE) {
    // loaded on demand: the data source and fixture evidence are not part of the page's first JavaScript
    const [{ fixtureCleanReport }, { dataSource }, { contractViews }] = await Promise.all([
      import("@/lib/data/clean"),
      import("@/lib/data/source"),
      import("@/lib/near/contract"),
    ]);
    const src = dataSource();
    const views = contractViews(src.view);
    const s = await views.satchel(tokenId);
    const records = await views.allSigRecords(tokenId, s?.sig_count ?? 0);
    const lock = await src.lock();
    await new Promise((r) => setTimeout(r, 700)); // fixture: let "Checking…" render like a real read would
    // `satchel:sim:clean` (fixture-switches.ts) can bend it for QA; live mode below never reads that switch
    return simCleanState(fixtureCleanReport(tokenId, records, lock, s?.listing?.id ?? null, "browser"));
  }
  const { runLiveCheck } = await import("@/lib/data/clean-live");
  return runLiveCheck(tokenId, "browser");
}

const RECHECK_MS = 10_000;

/**
 * `report`: the latest browser result (null until the first lands). `failed`: the last run threw (no result to show;
 * the page offers Check again). `recheck()`: runs it now and resolves with the result (null when it failed).
 * The API `{ report, recheck }` is stable: S's owner panel uses it too.
 */
export function useCleanCheck(tokenId: string, enabled: boolean) {
  const [report, setReport] = useState<CleanReport | null>(null);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  // state changes only after the read resolves (callers show "Checking…" while `report` is null)
  const run = useCallback(async () => {
    try {
      const r = await browserCheck(tokenId);
      if (alive.current) {
        setReport(r);
        setFailed(false);
      }
      return r;
    } catch {
      if (alive.current) setFailed(true);
      return null;
    }
  }, [tokenId]);
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    // timer callbacks only (the first read starts on the next tick), so no state changes inside the effect body
    const first = setTimeout(() => void run(), 0);
    const t = setInterval(() => void run(), RECHECK_MS);
    return () => {
      alive.current = false;
      clearTimeout(first);
      clearInterval(t);
    };
  }, [enabled, run]);
  return { report, recheck: run, failed };
}
