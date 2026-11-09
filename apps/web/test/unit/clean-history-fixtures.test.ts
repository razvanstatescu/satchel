import { describe, expect, it } from "vitest";
import { aggregate, buyEnabled, fixtureCleanReport } from "@/lib/data/clean";
import { mapCoreReport } from "@/lib/data/clean-live";
import { FIXTURE_RECORDS, fixtureListings, fixtureSatchel } from "@/lib/data/fixtures";
import { eventsForToken, type FastnearTx } from "@/lib/near/history";
import { cardSvg } from "@/lib/card-svg";
import type { LockFacts } from "@/lib/data/types";
import { CONTRACT_ROLE } from "@/lib/config";

const LOCKED: LockFacts = { access_keys: 0, account_exists: true, locked: true, code_hash_hex: "aa", expected_code_hash: "aa", code_matches: true, birth_tx: "B", birth_block: 1 };
const KEYED: LockFacts = { ...LOCKED, access_keys: 2, locked: false, code_matches: null, expected_code_hash: null };

describe("Buy gate (kb/90 §7.3) and gate modes (R-06, INV-33)", () => {
  const ok = { sigCount: 1, items: [{ status: "spent" as const }], accountChecksOk: true };
  it("dev: lock/code failures don't make it unsafe; every other check still gates", () => {
    expect(aggregate({ ...ok, lockOk: false, codeOk: null, role: "dev" }).aggregate).toBe("clean");
    expect(aggregate({ ...ok, items: [{ status: "unused" }], lockOk: false, codeOk: null, role: "dev" }).aggregate).toBe("blocked");
  });
  it("rc/final: a keyed contract or a code mismatch is unsafe (fail closed when unknown)", () => {
    expect(aggregate({ ...ok, lockOk: false, codeOk: true, role: "final" })).toEqual({ aggregate: "unsafe", unsafeReason: "keys" });
    expect(aggregate({ ...ok, lockOk: true, codeOk: false, role: "rc" })).toEqual({ aggregate: "unsafe", unsafeReason: "code" });
    expect(aggregate({ ...ok, lockOk: null, codeOk: null, role: "final" }).aggregate).toBe("unsafe");
  });
  it("delegated EVM code is unsafe in every role", () => {
    expect(aggregate({ ...ok, accountChecksOk: false, lockOk: true, codeOk: true, role: "dev" }).aggregate).toBe("unsafe");
  });
  it("precedence: unknown > blocked > settling > clean; empty when nothing was signed; incomplete reads are unknown", () => {
    const g = (items: { status: "spent" | "unused" | "settling" | "unknown" | "unfunded" | "expired" }[], sigCount = items.length) => aggregate({ sigCount, items, accountChecksOk: true, lockOk: true, codeOk: true, role: "final" }).aggregate;
    expect(g([{ status: "unused" }, { status: "unknown" }])).toBe("unknown");
    expect(g([{ status: "settling" }, { status: "unused" }])).toBe("blocked");
    expect(g([{ status: "settling" }, { status: "spent" }])).toBe("settling");
    expect(g([{ status: "unfunded" }, { status: "expired" }, { status: "spent" }])).toBe("clean");
    expect(g([], 0)).toBe("empty");
    expect(g([{ status: "spent" }], 2)).toBe("unknown");
    expect(["clean", "empty"].every((a) => buyEnabled(a as never))).toBe(true);
    expect(["blocked", "settling", "unknown", "unsafe", "checking"].some((a) => buyEnabled(a as never))).toBe(false);
  });
});

