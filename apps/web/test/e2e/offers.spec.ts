import { expect, test, type Page } from "@playwright/test";
import { ALICE, BOB, useMockWallet } from "./helpers";

/**
 * C4 (offers) + C6 (NEAR-side assets inside a Satchel), docs/specs/C4-C6.md. Fixture mode (mock wallet + in-browser
 * simulation; no testnet tx). Token "6" is unlisted, owned by ALICE, with no signatures and no fixture inside
 * balance, so it starts every test from a clean slate for C6 and is immediately buyable/offerable (its browser
 * clean check is "empty" → `buyEnabled`).
 */

/** Switch the mock wallet to another account (the simulation lives in this tab's sessionStorage and survives). */
async function connectAs(page: Page, account: string) {
  await page.evaluate((a) => localStorage.setItem("satchel:mock-wallet", a), account);
}

test.describe("C6: NEAR inside a Satchel", () => {
  test("anyone can add NEAR from its coin sheet; it shows up in Inside right away", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6");
    // the holdings list lists NEAR inside (folded away while empty); its row opens the coin sheet with the inputs
    await page.locator("[data-holdings-empty] summary").click();
    await page.locator('[data-holding="inside-near"] a').click();
    await expect(page).toHaveURL(/\/s\/6\/coin\/inside-near$/);
    await expect(page.getByTestId("inside-near-amount")).toHaveText("Nothing inside yet");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "added" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });
  });

  test("only the owner can take it out", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });
    // BOB isn't the owner: no withdraw control for him at all.
    await expect(page.getByTestId("withdraw-near")).toHaveCount(0);

    await connectAs(page, ALICE);
    await page.reload();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR");
    await page.getByTestId("withdraw-near").click();
    await expect(page.getByTestId("toast").filter({ hasText: "taken out" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("Nothing inside yet", { timeout: 20_000 });
  });

  test("withdraw is blocked while listed, with the reason shown, and works again once delisted", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });

    await page.goto("/s/6/sale?list=1");
    await page.getByTestId("price").fill("1");
    await page.getByTestId("list-cta").click();
    await expect(page).toHaveURL(/\/s\/6$/, { timeout: 20_000 });

    await page.goto("/s/6/coin/inside-near");
    await expect(page.getByTestId("withdraw-near")).toBeDisabled();
    await expect(page.getByTestId("withdraw-near-why")).toHaveText("You can't take anything out while it's for sale. Stop selling first.");

    await page.goto("/s/6");
    await page.getByTestId("action-row").getByTestId("delist").click();
    await expect(page.getByTestId("action-row").getByTestId("delist")).toHaveCount(0, { timeout: 20_000 });
    await page.goto("/s/6/coin/inside-near");
    await expect(page.getByTestId("withdraw-near")).toBeEnabled({ timeout: 20_000 });
  });
});

