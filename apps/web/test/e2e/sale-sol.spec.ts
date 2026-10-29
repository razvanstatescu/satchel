import { expect, test, type Page } from "@playwright/test";
import { ALICE, CAROL, useMockWallet } from "./helpers";

/**
 * Fixture mode (mock wallet + in-browser simulation; no testnet tx):
 * - the seller's Sold receipt and the escrow + withdraw_proceeds flow (spec §5.12; kb/80 R3 "Sold (seller)");
 * - the Solana send flow (P2; D-09): blockhash prefetch + refresh, ≤ 10 s at the click, `expired` + Try again.
 */

/** Switch the mock wallet to another account (the simulation lives in this tab's sessionStorage and survives). */
async function connectAs(page: Page, account: string) {
  await page.evaluate((a) => localStorage.setItem("satchel:mock-wallet", a), account);
}

async function buyAsCarol(page: Page, id: string, price: RegExp) {
  await page.goto(`/s/${id}/sale`);
  const block = page.getByTestId("buy-block");
  await expect(block.locator("[data-gate]")).toHaveAttribute("data-gate", "clean", { timeout: 20_000 });
  await expect(block.getByTestId("buy")).toHaveText(price);
  await block.getByTestId("buy").click();
  await expect(page.getByTestId("buy-done")).toContainText(`Satchel #${id} is yours.`, { timeout: 20_000 });
}

test.describe("seller: Sold receipt and proceeds", () => {
  test("the payout landed: Sold pill, no stitch, the sentence hero and the receipt rows", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await buyAsCarol(page, "3", /Buy for 5\.00\sUSDC/);

    await connectAs(page, ALICE);
    await page.goto("/s/3/sale");
    const r = page.getByTestId("sold-receipt");
    await expect(r).toBeVisible({ timeout: 20_000 });
    await expect(r.getByRole("heading", { level: 2 })).toHaveText(`You sold Satchel #3 to ${CAROL} for 5.00 USDC.`);
    await expect(r).toContainText("5.00 USDC arrived in your NEAR account.");
    await expect(r).toHaveAttribute("data-payout", "paid");
    await expect(r.getByTestId("sold-rows")).toContainText(CAROL);
    await expect(r.getByTestId("sold-rows")).toContainText("#3");
    await expect(r.getByTestId("sold-paid")).toHaveText("In the same transaction as the sale");
    await expect(page.getByTestId("escrow")).toHaveCount(0);
    // the card: Sold pill, the stitch is gone (the seller doesn't own it anymore)
    const card = page.locator("figure[data-card='3']").first();
    await expect(card).toContainText("Sold");
    await expect(card).toHaveAttribute("data-owned", "false");
    await expect(page.getByRole("link", { name: "Sold" })).toHaveAttribute("aria-current", "page");
  });

  test("the payout failed: '{price} is waiting for you.' → Withdraw → paid once, escrow gone", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await page.goto("/s/5/sale");
    await page.evaluate(() => localStorage.setItem("satchel:sim:payout", "fail"));
    await buyAsCarol(page, "5", /Buy for 1\sNEAR/);

    await connectAs(page, ALICE);
    // escrow is reachable from My Satchels too (proceeds_of is account state, not tied to one Satchel)
    await page.goto("/satchels");
    await expect(page.getByTestId("my-satchels").getByTestId("escrow")).toContainText("1 NEAR is waiting for you.", { timeout: 20_000 });

    await page.goto("/s/5/sale");
    const r = page.getByTestId("sold-receipt");
    await expect(r).toHaveAttribute("data-payout", "escrow", { timeout: 20_000 });
    await expect(r.getByTestId("sold-paid")).toContainText("Waiting for you");
    const escrow = r.getByTestId("escrow");
    await expect(escrow).toContainText("1 NEAR is waiting for you.");
    await expect(escrow).toContainText("Only you can withdraw it.");
    await escrow.getByTestId("withdraw-near").click();
    await expect(page.getByTestId("toast").filter({ hasText: "withdrawn" })).toContainText("1 NEAR withdrawn", { timeout: 20_000 });
    await expect(r.getByTestId("escrow")).toHaveCount(0);
    await expect(r).toHaveAttribute("data-payout", "withdrawn");
    await expect(r.getByTestId("sold-paid")).toHaveText("Withdrawn from escrow");
    const owed = await page.evaluate(() => JSON.parse(sessionStorage.getItem("satchel:sim:v1") ?? "{}").proceeds);
    expect(owed[ALICE].near).toBe("0");
  });

  test("a buyer never sees a Sold receipt for someone else's sale", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await buyAsCarol(page, "3", /Buy for 5\.00\sUSDC/);
    await connectAs(page, "bob.satchelhq.testnet");
    await page.goto("/s/3/sale");
    await expect(page.getByText("Satchel #3 isn't for sale.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sold-receipt")).toHaveCount(0);
  });
});

