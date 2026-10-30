import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 1 (docs/testing/ui.md "What remains untested"): a confirmed send must update the Wallet tab's
 * numbers WITHOUT a page.reload() - the client reads the live fixture simulation, and RefreshAfterSend.tsx
 * (mounted once in the app shell) re-reads the snapshot once a send reaches "sent"/"confirmed". This asserts the
 * holding amount and the SatchelCard's own number both change after closing back to /s/1, using only client
 * navigation (page.goto to a different route is a Next.js client transition, never a full reload; this spec never
 * calls page.reload()).
 *
 * Fixture Satchel #1 (fixtures.ts FIXTURE_BALANCES) holds 0.00189718 BTC total across two coins (139,718 + 50,000
 * sats, see allowance.spec.ts / btc-one-coin.test.ts) - see flows.spec.ts's own assertion of this starting number.
 */

const BTC_RECIPIENT = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

test.describe("balances follow a confirmed send without a reload", () => {
  test("the Wallet tab's BTC holding and the card's own number both drop after a send, with no page.reload()", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 500 });
    await page.goto("/s/1");

    const holdingAmount = page.locator('[data-holding="btc"] [data-balance="btc"]');
    await expect(holdingAmount).toHaveText("0.00189718 BTC");
    const cardLine = page.locator("#satchel-card li", { hasText: "BTC" });
    const cardBefore = await cardLine.textContent();
    expect(cardBefore).toContain("0.00189718");

    // a client-side navigation to the Send route (not a reload)
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill(BTC_RECIPIENT);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0001 BTC");
    await flow.getByTestId("send").click();
    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });

    // close back to /s/1 - a client-side transition driven by the close link, never page.reload()
    await flow.getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/s\/1$/);

    await expect(holdingAmount).not.toHaveText("0.00189718 BTC", { timeout: 20_000 });
    await expect(holdingAmount).toContainText("BTC");
    const cardAfter = await cardLine.textContent();
    expect(cardAfter).not.toBe(cardBefore);
  });
});
