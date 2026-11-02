import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { copy } from "@/lib/copy";
import { ALICE, useMockWallet } from "./helpers";

/**
 * First-time onboarding (the onboarding build): three screens on a first wallet connect in this browser, then the
 * optional "about you" survey. Every other spec in this suite pre-seeds `satchel:onboarding:v1` as done
 * (helpers.ts `useMockWallet`); only specs here pass `{ onboarding: true }` to see it fresh.
 */

const WCAG_22 = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function axeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(WCAG_22).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

// the testid is on the sheet's root (a zero-size wrapper); the dialog inside it is what shows
const onboarding = (page: Page) => page.getByTestId("onboarding").getByRole("dialog");
const screens = (page: Page) => page.getByTestId("onboarding-screens");

test.describe("first-time onboarding", () => {
  test("the first connect shows screen 1; Next and Back move through the dots; Escape closes it for good", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    await page.goto("/satchels");

    const sheet = onboarding(page);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: copy.onboarding.screens[0]!.title })).toBeVisible();
    await expect(screens(page)).toHaveAttribute("data-step", "0");

    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await expect(screens(page)).toHaveAttribute("data-step", "1");
    await expect(sheet.getByRole("heading", { name: copy.onboarding.screens[1]!.title })).toBeVisible();
    await expect(sheet.getByRole("button", { name: copy.onboarding.back })).toBeEnabled();

    await sheet.getByRole("button", { name: copy.onboarding.back }).click();
    await expect(screens(page)).toHaveAttribute("data-step", "0");
    await expect(sheet.getByRole("button", { name: copy.onboarding.back })).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await page.reload();
    await expect(onboarding(page)).toBeHidden();
  });

  test("Skip on screen 1 closes it for good, without ever reaching the survey", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    await page.goto("/satchels");
    await expect(onboarding(page)).toBeVisible();
    await onboarding(page).getByRole("button", { name: copy.onboarding.skip }).click();
    await expect(onboarding(page)).toBeHidden();
    await page.reload();
    await expect(onboarding(page)).toBeHidden();
  });

  test("screen 3's Continue opens the survey, which sends the expected JSON", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    let body: unknown;
    await page.route("**/api/onboarding", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/satchels");
    const sheet = onboarding(page);
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await expect(screens(page)).toHaveAttribute("data-step", "2");
    await sheet.getByRole("button", { name: copy.onboarding.continueCta }).click();

    const survey = page.getByTestId("onboarding-survey");
    await expect(survey).toBeVisible();
    await survey.getByRole("button", { name: copy.onboarding.survey.goal.options.explore }).click();
    await survey.getByRole("button", { name: copy.onboarding.survey.goal.options.build }).click();
    await survey.getByRole("button", { name: copy.onboarding.survey.experience.options.builder }).click();
    await survey.getByRole("button", { name: copy.onboarding.survey.chains.options.near, exact: true }).click();
    await survey.getByRole("button", { name: copy.onboarding.survey.source.options.hackathon }).click();

    await survey.getByRole("button", { name: copy.onboarding.survey.send }).click();
    await expect(onboarding(page)).toBeHidden();
    expect(body).toEqual({
      goal: ["explore", "build"],
      experience: "builder",
      chains: ["near"],
      source: "hackathon",
      share_account: false,
    });

    await page.reload();
    await expect(onboarding(page)).toBeHidden();
  });

  test("the account id is sent only when the share-account box is ticked", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    const bodies: unknown[] = [];
    await page.route("**/api/onboarding", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/satchels");
    const sheet = onboarding(page);
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await sheet.getByRole("button", { name: copy.onboarding.continueCta }).click();
    const survey = page.getByTestId("onboarding-survey");
    await survey.getByRole("checkbox", { name: copy.onboarding.survey.shareAccount.label }).check();
    await survey.getByRole("button", { name: copy.onboarding.survey.send }).click();
    await expect(onboarding(page)).toBeHidden();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ share_account: true, account_id: ALICE });
  });

  test("Skip on the survey sends { skipped: true } and still closes it", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    const bodies: unknown[] = [];
    await page.route("**/api/onboarding", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/satchels");
    const sheet = onboarding(page);
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await sheet.getByRole("button", { name: copy.onboarding.next }).click();
    await sheet.getByRole("button", { name: copy.onboarding.continueCta }).click();
    const survey = page.getByTestId("onboarding-survey");
    await survey.getByRole("button", { name: copy.onboarding.survey.skip }).click();
    await expect(onboarding(page)).toBeHidden();
    expect(bodies).toEqual([{ skipped: true }]);
  });

  test("Replay intro (the account menu) reopens the screens", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    await page.goto("/satchels");
    await onboarding(page).getByRole("button", { name: copy.onboarding.skip }).click();
    await expect(onboarding(page)).toBeHidden();

    await page.locator('[data-testid="account-pill"]:visible').click();
    await page.getByRole("button", { name: copy.onboarding.replayIntro }).click();
    await expect(onboarding(page)).toBeVisible();
    await expect(screens(page)).toHaveAttribute("data-step", "0");
    await expect(onboarding(page).getByRole("heading", { name: copy.onboarding.screens[0]!.title })).toBeVisible();
  });

  test("no onboarding for a visitor with no wallet", async ({ page }) => {
    await useMockWallet(page, null, { onboarding: true });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(onboarding(page)).toHaveCount(0);
  });

  test("320 px has no horizontal overflow, and Night is axe-clean", async ({ page }) => {
    await useMockWallet(page, ALICE, { onboarding: true });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("satchel:theme:v1", "night");
      } catch {
        /* ignore */
      }
    });
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/satchels");
    await expect(onboarding(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await axeViolations(page)).toEqual([]);
  });

  test("respects reduced motion (no thrown errors, the overlay still opens and closes)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await useMockWallet(page, ALICE, { onboarding: true });
    await page.goto("/satchels");
    await expect(onboarding(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(onboarding(page)).toBeHidden();
    await ctx.close();
  });

  test("the server HTML of / and /s/1 carries none of the onboarding", async ({ request }) => {
    for (const path of ["/", "/s/1"]) {
      const html = await (await request.get(path)).text();
      expect(html).not.toContain('data-testid="onboarding"');
      expect(html).not.toContain(copy.onboarding.screens[0]!.title);
      expect(html).not.toContain(copy.onboarding.survey.title);
    }
  });
});
