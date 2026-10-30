import { expect, test } from "@playwright/test";

/**
 * The Transactions tab (lib/chain-txs.ts): the page renders at once; the list fills in from the browser, every source
 * in parallel through /api/satchels/[id]/txs. Fixture history for Satchel #1.
 */

test.describe("Transactions tab", () => {
  test("the endpoint serves one source at a time, and lists the sources", async ({ request }) => {
    expect(await (await request.get("/api/satchels/1/txs")).json()).toMatchObject({ sources: expect.arrayContaining(["bitcoin", "sepolia", "base", "optimism", "near"]) });
    const btc = await (await request.get("/api/satchels/1/txs?source=bitcoin")).json();
    expect(btc.ok).toBe(true);
    expect(btc.txs.every((t: { network: string }) => t.network === "bitcoin")).toBe(true);
    expect((await request.get("/api/satchels/1/txs?source=arbitrum")).status()).toBe(400);
  });

  test("is its own tab beside Activity; rows from every source merge into one timeline", async ({ page }) => {
    await page.goto("/s/1");
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL(/\/s\/1\/transactions$/);
    await expect(page.getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    const main = page.locator("[data-transactions]");
    await expect(main.locator("[data-tx-list]")).not.toHaveAttribute("data-tx-loading", "");
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

  test("shows loading rows first, then each source as it lands; a failed source can be retried", async ({ page }) => {
    let failBase = true;
    await page.route("**/api/satchels/1/txs?source=*", async (route) => {
      const url = route.request().url();
      if (url.endsWith("source=sepolia")) await new Promise((r) => setTimeout(r, 1500)); // a slow source
      if (url.endsWith("source=base") && failBase) return route.fulfill({ status: 502, json: { key: "base", ok: false, txs: [] } });
      return route.continue();
    });
    await page.goto("/s/1/transactions");
    const list = page.locator("[data-tx-list]");
    // the fast sources show while Sepolia is still being read
    await expect(list.locator('[data-tx^="bitcoin:"]').first()).toBeVisible();
    await expect(list.locator("[data-tx-reading]")).toContainText("Ethereum Sepolia");
    await expect(list.locator('[data-tx^="sepolia:"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(list.locator("[data-tx-reading]")).toHaveCount(0);
    // Base failed: said so, with Try again
    await expect(list.locator("[data-tx-failed]")).toContainText("Couldn't read Base Sepolia just now.");
    failBase = false;
    await list.getByRole("button", { name: "Try again" }).click();
    await expect(list.locator('[data-tx^="base:"]').first()).toBeVisible();
    await expect(list.locator("[data-tx-failed]")).toHaveCount(0);
  });

  test("filters by chain at once, and keeps the filter in the URL", async ({ page }) => {
    await page.goto("/s/1/transactions");
    const list = page.locator("[data-tx-list]");
    await expect(list).not.toHaveAttribute("data-tx-loading", "");
    await list.getByRole("radio", { name: "Ethereum" }).click();
    await expect(page).toHaveURL(/filter=ethereum/);
    const rows = list.locator("[data-tx]");
    await expect(rows).toHaveCount(6);
    for (const id of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-tx") ?? ""))) expect(id).toMatch(/^(sepolia|base|optimism):/);
    await list.getByRole("radio", { name: "Inside" }).click();
    await expect(rows).toHaveCount(1);
    await expect(list.locator("[data-tx-sources]")).not.toContainText("Arbitrum");
    // a shared ?filter= opens on that chain
    await page.goto("/s/1/transactions?filter=bitcoin");
    await expect(list.getByRole("radio", { name: "Bitcoin" })).toBeChecked();
  });
});
