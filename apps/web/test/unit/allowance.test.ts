import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assetChain, assetTicker, capForChain, ethOtherCapOptions, extraCapOptions, formatCapAmount, MAX_CAPS, usdcCapOptions } from "@/lib/allowanceView";
import { usdcAddress } from "@/lib/evm-networks";
import { errorCopy } from "@/lib/copy";
import { prepareSend } from "@/lib/chains/send";
import { DANA, FIXTURE_RECORDS } from "@/lib/data/fixtures";
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
    // C2 + C3: a USDC cap formats as USDC (6 decimals), and ETH on another testnet as ETH
    expect(formatCapAmount({ erc20: { chain_id: 11155111, token: "1c7d4b196cb0c7b01d743fbc6116a902379c7238" } }, "5000000")).toBe(`5.00${NBSP}USDC`);
    expect(formatCapAmount({ evm: { chain_id: 84532 } }, "20000000000000000")).toBe(`0.0200${NBSP}ETH`);
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
    // #6 has no static demo allowance (fixtures.ts: only #1 does, DANA), so this starts from a clean slate.
    simSetAllowance("6", ALICE, BOB, [{ asset: "btc", limit: 50_000n }], undefined);
    const rows = simOverlay().allowancesOf("6");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ token_id: "6", delegate: BOB, owner_id: ALICE, status: "active", expires_at_ms: null });
    expect(rows[0]!.caps).toEqual([{ asset: "btc", limit: "50000", spent: "0", remaining: "50000", spends: [] }]);
    expect(simOverlay().allowanceOf("6", BOB)?.delegate).toBe(BOB);
    expect(simOverlay().allowanceOf("6", CAROL)).toBeNull();
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
    simSetAllowance("6", ALICE, BOB, [{ asset: "btc", limit: 1n }], undefined);
    expect(() => simRevokeAllowance("6", ALICE, CAROL)).toThrow(/ERR_ALLOWANCE_NOT_FOUND/);
    expect(() => simRevokeAllowance("6", ALICE, BOB)).not.toThrow();
    expect(simOverlay().allowancesOf("6")).toHaveLength(0);
    expect(() => simRevokeAllowance("6", ALICE, BOB)).toThrow(/ERR_ALLOWANCE_NOT_FOUND/);
  });

  it("reset rule: a transfer or a sale clears every allowance on the token (spec §4)", () => {
    // #1 already carries DANA's fixture-default row, so adding BOB makes two — and both must clear on transfer.
    simSetAllowance("1", ALICE, BOB, [{ asset: "btc", limit: 1n }], undefined);
    expect(simOverlay().allowancesOf("1")).toHaveLength(2);
    simTransfer("1", CAROL);
    expect(simOverlay().allowancesOf("1")).toHaveLength(0);
    // and the fixture demo delegation on #1 doesn't come back after a transfer away and (conceptually) back
    simTransfer("1", ALICE);
    expect(simOverlay().allowancesOf("1")).toHaveLength(0);
  });

  it("the fixture demo: Satchel #1 (ALICE) already lets DANA spend a daily BTC and ETH cap", () => {
    const rows = simOverlay().allowancesOf("1");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.delegate).toBe(DANA);
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

const BASE = 84532;
const ARBITRUM = 421614;
const OP = 11155420;

describe("allowanceView: the Add sheet's full cap list (C2 + C3: ETH on Base/Arbitrum/OP, USDC on all four)", () => {
  it("ethOtherCapOptions covers Base, Arbitrum and OP, never Sepolia (it has its own native-chain row)", () => {
    const opts = ethOtherCapOptions();
    expect(opts.map((o) => o.ticker)).toEqual(["ETH", "ETH", "ETH"]);
    expect(opts.map((o) => (o.asset as { evm: { chain_id: number } }).evm.chain_id)).toEqual([BASE, ARBITRUM, OP]);
    expect(opts.some((o) => (o.asset as { evm: { chain_id: number } }).evm.chain_id === 11155111)).toBe(false);
  });

  it("usdcCapOptions covers all four EVM testnets, each erc20 asset carrying that chain's USDC token", () => {
    const opts = usdcCapOptions();
    expect(opts).toHaveLength(4);
    expect(opts.every((o) => o.ticker === "USDC")).toBe(true);
    expect(
      opts
        .map((o) => (o.asset as { erc20: { chain_id: number; token: string } }).erc20.chain_id)
        .sort((a, b) => a - b),
    ).toEqual([11155111, BASE, ARBITRUM, OP].sort((a, b) => a - b));
    for (const o of opts) {
      const a = o.asset as { erc20: { chain_id: number; token: string } };
      expect(a.erc20.token).toBe(usdcAddress(a.erc20.chain_id).replace(/^0x/, "").toLowerCase());
    }
  });

  it("extraCapOptions is the 3 extra ETH rows plus the 4 USDC rows, each with a unique key", () => {
    const opts = extraCapOptions();
    expect(opts).toHaveLength(7);
    expect(new Set(opts.map((o) => o.key)).size).toBe(7);
  });

  it("formatCapAmount reads ETH and USDC on every one of these chains", () => {
    expect(formatCapAmount({ evm: { chain_id: BASE } }, "20000000000000000")).toBe(`0.0200${" "}ETH`);
    expect(formatCapAmount({ erc20: { chain_id: BASE, token: usdcAddress(BASE).slice(2) } }, "5000000")).toBe(`5.00${" "}USDC`);
  });
});

describe("sim.ts: set_allowance respects the contract's 8-cap limit across every asset kind", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("accepts exactly MAX_CAPS (8) caps mixing native chains, other-network ETH and USDC", () => {
    expect(MAX_CAPS).toBe(8);
    const opts = extraCapOptions(); // 7 rows: 3 ETH + 4 USDC
    const caps = [{ asset: "btc" as const, limit: 1n }, ...opts.map((o) => ({ asset: o.asset, limit: 1n }))];
    expect(caps).toHaveLength(8);
    expect(() => simSetAllowance("6", ALICE, BOB, caps, undefined)).not.toThrow();
    expect(simOverlay().allowanceOf("6", BOB)!.caps).toHaveLength(8);
  });

  it("rejects a 9th cap (ERR_ALLOWANCE_CAPS), even when every asset is distinct", () => {
    const opts = extraCapOptions();
    const caps = [{ asset: "btc" as const, limit: 1n }, { asset: "sol" as const, limit: 1n }, ...opts.map((o) => ({ asset: o.asset, limit: 1n }))];
    expect(caps).toHaveLength(9);
    expect(() => simSetAllowance("6", ALICE, BOB, caps, undefined)).toThrow(/ERR_ALLOWANCE_CAPS/);
  });
});

