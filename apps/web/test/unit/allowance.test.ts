import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assetChain, assetTicker, capForChain, formatCapAmount } from "@/lib/allowanceView";
import { errorCopy } from "@/lib/copy";
import { prepareSend } from "@/lib/chains/send";
import { FIXTURE_RECORDS } from "@/lib/data/fixtures";
import { satchelAddresses } from "@/lib/derive";
import { NBSP } from "@/lib/format";
import { simBuy, simDebitDelegated, simOverlay, simRevokeAllowance, simSetAllowance, simTransfer } from "@/lib/data/sim";
import { mockWallet } from "@/lib/near/mock-wallet";
import { calls } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import { installFakeWindow } from "./fake-window";

/**
 * C5 (docs/specs/C5.md) web-side mirror: the view → UI model helpers (allowanceView.ts), the caps form's validation
 * path (set_allowance's own rules, mirrored in sim.ts from @satchel/core/policy), and the fixture simulation of a
 * delegated sign_for debit. The contract and @satchel/core's TS mirror are tested in their own suites; this file
 * covers only the web app's wiring on top of them.
 */

const ALICE = "alice.satchelhq.testnet";
const BOB = "bob.satchelhq.testnet";
const CAROL = "carol.satchelhq.testnet";
const EVM_ASSET = { evm: { chain_id: 11155111 } } as const;

describe("allowanceView: Asset <-> UI chain", () => {
  it("maps the three UI chains and the one EVM chain id the Send flow supports", () => {
    expect(assetChain("btc")).toBe("btc");
    expect(assetChain("sol")).toBe("sol");
    expect(assetChain(EVM_ASSET)).toBe("evm");
    expect(assetChain({ evm: { chain_id: 84532 } })).toBeNull(); // C3's web UI isn't built yet
    expect(assetChain({ erc20: { chain_id: 11155111, token: "1c7d4b196cb0c7b01d743fbc6116a902379c7238" } })).toBeNull();
  });
  it("tickers and formatted amounts match the rest of the app's formatting", () => {
    expect(assetTicker("btc")).toBe("BTC");
    expect(assetTicker(EVM_ASSET)).toBe("ETH");
    expect(assetTicker("sol")).toBe("SOL");
    expect(formatCapAmount("btc", "100000")).toBe(`0.0010${NBSP}BTC`);
    expect(formatCapAmount(EVM_ASSET, "20000000000000000")).toBe(`0.0200${NBSP}ETH`);
    // an asset with no UI chain yet: the raw base-unit string, never crashes
    expect(formatCapAmount({ erc20: { chain_id: 11155111, token: "1c7d4b196cb0c7b01d743fbc6116a902379c7238" } }, "5000000")).toBe("5000000");
  });
  it("capForChain finds a view's row for a UI chain", () => {
    const view = { caps: [{ asset: "btc" as const, limit: "1", spent: "0", remaining: "1", spends: [] }] };
    expect(capForChain(view, "btc")?.limit).toBe("1");
    expect(capForChain(view, "evm")).toBeUndefined();
  });
});

