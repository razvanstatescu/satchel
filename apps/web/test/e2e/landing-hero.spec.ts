import { expect, test, type Page } from "@playwright/test";
import { HERO_KEYS, START_AT, T } from "@/components/landing/hero/timeline";
import { copy } from "@/lib/copy";

/**
 * The hero loop (design-spec §4.2; motion-spec §10, §0 rule 8; MOTION-NOTES). The server HTML draws act 3 at rest; with
 * full motion the loop mounts on exactly that frame (START_AT) and plays one 12 s WAAPI clock, the first motion being the
 * hand-off. Pause (WCAG 2.2.2) is visible only while the loop runs; the loop also pauses below 20 % visibility, on a
 * hidden tab and in an inert tree (a dialog or the menu sheet over the page). Reduced motion and no JS: the server frame,
 * nothing moves. The 10° swing stays inside the sky field at every width, and no label truncates.
 */

const A = copy.landing.hero.anim;

type Anim = { state: string; time: number; duration: number | string };

/** The bundle's scripts (the inline head script that sets `data-motion` is in the HTML, so it still runs). */
const BUNDLE_JS = /\/_next\/static\/.*\.js(\?.*)?$/;

/** What the stage shows: each moving piece's computed opacity and transforms, and its box to the pixel. */
function readFrame(page: Page) {
  return page.evaluate((keys) => {
    const root = document.querySelector("[data-stage]")!;
    return Object.fromEntries(
      keys.map((k) => {
        const el = root.querySelector(`[data-k="${k}"]`)!;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // an animation at rest computes "0px" / "0deg" / "1" where the static CSS says "none": the same picture
        const translate = /^(none|0px|0px 0px)$/.test(cs.translate) ? "none" : cs.translate;
        const rotate = /^(none|0deg)$/.test(cs.rotate) ? "none" : cs.rotate;
        const scale = /^(none|1|1 1)$/.test(cs.scale) ? "none" : cs.scale;
        const opacity = Number(cs.opacity).toFixed(2);
        // an unseen piece (opacity 0) may sit anywhere: only what shows has to match
        if (opacity === "0.00") return [k, { opacity }];
        return [k, { opacity, translate, rotate, scale, box: [r.x, r.y, r.width, r.height].map(Math.round).join(",") }];
      }),
    );
  }, HERO_KEYS as string[]);
}

/** Every live animation under the stage: play state, current time and duration (pending play/pause settled first). */
function heroAnims(page: Page): Promise<Anim[]> {
  return page.evaluate(async () => {
    const all = document.querySelector("[data-stage]")?.getAnimations({ subtree: true }) ?? [];
    await Promise.all(all.map((a) => a.ready.catch(() => undefined)));
    return all
      .filter((a) => a.playState !== "finished")
      .filter((a) => (a.effect?.getTiming().iterations ?? 1) === Infinity) // the loop's own, not a charm's swing
      .map((a) => ({ state: a.playState, time: Number(a.currentTime), duration: a.effect?.getTiming().duration as number }));
  });
}

async function expectRunning(page: Page) {
  await expect.poll(async () => (await heroAnims(page)).map((a) => a.state)).not.toContain("paused");
  const a = await heroAnims(page);
  expect(a.length).toBeGreaterThan(40);
  expect(new Set(a.map((x) => x.state))).toEqual(new Set(["running"]));
}

async function expectPaused(page: Page) {
  await expect.poll(async () => [...new Set((await heroAnims(page)).map((a) => a.state))]).toEqual(["paused"]);
  const t0 = (await heroAnims(page))[0].time;
  await page.waitForTimeout(400);
  expect((await heroAnims(page))[0].time, "the clock holds while paused").toBe(t0);
}

/** Hold every loop animation at `ms` (one clock). */
async function seek(page: Page, ms: number) {
  await page.evaluate(async (t) => {
    const all = document.querySelector("[data-stage]")!.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations === Infinity);
    for (const a of all) {
      a.pause();
      a.currentTime = t;
    }
    await Promise.all(all.map((a) => a.ready));
  }, ms);
}

