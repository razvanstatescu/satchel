# Final claims audit: the rebuilt landing (facts researcher, 2026-11-03)

**Status (2026-11-03, after the audit):** W1 and W2 fixed in `landing.ts` (W2 keeps "spending allowances" and trims
"come out of" to "come from" to stay at 50 words); W3 fixed in `Market.tsx`, with an e2e regression test in
`offers.spec.ts` that fails on the old code; N1 checked (no truncation from 320 px up); N2 done (kb/90 §7.7, kb/80);
N3 fixed on `main` (c535e69); N6 passed to Razvan as a product call.

**Scope.** The worktree's uncommitted diff against `main` (8d783e4): `landing.ts`, `faq.ts`, `MoreSection.tsx`, the art,
and the six app copy modules. Also the server HTML of `/` and
`/questions` from a local dev server (role `final`, sample data). Each claim is checked
against `facts.md` and its sources. Paths: **L** `apps/web/src/lib/copy/landing.ts`, **W** `apps/web/src`, **C5**,
**C46**, **C7S** = `docs/specs/*`.

**Result: 3 WRONG (2 copy, 1 code); everything else OK.** All nine honesty checks pass (§2).

## 1. WRONG, with exact fixes

| # | Claim (where) | Why it's wrong | Exact fix |
|---|---|---|---|
| W1 (copy, low) | `q-chains`: "Anything else at its addresses can't be moved." (L:392; on `/` and `/questions`) | Too absolute. The Solana address string is the same on every Solana cluster, and a `tb1q…` address is the same on testnet3 and signet. The contract's classifiers don't know the cluster or network (SOL: a legacy System transfer with any blockhash; BTC: BIP143 preimages), so SOL or BTC sent there on another network *could* be moved by a hand-built `sign_for` (kb/90 §5.9). Only EVM is network-bound (chain id, C7S:66). The app can't move any of it | L:392 → `` return `${lead} ${middle}The app can't move anything else at its addresses.`; `` Word counts: ui 45, send 50, off 48, none 42, so every variant stays within `faq.test.ts`'s 50-word cap. Update `test/unit/faq.test.ts:81` and `:86` to the new ending. (The more specific "Other tokens, and coins on other Ethereum networks, can't be moved." makes the `send` variant 52 words.) |
| W2 (copy, low) | `q-cost`: "Each signature costs about 0.004 NEAR" (L:398) | A message signature also pays storage for its text: ≈ (215 + bytes) × 0.00001 NEAR plus ≈ 0.0015 NEAR gas. That's about 0.014 NEAR for 1,024 bytes and about 0.008 NEAR for 400 (C7S §4.4, :188; facts §1.8). The answer now hides that | L:398: "Offers and spending allowances keep a little NEAR for storage." → **"Offers, allowances and long messages keep a little NEAR for storage."** The answer becomes exactly 50 words (cap 50). `config-copy-theme.test.ts:193` pins only "Satchel charges no fee." |
| W3 (code, low-medium) | Hood rule 6 "An offer holds only for the history checked when it was made" and rule 5 "Make an offer waits for the same check" (L:277, :282) | `MakeOfferFlow.offer()` re-checks, then reads `satchel(id)` again and binds **that** `sig_count` (`W/components/client/Market.tsx:430-443`) without comparing it with the checked report's count. A signature recorded while the re-check reads the chains (a few seconds) lands in the bound count unchecked. That record can stay unused through accept (the quiet period only needs 250 quiet blocks) and drain coins later: the exact case the check exists for. Buy is safe: it binds the checked count and refuses on a mismatch (`SaleTab.tsx:390-395`) | In `Market.tsx`, after reading `sat` (:436): `if (fresh.sig_count === null \|\| sat.sig_count !== fresh.sig_count) { setNote({ kind: "error", text: copy.offers.stale }); return; }`, then `expectedSigCount: fresh.sig_count` (:443). `copy.offers.stale` already exists (`W/lib/copy/market.ts:81`). Add a unit or e2e case for the mismatch. If code can't change, the fallback copy for rule 6 is "An offer holds only for its history when it was made…", but the code fix is the real one |

## 2. Honesty checklist

| Check | Verdict | Evidence |
|---|---|---|
| The buyer's browser runs the check, never the contract | **PASS** | Hero lead (L:49-50) "the buyer's browser checks"; desk "Checked in the buyer's browser"; beat 4 (L:191); `q-proves` "Your browser, not the contract" (L:365); rule 4 title; rule 5 "The app has no override" |
| Gifts aren't gated | **PASS** | Uses 2: "To a friend. Gifts don't wait for the check." (L:166). True: no check gates Give or a link; the claim page's check line is information only (`ClaimFlow.tsx:203-213`) |
| No automatic refunds | **PASS** | No offer-refund claim anywhere on `/`. Refunds are named only for a failed purchase (rule 6, `q-after`), which is true (kb/90 §5.7) |
| Someone the owner lets spend can't sign messages, take out inside coins, list or give | **PASS** | Every mention is scoped to sending within daily caps: What (L:121), `q-keys` (L:359), the strip (L:320-322). App guards: only Send says "or someone they let spend" (`flows.ts:63-65`, used only by `SendFlow.tsx:385-393`). Messages (`multichain.ts:261-264`), Take everything out (`wallet-ops.ts:114`) and Give (`flows.ts:217-218`) stay owner-only. Matches C5:147, :153-156 |
| USDC prices and USDC held inside on NEAR not advertised (R1) | **PASS on `/`** | USDC appears only as the four Ethereum networks' USDC (rule 1, `q-proves`, `q-chains`, the strip) and as a coin in the sample. `q-chains` names only NEAR inside (L:386); Uses 1 stays "in NEAR"; no currency in the strip's offer line. `/questions` still names NEAR-side USDC (note N4) |
| Lock claims follow the role (R2) | **PASS** | `lockView(role)` unchanged (`W/lib/lock-facts.ts:26-30`); `q-keys` adds the dev line; `q-testnet` swaps to `aDev` on dev (`W/lib/faq.ts:46-53`; L:405, true: dev2 has keys and was redeployed in place). The Contract facts art shows only when locked. `.env.production` is still role `dev` (dev2) |
| Every dollar figure has "≈" and "at mainnet prices" | **PASS** | 4 of 4 figures ("≈ $8,000.00") sit in one span with "at mainnet prices" (`art.tsx:92-93`), only in aria-hidden art, never in the text layer; the hero alt names no figure. Built at render (`usdText`), so the `$`+digit ban holds |
| No "every chain" | **PASS** | None in `/` or `/questions` text (grep); the strip names the four networks, never "every L2" |
| The three chains are named | **PASS** | Hero lead, What, How step 1, `q-send`, the meta description; `q-chains` names all networks |

## 3. Claim by claim, as rendered on `/` (role final)

| Where | Claim | Verdict | Source |
|---|---|---|---|
| `<title>`, meta, OG, Twitter | "An NFT that is a wallet"; "…own Bitcoin, Ethereum and Solana addresses… a buyer's browser checks every past signature first." | OK | kb/90 §1, §7.5 |
| Badge tooltip | "…NEAR testnet, Bitcoin testnet4, Solana devnet and four Ethereum testnets. Coins here have no value." | OK | C7S:24-35; D-46 |
| Hero who, H1, lead, CTAs, note | unchanged | OK | facts §2 |
| Hero alt (L:61) | "a Satchel holds BTC, ETH, SOL and USDC… lists it for 2,000 NEAR, and signing pauses… 3 past signatures… One transaction moves the Satchel… and pays the seller" | OK | kb/90 §5.7, §5.12; USDC = EVM USDC (C7S:24-35) |
| Hero, What, How 3, catch 1 art | "≈ $8,000.00 / at mainnet prices", "BTC 50% · ETH 25% · SOL 15% · +1/+2", "Paused for sale" / "Active", "2,000 NEAR" | OK (sample) | D-50 layout (`SatchelCard.tsx`); consistent with the app's sample prices BTC 80,000, ETH 2,500, SOL 100, USDC 1, NEAR 4 (`W/lib/prices.ts:96-99`): 0.05 BTC + 0.80 ETH + 12 SOL + 800 USDC = $8,000 = 2,000 NEAR. See N1 |
| How 1 art | "New Satchel", "New", "Nothing inside yet", dimmed BTC/ETH/SOL | OK | the app's empty card (`SatchelCard.tsx`) |
| What body (L:121) | "…no bridge, no wrapped tokens. Only its owner, or someone they let spend within daily caps, can send the coins. When it changes hands, everything inside goes with it." | OK | C5:9-12, :208-213; C46:9-12. The section names no wNEAR, so "no wrapped tokens" stays scoped to BTC/ETH/SOL |
| Uses 1 | "One trade, in NEAR. Neither side sends first." | OK | kb/90 §5.12 (R1 keeps NEAR) |
| Uses 2 (L:166) | "To a friend. Gifts don't wait for the check." | OK | facts §1.5 |
| Uses 3; How h2 and steps | unchanged | OK | facts §2 |
| Catch h2, beats, alt, labels | unchanged; desk 1 card + "Send 0.80 ETH" (= its 25% ETH at the sample price); desk 2 slip 0.80 → 0.00 ETH | OK | kb/90 §5.8, §7.1-7.5 |
| Trust (final role) | "No admin key. Not even ours."; "born without a key and can't be upgraded…"; limits; slip | OK, rc/final only | facts §1.9 |
| Rule 1 (L:257) | "…signs only what it can read: ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and text messages. It refuses raw hashes, permits and any other contract call." | OK | C7S:61-73, :91-114 |
| Rule 2 (L:262) | "…before NEAR's signer network sees it: the nonce, coins or blockhash it can spend, or a message's full text. Timed-out requests stay on the record." | OK | kb/90 §7.1; C7S §4.1 |
| Rule 3 (L:267) | "…it can't sign, and only a purchase or an accepted offer can move it." | OK | sign.rs:52; offers.rs:294-300; kb/90 §5.11 |
| Rule 4 (L:272) | "…each chain, and each Ethereum network on its own… two data providers must agree… Signed messages are listed too; they can't move coins, so they never block a sale." | OK | C7S:277-296; `W/lib/data/clean-live.ts:76`; INV-37 |
| Rule 5 (L:277) | "…checks again just before buying. Make an offer waits for the same check." | OK as worded; see **W3** | `Market.tsx:405-433` |
| Rule 6 (L:282) | "…An offer holds only for the history checked when it was made: if anything is signed or taken out, it can't be accepted." | **WRONG in code (W3)**; the contract half is true | offers.rs:138-142, :281-285 |
| Hood links | unchanged | OK | — |
| Strip: Make an offer | "Even if it's not for sale." | OK | C46:14-17 |
| Strip: Give by link | "To someone not on NEAR yet." | OK | `wallet-ops.ts:11`; they connect a NEAR wallet to claim |
| Strip: Let someone spend | "Daily caps, until it changes hands." | OK | C5:198-213 (it can also end sooner, by revoke or expiry; not contradicted) |
| Strip: USDC and L2s | "Ethereum, Base, Arbitrum and OP Sepolia." | OK | C7S:24-35 |
| Strip: Take it all out | "Every coin to your wallets." | OK | the app's own "Take everything out" (`wallet-ops.ts:77-117`): chain coins to addresses you pick, inside coins to your NEAR account. USDC on a network with no ETH stays, as the flow says |
| Strip help links | `/questions#q-offers`, `#q-give-link`, `#q-allow-what`, `#q-chains` | OK | each id renders once on `/questions` |
| `q-send`, `q-after` | unchanged | OK | facts §2 |
| `q-keys` (L:359) | "…only when the Satchel contract asks, for the NFT's owner or someone they let spend within daily caps…" | OK | C5:125-129 |
| `q-proves` (L:365) | "…It doesn't cover tokens other than USDC, signatures made after you buy, NEAR's signer network or testnet4 reorgs." | OK | C7S:286, :298-301; kb/90 §4 |
| `q-chains` (L:381-392) | lead (networks, USDC); "The four Ethereum networks share one address."; "A Satchel can also hold NEAR inside." | OK | C7S:24-38; C46:26-28 |
| `q-chains` ending | "Anything else at its addresses can't be moved." | **WRONG (W1)** | — |
| `q-cost` (L:398) | 0.02 / 0.01 deposits; "about 0.004 NEAR"; fees from the Satchel's coins; "Offers and spending allowances keep a little NEAR for storage."; "Giving by link adds 0.02 NEAR."; "Satchel charges no fee." | **WRONG (W2)** on the per-signature line for messages; the rest OK | facts §1.8; `W/lib/claim/link.ts:61-62`; offers.rs:312 |
| `q-testnet` | final: "can't be upgraded…"; dev: `aDev` | OK | facts §1.9 |
| Final CTA, footer | unchanged | OK | — |

