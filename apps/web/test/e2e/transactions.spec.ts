import { expect, test } from "@playwright/test";

/** The Transactions tab (lib/chain-txs.ts): fixture history for Satchel #1, server-rendered, filterable without JS. */

test.describe("Transactions tab", () => {
  test("is its own tab, beside Activity, and server-renders every chain's rows", async ({ page, request }) => {
    const html = await (await request.get("/s/1/transactions")).text();
    expect(html).toContain('data-direction="in"');
    expect(html).toContain('data-direction="out"');
    await page.goto("/s/1");
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL(/\/s\/1\/transactions$/);
    await expect(page.getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    const main = page.locator("[data-transactions]");
    // pending on top, then newest first; a send shows its fee; each row opens its explorer
    await expect(main.locator("[data-tx]").first()).toHaveAttribute("data-status", "pending");
    const send = main.locator('[data-tx^="bitcoin:"][data-direction="out"]');
    await expect(send).toContainText("Sent");
    await expect(send).toContainText("−0.00010282");
    await expect(send).toContainText("fee");
    await expect(send).toHaveAttribute("href", /mempool\.space\/testnet4\/tx\//);
    await expect(send).toHaveAttribute("target", "_blank");
    await expect(main.locator('[data-tx^="base:"][data-tx$=":USDC"]')).toContainText("+10.00");
    await expect(main.locator('[data-tx^="near:"]')).toContainText("Inside on NEAR testnet");
    await expect(main.locator("[data-tx-sources]")).toContainText("Arbitrum Sepolia isn't listed here yet.");
  });

  test("filters by chain", async ({ page }) => {
    await page.goto("/s/1/transactions");
    const main = page.locator("[data-transactions]");
    await main.getByRole("navigation", { name: "Show" }).getByRole("link", { name: "Ethereum" }).click();
    await expect(page).toHaveURL(/filter=ethereum/);
    const rows = main.locator("[data-tx]");
    await expect(rows).toHaveCount(6);
    for (const id of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-tx") ?? ""))) expect(id).toMatch(/^(sepolia|base|optimism):/);
    await main.getByRole("navigation", { name: "Show" }).getByRole("link", { name: "Inside" }).click();
    await expect(rows).toHaveCount(1);
    await expect(main.locator("[data-tx-sources]")).not.toContainText("Arbitrum");
  });
});
