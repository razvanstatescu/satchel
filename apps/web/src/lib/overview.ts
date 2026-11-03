import type { SatchelSnapshot } from "@/lib/data/types";
import { formatAmount, shareText, usdText, type Ticker } from "@/lib/format";
import { hasCoins, holdings, type Coin } from "@/lib/holdings";
import type { PriceView, PricedCoin } from "@/lib/prices";

/** Re-exported so existing callers don't change; the landing's simulated sample imports both from `lib/format`
 * directly, which pulls in no NEAR reader. */
export { shareText, usdText };

/**
 * A Satchel at a glance (D-50): what it holds, one entry per COIN (ETH on four networks is one ETH; USDC at its
 * addresses and inside is one USDC), valued at mainnet prices and ranked by value, plus the labelled total. Without
 * prices nothing is valued and the coins keep the canonical order. Pure: the card, the Wallet tab, market cards and
 * "You get" all read this, so they never disagree.
 */

export interface CoinTotal {
  coin: Coin;
  ticker: Ticker;
  coinName: string;
  /** base units, summed over every place that holds it */
  amount: bigint;
  decimals: number;
  /** how many places hold it (networks, or inside) */
  places: number;
  /** USD at mainnet prices; null without prices */
  usd: number | null;
  /** its share of the total, 0–1; null without prices */
  share: number | null;
}

export interface Overview {
  /** USD at mainnet prices; null without prices (then no dollar figure is shown anywhere) */
  usd: number | null;
  /** every coin it holds, ranked */
  coins: CoinTotal[];
  /** distinct networks holding something ("inside" counts as NEAR testnet) */
  networks: number;
  /** a balance read failed, so the total may be low */
  partial: boolean;
}

const ORDER: Coin[] = ["BTC", "ETH", "SOL", "USDC", "NEAR", "wNEAR"];
const PRICE_OF: Record<Coin, PricedCoin> = { BTC: "BTC", ETH: "ETH", SOL: "SOL", USDC: "USDC", NEAR: "NEAR", wNEAR: "NEAR" };

const whole = (amount: bigint, decimals: number) => Number(amount) / 10 ** decimals;

export function overview(s: Pick<SatchelSnapshot, "balances"> & Partial<Pick<SatchelSnapshot, "inside" | "prices">>): Overview {
  const list = holdings(s);
  const prices: PriceView | null = s.prices ?? null;
  const byCoin = new Map<Coin, CoinTotal>();
  const networks = new Set<string>();
  for (const h of list) {
    if (!hasCoins(h)) continue;
    networks.add(h.network);
    const t = byCoin.get(h.coin) ?? { coin: h.coin, ticker: h.ticker, coinName: h.coinName, amount: 0n, decimals: h.decimals, places: 0, usd: null, share: null };
    t.amount += h.amount!;
    t.places += 1;
    byCoin.set(h.coin, t);
  }
  const coins = [...byCoin.values()];
  let usd: number | null = null;
  if (prices) {
    usd = 0;
    for (const c of coins) {
      c.usd = whole(c.amount, c.decimals) * prices.usd[PRICE_OF[c.coin]];
      usd += c.usd;
    }
    for (const c of coins) c.share = usd > 0 ? c.usd! / usd : 0;
  }
  coins.sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0) || ORDER.indexOf(a.coin) - ORDER.indexOf(b.coin));
  return { usd, coins, networks: networks.size, partial: list.some((h) => h.amount === null) };
}

/** "0.00189718 BTC" for a coin total. */
export const coinTotalText = (c: CoinTotal, withTicker = true) => formatAmount(c.amount, c.ticker, { withTicker });
