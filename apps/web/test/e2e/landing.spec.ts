import { expect, test, type Browser, type Page } from "@playwright/test";
import { copy } from "@/lib/copy";

/**
 * The marketing landing `/` (Satchel 2.0; design-spec §4; R12: H1 C, hero A "the shelf", Day first). AI judges read
 * only the server HTML, so every heading and every word of the story must be in the document itself (scripts stripped)
 * and never behind a streamed fallback. e2e runs the release role (`final`) in fixture mode with SOL send on and the SOL
 * UI off. This spec owns the frame: the sections and their order, the header's anchors, the server HTML, no-JS, the
 * links, the one coral action, the word budgets, the heights, the widths and CLS. The hero loop has landing-hero.spec,
 * the catch and the once-on-enter moments landing-catch.spec, trust and Questions landing-trust.spec, the no-data rule
 * landing-static.spec.
 */

const L = copy.landing;
/** Every section of the page, in order (design-spec §4). */
const SECTION_IDS = ["top", "what", "uses", "how", "clean", "trust", "more", "questions", "try-it"];
/** The header's in-page anchors (design-spec §4.1), in page order. */
const ANCHORS = ["how", "clean", "questions"];
/**
 * voice-copy §3.9: the hero's copy (the who-line + H1 + lead + CTAs; 61 with Solana), each section, and everything above
 * Questions (320, plus 5 for the who-line the W4 blind test asked for, plus site-refresh F1's 6 words and the "What else
 * it does" strip's 49: site-refresh design notes §1, R9).
 */
const WORDS = { hero: 61, captions: 10, section: 50, aboveQuestions: 380 };
const CORAL = "rgb(255, 92, 77)";

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#xa0;|&#160;/gi, " ")
    .replace(/&amp;/g, "&");

/** A string as React writes it into an attribute value. */
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const noScripts = (raw: string) => raw.replace(/<script\b[\s\S]*?<\/script>/gi, "");

const BLOCK = /<\/?(?:p|div|li|ul|ol|dl|dt|dd|h[1-6]|section|figure|figcaption|header|footer|nav|main|article|aside|br|table|tr|td|th|details|summary)\b[^>]*>/gi;

/**
 * The visible document as a reader (or an AI judge's extractor) gets it: scripts, styles and comments removed, block
 * boundaries as spaces, inline tags dropped, entities decoded (a no-break space reads as a space), spaces collapsed.
 */
function documentText(raw: string): string {
  const html = noScripts(raw).replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  return decode(html.replace(BLOCK, " ").replace(/<[^>]+>/g, ""))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

function headings(raw: string, level: 1 | 2): string[] {
  return [...noScripts(raw).matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, "g"))].map((m) => decode(m[1].replace(/<[^>]+>/g, "")).trim());
}

/** Scroll the page down in wheel steps (the way a reader does), so every observer sees every section. */
async function scrollToEnd(page: Page) {
  for (let i = 0; i < 300; i++) {
    const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2);
    if (done) break;
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
  }
}

/**
 * Visible words: an element's own text runs, when it has a box and is not sr-only, hidden, inside an aria-hidden
 * subtree or inside a closed <details> (its summary counts). Illustration labels are attributes, so they never count.
 */
