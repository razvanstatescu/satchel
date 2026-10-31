import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 6: the address-book dropdown inside a Send field (`AddressBook.tsx` `useBookMenu`), with its
 * search box (`mine.length > 5`, only once there are more than five saved entries of that chain — round one's
 * `address-book.spec.ts` test only ever seeded 2), open at 320px, and open in Night with axe.
 */

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(WCAG_22).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

const BTC_ADDRESSES = [
  "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u",
  "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
  "tb1q6rz28mcfaxtmd6v789l9rrlrusdt2mcf6f3flq", // regtest style but valid bech32 shape for this fixture-mode UI test
  "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0g",
  "tb1q0sqzc7xrqk03x7fn4py6nefl8y5gn9fcs8upzz",
  "tb1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde",
];
const ALIASES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

async function seedSixEntries(page: Page) {
  await page.addInitScript(
    ([addrs, aliases]) => {
      if (window.localStorage.getItem("satchel:address-book:v1")) return;
      const list = (addrs as string[]).map((a, i) => ({ id: `e${i}`, kind: "btc", address: a, alias: (aliases as string[])[i], addedAt: i + 1, usedAt: null }));
      window.localStorage.setItem("satchel:address-book:v1", JSON.stringify(list));
    },
    [BTC_ADDRESSES, ALIASES],
  );
}

test.describe("the address-book dropdown's search box (more than 5 entries)", () => {
  test("a search box appears only past 5 entries, and narrows the list by alias or address", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await seedSixEntries(page);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("book-open").click();
    const panel = flow.getByTestId("book-panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator("[data-book-entry]")).toHaveCount(6);
    const search = panel.getByRole("textbox", { name: "Search saved addresses" });
    await expect(search).toBeVisible();
    await expect(search).toBeFocused(); // opening a panel WITH a search box focuses the search box first

    await search.fill("cha");
    await expect(panel.locator("[data-book-entry]")).toHaveCount(1);
    await expect(panel).toContainText("Charlie");
    await expect(panel).not.toContainText("Bravo");

    await search.fill("zzz-no-match");
    await expect(panel.locator("[data-book-entry]")).toHaveCount(0);
    await expect(panel).toContainText("No saved address matches.");
  });

  test("below 5 entries, no search box shows (the house threshold is `length > 5`, not `>= 5`)", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.addInitScript(
      ([addrs, aliases]) => {
        if (window.localStorage.getItem("satchel:address-book:v1")) return;
        const list = (addrs as string[]).slice(0, 5).map((a, i) => ({ id: `e${i}`, kind: "btc", address: a, alias: (aliases as string[])[i], addedAt: i + 1, usedAt: null }));
        window.localStorage.setItem("satchel:address-book:v1", JSON.stringify(list));
      },
      [BTC_ADDRESSES, ALIASES],
    );
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("book-open").click();
    const panel = flow.getByTestId("book-panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator("[data-book-entry]")).toHaveCount(5);
    await expect(panel.getByRole("textbox")).toHaveCount(0);
  });
});

test.describe("the dropdown at 320px and in Night: no overflow, axe-clean", () => {
  test("320px: the dropdown with its search box stays inside the viewport, fully reachable", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await seedSixEntries(page);
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("book-open").click();
    const panel = flow.getByTestId("book-panel");
    await expect(panel).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(fits).toBe(true);
    // every entry is still reachable (not clipped by the popup's max-height; the list itself scrolls)
    await expect(panel.locator("[data-book-entry]")).toHaveCount(6);
    for (const alias of ALIASES) await expect(panel.getByText(alias)).toBeAttached();
  });

  test("Night theme: the dropdown, with its search box open, carries no serious/critical axe violation", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await seedSixEntries(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("satchel:theme:v1", "night");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/s/1/send?chain=btc");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("book-open").click();
    await expect(flow.getByTestId("book-panel")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});
