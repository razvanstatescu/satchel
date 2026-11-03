# Copy for the landing refresh (copywriter, 2026-11-03)

Inputs: `brief-copy.md`, `context.md`, `rulings.md` (R1–R7), `facts.md` (the source for every claim), `current-state.md`,
`strip-refs.md`, `voice-copy.md` §1 and §5, the app's copy (`allowance.ts`, `market.ts`, `wallet-ops.ts`, `multichain.ts`,
`questions.ts`, `onboarding.ts`, `flows.ts`, `satchel.ts`, `shell.ts`), `landing.ts`, `faq.ts`, and the tests that pin
them. I also followed two later review notes: gifts and the check, and the app strings outside the landing.

Conventions:
- **L** = `apps/web/src/lib/copy/landing.ts`.
- Strings are exact: straight apostrophes, and a no-break space (NBSP) before a ticker that follows a number.
- "Visible" counts the words the e2e counts (`landing.spec`). Answers inside closed `<details>` and attribute-drawn labels
  add 0 visible words.
- I edited no product file.
- Every count and rule below was checked by a script (a working script, not kept): the copy test's bans, glyphs,
  all-caps and generic rules, the e2e word regex, the faq.test variant flags, `splitLead`, and ≤ 50 words per answer.

---------------------------------------------------------------------------------------------------------------------
## 1. Fixes (necessary): every FALSE string in facts.md §2

| # | Key | Current | New | Source | Words |
|---|---|---|---|---|---|
| F1 | `L.what.body(sol)` sentence 2 | "Only the NFT's owner can send the coins, and when it changes hands, everything inside goes with it." | "Only its owner, or someone they let spend within daily caps, can send the coins. When it changes hands, everything inside goes with it." | facts §2 L:107-108; §1.1 (C5:9-12, sign.rs:47-48). Same words as the app (`q-what-is`: "someone the owner lets spend within daily caps"; onboarding: "within limits") | +6 visible: What 42 → **48** (47 without Solana) |
| F2 | `L.questions["q-keys"].a` | "No single party. NEAR's signer network makes each signature together, only when the Satchel contract asks, and the contract asks only for the NFT's current owner. You trust that network: …" | "No single party. NEAR's signer network makes each signature together, only when the Satchel contract asks, for the NFT's owner or someone they let spend within daily caps. You trust that network: enough colluding nodes could sign anything, and on testnet that network's own contract account has full-access keys." | facts §2 L:303-304; C5:125-129 | 47 → 49 (closed; ≤ 50). The pinned phrase "that network's own contract account has full-access keys" stays. `keysDev` is unchanged |
| F3 | `L.hood.rules(sol)[0]` title | "Plain transfers only" | **"Readable requests only"** | facts §2 L:240-243 | 0 |
| F3 | `…[0].body`, variants send, off and ui | "The contract signs only transfers it can read: native ETH on Sepolia, standard Bitcoin spends and plain SOL transfers. It refuses raw hashes, messages, permits and contract calls." | "The contract signs only what it can read: ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and text messages. It refuses raw hashes, permits and any other contract call." | C7S:61-73, :91-114; facts §1.4 | 28 → 35 (closed) |
| F3 | `…[0].body`, variant none | "…native ETH on Sepolia and standard Bitcoin spends. It refuses raw hashes, messages, permits, contract calls and Solana messages." | "The contract signs only what it can read: ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends and Ethereum text messages. It refuses raw hashes, permits, any other contract call and Solana messages." | the same, plus DP5 | closed |
| F4 | `L.hood.rules(sol)[2].body` | "…While it's for sale, it can't sign, and only a purchase can move it." | "A Satchel can be listed only after 250 blocks (about 2 min 20 s) without signing. While it's for sale, it can't sign, and only a purchase or an accepted offer can move it." | facts §2 L:252-253; offers.rs:294-300; C46:227-242 | +4 (closed) |
| F5 | `L.questions["q-proves"].a`, last sentence | "It doesn't cover other tokens, signatures made after you buy, NEAR's signer network or testnet4 reorgs." | "It doesn't cover tokens other than USDC, signatures made after you buy, NEAR's signer network or testnet4 reorgs." The first two sentences, including the disclosure, are unchanged | facts §2 L:309-310; §1.7 (C7S:286, :298-301) | 46 → 48 (closed) |
| F6 | `L.questions["q-chains"].a(sol)`, ui (what the landing and `/questions` render) | "Native coins only, no tokens: Bitcoin testnet4, Ethereum Sepolia and Solana devnet. Send only Sepolia ETH to the Ethereum address: coins sent on another network can't be moved." | "BTC on Bitcoin testnet4, SOL on Solana devnet, and ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia. The four Ethereum networks share one address. A Satchel can also hold NEAR inside. Anything else at its addresses can't be moved." | facts §2 L:320-332; §1.3 (C7S:24-38, :66-70; C46:9-12); R1 | 28 → 44 (closed) |
| F6 | the same, variants send, off and none (tests only) | "Native coins only, no tokens: Bitcoin testnet4 and Ethereum Sepolia. {solLine}Send only Sepolia ETH …" | "BTC on Bitcoin testnet4, plus ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia. {solLine, unchanged}Anything else at its addresses can't be moved." | the same | send 49, off 47, none 41 |
| F7 | `L.questions["q-testnet"]`: a new `aDev`, picked in `faqItems` when `role === "dev"`, as `q-keys` already is | rc and final: unchanged. dev today: "…Its contract can't be upgraded, so a bug can't be patched in place…", which is false on dev2 | `aDev`: "Satchel is new, unaudited hackathon software. The development contract behind this build can still be upgraded; the release contract can't, so a bug there can't be patched in place. To try it, use a NEAR testnet wallet such as Meteor or Intear." | R2; facts §2 L:341-342; §1.9 | dev 44 → 42 (closed) |
| F8 | `L.uses.items[1].body` (review note) | "To a friend's account. Gifts skip the buyer's check." | "To a friend. Gifts don't wait for the check." | facts §1.5: no check gates a Give or a link, and the claim page's check is information only, after the gift. "To a friend" now also covers a friend with no account | 9 → 9 |

