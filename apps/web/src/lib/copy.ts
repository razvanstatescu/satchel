/**
 * The copy deck (kb/80 R3 §Copy deck; Satchel 2.0 voice, docs/design/satchel-2.0/voice-copy.md), keyed so the design
 * lead can edit strings without touching components. Import `copy` (and `errorCopy`) from "@/lib/copy" everywhere.
 *
 * Rules (voice-copy §1, enforced by test/unit/config-copy-theme.test.ts): sentence case; verb first, one verb per action
 * (Give → Giving… → Given; List for sale → Listing… → Listed, the state "Paused for sale"; Stop selling; Add coins);
 * no plumbing words, no cooldown, no fiat outside the labelled overview estimate (D-50 in plan/decisions.md: "≈ $X" +
 * "at mainnet prices"); never "no signature exists"; icons carry the glyphs; a no-break space before every ticker;
 * straight apostrophes. Strings name Bitcoin, Ethereum and Solana through `copy/chains.ts` (SOL_UI_ENABLED, on by
 * default since D-46); the landing always names all three (D-45).
 *
 * Modules (the Satchel 2.0 build gave each of its lanes one module; the letters name those lanes):
 * - this file (F): the shared constants, `pill`, `card`, the merge and `errorCopy`;
 * - copy/shell.ts (H): app, title, nav, connect, theme, role, footer, toast, home, mint, contract, errors, a11y;
 * - copy/satchel.ts (S): page, wallet, fund, act, facts, verify, how, proof;
 * - copy/flows.ts (X): send, sign, xfer;
 * - copy/commerce.ts (C): sell, freeze, buy, clean, market;
 * - copy/landing.ts (L): landing.
 * Later features added their own modules next to these (copy/allowance, chains, market, multichain, onboarding,
 * questions, wallet-ops).
 */

import { NBSP, plural as n } from "@/lib/format";
import { allowanceCopy } from "@/lib/copy/allowance";
import { commerce } from "@/lib/copy/commerce";
import { flows } from "@/lib/copy/flows";
import { landing } from "@/lib/copy/landing";
import { market } from "@/lib/copy/market";
import { satchel } from "@/lib/copy/satchel";
import { shell } from "@/lib/copy/shell";
import { walletOps } from "@/lib/copy/wallet-ops";
import { multichain } from "@/lib/copy/multichain";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { questionsCopy, questionsPageCopy } from "@/lib/copy/questions";

export type { SolVariant } from "@/lib/copy/landing";

export const NETWORK_LABEL = { btc: "Bitcoin testnet4", evm: "Ethereum Sepolia", sol: "Solana devnet", near: "NEAR testnet" } as const;
export const CHAIN_NAME = { btc: "Bitcoin", evm: "Ethereum", sol: "Solana" } as const;
export const TICKER = { btc: "BTC", evm: "ETH", sol: "SOL" } as const;
export const EXPLORER_NAME = { btc: "mempool.space", evm: "Etherscan", sol: "Solana Explorer", near: "NearBlocks" } as const;

/**
 * The Satchel's state words (voice-copy §1.2, R3): each renders as an icon plus the word, never colour alone (ui.tsx
 * `StatusPill`). The NFT image and Facts read them too.
 */
const pill = {
  active: "Active",
  signing: "Signing",
  listed: "Paused for sale",
  sold: "Sold",
  needs_attention: "Needs attention",
  transferred: "Given",
  bought: "Bought",
} as const;

/** The Satchel card (SatchelCard.tsx) and the NFT image (card-svg.ts). */
const card = {
  name: (id: string) => `Satchel #${id}`,
  preview: "New Satchel",
  /** The lemon stickers on the card's band: "you own this" (R1 #3) and the mint preview. */
  yours: "Yours",
  new: "New",
  /** The charm ledger's list name for assistive tech. */
  listLabel: "What's inside",
  /** The mint preview's rows (no amounts yet): "Bitcoin address". */
  addressRow: (chain: string) => `${chain} address`,
  /** No longer on the card (the charm ledger replaced it, CARD-HERO.md); kept for the market meta and summaries. */
  totalNone: (chains: number) => n(chains, "chain", "chains"),
  chip: (ticker: string, amount: string | null) => (amount === null ? `${ticker}${NBSP}—` : `${ticker}${NBSP}${amount}`),
  svgSigs: (count: number) => n(count, "signature", "signatures"),
  svgSub: "recorded on NEAR testnet",
  /** A1: the social card's (opengraph-image/twitter-image) signature line when nothing has ever been signed — the
   * only case a static image can claim without a live per-browser check (kb/90 §7.7). */
  ogClean: "Clean history",
} as const;

