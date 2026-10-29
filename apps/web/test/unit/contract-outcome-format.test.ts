import { describe, expect, it } from "vitest";
import { diffConfig } from "@satchel/core/near";
import { FIXTURE_CONFIG } from "@/lib/data/fixtures";
import { blocksUntilListable, calls, contractViews, deriveStatus, requestCount } from "@/lib/near/contract";
import { ATTACH, minSignPrepaidTgas, signAttachDeposit, signAttachTgas } from "@/lib/near/constants";
import { decodeSuccessValue, eventsFromOutcome, mapFailure, secpParts, signaturesFromReceipts, signaturesFromSuccess } from "@/lib/near/outcome";
import { formatAmount, formatBlocks, formatElapsed, groupAddress, parseUnits, relativeTime, truncateAddress } from "@/lib/format";
import { MPC_SIG, ON_SIGNED_FAILED, SIGN_FOR_DONE, SIGN_FOR_PANIC } from "../fixtures/rpc";
import type { TxOutcome } from "@/lib/near/track-tx";

describe("gas and deposit formulas (kb/90 §5.5)", () => {
  it("attach min(300, 60 + 20·n) Tgas, floor 30 + 18·n, 0.005 NEAR × n", () => {
    expect([1, 2, 4, 10].map(signAttachTgas)).toEqual([80, 100, 140, 260]);
    expect([1, 4, 10].map(minSignPrepaidTgas)).toEqual([48, 102, 210]);
    expect(signAttachDeposit(1)).toBe(5_000_000_000_000_000_000_000n);
    expect(signAttachDeposit(3)).toBe(15_000_000_000_000_000_000_000n);
    for (const n of [1, 2, 4, 10]) expect(signAttachTgas(n)).toBeGreaterThanOrEqual(minSignPrepaidTgas(n));
    expect(() => signAttachTgas(11)).toThrow();
  });
  it("mirrors config(): the fixture view matches the compiled constants (@satchel/core diffConfig)", () => {
    expect(diffConfig(FIXTURE_CONFIG as never)).toEqual([]);
    expect(FIXTURE_CONFIG.cooldown_blocks).toBe(250);
  });
  it("NEP-171 transfer attaches exactly 1 yocto; mint 0.02 NEAR", () => {
    expect(ATTACH.transfer.deposit).toBe("1");
    expect(ATTACH.mint.deposit).toBe("20000000000000000000000");
  });
});

describe("call builders (kb/90 §5.6)", () => {
  it("sign_for: structured request, gas/deposit as decimal strings", () => {
    const evm = calls.signFor("1", { evm: { unsigned_tx: "02f1" } }, "satchel.satchelhq.testnet");
    expect(evm).toEqual({
      receiverId: "satchel.satchelhq.testnet",
      actions: [{ type: "FunctionCall", params: { methodName: "sign_for", args: { token_id: "1", request: { evm: { unsigned_tx: "02f1" } } }, gas: "80000000000000", deposit: "5000000000000000000000" } }],
    });
    const btc = calls.signFor("1", { btc: { preimages: ["a", "b", "c"], outputs: "o" } }, "c");
    expect(requestCount({ btc: { preimages: ["a", "b", "c"], outputs: "o" } })).toBe(3);
    expect(btc.actions[0].params.gas).toBe("120000000000000");
    expect(btc.actions[0].params.deposit).toBe("15000000000000000000000");
  });
  it("buy binds (listing_id, expected_sig_count); USDC goes through ft_transfer_call with the buy msg", () => {
    const near = calls.buyNear("3", 7, 4, "1000", "c");
    expect(near.actions[0].params).toMatchObject({ methodName: "buy", args: { token_id: "3", listing_id: 7, expected_sig_count: 4 }, deposit: "1000" });
    const usdc = calls.buyUsdc("3", 7, 4, "5000000", "satchel.x.testnet", "usdc.x");
    expect(usdc.receiverId).toBe("usdc.x");
    expect(usdc.actions[0].params.args).toEqual({ receiver_id: "satchel.x.testnet", amount: "5000000", msg: '{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}' });
    expect(usdc.actions[0].params).toMatchObject({ gas: "150000000000000", deposit: "1" });
  });
  it("views page sig_records at ≤ 50 and read seq 0..sig_count", async () => {
    const seen: unknown[] = [];
    const v = contractViews((async (_c: string, m: string, a: Record<string, unknown>) => {
      seen.push([m, a]);
      return Array.from({ length: Math.min(50, 120 - Number(a.from_seq)) }, (_, i) => ({ seq: Number(a.from_seq) + i }));
    }) as never, "c");
    const all = await v.allSigRecords("1", 120);
    expect(all).toHaveLength(120);
    expect(seen.map((x) => (x as [string, { from_seq: number; limit: number }])[1])).toEqual([
      { token_id: "1", from_seq: 0, limit: 50 },
      { token_id: "1", from_seq: 50, limit: 50 },
      { token_id: "1", from_seq: 100, limit: 50 },
    ]);
  });
  it("status pill: Listed > Needs attention > Signing (young pending record) > Active; quiet period", () => {
    expect(deriveStatus({ satchel: { listing: { id: 1 } as never } })).toBe("listed");
    expect(deriveStatus({ satchel: { listing: null }, needsAttention: true })).toBe("needs_attention");
    expect(deriveStatus({ satchel: { listing: null }, records: [{ status: "pending", height: 900 }], height: 1000 })).toBe("signing");
    expect(deriveStatus({ satchel: { listing: null }, records: [{ status: "pending", height: 700 }], height: 1000 })).toBe("active");
    expect(blocksUntilListable({ listable_at: 1250, last_sign_height: 1000 }, 1107)).toBe(143);
    expect(blocksUntilListable({ listable_at: 0, last_sign_height: 0 }, 5)).toBe(0);
  });
});

