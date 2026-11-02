import { expect, test, type Page } from "@playwright/test";
import { ALICE, BOB, CAROL, useMockWallet } from "./helpers";

/**
 * Flows in fixture mode with the mock wallet + in-browser simulation of the contract/MPC/chains (no testnet tx).
 * The send flow must reach every tracker state from chain state alone (S-15).
 */

const RECIPIENT_EVM = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a";

async function fillEvmSend(page: Page) {
  await page.goto("/s/1/send?chain=evm");
  const flow = page.getByTestId("send-flow");
  await expect(flow.getByRole("dialog")).toBeVisible();
  await flow.getByTestId("amount").fill("0.001");
  await flow.getByTestId("to").fill(RECIPIENT_EVM);
  await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
  await flow.getByTestId("review").click();
  // a lowercase (no-checksum) address is the warning tier: Review requires "I checked this address"
  await flow.getByLabel("I checked this address").check();
  await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 ETH");
  await expect(flow.getByTestId("send")).toHaveText("Send 0.0010 ETH");
  return flow;
}

test.describe("send (EVM): Review → tracker → receipt", () => {
  test("walks preparing → awaiting_wallet → signing → signed → broadcasting → sent → confirmed", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 2500 });
    const flow = await fillEvmSend(page);
    // the ReviewCard is the exact outcome
    await expect(flow.getByTestId("review-card")).toContainText("Satchel #1 after");
    // the NEAR fee is just the amount; why it costs NEAR is one tap away on /questions (less-labels)
    await expect(flow.getByTestId("review-card")).toContainText("≈ 0.004 NEAR");
    await expect(flow.getByTestId("review-card")).not.toContainText("permanent signature record");
    await expect(flow.getByTestId("review-card").getByRole("link", { name: "Why does a signature cost NEAR?" })).toHaveAttribute("href", "/questions#q-fees-near");
    await expect(flow).not.toContainText("can't be undone");
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("send")).toHaveText(/Approve in your wallet…|Preparing…/);
    // the intent is persisted BEFORE the wallet resolves
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]"));
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ tokenId: "1", chain: "evm", evmNonce: 1, sigCountBefore: 2 });

    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", "signing");
    await expect(tracker.locator('[data-row="1"]')).toHaveAttribute("data-row-state", "active");
    await expect(flow.getByTestId("eta")).toHaveText("Usually about 10 seconds.");
    await expect(flow.getByTestId("flow-close")).toHaveAttribute("aria-label", "Minimize");
    await expect(page.getByTestId("pending-card")).toBeVisible();

    await expect(tracker).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });
    await expect(tracker.locator('[data-row="2"]')).toHaveAttribute("data-row-state", "done");
    await expect(tracker).toContainText("You can close this tab. Activity keeps tracking it.");
    await expect(tracker).toHaveAttribute("data-stage", "confirmed", { timeout: 20_000 });
    await expect(tracker.getByRole("heading", { name: /Sent 0\.001/ })).toBeVisible();
  });

  test("resumes after a reload mid-signing (store at module level + localStorage)", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 6000 });
    const flow = await fillEvmSend(page);
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "signing");
    await expect(page).toHaveURL(/intent=/);
    await page.reload();
    const tracker = page.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", /signing|signed|broadcasting|sent|confirmed/);
    await expect(tracker).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });
  });

  test("broadcast failure → Signed, not sent (Needs attention) → Broadcast again → sent", async ({ page }) => {
    await useMockWallet(page, ALICE, { mode: "broadcast-fail", delay: 1500 });
    const flow = await fillEvmSend(page);
    await flow.getByTestId("send").click();
    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", "signed_not_sent", { timeout: 20_000 });
    await expect(tracker).toContainText("Signed, not sent");
    await expect(tracker).toContainText("Nothing has left Satchel #1 yet.");
    // 2.0: the outcome's action sits in the sheet's pinned foot, under the tracker
    await flow.getByTestId("broadcast-again").click();
    await expect(tracker).toHaveAttribute("data-stage", /sent|confirmed/, { timeout: 20_000 });
  });

  test("MPC timeout → Not signed, with the honest copy and Try again on the same nonce", async ({ page }) => {
    await useMockWallet(page, ALICE, { mode: "timeout", delay: 2000 });
    const flow = await fillEvmSend(page);
    await flow.getByTestId("send").click();
    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", "timed_out", { timeout: 20_000 });
    await expect(tracker).toContainText("The signer network did not return a signature. Nothing was sent.");
    await expect(tracker).toContainText("Try again reuses nonce 1");
  });

  test("a rejected wallet with no record → back on Review, inputs kept", async ({ page }) => {
    await useMockWallet(page, ALICE, { reject: true });
    const flow = await fillEvmSend(page);
    await flow.getByTestId("send").click();
    await expect(flow.getByTestId("cancelled")).toHaveText("You cancelled in your wallet. Nothing was signed.", { timeout: 20_000 });
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 ETH");
  });

  test("BTC: invalid and mainnet addresses are refused inline; a testnet4 address builds a review", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
    await expect(flow.getByTestId("to-error")).toContainText("mainnet");
    await flow.getByTestId("to").fill("tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u");
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await flow.getByTestId("review").click();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0001 BTC");
    await expect(flow.getByTestId("review-card")).toContainText("sats");
  });

  test("guards: visitors can't send", async ({ page }) => {
    await useMockWallet(page, BOB);
    await page.goto("/s/1/send?chain=evm");
    await expect(page.getByTestId("send-flow")).toContainText("You don't own Satchel #1");
  });
});

