import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { REPO_URL } from "@/lib/config";
import { copy, type SolVariant } from "@/lib/copy";
import { FAQ_IDS, faqItems, splitLead } from "@/lib/faq";

/**
 * Trust, Under the hood and Questions (design-spec §4.7, §4.8; D-42). AI judges read only the server HTML, so the trust
 * statement, the limits, the six rules and every answer must be in the document itself, the depth inside closed native
 * `<details>` that open without JavaScript. Simulated and generic: no account, no Satchel number, no addresses, no read
 * time ("No admin key" is a build-time claim keyed to the role). e2e builds the release role (`final`) in fixture mode
 * with SOL send on and the SOL UI off (playwright.config.ts).
 */

const L = copy.landing;
const SOL: SolVariant = "ui"; // D-45: the landing always names Bitcoin, Ethereum and Solana
const FAQ = faqItems({ role: "final", sol: SOL });
const RULES = L.hood.rules(SOL);
/** Under the hood's "Check it yourself" links, in order: generic, none needs a live read. */
const LINKS: [string, string][] = [
  ["/s/1", L.hood.links.one],
  ["/s/1/activity", L.hood.links.activity],
  ["/market", L.hood.links.market],
  ["/contract", L.hood.links.contract],
  [REPO_URL, L.hood.links.repo],
];

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
/** Text as React writes it into the HTML. */
const htmlText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const noScripts = (raw: string) => raw.replace(/<script\b[\s\S]*?<\/script>/gi, "");
const BLOCK = /<\/?(?:p|div|li|ul|ol|dl|dt|dd|h[1-6]|section|figure|figcaption|header|footer|nav|main|article|aside|br|details|summary)\b[^>]*>/gi;

/** The document as an AI judge's extractor reads it: no scripts, styles or comments; blocks as spaces; inline tags dropped. */
function documentText(raw: string): string {
  const html = noScripts(raw).replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  return decode(html.replace(BLOCK, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ");
}

/** One section's server HTML: from its id to the next section's id. */
function between(raw: string, id: string, next: string): string {
  const html = noScripts(raw);
  const start = html.indexOf(`id="${id}"`);
  const end = html.indexOf(`id="${next}"`, start);
  expect(start, `#${id} in the HTML`).toBeGreaterThan(-1);
  expect(end, `#${next} after #${id}`).toBeGreaterThan(start);
  return html.slice(start, end);
}

const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));

async function landing(page: Page, theme?: "day" | "night") {
  if (theme) await page.addInitScript((t) => localStorage.setItem("satchel:theme:v1", t), theme);
  await page.goto("/");
  await expect(page.locator("#trust")).toBeVisible();
}

