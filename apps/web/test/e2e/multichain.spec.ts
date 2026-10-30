import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALICE, CAROL, useMockWallet } from "./helpers";

/**
 * C2 (USDC), C3 (four EVM testnets) and C7 (message signing), in fixture mode: the mock wallet and the in-browser
 * simulation stand in for the wallet, the contract and the chains (no testnet transaction).
 */

const RECIPIENT_EVM = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a";

async function openEvmSend(page: Page, network: string, asset?: "usdc") {
  await page.goto("/s/1/send?chain=evm");
  const flow = page.getByTestId("send-flow");
  await expect(flow.getByRole("dialog")).toBeVisible();
  await flow.locator(`[data-network-select="${network}"]`).click();
  if (asset) await flow.locator(`[data-asset-select="${asset}"]`).click();
  return flow;
}

test.describe("C3: the Ethereum row and the server HTML", () => {
  test("/s/1's server HTML carries every network's balance (no JS needed)", async ({ request }) => {
    const html = await (await request.get("/s/1")).text();
    // one holdings list: each coin on each network is its own row (Base Sepolia ETH and USDC, Sepolia USDC)
    expect(html).toContain("Base Sepolia");
    expect(html).toMatch(/data-evm-balance="84532" data-asset="eth"[^>]*>0\.0200.ETH/);
    expect(html).toMatch(/data-evm-balance="84532" data-asset="usdc"[^>]*>10\.00.USDC/);
    expect(html).toMatch(/data-evm-balance="11155111" data-asset="usdc"[^>]*>25\.00.USDC/);
    expect(html).toContain("Arbitrum Sepolia");
    expect(html).toContain("OP Sepolia");
    expect(html).toContain("https://sepolia.basescan.org/address/");
  });
});

test.describe("C3: send ETH on Base Sepolia", () => {
  test("network picker → Review names Base Sepolia → tracker → confirmed; the intent keeps chain id and its own nonce", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 1500 });
    const flow = await openEvmSend(page, "84532");
    await expect(flow).toContainText("Available 0.0200 ETH");
    await flow.getByTestId("amount").fill("0.001");
    await flow.getByTestId("to").fill(RECIPIENT_EVM);
    await expect(flow.getByTestId("recipient-resolved")).toContainText("Base Sepolia address");
    await flow.getByTestId("review").click();
    await flow.getByLabel("I checked this address").check();
    await expect(flow.getByTestId("review-amount")).toHaveText("0.0010 ETH");
    await expect(flow.getByTestId("review-card")).toContainText("Base Sepolia");
    await flow.getByTestId("send").click();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]"));
    // #1 has one Sepolia record (nonce 0) and none on Base: Base's nonce sequence starts at 0
    expect(persisted[0]).toMatchObject({ tokenId: "1", chain: "evm", evmChainId: 84532, evmNonce: 0 });
    const tracker = flow.getByTestId("signing-progress");
    await expect(tracker).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });
    await expect(tracker).toContainText("Base Sepolia");
    await expect(tracker).toContainText("Basescan");
  });
});

test.describe("C2: send USDC", () => {
  test("USDC on Base Sepolia: 6 decimals, the fee in ETH, tracker → confirmed", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 1500 });
    const flow = await openEvmSend(page, "84532", "usdc");
    await expect(flow.getByRole("heading", { name: "Send USDC" })).toBeVisible();
    await expect(flow).toContainText("Available 10.00 USDC");
    await flow.getByTestId("amount").fill("1.1234567");
    await expect(flow.locator("#amount-error")).toContainText("Use at most 6 decimals.");
    await flow.getByTestId("amount").fill("1.5");
    await flow.getByTestId("to").fill(RECIPIENT_EVM);
    await flow.getByTestId("review").click();
    await flow.getByLabel("I checked this address").check();
    await expect(flow.getByTestId("review-amount")).toHaveText("1.50 USDC");
    await expect(flow.getByTestId("review-card")).toContainText("paid in ETH by this Satchel");
    await expect(flow.getByTestId("review-card")).toContainText("Satchel #1 USDC after");
    await flow.getByTestId("send").click();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("satchel:pending:v1") ?? "[]"));
    expect(persisted[0]).toMatchObject({ chain: "evm", evmChainId: 84532, asset: "usdc" });
    await expect(flow.getByTestId("signing-progress")).toHaveAttribute("data-stage", "confirmed", { timeout: 30_000 });
  });

  test("USDC with no ETH on that network: a clear message up front and Review stays off", async ({ page }) => {
    await useMockWallet(page, ALICE);
    const flow = await openEvmSend(page, "421614", "usdc");
    await expect(flow).toContainText("Available 4.00 USDC");
    await expect(flow.locator("#amount-error")).toContainText("Sending USDC needs a little ETH on Arbitrum Sepolia");
    await expect(flow.getByTestId("review")).toBeDisabled();
  });
});

