import { expect, test } from "@playwright/test";

/**
 * Performance guards for the public pages (docs/design/seo/technical-audit.md §2): the marketing and judge pages ship
 * React/Next plus a small shell, not the signing, chain, data and validation stack. A page loaded with no wallet session
 * must not download a chain library, zod, or near-connect (and must not ask GitHub for its wallet manifest), and each
 * page's JavaScript stays inside a budget. The budgets sit about 15% over what the pages ship today: a regression that
 * pulls a heavy module back into the shared shell blows through them (the stack it replaced was 2x the budget).
 */

/** Strings that only exist inside the libraries the shared shell must not carry. */
const HEAVY_MARKERS = ["secp256k1", "ZodError", "keccak", "raw.githubusercontent.com", "near-api-js"];

// /s/1 is the judge page: in fixture mode its 2 s refresh loads the in-browser simulation, so only the size is checked there
const PAGES: { path: string; budgetKb: number; markers?: false }[] = [
  { path: "/", budgetKb: 760 },
  { path: "/questions", budgetKb: 740 },
  { path: "/contract", budgetKb: 740 },
  { path: "/market", budgetKb: 800 },
  { path: "/s/1", budgetKb: 1300, markers: false },
];

for (const { path, budgetKb, markers } of PAGES) {
  test(`${path}: no chain/zod/near-connect code or GitHub request, JavaScript inside ${budgetKb} KB`, async ({ page }) => {
    const scripts: { url: string; bytes: number; text: string }[] = [];
    const hosts = new Set<string>();
    const pending: Promise<void>[] = [];
    page.on("request", (r) => hosts.add(new URL(r.url()).hostname));
    page.on("response", (res) => {
      if (res.request().resourceType() !== "script") return;
      pending.push(
        res
          .text()
          .then((text) => {
            scripts.push({ url: res.url(), bytes: Buffer.byteLength(text), text });
          })
          .catch(() => {}),
      );
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(1500); // idle-started work (the landing's motion, prefetches) has begun
    await Promise.all(pending);

    expect(hosts.has("raw.githubusercontent.com"), "no wallet manifest fetch without a session").toBe(false);
    for (const s of markers === false ? [] : scripts) {
      for (const marker of HEAVY_MARKERS) {
        expect(s.text.includes(marker), `${s.url.split("/").pop()} carries "${marker}"`).toBe(false);
      }
    }
    const kb = scripts.reduce((n, s) => n + s.bytes, 0) / 1024;
    expect(kb, `${path} ships ${Math.round(kb)} KB of JavaScript`).toBeLessThan(budgetKb);
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
