import { describe, expect, it } from "vitest";
import { checkMessages } from "@satchel/core/clean-history";
import { classifySignRequest, signContextFromRecords } from "@satchel/core/policy";
import { prepareSend, checkEvmNonceGap } from "@/lib/chains/send";
import { aggregate, counts, fixtureCleanReport, messageItem } from "@/lib/data/clean";
import { FIXTURE_C2, FIXTURE_RECORDS, fixtureEvmChains } from "@/lib/data/fixtures";
import { liveActivityRows, signRow } from "@/lib/data/server";
import type { LockFacts, SatchelSnapshot } from "@/lib/data/types";
import type { SigRecordView } from "@/lib/near/types";
import { satchelAddresses } from "@/lib/derive";
import { anyEvmFunds, evmBalanceOf, evmBalances, pickEvmChainId } from "@/lib/evm-networks";
import { blockingIntent } from "@/lib/signing/retry";
import type { PendingIntent } from "@/lib/signing/types";
import { allZero } from "@/lib/view";
import { NBSP } from "@/lib/format";

/** C2 (USDC), C3 (four EVM testnets) and the C7 clean-history rules, on the fixture world (D-32 + #2's new records). */

const TO = satchelAddresses("3").evm;
const LOCKED: LockFacts = { access_keys: 0, account_exists: true, locked: true, code_hash_hex: "a", expected_code_hash: "a", code_matches: true, birth_tx: null, birth_block: 1 };

describe("C3: the nonce-gap rule per chain id", () => {
  const two = FIXTURE_RECORDS["2"]!; // Sepolia nonce 0 (USDC) and Base Sepolia nonce 0, plus a message

  it("gates each chain on its own highest signed nonce", () => {
    // Base Sepolia: highest 0 → 1 is the most it may use
    expect(() => checkEvmNonceGap(two, 84532, 1)).not.toThrow();
    expect(() => checkEvmNonceGap(two, 84532, 2)).toThrow(expect.objectContaining({ problem: "evm_nonce_gap" }));
    // Arbitrum Sepolia: no record there → 0 or 1, never 2 (records on other chains don't count)
    expect(() => checkEvmNonceGap(two, 421614, 1)).not.toThrow();
    expect(() => checkEvmNonceGap(two, 421614, 2)).toThrow(expect.objectContaining({ problem: "evm_nonce_gap" }));
    // the message record never counts as a nonce
    expect(signContextFromRecords(two).evmMaxSignedNonceByChain).toMatchObject({ "11155111": 0n, "84532": 0n, "421614": null, "11155420": null });
  });

  it("builds a Base Sepolia send whose request the contract's rule accepts, and refuses a gap before signing", async () => {
    const recs = FIXTURE_RECORDS["1"]!; // one Sepolia record at nonce 0, nothing on Base
    const p = await prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1_000_000_000_000n, records: recs, evmChainId: 84532 });
    expect(p.evmChainId).toBe(84532);
    expect(p.evmNonce).toBe(0); // its own nonce sequence starts at 0 on Base
    expect(p.balance).toBe(20_000_000_000_000_000n); // Base ETH, not Sepolia's
    const c = classifySignRequest(p.request as never, signContextFromRecords(recs));
    expect(c.ok && c.chain === "evm" && c.fields.chainId).toBe(84532n);
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: recs, evmChainId: 84532, reuse: { evmNonce: 2 } })).rejects.toMatchObject({ problem: "evm_nonce_gap" });
    // Sepolia's next is 1 (one past its record), independent of Base
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: recs })).resolves.toMatchObject({ evmNonce: 1, evmChainId: 11155111 });
  });

  it("only an unsent send on the same network blocks a new one; messages never do", () => {
    const base: Omit<PendingIntent, "id" | "stage"> = { tokenId: "1", chain: "evm", createdAt: 0, contract: "c", sigCountBefore: 0, heightBefore: 0, unsigned: {}, payloadHashes: [] };
    const intents: PendingIntent[] = [
      { ...base, id: "a", stage: "signed_not_sent", evmChainId: 84532 },
      { ...base, id: "m", stage: "timed_out", message: { kind: "evm_message", text: "hi" } },
    ];
    expect(blockingIntent(intents, "1", "evm", 84532)?.id).toBe("a");
    expect(blockingIntent(intents, "1", "evm", 11155111)).toBeNull();
    expect(blockingIntent([intents[1]], "1", "evm")).toBeNull();
  });

  it("picks a supported network from ?network=, else Sepolia", () => {
    expect([pickEvmChainId("84532"), pickEvmChainId("1"), pickEvmChainId(undefined), pickEvmChainId(["421614"])]).toEqual([84532, 11155111, 11155111, 421614]);
  });
});

