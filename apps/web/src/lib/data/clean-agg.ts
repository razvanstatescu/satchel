import type { Aggregate, ItemStatus } from "@/lib/data/types";

/** The small, dependency-free parts of the clean-history model, importable from client islands without the
 * fixtures or the chain policy code (`clean.ts` re-exports them). */

export const buyEnabled = (a: Aggregate) => a === "clean" || a === "empty";

/** Counts used by the verdict and GateLine copy. */
export function counts(items: { status: ItemStatus | "checking" }[]) {
  const c = { spent: 0, expired: 0, unfunded: 0, foreign: 0, message: 0, settling: 0, unused: 0, unknown: 0, checking: 0 };
  for (const i of items) c[i.status as keyof typeof c]++;
  return c;
}
