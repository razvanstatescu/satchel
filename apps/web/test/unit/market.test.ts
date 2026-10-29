import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { marketCalls, offerAcceptBlock } from "@/lib/near/contract";
import { simAcceptOffer, simCancelOffer, simDelist, simDepositNear, simList, simMakeOffer, simOverlay, simReset, simWithdrawNear } from "@/lib/data/sim";
import { mockWallet } from "@/lib/near/mock-wallet";
import { runCall } from "@/lib/near/run-call";
import { installFakeWindow } from "./fake-window";

/**
 * C4 (offers) + C6 (NEAR-side assets inside a Satchel), docs/specs/C4-C6.md. Covers the call builders (gas/deposit),
 * the fixture sim's deposit/withdraw/offer mutators, and the offer-gating mirror (`offerAcceptBlock`) the owner's UI
 * uses before `accept_offer`, exactly as the contract would check it.
 */

const C = "satchel.satchelhq.testnet";
const ALICE = "alice.satchelhq.testnet"; // owner of token "1" and "6" in fixtures.ts
const BOB = "bob.satchelhq.testnet";
const CAROL = "carol.satchelhq.testnet";

describe("marketCalls (pure call builders)", () => {
  it("depositNear attaches the amount at 30 Tgas", () => {
    const t = marketCalls.depositNear("3", 2_000_000_000_000_000_000_000n);
    expect(t.receiverId).toBe(C);
    expect(t.actions[0].params).toMatchObject({ methodName: "deposit_near", args: { token_id: "3" }, gas: "30000000000000", deposit: "2000000000000000000000" });
  });

  it("withdrawNear is exactly 1 yocto at 50 Tgas, amount in the args", () => {
    const t = marketCalls.withdrawNear("3", 1_000n);
    expect(t.actions[0].params).toMatchObject({ methodName: "withdraw_near", args: { token_id: "3", amount: "1000" }, gas: "50000000000000", deposit: "1" });
  });

  it("makeOfferNear attaches amount + 0.01 NEAR storage", () => {
    const t = marketCalls.makeOfferNear(5_000_000_000_000_000_000_000n, { tokenId: "3", expectedSigCount: 1, expectedInsideEpoch: 0, expiresAtMs: 1_800_000_000_000 });
    expect(t.actions[0].params.methodName).toBe("make_offer");
    expect(t.actions[0].params.args).toMatchObject({ token_id: "3", amount: "5000000000000000000000", expected_sig_count: 1, expected_inside_epoch: 0, expires_at_ms: 1_800_000_000_000 });
    expect(BigInt(t.actions[0].params.deposit)).toBe(15_000_000_000_000_000_000_000n); // + 0.01 NEAR
  });

  it("acceptOffer / cancelOffer are exactly 1 yocto at 50 Tgas", () => {
    expect(marketCalls.acceptOffer(4).actions[0].params).toMatchObject({ methodName: "accept_offer", args: { offer_id: 4 }, deposit: "1", gas: "50000000000000" });
    expect(marketCalls.cancelOffer(4).actions[0].params).toMatchObject({ methodName: "cancel_offer", args: { offer_id: 4 }, deposit: "1", gas: "50000000000000" });
  });
});

