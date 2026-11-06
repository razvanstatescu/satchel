import { expect, test } from "@playwright/test";

/**
 * A1: the social card per Satchel (next/og's file-based image convention: /s/[id]/opengraph-image,
 * /s/[id]/twitter-image). Next serves these at a content-hashed path (`/s/1/opengraph-image-<hash>`, baked in at
 * build time by generateStaticParams), never the bare `/s/[id]/opengraph-image`, so these tests read the real URL
 * out of the rendered <head> rather than hardcoding it — the same thing a crawler does.
 */

function pngSize(buf: Buffer): { width: number; height: number } {
  // PNG signature (8 bytes) + IHDR chunk: length(4) "IHDR"(4) width(4 BE) height(4 BE) …
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.describe("A1: social card (opengraph-image / twitter-image)", () => {
  test("/s/1's HTML head points og:image and twitter:image at its own card, under /s/1/ (never the site-wide image)", async ({ page, request }) => {
    await page.goto("/s/1");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    const tw = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    expect(og).toMatch(/\/s\/1\/opengraph-image/);
    expect(tw).toMatch(/\/s\/1\/twitter-image/);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");

    for (const url of [og!, tw!]) {
      const r = await request.get(url);
      expect(r.status()).toBe(200);
      expect(r.headers()["content-type"]).toBe("image/png");
      const { width, height } = pngSize(await r.body());
      expect(width).toBe(1200);
      expect(height).toBe(630);
    }
  });

  test("a different Satchel gets a different card (its own number, not a shared image)", async ({ page }) => {
    await page.goto("/s/1");
    const og1 = await page.locator('meta[property="og:image"]').getAttribute("content");
    await page.goto("/s/4");
    const og4 = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og1).not.toBe(og4);
    expect(og4).toMatch(/\/s\/4\/opengraph-image/);
  });

  test("an unknown id still gets a valid 1200×630 PNG (the generic branded fallback, not a broken image)", async ({ page, request }) => {
    // /s/999 itself is a 404 page (src/proxy.ts), so take #1's image URL and ask for #999's
    await page.goto("/s/1");
    const og1 = await page.locator('meta[property="og:image"]').getAttribute("content");
    const og = og1!.replace("/s/1/", "/s/999/");
    expect(og).toMatch(/\/s\/999\/opengraph-image/);
    const r = await request.get(og);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("image/png");
    const { width, height } = pngSize(await r.body());
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });
});
