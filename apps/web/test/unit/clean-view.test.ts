import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GateLine,
  Record,
  STRIP_MAX,
  Verdict,
  buyButtonModel,
  checkedAgo,
  gateModel,
  hintModel,
  itemPhrase,
  listedAgo,
  marketOrder,
  recordRows,
  revealSchedule,
  rowEvidence,
  stripModel,
  verdictAllowsBuy,
  verdictModel,
  type MarkStatus,
} from "@/components/Clean";
import { copy } from "@/lib/copy";
import { fixtureCleanReport } from "@/lib/data/clean";
import { FIXTURE_RECORDS } from "@/lib/data/fixtures";
import type { Aggregate, CleanReport, LockFacts } from "@/lib/data/types";
import { NBSP } from "@/lib/format";

/**
 * The clean-history view models (Satchel 2.0, app-screens §5.1, motion-spec §9): the gate line, the verdict, the strip,
 * the Buy button and the market's hint. The headline rule: only the buyer's BROWSER check enables Buy, and the server's
 * check is always labelled as the server's (inventory 5.1.6a, d, e).
 */

const LOCKED: LockFacts = { access_keys: 0, account_exists: true, locked: true, code_hash_hex: "aa", expected_code_hash: "aa", code_matches: true, birth_tx: "B", birth_block: 274_140_000 };
const report = (id: string, listing: number | null = null): CleanReport => fixtureCleanReport(id, FIXTURE_RECORDS[id], LOCKED, listing, "browser");
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const AGGS: Aggregate[] = ["checking", "empty", "clean", "settling", "blocked", "unknown", "unsafe"];

describe("the gate line (aria-describedby of Buy)", () => {
  it("the server's hint waits for the browser; checking spins; a browser result names its state", () => {
    const hint = gateModel("hint", report("3"), "2 min ago");
    expect(hint).toMatchObject({ gate: "checking", tone: "muted", text: "Waiting for your browser's check" });
    expect(gateModel("checking", null, "")).toMatchObject({ gate: "checking", tone: "frozen", spin: true, text: "Checking history…" });
    expect(gateModel("browser", report("3"), "just now")).toMatchObject({ gate: "clean", tone: "success", text: "Clean history · checked just now" });
    expect(gateModel("browser", report("4"), "8 s ago")).toMatchObject({ gate: "blocked", tone: "danger", text: "Blocked: 1 unused signature" });
    expect(gateModel("browser", report("6"), "8 s ago").gate).toBe("empty");
  });
});

