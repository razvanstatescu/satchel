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
 * After something moved (a send, a deposit, a withdrawal, a sale) the cached route can lag over a minute (server cache
 * plus the CDN's stale-while-revalidate), so `refreshSnapshot` rebuilds the snapshot in the browser from the chains
 * themselves, and keeps doing so for two minutes while they settle (an EVM block, a BTC mempool entry, NEAR finality).
 *
 * Deliberately NOT TanStack Query: under cacheComponents, a client hook that reads the clock during render (as
 * useQuery's staleness check does) postpones the prerender and the judge page fails to build without a Suspense
 * fallback. This hook only touches the clock and the network inside the store's subscribe (never during render).
 */

type Listener = (s: SatchelSnapshot) => void;
const shared = new Map<string, { latest: SatchelSnapshot | null; seed: SatchelSnapshot | null; listeners: Set<Listener>; timer: ReturnType<typeof setInterval> | null; burst: ReturnType<typeof setTimeout>[] }>();

/** The snapshot straight from the chains, built in the browser (no server or CDN cache in the way). */
async function freshSnapshot(initial: SatchelSnapshot): Promise<SatchelSnapshot> {
  const src = dataSource();
  const [config, lock] = await Promise.all([contractViews(src.view).config(), src.lock()]);
  const s = await buildSnapshot(initial.token_id, src, { config, lock }, Date.now());
  return s ?? initial;
}

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
    e = { latest: null, seed: null, listeners: new Set(), timer: null, burst: [] };
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
      e.seed ??= initial;
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

/** Re-read at these offsets (ms) after something moved: the chains settle at different speeds. */
const BURST_MS = [0, 3_000, 8_000, 15_000, 30_000, 60_000, 120_000];

/**
 * Something moved (a send, a deposit, a withdrawal, a sale): read the snapshot fresh from the chains now, and again
 * over the next two minutes. Every reader of this token (card, holdings, overview, popups) follows.
 */
export function refreshSnapshot(tokenId: string) {
  const e = entryFor(tokenId);
  e.burst.forEach(clearTimeout);
  e.burst = BURST_MS.map((ms) =>
    setTimeout(() => {
      const base = e.latest ?? e.seed;
      if (!base) return;
      void freshSnapshot(base)
        .then((s) => {
          e.latest = s;
          e.listeners.forEach((fn) => fn(s));
        })
        .catch(() => {
          /* keep the last value; the next read tries again */
        });
    }, ms),
  );
}
