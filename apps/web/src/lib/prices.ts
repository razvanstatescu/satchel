/**
 * Mainnet USD prices for the Satchel overview's labelled estimate (D-50; kb/50 §Price route): "≈ $X · at mainnet
 * prices", never anywhere else. 1Click `GET /v0/tokens` first (keyless, CORS `*`), CoinGecko `/simple/price` as the
 * fallback; each read bounded, the result kept 60 s in memory (server and browser alike). Any failure reads as null,
 * and the overview then shows no dollar figure at all — never a stale one.
 */

export type PricedCoin = "BTC" | "ETH" | "SOL" | "NEAR" | "USDC";
export const PRICED: readonly PricedCoin[] = ["BTC", "ETH", "SOL", "NEAR", "USDC"];

export interface PriceView {
  /** USD per whole coin, mainnet. wNEAR reads NEAR's. */
  usd: Record<PricedCoin, number>;
  as_of: number; // ms
  source: "1click" | "coingecko" | "fixture";
}

/** 1Click asset ids (read from `/v0/tokens`, kb/50; checked again 2026-10-30). */
const ONECLICK_ID: Record<PricedCoin, string> = {
  BTC: "nep141:btc.omft.near",
  ETH: "nep141:eth.omft.near",
  SOL: "nep141:sol.omft.near",
  NEAR: "nep141:wrap.near",
  USDC: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
};
const GECKO_ID: Record<PricedCoin, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", NEAR: "near", USDC: "usd-coin" };

const ONECLICK_URL = "https://1click.chaindefuser.com/v0/tokens";
const GECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${PRICED.map((c) => GECKO_ID[c]).join(",")}&vs_currencies=usd`;

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/** `/v0/tokens` rows → prices, or null unless every coin has one. */
export function parse1Click(rows: unknown): Record<PricedCoin, number> | null {
  if (!Array.isArray(rows)) return null;
  const byId = new Map<string, unknown>();
  for (const r of rows) if (r && typeof r === "object" && "assetId" in r) byId.set(String((r as { assetId: unknown }).assetId), (r as { price?: unknown }).price);
  const out = {} as Record<PricedCoin, number>;
  for (const c of PRICED) {
    const p = byId.get(ONECLICK_ID[c]);
    if (!ok(p)) return null;
    out[c] = p;
  }
  return out;
}

/** `/simple/price` → prices, or null unless every coin has one. */
export function parseCoinGecko(j: unknown): Record<PricedCoin, number> | null {
  if (!j || typeof j !== "object") return null;
  const out = {} as Record<PricedCoin, number>;
  for (const c of PRICED) {
    const p = (j as Record<string, { usd?: unknown } | undefined>)[GECKO_ID[c]]?.usd;
    if (!ok(p)) return null;
    out[c] = p;
  }
  return out;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const TTL_MS = 60_000;
let memo: { at: number; value: PriceView | null } | null = null;
let inflight: Promise<PriceView | null> | null = null;

/** The live prices (60 s memo, one request in flight at a time); null when neither source answers in time. */
export async function fetchPrices(timeoutMs = 1500, now = Date.now()): Promise<PriceView | null> {
  if (memo && now - memo.at < TTL_MS) return memo.value;
  inflight ??= (async () => {
    const sources: [PriceView["source"], string, (j: unknown) => Record<PricedCoin, number> | null][] = [
      ["1click", ONECLICK_URL, parse1Click],
      ["coingecko", GECKO_URL, parseCoinGecko],
    ];
    for (const [source, url, parse] of sources) {
      try {
        const usd = parse(await getJson(url, timeoutMs));
        if (usd) return { usd, as_of: Date.now(), source };
      } catch {
        // try the next source
      }
    }
    return null;
  })().then((value) => {
    // a failure is remembered for 10 s only, so a blip doesn't hide the estimate for a whole minute
    memo = { at: value ? Date.now() : Date.now() - TTL_MS + 10_000, value };
    inflight = null;
    return value;
  });
  return inflight;
}

/** Fixture mode: fixed, round prices (offline tests, previews). Labelled as mainnet prices like the live ones. */
export const FIXTURE_PRICES: PriceView = {
  usd: { BTC: 80_000, ETH: 2_500, SOL: 100, NEAR: 4, USDC: 1 },
  as_of: Date.UTC(2026, 9, 30, 12, 0, 0),
  source: "fixture",
};
