import { describe, expect, it } from "vitest";
import { emptyPlan } from "@/components/client/EmptyFlow";
import { USDC_CONTRACT } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { holdings } from "@/lib/holdings";

/** Take everything out (A3): the plan covers every coin it holds, in an order that can actually run. */

function snap(p: { btc?: string; sep?: [string, string]; base?: [string, string]; arb?: [string, string]; sol?: string; near?: string; usdcIn?: string }): Pick<SatchelSnapshot, "balances" | "inside"> {
  const row = (chain_id: number, v?: [string, string]) => ({ chain_id, wei: v?.[0] ?? "0", usdc: v?.[1] ?? "0" });
  return {
    balances: {
      btc: { confirmed_sats: p.btc ?? "0", unconfirmed_sats: "0" },
      evm: { wei: p.sep?.[0] ?? "0" },
      sol: { lamports: p.sol ?? "0" },
      evm_chains: [row(11155111, p.sep), row(84532, p.base), row(421614, p.arb), row(11155420)],
    },
    inside: { near: p.near ?? "0", fts: p.usdcIn ? [{ token: USDC_CONTRACT, amount: p.usdcIn }] : [], inside_epoch: 0 },
  };
}

describe("emptyPlan", () => {
  it("finds coins beyond BTC, Sepolia ETH and SOL: other networks, USDC, and inside", () => {
    // the reported case: nothing on the three home coins, ETH and USDC on Base Sepolia
    const { jobs, stuck } = emptyPlan(holdings(snap({ base: ["8970000000000000", "20000000"] })));
    expect(jobs.map((j) => j.key)).toEqual(["evm-84532-usdc", "evm-84532-eth"]);
    expect(stuck).toEqual([]);
  });

  it("orders BTC, then each EVM network (USDC before its ETH), then SOL, then inside", () => {
    const { jobs } = emptyPlan(holdings(snap({ btc: "1000", sep: ["5", "7"], base: ["9", "0"], sol: "3", near: "1", usdcIn: "2" })));
    expect(jobs.map((j) => j.key)).toEqual(["btc", "evm-11155111-usdc", "evm", "evm-84532-eth", "sol", "inside-near", "inside-usdc"]);
    expect(jobs.find((j) => j.key === "inside-near")!.label).toBe("NEAR inside");
    expect(jobs.find((j) => j.key === "evm-84532-eth")!.label).toBe("ETH on Base Sepolia");
  });

  it("USDC on a network with no ETH for the fee can't move: it is named, not planned", () => {
    const { jobs, stuck } = emptyPlan(holdings(snap({ btc: "1", arb: ["0", "4000000"] })));
    expect(jobs.map((j) => j.key)).toEqual(["btc"]);
    expect(stuck.map((h) => h.key)).toEqual(["evm-421614-usdc"]);
  });

  it("an empty Satchel plans nothing", () => expect(emptyPlan(holdings(snap({}))).jobs).toEqual([]));
});