Notes for the builder:
- **F6 construction.** It keeps the four variants and the pinned `solLine` strings:
  ```ts
  const evm = "ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia";
  const lead = sol === "ui" ? `BTC on Bitcoin testnet4, SOL on Solana devnet, and ${evm}.` : `BTC on Bitcoin testnet4, plus ${evm}.`;
  // ui: Solana is in the lead, so this slot holds the shared address and NEAR inside; the cut variants spend it on their
  // Solana line (every variant stays ≤ 50 words)
  const middle = sol === "ui" ? "The four Ethereum networks share one address. A Satchel can also hold NEAR inside. " : solLine;
  return `${lead} ${middle}Anything else at its addresses can't be moved.`;
  ```
  - "At its addresses" is deliberate: wNEAR, and USDC if H-26 lands, can sit inside and come out again. "Anything else
    sent to it" would therefore be false.
  - Per R1, the answer names no USDC inside on NEAR.
  - It never says "Solana tokens" or "other chains".
- **F5.** I left out "what a site makes of a signed message": it would make the answer 56 words. A signed message can't
  move coins, so it never blocks Buy, which "until none can still move the coins" already covers. The site caveat stays in
  `q-safety-message` and in the app's not-covered list.
- **F3.** "Text messages" names no chain, so it never claims Bitcoin. The none variant must keep "Solana messages" and
  the other variants must not contain it (faq.test).
- **F7.** `faqItems`: `const a = id === "q-keys" && dev ? … : id === "q-testnet" && dev ? Q[id].aDev : Q[id].a`.
  `/questions` renders `CONTRACT_ROLE`, so production (dev2) gets the twin there too.

**`FAQ_IDS`: no swap.** The seven questions still answer the page's own claims. The strip's help links (§3) reach
`q-offers`, `q-give-link` and `q-allow-what` on `/questions`, so no new homepage question is needed.

---------------------------------------------------------------------------------------------------------------------
## 2. Stale updates (worth doing)

### 2.1 Use cases (`L.uses`): 3 items, titles ≤ 6 words, bodies ≤ 9 words

| Item | Title | Body | Why |
|---|---|---|---|
| 1 | Sell BTC, ETH and SOL together (keep) | One trade, in NEAR. Neither side sends first. (keep) | R1: sale currencies on the landing are NEAR only. Offers get their own strip item (§3), which keeps one idea per section. "Neither side sends first" is true for accepted offers too |
| 2 | Give a funded wallet (keep) | **To a friend. Gifts don't wait for the check.** | F8 |
| 3 | Hand over a project wallet (keep) | Same addresses. Payments keep coming. (keep) | Allowances go to the strip. Here they would muddle the hand-over, which clears them |

Uses stays at 50 visible words. `h2`, `lead` and `tags` are unchanged, except that if the price changes (§4), set
`tags[0]` = `desk.price` (nothing draws it).

### 2.2 The cost answer (`L.questions["q-cost"].a`)

- **Current:** "Minting takes a 0.02 NEAR deposit and listing 0.01 NEAR, with the unused part refunded. Each signature costs about
  0.004 NEAR. Network fees on each chain come out of the Satchel's own coins. Giving one away costs only NEAR gas, and
  Satchel charges no fee on sales." (47 words)
- **New:** "Minting takes a 0.02 NEAR deposit and listing 0.01 NEAR, with the unused part refunded. Each signature costs about
  0.004 NEAR; network fees come out of the Satchel's coins. Offers and spending allowances keep a little NEAR for storage.
  Giving by link adds 0.02 NEAR. Satchel charges no fee." (**49 words**, closed)
- **Checked against facts §1.8:**
  - mint 0.02, about 0.007 used;
  - list 0.01;
  - per signature: about 0.004 NEAR, an estimate;
  - a NEAR offer keeps about 0.003–0.005 NEAR;
  - an allowance keeps up to 0.009 NEAR;
  - a link adds 0.02 NEAR, for the claimer's gas;
  - no Satchel fee on sales or offers (commerce.ts:58-59, offers.rs:312).
- **Left out on purpose:**
  - a long message costs more than 0.004 NEAR (up to about 0.014); "about" covers the usual case;
  - the USDC payout registration of 0.00125 NEAR (R1: no USDC sales on the landing).
- The lead sentence is unchanged, so the `splitLead` test keeps passing.

### 2.3 Under the hood: rules 2, 4, 5 and 6 (closed, 0 visible words)

| Rule | Current | New (send, off, ui) | Variant none | Source |
|---|---|---|---|---|
| 2 | "Each request is written on NEAR, with the nonce, coins or blockhash it can spend, before NEAR's signer network sees it. Timed-out requests stay on the record." | "Each request is written on NEAR before NEAR's signer network sees it: the nonce, coins or blockhash it can spend, or a message's full text. Timed-out requests stay on the record." | "…: the nonce or coins it can spend, or a message's full text. …" | C7S:116-127 |
| 4 | "It asks each chain whether the nonce was used, the coin spent or the blockhash expired. For Bitcoin and Ethereum two data providers must agree; the page says when only one answered." | "It asks each chain, and each Ethereum network on its own, whether the nonce was used, the coin spent or the blockhash expired. For Bitcoin and Ethereum two data providers must agree; the page says when only one answered. Signed messages are listed too; they can't move coins, so they never block a sale." | "…whether the nonce was used or the coin spent. …" | C7S:277-286; kb90:1065-1072 (INV-37) |
| 5 | "…The app has no override, and checks again just before buying." | Append: "Make an offer waits for the same check." | the same | C46:255-256; Market.tsx:398-433 |
| 6 | "…If either changed, it fails and refunds; if not, the NFT moves and the seller is paid." | Append: "An offer holds only for the history checked when it was made: if anything is signed or taken out, it can't be accepted." | the same | C46:250-256; R6 (no refund claim for offers) |

The rule titles 2–6 and `hood.summary` ("The six rules…") are unchanged. faq.test's blockhash flags still hold: rules 2
and 4 name the blockhash except in none.

### 2.4 Other stale strings

`anim.alt` is in §4. `copy.app.badgeTip` (R5) is in §7, since the shell owns it.

Left as they are, true and pinned:
- `meta.description`;
- How step 1 ("Anyone can add coins to its Bitcoin, Ethereum and Solana addresses.");
- `q-send` and `q-after`;
- `lock.limits` (adding "the token contracts" would name USDC inside, which R1 rules out);
- the hood links.

---------------------------------------------------------------------------------------------------------------------
## 3. The "What else it does" strip (`L.more`, section id `more`)

```ts
more: {
  h2: "What else it does",
  items: [
    { title: "Make an offer", body: "Even if it's not for sale.", help: { anchor: "q-offers", label: "How offers work" } },
    { title: "Give by link", body: "To someone not on NEAR yet.", help: { anchor: "q-give-link", label: "How giving by link works" } },
    { title: "Let someone spend", body: "Daily caps, until it changes hands.", help: { anchor: "q-allow-what", label: "What someone you add can do" } },
    { title: "USDC and L2s", body: "Ethereum, Base, Arbitrum and OP Sepolia.", help: { anchor: "q-chains", label: "Which chains and coins work" } },
    { title: "Take it all out", body: "Every coin to your wallets." },
  ],
},
```

**49 visible words** (cap 50): the H2 has 4, and each item has 9 (a 3–4 word title plus a 5–6 word line). There is no
lead: it would break the cap. Each item reads as one sentence: "Make an offer, even if it's not for sale."

| Item | Who it's for | Facts behind it | Kept out on purpose |
|---|---|---|---|
| Make an offer | buyers and sellers | Any Satchel, listed or not; anyone but its owner (C46:14-17). App: "Make an offer", "Anyone can offer, whether or not it's for sale." | No currency named (R1); no refund claim (R6) |
| Give by link | gifters | No NEAR account needed first; they connect a NEAR wallet to claim, so "yet" (facts §1.5; wallet-ops `intro`) | Bearer risk: it sits one click away in `q-give-link` |
| Let someone spend | owners; buyers (access ends when it changes hands) | Up to 4 people, daily caps per coin and network, cleared on every change of owner (C5:109-113, :208-213) | Spending only: never selling, giving, listing, messages or inside take-outs (R7, R8) |
| USDC and L2s | everyone: what can be inside | ETH and USDC on the four networks; "Sepolia" applies to all four (C7S:24-35; R1) | Never "every L2" |
| Take it all out | buyers after a purchase; owners | Every coin to addresses you choose; inside coins go back to your NEAR account; owner only (wallet-ops.ts:77-117) | No "one transaction" or "one click" (it's one signature per coin) |

Why these five:
- They lead with buyers, sellers and gifters.
- **Sign a message** is out: it's an owner utility, and its honesty points already live in hood rules 1, 2 and 4.
- Five items keep the strip under the 50-word cap with lines that stay true. Six would force cuts like losing "until it
  changes hands".
- The designer can lay five out as 3 + 2, or as one row at 1280.

**Links.**
- No visible link words.
- If the designer wants links, use a "?" icon link per item, like the app's `HelpLink`, named by `help.label` (an
  `aria-label`, so 0 visible words), with a 44 px target on the landing.
- Don't make the titles links: "Make an offer" reads as an action and would open an answer.
- "Take it all out" has no `/questions` id, so it gets no link.
- All the anchors exist in `allFaqGroups()`. `q-chains` could also be `#q-chains` on the page itself.

