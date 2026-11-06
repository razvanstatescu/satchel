import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADDR1 } from "./helpers";

/**
 * SEO and GEO foundation (docs/design/seo/*). Everything here reads the first HTML response with `request.get`, i.e.
 * with no JavaScript, the way ChatGPT, Claude and Perplexity fetch a page (and the way the screening agents do): one
 * H1, a canonical, og:url, a meta description in range, parseable JSON-LD, and the page's key text in the markup.
 */

const base = () => (test.info().project.use.baseURL ?? "").replace(/\/$/, "");
const noScripts = (html: string) => html.replace(/<script\b[\s\S]*?<\/script>/g, "");
const text = (html: string) =>
  noScripts(html)
    .replace(/<style\b[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
const metaContent = (html: string, attr: "name" | "property", key: string) => new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1]?.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
const canonical = (html: string) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
const h1s = (html: string) => [...noScripts(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

type Node = Record<string, unknown>;
function jsonLd(html: string): Node[] {
  const out: Node[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const doc = JSON.parse(m[1]!) as Node;
    expect(doc["@context"]).toBe("https://schema.org");
    out.push(...((doc["@graph"] as Node[] | undefined) ?? [doc]));
  }
  return out;
}
const types = (nodes: Node[]) => nodes.map((n) => n["@type"] as string);

interface PageCase {
  path: string;
  /** The canonical path (a query is dropped). */
  canon?: string;
  h1: string | RegExp;
  /** Text that must be in the server HTML. */
  key: (string | RegExp)[];
  ld: string[];
}

const PAGES: PageCase[] = [
  {
    path: "/",
    h1: "Sell a wallet with everything inside. The buyer checks it first.",
    key: ["Satchel is an NFT on NEAR that is a wallet.", "Look inside a Satchel"],
    ld: ["WebSite", "Organization", "WebApplication", "FAQPage"],
  },
  { path: "/questions", h1: "Questions", key: ["Is clean history a guarantee", /Questions|Basics/], ld: ["BreadcrumbList", "FAQPage"] },
  { path: "/market", h1: "Market", key: ["for sale", "your browser checks each one"], ld: [] },
  { path: "/mint", canon: "/mint", h1: "Mint a Satchel", key: ["Mint a Satchel"], ld: [] },
  { path: "/mint?from=/market", canon: "/mint", h1: "Mint a Satchel", key: ["Mint a Satchel"], ld: [] },
  { path: "/contract", h1: /Born without a key|Development contract/, key: [/code hash/i], ld: [] },
  { path: "/s/1", h1: "Satchel #1: This NFT is a wallet.", key: [ADDR1.btc, ADDR1.evm], ld: [] },
  { path: "/s/1/activity", h1: /^Satchel #1 · Activity$/, key: ["Satchel #1"], ld: [] },
  { path: "/s/1/sale", h1: /^Satchel #1 · (Buy|Sell|Sold)$/, key: ["Satchel #1"], ld: [] },
  { path: "/learn", h1: "Learn how Satchel works", key: ["Satchel is an NFT on NEAR that is a wallet.", "Clean history: check a Satchel's signatures before you buy"], ld: ["BreadcrumbList"] },
  {
    path: "/clean-history",
    h1: "Clean history: check a Satchel's signatures before you buy",
    key: ["Clean history is the check a buyer's browser runs before buying a Satchel.", "The quiet period", "What clean history does not cover", "250 blocks", /Updated November 6, 2026/],
    ld: ["Organization", "Article", "BreadcrumbList", "FAQPage"],
  },
];

test.describe("every public page, from the server HTML alone", () => {
  for (const c of PAGES) {
    test(c.path, async ({ request }) => {
      const res = await request.get(c.path);
      expect(res.status()).toBe(200);
      const html = await res.text();

      // no streamed fallback hides a fact
      expect(html).not.toMatch(/<div hidden id="S:/);
      expect(html).not.toContain('<template id="B:');

      // exactly one H1
      const headings = h1s(html);
      expect(headings, "h1s").toHaveLength(1);
      if (typeof c.h1 === "string") expect(headings[0]).toBe(c.h1);
      else expect(headings[0]).toMatch(c.h1);

      // canonical + og:url: absolute, clean
      const url = `${base()}${c.canon ?? c.path}`;
      expect(canonical(html)).toBe(c.path === "/" ? `${base()}/` : url);
      expect(metaContent(html, "property", "og:url")).toBe(c.path === "/" ? `${base()}/` : url);
      expect(metaContent(html, "property", "og:site_name")).toBe("Satchel");
      expect(metaContent(html, "property", "og:type")).toMatch(/^(website|article)$/);

      // description in range; og and twitter carry the page's own text (not the site-wide fallback)
      const desc = metaContent(html, "name", "description")!;
      expect(desc.length, desc).toBeGreaterThanOrEqual(70);
      expect(desc.length, desc).toBeLessThanOrEqual(160);
      expect(metaContent(html, "property", "og:description")).toBe(desc);
      expect(metaContent(html, "name", "twitter:description")).toBe(desc);
      const title = /<title>([^<]*)<\/title>/.exec(html)![1]!.replace(/&#x27;|&#39;/g, "'");
      expect(metaContent(html, "property", "og:title")).toBe(metaContent(html, "name", "twitter:title"));
      expect(metaContent(html, "property", "og:title")).not.toBe("Satchel");
      expect(title.length).toBeLessThanOrEqual(70);
      expect(html).toMatch(/<link rel="alternate" type="text\/markdown" href="\/llms\.txt"/);

      // JSON-LD parses and has the expected types
      const ld = types(jsonLd(html));
      for (const t of c.ld) expect(ld, `${c.path} json-ld`).toContain(t);

      // key text in the HTML (no JS)
      const body = text(html);
      for (const k of c.key) {
        if (typeof k === "string") expect(body).toContain(k);
        else expect(body).toMatch(k);
      }
    });
  }

  test("/satchels is a noindex app page with its own canonical", async ({ request }) => {
    const html = await (await request.get("/satchels")).text();
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    expect(canonical(html)).toBe(`${base()}/satchels`);
    expect(h1s(html)).toHaveLength(1);
  });
});

test.describe("the home page's definition and structured data", () => {
  test("the hero text opens with the definition and the H1 stays value-first", async ({ request }) => {
    const html = noScripts(await (await request.get("/")).text());
    const hero = /<div data-hero-text[\s\S]*?<\/section>/.exec(html)![0];
    expect(hero.indexOf("<h1")).toBeGreaterThan(-1);
    // the first <p> of the hero is the lead that starts with the definition
    const firstP = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(hero)![1]!.replace(/<[^>]+>/g, "");
    expect(firstP.startsWith("Satchel is an NFT on NEAR that is a wallet.")).toBe(true);
  });

  test("WebSite, Organization and WebApplication carry no ratings, offers or profile links; every FAQ question is visible", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const nodes = jsonLd(html);
    const raw = JSON.stringify(nodes);
    for (const banned of ["aggregateRating", "\"review\"", "offers", "sameAs"]) expect(raw).not.toContain(banned);
    const org = nodes.find((n) => n["@type"] === "Organization")!;
    expect(org).toMatchObject({ name: "Satchel", url: `${base()}/` });
    const faq = nodes.find((n) => n["@type"] === "FAQPage")!;
    const visible = text(html);
    const qs = (faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[]);
    expect(qs.length).toBeGreaterThanOrEqual(7);
    for (const q of qs) {
      expect(visible, q.name).toContain(q.name);
      expect(visible, q.name).toContain(q.acceptedAnswer.text.slice(0, 40));
    }
  });
});

test.describe("/questions: the questions are headings", () => {
  test("every FAQ question is an h3 under its group's h2, and FAQPage mirrors them", async ({ request }) => {
    const html = noScripts(await (await request.get("/questions")).text());
    const h2 = [...html.matchAll(/<h2\b/g)].length;
    const h3 = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, "").trim());
    expect(h2).toBeGreaterThanOrEqual(8);
    const faq = jsonLd(await (await request.get("/questions")).text()).find((n) => n["@type"] === "FAQPage")!;
    const names = (faq.mainEntity as { name: string }[]).map((q) => q.name.replace(/'/g, "&#x27;"));
    expect(h3.length).toBe(names.length);
    expect(h3.length).toBeGreaterThanOrEqual(30);
  });
});

test.describe("/clean-history: the template", () => {
  test("a breadcrumb, a definition block, a table with a caption and scopes, a visible FAQ and the testnet note", async ({ request }) => {
    const html = await (await request.get("/clean-history")).text();
    const page = noScripts(html);
    expect(page).toMatch(/<nav aria-label="Breadcrumb"/);
    expect(page).toMatch(/<table[\s\S]*<caption[\s\S]*<th scope="col"[\s\S]*<th scope="row"/);
    expect(page).toContain('data-testid="answer"');
    expect(page).toContain('data-testid="faq"');
    expect(page).toContain("Satchel runs on NEAR testnet today. Try it with test coins; nothing here has real value.");
    // heading levels never skip: h1, then h2s, with h3 only after an h2
    const levels = [...page.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!, `heading ${i}`).toBeLessThanOrEqual(1);
    // JSON-LD: dates + FAQ mirror the visible text
    const nodes = jsonLd(html);
    const article = nodes.find((n) => n["@type"] === "Article")!;
    expect(article).toMatchObject({ datePublished: "2026-11-06", dateModified: "2026-11-06" });
    const visible = text(html);
    for (const q of (nodes.find((n) => n["@type"] === "FAQPage")!.mainEntity as { name: string; acceptedAnswer: { text: string } }[])) {
      expect(visible).toContain(q.name);
      expect(visible).toContain(q.acceptedAnswer.text);
    }
    const crumbs = (nodes.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement as { name: string; item: string }[]).map((c) => c.item);
    expect(crumbs).toEqual([`${base()}/`, `${base()}/learn`, `${base()}/clean-history`]);
  });

  test("/learn lists every ready guide and the footer links to them", async ({ request }) => {
    const html = noScripts(await (await request.get("/learn")).text());
    expect(html).toMatch(/<a [^>]*href="\/clean-history"/);
    expect(html).not.toMatch(/href="\/gift-crypto"/); // registered but not ready
    const footer = /<footer[\s\S]*<\/footer>/.exec(html)![0];
    expect(footer).toContain('href="/learn"');
    expect(footer).toContain('href="/clean-history"');
    expect(footer).toContain('href="/llms.txt"');
  });
});

test.describe("/llms.txt, /sitemap.xml and /robots.txt", () => {
  test("llms.txt is plain text, starts with the H1 and the definition, and links this site's pages", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const txt = await res.text();
    expect(txt.startsWith("# Satchel\n\n> Satchel is an NFT on NEAR that is a wallet")).toBe(true);
    for (const p of ["/questions", "/contract", "/learn", "/clean-history", "/market", "/s/1"]) expect(txt).toContain(`](${base()}${p})`);
    expect(txt).toContain("Testnet only");
    expect(txt).not.toContain("github.com/razvanstatescu");
    expect(txt).not.toContain("/gift-crypto");
  });

  test("sitemap.xml lists the marketing pages with lastmod, and not /satchels", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/questions", "/learn", "/clean-history", "/market", "/mint", "/contract", "/s/1"]) expect(xml).toContain(`<loc>${base()}${p}</loc>`);
    expect(xml).not.toContain("/satchels<");
    expect(xml).not.toContain("/gift-crypto");
    const clean = /<url><loc>[^<]*\/clean-history<\/loc>([\s\S]*?)<\/url>/.exec(xml)![1]!;
    expect(clean).toContain("<lastmod>2026-11-06");
    // the /sale page is listed only for Satchels that are for sale: each one listed on /market has it
    const market = await (await request.get("/market")).text();
    const listed = [...market.matchAll(/data-market-item="(\d+)"/g)].map((m) => m[1]);
    for (const id of listed) expect(xml).toContain(`/s/${id}/sale<`);
    const saleLocs = [...xml.matchAll(/\/s\/(\d+)\/sale</g)].map((m) => m[1]);
    for (const id of saleLocs) expect(listed).toContain(id);
  });

  test("robots.txt allows every user agent and points at the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toMatch(/User-Agent: \*\s+Allow: \//i);
    expect(txt).toContain(`Sitemap: ${base()}/sitemap.xml`);
    expect(txt).not.toMatch(/Disallow: \S/);
  });
});

test.describe("axe on the new pages, Day and Night", () => {
  for (const theme of ["day", "night"] as const) {
    for (const path of ["/learn", "/clean-history"]) {
      test(`${path} in ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => window.localStorage.setItem("satchel:theme:v1", t), theme);
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
        // no horizontal scroll at this width
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }
});