test.describe("add coins (receive): anyone, no wallet needed", () => {
  test("the sheet: chain switch, QR card, full grouped address, notes, Incoming; Copy address rolls to Copied; close replaces", async ({ page }) => {
    await page.goto("/s/1/receive?chain=btc");
    const flow = page.getByTestId("receive-flow");
    const sheet = flow.getByRole("dialog", { name: "Add coins to Satchel #1" });
    await expect(sheet).toBeVisible();
    const chains = sheet.getByRole("navigation", { name: "Chain" });
    await expect(chains.getByRole("link", { name: "Bitcoin" })).toHaveAttribute("aria-current", "page");
    await expect(sheet.getByRole("img", { name: "QR code for tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5" })).toBeVisible();
    await expect(sheet.locator('[data-full-address="btc"]')).toHaveText("tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5");
    await expect(sheet).toContainText("Send only Bitcoin testnet4 coins to this address.");
    await expect(sheet).toContainText("Anyone can add coins. Only the owner can send them out.");
    await expect(sheet.getByRole("link", { name: /Get testnet BTC/ })).toBeVisible();
    await expect(sheet.locator("[data-incoming]")).toHaveAttribute("data-incoming", "waiting");
    await expect(sheet.locator("[data-incoming]")).toContainText("Waiting for coins…");

    const copyBtn = sheet.getByRole("button", { name: "Copy address" });
    await expect(copyBtn).toHaveText("Copy address");
    await copyBtn.click();
    await expect(sheet.getByRole("button", { name: "Copied" })).toBeVisible();
    await expect(page.getByTestId("status-region")).toHaveText("Bitcoin address copied");
    await expect(sheet.getByRole("button", { name: "Copy address" })).toBeVisible({ timeout: 5000 }); // rolls back after 1.5 s

    await chains.getByRole("link", { name: "Ethereum" }).click();
    await expect(page).toHaveURL(/\/s\/1\/receive\?chain=evm$/);
    await expect(sheet.locator('[data-full-address="evm"]')).toHaveText(/^0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad$/i);
    await expect(sheet).toContainText("Send only Sepolia ETH to this address.");

    await flow.getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/s\/1$/);
    // Next 16 keeps the previous route's DOM hidden (React Activity, display: none): the sheet is gone from view
    await expect(page.getByTestId("receive-flow")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "This NFT is a wallet." })).toBeVisible();
  });

  test("the Wallet tab: one holdings list, then the full grouped addresses with Copy, QR (→ Add coins) and the explorer", async ({ page }) => {
    await page.goto("/s/1");
    // one holdings list for every coin; the addresses in their own section under it
    await expect(page.locator('[data-holding="btc"] [data-balance="btc"]')).toHaveText("0.00189718 BTC");
    const row = page.locator('[data-chain-row="btc"]');
    await expect(row.locator('[data-full-address="btc"]')).toHaveText("tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5");
    await expect(row.getByRole("link", { name: /mempool\.space/ })).toHaveAttribute("href", /mempool\.space\/testnet4\/address\//);
    await row.getByRole("link", { name: "Show QR code for Bitcoin address" }).click();
    await expect(page).toHaveURL(/\/s\/1\/receive\?chain=btc$/);
    await expect(page.getByTestId("receive-flow").getByRole("dialog")).toBeVisible();
  });
});

