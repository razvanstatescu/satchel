/**
 * The registry of marketing (SEO) pages. One entry per page under `src/app/(landing)/<slug>/page.tsx`.
 *
 * The sitemap, the footer's Learn group, the /learn hub, /llms.txt and each page's "Related guides" all read this list
 * and skip `ready: false`, so a page appears everywhere the moment its author flips `ready` (and not before: a
 * registered slug with no page behind it must never be linked). Pure: no imports, so it is safe in any bundle.
 *
 * Fields: `slug` has no slash; `title` is the page's H1 and card title; `metaTitle` is the `<title>` before the layout
 * adds " · Satchel" (keep it at 48 characters or fewer); `description` is the meta description and the /learn card line
 * (120 to 160 characters); `primaryQuery` is what the page is for (keyword-research.md §2); `updated` is the date of
 * the last real content change (ISO, shown on the page, `dateModified` and the sitemap `lastmod`).
 */
export interface MarketingPage {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  primaryQuery: string;
  /** A short name for the footer and the breadcrumb. Defaults to `title`. */
  short?: string;
  /** First published (ISO). Defaults to `updated`. */
  published?: string;
  updated: string;
  ready: boolean;
}

export const MARKETING_PAGES: readonly MarketingPage[] = [
  {
    slug: "clean-history",
    short: "Clean history",
    title: "Clean history: check a Satchel's signatures before you buy",
    metaTitle: "Clean history: check a wallet before you buy",
    description:
      "Clean history is the buyer's browser check that no signature a Satchel made before a sale can still move its coins. What it checks, and what it doesn't.",
    primaryQuery: "how to check a crypto wallet before buying",
    published: "2026-11-06",
    updated: "2026-11-06",
    ready: true,
  },
  {
    slug: "sell-a-crypto-wallet",
    short: "Sell a crypto wallet",
    title: "Can you sell a crypto wallet?",
    metaTitle: "Can you sell a crypto wallet?",
    description:
      "Handing over a seed phrase doesn't sell a wallet, because the seller can keep a copy. An NFT that is a wallet can change hands without that risk.",
    primaryQuery: "can you sell a crypto wallet",
    updated: "2026-11-06",
    ready: true,
  },
  {
    slug: "buy-a-crypto-wallet",
    short: "Buy a crypto wallet",
    title: "Crypto wallet with a balance for sale: what to check first",
    metaTitle: "Crypto wallet with a balance for sale: a guide",
    description:
      "Wallets with a balance for sale are a known scam pattern. What a buyer can check first, and how a Satchel's record makes that check possible.",
    primaryQuery: "crypto wallet with balance for sale",
    updated: "2026-11-06",
    ready: true,
  },
  {
    slug: "transfer-a-crypto-wallet",
    short: "Give a crypto wallet",
    title: "Can I give my crypto wallet to someone else?",
    metaTitle: "Can I give my crypto wallet to someone else?",
    description:
      "The usual answer is a new wallet and a transfer. With a Satchel you give the NFT to another NEAR account and its Bitcoin, Ethereum and Solana coins go too.",
    primaryQuery: "can i give my crypto wallet to someone else",
    updated: "2026-11-06",
    ready: true,
  },
  {
    slug: "gift-crypto",
    short: "Gift crypto",
    title: "How to gift crypto to someone without a wallet",
    metaTitle: "Gift crypto to someone without a wallet",
    description:
      "Give a Satchel by link to someone who has no NEAR account yet. How the link works, what the receiver does, and what to know before you send one.",
    primaryQuery: "how to gift crypto to someone without a wallet",
    updated: "2026-11-06",
    ready: false,
  },
  {
    slug: "erc-6551",
    short: "ERC-6551",
    title: "ERC-6551 and token bound accounts, compared with Satchel",
    metaTitle: "ERC-6551 token bound accounts vs Satchel",
    description:
      "ERC-6551 gives an NFT an account on one EVM chain. How that compares with a Satchel's native Bitcoin, Ethereum and Solana addresses and its clean history.",
    primaryQuery: "erc 6551 token bound account",
    updated: "2026-11-06",
    ready: false,
  },
  {
    slug: "chain-signatures",
    short: "Chain Signatures",
    title: "NEAR Chain Signatures in practice: an NFT that signs on three chains",
    metaTitle: "NEAR Chain Signatures: an NFT that signs",
    description:
      "A worked example of NEAR Chain Signatures: how a Satchel contract derives addresses per token and records each signature request before it is made.",
    primaryQuery: "near chain signatures",
    updated: "2026-11-06",
    ready: false,
  },
];

/** The pages that exist (the only ones any list may link). */
export function readyPages(pages: readonly MarketingPage[] = MARKETING_PAGES): MarketingPage[] {
  return pages.filter((p) => p.ready);
}

export const pagePath = (p: Pick<MarketingPage, "slug">): string => `/${p.slug}`;

export function findPage(slug: string, pages: readonly MarketingPage[] = MARKETING_PAGES): MarketingPage | undefined {
  return pages.find((p) => p.slug === slug);
}

/** Ready guides other than `slug`, in registry order: the "Related guides" list. */
export function relatedPages(slug: string, pages: readonly MarketingPage[] = MARKETING_PAGES): MarketingPage[] {
  return readyPages(pages).filter((p) => p.slug !== slug);
}
