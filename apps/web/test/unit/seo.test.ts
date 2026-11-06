import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OG_ALT,
  SITEMAP_MAX_TOKENS,
  absoluteUrl,
  articleLd,
  breadcrumbLd,
  faqLd,
  learnUpdated,
  llmsTxt,
  organizationLd,
  pageMetadata,
  robotsFor,
  serializeJsonLd,
  siteJsonLd,
  sitemapFor,
  stripLinks,
  webApplicationLd,
} from "@/lib/seo";
import { MARKETING_PAGES, readyPages, relatedPages, type MarketingPage } from "@/lib/marketing-pages";

const BASE = "https://usesatchel.xyz";

/** A registry with one more page ready, to show the lists follow the flag. */
const withReady = (slug: string): MarketingPage[] => MARKETING_PAGES.map((p) => (p.slug === slug ? { ...p, ready: true } : p));
const withoutReady = (slug: string): MarketingPage[] => MARKETING_PAGES.map((p) => (p.slug === slug ? { ...p, ready: false } : p));

describe("robots.txt", () => {
  it("allows every crawler everywhere (judges included) and points at the sitemap", () => {
    expect(robotsFor("https://usesatchel.xyz/")).toEqual({
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: "https://usesatchel.xyz/sitemap.xml",
    });
  });
});

describe("absoluteUrl", () => {
  it("is absolute, drops the query, the hash and a trailing slash, and keeps the home slash", () => {
    expect(absoluteUrl(`${BASE}/`, "/")).toBe(`${BASE}/`);
    expect(absoluteUrl(BASE, "/mint?from=/market")).toBe(`${BASE}/mint`);
    expect(absoluteUrl(BASE, "/questions/#q-keys")).toBe(`${BASE}/questions`);
    expect(absoluteUrl(BASE, "learn")).toBe(`${BASE}/learn`);
  });
});

describe("sitemap.xml", () => {
  const urls = (n: number | null, opts = {}) => sitemapFor(BASE, n, opts).map((e) => e.url);
  const STATIC = [`${BASE}/`, `${BASE}/questions`, `${BASE}/market`, `${BASE}/mint`, `${BASE}/contract`, `${BASE}/learn`];

  it("lists the public pages, /learn and every ready marketing page, then three tabs per minted Satchel", () => {
    expect(urls(3)).toEqual([
      ...STATIC,
      `${BASE}/clean-history`,
      `${BASE}/sell-a-crypto-wallet`,
      `${BASE}/buy-a-crypto-wallet`,
      `${BASE}/transfer-a-crypto-wallet`,
      `${BASE}/gift-crypto`,
      `${BASE}/erc-6551`,
      `${BASE}/chain-signatures`,
      `${BASE}/s/1`,
      `${BASE}/s/1/activity`,
      `${BASE}/s/1/sale`,
      `${BASE}/s/2`,
      `${BASE}/s/2/activity`,
      `${BASE}/s/2/sale`,
    ]);
  });

  it("drops /satchels (a signed-in app page)", () => {
    expect(urls(5).some((u) => u.endsWith("/satchels"))).toBe(false);
  });

  it("reads the registry: a page appears when it is ready and not before", () => {
    expect(sitemapFor(BASE, null, { pages: withoutReady("sell-a-crypto-wallet") }).map((e) => e.url)).not.toContain(`${BASE}/sell-a-crypto-wallet`);
    expect(sitemapFor(BASE, null, { pages: withReady("sell-a-crypto-wallet") }).map((e) => e.url)).toContain(`${BASE}/sell-a-crypto-wallet`);
    // every registered-but-unready page stays out
    for (const p of MARKETING_PAGES.filter((x) => !x.ready)) expect(urls(null)).not.toContain(`${BASE}/${p.slug}`);
  });

  it("gives every marketing page its own updated date as lastModified", () => {
    const entries = sitemapFor(BASE, null);
    const clean = entries.find((e) => e.url === `${BASE}/clean-history`)!;
    expect(clean.lastModified).toEqual(new Date(`${MARKETING_PAGES.find((p) => p.slug === "clean-history")!.updated}T00:00:00Z`));
    expect(entries.find((e) => e.url === `${BASE}/learn`)!.lastModified).toEqual(new Date(`${learnUpdated()}T00:00:00Z`));
    for (const e of entries.filter((x) => !x.url.includes("/s/"))) expect(e.lastModified, e.url).toBeInstanceOf(Date);
  });

  it("lists /sale only for Satchels that are listed, when that is known", () => {
    const all = urls(4, { listedIds: ["2", 3] });
    expect(all).toContain(`${BASE}/s/2/sale`);
    expect(all).toContain(`${BASE}/s/3/sale`);
    expect(all).not.toContain(`${BASE}/s/1/sale`);
    expect(all).toContain(`${BASE}/s/1/activity`);
    // unknown (market unreadable) keeps today's behaviour
    expect(urls(3, { listedIds: null })).toContain(`${BASE}/s/1/sale`);
    // known and empty: no /sale at all
    expect(urls(3, { listedIds: [] }).some((u) => u.endsWith("/sale"))).toBe(false);
  });

  it("has only the public pages when nothing is minted or the config can't be read", () => {
    const n = STATIC.length + readyPages().length;
    expect(urls(1)).toHaveLength(n);
    expect(urls(null)).toHaveLength(n);
    expect(urls(Number.NaN)).toHaveLength(n);
  });

  it("caps the token list and never lists flow pages", () => {
    const all = urls(10_000);
    expect(all).toHaveLength(STATIC.length + readyPages().length + 3 * SITEMAP_MAX_TOKENS);
    expect(all.some((u) => /\/(send|transfer|receive)$/.test(u))).toBe(false);
  });
});