async function visibleWords(page: Page) {
  return page.evaluate((ids) => {
    const words = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.\-:/#]*/gu) || []).length;
    const visible = (el: Element) => {
      if (!el.getClientRects().length) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      const d = el.closest("details");
      if (d && !d.open && !el.closest("summary")) return false;
      if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      if (cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)") return false;
      return true;
    };
    const ownText = (el: Element) =>
      [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    const count = (root: Element | null, keep: (el: Element) => boolean = () => true) => {
      if (!root) return -1;
      let w = 0;
      for (const el of [root, ...root.querySelectorAll("*")]) {
        if (["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"].includes(el.tagName)) continue;
        if (el.closest("svg")) continue;
        const t = ownText(el);
        if (!t || !keep(el) || !visible(el)) continue;
        w += words(t);
      }
      return w;
    };
    const questions = document.getElementById("questions")!;
    const above = (el: Element) => !questions.contains(el) && (el.compareDocumentPosition(questions) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const sections: Record<string, number> = {};
    // Under the hood is counted on its own (voice-copy §3.9: trust 49 + the hood's 12 while closed)
    for (const id of ids) sections[id] = count(document.getElementById(id), (el) => !el.closest("#under-the-hood"));
    const heroCopy = document.querySelector("[data-hero-text]")!;
    return {
      hero: count(heroCopy),
      captions: [...document.querySelectorAll("#top [data-step] .sr-only")].reduce((n, el) => n + words(el.textContent ?? ""), 0),
      hood: count(document.getElementById("under-the-hood")),
      aboveQuestions: count(document.querySelector("main"), above),
      sections,
    };
  }, SECTION_IDS);
}

test.describe("landing: server HTML", () => {
  test("the who-line, one H1 (H1 C), the lead, both CTAs, then the stage's description and its four captions; nothing streamed", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const raw = await res.text();
    expect(raw).not.toMatch(/<div hidden id="S:/); // nothing streamed behind a fallback
    expect(raw).not.toContain('<template id="B:');

    expect(headings(raw, 1)).toEqual([copy.home.h1]);
    const text = documentText(raw);
    const at = [L.hero.who, copy.home.h1, L.hero.lead(true), L.hero.cta.primary, L.hero.cta.secondary, L.hero.anim.alt.replace(/\u00a0/g, " "), ...L.hero.anim.captions].map((s) =>
      text.indexOf(s),
    );
    for (const [i, p] of at.entries()) expect(p, `hero string ${i}`).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // no word is split from its punctuation by React's text separator (a naive extractor would read "only ." or "record :")
    expect(noScripts(raw)).not.toMatch(/[\p{L}\p{N}]<!-- -->[.,:;!?]/u);
    expect(noScripts(raw)).not.toContain("data-hero-note");
  });

  test("title, description, Open Graph, one theme-color (the Day ground) and no server data-theme", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    expect(raw).toMatch(/<title>An NFT that is a wallet · Satchel<\/title>/);
    expect(raw).toContain(`<meta name="description" content="${attr(L.meta.description(true))}"`);
    expect(raw).toContain(`<meta property="og:description" content="${attr(L.meta.description(true))}"`);
    expect(raw).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+\/opengraph-image\.png"/);
    expect(raw).toContain(`<meta property="og:image:alt" content="${attr(L.meta.ogAlt)}"`);
    expect(raw).toContain('<meta property="og:site_name" content="Satchel"');
    // Day first (R12.3): one theme-color, the Day ground; the head script rewrites it for Night
    expect([...raw.matchAll(/<meta name="theme-color" content="([^"]+)"/g)].map((m) => m[1].toUpperCase())).toEqual(["#F6F5FB"]);
    expect(raw).toContain('<meta name="color-scheme" content="light"/>');
    expect(raw).not.toMatch(/<html[^>]*data-theme=/); // set by the head script, never by the server
  });

  test("the eight sections render in page order with their H2s, and the header's anchors follow it", async ({ request }) => {
    const raw = noScripts(await (await request.get("/")).text());
    const at = SECTION_IDS.map((id) => raw.indexOf(`id="${id}"`));
    for (const [i, pos] of at.entries()) expect(pos, `#${SECTION_IDS[i]}`).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(headings(raw, 2)).toEqual(
      expect.arrayContaining([L.what.h2, L.uses.h2, L.how.h2, L.clean.h2, L.lock.h2, L.questions.h2, L.cta.h2]),
    );
    const header = raw.slice(raw.indexOf("<header"), raw.indexOf("</header>"));
    const anchors = [...header.matchAll(/href="#([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect([...new Set(anchors)]).toEqual(ANCHORS);
    expect(raw).toContain(`id="under-the-hood"`);
  });

  test("every section's words are in the HTML: what, uses, how, the catch, trust, the questions and the final call", async ({ request }) => {
    const text = documentText(await (await request.get("/")).text());
    const strings = [
      L.what.h2,
      L.what.body(true),
      ...L.uses.items.flatMap((i) => [i.title, i.body]),
      L.uses.lead,
      ...L.how.steps(true).flatMap((s) => [s.title, s.body]),
      ...L.clean.beats,
      L.clean.alt,
      L.lock.body,
      L.lock.limits,
      L.lock.cta,
      L.hood.summary,
      L.cta.body,
      copy.mint.cta,
    ];
    for (const s of strings) expect(text, s).toContain(s);
    expect(text).toContain(L.uses.h2);
    expect(text).toContain(L.cta.h2);
  });

  test("the illustrations are aria-hidden and their labels are attributes, never text", async ({ request }) => {
    const raw = noScripts(await (await request.get("/")).text());
    const text = documentText(raw);
    // the illustrations' own words (the visually hidden descriptions may name "300 NEAR" or the chapters; these never)
    for (const label of [L.desk.checkedBy, L.what.tags.btc, L.lock.slip.verdict, L.lock.slip.keysValue, L.clean.labels.recorded, L.clean.labels.moved]) {
      expect(text, label).not.toContain(label.replace(/\u00a0/g, " "));
      expect(raw, label).toContain(`data-l="${attr(label)}"`);
    }
    expect(raw).toMatch(/<div class="lp-stage__scene" data-scene="" aria-hidden="true">/);
    expect(raw).toMatch(/<div class="lp-what lg:order-first" aria-hidden="true" data-enter="what">/);
    expect(raw).toMatch(/<div class="lp-trust" data-scheme="day" aria-hidden="true"/);
    // site polish round \u00a71: every bento tile's well is aria-hidden art with no text, and the Uses hint is a
    // data-l attribute, never text
    const wells = [...raw.matchAll(/<div class="lp-tile__art[^"]*" aria-hidden="true"[^>]*>[\s\S]*?<\/div>\s*<div class="lp-tile__text">/g)];
    expect(wells.length).toBe(5);
    for (const [well] of wells) expect(documentText(well.slice(0, well.indexOf('<div class="lp-tile__text">'))).trim()).toBe("");
    expect(text).not.toContain(L.uses.hint);
    expect(raw).toContain(`data-l="${attr(L.uses.hint)}"`);
  });
});

test.describe("landing: without JavaScript", () => {
  test("every section reads: the hero's server frame (act 3), the steps list, the strip's five frames, Pause hidden, Day", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const top = page.locator("#top");
    await expect(top.getByRole("heading", { level: 1, name: copy.home.h1 })).toBeVisible();
    await expect(top.getByText(L.hero.lead(true), { exact: true })).toBeVisible();
    for (const name of [L.hero.cta.primary, L.hero.cta.secondary]) await expect(top.getByRole("link", { name })).toBeVisible();
    // the server frame: for sale, checked, clean; the price tag on; Yours not yet; the third caption showing
    const op = (k: string) => page.locator(`[data-k="${k}"]`).evaluate((el) => getComputedStyle(el).opacity);
    for (const k of ["card", "tag", "slip", "verdict", "pill-paused", "sig-3-used", "spark-1", "cap-3", "est", "seg-btc"]) expect(await op(k), k).toBe("1");
    for (const k of ["yours", "pill-active", "sig-1-checking", "cap-1", "cap-2", "cap-4"]) expect(await op(k), k).toBe("0");
    await expect(top.locator("[data-step]")).toHaveCount(4);
    await expect(top.locator('[data-step][aria-current="step"]')).toHaveAttribute("data-step", "3");
    await expect(top.locator("[data-pause]")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull(); // no head script: Day by CSS
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(246, 245, 251)");
    // every section's H2 is on screen when scrolled to, and the strip is whole
    for (const id of SECTION_IDS.slice(1)) await expect(page.locator(`#${id} h2`).first(), `#${id}`).toBeVisible();
    await expect(page.locator("#clean [data-beat]")).toHaveCount(5);
    for (const b of L.clean.beats) await expect(page.getByText(b, { exact: true })).toBeVisible();
    for (const s of [L.uses.lead, ...L.uses.items.map((i) => i.body), L.cta.body]) await expect(page.getByText(s, { exact: true }).first(), s).toBeVisible();
    // the bento: every title and line reads, and the offer slip (its once-on-enter moment) rests on its end frame
    await expect(page.locator("#more h3")).toHaveCount(5);
    for (const h of await page.locator("#more h3").all()) await expect(h).toBeVisible();
    for (const b of await page.locator("#more .lp-tile__body").all()) await expect(b).toBeVisible();
    expect(await page.locator('[data-k="offer-slip"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await ctx.close();
  });
});

test.describe("landing: links and the one coral action", () => {
  test("the hero's CTAs, the final call's and the header's Market open their pages", async ({ page }) => {
    await page.goto("/");
    await page.locator("#top").getByRole("link", { name: L.hero.cta.secondary }).click();
    await expect(page).toHaveURL(/\/market$/);
    await expect(page.getByRole("heading", { level: 1, name: "Market" })).toBeVisible();

    await page.goto("/");
    await page.locator("#top").getByRole("link", { name: L.hero.cta.primary }).click();
    await expect(page).toHaveURL(/\/s\/1$/);

    await page.goto("/");
    await expect(page.locator("#try-it").getByRole("link", { name: L.hero.cta.primary })).toHaveAttribute("href", "/s/1");
    await expect(page.locator("#try-it").getByRole("link", { name: copy.mint.cta })).toHaveAttribute("href", "/mint?from=/");
    await expect(page.locator("#trust").getByRole("link", { name: L.lock.cta })).toHaveAttribute("href", "/contract");
    await expect(page.locator("header").getByRole("link", { name: copy.nav.market, exact: true }).first()).toHaveAttribute("href", "/market");
  });

  for (const [w, h] of [
    [1280, 900],
    [390, 844],
  ] as const) {
    test(`one coral action in the first ${w} × ${h} screen: Look inside a Satchel`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const coral = await page.evaluate(
        ([fill, vh]) =>
          [...document.querySelectorAll("a, button")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.bottom > 0 && r.top < vh && getComputedStyle(el).backgroundColor === fill;
            })
            .map((el) => el.textContent?.trim()),
        [CORAL, h] as const,
      );
      expect(coral).toEqual([L.hero.cta.primary]);
      await ctx.close();
    });
  }
});

test.describe("landing: layout", () => {
  test("hero A at 1280: the H1 centred on two lines (ink, then ink-muted), CTAs in a row, the shelf below with its card in view", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const h1 = page.locator("#hero-title");
    const lines = await h1.locator("span").evaluateAll((els) => els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), color: getComputedStyle(e).color })));
    expect(lines).toHaveLength(2);
    expect(lines[1].top).toBeGreaterThan(lines[0].top);
    expect(lines[0].color).toBe("rgb(29, 19, 64)"); // ink
    expect(lines[1].color).toBe("rgb(94, 87, 118)"); // ink-muted
    expect(await h1.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    const [a, b] = await Promise.all([L.hero.cta.primary, L.hero.cta.secondary].map((name) => page.locator("#top").getByRole("link", { name }).boundingBox()));
    expect(Math.round(a!.y)).toBe(Math.round(b!.y));
    expect(Math.round(a!.height)).toBe(56);
    const band = (await page.locator('[data-k="card"]').boundingBox())!;
    expect(band.y, "the card's band is on the first screen").toBeLessThan(900 - 60);
    // the shelf: a sky field (a Day island) with the coins hanging at its ends from 1100
    const shelf = page.locator("[data-stage]");
    expect(await shelf.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(143, 211, 255)");
    await expect(page.locator(".lp-hang")).toHaveCount(3); // BTC, ETH and SOL (D-46)
    for (const hang of await page.locator(".lp-hang").all()) await expect(hang).toBeVisible();
  });

  test("hero A at 390: left-aligned, the charm row above a four-line H1, the CTAs stacked full width, then the shelf", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const order = await page.evaluate(() =>
      [".lp-charmrow", "[data-hero-who]", "#hero-title", "[data-hero-text] > p", '#top a[href="/s/1"]', '#top a[href="/market"]', "[data-stage]"].map((s) =>
        Math.round(document.querySelector(s)!.getBoundingClientRect().top),
      ),
    );
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const col = (await page.locator("[data-hero-text]").boundingBox())!;
    for (const name of [L.hero.cta.primary, L.hero.cta.secondary]) {
      const b = (await page.locator("#top").getByRole("link", { name }).boundingBox())!;
      expect(Math.round(b.width)).toBe(Math.round(col.width));
      expect(Math.round(b.height)).toBe(56);
    }
    // both CTAs are on the first screen
    expect((await page.locator("#top").getByRole("link", { name: L.hero.cta.secondary }).boundingBox())!.y + 56).toBeLessThanOrEqual(844);
    await expect(page.locator(".lp-hang").first()).toBeHidden(); // no hanging coins below 1100
  });

  test("the splits: What with its art left, Use cases and Trust with the art right, from 1024; stacked text-first at 390", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const x = (s: string) => page.locator(s).first().evaluate((el) => el.getBoundingClientRect().x);
    expect(await x(".lp-what")).toBeLessThan(await x("#what-title"));
    expect(await x("#uses-title")).toBeLessThan(await x('[data-testid="use-cases"]'));
    expect(await x("#trust-title")).toBeLessThan(await x(".lp-trust"));
    await page.setViewportSize({ width: 390, height: 844 });
    const y = (s: string) => page.locator(s).first().evaluate((el) => el.getBoundingClientRect().top);
    expect(await y("#what-title")).toBeLessThan(await y(".lp-what"));
    expect(await y("#trust-title")).toBeLessThan(await y(".lp-trust"));
  });

  test("Night: the illustration fields stay Day islands; the themed stickers take the Night outline (#8A82AE)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => localStorage.setItem("satchel:theme:v1", "night"));
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    const style = (s: string, prop: string) => page.locator(s).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
    expect(await style("[data-stage]", "background-color")).toBe("rgb(143, 211, 255)"); // sky
    expect(await style("[data-stage] .lp-card", "background-color")).toBe("rgb(255, 255, 255)"); // the island's Day surface
    expect(await style(".lp-trust", "background-color")).toBe("rgb(255, 216, 77)"); // lemon
    expect(await style("#try-it", "background-color")).toBe(CORAL);
    expect(await style("#try-it h2", "color")).toBe("rgb(29, 19, 64)"); // ink on coral, always
    expect(await style(".lp-what .lp-card", "border-top-color")).toBe("rgb(138, 130, 174)"); // the Night sticker line
    expect(await style(".lp-what .lp-card", "background-color")).toBe("rgb(28, 21, 56)"); // the Night surface
    // the bento's own band (--band, kb/81 R4): Night = surface-sunken, Day = a periwinkle tint; a tile is --surface,
    // and a tile's slip outline is the Night sticker line
    expect(await style("#more", "background-color")).toBe("rgb(41, 33, 75)");
    expect(await style(".lp-tile", "background-color")).toBe("rgb(28, 21, 56)");
    expect(await style(".lp-tile .lp-slip", "border-top-color")).toBe("rgb(138, 130, 174)");
    await ctx.close();
  });

  test("Day: the bento's band is a soft periwinkle, not lemon and not the page ground", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const style = (s: string, prop: string) => page.locator(s).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
    expect(await style("#more", "background-color")).toBe("rgb(227, 230, 246)");
    await ctx.close();
  });

  test("P12: the lead tile's card and slip are never cropped, fully inside the well at every width", async ({ browser }) => {
    const inside = (box: { x: number; y: number; width: number; height: number }, well: { x: number; y: number; width: number; height: number }, slack = 1) =>
      box.x >= well.x - slack && box.y >= well.y - slack && box.x + box.width <= well.x + well.width + slack && box.y + box.height <= well.y + well.height + slack;

    for (const w of [320, 360, 390, 430, 480, 600, 1024, 1280]) {
      // reduced motion: the offer slip's once-on-enter moment never arms, so the page sits straight on its settled,
      // static layout (the moment's own end frame equals the static CSS, motion-spec §10) — the geometry a reader
      // sees once it's done, not a frame mid-flight
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto("/");
      const total = page.locator("#more .lp-offer .lp-card__total").first();
      const [sw, cw] = await total.evaluate((el) => [el.scrollWidth, el.clientWidth]);
      expect(sw, `#more .lp-offer .lp-card__total at ${w}`).toBeLessThanOrEqual(cw);
      await expect(total, `#more .lp-offer .lp-card__total visible at ${w}`).toBeVisible();
      // the pill stays on the same row as the total (never dropped to a second line)
      const totalBox = await total.boundingBox();
      const pillBox = await page.locator("#more .lp-offer .lp-card__state").first().boundingBox();
      expect(totalBox && pillBox, `total/pill boxes at ${w}`).toBeTruthy();
      if (totalBox && pillBox) expect(Math.abs(totalBox.y - pillBox.y)).toBeLessThan(totalBox.height);
      // the card and the slip are fully inside the well's box: the fix for the real bug (a specificity collision let
      // .lp-card's own width:100% override .lp-offer__card's intended width, blowing the card up past the well)
      const well = await page.locator('#more .lp-tile[data-more="1"] .lp-tile__art').first().boundingBox();
      const card = await page.locator("#more .lp-offer .lp-card").first().boundingBox();
      const slip = await page.locator('[data-k="offer-slip"]').first().boundingBox();
      expect(well && card && slip, `well/card/slip boxes at ${w}`).toBeTruthy();
      if (well && card) expect(inside(card, well), `card inside well at ${w}: card=${JSON.stringify(card)} well=${JSON.stringify(well)}`).toBe(true);
      if (well && slip) expect(inside(slip, well), `slip inside well at ${w}: slip=${JSON.stringify(slip)} well=${JSON.stringify(well)}`).toBe(true);
      await ctx.close();
    }
  });
});