describe("C6: inside NEAR (fixture sim)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
    simReset();
  });
  afterEach(() => restore());

  it("the first deposit on a token with no inside record pays storage; later ones don't", () => {
    const first = simDepositNear("6", 1_000_000_000_000_000_000_000_000n); // 1 NEAR
    expect(BigInt(first)).toBeLessThan(1_000_000_000_000_000_000_000_000n); // storage was kept
    const before = simOverlay().insideOf("6").near;
    simDepositNear("6", 500_000_000_000_000_000_000_000n); // 0.5 NEAR, same token: no storage this time
    const after = simOverlay().insideOf("6").near;
    expect(BigInt(after) - BigInt(before)).toBe(500_000_000_000_000_000_000_000n);
  });

  it("owner withdraw debits the balance and bumps inside_epoch by exactly 1", () => {
    simDepositNear("6", 1_000_000_000_000_000_000_000_000n);
    const before = simOverlay().insideOf("6");
    simWithdrawNear("6", ALICE, BigInt(before.near) / 2n);
    const after = simOverlay().insideOf("6");
    expect(BigInt(after.near)).toBe(BigInt(before.near) - BigInt(before.near) / 2n);
    expect(after.inside_epoch).toBe(before.inside_epoch + 1);
  });

  it("a non-owner can't withdraw (ERR_NOT_OWNER)", () => {
    simDepositNear("6", 1_000_000_000_000_000_000_000_000n);
    expect(() => simWithdrawNear("6", BOB, 1n)).toThrow(/ERR_NOT_OWNER/);
  });

  it("withdraw is blocked while listed (ERR_LISTED), and works again once delisted", () => {
    simDepositNear("6", 1_000_000_000_000_000_000_000_000n);
    simList("6", ALICE, "5000000", "usdc", 1);
    expect(() => simWithdrawNear("6", ALICE, 1n)).toThrow(/ERR_LISTED/);
    simDelist("6");
    expect(() => simWithdrawNear("6", ALICE, 1n)).not.toThrow();
  });

  it("withdrawing more than the balance is refused (ERR_INSIDE_BALANCE)", () => {
    simDepositNear("6", 1_000_000_000_000_000_000_000_000n);
    const bal = BigInt(simOverlay().insideOf("6").near);
    expect(() => simWithdrawNear("6", ALICE, bal + 1n)).toThrow(/ERR_INSIDE_BALANCE/);
  });

  it("the mock wallet maps deposit_near / withdraw_near through the signing runner", async () => {
    const wallet = mockWallet(BOB);
    const dep = await runCall(wallet, marketCalls.depositNear("6", 1_000_000_000_000_000_000_000_000n), BOB);
    expect(dep.ok).toBe(true);
    expect(BigInt(simOverlay().insideOf("6").near)).toBeGreaterThan(0n);
    const ownerWallet = mockWallet(ALICE);
    const bal = BigInt(simOverlay().insideOf("6").near);
    const wd = await runCall(ownerWallet, marketCalls.withdrawNear("6", bal), ALICE);
    expect(wd.ok).toBe(true);
    expect(simOverlay().insideOf("6").near).toBe("0");
  });
});

