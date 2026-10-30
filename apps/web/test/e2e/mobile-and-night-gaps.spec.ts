import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Pages added after the main axe/mobile sweeps (theme-a11y.spec.ts's `pages` list, responsive.spec.ts) were never
 * folded into them: /fund/[id] (public Add coins), /address-book, the Transactions tab, and a held-coin popup
 * (/s/1/coin/btc, distinct from the Inside coin sheets theme-a11y.spec.ts already covers). This checks each at the
 * narrowest supported width (320) for horizontal overflow, and with axe in both Day and stored Night.
 */

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: import("@playwright/test").Page) {
  const r = await new AxeBuilder({ page }).withTags(WCAG_22).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

async function setNight(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("satchel:theme:v1", "night");
    } catch {
      /* ignore */
    }
  });
}

const fits = async (page: import("@playwright/test").Page) => (await page.evaluate(() => document.documentElement.scrollWidth)) <= page.viewportSize()!.width;

const PAGES: { name: string; path: string; ready: (page: import("@playwright/test").Page) => Promise<unknown> }[] = [
  { name: "fund", path: "/fund/1", ready: (p) => expect(p.locator('[data-fund-coin="BTC"]')).toBeVisible() },
  { name: "address-book", path: "/address-book", ready: (p) => expect(p.getByTestId("book-add")).toBeVisible() },
  { name: "transactions", path: "/s/1/transactions", ready: (p) => expect(p.getByRole("link", { name: "Transactions" })).toBeVisible() },
  { name: "coin popup", path: "/s/1/coin/btc", ready: (p) => expect(p.getByRole("dialog")).toBeVisible() },
];

test.describe("mobile (320) and Night + axe for pages the main sweeps missed", () => {
  for (const { name, path, ready } of PAGES) {
    test(`${name}: 320 px has no horizontal overflow, Day and Night are both axe-clean`, async ({ page }) => {
      await useMockWallet(page, ALICE);
      await page.setViewportSize({ width: 320, height: 760 });
      await page.goto(path);
      await ready(page);
      expect(await fits(page), `${path} at 320px`).toBe(true);
      expect(await axe(page)).toEqual([]);

      await setNight(page);
      await page.goto(path);
      await ready(page);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
      expect(await fits(page), `${path} at 320px (Night)`).toBe(true);
      expect(await axe(page)).toEqual([]);
    });
  }
});
