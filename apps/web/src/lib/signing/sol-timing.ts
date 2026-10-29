/**
 * D-09 (kb/90 §8.9): a devnet blockhash lives ≈ 36 s. Review prefetches it and refreshes it every 8 s, so the hash used
 * at the click is ≤ 10 s old, leaving ≥ 26 s for the wallet plus a ≈ 7 s MPC signature. Kept out of the chain bundle
 * (the click handler must not await anything); test/unit pins these to @satchel/core/chains/sol.
 */
export const SOL_BLOCKHASH_MAX_AGE_MS = 10_000;
export const SOL_REFRESH_MS = 8_000;

/** May this prepared SOL message be sent to the wallet now? */
export function solBlockhashFresh(fetchedAt: number, now: number): boolean {
  return now - fetchedAt <= SOL_BLOCKHASH_MAX_AGE_MS;
}
