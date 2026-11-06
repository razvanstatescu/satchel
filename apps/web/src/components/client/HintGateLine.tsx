"use client";

import { GateLine, checkedAgo, hintModel } from "@/components/Clean";
import { utcShort } from "@/lib/utc-time";
import { useNow } from "@/lib/clock";
import type { Aggregate } from "@/lib/data/types";

/**
 * The market card's server-check line. The server HTML carries the fact with its absolute time ("Server check at
 * Nov 6, 02:40 UTC: clean"), so the page prerenders and paints at once (no request-time render, no Suspense fallback);
 * once hydrated this island swaps in the relative time ("Server check 2 min ago: clean") from the shared 1 s clock.
 */
export function HintGateLine({ at, aggregate }: { at: number; aggregate: Aggregate }) {
  const now = useNow();
  const t = now ? checkedAgo(at, now) : `at ${utcShort(at)}`;
  return <GateLine model={hintModel(aggregate, t)} />;
}
