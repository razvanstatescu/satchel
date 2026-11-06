import type { Metadata, MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { MARKETING_PAGES, pagePath, readyPages, type MarketingPage } from "@/lib/marketing-pages";

/**
 * SEO helpers: robots, sitemap, per-page metadata and JSON-LD. Pure (no React, no I/O), so each is unit-tested.
 *
 * Judges are crawlers too: Claude Code and Codex screen every project (HACKATHON.md Q-017). So robots allows
 * everything, including the JSON routes (/api/contract, /api/satchels/[id]). The flow pages (send, transfer) and
 * unknown ids keep their own `noindex` metadata, so they are never disallowed here (a disallow would hide the noindex).
 * Structured data (docs/design/seo/geo-research.md §3.5) is for Google's site name, logo and breadcrumbs and for Bing;
 * answer engines don't read facts that live only in JSON-LD. So every value below is also visible text on its page.
 */

export const SITE_NAME = "Satchel";
/** The one-sentence definition. It opens the landing's hero text and /llms.txt, and is the WebApplication description. */
export const SITE_DEFINITION = "Satchel is an NFT on NEAR that is a wallet: each token controls its own Bitcoin, Ethereum and Solana addresses.";
export const OG_ALT = "Satchel: an NFT that is a wallet";
/** The agent-readable site map; advertised in every page head as `<link rel="alternate" type="text/markdown">`. */
export const LLMS_PATH = "/llms.txt";
export const SITEMAP_MAX_TOKENS = 500;
/** The date the static app pages last changed in a way a reader would notice (the sitemap's lastmod for them). */
export const SITE_UPDATED = "2026-11-06";

/** `/` is the home page; app pages that crawlers should list. `/satchels` is a signed-in app page: not listed. */
const STATIC_PATHS = ["/", "/questions", "/market", "/mint", "/contract"] as const;
/** The three read-only tabs of a Satchel (the object page, its history, its sale/buy page). */
const TOKEN_TABS = ["", "/activity", "/sale"] as const;

const trimBase = (appUrl: string) => appUrl.replace(/\/+$/, "");

/** The absolute, clean URL of a path: no query, no hash, no trailing slash (the home page keeps its one). */
export function absoluteUrl(appUrl: string, path: string): string {
  const base = trimBase(appUrl);
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, "");
  return clean === "" ? `${base}/` : `${base}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

export function robotsFor(appUrl: string): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `${trimBase(appUrl)}/sitemap.xml` };
}

/** The hub's `lastmod`: the newest date among the ready guides. */
export function learnUpdated(pages: readonly MarketingPage[] = MARKETING_PAGES): string {
  return readyPages(pages).reduce((m, p) => (p.updated > m ? p.updated : m), SITE_UPDATED);
}

export interface SitemapOptions {
  /** Token ids that are listed for sale right now. Omitted or null (unknown): every Satchel's /sale page is listed. */
  listedIds?: readonly (string | number)[] | null;
  /** The time of generation, the `lastmod` of the live /market page. */
  now?: Date;
  pages?: readonly MarketingPage[];
}

/** `nextTokenId` null (config unreadable) → the static pages only; a later request fills the tokens in. */
export function sitemapFor(appUrl: string, nextTokenId: number | null, opts: SitemapOptions = {}): MetadataRoute.Sitemap {
  const pages = opts.pages ?? MARKETING_PAGES;
  const date = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const out: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: absoluteUrl(appUrl, p),
    lastModified: p === "/market" && opts.now ? opts.now : date(SITE_UPDATED),
    changeFrequency: p === "/market" ? "hourly" : p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : 0.7,
  }));
  out.push({ url: absoluteUrl(appUrl, "/learn"), lastModified: date(learnUpdated(pages)), changeFrequency: "monthly", priority: 0.7 });
  for (const page of readyPages(pages)) {
    out.push({ url: absoluteUrl(appUrl, pagePath(page)), lastModified: date(page.updated), changeFrequency: "monthly", priority: 0.7 });
  }
  const last = nextTokenId === null || !Number.isSafeInteger(nextTokenId) ? 0 : Math.min(nextTokenId - 1, SITEMAP_MAX_TOKENS);
  const listed = opts.listedIds == null ? null : new Set(opts.listedIds.map(String));
  const base = trimBase(appUrl);
  for (let id = 1; id <= last; id++) {
    for (const tab of TOKEN_TABS) {
      if (tab === "/sale" && listed && !listed.has(String(id))) continue;
      out.push({ url: `${base}/s/${id}${tab}`, changeFrequency: "hourly", priority: tab === "" ? 0.8 : 0.5 });
    }
  }
  return out;
}

/* ── Page metadata ──────────────────────────────────────────────────────────────────────────────────────────────── */

export interface PageMetaInput {
  /** The page's own path. A query or hash is dropped, so `/mint?from=/market` canonicalises to `/mint`. */
  path: string;
  /** The `<title>` before the layout's " · Satchel" template (about 50 characters or fewer, with the site name). */
  title: string;
  /** 120 to 160 characters. */
  description: string;
  /** Defaults to `${title} · Satchel`. */
  ogTitle?: string;
  ogDescription?: string;
  type?: "website" | "article";
  /** A page that must not be indexed (flows, signed-in app pages). It stays crawlable so the noindex is seen. */
  noindex?: boolean;
  /** Omit the site-wide social image (a segment with its own file-based one, such as /s/[id]). */
  images?: boolean;
  /** Article pages: ISO dates. */
  published?: string;
  modified?: string;
}

/**
 * The metadata every public page uses: canonical (absolute), og:url, og:type, og:site_name, og and twitter title and
 * description, and the site-wide social image. A segment's `openGraph` replaces the layout's whole object, including
 * the file-based image, so the image is listed again here (1200 × 630, served at /opengraph-image.png).
 */
export function pageMetadata(o: PageMetaInput, appUrl: string = APP_URL): Metadata {
  const url = absoluteUrl(appUrl, o.path);
  const ogTitle = o.ogTitle ?? `${o.title} · ${SITE_NAME}`;
  const ogDescription = o.ogDescription ?? o.description;
  const withImages = o.images !== false;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: url, types: { "text/markdown": LLMS_PATH } },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      type: o.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_US",
      ...(o.type === "article" && o.published ? { publishedTime: o.published } : {}),
      ...(o.type === "article" && (o.modified ?? o.published) ? { modifiedTime: o.modified ?? o.published } : {}),
      ...(withImages ? { images: [{ url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png", alt: OG_ALT }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      ...(withImages ? { images: [{ url: "/twitter-image.png", width: 1200, height: 630, alt: OG_ALT }] } : {}),
    },
  };
}

/* ── JSON-LD ────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type JsonLdNode = Record<string, unknown>;
export interface JsonLdDoc {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
}

const graph = (...nodes: JsonLdNode[]): JsonLdDoc => ({ "@context": "https://schema.org", "@graph": nodes });
const idOf = (appUrl: string, fragment: string) => `${absoluteUrl(appUrl, "/")}#${fragment}`;

export function websiteLd(appUrl: string): JsonLdNode {
  return { "@type": "WebSite", "@id": idOf(appUrl, "website"), name: SITE_NAME, url: absoluteUrl(appUrl, "/"), publisher: { "@id": idOf(appUrl, "org") } };
}

/** No `sameAs` yet: the GitHub repo is private until Day 13, and there is no public profile. Add them when they exist. */
export function organizationLd(appUrl: string): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": idOf(appUrl, "org"),
    name: SITE_NAME,
    url: absoluteUrl(appUrl, "/"),
    logo: absoluteUrl(appUrl, "/icon-512.png"),
    description: SITE_DEFINITION,
  };
}

