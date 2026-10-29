import { describe, expect, it } from "vitest";
import { SOL_SEND_ENABLED, SOL_UI_ENABLED } from "@/lib/config";
import { copy } from "@/lib/copy";
import { APP_SOL, FAQ_IDS, faqItems, LANDING_SOL, solVariant, splitLead, type FaqId, type SolVariant } from "@/lib/faq";

/**
 * The landing's Questions (design-spec §4.8): seven answers, one paragraph each, with the role and Solana variants; the
 * landing's one disclosure (D-42: the browser, not the contract, runs the check) in `q-proves`; and the one Solana story
 * they share with Under the hood's six rules (§2.7), so the page never contradicts itself.
 */

const VARIANTS: SolVariant[] = ["send", "off", "ui", "none"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const item = (id: FaqId, role: "dev" | "rc" | "final" = "final", sol: SolVariant = "send") => faqItems({ role, sol }).find((i) => i.id === id)!;
const chains = (sol: SolVariant) => item("q-chains", "final", sol).a;
const rules = (sol: SolVariant) => copy.landing.hood.rules(sol);

describe("solVariant", () => {
  it("SOL UI wins, then SOL send alone, else off", () => {
    expect(solVariant(true, true)).toBe("ui");
    expect(solVariant(true, false)).toBe("ui");
    expect(solVariant(false, true)).toBe("send");
    expect(solVariant(false, false)).toBe("off");
  });

  it("the landing always tells the full three-chain story (D-45), whatever the app's flags", () => {
    expect(LANDING_SOL).toBe("ui");
    expect(APP_SOL).toBe(solVariant(SOL_UI_ENABLED, SOL_SEND_ENABLED));
  });
});

describe("faqItems", () => {
  it("returns the seven questions in page order, each id an anchor, each answer one paragraph", () => {
    expect(FAQ_IDS).toEqual(["q-send", "q-keys", "q-proves", "q-after", "q-chains", "q-cost", "q-testnet"]);
    const items = faqItems({ role: "final", sol: "send" });
    expect(items.map((i) => i.id)).toEqual([...FAQ_IDS]);
    expect(items.map((i) => i.q)).toEqual([
      "Why not just send the coins?",
      "Who holds the keys?",
      "What does the buyer's check cover?",
      "Can the seller sign after I check?",
      "Which chains and coins work?",
      "What does it cost?",
      "Why testnet only? Is it audited?",
    ]);
    for (const i of items) {
      expect(typeof i.a).toBe("string");
      expect(i.a).not.toMatch(/\n/);
      expect(i.a.trim().length).toBeGreaterThan(40);
    }
  });

  it("keeps every answer within 50 words on the release roles, in every Solana variant", () => {
    for (const role of ["rc", "final"] as const) {
      for (const sol of VARIANTS) {
        for (const i of faqItems({ role, sol })) expect(words(i.a), `${role}/${sol}/${i.id}`).toBeLessThanOrEqual(50);
      }
    }
  });

  it("adds the development line to the custody answer only on the dev role", () => {
    const dev = faqItems({ role: "dev", sol: "send" });
    const fin = faqItems({ role: "final", sol: "send" });
    expect(item("q-keys", "dev").a).toBe(`${item("q-keys").a} ${copy.landing.questions.keysDev}`);
    expect(item("q-keys", "dev").a).toContain("development contract");
    const others = (items: typeof dev) => items.filter((i) => i.id !== "q-keys");
    expect(others(dev)).toEqual(others(fin));
    for (const role of ["rc", "final"] as const) {
      expect(faqItems({ role, sol: "send" }).map((i) => i.a).join(" ")).not.toContain("development contract");
    }
  });

  it("answers the chains question per variant, always ending on the Sepolia warning", () => {
    expect(chains("send")).toBe(
      "Native coins only, no tokens: Bitcoin testnet4 and Ethereum Sepolia. Each Satchel also has a Solana devnet address; its owner can send SOL from the app, and clean history checks those signatures too. Send only Sepolia ETH to the Ethereum address: coins sent on another network can't be moved.",
    );
    expect(chains("off")).toContain("Each Satchel also has a Solana devnet address; the contract can sign SOL transfers, but the app can't send SOL yet.");
    expect(chains("ui")).toMatch(/^Native coins only, no tokens: Bitcoin testnet4, Ethereum Sepolia and Solana devnet\. Send only/);
    expect(chains("none")).toContain("Each Satchel also has a Solana devnet address, but this contract doesn't sign for Solana.");
    for (const sol of VARIANTS) expect(chains(sol)).toMatch(/Send only Sepolia ETH to the Ethereum address: coins sent on another network can't be moved\.$/);
  });

  it("never reads as 'no Solana': tokens are ruled out as a whole, and SOL works wherever the contract signs it (re-test issue 8)", () => {
    for (const sol of VARIANTS) expect(chains(sol), sol).not.toContain("Solana tokens");
    expect(chains("send")).toContain("its owner can send SOL from the app");
  });

  it("the custody answer puts the full-access keys on the signer network's own account, never on Satchel's contract", () => {
    const keys = item("q-keys").a;
    expect(keys).toContain("that network's own contract account has full-access keys");
    expect(keys).not.toMatch(/\bits contract account\b/);
  });
});

describe("the disclosure and the answers (D-42; voice-copy §3.7)", () => {
  it("q-proves carries the landing's one disclosure: the browser, not the contract, runs the check", () => {
    for (const role of ["dev", "rc", "final"] as const) {
      for (const sol of VARIANTS) {
        const items = faqItems({ role, sol });
        expect(item("q-proves", role, sol).a).toContain("Your browser, not the contract, checks each one on its own chain");
        // the only answer that says it, so the page says it exactly once (A11)
        expect(items.filter((i) => /not the contract/i.test(i.a)).map((i) => i.id)).toEqual(["q-proves"]);
      }
    }
    // honest scope: what the check doesn't cover (risky claims 2, 18)
    expect(item("q-proves").a).toMatch(/It doesn't cover other tokens, signatures made after you buy, NEAR's signer network or testnet4 reorgs\.$/);
  });

  it("q-send: a whole wallet in one transaction, neither side sending first; q-after: a purchase bound to what was checked", () => {
    expect(item("q-send").a).toBe(
      "You can, one chain at a time. A Satchel hands over Bitcoin, Ethereum and Solana together, keeps the same addresses, and lets a buyer pay and take over in one transaction, so neither side sends first.",
    );
    // 2.0 voice (voice-copy §3.7): "for sale", the state's word, instead of "listed"
    expect(item("q-after").a).toBe(
      "No. A Satchel that's for sale can't sign anything new, and your purchase names the listing and signature count your browser checked. If either changed, it fails and you're refunded.",
    );
  });

  it("every answer stays generic: no account id, no Satchel number", () => {
    for (const role of ["dev", "rc", "final"] as const) {
      for (const it of faqItems({ role, sol: "send" })) {
        expect(it.a, it.id).not.toMatch(/\.testnet\b|#\d/);
        expect(it.q, it.id).not.toMatch(/\.testnet\b|#\d/);
      }
    }
  });
});

describe("one Solana story: Under the hood's rules agree with the chains answer", () => {
  it("rule 1 signs plain SOL transfers exactly when the chains answer says Solana works", () => {
    for (const sol of VARIANTS) {
      const rule1 = rules(sol)[0].body;
      const signs = sol !== "none";
      expect(rule1.includes("plain SOL transfers"), sol).toBe(signs);
      expect(rule1.includes("Solana messages"), sol).toBe(!signs); // `none` refuses them outright
      expect(chains(sol).includes("doesn't sign for Solana"), sol).toBe(!signs);
      expect(chains(sol), sol).toContain("Solana devnet"); // the address exists in every variant
      // the record and the check name the blockhash only when SOL can be signed
      expect(rules(sol)[1].body.includes("blockhash"), sol).toBe(signs);
      expect(rules(sol)[3].body.includes("blockhash"), sol).toBe(signs);
    }
  });

  it("send, off and ui tell the same rules; only none drops Solana", () => {
    expect(rules("off")).toEqual(rules("send"));
    expect(rules("ui")).toEqual(rules("send"));
    expect(rules("none")).not.toEqual(rules("send"));
  });

  it("never says 'other chains' in any variant, rules or answers", () => {
    for (const sol of VARIANTS) {
      const all = [...rules(sol).flatMap((r) => [r.title, r.body]), ...faqItems({ role: "dev", sol }).flatMap((i) => [i.q, i.a])].join(" ");
      expect(all.toLowerCase(), sol).not.toContain("other chains");
    }
  });

  it("names the six rules in order", () => {
    expect(rules("send").map((r) => r.title)).toEqual([
      "Plain transfers only",
      "Recorded before it's signed",
      "Listing pauses signing",
      "The buyer's browser checks every record",
      "Buy stays disabled until it passes",
      "One transaction, bound to that history",
    ]);
  });
});

describe("splitLead", () => {
  it("splits at the first sentence end: 'No.' is a lead of its own", () => {
    expect(splitLead("No. Satchel is hackathon software and hasn't had an audit.")).toEqual({ lead: "No.", rest: "Satchel is hackathon software and hasn't had an audit." });
    expect(splitLead("Only the NFT, on NEAR. The coins stay at the same addresses.")).toEqual({ lead: "Only the NFT, on NEAR.", rest: "The coins stay at the same addresses." });
  });

  it("never splits inside a number or an abbreviation", () => {
    expect(splitLead("Minting takes a 0.02 NEAR deposit, and the unused part is refunded. Each signature costs about 0.004 NEAR.").lead).toBe(
      "Minting takes a 0.02 NEAR deposit, and the unused part is refunded.",
    );
    expect(splitLead("Use a wallet, e.g. the one you have. Then mint.").lead).toBe("Use a wallet, e.g. the one you have.");
  });

  it("a one-sentence paragraph is all lead; a question mark ends a sentence too", () => {
    expect(splitLead("Bitcoin testnet4 and Ethereum Sepolia, with native coins only.")).toEqual({ lead: "Bitcoin testnet4 and Ethereum Sepolia, with native coins only.", rest: "" });
    expect(splitLead("Why? Because it can't be patched.")).toEqual({ lead: "Why?", rest: "Because it can't be patched." });
  });

  it("every answer has its first sentence as the lead, and lead + rest give the paragraph back", () => {
    for (const role of ["dev", "final"] as const) {
      for (const sol of VARIANTS) {
        for (const it of faqItems({ role, sol })) {
          const { lead, rest } = splitLead(it.a);
          expect(rest.length, `${it.id} has more than its lead`).toBeGreaterThan(0);
          expect(`${lead} ${rest}`).toBe(it.a);
        }
      }
    }
    expect(faqItems({ role: "final", sol: "send" }).map((i) => splitLead(i.a).lead)).toEqual([
      "You can, one chain at a time.",
      "No single party.",
      "Every signature the Satchel has ever made.",
      "No.",
      "Native coins only, no tokens: Bitcoin testnet4 and Ethereum Sepolia.",
      "Minting takes a 0.02 NEAR deposit and listing 0.01 NEAR, with the unused part refunded.",
      "Satchel is new, unaudited hackathon software.",
    ]);
  });
});
