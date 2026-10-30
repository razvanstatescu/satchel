import { afterEach, describe, expect, it, vi } from "vitest";
import { USDC_CONTRACT } from "@/lib/config";
import { copy } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import { WNEAR_TESTNET } from "@/lib/near/contract";
import { overview, shareText, usdText } from "@/lib/overview";
import { FIXTURE_PRICES, parse1Click, parseCoinGecko, type PriceView } from "@/lib/prices";

/** D-50: the Satchel at a glance — coins grouped across networks and inside, valued at mainnet prices, ranked. */

type Snap = Pick<SatchelSnapshot, "balances" | "inside" | "prices">;

const ZERO_CHAINS = [11155111, 84532, 421614, 11155420].map((chain_id) => ({ chain_id, wei: "0", usdc: "0" }));

function snap(p: { btc?: string; sepEth?: string; baseEth?: string; sepUsdc?: string; baseUsdc?: string; sol?: string; near?: string; usdcIn?: string; wnear?: string; prices?: PriceView | null }): Snap {
  const chains = ZERO_CHAINS.map((r) => ({ ...r }));
  if (p.sepEth) chains[0].wei = p.sepEth;
  if (p.sepUsdc) chains[0].usdc = p.sepUsdc;
  if (p.baseEth) chains[1].wei = p.baseEth;
  if (p.baseUsdc) chains[1].usdc = p.baseUsdc;
  return {
    balances: { btc: { confirmed_sats: p.btc ?? "0", unconfirmed_sats: "0" }, evm: { wei: p.sepEth ?? "0" }, sol: { lamports: p.sol ?? "0" }, evm_chains: chains },
    inside: {
      near: p.near ?? "0",
      fts: [...(p.usdcIn ? [{ token: USDC_CONTRACT, amount: p.usdcIn }] : []), ...(p.wnear ? [{ token: WNEAR_TESTNET, amount: p.wnear }] : [])],
      inside_epoch: 0,
    },
    prices: p.prices === undefined ? FIXTURE_PRICES : p.prices,
  };
}

const NEAR1 = "1000000000000000000000000";

describe("overview: one entry per coin, valued and ranked", () => {
  it("groups a coin across networks and inside, and counts the places", () => {
    const ov = overview(snap({ sepUsdc: "25000000", baseUsdc: "10000000", usdcIn: "5000000", sepEth: "1000000000000000000", baseEth: "500000000000000000" }));
    const usdc = ov.coins.find((c) => c.coin === "USDC")!;
    expect([usdc.amount, usdc.places]).toEqual([40_000_000n, 3]);
    const eth = ov.coins.find((c) => c.coin === "ETH")!;
    expect([eth.amount, eth.places]).toEqual([1_500_000_000_000_000_000n, 2]);
    expect(ov.networks).toBe(3); // Sepolia, Base, inside on NEAR
  });

  it("values each coin at its mainnet price (wNEAR at NEAR's), totals them and ranks by value", () => {
    // fixture prices: BTC 80,000 · ETH 2,500 · SOL 100 · NEAR 4 · USDC 1
    const ov = overview(snap({ btc: "100000", sepEth: "100000000000000000", sol: "1000000000", near: NEAR1, wnear: NEAR1, usdcIn: "5000000" }));
    expect(ov.coins.map((c) => [c.coin, c.usd])).toEqual([
      ["ETH", 250],
      ["SOL", 100],
      ["BTC", 80],
      ["USDC", 5],
      ["NEAR", 4],
      ["wNEAR", 4],
    ]);
    expect(ov.usd).toBe(443);
    expect(ov.coins.reduce((a, c) => a + (c.share ?? 0), 0)).toBeCloseTo(1);
  });

  it("without prices: no dollar figure and no shares, the canonical order", () => {
    const ov = overview(snap({ near: NEAR1, btc: "1", sol: "5", prices: null }));
    expect(ov.usd).toBeNull();
    expect(ov.coins.map((c) => [c.coin, c.usd, c.share])).toEqual([
      ["BTC", null, null],
      ["SOL", null, null],
      ["NEAR", null, null],
    ]);
  });

  it("an empty Satchel has no coins and a zero total; a failed read marks it partial", () => {
    expect(overview(snap({}))).toMatchObject({ usd: 0, coins: [], networks: 0, partial: false });
    const s = snap({ btc: "5" });
    s.balances.sol = null;
    expect(overview(s).partial).toBe(true);
  });
});

describe("the labels", () => {
  it("formats dollars to 2 decimals, with '< $0.01' for dust", () => {
    expect(usdText(1148.719)).toBe("$1,148.72");
    expect(usdText(0)).toBe("$0.00");
    expect(usdText(0.004)).toBe("< $0.01");
    expect(copy.overview.estimate(usdText(12.5))).toBe("≈ $12.50");
    expect(copy.overview.atPrices).toBe("at mainnet prices");
  });
  it("shares round to whole percents, '< 1%' for a sliver", () => {
    expect([shareText(0.4149), shareText(0.004), shareText(1)]).toEqual(["41%", "< 1%", "100%"]);
  });
  it("says what it holds without prices", () => {
    expect(copy.overview.coinsOn(6, 5)).toBe("6 coins on 5 networks");
    expect(copy.overview.coinsOn(1, 1)).toBe("1 coin on 1 network");
  });
});

describe("prices: 1Click first, CoinGecko as the fallback", () => {
  const rows = [
    { assetId: "nep141:btc.omft.near", price: 77558 },
    { assetId: "nep141:eth.omft.near", price: 2240.27 },
    { assetId: "nep141:sol.omft.near", price: 96.84 },
    { assetId: "nep141:wrap.near", price: 4.35 },
    { assetId: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", price: 0.999619 },
    { assetId: "nep141:other.near", price: 1 },
  ];

  it("reads 1Click's /v0/tokens rows, and refuses a list missing any coin", () => {
    expect(parse1Click(rows)).toEqual({ BTC: 77558, ETH: 2240.27, SOL: 96.84, NEAR: 4.35, USDC: 0.999619 });
    expect(parse1Click(rows.slice(1))).toBeNull();
    expect(parse1Click({ error: "x" })).toBeNull();
    expect(parse1Click([{ assetId: "nep141:btc.omft.near", price: "77558" }])).toBeNull();
  });

  it("reads CoinGecko's /simple/price, and refuses zero or missing prices", () => {
    const j = { bitcoin: { usd: 77502 }, ethereum: { usd: 2239.93 }, solana: { usd: 96.74 }, near: { usd: 4.33 }, "usd-coin": { usd: 0.99967 } };
    expect(parseCoinGecko(j)).toEqual({ BTC: 77502, ETH: 2239.93, SOL: 96.74, NEAR: 4.33, USDC: 0.99967 });
    expect(parseCoinGecko({ ...j, near: { usd: 0 } })).toBeNull();
    expect(parseCoinGecko(null)).toBeNull();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("falls back to CoinGecko when 1Click fails, and reads null when both do", async () => {
    vi.resetModules();
    const { fetchPrices } = await import("@/lib/prices");
    const gecko = { bitcoin: { usd: 1 }, ethereum: { usd: 2 }, solana: { usd: 3 }, near: { usd: 4 }, "usd-coin": { usd: 1 } };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("1click") ? new Response("nope", { status: 503 }) : Response.json(gecko))));
    expect(await fetchPrices(500)).toMatchObject({ source: "coingecko", usd: { BTC: 1, NEAR: 4 } });

    vi.resetModules();
    const fresh = await import("@/lib/prices");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    expect(await fresh.fetchPrices(500)).toBeNull();
  });
});