**Fallback: six items for a 3×2 grid (49 words).** I don't recommend it.

| Title | Line |
|---|---|
| Make an offer | Even on unlisted ones. |
| Give by link | To someone new to NEAR. |
| Let someone spend | Within daily caps. |
| USDC and L2s | Base, Arbitrum and OP too. |
| Take it all out | Every coin, one flow. |
| Sign a message | Ethereum or Solana, on record. |

**Placement, from the copy's side.** Put it after Trust, as a coda just before Questions: the core story runs first, then
the extras. The budget is the same anywhere above Questions (§5).

---------------------------------------------------------------------------------------------------------------------
## 4. Labels for the updated card illustration (attribute-drawn, aria-hidden, 0 visible words)

### 4.1 One sample Satchel for the whole page

- **Coins:** 0.05 BTC + 0.80 ETH + 12 SOL + 800 USDC.
- **Prices:** the app's own fixture prices (`FIXTURE_PRICES`: BTC 80,000, ETH 2,500, SOL 100, NEAR 4, USDC 1).
- **Value:** 4,000 + 2,000 + 1,200 + 800 = **8,000**.
- **Shares:** BTC 50%, ETH 25%, SOL 15%, USDC 10%.

These are round and plausible. They keep today's 0.05 BTC and 0.80 ETH, so "Send 0.80 ETH" and the catch strip's
"0.80" and "0.00" stay true. The USDC is EVM USDC (R1).

