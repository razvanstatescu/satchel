import { expect, test } from "@playwright/test";
import { ADDR1 } from "./helpers";

/**
 * Judge path (kb/90 §8.1, §12.5; S-14): AI judges see only server HTML. With JavaScript DISABLED, /s/1 must contain the
 * owner, three full addresses, sig_count and the lock facts, and none of them may sit inside a `hidden` element
 * (Readability-style extractors drop hidden nodes; streamed Suspense segments are hidden).
 */
test.describe("judge facts without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/s/1 server HTML carries every judge fact outside hidden elements", async ({ page, request }) => {
    const raw = await (await request.get("/s/1")).text();
    expect(raw).not.toMatch(/<div hidden id="S:/); // no streamed (hidden) segments at all
    expect(raw).not.toContain("<template id=\"B:");

    await page.goto("/s/1");
    await expect(page).toHaveTitle("Satchel #1 · Satchel");
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toContain(ADDR1.btc);
    expect(desc?.toLowerCase()).toContain(ADDR1.evm);

    await expect(page.getByRole("heading", { level: 1, name: "This NFT is a wallet." })).toBeVisible();
    const facts = page.locator("[data-judge-facts]");
    await expect(facts).toHaveCount(1); // one element per page (2.0: the Wallet tab's main block: Inside + Facts)
    await expect(facts).toBeVisible();
    const fact = (k: string) => facts.locator(`[data-fact="${k}"] dd`);
    await expect(fact("owner")).toHaveText("alice.satchelhq.testnet");
    await expect(fact("status")).toHaveText("Active");
    await expect(facts.locator("[data-fact-sig-count]")).toHaveText("2");
    await expect(fact("keys")).toHaveText("none since birth");
    await expect(fact("code-hash")).toContainText(/[0-9a-f]{64}/);
    for (const [chain, a] of Object.entries(ADDR1)) {
      const el = facts.locator(`[data-full-address="${chain}"]`);
      await expect(el).toBeVisible();
      expect((await el.textContent())?.toLowerCase()).toBe(a.toLowerCase());
    }

    // nothing judge-relevant lives in a hidden ancestor. The account and the lock fact are single text nodes; an address
    // is drawn as 4-character groups (spans with no separator, app-screens \u00a70 #8), so it is checked as the whole text of
    // its `data-full-address` element.
    const hiddenHits = await page.evaluate(
      ([texts, addresses]) => {
        const hidden = (el: Element | null) => !!el?.closest("[hidden], template, [aria-hidden='true'] [hidden]");
        const missingText = texts.filter((n) => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let found = false;
          let allHidden = true;
          while (walker.nextNode()) {
            const t = walker.currentNode;
            if (!t.textContent?.toLowerCase().includes(n.toLowerCase())) continue;
            found = true;
            if (!hidden(t.parentElement)) allHidden = false;
          }
          return !found || allHidden;
        });
        const missingAddresses = addresses.filter(
          (a) => !Array.from(document.querySelectorAll("[data-full-address]")).some((el) => el.textContent?.toLowerCase() === a.toLowerCase() && !hidden(el)),
        );
        return [...missingText, ...missingAddresses];
      },
      [["alice.satchelhq.testnet", "none since birth"], [ADDR1.btc, ADDR1.evm, ADDR1.sol]] as const,
    );
    expect(hiddenHits).toEqual([]);
    // and each full address is also one contiguous string in the raw HTML (an attribute of its grouped element)
    for (const a of Object.values(ADDR1)) expect(raw.toLowerCase()).toContain(`data-address="${a.toLowerCase()}"`);
  });

  test("the brand card is real text (name, status, the labelled estimate, every coin's native amount)", async ({ page }) => {
    await page.goto("/s/1");
    const card = page.locator("figure[data-card='1']").first();
    await expect(card).toContainText("Satchel #1");
    await expect(card).toContainText("Active");
    // D-50: fiat only as the labelled estimate, "≈ $X" with "at mainnet prices" (fixture prices)
    await expect(card.locator("[data-overview-total]")).toHaveText(/^≈ \$[\d,]+\.\d{2}$/);
    await expect(card).toContainText("at mainnet prices");
    // each coin's total stays in the text layer: the amount, a no-break space, the ticker
    await expect(card).toContainText("0.00189718\u00a0BTC");
    await expect(card).toContainText("0.073979\u00a0ETH");
    await expect(card).not.toContainText("chains");
    await expect(card).toHaveAttribute("data-owned", "false"); // visitors never see the Yours sticker
    await expect(card.locator("[data-yours]")).toHaveCount(0);
  });

  test("/contract and /market render their facts on the server", async ({ page }) => {
    await page.goto("/contract");
    await expect(page.getByRole("heading", { level: 1, name: "Born without a key" })).toBeVisible();
    await expect(page.getByTestId("keyless")).toHaveText("Keyless since birth.");
    await expect(page.locator('[data-fact="keys"] dd')).toHaveText("Account is locked (no access keys)");
    await expect(page.locator('[data-fact="code-hash"] dd')).toContainText(/[0-9a-f]{64}/);
    await expect(page.locator('[data-fact="expected"] dd')).toContainText("Matches");
    // 2.0 (app-screens §11.1): one facts dl; the birth tx is an explorer link; each verify command says what it proves
    // and has a labelled Copy of at least 44 px
    await expect(page.locator("[data-judge-facts]")).toHaveCount(1);
    await expect(page.locator('[data-fact="birth"] dd a')).toHaveAttribute("href", /^https:\/\/testnet\.nearblocks\.io\/txns\/\w+/);
    await expect(page.getByText("It has never signed a transaction")).toBeVisible();
    const copies = page.getByRole("button", { name: "Copy command" });
    await expect(copies).toHaveCount(5);
    for (const b of await copies.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page).toHaveTitle("Contract facts · Satchel");

    await page.goto("/market");
    const items = page.locator("[data-market-item]");
    await expect(items).toHaveCount(3);
    // buyable first, the blocked #4 last, each with its server hint and age
    await expect(items.nth(2)).toHaveAttribute("data-market-item", "4");
    await expect(items.nth(2).locator("[data-gate]")).toHaveAttribute("data-gate", "blocked");
    await expect(items.first().locator("[data-gate]")).toHaveAttribute("data-gate", "clean");
    // the market shows the SERVER's check, labelled as such; only the buyer's browser check (on Buy) enables Buy
    // its age: "8 s ago", or "just now" under 5 s (as the browser's gate line says it; W4 design QA)
    await expect(items.nth(2).locator("[data-gate]")).toContainText(/^Server check (.+ ago|just now): needs attention$/);
    await expect(page.locator("[data-market]")).not.toContainText(/checked in your browser/i);
    // #5 (first: clean, newest) has 2 signatures since C7 added its message record; a message never blocks Buy
    await expect(items.first().getByRole("link")).toHaveAccessibleName(/^Satchel #\d, .+ Listing #\d · \d+ signatures? Server check (.+ ago|just now): clean$/);
  });

  test("/s/4/sale shows the listing and the verdict hint without JS", async ({ page }) => {
    await page.goto("/s/4/sale");
    const f = page.getByTestId("listing-facts");
    await expect(f).toContainText("Listing");
    await expect(f).toContainText("#4");
    await expect(f.locator("[data-hint-aggregate]")).toHaveAttribute("data-hint-aggregate", "blocked");
    // honest without JS (inventory 5.1.6a, d): the server's check is labelled as the server's, never "checked in your
    // browser"; Buy stays disabled and is never a Connect button on a blocked listing
    const verdict = page.locator("#clean-history");
    await expect(verdict).toContainText("Waiting for your browser's check");
    await expect(verdict).not.toContainText("Checked in your browser");
    await expect(page.getByTestId("buy")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("buy")).toHaveText("Buy for 2 NEAR");
    await expect(page.locator("[data-judge-facts]")).toHaveCount(1);
  });

});