describe("C2: USDC sends (6 decimals) need ETH on the same network", () => {
  it("builds a USDC transfer to the chain's USDC contract with value 0", async () => {
    const p = await prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1_500_000n, records: FIXTURE_RECORDS["1"]!, evmChainId: 84532, asset: "usdc" });
    expect(p.asset).toBe("usdc");
    expect(p.amount).toBe(1_500_000n);
    expect(p.balance).toBe(10_000_000n); // Base USDC
    expect(p.after).toBe(8_500_000n); // the fee is ETH, never taken from the USDC
    const c = classifySignRequest(p.request as never);
    expect(c.ok && c.chain === "evm" && c.fields.erc20).toMatchObject({ token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e", amount: 1_500_000n });
    expect(c.ok && c.chain === "evm" && c.fields.value).toBe(0n);
  });

  it("refuses more USDC than it holds, and a USDC send with no ETH for the fee", async () => {
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 25_000_001n, records: [], asset: "usdc" })).rejects.toMatchObject({ problem: "usdc_insufficient" });
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1_000_000n, records: [], evmChainId: 421614, asset: "usdc" })).rejects.toMatchObject({ problem: "usdc_no_gas" });
  });
});

describe("C2 + C3: balances across networks", () => {
  const snap = (id: string, overrides: Partial<SatchelSnapshot["balances"]> = {}) =>
    ({ balances: { btc: { confirmed_sats: "0", unconfirmed_sats: "0" }, evm: { wei: "0" }, sol: { lamports: "0" }, evm_chains: fixtureEvmChains(id), ...overrides } }) as Pick<SatchelSnapshot, "balances">;

  it("reads four networks, Sepolia first", () => {
    expect(evmBalances(snap("1")).map((r) => r.chain_id)).toEqual([11155111, 84532, 421614, 11155420]);
    expect(evmBalanceOf(snap("1"), 84532, "usdc")).toBe(10_000_000n);
  });

  it("a Satchel holding only Base Sepolia ETH, or only USDC, is not empty (Send stays on)", () => {
    const onlyBase = snap("1", { evm_chains: [{ chain_id: 11155111, wei: "0", usdc: "0" }, { chain_id: 84532, wei: "1", usdc: "0" }] });
    const onlyUsdc = snap("1", { evm_chains: [{ chain_id: 11155111, wei: "0", usdc: "5" }] });
    const nothing = snap("1", { evm_chains: [{ chain_id: 11155111, wei: "0", usdc: "0" }] });
    expect([allZero(onlyBase), allZero(onlyUsdc), allZero(nothing)]).toEqual([false, false, true]);
    expect(anyEvmFunds(onlyBase)).toBe(true);
  });
});

describe("C7: message records in the clean history never block Buy", () => {
  it("#2's record (BTC, USDC, Base Sepolia, a message) is clean; the message item says message", () => {
    const r = fixtureCleanReport("2", FIXTURE_RECORDS["2"]!, LOCKED, null, "browser");
    expect(r.aggregate).toBe("clean");
    expect(r.items.map((i) => i.status)).toEqual(["spent", "spent", "spent", "message"]);
    expect(r.items[3]).toMatchObject({ key: "Ethereum · message", message: { kind: "evm_message", text: FIXTURE_C2.msg.text } });
    expect(r.items[1].wouldPay).toBe(`Would send 1.50${NBSP}USDC to 0x6173…28be`);
    expect(r.items[2].key).toBe("Base Sepolia · nonce 0");
    expect(counts(r.items).message).toBe(1);
  });

  it("matches core's checkMessages exactly (valid, tampered payload, wrong key)", () => {
    const rec = FIXTURE_RECORDS["2"]![3]!;
    const cases = [rec, { ...rec, payload: "00".repeat(32) }, { ...rec, chain: "sol" as const }];
    for (const c of cases) {
      const core = checkMessages([c as never])[0]!;
      expect(messageItem(c).status).toBe(core.status);
    }
    expect(messageItem(cases[1]!).status).toBe("unknown"); // fail closed: blocks Buy
  });

  it("aggregate: message never blocks; unknown, unused and settling still do", () => {
    const run = (statuses: string[]) => aggregate({ sigCount: statuses.length, items: statuses.map((s) => ({ status: s as never })), accountChecksOk: true, lockOk: true, codeOk: true, role: "final" }).aggregate;
    expect(run(["message"])).toBe("clean");
    expect(run(["spent", "message"])).toBe("clean");
    expect(run(["message", "unused"])).toBe("blocked");
    expect(run(["message", "settling"])).toBe("settling");
    expect(run(["message", "unknown"])).toBe("unknown");
  });
});

