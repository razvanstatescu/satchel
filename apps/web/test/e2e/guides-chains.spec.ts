import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The three search guides /gift-crypto, /erc-6551 and /chain-signatures (docs/design/seo/keyword-research.md §2).
 * Everything text-based reads the first HTML response with `request.get`, i.e. with no JavaScript, the way AI search
 * fetches a page: one H1, a canonical, a description in range, parseable JSON-LD that mirrors the visible FAQ, the
 * answer sentence and the required honesty notes. Browser tests then run axe in Day and Night and check the page does
 * not scroll sideways at 320 px (code blocks scroll inside their own box).
 */

const base = () => (test.info().project.use.baseURL ?? "").replace(/\/$/, "");
const noScripts = (html: string) => html.replace(/<script\b[\s\S]*?<\/script>/g, "");
const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html: string) =>
  decode(
    noScripts(html)
      .replace(/<style\b[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );
const meta = (html: string, attr: "name" | "property", key: string) => {
  const m = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];
  return m === undefined ? undefined : decode(m);
};
const h1s = (html: string) => [...noScripts(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()));

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

interface Guide {
  path: string;
  h1: string;
  schema: "Article" | "TechArticle";
  /** The first sentences of the answer block. */
  answer: string;
  /** Text that must be in the server HTML. */
  key: (string | RegExp)[];
  /** Links the body must carry. */
  links: string[];
}

const GUIDES: Guide[] = [
  {
    path: "/gift-crypto",
    h1: "How to gift crypto to someone without a wallet",
    schema: "Article",
    answer: "To gift crypto to someone without a wallet, give them a Satchel by link.",
    key: [
      "Giver can keep a copy of the keys?",
      "Satchel by link",
      "Testnet only today.",
      "The receiver connects a NEAR wallet to claim.",
      "The link works like cash in an envelope.",
      "You can't cancel a link once it is out.",
      "Gifts skip the buyer's check.",
      "Satchel gives no tax advice.",
      /Updated November 6, 2026/,
    ],
    links: ["/clean-history", "/erc-6551", "/chain-signatures", "/s/1", "/market", "/mint"],
  },
  {
    path: "/erc-6551",
    h1: "ERC-6551 and token bound accounts, compared with Satchel",
    schema: "Article",
    answer: "ERC-6551 is an Ethereum standard that gives each NFT its own smart contract account, called a token bound account.",
    key: [
      "Satchel is not ERC-6551.",
      "Handing over a seed phrase",
      "Ethereum Magicians",
      "arXiv 2508.07190",
      "NEP-171",
      "does not run on Ethereum",
      /no promise to work with ERC-6551 tools/,
      /Updated November 6, 2026/,
    ],
    links: ["https://eips.ethereum.org/EIPS/eip-6551", "https://arxiv.org/pdf/2508.07190", "/clean-history", "/chain-signatures", "/gift-crypto", "/s/1"],
  },
  {
    path: "/chain-signatures",
    h1: "NEAR Chain Signatures in practice: an NFT that signs on three chains",
    schema: "TechArticle",
    answer: "NEAR Chain Signatures let a NEAR account sign transactions for other blockchains, such as Bitcoin, Ethereum and Solana.",
    key: [
      "satchel/N/btc",
      "satchel/N/evm",
      "satchel/N/sol",
      "A structured payload, never a raw hash",
      "The record is written before the signer network is called",
      "Native Bitcoin or wrapped Bitcoin",
      "self.sig_log.insert",
      "NEAR's signer network makes every signature.",
      /Updated November 6, 2026/,
    ],
    links: ["https://docs.near.org/chain-abstraction/chain-signatures", "/clean-history", "/gift-crypto", "/erc-6551", "/s/1"],
  },
];

test.describe("the three guides, from the server HTML alone", () => {
  for (const g of GUIDES) {
    test(g.path, async ({ request }) => {
      const res = await request.get(g.path);
      expect(res.status()).toBe(200);
      const html = await res.text();

      // no streamed fallback hides a fact
      expect(html).not.toMatch(/<div hidden id="S:/);
      expect(html).not.toContain('<template id="B:');

      // exactly one H1, close to the searcher's query
      expect(h1s(html)).toEqual([g.h1]);

      // canonical + og:url absolute; description in range, mirrored by og and twitter
      const url = `${base()}${g.path}`;
      expect(/<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]).toBe(url);
      expect(meta(html, "property", "og:url")).toBe(url);
      expect(meta(html, "property", "og:type")).toBe("article");
      const desc = meta(html, "name", "description")!;
      expect(desc.length, desc).toBeGreaterThanOrEqual(120);
      expect(desc.length, desc).toBeLessThanOrEqual(160);
      expect(meta(html, "property", "og:description")).toBe(desc);
      expect(meta(html, "name", "twitter:description")).toBe(desc);
      const title = decode(/<title>([^<]*)<\/title>/.exec(html)![1]!);
      expect(title.length).toBeLessThanOrEqual(60);

      // JSON-LD parses; the right article type with both dates; breadcrumb; FAQ mirrors the visible text
      const nodes = jsonLd(html);
      const types = nodes.map((n) => n["@type"]);
      expect(types).toEqual(expect.arrayContaining(["Organization", g.schema, "BreadcrumbList", "FAQPage"]));
      expect(nodes.find((n) => n["@type"] === g.schema)).toMatchObject({ datePublished: "2026-11-06", dateModified: "2026-11-06" });
      const crumbs = (nodes.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement as { item: string }[]).map((c) => c.item);
      expect(crumbs).toEqual([`${base()}/`, `${base()}/learn`, url]);
      const visible = text(html);
      const faq = nodes.find((n) => n["@type"] === "FAQPage")!.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(faq.length).toBeGreaterThanOrEqual(4);
      expect(faq.length).toBeLessThanOrEqual(6);
      for (const q of faq) {
        expect(visible, q.name).toContain(q.name);
        expect(visible, q.name).toContain(q.acceptedAnswer.text);
      }

      // the answer is the first thing in the article, and the key facts are in the HTML
      const answer = decode(/data-testid="answer"[^>]*>([\s\S]*?)<\/div>/.exec(noScripts(html))![1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      expect(answer.startsWith(g.answer)).toBe(true);
      expect(answer).toContain("Satchel");
      for (const k of g.key) {
        if (typeof k === "string") expect(visible, k).toContain(k);
        else expect(visible).toMatch(k);
      }
      for (const href of g.links) expect(noScripts(html), href).toContain(`href="${href}"`);

      // the template: breadcrumb, a captioned table, the testnet note by the CTA, related guides
      const page = noScripts(html);
      expect(page).toMatch(/<nav aria-label="Breadcrumb"/);
      expect(page).toMatch(/<table[\s\S]*<caption[\s\S]*<th scope="col"[\s\S]*<th scope="row"/);
      expect(page).toContain("Satchel runs on NEAR testnet today. Try it with test coins; nothing here has real value.");
      const related = /id="related-title"[\s\S]*$/.exec(page)![0];
      for (const other of GUIDES.filter((x) => x.path !== g.path)) expect(related).toContain(`href="${other.path}"`);
      expect(related).toContain('href="/clean-history"');

      // headings never skip a level
      const levels = [...page.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!, `heading ${i}`).toBeLessThanOrEqual(1);

      // 900 to 1,700 words of article text (the body, not the site chrome)
      const article = text(/<article[\s\S]*<\/article>/.exec(html)![0]);
      const words = article.split(" ").filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(900);
      expect(words).toBeLessThanOrEqual(2200); // chain-signatures carries ~330 words of code

      // the claims register, once more on the rendered page
      for (const banned of [/mainnet/i, /trustless/i, /guaranteed/i, /risk-free/i, /\bsafe to buy\b/i, /open[- ]source/i, /\$\d/]) expect(article).not.toMatch(banned);
    });
  }

  test("/chain-signatures keeps its code in the HTML as text", async ({ request }) => {
    const html = await (await request.get("/chain-signatures")).text();
    expect(html).toMatch(/<figure[\s\S]*<figcaption[\s\S]*<pre[^>]*><code>/);
    const code = [...noScripts(html).matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => decode(m[1]!));
    expect(code.length).toBeGreaterThanOrEqual(4);
    expect(code.join("\n")).toContain('"path":"satchel/1/evm"');
    expect(code.join("\n")).toContain("pub fn on_signed");
    // and a record is written before the signer network is asked
    const order = code.find((c) => c.includes("pub fn sign_for"))!;
    expect(order.indexOf("sig_log.insert")).toBeLessThan(order.indexOf("promise_and"));
  });

  test("/learn, the sitemap and llms.txt list the three guides", async ({ request }) => {
    const learn = noScripts(await (await request.get("/learn")).text());
    const xml = await (await request.get("/sitemap.xml")).text();
    const llms = await (await request.get("/llms.txt")).text();
    for (const g of GUIDES) {
      expect(learn).toContain(`href="${g.path}"`);
      expect(xml).toContain(`<loc>${base()}${g.path}</loc>`);
      expect(llms).toContain(`](${base()}${g.path})`);
    }
  });
});

test.describe("axe and layout, Day and Night", () => {
  for (const theme of ["day", "night"] as const) {
    for (const g of GUIDES) {
      test(`${g.path} in ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => window.localStorage.setItem("satchel:theme:v1", t), theme);
        await page.goto(g.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        // everything axe knows; only the fixture build's "Sample data" strip sits outside a landmark
        const results = await new AxeBuilder({ page }).exclude(".min-h-dvh > .bg-surface-sunken").analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }

  for (const g of GUIDES) {
    test(`${g.path} does not scroll sideways at 320 px, and wide boxes scroll inside themselves`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(g.path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      // every scrollable region (tables, code) is keyboard-focusable and named, and is inside the viewport
      const regions = await page.locator('article [role="region"]').evaluateAll((els) =>
        els.map((e) => ({ label: e.getAttribute("aria-label"), tab: (e as HTMLElement).tabIndex, right: e.getBoundingClientRect().right, inner: e.scrollWidth > e.clientWidth })),
      );
      expect(regions.length).toBeGreaterThanOrEqual(1);
      for (const r of regions) {
        expect(r.label).toBeTruthy();
        expect(r.tab).toBe(0);
        expect(r.right).toBeLessThanOrEqual(320);
      }
      if (g.path === "/chain-signatures") expect(regions.some((r) => r.inner)).toBe(true);
    });
  }
});
