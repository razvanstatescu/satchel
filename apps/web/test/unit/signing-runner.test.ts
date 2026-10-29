import { describe, expect, it } from "vitest";
import { callWallet, RELOAD_REASON, resumeAll, runIntent, type ChainAdapter, type RunnerDeps } from "@/lib/signing/runner";
import { createIntentStore, PENDING_KEY, type KV } from "@/lib/signing/store";
import { blockingIntent, bumpEvmFee, retryPlan, sameInputSet } from "@/lib/signing/retry";
import type { PendingIntent } from "@/lib/signing/types";
import type { SigRecordView } from "@/lib/near/types";
import type { TrackResult } from "@/lib/near/track-tx";
import { ON_SIGNED_FAILED, SIGN_FOR_DONE } from "../fixtures/rpc";

const P = "ab".repeat(32);

function kv(): KV & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return { raw, getItem: (k) => raw.get(k) ?? null, setItem: (k, v) => void raw.set(k, v) };
}

function base(p: Partial<PendingIntent> = {}): PendingIntent {
  return { id: "i1", tokenId: "1", chain: "evm", createdAt: 0, contract: "c", sigCountBefore: 2, heightBefore: 1000, unsigned: { evmTx: "0x02" }, payloadHashes: [P], evmNonce: 3, stage: "awaiting_wallet", signerId: "alice", ...p };
}

function rec(seq: number, status: SigRecordView["status"], payload = P): SigRecordView {
  return {
    seq, request_id: seq, input_index: 0, chain: "evm", height: 1001, timestamp_ms: 0, requester: "alice", payload, status,
    signature: status === "signed" ? { r: "aa".repeat(32), s: "11".repeat(32), recovery_id: 1 } : null,
    detail: { evm: { chain_id: 11155111, nonce: 3, unsigned_tx: "02" } },
  };
}

/** A fake chain: records evolve over polls; the adapter records broadcasts. */
function harness(opts: { records: SigRecordView[][]; broadcast?: ("ok" | "fail")[]; track?: TrackResult; confirmAfter?: number }) {
  const store = createIntentStore(kv());
  let poll = 0;
  let b = 0;
  let confirms = 0;
  const broadcasts: string[] = [];
  const adapter: ChainAdapter = {
    verify: async () => true,
    broadcast: async (i) => {
      broadcasts.push(i.id);
      const r = (opts.broadcast ?? ["ok"])[Math.min(b++, (opts.broadcast ?? ["ok"]).length - 1)];
      return r === "ok" ? { ok: true, chainTxId: "0xchain" } : { ok: false, reason: "Sepolia isn't responding." };
    },
    isConfirmed: async () => ++confirms > (opts.confirmAfter ?? 0),
  };
  const deps: RunnerDeps = {
    store,
    sigRecords: async () => opts.records[Math.min(poll++, opts.records.length - 1)],
    blockHeight: async () => 1000 + poll,
    trackTx: async (_h, _s, signal) => opts.track ?? new Promise((res) => signal.addEventListener("abort", () => res({ ok: false, aborted: true }))),
    chainFor: () => adapter,
    sleep: async () => {},
    now: () => 1000 * poll,
  };
  return { store, deps, broadcasts };
}

