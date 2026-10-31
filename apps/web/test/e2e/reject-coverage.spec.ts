import { expect, test, type Page } from "@playwright/test";
import { ALICE, BOB, useMockWallet } from "./helpers";

/**
 * Round two, target 3: wallet rejection in flows round one never separately re-verified — give-by-link, make offer,
 * accept offer, allowance add + revoke, inside NEAR deposit + withdraw, and Empty's reject→Skip→partial path.
 *
 * FINDING while scoping this: the "timeout" sim knob (`useMockWallet(..., { mode: "timeout" })`) has no effect on any
 * of these. `lib/near/mock-wallet.ts` — the fixture wallet behind every plain NEAR call (`set_allowance`,
 * `revoke_allowance`, `make_offer`, `accept_offer`, `deposit_near`, `withdraw_near`, the give-link's fund+transfer) —
 * only reads the `reject` knob; `mode`/`delay` are consumed downstream in the chain-signing runner (BTC/EVM/SOL
 * `sign_for`, already exercised by flows.spec.ts and allowance.spec.ts's BTC send) and never touch `signAndSendTransaction`
 * itself, which always resolves in 600ms or rejects in 300ms. So there is no distinct "NEAR call timed out" state to
 * assert for any of these flows — only `reject` is meaningful, which is what every test below exercises. Empty's
 * per-coin steps ARE `sign_for` calls (through the same intent/runner machinery as Send), so its reject→Skip path is
 * the one place here a rejected step composes with a multi-step plan.
 */

/** Flip the mock wallet's reject knob mid-test (useMockWallet only sets it before the first load of the tab). */
async function setReject(page: Page, on: boolean) {
  await page.evaluate((v) => {
    if (v) window.localStorage.setItem("satchel:mock-wallet:reject", "1");
    else window.localStorage.removeItem("satchel:mock-wallet:reject");
  }, on);
}

