import { describe, expect, it } from "vitest";
import { chainSignatures } from "@/lib/copy/pages/chain-signatures";
import { erc6551 } from "@/lib/copy/pages/erc-6551";
import { giftCrypto } from "@/lib/copy/pages/gift-crypto";
import { findPage } from "@/lib/marketing-pages";

/** Every string in a copy tree. */
function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => allStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => allStrings(n, out));
  return out;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const GUIDES = [
  { slug: "gift-crypto", copy: giftCrypto, answerStart: /^To gift crypto to someone without a wallet/, min: 900, max: 1600 },
  { slug: "erc-6551", copy: erc6551, answerStart: /^ERC-6551 is an Ethereum standard/, min: 900, max: 1600 },
  { slug: "chain-signatures", copy: chainSignatures, answerStart: /^NEAR Chain Signatures let a NEAR account/, min: 900, max: 1700 },
] as const;

/** The same bans test/unit/marketing.test.ts applies to the shared marketing deck (claims register, copy rules). */
const BANNED = [
  /cooldown/i,
  /\bMPC\b/,
  /yocto/i,
  /\bTgas\b/,
  /yield/i,
  /no signature exists/i,
  /Safe to buy/i,
  /\bsafe(ly|r|st)?\b/i,
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
  /no admin key/i,
];

describe.each(GUIDES)("/$slug copy", ({ slug, copy, answerStart, min, max }) => {
  const strings = allStrings(copy);
  const page = findPage(slug)!;

  it("is a ready registry entry with a meta title and description in range", () => {
    expect(page.ready).toBe(true);
    expect(page.metaTitle.length).toBeLessThanOrEqual(48);
    expect(page.description.length).toBeGreaterThanOrEqual(120);
    expect(page.description.length).toBeLessThanOrEqual(160);
    expect(page.updated).toBe("2026-11-06");
  });

  it("never says the banned or false things", () => {
    for (const s of [...strings, page.title, page.metaTitle, page.description]) for (const b of BANNED) expect(s, `"${s}" matches ${b}`).not.toMatch(b);
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

  it("opens with an answer that names Satchel in short sentences", () => {
    expect(copy.answer).toMatch(answerStart);
    expect(copy.answer).toContain("Satchel");
    for (const s of copy.answer.split(/(?<=\.)\s+/)) expect(words(s)).toBeLessThanOrEqual(30);
  });

  it("is 900 to 1,700 words with 4 to 6 FAQ questions", () => {
    const body = strings.join(" ");
    expect(words(body)).toBeGreaterThanOrEqual(min);
    expect(words(body)).toBeLessThanOrEqual(max);
    expect(copy.faq.length).toBeGreaterThanOrEqual(4);
    expect(copy.faq.length).toBeLessThanOrEqual(6);
    for (const f of copy.faq) expect(f.a).not.toMatch(/\[[^\]]+\]\(/); // FAQ answers are plain text (the JSON-LD mirrors them)
  });

  it("links to clean history and keeps the testnet wording", () => {
    const body = strings.join(" ");
    expect(body).toContain("(/clean-history)");
    expect(body).toMatch(/testnet/i);
  });
});

describe("/gift-crypto honesty notes", () => {
  const body = allStrings(giftCrypto).join(" ");
  it("states the testnet, the NEAR wallet, the envelope, the cancel and the buyer's-check limits", () => {
    expect(body).toMatch(/Testnet only today/);
    expect(body).toMatch(/connects? a NEAR wallet/);
    expect(body).toMatch(/cash in an envelope/);
    expect(body).toMatch(/can't cancel/);
    expect(body).toMatch(/Gifts skip the buyer's check/);
    expect(body).toMatch(/gives no tax advice/);
    expect(body).not.toMatch(/no wallet (is )?needed/i);
  });
  it("compares the options on copies, setup and chains", () => {
    const t = giftCrypto.sections.table.table;
    expect(t.head).toEqual(["Option", "Giver can keep a copy of the keys?", "Receiver needs a wallet first?", "Chains"]);
    expect(t.rows.map((r) => r[0])).toContain("Satchel by link");
  });
});

describe("/erc-6551 honesty notes", () => {
  const body = allStrings(erc6551).join(" ");
  it("says Satchel is not ERC-6551 and not on Ethereum, and makes no compatibility claim", () => {
    expect(body).toMatch(/Satchel is not ERC-6551/);
    expect(body).toMatch(/does not run on Ethereum/);
    expect(body).toMatch(/no promise to work with ERC-6551 tools/);
    expect(body).toMatch(/NEP-171/);
  });
  it("cites the EIP, the discussion and the paper", () => {
    expect(body).toContain("https://eips.ethereum.org/EIPS/eip-6551");
    expect(body).toContain("https://ethereum-magicians.org/t/erc-6551-non-fungible-token-bound-accounts/13030");
    expect(body).toContain("https://arxiv.org/pdf/2508.07190");
  });
  it("compares Satchel, ERC-6551 and a seed phrase", () => {
    expect(erc6551.sections.table.table.head.slice(1)).toEqual(["Satchel", "ERC-6551", "Handing over a seed phrase"]);
  });
});

describe("/chain-signatures", () => {
  const body = allStrings(chainSignatures).join(" ");
  it("names the derivation paths, the domains and the NEAR docs", () => {
    for (const p of ["satchel/N/btc", "satchel/N/evm", "satchel/N/sol"]) expect(body).toContain(p);
    expect(body).toContain("https://docs.near.org/chain-abstraction/chain-signatures");
  });
  it("shows the record written before the call, in the real order", () => {
    const code = chainSignatures.sections.record.code.code;
    expect(code.indexOf("self.sig_log.insert")).toBeGreaterThan(-1);
    expect(code.indexOf("self.sig_log.insert")).toBeLessThan(code.indexOf("env::promise_and"));
  });
  it("names the signer network as the trust assumption", () => {
    expect(body).toMatch(/trusts? NEAR's signer network/);
  });
  it("keeps every snippet's lines short enough to scroll inside its box (at most 150 columns)", () => {
    for (const s of Object.values(chainSignatures.sections)) {
      for (const k of ["code", "code2"] as const) {
        const c = (s as Record<string, unknown>)[k] as { code: string } | undefined;
        if (c) for (const line of c.code.split("\n")) expect(line.length).toBeLessThanOrEqual(150);
      }
    }
  });
});
