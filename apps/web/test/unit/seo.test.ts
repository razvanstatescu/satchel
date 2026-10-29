import { describe, expect, it } from "vitest";
import { robotsFor, sitemapFor, SITEMAP_MAX_TOKENS } from "@/lib/seo";

describe("robots.txt", () => {
  it("allows every crawler everywhere (judges included) and points at the sitemap", () => {
    expect(robotsFor("https://usesatchel.xyz/")).toEqual({
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: "https://usesatchel.xyz/sitemap.xml",
      host: "https://usesatchel.xyz",
    });
  });
});

describe("sitemap.xml", () => {
  const urls = (n: number | null) => sitemapFor("https://usesatchel.xyz", n).map((e) => e.url);

  it("lists the public pages, then three tabs per minted Satchel (ids 1 … next_token_id − 1)", () => {
    expect(urls(3)).toEqual([
      "https://usesatchel.xyz",
      "https://usesatchel.xyz/market",
      "https://usesatchel.xyz/mint",
      "https://usesatchel.xyz/contract",
      "https://usesatchel.xyz/satchels",
      "https://usesatchel.xyz/s/1",
      "https://usesatchel.xyz/s/1/activity",
      "https://usesatchel.xyz/s/1/sale",
      "https://usesatchel.xyz/s/2",
      "https://usesatchel.xyz/s/2/activity",
      "https://usesatchel.xyz/s/2/sale",
    ]);
  });

  it("has only the public pages when nothing is minted or the config can't be read", () => {
    expect(urls(1)).toHaveLength(5);
    expect(urls(null)).toHaveLength(5);
    expect(urls(Number.NaN)).toHaveLength(5);
  });

  it("caps the token list and never lists flow pages", () => {
    const all = urls(10_000);
    expect(all).toHaveLength(5 + 3 * SITEMAP_MAX_TOKENS);
    expect(all.some((u) => /\/(send|transfer|receive)$/.test(u))).toBe(false);
  });
});