describe("the verdict", () => {
  it("hint mode never claims a browser check (inventory 5.1.6a) and words every aggregate", () => {
    for (const agg of AGGS) {
      const r = { ...report("3"), aggregate: agg };
      const v = verdictModel({ mode: "hint", report: r, sigCount: 1, t: "2 min ago" });
      expect(v.title).toBe("Waiting for your browser's check");
      expect(v.checked).toBeNull();
      expect(v.sub).toContain("The server");
      expect(v.sub).not.toMatch(/checked in your browser/i);
      expect(v.sub).toContain("2 min ago");
    }
    expect(verdictModel({ mode: "hint", report: null, sigCount: 1, t: "" }).sub).toBe(copy.clean.waitingBody);
  });

  it("a browser result says where it ran and when; blocked points at the signature", () => {
    const clean = verdictModel({ mode: "browser", report: report("3"), sigCount: 1, t: "8 s ago" });
    expect(clean).toMatchObject({ aggregate: "clean", tone: "success", title: "Clean. No past signature can move these coins.", sub: null, checked: "Checked in your browser 8 s ago" });
    expect(clean.strip?.label).toBe("1 of 1 can't move coins");
    const blocked = verdictModel({ mode: "browser", report: report("4"), sigCount: 1, t: "8 s ago" });
    expect(blocked).toMatchObject({ aggregate: "blocked", tone: "danger", action: "see-signature", target: 0 });
    expect(blocked.title).toBe("1 past signature could still move coins.");
    // the key and the evidence as one phrase, the nonce said once (QA-POLISH #3)
    expect(blocked.sub).toBe("Ethereum · nonce 1 isn't used yet. The seller has to clear it first.");
    expect(blocked.strip?.label).toBe("1 of 1 could still move coins");
    const empty = verdictModel({ mode: "browser", report: report("6"), sigCount: 0, t: "8 s ago" });
    expect(empty).toMatchObject({ title: "This Satchel has never signed anything.", strip: null });
  });

  it("confirming waits and says it checks again; unknown offers Check again; unsafe has no strip", () => {
    const r = report("5");
    const settling = verdictModel({ mode: "browser", report: { ...r, aggregate: "settling", items: [{ ...r.items[0], status: "settling" }] }, sigCount: 1, t: "8 s ago" });
    expect(settling).toMatchObject({ title: "1 signature is still confirming.", again: true, tone: "frozen" });
    expect(settling.sub).toMatch(/^Spent in .+\. Buy turns on once it confirms\.$/);
    const unknown = verdictModel({ mode: "browser", report: { ...r, aggregate: "unknown", items: [{ ...r.items[0], status: "unknown", evidence: "No provider answered" }] }, sigCount: 1, t: "8 s ago" });
    expect(unknown).toMatchObject({ title: "Can't verify 1 signature right now.", action: "check-again", tone: "muted" });
    expect(unknown.strip?.label).toBe("1 can't be checked yet");
    const unsafe = verdictModel({ mode: "browser", report: { ...r, aggregate: "unsafe", unsafe_reason: "code" }, sigCount: 1, t: "8 s ago" });
    expect(unsafe).toMatchObject({ title: "Unsafe: the contract code doesn't match the published build.", strip: null, tone: "danger" });
  });

  it("checking: one marker per signature, revealed in list order", () => {
    const r = report("1");
    const before = verdictModel({ mode: "checking", report: null, sigCount: 2, t: "" });
    expect(before.title).toBe("Checking 2 past signatures…");
    expect(before.strip?.markers.map((m) => m.status)).toEqual(["checking", "checking"]);
    expect(before.strip?.label).toBe("Checking 1 of 2");
    const half = verdictModel({ mode: "checking", report: r, sigCount: 2, revealed: 1, t: "" });
    expect(half.strip?.markers.map((m) => m.status)).toEqual(["spent", "checking"]);
    expect(half.strip?.label).toBe("Checking 2 of 2");
    expect(verdictModel({ mode: "checking", report: null, sigCount: 1, t: "" }).title).toBe("Checking 1 past signature…");
    expect(verdictModel({ mode: "checking", report: null, sigCount: 0, t: "" }).title).toBe("Checking its history…");
  });

  it("renders honestly as server HTML: the hint has the trust line and no browser freshness", () => {
    const hint = renderToStaticMarkup(createElement(Verdict, { model: verdictModel({ mode: "hint", report: report("4"), sigCount: 1, t: "2 min ago" }) }));
    const t = text(hint);
    expect(t).toContain("Waiting for your browser's check");
    expect(t).toContain(copy.clean.trust);
    expect(t).not.toMatch(/checked in your browser/i);
    expect(hint).toContain('id="clean-history"');
    expect(hint).toContain('data-mode="hint"');
    expect(hint).not.toContain('role="status"'); // not a live region: the freshness ticks every second
    const browser = text(renderToStaticMarkup(createElement(Verdict, { model: verdictModel({ mode: "browser", report: report("3"), sigCount: 1, t: "8 s ago" }) })));
    expect(browser).toContain("Checked in your browser 8 s ago");
    expect(browser).toContain(copy.clean.trust);
  });

  it("the gate line carries data-gate and its words", () => {
    const html = renderToStaticMarkup(createElement(GateLine, { id: "gate-line", model: gateModel("browser", report("4"), "8 s ago") }));
    expect(html).toContain('data-gate="blocked"');
    expect(html).toContain('id="gate-line"');
    expect(text(html)).toBe("Blocked: 1 unused signature");
  });
});