describe("marketing registry", () => {
  it("pre-registers every planned page, with the shipped guides ready", () => {
    expect(MARKETING_PAGES.map((p) => p.slug)).toEqual([
      "clean-history",
      "sell-a-crypto-wallet",
      "buy-a-crypto-wallet",
      "transfer-a-crypto-wallet",
      "gift-crypto",
      "erc-6551",
      "chain-signatures",
    ]);
    expect(readyPages().map((p) => p.slug)).toEqual(["clean-history", "sell-a-crypto-wallet", "buy-a-crypto-wallet", "transfer-a-crypto-wallet", "gift-crypto", "erc-6551", "chain-signatures"]);
  });

  it("keeps titles and descriptions inside search-result limits", () => {
    for (const p of MARKETING_PAGES) {
      expect(p.metaTitle.length, p.slug).toBeLessThanOrEqual(48);
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(120);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
      expect(p.slug).not.toContain("/");
      expect(p.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("lists related guides from the ready pages only, never the page itself", () => {
    expect(relatedPages("clean-history").map((p) => p.slug)).toEqual(["sell-a-crypto-wallet", "buy-a-crypto-wallet", "transfer-a-crypto-wallet", "gift-crypto", "erc-6551", "chain-signatures"]);
    expect(relatedPages("gift-crypto").map((p) => p.slug)).not.toContain("gift-crypto");
    expect(relatedPages("clean-history", withoutReady("gift-crypto")).map((p) => p.slug)).not.toContain("gift-crypto");
  });
});

describe("pageMetadata", () => {
  const m = pageMetadata({ path: "/market?x=1", title: "Market", description: "A description." }, BASE);

  it("sets an absolute canonical and og:url, the clean path, and the site name", () => {
    expect(m.alternates?.canonical).toBe(`${BASE}/market`);
    expect(m.openGraph).toMatchObject({ url: `${BASE}/market`, type: "website", siteName: "Satchel", title: "Market · Satchel", description: "A description." });
  });

  it("gives the twitter card the page's own title and description, plus the shared image", () => {
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Market · Satchel", description: "A description." });
    expect(JSON.stringify(m.twitter)).toContain("/twitter-image.png");
    expect(JSON.stringify(m.openGraph)).toContain("/opengraph-image.png");
  });

  it("canonicalises /mint?from=… to /mint", () => {
    expect(pageMetadata({ path: "/mint?from=/s/1", title: "Mint", description: "d" }, BASE).alternates?.canonical).toBe(`${BASE}/mint`);
  });

  it("takes og overrides, noindex and article dates, and can leave the shared image to a segment's own", () => {
    const a = pageMetadata({ path: "/x", title: "T", description: "d", ogTitle: "OG", ogDescription: "OD", type: "article", published: "2026-11-01", modified: "2026-11-06", noindex: true, images: false }, BASE);
    expect(a.openGraph).toMatchObject({ title: "OG", description: "OD", type: "article", publishedTime: "2026-11-01", modifiedTime: "2026-11-06" });
    expect(a.robots).toEqual({ index: false, follow: true });
    expect(JSON.stringify(a)).not.toContain("opengraph-image");
  });

  it("advertises /llms.txt in the head", () => {
    expect(m.alternates?.types).toEqual({ "text/markdown": "/llms.txt" });
  });

  it("keeps the OG alt in step with the file convention's alt", () => {
    expect(OG_ALT).toBe(readFileSync(new URL("../../src/app/opengraph-image.alt.txt", import.meta.url), "utf8").trim());
  });
});

describe("JSON-LD", () => {
  it("builds the home graph: WebSite, Organization and WebApplication, with no ratings, offers or sameAs", () => {
    const g = siteJsonLd(BASE);
    expect(g["@context"]).toBe("https://schema.org");
    expect(g["@graph"].map((n) => n["@type"])).toEqual(["WebSite", "Organization", "WebApplication"]);
    const text = JSON.stringify(g);
    for (const banned of ["aggregateRating", "review", "offers", "price", "sameAs", "github"]) expect(text).not.toContain(banned);
    expect(organizationLd(BASE)).toMatchObject({ name: "Satchel", url: `${BASE}/`, logo: `${BASE}/icon-512.png` });
    expect(webApplicationLd(BASE)).toMatchObject({ applicationCategory: "FinanceApplication", creator: { "@id": `${BASE}/#org` } });
  });

  it("builds a breadcrumb with absolute URLs and 1-based positions", () => {
    const b = breadcrumbLd([{ name: "Home", path: "/" }, { name: "Learn", path: "/learn" }], BASE);
    expect(b).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Learn", item: `${BASE}/learn` },
      ],
    });
  });

  it("builds FAQPage from the visible question and answer text", () => {
    expect(faqLd([{ q: "Q?", a: "A." }])).toEqual({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } }],
    });
  });

  it("builds an article with both dates and the page as its main entity", () => {
    const a = articleLd({ path: "/clean-history", headline: "H", description: "D", published: "2026-11-01", modified: "2026-11-06", type: "TechArticle" }, BASE);
    expect(a).toMatchObject({ "@type": "TechArticle", headline: "H", datePublished: "2026-11-01", dateModified: "2026-11-06", mainEntityOfPage: `${BASE}/clean-history` });
  });

  it("serialises without a raw '<' so no string can close the script tag", () => {
    expect(serializeJsonLd({ a: "</script><b>" })).not.toContain("<");
    expect(JSON.parse(serializeJsonLd({ a: "</script>" }))).toEqual({ a: "</script>" });
  });

  it("strips the copy's link markup to the words a reader sees", () => {
    expect(stripLinks("Read the [questions](/questions) and the [contract facts](/contract).")).toBe("Read the questions and the contract facts.");
  });
});

