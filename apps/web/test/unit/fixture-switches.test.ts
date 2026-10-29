import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CleanReport } from "@/lib/data/types";
import { installFakeWindow } from "./fake-window";

/**
 * C's fixture-only switches (QA-POLISH #4): `localStorage["satchel:sim:clean"]` and `["satchel:sim:usdc"]` bend the demo
 * world for QA and e2e. Outside fixture mode they must be no-ops: a clean verdict, or a USDC registration, never comes
 * from localStorage in live mode. `IS_FIXTURE` is read once when `@/lib/config` loads, so every case loads fresh modules
 * under the data mode it needs (`vi.stubEnv` + `vi.resetModules`).
 */

const SIM_CLEAN = "satchel:sim:clean";
const SIM_USDC = "satchel:sim:usdc";

/** What the live checker could return for a clean listing: one signature, used on its own chain. */
const LIVE_REPORT: CleanReport = {
  token_id: "3",
  aggregate: "clean",
  checked_at: 1_793_000_000_000,
  sig_count: 1,
  listing_id: 3,
  one_of_two: false,
  role: "final",
  checks: [
    { name: "Contract keys: none since birth", ok: true },
    { name: "Code: matches the published build", ok: true },
  ],
  items: [
    {
      seq: 0,
      chain: "evm",
      key: "Ethereum · nonce 0",
      wouldPay: "0.0010 ETH",
      amountSource: "chain",
      evidence: "Used by 0x2a55…84e1 · 3 confirmations",
      evidenceUrl: "https://sepolia.etherscan.io/tx/0x2a55",
      status: "spent",
      signedAt: 1_792_999_000_000,
      height: 274_240_000,
      requester: "alice.satchelhq.testnet",
    },
  ],
  sources: [{ chain: "evm", provider: "publicnode", ok: true }],
  unsafe_reason: null,
  encumbered_utxos: [],
  source: "browser",
};

let restoreWindow: () => void;
/** Every localStorage key read, in order. */
let reads: string[];
const storage = () => (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage;

beforeEach(() => {
  vi.resetModules();
  restoreWindow = installFakeWindow();
  const ls = storage();
  ls.setItem(SIM_CLEAN, "blocked");
  ls.setItem(SIM_USDC, "unregistered");
  reads = [];
  const get = ls.getItem.bind(ls);
  ls.getItem = (k: string) => {
    reads.push(k);
    return get(k);
  };
});

afterEach(() => {
  restoreWindow();
  vi.doUnmock("@/lib/data/clean-live");
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function switchesIn(mode: "live" | "fixture") {
  vi.stubEnv("NEXT_PUBLIC_DATA_MODE", mode);
  const config = await import("@/lib/config");
  expect(config.IS_FIXTURE).toBe(mode === "fixture"); // the mode really switched for this module graph
  return import("@/components/client/fixture-switches");
}

describe("live mode: the fixture switches are no-ops", () => {
  it("the browser check returns the live checker's report untouched and never reads satchel:sim:clean", async () => {
    const runLiveCheck = vi.fn(async () => LIVE_REPORT);
    vi.doMock("@/lib/data/clean-live", () => ({ runLiveCheck }));
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "live");
    const { browserCheck } = await import("@/components/client/useCleanCheck");
    const r = await browserCheck("3");
    expect(runLiveCheck).toHaveBeenCalledExactlyOnceWith("3", "browser");
    expect(r).toBe(LIVE_REPORT);
    expect(r.aggregate).toBe("clean");
    expect(reads).not.toContain(SIM_CLEAN);
  });

  it("simCleanState is the identity whatever the switch says, and reads no storage", async () => {
    const { simCleanState } = await switchesIn("live");
    for (const v of ["blocked", "unsafe", "settling", "unknown", "one-of-two"]) {
      storage().setItem(SIM_CLEAN, v);
      expect(simCleanState(LIVE_REPORT), v).toBe(LIVE_REPORT);
    }
    expect(reads).toEqual([]);
  });

  it("USDC registration follows storage_balance_of alone, and Register writes no switch", async () => {
    const { usdcRegistered, markSimUsdcRegistered } = await switchesIn("live");
    expect(usdcRegistered({ total: "1250000000000000000000", available: "0" })).toBe(true); // the switch says unregistered
    storage().setItem(SIM_USDC, "registered");
    expect(usdcRegistered(null)).toBe(false); // the switch says registered
    storage().setItem(SIM_USDC, "unregistered");
    markSimUsdcRegistered();
    expect(reads).toEqual([]); // the module read no switch…
    expect(storage().getItem(SIM_USDC)).toBe("unregistered"); // …and wrote none
  });
});

describe("control: fixture mode applies them (so the live cases above can fail)", () => {
  it("bends the browser report and the USDC registration", async () => {
    const { simCleanState, usdcRegistered, markSimUsdcRegistered } = await switchesIn("fixture");
    const blocked = simCleanState(LIVE_REPORT);
    expect(blocked.aggregate).toBe("blocked");
    expect(blocked.items[0]).toMatchObject({ status: "unused", evidence: "nonce 0 isn't used yet", evidenceUrl: null });
    expect(usdcRegistered({ total: "1250000000000000000000", available: "0" })).toBe(false);
    markSimUsdcRegistered();
    expect(usdcRegistered(null)).toBe(true);
    expect(reads).toContain(SIM_CLEAN);
  });
});
