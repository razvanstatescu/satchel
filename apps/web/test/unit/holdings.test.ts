import { describe, expect, it } from "vitest";
import { USDC_CONTRACT } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { cardRows, findHolding, holdings, holdingText, INSIDE_NETWORK_NAME, splitHoldings } from "@/lib/holdings";
import { WNEAR_TESTNET } from "@/lib/near/contract";
import { cardChips } from "@/lib/view";

/** The one holdings list (lib/holdings.ts): the Wallet tab's rows, the card's ledger and the buyer's "You get". */

type Snap = Pick<SatchelSnapshot, "balances" | "inside">;

const EMPTY: Snap = {
  balances: {
    btc: { confirmed_sats: "0", unconfirmed_sats: "0" },
    evm: { wei: "0" },
    sol: { lamports: "0" },
    evm_chains: [
      { chain_id: 11155111, wei: "0", usdc: "0" },
      { chain_id: 84532, wei: "0", usdc: "0" },
      { chain_id: 421614, wei: "0", usdc: "0" },
      { chain_id: 11155420, wei: "0", usdc: "0" },
    ],
  },
  inside: { near: "0", fts: [], inside_epoch: 0 },
};

function snap(patch: { btc?: string; sepEth?: string; sepUsdc?: string; baseEth?: string; baseUsdc?: string; sol?: string; near?: string; usdc?: string; wnear?: string }): Snap {
  const chains = EMPTY.balances.evm_chains!.map((r) => ({ ...r }));
  if (patch.sepUsdc) chains[0].usdc = patch.sepUsdc;
  if (patch.baseEth) chains[1].wei = patch.baseEth;
  if (patch.baseUsdc) chains[1].usdc = patch.baseUsdc;
  if (patch.sepEth) chains[0].wei = patch.sepEth;
  const fts = [
    ...(patch.usdc ? [{ token: USDC_CONTRACT, amount: patch.usdc }] : []),
    ...(patch.wnear ? [{ token: WNEAR_TESTNET, amount: patch.wnear }] : []),
  ];
  return {
    balances: {
      btc: { confirmed_sats: patch.btc ?? "0", unconfirmed_sats: "0" },
      evm: { wei: patch.sepEth ?? "0" },
      sol: { lamports: patch.sol ?? "0" },
      evm_chains: chains,
    },
    inside: { near: patch.near ?? "0", fts, inside_epoch: 0 },
  };
}

describe("holdings: one entry per coin per place", () => {
  it("lists every place in the canonical order, with stable keys", () => {
    expect(holdings(EMPTY).map((h) => h.key)).toEqual([
      "btc",
      "evm",
      "evm-11155111-usdc",
      "evm-84532-eth",
      "evm-84532-usdc",
      "evm-421614-eth",
      "evm-421614-usdc",
      "evm-11155420-eth",
      "evm-11155420-usdc",
      "sol",
      "inside-near",
      "inside-usdc",
      "inside-wnear",
    ]);
  });

  it("names the coin and where it is separately, and badges every coin away from its home chain", () => {
    const list = holdings(EMPTY);
    const base = findHolding(list, "evm-84532-usdc")!;
    expect([base.coinName, base.networkName, base.badge, base.chainId]).toEqual(["USD Coin", "Base Sepolia", "base", 84532]);
    const eth = findHolding(list, "evm")!;
    expect([eth.coinName, eth.networkName, eth.badge, eth.core]).toEqual(["Ethereum", "Ethereum Sepolia", null, true]);
    const near = findHolding(list, "inside-near")!;
    expect([near.place, near.networkName, near.badge, near.chain]).toEqual(["inside", INSIDE_NETWORK_NAME, "near", null]);
    expect(findHolding(list, "inside-wnear")!.ft).toBe(WNEAR_TESTNET);
    expect(findHolding(list, "nope")).toBeNull();
  });

  it("keeps a failed read as unavailable (null), never as zero", () => {
    const s: Snap = { ...EMPTY, balances: { ...EMPTY.balances, btc: null, evm_chains: [{ chain_id: 11155111, wei: "0", usdc: null }] } };
    const list = holdings(s);
    expect(findHolding(list, "btc")!.amount).toBeNull();
    expect(findHolding(list, "evm-11155111-usdc")!.amount).toBeNull();
    // a chain missing from evm_chains reads as unavailable too
    expect(findHolding(list, "evm-84532-eth")!.amount).toBeNull();
    expect(holdingText(findHolding(list, "btc")!)).toBeNull();
  });
});

