import type { Page } from "@playwright/test";

export const ALICE = "alice.satchelhq.testnet";
export const BOB = "bob.satchelhq.testnet";
export const CAROL = "carol.satchelhq.testnet";

/** Final #1 addresses (research/final-addresses.md, cross-checked against the live MPC). */
export const ADDR1 = {
  btc: "tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5",
  evm: "0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad",
  sol: "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd",
};

/**
 * Fixture-mode mock wallet + simulation knobs, set before any page script runs.
 *
 * `onboarding` (default false): the first-time onboarding overlay (lib/onboarding-storage.ts) would otherwise show
 * on every spec's first connected load, since every spec here IS "a first wallet connect in this browser". Unless a
 * spec passes `{ onboarding: true }` to test the overlay itself, this pre-seeds `satchel:onboarding:v1` as already
 * done, so the rest of the suite never sees it.
 */
export async function useMockWallet(
  page: Page,
  account: string | null,
  knobs: { mode?: "normal" | "timeout" | "broadcast-fail"; delay?: number; reject?: boolean; onboarding?: boolean } = {},
) {
  await page.addInitScript(
    ([acct, k]) => {
      try {
        if (window.sessionStorage.getItem("__e2e_init")) return; // only on the first load of this tab (reload = resume)
        window.sessionStorage.setItem("__e2e_init", "1");
        if (acct) window.localStorage.setItem("satchel:mock-wallet", acct as string);
        else window.localStorage.removeItem("satchel:mock-wallet");
        const kn = k as { mode?: string; delay?: number; reject?: boolean; onboarding?: boolean };
        window.localStorage.setItem("satchel:sim:mode", kn.mode ?? "normal");
        window.localStorage.setItem("satchel:sim:delay", String(kn.delay ?? 1500));
        if (kn.reject) window.localStorage.setItem("satchel:mock-wallet:reject", "1");
        else window.localStorage.removeItem("satchel:mock-wallet:reject");
        if (!kn.onboarding) {
          window.localStorage.setItem("satchel:onboarding:v1", JSON.stringify({ v: 1, doneAt: Date.now(), skippedSurvey: true, submitted: false }));
        } else {
          window.localStorage.removeItem("satchel:onboarding:v1");
        }
      } catch {
        /* ignore */
      }
    },
    [account, knobs] as const,
  );
}