```ts
desk: {
  // …existing keys…
  price: `2,000${NBSP}NEAR`,   // was 300 NEAR: see open question 1
  usd: 8000,                   // a number, never a "$…" string (R3; copy test /\$\d/)
  mix: [ { ticker: "BTC", share: 0.5 }, { ticker: "ETH", share: 0.25 }, { ticker: "SOL", share: 0.15 }, { ticker: "USDC", share: 0.1 } ],
  // only if the catch strip's desks take the new card: after "Send 0.80 ETH" lands
  usdAfter: 6000,
  mixAfter: [ { ticker: "BTC", share: 2 / 3 }, { ticker: "SOL", share: 0.2 }, { ticker: "USDC", share: 2 / 15 } ],
  // only if a scene still draws native ledger rows for them
  sol: `12${NBSP}SOL`,
  usdc: `800${NBSP}USDC`,
},
```

### 4.2 What the art draws (reusing the app's strings)

| Label | Composed as | Reads |
|---|---|---|
| The total | `copy.overview.estimate(usdText(desk.usd))` | "≈ $8,000.00" |
| Under or beside it, always | `copy.overview.atPrices` | "at mainnet prices" |
| The bar | 4 segments, `COIN_FILL` | 50 / 25 / 15 / 10, largest first |
| Chips, card ≥ 352 px (the hero at 1280) | ticker + `shareText(share)`, then `copy.overview.plus(1)` | "BTC 50%" · "ETH 25%" · "SOL 15%" · "+1" |
| Chips, card < 352 px (390 and 320 phones; the What, How and desk cards) | the same, with the 3rd chip hidden and `plus(2)` | "BTC 50%" · "ETH 25%" · "+2" |
| Catch desk 2 after the drain (if redrawn) | `usdAfter`, `mixAfter` | "≈ $6,000.00" · "at mainnet prices" · "BTC 67%" · "SOL 20%" · "+1" (bar 67/20/13; the ETH chip is gone, matching beat 2) |
| How step 1 (a new Satchel) | the app's empty card: `copy.overview.empty` | "Nothing inside yet"; no bar; BTC · ETH · SOL chips without shares (dimmed, like the app) |
| Pills, Yours, name, New | unchanged | `pill.active` "Active", `pill.listed` "Paused for sale", `card.yours` "Yours", `desk.name` "Satchel", `card.preview` "New Satchel" |
| Price tag | `desk.price` | "2,000 NEAR" |

