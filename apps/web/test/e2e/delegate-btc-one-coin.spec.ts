import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 4: AUDIT-01 (C5) app side. A delegate's Bitcoin send is built with `oneInput: true`
 * (lib/chains/send.ts `prepareSend`), so it can spend only ONE of the Satchel's bitcoin UTXOs — the contract's
 * signature commits to the amount the allowance cap is charged against, and that only holds if exactly one coin is
 * spent. Satchel #1 (fixtures.ts) has two fixture coins, 139,718 and 50,000 sats (lib/chains/send.ts `fixtureUtxos`:
 * the total confirmed balance minus 50,000 is the "big" coin when the total exceeds 60,000).
 *
 * A delegate cap big enough to cover an amount that NEITHER coin alone can pay must show the one-coin message,
 * naming the largest coin, BEFORE the wallet ever opens (`prepare()` runs on the Review click, not on Send). An
 * amount that fits inside one coin must still succeed end to end.
 */

const NINA = "nina.satchelhq.testnet";
const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

async function grantNinaBtcCap(page: import("@playwright/test").Page) {
  await useMockWallet(page, ALICE);
  await page.goto("/s/1/allowance");
  const flow = page.getByTestId("allowance-flow");
  await flow.getByTestId("allowance-to").fill(NINA);
  await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
  await flow.getByTestId("allowance-review").click();
  await flow.getByTestId("allowance-cap-btc").check();
  // 0.0017 BTC = 170,000 sats: under the #1's 189,718 sat total, but above either single coin (139,718 / 50,000),
  // so a 150,000 sat send is within the cap yet unpayable from one coin alone.
  await flow.getByTestId("allowance-cap-btc-amount").fill("0.0017");
  await flow.getByTestId("allowance-submit").click();
  await expect(page).toHaveURL(/\/s\/1$/, { timeout: 10_000 });
}

test.describe("AUDIT-01: a delegate's BTC send spends one coin at a time", () => {
  test("an amount neither coin alone can pay shows the one-coin message, naming the largest coin, before the wallet opens", async ({ page }) => {
    await grantNinaBtcCap(page);
    await page.evaluate((who) => localStorage.setItem("satchel:mock-wallet", who), NINA);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await expect(flow.getByTestId("allowance-remaining")).toContainText("0.0017");
    await flow.getByTestId("amount").fill("0.0015"); // 150,000 sats: over either single coin, under the 0.0017 cap
    await flow.getByTestId("to").fill(BTC_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();

    const error = flow.locator('[role="alert"]');
    await expect(error).toContainText(
      "With this access, a bitcoin send can spend only one of this Satchel's bitcoin deposits at a time. The largest holds 0.00139718 BTC, and the fee comes out of it too. Send less.",
      { timeout: 10_000 },
    );
    // the wallet never opened: Send stays disabled, there's nothing prepared to approve.
    await expect(flow.getByTestId("send")).toBeDisabled();
  });

  test("an amount that fits inside the larger coin sends normally", async ({ page }) => {
    await grantNinaBtcCap(page);
    await page.evaluate((who) => localStorage.setItem("satchel:mock-wallet", who), NINA);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.0004"); // 40,000 sats: fits in either coin, well under the fee-adjusted max
    await flow.getByTestId("to").fill(BTC_TO);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0004 BTC", { timeout: 10_000 });
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });
  });
});
