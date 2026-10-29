import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { copy } from "@/lib/copy";
import { THEME_KEY } from "@/lib/theme";

/**
 * A4: Request coins — Add coins' optional amount field (a payment URI + QR + copy/share) and the shareable app link
 * that opens the sheet pre-filled. Functional coverage plus axe in Day and Night (kb/90 §12).
 */

async function setTheme(page: Page, theme: "day" | "night") {
  await page.addInitScript(([key, t]) => window.localStorage.setItem(key as string, t as string), [THEME_KEY, theme] as const);
}

test.describe("Add coins: request an amount", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("no amount yet: the field is empty and the submit reads 'Create QR code'", async ({ page }) => {
    await page.goto("/s/1/receive?chain=btc");
    const amount = page.getByRole("textbox", { name: copy.fund.request.label });
    await expect(amount).toHaveValue("");
    await expect(page.getByRole("button", { name: copy.fund.request.create })).toBeVisible();
    await expect(page.getByText(copy.fund.request.invalid)).toHaveCount(0);
  });

  test("typing an amount and submitting renders the payment URI's QR, the decimal amount, and Copy payment link", async ({ page }) => {
    await page.goto("/s/1/receive?chain=btc");
    const amount = page.getByRole("textbox", { name: copy.fund.request.label });
    await amount.fill("0.001");
    await page.getByRole("button", { name: copy.fund.request.create }).click();
    await expect(page).toHaveURL(/chain=btc&amount=0\.001/);
    await expect(page.getByRole("button", { name: copy.fund.request.update })).toBeVisible();
    await expect(page.getByText("0.001" + " " + "BTC")).toBeVisible();
    const copyBtn = page.getByRole("button", { name: copy.fund.request.copyUriAria });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe("bitcoin:tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5?amount=0.001");
  });

  test("a shared app link (?amount=) pre-fills the field and the QR, server-rendered (no JS needed)", async ({ page }) => {
    await page.goto("/s/1/receive?chain=evm&amount=0.05");
    const amount = page.getByRole("textbox", { name: copy.fund.request.label });
    await expect(amount).toHaveValue("0.05");
    await expect(page.getByText("0.05" + " " + "ETH")).toBeVisible();
    // the EIP-681 URI: integer wei, chain id 11155111, never decimal ETH
    const copyBtn = page.getByRole("button", { name: copy.fund.request.copyUriAria });
    await copyBtn.click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.toLowerCase()).toBe("ethereum:0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad@11155111?value=50000000000000000");
  });

  test("a zero or negative amount is rejected with no QR, in the server HTML (no JS needed)", async ({ page, request }) => {
    for (const bad of ["0", "-1", "abc"]) {
      const raw = await (await request.get(`/s/1/receive?chain=sol&amount=${bad}`)).text();
      expect(raw).toContain(copy.fund.request.invalid);
      expect(raw).not.toContain("solana:");
    }
    await page.goto("/s/1/receive?chain=sol&amount=-1");
    await expect(page.getByText(copy.fund.request.invalid)).toBeVisible();
  });

  test("works with JavaScript disabled: the GET form's submit is an ordinary navigation", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/s/1/receive?chain=btc");
    await page.getByRole("textbox", { name: copy.fund.request.label }).fill("0.002");
    await page.getByRole("button", { name: copy.fund.request.create }).click();
    await expect(page).toHaveURL(/chain=btc&amount=0\.002/);
    await expect(page.getByText("0.002" + " " + "BTC")).toBeVisible();
    await ctx.close();
  });

  for (const theme of ["day", "night"] as const) {
    test(`axe: no serious or critical violations on the request panel (${theme === "day" ? "Day" : "Night"})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto("/s/1/receive?chain=btc&amount=0.001");
      await expect(page).toHaveTitle(/Satchel/);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      const r = await new AxeBuilder({ page }).include("[data-flow-shell]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
    });
  }
});
