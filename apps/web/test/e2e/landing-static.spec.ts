import { expect, test, type Page } from "@playwright/test";
import { DEFAULTS } from "@/lib/config";
import { copy } from "@/lib/copy";
import { useMockWallet } from "./helpers";

/**
 * The landing is simulated and generic (D-42; design-spec §4.0). `/` reads nothing live (the static import scan is
 * `unit/landing-no-data.test.ts`): a disconnected visitor's browser asks no API and no chain host, the text names no
 * account, no Satchel number and no time, and the one disclosure ("Your browser, not the contract, checks…") lives only
 * in the closed `q-proves` answer. Every illustration label is an attribute, never text. e2e builds the release role
 * (`final`) in fixture mode.
 */

const L = copy.landing;
/** The chain and data hosts the app knows (config defaults), plus their families. Next's `?_rsc=` prefetches of linked
 * routes and the page's own assets are allowed; `/api/*` is not. */
const KNOWN_HOSTS = new Set(
  [...DEFAULTS.nearRpcs, DEFAULTS.nearTxApi, ...DEFAULTS.sepoliaRpcs, ...DEFAULTS.btcApis, ...DEFAULTS.solRpcs].map((u) => new URL(u).hostname),
);
const CHAIN_HOST = /(?:^|\.)(?:fastnear\.com|drpc\.org|publicnode\.com|ethpandaops\.io|0xrpc\.io|infura\.io|alchemy\.com|etherscan\.io|nearblocks\.io|solana\.com)$|mempool\.|sepolia/i;
/** What the text layer must never say on `/`. */
const NOT_IN_TEXT: RegExp[] = [/\.testnet\b/, /Satchel #/, /#\d/, /This happened on testnet/, /Live from testnet/, /belongs to/, /\bUTC\b/, /\d{1,2}:\d{2}(:\d{2})?\b/, /\b\d+\s?(s|min|h|d) ago\b/];
/** The disclosure, as `q-proves` says it. */
const DISCLOSURE = "Your browser, not the contract, checks each one on its own chain";
/** Anything that says the contract doesn't run the check: on `/` only the disclosure may, once. */
const NOT_THE_CONTRACT = /not the contract|contract doesn.t (?:run|enforce)|this app does/gi;
/** The illustrations' own words (attributes drawn by CSS): never in the text layer. (The visually hidden descriptions
 * do name a few of the art's facts, "300 NEAR", "3 past signatures", the two chapters, in sentences of their own.) */
const ART_LABELS = [
  L.desk.checkedBy,
  L.clean.labels.moved,
  L.clean.labels.recorded,
  L.clean.labels.unusedHead,
  L.clean.labels.held,
  L.lock.slip.verdict,
  L.lock.slip.keysValue,
  L.what.tags.btc,
  // site polish round §1.5/§3: the bento tiles' and the Uses hint's attribute-drawn art labels
  copy.offers.amount,
  `${copy.offers.expiry} ${copy.offers.expiry7}`,
  copy.giveLink.linkLabel,
  copy.giveLink.copy,
  copy.claim.claimedTitle,
  copy.allowance.manage.title,
  copy.allowance.capRow("ETH", "0.20", "0.50"),
  L.more.art.sameAddress,
  copy.empty.allDoneTitle,
  copy.empty.chainDone("Bitcoin"),
  L.uses.hint,
];

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const noScripts = (raw: string) => raw.replace(/<script\b[\s\S]*?<\/script>/gi, "");
const BLOCK = /<\/?(?:p|div|li|ul|ol|dl|dt|dd|h[1-6]|section|figure|figcaption|header|footer|nav|main|article|aside|br|details|summary)\b[^>]*>/gi;

/** The server document as an AI judge's extractor reads it: no scripts, styles or comments; attributes dropped. */
function documentText(raw: string): string {
  const html = noScripts(raw).replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  return decode(html.replace(BLOCK, " ").replace(/<[^>]+>/g, "")).replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

/** The landing's own text: `main` only (the shell's header and footer are H's and may name the network). */
function mainText(raw: string): string {
  const html = noScripts(raw);
  return documentText(html.slice(html.indexOf("<main"), html.indexOf("</main>")));
}

/** Every text node of the live page's main, scripts and styles excepted (hidden, aria-hidden and closed text included). */
async function liveText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement?.closest("script, style, template, noscript")) continue;
      out.push(n.textContent ?? "");
    }
    return out.join(" ").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
  });
}

