import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { buildOgCardProps, ogSigLine, ogStatusWord, type OgSnapshotInput } from "@/lib/og";

/**
 * A1: the social card's props builder (og-card.tsx draws them; the Playwright suite checks the rendered PNG and the
 * meta tags). Pure, so it's unit-tested without next/og or a browser.
 */

const base: OgSnapshotInput = {
  token_id: "1",
  status: "active",
  listing: null,
  sig_count: 2,
  balances: { btc: { confirmed_sats: "189718", unconfirmed_sats: "0" }, evm: { wei: "48979000000000000" }, sol: { lamports: "500000000" } },
};

describe("ogStatusWord", () => {
  it("a listing always wins: 'For sale', the word a buyer sees, not the owner-side 'Paused for sale'", () => {
    expect(ogStatusWord({ status: "active", listing: { id: 3, seller: "alice.satchelhq.testnet", price: "1", currency: "near", listed_at: 0, sig_count: 0 } })).toBe("For sale");
    expect(ogStatusWord({ status: "active", listing: { id: 3, seller: "x", price: "1", currency: "near", listed_at: 0, sig_count: 0 } })).not.toBe(copy.pill.listed);
  });
  it("otherwise the Wallet tab's own state words", () => {
    expect(ogStatusWord({ status: "active", listing: null })).toBe("Active");
    expect(ogStatusWord({ status: "signing", listing: null })).toBe("Signing");
    expect(ogStatusWord({ status: "needs_attention", listing: null })).toBe("Needs attention");
  });
});

describe("ogSigLine", () => {
  it("claims Clean history only when nothing has ever been signed (no live check needed)", () => {
    expect(ogSigLine(0)).toBe("Clean history");
  });
  it("otherwise a plain count: a static image can't speak for a per-browser check", () => {
    expect(ogSigLine(1)).toBe("1 signature");
    expect(ogSigLine(2)).toBe("2 signatures");
    expect(ogSigLine(1)).not.toContain("Clean");
  });
});

describe("buildOgCardProps", () => {
  it("formats native units with tickers (never fiat), and carries the Testnet badge", () => {
    const props = buildOgCardProps(base);
    expect(props).toMatchObject({ id: "1", status: "Active", sigLine: "2 signatures", testnet: "Testnet" });
    expect(props.chains).toEqual([
      { ticker: "BTC", amount: "0.00189718" },
      { ticker: "ETH", amount: "0.048979" },
      { ticker: "SOL", amount: "0.5000" },
    ]);
    expect(JSON.stringify(props)).not.toMatch(/\$|fiat/i);
  });

  it("a listed Satchel with zero signatures still reads 'For sale' over 'Clean history' being irrelevant to status", () => {
    const props = buildOgCardProps({ ...base, sig_count: 0, listing: { id: 7, seller: "alice.satchelhq.testnet", price: "1000000", currency: "usdc", listed_at: 0, sig_count: 0 } });
    expect(props.status).toBe("For sale");
    expect(props.sigLine).toBe("Clean history");
  });

  it("a Satchel with nothing inside shows zero amounts, not missing chips", () => {
    const props = buildOgCardProps({ ...base, balances: { btc: null, evm: null, sol: null } });
    expect(props.chains.map((c) => c.amount)).toEqual(["0", "0", "0"]);
  });
});
