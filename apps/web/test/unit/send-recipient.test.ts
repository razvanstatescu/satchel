import { describe, expect, it, vi } from "vitest";
import { buildBtcSend } from "@satchel/core/chains/btc";
import { prepareSend, recipientRecordsFor, satchelIdForBtcAddress } from "@/lib/chains/send";
import { satchelAddresses } from "@/lib/derive";
import type { SigRecordView } from "@/lib/near/types";
import type { ViewFn } from "@/lib/near/contract";

/** G-1 (docs/security/seller-threat-model.md): a send into another Satchel avoids that Satchel's referenced txids. */

const rec = (txid: string) => ({ seq: 0, detail: { btc: { txid, vout: 0, amount_sats: "1" } } }) as unknown as SigRecordView;
const viewFor = (records: unknown[], fail = false): ViewFn =>
  (async (_c: string, method: string) => {
    if (fail) throw new Error("rpc down");
    if (method === "config") return { next_token_id: 8 };
    if (method === "satchel") return { sig_count: records.length };
    if (method === "sig_records") return records;
    return null;
  }) as unknown as ViewFn;

describe("satchelIdForBtcAddress", () => {
  it("maps a Satchel's Bitcoin address back to its token id, and nothing else", () => {
    expect(satchelIdForBtcAddress(satchelAddresses("2").btc, 8)).toBe("2");
    expect(satchelIdForBtcAddress(satchelAddresses("7").btc.toUpperCase(), 8)).toBe("7");
    expect(satchelIdForBtcAddress(satchelAddresses("8").btc, 8)).toBeNull();
    expect(satchelIdForBtcAddress(satchelAddresses("9").btc, 8)).toBeNull();
  });
});

describe("recipientRecordsFor", () => {
  const to = satchelAddresses("2").btc;
  it("returns the recipient Satchel's records", async () => {
    expect(await recipientRecordsFor(to, viewFor([rec("ab")]))).toHaveLength(1);
  });
  it("returns [] for an address that isn't a Satchel's", async () => {
    expect(await recipientRecordsFor(satchelAddresses("9").btc, viewFor([rec("ab")]))).toEqual([]);
  });
  it("fails closed when the lookup fails", async () => {
    await expect(recipientRecordsFor(to, viewFor([], true))).rejects.toMatchObject({ problem: "recipient_records" });
  });
});

const built: { txid: string; forbidden: string[] }[] = [];
vi.mock("@satchel/core/chains/btc", async (orig) => {
  const m = await orig<typeof import("@satchel/core/chains/btc")>();
  return {
    ...m,
    buildBtcSend: (p: Parameters<typeof m.buildBtcSend>[0]) => {
      const r = m.buildBtcSend(p);
      built.push({ txid: r.txid, forbidden: [...(p.forbiddenTxids ?? [])] });
      return r;
    },
  };
});

describe("prepareSend into a Satchel (fixture mode)", () => {
  const to = satchelAddresses("2").btc;
  it("builds a different transaction when the recipient's records reference the first candidate's txid", async () => {
    built.length = 0;
    await prepareSend({ tokenId: "1", chain: "btc", to, amount: "max", records: [], recipientTokenRecords: [] });
    const first = built[0].txid;
    await prepareSend({ tokenId: "1", chain: "btc", to, amount: "max", records: [], recipientTokenRecords: [rec(first)] });
    expect(built[1].forbidden).toContain(first);
    expect(built[1].txid).not.toBe(first);
  });
  it("looks the recipient's records up itself when the caller passes none, and fails closed if it can't", async () => {
    built.length = 0;
    await prepareSend({ tokenId: "1", chain: "btc", to, amount: "max", records: [] }); // fixture source: Satchel #2's real records
    expect(built).toHaveLength(1);
    const { recipientRecordsFor: r } = await import("@/lib/chains/send");
    await expect(r(to, viewFor([], true))).rejects.toMatchObject({ problem: "recipient_records" });
  });
});

describe("buildBtcSend with a forbidden txid", () => {
  it("returns a different txid when the first candidate is forbidden", () => {
    const a = satchelAddresses("1");
    const p = {
      from: { address: a.btc, pubkey: a.btcPubkey },
      to: satchelAddresses("2").btc,
      amount: "max" as const,
      utxos: [{ txid: "01a1".repeat(16), vout: 0, value: 100_000n, confirmed: true }],
      feeRate: 2,
    };
    const first = buildBtcSend(p);
    const second = buildBtcSend({ ...p, forbiddenTxids: [first.txid] });
    expect(second.txid).not.toBe(first.txid);
    expect(second.perturbations.length).toBeGreaterThan(0);
  });
});
