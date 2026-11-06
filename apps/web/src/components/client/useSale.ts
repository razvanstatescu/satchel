"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { IS_FIXTURE } from "@/lib/config";
import type { SaleReceipt } from "@/lib/data/sale";

/**
 * The connected account's latest sale of this Satchel (the seller's Sold receipt, kb/80 R3). One shared lookup per
 * (token, seller); it re-runs when the owner changes (a sale that lands while the seller watches the page).
 *
 * The lookup module (data source, history client) loads only once a wallet is connected on a Satchel it doesn't own:
 * visitors never download it.
 */
const RETRIES = IS_FIXTURE ? 0 : 3;
const RETRY_MS = 10_000;

type SaleModule = typeof import("@/lib/data/sale");
let loaded: SaleModule | null = null;
const loadModule = () => import("@/lib/data/sale").then((m) => (loaded = m));

export function useMySale(tokenId: string, accountId: string | null, owner: string, enabled: boolean): SaleReceipt | null {
  const on = enabled && !!accountId;
  const [mod, setMod] = useState<SaleModule | null>(loaded);
  useEffect(() => {
    if (!on || mod) return;
    let alive = true;
    void loadModule().then((m) => alive && setMod(m));
    return () => {
      alive = false;
    };
  }, [on, mod]);
  const ready = on && !!mod;
  const subscribe = useCallback((fn: () => void) => (ready && mod && accountId ? mod.subscribeSale(tokenId, accountId, fn) : () => {}), [ready, mod, tokenId, accountId]);
  const value = useSyncExternalStore(
    subscribe,
    () => (ready && mod && accountId ? mod.peekSale(tokenId, accountId) ?? null : null),
    () => null,
  );
  useEffect(() => {
    if (!ready || !mod || !accountId) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // The indexer can trail the chain by a few seconds: re-check a few times while nothing is found (bounded).
    const attempt = (n: number) =>
      void mod.loadSale(tokenId, accountId, n === 0 ? owner : `${owner}#${n}`).then((v) => {
        if (alive && v === null && n < RETRIES) timers.push(setTimeout(() => attempt(n + 1), RETRY_MS));
      });
    attempt(0);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [ready, mod, tokenId, accountId, owner]);
  return value;
}
