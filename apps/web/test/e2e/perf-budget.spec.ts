import { expect, test } from "@playwright/test";

/**
 * Performance guards for the public pages (docs/design/seo/technical-audit.md §2): the marketing and judge pages ship
 * React/Next plus a small shell, not the signing, chain, data and validation stack. The scripts a page's HTML references
 * must not carry a chain library, zod or near-connect, a page loaded with no wallet session must not ask GitHub for the
 * wallet manifest, and each page's JavaScript stays inside a budget. The budgets sit about 15% over what the pages ship
 * today: a regression that pulls a heavy module back into the shared shell blows through them (the stack it replaced
 * was about 2x the budget). Chunks that load later on demand (route prefetches, the wallet picker) are not counted.
 */

/** Strings that only exist inside the libraries the shared shell must not carry. */
const HEAVY_MARKERS = ["secp256k1", "ZodError", "keccak", "raw.githubusercontent.com", "near-api-js"];

// /s/1 is the judge page: in fixture mode its 2 s refresh loads the in-browser simulation on demand, and the page's own
// chunks carry the card and the clean-history display, so only its size is checked there
const PAGES: { path: string; budgetKb: number; markers?: false }[] = [
  { path: "/", budgetKb: 760 },
  { path: "/questions", budgetKb: 740 },
  { path: "/contract", budgetKb: 740 },
  { path: "/market", budgetKb: 800 },
  { path: "/s/1", budgetKb: 960, markers: false },
];

for (const { path, budgetKb, markers } of PAGES) {
  test(`${path}: no chain/zod/near-connect code or GitHub request, JavaScript inside ${budgetKb} KB`, async ({ page, request }) => {
    const html = await (await request.get(path)).text();
    const srcs = [...new Set([...html.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)].filter((m) => !/noModule/i.test(m[0])).map((m) => m[1]))];
    expect(srcs.length).toBeGreaterThan(3);
    const texts = await Promise.all(srcs.map(async (src) => ({ src, text: await (await request.get(src)).text() })));
    for (const { src, text } of markers === false ? [] : texts) {
      for (const marker of HEAVY_MARKERS) {
        expect(text.includes(marker), `${src.split("/").pop()} carries "${marker}"`).toBe(false);
      }
    }
    const kb = texts.reduce((n, t) => n + Buffer.byteLength(t.text), 0) / 1024;
    expect(kb, `${path} ships ${Math.round(kb)} KB of JavaScript`).toBeLessThan(budgetKb);

    // a visitor with no wallet session never reaches the wallet manifest on GitHub
    const hosts = new Set<string>();
    page.on("request", (r) => hosts.add(new URL(r.url()).hostname));
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(1500); // idle-started work has begun
    expect(hosts.has("raw.githubusercontent.com"), "no wallet manifest fetch without a session").toBe(false);
  });
}

test("/market is prerendered: the server HTML has the listings and states each server check by its time", async ({ request }) => {
  const html = await (await request.get("/market")).text();
  expect(html).toContain("data-market");
  expect(html).toMatch(/Server check at [A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2} UTC: /);
  expect(html).not.toContain("<!--$?-->"); // no Suspense fallback in front of the facts
});

test("/market: after hydration the server check reads as a relative time", async ({ page }) => {
  await page.goto("/market");
  await expect(page.locator("[data-market-item] [data-gate]").first()).toContainText(/^Server check (.+ ago|just now): /);
});