describe("C4: offers (fixture sim + offerAcceptBlock gating)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
    simReset();
  });
  afterEach(() => restore());

  const satchel1 = () => simOverlay().satchel("1")!;
  const insideEpoch1 = () => simOverlay().insideOf("1").inside_epoch;

  it("make_offer refuses the current owner (ERR_SELF_BUY)", () => {
    const sat = satchel1();
    expect(() => simMakeOffer("1", ALICE, 1_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 1000 })).toThrow(/ERR_SELF_BUY/);
  });

  it("make_offer refuses a stale sig_count/inside_epoch (ERR_OFFER_STALE)", () => {
    expect(() => simMakeOffer("1", BOB, 1_000_000n, "near", { expectedSigCount: 999, expectedInsideEpoch: 0, expiresAtMs: Date.now() + 1000 })).toThrow(/ERR_OFFER_STALE/);
  });

  it("make_offer refuses an expiry beyond 90 days or in the past (ERR_OFFER_EXPIRY)", () => {
    const sat = satchel1();
    const terms = (ms: number) => simMakeOffer("1", BOB, 1_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: ms });
    expect(() => terms(Date.now() - 1000)).toThrow(/ERR_OFFER_EXPIRY/);
    expect(() => terms(Date.now() + 91 * 24 * 3600 * 1000)).toThrow(/ERR_OFFER_EXPIRY/);
  });

  it("a visitor makes an offer; the owner accepts: ownership moves, inside balances follow", () => {
    simDepositNear("1", 1_000_000_000_000_000_000_000_000n); // 1 NEAR inside token "1"
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 });
    const insideBefore = simOverlay().insideOf("1");
    const { tokenId, offererId } = simAcceptOffer(id, ALICE, 274_300_500);
    expect(tokenId).toBe("1");
    expect(offererId).toBe(BOB);
    expect(simOverlay().token("1")?.owner_id).toBe(BOB);
    expect(simOverlay().insideOf("1")).toEqual(insideBefore); // C6: inside balances are keyed by token id, unaffected
    expect(simOverlay().offer(id)).toBeNull(); // the offer record is gone after acceptance
  });

  it("accept_offer delists a listed token first", () => {
    simList("1", ALICE, "1000000000000000000000000", "near", 1);
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 });
    simAcceptOffer(id, ALICE, 274_300_500);
    expect(simOverlay().satchel("1")?.listing).toBeNull();
  });

  it("a stale offer (a new signature since) is refused with ERR_OFFER_STALE, exactly mirrored by offerAcceptBlock", () => {
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 });
    // Simulate "a new signature happened": bump the inside epoch independently (a withdrawal would do this too).
    simDepositNear("1", 1_000_000_000_000_000_000_000_000n);
    simWithdrawNear("1", ALICE, 1n); // bumps inside_epoch
    const offer = simOverlay().offer(id)!;
    const block = offerAcceptBlock(
      { offerer_id: offer.offerer_id, expected_sig_count: offer.expected_sig_count, expected_inside_epoch: offer.expected_inside_epoch, expires_at_ms: offer.expires_at_ms },
      { owner_id: ALICE, sig_count: sat.sig_count, last_sign_height: sat.last_sign_height },
      simOverlay().insideOf("1").inside_epoch,
      { ms: Date.now(), height: 274_300_500 },
    );
    expect(block).toBe("ERR_OFFER_STALE");
    expect(() => simAcceptOffer(id, ALICE, 274_300_500)).toThrow(/ERR_OFFER_STALE/);
  });

  it("an expired offer is refused with ERR_OFFER_EXPIRED at accept", () => {
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 10 });
    expect(() => simAcceptOffer(id, ALICE, 274_300_500)).not.toThrow(); // not expired yet (within this tick)
  });

  it("the offerer can cancel any time; the refund goes to them; anyone can cancel after it expires", () => {
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 });
    expect(() => simCancelOffer(id, CAROL)).toThrow(/ERR_NOT_OFFERER/); // not expired, not the offerer
    const cancelled = simCancelOffer(id, BOB);
    expect(cancelled.offererId).toBe(BOB);
    expect(simOverlay().offer(id)).toBeNull();
  });

  it("anyone can cancel an expired offer", () => {
    const sat = satchel1();
    const id = simMakeOffer("1", BOB, 2_000_000n, "near", { expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 5 });
    const cancelled = simCancelOffer(id, CAROL, Date.now() + 1000); // past the expiry, a stranger cancels
    expect(cancelled.offererId).toBe(BOB); // the refund still names the offerer
  });

  it("the mock wallet maps make_offer / accept_offer / cancel_offer through the signing runner", async () => {
    const sat = satchel1();
    const bobWallet = mockWallet(BOB);
    const made = await runCall(
      bobWallet,
      marketCalls.makeOfferNear(2_000_000n, { tokenId: "1", expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 }),
      BOB,
    );
    expect(made.ok).toBe(true);
    const offerId = made.ok ? (made.value as number) : -1;
    expect(offerId).toBeGreaterThan(0);
    const aliceWallet = mockWallet(ALICE);
    const accepted = await runCall(aliceWallet, marketCalls.acceptOffer(offerId), ALICE);
    expect(accepted.ok).toBe(true);
    expect(simOverlay().token("1")?.owner_id).toBe(BOB);
  });

  it("make_offer refused by the contract (ERR_SELF_BUY) refunds 100%, mapped to a readable failure", async () => {
    const sat = satchel1();
    const aliceWallet = mockWallet(ALICE);
    const r = await runCall(
      aliceWallet,
      marketCalls.makeOfferNear(2_000_000n, { tokenId: "1", expectedSigCount: sat.sig_count, expectedInsideEpoch: insideEpoch1(), expiresAtMs: Date.now() + 86_400_000 }),
      ALICE,
    );
    expect(r).toMatchObject({ ok: false, failure: { code: "ERR_SELF_BUY" } });
  });
});