- **Formatter.** `usdText` and `shareText` live in `lib/overview.ts`, which imports `lib/holdings`, and that pulls in
  `@/lib/near/contract`. Move both into `lib/format.ts` (pure) and re-export them from `overview`, so the landing art pulls
  no NEAR reader into `/`. landing-no-data only scans direct imports.
- **Fit.** "≈ $8,000.00" is 11 characters. At 261 px the app's layout truncates it beside "Paused for sale"
  (current-state §3, item 6), so the hero's pill has to leave the total's row. That's for the designer.
- **Re-check** the sample against real prices at the Day-13 freeze (facts §4 Q3).

### 4.3 Hero loop

**Captions: unchanged.** "Coins inside" · "Seller lists it" · "Buyer checks first" · "Coins included". They're still exactly
10 words and still the story: in act 1 the chips stick on and the bar fills.

**`L.hero.anim.alt`** (sr-only; it names no dollar figure, per R3):
- **Current:** "Illustration: a Satchel holds 0.05 BTC and 0.80 ETH. Its seller lists it for 300 NEAR, and signing pauses. The
  buyer's browser checks its 3 past signatures: none can move the coins, so Buy turns on. One transaction moves the
  Satchel to the buyer and pays the seller, and the coins go with it."
- **New:** "Illustration: a Satchel holds BTC, ETH, SOL and USDC. Its seller lists it for 2,000{NBSP}NEAR, and signing
  pauses. The buyer's browser checks its 3 past signatures: none can move the coins, so Buy turns on. One transaction
  moves the Satchel to the buyer and pays the seller, and the coins go with it."
