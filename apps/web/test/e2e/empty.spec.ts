import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * A3 Empty the Satchel (plan/feature-ideas.md A3), fixture mode: one address per chain, then one `sign_for` per
 * chain in sequence (BTC/ETH/SOL), each landing as its own pending intent (SigningProgress), with a summary at the
 * end. No testnet tx; the mock wallet + in-browser sim stand in for the wallet and the chains.
 */

const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";
const EVM_TO = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a";
const SOL_TO = "8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r";

test.describe("empty the Satchel", () => {
  test("takes out every coin it holds, on every network and inside, one send at a time", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 200 });
    await page.goto("/s/1/empty");
    const flow = page.getByTestId("empty-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();

    await flow.getByTestId("empty-addr-btc").fill(BTC_TO);
    await flow.getByTestId("empty-addr-evm").fill(EVM_TO);
    await flow.getByTestId("empty-addr-sol").fill(SOL_TO);
    await expect(flow.getByTestId("empty-review")).toBeEnabled();
    await flow.getByTestId("empty-review").click();

    // the plan: BTC; Sepolia USDC then ETH; Base USDC then ETH; OP ETH; SOL; NEAR inside. Arbitrum's USDC has no ETH
    // there for the fee, so it is named instead of planned.
    const plan = flow.getByTestId("empty-plan");
    await expect(plan.locator("[data-empty-job]")).toHaveCount(8);
    expect(await plan.locator("[data-empty-job]").evaluateAll((els) => els.map((e) => e.getAttribute("data-empty-job")))).toEqual([
      "btc",
      "evm-11155111-usdc",
      "evm",
      "evm-84532-usdc",
      "evm-84532-eth",
      "evm-11155420-eth",
      "sol",
      "inside-near",
    ]);
    await expect(flow.getByTestId("empty-stuck")).toContainText("Arbitrum Sepolia");
    await flow.getByTestId("empty-start").click();

    // one approval per coin, each tracked to completion before the next one's button appears
    for (let i = 0; i < 8; i++) {
      await expect(flow.getByTestId("empty-send")).toBeEnabled({ timeout: 30_000 });
      await flow.getByTestId("empty-send").click();
    }

    await expect(page.getByText(/Everything's out|Some coins didn't go through/)).toBeVisible({ timeout: 30_000 });
    const results = flow.getByTestId("empty-results");
    for (const key of ["btc", "evm", "evm-84532-usdc", "sol", "inside-near"]) await expect(results.getByTestId(`empty-result-${key}`)).toBeVisible();
  });

  test("is disabled while the Satchel is listed (signing paused)", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    // Satchel #4 is a fixture listing owned by Alice (listing.id 4): signing is paused while listed.
    await page.goto("/s/4/empty");
    const guard = page.getByTestId("empty-guard");
    await expect(guard).toBeVisible();
    await expect(guard).toContainText("Paused for sale");
  });
});
