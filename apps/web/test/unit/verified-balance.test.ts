import { describe, expect, it } from "vitest";
import { describeLowered } from "@/lib/data/verified-text";
import { evmReadBlock, reconcile, verifiedBtc, type BtcUtxo, type VerifiedBalances } from "@/lib/data/verified";
import { findHolding, holdings } from "@/lib/holdings";

/** "You get" next to a clean verdict (threat model G-2, U-4): the verified balance, and the decision before Buy. */

const coin = (txid: string, vout: number, value: number, confirmedAt: number | null): BtcUtxo => ({
  txid,
  vout,
  value,
  status: confirmedAt === null ? { confirmed: false } : { confirmed: true, block_height: confirmedAt },
});

const bal = (btc: string, wei: string, unconfirmed = "0"): VerifiedBalances => ({
  btc: { confirmed_sats: btc, unconfirmed_sats: unconfirmed },
  evm: { wei },
  sol: { lamports: "0" },
  evm_chains: [
    { chain_id: 11155111, wei, usdc: "0" },
    { chain_id: 84532, wei: "0", usdc: "0" },
    { chain_id: 421614, wei: "0", usdc: "0" },
    { chain_id: 11155420, wei: "0", usdc: "0" },
  ],
});

describe("verifiedBtc: confirmed at depth, minus encumbered coins", () => {
  const TIP = 1000;
  it("leaves out a coin an earlier signature references, and says how much", () => {
    const utxos = [coin("aa".repeat(32), 0, 30000, 900), coin("bb".repeat(32), 1, 20000, 900)];
    const r = verifiedBtc(utxos, [`${"bb".repeat(32)}:1`], TIP, 0n);
    expect(r.btc.confirmed_sats).toBe("30000");
    expect(r.excluded_sats).toBe(20000n);
  });
  it("never counts an unconfirmed coin, or one not yet K deep", () => {
    const utxos = [coin("aa".repeat(32), 0, 10000, 900), coin("cc".repeat(32), 0, 5000, null), coin("dd".repeat(32), 0, 7000, 1000)];
    expect(verifiedBtc(utxos, [], TIP, 0n, 1).btc.confirmed_sats).toBe("17000"); // the tip block itself is 1 deep
    expect(verifiedBtc(utxos, [], TIP, 0n, 2).btc.confirmed_sats).toBe("10000");
  });
  it("a coin that never existed is not in the UTXO set, so it adds nothing", () => {
    expect(verifiedBtc([], [`${"ee".repeat(32)}:0`], TIP, 0n).btc.confirmed_sats).toBe("0");
  });
  it("U-4: BTC counts confirmed coins only, minus a send already in the mempool", () => {
    const utxos = [coin("aa".repeat(32), 0, 10000, 900)];
    const amount = (unconfirmed: bigint) => findHolding(holdings({ balances: { ...bal("0", "0"), btc: verifiedBtc(utxos, [], TIP, unconfirmed).btc } }), "btc")!.amount;
    expect(amount(50000n)).toBe(10000n); // an incoming unconfirmed deposit never counts
    expect(amount(-4000n)).toBe(6000n);
    expect(amount(-50000n)).toBe(0n); // never negative
  });
});

describe("evmReadBlock: the check's depth, never latest", () => {
  it("reads Sepolia 3 blocks back and the L2s as deep as the check goes", () => {
    expect(evmReadBlock(1000n, 11155111)).toBe(997n);
    expect(evmReadBlock(1000n, 84532)).toBe(970n);
    expect(evmReadBlock(1000n, 421614)).toBe(760n);
    expect(evmReadBlock(2n, 11155111)).toBe(0n);
  });
});

describe("reconcile: the decision before Buy", () => {
  it("nothing fell: Buy goes ahead and the baseline follows", () => {
    const r = reconcile(bal("50000", "100"), bal("50000", "100"));
    expect(r.lowered).toEqual([]);
    const up = reconcile(bal("50000", "100"), bal("60000", "100"));
    expect(up.lowered).toEqual([]);
    expect(up.baseline.btc?.confirmed_sats).toBe("60000");
  });
  it("a balance fell: stops, names the coin, and keeps the old baseline until the buyer has been shown the new figure", () => {
    const shown = bal("50000", "14979000000000000");
    const r = reconcile(shown, bal("50000", "0"));
    expect(r.lowered.map((h) => h.key)).toEqual(["evm"]);
    expect(r.baseline).toBe(shown);
    // the figure was shown, the buyer pressed again: now it matches
    expect(reconcile(bal("50000", "0"), bal("50000", "0")).lowered).toEqual([]);
  });
  it("a coin that can no longer be read counts as fallen; the first read has nothing to compare", () => {
    const next = bal("50000", "5");
    next.evm_chains![1].wei = null;
    expect(reconcile(bal("50000", "5"), next).lowered).toEqual([]); // it held nothing before: nothing to lose
    const was = bal("50000", "5");
    was.evm_chains![1].wei = "9";
    expect(reconcile(was, next).lowered.map((h) => h.key)).toEqual(["evm-84532-eth"]);
    expect(reconcile(null, bal("0", "0")).lowered).toEqual([]);
  });
  it("describes what fell in plain words", () => {
    const r = reconcile(bal("50000", "14979000000000000"), bal("50000", "0"));
    expect(describeLowered(r.lowered).replace(/\s/g, " ")).toBe("0.0000 ETH on Ethereum Sepolia");
  });
});