describe("fixture world (D-32)", () => {
  it("#3 sells clean, #4 is the honest blocked example (nonce = current + 1, never sent), #5 clean with a BTC spend", () => {
    expect(fixtureCleanReport("3", FIXTURE_RECORDS["3"], LOCKED, 3).aggregate).toBe("clean");
    const four = fixtureCleanReport("4", FIXTURE_RECORDS["4"], LOCKED, 4);
    expect(four.aggregate).toBe("blocked");
    expect(four.items[0]).toMatchObject({ status: "unused", evidence: "Nonce 1 not used yet" });
    expect(fixtureCleanReport("5", FIXTURE_RECORDS["5"], LOCKED, 5).items[0].evidence).toMatch(/^Spent in /);
    expect(fixtureCleanReport("6", [], LOCKED, null).aggregate).toBe("empty");
  });
  it("listings respect the quiet period and freeze signing (listed_at ≥ last_sign_height + 250, sig_count snapshot)", () => {
    for (const l of fixtureListings()) {
      const s = fixtureSatchel(l.token_id)!;
      expect(l.listing.listed_at).toBeGreaterThanOrEqual(s.last_sign_height + 250);
      expect(l.listing.sig_count).toBe(s.sig_count);
    }
  });
  // The role comes from NEXT_PUBLIC_CONTRACT_ROLE (dev unless set), so the suite also runs with the production
  // (final) settings: one of these two runs, never both.
  it.skipIf(CONTRACT_ROLE !== "dev")("in dev role a keyed contract only warns", () => {
    const r = fixtureCleanReport("3", FIXTURE_RECORDS["3"], KEYED, 3);
    expect(r.role).toBe("dev");
    expect(r.checks[0]).toMatchObject({ warn: true });
  });
  it.skipIf(CONTRACT_ROLE === "dev")("in rc/final role a keyed contract fails closed (unsafe)", () => {
    const r = fixtureCleanReport("3", FIXTURE_RECORDS["3"], KEYED, 3);
    expect(r.role).toBe(CONTRACT_ROLE);
    expect(r.aggregate).toBe("unsafe");
  });
});

describe("core report → UI view model", () => {
  it("maps statuses, the 1-of-2 note and the unsafe reason", () => {
    const core = {
      token_id: "4",
      checked_at: "2026-10-21T00:00:00.000Z",
      policy: { evm: "latest-3", btc_k: 1, sol_min_age_s: 120, allow_single_source: true },
      sig_count: 1,
      aggregate: "blocked",
      buy_enabled: false,
      expected_sig_count: 1,
      sources_note: "1 of 2 sources",
      warnings: [],
      reasons: ["unused"],
      contract: { account_id: "c", role: "dev", exists: true, access_keys: 1, locked: false, code_hash: null, expected_code_hash: null, code_ok: null, mpc_keys_ok: null, addresses_ok: true, near_sources: 2 },
      addresses: { btc: "", evm: "", sol: "" },
      accounts: [{ chain: "evm", address: "0x", status: "ok", reason: "no_code", evidence: {}, sources: 2 }],
      items: [{ seq: 0, request_id: 0, input_index: 0, chain: "evm", status: "unused", reason: "nonce_unused", nonce: "1", evidence: {}, sources: 1, cached: false }],
      encumbered_outpoints: [],
    };
    const r = mapCoreReport(core as never, FIXTURE_RECORDS["4"], "browser");
    expect(r).toMatchObject({ aggregate: "blocked", one_of_two: true, source: "browser" });
    expect(r.items[0]).toMatchObject({ key: "Ethereum · nonce 1", status: "unused", evidence: "Nonce 1 not used yet" });
  });
});

describe("FastNEAR tx API events (recorded shape)", () => {
  it("keeps only logs emitted BY the contract that mention the token", () => {
    const txs: FastnearTx[] = [
      {
        transaction: { hash: "T1", signer_id: "alice", receiver_id: "c", actions: [] },
        receipts: [
          { receipt: { receiver_id: "c" }, execution_outcome: { block_height: 10, block_timestamp: "1700000000000000000", outcome: { status: {}, logs: ['EVENT_JSON:{"standard":"nep171","version":"1.0.0","event":"nft_transfer","data":[{"old_owner_id":"a","new_owner_id":"b","token_ids":["2"]}]}', "plain log"] } } },
          { receipt: { receiver_id: "evil" }, execution_outcome: { block_height: 10, outcome: { status: {}, logs: ['EVENT_JSON:{"standard":"nep171","version":"1.0.0","event":"nft_transfer","data":[{"token_ids":["2"]}]}'] } } },
        ],
      },
    ];
    const ev = eventsForToken(txs, "c", "2");
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ tx: "T1", block: 10, event: "nft_transfer", timestampMs: 1_700_000_000_000 });
    expect(eventsForToken(txs, "c", "3")).toHaveLength(0);
  });
});

describe("NFT media SVG (D-23; Satchel 2.0: the state word, no per-token hue, H's card-svg.test pins the rest)", () => {
  it("shows status + sig_count from state, never balances or the stitch", () => {
    const s = cardSvg("1", "listed", 4);
    expect(s).toContain("Satchel #1");
    expect(s).toContain("4 signatures");
    expect(s).toContain("Paused for sale");
    expect(s).not.toMatch(/stroke-dasharray/);
    expect(s).not.toMatch(/0\.\d+\s*(BTC|ETH)/);
    expect(cardSvg("2", "active", 1)).toContain("1 signature<");
  });
});
