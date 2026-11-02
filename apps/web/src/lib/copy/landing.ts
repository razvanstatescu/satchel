/**
 * Copy deck, the marketing landing `/` (package L after F1). Merged into `copy.landing` by src/lib/copy.ts; import
 * from "@/lib/copy". Simulated and generic (D-42): no Satchel number, account, time or live read; straight
 * apostrophes; a no-break space before every ticker. Every claim traces to kb/90, kb/70, plan/decisions.md and the
 * risky claims in voice-copy.md §5. Word budgets: voice-copy.md §3.9 (the unit test counts them).
 */

import { NBSP } from "@/lib/format";

/**
 * Which Solana story a landing string tells (`solVariant(SOL_UI_ENABLED, SOL_SEND_ENABLED)` in lib/faq.ts): the SOL UI is
 * on (`ui`), only SOL send is (`send`), neither (`off`), or the contract doesn't sign for Solana at all (`none`, DP5).
 */
export type SolVariant = "off" | "send" | "ui" | "none";

export const landing = {
  meta: {
    title: "An NFT that is a wallet",
    description: (sol = false) =>
      `An NFT on NEAR testnet with its own ${sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum"} addresses. Give it or sell it, and everything inside goes too; a buyer's browser checks every past signature first.`,
    /** The OG image's alt, as in src/app/opengraph-image.alt.txt (a unit test keeps the two equal). `/` lists the image
     * itself because its own `openGraph` replaces the layout's, file-based image included. */
    ogAlt: "Satchel: an NFT that is a wallet",
  },

  /** The header and the menu sheet are the shell's (`copy.nav`, `copy.nav.anchors`; package H). */
  nav: {
    /** One connect label everywhere (DL-10), the same as `nav.connect` (the copy test keeps the four equal). */
    connect: "Connect NEAR wallet",
  },

  /**
   * The hero (design-spec §4.2, hero A "the shelf"): H1 C (`home.h1`, R12.1), one supporting line and two CTAs. The
   * stage under it is the hero loop (`anim`, simulated: roles, round amounts, no accounts).
   */
  hero: {
    /**
     * NEW (W4 design QA, 2026-10-26): the quiet eyebrow above the H1 that names who it's for. The blind 5-second test
     * scored "who" 1/3 ("never named"); v3 reached 10/12 once it had a who-line. Its verbs are the first two use cases
     * (`uses.items`). 7 words, so it holds one line down to 320 px.
     */
    who: "For anyone selling or gifting a wallet",
    /**
     * The supporting line under H1 C (voice-copy §3.1, 34 words): the pain as a pain, then what a Satchel is and what
     * the buyer's browser checks. "Has none" means no seed phrase: the key exists only as threshold shares in NEAR's
     * signer network (risky claim 1). The buyer's browser, never the contract, runs the check (kb/90 §7.5; risky
     * claim 2). Names NEAR on the first screen.
     */
    lead: (sol = false) =>
      `Sellers can keep a copy of a wallet's seed phrase. A Satchel has none: it's an NFT on NEAR holding ${sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum"}, and the buyer's browser checks no old signature can move them.`,
    /** The hero's CTAs: `primary` (the viewport's one coral fill, → /s/1) is also the final CTA's paper button. */
    cta: { primary: "Look inside a Satchel", secondary: "See Satchels for sale" },
    /**
     * The hero loop (design-spec §4.2; motion-spec §10). One caption per act (the steps list, real text; the visible
     * ticker draws them from attributes). `alt` is the figure's visually hidden description; the stage itself is
     * `aria-hidden` and draws `landing.desk`, `card` and `pill` from attributes. Pause has one name (`pause`) plus
     * `aria-pressed` (WCAG 2.2.2). `checking` and `paid` were v4's desk words (unread since 2.0; the copy test pins them).
     */
    anim: {
      captions: ["Coins inside", "Seller lists it", "Buyer checks first", "Coins included"],
      alt: `Illustration: a Satchel holds 0.05${NBSP}BTC and 0.80${NBSP}ETH. Its seller lists it for 300${NBSP}NEAR, and signing pauses. The buyer's browser checks its 3 past signatures: none can move the coins, so Buy turns on. One transaction moves the Satchel to the buyer and pays the seller, and the coins go with it.`,
      pause: "Pause animation",
      /** The steps list's accessible name (the four captions, real text, with `aria-current` on the act that shows). */
      stepsLabel: "The story, step by step",
      /** The visible caption's count ("3 of 4"), an attribute-drawn label in the aria-hidden ticker; hidden below 430 px. */
      count: (i: number, n: number) => `${i} of ${n}`,
      checking: "Checking 3 signatures…",
      paid: "Seller is paid",
    },
  },

  /**
   * The illustrations' shared labels (the hero's stage and the catch strip's desks; the state words are `copy.pill`).
   * Illustrations only: they are `aria-hidden` and draw these from attributes, so they never enter the text layer.
   * Amounts are round demo constants (no fiat, no real token id: the band reads "Satchel"). `seller` and `paused` are v4's
   * desk words: no illustration draws them since 2.0, but the copy test pins them with the rest of the desk.
   */
  desk: {
    seller: "Seller",
    buyer: "Buyer",
    name: "Satchel",
    /** "past": blind testers read "3 signatures" as a wallet that needs 3 people to sign (re-test §7). */
    sigs: "3 past signatures",
    /** Under the Paused for sale pill: what the pause guarantees a buyer (voice-copy §3.1). */
    paused: "No new signatures",
    btc: `0.05${NBSP}BTC`,
    eth: `0.80${NBSP}ETH`,
    eth0: `0.00${NBSP}ETH`,
    price: `300${NBSP}NEAR`,
    sig: (n: number) => `Signature ${n}`,
    checking: "Checking…",
    settled: "Used",
    unused: "Unused",
    clean: "Clean history",
    buy: "Buy",
    /** NEW (DL-15): the check slip's line under its title (an attribute-drawn label, like every desk label). */
    checkedBy: "Checked in the buyer's browser",
  },

  /**
   * NEW (voice-copy §3.2; design-spec §4.3): what it is, right after the hero (41 words; 42 with Solana). It answers
   * "real or wrapped, and who can move it?": native coins (kb/90 §1.1, §2), owner-only signing (INV-01, §5.8 step 1,
   * the same claim as `verify.guarantee`; risky claim 5).
   */
  what: {
    h2: "One NFT. Its own addresses.",
    body: (sol = false) =>
      `Each Satchel has its own ${sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum"} addresses, on their own chains: no bridge, no wrapped tokens. Only the NFT's owner can send the coins, and when it changes hands, everything inside goes with it.`,
    /**
     * NEW (DL-15): the address tags hanging from the card (aria-hidden art, drawn from attributes). Generic, no real
     * address; `btc`/`evm` from 480 px, the short names below.
     */
    tags: { btc: "Bitcoin address", evm: "Ethereum address", sol: "Solana address", btcShort: "Bitcoin", evmShort: "Ethereum", solShort: "Solana", btcAddr: "tb1q…", evmAddr: "0x…", solAddr: "7xKX…" },
  },

  /** design-spec §4.5: the three verbs, each over a scene of real UI. 47 words; 48 with the SOL variant. */
  how: {
    /** kb/90 §5.8 step 1 (INV-01); `page.visitorSub`. */
    h2: "Mint it. Add coins. Hand it over.",
    /**
     * "**Mint and fund.** …": the title renders without a period. kb/90 §1.1, §5.7, §5.8 (`fund.anyone`); §8.9: p50
     * 6.7 s, max 12.8 s, so "usually" (risky claim 16); no seed phrase (risky claim 15); INV-02.
     */
    steps: (sol = false) => [
      {
        title: "Mint a Satchel",
        body: `Anyone can add coins to its ${sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum"} addresses.`,
      },
      {
        title: "Send without a seed phrase",
        body: "Approve in your NEAR wallet. Signing usually takes about 10 seconds.",
      },
      {
        title: "Give it or sell it",
        body: "The new owner gets everything inside.",
      },
    ],
  },

  /** design-spec §4.4: the pain, then who it helps, as a ruled list of three rows (50 words). */
  uses: {
    /** refs-v3 §2 (Parker); kept from v3 (the skim test remembered it). Each sentence renders on its own line. */
    h2: "Sending coins is easy. Handing over a wallet isn't.",
    /** README "The problem" (the first half of v3's problem line); the second half is the clean-history beats. */
    lead: "One NFT, one step.",
    /**
     * Title + body (copy.md §3.4). kb/90 §5.11, §5.12; risky claims 5 ("same", never "never change"), 7 (one
     * transaction, sales only), 8 (paid in NEAR; USDC only if Circle passes), 12 ("project wallet", not "treasury"),
     * 13 (gifts skip the buyer's check).
     */
    items: [
      { title: "Sell BTC, ETH and SOL together", body: "One trade, in NEAR. Neither side sends first." },
      { title: "Give a funded wallet", body: "To a friend's account. Gifts skip the buyer's check." },
      { title: "Hand over a project wallet", body: "Same addresses. Payments keep coming." },
    ],
    /** v4's hang tags (design-spec §4.4 drops them as chips); `tags[2]` "New owner" labels How it works' third scene. */
    tags: [`300${NBSP}NEAR`, "For you", "New owner"],
  },

  /**
   * design-spec §4.6: the catch, as a five-frame strip on the surface band (50 words: the H2 + five beats). No eyebrow,
   * lead or disclosure: the browser-not-contract sentence lives in Questions (`q-proves`, D-42).
   */
  clean: {
    /** kb/70 TL;DR 3. */
    h2: "A signature can outlive a sale",
    /**
     * One sentence per scroll step (≤ 12 words). 1–2 "Without a record", 3–5 "With Satchel" (the chapter chips sit on
     * the desk only). kb/90 §5.8 step 5, §7.1 (recorded before the signer network sees it); §7.3, §7.5 (the buyer's
     * browser, not the contract: risky claim 2); "only when" keeps beat 5 true, other checks gate Buy too (risky claim
     * 18). Beat 2 names the ETH: the desk keeps its 0.05 BTC. Beat 5 is the takeaway (its step wears a check).
     */
    beats: [
      "A seller signs a transfer and keeps it.",
      "Sent after the sale, it drains the buyer's ETH.",
      "Satchel records every signature on NEAR before it's made.",
      "The buyer's browser spots it first.",
      "Buy turns on only when no old signature can move the coins.",
    ],
    /** The figure's visually hidden description (copy.md §3.6, with "the ETH leaves"). */
    alt: "Illustration. Without a record: a seller signs a transfer and keeps it, sells the Satchel, then sends the transfer, and the ETH leaves after the buyer paid. With Satchel: the signature is recorded on NEAR before it's made, the buyer's browser finds it unused, and Buy stays off until it can no longer move the coins.",
    /** v4's step list name (unread since 2.0: the strip's two lists are named after their chapters, `labels.without`
     * and `labels.with`). */
    stepsLabel: "The catch, step by step",
    /** The catch desk's own labels (the shared ones are `landing.desk`); drawn as attributes, never as text. */
    labels: {
      without: "Without a record",
      with: "With Satchel",
      moved: "Moved after the sale",
      slipTitle: "Signed transfer",
      slipWhat: `Send 0.80${NBSP}ETH`,
      held: "Signed, not sent",
      sent: "Sent",
      noRecord: "No record kept",
      recorded: "Recorded on NEAR",
      unusedHead: "1 unused signature",
    },
  },

  /**
   * design-spec §4.7: Trust (`#trust`, 49 words, data-free). The variant comes from `lockView(CONTRACT_ROLE)` with no
   * read: dev → `dev.h2` + `dev.body` (and no Contract facts art); rc → the main copy + `copy.role.rc`; final → the main
   * copy.
   */
  lock: {
    h2: "No admin key. Not even ours.",
    /**
     * Generic (no account id, D-42). kb/90 §5.16 (keyless birth), INV-22 (the wasm can't add a key or deploy code);
     * risky claims 6, 14. True for rc and final only: the dev role renders `dev` instead (a build-time claim, spec §6.5).
     */
    body: "Satchel's contract was born without a key and can't be upgraded. Nobody can add one or change its code, us included.",
    /** kb/90 §4 T1; risky claims 1, 21. Renders as a bold "What you still trust:" lead, then the rest. */
    limits: "What you still trust: NEAR's signer network, which makes every signature. Satchel is new and hasn't been audited.",
    /** → /contract. */
    cta: "See the contract facts",
    /** NEW (DL-15): the Contract facts slip in the trust art (aria-hidden, attribute-drawn; rc and final only). */
    slip: { title: "Contract facts", keys: "Access keys", keysValue: "None since birth", admin: "Admin methods", adminValue: "None", code: "Code hash", codeValue: "Matches", verdict: "Born without a key" },
    dev: {
      h2: "Development contract",
      body: "This build reads a development contract that still has keys, so the lock and code checks are skipped here. Release builds read a contract born in one transaction with no key and no admin or upgrade methods.",
    },
  },

  /**
   * Under the hood (`#under-the-hood`, inside Trust), one closed `<details>`, every word in the server HTML; no addresses
   * (D-42). `rules` takes the same `SolVariant` as `questions["q-chains"].a`, so the two always agree (no rule says
   * "other chains"). `rulesTitle` and `linksTitle` name its two lists.
   */
  hood: {
    h2: "Under the hood",
    /** The `<summary>` (12 words with the H2 while closed). */
    summary: "The six rules, and where to check each claim",
    rulesTitle: "The six rules",
    /** "**Title.** body": the title renders without a period. The `none` variant drops Solana (DP5 cut SOL signing). */
    rules: (sol: SolVariant = "off") => {
      const none = sol === "none";
      return [
        {
          // kb/90 §5.9; D-40; DP5; risky claim 10
          title: "Plain transfers only",
          body: none
            ? "The contract signs only transfers it can read: native ETH on Sepolia and standard Bitcoin spends. It refuses raw hashes, messages, permits, contract calls and Solana messages."
            : "The contract signs only transfers it can read: native ETH on Sepolia, standard Bitcoin spends and plain SOL transfers. It refuses raw hashes, messages, permits and contract calls.",
        },
        {
          // kb/90 §5.8 step 5, §7.1; kb/70 F16; risky claim 3
          title: "Recorded before it's signed",
          body: `Each request is written on NEAR, with the ${none ? "nonce or coins" : "nonce, coins or blockhash"} it can spend, before NEAR's signer network sees it. Timed-out requests stay on the record.`,
        },
        {
          // kb/90 §5.5, §5.7, INV-13; risky claim 4
          title: "Listing pauses signing",
          body: "A Satchel can be listed only after 250 blocks (about 2 min 20 s) without signing. While it's for sale, it can't sign, and only a purchase can move it.",
        },
        {
          // kb/90 §7.2, §7.5; H-25; risky claim 17
          title: "The buyer's browser checks every record",
          body: `It asks each chain whether the nonce was used${none ? " or the coin spent" : ", the coin spent or the blockhash expired"}. For Bitcoin and Ethereum two data providers must agree; the page says when only one answered.`,
        },
        {
          // kb/90 §7.3, §7.5; risky claim 18
          title: "Buy stays disabled until it passes",
          body: "It stays off if any signature could still move coins or can't be checked right now. The app has no override, and checks again just before buying.",
        },
        {
          // kb/90 §5.7 buy, INV-14, INV-16; risky claim 7
          title: "One transaction, bound to that history",
          body: "The purchase names the listing and the signature count the browser checked. If either changed, it fails and refunds; if not, the NFT moves and the seller is paid.",
        },
      ];
    },
    linksTitle: "Check it yourself",
    /** Each label names the evidence behind its link, generically (the landing names no Satchel, D-42). */
    links: {
      one: "A live Satchel, read from each chain", // /s/1 (the judge page)
      activity: "Every signature a Satchel has issued", // /s/1/activity
      market: "Satchels for sale and their checks", // /market
      contract: "Contract facts and commands to verify them", // /contract
      repo: "The source code and README", // REPO_URL (404s until Day 13, H-21)
    },
  },

  /**
   * design-spec §4.8: seven closed `<details name="faq">`, keyed by their anchor ids (FAQ order: q-send, q-keys,
   * q-proves, q-after, q-chains, q-cost, q-testnet; 39 words while closed). One answer paragraph each, ≤ 50 words; its
   * first sentence is the bold lead (`splitLead`).
   */
  questions: {
    h2: "Questions",
    /** Below the seven closed questions (less-labels): the long version, grouped, on its own page. */
    all: "All questions",
    /** Appended to `q-keys` on the dev role only. */
    keysDev: "This build reads a development contract that still has keys, so its lock checks are skipped.",
    "q-send": {
      // The blind tester's "why buy a whole wallet?". kb/90 §5.12, D-14; risky claim 7 (one transaction, sales only; the
      // payout is a detached receipt, escrowed on failure); risky claim 5 ("keeps the same addresses").
      q: "Why not just send the coins?",
      a: "You can, one chain at a time. A Satchel hands over Bitcoin, Ethereum and Solana together, keeps the same addresses, and lets a buyer pay and take over in one transaction, so neither side sends first.",
    },
    "q-keys": {
      // kb/70 F17; kb/90 §3 (the MPC contract account has full-access keys on testnet), §4 T1; risky claims 1, 15. "That
      // network's own" keeps the keys off Satchel's contract, which "No admin key" is about.
      q: "Who holds the keys?",
      a: "No single party. NEAR's signer network makes each signature together, only when the Satchel contract asks, and the contract asks only for the NFT's current owner. You trust that network: enough colluding nodes could sign anything, and on testnet that network's own contract account has full-access keys.",
    },
    "q-proves": {
      // kb/90 §4 "does not cover", §7.2–7.5, §7.7; risky claims 2, 18. The landing's one disclosure (D-42): the browser,
      // not the contract, runs the check.
      q: "What does the buyer's check cover?",
      a: "Every signature the Satchel has ever made. Your browser, not the contract, checks each one on its own chain, and Buy stays off until none can still move the coins. It doesn't cover other tokens, signatures made after you buy, NEAR's signer network or testnet4 reorgs.",
    },
    "q-after": {
      // kb/90 §5.7 (frozen while listed, INV-13; `buy` names the listing and the signature count, INV-14, INV-16).
      q: "Can the seller sign after I check?",
      a: "No. A Satchel that's for sale can't sign anything new, and your purchase names the listing and signature count your browser checked. If either changed, it fails and you're refunded.",
    },
    "q-chains": {
      // kb/90 §2, §5.9, §7.2 (SOL records are checked too); D-15, D-40, DP5. `sol` = solVariant(SOL_UI_ENABLED,
      // SOL_SEND_ENABLED), as for `hood.rules`. "No tokens" covers ERC-20 and Solana tokens without reading as "no Solana".
      q: "Which chains and coins work?",
      a: (sol: SolVariant = "off") => {
        const chains = sol === "ui" ? "Bitcoin testnet4, Ethereum Sepolia and Solana devnet" : "Bitcoin testnet4 and Ethereum Sepolia";
        const solLine =
          sol === "ui"
            ? ""
            : sol === "send"
              ? "Each Satchel also has a Solana devnet address; its owner can send SOL from the app, and clean history checks those signatures too. "
              : sol === "none"
                ? "Each Satchel also has a Solana devnet address, but this contract doesn't sign for Solana. "
                : "Each Satchel also has a Solana devnet address; the contract can sign SOL transfers, but the app can't send SOL yet. ";
        return `Native coins only, no tokens: ${chains}. ${solLine}Send only Sepolia ETH to the Ethereum address: coins sent on another network can't be moved.`;
      },
    },
    "q-cost": {
      // kb/90 §5.4, §5.7; risky claims 19, 20
      q: "What does it cost?",
      a: "Minting takes a 0.02 NEAR deposit and listing 0.01 NEAR, with the unused part refunded. Each signature costs about 0.004 NEAR. Network fees on each chain come out of the Satchel's own coins. Giving one away costs only NEAR gas, and Satchel charges no fee on sales.",
    },
    "q-testnet": {
      // kb/90 §4 T2, T9; README; risky claim 21
      q: "Why testnet only? Is it audited?",
      a: "Satchel is new, unaudited hackathon software. Its contract can't be upgraded, so a bug can't be patched in place, and if NEAR's signer network changed its interface, its Satchels couldn't sign. To try it, use a NEAR testnet wallet such as Meteor or Intear.",
    },
  },

  /**
   * The final CTA (`#try-it`, 34 words; design-spec §4.9): the paper button is `hero.cta.primary`, the
   * ghost-on-brand button `mint.cta`, the note `home.note`.
   */
  cta: {
    /** R12.1: the brand line's home, the page's sign-off on the coral cover. */
    h2: "Stick it on. Hand it over.",
    /** kb/90 §8.5. */
    body: "Look around without a wallet. To mint your own, connect a NEAR testnet wallet.",
  },
} as const;
