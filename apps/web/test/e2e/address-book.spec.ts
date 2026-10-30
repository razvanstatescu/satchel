import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/** The address book (lib/address-book.ts): the page, the pickers (each context only its own chain), saving from use. */

const BTC_TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";
const EVM_TO = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a";

test.describe("address book", () => {
  test("add, rename and remove on the page; it's in the navigation", async ({ page }) => {
    await page.goto("/s/1");
    await page.getByRole("link", { name: "Address book" }).first().click();
    await expect(page).toHaveURL(/\/address-book$/);
    const add = page.getByTestId("book-add");
    await add.getByTestId("book-address").fill(EVM_TO);
    await expect(add.getByTestId("book-kind")).toContainText("Ethereum");
    await add.getByTestId("book-alias").fill("Exchange");
    await add.getByTestId("book-add-submit").click();
    await expect(page.locator("[data-book-row]")).toHaveCount(1);
    await expect(page.locator("[data-book-row]")).toContainText("Exchange");
    // the same address again is refused (already saved)
    await add.getByTestId("book-address").fill(EVM_TO.toUpperCase().replace("0X", "0x"));
    await expect(add).toContainText("Already saved as Exchange");
    await expect(add.getByTestId("book-add-submit")).toBeDisabled();
    // remove takes a second click
    await page.locator("[data-book-row]").getByTestId("book-remove").click();
    await page.locator("[data-book-row]").getByTestId("book-remove").click();
    await expect(page.locator("[data-book-row]")).toHaveCount(0);
  });

  test("the Send picker offers only the chain's own addresses, and fills the field", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.addInitScript(
      ([btc, evm]) => {
        if (window.localStorage.getItem("satchel:address-book:v1")) return;
        window.localStorage.setItem(
          "satchel:address-book:v1",
          JSON.stringify([
            { id: "a", kind: "btc", address: btc, alias: "Mom", addedAt: 1, usedAt: null },
            { id: "b", kind: "evm", address: evm, alias: "Exchange", addedAt: 2, usedAt: null },
          ]),
        );
      },
      [BTC_TO, EVM_TO],
    );
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("book-open").click();
    const panel = flow.getByTestId("book-panel");
    await expect(panel.locator("[data-book-entry]")).toHaveCount(1);
    await expect(panel).toContainText("Mom");
    await expect(panel).not.toContainText("Exchange");
    await panel.locator('[data-book-entry="a"]').click();
    await expect(flow.getByTestId("recipient-name")).toHaveText("Mom");
    // on Ethereum the picker lists the Ethereum entry instead
    await flow.locator('[data-chain-select="evm"]').click();
    await flow.getByTestId("book-open").click();
    await expect(flow.getByTestId("book-panel").locator("[data-book-entry]")).toHaveCount(1);
    await expect(flow.getByTestId("book-panel")).toContainText("Exchange");
  });

  test("the dropdown inside the field: keyboard to pick, Escape closes only the list, a click outside closes it", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.addInitScript(
      ([btc]) => {
        if (window.localStorage.getItem("satchel:address-book:v1")) return;
        window.localStorage.setItem(
          "satchel:address-book:v1",
          JSON.stringify([
            { id: "a", kind: "btc", address: btc, alias: "Mom", addedAt: 1, usedAt: null },
            { id: "c", kind: "btc", address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", alias: "Dad", addedAt: 2, usedAt: null },
          ]),
        );
      },
      [BTC_TO],
    );
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    const open = flow.getByTestId("book-open");
    // the button sits inside the To field, beside Paste
    const field = await flow.getByTestId("to").boundingBox();
    const btn = await open.boundingBox();
    expect(btn!.y).toBeGreaterThanOrEqual(field!.y);
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(field!.y + field!.height);
    await expect(open).toHaveAttribute("aria-expanded", "false");
    // keyboard: open, move, pick
    await open.focus();
    await page.keyboard.press("Enter");
    await expect(flow.getByTestId("book-panel")).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(flow.getByTestId("book-panel")).toHaveCount(0);
    await expect(flow.getByTestId("recipient-name")).toBeVisible();
    // Escape closes the list, not the Send popup
    await flow.getByRole("button", { name: "Clear address" }).click();
    await expect(flow.getByTestId("to")).toBeVisible();
    await flow.getByTestId("book-open").click();
    await expect(flow.getByTestId("book-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(flow.getByTestId("book-panel")).toHaveCount(0);
    // the popup stays (not just mid-exit): the URL keeps the send route and the dialog is still there a moment later
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/s\/1\/send/);
    await expect(flow.getByRole("dialog")).toBeVisible();
    await expect(flow.getByTestId("book-open")).toBeFocused();
    // a click outside closes it
    await flow.getByTestId("book-open").click();
    await expect(flow.getByTestId("book-panel")).toBeVisible();
    await flow.getByRole("heading").first().click();
    await expect(flow.getByTestId("book-panel")).toHaveCount(0);
  });

  test("Give and Take everything out have the same button in their fields", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.addInitScript(() => {
      if (window.localStorage.getItem("satchel:address-book:v1")) return;
      window.localStorage.setItem(
        "satchel:address-book:v1",
        JSON.stringify([{ id: "n", kind: "near", address: "bob.satchelhq.testnet", alias: "Bob", addedAt: 1, usedAt: null }]),
      );
    });
    await page.goto("/s/1/transfer");
    const give = page.getByTestId("transfer-flow");
    await give.getByTestId("book-open").click();
    await give.locator('[data-book-entry="n"]').click();
    await expect(give.getByTestId("xfer-to")).toHaveValue("bob.satchelhq.testnet");
    await page.goto("/s/1/empty");
    const empty = page.getByTestId("empty-flow");
    // a BTC field offers no NEAR account: the list says so
    await empty.getByTestId("book-open").first().click();
    await expect(empty.getByTestId("book-panel")).toContainText("No Bitcoin addresses saved yet.");
  });

  test("save a counterparty from Transactions; it then shows by its name", async ({ page }) => {
    await page.goto("/s/1/transactions");
    const list = page.locator("[data-tx-list]");
    await expect(list).not.toHaveAttribute("data-tx-loading", "");
    const row = list.locator("li", { has: page.locator('[data-tx^="base:"][data-tx$=":USDC"]') });
    await row.getByTestId("book-save-compact").click();
    await expect(page.getByTestId("toast").filter({ hasText: "Saved to your address book" })).toBeVisible();
    await expect(row.getByTestId("book-save-compact")).toHaveCount(0);
    await page.goto("/address-book");
    await expect(page.locator("[data-book-row]")).toHaveCount(1);
    await page.locator("[data-book-row]").getByRole("button", { name: /Rename/ }).click();
    await page.locator("[data-book-row] input").fill("Faucet friend");
    await page.locator("[data-book-row]").getByRole("button", { name: "Done" }).click();
    await page.goto("/s/1/transactions?filter=ethereum");
    await expect(list.locator('[data-tx^="base:"][data-tx$=":USDC"] [data-tx-who]')).toHaveText("from Faucet friend");
  });
});
