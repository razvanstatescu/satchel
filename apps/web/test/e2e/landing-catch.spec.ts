import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GAP } from "@/components/landing/motion/enter";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

/**
 * The catch strip and the once-on-enter moments (design-spec §4.3, §4.5, §4.6, §4.7, §4.9; motion-spec §10). The strip
 * is itself the no-JS and reduced-motion state: five frames of real UI with their beats. With full motion each moment
 * waits below the fold on its first frame and plays once when 60 % of it is in view; the strip's beats take turns, at
 * least GAP ms apart; everything ends on the static frame and stops (nothing idles). Nothing moves without a scroll.
 */

const C = copy.landing.clean;
const H = copy.landing.how;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Visible text of raw server HTML: no scripts, no tags, entities decoded, every run of whitespace (NBSP too) one space. */
const docText = (raw: string) =>
  raw
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

/** The non-loop animations under a selector (the hero loop's own are infinite). */
const once = (page: Page, sel = "body") =>
  page.evaluate(
    (s) =>
      document
        .querySelector(s)!
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.playState),
    sel,
  );

/** Log, from page start, when each moment starts and stops running (window.__moments). */
async function logMoments(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __moments: { key: string; state: string; t: number }[] };
    w.__moments = [];
    const t0 = performance.now();
    const tick = () => {
      for (const el of document.querySelectorAll("[data-enter], [data-beat] [data-desk], [data-k='mint-card'], [data-k='give-pose']")) {
        const running = el.getAnimations({ subtree: true }).some((a) => a.playState === "running" && a.effect?.getTiming().iterations !== Infinity);
        const key = el.getAttribute("data-enter") ?? (el.closest("[data-beat]") ? `beat-${el.closest("[data-beat]")!.getAttribute("data-beat")}` : el.getAttribute("data-k")!);
        const last = w.__moments.filter((x) => x.key === key).at(-1);
        if (running && last?.state !== "run") w.__moments.push({ key, state: "run", t: performance.now() - t0 });
        if (!running && last?.state === "run") w.__moments.push({ key, state: "end", t: performance.now() - t0 });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const moments = (page: Page) => page.evaluate(() => (window as unknown as { __moments: { key: string; state: string; t: number }[] }).__moments);

/** Scroll the page down in wheel steps (the way a reader does). */
async function scrollToEnd(page: Page, step = 300) {
  for (let i = 0; i < 200; i++) {
    const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2);
    if (done) break;
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(100);
  }
}

test.describe("the strip in the server HTML", () => {
  test("the H2, the description, the five beats in order; the desks and chapter chips are illustrations", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    const html = raw.slice(raw.indexOf('<section id="clean"'), raw.indexOf('<section id="trust"'));
    expect(html.length).toBeGreaterThan(2_000);
    const t = docText(html);
    const at = [C.h2, C.alt, ...C.beats].map((s) => t.indexOf(s));
    for (const p of at) expect(p).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html.match(/<div class="lp-desk[^"]*" aria-hidden="true" data-desk="">/g)).toHaveLength(5);
    expect(html.match(/<span class="lp-pill lp-pill--(danger|success) self-start" aria-hidden="true">/g)).toHaveLength(2);
    // the desks' own words never reach the text layer (the description names the two chapters in its sentences)
    for (const label of [C.labels.moved, C.labels.recorded, C.labels.unusedHead, C.labels.held]) expect(t, label).not.toContain(label);
  });

  test("How it works: the H2 and the three steps' words, in order; the scenes are illustrations", async ({ request }) => {
    const raw = await (await request.get("/")).text();
    const html = raw.slice(raw.indexOf('<section id="how"'), raw.indexOf('<section id="clean"'));
    const t = docText(html).trim();
    expect(t).toBe([H.h2, ...H.steps(LANDING_NAMES_SOL).flatMap((s) => [s.title, s.body])].join(" "));
  });
});

test.describe("reduced motion and no JS: the strip as drawn", () => {
  test("reduced motion: every frame at its beat's end, nothing armed or moving after 3 s", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.waitForTimeout(1_000);
    await scrollToEnd(page, 600);
    await page.waitForTimeout(2_000);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const op = (k: string) => page.locator(`[data-k="${k}"]`).evaluate((el) => getComputedStyle(el).opacity);
    for (const k of ["note", "stamp", "rec-row", "unused-4", "buy-5-new", "head-5-new", "addr-btc", "addr-eth", "mint-card", "peek-btc", "s-face"]) expect(await op(k), k).toBe("1");
    for (const k of ["buy-5-old", "head-5-old", "row-5-old", "eth-amt-old"]) expect(await op(k), k).toBe("0");
    // the How card stays in its drawn swing pose (−8°)
    expect(await page.locator('[data-k="give-pose"]').evaluate((el) => getComputedStyle(el).transform)).toMatch(/^matrix\(0\.99/);
    for (const b of C.beats) await expect(page.getByText(b, { exact: true })).toBeVisible();
    await ctx.close();
  });

  test("no JS: the five frames and their beats, the tags on their strings, the facts slip, the S on the cover", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#clean [data-beat]")).toHaveCount(5);
    for (const b of C.beats) await expect(page.getByText(b, { exact: true })).toBeVisible();
    for (const k of ["addr-btc", "addr-eth", "note", "stamp", "buy-5-new", "s-face"]) await expect(page.locator(`[data-k="${k}"]`), k).toBeVisible();
    await ctx.close();
  });
});