describe("sim.ts: set_allowance / revoke_allowance (the Add sheet's caps form validation, mirrored from the contract)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("sets an allowance, and allowances_of/allowance return it as the contract view would", () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 50_000n }], undefined);
    const rows = simOverlay().allowancesOf("1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ token_id: "1", delegate: BOB, owner_id: ALICE, status: "active", expires_at_ms: null });
    expect(rows[0]!.caps).toEqual([{ asset: "btc", limit: "50000", spent: "0", remaining: "50000", spends: [] }]);
    expect(simOverlay().allowanceOf("1", BOB)?.delegate).toBe(BOB);
    expect(simOverlay().allowanceOf("1", CAROL)).toBeNull();
  });

  it("rejects what the contract rejects: self/contract/mpc, empty caps, a zero limit, a duplicate asset, a past expiry", () => {
    expect(() => simSetAllowance("1", ALICE, ALICE, [{ asset: "btc", limit: 1n }], undefined)).toThrow(/ERR_ALLOWANCE_DELEGATE/);
    expect(() => simSetAllowance("1", ALICE, BOB, [], undefined)).toThrow(/ERR_ALLOWANCE_CAPS/);
    expect(() => simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 0n }], undefined)).toThrow(/ERR_ALLOWANCE_CAPS/);
    expect(() => simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 1n }, { asset: "btc", limit: 2n }], undefined)).toThrow(/ERR_ALLOWANCE_CAPS/);
    expect(() => simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 1n }], Date.now() - 1)).toThrow(/ERR_ALLOWANCE_EXPIRY/);
    // not the owner
    expect(() => simSetAllowance("1", BOB, CAROL, [{ asset: "btc", limit: 1n }], undefined)).toThrow(/ERR_NOT_OWNER/);
  });

  it("caps at MAX_DELEGATES (4), but replacing a live one never counts against the limit", () => {
    const accounts = [ALICE, CAROL, "dave.satchelhq.testnet", "erin.satchelhq.testnet"]; // BOB owns #2 (fixtures.ts)
    for (const a of accounts) simSetAllowance("2", BOB, a, [{ asset: "btc", limit: 1n }], undefined); // Satchel #2 is owned by BOB (fixtures.ts)
    expect(simOverlay().allowancesOf("2")).toHaveLength(4);
    expect(() => simSetAllowance("2", BOB, "frank.satchelhq.testnet", [{ asset: "btc", limit: 1n }], undefined)).toThrow(/ERR_ALLOWANCE_LIMIT/);
    // replacing dave's (still live) allowance is fine
    expect(() => simSetAllowance("2", BOB, accounts[2]!, [{ asset: "sol", limit: 1n }], undefined)).not.toThrow();
    expect(simOverlay().allowancesOf("2")).toHaveLength(4);
  });

  it("revoke: not found, and works once (ERR_ALLOWANCE_NOT_FOUND on the second try)", () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 1n }], undefined);
    expect(() => simRevokeAllowance("1", ALICE, CAROL)).toThrow(/ERR_ALLOWANCE_NOT_FOUND/);
    expect(() => simRevokeAllowance("1", ALICE, BOB)).not.toThrow();
    expect(simOverlay().allowancesOf("1")).toHaveLength(0);
    expect(() => simRevokeAllowance("1", ALICE, BOB)).toThrow(/ERR_ALLOWANCE_NOT_FOUND/);
  });

  it("reset rule: a transfer or a sale clears every allowance on the token (spec §4)", () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 1n }], undefined);
    expect(simOverlay().allowancesOf("1")).toHaveLength(1);
    simTransfer("1", CAROL);
    expect(simOverlay().allowancesOf("1")).toHaveLength(0);
    // and the fixture demo delegation on #1 doesn't come back after a transfer away and (conceptually) back
    simTransfer("1", ALICE);
    expect(simOverlay().allowancesOf("1")).toHaveLength(0);
  });

  it("the fixture demo: Satchel #1 (ALICE) already lets BOB spend a daily BTC and ETH cap", () => {
    const rows = simOverlay().allowancesOf("1");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.delegate).toBe(BOB);
    expect(rows[0]!.caps.map((c) => c.asset)).toEqual(["btc", EVM_ASSET]);
  });
});