test.describe("give by link: rejected, then recovers", () => {
  test("a rejected wallet leaves the Satchel owned, with a neutral note; creating the link again succeeds", async ({ page }) => {
    await useMockWallet(page, ALICE, { reject: true });
    await page.goto("/s/1/give-link");
    const flow = page.getByTestId("give-link-flow");
    await flow.getByTestId("create-link").click();
    await expect(flow.getByTestId("give-link-error")).toHaveText("You cancelled in your wallet. Nothing changed.", { timeout: 10_000 });
    await expect(flow.getByTestId("create-link")).toHaveText("Create the link"); // back to idle, not stuck "Creating…"

    await page.goto("/s/1");
    await expect(page.getByTestId("action-row")).toBeVisible(); // Alice still owns #1 (nothing moved)

    await setReject(page, false);
    await page.goto("/s/1/give-link");
    const flow2 = page.getByTestId("give-link-flow");
    await flow2.getByTestId("create-link").click();
    await expect(flow2.getByTestId("give-link-done")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("offers: make and accept, each rejected then recovered", () => {
  test("making an offer: rejected leaves no offer, a neutral note, and a plain retry succeeds", async ({ page }) => {
    await useMockWallet(page, BOB, { reject: true });
    await page.goto("/s/6/offer");
    const flow = page.getByTestId("offer-flow");
    await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await flow.getByTestId("offer-amount").fill("1");
    await flow.getByTestId("offer-cta").click();
    await expect(page.locator('[data-note="cancelled"]')).toHaveText("You cancelled in your wallet. Nothing was offered.", { timeout: 10_000 });
    await expect(page.getByTestId("toast")).toHaveCount(0); // a cancel never toasts as a success

    await setReject(page, false);
    await flow.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });
  });

  test("accepting an offer: rejected keeps ownership with the offerer unchanged, and Accept works on a second try", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/6/offer");
    const flow = page.getByTestId("offer-flow");
    await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
    await flow.getByTestId("offer-amount").fill("1");
    await flow.getByTestId("offer-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });

    await page.evaluate((who) => localStorage.setItem("satchel:mock-wallet", who), ALICE);
    await setReject(page, true);
    await page.goto("/s/6");
    const offers = page.getByTestId("incoming-offers");
    await expect(offers).toBeVisible();
    await offers.getByTestId("accept-offer").click();
    await expect(page.locator('[data-note="cancelled"]')).toHaveText("You cancelled in your wallet. Nothing changed.", { timeout: 10_000 });
    await expect(page.getByTestId("incoming-offers")).toBeVisible(); // the offer is still there, not consumed

    await setReject(page, false);
    await offers.getByTestId("accept-offer").click();
    await expect(page.getByTestId("toast").filter({ hasText: "Accepted" })).toBeVisible({ timeout: 20_000 });
    const owner = await page.evaluate(() => JSON.parse(sessionStorage.getItem("satchel:sim:v1") ?? "{}").owners["6"]);
    expect(owner).toBe(BOB);
  });
});

test.describe("allowance: add and revoke, each rejected then recovered", () => {
  test("adding a delegate: rejected keeps the caps step with a neutral note; submitting again succeeds", async ({ page }) => {
    await useMockWallet(page, ALICE, { reject: true });
    await page.goto("/s/1/allowance");
    const flow = page.getByTestId("allowance-flow");
    await flow.getByTestId("allowance-to").fill("oliver.satchelhq.testnet");
    await expect(flow.getByTestId("allowance-recipient-card")).toBeVisible();
    await flow.getByTestId("allowance-review").click();
    await flow.getByTestId("allowance-cap-btc").check();
    await flow.getByTestId("allowance-cap-btc-amount").fill("0.0001");
    await flow.getByTestId("allowance-submit").click();
    await expect(flow.getByTestId("allowance-note")).toHaveText("Adding them was cancelled. Nothing changed.", { timeout: 10_000 });
    await expect(flow.getByTestId("allowance-cap-btc-amount")).toHaveValue("0.0001"); // the caps step kept its inputs

    await setReject(page, false);
    await flow.getByTestId("allowance-submit").click();
    await expect(page).toHaveURL(/\/s\/1$/, { timeout: 10_000 });
    await expect(page.getByTestId("allowance-manage").filter({ visible: true })).toContainText("oliver.satchelhq.testnet");
  });

  test("revoking a delegate: rejected leaves them listed with a neutral note; revoking again removes them", async ({ page }) => {
    await useMockWallet(page, ALICE, { reject: true });
    await page.goto("/s/1");
    const manage = page.getByTestId("allowance-manage").filter({ visible: true });
    await expect(manage).toBeVisible();
    await manage.locator("li", { hasText: "dana.satchelhq.testnet" }).getByTestId("revoke-allowance").click();
    await expect(manage).toContainText("Revoking was cancelled. Nothing changed.", { timeout: 10_000 });
    await expect(manage).toContainText("dana.satchelhq.testnet"); // still there

    await setReject(page, false);
    await manage.locator("li", { hasText: "dana.satchelhq.testnet" }).getByTestId("revoke-allowance").click();
    await expect(manage).not.toContainText("dana.satchelhq.testnet", { timeout: 10_000 });
  });
});

test.describe("inside NEAR: deposit and withdraw, each rejected then recovered", () => {
  test("adding NEAR: rejected leaves nothing inside, with a neutral note; adding again works", async ({ page }) => {
    await useMockWallet(page, BOB, { reject: true });
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.locator('[data-note="cancelled"]')).toHaveText("You cancelled in your wallet. Nothing changed.", { timeout: 10_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("Nothing inside yet");

    await setReject(page, false);
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("toast").filter({ hasText: "added" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });
  });

  test("taking NEAR out: rejected leaves the balance untouched, with a neutral note; a second try works", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/6/coin/inside-near");
    await page.getByTestId("add-near-amount").fill("1");
    await page.getByTestId("add-near-cta").click();
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });

    await setReject(page, true);
    await page.getByTestId("withdraw-near").click();
    await expect(page.locator('[data-note="cancelled"]')).toHaveText("You cancelled in your wallet. Nothing changed.", { timeout: 10_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR"); // unchanged

    await setReject(page, false);
    await page.getByTestId("withdraw-near").click();
    await expect(page.getByTestId("toast").filter({ hasText: "taken out" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inside-near-amount")).toHaveText("Nothing inside yet", { timeout: 20_000 });
  });
});

test.describe("Empty: a rejected step → Skip → partial results", () => {
  test("one coin's send is rejected mid-plan; Skip moves past it, and the rest still go through to a partial summary", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 150 });
    await page.goto("/s/1/empty");
    const flow = page.getByTestId("empty-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();

    await flow.getByTestId("empty-addr-btc").fill("tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u");
    await flow.getByTestId("empty-addr-evm").fill("0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a");
    await flow.getByTestId("empty-addr-sol").fill("8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r");
    await expect(flow.getByTestId("empty-review")).toBeEnabled();
    await flow.getByTestId("empty-review").click();
    const plan = flow.getByTestId("empty-plan");
    await expect(plan.locator("[data-empty-job]")).toHaveCount(8);
    await flow.getByTestId("empty-start").click();

    // job 1 (BTC): sent normally.
    await expect(flow.getByTestId("empty-send")).toBeEnabled({ timeout: 30_000 });
    await flow.getByTestId("empty-send").click();

    // job 2 (Sepolia USDC): reject it, then Skip past it.
    await expect(flow.getByTestId("empty-send")).toBeEnabled({ timeout: 30_000 });
    await setReject(page, true);
    await flow.getByTestId("empty-send").click();
    await expect(flow.getByTestId("empty-skip")).toBeVisible({ timeout: 20_000 });
    await flow.getByTestId("empty-skip").click();
    await setReject(page, false);

    // the remaining 6 jobs go through normally.
    for (let i = 0; i < 6; i++) {
      await expect(flow.getByTestId("empty-send")).toBeEnabled({ timeout: 30_000 });
      await flow.getByTestId("empty-send").click();
    }

    await expect(page.getByText("Some coins didn't go through")).toBeVisible({ timeout: 30_000 });
    const results = flow.getByTestId("empty-results");
    await expect(results.getByTestId("empty-result-btc")).toBeVisible();
    // the rejected, skipped one carries no amount and the "didn't go through" note; the others do.
    await expect(results.getByTestId("empty-result-evm-11155111-usdc")).toContainText("didn't go through");
    await expect(results.getByTestId("empty-result-btc")).not.toContainText("didn't go through");
  });
});