describe("the strip", () => {
  it("shows 12 markers at most, then +n", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ seq: i, status: "spent" as MarkStatus }));
    const s = stripModel(many, "clean");
    expect(s?.markers).toHaveLength(STRIP_MAX);
    expect(s?.more).toBe(3);
    expect(s?.label).toBe("15 of 15 can't move coins");
    expect(stripModel([], "empty")).toBeNull();
    expect(stripModel(many, "unsafe")).toBeNull();
  });
  it("counts what can't move coins (unfunded and not-its-coin included) and what still can", () => {
    const mixed: { seq: number; status: MarkStatus }[] = [
      { seq: 0, status: "spent" },
      { seq: 1, status: "unfunded" },
      { seq: 2, status: "foreign" },
      { seq: 3, status: "expired" },
    ];
    expect(stripModel(mixed, "clean")?.label).toBe("4 of 4 can't move coins");
    expect(stripModel([...mixed, { seq: 4, status: "unused" }], "blocked")?.label).toBe("1 of 5 could still move coins");
    expect(stripModel([...mixed, { seq: 4, status: "settling" }], "settling")?.label).toBe("1 confirming");
  });
});

describe("Buy (only the browser's check enables it)", () => {
  const price = `5.00${NBSP}USDC`;
  it("not buyable: always 'Buy for …', disabled, even signed out (never Connect on a blocked listing, 5.1.6d)", () => {
    for (const ready of [true, false]) for (const signedIn of [true, false]) {
      expect(buyButtonModel({ phase: "idle", buyable: false, ready, signedIn, price })).toEqual({ label: `Buy for ${price}`, enabled: false, busy: false, connect: false });
    }
  });
  it("buyable: Connect when signed out, Buy when signed in; busy phases are disabled and busy", () => {
    expect(buyButtonModel({ phase: "idle", buyable: true, ready: true, signedIn: false, price })).toEqual({ label: "Connect NEAR wallet", enabled: true, busy: false, connect: true });
    expect(buyButtonModel({ phase: "idle", buyable: true, ready: true, signedIn: false, price, connecting: true })).toEqual({ label: "Connecting…", enabled: false, busy: true, connect: true });
    expect(buyButtonModel({ phase: "idle", buyable: true, ready: true, signedIn: true, price })).toMatchObject({ label: `Buy for ${price}`, enabled: true });
    expect(buyButtonModel({ phase: "refunded", buyable: true, ready: true, signedIn: true, price })).toMatchObject({ enabled: true });
    expect(buyButtonModel({ phase: "recheck", buyable: true, ready: true, signedIn: true, price })).toEqual({ label: "Re-checking history…", enabled: false, busy: true, connect: false });
    expect(buyButtonModel({ phase: "wallet", buyable: true, ready: true, signedIn: true, price })).toMatchObject({ label: "Approve in your wallet…", busy: true });
    expect(buyButtonModel({ phase: "buying", buyable: true, ready: true, signedIn: true, price })).toMatchObject({ label: "Buying…", busy: true });
  });
  it("the server's hint never allows buying; a browser result only when clean or empty", () => {
    expect(verdictAllowsBuy("hint", report("3"))).toBe(false);
    expect(verdictAllowsBuy("checking", report("3"))).toBe(false);
    expect(verdictAllowsBuy("browser", report("3"))).toBe(true);
    expect(verdictAllowsBuy("browser", report("6"))).toBe(true);
    expect(verdictAllowsBuy("browser", report("4"))).toBe(false);
    for (const agg of ["settling", "unknown", "unsafe", "checking"] as const) expect(verdictAllowsBuy("browser", { aggregate: agg })).toBe(false);
  });
});

describe("timing and freshness", () => {
  it("rows resolve 220 ms apart, the verdict 320 ms after the last, Buy rises 160 ms later (motion-spec §9)", () => {
    expect(revealSchedule(3)).toEqual({ items: [0, 220, 440], verdict: 760, rise: 920 });
    expect(revealSchedule(1)).toEqual({ items: [0], verdict: 320, rise: 480 });
    expect(revealSchedule(0)).toEqual({ items: [], verdict: 320, rise: 480 });
  });
  it("'just now' under 5 s; a listing's age comes from block heights (no clock)", () => {
    expect(checkedAgo(10_000, 13_000)).toBe("just now");
    expect(checkedAgo(10_000, 18_000)).toBe(`8${NBSP}s ago`);
    expect(listedAgo(1_000_500, 1_000_000, 560)).toBe(`4${NBSP}min ago`);
    expect(listedAgo(null, 1_000_000, 560)).toBeNull();
    expect(listedAgo(999_000, 1_000_000, 560)).toBeNull();
  });
});