// `market.inside`/`market.offers` (C4/C6, copy/market.ts) are merged as TOP-LEVEL `inside`/`offers` keys, never
// spread as `...market`: `commerce.market` already owns `copy.market` (the /market page's title/count/lead/…).
export const copy = {
  ...shell,
  ...satchel,
  ...flows,
  ...commerce,
  ...walletOps,
  ...allowanceCopy,
  ...multichain,
  pill,
  card,
  landing,
  questions: questionsCopy,
  questionsPage: questionsPageCopy,
  onboarding: onboardingCopy,
  inside: market.inside,
  offers: market.offers,
  offerEntry: market.offerEntry,
} as const;

/** Map a contract/MPC failure code to user copy (kb/80 R3 §Error map): what happened, what didn't move, one action. */
export function errorCopy(code: string, ctx: { id: string; chain?: "btc" | "evm" | "sol" }): string {
  const chainName = ctx.chain ? CHAIN_NAME[ctx.chain] : "chain";
  switch (code) {
    case "ERR_NOT_OWNER":
      return copy.errors.E3(ctx.id);
    case "ERR_FROZEN":
      return copy.errors.E4(ctx.id);
    case "ERR_DEPOSIT":
    case "NOT_ENOUGH_BALANCE":
      return copy.errors.E6("0.3 NEAR");
    case "ERR_GAS":
      return copy.errors.E7gas;
    case "MPC_GAS":
      return copy.errors.E7mpc;
    case "MPC_REJECTED":
      return copy.errors.E8;
    case "MPC_QUEUE":
      return copy.errors.E10;
    case "ERR_LISTED":
      return copy.xfer.blockedListed(ctx.id);
    case "ERR_BAD_RECEIVER":
      return copy.xfer.err.contract;
    case "ERR_ALREADY_LISTED":
      return copy.errors.E34listed(ctx.id);
    case "ERR_NOT_LISTED":
      return copy.errors.E34not(ctx.id);
    case "ERR_SELF_BUY":
      return copy.errors.E36;
    case "ERR_NOTHING_OWED":
      return copy.errors.E38;
    case "ERR_CHAIN_UNSUPPORTED":
      return copy.errors.E40;
    case "ERR_EVM_NONCE_GAP":
      return copy.errors.nonceGap("the next one");
    case "ERR_TOKEN_NOT_FOUND":
      return copy.page.notfound.title(ctx.id);
    case "ERR_INSIDE_BALANCE":
      return copy.errors.E6("0");
    case "ERR_STORAGE_CREDIT":
      return copy.inside.storage.need("0.01 NEAR");
    case "ERR_NO_OFFER":
      return copy.offers.none;
    case "ERR_NOT_OFFERER":
      return copy.offers.mine.cancel;
    case "ERR_OFFER_EXPIRED":
      return copy.offers.mine.expired;
    case "ERR_OFFER_EXPIRY":
      return copy.offers.expiryErr;
    case "ERR_OFFER_STALE":
      return copy.offers.stale;
    case "ERR_TOO_MANY_OFFERS":
      return copy.offers.tooMany;
    case "ERR_QUIET_PERIOD":
      return copy.offers.incoming.blocked.ERR_QUIET_PERIOD;
    // M-01 (fix/m01-solvency, pending merge into C4/C6): the contract refused a call that would have let the
    // escrowed total (inside balances + open offers + storage credit) exceed its own NEAR. Nothing moved.
    case "ERR_INSOLVENT":
      return copy.errors.E6("0");
    default:
      if (code in copy.allowance.err) return copy.allowance.err[code as keyof typeof copy.allowance.err];
      if (/^ERR_(EVM|BTC|SOL|HEX)/.test(code)) return copy.errors.E39(chainName);
      return copy.sign.failed;
  }
}