describe("splitHoldings: what the Wallet tab shows, and what folds away", () => {
  it("a new Satchel shows its three home coins; the ten empty places fold away", () => {
    const { shown, empty } = splitHoldings(holdings(EMPTY));
    expect(shown.map((h) => h.key)).toEqual(["btc", "evm", "sol"]);
    expect(empty).toHaveLength(10);
  });

  it("held coins come first (canonical order), then the home coins at zero", () => {
    const { shown, empty } = splitHoldings(holdings(snap({ baseUsdc: "10000000", near: "1000000000000000000000000", sol: "5" })));
    expect(shown.map((h) => h.key)).toEqual(["evm-84532-usdc", "sol", "inside-near", "btc", "evm"]);
    expect(empty.map((h) => h.key)).not.toContain("evm-84532-usdc");
  });

  it("an unavailable place stays visible, so a failed read is never hidden", () => {
    const s: Snap = { ...EMPTY, balances: { ...EMPTY.balances, evm_chains: [...EMPTY.balances.evm_chains!.slice(0, 3), { chain_id: 11155420, wei: null, usdc: "0" }] } };
    expect(splitHoldings(holdings(s)).shown.map((h) => h.key)).toContain("evm-11155420-eth");
  });
});

describe("the card's ledger", () => {
  it("fills three rows with the home coins when it holds nothing", () => {
    const { rows, more } = cardRows(holdings(EMPTY));
    expect(rows.map((h) => h.key)).toEqual(["btc", "evm", "sol"]);
    expect(more).toBe(0);
  });

  it("shows what it holds first, and counts what didn't fit", () => {
    const list = holdings(snap({ btc: "1000", baseEth: "20000000000000000", sepUsdc: "25000000", near: "1", wnear: "2" }));
    const { rows, more } = cardRows(list);
    expect(rows.map((h) => h.key)).toEqual(["btc", "evm-11155111-usdc", "evm-84532-eth"]);
    expect(more).toBe(2);
  });

  it("a single holding sits beside two home coins", () => {
    expect(cardRows(holdings(snap({ usdc: "5000000" }))).rows.map((h) => h.key)).toEqual(["inside-usdc", "btc", "evm"]);
  });

  it("cardChips: three rows with coins and stickers, then the overflow for the '+N more' stack", () => {
    const chips = cardChips(snap({ btc: "1000", baseEth: "20000000000000000", sepUsdc: "25000000", near: "1000000000000000000000000" }));
    expect(chips.filter((c) => !c.overflow).map((c) => [c.key, c.coin, c.badge ?? null, c.chain ?? null])).toEqual([
      ["btc", "BTC", null, "btc"],
      ["evm-11155111-usdc", "USDC", "sepolia", null],
      ["evm-84532-eth", "ETH", "base", null],
    ]);
    expect(chips.filter((c) => c.overflow).map((c) => [c.key, c.amount])).toEqual([["inside-near", "1"]]);
  });

  it("cardChips on an empty Satchel keeps the three home coins at zero (the card draws a muted 0), no overflow", () => {
    const chips = cardChips(EMPTY);
    expect(chips.map((c) => [c.chain, c.ticker, c.amount, c.overflow ?? false])).toEqual([
      ["btc", "BTC", "0.0000", false],
      ["evm", "ETH", "0.0000", false],
      ["sol", "SOL", "0.0000", false],
    ]);
  });
});
