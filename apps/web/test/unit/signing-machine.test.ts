import { describe, expect, it } from "vitest";
import { etaKey, isRejection, trackerRows, transition } from "@/lib/signing/machine";
import type { PendingIntent, SigningEvent } from "@/lib/signing/types";

const SIG = { r: "aa".repeat(32), s: "11".repeat(32), recoveryId: 1 };

function intent(p: Partial<PendingIntent> = {}): PendingIntent {
  return {
    id: "i1",
    tokenId: "1",
    chain: "evm",
    createdAt: 0,
    contract: "satchel.satchelhq.testnet",
    sigCountBefore: 2,
    heightBefore: 1000,
    unsigned: { evmTx: "0x02f1" },
    payloadHashes: ["ab".repeat(32)],
    evmNonce: 1,
    stage: "idle",
    ...p,
  };
}
const run = (i: PendingIntent, evs: SigningEvent[]) => evs.reduce(transition, i);

describe("SigningProgress state machine (kb/90 §8.6)", () => {
  it("happy path: preparing → awaiting_wallet → signing → signed → broadcasting → sent → confirmed", () => {
    let i = run(intent(), [{ type: "SEND", now: 1 }]);
    expect(i.stage).toBe("preparing");
    i = transition(i, { type: "PERSISTED", now: 2 });
    expect(i.stage).toBe("awaiting_wallet");
    i = transition(i, { type: "RECORD_SEEN", seqs: [2], now: 3 });
    expect(i.stage).toBe("signing");
    expect(i.signingAt).toBe(3);
    i = transition(i, { type: "RECORDS", statuses: ["pending"], signatures: [null], now: 4 });
    expect(i.stage).toBe("signing");
    i = transition(i, { type: "RECORDS", statuses: ["signed"], signatures: [SIG], now: 5 });
    expect(i.stage).toBe("signed");
    i = run(i, [{ type: "VERIFIED" }, { type: "BROADCAST_OK", chainTxId: "0xabc", now: 6 }, { type: "CONFIRMED", now: 7 }]);
    expect(i).toMatchObject({ stage: "confirmed", chainTxId: "0xabc", sentAt: 6, confirmedAt: 7 });
  });

  it("a wallet hash moves awaiting_wallet → signing even before any record", () => {
    const i = run(intent({ stage: "awaiting_wallet" }), [{ type: "TX_HASH", hash: "H", now: 9 }]);
    expect(i).toMatchObject({ stage: "signing", nearTxHash: "H" });
  });

  it("rejection counts only after 10 s with no record (cancelled)", () => {
    let i = run(intent({ stage: "awaiting_wallet" }), [{ type: "WALLET_REJECTED", message: "User rejected the transaction", now: 100 }]);
    expect(i.stage).toBe("awaiting_wallet");
    i = transition(i, { type: "TICK", now: 5_000, height: 1001 });
    expect(i.stage).toBe("awaiting_wallet");
    i = transition(i, { type: "TICK", now: 10_100, height: 1002 });
    expect(i.stage).toBe("cancelled");
  });

  it("a record seen after a rejection wins: the wallet did send it", () => {
    const i = run(intent({ stage: "awaiting_wallet" }), [
      { type: "WALLET_REJECTED", message: "User closed the window", now: 100 },
      { type: "RECORD_SEEN", seqs: [2], now: 5_000 },
      { type: "TICK", now: 20_000, height: 1003 },
    ]);
    expect(i.stage).toBe("signing");
  });

  it("Intear's 'Failed to send transaction 1: Timeout' is not a rejection", () => {
    expect(isRejection("Failed to send transaction 1: Timeout")).toBe(false);
    expect(isRejection("User rejected the transaction")).toBe(true);
    const i = run(intent({ stage: "awaiting_wallet" }), [
      { type: "WALLET_REJECTED", message: "Failed to send transaction 1: Timeout", now: 0 },
      { type: "TICK", now: 60_000, height: 1010 },
    ]);
    expect(i.stage).toBe("awaiting_wallet");
  });

  it("timeout: a failed record → timed_out (never 'no signature exists')", () => {
    const i = run(intent({ stage: "signing", seqs: [2] }), [{ type: "RECORDS", statuses: ["failed"], signatures: [null], now: 120_000 }]);
    expect(i.stage).toBe("timed_out");
  });

  it("no terminal state by h0 + 250 → unknown (never 'failed'), Check again → signing", () => {
    let i = run(intent({ stage: "signing", nearTxHash: "H" }), [{ type: "TICK", now: 1, height: 1249 }]);
    expect(i.stage).toBe("signing");
    i = transition(i, { type: "TICK", now: 2, height: 1250 });
    expect(i.stage).toBe("unknown");
    i = transition(i, { type: "CHECK_AGAIN", now: 3 });
    expect(i.stage).toBe("signing");
  });

  it("a contract panic before any record → failed; after records it is ignored (on_signed bug, scan receipts)", () => {
    expect(run(intent({ stage: "signing" }), [{ type: "TX_FAILURE", code: "ERR_FROZEN" }])).toMatchObject({ stage: "failed", error: "ERR_FROZEN" });
    expect(run(intent({ stage: "signing", seqs: [2] }), [{ type: "TX_FAILURE", code: "UNKNOWN" }]).stage).toBe("signing");
  });

  it("tx value with a null entry → timed_out; complete → signed", () => {
    expect(run(intent({ stage: "signing" }), [{ type: "TX_SUCCESS", signatures: [null], now: 1 }]).stage).toBe("timed_out");
    expect(run(intent({ stage: "signing" }), [{ type: "TX_SUCCESS", signatures: [SIG], now: 1 }]).stage).toBe("signed");
  });

  it("BTC: signed only when EVERY input's record is signed", () => {
    const btc = intent({ chain: "btc", payloadHashes: ["01".repeat(32), "02".repeat(32)], stage: "signing" });
    expect(run(btc, [{ type: "RECORDS", statuses: ["signed", "pending"], signatures: [SIG, null], now: 1 }]).stage).toBe("signing");
    expect(run(btc, [{ type: "RECORDS", statuses: ["signed", "signed"], signatures: [SIG, SIG], now: 1 }]).stage).toBe("signed");
    expect(run(btc, [{ type: "RECORDS", statuses: ["signed", "failed"], signatures: [SIG, null], now: 1 }]).stage).toBe("timed_out");
  });

  it("verify failure → failed (E22)", () => {
    expect(run(intent({ stage: "signed", signatures: [SIG] }), [{ type: "VERIFY_FAILED" }])).toMatchObject({ stage: "failed", error: "E22" });
  });

  it("signed_not_sent → Broadcast again → broadcasting → sent (same signed tx, no new signature)", () => {
    let i = run(intent({ stage: "broadcasting", signatures: [SIG] }), [{ type: "BROADCAST_ERROR", reason: "mempool.space isn't responding." }]);
    expect(i).toMatchObject({ stage: "signed_not_sent", notSentReason: "mempool.space isn't responding." });
    i = run(i, [{ type: "BROADCAST_AGAIN" }, { type: "BROADCAST_OK", chainTxId: "tx", now: 9 }]);
    expect(i).toMatchObject({ stage: "sent", signatures: [SIG] });
  });

  it("SOL blockhash expiry during broadcast → expired", () => {
    expect(run(intent({ chain: "sol", stage: "broadcasting" }), [{ type: "SOL_EXPIRED" }]).stage).toBe("expired");
  });

  it("Try again keeps the nonce / input set and clears the transient fields", () => {
    const i = run(intent({ stage: "timed_out", evmNonce: 7, nearTxHash: "H", seqs: [2], unsigned: { btc: { psbtHex: "", preimages: [], outputs: "", inputs: ["aa:0"] } } }), [{ type: "RETRY", now: 50 }]);
    expect(i).toMatchObject({ stage: "preparing", evmNonce: 7, createdAt: 50 });
    expect(i.nearTxHash).toBeUndefined();
    expect(i.seqs).toBeUndefined();
    expect(i.unsigned.btc?.inputs).toEqual(["aa:0"]);
  });

  it("ignores events that don't apply to the current stage", () => {
    const i = intent({ stage: "confirmed" });
    expect(transition(i, { type: "BROADCAST_OK", chainTxId: "x", now: 1 })).toBe(i);
    expect(transition(i, { type: "RETRY", now: 1 })).toBe(i);
  });

  it("ETA copy thresholds 0 / 20 / 60 / 150 s", () => {
    expect([0, 15_000, 19_999, 20_000, 59_999, 60_000, 149_999, 150_000, 400_000].map(etaKey)).toEqual([0, 0, 0, 20, 20, 60, 60, 150, 150]);
  });

  it("tracker rows per stage", () => {
    expect(trackerRows("signing")).toEqual(["done", "active", "future", "future"]);
    expect(trackerRows("sent")).toEqual(["done", "done", "done", "active"]);
    expect(trackerRows("signed_not_sent")).toEqual(["done", "done", "failed", "future"]);
    expect(trackerRows("timed_out")).toEqual(["done", "failed", "future", "future"]);
  });
});