test.describe("hero loop: reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the server frame (act 3 at rest); no animation runs after 3 s; Pause stays hidden; act 3 is current", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.waitForTimeout(3_000);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const fig = page.locator("[data-stage]");
    await expect(fig).not.toHaveAttribute("data-live", /.*/);
    await expect(fig.locator("[data-pause]")).toBeHidden();
    await expect(fig.locator('[data-step][aria-current="step"]')).toHaveAttribute("data-step", "3");
    const op = (k: string) => fig.locator(`[data-k="${k}"]`).evaluate((el) => getComputedStyle(el).opacity);
    for (const k of ["card", "tag", "slip", "verdict", "pill-paused", "cap-3"]) expect(await op(k), k).toBe("1");
    for (const k of ["yours", "pill-active", "cap-4"]) expect(await op(k), k).toBe("0");
  });
});

test.describe("hero loop: full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the first painted frame is the server frame, and the loop mounts on exactly that frame at START_AT, on one 12 s clock", async ({ page, context }) => {
    // the page as painted before the bundle arrives: only the inline head script runs (it sets data-motion="full")
    await page.route(BUNDLE_JS, (r) => r.abort());
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    const fig = page.locator("[data-stage]");
    await expect(fig).not.toHaveAttribute("data-live", /.*/);
    await expect(fig.locator("[data-pause]")).toBeHidden(); // its place is kept until the loop runs
    const painted = await readFrame(page);

    const live = await context.newPage();
    await live.goto("/", { waitUntil: "commit" });
    const times = await live.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const look = () => {
            const root = document.querySelector("[data-stage]");
            if (!root?.hasAttribute("data-live")) return void requestAnimationFrame(look);
            resolve(root.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations === Infinity).map((a) => Number(a.currentTime)));
          };
          look();
        }),
    );
    expect(times.length).toBeGreaterThan(40);
    expect(Math.min(...times), "the loop starts at the server frame").toBeGreaterThanOrEqual(START_AT - 1);
    expect(Math.max(...times), "one clock, from START_AT").toBeLessThan(START_AT + 250);
    expect(new Set((await heroAnims(live)).map((x) => x.duration))).toEqual(new Set([T]));
    await seek(live, START_AT);
    expect(await readFrame(live)).toEqual(painted);
  });

  test("the first thing that moves is the hand-off: the tag unclips at 9 s, the card swings 10° at 9.97 s, Yours sticks on", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-live", "");
    const at = async (ms: number) => {
      await seek(page, ms);
      return page.evaluate(() => {
        const q = (k: string) => getComputedStyle(document.querySelector(`[data-stage] [data-k="${k}"]`)!);
        return { hanger: q("hanger").rotate, tag: Number(q("tag").opacity), yours: Number(q("yours").opacity), active: Number(q("pill-active").opacity), act: document.querySelector("[data-stage]")!.getAttribute("data-act") };
      });
    };
    const rest = await at(START_AT);
    expect(rest.hanger).toMatch(/^(0deg|none)$/);
    expect(rest).toMatchObject({ tag: 1, yours: 0 });
    expect((await at(9_966)).hanger).toBe("-10deg");
    expect((await at(9_400)).tag).toBe(0);
    const landed = await at(11_200);
    expect(landed).toMatchObject({ yours: 1, active: 1 });
    // the steps list follows the act on show (for assistive tech)
    await expect(page.locator('[data-stage] [data-step][aria-current="step"]')).toHaveAttribute("data-step", "4");
    await at(1_500);
    await expect(page.locator('[data-stage] [data-step][aria-current="step"]')).toHaveAttribute("data-step", "1");
  });

  test("Pause: visible, 44 × 44, one name, flips aria-pressed and holds the clock; the keyboard too", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#top").getByRole("button", { name: A.pause });
    await expect(toggle).toBeVisible();
    const b = (await toggle.boundingBox())!;
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([44, 44]);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expectRunning(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAccessibleName(A.pause); // one name: the state is aria-pressed
    await expectPaused(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expectRunning(page);
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expectPaused(page);
  });

  test("pauses below 20 % visibility and resumes on screen", async ({ page }) => {
    await page.goto("/");
    await expectRunning(page);
    await page.locator("#uses").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
    await expectPaused(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectRunning(page);
  });

  test("pauses on a hidden tab and resumes when it shows again", async ({ page }) => {
    await page.goto("/");
    await expectRunning(page);
    const setHidden = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
        document.dispatchEvent(new Event("visibilitychange"));
      }, hidden);
    await setHidden(true);
    await expectPaused(page);
    await setHidden(false);
    await expectRunning(page);
  });

  test("pauses in an inert tree (a dialog over the page) and resumes when it lifts", async ({ page }) => {
    await page.goto("/");
    await expectRunning(page);
    await page.evaluate(() => document.querySelector("main")!.setAttribute("inert", ""));
    await expectPaused(page);
    await page.evaluate(() => document.querySelector("main")!.removeAttribute("inert"));
    await expectRunning(page);
  });

  test("pauses behind the menu sheet (390) and resumes when it closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    // at 390 × 844 the stage starts below the who-line, the H1, the lead and the CTAs: under 20 % of it shows on load, so
    // the loop rightly waits off-screen. Bring it into view first (the top bar is sticky, so Open menu stays on screen).
    await page.locator("[data-stage]").scrollIntoViewIfNeeded();
    await expectRunning(page);
    await page.getByRole("button", { name: copy.nav.openMenu }).click();
    await expect(page.getByRole("dialog", { name: copy.nav.menu })).toBeVisible();
    await expectPaused(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: copy.nav.menu })).toBeHidden();
    await expectRunning(page);
  });

  test("a live switch to reduced motion stops the loop on the server frame; switching back plays again", async ({ page }) => {
    await page.goto("/");
    await expectRunning(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await expect.poll(() => page.evaluate(() => document.querySelector("[data-stage]")!.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator("[data-stage]")).not.toHaveAttribute("data-live", /.*/);
    await expect(page.locator("[data-stage] [data-pause]")).toBeHidden();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-live", "");
    await expectRunning(page);
  });

  for (const width of [1280, 390, 320]) {
    test(`at ${width}: the hand-off's swing stays inside the sky field, and no label truncates in any act`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.locator("[data-stage]")).toHaveAttribute("data-live", "");
      for (let ms = 9_300; ms <= 11_000; ms += 100) {
        await seek(page, ms);
        const out = await page.evaluate(() => {
          const fig = document.querySelector("[data-stage]")!.getBoundingClientRect();
          const card = document.querySelector('[data-stage] [data-k="card"] .lp-card')!.getBoundingClientRect();
          return { over: Math.max(0, card.right - fig.right, fig.left - card.left), wide: document.documentElement.scrollWidth - window.innerWidth };
        });
        expect(out.over, `${ms} ms: the card leaves the field by`).toBe(0);
        expect(out.wide, `${ms} ms: no horizontal scroll`).toBeLessThanOrEqual(0);
      }
      for (const ms of [2_000, 4_800, START_AT, 11_200]) {
        await seek(page, ms);
        const cut = await page.evaluate(() => {
          const out: string[] = [];
          const shown = (el: Element) => getComputedStyle(el).opacity !== "0" && !el.closest("[data-off]");
          // the card's words stay inside the card (at rest: before and after the hand-off)
          const card = document.querySelector("[data-stage] .lp-card")!.getBoundingClientRect();
          for (const el of document.querySelectorAll("[data-stage] .lp-card .lp-l, [data-stage] .lp-card .lp-pill")) {
            const r = el.getBoundingClientRect();
            if (shown(el) && r.right > card.right + 1) out.push(`${el.getAttribute("data-l") ?? el.className} leaves the card by ${Math.round(r.right - card.right)} px`);
          }
          const name = document.querySelector<HTMLElement>("[data-stage] .lp-card__name")!;
          if (name.scrollWidth > name.clientWidth + 1) out.push("the card's name is cut");
          // the caption on show fits its ticker (one line from 360; two below)
          const ticker = document.querySelector<HTMLElement>("[data-stage] .lp-stage__ticker")!;
          for (const cap of ticker.children) if (getComputedStyle(cap).opacity === "1" && cap.scrollWidth > ticker.clientWidth + 1) out.push(`caption ${cap.getAttribute("data-cap")} is cut`);
          return out;
        });
        expect(cut, `${ms} ms`).toEqual([]);
      }
      // the "n of 4" count steps aside below 430 px, so the caption never wraps
      await expect(page.locator('[data-stage] [data-cap="3"] .lp-stage__count')).toBeVisible({ visible: width >= 430 });
      expect(await page.locator("[data-stage] .lp-stage__ticker").evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(width >= 360 ? 23 : 45);
    });
  }
});
