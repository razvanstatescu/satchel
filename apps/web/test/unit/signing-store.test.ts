import { describe, expect, it, vi } from "vitest";
import { createIntentStore, isPendingIntent, newIntentId, type KV } from "@/lib/signing/store";
import type { PendingIntent } from "@/lib/signing/types";

/**
 * `createIntentStore` (lib/signing/store.ts) is the pending-intent persistence layer: it has NO dedicated test file
 * before this one (only exercised indirectly through signing-runner.test.ts, which goes through the runner, not the
 * store's own API: upsert/dispatch/patch/remove/reload, the `isPendingIntent` localStorage-shape filter, and a
 * corrupted-storage read falling back to empty). This file covers the store directly with an injected in-memory KV.
 */

function intent(p: Partial<PendingIntent> = {}): PendingIntent {
  return {
    id: "i1",
    tokenId: "1",
    chain: "evm",
    createdAt: 0,
    contract: "satchel.satchelhq.testnet",
    sigCountBefore: 2,
    heightBefore: 1000,
    unsigned: { evmTx: "0x02f1" },
    payloadHashes: ["ab".repeat(32)],
    evmNonce: 1,
    stage: "idle",
    ...p,
  };
}

/** A KV backed by a plain object, so tests can inspect exactly what was persisted as a raw string. */
function memKv(seed?: Record<string, string>): KV {
  const m = new Map<string, string>(Object.entries(seed ?? {}));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe("isPendingIntent", () => {
  it("accepts a well-shaped intent and rejects everything else", () => {
    expect(isPendingIntent(intent())).toBe(true);
    expect(isPendingIntent(null)).toBe(false);
    expect(isPendingIntent(undefined)).toBe(false);
    expect(isPendingIntent("string")).toBe(false);
    expect(isPendingIntent(42)).toBe(false);
    expect(isPendingIntent({})).toBe(false);
    expect(isPendingIntent({ ...intent(), chain: "dogecoin" })).toBe(false);
    expect(isPendingIntent({ ...intent(), id: 5 })).toBe(false);
    expect(isPendingIntent({ ...intent(), payloadHashes: "not-an-array" })).toBe(false);
    expect(isPendingIntent({ ...intent(), sigCountBefore: "2" })).toBe(false);
  });
});

describe("createIntentStore: basic CRUD", () => {
  it("starts empty with a fresh KV, and upsert both inserts and persists synchronously", () => {
    const kv = memKv();
    const store = createIntentStore(kv);
    expect(store.getSnapshot()).toEqual([]);
    store.upsert(intent());
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.get("i1")).toMatchObject({ id: "i1", stage: "idle" });
    // persisted synchronously, not just held in memory
    expect(JSON.parse(kv.getItem("satchel:pending:v1")!)).toHaveLength(1);
  });

  it("upsert REPLACES an existing id rather than duplicating it", () => {
    const store = createIntentStore(memKv());
    store.upsert(intent({ stage: "idle" }));
    store.upsert(intent({ stage: "preparing" }));
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.get("i1")?.stage).toBe("preparing");
  });

  it("patch merges fields on an existing intent and persists; a patch on an unknown id is a no-op returning null", () => {
    const store = createIntentStore(memKv());
    store.upsert(intent());
    const patched = store.patch("i1", { error: "boom" });
    expect(patched?.error).toBe("boom");
    expect(store.get("i1")?.error).toBe("boom");
    expect(store.patch("nope", { error: "x" })).toBeNull();
    expect(store.getSnapshot()).toHaveLength(1); // the no-op didn't add a ghost entry
  });

  it("remove drops the intent and persists the smaller list", () => {
    const kv = memKv();
    const store = createIntentStore(kv);
    store.upsert(intent());
    store.remove("i1");
    expect(store.getSnapshot()).toEqual([]);
    expect(JSON.parse(kv.getItem("satchel:pending:v1")!)).toEqual([]);
  });

  it("forToken filters by tokenId only", () => {
    const store = createIntentStore(memKv());
    store.upsert(intent({ id: "a", tokenId: "1" }));
    store.upsert(intent({ id: "b", tokenId: "2" }));
    store.upsert(intent({ id: "c", tokenId: "1" }));
    expect(store.forToken("1").map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("createIntentStore: dispatch (through the state machine)", () => {
  it("dispatch on a known id runs transition() and persists only when the stage actually changes", () => {
    const kv = memKv();
    const store = createIntentStore(kv);
    store.upsert(intent({ stage: "idle" }));
    const before = kv.getItem("satchel:pending:v1");
    const next = store.dispatch("i1", { type: "SEND", now: 1 });
    expect(next?.stage).toBe("preparing");
    expect(kv.getItem("satchel:pending:v1")).not.toBe(before);
  });

  it("dispatch on an unknown id returns null and touches nothing", () => {
    const store = createIntentStore(memKv());
    expect(store.dispatch("ghost", { type: "SEND", now: 1 })).toBeNull();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("an illegal/no-op transition (e.g. SEND from a non-idle stage) is a silent no-op: no persist, no emit", () => {
    const kv = memKv();
    const store = createIntentStore(kv);
    store.upsert(intent({ stage: "confirmed" }));
    const persistedBefore = kv.getItem("satchel:pending:v1");
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    const next = store.dispatch("i1", { type: "SEND", now: 999 });
    expect(next?.stage).toBe("confirmed"); // unchanged
    expect(kv.getItem("satchel:pending:v1")).toBe(persistedBefore); // not re-persisted
    expect(listener).not.toHaveBeenCalled(); // no spurious re-render
    unsub();
  });
});

describe("createIntentStore: resume on load (page reload / new tab)", () => {
  it("a store created against a KV that already holds a persisted intent resumes it as-is", () => {
    const seeded = memKv({ "satchel:pending:v1": JSON.stringify([intent({ stage: "signing" })]) });
    const store = createIntentStore(seeded);
    expect(store.getSnapshot()).toEqual([intent({ stage: "signing" })]);
  });

  it("drops entries that don't look like a PendingIntent, keeping the well-shaped ones (a corrupted/foreign write never crashes resume)", () => {
    const seeded = memKv({
      "satchel:pending:v1": JSON.stringify([intent({ id: "good" }), { garbage: true }, null, "a string", 42]),
    });
    const store = createIntentStore(seeded);
    expect(store.getSnapshot().map((i) => i.id)).toEqual(["good"]);
  });

  it("invalid JSON in storage resumes as an empty list, not a thrown error", () => {
    const seeded = memKv({ "satchel:pending:v1": "{not json" });
    expect(() => createIntentStore(seeded)).not.toThrow();
    expect(createIntentStore(seeded).getSnapshot()).toEqual([]);
  });

  it("a non-array top-level value (e.g. an object) also resumes as empty", () => {
    const seeded = memKv({ "satchel:pending:v1": JSON.stringify({ not: "an array" }) });
    expect(createIntentStore(seeded).getSnapshot()).toEqual([]);
  });

  it("reload() re-reads storage (another tab's write) and notifies listeners", () => {
    const kv = memKv();
    const store = createIntentStore(kv);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    // simulate another tab writing a new intent directly into the same backing storage
    kv.setItem("satchel:pending:v1", JSON.stringify([intent({ id: "from-other-tab" })]));
    expect(store.getSnapshot()).toEqual([]); // not yet reflected: this store's in-memory copy is stale
    store.reload();
    expect(store.getSnapshot().map((i) => i.id)).toEqual(["from-other-tab"]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });
});

describe("createIntentStore: subscribe/emit", () => {
  it("every mutating call notifies subscribers exactly once, and unsubscribing stops further notifications", () => {
    const store = createIntentStore(memKv());
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.upsert(intent());
    expect(listener).toHaveBeenCalledTimes(1);
    store.patch("i1", { error: "x" });
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
    store.remove("i1");
    expect(listener).toHaveBeenCalledTimes(2); // no further calls after unsubscribing
  });
});

describe("newIntentId", () => {
  it("generates distinct ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => newIntentId()));
    expect(ids.size).toBe(20);
  });
});
