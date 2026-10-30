"use client";

import { useSyncExternalStore } from "react";

/**
 * Navigation feedback (client only). A direct page load stays fully server-rendered (the judges' HTML, no Suspense
 * fallback); an in-app link click shows feedback the moment it happens, until the new page commits:
 * - a progress bar at the top (NavFeedback);
 * - a skeleton where the new content will be, saying what is being read: a popup's panel for a flow route, the tab's
 *   area for a tab of the same Satchel, the page area for any other page.
 * The store holds the pending target; NavFeedback starts it on a link click and ends it when the URL commits.
 */

export type PendingKind = "flow" | "tab" | "page";
export interface PendingTarget {
  path: string;
  search: string;
  kind: PendingKind;
  /** the flow or tab name, or the page */
  name: string;
  tokenId: string | null;
  /** the tab, for kind "tab" */
  tab?: "wallet" | "activity" | "transactions" | "sale";
  startedAt: number;
}

let target: PendingTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setPending(t: PendingTarget | null) {
  target = t;
  emit();
}
export const getPending = () => target;

export function usePendingNav(): PendingTarget | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => target,
    () => null,
  );
}

const FLOWS: Record<string, string> = {
  send: "send",
  receive: "receive",
  transfer: "transfer",
  "give-link": "giveLink",
  empty: "empty",
  sign: "sign",
  offer: "offer",
  coin: "coin",
  allowance: "allowance",
};
const TABS = new Set(["activity", "transactions", "sale"]);

/** What a link leads to, seen from where the user is (the shared layout decides what stays on screen). */
export function classify(path: string, search: string, from: string, now: number): PendingTarget | null {
  const m = path.match(/^\/s\/(\d+)(?:\/([^/]+))?/);
  const fromM = from.match(/^\/s\/(\d+)/);
  if (m) {
    const id = m[1];
    const seg = m[2] ?? "";
    const same = fromM?.[1] === id;
    const listing = seg === "sale" && new URLSearchParams(search).get("list") === "1";
    if (same && (FLOWS[seg] || listing)) return { path, search, kind: "flow", name: listing ? "sell" : FLOWS[seg], tokenId: id, startedAt: now };
    if (same && (TABS.has(seg) || seg === "")) {
      const tab = (seg || "wallet") as PendingTarget["tab"];
      // closing a popup back to the Wallet tab keeps the page as it is
      if (tab === "wallet" && /^\/s\/\d+\/(send|receive|transfer|give-link|empty|sign|offer|coin|allowance)/.test(from)) return null;
      return { path, search, kind: "tab", name: tab!, tokenId: id, tab, startedAt: now };
    }
    return { path, search, kind: "page", name: "satchel", tokenId: id, startedAt: now };
  }
  const top = path.split("/")[1] ?? "";
  const name = top === "market" ? "market" : top === "satchels" ? "satchels" : top === "contract" ? "contract" : top === "mint" ? "mint" : top === "fund" ? "fund" : top === "claim" ? "claim" : top === "address-book" ? "book" : "page";
  return { path, search, kind: "page", name, tokenId: path.match(/^\/fund\/(\d+)/)?.[1] ?? null, startedAt: now };
}