- If the price stays at 300 NEAR, use the same text with "300{NBSP}NEAR". The designer may adjust the first sentence to
  match the final picture.

---------------------------------------------------------------------------------------------------------------------
## 5. Word budgets (visible words; the landing renders the Solana variants)

| Section | Today | New | Cap |
|---|---|---|---|
| Hero copy (who-line + H1 + lead + CTAs) | 61 | 61 | 61 |
| `#top` (hero + note) | 68 | 68 | — |
| What | 42 | **48** (F1) | 50 |
| Uses | 50 | 50 | 50 |
| **What else it does (new)** | — | **49** | 50 |
| How | 48 | 48 | 50 |
| Clean | 50 | 50 | 50 |
| Trust | 49 | 49 | 50 |
| Hood (closed) | 12 | 12 | exactly 12 |
| Captions (sr-only) | 10 | 10 | exactly 10 |
| Questions (closed) | 41 | 41 | 50 |
| Try it | 34 | 34 | 50 |
| **Above Questions** | **319** | **374** | 325 → **380** |

- The copy unit test (no-Solana keys) gives the same total:
  - hero 60 + captions 10 + what **47** + uses 50 + more **49** + how 47 + clean 50 + trust 49 + hood 12 = **374**;
  - its Solana triple becomes `[61, 48, 48]`.
- **F1 alone breaks today's cap.** 319 + 6 = 325 sits exactly at 325, and "the NFT's owner" (one more word) would go over.
  So the cap moves anyway. Strip above Questions: cap **380**, which keeps the 6 spare words we have today. Strip below
  Questions: it stays out of the count, and 325 sits exactly at the cap; raise it to 330.
- **Optional trims if Razvan wants it leaner:**
  - T1: What drops "on their own chains" (−4 → 370). Its job overlaps "no bridge, no wrapped tokens", but risky claim 14
    introduced that wording, so I don't push it.
  - T2: the strip drops to four items without "Take it all out" (−9 → 365).
- **Height (designer to measure).** A stacked strip is roughly 700–800 px at 390, so the page goes from 8,450 to about
  9,200 against today's cap of 8,500. That needs a new cap, near 9,300. At 1280 a 3 + 2 grid adds about 450 px (5,833 → about
  6,300, cap 6,500).

---------------------------------------------------------------------------------------------------------------------
## 6. Copy-test check (`test/unit/config-copy-theme.test.ts` and the specs that pin text)

| Rule | Result for every new string above |
|---|---|
| Bans: cooldown, MPC, yocto, Tgas, domain_id, yield, "no signature exists", "no funds moved", "Safe to buy", "Buyable in", `$` + digit, "Pay with", delegate(s), approval, "Satchel broadcasts it", "every chain" | None. The dollar figure is a number (8000), composed at render |
| Typed glyphs | None. "≈" comes from `copy.overview.estimate` |
| All-caps words (3+ letters) | Only BTC, ETH, SOL, NEAR and USDC, which are allowed. "NFT's", "OP" and "L2s" don't trip the rule |
| `Transfer(red\|ring)`, `delist*`, `\bfund\b` | None. "transfers" is lower case in rule 1, as before; "funded" and "refunds" pass |
| Landing generic: `#\d`, `.testnet`, UTC, alice, bob, "Live from", "belongs to", curly quotes | None |
| e2e `NOT_IN_TEXT` (times, "x min ago") | None ("2,000 NEAR" has no colon) |
| The disclosure ("not the contract", "this app does") exactly once | Unchanged: only `q-proves` says it. The strip, rules and answers never do |
| faq.test: every answer ≤ 50 words, every variant | q-keys 49 · q-proves 48 · q-chains 44/49/47/41 · q-cost 49 · q-testnet 44 (dev 42) |
| faq.test: "plain SOL transfers" unless none; "Solana messages" only in none; blockhash in rules 2 and 4 unless none; never "Solana tokens" or "other chains"; "Solana devnet" in every chains variant | Pass |
| `splitLead`: every answer has more than one sentence; leads | Pass. The new chains lead is its first sentence. The q-keys, q-proves, q-cost and q-testnet leads are unchanged |