describe("sim.ts + mock-wallet: a delegate's USDC and other-network ETH caps (C2 + C3)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
  });
  afterEach(() => restore());

  it("a delegate's USDC send on Base Sepolia within the cap is allowed; over it, refused", async () => {
    // Satchel #1 (ALICE) holds 10 USDC on Base Sepolia (fixtures.ts FIXTURE_EVM_CHAINS). A USDC send also debits the
    // native ETH gas fee (evmDebits), so the delegate needs an ETH cap on that chain too, not only the USDC one.
    simSetAllowance(
      "1",
      ALICE,
      BOB,
      [
        { asset: { erc20: { chain_id: BASE, token: usdcAddress(BASE).slice(2) } }, limit: 5_000_000n }, // 5 USDC
        { asset: { evm: { chain_id: BASE } }, limit: 1_000_000_000_000_000n }, // gas headroom
      ],
      undefined,
    );
    const small = await prepareSend({ tokenId: "1", chain: "evm", to: satchelAddresses("2").evm, amount: 2_000_000n, records: FIXTURE_RECORDS["1"]!, evmChainId: BASE, asset: "usdc" });
    const wallet = mockWallet(BOB);
    const r = await runCall(wallet, calls.signFor("1", small.request), BOB);
    expect(r.ok).toBe(true);
    const cap = simOverlay().allowanceOf("1", BOB)!.caps[0]!;
    expect(BigInt(cap.remaining)).toBe(3_000_000n);

    const big = await prepareSend({ tokenId: "1", chain: "evm", to: satchelAddresses("2").evm, amount: 3_500_000n, records: FIXTURE_RECORDS["1"]!, evmChainId: BASE, asset: "usdc", reuse: { evmNonce: small.evmNonce! + 1 } });
    const r2 = await runCall(wallet, calls.signFor("1", big.request), BOB);
    expect(r2.ok).toBe(false);
    if (!r2.ok && "failure" in r2) expect(r2.failure.code).toBe("ERR_ALLOWANCE_EXCEEDED");
  });

  it("a delegate's ETH send on Base Sepolia debits its own cap, separate from the native Sepolia ETH cap", async () => {
    simSetAllowance("1", ALICE, BOB, [{ asset: { evm: { chain_id: BASE } }, limit: 10_000_000_000_000_000n }], undefined);
    const p = await prepareSend({ tokenId: "1", chain: "evm", to: satchelAddresses("2").evm, amount: 1_000_000_000_000_000n, records: FIXTURE_RECORDS["1"]!, evmChainId: BASE });
    const wallet = mockWallet(BOB);
    const r = await runCall(wallet, calls.signFor("1", p.request), BOB);
    expect(r.ok).toBe(true);
    expect(BigInt(simOverlay().allowanceOf("1", BOB)!.caps[0]!.remaining)).toBeLessThan(10_000_000_000_000_000n);
  });
});
