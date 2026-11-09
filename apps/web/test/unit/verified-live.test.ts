import { afterEach, describe, expect, it, vi } from "vitest";

/** The live read behind "You get" (threat model G-2): which failures block Buy and which only mark a network unavailable. */

vi.mock("@/lib/config", async (orig) => ({ ...(await orig<typeof import("@/lib/config")>()), IS_FIXTURE: false }));

const { readVerifiedBalances } = await import("@/lib/data/verified");
const { BTC_APIS } = await import("@/lib/config");
const { evmRpcs, EVM_IDS, SEPOLIA } = await import("@/lib/evm-networks");

const base = { btc: null, evm: null, sol: { lamports: "7" } };
const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });

/** A fake network: `down` lists URL prefixes that fail. */
function stubFetch(down: string[]) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (down.some((d) => url.startsWith(d))) throw new TypeError("network down");
    if (url.endsWith("/utxo")) return json([{ txid: "aa".repeat(32), vout: 0, value: 5000, status: { confirmed: true, block_height: 100 } }]);
    if (url.endsWith("/blocks/tip/height")) return json(110);
    if (url.includes("/address/")) return json({ mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } });
    const body = JSON.parse(String(init?.body)) as { method: string };
    if (body.method === "eth_blockNumber") return json({ result: "0x100" });
    if (body.method === "eth_getBalance") return json({ result: "0x10" });
    return json({ result: "0x0" });
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("readVerifiedBalances (live)", () => {
  it("reads Bitcoin at depth and every network", async () => {
    stubFetch([]);
    const r = await readVerifiedBalances("1", [], base);
    expect(r.balances.btc).toEqual({ confirmed_sats: "5000", unconfirmed_sats: "0" });
    expect(r.balances.evm_chains?.map((c) => c.wei)).toEqual(EVM_IDS.map(() => "16"));
    expect(r.balances.sol).toEqual(base.sol);
  });

  it("an L2 that doesn't answer reads as unavailable; the read still succeeds", async () => {
    const l2 = EVM_IDS.find((id) => id !== SEPOLIA)!;
    stubFetch([...evmRpcs(l2)]);
    const r = await readVerifiedBalances("1", [], base);
    expect(r.balances.evm_chains?.find((c) => c.chain_id === l2)).toEqual({ chain_id: l2, wei: null, usdc: null });
    expect(r.balances.evm).toEqual({ wei: "16" });
  });

  it("falls back to the next Bitcoin provider", async () => {
    const calls = stubFetch([BTC_APIS[0]!]);
    const r = await readVerifiedBalances("1", [], base);
    expect(r.balances.btc?.confirmed_sats).toBe("5000");
    expect(calls.some((u) => u.startsWith(BTC_APIS[1]!))).toBe(true);
  });

  it("fails closed when Sepolia or every Bitcoin provider is down", async () => {
    stubFetch([...evmRpcs(SEPOLIA)]);
    await expect(readVerifiedBalances("1", [], base)).rejects.toThrow();
    stubFetch([...BTC_APIS]);
    await expect(readVerifiedBalances("1", [], base)).rejects.toThrow();
  });
});
