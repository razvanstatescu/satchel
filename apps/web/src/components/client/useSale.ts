"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { IS_FIXTURE } from "@/lib/config";
import { loadSale, peekSale, subscribeSale, type SaleReceipt } from "@/lib/data/sale";

/**
 * The connected account's latest sale of this Satchel (the seller's Sold receipt, kb/80 R3). One shared lookup per
 * (token, seller); it re-runs when the owner changes (a sale that lands while the seller watches the page).
 */
const RETRIES = IS_FIXTURE ? 0 : 3;
const RETRY_MS = 10_000;

export function useMySale(tokenId: string, accountId: string | null, owner: string, enabled: boolean): SaleReceipt | null {
  const on = enabled && !!accountId;
  const subscribe = useCallback((fn: () => void) => (on && accountId ? subscribeSale(tokenId, accountId, fn) : () => {}), [on, tokenId, accountId]);
  const value = useSyncExternalStore(
    subscribe,
    () => (on && accountId ? peekSale(tokenId, accountId) ?? null : null),
    () => null,
  );
  useEffect(() => {
    if (!on || !accountId) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // The indexer can trail the chain by a few seconds: re-check a few times while nothing is found (bounded).
    const attempt = (n: number) =>
      void loadSale(tokenId, accountId, n === 0 ? owner : `${owner}#${n}`).then((v) => {
        if (alive && v === null && n < RETRIES) timers.push(setTimeout(() => attempt(n + 1), RETRY_MS));
      });
    attempt(0);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [on, tokenId, accountId, owner]);
  return value;
}
