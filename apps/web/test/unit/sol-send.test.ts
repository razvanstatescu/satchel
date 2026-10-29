import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { hexToBytesStrict } from "@satchel/core/bytes";
import { classifySignRequest } from "@satchel/core/policy";
import { SOL_BLOCKHASH_MAX_AGE_MS as CORE_MAX_AGE, SOL_FEE_LAMPORTS, SOL_RENT_MIN_LAMPORTS, solTransferFromMessage } from "@satchel/core/chains/sol";
import { prepareSend, refreshSolBlockhash, SolSendError } from "@/lib/chains/send";
import { chainAdapterFor, SOL_EXPIRED_RE } from "@/lib/chains/adapter";
import { cleanSources } from "@/lib/data/clean-live";
import { simSolHeight } from "@/lib/data/sim";
import { satchelAddresses } from "@/lib/derive";
import { transition, trackerRows } from "@/lib/signing/machine";
import { blockingIntent, retryPlan } from "@/lib/signing/retry";
import { SOL_BLOCKHASH_MAX_AGE_MS, SOL_REFRESH_MS, solBlockhashFresh } from "@/lib/signing/sol-timing";
import type { PendingIntent } from "@/lib/signing/types";
import { validateSol } from "@/lib/validate";
import { installFakeWindow } from "./fake-window";

/**
 * The Solana send flow (P2; kb/32; kb/90 §8.6–§8.9; D-09): the core builder through Review → SigningProgress → receipt,
 * blockhash prefetch + refresh (≤ 10 s old at the click), the `expired` state with Try again, and the clean-history SOL
 * source.
 */

const S1 = satchelAddresses("1").sol;
const TO = satchelAddresses("2").sol; // any valid on-curve devnet key

describe("D-09 timing", () => {
  it("≤ 10 s at the click, refreshed every 8 s, pinned to @satchel/core", () => {
    expect(SOL_BLOCKHASH_MAX_AGE_MS).toBe(CORE_MAX_AGE);
    expect(SOL_REFRESH_MS).toBeLessThan(SOL_BLOCKHASH_MAX_AGE_MS);
    expect(solBlockhashFresh(1000, 1000 + 10_000)).toBe(true);
    expect(solBlockhashFresh(1000, 1000 + 10_001)).toBe(false);
  });
});

describe("recipient validation (kb/80 R3 §Recipient validation, Solana)", () => {
  it("ok / format error / self / PDA warning", async () => {
    expect(await validateSol(` ${TO} `, S1)).toEqual({ tier: "ok", normalized: TO });
    expect(await validateSol("0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741", S1)).toMatchObject({ tier: "error", message: expect.stringMatching(/valid Solana address/) });
    expect(await validateSol(S1, S1)).toMatchObject({ tier: "error", message: "That's this Satchel's own address." });
    // findProgramAddressSync(["satchel"], System program): 32 bytes, off the curve (no private key)
    expect(await validateSol("Fp9KseRXBcArquhWCibLr4nrFPRhAx8S2kAihQ5sLWiQ", S1)).toMatchObject({ tier: "warning", normalized: "Fp9KseRXBcArquhWCibLr4nrFPRhAx8S2kAihQ5sLWiQ" });
  });
});

describe("prepare (fixture devnet clock; the same core builder as live)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("builds the exact sign_for request: a legacy System transfer, record payload = sha256(message)", async () => {
    const h = simSolHeight();
    const p = await prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: 1_000_000n, records: [] });
    expect(p.chain).toBe("sol");
    expect("sol" in p.request).toBe(true);
    const msg = (p.request as { sol: { message: string } }).sol.message;
    const c = classifySignRequest(p.request as never);
    expect(c.ok).toBe(true);
    expect(p.payloadHashes).toEqual([createHash("sha256").update(hexToBytesStrict(msg)).digest("hex")]);
    expect(p.unsigned.sol).toEqual({ message: msg, lastValidBlockHeight: p.sol!.lastValidBlockHeight });
    expect(p.sol!.lastValidBlockHeight).toBeGreaterThanOrEqual(h + 150);
    expect(p.fee).toBe(SOL_FEE_LAMPORTS);
    expect(p.amount).toBe(1_000_000n);
    expect(p.after).toBe(500_000_000n - 1_000_000n - 5000n); // fixture #1 holds 0.5 SOL
    expect(Date.now() - p.sol!.fetchedAt).toBeLessThan(1000);
    // the message the contract will see rebuilds into the same transfer (Broadcast again / another device)
    const back = solTransferFromMessage(hexToBytesStrict(msg), p.sol!.lastValidBlockHeight);
    expect(back.recentBlockhash).toBe(p.sol!.recentBlockhash);
  });

  it("Max = balance − 5000 lamports (leaves exactly 0)", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: "max", records: [] });
    expect(p.amount).toBe(500_000_000n - 5000n);
    expect(p.after).toBe(0n);
  });

  it("refuses a remainder below rent, an empty Satchel and an overdraft (kb/80 E25/E26)", async () => {
    const left1 = 500_000_000n - 5000n - 1n; // would leave 1 lamport
    await expect(prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: left1, records: [] })).rejects.toMatchObject({ problem: "remainder_below_rent" });
    await expect(prepareSend({ tokenId: "2", chain: "sol", to: TO, amount: 1_000_000n, records: [] })).rejects.toBeInstanceOf(SolSendError);
    await expect(prepareSend({ tokenId: "2", chain: "sol", to: TO, amount: 1_000_000n, records: [] })).rejects.toMatchObject({ problem: "no_balance" });
    await expect(prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: 600_000_000n, records: [] })).rejects.toMatchObject({ problem: "insufficient" });
    expect(SOL_RENT_MIN_LAMPORTS).toBe(650_240n);
  });

  it("refresh swaps only the blockhash (new message + payload, same amount and recipient)", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: 1_000_000n, records: [] });
    await new Promise((r) => setTimeout(r, 300)); // > 1 fixture block (240 ms)
    const q = await refreshSolBlockhash(p);
    expect(q.sol!.recentBlockhash).not.toBe(p.sol!.recentBlockhash);
    expect(q.payloadHashes[0]).not.toBe(p.payloadHashes[0]);
    expect(q.sol!.fetchedAt).toBeGreaterThan(p.sol!.fetchedAt);
    expect([q.amount, q.to, q.fee]).toEqual([p.amount, p.to, p.fee]);
  });

  it("a retry waits until the old blockhash is invalid (kb/90 §8.7: at most one can land)", async () => {
    const notBefore = simSolHeight() + 2; // ≈ 0.5 s away on the fixture clock
    const t0 = Date.now();
    const p = await prepareSend({ tokenId: "1", chain: "sol", to: TO, amount: 1_000_000n, records: [], reuse: { solNotBefore: notBefore } });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(400);
    expect(simSolHeight()).toBeGreaterThan(notBefore);
    expect(p.chain).toBe("sol");
  });
});

