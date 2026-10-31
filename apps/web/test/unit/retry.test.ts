/**
 * Round two of the test audit (docs/testing/core-api.md "What remains untested"): `lib/signing/retry.ts` on its
 * own. `signing-runner.test.ts` already covers the headline cases (EVM nonce reuse, BTC input reuse, basic
 * blocking); this file fills in the branches that file doesn't: message intents never blocking, per-EVM-chain-id
 * scoping (C3), every SPENDABLE_UNSENT stage individually, the `failed`-with-signature edge, SOL's `expired`
 * exception, BTC's "no inputs to retry" guard, and `bumpEvmFee`/`sameInputSet` edge values.
 */
import { describe, expect, it } from "vitest";
import { blockingIntent, bumpEvmFee, retryPlan, sameInputSet } from "@/lib/signing/retry";
import type { PendingIntent, SigningStage } from "@/lib/signing/types";

function base(p: Partial<PendingIntent> = {}): PendingIntent {
  return {
    id: "i1",
    tokenId: "1",
    chain: "evm",
    createdAt: 0,
    contract: "c",
    sigCountBefore: 2,
    heightBefore: 1000,
    unsigned: { evmTx: "0x02" },
    payloadHashes: ["ab".repeat(32)],
    evmNonce: 3,
    stage: "awaiting_wallet",
    signerId: "alice",
    ...p,
  };
}

describe("blockingIntent", () => {
  it("a different tokenId never blocks, even with every other field matching", () => {
    expect(blockingIntent([base({ tokenId: "2", stage: "signed_not_sent" })], "1", "evm")).toBeNull();
  });

  it("a message intent (C7) never blocks, regardless of stage", () => {
    const msg = base({ message: { kind: "evm_message", text: "hi" }, stage: "signed_not_sent" });
    expect(blockingIntent([msg], "1", "evm")).toBeNull();
  });

  it("every SPENDABLE_UNSENT stage blocks: awaiting_wallet, signing, signed, broadcasting, signed_not_sent, timed_out, unknown", () => {
    const blocking: SigningStage[] = ["awaiting_wallet", "signing", "signed", "broadcasting", "signed_not_sent", "timed_out", "unknown"];
    for (const stage of blocking) {
      expect(blockingIntent([base({ stage })], "1", "evm"), `stage ${stage} should block`).not.toBeNull();
    }
  });

  it("terminal/non-blocking stages (confirmed, cancelled) and the SOL-only 'expired' stage never block", () => {
    const nonBlocking: SigningStage[] = ["confirmed", "cancelled", "expired", "idle", "preparing", "sent"];
    for (const stage of nonBlocking) {
      expect(blockingIntent([base({ stage })], "1", "evm"), `stage ${stage} should not block`).toBeNull();
    }
  });

  it("'failed' blocks only when a signature actually came back (a verify failure after signing still leaks a usable signature)", () => {
    expect(blockingIntent([base({ stage: "failed" })], "1", "evm")).toBeNull();
    expect(blockingIntent([base({ stage: "failed", signatures: [null, null] })], "1", "evm")).toBeNull();
    expect(blockingIntent([base({ stage: "failed", signatures: [null, { r: "a", s: "b", recoveryId: 0 }] })], "1", "evm")).not.toBeNull();
  });

  it("EVM nonces are scoped per chain id (C3): an intent on a different evmChainId never blocks", () => {
    const base42 = base({ stage: "signed_not_sent", evmChainId: 42161 });
    expect(blockingIntent([base42], "1", "evm", 11155111)).toBeNull(); // asking about Sepolia; the blocker is on Arbitrum Sepolia
    expect(blockingIntent([base42], "1", "evm", 42161)).not.toBeNull(); // asking about the same chain
  });

  it("an intent with no evmChainId is treated as Sepolia (every intent written before C3)", () => {
    const legacy = base({ stage: "signed_not_sent", evmChainId: undefined });
    expect(blockingIntent([legacy], "1", "evm", 11155111)).not.toBeNull();
    expect(blockingIntent([legacy], "1", "evm", 42161)).toBeNull();
  });

  it("asking with no evmChainId at all (evmChainId undefined) skips the per-chain filter entirely and matches any EVM intent", () => {
    const base42 = base({ stage: "signed_not_sent", evmChainId: 42161 });
    expect(blockingIntent([base42], "1", "evm")).not.toBeNull();
  });

  it("a replacement chain (replaces) only supersedes its exact target, not other earlier intents", () => {
    const list = [base({ id: "x", stage: "timed_out" }), base({ id: "y", stage: "timed_out" }), base({ id: "z", stage: "confirmed", replaces: "x" })];
    // x is superseded, but y is independently still blocking
    expect(blockingIntent(list, "1", "evm")?.id).toBe("y");
  });

  it("returns the first blocking intent in array order when several would block", () => {
    const list = [base({ id: "first", stage: "signed_not_sent" }), base({ id: "second", stage: "timed_out" })];
    expect(blockingIntent(list, "1", "evm")?.id).toBe("first");
  });

  it("an empty intent list never blocks", () => {
    expect(blockingIntent([], "1", "evm")).toBeNull();
  });
});

