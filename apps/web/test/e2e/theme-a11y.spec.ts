import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { copy } from "@/lib/copy";
import { ALICE, BOB, useMockWallet } from "./helpers";

const DAY_GROUND = "rgb(246, 245, 251)"; // #F6F5FB (brand 2.0 Day ground)
const NIGHT_GROUND = "rgb(18, 12, 38)"; // #120C26 (brand 2.0 Night ground)
const DAY_META = "#F6F5FB";
const NIGHT_META = "#120C26";
const KEY = "satchel:theme:v1";

/** The page's one visible theme control (design-spec §3.3: the side nav from 1024, the menu sheet below it in the app,
 * the footer on the landing): its System · Day · Night radios. */
const themeRadios = (page: Page) => page.getByRole("radiogroup", { name: copy.theme.label }).filter({ visible: true }).getByRole("radio");

type FirstPaint = { theme: string | null; bg: string; meta: string[] };

/**
 * Inject a probe as the very first thing in <body>: it records data-theme, the page background and the theme-color
 * metas at that moment, i.e. before any of the app's own scripts or hydration run. If the head script had not resolved
 * the theme yet, the first paint would use the other one (the flash).
 */
async function probeFirstPaint(page: Page) {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const res = await route.fetch();
    const html = (await res.text()).replace(
      /<body([^>]*)>/,
      `<body$1><script>window.__firstPaint={theme:document.documentElement.dataset.theme||null,bg:getComputedStyle(document.documentElement).backgroundColor,meta:[...document.querySelectorAll('meta[name="theme-color"]')].map(m=>m.content)};</script>`,
    );
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(html)) } });
  });
}
const firstPaint = (page: Page) => page.evaluate(() => (window as unknown as { __firstPaint: FirstPaint }).__firstPaint);

/** A page in a fresh context with `stored` in localStorage before any script runs (null: nothing stored). */
async function themedPage(browser: Browser, opts: { stored: string | null; os?: "dark" | "light"; reducedMotion?: "reduce" | "no-preference" }) {
  const ctx = await browser.newContext({ colorScheme: opts.os ?? "light", reducedMotion: opts.reducedMotion ?? "no-preference", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  if (opts.stored !== null) {
    await page.addInitScript(
      ([k, v]) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* ignore */
        }
      },
      [KEY, opts.stored] as const,
    );
  }
  return { ctx, page };
}