test.describe("C4: offers", () => {
  test("a visitor's offer runs the clean check before it's allowed, exactly like Buy", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    const flow = page.getByTestId("offer-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    // the gate starts "checking" and only turns clean once the browser's own check lands
    await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await flow.getByTestId("offer-amount").fill("1");
    await expect(flow.getByTestId("offer-cta")).toHaveText("Offer 1 NEAR");
    await flow.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toContainText("Offer of 1 NEAR sent", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/s\/6$/);
  });

  test("the owner accepts: ownership moves and inside balances follow", async ({ page }) => {
    await useMockWallet(page, ALICE);
    // the token holds 1 NEAR before the offer, so acceptance must carry it over untouched
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });

    await connectAs(page, BOB);
    await page.goto("/s/6/offer");
    await expect(page.getByTestId("offer-flow").getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await page.getByTestId("offer-amount").fill("2");
    await page.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });

    await connectAs(page, ALICE);
    await page.goto("/s/6");
    const offers = page.getByTestId("incoming-offers");
    await expect(offers).toBeVisible();
    await expect(offers).toContainText(BOB);
    await offers.getByTestId("accept-offer").click();
    await expect(page.getByTestId("toast").filter({ hasText: "Accepted" })).toBeVisible({ timeout: 20_000 });

    // ownership moved to the offerer
    const owner = await page.evaluate(() => JSON.parse(sessionStorage.getItem("satchel:sim:v1") ?? "{}").owners["6"]);
    expect(owner).toBe(BOB);
    // inside balances are keyed by token id, so they followed the token
    await expect(page.getByTestId("incoming-offers")).toHaveCount(0);
    await expect(page.locator('[data-holding="inside-near"] [data-inside="near"]')).toHaveText("0.9991 NEAR");
  });

  test("cancel and refund: the offerer cancels, the offer disappears from My offers", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    await expect(page.getByTestId("offer-flow").getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await page.getByTestId("offer-amount").fill("1");
    await page.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });

    await page.goto("/satchels");
    const mine = page.getByTestId("my-offers");
    await expect(mine).toBeVisible({ timeout: 20_000 });
    await expect(mine).toContainText("Satchel #6");
    await mine.getByTestId("cancel-offer").click();
    await expect(page.getByTestId("toast").filter({ hasText: "cancelled" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("my-offers")).toHaveCount(0);
  });

  test("a stale offer (the Satchel changed since) is refused, with an explanation, not silently hidden", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    await expect(page.getByTestId("offer-flow").getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await page.getByTestId("offer-amount").fill("1");
    await page.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });

    // the owner withdraws nothing-ish from Inside: bumping inside_epoch is enough to make the offer stale, even
    // though nothing was signed on any chain.
    await connectAs(page, ALICE);
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });
    await page.getByTestId("withdraw-near").click();
    await expect(page.getByTestId("toast").filter({ hasText: "taken out" })).toBeVisible({ timeout: 20_000 });

    await page.goto("/s/6");
    const offers = page.getByTestId("incoming-offers");
    await expect(offers).toBeVisible();
    await expect(offers.getByTestId("accept-offer")).toBeDisabled();
    await expect(offers.getByTestId("offer-blocked")).toHaveAttribute("data-block", "ERR_OFFER_STALE");
    await expect(offers.getByTestId("offer-blocked")).toContainText("This Satchel changed since the offer was made");
  });

  test("a USDC offer needs a storage-credit prepay first; once prepaid, the owner can accept it", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    const flow = page.getByTestId("offer-flow");
    await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await page.getByRole("radio", { name: "USDC" }).click();
    await flow.getByTestId("offer-amount").fill("5");
    // BOB has no storage credit yet: the plain-sentence prepay step shows and the Offer CTA stays disabled.
    await expect(flow.getByTestId("storage-prepay")).toBeVisible();
    await expect(flow.getByTestId("storage-prepay")).toContainText("Prepay 0.0045 NEAR of storage credit first.");
    await expect(flow.getByTestId("offer-cta")).toBeDisabled();
    await flow.getByTestId("prepay-storage-cta").click();
    await expect(flow.getByTestId("storage-prepay")).toHaveCount(0, { timeout: 20_000 });
    await expect(flow.getByTestId("offer-cta")).toBeEnabled();
    await flow.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toContainText("Offer of 5.00 USDC sent", { timeout: 20_000 });

    await connectAs(page, ALICE);
    await page.goto("/s/6");
    const incoming = page.getByTestId("incoming-offers");
    await expect(incoming).toBeVisible();
    await expect(incoming).toContainText("5.00 USDC");
    await incoming.getByTestId("accept-offer").click();
    await expect(page.getByTestId("toast").filter({ hasText: "Accepted" })).toBeVisible({ timeout: 20_000 });
    const owner = await page.evaluate(() => JSON.parse(sessionStorage.getItem("satchel:sim:v1") ?? "{}").owners["6"]);
    expect(owner).toBe(BOB);
  });
});

