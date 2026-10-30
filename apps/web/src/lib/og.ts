import { copy, TICKER } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import { balanceText, UI_CHAINS } from "@/lib/view";

/**
 * The social card's data (A1; /s/[id]/opengraph-image, /s/[id]/twitter-image), pure and unit-tested so the JSX
 * renderer (og-card.tsx) stays a thin layout. Never fiat, never testnet balances dressed up as real money: native
 * units with tickers only (D-37), the "Testnet" badge, and the state word the Wallet tab and the NFT media already
 * use (kb/81 R4 precedence) — except a listed Satchel reads "For sale" here (`copy.buy.forSale`), the word a buyer
 * actually sees, rather than the owner-side "Paused for sale".
 *
 * The sig line only ever claims "Clean history" when sig_count is 0: that's true without checking anything live.
 * Any other count is shown as a plain number ("2 signatures") — a static image can't speak for a per-browser check.
 */

export interface OgChainAmount {
  ticker: string;
  amount: string;
}

export interface OgCardProps {
  id: string;
  status: string;
  sigLine: string;
  chains: OgChainAmount[];
  testnet: string;
}

export function ogStatusWord(snap: Pick<SatchelSnapshot, "status" | "listing">): string {
  if (snap.listing) return copy.buy.forSale;
  if (snap.status === "needs_attention") return copy.pill.needs_attention;
  if (snap.status === "signing") return copy.pill.signing;
  return copy.pill.active;
}

export function ogSigLine(sigCount: number): string {
  return sigCount === 0 ? copy.card.ogClean : copy.card.svgSigs(sigCount);
}

export type OgSnapshotInput = Pick<SatchelSnapshot, "token_id" | "status" | "listing" | "sig_count" | "balances">;

export function buildOgCardProps(snap: OgSnapshotInput): OgCardProps {
  // the share image keeps the three home coins (its ledger has no room for networks): BTC, ETH on Sepolia, SOL
  const chains: OgChainAmount[] = UI_CHAINS.map((c) => ({ ticker: TICKER[c], amount: balanceText(snap, c, false) ?? "0" }));
  return {
    id: snap.token_id,
    status: ogStatusWord(snap),
    sigLine: ogSigLine(snap.sig_count),
    chains,
    testnet: copy.app.badge,
  };
}