test.describe("landing: budgets", () => {
  test("words: the hero's copy ≤ 54, its captions 12, every section ≤ 50, Under the hood 12 closed, above Questions ≤ 320", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const w = await visibleWords(page);
    expect(w.hero, "the hero's copy").toBeGreaterThan(0);
    expect(w.hero, "the hero's copy").toBeLessThanOrEqual(WORDS.hero);
    expect(w.captions, "the four captions").toBe(WORDS.captions);
    for (const id of SECTION_IDS.slice(1)) {
      expect(w.sections[id], `visible words in #${id}`).toBeGreaterThan(0);
      expect(w.sections[id], `visible words in #${id}`).toBeLessThanOrEqual(WORDS.section);
    }
    expect(w.hood, "Under the hood while closed").toBe(12);
    expect(w.aboveQuestions, "visible words above #questions").toBeLessThanOrEqual(WORDS.aboveQuestions);
  });

  test("one h1; every link, button and summary is a ≥ 44 px target, at 1280 and 390", async ({ page }) => {
    for (const [w, h] of [
      [1280, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toHaveCount(1);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("main a, main button, main summary, header a, header button, footer a, footer button, footer [role=radio]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") return false;
            if (el.closest("details:not([open])") && !el.closest("summary")) return false;
            return r.height < 44;
          })
          .map((el) => el.outerHTML.slice(0, 90)),
      );
      expect(small, `targets under 44 px at ${w}`).toEqual([]);
    }
  });

  test("heights: ≤ 7,000 px at 1280 and ≤ 10,100 px at 390 (site polish round P8), #clean ≤ 900 px at 1280", async ({ page }) => {
    for (const [w, h, max] of [
      [1280, 900, 7_000],
      [390, 844, 10_100],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await page.waitForLoadState("load");
      const m = await page.evaluate(async () => {
        await document.fonts.ready;
        return { height: document.documentElement.scrollHeight, clean: document.getElementById("clean")!.getBoundingClientRect().height };
      });
      expect(m.height, `page height at ${w}`).toBeLessThanOrEqual(max);
      if (w === 1280) expect(m.clean, "#clean at 1280").toBeLessThanOrEqual(900);
    }
  });

  test("no horizontal scroll at 1440, 1280, 1024, 768, 390, 360 or 320, in Day and Night", async ({ browser }) => {
    for (const theme of ["day", "night"] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await ctx.addInitScript((t) => {
        try {
          localStorage.setItem("satchel:theme:v1", t);
        } catch {
          /* ignore */
        }
      }, theme);
      const page = await ctx.newPage();
      await page.goto("/");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      for (const width of [1440, 1280, 1024, 768, 390, 360, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(250); // the loop rebuilds its tracks after a resize
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${theme} at ${width}px`).toBeLessThanOrEqual(width);
      }
      await ctx.close();
    }
  });

  /** CLS: the sum of layout shifts without recent input, over load + 15 s (the loop's hand-off included) + a scroll to the end. */
  async function cls(browser: Browser, width: number, theme: "day" | "night") {
    const ctx = await browser.newContext({ viewport: { width, height: width > 600 ? 900 : 844 }, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("satchel:theme:v1", t);
      } catch {
        /* ignore */
      }
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    }, theme);
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(15_000);
    await scrollToEnd(page);
    await page.waitForTimeout(1_000);
    const value = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    await ctx.close();
    return value;
  }

  for (const width of [1280, 390]) {
    for (const theme of ["day", "night"] as const) {
      test(`CLS < 0.01 at ${width} in ${theme === "day" ? "Day" : "Night"} (load + 15 s + a scroll to the end)`, async ({ browser }) => {
        test.setTimeout(90_000);
        expect(await cls(browser, width, theme)).toBeLessThan(0.01);
      });
    }
  }
});
