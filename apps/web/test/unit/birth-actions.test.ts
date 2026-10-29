import { describe, expect, it, vi } from "vitest";
import { ALICE, FIXTURE_CODE_HASH, FIXTURE_CONTRACT, FIXTURE_LOCK } from "@/lib/data/fixtures";
import { birthActions, historyClient, readBirthActions, type FastnearTx } from "@/lib/near/history";
import { KEYED_CREATION, KEYLESS_BIRTH, RECORDED_TXS } from "./fastnear-birth.fixture";

/**
 * The live `birth_actions` (kb/90 §5.16 proof 1): the contract account's creation, action by action, read from the FastNEAR
 * tx API in the fixture's format. Recorded answers (fastnear-birth.fixture.ts) and a mocked fetch: no network here.
 */

const KB2 = "kb2.satchel-spk-chain-e9ea1a.testnet";
const KB2_BIRTH = "2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR";
const HELLO = "hello.satchel-spk-sdk-e9ea1a.testnet";
const HELLO_BIRTH = "7PX6TLCddZ6vT7nCYdCjitfsKvyXEy9FryymKNiM2bLt";
const HELLO_KEY = "ed25519:49y8ocozK1BJ1Y7J4ptPCcSAAJAqNZMWg9K6UP15CKDg";
const ONE_TO_SEVEN = ["1", "2", "3", "4", "5", "6", "7"];

const b64 = (s: string) => Buffer.from(s).toString("base64");
const fc = (method_name: string, args: unknown, deposit = "0") => ({
  FunctionCall: { method_name, args: typeof args === "string" ? args : b64(JSON.stringify(args)), gas: 20_000_000_000_000, deposit },
});
const mintEvent = (...ids: string[]) =>
  `EVENT_JSON:${JSON.stringify({ standard: "nep171", version: "1.0.0", event: "nft_mint", data: [{ owner_id: ALICE, token_ids: ids }] })}`;
const addKey = (public_key: string) => ({ AddKey: { public_key, access_key: { nonce: 0, permission: "FullAccess" } } });
/** How a reader of `birth_actions` counts "keys added". */
const keysAdded = (actions: string[]) => actions.filter((a) => /^AddKey/i.test(a)).length;
type Receipt = FastnearTx["receipts"][number];

/** The recorded keyless birth with its creation receipt changed (the transaction's own action list kept in step). */
function birthWith(o: { account?: string; actions?: unknown[]; logs?: string[]; status?: unknown; extra?: Receipt[] } = {}): FastnearTx {
  const t = structuredClone(KEYLESS_BIRTH);
  const creation = t.receipts[0];
  if (o.account) t.transaction.receiver_id = creation.receipt.receiver_id = o.account;
  if (o.actions) t.transaction.actions = creation.receipt.receipt!.Action!.actions = o.actions;
  if (o.logs) creation.execution_outcome.outcome.logs = o.logs;
  if (o.status !== undefined) creation.execution_outcome.outcome.status = o.status;
  if (o.extra) t.receipts.push(...o.extra);
  return t;
}

/** Another receipt of the same transaction, applied to `account`. */
const receiptOn = (account: string, actions: unknown[], status: unknown = { SuccessValue: "" }): Receipt => ({
  receipt: { receiver_id: account, predecessor_id: account, receipt_id: "Later111", receipt: { Action: { signer_id: "satchelhq.testnet", actions } } },
  execution_outcome: { block_height: 274111789, outcome: { logs: [], status } },
});