test.describe("theme (R12.3, D-42): Day by default whatever the OS; Night and System on request; no flash", () => {
  test("nothing stored: Day before first paint on / and /s/1, also on a dark OS; Day is checked", async ({ browser }) => {
    for (const os of ["dark", "light"] as const) {
      for (const path of ["/", "/s/1"]) {
        const { ctx, page } = await themedPage(browser, { stored: null, os });
        await probeFirstPaint(page);
        await page.goto(path);
        expect(await firstPaint(page), `${path} on a ${os} OS`).toEqual({ theme: "day", bg: DAY_GROUND, meta: [DAY_META] });
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(DAY_GROUND);
        await expect(themeRadios(page).filter({ hasText: copy.theme.day })).toHaveAttribute("aria-checked", "true");
        await ctx.close();
      }
    }
  });

  test("a stored Night is applied before first paint on / and /s/1, also on a light OS", async ({ browser }) => {
    for (const path of ["/", "/s/1"]) {
      const { ctx, page } = await themedPage(browser, { stored: "night", os: "light" });
      await probeFirstPaint(page);
      await page.goto(path);
      expect(await firstPaint(page), path).toEqual({ theme: "night", bg: NIGHT_GROUND, meta: [NIGHT_META] });
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(NIGHT_GROUND);
      // the first theme-color meta is the one browsers use; React may add its own after hydration
      expect(await page.evaluate(() => document.querySelector('meta[name="theme-color"]')!.getAttribute("content"))).toBe(NIGHT_META);
      await expect(themeRadios(page).filter({ hasText: copy.theme.night })).toHaveAttribute("aria-checked", "true");
      await ctx.close();
    }
  });

  test("a stored System follows the OS before first paint, and follows a live OS change", async ({ browser }) => {
    for (const [os, theme, bg] of [["dark", "night", NIGHT_GROUND], ["light", "day", DAY_GROUND]] as const) {
      const { ctx, page } = await themedPage(browser, { stored: "system", os });
      await probeFirstPaint(page);
      await page.goto("/");
      expect((await firstPaint(page)).theme, os).toBe(theme);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(bg);
      await page.emulateMedia({ colorScheme: os === "dark" ? "light" : "dark" });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme === "night" ? "day" : "night");
      await ctx.close();
    }
  });

  test("junk in storage means Day", async ({ browser }) => {
    const { ctx, page } = await themedPage(browser, { stored: "purple", os: "dark" });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("day");
    await ctx.close();
  });

  test("the soft 404 (/s/999, an unknown id inside the app shell) keeps a stored Night", async ({ browser }) => {
    const { ctx, page } = await themedPage(browser, { stored: "night", os: "light" });
    await page.goto("/s/999");
    await expect(page.getByRole("heading", { level: 1, name: copy.page.notfound.generic })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(NIGHT_GROUND);
    expect(await page.evaluate(() => document.querySelector('meta[name="theme-color"]')!.getAttribute("content"))).toBe(NIGHT_META);
    expect(await page.evaluate(() => document.documentElement.dataset.motion)).toMatch(/^(full|reduce)$/);
    await expect(themeRadios(page).filter({ hasText: copy.theme.night })).toHaveAttribute("aria-checked", "true");
    await ctx.close();
  });

  test("the toggle: System · Day · Night, arrow keys, switches in place, persists, and survives a reload without a flash", async ({ browser }) => {
    const { ctx, page } = await themedPage(browser, { stored: null, os: "light" });
    await page.goto("/");
    const radios = () => page.locator("footer").getByRole("radiogroup", { name: copy.theme.label }).getByRole("radio");
    await expect(radios()).toHaveText([copy.theme.system, copy.theme.day, copy.theme.night]);
    for (const r of await radios().all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await radios().nth(2).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe("night");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(NIGHT_GROUND);
    expect(await page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute("content")))).toEqual(
      expect.arrayContaining([NIGHT_META]),
    );
    await probeFirstPaint(page);
    await page.reload();
    expect(await firstPaint(page)).toMatchObject({ theme: "night", bg: NIGHT_GROUND });
    // arrow keys move and select: Night → (wraps) System (the OS is light: Day), System → Day
    await radios().nth(2).focus();
    await page.keyboard.press("ArrowRight");
    await expect(radios().nth(0)).toBeFocused();
    await expect(radios().nth(0)).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe("system");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("day");
    await page.emulateMedia({ colorScheme: "dark" }); // System follows a live OS change
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    await page.keyboard.press("ArrowRight");
    await expect(radios().nth(1)).toBeFocused();
    await expect(radios().nth(1)).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe("day");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("day");
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" }); // a later pick wins over the OS
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("day");
    await ctx.close();
  });

  test("one ThemeControl per surface (DL-9): the side nav from 1024 and the menu sheet below it in the app, the footer on the landing", async ({ browser }) => {
    const { ctx, page } = await themedPage(browser, { stored: null, os: "light" });
    const groups = () => page.getByRole("radiogroup", { name: copy.theme.label }).filter({ visible: true });
    await page.goto("/s/1");
    await expect(groups()).toHaveCount(1);
    await expect(page.locator("footer").getByRole("radiogroup")).toHaveCount(0); // the app footer carries none
    await page.goto("/");
    await expect(groups()).toHaveCount(1);
    await expect(page.locator("footer").getByRole("radiogroup", { name: copy.theme.label })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/s/1");
    await expect(groups()).toHaveCount(0); // below 1024 it lives in the menu sheet
    await page.getByRole("button", { name: copy.nav.openMenu }).click();
    const sheet = page.getByRole("dialog", { name: copy.nav.menu });
    await expect(sheet.getByRole("radiogroup", { name: copy.theme.label })).toBeVisible();
    await expect(groups()).toHaveCount(1);
    // switching in the sheet applies in place (and the sheet stays open)
    await sheet.getByRole("radio", { name: copy.theme.night }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    await expect(sheet).toBeVisible();
    await ctx.close();
  });
});

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** axe (by default with the WCAG 2.0–2.2 A/AA tags): the serious and critical violations, as `id: targets`. */
async function axe(page: Page, include?: string, tags: string[] = WCAG_22) {
  let b = new AxeBuilder({ page }).withTags(tags);
  if (include) b = b.include(include);
  const r = await b.analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("accessibility (axe, WCAG 2.0–2.2 A/AA) in Day (the default) and Night (stored) on every page (A2)", () => {
  const pages = [
    "/",
    "/s/1",
    "/s/1/activity",
    "/s/4/sale",
    "/contract",
    "/market",
    "/mint",
    "/satchels",
    "/no-such-page",
    "/s/1/give-link", // A2 (plan/feature-ideas.md A2): the not-connected guard state
    "/claim", // A2: the "missing secret" state (no fragment)
    "/s/1/empty", // A3 (plan/feature-ideas.md A3): the not-connected guard state
  ];
  for (const theme of ["day", "night"] as const) {
    for (const path of pages) {
      test(`no serious or critical violations on ${path} in ${theme === "day" ? "Day" : "Night"}`, async ({ browser }) => {
        const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
        expect(await axe(page)).toEqual([]);
        await ctx.close();
      });
    }
  }

  for (const theme of ["day", "night"] as const) {
    test(`/ under reduced motion, in ${theme === "day" ? "Day" : "Night"}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", reducedMotion: "reduce" });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      expect(await axe(page)).toEqual([]);
      await ctx.close();
    });

    test(`/ with the hero paused at 6.5 s (the check mid-way), in ${theme === "day" ? "Day" : "Night"}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", reducedMotion: "no-preference" });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const toggle = page.locator("#top").getByRole("button", { name: copy.landing.hero.anim.pause });
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await page.evaluate(() => {
        for (const a of document.querySelector("[data-stage]")!.getAnimations({ subtree: true })) a.currentTime = 6_500;
      });
      expect(await page.locator('[data-stage] [data-k="slip"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await axe(page)).toEqual([]);
      await ctx.close();
    });
  }

  test("the send flow dialog: labelled, focus inside, background inert, no serious violations", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/send?chain=evm");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAccessibleName("Send Ethereum");
    await expect(page.locator("#flow-title")).toBeFocused();
    expect(await page.evaluate(() => (document.querySelector("main [data-judge-facts]")?.closest("[inert]") ?? null) !== null)).toBe(true);
    // WCAG 2.0 and 2.1 A/AA: 2.1's label-in-name (2.5.3) covers the Max button ("Max: use the maximum, …")
    expect(await axe(page, "[data-flow-shell]", ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/s\/1$/);
  });

  for (const theme of ["day", "night"] as const) {
    const label = theme === "day" ? "Day" : "Night";

    test(`give by link (A2) review step: no serious or critical violations, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, ALICE);
      await page.goto("/s/1/give-link");
      await expect(page.getByTestId("create-link")).toBeVisible();
      expect(await axe(page, "[data-flow-shell]")).toEqual([]);
      await ctx.close();
    });

    test(`empty the Satchel (A3) address form: no serious or critical violations, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, ALICE);
      await page.goto("/s/1/empty");
      await expect(page.getByTestId("empty-addr-btc")).toBeVisible();
      expect(await axe(page, "[data-flow-shell]")).toEqual([]);
      await ctx.close();
    });

    test(`claim page (A2), the invalid-link state: no serious or critical violations, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await page.goto("/claim#not-a-real-secret");
      await expect(page.getByText("This link isn't valid")).toBeVisible();
      expect(await axe(page)).toEqual([]);
      await ctx.close();
    });

    test(`C4 the offer flow dialog, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, BOB);
      await page.goto("/s/6/offer");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      await expect(page.getByTestId("offer-flow").getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
      expect(await axe(page, "[data-flow-shell]", ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])).toEqual([]);
      await ctx.close();
    });

    test(`C4/C6 the Wallet tab with inside balances and incoming offers, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, BOB);
      await page.goto("/s/6/coin/inside-near");
      await page.getByTestId("add-near-amount").fill("1");
      await page.getByTestId("add-near-cta").click();
      await expect(page.getByTestId("inside-near-amount")).toHaveText("0.9991 NEAR", { timeout: 20_000 });
      await page.goto("/s/6/offer");
      await expect(page.getByTestId("offer-flow").getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
      await page.getByTestId("offer-amount").fill("1");
      await page.getByTestId("offer-cta").click();
      await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });
      await page.evaluate((a) => localStorage.setItem("satchel:mock-wallet", a), ALICE);
      await page.goto("/s/6");
      await expect(page.getByTestId("incoming-offers")).toBeVisible({ timeout: 20_000 });
      expect(await axe(page)).toEqual([]);
      await ctx.close();
    });

    test(`C4 the USDC offer's storage-credit prepay step, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, BOB);
      await page.goto("/s/6/offer");
      const flow = page.getByTestId("offer-flow");
      await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
      await page.getByRole("radio", { name: "USDC" }).click();
      await flow.getByTestId("offer-amount").fill("5");
      await expect(flow.getByTestId("storage-prepay")).toBeVisible();
      // axe reads colours as rendered: wait out the currency switch's highlight transition (mid-fade it fails contrast)
      // (finite ones only: spinners and skeleton pulses loop forever)
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
      await page.waitForTimeout(250);
      expect(await axe(page, "[data-flow-shell]", ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])).toEqual([]);
      await ctx.close();
    });

    test(`C6 the USDC/wNEAR coin sheets, with a deposit prepay step and the owner's withdraw controls, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, ALICE);
      await page.goto("/s/6/coin/inside-usdc");
      await page.getByTestId("add-usdc-amount").fill("5");
      await expect(page.getByTestId("storage-prepay")).toBeVisible();
      await page.getByTestId("prepay-storage-cta").click();
      await expect(page.getByTestId("storage-prepay")).toHaveCount(0, { timeout: 20_000 });
      await page.getByTestId("add-usdc-cta").click();
      await expect(page.getByTestId("inside-ft-amount-usdc")).toHaveText("5.00 USDC", { timeout: 20_000 });
      // the owner's withdraw controls are visible for both FT rows, one of them enabled
      await expect(page.getByTestId("withdraw-usdc")).toBeEnabled();
      expect(await axe(page, "[data-flow-shell]", ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])).toEqual([]);
      await page.goto("/s/6/coin/inside-wnear");
      await expect(page.getByTestId("withdraw-wnear")).toBeVisible();
      expect(await axe(page, "[data-flow-shell]", ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])).toEqual([]);
      await ctx.close();
    });

    test(`C4/C6 /satchels with the storage-credit row visible, in ${label}`, async ({ browser }) => {
      const { ctx, page } = await themedPage(browser, { stored: theme === "day" ? null : "night", os: "light" });
      await useMockWallet(page, BOB);
      await page.goto("/s/6/offer");
      const flow = page.getByTestId("offer-flow");
      await expect(flow.getByTestId("offer-gate")).toHaveAttribute("data-gate", "empty", { timeout: 20_000 });
      await page.getByRole("radio", { name: "USDC" }).click();
      await flow.getByTestId("offer-amount").fill("5");
      await flow.getByTestId("prepay-storage-cta").click();
      await expect(flow.getByTestId("offer-cta")).toBeEnabled({ timeout: 20_000 });
      await flow.getByTestId("offer-cta").click();
      await expect(page.getByTestId("toast").filter({ hasText: "sent" })).toBeVisible({ timeout: 20_000 });
      await page.goto("/satchels");
      await expect(page.getByTestId("storage-credit")).toBeVisible({ timeout: 20_000 });
      expect(await axe(page)).toEqual([]);
      await ctx.close();
    });
  }
});
