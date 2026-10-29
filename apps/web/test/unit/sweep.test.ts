import { describe, expect, it } from "vitest";
import type { Utxo } from "@satchel/core/chains/btc";
import { MAX_BTC_INPUTS } from "@satchel/core/policy";
import { estimateBatchFee, estimateBatchNet, planBtcSweep } from "@/lib/chains/sweep";
import { satchelAddresses } from "@/lib/derive";

/** Empty the Satchel (A3, plan/feature-ideas.md A3): BTC sweep batching (≤ MAX_BTC_INPUTS per `sign_for`, §8.9). */

const TO = satchelAddresses("1").btc;

function utxo(value: bigint, i: number, confirmed = true): Utxo {
  return { txid: i.toString(16).padStart(64, "0"), vout: 0, value, confirmed };
}

describe("planBtcSweep", () => {
  it("one batch when there are ≤ MAX_BTC_INPUTS UTXOs, largest-first", () => {
    const utxos = [utxo(1000n, 1), utxo(5000n, 2), utxo(3000n, 3)];
    const batches = planBtcSweep(utxos);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.inputs.map((u) => u.value)).toEqual([5000n, 3000n, 1000n]);
    expect(batches[0]!.sats).toBe(9000n);
  });

  it("splits into batches of at most MAX_BTC_INPUTS, largest-first across batches too", () => {
    const utxos = Array.from({ length: MAX_BTC_INPUTS + 3 }, (_, i) => utxo(BigInt(1000 + i), i));
    const batches = planBtcSweep(utxos);
    expect(batches).toHaveLength(2);
    expect(batches[0]!.inputs).toHaveLength(MAX_BTC_INPUTS);
    expect(batches[1]!.inputs).toHaveLength(3);
    // every input in batch 0 is ≥ every input in batch 1 (largest-first across the whole set)
    const minFirst = batches[0]!.inputs.reduce((m, u) => (u.value < m ? u.value : m), batches[0]!.inputs[0]!.value);
    const maxSecond = batches[1]!.inputs.reduce((m, u) => (u.value > m ? u.value : m), batches[1]!.inputs[0]!.value);
    expect(minFirst).toBeGreaterThanOrEqual(maxSecond);
  });

  it("drops unconfirmed UTXOs unless asked to include them", () => {
    const utxos = [utxo(1000n, 1, true), utxo(2000n, 2, false)];
    expect(planBtcSweep(utxos)[0]!.inputs).toHaveLength(1);
    expect(planBtcSweep(utxos, { allowUnconfirmed: true })[0]!.inputs).toHaveLength(2);
  });

  it("an empty UTXO set plans zero batches", () => {
    expect(planBtcSweep([])).toEqual([]);
  });

  it("honours a smaller maxInputs for tests, never above the contract's cap", () => {
    const utxos = Array.from({ length: 5 }, (_, i) => utxo(1000n, i));
    expect(planBtcSweep(utxos, { maxInputs: 2 })).toHaveLength(3);
    expect(planBtcSweep(utxos, { maxInputs: 999 })[0]!.inputs.length).toBeLessThanOrEqual(MAX_BTC_INPUTS);
  });
});

describe("estimateBatchFee / estimateBatchNet", () => {
  it("a bigger batch (more inputs) pays a bigger fee at the same rate", () => {
    const small = { inputs: [utxo(10_000n, 1)], sats: 10_000n };
    const big = { inputs: [utxo(10_000n, 1), utxo(10_000n, 2), utxo(10_000n, 3)], sats: 30_000n };
    expect(estimateBatchFee(big, TO, 2)).toBeGreaterThan(estimateBatchFee(small, TO, 2));
  });

  it("net = sats − fee, never negative", () => {
    const batch = { inputs: [utxo(200n, 1)], sats: 200n };
    const fee = estimateBatchFee(batch, TO, 50); // deliberately large fee rate to force it under the fee
    expect(estimateBatchNet(batch, TO, 50)).toBe(fee >= 200n ? 0n : 200n - fee);
  });
});