describe("retryPlan", () => {
  it("EVM: bumpFees is true only for signed_not_sent, unknown and timed_out (stages that may already be in the mempool)", () => {
    const bump: SigningStage[] = ["signed_not_sent", "unknown", "timed_out"];
    for (const stage of bump) {
      expect(retryPlan(base({ stage })).bumpFees, `stage ${stage}`).toBe(true);
    }
    const noBump: SigningStage[] = ["cancelled", "awaiting_wallet", "signing", "signed", "broadcasting", "failed"];
    for (const stage of noBump) {
      expect(retryPlan(base({ stage })).bumpFees, `stage ${stage}`).toBe(false);
    }
  });

  it("EVM: throws when there's no earlier nonce to reuse (a malformed/legacy intent)", () => {
    expect(() => retryPlan(base({ chain: "evm", evmNonce: undefined }))).toThrow(/nonce/);
  });

  it("BTC: throws when there's no earlier input set to reuse", () => {
    expect(() => retryPlan(base({ chain: "btc", unsigned: {} }))).toThrow(/input set/);
    expect(() => retryPlan(base({ chain: "btc", unsigned: { btc: { psbtHex: "", preimages: [], outputs: "", inputs: [] } } }))).toThrow(/input set/);
  });

  it("BTC: bumpFees is always false, regardless of stage (fee bumping is an EVM-only concept here)", () => {
    const btc = (stage: SigningStage) => base({ chain: "btc", stage, unsigned: { btc: { psbtHex: "", preimages: [], outputs: "", inputs: ["t:0"] } } });
    expect(retryPlan(btc("signed_not_sent")).bumpFees).toBe(false);
    expect(retryPlan(btc("timed_out")).bumpFees).toBe(false);
  });

  it("SOL: waits for blockhash expiry unless the intent is already stage 'expired'", () => {
    expect(retryPlan(base({ chain: "sol", stage: "timed_out" })).solWaitForExpiry).toBe(true);
    expect(retryPlan(base({ chain: "sol", stage: "expired" })).solWaitForExpiry).toBe(false);
  });

  it("SOL: carries the earlier lastValidBlockHeight through as solNotBefore", () => {
    const sol = base({ chain: "sol", unsigned: { sol: { message: "m", lastValidBlockHeight: 12345 } } });
    expect(retryPlan(sol).solNotBefore).toBe(12345);
  });

  it("SOL: solNotBefore is undefined when there's no prior sol payload recorded", () => {
    expect(retryPlan(base({ chain: "sol", unsigned: {} })).solNotBefore).toBeUndefined();
  });

  it("SOL: bumpFees is always false", () => {
    expect(retryPlan(base({ chain: "sol", stage: "timed_out" })).bumpFees).toBe(false);
  });
});

describe("bumpEvmFee", () => {
  it("rounds up to the next wei on a fractional 10% bump, never truncating below the true 110%", () => {
    expect(bumpEvmFee(1n)).toBe(2n); // ceil(1.1) = 2, not 1 (floor would under-bump)
    expect(bumpEvmFee(0n)).toBe(0n);
    expect(bumpEvmFee(10n)).toBe(11n);
    expect(bumpEvmFee(100n)).toBe(110n); // exact, no rounding needed
  });

  it("handles large (gwei-scale) values without precision loss (bigint arithmetic)", () => {
    expect(bumpEvmFee(50_000_000_000n)).toBe(55_000_000_000n);
  });
});

describe("sameInputSet", () => {
  it("two empty sets are the same", () => {
    expect(sameInputSet([], [])).toBe(true);
  });

  it("a different length is never the same, even with overlapping elements", () => {
    expect(sameInputSet(["a:0"], ["a:0", "b:1"])).toBe(false);
  });

  it("order never matters", () => {
    expect(sameInputSet(["a:0", "b:1", "c:2"], ["c:2", "a:0", "b:1"])).toBe(true);
  });

  it("a duplicate in one set but not the other, with equal length, is caught (Set collapses the duplicate so a real difference still slips through length-equality — pin the actual behavior)", () => {
    // a has a duplicate "a:0"; b has "a:0" once and a genuinely different "b:1". Same length (2), but not the same set.
    expect(sameInputSet(["a:0", "a:0"], ["a:0", "b:1"])).toBe(false);
  });
});
