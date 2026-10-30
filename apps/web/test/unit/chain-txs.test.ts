import { describe, expect, it } from "vitest";
import { familyOf, mergeTxs, parseBlockscout, parseInside, parseMempool, parseSolana, parseTxFilter } from "@/lib/chain-txs";
import { USDC_CONTRACT } from "@/lib/config";
import { usdcAddress } from "@/lib/evm-networks";
import { WNEAR_TESTNET } from "@/lib/near/contract";

/** The Transactions tab's parsers, on the public APIs' own shapes (trimmed from real dev2 responses, 2026-10-30). */

const BTC = "tb1qnqe0734xrsnpm5yt36r627g6kdkt4u9wjrrnaq";
const EVM = "0x2f63B9eAa9F225aaD72Db4391e024761c9613Fe8";
const SOL = "2jgCnruxgsWMP2EwbtjYdG8gqepRNkBE7T3qJAA71Afo";

describe("Bitcoin (mempool.space)", () => {
  const send = {
    txid: "f4db80ec",
    fee: 282,
    status: { confirmed: true, block_time: 1793351204 },
    vin: [{ prevout: { scriptpubkey_address: BTC, value: 300000 } }],
    vout: [
      { scriptpubkey_address: "tb1q9v9t4ay7ssgry9l7s9yf7hs6s39uhxtd8f6gs3", value: 5000 },
      { scriptpubkey_address: BTC, value: 294718 },
    ],
  };
  const receive = { txid: "68a0ee8a", status: { confirmed: false }, vin: [{ prevout: { scriptpubkey_address: "tb1qcg94", value: 400000 } }], vout: [{ scriptpubkey_address: BTC, value: 300000 }] };

  it("a send pays the other outputs (change back to itself doesn't count), with its fee", () => {
    expect(parseMempool([send], BTC)).toMatchObject([{ direction: "out", amount: "5000", counterparty: "tb1q9v9t4ay7ssgry9l7s9yf7hs6s39uhxtd8f6gs3", fee: "282", status: "confirmed", timestampMs: 1793351204000 }]);
  });
  it("a receive is what reached the address; unconfirmed is pending with no time", () => {
    expect(parseMempool([receive], BTC)).toMatchObject([{ direction: "in", amount: "300000", counterparty: "tb1qcg94", status: "pending", timestampMs: null }]);
  });
  it("ignores junk", () => expect(parseMempool({ error: 1 }, BTC)).toEqual([]));
});

describe("EVM (Blockscout)", () => {
  const usdc = usdcAddress(11155111);
  const txs = {
    items: [
      { hash: "0x4a27", value: "2000000000000000", status: "ok", result: "success", timestamp: "2026-10-30T08:20:36.000000Z", from: { hash: EVM }, to: { hash: "0x1b2E" }, fee: { value: "13503600" } },
      { hash: "0x1264", value: "20000000000000000", status: "ok", result: "success", timestamp: "2026-10-29T20:48:00.000000Z", from: { hash: "0x3551" }, to: { hash: EVM.toLowerCase() } },
      { hash: "0xcall", value: "0", status: "ok", result: "success", timestamp: "2026-10-29T20:00:00.000000Z", from: { hash: EVM }, to: { hash: usdc } },
      { hash: "0xbad", value: "1", status: "error", result: "Reverted", timestamp: "2026-10-29T19:00:00.000000Z", from: { hash: EVM }, to: { hash: "0x1b2E" } },
    ],
  };
  const transfers = {
    items: [
      { transaction_hash: "0x3976", timestamp: "2026-10-30T08:39:00.000000Z", from: { hash: "0xD844" }, to: { hash: EVM }, total: { value: "20000000" }, token: { address_hash: usdc } },
      { transaction_hash: "0x4a27", timestamp: "2026-10-30T08:20:36.000000Z", from: { hash: EVM }, to: { hash: "0x1b2E" }, total: { value: "2000000000000000" }, token: { address_hash: "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE" } },
      { transaction_hash: "0xspam", timestamp: "2026-10-30T08:00:00.000000Z", from: { hash: "0xabc" }, to: { hash: EVM }, total: { value: "999" }, token: { address_hash: "0xSpamToken" } },
    ],
  };
  const rows = parseBlockscout(11155111, txs, transfers, EVM);

  it("ETH in and out (case-insensitive addresses), zero-value calls skipped, a revert marked failed", () => {
    expect(rows.filter((r) => r.coin === "ETH").map((r) => [r.hash, r.direction, r.amount, r.status])).toEqual([
      ["0x4a27", "out", "2000000000000000", "confirmed"],
      ["0x1264", "in", "20000000000000000", "confirmed"],
      ["0xbad", "out", "1", "failed"],
    ]);
    expect(rows[0]).toMatchObject({ network: "sepolia", fee: "13503600", url: expect.stringContaining("/tx/0x4a27") });
  });
  it("only the network's Circle USDC counts: the native pseudo-token and spam tokens never show", () => {
    expect(rows.filter((r) => r.coin === "USDC").map((r) => [r.hash, r.direction, r.amount])).toEqual([["0x3976", "in", "20000000"]]);
  });
  it("a network without a source (Arbitrum Sepolia) reads nothing", () => expect(parseBlockscout(421614, txs, transfers, EVM)).toEqual([]));
});

