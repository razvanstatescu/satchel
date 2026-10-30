import { expect, test } from "@playwright/test";
import { ALICE, useMockWallet } from "./helpers";

/**
 * Popup-route edge cases not covered elsewhere: the scrim click (not just Escape/flow-close), browser back/forward
 * around a popup, focus returning to the trigger, and deep links to a flow with a bad id/key (/s/999/send,
 * /s/1/coin/nope) — both must fall back to the soft-404 UI the same way /s/999 itself does (judge.spec.ts).
 */

test.describe("popups: scrim, back/forward, focus return", () => {
  test("clicking the scrim closes the popup and returns focus to the link that opened it", async ({ page }) => {
    await page.goto("/s/2");
    const trigger = page.getByRole("link", { name: "Add coins" }).first();
    await trigger.click();
    const flow = page.getByTestId("receive-flow");
    await expect(flow.getByRole("dialog")).toBeVisible();
    // the scrim is the fixed, aria-hidden overlay behind the panel: click it off to one side of the panel
    await page.mouse.click(5, 5);
    await expect(page).toHaveURL(/\/s\/2$/);
    await expect(flow.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the browser's back button closes a popup opened by a normal link click", async ({ page }) => {
    await page.goto("/s/2");
    await page.getByRole("link", { name: "Add coins" }).first().click();
    await expect(page.getByTestId("receive-flow").getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/\/s\/2\/receive/);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/2$/);
    await expect(page.getByTestId("receive-flow")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(await page.evaluate(() => document.querySelectorAll("[inert]").length)).toBe(0);
    // forward re-opens it
    await page.goForward();
    await expect(page.getByTestId("receive-flow").getByRole("dialog")).toBeVisible();
  });
});

test.describe("deep links with a bad id or key fall back to the soft-404 UI", () => {
  test("/s/999/send (an unminted id) behaves like /s/999 itself", async ({ page, request }) => {
    const res = await request.get("/s/999/send");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/<h1[^>]*>This Satchel doesn(?:'|&#x27;)t exist<\/h1>/);
    await page.goto("/s/999/send");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This Satchel doesn't exist");
  });

  test("/s/1/coin/nope (an unknown holding key) also soft-404s", async ({ page }) => {
    await useMockWallet(page, ALICE);
    await page.goto("/s/1/coin/nope");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This Satchel doesn't exist");
  });
});