test.describe("C7: sign a message", () => {
  test("exact text with hidden characters shown, warning, signature + verify; the record says message and buyers still see clean", async ({ page }) => {
    await useMockWallet(page, ALICE, { delay: 1500 });
    await page.goto("/s/1");
    await page.getByTestId("sign-message-entry").click();
    const flow = page.getByTestId("sign-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    await expect(flow.getByTestId("msg-review")).toBeDisabled();
    const text = `Log in to example.xyz ${String.fromCodePoint(0x202e)}as #1`;
    await flow.getByTestId("msg-text").fill(text);
    await flow.getByTestId("msg-review").click();
    await expect(flow.getByTestId("msg-exact")).toHaveText("Log in to example.xyz [U+202E]as #1");
    await expect(flow.getByTestId("msg-escaped")).toBeVisible();
    await expect(flow.getByTestId("msg-hex")).toContainText("4c6f6720696e20746f");
    await expect(flow.getByTestId("msg-warning")).toContainText("A signed message can't move coins from this Satchel.");
    await expect(flow.getByTestId("msg-warning")).toContainText("recorded in this Satchel's history for good");
    await expect(flow.getByTestId("msg-sign")).toBeDisabled();
    await flow.getByTestId("msg-ack").check();
    await expect(flow.getByTestId("msg-sign")).toBeEnabled();
    await flow.getByTestId("msg-sign").click();
    await expect(flow.getByTestId("msg-done")).toBeVisible({ timeout: 30_000 });
    await expect(flow.getByTestId("msg-signature")).toHaveText(/^0x[0-9a-f]{130}$/);
    await expect(flow.getByTestId("msg-verify-code")).toContainText("verifyMessage");
    await expect(flow.getByRole("button", { name: "Copy signature" })).toBeVisible();

    // the record: the owner's browser runs the buyers' check on the Sell tab
    await page.goto("/s/1/sale");
    const msg = page.locator('#clean-history [data-item="message"], [data-record] [data-item="message"]').first();
    await expect(msg).toBeVisible({ timeout: 20_000 });
    await expect(msg.locator("[data-item-status]")).toHaveAttribute("data-item-status", "message");
    await expect(msg).toContainText("[U+202E]");
    await expect(page.locator("[data-record]")).toContainText("Messages (1)");
    // a message never blocks: what buyers would see is still clean
    await expect(page.getByRole("heading", { name: "Clean. No past signature can move these coins." })).toBeVisible({ timeout: 20_000 });
  });

  test("a listed Satchel with a signed message: Buy stays on, and the record lists the message", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await page.goto("/s/5/sale");
    const block = page.getByTestId("buy-block");
    await expect(block.locator("[data-gate]")).toHaveAttribute("data-gate", "clean", { timeout: 20_000 });
    await expect(block.getByTestId("buy")).toHaveAttribute("aria-disabled", "false");
    const msg = page.locator('[data-record] [data-item="message"]');
    await expect(msg).toContainText("I own Satchel #5. Log in to market.example");
    await expect(msg.locator("[data-message-hex]")).toContainText("49206f776e");
  });

  test("hidden for anyone but the owner", async ({ page }) => {
    await useMockWallet(page, CAROL);
    await page.goto("/s/1");
    await expect(page.locator("[data-fact=owner] dd")).toHaveText(ALICE);
    await expect(page.getByTestId("sign-message-entry")).toHaveCount(0);
    await page.goto("/s/1/sign");
    await expect(page.getByTestId("sign-guard")).toContainText("You don't own Satchel #1");
  });
});

test.describe("C3 + C2: Add coins network picker", () => {
  test("picks Base Sepolia, then USDC; the address and the note follow the picked network and coin", async ({ page }) => {
    await page.goto("/s/1/receive?chain=evm");
    const sheet = page.getByTestId("receive-flow");
    const nets = sheet.getByRole("navigation", { name: "Network" });
    await expect(nets.getByRole("link", { name: "Sepolia" })).toHaveAttribute("aria-current", "page");
    await nets.getByRole("link", { name: "Base" }).click();
    await expect(page).toHaveURL(/network=84532/);
    await expect(sheet).toContainText("Base Sepolia");
    await sheet.getByRole("navigation", { name: "Coin" }).getByRole("link", { name: "USDC" }).click();
    await expect(page).toHaveURL(/network=84532.*asset=usdc/);
    await expect(sheet.getByRole("navigation", { name: "Network" }).getByRole("link", { name: "Base" })).toHaveAttribute("aria-current", "page");
    await expect(sheet).toContainText("USDC on Base Sepolia arrives at this same address.");
    await expect(sheet.locator('[data-full-address="evm"]')).toHaveText(/^0x[0-9a-fA-F]{40}$/);
  });
});

test.describe("accessibility: the new sheets in Day and Night", () => {
  for (const theme of ["day", "night"] as const) {
    for (const path of ["/s/1/receive?chain=evm&network=84532&asset=usdc", "/s/1/sign", "/s/1"]) {
      test(`${path} in ${theme}`, async ({ browser }) => {
        const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 900 } });
        const page = await ctx.newPage();
        if (theme === "night") await page.addInitScript(() => localStorage.setItem("satchel:theme:v1", "night"));
        await useMockWallet(page, ALICE);
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        if (path === "/s/1/sign") {
          await page.getByTestId("msg-text").fill("Sign in");
          await page.getByTestId("msg-review").click();
          await expect(page.getByTestId("msg-warning")).toBeVisible();
        }
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
        expect(bad).toEqual([]);
        await ctx.close();
      });
    }
  }
});