describe("outcome decoding (kb/90 §5.8)", () => {
  const done = SIGN_FOR_DONE.body.result as unknown as TxOutcome;
  it("decodes on_signed's array, yParity = recovery_id, r without the prefix", () => {
    const v = decodeSuccessValue((done.status as { SuccessValue: string }).SuccessValue);
    expect(signaturesFromSuccess(v, 1)).toEqual([MPC_SIG]);
    expect(signaturesFromSuccess([null], 1)).toEqual([null]);
    expect(secpParts(MPC_SIG as never)).toEqual({ r: MPC_SIG.big_r.affine_point.slice(2), s: MPC_SIG.s.scalar, yParity: 0 });
  });
  it("falls back to the MPC receipts and assigns signatures by verification", () => {
    const o = ON_SIGNED_FAILED.body.result as unknown as TxOutcome;
    expect(signaturesFromReceipts(o, ["p"])).toEqual([MPC_SIG]);
    expect(signaturesFromReceipts(o, ["p1", "p2"], (_s, p) => p === "p2")).toEqual([null, MPC_SIG]);
  });
  it("maps panics by the stable ERR_ prefix, MPC strings and balance errors", () => {
    expect(mapFailure((SIGN_FOR_PANIC.body.result.status as { Failure: unknown }).Failure).code).toBe("ERR_FROZEN");
    expect(mapFailure({ x: "Request has timed out." }).code).toBe("MPC_TIMEOUT");
    expect(mapFailure({ x: "Pending-request queue is full" }).code).toBe("MPC_QUEUE");
    expect(mapFailure({ x: "NotEnoughBalance" }).code).toBe("NOT_ENOUGH_BALANCE");
    expect(mapFailure({ x: "weird" }).code).toBe("UNKNOWN");
  });
  it("reads NEP-297 events emitted by the contract", () => {
    expect(eventsFromOutcome(done, "satchel.satchelhq.testnet")).toEqual([{ standard: "satchel", version: "1.0.0", event: "sign_requested", data: { token_id: "1", first_seq: 2, count: 1 } }]);
  });
});

describe("formatting (kb/80 R3 §Formatting)", () => {
  it("rounds down, trims, NBSP before the ticker, U+2212 for outgoing", () => {
    expect(formatAmount(1_230_000n, "BTC")).toBe("0.0123 BTC");
    expect(formatAmount(189_718n, "BTC")).toBe("0.00189718 BTC");
    expect(formatAmount(50_000_000_000_000_000n, "ETH")).toBe("0.0500 ETH");
    expect(formatAmount(1n, "ETH")).toBe("< 0.000001 ETH");
    expect(formatAmount(10_000n, "BTC", { sign: "out" })).toBe("−0.0001 BTC");
    expect(formatAmount(5_000_000n, "USDC")).toBe("5.00 USDC");
    expect(formatAmount(2n * 10n ** 24n, "NEAR")).toBe("2 NEAR");
  });
  it("parses user input and refuses too many decimals", () => {
    expect(parseUnits("0,0001", 8)).toBe(10_000n);
    expect(parseUnits("1.5", 6)).toBe(1_500_000n);
    expect(parseUnits("0.000000001", 8)).toBeNull();
    expect(parseUnits("abc", 8)).toBeNull();
  });
  it("blocks, elapsed, relative time, addresses", () => {
    expect(formatBlocks(143, 560)).toBe("143 blocks (~1 min 20 s)");
    expect(formatElapsed(42_500)).toBe("0:42");
    expect(relativeTime(0, 12_000)).toBe("12 s ago");
    expect(truncateAddress("tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5")).toBe("tb1qtf95…wy5".replace("…wy5", "…wy5").slice(0, 8) + "…" + "cwy5");
    expect(groupAddress("0xd0cdbf83")).toEqual(["0xd0", "cdbf", "83"]);
  });
});
