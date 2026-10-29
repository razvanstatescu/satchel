import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * A2 Give by link (plan/feature-ideas.md A2), fixture mode: the giver creates a claim link (one wallet call that
 * funds a fresh implicit account and transfers the Satchel to it), then the link's `/claim#<secret>` page shows what
 * it holds and claims it, all offline via the mock wallet + in-browser sim (no testnet tx).
 */

test.describe("give by link", () => {
  test("creates a link, the secret never leaves the fragment, and claiming moves the Satchel", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1/give-link");
    const flow = page.getByTestId("give-link-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();

    await flow.getByTestId("create-link").click();
    await expect(flow.getByTestId("give-link-done")).toBeVisible({ timeout: 10_000 });

    const url = await flow.getByTestId("claim-url").textContent();
    expect(url).toBeTruthy();
    const parsed = new URL(url!.trim());
    expect(parsed.pathname).toBe("/claim");
    // the secret is in the fragment, never a query param
    expect(parsed.search).toBe("");
    expect(parsed.hash.length).toBeGreaterThan(10);

    // the owner no longer owns Satchel #1 (it moved to the fresh implicit account)
    await page.goto("/s/1");
    await expect(page.getByTestId("action-row")).toHaveCount(0);

    // open the claim link (same tab, same fixture sim) and claim it
    await page.goto(`/claim${parsed.hash}`);
    const claim = page.getByTestId("claim-flow");
    await expect(claim.getByTestId("claim-balance-1")).toBeVisible({ timeout: 10_000 });
    await claim.getByTestId("claim-to-wallet").click();
    await expect(claim.getByText("Claimed")).toBeVisible({ timeout: 10_000 });
    await expect(claim.getByRole("link", { name: /View Satchel #1/ })).toBeVisible();

    // a second visit to the same link: the implicit account is now empty (reload, since goto to the identical
    // URL — same path AND hash — is a same-document no-op in Chromium and would just show the stale "Claimed" page)
    await page.reload();
    await expect(page.getByRole("heading", { name: "Already claimed" })).toBeVisible({ timeout: 10_000 });
  });

  test("an invalid or missing link is handled clearly", async ({ page }) => {
    await useMockWallet(page, null);
    await page.goto("/claim");
    await expect(page.getByText("This isn't a claim link")).toBeVisible();
    await page.goto("/claim#not-a-real-secret");
    await expect(page.getByText("This link isn't valid")).toBeVisible();
  });

  test("warns clearly that the link is a bearer token", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.goto("/s/1/give-link");
    const flow = page.getByTestId("give-link-flow");
    await expect(flow.getByText(/cash in an envelope/i)).toBeVisible();
  });
});