describe("sim.ts: simDebitDelegated (what sign_for would do for a non-owner, §2 step 4c / §3)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 10_000n }], undefined);
  });
  afterEach(() => restore());

  it("debits a BTC request within the cap, and the remaining amount drops for the next one", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 4_000n, records: FIXTURE_RECORDS["1"]! });
    const r = simDebitDelegated("1", BOB, p.request, false);
    expect(r).toEqual({ ok: true });
    const after = simOverlay().allowanceOf("1", BOB)!;
    expect(after.caps[0]!.remaining).not.toBe("10000");
    expect(BigInt(after.caps[0]!.remaining)).toBeLessThan(10_000n);
  });

  it("refuses an asset with no cap (ERR_ALLOWANCE_ASSET), over the remaining amount (ERR_ALLOWANCE_EXCEEDED), while listed (ERR_FROZEN), and once expired (ERR_ALLOWANCE_EXPIRED)", async () => {
    const evmReq = await prepareSend({ tokenId: "1", chain: "evm", to: satchelAddresses("2").evm, amount: 1n, records: [] });
    expect(simDebitDelegated("1", BOB, evmReq.request, false)).toMatchObject({ ok: false, error: "ERR_ALLOWANCE_ASSET" });

    const big = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 50_000n, records: FIXTURE_RECORDS["1"]! });
    expect(simDebitDelegated("1", BOB, big.request, false)).toMatchObject({ ok: false, error: "ERR_ALLOWANCE_EXCEEDED" });

    const small = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 1_000n, records: FIXTURE_RECORDS["1"]! });
    expect(simDebitDelegated("1", BOB, small.request, true)).toMatchObject({ ok: false, error: "ERR_FROZEN" });

    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 10_000n }], Date.now() + 10);
    await new Promise((res) => setTimeout(res, 20));
    expect(simDebitDelegated("1", BOB, small.request, false)).toMatchObject({ ok: false, error: "ERR_ALLOWANCE_EXPIRED" });
  });

  it("a stranger with no allowance at all is refused like `authorize_signer` refuses one (ERR_NOT_OWNER)", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 1_000n, records: FIXTURE_RECORDS["1"]! });
    expect(simDebitDelegated("1", CAROL, p.request, false)).toMatchObject({ ok: false, error: "ERR_NOT_OWNER" });
  });
});

describe("mock-wallet: set_allowance / revoke_allowance / a delegate's sign_for go through runCall like any other call", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("set_allowance then revoke_allowance, as the owner's wallet would send them", async () => {
    const wallet = mockWallet(ALICE);
    const set = await runCall(wallet, calls.setAllowance("3", BOB, [{ asset: "btc", limit: 1_000n }]), ALICE);
    expect(set.ok).toBe(true);
    expect(simOverlay().allowanceOf("3", BOB)?.delegate).toBe(BOB);
    const revoke = await runCall(wallet, calls.revokeAllowance("3", BOB), ALICE);
    expect(revoke.ok).toBe(true);
    expect(simOverlay().allowanceOf("3", BOB)).toBeNull();
  });

  it("a delegate's own sign_for debits the allowance and records them as the requester", async () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 10_000n }], undefined);
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 1_000n, records: FIXTURE_RECORDS["1"]! });
    const wallet = mockWallet(BOB);
    const r = await runCall(wallet, calls.signFor("1", p.request), BOB);
    expect(r.ok).toBe(true);
    const rec = simOverlay().records("1").find((x) => x.chain === "btc" && x.requester === BOB);
    expect(rec).toBeTruthy();
    expect(BigInt(simOverlay().allowanceOf("1", BOB)!.caps[0]!.remaining)).toBeLessThan(10_000n);
  });

  it("over the cap, the delegate's sign_for fails and errorCopy explains it", async () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 500n }], undefined);
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 1_000n, records: FIXTURE_RECORDS["1"]! });
    const wallet = mockWallet(BOB);
    const r = await runCall(wallet, calls.signFor("1", p.request), BOB);
    expect(r.ok).toBe(false);
    if (!r.ok && "failure" in r) {
      expect(r.failure.code).toBe("ERR_ALLOWANCE_EXCEEDED");
      expect(errorCopy(r.failure.code, { id: "1" })).toMatch(/over today's remaining amount/);
    }
  });

  it("the owner's own sign_for is never debited (only a non-owner's is)", async () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 10_000n }], undefined);
    const p = await prepareSend({ tokenId: "1", chain: "btc", to: satchelAddresses("2").btc, amount: 1_000n, records: FIXTURE_RECORDS["1"]! });
    const wallet = mockWallet(ALICE);
    const r = await runCall(wallet, calls.signFor("1", p.request), ALICE);
    expect(r.ok).toBe(true);
    expect(simOverlay().allowanceOf("1", BOB)!.caps[0]!.remaining).toBe("10000"); // untouched
  });
});

describe("sim.ts: a sale clears allowances too", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("simBuy clears the seller's allowances on that token", () => {
    simSetAllowance("4", ALICE, BOB, [{ asset: "btc", limit: 1n }], undefined);
    expect(simOverlay().allowancesOf("4")).toHaveLength(1);
    simBuy("4", CAROL);
    expect(simOverlay().allowancesOf("4")).toHaveLength(0);
  });
});
