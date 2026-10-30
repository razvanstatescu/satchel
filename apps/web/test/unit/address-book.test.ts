import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeWindow } from "./fake-window";

/** The address book (lib/address-book.ts): kinds kept apart, one EVM entry for every EVM testnet, kept in this browser. */

let restore: () => void;
beforeEach(() => {
  restore = installFakeWindow();
  vi.resetModules();
});
afterEach(() => restore());

const load = () => import("@/lib/address-book");

const BTC = "tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5";
const EVM = "0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad";
const SOL = "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd";

describe("detectKinds", () => {
  it("knows each chain's address format", async () => {
    const { detectKinds } = await load();
    expect(detectKinds(BTC)).toEqual(["btc"]);
    expect(detectKinds(EVM)).toEqual(["evm"]);
    expect(detectKinds(SOL)).toEqual(["sol"]);
    expect(detectKinds("bob.satchelhq.testnet")).toEqual(["near"]);
    expect(detectKinds("a".repeat(64))).toContain("near");
    expect(detectKinds("hello")).toEqual([]);
    expect(detectKinds("0x1234")).toEqual([]);
  });

  it("is genuinely ambiguous for a legacy base58 BTC-testnet-shaped address that is ALSO a valid-shaped SOL address (both listed; the add form resolves it, not this function)", async () => {
    const { detectKinds } = await load();
    // starts with 'n' (btc legacy testnet prefix) and is 33 base58 chars: fits both regexes.
    const ambiguous = "n4BJRYfnu29GPWdksz7EMUbiqx5CKSZgo";
    expect(detectKinds(ambiguous)).toEqual(["btc", "sol"]);
  });

  it("recognises a MAINNET-shaped bech32 BTC address as 'btc' too: this function is a label guesser, not a network gate — validateBtc (lib/validate.ts) is the one that actually rejects mainnet prefixes at send time", async () => {
    const { detectKinds } = await load();
    expect(detectKinds("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")).toEqual(["btc"]);
  });

  it("recognises a bare 64-hex NEAR implicit account", async () => {
    const { detectKinds } = await load();
    const implicit = "a".repeat(64);
    expect(detectKinds(implicit)).toEqual(["near"]);
  });

  it("trims surrounding whitespace before testing, and rejects an empty/whitespace-only string", async () => {
    const { detectKinds } = await load();
    expect(detectKinds(`  ${BTC}  `)).toEqual(["btc"]);
    expect(detectKinds("   ")).toEqual([]);
    expect(detectKinds("")).toEqual([]);
  });

  it("rejects a NEAR account that starts or ends with a separator, or is a single character", async () => {
    const { detectKinds } = await load();
    expect(detectKinds("-bob.testnet")).toEqual([]);
    expect(detectKinds("bob-.testnet")).toEqual([]);
    expect(detectKinds("a")).toEqual([]);
  });
});

describe("the book", () => {
  it("saves once per kind and address (case-insensitive for EVM), renaming instead of duplicating", async () => {
    const { saveAddress, findEntry, entriesFor } = await load();
    saveAddress("evm", EVM, "Cold wallet");
    saveAddress("evm", EVM.toLowerCase(), "Cold");
    const list = JSON.parse(window.localStorage.getItem("satchel:address-book:v1")!);
    expect(list).toHaveLength(1);
    expect(findEntry(list, "evm", EVM.toUpperCase().replace("0X", "0x"))?.alias).toBe("Cold");
    expect(entriesFor(list, "btc")).toEqual([]);
  });

  it("each context sees only its own kind; the last picked comes first", async () => {
    const { saveAddress, touchEntry, entriesFor } = await load();
    saveAddress("btc", BTC, "Mom", 1);
    saveAddress("sol", SOL, "Phantom", 2);
    const a = saveAddress("evm", EVM, "", 3);
    const b = saveAddress("evm", "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a", "Exchange", 4);
    let list = JSON.parse(window.localStorage.getItem("satchel:address-book:v1")!);
    expect(entriesFor(list, "evm").map((e: { id: string }) => e.id)).toEqual([b.id, a.id]); // named first
    touchEntry(a.id, 10);
    list = JSON.parse(window.localStorage.getItem("satchel:address-book:v1")!);
    expect(entriesFor(list, "evm").map((e: { id: string }) => e.id)).toEqual([a.id, b.id]); // last used first
    expect(entriesFor(list, "sol").map((e: { alias: string }) => e.alias)).toEqual(["Phantom"]);
  });

  it("renames and removes", async () => {
    const { saveAddress, renameEntry, removeEntry } = await load();
    const e = saveAddress("near", "bob.testnet");
    renameEntry(e.id, "  Bob  ");
    expect(JSON.parse(window.localStorage.getItem("satchel:address-book:v1")!)[0].alias).toBe("Bob");
    removeEntry(e.id);
    expect(JSON.parse(window.localStorage.getItem("satchel:address-book:v1")!)).toEqual([]);
  });

  it("survives broken storage: an unreadable value reads as an empty book", async () => {
    window.localStorage.setItem("satchel:address-book:v1", "{not json");
    const { saveAddress } = await load();
    expect(saveAddress("btc", BTC).address).toBe(BTC);
  });
});
