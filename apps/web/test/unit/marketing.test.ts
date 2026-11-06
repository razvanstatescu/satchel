import { describe, expect, it } from "vitest";
import { formatDate, marketing } from "@/lib/copy/marketing";
import { MARKETING_PAGES } from "@/lib/marketing-pages";

/** Every string in a copy tree (functions are called with sample args). */
function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (typeof node === "function") {
    try {
      allStrings((node as (...a: unknown[]) => unknown)("1", "0xabc", "tb1qabc", true), out);
    } catch {
      /* ignore */
    }
  } else if (Array.isArray(node)) node.forEach((n) => allStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => allStrings(n, out));
  return out;
}

const strings = [...allStrings(marketing), ...MARKETING_PAGES.flatMap((p) => [p.title, p.metaTitle, p.description, p.short ?? ""])];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe("marketing copy follows the claims register", () => {
  it("never says the banned or false things (the shared deck's bans, plus the SEO claims register's)", () => {
    const banned = [
      /cooldown/i,
      /\bMPC\b/,
      /yocto/i,
      /\bTgas\b/,
      /yield/i,
      /no signature exists/i,
      /Safe to buy/i,
      /\$\d/,
      /\bdelegates?\b/i,
      /approval/i,
      /every chain/i,
      /\ball chains\b/i,
      /trustless/i,
      /guaranteed/i,
      /risk-free/i,
      /\baudited\b(?<!hasn't been audited)/i,
      /production-ready/i,
      /\bmainnet\b/i,
      /open[- ]source/i,
      /github/i,
      /\bPot\b/,
      /\bTransfer(red|ring)?\b/,
      /\bdelist/i,
      /\bfund\b/i,
    ];
    for (const s of strings) for (const b of banned) expect(s, `"${s}" matches ${b}`).not.toMatch(b);
  });

  it("says 'audited' only to say it hasn't been", () => {
    for (const s of strings.filter((x) => /audit/i.test(x))) expect(s).toMatch(/hasn't been audited/);
  });

  it("uses straight apostrophes and no typed glyphs", () => {
    for (const s of strings) {
      expect(s).not.toMatch(/[’‘“”]/);
      expect(s).not.toMatch(/[✓✕◌◷ⓘ⚠⛔❄◇⬡▧◆₿Ξ◎⧉▦↗—]/u);
    }
  });

  it("keeps the testnet note and the definition as written", () => {
    expect(marketing.template.testnetNote).toBe("Satchel runs on NEAR testnet today. Try it with test coins; nothing here has real value.");
    expect(marketing.home.definition).toBe("Satchel is an NFT on NEAR that is a wallet.");
  });
});

describe("meta descriptions", () => {
  const metas: [string, string][] = [
    ["questions", marketing.meta.questions],
    ["market", marketing.meta.market.description],
    ["contract keyless", marketing.meta.contract.keyless],
    ["contract dev", marketing.meta.contract.dev],
    ["satchels", marketing.meta.satchels],
    ["activity", marketing.meta.activity("12")],
    ["transactions", marketing.meta.transactions("12")],
    ["sale listed", marketing.meta.sale("12", true)],
    ["sale unlisted", marketing.meta.sale("12", false)],
    ["learn", marketing.learn.description],
  ];
  it.each(metas)("%s is 100 to 160 characters", (_n, d) => {
    expect(d.length).toBeGreaterThanOrEqual(100);
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("the Satchel page's description carries both addresses in full and fits 160 characters", () => {
    const btc = "tb1q" + "a".repeat(38);
    const evm = "0x" + "b".repeat(40);
    const d = marketing.meta.satchel("123", btc, evm);
    expect(d).toContain(btc);
    expect(d).toContain(evm);
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("the market title names what it lists, and only Satchels", () => {
    expect(marketing.meta.market.ogTitle).toBe("Satchels for sale on NEAR: wallets checked before you buy");
    expect(marketing.meta.market.description).toMatch(/only Satchels/);
  });
  it("the three duplicate-prone tab descriptions differ for the same Satchel", () => {
    const set = new Set([marketing.meta.activity("1"), marketing.meta.transactions("1"), marketing.meta.sale("1", true), marketing.meta.sale("1", false)]);
    expect(set.size).toBe(4);
  });
});

describe("/clean-history copy", () => {
  const C = marketing.cleanHistory;
  const S = C.sections;
  const body = [
    C.answer,
    ...Object.values(S).flatMap((s) => [s.h2, ...("body" in s ? s.body : []), ..."lead" in s ? [s.lead] : [], ...("after" in s ? s.after : []), ...("items" in s ? s.items : [])]),
    ...S.checks.table.rows.flat(),
    ...C.faq.flatMap((f) => [f.q, f.a]),
  ].join(" ");

  it("opens with a definition that names the term, in two short sentences", () => {
    expect(C.answer).toMatch(/^Clean history is /);
    const sentences = C.answer.split(/(?<=\.)\s+/);
    expect(sentences).toHaveLength(2);
    for (const s of sentences) expect(words(s)).toBeLessThanOrEqual(30);
  });

  it("is 700 to 1,200 words with 4 to 6 FAQ questions", () => {
    expect(words(body)).toBeGreaterThanOrEqual(700);
    expect(words(body)).toBeLessThanOrEqual(1200);
    expect(C.faq.length).toBeGreaterThanOrEqual(4);
    expect(C.faq.length).toBeLessThanOrEqual(6);
  });

  it("states who runs the check, what it doesn't cover, and the quiet period's constant", () => {
    expect(body).toMatch(/buyer's browser runs the check, not the contract/);
    expect(body).toMatch(/not a guarantee/);
    expect(body).toContain("250 blocks");
    expect(body).toMatch(/quiet period/i);
    expect(body).toMatch(/Gifts skip/);
  });

  it("names the three per-chain checks", () => {
    const rows = Object.fromEntries(S.checks.table.rows.map((r) => [r[0], r[2]]));
    expect(rows["Ethereum transaction"]).toMatch(/nonce has been used/);
    expect(rows["Bitcoin transaction"]).toMatch(/spent in a confirmed transaction/);
    expect(rows["Solana transaction"]).toMatch(/blockhash has expired/);
  });

  it("keeps each FAQ answer short enough to quote", () => {
    for (const f of C.faq) expect(words(f.a)).toBeLessThanOrEqual(45);
  });
});

describe("formatDate", () => {
  it("formats an ISO date in UTC", () => {
    expect(formatDate("2026-11-06")).toBe("November 6, 2026");
    expect(formatDate("2027-01-31")).toBe("January 31, 2027");
  });
});
