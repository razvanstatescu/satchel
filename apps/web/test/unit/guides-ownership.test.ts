import { describe, expect, it } from "vitest";
import { buyCopy } from "@/lib/copy/pages/buy-a-crypto-wallet";
import { sellCopy } from "@/lib/copy/pages/sell-a-crypto-wallet";
import { transferCopy } from "@/lib/copy/pages/transfer-a-crypto-wallet";
import { findPage } from "@/lib/marketing-pages";

/** The ownership cluster: sell, buy and give a crypto wallet. The claims register's bans, plus length and shape rules. */
const GUIDES = [
  ["sell-a-crypto-wallet", sellCopy],
  ["buy-a-crypto-wallet", buyCopy],
  ["transfer-a-crypto-wallet", transferCopy],
] as const;

function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => allStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => allStrings(n, out));
  return out;
}
const strip = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const BANNED = [
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
  /risk-free(?<!is risk-free)/i,
  /production-ready/i,
  /\bmainnet\b/i,
  /open[- ]source/i,
  /github/i,
  /\bPot\b/,
  /\bTransfer(red|ring)?\b/,
  /\bdelist/i,
  /\bfunds?\b/i,
  /\bfree\b/i,
  /no admin key/i,
  /no escrow/i,
  /fiat/i,
  /—/,
  /[’‘“”]/,
];

describe.each(GUIDES)("%s copy", (slug, C) => {
  const strings = allStrings(C);
  const page = findPage(slug)!;

  it("is registered, ready, with a 120 to 160 character description and a short meta title", () => {
    expect(page.ready).toBe(true);
    expect(page.description.length).toBeGreaterThanOrEqual(120);
    expect(page.description.length).toBeLessThanOrEqual(160);
    expect(page.metaTitle.length).toBeLessThanOrEqual(60);
  });

  it("is 900 to 1,600 words with a 4 to 6 question FAQ", () => {
    const n = words(strings.map(strip).join(" "));
    expect(n).toBeGreaterThanOrEqual(900);
    expect(n).toBeLessThanOrEqual(1600);
    expect(C.faq.length).toBeGreaterThanOrEqual(4);
    expect(C.faq.length).toBeLessThanOrEqual(6);
  });

  it("never says the banned or false things", () => {
    for (const s of [...strings, page.title, page.metaTitle, page.description]) for (const b of BANNED) expect(s, `"${s}" matches ${b}`).not.toMatch(b);
  });

  it("says 'audited' only to say it hasn't been", () => {
    for (const s of strings.filter((x) => /audit/i.test(x))) expect(s).toMatch(/hasn't been audited/);
  });

  it("names the testnet where it makes claims about coins", () => {
    expect(strings.join(" ")).toMatch(/runs on (NEAR )?testnet today/);
  });

  it("keeps the answer first, naming Satchel, in short sentences, and each FAQ answer quotable", () => {
    expect(C.answer).toMatch(/Satchel/);
    for (const s of C.answer.split(/(?<=\.)\s+/)) expect(words(s)).toBeLessThanOrEqual(30);
    for (const f of C.faq) expect(words(f.a)).toBeLessThanOrEqual(45);
  });
});

describe("cluster links", () => {
  it("each page links the other two and /clean-history", () => {
    for (const [slug, C] of GUIDES) {
      const text = allStrings(C).join(" ");
      for (const [other] of GUIDES) if (other !== slug) expect(text, `${slug} -> ${other}`).toContain(`(/${other})`);
      expect(text).toContain("(/clean-history)");
    }
  });

  it("the buy page cites its three sources", () => {
    const text = allStrings(buyCopy).join(" ");
    expect(text).toContain("kaspersky.com/blog/cryptowallet-seed-phrase-fake-leaks");
    expect(text).toContain("medium.com/metamask/rotten-seed-phrases");
    expect(text).toContain("phishfort.com/hardware-wallets-the-pre-filled-seed-phrase-scam");
  });
});