const SOL_TO = "8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r";

async function fillSolSend(page: Page) {
  await page.goto("/s/1/send?chain=sol");
  const flow = page.getByTestId("send-flow");
  await expect(flow.getByRole("dialog")).toBeVisible();
  await expect(flow.locator('[data-chain-select="sol"]')).toHaveAttribute("aria-checked", "true");
  await expect(flow).toContainText("Available 0.5000 SOL");
  await flow.getByTestId("to").fill("0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a");
  await expect(flow.getByTestId("to-error")).toContainText("isn't a valid Solana address");
  await flow.getByTestId("amount").fill("0.01");
  await flow.getByTestId("to").fill(SOL_TO);
  await expect(flow.getByTestId("recipient-resolved")).toContainText("Solana devnet address");
  await flow.getByTestId("review").click();
  await expect(flow.getByTestId("review-amount")).toHaveText("0.0100 SOL");
  await expect(flow.getByTestId("review-card")).toContainText("0.000005 SOL");
  await expect(flow.getByTestId("review-card")).toHaveAttribute("data-blockhash", /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  await expect(flow.getByTestId("send")).toHaveText("Send 0.0100 SOL");
  return flow;
}

test.describe("send (SOL, P2): Review → tracker → receipt", () => {
  test("prefetches the blockhash on Review, refreshes it every 8 s, and signs with a ≤ 10 s old one", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 1500 });
    const flow = await fillSolSend(page);
    const card = flow.getByTestId("review-card");
    const first = await card.getAttribute("data-blockhash");
    await expect(card).not.toHaveAttribute("data-blockhash", first!, { timeout: 12_000 });
    const fetchedAt = Number(await card.getAttribute("data-fetched-at"));
    await flow.getByTestId("send").click();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]"));
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ tokenId: "1", chain: "sol" });
    expect(persisted[0].unsigned.sol.lastValidBlockHeight).toBeGreaterThan(0);
    expect(persisted[0].createdAt - fetchedAt).toBeLessThanOrEqual(10_000);

    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", /signing|signed|broadcasting|sent|confirmed/, { timeout: 20_000 });
    await expect(tracker).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });
    await expect(tracker.getByRole("heading", { name: /Sent 0\.01/ })).toBeVisible();
    await expect(tracker.locator('[data-row="2"]')).toContainText("Broadcast to Solana devnet");
    await expect(tracker.locator('[data-row="2"]')).toContainText("Solana Explorer");
  });

  test("a stale blockhash (> 10 s) is never handed to the wallet: the click refreshes instead", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 1500 });
    const flow = await fillSolSend(page);
    const card = flow.getByTestId("review-card");
    const before = Number(await card.getAttribute("data-fetched-at"));
    // jump the page clock 12 s ahead without running timers (a throttled background tab)
    await page.clock.setSystemTime(Date.now() + 12_000);
    await flow.getByTestId("send").click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]").length)).toBe(0);
    await expect.poll(async () => Number(await card.getAttribute("data-fetched-at"))).toBeGreaterThan(before + 10_000);
    await expect(flow.getByTestId("send")).toHaveText("Send 0.0100 SOL");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toBeVisible({ timeout: 20_000 });
  });

  test("the blockhash expires while signing → Expired → Try again rebuilds with a new blockhash → sent", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 2500 });
    await page.addInitScript(() => localStorage.setItem("satchel:sim:sollife", "3")); // ≈ 0.7 s on the fixture clock
    const flow = await fillSolSend(page);
    const oldHash = await flow.getByTestId("review-card").getAttribute("data-blockhash");
    await flow.getByTestId("send").click();
    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", "expired", { timeout: 20_000 });
    await expect(tracker.getByTestId("sol-expired")).toContainText("The Solana transaction expired while it was being signed. Nothing was sent");
    await expect(tracker.locator('[data-row="2"]')).toHaveAttribute("data-row-state", "failed");
    // an expired SOL signature can't land: it doesn't block a new send
    await page.evaluate(() => localStorage.setItem("satchel:sim:sollife", "150"));
    await flow.getByTestId("try-again").click(); // 2.0: the outcome's actions sit in the sheet's pinned foot (X)
    await expect(flow.getByTestId("review-card")).toBeVisible({ timeout: 20_000 });
    await expect(flow.getByTestId("review-card")).not.toHaveAttribute("data-blockhash", oldHash!);
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });
    const all = await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]"));
    expect(all).toHaveLength(1); // the retry reused the same intent (no second spendable signature in flight)
  });
});
