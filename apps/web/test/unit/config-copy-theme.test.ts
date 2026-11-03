import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULTS, parsePublicEnv } from "@/lib/config";

const FORBIDDEN_RPC_HOST = ["rpc", "testnet", "near", "org"].join(".");
import manifest from "@/app/manifest";
import { copy, errorCopy } from "@/lib/copy";
import { EXTRA_FAQ_IDS, FAQ_IDS } from "@/lib/faq";
import { NBSP } from "@/lib/format";
import { applyTheme, DARK_QUERY, GROUND, parseStoredTheme, readTheme, resolveTheme, THEME_HEAD_SCRIPT, THEME_KEY } from "@/lib/theme";

describe("config (zod env)", () => {
  it("defaults to testnet, FastNEAR → dRPC, fixture mode, dev role", () => {
    const e = parsePublicEnv({});
    expect(e.NEXT_PUBLIC_NETWORK).toBe("testnet");
    expect(e.NEXT_PUBLIC_NEAR_RPCS).toEqual(["https://rpc.testnet.fastnear.com", "https://near-testnet.drpc.org"]);
    expect(e.NEXT_PUBLIC_DATA_MODE).toBe("fixture");
    expect(e.NEXT_PUBLIC_CONTRACT_ROLE).toBe("dev");
    expect(e.NEXT_PUBLIC_SATCHEL_CONTRACT).toBe(DEFAULTS.contract);
    expect(e.NEXT_PUBLIC_EXPECTED_CODE_HASH).toBeUndefined();
  });
  it("parses comma lists and treats empty strings as unset", () => {
    const e = parsePublicEnv({ NEXT_PUBLIC_SEPOLIA_RPCS: " https://a.example , https://b.example ", NEXT_PUBLIC_DATA_MODE: "" });
    expect(e.NEXT_PUBLIC_SEPOLIA_RPCS).toEqual(["https://a.example", "https://b.example"]);
    expect(e.NEXT_PUBLIC_DATA_MODE).toBe("fixture");
  });
  it("refuses the deprecated near.org RPC anywhere in the list", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_NEAR_RPCS: `https://${FORBIDDEN_RPC_HOST},https://near-testnet.drpc.org` })).toThrow(/deprecated/);
  });
  it("validates role, mode, account ids and the code hash", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_CONTRACT_ROLE: "prod" })).toThrow();
    expect(() => parsePublicEnv({ NEXT_PUBLIC_DATA_MODE: "mock" })).toThrow();
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SATCHEL_CONTRACT: "Not An Account" })).toThrow();
    expect(() => parsePublicEnv({ NEXT_PUBLIC_EXPECTED_CODE_HASH: "abc" })).toThrow();
    expect(parsePublicEnv({ NEXT_PUBLIC_EXPECTED_CODE_HASH: "A".repeat(64) }).NEXT_PUBLIC_EXPECTED_CODE_HASH).toBe("a".repeat(64));
    expect(parsePublicEnv({ NEXT_PUBLIC_CONTRACT_ROLE: "final", NEXT_PUBLIC_DATA_MODE: "live" }).NEXT_PUBLIC_CONTRACT_ROLE).toBe("final");
  });
});

/** Every string in the deck, flattened (functions are called with sample args). */
function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (typeof node === "function") {
    try {
      const v = (node as (...a: unknown[]) => unknown)("1", "2", "3", "4");
      allStrings(v, out);
    } catch {
      /* ignore */
    }
  } else if (Array.isArray(node)) node.forEach((n) => allStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => allStrings(n, out));
  return out;
}