test.describe("C6: USDC and wNEAR inside a Satchel (FT deposits + withdrawals)", () => {
  test("a first USDC deposit needs a storage-credit prepay; once prepaid, it shows up, and only the owner can withdraw it", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/coin/inside-usdc");
    await expect(page.getByTestId("inside-ft-amount-usdc")).toHaveText("Nothing inside yet");
    await page.getByTestId("add-usdc-amount").fill("5");
    await expect(page.getByTestId("storage-prepay")).toBeVisible();
    await expect(page.getByTestId("storage-prepay")).toContainText("Prepay 0.0009 NEAR of storage credit first.");
    await expect(page.getByTestId("add-usdc-cta")).toBeDisabled();
    await page.getByTestId("prepay-storage-cta").click();
    await expect(page.getByTestId("storage-prepay")).toHaveCount(0, { timeout: 20_000 });
    await page.getByTestId("add-usdc-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "added" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-ft-amount-usdc")).toHaveText("5.00 USDC", { timeout: 20_000 });
    // BOB isn't the owner: no withdraw control for USDC either.
    await expect(page.getByTestId("withdraw-usdc")).toHaveCount(0);

    await connectAs(page, ALICE);
    await page.reload();
    await expect(page.getByTestId("inside-ft-amount-usdc")).toHaveText("5.00 USDC");
    await page.getByTestId("withdraw-usdc").click();
    await expect(page.getByTestId("toast").filter({ hasText: "taken out" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-ft-amount-usdc")).toHaveText("Nothing inside yet", { timeout: 20_000 });
  });

  test("a wNEAR deposit is blocked while listed, with the reason shown, and works again once delisted", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/6/coin/inside-wnear");
    await page.getByTestId("add-wnear-amount").fill("2");
    await page.getByTestId("prepay-storage-cta").click();
    await expect(page.getByTestId("storage-prepay")).toHaveCount(0, { timeout: 20_000 });
    await page.getByTestId("add-wnear-cta").click();
    await expect(page.getByTestId("inside-ft-amount-wnear")).toHaveText("2 wNEAR", { timeout: 20_000 });

    await page.goto("/s/6/sale?list=1");
    await page.getByTestId("price").fill("1");
    await page.getByTestId("list-cta").click();
    await expect(page).toHaveURL(/\/s\/6$/, { timeout: 20_000 });

    await page.goto("/s/6/coin/inside-wnear");
    await expect(page.getByTestId("withdraw-wnear")).toBeDisabled();
    await page.goto("/s/6");
    await page.getByTestId("action-row").getByTestId("delist").click();
    await expect(page.getByTestId("action-row").getByTestId("delist")).toHaveCount(0, { timeout: 20_000 });
    await page.goto("/s/6/coin/inside-wnear");
    await expect(page.getByTestId("withdraw-wnear")).toBeEnabled({ timeout: 20_000 });
  });

  test("storage credit left over after a prepay shows on /satchels with a Withdraw button", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    const flow = page.getByTestId("offer-flow");
    await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await page.getByRole("radio", { name: "USDC" }).click();
    await flow.getByTestId("offer-amount").fill("5");
    // the default prepay (0.01 NEAR, minus the credit slot's own storage) covers the 0.0045 NEAR an offer needs,
    // with ≈ 0.0046 NEAR left over.
    await flow.getByTestId("prepay-storage-cta").click();
    await expect(flow.getByTestId("offer-cta")).toBeEnabled({ timeout: 20_000 });
    await flow.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });

    await page.goto("/satchels");
    const credit = page.getByTestId("storage-credit");
    await expect(credit).toBeVisible({ timeout: 20_000 });
    await expect(credit.getByTestId("storage-credit-amount")).toHaveText("Storage credit: 0.0046 NEAR");
    await credit.getByTestId("withdraw-storage-credit").click();
    await expect(page.getByTestId("storage-credit")).toHaveCount(0, { timeout: 20_000 });
  });
});

test.describe("/market: an entry point to offer on an unlisted Satchel", () => {
  test("the Unlisted Satchels section links straight to the offer sheet", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/market");
    const section = page.getByTestId("unlisted-market");
    await expect(section).toBeVisible();
    const card = section.locator('[data-unlisted-item="6"]');
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: /Satchel #6.*Make an offer/ }).click();
    await expect(page).toHaveURL(/\/s\/6\/offer$/);
    await expect(page.getByTestId("offer-flow")).toBeVisible();
  });
});