test.describe("full motion: once on enter", () => {
  test.use({ reducedMotion: "no-preference" });

  test("below the fold each moment waits on its first frame; on screen at load it stays as drawn", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-live", "");
    await page.waitForTimeout(300);
    // armed (paused at 0): the tags are still off their strings, the stamp not yet down, Buy not yet up
    const op = (k: string) => page.locator(`[data-k="${k}"]`).evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await op("addr-btc")).toBe(0);
    expect(await op("stamp")).toBe(0);
    expect(await op("buy-5-new")).toBe(0);
    expect(new Set(await once(page, "#clean"))).toEqual(new Set(["paused"]));

    // a reload scrolled to the strip: what is on screen at mount stays as drawn
    await page.evaluate(() => document.getElementById("clean")!.scrollIntoView());
    await page.reload();
    await page.waitForTimeout(800);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1_000);
    const onScreen = await page.evaluate(() => {
      const r = document.querySelector('[data-beat="1"] [data-desk]')!.getBoundingClientRect();
      return r.top < window.innerHeight;
    });
    if (onScreen) expect(await page.locator('[data-beat="1"] [data-desk]').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });

  for (const [w, h] of [
    [1280, 900],
    [390, 844],
  ] as const) {
    test(`at ${w}: a scroll plays every moment once, the beats in turn (≥ ${GAP} ms apart), and all of it ends on the static frame`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: w, height: h });
      await logMoments(page);
      await page.goto("/");
      await page.waitForTimeout(1_200);
      await scrollToEnd(page);
      await page.waitForTimeout(5_000);
      const log = await moments(page);
      const starts = (k: string) => log.filter((m) => m.key === k && m.state === "run").map((m) => m.t);
      for (const k of ["what", "mint-card", "give-pose", "beat-1", "beat-2", "beat-3", "beat-4", "beat-5", "trust", "finale"]) expect(starts(k), `${k} plays once`).toHaveLength(1);
      const beats = [1, 2, 3, 4, 5].map((k) => starts(`beat-${k}`)[0]);
      for (let i = 1; i < 5; i++) expect(beats[i] - beats[i - 1], `beat ${i + 1} after beat ${i}`).toBeGreaterThanOrEqual(GAP - 50);
      // nothing left moving or armed, and the page rests on its static frame
      expect(await once(page)).toEqual([]);
      const op = (k: string) => page.locator(`[data-k="${k}"]`).evaluate((el) => getComputedStyle(el).opacity);
      for (const k of ["addr-btc", "note", "stamp", "rec-row", "unused-4", "buy-5-new", "peek-eth", "s-face"]) expect(await op(k), k).toBe("1");
      for (const k of ["buy-5-old", "head-5-old"]) expect(await op(k), k).toBe("0");
      // the How card swung to rest (data-rest: no transform)
      await expect(page.locator('[data-k="give-pose"]')).toHaveAttribute("data-rest", "");
      expect(await page.locator('[data-k="give-pose"]').evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    });
  }

  test("nothing moves without a scroll: after the hero's first frames, the page below holds still", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(1_500);
    const before = await once(page, "#clean");
    await page.waitForTimeout(3_000);
    expect(await once(page, "#clean")).toEqual(before);
    expect(before.every((s) => s === "paused")).toBe(true);
  });

  test("never behind a modal: a moment that enters while the page is inert shows its end at once", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector("main")!.setAttribute("inert", ""));
    await page.evaluate(() => document.querySelector('[data-beat="2"]')!.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(2_500);
    expect(await once(page, '[data-beat="2"]')).toEqual([]);
    expect(await page.locator('[data-k="stamp"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });
});

test.describe("accessibility", () => {
  for (const theme of ["day", "night"] as const) {
    test(`axe: no serious or critical violations in What, Use cases, How it works and the catch (${theme})`, async ({ page }) => {
      if (theme === "night") await page.addInitScript(() => localStorage.setItem("satchel:theme:v1", "night"));
      await page.goto("/");
      await scrollToEnd(page, 600);
      await page.waitForTimeout(4_000);
      const r = await new AxeBuilder({ page }).include("#what").include("#uses").include("#how").include("#clean").withTags(TAGS).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
});