/** The product. No ratings, no reviews, no offers or prices (we have none, and fake ones break Google's policy). */
export function webApplicationLd(appUrl: string): JsonLdNode {
  return {
    "@type": "WebApplication",
    "@id": idOf(appUrl, "app"),
    name: SITE_NAME,
    url: absoluteUrl(appUrl, "/"),
    description: SITE_DEFINITION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any (web browser)",
    creator: { "@id": idOf(appUrl, "org") },
  };
}

/** The home page's graph: WebSite + Organization + WebApplication. */
export function siteJsonLd(appUrl: string = APP_URL): JsonLdDoc {
  return graph(websiteLd(appUrl), organizationLd(appUrl), webApplicationLd(appUrl));
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbLd(crumbs: readonly Crumb[], appUrl: string = APP_URL): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(appUrl, c.path) })),
  };
}

export interface QA {
  q: string;
  a: string;
}

/** Only for Q&A that is visible on the page, word for word. Google no longer shows FAQ rich results; harmless. */
export function faqLd(items: readonly QA[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

export interface ArticleInput {
  path: string;
  headline: string;
  description: string;
  published: string;
  modified: string;
  type?: "Article" | "TechArticle";
}

export function articleLd(a: ArticleInput, appUrl: string = APP_URL): JsonLdNode {
  const url = absoluteUrl(appUrl, a.path);
  return {
    "@type": a.type ?? "Article",
    "@id": `${url}#article`,
    headline: a.headline,
    description: a.description,
    mainEntityOfPage: url,
    datePublished: a.published,
    dateModified: a.modified,
    inLanguage: "en",
    author: { "@id": idOf(appUrl, "org") },
    publisher: { "@id": idOf(appUrl, "org") },
  };
}

/** A page's JSON-LD: the nodes in one `@graph`. Pass the Organization node too when the page references its `@id`. */
export function jsonLdGraph(...nodes: JsonLdNode[]): JsonLdDoc {
  return graph(...nodes);
}

/** Copy text with its `[label](/path)` link markup removed (what JSON-LD carries, equal to the visible words). */
export function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/** The script body: `<` is escaped so no string in the data can close the tag. */
export function serializeJsonLd(doc: unknown): string {
  return JSON.stringify(doc).replace(/</g, "\\u003c");
}

/* ── /llms.txt ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * /llms.txt (llmstxt.org): hand-written, links and plain descriptions only. Paths on this site only: the GitHub repo
 * is private until Day 13, so it isn't linked. The guides list reads the marketing registry (ready pages only).
 * Contract facts are worded for whichever contract is live, so they point at /contract instead of quoting an account.
 */
export function llmsTxt(appUrl: string = APP_URL, pages: readonly MarketingPage[] = MARKETING_PAGES): string {
  const u = (p: string) => absoluteUrl(appUrl, p);
  const guides = readyPages(pages).map((p) => `- [${p.title}](${u(pagePath(p))}): ${p.description}`);
  return [
    "# Satchel",
    "",
    "> Satchel is an NFT on NEAR that is a wallet: each token of a NEP-171 contract controls its own Bitcoin, Ethereum and Solana addresses through NEAR Chain Signatures. Give or sell the NFT and the coins go with it. Before buying, the buyer's browser checks the Satchel's clean history: every signature it ever made.",
    "",
    "Testnet only: NEAR testnet, Bitcoin testnet4, Ethereum Sepolia and its Base, Arbitrum and Optimism test networks, Solana devnet. The coins have no value. Built by Razvan Statescu for the NEAR hackathon, November 2026. Satchel is new and hasn't been audited.",
    "",
    "## Start here",
    `- [Home](${u("/")}): what a Satchel is and how a sale works`,
    `- [Questions](${u("/questions")}): answers about keys, chains, clean history, selling, giving and fees`,
    `- [Contract facts](${u("/contract")}): the contract account, its access keys, the code it runs and the commands to check them`,
    `- [Learn](${u("/learn")}): short guides to the ideas behind Satchel`,
    "",
    "## Guides",
    ...(guides.length ? guides : [`- [Learn](${u("/learn")}): the guides`]),
    "",
    "## Live data (server-rendered, readable without JavaScript)",
    `- [Satchel #1](${u("/s/1")}): owner, addresses, balances and signature count`,
    `- [Satchel #1 as JSON](${u("/api/satchels/1")}): the same facts as JSON`,
    `- [Market](${u("/market")}): Satchels for sale, each with its clean-history verdict`,
    `- [Clean history for Satchel #1 as JSON](${u("/api/clean-history/1")}): the server's check of the signature record`,
    "",
    "## Optional",
    "- [NEAR Chain Signatures docs](https://docs.near.org/chain-abstraction/chain-signatures): the signer network Satchel uses",
    "- [NEP-171](https://nomicon.io/Standards/Tokens/NonFungibleToken/Core): the NFT standard a Satchel follows",
    "",
  ].join("\n");
}
