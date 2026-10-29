import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddressDisplay, addressGroups } from "@/components/AddressDisplay";
import { networkShort } from "@/components/ChainRow";
import { hashGroups } from "@/components/Facts";
import { dayGroups, dayKey, groupDigits, pageRows, Timeline, utcClock, utcDay, utcLong, utcShort } from "@/components/Timeline";
import { incomingLines } from "@/components/client/Incoming";
import { copy } from "@/lib/copy";
import type { ActivityRow } from "@/lib/data/types";
import { NBSP } from "@/lib/format";

/**
 * The Satchel object page's pure pieces (package S): grouped addresses and hashes, the UTC formats, Activity's day groups
 * and paging, the Incoming words, and the server markup of the record (real text, chevrons, no hidden facts).
 */

const BTC = "tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5";
const EVM = "0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad";
const SOL = "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd";

describe("addresses in 4-character groups (app-screens §0 #8)", () => {
  it.each([BTC, EVM, SOL])("%s: groups join back to the address; the first two and the last are the key groups", (a) => {
    const g = addressGroups(a);
    expect(g.map((x) => x.text).join("")).toBe(a);
    expect(g.every((x, i) => (i < g.length - 1 ? x.text.length === 4 : x.text.length >= 1 && x.text.length <= 4))).toBe(true);
    expect(g.filter((x) => x.key).map((x) => x.text)).toEqual([g[0].text, g[1].text, g[g.length - 1].text]);
  });
  it("the grouped markup has no separator: its text is the raw address, and it carries data-full-address", () => {
    const html = renderToStaticMarkup(createElement(AddressDisplay, { address: BTC, fullAttr: "btc", size: "md" }));
    expect(html).toContain('data-full-address="btc"');
    expect(html.replace(/<[^>]+>/g, "")).toBe(BTC);
    // each group is one unbreakable span, so a line only ever breaks between groups
    expect(html.match(/whitespace-nowrap/g)).toHaveLength(addressGroups(BTC).length);
  });
  it("a truncated address keeps the full value as its name", () => {
    const html = renderToStaticMarkup(createElement(AddressDisplay, { address: EVM, mode: "truncated" }));
    expect(html).toContain(`aria-label="${EVM}"`);
    expect(html).toContain("0xD0Cd…d5ad");
  });
});

describe("code hash and digits", () => {
  it("splits a 64-hex hash into eight 8-character groups", () => {
    const h = "c1b4f8e97fade5c74ab3d91c7fa3db579b20b28fe42b3fa13a769f135435d692";
    expect(hashGroups(h)).toHaveLength(8);
    expect(hashGroups(h).join("")).toBe(h);
    expect(hashGroups(h)[0]).toBe("c1b4f8e9");
  });
  it("groups digits with commas", () => {
    expect(groupDigits(274240000)).toBe("274,240,000");
    expect(groupDigits("999")).toBe("999");
  });
});

describe("UTC formats (deterministic: no locale data, the same on the server and in every browser)", () => {
  const ms = Date.UTC(2026, 9, 20, 2, 40, 5);
  it("day, clock, short, long", () => {
    expect(utcDay(ms)).toBe("Oct 20");
    expect(utcClock(ms)).toBe("02:40 UTC");
    expect(utcShort(ms)).toBe("Oct 20, 02:40 UTC");
    expect(utcLong(ms)).toBe("Oct 20, 2026, 02:40:05 UTC");
    expect(dayKey(ms)).toBe("2026-10-20");
    expect(dayKey(null)).toBe("unknown");
  });
});

describe("Activity: day groups and Show older", () => {
  const at = (d: number, h: number) => Date.UTC(2026, 9, d, h);
  const rows = [
    { block: 50, timestampMs: at(20, 10) },
    { block: 40, timestampMs: at(20, 2) },
    { block: 30, timestampMs: at(19, 22) },
    { block: 30, timestampMs: at(19, 22) },
    { block: 20, timestampMs: null },
  ];
  it("groups consecutive rows by their UTC day, newest first", () => {
    expect(dayGroups(rows).map((g) => [g.day, g.rows.length])).toEqual([
      ["2026-10-20", 2],
      ["2026-10-19", 2],
      ["unknown", 1],
    ]);
  });
  it("pages by block, never splitting a block, with a cursor for the next page", () => {
    expect(pageRows(rows, null, 10)).toEqual({ rows, next: null });
    const p1 = pageRows(rows, null, 3); // the third row's block (30) continues on the fourth: both stay on page 1
    expect(p1.rows.map((r) => r.block)).toEqual([50, 40, 30, 30]);
    expect(p1.next).toBe(30);
    const p2 = pageRows(rows, p1.next, 3);
    expect(p2.rows.map((r) => r.block)).toEqual([20]);
    expect(p2.next).toBeNull();
    expect(pageRows(rows, 45, 1)).toEqual({ rows: [rows[1]], next: 40 });
  });
});