/** Scroll the page down in wheel steps (the way a reader does), so every observer and engine sees every section. */
async function scrollToEnd(page: Page) {
  for (let i = 0; i < 200; i++) {
    const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2);
    if (done) break;
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
  }
}

test.describe("landing static: no live data from /", () => {
  for (const [w, h] of [
    [1280, 900],
    [390, 844],
  ] as const) {
    test(`a disconnected visitor at ${w}: load, a scroll to the end and 15 s idle ask no API and no chain host`, async ({ browser }) => {
      test.setTimeout(60_000);
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await useMockWallet(page, null);
      const seen: { url: string; method: string }[] = [];
      page.on("request", (r) => seen.push({ url: r.url(), method: r.method() }));
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await scrollToEnd(page);
      await page.waitForTimeout(15_000);

      const origin = new URL(page.url()).origin;
      const bad = seen
        .filter(({ url }) => {
          const u = new URL(url);
          if (u.protocol === "data:" || u.protocol === "blob:") return false;
          if (u.origin === origin) return u.pathname.startsWith("/api/");
          return KNOWN_HOSTS.has(u.hostname) || CHAIN_HOST.test(u.hostname);
        })
        .map(({ method, url }) => `${method} ${url}`);
      expect(bad).toEqual([]);
      // the page did talk to its own origin (so the listener was live), and only for assets and prefetches
      expect(seen.some(({ url }) => url.startsWith(origin))).toBe(true);
      await ctx.close();
    });
  }

  test("the landing's text names no account, no Satchel number and no time; no full address in the HTML", async ({ request, page }) => {
    const raw = await (await request.get("/")).text();
    const text = mainText(raw);
    for (const re of NOT_IN_TEXT) expect(text, `server HTML: ${re}`).not.toMatch(re);
    expect(raw).not.toContain("data-full-address");

    // the hydrated page, after every moment played and the loop ran
    await useMockWallet(page, null);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollToEnd(page);
    await page.waitForTimeout(3_000);
    const live = await liveText(page);
    for (const re of NOT_IN_TEXT) expect(live, `live page: ${re}`).not.toMatch(re);
    await expect(page.locator("[data-full-address]")).toHaveCount(0);
  });
});

test.describe("landing static: the disclosure and the illustration labels", () => {
  test("the browser-not-contract sentence is in the HTML once, inside #q-proves; nothing else says the contract doesn't check", async ({ request }) => {
    const raw = noScripts(await (await request.get("/")).text());
    const text = documentText(raw);
    expect(text.match(NOT_THE_CONTRACT) ?? []).toEqual(["not the contract"]);
    expect(text.split(DISCLOSURE)).toHaveLength(2); // exactly once
    const start = raw.indexOf('id="q-proves"');
    const end = raw.indexOf("</details>", start);
    expect(start).toBeGreaterThan(-1);
    expect(documentText(raw.slice(start, end))).toContain(DISCLOSURE);
  });

  test("on the live page the disclosure's text node sits inside #q-proves, and no illustration label is text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollToEnd(page);
    const where = await page.evaluate((re) => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement?.closest("script, style, template, noscript")) continue;
        if (new RegExp(re, "i").test(n.textContent ?? "")) out.push(n.parentElement?.closest("details[id]")?.id ?? "outside any question");
      }
      return out;
    }, NOT_THE_CONTRACT.source);
    expect(where).toEqual(["q-proves"]);
    const live = await liveText(page);
    for (const label of ART_LABELS) expect(live, label).not.toContain(label.replace(/\u00a0/g, " "));
    // ... and they are drawn: CSS paints each from its attribute
    const drawn = await page.locator(`.lp-slip__verdict .lp-l`).first().evaluate((el) => getComputedStyle(el, "::before").content);
    expect(drawn).toBe(`"${L.desk.clean}"`);
  });

  test("the illustration labels are absent from the server text layer too", async ({ request }) => {
    const text = documentText(await (await request.get("/")).text());
    for (const label of ART_LABELS) expect(text, label).not.toContain(label.replace(/\u00a0/g, " "));
  });
});