describe("Activity: sign_requested events (docs/specs/C1-C2-C3-C7.md §4.3)", () => {
  const base = { tx: "t", block: 1, timestampMs: 1 };
  it("a message event becomes a message row with the record's text", () => {
    const row = signRow(base, { chain: "evm", details: [{ seq: 3, kind: "evm_message" }] }, FIXTURE_RECORDS["2"]!);
    expect(row).toMatchObject({ kind: "message", chain: "evm", status: "message", messageText: FIXTURE_C2.msg.text });
  });
  it("a USDC transfer names the token, the recipient, the amount and the chain", () => {
    const row = signRow(base, { chain: "evm", details: [{ seq: 1, chain_id: 84532, nonce: 0, erc20: { token: "036c", to: "61739f33adbb7f76c1b5b222e4119085257528be", amount: "1500000" } }] }, []);
    expect(row).toMatchObject({ kind: "issued", token: "USDC", amount: "1500000", to: "0x61739f33adbb7f76c1b5b222e4119085257528be", evmChainId: 84532 });
  });
});

describe("Activity from live events (round two R2-01, R2-03)", () => {
  const rec = (seq: number, requester: string) =>
    ({ seq, request_id: seq, input_index: 0, chain: "evm", height: 10 + seq, timestamp_ms: 1, requester, payload: "00", status: "resolved", signature: null, detail: { evm: { chain_id: 11155111, nonce: seq, to: "0x00", value: "1" } } }) as unknown as SigRecordView;
  const ev = (event: string, block: number, data: Record<string, unknown>) => ({ tx: `t${block}`, block, timestampMs: block, standard: "satchel", event, data });
  const evs = [
    ev("nft_mint", 1, { owner_id: "alice.testnet", token_ids: ["1"] }),
    ev("sign_requested", 2, { token_id: "1", chain: "evm", first_seq: 0 }), // the owner herself
    ev("sign_requested", 3, { token_id: "1", chain: "evm", first_seq: 1 }), // a delegate
    ev("nft_transfer", 4, { token_ids: ["1"], old_owner_id: "alice.testnet", new_owner_id: "bob.testnet" }),
    ev("sign_requested", 5, { token_id: "1", chain: "evm", first_seq: 2 }), // alice again, no longer the owner
    ev("offer_accepted", 6, { offer_id: 3, token_id: "1", seller_id: "bob.testnet", buyer_id: "carol.testnet", amount: "2000000", currency: "usdc" }),
  ];
  const records = [rec(0, "alice.testnet"), rec(1, "dave.testnet"), rec(2, "alice.testnet")];
  const rows = liveActivityRows(evs, records);

  it("a delegate's signature names the delegate, read from the record (the event doesn't carry it)", () => {
    expect(rows[2]).toMatchObject({ kind: "issued", requester: "dave.testnet" });
  });
  it("the owner's own signature names nobody", () => {
    expect(rows[1]!.kind).toBe("issued");
    expect(rows[1]!.requester).toBeUndefined();
  });
  it("the owner is the one at the time: a former owner's later signature names them", () => {
    expect(rows[4]).toMatchObject({ kind: "issued", requester: "alice.testnet" });
  });
  it("an accepted offer reads as a sale with its price and buyer", () => {
    expect(rows[5]).toMatchObject({ kind: "sold", to: "carol.testnet", price: "2000000", currency: "usdc" });
  });
  it("events newest first give the same rows", () => {
    expect(liveActivityRows([...evs].reverse(), records).reverse()).toEqual(rows);
  });
});
