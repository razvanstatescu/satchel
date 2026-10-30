import { describe, expect, it } from "vitest";
import { classify } from "@/lib/nav-pending";

/**
 * `classify` (lib/nav-pending.ts) decides what the in-app navigation skeleton shows for a link click. It was
 * previously exercised only indirectly through the Playwright spec `test/e2e/nav-feedback.spec.ts`; this file pins
 * its branches with a unit test (no browser needed).
 */

describe("classify: same-satchel flow routes", () => {
  it("recognises every flow slug when navigating within the same satchel", () => {
    const flows = ["send", "receive", "transfer", "give-link", "empty", "sign", "offer", "coin", "allowance"];
    for (const slug of flows) {
      const r = classify(`/s/3/${slug}`, "", "/s/3", 1000);
      expect(r).toEqual({ path: `/s/3/${slug}`, search: "", kind: "flow", name: expect.any(String), tokenId: "3", startedAt: 1000 });
    }
  });

  it("maps give-link's slug to the giveLink flow name", () => {
    expect(classify("/s/3/give-link", "", "/s/3", 0)?.name).toBe("giveLink");
  });

  it("treats the same flow slug from a DIFFERENT satchel as a page transition, not a flow", () => {
    const r = classify("/s/3/send", "", "/s/9", 0);
    expect(r).toEqual({ path: "/s/3/send", search: "", kind: "page", name: "satchel", tokenId: "3", startedAt: 0 });
  });

  it("treats an unrecognised sub-route of the same satchel as a page, not a flow", () => {
    const r = classify("/s/3/unknown-thing", "", "/s/3", 0);
    expect(r).toEqual({ path: "/s/3/unknown-thing", search: "", kind: "page", name: "satchel", tokenId: "3", startedAt: 0 });
  });
});

describe("classify: the sale 'listing' special case", () => {
  it("treats /s/N/sale?list=1 as a flow named sell, same satchel", () => {
    const r = classify("/s/3/sale", "list=1", "/s/3", 5);
    expect(r).toEqual({ path: "/s/3/sale", search: "list=1", kind: "flow", name: "sell", tokenId: "3", startedAt: 5 });
  });

  it("treats /s/N/sale without list=1 as the sale TAB, not a flow", () => {
    const r = classify("/s/3/sale", "", "/s/3", 5);
    expect(r).toEqual({ path: "/s/3/sale", search: "", kind: "tab", name: "sale", tokenId: "3", tab: "sale", startedAt: 5 });
  });

  it("treats list=1 from a different satchel as a page (the listing special-case requires 'same')", () => {
    const r = classify("/s/3/sale", "list=1", "/s/9", 5);
    expect(r).toEqual({ path: "/s/3/sale", search: "list=1", kind: "page", name: "satchel", tokenId: "3", startedAt: 5 });
  });

  it("treats list=0 or a garbage value as the sale tab, not a listing flow", () => {
    expect(classify("/s/3/sale", "list=0", "/s/3", 0)?.kind).toBe("tab");
    expect(classify("/s/3/sale", "list=yes", "/s/3", 0)?.kind).toBe("tab");
  });
});

describe("classify: tabs of the same satchel", () => {
  it("recognises activity, transactions and sale as tabs", () => {
    for (const tab of ["activity", "transactions", "sale"] as const) {
      const r = classify(`/s/3/${tab}`, "", "/s/3", 0);
      expect(r).toEqual({ path: `/s/3/${tab}`, search: "", kind: "tab", name: tab, tokenId: "3", tab, startedAt: 0 });
    }
  });

  it("treats the bare satchel route (no segment) as the wallet tab, when already on that satchel", () => {
    const r = classify("/s/3", "", "/s/3/activity", 0);
    expect(r).toEqual({ path: "/s/3", search: "", kind: "tab", name: "wallet", tokenId: "3", tab: "wallet", startedAt: 0 });
  });

  it("treats the bare satchel route as a page transition when coming from a DIFFERENT satchel (same=false)", () => {
    const r = classify("/s/3", "", "/s/9", 0);
    expect(r).toEqual({ path: "/s/3", search: "", kind: "page", name: "satchel", tokenId: "3", startedAt: 0 });
  });

  it("suppresses feedback when closing a flow popup back to the wallet tab of the SAME satchel", () => {
    for (const from of ["/s/3/send", "/s/3/receive", "/s/3/transfer", "/s/3/give-link", "/s/3/empty", "/s/3/sign", "/s/3/offer", "/s/3/coin", "/s/3/allowance"]) {
      expect(classify("/s/3", "", from, 0)).toBeNull();
    }
  });

  it("a flow popup's 'from' belonging to a DIFFERENT satchel is simply a page transition (same=false short-circuits the suppression check)", () => {
    const r = classify("/s/3", "", "/s/9/send", 0);
    expect(r).toEqual({ path: "/s/3", search: "", kind: "page", name: "satchel", tokenId: "3", startedAt: 0 });
  });

  it("does not suppress feedback for a non-flow 'from', e.g. leaving the activity tab back to wallet", () => {
    const r = classify("/s/3", "", "/s/3/activity", 0);
    expect(r).toEqual({ path: "/s/3", search: "", kind: "tab", name: "wallet", tokenId: "3", tab: "wallet", startedAt: 0 });
  });
});

describe("classify: top-level pages", () => {
  it("maps known top-level routes to their page name", () => {
    expect(classify("/market", "", "/", 0)).toEqual({ path: "/market", search: "", kind: "page", name: "market", tokenId: null, startedAt: 0 });
    expect(classify("/satchels", "", "/", 0)?.name).toBe("satchels");
    expect(classify("/contract", "", "/", 0)?.name).toBe("contract");
    expect(classify("/mint", "", "/", 0)?.name).toBe("mint");
    expect(classify("/address-book", "", "/", 0)?.name).toBe("book");
  });

  it("extracts the tokenId for /fund/:id and names it 'fund'", () => {
    const r = classify("/fund/42", "", "/", 0);
    expect(r).toEqual({ path: "/fund/42", search: "", kind: "page", name: "fund", tokenId: "42", startedAt: 0 });
  });

  it("names claim pages 'claim' with no tokenId extraction (claim ids are not numeric satchel ids)", () => {
    const r = classify("/claim/abc123", "", "/", 0);
    expect(r).toEqual({ path: "/claim/abc123", search: "", kind: "page", name: "claim", tokenId: null, startedAt: 0 });
  });

  it("falls back to the generic 'page' name for an unknown top-level route, and for the root path", () => {
    expect(classify("/some-unknown-route", "", "/", 0)?.name).toBe("page");
    expect(classify("/", "", "/x", 0)?.name).toBe("page");
  });
});

describe("classify: edge cases in the /s/:id matcher", () => {
  it("requires the id segment to be digits; a non-numeric id falls through to the top-level branch", () => {
    // "/s/abc" doesn't match the numeric regex, so "s" becomes the top-level segment -> generic "page"
    const r = classify("/s/abc", "", "/", 0);
    expect(r?.kind).toBe("page");
    expect(r?.tokenId).toBeNull();
  });

  it("treats a satchel id of 0 as a valid id (no falsy-string bug)", () => {
    const r = classify("/s/0", "", "/s/0", 0);
    expect(r?.tokenId).toBe("0");
  });
});
