import { expect, test, type Page } from "@playwright/test";
import { copy } from "@/lib/copy";

/** Mobile (Pixel 7): top bar + menu sheet below 1024, card above the fold, flows as a bottom sheet, no horizontal scroll. */
test("mobile shell and judge view", async ({ page }) => {
  await page.goto("/s/1");
  await expect(page.locator("header").getByRole("link", { name: "Satchel home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  const card = page.locator("figure[data-card='1']");
  const box = await card.boundingBox();
  expect(box && box.y + box.height).toBeLessThan(page.viewportSize()!.height); // the card is above the fold
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/s/1/receive?chain=btc");
  const sheet = page.locator("[data-flow-shell] [role='dialog']");
  const s = await sheet.boundingBox();
  expect(s && Math.round(s.x)).toBe(0); // bottom sheet, full width below 768
  // the full address as 4-character groups that wrap only between groups (its text is the raw address)
  const addr = page.locator('[data-flow-shell] [data-full-address="btc"]');
  await expect(addr).toHaveText("tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5");
  for (const g of await addr.locator(":scope > span").all()) expect(((await g.boundingBox())?.height ?? 0) < 26, "a group never breaks").toBe(true);
  // the primary's visible label really is "Copy address"
  await expect(sheet.getByRole("button", { name: "Copy address" })).toHaveText("Copy address");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

const L = copy.landing;
/**
 * Nothing scrolls sideways: the document is no wider than the device. Compared with the viewport size, not innerWidth,
 * because a mobile browser widens its layout viewport to fit overflowing content (innerWidth grows with it).
 */
const fits = async (page: Page) => (await page.evaluate(() => document.documentElement.scrollWidth)) <= page.viewportSize()!.width;

/** " NEAR wallet" is visually hidden below 480 px (the button shows "Connect", its name stays the full label). */
const tailHidden = (button: ReturnType<Page["getByRole"]>) => button.locator("span > span").evaluate((el) => getComputedStyle(el).position === "absolute");

/** The bar's Testnet badge, its lockup (2220×512) and the collapsed tile (512×512). */
const bar = (page: Page) => {
  const header = page.locator("header").first();
  const home = header.getByRole("link", { name: copy.nav.home });
  return { header, home, lockup: home.locator('svg[viewBox="0 0 2220 512"]'), tile: home.locator('svg[viewBox="0 0 512 512"]'), badge: header.locator("[data-testnet]") };
};

/**
 * The one shell on a phone (design-spec §3.3; app-screens §1.1): the 64 px top bar (lockup, Testnet, Connect or the
 * avatar, Menu) and the menu sheet: a bottom sheet named "Menu" with 56 px rows (My Satchels · Market · Mint · Contract
 * facts), the theme control and the account block; the page behind is inert; Esc closes it and focus returns to Menu;
 * a link closes it and navigates.
 */
test("mobile app shell: the top bar and the menu sheet", async ({ page }) => {
  await page.goto("/contract");
  const b = bar(page);
  expect(Math.round((await b.header.boundingBox())!.height)).toBe(64);
  await expect(b.lockup).toBeVisible();
  const connect = b.header.getByRole("button", { name: copy.nav.connect });
  expect(await tailHidden(connect)).toBe(true); // "Connect" below 480 px, the full name kept (WCAG 2.5.3)
  expect(Math.round((await connect.boundingBox())!.height)).toBe(44);
  await expect(b.badge).toBeHidden(); // below 420 px it steps aside for Connect (it stays in the sheet's testnet line)

  const open = page.getByRole("button", { name: copy.nav.openMenu });
  await open.click();
  const sheet = page.getByRole("dialog", { name: copy.nav.menu });
  await expect(sheet).toBeVisible();
  expect(Math.round((await sheet.boundingBox())!.x)).toBe(0); // a bottom sheet below 768
  const rows = sheet.getByRole("navigation", { name: "Main" }).getByRole("link");
  await expect(rows).toHaveText([copy.nav.mySatchels, copy.nav.market, copy.nav.mint, copy.nav.contract]);
  // measured once the sheet has settled (it slides in over 360 ms; mid-slide the rows read short)
  for (const r of await rows.all()) await expect.poll(async () => (await r.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await expect(rows.nth(3)).toHaveAttribute("aria-current", "page");
  await expect(sheet.getByRole("radio")).toHaveText([copy.theme.system, copy.theme.day, copy.theme.night]);
  for (const r of await sheet.getByRole("radio").all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(sheet.getByRole("button", { name: copy.nav.connect })).toBeVisible(); // signed out: the account block
  await expect(sheet).toContainText(copy.footer.testnet);
  // modal: the page behind is inert, focus starts on the title and stays inside
  expect(await page.evaluate(() => (document.querySelector("main")?.closest("[inert]") ?? null) !== null)).toBe(true);
  await expect(sheet.getByRole("heading", { name: copy.nav.menu })).toBeFocused();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused();
  expect(await page.evaluate(() => document.querySelector("main")?.closest("[inert]") ?? null)).toBeNull();

  // a row navigates and closes the sheet
  await open.click();
  await sheet.getByRole("link", { name: copy.nav.market }).click();
  await expect(page).toHaveURL(/\/market$/);
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("mobile shell: the page stays put when the menu sheet closes or a top-bar control takes focus", async ({ page }) => {
  // html's scroll-padding-top made Chrome scroll ~420 px up whenever a sticky-bar control took focus: closing the
  // menu (focus returns to Menu) or Shift+Tab back to the header lost the reader's place (globals.css §8)
  await page.goto("/s/1");
  const open = page.getByRole("button", { name: copy.nav.openMenu });
  const sheet = page.getByRole("dialog", { name: copy.nav.menu });
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(scrollY).toBe(700);
  await open.click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused();
  expect(await scrollY()).toBe(700);
  await open.click();
  await sheet.getByRole("button", { name: copy.nav.closeMenu }).click();
  await expect(sheet).toBeHidden();
  expect(await scrollY()).toBe(700);
  for (const name of [copy.nav.home, copy.nav.openMenu]) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator("header").getByRole(name === copy.nav.home ? "link" : "button", { name }).focus();
    expect(await scrollY(), name).toBe(700);
  }
});

test("mobile: a control that takes keyboard focus is never hidden under the pinned Buy bar (WCAG 2.4.11)", async ({ page }) => {
  // the bar is fixed to the bottom below 1024; the viewport's scroll padding keeps focused controls clear of it
  for (const path of ["/s/5", "/s/4/sale"]) {
    await page.goto(path);
    await expect(page.locator("[data-pinned-bar]").first()).toBeVisible();
    const covered: string[] = [];
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      const hidden = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null; // past the last control
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return "";
        const x = b.left + b.width / 2;
        const y = b.top + b.height / 2;
        const top = y >= 0 && y < window.innerHeight ? document.elementFromPoint(x, y) : null;
        return top && (top === el || el.contains(top) || top.contains(el)) ? "" : (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40);
      });
      if (hidden === null) break;
      if (hidden) covered.push(hidden);
    }
    expect(covered, path).toEqual([]);
  }
});

test("mobile app shell, signed in: the avatar's account sheet shows the full account ID", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("satchel:mock-wallet", "alice.satchelhq.testnet"));
  await page.goto("/satchels");
  const avatar = page.getByRole("button", { name: copy.nav.accountButton("alice.satchelhq.testnet") });
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("aria-expanded", "false");
  await avatar.click();
  const sheet = page.getByRole("dialog", { name: copy.nav.account });
  await expect(sheet).toBeVisible();
  // the trigger is in the (inert, aria-hidden) background now, so it's found by its test id rather than its role
  await expect(page.locator('[data-testid="account-pill"]:visible')).toHaveAttribute("aria-expanded", "true");
  await expect(sheet).toContainText("alice.satchelhq.testnet"); // the whole ID, never "a…"
  for (const name of [copy.nav.copyAccount, copy.nav.disconnect]) await expect(sheet.getByRole("button", { name })).toBeVisible();
  await expect(sheet.getByRole("link", { name: new RegExp(copy.nav.viewNearBlocks) })).toHaveAttribute("href", /nearblocks\.io\/address\/alice\.satchelhq\.testnet$/);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(avatar).toBeFocused();
  // the menu sheet carries the same account block
  await page.getByRole("button", { name: copy.nav.openMenu }).click();
  const menu = page.getByRole("dialog", { name: copy.nav.menu });
  await expect(menu).toContainText("alice.satchelhq.testnet");
  await menu.getByRole("button", { name: copy.nav.disconnect }).click();
  await expect(page.getByTestId("my-satchels")).toContainText(copy.home.signedOut.title);
});

/**
 * The landing on a phone (design-spec §4.1): the same top bar in its landing variant: the lockup (the tile below 360
 * px), Testnet (from 420 px when signed out), "Connect" with the full name "Connect NEAR wallet" on one 44 px line, and
 * the Menu sheet: the in-page links (How it works · Clean history · Questions), the app rows, the theme control. An
 * in-page link closes the sheet and lands its section; nothing scrolls sideways from 480 down to 320.
 */
test("mobile landing header, menu sheet and width", async ({ page }) => {
  await page.goto("/");
  const b = bar(page);
  await expect(b.home).toBeVisible();
  const connect = b.header.getByRole("button", { name: copy.nav.connect });
  expect(await tailHidden(connect)).toBe(true);
  for (const width of [480, 420, 412, 390, 375, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const box = (await connect.boundingBox())!;
    expect(Math.round(box.height), `one 44 px line at ${width}px`).toBe(44);
    expect(box.x + box.width, `inside the bar at ${width}px`).toBeLessThanOrEqual(width);
    await expect(b.lockup, `the lockup at ${width}px`).toBeVisible();
    if (width >= 420) await expect(b.badge, `Testnet in the bar at ${width}px`).toBeVisible();
    else await expect(b.badge, `no Testnet in the bar at ${width}px`).toBeHidden();
    expect(await fits(page), `horizontal scroll at ${width}px`).toBe(true);
  }
  await page.setViewportSize({ width: 340, height: 800 });
  await expect(b.tile).toBeVisible(); // the tile below 360 px
  await expect(b.lockup).toBeHidden();
  await page.setViewportSize({ width: 600, height: 800 });
  expect(await tailHidden(connect)).toBe(false); // the full label from 480 px
  await expect(b.badge).toHaveAttribute("title", copy.app.badgeTip);

  await page.setViewportSize({ width: 412, height: 839 });
  await expect(page.getByRole("navigation", { name: copy.nav.onThisPage })).toBeHidden(); // the bar's links show from 1024
  const open = page.getByRole("button", { name: copy.nav.openMenu });
  await open.click();
  const sheet = page.getByRole("dialog", { name: copy.nav.menu });
  await expect(sheet).toBeVisible();
  expect(Math.round((await sheet.boundingBox())!.x)).toBe(0); // a bottom sheet below 768
  const anchors = sheet.getByRole("navigation", { name: copy.nav.onThisPage });
  await expect(anchors.getByRole("link")).toHaveText([copy.nav.anchors.how, copy.nav.anchors.clean, copy.nav.anchors.questions]);
  const app = sheet.getByRole("navigation", { name: copy.nav.app });
  await expect(app.getByRole("link")).toHaveText([copy.nav.mySatchels, copy.nav.market, copy.nav.mint, copy.nav.contract]);
  for (const row of await sheet.getByRole("link").all()) expect((await row.boundingBox())!.height, await row.innerText()).toBeGreaterThanOrEqual(44);
  for (const r of await sheet.getByRole("radio").all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(sheet.getByRole("radio")).toHaveText([copy.theme.system, copy.theme.day, copy.theme.night]);
  expect(await page.evaluate(() => (document.querySelector("main")?.closest("[inert]") ?? null) !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused();

  // an in-page link closes the sheet and lands its section under the bar
  await open.click();
  await anchors.getByRole("link", { name: copy.nav.anchors.how }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#how$/);
  await expect(page.locator("#how h2").first()).toBeInViewport();

  for (const width of [390, 375, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await fits(page), `horizontal scroll at ${width}px`).toBe(true);
  }
});

test("mobile landing header, signed in: the My Satchels pill (the avatar alone below 480 px) goes to /satchels", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("satchel:mock-wallet", "alice.satchelhq.testnet"));
  await page.goto("/");
  const pill = bar(page).header.getByRole("link", { name: `${copy.nav.mySatchels}, ${copy.nav.signedInAs("alice.satchelhq.testnet")}` });
  await expect(pill).toHaveAttribute("href", "/satchels");
  expect(Math.round((await pill.boundingBox())!.width)).toBeLessThanOrEqual(48); // the avatar alone below 480
  await expect(bar(page).header.getByRole("button", { name: copy.nav.connect })).toHaveCount(0);
});

/**
 * The landing on a phone (design-spec §3.1, §4; brief: 390 is the primary phone width). At 390 × 844 the page stays
 * within its height budget (≤ 8,500 px; #clean ≤ 1,800), the hero reads top-down (the charm row, the H1, the lead, both
 * CTAs, then the shelf) with the H1, the lead and both CTAs on the first screen, the CTAs stack at full width, every
 * target is ≥ 44 px, the splits stack text first, and nothing scrolls sideways from 390 down to 320.
 */
test("mobile landing: the 390 budget, the hero order and the phone layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) window.scrollTo(0, y);
    window.scrollTo(0, 0);
  });
  // measured now at 390, asserted last (hard), so the layout checks below report even when another section runs long
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const clean = await page.evaluate(() => document.getElementById("clean")!.getBoundingClientRect().height);

  const top = page.locator("#top");
  const order = await page.evaluate(() =>
    [".lp-charmrow", "[data-hero-who]", "#hero-title", "[data-hero-text] > p", '#top a[href="/s/1"]', '#top a[href="/market"]', "[data-stage]"].map((s) =>
      Math.round(document.querySelector(s)!.getBoundingClientRect().top),
    ),
  );
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  // the H1, the lead and both CTAs are on the first screen, and the shelf starts on it
  expect((await top.getByRole("link", { name: L.hero.cta.secondary }).boundingBox())!.y + 56).toBeLessThanOrEqual(844);
  expect((await page.locator("[data-stage]").boundingBox())!.y).toBeLessThan(844);
  // below 480 the CTAs stack at full width
  const field = (await top.locator("[data-hero-text]").boundingBox())!;
  for (const name of [L.hero.cta.primary, L.hero.cta.secondary]) {
    const box = (await top.getByRole("link", { name }).boundingBox())!;
    expect(Math.round(box.width)).toBe(Math.round(field.width));
    expect(Math.round(box.height)).toBe(56);
  }
  // the loop's Pause is a 44 px target, and its caption keeps to one line (the count steps aside below 430)
  const toggle = top.getByRole("button", { name: L.hero.anim.pause });
  const tb = (await toggle.boundingBox())!;
  expect([Math.round(tb.width), Math.round(tb.height)]).toEqual([44, 44]);
  await expect(page.locator('[data-stage] [data-cap="3"] .lp-stage__count')).toBeHidden();
  // the splits stack text first; use cases are one column of rows
  for (const [text, art] of [
    ["#what-title", ".lp-what"],
    ["#trust-title", ".lp-trust"],
  ]) {
    expect((await page.locator(text).boundingBox())!.y).toBeLessThan((await page.locator(art).boundingBox())!.y);
  }
  const rows = page.locator("#uses [data-use-case]");
  const rowBoxes = await Promise.all([0, 1, 2].map((i) => rows.nth(i).boundingBox()));
  expect(new Set(rowBoxes.map((b) => Math.round(b!.x))).size).toBe(1);
  // the final call's buttons stack at full width too
  for (const name of [L.hero.cta.primary, copy.mint.cta]) expect(Math.round((await page.locator("#try-it").getByRole("link", { name }).boundingBox())!.height)).toBe(56);
  // every landing target is at least 44 px tall
  for (const a of await page.locator("main a, main button, main summary, footer a, footer button, header a, header button").all()) {
    if (!(await a.isVisible())) continue;
    const box = (await a.boundingBox())!;
    expect(box.height, `${await a.evaluate((el) => el.outerHTML.slice(0, 90))}`).toBeGreaterThanOrEqual(44);
  }

  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250); // the loop rebuilds its tracks after a resize
    expect(await fits(page), `horizontal scroll at ${width}px`).toBe(true);
  }

  expect(clean, "#clean at 390 (≤ 1,800 px)").toBeLessThanOrEqual(1_800);
  expect(height, "page height at 390 (≤ 8,500 px)").toBeLessThanOrEqual(8_500);
});

/**
 * The hero loop at phone widths (390, 360, 320): the card's words stay inside the card and its name is never cut, the
 * caption on show fits its one-line ticker, and the hand-off's swing stays inside the sky field, at every act.
 */
test("mobile landing: no truncation and no overflow in the hero loop", async ({ page }) => {
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-live", "");
    for (const ms of [2_000, 4_800, 7_900, 9_970, 10_300, 11_200]) {
      const out = await page.evaluate((t) => {
        const root = document.querySelector("[data-stage]")!;
        for (const a of root.getAnimations({ subtree: true }).filter((x) => x.effect?.getTiming().iterations === Infinity)) {
          a.pause();
          a.currentTime = t;
        }
        const bad: string[] = [];
        const field = root.getBoundingClientRect();
        const cardEl = root.querySelector(".lp-card")!;
        const card = cardEl.getBoundingClientRect();
        if (card.right > field.right + 0.5 || card.left < field.left - 0.5) bad.push(`the card leaves the field (${Math.round(card.left)}–${Math.round(card.right)})`);
        const name = root.querySelector<HTMLElement>(".lp-card__name")!;
        if (name.scrollWidth > name.clientWidth + 1) bad.push("the card's name is cut");
        if (t < 9_300 || t > 11_000) {
          for (const el of cardEl.querySelectorAll(".lp-l, .lp-pill")) {
            if (getComputedStyle(el).opacity === "0" || el.closest("[data-off]")) continue;
            const r = el.getBoundingClientRect();
            if (r.right > card.right + 1) bad.push(`${el.getAttribute("data-l") ?? el.className} leaves the card`);
          }
        }
        const ticker = root.querySelector<HTMLElement>(".lp-stage__ticker")!;
        for (const cap of ticker.children) if (getComputedStyle(cap).opacity === "1" && cap.scrollWidth > ticker.clientWidth + 1) bad.push(`caption ${cap.getAttribute("data-cap")} is cut`);
        if (document.documentElement.scrollWidth > window.innerWidth) bad.push("horizontal scroll");
        return bad;
      }, ms);
      expect(out, `at ${width}px, ${ms} ms`).toEqual([]);
    }
  }
});
