import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 1: balances follow a send without a page reload. `RefreshAfterSend.tsx` (mounted once in the app
 * shell) watches every intent and re-reads the Satchel's snapshot (`refreshSnapshot`) the moment one reaches "sent"
 * or "confirmed" — this asserts the Wallet tab's holding amount actually changes in the SAME page instance, with no
 * `page.reload()` anywhere in the test.
 *
 * Satchel #1 (fixtures.ts FIXTURE_BALANCES) holds 189,718 sats (0.00189718 BTC) across two coins (139,718 + 50,000).
 */

const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

test.describe("balances refresh after a confirmed send, no reload", () => {
  test("the Wallet tab's BTC holding amount drops once the send confirms", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1");
    const holding = page.locator('[data-holding="btc"] [data-balance="btc"]');
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

    // close the popup (a client navigation, not a reload) and read the Wallet tab underneath: the amount already
    // moved — RefreshAfterSend fired on the "sent" stage transition, no window.location.reload anywhere in this test.
    await flow.getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/s\/1$/);
    await expect(holding).not.toHaveText("0.00189718 BTC", { timeout: 10_000 });
    await expect(holding).toHaveText(/0\.0017\d+ BTC/); // 189,718 − 10,000 sats, minus the fee
  });

  test("an EVM send's ETH holding amount drops on the Satchel page itself, no navigation at all", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1/send?chain=evm");
    const flow = page.getByTestId("send-flow");
    const before = await page.locator('[data-holding="evm"] [data-balance="evm"]').textContent();
    await flow.getByTestId("amount").fill("0.001");
    await flow.getByTestId("to").fill("0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a");
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 ETH");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "confirmed", { timeout: 20_000 });

    // the Wallet tab sits right behind the popup (same DOM, same page instance): its number already changed.
    const holding = page.locator('[data-holding="evm"] [data-balance="evm"]');
    await expect(holding).not.toHaveText(before ?? "", { timeout: 10_000 });
  });
});