**Pinned text the builders must update:**
- `unit/config-copy-theme`:
  - `anim.alt`, `desk.price`, `what.body(false)`, `uses.items[1]`, `hood.rules("off")[2].body`;
  - the `q-cost` tail regex → `/Satchel charges no fee\.$/`;
  - the budgets: what 47, a new `more` key 49, Solana `[61, 48, 48]`, the above-Questions sum 374.
- `unit/faq`:
  - `chains("send")`, its ending ("Anything else at its addresses can't be moved.") and the ui regex;
  - the chains lead in the `splitLead` list;
  - the `q-proves` ending;
  - the rule 1 title;
  - "others(dev) = others(final)" must also leave out `q-testnet`.
- `e2e/landing`: `SECTION_IDS` (+ `more`), `WORDS.aboveQuestions` 380, the heights.
- `e2e/landing-trust`: `toContain("Bitcoin testnet4, Ethereum Sepolia and Solana devnet")` → `toContain("SOL on Solana devnet")`.
- `e2e/flows.spec.ts:133`: `fund.anyone` (§7).
- The hero and card tests (`hero-loop`, `landing-hero`, `responsive`) follow the designer's notes.

---------------------------------------------------------------------------------------------------------------------
## 7. App strings, outside the landing (sending from the chain addresses only)

The safe line since C5 is "or someone they let spend within daily caps". Message signing, inside take-outs, listing,
giving, links and Take it all out stay owner-only (rulings R8). No string says "delegate". `copy/questions.ts` and the
onboarding files are untouched.

| File:key | Current | New | Source |
|---|---|---|---|
| `shell.ts` `app.badgeTip` (R5) | "Satchel runs on NEAR testnet, Bitcoin testnet4 and Ethereum Sepolia. Coins here have no value." | "Satchel runs on NEAR testnet, Bitcoin testnet4, Solana devnet and four Ethereum testnets. Coins here have no value." | R5; D-46; C7S:24-35 (responsive.spec reads the key) |
| `shell.ts` `mint.get[3]` (the Mint "You get" list) | "Only its owner can move the coins" | "Its owner decides who can move the coins" | C5:9-12, :19-24 |
| `satchel.ts` `how[1].title` (How it works on `/s/[id]`, judge-visible) | "Only the owner can sign" | "The owner decides who signs" | C5:125-129 |
| `satchel.ts` `how[1].body`, sentence 1 | "To move coins, the owner asks the Satchel contract." | "To move coins, the owner, or someone they let spend within daily caps, asks the Satchel contract." Sentence 2 is unchanged and still true: the contract checks who owns the NFT for both | sign.rs:47-48 |
| `satchel.ts` `verify.guarantee` (Verify, judge-visible) | "Anyone can re-derive these addresses. Only the current owner can get signatures for them." | "Anyone can re-derive these addresses. Only the current owner, or someone they let spend within daily caps, can get signatures for them." | C5:125-129 |
| `satchel.ts` `fund.anyone` (shown beside a chain address only: FundPicker, ReceiveSheet) | "Anyone can add coins. Only the owner can send them out." | "Anyone can add coins. Only the owner, or someone they let spend within daily caps, can send them out." | C5 (e2e `flows.spec.ts:133` pins it) |
| `satchel.ts` `wallet.fundcard.body` (unread today) | "…Only its owner can send them out." | "Anyone can send testnet coins to its addresses. Only its owner, or someone they let spend within daily caps, can send them out." | C5 |
| `multichain.ts` `coins.chainNote(network)` (Holdings, chain coins only) | "At this Satchel's own address on {network}. Only its owner can send it." | "At this Satchel's own address on {network}. Only its owner, or someone they let spend within daily caps, can send it." | C5 |
| `multichain.ts` `fundPage.whose(id)` (`/fund` header and meta description, shown for every coin, inside ones too) | "…Coins sent here belong to it, and only its owner can send them out." | "Satchel #{id} is an NFT on NEAR testnet with its own addresses. Coins sent here belong to it, and whoever owns it controls them." This is true for inside coins too, where only the owner can take them out. It uses the same words as `coins.addressesNote` | C5; C46:129-147 |
| `flows.ts` `send.guard.connectBody(id)`, shared with Sign a message | "Only the owner of Satchel #{id} can send from it." | Send: "Only the owner of Satchel #{id}, or someone they let spend, can send from it." Sign a message needs its own key (e.g. `msg.guard.connectBody`: "Only the owner of Satchel #{id} can sign messages with it."), a component change. The shared title "Connect the owner's wallet" is wrong for someone allowed to spend; Send could read "Connect your NEAR wallet" | C5:147 (messages are owner-only) |
| `flows.ts` `send.guard.notOwnerBody(account, owner)`, shared by Send (shown only to someone who is neither owner nor allowed), Sign a message and Take it all out | "You're connected as {account}. Only {owner} can send from it." | Send: "You're connected as {account}. Only {owner}, or someone they let spend, can send from it." New keys for the other two: Sign a message "…Only {owner} can sign messages with it."; Take it all out "…Only {owner} can take everything out." | C5; wallet-ops.ts:77-117 |

