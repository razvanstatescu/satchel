import { describe, expect, it } from "vitest";
import { APP_URL } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { fundChoice, fundPath, fundUrl, parseFund, prefillOf } from "@/lib/fund";

/** The public Add coins page's links and choices (lib/fund.ts). */

const SNAP: Pick<SatchelSnapshot, "balances" | "inside"> = {
  balances: {
    btc: { confirmed_sats: "0", unconfirmed_sats: "0" },
    evm: { wei: "0" },
    sol: { lamports: "0" },
    evm_chains: [11155111, 84532, 421614, 11155420].map((chain_id) => ({ chain_id, wei: "0", usdc: "0" })),
  },
  inside: { near: "0", fts: [], inside_epoch: 0 },
};

describe("fund links", () => {
  it("builds the path and the absolute URL, the network only with a coin", () => {
    expect(fundPath("1")).toBe("/fund/1");
    expect(fundPath("1", { coin: "USDC", network: "base" })).toBe("/fund/1?coin=usdc&network=base");
    expect(fundPath("1", { network: "base" })).toBe("/fund/1");
    expect(fundPath("7", { coin: "wNEAR" })).toBe("/fund/7?coin=wnear");
    expect(fundUrl("1", { coin: "BTC" })).toBe(`${APP_URL}/fund/1?coin=btc`);
    expect(prefillOf({ coin: "ETH", network: "arbitrum" })).toEqual({ coin: "ETH", network: "arbitrum" });
  });

  it("parses pre-fills case-insensitively and drops anything unknown", () => {
    expect(parseFund("USDC", "Base")).toEqual({ coin: "USDC", network: "base" });
    expect(parseFund(["eth", "btc"], undefined)).toEqual({ coin: "ETH", network: null });
    expect(parseFund("doge", "base")).toEqual({ coin: null, network: null });
    expect(parseFund(undefined, "base")).toEqual({ coin: null, network: null });
    expect(parseFund("eth", "mainnet")).toEqual({ coin: "ETH", network: null });
  });
});

describe("fund choices", () => {
  it("offers every coin; nothing is picked without a pre-fill", () => {
    const c = fundChoice(SNAP, { coin: null, network: null });
    expect(c.coins).toEqual(["BTC", "ETH", "USDC", "SOL", "NEAR", "wNEAR"]);
    expect([c.coin, c.places.length, c.place]).toEqual([null, 0, null]);
  });

  it("a coin on several networks waits for the network; a wrong network is never guessed", () => {
    const usdc = fundChoice(SNAP, { coin: "USDC", network: null });
    expect(usdc.places.map((h) => h.key)).toEqual(["evm-11155111-usdc", "evm-84532-usdc", "evm-421614-usdc", "evm-11155420-usdc", "inside-usdc"]);
    expect(usdc.place).toBeNull();
    expect(fundChoice(SNAP, { coin: "ETH", network: "solana" }).place).toBeNull();
    expect(fundChoice(SNAP, { coin: "USDC", network: "near" }).place?.key).toBe("inside-usdc");
  });

  it("a coin with one place is picked straight away", () => {
    expect(fundChoice(SNAP, { coin: "BTC", network: null }).place?.key).toBe("btc");
    expect(fundChoice(SNAP, { coin: "NEAR", network: null }).place?.key).toBe("inside-near");
  });
});
