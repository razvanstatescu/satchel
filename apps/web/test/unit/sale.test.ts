import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSale, proceedsOf, saleFromTxs } from "@/lib/data/sale";
import { simBuy, simList, simOverlay, simReset, simWithdraw } from "@/lib/data/sim";
import { mockWallet } from "@/lib/near/mock-wallet";
import { calls } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import type { FastnearTx } from "@/lib/near/history";
import { installFakeWindow } from "./fake-window";

/**
 * The seller's Sold receipt and escrow (spec §5.12; kb/80 R3 "Sold (seller)"; INV-25): the receipt is the `sold`
 * event plus the `payout` event of the same tx; the escrow is `proceeds_of` state; withdraw_proceeds pays it once.
 */

const C = "satchel.satchelhq.testnet";
const ALICE = "alice.satchelhq.testnet";
const CAROL = "carol.satchelhq.testnet";

const ev = (event: string, data: Record<string, unknown>) => `EVENT_JSON:${JSON.stringify({ standard: "satchel", version: "1.0.0", event, data })}`;
function tx(hash: string, height: number, receipts: { receiver: string; logs: string[]; failed?: boolean }[]): FastnearTx {
  return {
    transaction: { hash, signer_id: CAROL, receiver_id: C, actions: [] },
    receipts: receipts.map((r, i) => ({
      receipt: { receiver_id: r.receiver },
      execution_outcome: { block_height: height + i, block_timestamp: String((1_793_000_000_000 + i) * 1e6), outcome: { logs: r.logs, status: r.failed ? { Failure: {} } : { SuccessValue: "" } } },
    })),
  };
}
const sold = (token: string, seller = ALICE, price = "5000000", currency = "usdc", listing = 7) =>
  ev("sold", { token_id: token, listing_id: listing, seller_id: seller, buyer_id: CAROL, price, currency });
const payout = (ok: boolean, account = ALICE, currency = "usdc", amount = "5000000") => ev("payout", { account_id: account, currency, amount, ok });

describe("saleFromTxs (pure)", () => {
  it("paid: sold + payout ok in the same tx", () => {
    const r = saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3")] }, { receiver: C, logs: [payout(true)] }])], C, "3", ALICE);
    expect(r).toMatchObject({ tokenId: "3", listingId: 7, seller: ALICE, buyer: CAROL, price: "5000000", currency: "usdc", tx: "H1", block: 100, payout: "paid" });
    expect(r?.timestampMs).toBe(1_793_000_000_000);
  });

  it("escrow: payout ok:false (credited to proceeds); pending: no payout event yet", () => {
    expect(saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3")] }, { receiver: C, logs: [payout(false)] }])], C, "3", ALICE)?.payout).toBe("escrow");
    expect(saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3")] }])], C, "3", ALICE)?.payout).toBe("pending");
  });

  it("ignores other sellers, other tokens, other contracts, other currencies and failed receipts", () => {
    expect(saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3", "bob.testnet")] }])], C, "3", ALICE)).toBeNull();
    expect(saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("4")] }])], C, "3", ALICE)).toBeNull();
    expect(saleFromTxs([tx("H1", 100, [{ receiver: "evil.testnet", logs: [sold("3")] }])], C, "3", ALICE)).toBeNull();
    expect(saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3")], failed: true }])], C, "3", ALICE)).toBeNull();
    const nearPayout = saleFromTxs([tx("H1", 100, [{ receiver: C, logs: [sold("3")] }, { receiver: C, logs: [payout(false, ALICE, "near")] }])], C, "3", ALICE);
    expect(nearPayout?.payout).toBe("pending");
  });

  it("the newest sale wins (bought back and sold again)", () => {
    const r = saleFromTxs(
      [tx("OLD", 100, [{ receiver: C, logs: [sold("3", ALICE, "1", "near", 2)] }]), tx("NEW", 900, [{ receiver: C, logs: [sold("3", ALICE, "9000000", "usdc", 8)] }, { receiver: C, logs: [payout(true)] }])],
      C,
      "3",
      ALICE,
    );
    expect(r).toMatchObject({ tx: "NEW", listingId: 8, price: "9000000", payout: "paid" });
  });
});

describe("fixture escrow: buy → payout fails → proceeds → withdraw_proceeds", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installFakeWindow();
    simReset();
  });
  afterEach(() => restore());

  it("a successful payout leaves nothing owed and a paid receipt", async () => {
    simBuy("3", CAROL, "TXPAID", 123);
    expect(simOverlay().token("3")?.owner_id).toBe(CAROL);
    expect(await findSale("3", ALICE)).toMatchObject({ tx: "TXPAID", buyer: CAROL, price: "5000000", currency: "usdc", listingId: 3, payout: "paid" });
    expect(await findSale("3", "bob.satchelhq.testnet")).toBeNull();
    expect(await proceedsOf(ALICE)).toEqual([]);
  });

  it("a failed payout credits proceeds_of(seller); withdraw pays it once, then ERR_NOTHING_OWED", async () => {
    window.localStorage.setItem("satchel:sim:payout", "fail");
    simBuy("5", CAROL, "TXFAIL", 123); // listing #5: 1 NEAR
    expect((await findSale("5", ALICE))?.payout).toBe("escrow");
    expect(await proceedsOf(ALICE)).toEqual([{ currency: "near", amount: "1000000000000000000000000" }]);
    expect(simWithdraw(ALICE, "usdc")).toEqual({ ok: false, error: "ERR_NOTHING_OWED: nothing to withdraw" });
    expect(simWithdraw(ALICE, "near")).toEqual({ ok: true, paid: true, amount: "1000000000000000000000000" });
    expect(await proceedsOf(ALICE)).toEqual([]);
    expect(simWithdraw(ALICE, "near")).toMatchObject({ ok: false });
  });

  it("a withdraw whose payout fails again is re-credited (never lost, never doubled)", async () => {
    window.localStorage.setItem("satchel:sim:payout", "fail-always");
    simBuy("3", CAROL);
    expect(simWithdraw(ALICE, "usdc")).toEqual({ ok: true, paid: false, amount: "5000000" });
    expect(await proceedsOf(ALICE)).toEqual([{ currency: "usdc", amount: "5000000" }]);
  });

  it("the mock wallet maps withdraw_proceeds to the contract outcome (ERR_NOTHING_OWED is a mapped failure)", async () => {
    window.localStorage.setItem("satchel:sim:payout", "fail");
    simList("6", ALICE, "2000000", "usdc", 1);
    simBuy("6", CAROL);
    const w = mockWallet(ALICE);
    const ok = await runCall(w, calls.withdrawProceeds("usdc"), ALICE);
    expect(ok.ok).toBe(true);
    expect(await proceedsOf(ALICE)).toEqual([]);
    const again = await runCall(w, calls.withdrawProceeds("usdc"), ALICE);
    expect(again).toMatchObject({ ok: false, failure: { code: "ERR_NOTHING_OWED" } });
  });

  it("withdraw_proceeds is built per spec §5.6 (50 Tgas, 1 yocto)", () => {
    const t = calls.withdrawProceeds("near");
    expect(t.receiverId).toBe(C);
    expect(t.actions[0].params).toMatchObject({ methodName: "withdraw_proceeds", args: { currency: "near" }, gas: "50000000000000", deposit: "1" });
  });
});
