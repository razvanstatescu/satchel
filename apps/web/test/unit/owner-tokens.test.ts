import { describe, expect, it } from "vitest";
import { listOwnerTokens, type OwnerTokenViews } from "@/lib/near/owner-tokens";

/** R3-X-3: owner lists page past page 0, de-duplicate across swap-remove shifts, sort by numeric id, and cap. */

const tok = (id: number) => ({ token_id: String(id), owner_id: "alice.testnet" });

function viewsOver(order: number[], opts: { supplyFails?: boolean; onPage?: (from: number) => void } = {}): OwnerTokenViews & { calls: number } {
  const v = {
    calls: 0,
    nftSupplyForOwner: async () => {
      if (opts.supplyFails) throw new Error("rpc");
      return order.length;
    },
    nftTokensForOwner: async (_a: string, from = "0", limit = 50) => {
      v.calls += 1;
      opts.onPage?.(Number(from));
      return order.slice(Number(from), Number(from) + limit).map(tok);
    },
  };
  return v as unknown as OwnerTokenViews & { calls: number };
}

describe("listOwnerTokens", () => {
  it("finds a Satchel received after 50 spam mints (it sits past page 0), sorted by numeric id", async () => {
    const order = [...Array.from({ length: 50 }, (_, i) => i + 2), 1]; // spam 2..51, then the gift #1
    const r = await listOwnerTokens(viewsOver(order), "alice.testnet");
    expect(r.truncated).toBe(false);
    expect(r.total).toBe(51);
    expect(r.tokens).toHaveLength(51);
    expect(r.tokens[0]?.token_id).toBe("1");
    expect(r.tokens.at(-1)?.token_id).toBe("51");
  });

  it("sorts numerically, not lexically", async () => {
    const r = await listOwnerTokens(viewsOver([10, 9, 100, 2]), "a");
    expect(r.tokens.map((t) => t.token_id)).toEqual(["2", "9", "10", "100"]);
  });

  it("de-duplicates a token that shifted between pages mid-read", async () => {
    const order = Array.from({ length: 120 }, (_, i) => i + 1);
    let shifted = false;
    const v = viewsOver(order, {
      onPage: (from) => {
        // after page 0 is read, a swap-remove moves the last token (120) to index 3 and shortens the list;
        // page 1 then re-serves nothing new, but a token near the boundary appears twice
        if (from === 50 && !shifted) {
          shifted = true;
          order[49] = 51; // 51 now also sits at the end of page 0's range: it will appear on both pages
        }
      },
    });
    const r = await listOwnerTokens(v, "a");
    const ids = r.tokens.map((t) => t.token_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("51");
  });

  it("stops at the page cap and reports it honestly", async () => {
    const order = Array.from({ length: 500 }, (_, i) => i + 1);
    const v = viewsOver(order);
    const r = await listOwnerTokens(v, "a", { maxPages: 3 });
    expect(v.calls).toBe(3);
    expect(r.truncated).toBe(true);
    expect(r.tokens).toHaveLength(150);
    expect(r.total).toBe(500);
  });

  it("is not truncated when the supply is exactly the cap", async () => {
    const order = Array.from({ length: 100 }, (_, i) => i + 1);
    const r = await listOwnerTokens(viewsOver(order), "a", { maxPages: 2 });
    expect(r.truncated).toBe(false);
    expect(r.tokens).toHaveLength(100);
  });

  it("still pages to the first short page when the supply read fails", async () => {
    const order = Array.from({ length: 70 }, (_, i) => i + 1);
    const r = await listOwnerTokens(viewsOver(order, { supplyFails: true }), "a");
    expect(r.tokens).toHaveLength(70);
    expect(r.total).toBe(70);
    expect(r.truncated).toBe(false);
  });

  it("returns empty for an account with nothing", async () => {
    const r = await listOwnerTokens(viewsOver([]), "a");
    expect(r).toEqual({ tokens: [], total: 0, truncated: false });
  });
});
