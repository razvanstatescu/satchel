import { APP_URL } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { holdings, type Coin, type Holding, type Network } from "@/lib/holdings";

/**
 * The public "Add coins" page, `/fund/[id]` (send its link to anyone who should send you coins): the sender picks the
 * coin, then the network, and gets that one address (or, for a coin held inside, the add field). A shared link can
 * pre-fill both: `/fund/1?coin=usdc&network=base`. Pure helpers; the page and every Share button use them.
 */

/** The coins a sender can pick, in this order (only those this deployment offers). */
const COIN_ORDER: Coin[] = ["BTC", "ETH", "USDC", "SOL", "NEAR", "wNEAR"];
const COIN_SLUG: Record<Coin, string> = { BTC: "btc", ETH: "eth", USDC: "usdc", SOL: "sol", NEAR: "near", wNEAR: "wnear" };
const NETWORKS: Network[] = ["bitcoin", "sepolia", "base", "arbitrum", "optimism", "solana", "near"];

export interface FundPrefill {
  coin?: Coin | null;
  network?: Network | null;
}

export function fundPath(tokenId: string, p: FundPrefill = {}): string {
  const q = new URLSearchParams();
  if (p.coin) q.set("coin", COIN_SLUG[p.coin]);
  if (p.coin && p.network) q.set("network", p.network);
  const qs = q.toString();
  return `/fund/${tokenId}${qs ? `?${qs}` : ""}`;
}

/** The absolute link, for sharing and copying. */
export const fundUrl = (tokenId: string, p: FundPrefill = {}) => `${APP_URL}${fundPath(tokenId, p)}`;

/** The pre-fill of a holding: its coin and its network. */
export const prefillOf = (h: Pick<Holding, "coin" | "network">): FundPrefill => ({ coin: h.coin, network: h.network });

const one = (raw: unknown) => (Array.isArray(raw) ? raw[0] : raw);

/** `?coin=&network=` → a valid pre-fill (unknown values are dropped, never guessed). */
export function parseFund(coinRaw: unknown, networkRaw: unknown): { coin: Coin | null; network: Network | null } {
  const c = String(one(coinRaw) ?? "").toLowerCase();
  const n = String(one(networkRaw) ?? "").toLowerCase();
  const coin = COIN_ORDER.find((k) => COIN_SLUG[k] === c) ?? null;
  const network = (NETWORKS as string[]).includes(n) ? (n as Network) : null;
  return { coin, network: coin ? network : null };
}

export interface FundChoice {
  /** every coin a sender can pick */
  coins: Coin[];
  coin: Coin | null;
  /** the places that coin can go (one per network, or inside) */
  places: Holding[];
  /** the place to show: the picked network's, or the only one there is; null while a network still has to be picked */
  place: Holding | null;
}

/** What the page shows for a pre-fill: the coin picker, the network picker for that coin, and the destination. */
export function fundChoice(s: Pick<SatchelSnapshot, "balances" | "inside">, p: { coin: Coin | null; network: Network | null }): FundChoice {
  const list = holdings(s);
  const coins = COIN_ORDER.filter((c) => list.some((h) => h.coin === c));
  const coin = p.coin && coins.includes(p.coin) ? p.coin : null;
  const places = coin ? list.filter((h) => h.coin === coin) : [];
  const place = places.length === 1 ? places[0] : (places.find((h) => h.network === p.network) ?? null);
  return { coins, coin, places, place };
}