## 4. Changed app strings (`git diff main`)

| String | Verdict | Source |
|---|---|---|
| `shell.app.badgeTip` (four Ethereum testnets, Solana devnet) | OK | C7S:24-35 |
| `shell.mint.get` "Its owner decides who can move the coins" | OK | C5:19-24 |
| `satchel.how[1]` "The owner decides who signs" / "the owner, or someone they let spend within daily caps, asks the Satchel contract…" | OK | C5:125-129 |
| `satchel.proof.cleanTip` (BTC testnet4, Solana devnet and the four Ethereum testnets) | OK (see N2) | C7S:277-286 |
| `satchel.wallet.fundcard.body`, `fund.anyone`, `verify.guarantee`, `multichain.coins.chainNote` (owner or someone they let spend within daily caps) | OK: each is about the addresses' coins | C5; `FundPicker.tsx:198`, `ReceiveSheet.tsx:85` |
| `multichain.fundPage.whose` "whoever owns it controls them" | OK (also true for inside coins) | C46:129-147 |
| `multichain.msg.guard.*` owner-only for messages | OK | C5:147; allowance.rs:508 |
| `flows.send.guard.*` "…or someone they let spend, can send from it." | OK (used only by Send) | C5:125-129 |
| `walletOps.empty.guard.notOwnerBody` owner-only | OK | `SatchelPage.tsx:486-489` |
| `commerce.clean.verdict.checking` "Reading Bitcoin, Ethereum and Solana from your browser." | OK | the checker reads all three chains |

