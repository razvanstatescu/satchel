import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 5: dust/rent-floor amounts.
 *
 * FINDING: round one's doc said "the contract/sim has no dust threshold distinct from ... amount above zero but
 * below a chain's min relay/rent". That's not quite right for BTC: `@satchel/core`'s coin selection
 * (packages/core/src/chains/btc/select.ts) DOES enforce a real dust floor — `DUST.p2wpkh = 294n` sats for a
 * bech32/p2wpkh recipient (the kind every testnet4 address in this suite is). `SendFlow.tsx`'s `prepareErrorText` maps
 * the selection error's code to a sentence that names the minimum in BTC (fixed after round two; it used to show
 * core's raw "minimum is 294 sats" text).
 *
 * SOL's rent rule (E25, "leaves the Satchel below rent") IS reachable in fixture mode. The OTHER rent rule
 * ("below_rent_new_recipient", a brand-new recipient needs the full rent minimum) is NOT reachable in fixture mode:
 * `lib/chains/send.ts`'s fixture `solReads().recipientExists` is hardcoded `true`, so the "new recipient" branch of
 * `checkSolSend` never fires here — a fixture-mode gap, not a product bug.
 */

const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";
const SOL_TO = "8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r";

test.describe("BTC: the dust floor (294 sats for a p2wpkh recipient)", () => {
  test("below dust is refused at Review, saying the minimum in BTC", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.000001"); // 100 sats, below the 294-sat p2wpkh dust floor
    await flow.getByTestId("to").fill(BTC_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    const error = flow.locator('[role="alert"]');
    await expect(error).toContainText("0.00000294 BTC", { timeout: 10_000 });
    await expect(error).not.toContainText("sats");
    await expect(flow.getByTestId("send")).toBeDisabled();
  });

  test("the smallest amount above dust (300 sats) builds a review and sends", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 200 });
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.000003"); // 300 sats, just above the dust floor
    await flow.getByTestId("to").fill(BTC_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.000003 BTC", { timeout: 10_000 });
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });
  });
});

test.describe("SOL: the rent floor (0.00065024 SOL)", () => {
  test("an amount that would leave the Satchel's own address below rent is refused with E25", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=sol");
    const flow = page.getByTestId("send-flow");
    // #1 holds 0.5 SOL (fixtures.ts); 0.4997 leaves ~295,000 lamports after the 5,000-lamport fee — above zero,
    // below the 650,240-lamport rent minimum.
    await flow.getByTestId("amount").fill("0.4997");
    await flow.getByTestId("to").fill(SOL_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    const error = flow.locator('[role="alert"]');
    await expect(error).toContainText("This would leave an account below Solana's minimum balance (0.00065024 SOL). Send more, or send everything.", { timeout: 10_000 });
    await expect(flow.getByTestId("send")).toBeDisabled();
  });

  test("a small amount that leaves plenty of rent behind sends normally", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 200 });
    await page.goto("/s/1/send?chain=sol");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.001"); // leaves ~0.499 SOL behind, well above rent
    await flow.getByTestId("to").fill(SOL_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 SOL", { timeout: 10_000 });
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });
  });
});
