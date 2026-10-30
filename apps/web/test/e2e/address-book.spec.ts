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