describe("llms.txt", () => {
  const txt = llmsTxt(BASE);

  it("opens with the H1 and a one-line definition, as the llms.txt spec asks", () => {
    expect(txt.startsWith("# Satchel\n\n> Satchel is an NFT on NEAR that is a wallet")).toBe(true);
  });

  it("is testnet-honest and links only this site (the repo is private)", () => {
    expect(txt).toMatch(/Testnet only/);
    expect(txt).not.toMatch(/github\.com\/razvanstatescu/);
    expect(txt).not.toMatch(/\$\d/);
    const links = [...txt.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]!);
    expect(links.filter((u) => u.startsWith(BASE)).length).toBeGreaterThan(6);
    for (const u of links.filter((x) => !x.startsWith(BASE))) expect(u).toMatch(/^https:\/\/(docs\.near\.org|nomicon\.io)\//);
  });

  it("lists the ready guides from the registry and not the others", () => {
    expect(txt).toContain(`(${BASE}/clean-history)`);
    expect(txt).toContain(`(${BASE}/sell-a-crypto-wallet)`);
    expect(llmsTxt(BASE, withoutReady("sell-a-crypto-wallet"))).not.toContain("/sell-a-crypto-wallet");
  });

  it("is short", () => {
    expect(txt.split("\n").length).toBeLessThanOrEqual(60);
  });
});
