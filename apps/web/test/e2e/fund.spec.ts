import { expect, test, type Page } from "@playwright/test";

/**
 * The public Add coins page (/fund/[id], lib/fund.ts), the Share link buttons that point to it, and the value bar's
 * tooltip. Fixture mode; Satchel #1's addresses are the fixture's.
 */

const BTC1 = "tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5";

/** Desktop without a share sheet: Share link copies (deterministic across Chromium builds). */
async function noShareSheet(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
}

test.describe("/fund/[id]: the public Add coins page", () => {
  test("the server HTML asks for a coin first and shows no address until one is picked", async ({ request }) => {
    const html = await (await request.get("/fund/1")).text();
    expect(html).toContain("Send coins to Satchel #1");
    for (const coin of ["BTC", "ETH", "USDC", "SOL", "NEAR", "wNEAR"]) expect(html).toContain(`data-fund-coin="${coin}"`);
    expect(html).not.toContain("data-fund-destination");
  });

  test("coin, then network: USDC on Base Sepolia gives the EVM address, Copy and the USDC note", async ({ page }) => {
    await page.goto("/fund/1");
    await page.locator('[data-fund-coin="USDC"]').click();
    await expect(page).toHaveURL(/\/fund\/1\?coin=usdc$/);
    // five places for USDC (four networks and inside); no destination until one is picked, never a guess
    await expect(page.locator("[data-fund-network]")).toHaveCount(5);
    await expect(page.locator("[data-fund-destination]")).toHaveCount(0);
    await page.locator('[data-fund-network="base"]').click();
    await expect(page).toHaveURL(/coin=usdc&network=base$/);
    const to = page.locator('[data-fund-destination="evm-84532-usdc"]');
    await expect(to.getByRole("heading", { name: "Send USDC on Base Sepolia" })).toBeVisible();
    await expect(to.getByRole("img", { name: /QR code for 0x/ })).toBeVisible();
    await expect(to).toContainText("USDC on Base Sepolia arrives at this same address.");
    await expect(to.getByRole("button", { name: "Copy address" })).toBeVisible();
  });

  test("a coin with one place needs no network step: ?coin=btc goes straight to the address", async ({ page }) => {
    await page.goto("/fund/1?coin=btc");
    await expect(page.locator("[data-fund-network]")).toHaveCount(0);
    await expect(page.locator('[data-fund-destination="btc"]')).toContainText("Send BTC on Bitcoin testnet4");
    await expect(page.locator(`[data-address="${BTC1}"]`).first()).toBeVisible();
  });

  test("a coin held inside offers the add field and the wallet connect, not an address", async ({ page }) => {
    await page.goto("/fund/1?coin=near");
    const to = page.locator('[data-fund-destination="inside-near"]');
    await expect(to.getByRole("heading", { name: "Add NEAR inside Satchel #1" })).toBeVisible();
    await expect(to.getByTestId("add-near-amount")).toBeVisible();
    await expect(to.getByRole("button", { name: "Connect NEAR wallet" })).toBeVisible();
  });

  test("picks are instant (no server round trip) and the URL follows for sharing", async ({ page }) => {
    await page.goto("/fund/1");
    let navigations = 0;
    page.on("request", (r) => {
      // a round trip for this page itself (other links' prefetches don't count)
      if (new URL(r.url()).pathname.startsWith("/fund/") && (r.isNavigationRequest() || r.url().includes("_rsc"))) navigations++;
    });
    await page.locator('[data-fund-coin="ETH"]').click();
    await page.locator('[data-fund-network="optimism"]').click();
    await expect(page.locator('[data-fund-destination="evm-11155420-eth"]')).toBeVisible();
    await expect(page).toHaveURL(/\/fund\/1\?coin=eth&network=optimism$/);
    // the QR was drawn in the browser, ahead of the pick
    await expect(page.locator('[data-fund-destination] [role="img"][aria-label^="QR code for 0x"]')).toBeVisible();
    expect(navigations).toBe(0);
    // switching coin keeps no stale network: SOL has one place, so it shows straight away
    await page.locator('[data-fund-coin="SOL"]').click();
    await expect(page.locator('[data-fund-destination="sol"]')).toBeVisible();
  });

  test("unknown pre-fills are dropped, never guessed", async ({ page }) => {
    await page.goto("/fund/1?coin=doge&network=base");
    await expect(page.locator("[data-fund-destination]")).toHaveCount(0);
    await page.goto("/fund/1?coin=eth&network=solana");
    await expect(page.locator("[data-fund-destination]")).toHaveCount(0);
    await expect(page.locator("[data-fund-network]")).toHaveCount(4);
  });
});

test.describe("Share link: the public page, pre-filled by where it's shared from", () => {
  test("from the Bitcoin address row, the Inside header, a coin sheet and Add coins", async ({ page, baseURL }) => {
    await noShareSheet(page);
    const clip = () => page.evaluate(() => navigator.clipboard.readText());

    await page.goto("/s/1");
    await page.locator('[data-chain-row="btc"]').getByTestId("share-fund-link").click();
    await expect(page.getByTestId("toast").filter({ hasText: "Link copied" })).toBeVisible();
    expect(await clip()).toBe(`${baseURL}/fund/1?coin=btc`);

    await page.locator("section[aria-labelledby=inside-title]").getByTestId("share-fund-link").first().click();
    await expect.poll(clip).toBe(`${baseURL}/fund/1`);

    await page.goto("/s/1/coin/evm-84532-usdc");
    await page.getByTestId("coin-sheet").getByTestId("share-fund-link").click();
    await expect.poll(clip).toBe(`${baseURL}/fund/1?coin=usdc&network=base`);

    await page.goto("/s/1/receive?chain=evm&network=421614&asset=eth");
    await page.getByTestId("receive-flow").getByTestId("share-fund-link").click();
    await expect.poll(clip).toBe(`${baseURL}/fund/1?coin=eth&network=arbitrum`);
  });

  test("the Ethereum address lists its four explorers on one line, Etherscan included", async ({ page }) => {
    await page.goto("/s/1");
    const links = page.locator('[data-chain-row="evm"] [data-evm-network]');
    await expect(links).toHaveText([/Sepolia/, /Base/, /Arbitrum/, /OP/]);
    await expect(links.first()).toHaveAttribute("href", /sepolia\.etherscan\.io\/address\//);
    const ys = await links.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys).size).toBe(1);
  });
});

test("the value bar names the coin, its amount and share on hover", async ({ page }) => {
  await page.goto("/s/1");
  const card = page.locator("figure[data-card='1']").first();
  await card.locator('[data-share="BTC"]').hover();
  const tip = card.locator('[data-bar-tip="BTC"]');
  await expect(tip).toContainText("Bitcoin");
  await expect(tip).toContainText("0.00189718 BTC · 35%");
  await expect(tip).toContainText("≈ $");
});