function solIntent(p: Partial<PendingIntent> = {}): PendingIntent {
  return {
    id: "s1", tokenId: "1", chain: "sol", createdAt: 0, contract: "c", sigCountBefore: 0, heightBefore: 0,
    unsigned: { sol: { message: "00", lastValidBlockHeight: simSolHeight() + 150 } }, payloadHashes: ["ab".repeat(32)], stage: "broadcasting", ...p,
  };
}

describe("expired (SOL) state and Try again", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("the fixture adapter applies the live rule: height > lastValidBlockHeight ⇒ expired, never broadcast", async () => {
    const expired = solIntent({ unsigned: { sol: { message: "00", lastValidBlockHeight: simSolHeight() - 1 } } });
    expect(await chainAdapterFor(expired).broadcast(expired, [])).toMatchObject({ ok: false, expired: true });
    const fresh = solIntent();
    expect(await chainAdapterFor(fresh).broadcast(fresh, [])).toMatchObject({ ok: true });
  });

  it("RPC wording for an expired blockhash maps to expired (kb/80 E24)", () => {
    for (const m of ["Blockhash not found", "Transaction simulation failed: block height exceeded", "blockhash expired: rebuild and re-sign"]) expect(SOL_EXPIRED_RE.test(m)).toBe(true);
    expect(SOL_EXPIRED_RE.test("insufficient funds for rent")).toBe(false);
  });

  it("machine: broadcasting → expired (row 3 failed) → Try again → preparing", () => {
    const e = transition(solIntent(), { type: "SOL_EXPIRED" });
    expect(e.stage).toBe("expired");
    expect(trackerRows("expired")).toEqual(["done", "done", "failed", "future"]);
    const r = transition({ ...e, signatures: [{ ed25519: "00" }] }, { type: "RETRY", now: 5 });
    expect(r).toMatchObject({ stage: "preparing", signatures: undefined, createdAt: 5 });
  });

  it("an expired SOL intent never blocks a new send; a timed-out one does until its blockhash dies", () => {
    expect(blockingIntent([solIntent({ stage: "expired" })], "1", "sol")).toBeNull();
    expect(blockingIntent([solIntent({ stage: "timed_out" })], "1", "sol")?.id).toBe("s1");
  });

  it("retryPlan(sol) carries the old lastValidBlockHeight; expired needs no wait", () => {
    const lv = 123_456;
    expect(retryPlan(solIntent({ stage: "timed_out", unsigned: { sol: { message: "00", lastValidBlockHeight: lv } } }))).toMatchObject({ chain: "sol", solWaitForExpiry: true, solNotBefore: lv });
    expect(retryPlan(solIntent({ stage: "expired", unsigned: { sol: { message: "00", lastValidBlockHeight: lv } } }))).toMatchObject({ solWaitForExpiry: false, solNotBefore: lv });
  });
});

describe("clean-history SOL source (docs/handoff/core.md §3.8)", () => {
  it("is configured, so the SOL account check is answered instead of `unknown`", async () => {
    const ch = await import("@satchel/core/clean-history");
    const calls: string[] = [];
    const fakeFetch = async (_url: string, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? "{}");
      calls.push(body.method);
      const result = body.method === "getAccountInfo" ? { value: null } : { value: false };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }), { headers: { "content-type": "application/json" } });
    };
    const src = await cleanSources(ch, fakeFetch);
    expect(src.sol).toHaveLength(1);
    expect(src.evm).toHaveLength(2);
    expect(src.btc).toHaveLength(2);
    const policy = { evmConfirmations: 3, btcK: 1, solMinAgeMs: 120_000, allowSingleSource: false } as never;
    const withSource = await ch.checkSol(S1, [], src.sol, policy, Date.now());
    expect(withSource.account).toMatchObject({ status: "ok", reason: "absent" });
    expect(calls).toContain("getAccountInfo");
    const without = await ch.checkSol(S1, [], [], policy, Date.now());
    expect(without.account.status).toBe("unknown"); // what an unconfigured app would get: Buy blocked everywhere
  });
});
