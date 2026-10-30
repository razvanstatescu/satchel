import { describe, expect, it } from "vitest";
import { buildSnapshot } from "@/lib/data/snapshot";
import { isMissingAccountError, isNoCode, type DataSource } from "@/lib/data/source";
import type { LockFacts } from "@/lib/data/types";

/**
 * Live mode, unreadable contract (satchel-d8 handoff, 2026-10-26): a missing or code-less contract account must give a
 * 404 (null snapshot), never a degraded "Active · 0 signatures" Satchel page. A plain RPC outage still renders degraded.
 */

const lock = (over: Partial<LockFacts>): LockFacts => ({
  access_keys: null,
  account_exists: null,
  locked: null,
  code_hash_hex: null,
  expected_code_hash: null,
  code_matches: null,
  birth_tx: null,
  birth_block: null,
  ...over,
});

const unreadable: DataSource = {
  mode: "live",
  prices: async () => null,
  view: async () => {
    throw new Error("RPC unreachable");
  },
  blockHeight: async () => 1000,
  balances: async () => ({ btc: null, evm: null, sol: null, errors: [] }),
  lock: async () => {
    throw new Error("unused");
  },
} as unknown as DataSource;

describe("isMissingAccountError", () => {
  it("recognises near-api-js AccountDoesNotExistError and raw RPC text", () => {
    expect(isMissingAccountError(Object.assign(new Error("Account x.testnet does not exist at block height 1"), { name: "AccountDoesNotExistError" }))).toBe(true);
    expect(isMissingAccountError(new Error("[-32000] Server error: UNKNOWN_ACCOUNT"))).toBe(true);
    expect(isMissingAccountError(new Error("Timeout after 1500 ms (view_account)"))).toBe(false);
    expect(isMissingAccountError(null)).toBe(false);
  });
});

describe("isNoCode", () => {
  it("is true only for the all-zero code hash", () => {
    expect(isNoCode("0".repeat(64))).toBe(true);
    expect(isNoCode("aea0b2e95d1a45278b7b020c2b7e015a41aea6cf5248b765f5cbb72ede451bd6")).toBe(false);
    expect(isNoCode(null)).toBe(false);
  });
});

describe("buildSnapshot with an unreadable contract", () => {
  it("returns null (404) when the contract account does not exist", async () => {
    const s = await buildSnapshot("1", unreadable, { config: null, lock: lock({ account_exists: false, locked: false }) }, 0);
    expect(s).toBeNull();
  });

  it("returns null (404) when the account exists but has no contract code", async () => {
    const s = await buildSnapshot("1", unreadable, { config: null, lock: lock({ account_exists: true, code_hash_hex: "0".repeat(64) }) }, 0);
    expect(s).toBeNull();
  });

  it("still renders a degraded page (with errors) when the account state is unknown (RPC outage)", async () => {
    const s = await buildSnapshot("1", unreadable, { config: null, lock: lock({ account_exists: null }) }, 0);
    expect(s).not.toBeNull();
    expect(s!.errors.length).toBeGreaterThan(0);
  });
});
