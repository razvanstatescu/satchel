"use client";

import { useSyncExternalStore } from "react";
import { intentStore } from "@/lib/signing/store";
import type { PendingIntent } from "@/lib/signing/types";

/**
 * The light half of the signing client: reading the intent store needs no data source, chain or MPC code. Shell
 * components (PendingIndicator, RefreshAfterSend) import from here so that the heavy runtime in `client.ts` (data
 * source, viem, near-api-js) is not part of every page's JavaScript.
 */

const EMPTY: PendingIntent[] = [];
export function useIntents(): PendingIntent[] {
  const store = intentStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}

export function useIntent(id: string | null): PendingIntent | null {
  const all = useIntents();
  return id ? all.find((i) => i.id === id) ?? null : null;
}