describe("signing runner: chain state drives every stage", () => {
  it("watcher (by payload at seq ≥ s0) → signed → verify → broadcast → sent → confirmed", async () => {
    const h = harness({ records: [[], [rec(1, "signed", "ff".repeat(32))], [rec(2, "pending")], [rec(2, "signed")]], confirmAfter: 1 });
    h.store.upsert(base());
    await runIntent("i1", h.deps, new AbortController().signal);
    const i = h.store.get("i1")!;
    expect(i.stage).toBe("confirmed");
    expect(i.seqs).toEqual([2]);
    expect(i.chainTxId).toBe("0xchain");
    expect(h.broadcasts).toEqual(["i1"]);
  });

  it("a failed record → timed_out, and the runner stops (Try again is a user action)", async () => {
    const h = harness({ records: [[rec(2, "pending")], [rec(2, "failed")]] });
    h.store.upsert(base());
    await runIntent("i1", h.deps, new AbortController().signal);
    expect(h.store.get("i1")!.stage).toBe("timed_out");
  });

  it("broadcast failure → signed_not_sent, and Broadcast again resends the SAME signed tx", async () => {
    const h = harness({ records: [[rec(2, "signed")]], broadcast: ["fail", "ok"] });
    h.store.upsert(base());
    await runIntent("i1", h.deps, new AbortController().signal);
    expect(h.store.get("i1")).toMatchObject({ stage: "signed_not_sent", notSentReason: "Sepolia isn't responding." });
    const sigsBefore = JSON.stringify(h.store.get("i1")!.signatures);
    h.store.dispatch("i1", { type: "BROADCAST_AGAIN" });
    await runIntent("i1", h.deps, new AbortController().signal);
    expect(h.store.get("i1")!.stage).toBe("confirmed");
    expect(JSON.stringify(h.store.get("i1")!.signatures)).toBe(sigsBefore);
    expect(h.broadcasts.length).toBe(2);
  });

  it("the tx tracker can finish first (signature in on_signed's SuccessValue)", async () => {
    const h = harness({ records: [[]], track: { ok: true, value: JSON.parse(Buffer.from((SIGN_FOR_DONE.body.result.status as { SuccessValue: string }).SuccessValue, "base64").toString()), outcome: SIGN_FOR_DONE.body.result as never } });
    h.store.upsert(base({ stage: "signing", nearTxHash: "JCHJ" }));
    await runIntent("i1", h.deps, new AbortController().signal);
    expect(h.store.get("i1")!.stage).toBe("confirmed");
  });

  it("on_signed failed but the MPC receipt has the signature → fallback scan of receipts_outcome", async () => {
    const h = harness({ records: [[rec(2, "pending")]], track: { ok: false, failure: ON_SIGNED_FAILED.body.result.status, outcome: ON_SIGNED_FAILED.body.result as never } });
    h.store.upsert(base({ stage: "signing", nearTxHash: "Ab9" }));
    await runIntent("i1", h.deps, new AbortController().signal);
    expect(h.store.get("i1")!.stage).toBe("confirmed");
  });

  it("persisted intents survive a reload (store re-created from storage)", () => {
    const storage = kv();
    const s1 = createIntentStore(storage);
    s1.upsert(base({ stage: "signing", nearTxHash: "H" }));
    expect(JSON.parse(storage.raw.get(PENDING_KEY)!)).toHaveLength(1);
    const s2 = createIntentStore(storage);
    expect(s2.get("i1")).toMatchObject({ stage: "signing", nearTxHash: "H" });
  });

  it("drops malformed entries from storage instead of crashing", () => {
    const storage = kv();
    storage.setItem(PENDING_KEY, JSON.stringify([{ nope: 1 }, base()]));
    expect(createIntentStore(storage).getSnapshot()).toHaveLength(1);
    storage.setItem(PENDING_KEY, "{not json");
    expect(createIntentStore(storage).getSnapshot()).toEqual([]);
  });

  it("resume on load: in-flight intents restart; signed-but-unbroadcast ones become 'Signed, not sent' (offer Broadcast now)", async () => {
    const h = harness({ records: [[rec(2, "signed")]] });
    h.store.upsert(base({ id: "a", stage: "signed", signatures: [{ r: "aa", s: "11", recoveryId: 1 }] }));
    h.store.upsert(base({ id: "b", stage: "broadcasting" }));
    h.store.upsert(base({ id: "c", stage: "confirmed" }));
    resumeAll(h.deps);
    expect(h.store.get("a")).toMatchObject({ stage: "signed_not_sent", notSentReason: RELOAD_REASON });
    expect(h.store.get("b")!.stage).toBe("signed_not_sent");
    expect(h.store.get("c")!.stage).toBe("confirmed");
    expect(h.broadcasts).toEqual([]); // nothing is broadcast silently on load
  });

  it("callWallet: a hash from the wallet moves to signing; a rejection is only a hint", async () => {
    const h = harness({ records: [[]] });
    h.store.upsert(base());
    await callWallet("i1", { signAndSendTransaction: async () => ({ transaction: { hash: "HASH" } }) }, { receiverId: "c", actions: [] }, { store: h.store, now: () => 5 });
    expect(h.store.get("i1")).toMatchObject({ stage: "signing", nearTxHash: "HASH" });

    h.store.upsert(base({ id: "i2" }));
    await callWallet("i2", { signAndSendTransaction: async () => Promise.reject(new Error("User rejected the transaction")) }, { receiverId: "c", actions: [] }, { store: h.store, now: () => 7 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(h.store.get("i2")).toMatchObject({ stage: "awaiting_wallet", rejectedAt: 7 });
  });
});

describe("retry and replacement rules (kb/90 §8.7)", () => {
  it("blocks a new independent send while an earlier same-chain intent can still be spent", () => {
    const list = [base({ id: "x", stage: "signed_not_sent" }), base({ id: "y", chain: "btc", stage: "confirmed" })];
    expect(blockingIntent(list, "1", "evm")?.id).toBe("x");
    expect(blockingIntent(list, "1", "btc")).toBeNull();
    expect(blockingIntent([base({ stage: "cancelled" })], "1", "evm")).toBeNull();
    expect(blockingIntent([base({ stage: "timed_out" })], "1", "evm")).not.toBeNull();
    // a replacement that names the earlier intent supersedes it
    expect(blockingIntent([base({ id: "x", stage: "timed_out" }), base({ id: "z", stage: "confirmed", replaces: "x" })], "1", "evm")).toBeNull();
  });

  it("EVM retry reuses the nonce (fees +10 % if it may be in the mempool); BTC reuses the input set", () => {
    expect(retryPlan(base({ stage: "timed_out", evmNonce: 9 }))).toMatchObject({ evmNonce: 9, bumpFees: true });
    expect(retryPlan(base({ stage: "cancelled", evmNonce: 9 }))).toMatchObject({ evmNonce: 9, bumpFees: false });
    const btc = base({ chain: "btc", unsigned: { btc: { psbtHex: "", preimages: [], outputs: "", inputs: ["t1:0", "t2:1"] } } });
    expect(retryPlan(btc).btcInputs).toEqual(["t1:0", "t2:1"]);
    expect(retryPlan(base({ chain: "sol" })).solWaitForExpiry).toBe(true);
    expect(() => retryPlan(base({ evmNonce: undefined }))).toThrow();
  });

  it("fee bump ≥ 110 % (geth PriceBump 10), input sets compare order-insensitively", () => {
    expect(bumpEvmFee(100n)).toBe(110n);
    expect(bumpEvmFee(3_000_000_001n)).toBe(3_300_000_002n);
    expect(sameInputSet(["a:0", "b:1"], ["b:1", "a:0"])).toBe(true);
    expect(sameInputSet(["a:0"], ["a:1"])).toBe(false);
  });
});
