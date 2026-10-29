"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IS_FIXTURE } from "@/lib/config";
import { buildSnapshot } from "@/lib/data/snapshot";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { contractViews } from "@/lib/near/contract";

/**
 * Client refresh of a server-rendered snapshot (kb/90 §8.1: blocking SSR + 15 s client refresh).
 * Live: GET /api/satchels/[id] (cached 15 s server-side). Fixture: rebuild from the in-browser source, which includes
 * the signing/transfer simulation, every 2 s.
 *
 * Deliberately NOT TanStack Query: under cacheComponents, a client hook that reads the clock during render (as
 * useQuery's staleness check does) postpones the prerender and the judge page fails to build without a Suspense
 * fallback. This hook only touches the clock and the network inside the store's subscribe (never during render).
 */

type Listener = (s: SatchelSnapshot) => void;
const shared = new Map<string, { latest: SatchelSnapshot | null; listeners: Set<Listener>; timer: ReturnType<typeof setInterval> | null }>();

async function fetchSnapshot(initial: SatchelSnapshot): Promise<SatchelSnapshot> {
  if (IS_FIXTURE) {
    const src = dataSource();
    const [config, lock] = await Promise.all([contractViews(src.view).config(), src.lock()]);
    return (await buildSnapshot(initial.token_id, src, { config, lock }, Date.now())) ?? initial;
  }
  const r = await fetch(`/api/satchels/${initial.token_id}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`satchel ${r.status}`);
  return (await r.json()) as SatchelSnapshot;
}

function entryFor(key: string) {
  let e = shared.get(key);
  if (!e) {
    e = { latest: null, listeners: new Set(), timer: null };
    shared.set(key, e);
  }
  return e;
}

/** The shared per-token poller as an external store: one timer per token however many components read it. */
export function useLiveSnapshot(initial: SatchelSnapshot): SatchelSnapshot {
  const key = initial.token_id;
  const subscribe = useCallback(
    (onChange: () => void) => {
      const e = entryFor(key);
      const l: Listener = () => onChange();
      e.listeners.add(l);
      const tick = () =>
        fetchSnapshot(initial)
          .then((s) => {
            e.latest = s;
            e.listeners.forEach((fn) => fn(s));
          })
          .catch(() => {
            /* keep the last value; the page shows its age */
          });
      if (!e.timer) {
        void tick();
        e.timer = setInterval(tick, IS_FIXTURE ? 2000 : 15_000);
      }
      return () => {
        e.listeners.delete(l);
        if (e.listeners.size === 0 && e.timer) {
          clearInterval(e.timer);
          e.timer = null;
        }
      };
    },
    [key, initial],
  );
  return useSyncExternalStore(
    subscribe,
    () => shared.get(key)?.latest ?? initial,
    () => initial,
  );
}

/** Force a refresh now (after a tx). */
export function refreshSnapshot(tokenId: string) {
  const e = shared.get(tokenId);
  if (!e?.latest) return;
  void fetchSnapshot(e.latest).then((s) => {
    e.latest = s;
    e.listeners.forEach((fn) => fn(s));
  });
}