describe("the market (server hint, labelled as the server's)", () => {
  it("one line per listing: 'Server check {t}: {word}', never a browser claim", () => {
    expect(hintModel("clean", "2 min ago")).toMatchObject({ gate: "clean", tone: "success", text: "Server check 2 min ago: clean", word: "clean" });
    expect(hintModel("blocked", "2 min ago")).toMatchObject({ gate: "blocked", tone: "danger", text: "Server check 2 min ago: needs attention" });
    for (const agg of AGGS) expect(hintModel(agg, "1 h ago").text).toMatch(/^Server check 1 h ago: /);
    expect(copy.market.meta(3, 1)).toBe("Listing #3 · 1 signature");
  });
  it("buyable first, blocked and unsafe last, newest first within", () => {
    const e = (id: string, aggregate: Aggregate | null, listed_at: number) => ({ id, hint: aggregate ? { aggregate } : null, listing: { listed_at } });
    const order = marketOrder([e("4", "blocked", 9), e("3", "clean", 1), e("5", "clean", 5), e("8", "unsafe", 10), e("9", "settling", 3), e("10", null, 2)]).map((x) => x.id);
    expect(order).toEqual(["5", "3", "9", "10", "8", "4"]);
  });
});

describe("the record", () => {
  it("rows reveal in order; the disclosure promises only after a clean browser check, and always keeps the disclosure text", () => {
    const r = report("1");
    expect(recordRows(r.items, 1).map((x) => x.status)).toEqual(["spent", "checking"]);
    const promise = text(renderToStaticMarkup(createElement(Record, { report: r, rows: recordRows(r.items), tokenId: "1", promise: true })));
    expect(promise).toContain(copy.proof.cleanTip);
    expect(promise).toContain(copy.clean.disclosure);
    expect(promise).toContain("Can't move coins (2)");
    const neutral = text(renderToStaticMarkup(createElement(Record, { report: report("4"), rows: recordRows(report("4").items), tokenId: "4", promise: false, hintLine: "Server check 2 min ago: needs attention" })));
    expect(neutral).not.toContain(copy.proof.cleanTip);
    expect(neutral).toContain(copy.clean.howBody);
    expect(neutral).toContain(copy.clean.disclosure);
    expect(neutral).toContain("Needs attention (1)");
    expect(neutral).toContain("Server check 2 min ago: needs attention");
    expect(neutral).not.toMatch(/checked in your browser/i);
    const checking = text(renderToStaticMarkup(createElement(Record, { report: r, rows: recordRows(r.items, 0), tokenId: "1", promise: false })));
    expect(checking).toContain("Checking (2)");
  });
  it("an item's key is said once: the verdict's phrase and the record row's evidence (QA-POLISH #3)", () => {
    expect(itemPhrase("Ethereum · nonce 1", "Nonce 1 not used yet")).toBe("Ethereum · nonce 1 isn't used yet");
    expect(itemPhrase("Bitcoin · coin ee4d…d5:1", "ee4d93ab…a9c1d5:1 unspent")).toBe("Bitcoin · coin ee4d…d5:1 is unspent");
    expect(itemPhrase("Solana · blockhash ab…", "Blockhash still valid")).toBe("Solana · blockhash ab… is still valid");
    expect(itemPhrase("Ethereum · nonce 1", "No provider answered")).toBe("Ethereum · nonce 1: No provider answered");
    expect(rowEvidence("Ethereum · nonce 0", "Nonce 0 used by 0x2a55…84e1 · 3 confirmations")).toBe("Used by 0x2a55…84e1 · 3 confirmations");
    expect(rowEvidence("Ethereum · nonce 1", "Nonce 1 not used yet")).toBe("Not used yet");
    expect(rowEvidence("Ethereum · nonce 1", "Nonce 10 used by 0x2a55…84e1")).toBe("Nonce 10 used by 0x2a55…84e1"); // a whole key only
    expect(rowEvidence("Bitcoin · coin e1d4…ed:0", "Spent in 399b093f…ce3b")).toBe("Spent in 399b093f…ce3b");
  });
  it("the contract's birth block is grouped", () => {
    expect(copy.clean.checks.keys(274_140_000)).toBe("Contract keys: none since birth (block 274,140,000)");
    expect(copy.clean.checks.keys(null)).toBe("Contract keys: none since birth");
  });
});