test.describe("mint, transfer, sale gating", () => {
  test("mint: the preview card, the tracker, then 'Satchel #8 is yours.' with Yours; Close returns to ?from=", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/mint?from=/satchels");
    const flow = page.getByTestId("mint-flow");
    await expect(flow.getByRole("dialog")).toHaveAccessibleName("Mint a Satchel");
    const preview = flow.locator("figure[data-card='preview']");
    await expect(preview).toHaveAttribute("data-owned", "true");
    await expect(preview).toContainText("New Satchel");
    await expect(preview).toContainText("Bitcoin address");
    await expect(flow).toContainText("Its own Bitcoin testnet4 address");
    await expect(flow).toContainText("0.02 NEAR");
    // the background is My Satchels, inert while the sheet is open
    expect(await page.evaluate(() => document.querySelector("main [inert]") !== null)).toBe(true);
    await flow.getByTestId("mint-cta").click();
    await expect(flow.getByTestId("mint-done")).toHaveText("Satchel #8 is yours.", { timeout: 20_000 });
    await expect(flow.getByTestId("mint-done")).toBeFocused();
    await expect(flow.locator("figure[data-card='8'] [data-yours]")).toHaveCount(1);
    await expect(page.getByTestId("status-region")).toHaveText("Satchel #8 is yours.");
    await expect(flow.getByRole("link", { name: "Add coins" })).toHaveAttribute("href", "/s/8/receive");
    await expect(flow.getByRole("link", { name: "Open Satchel #8" })).toHaveAttribute("href", "/s/8");
    await flow.getByTestId("flow-close").click();
    await expect(page).toHaveURL(/\/satchels$/);
    await expect(page.getByTestId("my-satchels").locator("figure[data-card='8']")).toBeVisible();
  });

  test("mint: your own cancel is a neutral note; signed out, the CTA connects", async ({ page }) => {
    await useMockWallet(page, ALICE, { reject: true });
    await page.goto("/mint");
    const flow = page.getByTestId("mint-flow");
    await flow.getByTestId("mint-cta").click();
    await expect(flow).toContainText("You cancelled in your wallet. Nothing was minted.", { timeout: 20_000 });
    await expect(flow.getByTestId("mint-cta")).toHaveText("Mint a Satchel");
    await expect(flow.getByRole("alert")).toHaveCount(0); // a cancel is not an error
    await expect(flow.getByTestId("flow-close")).toHaveAttribute("href", "/satchels"); // connected: back to My Satchels

    await page.evaluate(() => localStorage.removeItem("satchel:mock-wallet"));
    await page.reload();
    await expect(flow.getByTestId("mint-cta")).toHaveText("Connect NEAR wallet");
    await expect(flow).toContainText("Use a NEAR testnet wallet such as Meteor or Intear.");
    await expect(flow.getByTestId("flow-close")).toHaveAttribute("href", "/"); // signed out: back to the landing
    await flow.getByTestId("mint-cta").click(); // fixture mode: the mock wallet signs in
    await expect(flow.getByTestId("mint-cta")).toHaveText("Mint a Satchel");
  });

  test("My Satchels (/satchels): the cards and their sale lines; empty and signed-out states", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/satchels");
    const home = page.getByTestId("my-satchels");
    await expect(home.getByRole("heading", { level: 1 })).toHaveText("My Satchels");
    await expect(home).toContainText("6 Satchels", { timeout: 20_000 });
    const cards = home.locator("figure[data-card]");
    await expect(cards).toHaveCount(6);
    await expect(home.locator("[data-yours]")).toHaveCount(0); // every card here is yours: no Yours sticker
    await expect(home.getByRole("link", { name: /^Satchel #1\b/ })).toHaveAttribute("href", "/s/1");
    await expect(home).toContainText("For sale at 5.00 USDC");
    await expect(home).toContainText("For sale at 2 NEAR, but 1 signature could still move coins, so nobody can buy it yet.");
    await expect(home.getByRole("link", { name: "Mint a Satchel" })).toHaveAttribute("href", "/mint?from=/satchels");
    await expect(page).toHaveTitle("My Satchels · Satchel");

    await page.evaluate(() => localStorage.setItem("satchel:mock-wallet", "dave.satchelhq.testnet"));
    await page.reload();
    await expect(home).toContainText("You don't own a Satchel yet", { timeout: 20_000 });
    await expect(home.getByRole("link", { name: "Look inside Satchel #1" })).toHaveAttribute("href", "/s/1");

    await page.evaluate(() => localStorage.removeItem("satchel:mock-wallet"));
    await page.reload();
    await expect(home).toContainText("Your Satchels live in your NEAR wallet");
    await home.getByRole("button", { name: "Connect NEAR wallet" }).click(); // fixture: signs in as alice
    await expect(home).toContainText("6 Satchels", { timeout: 20_000 });
  });

  test("transfer: refuses the contract and the MPC account, then hands off to bob", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/transfer");
    const flow = page.getByTestId("transfer-flow");
    await flow.getByTestId("xfer-to").fill("satchel.satchelhq.testnet");
    await expect(flow.getByTestId("xfer-error")).toContainText("That's the Satchel contract");
    await flow.getByTestId("xfer-to").fill("v1.signer-prod.testnet");
    await expect(flow.getByTestId("xfer-error")).toContainText("NEAR's signer network");
    await flow.getByTestId("xfer-to").fill(BOB);
    await expect(flow.getByTestId("recipient-card")).toContainText("Account found");
    await flow.getByTestId("xfer-review").click();
    await expect(flow).toContainText("The signature history stays with the Satchel.");
    await flow.getByTestId("xfer-cta").click();
    const handoff = flow.getByTestId("handoff");
    await expect(handoff).toBeVisible({ timeout: 20_000 });
    await expect(flow.getByTestId("handoff-sentence")).toContainText(`${BOB} now controls`);
    // the giver's view: "Yours" peels off as the card is handed over; it lands under bob, Given, and the sentence
    // takes focus (only after nft_token confirmed bob as the owner)
    await expect(handoff).toHaveAttribute("data-landed", "", { timeout: 5_000 });
    await expect(handoff.locator("[data-yours]")).toHaveCount(0);
    await expect(handoff.locator("[data-status]")).toHaveAttribute("data-status", "transferred");
    await expect(flow.getByTestId("handoff-sentence")).toBeFocused();
    await expect(flow.getByRole("heading", { level: 2 })).toHaveText("Given");
  });

  test.describe("under reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("give: the hand-off is a dip, and the sentence has focus within 600 ms", async ({ page }) => {
      await useMockWallet(page, ALICE);
      await page.goto("/s/1/transfer");
      const flow = page.getByTestId("transfer-flow");
      await flow.getByTestId("xfer-to").fill(BOB);
      await expect(flow.getByTestId("recipient-card")).toContainText("Account found");
      await flow.getByTestId("xfer-review").click();
      await flow.getByTestId("xfer-cta").click();
      await expect(flow.getByTestId("handoff")).toBeVisible({ timeout: 20_000 });
      await expect(flow.getByTestId("handoff-sentence")).toBeFocused({ timeout: 600 });
      await expect(flow.getByTestId("handoff")).toHaveAttribute("data-landed", "", { timeout: 1_000 });
    });
  });

  test("sale gating: #4 is blocked with no override; #3 is clean and buyable", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await page.goto("/s/4/sale");
    const block = page.getByTestId("buy-block");
    await expect(block.locator("[data-gate]")).toHaveAttribute("data-gate", "blocked", { timeout: 20_000 });
    await expect(block).toContainText("Blocked: 1 unused signature");
    await expect(block.getByTestId("buy")).toHaveAttribute("aria-disabled", "true");
    await expect(block.getByTestId("buy")).toHaveAttribute("aria-describedby", "gate-line-4");
    await expect(page.locator("#clean-history")).toContainText("Ethereum · nonce 1 isn't used yet");
    // the verdict is the browser's own: it says so, and the server's hint row is gone
    await expect(page.locator("#clean-history")).toContainText("Checked in your browser");
    await expect(block.locator("[data-hint-aggregate]")).toHaveCount(0);
    // pressing the blocked Buy does nothing but point at the reason (force: Playwright treats aria-disabled as disabled)
    await block.getByTestId("buy").click({ force: true });
    await expect(page.locator("#gate-line-4")).toBeFocused();
    await expect(page.getByTestId("buy-done")).toHaveCount(0);

    await page.goto("/s/3/sale");
    const b3 = page.getByTestId("buy-block");
    await expect(b3.locator("[data-gate]")).toHaveAttribute("data-gate", "clean", { timeout: 20_000 });
    await expect(b3.getByTestId("buy")).toHaveAttribute("aria-disabled", "false");
    await expect(b3.getByTestId("buy")).toHaveText("Buy for 5.00 USDC");
    await b3.getByTestId("buy").click();
    // the buyer's success screen is the hand-off (Yours sticks on); no toast while it is open (app-screens §1.4)
    await expect(page.getByTestId("buy-done")).toContainText("Satchel #3 is yours.", { timeout: 20_000 });
    await expect(page.getByTestId("buy-done").locator("[data-yours]")).toHaveCount(1);
  });

  test("the browser's other verdicts keep Buy off: confirming, can't verify (with Check again), unsafe", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await page.goto("/s/3/sale");
    // fixture knob (useCleanCheck): the browser's report takes a state the demo world doesn't have; the server's hint stays
    const cases = [
      ["settling", "Confirming: 1 signature", "1 signature is still confirming."],
      ["unknown", "Can't verify 1 signature", "Can't verify 1 signature right now."],
      ["unsafe", "Unsafe: the contract code doesn't match the published build", "Unsafe: the contract code doesn't match the published build."],
    ] as const;
    for (const [state, gate, verdict] of cases) {
      await page.evaluate((v) => localStorage.setItem("satchel:sim:clean", v), state);
      await page.goto("/s/3/sale");
      const block = page.getByTestId("buy-block");
      await expect(block.locator("[data-gate]")).toHaveAttribute("data-gate", state, { timeout: 20_000 });
      await expect(block.locator("[data-gate]")).toHaveText(gate);
      await expect(page.locator("#clean-history [data-verdict-title]")).toHaveText(verdict);
      await expect(block.getByTestId("buy")).toHaveAttribute("aria-disabled", "true");
      if (state === "unknown") await expect(page.locator("#clean-history").getByRole("button", { name: "Check again" })).toBeVisible();
    }
    await page.evaluate(() => localStorage.removeItem("satchel:sim:clean"));
  });

  test("signed out: Connect only where the verdict allows buying (inventory 5.1.6d)", async ({ page }) => {
    await useMockWallet(page, null);
    await page.goto("/s/4/sale");
    const b4 = page.getByTestId("buy-block");
    await expect(b4.locator("[data-gate]")).toHaveAttribute("data-gate", "blocked", { timeout: 20_000 });
    await expect(b4.getByTestId("buy")).toHaveText("Buy for 2 NEAR");
    await expect(b4.getByTestId("buy")).toHaveAttribute("aria-disabled", "true");

    await page.goto("/s/3/sale");
    const b3 = page.getByTestId("buy-block");
    await expect(b3.locator("[data-gate]")).toHaveAttribute("data-gate", "clean", { timeout: 20_000 });
    await expect(b3.getByTestId("buy")).toHaveText("Connect NEAR wallet");
    await expect(b3.getByTestId("buy")).toHaveAttribute("aria-disabled", "false");
  });

  test("owner: the Sell flow's Before-you-list checklist gates the List button", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/sale?list=1");
    const flow = page.getByTestId("sell-flow");
    await expect(flow.getByTestId("list-checklist")).toContainText("Quiet period");
    await expect(flow.getByTestId("list-checklist")).toContainText("Past signatures");
    await expect(flow.getByTestId("list-cta")).toHaveAttribute("aria-disabled", "true");
    // no visible "enter a price" line: the disabled button says it, and screen readers get it as its description
    await expect(flow.getByTestId("list-cta")).toHaveAccessibleDescription("Enter a price to list it.");
    // NEAR is the default currency (the landing's promise, H-26)
    await expect(flow.getByRole("radio", { name: "NEAR" })).toHaveAttribute("aria-checked", "true");
    await flow.getByTestId("price").fill("5");
    await expect(flow.getByTestId("list-cta")).toHaveText("List for 5 NEAR");
    await expect(flow.getByTestId("list-cta")).toHaveAttribute("aria-disabled", "false");
  });

  test("listed Satchels pause sending and giving for the owner (#freeze, one Stop selling)", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/5");
    await expect(page.locator("#freeze")).toContainText("For sale at 1 NEAR");
    await expect(page.getByTestId("action-row")).toContainText("Sending and giving are paused while it's for sale.");
    await expect(page.locator("figure[data-card='5'] [data-yours]")).toHaveCount(1);
    await expect(page.locator("[data-fact=owner] dd")).toHaveText("alice.satchelhq.testnet");
    await expect(page.locator("figure[data-card='5']")).toHaveAttribute("data-owned", "true");
    // the Sell tab carries the same "For sale at …" panel with the page's one Stop selling, and the owner's own check
    await page.goto("/s/5/sale");
    await expect(page.locator("#freeze")).toContainText("For sale at 1 NEAR · Listing #5");
    await expect(page.getByTestId("delist")).toHaveCount(1);
    await expect(page.locator("#clean-history")).toContainText("Checked in your browser", { timeout: 20_000 });
  });
});
