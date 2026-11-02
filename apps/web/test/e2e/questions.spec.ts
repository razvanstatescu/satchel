import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * /questions (less-labels): the long version of the homepage's Questions. Every answer is in the server HTML (judges
 * see only that), a link to `#q-…` opens its answer, the app's help links land on the right one, the search narrows
 * the list, and the page holds at 320 px and in Night with axe.
 */

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(WCAG_22).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("/questions", () => {
  test("every question and its whole answer is in the server HTML", async ({ request }) => {
    const res = await request.get("/questions");
    expect(res.status()).toBe(200);
    const html = (await res.text()).replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
    for (const q of ["Can I undo a send?", "Why does a signature cost NEAR?", "What's the difference between Transactions and Activity?", "Why does it matter who I give access to?", "What does it cost?"]) expect(html).toContain(q);
    expect(html).toContain("A Bitcoin, Ethereum, Solana or USDC send can't be undone once it's signed");
    expect(html).toContain('id="q-fees-near"');
    expect(html).not.toMatch(/\bPot\b/);
  });

  test("a link to one question opens just that answer", async ({ page }) => {
    await page.goto("/questions#q-undo");
    await expect(page.locator("details#q-undo")).toHaveAttribute("open", "");
    await expect(page.locator("details#q-undo")).toContainText("check the address carefully");
    await expect(page.locator("details#q-dust")).not.toHaveAttribute("open", "");
  });

  test("the allowance help link lands on its answer, open", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    const manage = page.getByTestId("allowance-manage").filter({ visible: true });
    const link = manage.getByRole("link", { name: "Why does it matter who I give access to?" });
    await expect(link).toHaveAttribute("href", "/questions#q-allow-history");
    await link.click();
    await expect(page).toHaveURL(/\/questions#q-allow-history$/);
    await expect(page.locator("details#q-allow-history")).toHaveAttribute("open", "");
  });

  test("search narrows the list, down to a no-match line, and clears", async ({ page }) => {
    await page.goto("/questions");
    const search = page.getByRole("searchbox", { name: "Search questions" });
    await search.fill("bitcoin");
    await expect(page.locator("details#q-allow-btc")).toBeVisible();
    await expect(page.locator("details#q-address-book")).toBeHidden();
    await search.fill("zzzz no such question");
    await expect(page.getByText("No question matches that search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.locator("details#q-address-book")).toBeVisible();
  });

  test("the homepage links to it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "All questions" }).click();
    await expect(page).toHaveURL(/\/questions$/);
    await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible();
  });

  test("at 320 px nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/questions#q-give-link");
    await expect(page.locator("details#q-give-link")).toHaveAttribute("open", "");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const theme of ["day", "night"] as const) {
    test(`axe finds no serious or critical violation, in ${theme === "day" ? "Day" : "Night"}`, async ({ page }) => {
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem("satchel:theme:v1", t);
        } catch {
          /* ignore */
        }
      }, theme);
      await page.goto("/questions#q-fees-near");
      await expect(page.locator("details#q-fees-near")).toHaveAttribute("open", "");
      expect(await axe(page)).toEqual([]);
    });
  }
});