/** Satchel's own batch (kb/90 §5.16, tests/tests/release.rs): `new {mpc, usdc, base_uri}`, then `nft_mint {receiver_id}` ×7. */
const SATCHEL_ACTIONS = [
  "CreateAccount",
  { Transfer: { deposit: "10000000000000000000000000" } },
  { DeployContract: { code: Buffer.from(FIXTURE_CODE_HASH, "hex").toString("base64") } },
  fc("new", { mpc: "v1.signer-prod.testnet", usdc: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af", base_uri: "https://satchelhq.vercel.app/api/card/" }),
  ...ONE_TO_SEVEN.map(() => fc("nft_mint", { receiver_id: ALICE }, "20000000000000000000000")),
];
/** Each Satchel `nft_mint` logs one NEP-171 `nft_mint` event; in a batch, the receipt's logs follow the action order. */
const satchelBirth = (o: Parameters<typeof birthWith>[0] = {}) => birthWith({ account: FIXTURE_CONTRACT, actions: SATCHEL_ACTIONS, logs: ONE_TO_SEVEN.map((id) => mintEvent(id)), ...o });

describe("birthActions: recorded FastNEAR answers", () => {
  it("the recorded 11-action keyless birth (2AMrb8J8…) maps in order, ids from the mint args, no AddKey", () => {
    const r = birthActions(KEYLESS_BIRTH, KB2);
    expect(r).toEqual({
      error: null,
      actions: ["CreateAccount", "Transfer", "DeployContract", "FunctionCall new_default_meta", ...ONE_TO_SEVEN.map((k) => `FunctionCall nft_mint #${k}`)],
    });
    expect(keysAdded(r.actions)).toBe(0);
  });

  it("lists the same actions a judge reads from transaction.actions (judge snippet S4)", () => {
    const kinds = KEYLESS_BIRTH.transaction.actions.map((a) => (typeof a === "string" ? a : Object.keys(a as object)[0]));
    expect(birthActions(KEYLESS_BIRTH, KB2).actions.map((a) => a.split(" ")[0])).toEqual(kinds);
  });

  it("the recorded keyed creation (7PX6TLCd…) reports its AddKey, with the key", () => {
    const r = birthActions(KEYED_CREATION, HELLO);
    expect(r).toEqual({ error: null, actions: ["CreateAccount", "Transfer", `AddKey ${HELLO_KEY}`] });
    expect(keysAdded(r.actions)).toBe(1);
  });
});

describe("birthActions: Satchel's batch", () => {
  it("nft_mint {receiver_id} takes its ids from the NEP-171 events: exactly the fixture's birth_actions", () => {
    expect(birthActions(satchelBirth(), FIXTURE_CONTRACT)).toEqual({ actions: FIXTURE_LOCK.birth_actions, error: null });
  });

  it("uses event ids only when they pair one-to-one with the calls (never a guessed number); args ids win", () => {
    const mintsOf = (t: FastnearTx) => birthActions(t, FIXTURE_CONTRACT).actions.slice(4);
    expect(mintsOf(satchelBirth({ logs: ONE_TO_SEVEN.slice(0, 6).map((id) => mintEvent(id)) }))).toEqual(Array(7).fill("FunctionCall nft_mint"));
    expect(mintsOf(satchelBirth({ logs: [mintEvent(...ONE_TO_SEVEN, "8")] }))).toEqual(Array(7).fill("FunctionCall nft_mint"));
    // one event naming all seven still pairs one-to-one; logs that aren't nep171 nft_mint are skipped
    const noisy = ["not an event", "EVENT_JSON:{oops", 'EVENT_JSON:{"standard":"satchel","event":"nft_mint","data":{"token_ids":["9"]}}', mintEvent(...ONE_TO_SEVEN)];
    expect(mintsOf(satchelBirth({ logs: noisy }))).toEqual(ONE_TO_SEVEN.map((k) => `FunctionCall nft_mint #${k}`));
    const withArgs = [...SATCHEL_ACTIONS.slice(0, 4), fc("nft_mint", { token_id: 3, receiver_id: ALICE })];
    expect(mintsOf(satchelBirth({ actions: withArgs, logs: [mintEvent("1")] }))).toEqual(["FunctionCall nft_mint #3"]);
  });

  it("a birth that contains an AddKey is reported as such, wherever in the transaction it lands", () => {
    const inBatch = birthActions(satchelBirth({ actions: [...SATCHEL_ACTIONS, addKey("ed25519:abc")] }), FIXTURE_CONTRACT);
    expect(inBatch.actions).toHaveLength(12);
    expect(inBatch.actions.at(-1)).toBe("AddKey ed25519:abc");
    expect(keysAdded(inBatch.actions)).toBe(1);
    // e.g. `new` scheduling add_full_access_key on its own account: a later receipt of the same transaction
    const later = birthActions(satchelBirth({ extra: [receiptOn(FIXTURE_CONTRACT, [addKey("ed25519:def")])] }), FIXTURE_CONTRACT);
    expect(later.actions).toEqual([...FIXTURE_LOCK.birth_actions, "AddKey ed25519:def"]);
    // a later receipt that failed added nothing
    const failed = birthActions(satchelBirth({ extra: [receiptOn(FIXTURE_CONTRACT, [addKey("ed25519:def")], { Failure: { ActionError: { index: 0 } } })] }), FIXTURE_CONTRACT);
    expect(failed.actions).toEqual(FIXTURE_LOCK.birth_actions);
  });

  it("a reverted creation, or a transaction that didn't create the account, is not its birth", () => {
    const reverted = satchelBirth({ status: { Failure: { ActionError: { index: 10, kind: { FunctionCallError: { ExecutionError: "Smart contract panicked" } } } } } });
    expect(birthActions(reverted, FIXTURE_CONTRACT)).toEqual({ actions: [], error: "creation failed" });
    expect(birthActions(satchelBirth(), "someone-else.testnet")).toEqual({ actions: [], error: "not the account's creation" });
    const plainCall = satchelBirth({ actions: [fc("nft_mint", { receiver_id: ALICE })] });
    expect(birthActions(plainCall, FIXTURE_CONTRACT)).toEqual({ actions: [], error: "not the account's creation" });
  });

  it("non-JSON args don't crash: each call keeps its method and the mint just has no id", () => {
    const odd = ["%%% not base64", b64("not json"), Buffer.from([0xff, 0xfe, 0x00]).toString("base64"), b64("null"), b64("[1,2]"), b64('{"token_id":{"x":1}}')];
    const actions = ["CreateAccount", ...odd.map((args) => fc("nft_mint", args)), { FunctionCall: { args: b64("{}") } }, { FunctionCall: { method_name: "new", args: 42 } }];
    expect(birthActions(birthWith({ actions }), KB2)).toEqual({ error: null, actions: ["CreateAccount", ...Array(6).fill("FunctionCall nft_mint"), "FunctionCall", "FunctionCall new"] });
  });

  it("an action it can't read makes the whole list unread, never a partial 'no AddKey'", () => {
    for (const bad of [{}, { AddKey: {}, Transfer: {} }, 42, null, ["AddKey"], "add_key"]) {
      expect(birthActions(birthWith({ actions: [...SATCHEL_ACTIONS, bad] }), KB2)).toEqual({ actions: [], error: "unexpected action shape" });
    }
  });

  it("a missing transaction or receipt list is unread", () => {
    expect(birthActions(undefined, KB2)).toEqual({ actions: [], error: "transaction not found" });
    expect(birthActions({ ...KEYLESS_BIRTH, receipts: null as never }, KB2)).toEqual({ actions: [], error: "transaction not found" });
  });
});

describe("readBirthActions (mocked fetch)", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const mock = (impl: (url: string, init: RequestInit) => Promise<Response>) => vi.fn(impl);
  const client = (f: ReturnType<typeof mock>, timeoutMs = 1500) =>
    historyClient({ base: "https://tx.test.fastnear.com", apiKey: "test-key", fetchImpl: f as unknown as typeof fetch, timeoutMs });

  it("POSTs the hash to /v0/transactions (key as a Bearer header) and maps the answer", async () => {
    const f = mock(async () => json(RECORDED_TXS));
    const r = await readBirthActions(client(f), KB2, KB2_BIRTH);
    expect(r).toEqual(birthActions(KEYLESS_BIRTH, KB2));
    expect(r.actions).toHaveLength(11);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://tx.test.fastnear.com/v0/transactions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ tx_hashes: [KB2_BIRTH] });
    expect(init.headers).toMatchObject({ "content-type": "application/json", authorization: "Bearer test-key" });
  });

  it("picks the transaction by hash from the answer", async () => {
    const r = await readBirthActions(client(mock(async () => json(RECORDED_TXS))), HELLO, HELLO_BIRTH);
    expect(r).toEqual({ error: null, actions: ["CreateAccount", "Transfer", `AddKey ${HELLO_KEY}`] });
  });

  it("an API failure is [] plus the reason, and never throws", async () => {
    const cases: [ReturnType<typeof mock>, string][] = [
      [mock(async () => json({ error: "Service Unavailable" }, 503)), "fastnear /v0/transactions 503"],
      [mock(async () => json({ error: "Bad request", message: "Too many transactions requested. Limit is 20" }, 400)), "fastnear /v0/transactions 400"],
      [mock(async () => Promise.reject(new TypeError("fetch failed"))), "transaction API error"],
      [mock(async () => new Response("<html>bad gateway</html>", { status: 200 })), "transaction API error"],
      [mock(async () => json({ transactions: 5 })), "transaction API error"],
      [mock(async () => json({ transactions: [] })), "transaction not found"],
      [mock(async () => json({})), "transaction not found"],
      [mock(async () => json({ transactions: [null, { transaction: { hash: KB2_BIRTH } }] })), "transaction not found"],
    ];
    for (const [f, error] of cases) await expect(readBirthActions(client(f), KB2, KB2_BIRTH)).resolves.toEqual({ actions: [], error });
  });

  it("a hung request settles at the budget, whether or not fetch honours the abort", async () => {
    const ignoresAbort = mock(() => new Promise<Response>(() => {}));
    const t0 = performance.now();
    await expect(readBirthActions(client(ignoresAbort, 60_000), KB2, KB2_BIRTH, 40)).resolves.toEqual({ actions: [], error: "timed out" });
    expect(performance.now() - t0).toBeLessThan(1_000);
    const honoursAbort = mock((_url, init) => new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    await expect(readBirthActions(client(honoursAbort, 20), KB2, KB2_BIRTH, 60_000)).resolves.toEqual({ actions: [], error: "timed out" });
  });

  it("no birth hash: no request, unread", async () => {
    const f = mock(async () => json(RECORDED_TXS));
    await expect(readBirthActions(client(f), KB2, null)).resolves.toEqual({ actions: [], error: "no birth transaction" });
    expect(f).not.toHaveBeenCalled();
  });
});
