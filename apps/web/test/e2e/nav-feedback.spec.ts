import { expect, test, type Page } from "@playwright/test";
import { ALICE, BOB, useMockWallet } from "./helpers";

/**
 * Navigation feedback (lib/nav-pending.ts, NavFeedback): an in-app link shows where it's going at once, until the page
 * is there. The server's answer is held back here so the in-between state can be seen. Also: popups that reopen still
 * close, and Send opens on a coin the Satchel holds.
 */

/** Delay the server's response for a path (the RSC fetch of a client navigation, or the document). */
async function slow(page: Page, path: RegExp, ms = 1500) {
  await page.route(path, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

test.describe("navigation feedback", () => {
  test("a tab of the same Satchel: the tab's area says what it's reading, then the tab arrives", async ({ page }) => {
    await page.goto("/s/1");
    await slow(page, /\/s\/1\/activity(\?|$)/);
    await page.getByRole("link", { name: "Activity", exact: true }).click();
    const sk = page.locator('[data-tab-skeleton="activity"]');
    await expect(sk).toBeVisible();
    await expect(sk).toContainText("Reading this Satchel's record from NEAR testnet");
    await expect(page.locator("[data-nav-progress]")).toBeVisible();
    // the head and tabs stay while it loads
    await expect(page.getByRole("link", { name: "Wallet", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/s\/1\/activity$/, { timeout: 10_000 });
    await expect(sk).toHaveCount(0);
    await expect(page.locator("[data-nav-progress]")).toHaveCount(0);
  });

  test("a popup route opens as a skeleton popup at once", async ({ page }) => {
    await page.goto("/s/2");
    await slow(page, /\/s\/2\/receive(\?|$)/);
    await page.getByRole("link", { name: "Add coins" }).first().click();
    const sk = page.locator('[data-flow-skeleton="receive"]');
    await expect(sk).toBeVisible();
    await expect(sk).toContainText("Add coins");
    await expect(page.getByTestId("receive-flow").getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    await expect(sk).toHaveCount(0);
  });

  test("another page: the page area shows the page it's opening", async ({ page }) => {
    await page.goto("/s/1");
    await slow(page, /\/market(\?|$)/);
    await page.getByRole("link", { name: "Market" }).first().click();
    const sk = page.locator('[data-page-skeleton="market"]');
    await expect(sk).toBeVisible();
    await expect(sk).toContainText("Reading every listing");
    await expect(page.getByRole("heading", { level: 1, name: "Market" })).toBeVisible({ timeout: 10_000 });
    await expect(sk).toHaveCount(0);
  });
});

test.describe("popups", () => {
  test("a popup opened, closed and opened again still closes, and leaves the page usable", async ({ page }) => {
    await page.goto("/s/2");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("link", { name: "Add coins" }).first().click();
      const flow = page.getByTestId("receive-flow");
      await expect(flow.getByRole("dialog")).toBeVisible();
      await flow.getByTestId("flow-close").click();
      await expect(page).toHaveURL(/\/s\/2$/);
      await expect(flow.getByRole("dialog")).toBeHidden();
    }
    // nothing left inert or scroll-locked
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(await page.evaluate(() => document.querySelectorAll("[inert]").length)).toBe(0);
    await page.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(page).toHaveURL(/\/s\/2\/activity$/);
  });

  test("one popup opening another, then closing, leaves nothing locked", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/2/send?chain=sol");
    await page.getByTestId("send-flow").getByRole("link", { name: "Add coins" }).click();
    await expect(page.getByTestId("receive-flow").getByRole("dialog")).toBeVisible();
    await page.getByTestId("receive-flow").getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/s\/2$/);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll("[inert]").length)).toBe(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});

test.describe("Send opens on a coin it holds", () => {
  test("no chain in the link: the first coin it holds", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/2/send");
    await expect(page.getByTestId("send-flow").getByRole("heading", { name: "Send Bitcoin" })).toBeVisible();
  });

  test("an empty chain offers the coins it does hold, one tap away", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/2/send?chain=sol");
    const flow = page.getByTestId("send-flow");
    await expect(flow).toContainText("Nothing to send yet");
    const sw = flow.getByTestId("send-switch").first();
    await expect(sw).toContainText("Send BTC on Bitcoin testnet4");
    await sw.click();
    await expect(flow.getByTestId("amount")).toBeVisible();
    await expect(flow.locator('[data-chain-select="btc"]')).toHaveAttribute("aria-checked", "true");
  });

  test("the owner's Send from the column opens on a held coin", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    await page.getByTestId("action-row").getByRole("link", { name: "Send" }).click();
    await expect(page.getByTestId("send-flow").getByTestId("amount")).toBeVisible();
  });
});
