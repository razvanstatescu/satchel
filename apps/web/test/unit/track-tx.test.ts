import { describe, expect, it } from "vitest";
import { classify, trackTx } from "@/lib/near/track-tx";
import {
  DRPC_408,
  DRPC_METHOD_NA,
  FASTNEAR_408,
  INVALID_TX,
  MPC_SIG,
  NEARCORE_MASTER_408,
  PARTIAL_STARTED,
  RATE_LIMITED,
  SERVER_500,
  SIGN_FOR_DONE,
  SIGN_FOR_PANIC,
  UNKNOWN_TX,
  scriptedFetch,
} from "../fixtures/rpc";

const URLS = ["https://rpc.testnet.fastnear.com", "https://near-testnet.drpc.org"];

describe("classify (recorded RPC answers)", () => {
  it("FastNEAR 408 TIMEOUT_ERROR carries the pending status", () => {
    expect(classify(FASTNEAR_408.http, FASTNEAR_408.body)).toMatchObject({ kind: "pending", status: "INCLUDED_FINAL" });
  });
  it("parses nearcore master's {Pending:{status}} shape too", () => {
    expect(classify(NEARCORE_MASTER_408.http, NEARCORE_MASTER_408.body)).toMatchObject({ kind: "pending", status: "EXECUTED_OPTIMISTIC" });
  });
  it("dRPC free-plan 408 code 30 means ask again (pending), never fatal", () => {
    expect(classify(DRPC_408.http, DRPC_408.body)).toMatchObject({ kind: "pending" });
  });
  it("UNKNOWN_TRANSACTION → unknown; INVALID_TRANSACTION → fatal", () => {
    expect(classify(UNKNOWN_TX.http, UNKNOWN_TX.body).kind).toBe("unknown");
    expect(classify(INVALID_TX.http, INVALID_TX.body).kind).toBe("fatal");
  });
  it("429 / 5xx / dRPC -32601 / network → retry", () => {
    expect(classify(RATE_LIMITED.http, RATE_LIMITED.body).kind).toBe("retry");
    expect(classify(SERVER_500.http, null).kind).toBe("retry");
    expect(classify(DRPC_METHOD_NA.http, DRPC_METHOD_NA.body).kind).toBe("retry");
    expect(classify(0, null).kind).toBe("retry");
  });
  it("a partial outcome (status Started) is pending, never done", () => {
    expect(classify(PARTIAL_STARTED.http, PARTIAL_STARTED.body)).toMatchObject({ kind: "pending", status: "INCLUDED_FINAL" });
  });
  it("SuccessValue / Failure at EXECUTED+ is done", () => {
    expect(classify(SIGN_FOR_DONE.http, SIGN_FOR_DONE.body).kind).toBe("done");
    expect(classify(SIGN_FOR_PANIC.http, SIGN_FOR_PANIC.body).kind).toBe("done");
  });
});

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms), advance: (ms: number) => void (t += ms) };
}

describe("trackTx (long-poll, classify, rotate)", () => {
  it("long-polls through 408s and decodes on_signed's array", async () => {
    const c = clock();
    const s = scriptedFetch([FASTNEAR_408, FASTNEAR_408, SIGN_FOR_DONE]);
    const stages: string[] = [];
    const r = await trackTx({ txHash: "h", senderId: "alice", rpcUrls: URLS, fetchImpl: s.fetch, now: c.now, sleep: c.sleep, onStage: (x) => stages.push(x.stage) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([MPC_SIG]);
    expect(stages).toEqual(["submitted", "included", "executed"]);
    expect(s.calls.every((u) => u === URLS[0])).toBe(true); // pending answers never rotate
  });

  it("rotates providers on 429 / network errors with backoff", async () => {
    const c = clock();
    const s = scriptedFetch([RATE_LIMITED, "network", SIGN_FOR_DONE]);
    const r = await trackTx({ txHash: "h", senderId: "alice", rpcUrls: URLS, fetchImpl: s.fetch, now: c.now, sleep: c.sleep });
    expect(r.ok).toBe(true);
    expect(s.calls).toEqual([URLS[0], URLS[1], URLS[0]]);
  });

  it("returns the Failure (contract panic) without retrying", async () => {
    const c = clock();
    const s = scriptedFetch([SIGN_FOR_PANIC]);
    const r = await trackTx({ txHash: "h", senderId: "alice", rpcUrls: URLS, fetchImpl: s.fetch, now: c.now, sleep: c.sleep });
    expect(r.ok).toBe(false);
    expect("failure" in r && JSON.stringify(r.failure)).toContain("ERR_FROZEN");
  });

  it("UNKNOWN_TRANSACTION past the grace period → lost", async () => {
    const c = clock();
    const s = scriptedFetch([UNKNOWN_TX]);
    const r = await trackTx({ txHash: "h", senderId: "a", rpcUrls: URLS, fetchImpl: s.fetch, now: c.now, sleep: c.sleep, unknownGraceMs: 5000 });
    expect(r).toEqual({ ok: false, lost: true });
  });

  it("INVALID_TRANSACTION is fatal", async () => {
    const c = clock();
    const r = await trackTx({ txHash: "h", senderId: "a", rpcUrls: URLS, fetchImpl: scriptedFetch([INVALID_TX]).fetch, now: c.now, sleep: c.sleep });
    expect(r.ok === false && "fatal" in r).toBe(true);
  });

  it("gives up at the deadline (never claims failure)", async () => {
    const c = clock();
    const r = await trackTx({ txHash: "h", senderId: "a", rpcUrls: URLS, fetchImpl: scriptedFetch([SERVER_500]).fetch, now: c.now, sleep: c.sleep, deadlineMs: 20_000 });
    expect(r).toEqual({ ok: false, deadline: true });
  });

  it("paces the dRPC free plan instead of hammering it", async () => {
    const c = clock();
    const s = scriptedFetch([DRPC_408, SIGN_FOR_DONE]);
    const r = await trackTx({ txHash: "h", senderId: "a", rpcUrls: ["https://near-testnet.drpc.org"], fetchImpl: s.fetch, now: c.now, sleep: c.sleep });
    expect(r.ok).toBe(true);
    expect(c.now()).toBeGreaterThanOrEqual(1500);
  });

  it("refuses the deprecated near.org RPC", async () => {
    const bad = ["https://", "rpc", ".testnet", ".near", ".org"].join("");
    await expect(trackTx({ txHash: "h", senderId: "a", rpcUrls: [bad], fetchImpl: scriptedFetch([SIGN_FOR_DONE]).fetch, deadlineMs: 1, sleep: async () => {} })).resolves.toMatchObject({ ok: false });
  });
});
