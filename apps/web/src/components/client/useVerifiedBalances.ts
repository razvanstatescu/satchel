"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CleanReport, SatchelSnapshot } from "@/lib/data/types";
import type { Holding } from "@/lib/holdings";
import type { VerifiedBalances } from "@/lib/data/verified";

/**
 * The buyer's "You get", read fresh in the browser each time the clean check lands (and again right before Buy), at
 * the check's depth, minus encumbered coins (lib/data/verified.ts; threat model G-2). Browser only: the server page
 * renders the snapshot as before; this replaces it once a fresh read is in. `read` resolves with the coins that fell
 * since the buyer was last shown the figure (an empty list: nothing fell; call `ack(next)` once the buyer has been shown the lower figure), or null when the read failed.
 */
export function useVerifiedBalances(tokenId: string, balances: SatchelSnapshot["balances"], inside: SatchelSnapshot["inside"], report: CleanReport | null) {
  const [fresh, setFresh] = useState<VerifiedBalances | null>(null);
  const [excluded, setExcluded] = useState(0n);
  const [failed, setFailed] = useState(false);
  const baseline = useRef<VerifiedBalances | null>(null);
  const latest = useRef({ balances, inside });
  useEffect(() => {
    latest.current = { balances, inside };
  }, [balances, inside]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const read = useCallback(
    async (encumbered: string[]): Promise<{ lowered: Holding[]; next: VerifiedBalances } | null> => {
      try {
        const m = await import("@/lib/data/verified");
        const got = await m.readVerifiedBalances(tokenId, encumbered, latest.current.balances);
        const next = got.balances;
        const r = m.reconcile(baseline.current, next, latest.current.inside);
        baseline.current = r.baseline;
        if (alive.current) {
          setFresh(next);
          setExcluded(got.excluded_sats);
          setFailed(false);
        }
        return { lowered: r.lowered, next };
      } catch {
        if (alive.current) setFailed(true);
        return null;
      }
    },
    [tokenId],
  );

  /** The buyer has been shown the lower figure: it is the one to confirm against now. */
  const ack = useCallback((b: VerifiedBalances) => {
    baseline.current = b;
  }, []);

  const at = report?.checked_at ?? 0;
  const encumbered = report?.encumbered_utxos;
  useEffect(() => {
    if (report?.source !== "browser" || !at) return;
    const t = setTimeout(() => void read(encumbered ?? []), 0);
    return () => clearTimeout(t);
  }, [at, encumbered, report?.source, read]);

  return { fresh, excluded, failed, read, ack };
}
