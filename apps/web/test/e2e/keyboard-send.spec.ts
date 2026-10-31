import { expect, test, type Locator, type Page } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Round two, target 2: a complete Send, start to finish, using only the keyboard — Tab/Shift+Tab to move, Enter and
 * Space to activate, arrow keys for the chain picker and the address-book dropdown. No `.click()`, no `.check()`,
 * no mouse coordinates anywhere in this test; every interaction is `page.keyboard`.
 *
 * Opens from the Wallet tab's own "Send" action (`action-row`, `/s/1/send` with no `?chain=`, which opens on the
 * first coin #1 actually holds — BTC, `lib/holdings.ts`). `FlowShell`'s focus-restore fix (popup-edge-cases.spec.ts,
 * Bug 1) only works when the trigger is still in the DOM once the flow closes; the "Send" action-row link is — its
 * closeHref is `/s/1` itself — unlike a coin-sheet-opened Send, whose closeHref skips back past the coin sheet.
 */

const RECIPIENT_BTC_1 = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u"; // "Mom"
const RECIPIENT_BTC_2 = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"; // "Dad"

/** Press Tab (max 80 times) until `locator` is the focused element. Fails loudly if it's never reached. */
async function tabTo(page: Page, locator: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await locator.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`tabTo: target was never focused after ${max} Tab presses`);
}

test.describe("a complete keyboard-only Send", () => {
  test("Tab to open, arrows to pick the chain, the address-book dropdown by keyboard, Review, Send, Escape, focus returns", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 300 });
    await page.addInitScript(
      ([a, b]) => {
        if (window.localStorage.getItem("satchel:address-book:v1")) return;
        window.localStorage.setItem(
          "satchel:address-book:v1",
          JSON.stringify([
            { id: "mom", kind: "btc", address: a, alias: "Mom", addedAt: 1, usedAt: null },
            { id: "dad", kind: "btc", address: b, alias: "Dad", addedAt: 2, usedAt: null },
          ]),
        );
      },
      [RECIPIENT_BTC_1, RECIPIENT_BTC_2],
    );
    await page.goto("/s/1");

    // Tab from the top of the page (no mouse) to the Wallet tab's "Send" action, then Enter to open it.
    const opener = page.getByTestId("action-row").getByRole("link", { name: "Send" });
    await tabTo(page, opener);
    await expect(opener).toBeFocused();
    await page.keyboard.press("Enter");

    const flow = page.getByTestId("send-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();

    // the chain picker (role=radiogroup, roving tabindex): opens checked on BTC (#1's first held coin); arrow right
    // to Ethereum and back to Bitcoin proves it's keyboard-operable before settling on BTC for the rest of the send.
    const btcOption = flow.locator('[data-chain-select="btc"]');
    await tabTo(page, btcOption);
    await expect(btcOption).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("ArrowRight");
    await expect(flow.locator('[data-chain-select="evm"]')).toHaveAttribute("aria-checked", "true");
    await expect(flow.getByTestId("amount")).toHaveAttribute("placeholder", "0"); // ETH form re-rendered, cleared
    await page.keyboard.press("ArrowLeft");
    await expect(btcOption).toHaveAttribute("aria-checked", "true");

    // amount: Tab forward from the (now focused) chain option into the amount field.
    await tabTo(page, flow.getByTestId("amount"));
    await page.keyboard.type("0.0003");
    await expect(flow.getByTestId("amount")).toHaveValue("0.0003");

    // the "to" field: Tab onto it (Shift+Tab back to amount and forward again, proving backward navigation works
    // too), then past it to the address-book button — never typed into directly.
    await tabTo(page, flow.getByTestId("to"));
    await page.keyboard.press("Shift+Tab");
    await expect(flow.getByTestId("to")).not.toBeFocused(); // moved one control back (the Max button)
    await page.keyboard.press("Tab");
    await expect(flow.getByTestId("to")).toBeFocused(); // one Tab forward lands right back on "to"
    await page.keyboard.press("Tab");
    const bookOpen = flow.getByTestId("book-open");
    await expect(bookOpen).toBeFocused();
    await expect(bookOpen).toHaveAttribute("aria-expanded", "false");

    // Enter opens the dropdown (focus moves into it automatically, onto the first entry — alphabetical, "Dad"
    // before "Mom", lib/address-book.ts entriesFor); ArrowDown to the second entry ("Mom"), Enter to pick it.
    await page.keyboard.press("Enter");
    const panel = flow.getByTestId("book-panel");
    await expect(panel).toBeVisible();
    await expect(bookOpen).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-book-entry="dad"]')).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-book-entry="mom"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(panel).toHaveCount(0);
    await expect(flow.getByTestId("recipient-name")).toHaveText("Mom");

    // Review: Tab to it, Space to activate (both Enter and Space must work on a real <button>).
    await tabTo(page, flow.getByTestId("review"));
    await expect(flow.getByTestId("review")).toBeEnabled();
    await page.keyboard.press(" ");
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0003 BTC");

    // Send: Tab to it, Enter to activate, then wait for the tracker.
    await tabTo(page, flow.getByTestId("send"));
    await page.keyboard.press("Enter");
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });

    // Escape closes the flow; focus returns to the "Send" link that opened it (still on the page: closeHref is /s/1).
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/s\/1$/);
    await expect(flow.getByRole("dialog")).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