**Checked and kept, because they're true:**
- `satchel.ts` `page.visitorSub` ("Whoever owns Satchel #{id} controls the coins…") and `page.meta` ("…the new owner controls
  the coins."): the owner controls them, decides who else may spend, and can revoke. Judge text stays word for word.
- `multichain.ts` `coins.addressesNote`, `coins.insideNote` and `msg.*` (owner-only); `market.ts` `inside.addBody` (inside
  take-outs are owner-only).
- `flows.ts` `xfer.rows.you` ("Only the new owner will be able to sign."): access is cleared in the same transaction as
  the gift.
- `xfer.guard.*`, `giveLink.guard.*` and `empty.guard.*`: owner-only actions.
- `shell.ts` `errors.E3`: `ERR_NOT_OWNER` only reaches an account with neither ownership nor access; the copy test pins it.
- `satchel.ts` `fund.only.evm`: it shows only for Sepolia ETH, and other picks get `addUsdcNote`.

**Also stale, not about owners (optional):**
- `commerce.ts` `clean.verdict.checking(n)[1]`: "Reading Bitcoin testnet4 and Ethereum Sepolia from your browser." →
  "Reading Bitcoin, Ethereum and Solana from your browser."
- `satchel.ts` `proof.cleanTip`: "…against Bitcoin testnet4, Ethereum Sepolia and Solana devnet: …" → "…against Bitcoin
  testnet4, Solana devnet and the four Ethereum testnets: …" (clean-view.test reads the key).

---------------------------------------------------------------------------------------------------------------------
## 8. Open questions (decided in `rulings.md` R9)

1. **The price tag, 300 → 2,000 NEAR.**
   - Next to "≈ $8,000.00 at mainnet prices", 300 NEAR (about $1,200 at the same sample prices) looks like a mistake to
     anyone who knows NEAR's price.
   - 2,000 NEAR is par at the sample prices. The change touches `desk.price`, `anim.alt`, `uses.tags[0]` and the hang
     tag's width.
   - Fallback: keep 300 NEAR with a ≈ $1,200.00 sample (the same 50/25/15/10 shares), and draw no native amounts on the
     new-style cards.
2. **The strip:** five items at 49 words (recommended), or the six-item fallback, also 49, for a 3×2 grid. Its placement
   decides the cap: above Questions → 380; below → 330.
3. **F7** needs a small `faqItems` change (`aDev`). The two shared send guards in §7 need new keys and component edits.
   Both are outside pure copy.
4. **`usdText` and `shareText`:** move them to `lib/format.ts` so the landing can format the sample without importing
   `lib/overview` → `lib/holdings`.
