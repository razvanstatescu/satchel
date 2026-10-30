import { expect, test } from "@playwright/test";
import { ADDR1, ALICE, useMockWallet } from "./helpers";

/**
 * Send-form validation that isn't covered by the happy-path flows in flows.spec.ts / multichain.spec.ts:
 * amount 0, amount above balance, the Max button, and sending to the Satchel's own address on every chain.
 * Fixture mode only (no testnet tx). Satchel #1 (Alice) has BTC/EVM/SOL balances (fixtures.ts FIXTURE_BALANCES).
 */

const RECIPIENT_EVM = "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a";
const RECIPIENT_BTC = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

test.describe("send: amount validation (EVM)", () => {
  test("zero and above-balance amounts are refused inline; Review stays disabled", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=evm");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("to").fill(RECIPIENT_EVM);

    await flow.getByTestId("amount").fill("0");
    await expect(flow.getByText("Enter an amount above zero.")).toBeVisible();
    await expect(flow.getByTestId("review")).toBeDisabled();

    // #1 holds 0.0489... ETH (fixtures.ts FIXTURE_BALANCES["1"].evm); 5 ETH is well above it.
    await flow.getByTestId("amount").fill("5");
    await expect(flow.getByText("That's more than this Satchel can send.")).toBeVisible();
    await expect(flow.getByTestId("review")).toBeDisabled();
  });

  test("the Max button fills the full balance and notes the fee is reserved; Review enables", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=evm");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("to").fill(RECIPIENT_EVM);
    await flow.getByRole("button", { name: "Max" }).click();
    await expect(flow.getByText("Max leaves room for the network fee.")).toBeVisible();
    await expect(flow.getByTestId("review")).toBeEnabled();
    await flow.getByTestId("review").click();
    // a lowercase (no-checksum) address needs the explicit ack before Send is live
    await flow.getByLabel("I checked this address").check();
    await expect(flow.getByTestId("review-amount")).toBeVisible();
  });
});

test.describe("send: a Satchel refuses to send to its own address", () => {
  test("EVM: #1's own Sepolia address is refused with a clear reason", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=evm");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.001");
    await flow.getByTestId("to").fill(ADDR1.evm);
    await expect(flow.getByTestId("to-error")).toContainText("own address");
    await expect(flow.getByTestId("review")).toBeDisabled();
  });

  test("BTC: #1's own testnet4 address is refused, a different address still builds a review", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=btc");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill(ADDR1.btc);
    await expect(flow.getByTestId("to-error")).toContainText("own address");
    await flow.getByTestId("to").fill(RECIPIENT_BTC);
    await expect(flow.getByTestId("recipient-resolved")).toBeVisible();
    await expect(flow.getByTestId("review")).toBeEnabled();
  });

  test("SOL: #1's own devnet address is refused", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=sol");
    const flow = page.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.01");
    await flow.getByTestId("to").fill(ADDR1.sol);
    await expect(flow.getByTestId("to-error")).toContainText("own address");
    await expect(flow.getByTestId("review")).toBeDisabled();
  });
});
