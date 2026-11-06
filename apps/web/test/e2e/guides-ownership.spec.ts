import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The ownership guides: /sell-a-crypto-wallet, /buy-a-crypto-wallet, /transfer-a-crypto-wallet. Every fact is read from
 * the first HTML response with `request.get` (no JavaScript), the way ChatGPT, Claude and Perplexity fetch a page; the
 * rendered pages are checked with axe in Day and Night and for horizontal overflow at 320 px.
 */

const base = () => (test.info().project.use.baseURL ?? "").replace(/\/$/, "");
const noScripts = (html: string) => html.replace(/<script\b[\s\S]*?<\/script>/g, "");
const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = (html: string) =>
  decode(
    noScripts(html)
      .replace(/<style\b[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
const metaContent = (html: string, attr: "name" | "property", key: string) => {
  const m = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];
  return m === undefined ? undefined : decode(m);
};
type Node = Record<string, unknown>;
function jsonLd(html: string): Node[] {
  const out: Node[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const doc = JSON.parse(m[1]!) as Node;
    out.push(...((doc["@graph"] as Node[] | undefined) ?? [doc]));
  }
  return out;
}

interface Guide {
  path: string;
  h1: string;
  answer: string;
  /** More facts that must be in the server HTML. */
  facts: (string | RegExp)[];
  /** Pages it must link to. */
  links: string[];
}

const GUIDES: Guide[] = [
  {
    path: "/sell-a-crypto-wallet",
    h1: "Can you sell a crypto wallet?",
    answer: "You can't safely sell a normal crypto wallet: whoever had the seed phrase can keep a copy.",
    facts: ["The second hole: signatures already made", "A Satchel can be listed only after 250 blocks", "Buy turns on only when no old signature can still move the coins.", "Can I sell my seed phrase?"],
    links: ["/transfer-a-crypto-wallet", "/buy-a-crypto-wallet", "/clean-history", "/market"],
  },
  {
    path: "/buy-a-crypto-wallet",
    h1: "Crypto wallet with a balance for sale: what to check first",
    answer: "Most crypto wallets for sale with a balance are scams, because the seller still knows the seed phrase.",
    facts: ["Crypto trap for the greedy", "the pre-filled seed phrase scam", "Rotten seed phrases", "Five questions to ask before you pay anyone", "Is buying a crypto wallet with a balance a scam?"],
    links: ["/sell-a-crypto-wallet", "/transfer-a-crypto-wallet", "/clean-history", "/s/4/sale"],
  },
  {
    path: "/transfer-a-crypto-wallet",
    h1: "Can I give my crypto wallet to someone else?",
    answer: "Yes, you can give your crypto wallet to someone else, but not by handing over a seed phrase: you would keep a copy.",
    facts: ["Same addresses, so payments keep arriving", "Give by link, for someone not on NEAR yet", "Gifts are not checked", "like cash in an envelope", "Can I undo a Give?"],
    links: ["/sell-a-crypto-wallet", "/buy-a-crypto-wallet", "/clean-history"],
  },
];

test.describe("ownership guides, from the server HTML alone", () => {
  for (const g of GUIDES) {
    test(g.path, async ({ request }) => {
      const res = await request.get(g.path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      const page = noScripts(html);
      const body = text(html);

      // no streamed fallback hides a fact
      expect(html).not.toMatch(/<div hidden id="S:/);

      // one H1, the searcher's question
      const h1s = [...page.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1]!.replace(/<[^>]+>/g, "").trim()));
      expect(h1s).toEqual([g.h1]);

      // canonical, og:url, description length, dates
      const url = `${base()}${g.path}`;
      expect(/<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]).toBe(url);
      expect(metaContent(html, "property", "og:url")).toBe(url);
      const desc = metaContent(html, "name", "description")!;
      expect(desc.length, desc).toBeGreaterThanOrEqual(120);
      expect(desc.length, desc).toBeLessThanOrEqual(160);
      expect(body).toMatch(/Updated November 6, 2026/);

      // the answer block comes first and is in the markup
      expect(body).toContain(g.answer);
      expect(page.indexOf('data-testid="answer"')).toBeGreaterThan(page.indexOf("<h1"));
      expect(page.indexOf('data-testid="answer"')).toBeLessThan(page.indexOf("<h2"));
      for (const f of g.facts) expect(body).toContain(f);

      // a comparison table with a caption and header scopes, and the testnet note by the CTA
      expect(page).toMatch(/<table[\s\S]*<caption[\s\S]*<th scope="col"[\s\S]*<th scope="row"/);
      expect(body).toContain("Satchel runs on NEAR testnet today. Try it with test coins; nothing here has real value.");

      // headings never skip a level
      const levels = [...page.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!, `heading ${i}`).toBeLessThanOrEqual(1);

      // cross-links in the body
      for (const l of g.links) expect(page, l).toMatch(new RegExp(`href="${l}"`));

      // JSON-LD parses; the FAQ mirrors the visible text (4 to 6 questions); the dates are present
      const nodes = jsonLd(html);
      const types = nodes.map((n) => n["@type"]);
      for (const t of ["Organization", "Article", "BreadcrumbList", "FAQPage"]) expect(types).toContain(t);
      const article = nodes.find((n) => n["@type"] === "Article")!;
      expect(article).toMatchObject({ datePublished: "2026-11-06", dateModified: "2026-11-06" });
      const qs = nodes.find((n) => n["@type"] === "FAQPage")!.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(qs.length).toBeGreaterThanOrEqual(4);
      expect(qs.length).toBeLessThanOrEqual(6);
      for (const q of qs) {
        expect(body).toContain(q.name);
        expect(body).toContain(q.acceptedAnswer.text);
      }
      const crumbs = (nodes.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement as { item: string }[]).map((c) => c.item);
      expect(crumbs).toEqual([`${base()}/`, `${base()}/learn`, url]);
    });
  }

  test("the buy guide cites its three sources as outbound links", async ({ request }) => {
    const page = noScripts(await (await request.get("/buy-a-crypto-wallet")).text());
    for (const href of [
      "https://www.kaspersky.com/blog/cryptowallet-seed-phrase-fake-leaks/51607/",
      "https://phishfort.com/hardware-wallets-the-pre-filled-seed-phrase-scam/",
      "https://medium.com/metamask/rotten-seed-phrases-a-new-scam-targeting-crypto-users-b414f9ef292e",
    ])
      expect(page).toContain(`href="${href}"`);
  });

  test("the guides are in /learn, the sitemap, llms.txt and the footer", async ({ request }) => {
    const learn = noScripts(await (await request.get("/learn")).text());
    const footer = /<footer[\s\S]*<\/footer>/.exec(learn)![0];
    const xml = await (await request.get("/sitemap.xml")).text();
    const llms = await (await request.get("/llms.txt")).text();
    for (const g of GUIDES) {
      expect(learn).toContain(`href="${g.path}"`);
      expect(footer).toContain(`href="${g.path}"`);
      expect(xml).toContain(`<loc>${base()}${g.path}</loc>`);
      expect(llms).toContain(`](${base()}${g.path})`);
    }
  });
});

test.describe("ownership guides: axe and overflow, Day and Night", () => {
  for (const theme of ["day", "night"] as const) {
    for (const g of GUIDES) {
      test(`${g.path} in ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => window.localStorage.setItem("satchel:theme:v1", t), theme);
        await page.setViewportSize({ width: 320, height: 700 });
        await page.goto(g.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        // only the fixture build's "Sample data" strip sits outside a landmark
        const results = await new AxeBuilder({ page }).exclude(".min-h-dvh > .bg-surface-sunken").analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }
});