describe("copy deck (kb/80 R3 rules; Satchel 2.0 voice, voice-copy.md)", () => {
  // /contract is the one page allowed technical facts (kb/80 R3 contract.*: "MPC version", sign_for, AddKey).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contract: _contractFacts, ...userFacing } = copy;
  const strings = allStrings(userFacing);
  it("has no plumbing words, no cooldown, no fiat, no forbidden failure claims", () => {
    const banned = [/cooldown/i, /\bMPC\b/, /yocto/i, /\bTgas\b/, /domain_id/, /yield/i, /no signature exists/i, /no funds moved/i, /Safe to buy/i, /Buyable in/i, /\$\d/, /Pay with/i, /\bdelegates?\b/i, /approval/i, /Satchel broadcasts it/i, /every chain/i];
    for (const s of strings) for (const b of banned) expect(s, `"${s}" matches ${b}`).not.toMatch(b);
  });
  it("never types glyphs into strings (icons carry them)", () => {
    for (const s of strings) expect(s).not.toMatch(/[✓✕◌◷ⓘ⚠⛔❄◇⬡▧◆₿Ξ◎⧉▦↗]/u);
  });
  it("sentence case: no all-caps words in labels (tickers and acronyms excepted)", () => {
    const allowed = new Set(["BTC", "ETH", "SOL", "NEAR", "USDC", "NEP-171", "MIT", "UTC", "README", "QR", "ID", "NFT", "SHA-256", "EVM", "X", "AddKey"]);
    for (const s of strings) for (const w of s.split(/[\s·,.:()/]+/)) if (/^[A-Z]{3,}$/.test(w)) expect(allowed.has(w), `"${w}" in "${s}"`).toBe(true);
  });
  it("the 2.0 vocabulary (voice-copy §1.2, R3): Give, Stop selling, Add coins; Used · Confirming · Not its coin", () => {
    // giving a Satchel is never "Transfer" in UI copy, and Delist and Fund are gone as verbs
    for (const s of strings) {
      expect(s, s).not.toMatch(/\bTransfer(red|ring)?\b/); // lower-case "transfer" stays in chain-level copy
      expect(s, s).not.toMatch(/\bdelist(ed|ing)?\b/i);
      expect(s, s).not.toMatch(/\bfund\b/i);
    }
    expect(copy.page.actions).toMatchObject({ fund: "Add coins", transfer: "Give", delist: "Stop selling", paused: "Sending and giving are paused while it's for sale." });
    expect(copy.xfer.cta("bob.testnet")).toBe("Give it to bob.testnet");
    expect([copy.xfer.transferring, copy.xfer.steps.done, copy.xfer.toast("1", "bob.testnet")]).toEqual(["Giving…", "Given", "Gave Satchel #1 to bob.testnet"]);
    expect(copy.act.row.transferred("bob.testnet")).toBe("Handed over to bob.testnet"); // a sale's transfer lands here too
    expect([copy.clean.item.settled, copy.clean.item.settling, copy.clean.item.foreign]).toEqual(["Used", "Confirming", "Not its coin"]);
    expect([copy.freeze.title, copy.sell.delisting, copy.sell.delisted]).toEqual(["Paused while it's for sale", "Stopping sale…", "Stopped selling. You can send and give again."]);
    expect(copy.app.fixture).toBe("Sample data: these pages don't read the chains live.");
    expect(copy.market.count(3)).toBe("3 for sale");
    expect(copy.contract.keyless).toBe("Keyless since birth.");
  });
  it("the state words: Active, Signing, Paused for sale, Needs attention, Sold, Given, Bought", () => {
    expect(copy.pill).toEqual({ active: "Active", signing: "Signing", listed: "Paused for sale", sold: "Sold", needs_attention: "Needs attention", transferred: "Given", bought: "Bought" });
    expect(copy.pill).not.toHaveProperty("for_sale");
  });
  it("one connect label everywhere (DL-10), and the footer note is footer.testnet (R8)", () => {
    expect([copy.nav.connect, copy.landing.nav.connect, copy.buy.connect, copy.mint.connect]).toEqual(Array(4).fill("Connect NEAR wallet"));
    expect(copy.nav.connectShort).toBe("Connect"); // below 480 px; the accessible name stays nav.connect
    expect(copy.app.badge).toBe("Testnet");
    expect(copy.footer.testnet).toBe("Testnet only. Coins here have no value.");
  });
  it("uses the decided H1 (R12.1: H1 C), the tagline in metadata, and the brand line as the final CTA", () => {
    expect(copy.home.h1).toBe("Sell a wallet with everything inside. The buyer checks it first.");
    expect(copy.landing.cta.h2).toBe("Stick it on. Hand it over.");
    expect(copy.landing.meta.title).toBe("An NFT that is a wallet");
    // `/` lists the OG image itself (its openGraph replaces the layout's); its alt must stay the file convention's alt.
    expect(copy.landing.meta.ogAlt).toBe(readFileSync(new URL("../../src/app/opengraph-image.alt.txt", import.meta.url), "utf8").trim());
    expect(copy.home.lead).toBe("Satchel is an NFT that is a wallet. Each one has its own Bitcoin, Ethereum and Solana addresses on testnet. Give it or sell it, and everything inside goes too.");
  });
  it("the landing hero, its loop and the desk (voice-copy §3.1)", () => {
    const L = copy.landing;
    expect(L.hero.lead(false)).toBe(
      "Sellers can keep a copy of a wallet's seed phrase. A Satchel has none: it's an NFT on NEAR holding Bitcoin and Ethereum, and the buyer's browser checks no old signature can move them.",
    );
    expect(L.hero.lead(true)).toBe(
      "Sellers can keep a copy of a wallet's seed phrase. A Satchel has none: it's an NFT on NEAR holding Bitcoin, Ethereum and Solana, and the buyer's browser checks no old signature can move them.",
    );
    // honest (risky claim 2): the buyer's browser runs the check, never the contract
    for (const sol of [false, true]) {
      expect(L.hero.lead(sol)).toContain("the buyer's browser checks");
      expect(L.hero.lead(sol)).not.toMatch(/contract/i);
    }
    expect(L.hero.cta).toEqual({ primary: "Look inside a Satchel", secondary: "See Satchels for sale" });
    // the eyebrow above the H1 names who it's for (W4 blind test: "who" scored 1/3); one line down to 320 px
    expect(L.hero.who).toBe("For anyone selling or gifting a wallet");
    expect(L.hero.anim.captions).toEqual(["Coins inside", "Seller lists it", "Buyer checks first", "Coins included"]);
    expect(L.hero.anim.alt).toBe(
      `Illustration: a Satchel holds BTC, ETH, SOL and USDC. Its seller lists it for 2,000${NBSP}NEAR, and signing pauses. The buyer's browser checks its 3 past signatures: none can move the coins, so Buy turns on. One transaction moves the Satchel to the buyer and pays the seller, and the coins go with it.`,
    );
    // the toggle has one name (WCAG 2.2.2) plus aria-pressed; no "Play animation" twin
    expect(L.hero.anim).toMatchObject({ pause: "Pause animation", checking: "Checking 3 signatures…", paid: "Seller is paid" });
    expect(L.hero.anim).not.toHaveProperty("play");
    expect(L.desk).toMatchObject({
      seller: "Seller",
      buyer: "Buyer",
      name: "Satchel",
      sigs: "3 past signatures", // not "3 signatures": testers read a wallet that needs 3 people to sign
      paused: "No new signatures",
      btc: `0.05${NBSP}BTC`,
      eth: `0.80${NBSP}ETH`,
      eth0: `0.00${NBSP}ETH`,
      price: `2,000${NBSP}NEAR`,
      checking: "Checking…",
      settled: "Used",
      unused: "Unused",
      clean: "Clean history",
      buy: "Buy",
      checkedBy: "Checked in the buyer's browser",
    });
    expect(L.desk.sig(2)).toBe("Signature 2");
  });

  it("what it is, use cases, how it works, the catch, trust, questions and the final call (voice-copy §3.2–3.8)", () => {
    const L = copy.landing;
    expect(L.what.h2).toBe("One NFT. Its own addresses.");
    expect(L.what.body(false)).toBe(
      "Each Satchel has its own Bitcoin and Ethereum addresses, on their own chains: no bridge, no wrapped tokens. Only its owner, or someone they let spend within daily caps, can send the coins. When it changes hands, everything inside goes with it.",
    );
    expect(L.what.body(true)).toContain("its own Bitcoin, Ethereum and Solana addresses");
    expect(L.uses.lead).toBe("One NFT, one step.");
    expect(L.uses.items).toEqual([
      { title: "Sell BTC, ETH and SOL together", body: "One trade, in NEAR. Neither side sends first." },
      { title: "Give a funded wallet", body: "To a friend. Gifts don't wait for the check." }, // site-refresh facts §1.5: no check gates a gift
      { title: "Hand over a project wallet", body: "Same addresses. Payments keep coming." },
    ]);
    expect(L.how.h2).toBe("Mint it. Add coins. Hand it over.");
    expect(L.how.steps(false).map((s) => s.title)).toEqual(["Mint a Satchel", "Send without a seed phrase", "Give it or sell it"]);
    expect(L.how.steps(false)[0].body).toBe("Anyone can add coins to its Bitcoin and Ethereum addresses.");
    expect(L.how.steps(true)[0].body).toBe("Anyone can add coins to its Bitcoin, Ethereum and Solana addresses.");
    expect(L.how.steps(false)[1].body).toBe("Approve in your NEAR wallet. Signing usually takes about 10 seconds."); // risky claim 16
    expect(L.how.steps(false)[2].body).toBe("The new owner gets everything inside.");
    expect(L.clean.beats).toEqual([
      "A seller signs a transfer and keeps it.",
      "Sent after the sale, it drains the buyer's ETH.",
      "Satchel records every signature on NEAR before it's made.",
      "The buyer's browser spots it first.", // the browser, not the contract (risky claim 2)
      "Buy turns on only when no old signature can move the coins.",
    ]);
    expect(L.clean.labels.slipWhat).toBe(`Send ${L.desk.eth}`); // the slip sends exactly the ETH the desk holds
    expect(L.lock.body).toBe("Satchel's contract was born without a key and can't be upgraded. Nobody can add one or change its code, us included.");
    expect(L.hood.rules("off")[2].body).toBe(
      "A Satchel can be listed only after 250 blocks (about 2 min 20 s) without signing. While it's for sale, it can't sign, and only a purchase or an accepted offer can move it.",
    );
    const Q = L.questions;
    expect([Q["q-send"].q, Q["q-keys"].q, Q["q-proves"].q, Q["q-after"].q, Q["q-chains"].q, Q["q-cost"].q, Q["q-testnet"].q]).toEqual([
      "Why not just send the coins?",
      "Who holds the keys?",
      "What does the buyer's check cover?",
      "Can the seller sign after I check?",
      "Which chains and coins work?",
      "What does it cost?",
      "Why testnet only? Is it audited?",
    ]);
    // D-42: the browser-not-contract disclosure lives in the collapsed q-proves
    expect(Q["q-proves"].a).toContain("Your browser, not the contract, checks each one on its own chain");
    expect(Q["q-after"].a).toMatch(/^No\. A Satchel that's for sale can't sign anything new/);
    expect(Q["q-cost"].a).toMatch(/Satchel charges no fee\.$/);
    expect(L.cta.body).toBe("Look around without a wallet. To mint your own, connect a NEAR testnet wallet.");
    expect(L.meta.description(false)).toBe(
      "An NFT on NEAR testnet with its own Bitcoin and Ethereum addresses. Give it or sell it, and everything inside goes too; a buyer's browser checks every past signature first.",
    );
  });

  it("the landing is generic and simulated: no Satchel number, account, time or curly quote", () => {
    const L = copy.landing;
    const Q = L.questions;
    const landing = allStrings([
      L.hero.who, L.hero.lead(false), L.hero.lead(true), L.hero.cta, L.hero.anim, L.desk, L.desk.sig(1), L.what.h2, L.what.body(false), L.what.body(true), L.what.tags,
      L.uses.h2, L.uses.lead, L.uses.items, L.uses.tags, L.how.h2, L.how.steps(false), L.how.steps(true), L.clean.h2, L.clean.beats, L.clean.alt,
      L.clean.stepsLabel, L.clean.labels, L.lock.h2, L.lock.body, L.lock.limits, L.lock.cta, L.lock.slip, L.lock.dev, L.hood.summary,
      L.hood.links.one, L.hood.links.activity, Q["q-send"], Q["q-proves"], Q["q-after"], Q["q-cost"], L.cta, copy.home.h1,
    ]);
    expect(landing.length).toBeGreaterThan(70);
    for (const s of landing) {
      expect(s, s).not.toMatch(/#\d|\.testnet\b|\bUTC\b|\balice\b|\bbob\b|Live from|This happened on testnet|belongs to/i);
      expect(s, s).not.toMatch(/[‘’“”]/); // straight apostrophes only
    }
  });

  it("the web manifest: the Day ground, and the tagline (never 'every chain', D-37)", () => {
    const m = manifest();
    expect(m.description).toBe("An NFT that is a wallet.");
    expect(m.description).not.toMatch(/\b(every|any) chain/i);
    expect([m.background_color, m.theme_color]).toEqual([GROUND.day, GROUND.day]);
    expect(GROUND.day).toBe("#F6F5FB");
  });

  it("the landing word budgets from the copy keys (voice-copy §3.9)", () => {
    const L = copy.landing;
    const Q = L.questions;
    const words = (...parts: unknown[]) => allStrings(parts).join(" ").split(/\s+/).filter(Boolean).length;
    const hero = (sol: boolean) => words(L.hero.who, copy.home.h1, L.hero.lead(sol), L.hero.cta.primary, L.hero.cta.secondary);
    const sections = {
      hero: hero(false),
      captions: words(L.hero.anim.captions),
      what: words(L.what.h2, L.what.body(false)),
      uses: words(L.uses.h2, L.uses.lead, L.uses.items),
      how: words(L.how.h2, L.how.steps(false)),
      clean: words(L.clean.h2, L.clean.beats),
      // `help` is attribute-drawn (an aria-label, site-refresh copy §3): only the title and body are visible words.
      more: words(
        L.more.h2,
        L.more.items.map((it) => ({ title: it.title, body: it.body })),
      ),
      trust: words(L.lock.h2, L.lock.body, L.lock.limits, L.lock.cta),
      hood: words(L.hood.h2, L.hood.summary),
      questions: words(Q.h2, ...(["q-send", "q-keys", "q-proves", "q-after", "q-chains", "q-cost", "q-testnet"] as const).map((id) => Q[id].q)),
      tryIt: words(L.cta.h2, L.cta.body, L.hero.cta.primary, copy.mint.cta, copy.home.note),
    };
    // the hero: the who-line (7, W4) + H1 C (11) + the lead (34) + the CTAs (8)
    // site-refresh F1 (facts §2): "or someone they let spend within daily caps" adds 6 words to What (41 → 47). The
    // "What else it does" strip (site-refresh design notes §1, between Trust and Questions) adds 49: the H2 (4) + five items
    // of 9 words each (a 3–4 word title, a 5–6 word line).
    expect(sections).toEqual({ hero: 60, captions: 10, what: 47, uses: 50, how: 47, clean: 50, more: 49, trust: 49, hood: 12, questions: 39, tryIt: 34 });
    expect([hero(true), words(L.what.h2, L.what.body(true)), words(L.how.h2, L.how.steps(true))]).toEqual([61, 48, 48]);
    const { hero: h, captions, what, uses, how, clean, more, trust, hood } = sections;
    // cap 380 (site-refresh design notes §1.1, §1.5): 320 plus the who-line (W4), plus F1's 6 words, plus the strip's 49.
    expect(h + captions + what + uses + how + clean + more + trust + hood, "everything above Questions").toBe(374);
  });
  it("uses the measured ETA thresholds and the honest timeout copy", () => {
    expect(copy.sign.mpc[0]).toBe("Usually about 10 seconds.");
    expect(copy.sign.mpc[150]).toBe("Still waiting for the network. We'll keep checking.");
    expect(copy.sign.timeout.body).toBe("The signer network did not return a signature. Nothing was sent.");
    expect(copy.sign.timeout.cond).toContain("If a signature still turns up");
  });
  it("the card: native only (no fiat, no '{n} chains' hero), the stickers' words and the preview rows", () => {
    expect(copy.card.totalNone(2)).toBe("2 chains");
    expect(copy.card.totalNone(1)).toBe("1 chain");
    expect([copy.card.yours, copy.card.new, copy.card.preview]).toEqual(["Yours", "New", "New Satchel"]);
    expect(copy.card.addressRow("Bitcoin")).toBe("Bitcoin address");
    expect(copy.card.chip("BTC", null)).toBe(`BTC${NBSP}—`);
  });
  it("the new strings (app-screens §12) read naturally", () => {
    expect(copy.send.form.reviewWhy("Ethereum Sepolia")).toBe("Enter an amount and an Ethereum Sepolia address.");
    expect(copy.send.form.reviewWhy("Bitcoin testnet4")).toBe("Enter an amount and a Bitcoin testnet4 address.");
    expect(copy.send.guard.replaceNote(1)).toBe("Replace builds a new send with nonce 1, so only one of the two can ever go through.");
    expect(copy.home.list.blocked(`2${NBSP}NEAR`, 1)).toBe(`For sale at 2${NBSP}NEAR, but 1 signature could still move coins, so nobody can buy it yet.`);
    expect(copy.market.lead(3)).toBe("3 for sale. Your browser checks each one's history before you can buy.");
    expect(copy.clean.stripLabel(1, 1)).toBe("1 of 1 can't move coins");
    expect(copy.app.step(1, 2)).toBe("Step 1 of 2");
  });
  it("maps stable error prefixes to the error map", () => {
    expect(errorCopy("ERR_NOT_OWNER", { id: "3" })).toContain("Only the owner of Satchel #3 can sign");
    expect(errorCopy("ERR_FROZEN", { id: "3" })).toBe("Signing is paused while Satchel #3 is for sale. Stop selling it to send. Nothing was signed.");
    expect(errorCopy("ERR_LISTED", { id: "3" })).toBe("Stop selling Satchel #3 before you give it.");
    expect(errorCopy("ERR_SELF_BUY", { id: "3" })).toBe("You can't buy your own Satchel. Stop selling it instead.");
    expect(errorCopy("ERR_EVM_DATA", { id: "1", chain: "evm" })).toBe("Satchel only signs plain Ethereum transfers. Nothing was signed.");
    expect(errorCopy("MPC_QUEUE", { id: "1" })).toContain("already being signed");
  });
  it("the first-time onboarding: three screens, each with a Learn-more anchor that exists on /questions", () => {
    const O = copy.onboarding;
    expect(O.screens).toHaveLength(3);
    expect(O.screens.map((s) => s.title)).toEqual(["A wallet you can hand over", "Every signature is on the record", "Let someone spend, within limits"]);
    const knownAnchors: readonly string[] = [...FAQ_IDS, ...EXTRA_FAQ_IDS];
    for (const s of O.screens) {
      expect(knownAnchors, s.learnMore.anchor).toContain(s.learnMore.anchor);
      expect(s.body.length, s.id).toBeGreaterThan(0);
    }
    expect([O.mintCta, O.openCta, O.continueCta]).toEqual(["Mint your first Satchel", "Open my Satchels", "Continue"]);
    expect(O.replayIntro).toBe("Replay intro");
  });
  it("the about-you survey: every option id matches the API validator's stable contract", () => {
    const S = copy.onboarding.survey;
    expect(Object.keys(S.goal.options)).toEqual(["explore", "gift", "trade", "multichain", "build", "other"]);
    expect(Object.keys(S.experience.options)).toEqual(["new", "some", "regular", "builder"]);
    expect(Object.keys(S.chains.options)).toEqual(["btc", "evm", "sol", "near", "none"]);
    expect(Object.keys(S.source.options)).toEqual(["hackathon", "x", "friend", "search", "other"]);
    expect(S.shareAccount.label).toBe("Include my NEAR account so you can see how I use Satchel");
    expect(S.privacy).toMatch(/no IP address stored, no cookies\.$/);
    expect(copy.questions["q-feedback"]).toBeDefined();
  });
});

/**
 * A minimal document + localStorage + window to run the head script exactly as the browser would. `os` is what
 * `matchMedia("(prefers-color-scheme: dark)")` answers ("missing": no matchMedia; "throws": it throws), and `setOs`
 * flips it later and fires the `change` listeners.
 */
function fakeDom(stored: string | null, opts: { throwing?: boolean; os?: "dark" | "light" | "missing" | "throws" } = {}) {
  const os = opts.os ?? "light";
  // one theme-color meta, as the root layout's viewport renders it (a second can appear after hydration: both are set)
  const metas = [GROUND.day, GROUND.day].map((content) => ({
    attrs: { name: "theme-color", content } as Record<string, string>,
    getAttribute(k: string) {
      return this.attrs[k] ?? null;
    },
    setAttribute(k: string, v: string) {
      this.attrs[k] = v;
    },
  }));
  const dataset: Record<string, string> = {};
  const listeners: (() => void)[] = [];
  const queries: string[] = [];
  const mql = { matches: os === "dark", addEventListener: (_: string, fn: () => void) => void listeners.push(fn) };
  const window: Record<string, unknown> = {};
  if (os === "throws") {
    window.matchMedia = () => {
      throw new Error("blocked");
    };
  } else if (os !== "missing") {
    window.matchMedia = (q: string) => {
      queries.push(q);
      return mql;
    };
  }
  const document = { documentElement: { dataset }, querySelectorAll: (sel: string) => (sel === 'meta[name="theme-color"]' ? metas : []), defaultView: window };
  const store = new Map<string, string>(stored === null ? [] : [[THEME_KEY, stored]]);
  const localStorage = {
    getItem: (k: string) => {
      if (opts.throwing) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.throwing) throw new Error("SecurityError");
      store.set(k, v);
    },
    removeItem: (k: string) => void store.delete(k),
  };
  const run = () => new Function("document", "localStorage", "window", THEME_HEAD_SCRIPT)(document, localStorage, window);
  const setOs = (dark: boolean) => {
    mql.matches = dark;
    listeners.forEach((fn) => fn());
  };
  const contents = () => metas.map((m) => m.attrs.content);
  return { document, localStorage, window, metas, dataset, store, queries, listeners, run, setOs, contents };
}