describe("the network under a chain's name", () => {
  it("drops the chain's own name", () => {
    expect(networkShort("btc")).toBe("testnet4");
    expect(networkShort("evm")).toBe("Sepolia");
    expect(networkShort("sol")).toBe("devnet");
  });
});

describe("Add coins: the Incoming words (app-screens §8)", () => {
  it("waiting, in the mempool, received", () => {
    expect(incomingLines("waiting", "btc", "1", 0n, 189718n)).toEqual({ title: "Waiting for coins…", help: copy.fund.incoming.waitingHelp });
    expect(incomingLines("mempool", "btc", "1", 100000n, 189718n)).toEqual({ title: `+0.0010${NBSP}BTC · in mempool`, help: "It counts once it has 1 confirmation." });
    expect(incomingLines("received", "btc", "1", 100000n, 289718n)).toEqual({ title: `Received 0.0010${NBSP}BTC`, help: `Satchel #1 now holds 0.00289718${NBSP}BTC.` });
  });
});

/** Three fixture-shaped rows: a BTC send, an unused EVM signature (Satchel #4's), the mint. */
const RECORD: ActivityRow[] = [
  { kind: "sent", tx: "CWvZ71xZuwVVjr3Ltg1pGo7AfFJ41bbSFuC4DSFXC3b4", block: 274240000, timestampMs: Date.UTC(2026, 9, 20, 2, 40), chain: "btc", amount: "10000", to: "tb1qaanvpz7r4c5u9yqd8m3yfk8yh2k7c5gzky8sd", fee: "282", chainTxId: "6be65f5e8e78aebc6c2946600d83cf14a3042bc35e4d1d382abca955fc88c165", status: "final" },
  { kind: "issued", tx: "DmmynatTNfTePHtCehhwfZn5VdK8ceuK2diFWQ6RoPJz", block: 274288000, timestampMs: Date.UTC(2026, 9, 20, 10, 8), chain: "evm", amount: "2000000000000000", to: "0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741", status: "unused" },
  { kind: "minted", tx: "GUEiMpKrm2DDLHdEw1Cz5263WRC8ma4YVZ931BfJircw", block: 274140000, timestampMs: Date.UTC(2026, 9, 19, 11, 6), from: "alice.satchelhq.testnet" },
];

describe("the record's server markup", () => {
  const html = renderToStaticMarkup(createElement(Timeline, { rows: RECORD }));
  it("renders each row as a details/summary with a visible chevron, the title, the network and the UTC time", () => {
    expect(html.match(/<details/g)).toHaveLength(RECORD.length);
    // the shortened address is one unbreakable unit (KeepWhole), so compare the text
    expect(html.replace(/<[^>]+>/g, "")).toContain("Sent to tb1qaanv…y8sd");
    expect(html).toContain('<span class="inline-block max-w-full">tb1qaanv…y8sd</span>');
    expect(html).toContain("Bitcoin testnet4 · ");
    expect(html).toMatch(/<time[^>]*>\d\d:\d\d UTC<\/time>/);
    expect(html).toContain("lucide-chevron-down");
    expect(html).toContain(`−0.0001${NBSP}BTC`);
  });
  it("puts the full UTC stamp, the fee and the links in the receipt", () => {
    expect(html).toMatch(/Oct \d+, 2026, \d\d:\d\d:\d\d UTC/);
    expect(html).toContain(`282${NBSP}sats`);
    expect(html).toContain("View on NearBlocks");
    expect(html).toContain("View on mempool.space");
  });
  it("labels an unused signature, and says what it would send", () => {
    expect(html).toContain('data-item-status="unused"');
    expect(html).toContain(copy.act.detail.unusedNote);
    expect(html).toContain("Would send");
  });
  it("uses the 2.0 words and hides nothing", () => {
    expect(html).toContain("Minted by alice.satchelhq.testnet");
    expect(html).not.toMatch(/\shidden[\s>=]/);
    expect(html).not.toContain("Transferred");
  });
});