test.describe("landing trust: server HTML", () => {
  test("#trust: the H2, the lead, the limits with their bold lead, then one link, to /contract, in reading order", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    expect(raw).not.toMatch(/<div hidden id="S:/); // nothing streamed behind a fallback
    const trust = between(raw, "trust", "under-the-hood");
    expect(trust).toContain('data-lock-variant="locked"');
    const text = documentText(trust);
    const at = [L.lock.h2, L.lock.body, L.lock.limits, L.lock.cta].map((s) => text.indexOf(s));
    for (const i of at) expect(i).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(trust).toMatch(/<strong\b[^>]*>What you still trust:<\/strong>/);
    expect(hrefs(trust)).toEqual(["/contract"]);
    expect(text).not.toContain(copy.role.rc); // final: no release-candidate line
  });

  test("the Contract facts slip is art: lemon, aria-hidden, every label an attribute; the band reads nothing live", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    const band = between(raw, "trust", "questions");
    const art = /<div class="lp-trust" data-scheme="day" aria-hidden="true"[\s\S]*$/.exec(band)?.[0] ?? "";
    expect(art).not.toBe("");
    const s = L.lock.slip;
    for (const l of [s.title, s.keys, s.keysValue, s.admin, s.adminValue, s.code, s.codeValue, s.verdict]) expect(art, l).toContain(`data-l="${htmlText(l)}"`);
    // the slip's own words never reach the text layer ("Contract facts" does, as Under the hood's link)
    for (const l of [s.keys, s.keysValue, s.admin, s.code, s.verdict]) expect(documentText(band), l).not.toContain(l);
    const text = documentText(band);
    for (const re of [/\.testnet\b/, /#\d/, /\bUTC\b/, /\d{2}:\d{2}:\d{2}/, /Live on testnet|Live from testnet|belongs to|couldn't read/]) expect(text).not.toMatch(re);
    expect(band).not.toMatch(/<time\b|data-trust-proof|data-full-address/);
  });

  test("Under the hood: one closed <details> with the six rules (send), the five generic links and no addresses", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    // the "What else it does" strip (#more) follows Trust since the 2026-11-03 refresh: stop the slice there, or its help links count
    const hood = between(raw, "under-the-hood", "more");
    const details = noScripts(raw).match(/<details id="under-the-hood"[^>]*>/g) ?? [];
    expect(details).toHaveLength(1);
    expect(details[0]).not.toMatch(/\sopen(?:=|\s|>)/);
    const summary = decode(/<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(hood)![1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    expect(summary).toBe(`${L.hood.h2} ${L.hood.summary}`);
    const text = documentText(hood);
    for (const r of RULES) expect(text).toContain(`${r.title}. ${r.body}`);
    expect(hood.match(/data-hood-rule="\d"/g)).toHaveLength(6);
    expect(hrefs(hood)).toEqual(LINKS.map(([href]) => href));
    for (const [, label] of LINKS) expect(text).toContain(label);
    expect(hood).not.toContain("data-full-address");
    expect(text).not.toMatch(/Satchel #|A sale the check blocks|tb1q|0x[0-9a-f]{40}/i);
  });

  test("Questions: seven closed details[name=faq], q-send to q-testnet, each answer in the HTML with its bold lead", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    const q = between(raw, "questions", "try-it");
    const details = q.match(/<details\b[^>]*>/g) ?? [];
    expect(details).toHaveLength(7);
    for (const d of details) {
      expect(d).toContain('name="faq"');
      expect(d).not.toMatch(/\sopen(?:=|\s|>)/);
    }
    expect(details.map((d) => /\sid="([^"]+)"/.exec(d)?.[1])).toEqual([...FAQ_IDS]);
    const text = documentText(q);
    for (const it of FAQ) {
      expect(text).toContain(`${it.q} ${it.a}`); // the summary, then its answer
      expect(q).toMatch(new RegExp(`<strong\\b[^>]*>${reEscape(htmlText(splitLead(it.a).lead))}</strong>`));
    }
    // q-proves carries the landing's one disclosure (D-42)
    expect(documentText(between(raw, "q-proves", "q-after"))).toContain("Your browser, not the contract, checks each one on its own chain");
  });

  test("no landing text says 'other chains'; rule 1 and the chains answer both name Solana (D-45)", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    expect(documentText(raw).toLowerCase()).not.toContain("other chains");
    expect(RULES[0].body).toContain("plain SOL transfers");
    expect(documentText(between(raw, "under-the-hood", "more"))).toContain(RULES[0].body);
    const chains = FAQ.find((i) => i.id === "q-chains")!.a;
    expect(chains).toContain("SOL on Solana devnet");
    expect(documentText(between(raw, "questions", "try-it"))).toContain(chains);
  });
});

test.describe("landing trust: in the browser", () => {
  test("the art: a lemon field (a Day island in Night too) beside the text from 1024, its labels drawn, its coins peeking", async ({ browser }) => {
    for (const theme of ["day", "night"] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await landing(page, theme);
      const art = page.locator(".lp-trust");
      expect(await art.evaluate((el) => getComputedStyle(el).backgroundColor), theme).toBe("rgb(255, 216, 77)");
      const a = (await art.boundingBox())!;
      const h2 = (await page.locator("#trust-title").boundingBox())!;
      expect(a.x, "the art sits right of the text").toBeGreaterThan(h2.x + 400);
      const verdict = await art.locator(".lp-slip__verdict .lp-l").evaluate((el) => getComputedStyle(el, "::before").content);
      expect(verdict).toBe(`"${L.lock.slip.verdict}"`);
      await expect(art.locator('[data-k="peek-btc"]')).toBeVisible();
      await ctx.close();
    }
  });

  test("Under the hood opens from its ≥ 60 px row (mouse and keyboard); its links show when open", async ({ page }) => {
    await landing(page);
    const details = page.locator("#under-the-hood");
    const summary = details.locator("summary");
    const link = details.getByRole("link", { name: L.hood.links.contract });
    await expect(details).not.toHaveAttribute("open", /.*/);
    await expect(link).toBeHidden();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(60);
    await summary.click();
    await expect(details).toHaveAttribute("open", /.*/);
    await expect(link).toBeVisible();
    await expect(details.locator("[data-hood-rule]")).toHaveCount(6);
    for (const a of await details.getByRole("link").all()) expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).not.toHaveAttribute("open", /.*/);
  });

  test("Questions: Enter toggles a question, one opens at a time, every row is ≥ 64 px (72 from 768)", async ({ page }) => {
    await landing(page);
    for (const id of FAQ_IDS) expect((await page.locator(`#${id} summary`).boundingBox())!.height, id).toBeGreaterThanOrEqual(72);
    const keys = page.locator("#q-keys");
    await keys.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(keys).toHaveAttribute("open", /.*/);
    await expect(keys.locator("p")).toBeVisible();
    await expect(keys.locator("strong")).toHaveText(splitLead(FAQ.find((i) => i.id === "q-keys")!.a).lead);
    await page.keyboard.press("Enter");
    await expect(keys).not.toHaveAttribute("open", /.*/);
    // name="faq": opening another closes the open one
    await page.keyboard.press("Enter");
    await page.locator("#q-proves summary").click();
    await expect(page.locator("#q-proves")).toHaveAttribute("open", /.*/);
    await expect(keys).not.toHaveAttribute("open", /.*/);
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
    await expect(page.locator("#q-proves p")).toContainText("Your browser, not the contract, checks");
  });

  test("without JavaScript: the trust copy and the art show, and a click opens a question and Under the hood", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    const trust = page.locator("#trust");
    await expect(trust.getByRole("heading", { level: 2, name: L.lock.h2 })).toBeVisible();
    for (const s of [L.lock.body, L.lock.limits]) await expect(trust).toContainText(s);
    await expect(trust.getByRole("link", { name: L.lock.cta })).toHaveAttribute("href", "/contract");
    await expect(trust.locator(".lp-trust")).toBeVisible();
    const send = page.locator("#q-send");
    await expect(send.locator("p")).toBeHidden();
    await send.locator("summary").click();
    await expect(send).toHaveAttribute("open", /.*/);
    await expect(send.locator("p")).toBeVisible();
    await page.locator("#under-the-hood summary").click();
    await expect(page.locator("#under-the-hood [data-hood-rule]")).toHaveCount(6);
    await expect(page.locator("#under-the-hood").getByRole("link", { name: L.hood.links.one })).toBeVisible();
    await ctx.close();
  });

  test("at 390: the text, then the art; rows ≥ 64 px; nothing scrolls sideways with everything open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await landing(page);
    const art = (await page.locator(".lp-trust").boundingBox())!;
    const h2 = (await page.locator("#trust-title").boundingBox())!;
    expect(art.y, "the art comes after the text").toBeGreaterThan(h2.y + h2.height);
    await page.locator("#under-the-hood summary").click();
    await page.locator("#q-proves summary").click();
    await expect(page.locator("#under-the-hood [data-hood-rule]").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    for (const s of await page.locator("#questions summary").all()) expect((await s.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  });

  test("reduced motion: the pluses turn without a transition", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await landing(page);
    for (const sel of ["#under-the-hood summary svg", "#q-keys summary svg"]) {
      expect(await page.locator(sel).evaluate((el) => getComputedStyle(el).transitionProperty)).toBe("none");
    }
    await ctx.close();
  });

  test("axe: Trust (Under the hood open) and Questions (one open), in Day and Night: no serious or critical issues", async ({ browser }) => {
    for (const theme of ["day", "night"] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await landing(page, theme);
      await page.locator("#under-the-hood summary").click();
      await page.locator("#q-proves summary").click();
      await expect(page.locator("#q-proves p")).toBeVisible();
      const r = await new AxeBuilder({ page }).include("#trust").include("#questions").include("#try-it").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${theme} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      await ctx.close();
    }
  });
});