test("unknown ids: HTTP 404 with the not-found UI (noindex), and a 404 from the JSON route", async ({ page, request }) => {
  // An id that was never minted is a hard 404, set by src/proxy.ts before the page streams (docs/handoff/web.md). The
  // view is in the server HTML (QA-POLISH #6), not left to the client as Next's error document, because judges and
  // crawlers read the HTML.
  const res = await request.get("/s/999");
  expect(res.status()).toBe(404);
  const raw = await res.text();
  expect(raw).not.toContain("__next_error__");
  expect(raw).toMatch(/<h1[^>]*>This Satchel doesn(?:'|&#x27;)t exist<\/h1>/);
  expect(raw).toMatch(/<meta name="robots" content="noindex"\/>/);
  await page.goto("/s/999");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This Satchel doesn't exist");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  expect((await request.get("/api/satchels/999")).status()).toBe(404);
  // one shell (v4 nested two: app-inventory §5.1.5): one Main nav, one footer; the charm S view's two ways out
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Mint a Satchel" })).toHaveAttribute("href", "/mint");
  await expect(page.getByRole("link", { name: "Go to My Satchels" })).toHaveAttribute("href", "/satchels");
  // any other URL is a hard 404 with the same view in the same single shell
  expect((await request.get("/no-such-page")).status()).toBe(404);
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This Satchel doesn't exist");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
});

test.describe("JSON and media routes", () => {
  test("/api/satchels/1 and /api/contract return the kb/90 §9 shapes", async ({ request }) => {
    const s = await (await request.get("/api/satchels/1")).json();
    expect(s).toMatchObject({ token_id: "1", contract: "satchel.satchelhq.testnet", owner: "alice.satchelhq.testnet", sig_count: 2, quiet_period_blocks: 250 });
    expect(s.addresses).toMatchObject({ btc: ADDR1.btc, sol: ADDR1.sol });
    expect(s.addresses.evm.toLowerCase()).toBe(ADDR1.evm);
    expect(s.balances.btc).toEqual({ confirmed_sats: "189718", unconfirmed_sats: "0" });
    expect(Array.isArray(s.errors)).toBe(true);
    const c = await (await request.get("/api/contract")).json();
    expect(c).toMatchObject({ account_id: "satchel.satchelhq.testnet", access_keys: 0, locked: true, any_signer_tx_count: 0 });
    expect(c.config.cooldown_blocks).toBe(250);
    expect((await request.get("/api/satchels/abc")).status()).toBe(400);
    expect((await request.get("/api/satchels/999")).status()).toBe(404);
  });

  test("/api/card/3.svg is the brand card with state, no balances", async ({ request }) => {
    const r = await request.get("/api/card/3.svg");
    expect(r.headers()["content-type"]).toContain("image/svg+xml");
    const svg = await r.text();
    expect(svg).toContain("Satchel #3");
    expect(svg).toContain("Paused for sale"); // the 2.0 state word (voice-copy §1.2), read from copy.pill
    expect(svg).not.toContain(">Listed<");
    expect(svg).toContain("1 signature");
    expect(svg).not.toMatch(/0\.00|alice\.|Yours/); // no balances, no owner, no Yours: the image is the same for everyone
    // D-23: the brand faces travel inside the SVG (3 WOFF2 subsets as data: URIs), so it renders the same everywhere
    expect(svg.match(/@font-face\{font-family:'Satchel Card (Display|Sans|Label)'/g)).toHaveLength(3);
    expect(svg).toContain("src:url(data:font/woff2;base64,d09GMg");
    const one = await (await request.get("/api/card/1.svg")).text();
    expect(one).toContain('aria-label="Satchel #1. Active. 2 signatures recorded on NEAR testnet."');
    const h = await request.get("/api/clean-history/4");
    expect((await h.json()).aggregate).toBe("blocked");
  });
});

test("robots.txt allows every crawler and sitemap.xml lists every minted Satchel (judges crawl too, Q-017)", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const r = await robots.text();
  expect(r).toMatch(/User-Agent: \*\s+Allow: \//i);
  expect(r).not.toMatch(/Disallow: \/\S/);
  expect(r).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const x = await sitemap.text();
  // fixture config: next_token_id 8 → Satchels 1 … 7, three tabs each, plus the five public pages
  expect(x.match(/<url>/g)).toHaveLength(5 + 7 * 3);
  expect(x).toMatch(/<loc>[^<]*\/s\/7\/activity<\/loc>/);
  expect(x).not.toMatch(/\/s\/8</);
  expect(x).not.toMatch(/\/(send|transfer)</);
});
