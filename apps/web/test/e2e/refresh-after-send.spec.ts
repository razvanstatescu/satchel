import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 1: does anything change on the Satchel page after a send confirms, without a page reload?
 * `RefreshAfterSend.tsx` (mounted once in the app shell) watches every intent and calls `refreshSnapshot` the moment
 * one reaches "sent" or "confirmed", which re-reads the snapshot in the browser and fires a burst of re-reads over
 * the next two minutes (lib/data/client.ts BURST_MS).
 *
 * FINDING while writing this test: in fixture mode, a confirmed BTC/EVM/SOL send does NOT change the Wallet tab's
 * *chain balance* number. `lib/data/source.ts`'s fixture `balances()` always returns the static `FIXTURE_BALANCES`
 * dict regardless of what the simulation has signed — `lib/chains/send.ts`'s own comment on `fixtureEvmBalance`
 * says so explicitly ("the static world; the sim never moves EVM balances"), and `fixtureUtxos`'s "already spent"
 * tracking only prevents a UTXO being reused as an INPUT later in the same session; it is never subtracted from the
 * displayed total. So RefreshAfterSend's refetch always lands on the same static numbers for a chain balance — this
 * is by design (fixture mode is a frozen world for native balances, not a ledger), not a bug, but it means the one
 * thing that visibly DOES move after a send — without any reload — is the clean-history signature count
 * (`live.sig_count`, `[data-fact-sig-count]` on /s/[id], server-rendered as a judge fact per kb/90 §8.1) and the
 * signing tracker itself. This test asserts that, and pins down the static-balance behavior as a regression guard
 * (if someone later makes fixture balances overlay-aware, this assertion should be revisited, not silently broken).
 */

const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

test.describe("the Satchel page updates after a confirmed send, no reload", () => {
  test("the signature count fact increments right after a BTC send confirms; the chain balance does not (fixture mode is static)", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1");
    const sigCount = page.locator("[data-fact-sig-count]").filter({ visible: true });
    const holding = page.locator('[data-holding="btc"] [data-balance="btc"]').filter({ visible: true });
    await expect(sigCount).toHaveText("2"); // fixtures.ts: Satchel #1 starts with 2 signed records
    await expect(holding).toHaveText("0.00189718 BTC");

    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill(BTC_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0001 BTC");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });

    // close the popup with a client navigation (never window.location.reload) and read the page underneath:
    // RefreshAfterSend already fired on the "sent" stage transition.
    await flow.getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/s\/1$/);
    await expect(sigCount).toHaveText("3", { timeout: 10_000 });
    // the chain balance is the static fixture world: still the pre-send number (see the FINDING above).
    await expect(holding).toHaveText("0.00189718 BTC");
  });

  test("the same holds for an EVM send: sig count moves, the ETH balance number is unchanged by design", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1/send?chain=evm");
    const flow = page.getByTestId("send-flow");
    const holding = page.locator('[data-holding="evm"] [data-balance="evm"]').filter({ visible: true });
    const before = await holding.textContent();
    await flow.getByTestId("amount").fill("0.001");
    await flow.getByTestId("to").fill("0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a");
    await flow.getByTestId("review").click();
    // a lowercase (no-checksum) address needs the explicit ack before Send is live (send-validation.spec.ts)
    await flow.getByLabel("I checked this address").check();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 ETH");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "confirmed", { timeout: 20_000 });

    // the Wallet tab sits right behind the popup, same page instance, no navigation at all
    await flow.getByTestId("flow-close").click();
    await expect(page.locator("[data-fact-sig-count]").filter({ visible: true })).toHaveText("3", { timeout: 10_000 });
    await expect(holding).toHaveText(before ?? "");
  });
});
