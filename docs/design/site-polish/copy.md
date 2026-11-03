# Copy for the site polish round (copywriter, 2026-11-03)

Inputs:
- the team context (Razvan's ask and answers, now `plan/decisions.md` D-52) and the app lane's note on the
  `/questions` group title;
- last round's `copy.md`, `rulings.md` (R1–R9) and `facts.md` (`docs/design/site-refresh/`);
- `docs/design/satchel-2.0/voice-copy.md` §1 and §5, and `refs-code.md`;
- the code at fe2e0a6: `landing.ts`, `shell.ts`, `faq.ts`, `lock-facts.ts`, `NavShell.tsx`, `LandingMenu.tsx`, every
  landing section, `art.tsx`, `landing.css`, `layout.tsx`, `(landing)/page.tsx`, the OG images, and every test named
  below;
- the server HTML of `localhost:3210/` (role dev, fixture), saved as a working file (not kept).

Conventions:
- **L** = `apps/web/src/lib/copy/landing.ts`, **S** = `apps/web/src/lib/copy/shell.ts`, **W** = `apps/web/src`.
- Strings are exact, with straight apostrophes. `${NBSP}` marks a no-break space before a ticker.
- "Visible" means the words the e2e counts. Attribute-drawn labels (`data-l`) and answers inside closed `<details>` add 0.
- I edited no product file.
- Every count and lint below comes from two working scripts (not kept). They copy the tests' three
  counters and the copy test's bans, and reproduce today's pinned numbers exactly: unit sections, 374 above Questions,
  the Solana triple [61, 48, 48] and tryIt 34. They also apply the team brief's bans: delegate, approval, MPC, trustless,
  every chain, testnet, devnet, Sepolia, mainnet, no value, soon. Every new string passes.

**Read with `rulings.md`.** P1–P5 settle §11, and the rulings win where they differ from this deck. P1 names R-a's
option `framing: "product" | "deployment"` (this deck's `net`), and the build calls its strings `aDeployment` (this
deck's `aTestnet`). Under P1, `/questions` also keeps `q-testnet`'s old question and its group title.

---------------------------------------------------------------------------------------------------------------------
## 0. Decisions in brief

1. **Network names on `/`:** Bitcoin · Solana · Ethereum, Base, Arbitrum and **Optimism** · NEAR.
   - **Why "Optimism", not "OP Mainnet":**
     - The other three are brand names, not official chain names: we say "Arbitrum", not "Arbitrum One".
     - "Optimism" is Razvan's own word in the ask.
     - "OP Mainnet" would put the word "Mainnet" back into the page text right after we remove "at mainnet prices". It
       reads as a live-on-mainnet claim.
     - It's the name most readers recognise.
   - The app keeps "OP Sepolia", the official testnet name.
2. **`q-testnet` becomes "Is it audited?".**
   - The id stays `q-testnet`, and the bold lead is "No.".
   - The dev twin `aDev` stays.
   - The `/questions` group title becomes **"Safety and wallets"**. The group id stays `testnet`. (P1 overruled the
     title: `/questions` keeps today's text, so it stays "Testnet and safety".)
3. **The dev trust body** drops from 37 to 26 words:
   > "This site's contract still has keys, so we can change its code. The release contract is born with no key and no
   > admin or upgrade methods."

   The dev Trust band comes to **50** visible words; it renders 61 today, over its own cap (§7).
4. **The Uses hint:** U1, an attribute-drawn chip **"+ USDC and L2s"** (0 visible words).
5. **Removed from `/`:**
   - the hero note and the final CTA note (the key `copy.home.note` is deleted: only these two read it);
   - the landing footer's testnet row;
   - "at mainnet prices" on all 4 art cards;
   - the role strip, **on every page** (`copy.role` is deleted);
   - the Trust rc note.
6. **Rulings needed (§11; decided in `rulings.md` P1–P5):**
   - **R-a**, the most important: `/questions` is an app page. I recommend it keeps this deployment's network names in
     three shared answers.
   - **R-b:** the landing's menu-sheet line.
   - **R-c:** U1 or U2.
   - **R-d:** `tb1q…` → `bc1q…`.
   - **R-e:** the above-Questions cap.

---------------------------------------------------------------------------------------------------------------------
## 1. Badge only on `/`: every testnet, dev-role, "no value" and "mainnet prices" mention

Source of the inventory:
- `curl localhost:3210/` (role dev), with scripts stripped: text nodes plus every attribute;
- greps of `L`, `S`, `faq.ts`, `lock-facts.ts`, `components/landing/**`, `NavShell.tsx` and `LandingMenu.tsx`;
- the role rc paths read from the code.

### 1.1 The inventory

| # | Where on `/` | Source | Today | Action | Key's other readers |
|---|---|---|---|---|---|
| 1 | Header badge (text "Testnet") and its tooltip (`title`) | `S.app.badge`, `S.app.badgeTip`; `NavShell` `TestnetBadge` | "Testnet"; "Satchel runs on NEAR testnet, Bitcoin testnet4, Solana devnet and four Ethereum testnets. Coins here have no value." | **Keep.** It is the one testnet signal. Below 420 px, signed out, it steps aside (`responsive.spec`); see R-b | app shell |
| 2 | Role strip, under the header, outside `<main>` | `S.role.dev`, `S.role.rc`; `NavShell` `Strips` | dev: "Dev contract: lock and code checks skipped"; rc: "Release candidate: testnet rehearsal" | **Remove on every page.** Delete `copy.role` (§6) | `lockView` (rc note, #12) only |
| 3 | Fixture strip | `S.app.fixture` | "Sample data: these pages don't read the chains live." | Keep (fixture mode only; D-52) | app |
| 4 | `<meta name="description">` and `og:description` | `L.meta.description(sol)`; `(landing)/page.tsx` | "An NFT on NEAR testnet with its own Bitcoin, Ethereum and Solana addresses. …" | **New**, §1.2 | none |
| 5 | `<title>`, `twitter:description`, OG and Twitter image text and alts | `L.meta.title`; root `layout.tsx`; `opengraph-image.png`, `twitter-image.png`, `*.alt.txt` | "An NFT that is a wallet · Satchel"; "An NFT that is a wallet."; image: "satchel / An NFT that is a wallet."; alt "Satchel: an NFT that is a wallet" | Keep: no testnet words (checked, images included) | — |
| 6 | Hero note, `#top` | `S.home.note`; `HeroSection.tsx:54-57` | "Testnet only. Coins here have no value." | **Remove** the `<p data-hero-note>` and the `Icon` and `Info` imports | FinaleSection only, so **delete the key** |
| 7 | "at mainnet prices" ×4 (`data-l`): hero card, What card, How step 3 card, catch desk 1 card | `copy.overview.atPrices` via `ArtOverview` (`art.tsx:93`) | "at mainnet prices" | **Remove** the `<Lbl l={o.atPrices} className="lp-card__prices" />` line, so the cards read just "≈ $8,000.00". Delete the dead `.lp-card__prices` rules (`landing.css:114`, `:220`, `:256`, `:293`). Keep the `.lp-card__est` wrapper (the loop's `est` hook) | **Keep the key:** `SatchelCard.tsx:79` and `Overview.tsx:51` (app, `IS_TESTNET`) |
| 8 | What tags (`data-l`) | `L.what.tags.btcAddr` | "tb1q…" (the *testnet* bech32 prefix) | **"bc1q…"**, the mainnet form, still generic. Optional (R-d) | none |
| 9 | Under the hood, rule 1 (closed, in the HTML) | `L.hood.rules(sol)[0].body` | "…ETH and USDC transfers on four Ethereum testnets…" | **New**, §1.2: "…on four Ethereum networks…" | none |
| 10 | Trust, dev H2 | `L.lock.dev.h2` | "Development contract" | Keep (R2 twin) | — |
| 11 | Trust, dev body | `L.lock.dev.body` | "…so the lock and code checks are skipped here…" | **New**, §3 | — |
| 12 | Trust, rc note | `S.role.rc` via `lockView().note`; `TrustSection.tsx:44-49` | "Release candidate: testnet rehearsal" | **Remove** (§6) | — |
| 13 | "What else it does", item 4 line | `L.more.items[3].body` | "Ethereum, Base, Arbitrum and OP Sepolia." | **"Ethereum, Base, Arbitrum and Optimism."** (§5) | — |
| 14 | `q-keys` (closed) | `L.questions["q-keys"].a` | "…and on testnet that network's own contract account has full-access keys." | **New** on `/`: the clause goes (§1.2). Mainnet `v1.signer` has **0** keys (kb/70 F17); the testnet caveat stays in the README and, under R-a, on `/questions` | `/questions` (R-a) |
| 15 | `q-keys` dev line | `L.questions.keysDev` | "…so its lock checks are skipped." | **New**, §3 | `/questions` |
| 16 | `q-proves` (closed) | `L.questions["q-proves"].a` | "…NEAR's signer network or testnet4 reorgs." | **New** on `/`: "…or Bitcoin reorgs." | `/questions` (R-a) |
| 17 | `q-chains` (closed) | `L.questions["q-chains"].a(sol)` | "BTC on Bitcoin testnet4, SOL on Solana devnet, and ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia. …" | **New** on `/`, all four variants (§1.2) | `/questions` (R-a) |
| 18 | `q-testnet` (closed) | `L.questions["q-testnet"]` | "Why testnet only? Is it audited?" plus "…use a NEAR testnet wallet…" | **New**, §2 | `/questions` (shared) |
| 19 | Final CTA body | `L.cta.body` | "Look around without a wallet. To mint your own, connect a NEAR testnet wallet." | **New:** "Look around without a wallet. To mint your own, connect a NEAR wallet." The connect dialog keeps the testnet guidance (#23) | none |
| 20 | Final CTA note | `S.home.note`; `FinaleSection.tsx:38-41` | "Testnet only. Coins here have no value." | **Remove** the `<p>` and the `Icon` and `Info` imports; also the doc comment's "and the testnet note" | (key deleted, #6) |
| 21 | Footer's bottom row on `/` | `Badge kind="testnet"` (aria-hidden) and `S.footer.testnet`; `NavShell` `Footer` | badge + "Testnet only. Coins here have no value." | **Remove both when `surface === "landing"`.** The row keeps the ThemeControl. The app footer is unchanged | **Keep the key:** SideNav (`NavShell:151`), app Footer, MenuSheet (`LandingMenu:292`) |
| 22 | Menu sheet's last line (client, shown when opened; not in the server HTML) | `S.footer.testnet` | "Testnet only. Coins here have no value." | **Keep** (recommended, R-b) | app sheet |
| 23 | Connect dialog (client, on open) | `S.connect.body` | "Satchel runs on NEAR testnet. Pick a wallet that holds a testnet account." | Keep: it's functional (D-52) | — |
| 24 | Footer "Hackathon / NEAR Hackathon"; "A live Satchel" (footer, hood link) | `S.footer.*`, `L.hood.links.one` | — | Keep. Not network mentions: "live" means real and on-chain, never "on mainnet" | — |

**Checked and clean (no edit):**
- the who-line, H1, lead, CTAs, `anim.alt` and captions;
- every `desk` label, including "2,000 NEAR", the "≈ $8,000.00" total and the chips;
- What's H2 and body, and Uses (the hint is §4);
- How, including "Usually about 10 seconds.";
- the catch's beats, `alt` and labels;
- Trust final: the body, limits, slip and CTA;
- the hood summary, rules 2–6 and links;
- `q-send`, `q-after`, `q-cost`;
- the strip's items 1–3 and 5 and its help labels;
- every `aria-label` (13);
- the page has no `<img alt>` and no JSON-LD.

`copy.home.lead` ("…addresses on testnet…") is the root layout's site-wide description. It never renders on `/`,
because `(landing)/page.tsx` overrides it. Keep it (app).

### 1.2 The new strings

```ts
// L.meta
description: (sol = false) =>
  `An NFT on NEAR with its own ${sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum"} addresses. Give it or sell it, and everything inside goes too; a buyer's browser checks every past signature first.`,

// L.what.tags (R-d; optional)
btcAddr: "bc1q…",

// L.hood.rules(sol)[0].body: one word changes in each variant (testnets → networks); q-chains names the four
none
  ? "The contract signs only what it can read: ETH and USDC transfers on four Ethereum networks, standard Bitcoin spends and Ethereum text messages. It refuses raw hashes, permits, any other contract call and Solana messages."
  : "The contract signs only what it can read: ETH and USDC transfers on four Ethereum networks, standard Bitcoin spends, plain SOL transfers and text messages. It refuses raw hashes, permits and any other contract call.",

// L.more.items[3]
{ title: "USDC and L2s", body: "Ethereum, Base, Arbitrum and Optimism.", help: { anchor: "q-chains", label: "Which chains and coins work" } },

// L.questions["q-keys"].a (38 words; was 49)
"No single party. NEAR's signer network makes each signature together, only when the Satchel contract asks, for the NFT's owner or someone they let spend within daily caps. You trust that network: enough colluding nodes could sign anything.",

// L.questions["q-proves"].a (48 words, unchanged count)
"Every signature the Satchel has ever made. Your browser, not the contract, checks each one on its own chain, and Buy stays off until none can still move the coins. It doesn't cover tokens other than USDC, signatures made after you buy, NEAR's signer network or Bitcoin reorgs.",

// L.questions["q-chains"].a: one builder, names by `net`. `net = "testnet"` reproduces today's four strings byte for
// byte (checked), so R-a's /questions twin costs no new copy. Without R-a, drop `net` and keep the product names.
a: (sol: SolVariant = "off", net: "product" | "testnet" = "product") => {
  const n =
    net === "product"
      ? { btc: "Bitcoin", sol: "Solana", evm: "Ethereum, Base, Arbitrum and Optimism" }
      : { btc: "Bitcoin testnet4", sol: "Solana devnet", evm: "Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia" };
  const evm = `ETH and USDC on ${n.evm}`;
  const lead = sol === "ui" ? `BTC on ${n.btc}, SOL on ${n.sol}, and ${evm}.` : `BTC on ${n.btc}, plus ${evm}.`;
  const middle =
    sol === "ui"
      ? "The four Ethereum networks share one address. A Satchel can also hold NEAR inside. "
      : sol === "send"
        ? `Each Satchel also has a ${n.sol} address; its owner can send SOL from the app, and clean history checks those signatures too. `
        : sol === "none"
          ? `Each Satchel also has a ${n.sol} address, but this contract doesn't sign for Solana. `
          : `Each Satchel also has a ${n.sol} address; the contract can sign SOL transfers, but the app can't send SOL yet. `;
  return `${lead} ${middle}The app can't move anything else at its addresses.`;
},

// L.cta
body: "Look around without a wallet. To mint your own, connect a NEAR wallet.",
```

**What `/` renders for `q-chains` (variant `ui`, 39 words; was 45):** "BTC on Bitcoin, SOL on Solana, and ETH and USDC on
Ethereum, Base, Arbitrum and Optimism. The four Ethereum networks share one address. A Satchel can also hold NEAR
inside. The app can't move anything else at its addresses."

**Honesty:**
- Every string describes the product's design:
  - the EVM allowlist is frozen at birth, so a mainnet birth carries the four mainnet networks;
  - USDC is EVM USDC only (R1);
  - "NEAR inside" is generic.
- No string says live, mainnet, value, a date or "soon".
- "The app can't move anything else at its addresses" holds under both name sets.

---------------------------------------------------------------------------------------------------------------------
## 2. `q-testnet` → "Is it audited?"

```ts
"q-testnet": {
  // kb/90 §4 T2, T9; risky claim 21; D-52: the landing names no testnet, the header badge does
  q: "Is it audited?",
  // rc and final (31 words; was 44)
  a: "No. Satchel is new hackathon software. Its contract can't be upgraded, so a bug can't be patched in place, and if NEAR's signer network changed its interface, its Satchels couldn't sign.",
  // site-refresh R2, F7; role dev (41 words; was 42): dev2 has keys
  aDev: "No. Satchel is new hackathon software. The development contract behind this site can still be upgraded; the release contract can't, so a bug there can't be patched in place, and if NEAR's signer network changed its interface, its Satchels couldn't sign.",
},
```

**What it keeps (the team brief's three points):**
- "new" and "No." to "Is it audited?", i.e. unaudited;
- can't be upgraded, on rc and final only (R2);
- the dev twin, which now also carries the signer-network risk that it dropped last round.

**What it drops:**
- "To try it, use a NEAR testnet wallet such as Meteor or Intear." The guidance stays at the point of action: the
  connect dialog, `q-wallets` and `mint.walletHint`.

**Why a bold lead of "No.":**
- `splitLead` takes "No." as the lead, as `q-after` does, and the rest follows.
- "Satchel is new hackathon software" with "No." already says "unaudited". Saying "unaudited" again would echo.

**Impact on `/questions` (shared word for word in every R-a option):** (P1 overruled this: `/questions` keeps today's
`q-testnet` and the group title "Testnet and safety".)
- `FAQ_GROUPS` (`faq.ts:127`): `{ id: "testnet", title: "Safety and wallets", ids: [...] }`.
  - The id `testnet` stays: it's the `#testnet` jump-list anchor.
  - The title covers q-testnet (audit and upgrades), q-wallets, q-safety-message and q-feedback. The survey answer
    fitted the old title no better.
- Nothing else links `q-testnet`: no HelpLink, no onboarding link.
- The app lane's answers in `copy/questions.ts` are untouched.

**Tests:**
- `faq.test.ts`:
  - the questions list (`:48`): "Is it audited?";
  - the dev phrase (`:71`): `toContain("development contract behind this site can still be upgraded")`;
  - the splitLead leads (`:203-211`): the last entry becomes "No.".
- `config-copy-theme.test.ts` (`:188`): "Is it audited?".
- The closed Questions budget goes from 39 to **36** (§7).

---------------------------------------------------------------------------------------------------------------------
## 3. The dev trust body, the two dev answers, and the code card's labels

```ts
// L.lock.dev (R2: the dev twin, reworded without "checks are skipped"; D-52)
dev: {
  h2: "Development contract",
  body: "This site's contract still has keys, so we can change its code. The release contract is born with no key and no admin or upgrade methods.",
},
// L.questions.keysDev (appended to q-keys on role dev; 12 words; q-keys dev = 50, was 65)
keysDev: "This site's development contract has keys, so we can change its code.",
```

**Why it's true:**
- dev2 has full-access keys and was redeployed in place on Oct 30 and Oct 31 (site-refresh facts §1.9). "We" (the team) hold them.
- The release contract (rc, then final) is born in one transaction with no AddKey, and its wasm has no admin or upgrade
  method (INV-22). The sentence names its design. It never says it already exists, and it gives no date.
- It doesn't say what the checks skip: the buyer's Clean history checklist keeps that line (`copy.clean.checks.dev`).
- The voice mirrors the final body ("Nobody can … change its code, us included").

**Counts:**
- body: 37 → **26**;
- dev Trust (H2 + body + limits + CTA): 61 → **50**, at the section cap;
- the dev page above Questions: 386 → **367**.

**Tests:**
- `lock-facts.test.ts:35` `toContain("still has keys")` still passes.
- `trust-band.test.ts:64` `inOrder` still passes.
- `faq.test.ts:69` `toContain("development contract")` still passes for `keysDev`.
- No test pins either string word for word.
- Suggested guard, since e2e runs role final and can't see dev: in `config-copy-theme`,
  `expect(words(L.lock.dev.h2, L.lock.dev.body, L.lock.limits, L.lock.cta)).toBeLessThanOrEqual(50)`.

**The code card (`refs-code.md` Concept 1) checked as copy:**
- These are all true, pass every ban, and are 0 visible words (they're `data-l`):
  - the four captions: "Owner, or someone they let spend" · "Refuses raw hashes, unreadable requests" · "Written here,
    before anything is signed" · "NEAR's signer network, called last";
  - the comments;
  - `sign_network::sign`, which avoids the banned word "MPC".
- **One must-fix: label the card as simplified.** The excerpt isn't the repo's code, and a judge who diffs it against
  `sign.rs` would call it fabricated. Draw the header as `sign_for` plus a small muted tag **"Simplified"**.
- **Optional:** "Owner, or someone they let spend within daily caps" is more exact (R8) if the width allows.
- If the labels live in the copy deck (for example `L.lock.dev.code`), add them to the copy test's generic list.
- The card must show no slip value of the final variant: never "None since birth" and never "Born without a key" (R2).

---------------------------------------------------------------------------------------------------------------------
## 4. Uses: a hint under "Sell BTC, ETH and SOL together"

The row today is a 56 px sticker tile (it spans 2 rows), the H3 title, then the muted body "One trade, in NEAR. Neither
side sends first." The section sits **at its 50-word cap**.

| Option | Form | Exact string | Visible words | Notes |
|---|---|---|---|---|
| **U1 (recommended)** | An attribute-drawn chip (`aria-hidden`, `data-l`) under the body, styled like the card's "+N" chip, optionally with a sky USDC dot (`COIN_FILL.USDC`) | **"+ USDC and L2s"** | **0**: Uses stays 50 | It repeats the strip's tile title, so the eye links the hint to the place that explains it, and that tile's "?" opens `q-chains`. Text readers get the same fact in the strip. Precedent: v4's Uses rows had attribute-drawn hang tags (`uses.tags`). Alternative labels: "+ USDC, Base, Arbitrum and Optimism" (concrete, busier) or "+ USDC and more" (vaguer) |
| U2 | A muted suffix line in real text, smaller than the body | "Plus USDC and L2s." | **+4**: Uses 54, unit above Questions 377, e2e 370 | The most accessible. It **breaks the e2e's per-section cap of 50** for `#uses`, so it needs a Uses-only cap of 54 in `landing.spec` (`WORDS`) and in the unit `sections`. Only take it if Razvan wants judges to read the hint |
| U3 | A small "+N" tag after the title, attribute-drawn | "+2" (USDC and NEAR, as the app groups coins: wNEAR counts as NEAR) | 0 | The weakest: it reads as a notification count, and N is arguable. Not recommended |

**Left out on purpose:**
- **NEAR inside.** In a row that already says "in NEAR" (the sale currency), a second NEAR reads as the price (R1:
  mention NEAR inside only where it adds value).
- **USDC on NEAR** (R1).
- "every L2" (C7S).

**U1 build note:**
- Add a new key **outside `items`**: `L.uses.hint: "+ USDC and L2s"`.
  - `config-copy-theme`'s `toEqual(L.uses.items)` and its `allStrings` counter would otherwise break or count it.
- Render it in row 1 only, inside an `aria-hidden` box, as `<Lbl l={u.hint} />`.
- Tests:
  - `config-copy-theme`'s generic list gets `L.uses.hint`;
  - `landing.spec`'s "illustrations are aria-hidden" loop gets `L.uses.hint` (it's `data-l` and not in the text).

---------------------------------------------------------------------------------------------------------------------
## 5. "What else it does" as a five-tile bento

**The tiles: titles and lines kept, item 4 in mainnet framing (48 visible words; was 49; cap 50):**

| # | Title | Line | Help (`aria-label`, 0 words) |
|---|---|---|---|
| 1 | Make an offer | Even if it's not for sale. | `q-offers` "How offers work" |
| 2 | Give by link | To someone not on NEAR yet. | `q-give-link` "How giving by link works" |
| 3 | Let someone spend | Daily caps, until it changes hands. | `q-allow-what` "What someone you add can do" |
| 4 | USDC and L2s | **Ethereum, Base, Arbitrum and Optimism.** | `q-chains` "Which chains and coins work" |
| 5 | Take it all out | Every coin to your wallets. | none (no `/questions` id) |

**Optional hero-tile line.** It replaces that tile's line, within the cap. Only one tile takes it:

| Hero tile | Line | Words | Strip total |
|---|---|---|---|
| Make an offer (my pick: the commerce story's sibling, rich art) | "On any Satchel, even one not for sale." | 8 | 50 |
| Let someone spend | "Access with daily caps, until it changes hands." | 8 | 50 |
| Give by link | "To someone who isn't on NEAR yet." | 7 | 49 |
| Take it all out | "Every coin to the wallets you choose." | 7 | 50 |
| USDC and L2s | none fits: the line is already the list | — | — |

No section lead fits: a 7-word lead would make 55. Every hero line is true:
- offers: C46:14-17, any Satchel;
- access: cleared on every change of owner, C5:208-213;
- the take-out: `copy.empty.intro`.

**Attribute-drawn art labels (0 words; app strings where they exist; `aria-hidden` art):**

| Tile | Labels | Source |
|---|---|---|
| Make an offer | "Your offer" · `1,900${NBSP}NEAR` (new sample: a bid under the 2,000 NEAR par; NEAR only, R1) · "Expires in 7 days" · "Before you offer" · "Clean history" · "Accept" · pill "Active" (not for sale) | `copy.offers.amount`, `.expiry` + `.expiry7`, `.checkTitle`, `.incoming.accept`; `copy.landing.desk.clean`; `copy.pill.active` |
| Give by link | "The claim link" · "Copy link" · "Claim to my wallet" · "Claimed" | `copy.giveLink.linkLabel`, `.copy`; `copy.claim.claimTo`, `.claimedTitle` |
| Let someone spend | "Who can spend" · "Daily caps" · `copy.allowance.capRow("ETH", "0.20", "0.50")` = "0.20 of 0.50 ETH left today" · "Revoke" | `copy.allowance.manage.title`, `.add.capsTitle`, `.capRow`, `.manage.revoke` |
| USDC and L2s | "Ethereum" · "Base" · "Arbitrum" · "Optimism" (text chips) · "ETH" · "USDC" · "One address on all four" (new) | C7S:37-38 (one EVM address on all four) |
| Take it all out | "Take it all out" · "Where to" · "Bitcoin sent" · "Ethereum sent" · "Solana sent" · "Everything's out" | `copy.empty.cta`, `.stepAddresses`, `.chainDone(chain)`, `.allDoneTitle` |

**Rules for the tile art:**
- No Base, Arbitrum, Optimism or USDC logos: those are third-party marks. Use text chips; our charms exist only for BTC,
  ETH and SOL.
- No names: the generic test bans alice and bob, so draw an avatar as an icon.
- Offers show NEAR only (R1). Never "refunded automatically" (R6).
- The spend tile shows sending only: no message, sale or listing (R8).

---------------------------------------------------------------------------------------------------------------------
## 6. Removing the role strip and the rc note: code and tests

**Code:**
- `NavShell.tsx` `Strips`:
  - keep only the fixture row: `if (!IS_FIXTURE) return null`, then the one `data-testid="fixture-strip"` row;
  - drop the role row (`:161`), the `tone` field and the now-unused imports `TriangleAlert` and `CONTRACT_ROLE`;
  - fix the doc comment at `:157`: "The fixture ("Sample data") strip".
  - `(landing)/layout.tsx` keeps `<Strips contained />`.
- `S.role` (`:67-70`): **delete**. Also take "role" out of the namespace list in `S`'s header comment.
- `lock-facts.ts`:
  - `LockView` loses `note`;
  - `lockView`: `role === "dev" ? { variant: "dev", h2: L.dev.h2, body: L.dev.body } : { variant: "locked", h2: L.h2, body: L.body }`;
  - doc comment: rc reads like final.
- `TrustSection.tsx`: delete the `v.note` block (`:44-49`, `data-testid="lock-note"`), the `FlaskConical` import and
  the doc comment's "rc adds the release-candidate line".
- **Kept:**
  - `copy.clean.checks.dev` (`commerce.ts:221`, the buyer's Clean history checklist);
  - `/contract`'s role: `copy.contract.roles`, `devH1`, `devSub`, `devSubLocked`.

**Tests:**
- `test/unit/lock-facts.test.ts`:
  - `:22`: `toEqual` without `note`;
  - `:27-28` becomes "rc: the same band as final", i.e. `expect(lockView("rc")).toEqual(lockView("final"))`, and the
    `copy.role.rc` lines go;
  - `:33`: `toEqual` without `note`;
  - `all()` (`:15-18`) drops `v.note`.
- `test/unit/trust-band.test.ts`:
  - `:51` (`copy.role.rc`): delete;
  - `:54-59` becomes "rc renders exactly the final band", i.e. `expect(trust("rc")).toBe(trust("final"))`;
  - **suggested new test:** for every role, `text(trust(role)) + text(questions(role, "ui"))` doesn't match
    `/skipped|testnet|devnet|sepolia|rehearsal/i`. This is the only place role dev and role rc get checked.
- `test/e2e/landing-trust.spec.ts:77` (`copy.role.rc`): delete, or replace it with
  `expect(trust).not.toContain('data-testid="lock-note"')`.
- `test/unit/shell.test.ts`: no role-strip test exists today. Add:
  `renderToStaticMarkup(createElement(Strips))` doesn't contain `role-strip`. In the unit env (fixture mode) it also
  contains `copy.app.fixture`.
- e2e: nothing asserts the strip. e2e runs role final, where it never showed.

---------------------------------------------------------------------------------------------------------------------
## 7. Word budgets, before → after

Counted by the tests' own rules. "After" is this deck's default: U1, no hero line.

| Budget (where it's pinned) | Today | After | Notes |
|---|---|---|---|
| unit `sections.hero` (`config-copy-theme:250`) | 60 | 60 | The note was never in it |
| unit `captions` / `what` / `uses` / `how` / `clean` | 10 / 47 / 50 / 47 / 50 | the same | U2: `uses` 54 |
| unit `more` | 49 | **48** | +1 or +2 with a hero line |
| unit `trust` (final body) | 49 | 49 | |
| unit `hood` | 12 | 12 | |
| unit `questions` (closed) | 39 | **36** | "Is it audited?" |
| unit `tryIt` (`:244`, reads `copy.home.note`) | 34 | **26** | −7 for the note, −1 for "testnet"; drop `copy.home.note` from `words()` |
| unit Solana triple | [61, 48, 48] | [61, 48, 48] | |
| unit above Questions (exact, `:254`) | 374 | **373** | 374–375 with a hero line; 377 with U2 |
| e2e `WORDS.hero` ≤ 61 | 61 | 61 | |
| e2e every section ≤ 50 | max 50 | max 50 | U2 breaks `#uses` (54) |
| e2e hood = 12; captions = 10 | 12; 10 | 12; 10 | |
| e2e above Questions ≤ 380 (role final; counts the hero note) | 374 | **366** | Keep 380 (R-e) |
| dev Trust (untested) | **61** (over 50) | **50** | §3 guard |
| dev page above Questions (untested) | **386** (over 380) | **367** | |
| faq ≤ 50, rc and final (`faq.test:57-63`) | max 50 (`chains send`) | max 48 (`q-proves`) | |
| `q-keys` / dev | 49 / 65 | 38 / 50 | |
| `q-proves` | 48 | 48 | |
| `q-chains` ui / send / off / none | 45 / 50 / 48 / 42 | 39 / 44 / 42 / 36 | |
| `q-testnet` / `aDev` | 44 / 42 | 31 / 41 | |
| `q-cost` | 49 | 49 | |

The e2e height caps (6,500 at 1280; 9,000 at 390) are the designer's: the bento band and the trust card change them.
The removed notes give back about 20 px each.

---------------------------------------------------------------------------------------------------------------------
## 8. Tests touched, by file

- **`test/unit/config-copy-theme.test.ts`:**
  - `:188`: "Is it audited?";
  - `:194`: `L.cta.body`;
  - `:195-197`: `L.meta.description(false)` = "An NFT on NEAR with its own Bitcoin and Ethereum addresses. Give it or sell
    it, and everything inside goes too; a buyer's browser checks every past signature first.";
  - `:244`: `tryIt` without `copy.home.note`;
  - `:250`: `more: 48, questions: 36, tryIt: 26`;
  - `:254`: 373, and the comments at `:247-249` and `:253`;
  - the generic list (`:203-207`) gets `L.uses.hint` and any new bento or code labels;
  - add the dev-Trust guard (§3);
  - unchanged: `:96` `footer.testnet` and `:104` `home.lead`.
- **`test/unit/faq.test.ts`:**
  - `:48` "Is it audited?";
  - `:71` "behind this site";
  - `:79-86` the chains strings:
    - `send` exact: the §1.2 output;
    - `off` `toContain("Each Satchel also has a Solana address; the contract can sign SOL transfers, but the app can't send SOL yet.")`;
    - `ui` `/^BTC on Bitcoin, SOL on Solana, and ETH and USDC on Ethereum, Base, Arbitrum and Optimism\./`;
    - `none` `toContain("Each Satchel also has a Solana address, but this contract doesn't sign for Solana.")`;
    - the ending is unchanged;
  - `:94-98` (custody):
    - under R-a's T-lite, assert the clause on `net: "testnet"` and its absence on `/`;
    - under S, drop the `toContain` and keep `not.toMatch(/\bits contract account\b/)`;
  - `:112` the q-proves ending: "…or Bitcoin reorgs.";
  - `:143` `toContain("Solana devnet")` becomes `toContain("Solana")`;
  - `:203-211` leads: chains "BTC on Bitcoin, plus ETH and USDC on Ethereum, Base, Arbitrum and Optimism.", q-testnet
    "No.";
  - `:223` "word for word": T-lite compares with `faqItems({ …, net: "testnet" })`.
- **`test/unit/lock-facts.test.ts`, `trust-band.test.ts`, `shell.test.ts`:** §6.
- **`test/unit/hero-loop.test.ts`:**
  - `:173`: drop `o.atPrices` from the scene's labels, and add
    `expect(scene).not.toContain('data-l="at mainnet prices"')`;
  - `:238-246`: drop `copy.home.note` from the order, retitle the test without "and the note", and add
    `expect(hero).not.toContain("data-hero-note")`.
- **`test/e2e/landing.spec.ts`:**
  - `:124` title and `:133` order: drop `copy.home.note`;
  - `:114`: drop the dead `[data-hero-note]` exclusion;
  - `WORDS` comment `:20-23`;
  - **suggested new test "Badge only" (server HTML):**
    - `documentText(raw).match(/\b(testnet4?|devnet|sepolia)\b/gi)` equals `["Testnet"]`, the header badge's word;
    - no `/no value|mainnet prices/i`;
    - `noScripts(raw)` has none of `data-l="at mainnet prices"`, `role-strip` or `data-hero-note`.
- **`test/e2e/landing-trust.spec.ts`:**
  - `:77` (`copy.role.rc`): see §6;
  - `:137`: `toContain("SOL on Solana devnet")` becomes `toContain("SOL on Solana,")`.
- **Unchanged:**
  - `responsive.spec` (the badge tooltip stays; it asserts the sheet line only on `/contract`);
  - `judge.spec` (the `/s/1` card keeps "at mainnet prices");
  - `theme-a11y` (the landing footer keeps its ThemeControl);
  - `catch-story`;
  - `questions.spec`.

---------------------------------------------------------------------------------------------------------------------
## 9. Docs that would drift (for D-52 and the errata)

- **`plan/decisions.md`:**
  - **D-50** `:1140-1142` says the label is shown "every time, next to the 'Testnet only…' note". Since D-52, the
    landing art shows "≈ $X" with no label and no note. D-50 still holds in the app.
  - **D-51**:
    - `:1159` ("It shows '≈ $8,000.00 at mainnet prices'") becomes "≈ $8,000.00".
    - `:1164-1165` (the strip) becomes a five-tile bento on its own band.
    - "Rules kept" `:1169`: `q-testnet` is now "Is it audited?" (id kept, `aDev` kept).
    - The `q-chains` line `:1176` still holds for the testnet names.
- **`docs/design/site-refresh/rulings.md`:**
  - **R1** `:4` ("USDC on Ethereum, Base, Arbitrum and OP Sepolia"): the landing names Ethereum, Base, Arbitrum and
    Optimism.
  - **R3** `:18` ("Show it with '≈' and 'at mainnet prices'"): on the landing, "≈" only.
  - R2, R5 and R9.3 still hold. R2's twins are reworded.
- **`docs/design/site-refresh/copy.md`:**
  - §1 F2 ("the pinned phrase … stays"), F5, F6 and F7's wording;
  - §3 item 4;
  - §4.2 ("Under or beside it, always … at mainnet prices");
  - §5 budgets and §6 pins.
- **`docs/design/site-refresh/design-notes.md`:** `:29`, `:225`, `:245`, `:285`, `:309` and `:437` (the card's label
  and the loop's "≈ $8,000.00 / at mainnet prices" beat).
- **`docs/design/site-refresh/claims-audit.md`:** `:34` (the rule "Every dollar figure has ≈ and at mainnet prices")
  and `:46`.
- **`docs/design/site-refresh/facts.md`:** `:146`, `:150`, `:175` and `:194` (audit rows for the strips, the note,
  `role.rc` and the footer) are superseded. `:93` is an app fact and still holds.
- **`docs/design/satchel-2.0/design-spec.md`:**
  - `:127`: "The landing note is `footer.testnet` with the theme control beside it";
  - `:195`: the hero's "Note: `home.note`";
  - `:305`: the final CTA's `home.note`;
  - `:113` (the side-nav note) is app and still holds.
- **`docs/design/satchel-2.0/voice-copy.md`:** `:393` (keep the note), `:408` ("always visible") and `:438` (risky claim
  14, "plus the visible testnet note").
- **`brand/README.md`:**
  - `:80`: "'Testnet only. Coins here have no value.' stays visible" now holds in the app only; on `/`, the badge.
  - `:81` (fiat): the landing art is exempt from the label.
- **`kb/80-ux-spec.md`:**
  - `:181` and `:262`: RoleStrip in the global chrome;
  - `:190`: "below 480 the note lives in the NavSheet and the footer". The landing footer no longer has it, and the
    breakpoint is 420;
  - `:1018` and `:1202`: the RoleStrip component;
  - `:1303`: the gate modes, "the RoleStrip shows role.dev";
  - `:1399`: the `role.*` keys;
  - `:1402`: the footer's bottom row, app only;
  - `:150`, `:230` and `:1380`: fiat "always with 'at mainnet prices'", app only.
- **`kb/90-technical-spec.md`:**
  - `:121` T5: "dev builds show a 'DEV CONTRACT' banner";
  - `:1101-1102` §7.3: the "Banner" column;
  - `:1309`: `NEXT_PUBLIC_CONTRACT_ROLE` "selects the gate mode and banner";
  - after the change, the role shows on `/contract` and in the checklist's dev line only;
  - `:123` T7 (the badge) still holds.
- **Not drift:** `README.md:7` and `:290`. The README describes the deployment, so it stays testnet-only, and it keeps
  kb/70 F17's caveat.
- **Code comments the builders touch anyway:**
  - `NavShell.tsx:28-29`, `:157` and `:207-209`;
  - `TrustSection.tsx` header;
  - `lock-facts.ts` header;
  - `art.tsx:80`;
  - `L`'s comments on `desk.usd`, `lock`, `more` and `q-testnet`;
  - `FinaleSection.tsx` header.

---------------------------------------------------------------------------------------------------------------------
## 10. Honesty check of the whole set

- **Product, not deployment:**
  - no string says live, mainnet, real value, a date or "soon";
  - "at mainnet prices" is gone from `/`, along with every testnet network name.
- **R1:** USDC appears only as EVM USDC, on the four networks (q-chains, More 4, the U1 chip). Sale and offer currency
  is NEAR, including the bento's `1,900${NBSP}NEAR`.
- **R2:**
  - "can't be upgraded" and "no admin key" stay on rc and final only;
  - the dev twins say "still has keys" and "can still be upgraded";
  - the release contract's design is stated without a date.
- **R6, R7, R8:** no refund claim; "someone they let spend" only sends within daily caps; no "delegate".
- **Limits and disclosure:**
  - the trust band's limits line is unchanged;
  - the browser-not-contract disclosure is still only in `q-proves`;
  - gifts still "don't wait for the check";
  - the three chains are named everywhere;
  - no "every chain", "trustless", "MPC" or "approval".

---------------------------------------------------------------------------------------------------------------------
## 11. Rulings needed (decided in `rulings.md` P1–P5)

**R-a. `/questions` is an app page, and Razvan said the app keeps its testnet labels.**

Three of the seven shared answers name networks: `q-keys`, `q-proves` and `q-chains`.

- **T-lite (recommended):** `/` gets the product names (§1.2). `/questions` keeps today's testnet strings.
  - **Code:**
    - `faqItems` takes `net: "product" | "testnet"`, defaulting to "product";
    - `allFaqGroups` passes "testnet";
    - `q-chains` uses §1.2's `net` argument;
    - `q-keys` and `q-proves` get an `aTestnet` holding today's string, picked when `net === "testnet"`, as `aDev` is;
    - `keysDev` and `q-testnet` stay shared.
  - **Why:**
    - In the app, "ETH and USDC on Ethereum, Base, Arbitrum and Optimism" would be **false for the deployment you're
      using**. The EVM address is the same on mainnet, so a reader could send real ETH or USDC on Base to a testnet
      Satchel and lose it.
    - It also keeps kb/70 F17's keys caveat where the testnet MPC applies.
  - **Cost:**
    - two `aTestnet` strings (both today's, already reviewed);
    - a `net` argument;
    - `faq.test`'s word-for-word test compares against `net: "testnet"`.
  - The strip's "?" on "USDC and L2s" then opens the testnet answer, inside the testnet app. That's honest.
- **S (simpler):** `/questions` shows the product strings too.
  - The app lane would accept it; it only asked for the group title.
  - Its risk is the one above.
  - It also drops the F17 caveat from `/questions` (the README keeps it).

**R-b. The menu sheet's "Testnet only. Coins here have no value." on `/`.**

Below 420 px, signed out, which is most phone visitors, the header badge steps aside for Connect (`responsive.spec`
pins it). With Badge only, phones see no testnet signal on `/` unless someone opens the menu.

- **Keep the sheet line (recommended):**
  - it's chrome, shown only on demand;
  - it's the badge's documented phone stand-in;
  - Razvan's list named the hero, the CTA and the footer, not the sheet.
- **Alternatives:**
  - show the badge plus `copy.app.badgeTip` in the landing sheet, a `LandingMenu` change: literally "the badge and its
    tooltip";
  - drop it, in which case phones get no signal until they connect or open `/s/1`.

**R-c. The Uses hint: U1 or U2.**

- **U1 (recommended):** 0 words, visual only. The fact stays in text in the strip.
- **U2:** real text at +4 words. It needs a 54-word cap for `#uses`.

**R-d. `tb1q…` → `bc1q…` in What's address tag.**

Recommended, but optional. It's attribute art and no test pins it. Mainnet-framed and still generic.

**R-e. `WORDS.aboveQuestions`.**

- After the changes: 366 in e2e and 373 in the unit sum.
- **Keep 380** (recommended): no churn, and the unit test's exact 373 already guards drift.
- Or tighten it to 370, which still leaves room for a hero line.