## 5. Notes (not claim errors)

- **N1, the sample figure.** It stands only while the app's sample prices stay near real mainnet prices. Re-check them at
  the Day-13 freeze. `.lp-card__total` has `text-overflow: ellipsis` (`landing.css:105-113`), so QA should confirm
  "≈ $8,000.00" never truncates at 320 px. A cut total would separate the figure from its label.
- **N2, kb/90 drift.** kb/90 §7.7 and E-46 say the badge tooltip stays word for word. `proof.cleanTip` changed
  (correctly), so update kb/90 §7.7 to match.
- **N3, `/questions` `q-offers`.** "an open one is cancelled any time before it's accepted" doesn't say who. Suggested:
  "the offerer can cancel an open one any time before it's accepted, and anyone can once it expires; the money only
  goes back to the offerer." This is `copy/questions.ts`, and nothing in it is false.
- **N4, `/questions` and H-26.** `q-list`, `q-usdc-payouts`, `q-inside`, `q-where-arrive`, `q-storage-credit` and
  `q-withdraw-inside` name USDC on NEAR. R1 covers `/` only, and none of the strip's help links lands on them, but they
  depend on H-26.
- **N5, variants that don't render.** `/` and `/questions` render only `ui`. The `none` rule 1 says Solana messages are
  refused, which DP5 doesn't specify; that path is unused.
- **N6, related to W3.** The offer flow also binds the inside epoch read at click time (`Market.tsx:436`), not what the
  page showed. A take-out between viewing and clicking shrinks what the offer buys without any warning.
