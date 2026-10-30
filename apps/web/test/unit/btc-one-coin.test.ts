import { describe, expect, it } from "vitest";
import { BtcOneCoinError, prepareSend } from "@/lib/chains/send";

/**
 * AUDIT-01 (C5): a delegate's bitcoin send spends exactly one coin, because the contract refuses a delegate's BTC request
 * with more than one input. Fixture Satchel #1 holds two coins: 139,718 sats and 50,000 sats.
 */

const TO = "tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u";

describe("prepareSend with oneInput (a delegate's bitcoin send)", () => {
  it("pays from the smallest coin that covers the amount and its fee", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: 10_000n, records: [], oneInput: true });
    expect(p.inputsCount).toBe(1);
    expect(p.amount).toBe(10_000n);
    expect((p.unsigned as { btc: { inputs: string[] } }).btc.inputs).toHaveLength(1);
  });

  it("uses the bigger coin when the small one can't pay", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: 100_000n, records: [], oneInput: true });
    expect(p.inputsCount).toBe(1);
  });

  it("refuses an amount no single coin can pay, naming the largest coin", async () => {
    // 160,000 fits the total (189,718) but no one coin
    await expect(prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: 160_000n, records: [], oneInput: true })).rejects.toMatchObject({
      problem: "btc_one_coin",
      largest: 139_718n,
    });
    await expect(prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: 160_000n, records: [], oneInput: true })).rejects.toBeInstanceOf(BtcOneCoinError);
  });

  it("max sweeps the largest coin only; the owner's max still sweeps both", async () => {
    const one = await prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: "max", records: [], oneInput: true });
    expect(one.inputsCount).toBe(1);
    expect(one.amount + one.fee).toBe(139_718n);
    const all = await prepareSend({ tokenId: "1", chain: "btc", to: TO, amount: "max", records: [] });
    expect(all.inputsCount).toBe(2);
  });
});