describe("theme head script (R12.3: Day first whatever the OS, before first paint)", () => {
  it("nothing stored: Day, whatever the OS, and theme-color is the Day ground", () => {
    for (const os of ["dark", "light"] as const) {
      const d = fakeDom(null, { os });
      d.run();
      expect(d.dataset.theme, os).toBe("day");
      expect(d.contents()).toEqual([GROUND.day, GROUND.day]);
    }
    expect(GROUND).toEqual({ day: "#F6F5FB", night: "#120C26" }); // brand 2.0 grounds (R12.3)
  });
  it("a stored Night applies before paint (also on a light OS), and rewrites every theme-color meta", () => {
    const d = fakeDom("night", { os: "light" });
    d.run();
    expect(d.dataset.theme).toBe("night");
    expect(d.contents()).toEqual([GROUND.night, GROUND.night]);
    const day = fakeDom("day", { os: "dark" });
    day.run();
    expect(day.dataset.theme).toBe("day");
  });
  it("a stored System follows the OS (dark and light), and keeps following it live", () => {
    const dark = fakeDom("system", { os: "dark" });
    dark.run();
    expect(dark.queries).toEqual([DARK_QUERY]);
    expect(dark.dataset.theme).toBe("night");
    expect(dark.contents()).toEqual([GROUND.night, GROUND.night]);
    const light = fakeDom("system", { os: "light" });
    light.run();
    expect(light.dataset.theme).toBe("day");
    light.setOs(true);
    expect(light.dataset.theme).toBe("night");
    expect(light.contents()).toEqual([GROUND.night, GROUND.night]);
    light.setOs(false);
    expect(light.dataset.theme).toBe("day");
  });
  it("registers one OS listener that re-reads storage, so a later pick in the toggle wins (and a later System follows)", () => {
    const d = fakeDom("system", { os: "light" });
    d.run();
    expect(d.listeners).toHaveLength(1);
    d.store.set(THEME_KEY, "day"); // the toggle picked Day
    d.setOs(true);
    expect(d.dataset.theme).toBe("day");
    const n = fakeDom(null, { os: "light" }); // loaded with nothing stored, then System is picked
    n.run();
    n.store.set(THEME_KEY, "system");
    n.setOs(true);
    expect(n.dataset.theme).toBe("night");
  });
  it("junk means Day", () => {
    for (const junk of ["purple", "", "Night", "true"]) {
      const d = fakeDom(junk, { os: "dark" });
      d.run();
      expect(d.dataset.theme, junk).toBe("day");
    }
  });
  it("never throws: private mode (storage throws) is Day; a missing or throwing matchMedia makes System Day", () => {
    const priv = fakeDom("night", { throwing: true, os: "dark" });
    expect(() => priv.run()).not.toThrow();
    expect(priv.dataset.theme).toBe("day");
    for (const os of ["missing", "throws"] as const) {
      const d = fakeDom("system", { os });
      expect(() => d.run(), os).not.toThrow();
      expect(d.dataset.theme, os).toBe("day");
    }
    // the script must not depend on globals beyond document, localStorage and window
    expect(() => new Function("document", "localStorage", THEME_HEAD_SCRIPT)(fakeDom(null).document, fakeDom(null).localStorage)).not.toThrow();
  });
  it("resolveTheme and parseStoredTheme mirror the script; readTheme defaults to Day", () => {
    expect(["night", "day", "system", "", null, "purple"].map((v) => parseStoredTheme(v))).toEqual(["night", "day", "system", null, null, null]);
    expect(resolveTheme("night", false)).toBe("night");
    expect(resolveTheme("system", true)).toBe("night");
    expect(resolveTheme("system", false)).toBe("day");
    expect(resolveTheme("day", true)).toBe("day");
    expect(resolveTheme(null, true)).toBe("day");
    expect(resolveTheme("purple", true)).toBe("day");
    const g = globalThis as { localStorage?: unknown };
    expect(readTheme()).toBe("day"); // no localStorage at all (the server)
    g.localStorage = fakeDom("purple").localStorage;
    expect(readTheme()).toBe("day");
    g.localStorage = fakeDom("system").localStorage;
    expect(readTheme()).toBe("system");
    delete g.localStorage;
  });
  it("applyTheme stores every choice, System included, and applies the resolved theme and metas in place", () => {
    const g = globalThis as { localStorage?: unknown };
    const d = fakeDom(null, { os: "dark" });
    g.localStorage = d.localStorage;
    const doc = d.document as unknown as Document;
    expect(applyTheme("night", doc)).toBe("night");
    expect(d.store.get(THEME_KEY)).toBe("night");
    expect(d.dataset.theme).toBe("night");
    expect(d.contents()).toEqual([GROUND.night, GROUND.night]);
    expect(applyTheme("system", doc)).toBe("night"); // the OS is dark
    expect(d.store.get(THEME_KEY)).toBe("system");
    expect(applyTheme("day", doc)).toBe("day");
    expect(d.store.get(THEME_KEY)).toBe("day");
    expect(d.dataset.theme).toBe("day");
    expect(d.contents()).toEqual([GROUND.day, GROUND.day]);
    const light = fakeDom(null, { os: "light" });
    g.localStorage = light.localStorage;
    expect(applyTheme("system", light.document as unknown as Document)).toBe("day");
    const priv = fakeDom(null, { throwing: true, os: "dark" }); // private mode still applies for this page
    g.localStorage = priv.localStorage;
    expect(applyTheme("night", priv.document as unknown as Document)).toBe("night");
    expect(priv.dataset.theme).toBe("night");
    delete g.localStorage;
  });
});