describe("Solana (devnet RPC)", () => {
  const recv = {
    blockTime: 1793306892,
    meta: { err: null, fee: 5000, preBalances: [449995000, 0, 1], postBalances: [249990000, 200000000, 1] },
    transaction: { signatures: ["4gwT"], message: { accountKeys: [{ pubkey: "6ZQT" }, { pubkey: SOL }, { pubkey: "1111" }] } },
  };
  const send = {
    blockTime: 1793348526,
    meta: { err: null, fee: 5000, preBalances: [200000000, 0, 1], postBalances: [198995000, 1000000, 1] },
    transaction: { signatures: ["3jP9"], message: { accountKeys: [SOL, "7RbA", "1111"] } },
  };
  it("reads the balance change: in from the payer, out to the receiver with the fee apart", () => {
    expect(parseSolana([recv, send], SOL).map((r) => [r.hash, r.direction, r.amount, r.counterparty, r.fee ?? null])).toEqual([
      ["4gwT", "in", "200000000", "6ZQT", null],
      ["3jP9", "out", "1000000", "7RbA", "5000"],
    ]);
  });
  it("a fee-only transaction, a failed one, and junk", () => {
    const feeOnly = { ...send, transaction: { signatures: ["x"], message: { accountKeys: [SOL] } }, meta: { err: null, fee: 5000, preBalances: [10000], postBalances: [5000] } };
    expect(parseSolana([feeOnly], SOL)).toEqual([]);
    expect(parseSolana([{ ...recv, meta: { ...recv.meta, err: { InstructionError: [0, "x"] } } }], SOL)[0].status).toBe("failed");
    expect(parseSolana([null, {}], SOL)).toEqual([]);
  });
});

describe("inside (the contract's events)", () => {
  it("deposits and withdrawals of NEAR, USDC and wNEAR; other events and unknown tokens ignored", () => {
    const evs = [
      { event: "inside_deposit", tx: "t1", timestampMs: 1, data: { token_id: "1", sender_id: "bob.testnet", ft: null, amount: "1000" } },
      { event: "inside_deposit", tx: "t2", timestampMs: 2, data: { token_id: "1", sender_id: "bob.testnet", ft: USDC_CONTRACT, amount: "5000000" } },
      { event: "inside_withdraw", tx: "t3", timestampMs: 3, data: { token_id: "1", owner_id: "alice.testnet", receiver_id: "alice.testnet", ft: WNEAR_TESTNET, amount: "2" } },
      { event: "inside_deposit", tx: "t4", timestampMs: 4, data: { token_id: "1", sender_id: "x", ft: "fake.testnet", amount: "1" } },
      { event: "listed", tx: "t5", timestampMs: 5, data: { token_id: "1" } },
    ];
    expect(parseInside(evs).map((r) => [r.coin, r.direction, r.amount, r.counterparty, r.network])).toEqual([
      ["NEAR", "in", "1000", "bob.testnet", "near"],
      ["USDC", "in", "5000000", "bob.testnet", "near"],
      ["wNEAR", "out", "2", "alice.testnet", "near"],
    ]);
  });
});

describe("merge and filter", () => {
  it("pending first, then newest; one row per id", () => {
    const a = { id: "a", timestampMs: 10 } as never;
    const b = { id: "b", timestampMs: null } as never;
    const c = { id: "c", timestampMs: 20 } as never;
    expect(mergeTxs([[a, b], [c, a]]).map((t: { id: string }) => t.id)).toEqual(["b", "c", "a"]);
  });
  it("chain families and the ?filter= value", () => {
    expect([familyOf("base"), familyOf("optimism"), familyOf("near"), familyOf("bitcoin")]).toEqual(["ethereum", "ethereum", "inside", "bitcoin"]);
    expect([parseTxFilter("solana"), parseTxFilter("nope"), parseTxFilter(undefined), parseTxFilter(["inside"])]).toEqual(["solana", "all", "all", "inside"]);
  });
});
