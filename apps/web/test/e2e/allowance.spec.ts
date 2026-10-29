import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DANA } from "@/lib/data/fixtures";
import { ALICE, CAROL, useMockWallet } from "./helpers";

/**
 * C5 spending allowance (docs/specs/C5.md): the owner adds, sees and revokes someone else's access; a delegate sends
 * within the daily cap and is refused over it; the server HTML names the existing access without JavaScript; and the
 * owner's sheet (/s/1/allowance) carries no serious or critical axe violations in Day or Night.
 *
 * Satchel #1 (fixtures.ts) is owned by ALICE and already lets DANA spend up to 0.0005 BTC and 0.02 ETH a day.
 */

const BTC_RECIPIENT = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u"; // a valid testnet4 address (flows.spec.ts)

test.describe("C5: server HTML (no JS) names the existing access and its caps", () => {
  test.use({ javaScriptEnabled: false });

  test("/s/1 renders the public allowances fact without JavaScript", async ({ page }) => {
    await page.goto("/s/1");
    const facts = page.getByTestId("allowance-facts");
    await expect(facts).toBeVisible();
    await expect(facts).toContainText(DANA);
    await expect(facts).toContainText("BTC");
    await expect(facts).toContainText("ETH");
    await expect(facts).toContainText("No expiry");
  });
});

test.describe("C5: the owner adds, sees and revokes", () => {
  test("Alice lets Carol spend a BTC cap, sees her listed, then revokes her (Dana is untouched)", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");

    // A client navigation keeps the previous route's DOM around (hidden) until it settles, so a bare testid can
    // briefly resolve twice right after the Add sheet closes (kb/90 §8.1 note, SatchelPage.tsx idsFor); filtering
    // to the visible one is the house fix for a testid that isn't token-scoped.
    const manage = page.getByTestId("allowance-manage").filter({ visible: true });
    await expect(manage).toBeVisible();
    await expect(manage).toContainText(DANA);
    await expect(manage).not.toContainText(CAROL);

    await manage.getByTestId("add-allowance").click();
    const flow = page.getByTestId("allowance-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await flow.getByTestId("allowance-to").fill(CAROL);
    await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
    await flow.getByTestId("allowance-review").click();
    await flow.getByTestId("allowance-cap-btc").check();
    await flow.getByTestId("allowance-cap-btc-amount").fill("0.0001");
    await flow.getByTestId("allowance-submit").click();

    await expect(page).toHaveURL(/\/s\/1$/);
    await expect(manage).toContainText(CAROL);
    await expect(manage).toContainText(DANA); // adding Carol never touches Dana's existing access

    // the public, server-safe facts also carry it after a reload (a judge fact, kb/90 §8.1)
    await page.reload();
    await expect(page.getByTestId("allowance-facts")).toContainText(CAROL);

    await manage.locator("li", { hasText: CAROL }).getByTestId("revoke-allowance").click();
    await expect(manage).not.toContainText(CAROL);
    await expect(manage).toContainText(DANA);
  });

  test("blocked past 4 live accounts", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    const addAllowance = page.getByTestId("add-allowance").filter({ visible: true });
    // Dana already holds one of the 4; add three more to reach the limit.
    for (const who of ["frank.satchelhq.testnet", "grace.satchelhq.testnet", "henry.satchelhq.testnet"]) {
      await addAllowance.click();
      const flow = page.getByTestId("allowance-flow");
      await flow.getByTestId("allowance-to").fill(who);
      await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
      await flow.getByTestId("allowance-review").click();
      await flow.getByTestId("allowance-cap-sol").check();
      await flow.getByTestId("allowance-cap-sol-amount").fill("0.01");
      await flow.getByTestId("allowance-submit").click();
      await expect(page).toHaveURL(/\/s\/1$/);
    }
    await expect(addAllowance).toBeDisabled();
  });
});

test.describe("C5: a delegate sends within the cap and is refused over it", () => {
  test("Dana sees her remaining caps, sends within the BTC cap, then is blocked over the remaining amount", async ({ page }) => {
    await useMockWallet(page, DANA, { delay: 800 });
    await page.goto("/s/1");
    const banner = page.getByTestId("delegate-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("0.0005"); // the fixture's BTC cap (50,000 sats), untouched yet
    await expect(banner).toContainText("0.0200"); // the fixture's ETH cap (0.02 ETH)

    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await expect(flow.getByTestId("allowance-remaining")).toContainText("0.0005");
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill(BTC_RECIPIENT);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0001 BTC");
    await flow.getByTestId("send").click();
    // BTC confirmation polls on a 30 s interval (lib/signing/runner.ts); "sent" (broadcast, unconfirmed) already proves
    // the delegate's send went through end to end, same bar as flows.spec.ts's own EVM/BTC send tests.
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });

    // the remaining amount dropped: a second send under the ORIGINAL cap but over what's left now is refused client-side
    await page.goto("/s/1/send?chain=btc");
    const flow2 = page.getByTestId("send-flow");
    await expect(flow2.getByTestId("allowance-remaining")).not.toContainText("0.0005");
    // the full original cap is always over what's left now (any amount + the BTC fee was already spent)
    await flow2.getByTestId("amount").fill("0.0005");
    await flow2.getByTestId("to").fill(BTC_RECIPIENT);
    await expect(flow2.getByTestId("recipient-resolved")).toBeVisible();
    await expect(flow2.getByTestId("review")).toBeDisabled();
    await expect(flow2).toContainText(/over today's remaining amount/);
  });

  test("a stranger with no access at all is still refused", async ({ page }) => {
    await useMockWallet(page, "erin.satchelhq.testnet");
    await page.goto("/s/1/send?chain=evm");
    await expect(page.getByTestId("send-flow")).toContainText("You don't own Satchel #1");
  });
});

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function axe(page: Page, include?: string) {
  const b = include ? new AxeBuilder({ page }).withTags(WCAG_22).include(include) : new AxeBuilder({ page }).withTags(WCAG_22);
  const r = await b.analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("C5: accessibility (axe, WCAG 2.0-2.2 A/AA) for the Add sheet, Day and Night", () => {
  for (const theme of ["day", "night"] as const) {
    test(`/s/1/allowance in ${theme === "day" ? "Day" : "Night"}`, async ({ page }) => {
      if (theme === "night") {
        await page.addInitScript(() => {
          try {
            window.localStorage.setItem("satchel:theme:v1", "night");
          } catch {
            /* ignore */
          }
        });
      }
      await useMockWallet(page, ALICE);
      await page.goto("/s/1/allowance");
      await expect(page.getByTestId("allowance-flow").getByRole("dialog")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      expect(await axe(page)).toEqual([]);
    });
  }

  test("the owner's /s/1 (the facts list + the manage panel) carries no serious violation either", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    await page.waitForLoadState("networkidle");
    expect(await axe(page)).toEqual([]);
  });
});
