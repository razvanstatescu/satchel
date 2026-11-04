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
const RECIPIENT_EVM = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a"; // multichain.spec.ts's own recipient (warning tier: needs the ack)
const IVY = "ivy.satchelhq.testnet";

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

test.describe("R3-A-1 / R3-A-2: what an owner is told about other people's access", () => {
  test("each row says what the clean-history check found, and the Sell sheet says to revoke first", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    const manage = page.getByTestId("allowance-manage").filter({ visible: true });
    const row = manage.locator("li", { hasText: DANA });
    await expect(row.getByTestId("delegate-sigs")).not.toContainText("Checking", { timeout: 15_000 });

    await page.goto("/s/1/sale?list=1");
    const notice = page.getByTestId("sell-flow").getByTestId("revoke-first-notice");
    await expect(notice).toContainText("restarts the quiet period");
    await expect(notice.getByRole("link", { name: "Review who can spend" })).toHaveAttribute("href", "/s/1#allowance-manage");
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
    // R3-A-1: the confirmation says plainly that revoking stops only new signatures, and links to the settle guidance
    const confirm = manage.getByTestId("revoke-confirm");
    await expect(confirm).toContainText("stops only new signatures");
    await expect(confirm.getByRole("link", { name: "How to clear it" })).toBeVisible();
    await manage.locator("li", { hasText: CAROL }).getByTestId("confirm-revoke").click();
    await expect(manage).not.toContainText(CAROL);
    await expect(manage).toContainText(DANA);
  });

  test("blocked past 4 live accounts", async ({ page }) => {
    await useMockWallet(page, ALICE);
    // Dana already holds one of the 4; add three more to reach the limit, each time through the manage panel's own Add
    // link (a client navigation). Next keeps the sheet's route alive between visits, so this also proves every
    // reopening starts from a clean form ("who"), never the previous submission's caps step.
    await page.goto("/s/1");
    for (const who of ["frank.satchelhq.testnet", "grace.satchelhq.testnet", "henry.satchelhq.testnet"]) {
      await page.getByTestId("allowance-manage").filter({ visible: true }).getByTestId("add-allowance").click();
      const flow = page.getByTestId("allowance-flow").filter({ visible: true });
      await expect(flow.getByTestId("allowance-to")).toHaveValue("");
      await expect(flow.getByTestId("allowance-cap-sol")).toHaveCount(0); // the caps step isn't showing
      await flow.getByTestId("allowance-to").fill(who);
      await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
      await flow.getByTestId("allowance-review").click();
      await flow.getByTestId("allowance-cap-sol").check();
      await flow.getByTestId("allowance-cap-sol-amount").fill("0.01");
      await flow.getByTestId("allowance-submit").click();
      await expect(page).toHaveURL(/\/s\/1$/);
    }
    await page.goto("/s/1");
    await expect(page.getByTestId("add-allowance").filter({ visible: true })).toBeDisabled();
  });
});

test.describe("C2 + C3: USDC and other-EVM-chain caps in the Add sheet", () => {
  test("Alice adds a USDC cap on Sepolia and an ETH cap on Base Sepolia to Ivy; both show in the facts", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    const manage = page.getByTestId("allowance-manage").filter({ visible: true });
    await manage.getByTestId("add-allowance").click();
    const flow = page.getByTestId("allowance-flow");
    await flow.getByTestId("allowance-to").fill(IVY);
    await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
    await flow.getByTestId("allowance-review").click();

    // the native Sepolia ETH row pays the USDC send's gas fee; the extra rows are behind "Other networks"
    await flow.getByTestId("allowance-cap-evm").check();
    await flow.getByTestId("allowance-cap-evm-amount").fill("0.001");
    await flow.getByTestId("allowance-other-networks").locator("summary").click();
    await flow.getByTestId("allowance-cap-usdc-11155111").check();
    await flow.getByTestId("allowance-cap-usdc-11155111-amount").fill("5");
    await flow.getByTestId("allowance-cap-eth-84532").check();
    await flow.getByTestId("allowance-cap-eth-84532-amount").fill("0.05");
    await flow.getByTestId("allowance-submit").click();

    await expect(page).toHaveURL(/\/s\/1$/);
    await expect(manage).toContainText(IVY);
    const facts = page.getByTestId("allowance-facts").filter({ visible: true });
    await expect(facts).toContainText(IVY);
    await expect(facts).toContainText("5.00 USDC");
    await expect(facts).toContainText("0.0500 ETH");

    // the public facts carry it after a reload too (a judge fact, no JS needed)
    await page.reload();
    await expect(page.getByTestId("allowance-facts").filter({ visible: true })).toContainText(IVY);
  });

  test("Ivy's USDC send on Sepolia is allowed within the cap, then refused over it", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1");
    await page.getByTestId("allowance-manage").filter({ visible: true }).getByTestId("add-allowance").click();
    const addFlow = page.getByTestId("allowance-flow");
    await addFlow.getByTestId("allowance-to").fill(IVY);
    await expect(addFlow.getByTestId("allowance-recipient-card")).toBeVisible();
    await addFlow.getByTestId("allowance-review").click();
    await addFlow.getByTestId("allowance-cap-evm").check();
    await addFlow.getByTestId("allowance-cap-evm-amount").fill("0.001");
    await addFlow.getByTestId("allowance-other-networks").locator("summary").click();
    await addFlow.getByTestId("allowance-cap-usdc-11155111").check();
    await addFlow.getByTestId("allowance-cap-usdc-11155111-amount").fill("5");
    await addFlow.getByTestId("allowance-submit").click();
    await expect(page).toHaveURL(/\/s\/1$/);

    // switch the mock wallet to Ivy, same tab (same tab's sessionStorage keeps the sim state Alice's set_allowance wrote)
    await page.evaluate((who) => localStorage.setItem("satchel:mock-wallet", who), IVY);
    await page.goto("/s/1/send?chain=evm&asset=usdc");
    const flow = page.getByTestId("send-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await expect(flow.getByTestId("allowance-remaining")).toContainText("5.00");
    await flow.getByTestId("amount").fill("2");
    await flow.getByTestId("to").fill(RECIPIENT_EVM);
    await flow.getByTestId("review").click();
    await flow.getByLabel("I checked this address").check();
    await expect(flow.getByTestId("review-amount")).toHaveText("2.00 USDC");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });

    // 3 USDC of the 5 USDC cap is left; a 4 USDC send (still under the original cap) is refused client-side
    await page.goto("/s/1/send?chain=evm&asset=usdc");
    const flow2 = page.getByTestId("send-flow");
    await expect(flow2.getByTestId("allowance-remaining")).toContainText("3.00");
    await flow2.getByTestId("amount").fill("4");
    await flow2.getByTestId("to").fill(RECIPIENT_EVM);
    await expect(flow2.getByTestId("review")).toBeDisabled();
    await expect(flow2).toContainText(/over today's remaining amount/);
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
      const flow = page.getByTestId("allowance-flow");
      await expect(flow.getByRole("dialog")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      expect(await axe(page)).toEqual([]);

      // the Limits step, with the "Other networks" disclosure (USDC + Base/Arbitrum/OP ETH caps) open
      await flow.getByTestId("allowance-to").fill(IVY);
      await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
      await flow.getByTestId("allowance-review").click();
      await flow.getByTestId("allowance-other-networks").locator("summary").click();
      await expect(flow.getByTestId("allowance-cap-usdc-11155111")).toBeVisible();
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
