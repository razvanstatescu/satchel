# Facts for the landing refresh (facts researcher, 2026-11-03)

Read from the worktree at e94af6f (= `main`). Specs and code beat plans. Paths: **C5** `docs/specs/C5.md` ·
**C46** `docs/specs/C4-C6.md` · **C7S** `docs/specs/C1-C2-C3-C7.md` · **kb90** `kb/90-technical-spec.md` · **dec**
`plan/decisions.md` · **ct** `contracts/satchel/src` · **core** `packages/core/src` · **W** `apps/web/src` · **live**
`research/spikes/dev2-live/RESULTS.md`. "Safe wording" is testnet-honest, uses the app's own words, and avoids the
copy test's bans (§1.10).

## 0. Verdict in brief
- **All five suspected FALSE items are confirmed:** What it is + `q-keys` (owner-only), `q-chains` (native only,
  Sepolia only), hood rule 1 (plain transfers, refuses messages and contract calls), hood rule 3 (only a purchase
  moves it), `q-proves` ("doesn't cover other tokens": USDC *is* covered).
- **Added:** `q-testnet` "Its contract can't be upgraded" is false on the live site today (role `dev`, dev2 has keys
  and was redeployed in place twice). The header badge tooltip omits Solana and the L2s. `q-cost` misses give by link's
  0.02 NEAR and the new deposits. Two `/questions` answers one click away (`q-what-is`, `q-where-arrive`) repeat the
  owner-only claim.
- **Refunds of offers are not automatic.** Expiry only lets anyone cancel; someone must send `cancel_offer`.

## 1. Verified facts

### 1.1 Spending allowances (C5)
| Fact | Source | Safe wording |
|---|---|---|
| Only the NFT's current owner can add, change or revoke one (owner check, ≥ 1 yocto, so a wallet approval) | C5:19-24, :104-108; ct/allowance.rs:564-569 | "You choose who can spend." |
| The account can't be the owner, the contract, NEAR's signer network or USDC. The UI also checks it exists on NEAR testnet | C5:108; allowance.rs:570-576; W/lib/copy/allowance.ts:55-59 | — |
| Up to **4 accounts** per Satchel at once (expired ones are dropped when you add); up to **8 caps** per account (one per coin per network); at most **32 sends** per account in any 24 h | allowance.rs:23-26; C5:109-113, :134, :224-229 | "Up to 4 people, each with their own daily caps." |
| A cap can limit: BTC (testnet4), SOL (devnet), ETH on each of the 4 EVM testnets, USDC on each of the 4. Each is separate. Nothing else: inside NEAR/USDC/wNEAR can't be spent by them (owner-only withdrawals) | C5:56-63; W/lib/allowanceView.ts:27-47; C46:346-348 | "A daily cap per coin and network: BTC, SOL, and ETH or USDC on each Ethereum network." |
| The cap list is also the permission list: a coin with no cap can't be sent. Caps count worst-case **fees**: EVM `value + gas_limit × max_fee`; BTC outputs to others + fee; SOL lamports + 5,000. A USDC send's fee is ETH, so it also needs an ETH cap on that network | C5:163-170, :180-181; allowance.rs:443-463 | "Network fees count toward the caps." |
| Known gap: the OP-stack L1 data fee (Base, OP Sepolia) isn't counted (≈ 3 × 10⁻⁷ ETH a tx) | C5:185-190 | (don't claim "exact to the wei") |
| A rolling window, not a midnight reset: a spend stops counting 24 h after it was made. A timed-out request still counts | C5:191-203 | "a daily cap (any 24 hours)" |
| Expiry optional. The app offers 24 hours, 7 days, 30 days or no expiry (default no expiry); the contract takes any future time. Expired access shows "Expired" until revoked | W/components/client/AllowanceFlow.tsx:37-38, :65; C5:205-206 | "Set it to expire, or end it any time." |
| **Paused while listed**: `sign_for` refuses everyone while for sale; it resumes with the same budget after Stop selling | C5:130, :215-216; ct/sign.rs:50-52 | "Paused while it's for sale." |
| **Cleared on every change of owner** (Give, give by link, sale, accepted offer), in the same transaction; plus an owner-binding backstop | C5:208-213; ct/lib.rs:184-188, :284; ct/offers.rs:301; kb90:1025 | "Access ends when the Satchel changes hands." |
| Their sends are ordinary records, written before signing (`requester` = them; Activity shows "Requested by"). They count for the quiet period, and an unused one blocks a sale like the owner's | C5:9-12, :218-220, :262-266; W/lib/copy/satchel.ts:186 | "Their signatures go on the same record, so add only someone you trust." |
| They can only send: no messages, no other contract calls, no listing, giving, accepting offers or taking out inside coins. A BTC send by them spends exactly one deposit (AUDIT-01) | C5:147, :153-156, :172-177; kb90:1024 | "They can send, nothing else." |
| App vocabulary: section **"Spending allowance"**; panel **"Who can spend"**; **"Add someone who can spend…"**; sheet **"Let someone spend"** (steps Who, Limits; "Daily caps"; "Other networks"; "Expiry"); **"Revoke"**; their banner **"You can spend from this Satchel"**; trust note "Their signatures count as yours. Add only someone you trust."; onboarding title **"Let someone spend, within limits"**; /questions group "Allowances". The copy test bans "delegate(s)" and "approval" | W/lib/copy/allowance.ts:11-48, :64-68; W/lib/copy/onboarding.ts:33-34; W/lib/faq.ts:117 | — |

### 1.2 Offers (C4)
| Fact | Source | Safe wording |
|---|---|---|
| Currencies: **NEAR** (attached) or **USDC on NEAR** (Circle testnet USDC `3e2210e1…b8af`, via `ft_transfer_call`). USDC on NEAR exists only if the final is born with `usdc` set (H-26 still open, §4 Q1) | C46:14, :54-56, :95-101; dec:1177 | "Offer in NEAR (or USDC)" |
| On **any** Satchel, listed or not; anyone but its owner. /market has an "Unlisted Satchels" list | C46:14-17, :204-216; W/lib/copy/commerce.ts:303-306 | "Make an offer on any Satchel, even one that isn't for sale." |
| Bound to the Satchel's **signature count** and its **inside-balance epoch** at the time it's made: any new signature, or any take-out of inside coins, makes it unacceptable (`ERR_OFFER_STALE`). Deposits don't matter (they only add) | C46:250-256, :329; ct/offers.rs:138-142, :281-285 | "Your offer holds only for the history you checked: if anything is signed or taken out, it can't be accepted." |
| Accepting also needs: the offer unexpired, and no signature in the last 250 blocks (about 2 min 20 s) | C46:218-225; offers.rs:280-289 | — |
| Accepting **stops the sale if listed, moves the NFT, clears every allowance and pays the seller the full amount**, all in one transaction (a failed payout waits as proceeds). Inside coins go with it. Other open offers stay open | C46:227-242; offers.rs:274-321 | "Accepting hands it over and pays the owner in one transaction." |
| Expiry: the app offers 1, 7 or 30 days; the contract allows up to 90. **Refunds are not automatic**: the offerer can cancel any time; after expiry anyone can cancel; the money always goes back to the offerer. The app shows "Expired · refundable" with Cancel | C46:58-60, :244-248; W/components/client/Market.tsx:392-396, :635-661 | "Cancel any time before it's accepted; the money only ever goes back to you." Never "refunded automatically". |
| Limits: 20 open offers per account; no per-token cap | ct/market.rs:18-20; C46:259-264 | — |
| **The buyer's check applies, in the app**: Make an offer stays disabled until the offerer's browser check passes, and it re-checks just before sending, like Buy. The contract only binds the count. The sheet shows "Before you offer" with the check line; every signature is on Activity | C46:255-256; Market.tsx:398-433, :482-488; W/lib/copy/market.ts:47, :84 | "Your browser checks its history before you offer, exactly like Buy." (app's words) |
| Costs: a NEAR offer attaches amount + 0.01 NEAR; ≈ 0.003–0.005 NEAR is kept as storage and the rest refunded. A USDC offer takes ≈ 0.0045 NEAR from a prepaid **storage credit** ("Prepay storage · 0.01 NEAR", unused credit withdrawable). Storage isn't returned on cancel or accept. No Satchel fee | C46:85-89; core/near/market.ts:18-41; live:35 (bob 2.0 → 1.994 NEAR after offer + cancel) | "Offers cost a little NEAR for storage; Satchel takes no fee." |
| App vocabulary: **"Make an offer"**, "Offer on Satchel #…", "Your offer", "Expires in", "Before you offer", "Offer {amount}", **"Offers"**, "Incoming offers", **"Accept"**, **"My offers"**, "Cancel", "Want this Satchel?", "Unlisted Satchels" | W/lib/copy/market.ts:36-87; multichain.ts:132-136 | — |

### 1.3 More coins and networks (C2, C3, C6)
| Fact | Source | Safe wording |
|---|---|---|
| EVM networks, frozen at birth: **Ethereum Sepolia (11155111), Base Sepolia (84532), Arbitrum Sepolia (421614), OP Sepolia (11155420)** | C7S:24-35; ct/parse/evm.rs:8-10; kb90:432 | "Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia" (never "every L2/EVM chain") |
| **USDC on all four** (Circle testnet USDC, 6 decimals, addresses checked on-chain 2026-10-29). Only `transfer(to, amount)` with no ETH attached; no other token; its fee is ETH on that network | C7S:26-35, :61-73; evm.rs:12-19 | "ETH and USDC on four Ethereum testnets." |
| **One EVM address on all four** (one key; each signature names its network) | C7S:37-38; W/lib/copy/multichain.ts:169, :179 | "The same Ethereum address on all four networks." |
| Coins on any other network, other ERC-20s and Solana tokens sent to its addresses **can't be moved** | C7S:66-70, :369; kb90:68-72 | "Anything else sent to its addresses can't be moved." |
| **Inside on NEAR testnet**: NEAR, wNEAR (`wrap.testnet`) and USDC on NEAR (the configured Circle USDC; only if `usdc` is set, H-26). Anyone can add; the first deposit keeps ≈ 0.0009 NEAR of storage (FT: from the sender's storage credit) | C46:9-12, :26-28, :115-119, :149-153; live:30 | "NEAR, USDC and wNEAR can also sit inside it, on NEAR." |
| Take-outs: **owner only**, never while listed, 1 yocto + gas; to your account (never the contract, signer network or USDC); each one makes open offers unacceptable; a failed transfer is re-credited | C46:129-147; ct/inside.rs:47-49, :101-138 | "Only the owner can take them out, and never while it's for sale." |
| Inside coins **go with the NFT** on Give, give by link, sale and accepted offer, with no extra step and no clean history needed (the contract itself guards them) | C46:9-12, :330; live:32 (I-M8 held live) | "When it changes hands, everything inside goes with it." (still true) |
| A buyer of a listed Satchel gets at least the inside balances they saw: take-outs are frozen while listed, deposits only add | C46:145-147 | — |
| Not supported: SPL tokens, other ERC-20s, other EVM chains, NEP-141 tokens other than USDC and wNEAR (refused and refunded) | C7S:369; C46:104-112 | — |

### 1.4 Message signing (C7)
| Fact | Source | Safe wording |
|---|---|---|
| EVM: **EIP-191 `personal_sign`**, prefix built by the contract from the text; signed by the Satchel's one Ethereum address. It carries no network, so it isn't tied to one of the four | C7S:99-104; ct/parse/msg.rs:1-52 | "Sign a message with its Ethereum or Solana address." |
| Solana: the **off-chain message format v0** (`\xffsolana offchain` header), which can never parse as a transaction | C7S:105-110 | — |
| **Not Bitcoin** (BIP-322 skipped) | C7S:359-367 | never "on all three chains" |
| Size: 1–1024 bytes of valid UTF-8 | C7S:91-97; msg.rs:9-29 | — |
| Deposit: attach 0.005 NEAR + 0.00001 NEAR per byte (≤ 0.01524 NEAR); ≈ (215 + bytes) × 0.00001 NEAR is kept as storage, the rest refunded; plus gas | C7S:183-190; core/near/constants.ts:71-73 | "A message costs a little more NEAR the longer it is." |
| **Recorded** before signing, with its full text; listed in Activity and in the buyer's check as "Messages (n)"; item status `message` **never blocks Buy** ("Messages can't move coins"). Every future buyer can read it | C7S:116-127, :288-296; kb90:1065-1072, :1092; W/lib/copy/multichain.ts:226-230, :259-264 | "Every message stays on the record. It can't move coins, so it never blocks a sale." |
| Owner only (allowance holders refused); paused while listed | C5:147, :257-259; W/components/client/SatchelPage.tsx:490-495 | — |
| Still refused: raw 32-byte hashes, `eth_sign`, EIP-712 typed data (permits, Permit2, EIP-3009, orders), EIP-7702 authorizations, any contract call except a USDC transfer, Solana raw-byte signing and the newer off-chain format | C7S:112-114, :116-127; kb90:625 | "It refuses raw hashes, permits and any other contract call." |
| UX: paste the site's text, review it (hidden characters shown as codes, hex, hash-like bodies flagged), tick "I trust the site", copy the signature. No WalletConnect or dapp connection | W/lib/copy/multichain.ts:203-257 | never "connect to dapps" or "Sign in with Ethereum" |

### 1.5 Give by link (A2) and Take it all out (A3)
| Fact | Source | Safe wording |
|---|---|---|
| Give by link makes a fresh keypair in the giver's browser, sends **0.02 NEAR** to its new NEAR account and gives the Satchel to it (two transactions: one approval where the wallet batches them, else fund first, then give). App path: Give → **"Give by link instead"** | W/lib/claim/link.ts:4-11, :61-62; W/components/client/GiveLinkFlow.tsx:21-50; W/lib/copy/flows.ts:213 | "Give it by link to someone who doesn't have a NEAR account yet." |
| The secret lives only in the link's `#` part; never sent to a server. **Bearer secret**: anyone with the link, the giver included, can claim; it can't be cancelled; a lost link (no kept copy) can't be replaced | link.ts:8-11; W/lib/copy/wallet-ops.ts:25-33 | "Like cash in an envelope: whoever has the link can claim it." |
| To claim, the recipient connects a NEAR wallet; every Satchel the link holds, plus leftover NEAR (minus 0.01 NEAR kept for gas), moves to it | W/lib/claim/claim-source.ts:45-75; W/components/client/ClaimFlow.tsx:160-167 | "They claim it when they connect a NEAR wallet." |
| **Gifts aren't checked**: nothing checks history before a Give or a link. The claim page shows the browser's check line for information only, after the gift | ClaimFlow.tsx:203-213; brand/README.md:86 | "Gifts skip the buyer's check." (keep) |
| A link is a normal Give: allowances cleared, inside coins go with it, not while listed | wallet-ops.ts:42-43; ct/lib.rs:272-291 | — |
| Take it all out: sends every coin to addresses you choose (one per chain; one Ethereum address takes all four networks) and takes inside coins back to your NEAR account. Owner only; hidden while listed | W/lib/copy/wallet-ops.ts:77-117; SatchelPage.tsx:486-489 | "Take everything out in one flow." |
| Cost: one signature per coin (≈ 0.004 NEAR each) plus each chain's fee from the Satchel; BTC batches over 10 coins; on each Ethereum network USDC goes first; USDC on a network with no ETH stays; inside take-outs cost gas only | wallet-ops.ts:85-96 | — |
| App vocabulary: **"Take it all out"** (entry and button), "Take everything out of Satchel #…", "Everything's out" | wallet-ops.ts:78, :95, :103; multichain.ts:58 | — |

### 1.6 The dollar estimate (D-50)
| Fact | Source | Safe wording |
|---|---|---|
| Always **"≈ $X"** with **"at mainnet prices"** beside or under it on testnet; 2 decimals; "< $0.01" for dust | dec:1125-1132; W/components/SatchelCard.tsx:75-79; Overview.tsx:49-51; W/lib/overview.ts:77-80 | "≈ $X at mainnet prices" |
| Only in the overview: the card, the top of the Wallet tab (top 5 coins), market cards, the buyer's "You get". Never in Facts, sends, offers or prices | dec:1130-1131 | — |
| With it: a value bar (each coin's share, hover/tap tooltip), coin chips "BTC 43%" (3 from 352 px, 2 below) and "+N". Coins grouped across networks and inside; wNEAR priced as NEAR | SatchelCard.tsx:86-112; overview.ts:6-10, :40 | — |
| Fallback: no price source → "{n} coins on {m} networks" and no dollar figure, never a stale one; empty → "Nothing inside yet" | dec:1131-1132; Overview.tsx:36-45; W/lib/prices.ts:1-6 | — |
| Prices: 1Click `/v0/tokens`, CoinGecko fallback, 60 s cache, 1.5 s bound. Wallet tab note: "Dollar estimates use mainnet prices for the same coins. Testnet coins have no value." | dec:1134-1137; multichain.ts:152; Overview.tsx:96 | — |

### 1.7 What the clean-history check covers now
| Covers (in the buyer's browser; only the browser's result turns Buy or Offer on) | Source |
|---|---|
| Every record: owner's and allowance holders' sends, messages, timed-out requests | kb90:1034-1044; C5:218-220 |
| Ethereum **per network**: the nonce rule run separately on each of the four, on **two providers that must agree**; "no delegated code" checked on Sepolia always and on any network with records | C7S:277-286; W/lib/data/clean-live.ts:76; core/chains/evm/networks.ts:36-78 |
| **USDC rows**: same nonce rule as ETH; the report and Activity name the token, recipient and amount. USDC balances are read at the same depth and count in "You get" | C7S:286, :298-301; kb90:1057-1063 |
| **Messages**: listed with full text, status `message`, never blocking; a mismatched record is "Can't verify" | kb90:1065-1072 |
| Depth: Sepolia 3 blocks (~36 s); Base and OP Sepolia 30 (~60 s); Arbitrum Sepolia 240 (~60 s); Bitcoin testnet4 1 confirmation; Solana: record ≥ 120 s old and blockhash expired | core/clean-history/types.ts:91-99; kb90:1120-1128 |
| Inside NEAR/USDC/wNEAR aren't in the check, by design: the contract guards them (owner-only take-outs, frozen while listed, offers bound to them) | C46:9-12, :145-147 |
| **Still not covered** (the app's own list): chains, tokens and accounts beyond BTC testnet4, SOL devnet and ETH/USDC on the four testnets; what a site makes of a signed message; signatures after the purchase; the honesty of NEAR's signer network; testnet4 reorgs; coins another wallet later sends to an outpoint an old signature spends. Offers: checked at offer time, then bound by the contract (the same limits, over a longer wait) | W/lib/copy/commerce.ts:279-286; kb90:130-135 |

### 1.8 Costs (NEAR testnet; "about" wherever estimated)
| Item | Fact | Source |
|---|---|---|
| Mint | 0.02 NEAR deposit; ≈ 0.007 used (measured 682–708 B), rest refunded | kb90:435; W/lib/near/constants.ts:40 |
| List | 0.01 NEAR deposit, unused part refunded; USDC listing needs a one-time 0.00125 NEAR payout registration | kb90:437; constants.ts:42, :47 |
| Per signature | **About 0.004 NEAR — an estimate**: gas ≈ 0.0015 NEAR (measured live: 14.9–15.7 Tgas burnt per `sign_for`) + record storage ≈ 0.0025–0.0035 NEAR (estimated, never measured: SAT-012/A-03 open); +0.00063 NEAR on a network's first record; ≈ 0.1–0.3 NEAR held during signing, refunded | kb90:389, :413-416, :1662; C7S:183-188; live:22-29, :37 |
| Message | ≈ 0.002 NEAR + 0.00001 NEAR per byte storage + gas (attach ≤ 0.01524, rest refunded) | C7S:188 |
| Offer | NEAR: ≈ 0.003–0.005 NEAR storage (attach +0.01, rest refunded). USDC: ≈ 0.0045 NEAR from a 0.01 NEAR storage-credit prepay (unused credit withdrawable). Not returned on cancel or accept | C46:85-89; core/near/market.ts:21-41 |
| Allowance | attach 0.01 NEAR, entry ≈ 150–900 B (≤ 0.009 NEAR), rest refunded; revoke 1 yocto, storage not returned. Each holder pays their own sends' fees | C5:36-38, :267-268 |
| Inside | first deposit ≈ 0.0009 NEAR storage (measured ≈ 0.0007); take-out 1 yocto + gas | C46:83; live:30 |
| Give | gas only (1 yocto); **by link + 0.02 NEAR** to the claim account | kb90:436; link.ts:61-62 |
| Network fees | from the Satchel's own coins; a USDC send's fee is ETH on that network | multichain.ts:195-196 |
| **Satchel fee** | **none on sales or on offers** (full price/amount paid out) | W/lib/copy/commerce.ts:58-59; offers.rs:312 |

### 1.9 The lock
| Fact | Source |
|---|---|
| "No admin key… can't be upgraded" holds for the contract that ships: no admin or upgrade method; the wasm imports no AddKey, DeployContract or DeleteAccount (INV-22); every init value and allowlist is frozen | ct/lib.rs:101-105, :241-243; kb90:1005; C7S:33-35 |
| It holds only for **rc** (`rc.satchelhq.testnet`, born keyless Nov 9) and **final** (`satchel.satchelhq.testnet`, born keyless **Nov 10, ≈ 10:00–12:00 UTC**, needs Razvan's "yes", H-15): one tx, CreateAccount + 20 NEAR + deploy + `new` + mints #1–#7, no AddKey. Freeze Nov 9; cut rule Nov 8, 12:00 UTC | kb90:22-28, :863-909; dec:1166; plan/progress/feature-sprint.md:7-12 |
| The landing names no account; the claim is keyed to `NEXT_PUBLIC_CONTRACT_ROLE`. **Production today: `dev2.satchelhq.testnet`, role `dev`** (renders the dev twin). The shared dev server (:3210) runs role final. dev2 has keys and was **redeployed in place** on Oct 30 and Oct 31 | apps/web/.env.production; W/lib/lock-facts.ts:26-30; plan/progress/sprint-log.md:121, :140 |

### 1.10 Constraints for whoever writes the copy
- `test/unit/config-copy-theme.test.ts:61` bans in every copy string: cooldown, MPC, yocto, Tgas, yield, "Safe to buy",
  **`$` followed by a digit**, delegate(s), approval, "every chain", "no signature exists". So a sample "≈ $1,240" can't be
  a literal string: compose it at render (`copy.overview.estimate(usdText(n))`) or change the test.
- The same test pins the landing strings and **word budgets** (:224-249): above Questions 319 (live 322) against a cap of
  **325** (`test/e2e/landing.spec.ts:23`); hero ≤ 61, section ≤ 50. A new strip needs a decided new cap.
- `/questions` ids are stable; onboarding links `q-give`, `q-proves`, `q-allow-what` (W/lib/copy/onboarding.ts:23, :29, :35).

## 2. Line-by-line audit of today's landing (L = `W/lib/copy/landing.ts`)
| Where | Text (abridged) | Verdict | Why, and fix direction |
|---|---|---|---|
| L:18 meta.title; ogAlt L:23; `opengraph-image.alt.txt`, `twitter-image.alt.txt` | "An NFT that is a wallet"; "Satchel: an NFT that is a wallet" | OK | — |
| L:19-20 meta.description | "…own Bitcoin, Ethereum and Solana addresses. Give it or sell it… a buyer's browser checks every past signature first." | OK (stale) | True. Optional: add USDC and the L2s |
| `app/layout.tsx:28-35`; shell.ts:92 home.lead | site description; OG and Twitter "An NFT that is a wallet." | OK | — |
| shell.ts:15 badgeTip (header Testnet badge, NavShell.tsx:80-87) | "Satchel runs on NEAR testnet, Bitcoin testnet4 and Ethereum Sepolia." | STALE | Omits Solana devnet (D-46) and Base/Arbitrum/OP Sepolia. Name all networks, or "on testnets only" |
| shell.ts:52, :67-68, :16 | anchors; role strips; "Sample data…" | OK | — |
| L:42 hero.who | "For anyone selling or gifting a wallet" | OK | — |
| shell.ts:90 home.h1 | "Sell a wallet with everything inside. The buyer checks it first." | OK | Offers are checked too |
| L:49-50 hero.lead | "…A Satchel has none: it's an NFT on NEAR holding Bitcoin, Ethereum and Solana, and the buyer's browser checks no old signature can move them." | OK | Decided copy; nothing forces a change |
| L:52 CTAs; shell.ts:93 note | "Look inside a Satchel", "See Satchels for sale"; "Testnet only…" | OK | — |
| L:60 captions | "Coins inside", "Seller lists it", "Buyer checks first", "Coins included" | OK | — |
| L:61 anim.alt | "a Satchel holds 0.05 BTC and 0.80 ETH… 300 NEAR… 3 past signatures… One transaction…" | OK; STALE if art changes | Must follow the new hero art. Keep any $ figure out of the text layer (§1.10, §4 Q3) |
| L:62-68 pause, stepsLabel, count, checking, paid | — | OK | — |
| L:78-97 desk labels | "3 past signatures", "No new signatures", "Used", "Unused", "Clean history", "Buy", "Checked in the buyer's browser"… | OK | "No new signatures" while listed is true for everyone |
| HeroStage.tsx:40-57; WhatSection.tsx:29-32; HowSection.tsx:80-82, :120-123; CleanSection.tsx:104-149 | the art card: name band, 0.05 BTC / 0.80 ETH ledger rows, state pill | STALE (visual) | The app card now leads "≈ $X / at mainnet prices", bar, chips (D-50; SatchelCard.tsx:56-112) |
| L:106 what.h2 | "One NFT. Its own addresses." | OK | — |
| L:107-108 what.body, sentence 1 | "…on their own chains: no bridge, no wrapped tokens." | OK-watch | True for BTC/ETH/SOL. Conflicts if the same section names wNEAR (wrapped NEAR) inside |
| L:107-108 what.body, sentence 2 | "**Only the NFT's owner can send the coins**, and when it changes hands, everything inside goes with it." | **FALSE** | Accounts the owner adds can send within daily caps (C5:9-12; sign.rs:47-48). Fix: "Only its owner, or someone they allow within daily limits, can send the coins…". The second half stays true (inside coins move; access ends) |
| L:113 what.tags | "Bitcoin/Ethereum/Solana address", "tb1q…", "0x…", "7xKX…" | OK | Optional "one address, four networks" |
| L:143 uses.h2; L:145 lead | "Sending coins is easy. Handing over a wallet isn't."; "One NFT, one step." | OK | — |
| L:152 uses item 1 | "Sell BTC, ETH and SOL together" / "One trade, in NEAR. Neither side sends first." | STALE | USDC prices and offers on any Satchel exist (USDC on NEAR depends on H-26). "Neither side sends first" stays true |
| L:153 uses item 2 | "Give a funded wallet" / "To a friend's account. Gifts skip the buyer's check." | STALE | Give by link reaches someone with no NEAR account yet (they connect one to claim). Keep "Gifts skip the buyer's check" |
| L:154 uses item 3 | "Hand over a project wallet" / "Same addresses. Payments keep coming." | OK | A natural home for "let someone spend within limits" |
| L:157 uses.tags | "300 NEAR", "For you", "New owner" | OK | — |
| L:119 how.h2 | "Mint it. Add coins. Hand it over." | OK | — |
| L:126-127 how step 1 | "Anyone can add coins to its Bitcoin, Ethereum and Solana addresses." | OK (stale) | Also inside, and USDC/L2s |
| L:130-131 how step 2 | "Approve in your NEAR wallet. Signing usually takes about 10 seconds." | OK | Live 5.4–6.1 s (live:22-29); p50 6.7 s (kb90:1395) |
| L:134-135 how step 3 | "The new owner gets everything inside." | OK | Inside coins move too; allowances end |
| HowSection.tsx:95-104, :114 | "Approved in your wallet", "Signing", "Usually about 10 seconds.", "Sent", "New owner" | OK | — |
| L:166 clean.h2; L:173-179 beats | "A signature can outlive a sale"; five beats | OK | Beat 3 covers messages and allowance holders' sends; beat 5 matches "messages never block" |
| L:181 clean.alt; L:186-197 labels | — | OK | — |
| L:206 lock.h2; L:211 lock.body | "No admin key. Not even ours." / "…born without a key and can't be upgraded…" | OK (rc/final only) | True for the shipping contract (§1.9); role-gated, so the live dev site shows the dev twin |
| L:213 lock.limits | "What you still trust: NEAR's signer network… hasn't been audited." | OK | Optional: inside USDC/wNEAR also trust those token contracts (kb90:1680) |
| L:215 cta; L:217 slip; L:218-221 dev | "See the contract facts"; "Access keys: None since birth"…; dev twin | OK | Slip true on rc/final only (art shown only then) |
| shell.ts:68 role.rc | "Release candidate: testnet rehearsal" | OK | — |
| L:230-233 hood.h2, summary, rulesTitle | "Under the hood"; "The six rules, and where to check each claim" | OK | Changes if the number of rules changes |
| L:240-243 **rule 1** | "Plain transfers only: …only transfers it can read: native ETH on Sepolia… It refuses raw hashes, **messages**, permits and **contract calls**." | **FALSE** | Signs ETH and USDC on 4 networks and readable messages; a USDC `transfer` is a contract call (C7S:61-73, :91-114). Fix: "Readable requests only: ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and readable text messages. It refuses raw hashes, permits and any other contract call." |
| L:247-248 rule 2 | "Each request is written on NEAR, with the nonce, coins or blockhash it can spend, before NEAR's signer network sees it. Timed-out requests stay on the record." | STALE | Messages are recorded with their full text; nonces are per network. Add "or a message's full text" |
| L:252-253 **rule 3** | "…While it's for sale, it can't sign, and **only a purchase can move it**." | **FALSE** | Accepting an offer also moves it and stops the sale (offers.rs:294-300). Fix: "…nobody can sign with it or take coins out, and only a purchase or an accepted offer can move it." |
| L:257-258 rule 4 | "It asks each chain whether the nonce was used… For Bitcoin and Ethereum two data providers must agree…" | STALE | True; add "each Ethereum network on its own" and "messages are listed, never blocking" |
| L:262-263 rule 5 | "Buy stays disabled until it passes… no override, and checks again just before buying." | OK (stale) | Make an offer is gated the same way |
| L:267-268 rule 6 | "The purchase names the listing and the signature count… If either changed, it fails and refunds…" | OK (stale) | True for Buy. Offers bind the count and the inside balances (C46:250-256) |
| L:272-280 links | "A live Satchel…", "Every signature…", "Satchels for sale and their checks", "Contract facts…", "The source code and README" | OK | /market also lists unlisted Satchels; repo link 404s until it's public |
| L:289 h2; L:291 all | "Questions"; "All questions" | OK | — |
| L:297-298 q-send | "You can, one chain at a time. A Satchel hands over Bitcoin, Ethereum and Solana together… in one transaction…" | OK | Optional: USDC, inside coins |
| L:303-304 **q-keys** | "…only when the Satchel contract asks, and **the contract asks only for the NFT's current owner**…" | **FALSE** | It also asks for accounts the owner allowed, within caps (C5:125-129). Fix: "…for the NFT's current owner, or an account they let spend within daily caps." |
| L:293 keysDev | "This build reads a development contract that still has keys…" | OK | Shown on dev only |
| L:309-310 **q-proves** | "…It **doesn't cover other tokens**, signatures made after you buy, NEAR's signer network or testnet4 reorgs." | **FALSE (misleading)** | USDC on the four networks *is* checked and counted (C7S:286, :298-301). Fix: "tokens other than USDC", and add "what a site makes of a signed message" (commerce.ts:281). Keep the browser-not-contract sentence (D-42) |
| L:314-315 q-after | "No. A Satchel that's for sale can't sign anything new, and your purchase names the listing and signature count…" | OK | True for owner and allowance holders |
| L:320-332 **q-chains** (`ui`) | "**Native coins only, no tokens**: Bitcoin testnet4, Ethereum Sepolia and Solana devnet. **Send only Sepolia ETH** to the Ethereum address: coins sent on another network can't be moved." | **FALSE** | Fix: "Bitcoin testnet4, Solana devnet, and ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia (one address on all four). NEAR, USDC and wNEAR can also sit inside it on NEAR testnet. Coins on any other network, and other tokens, can't be moved." Keep `hood.rules` agreeing (faq.ts:19-26) |
| L:336-337 q-cost | "0.02 NEAR… 0.01 NEAR… about 0.004 NEAR… Network fees… **Giving one away costs only NEAR gas**, and Satchel charges no fee on sales." | STALE | Numbers hold (0.004 is an estimate). Give by link adds 0.02 NEAR; offers, messages, allowances and USDC payouts add small deposits (§1.8). "No fee on sales or offers" |
| L:341-342 **q-testnet** | "…Its contract **can't be upgraded**, so a bug can't be patched in place…" | **FALSE on role dev** (true on rc/final) | Production runs dev2 (keys; redeployed in place Oct 30 and 31), and only `q-keys` gets the dev line (faq.ts:42-48). Fix: role-gate it like `q-keys`, or ship after the Nov 10 switch |
| L:352-354 cta; shell.ts:128 mint.cta | "Stick it on. Hand it over."; "Look around without a wallet…"; "Mint a Satchel" | OK | — |
| shell.ts:79, :83; NavShell.tsx:178-201 | footer tagline, "Testnet only…", links | OK | — |

## 3. Reusable answers on /questions (`allFaqGroups()`; ids are stable, link `/questions#id`)
| id | Question | First sentence (the bold lead) | Reuse? |
|---|---|---|---|
| q-allow-what | What can someone I add be allowed to do? | Only send coins, up to the daily caps you set per coin and network; network fees count toward those caps. | Yes (onboarding links it) |
| q-allow-caps | What are the caps and limits on access? | Up to 8 caps per person (one per coin or network), each resetting every rolling 24 hours, and up to 4 people can hold access on one Satchel at a time. | Yes ("resetting" is loose: it's a sliding 24 h) |
| q-allow-history | Why does it matter who I give access to? | Their signatures become part of this Satchel's history, same as your own, and this access ends the moment you give or sell it. | Yes |
| q-allow-revoke | How do I end someone's access? | Revoke it any time from Who can spend. | Yes |
| q-allow-btc | Why can someone with access send less Bitcoin than I can? | With this kind of access, a Bitcoin send can only spend one of the Satchel's Bitcoin deposits at a time… | Link only |
| q-offers | What's the difference between a listing and an offer? | A listing is a fixed price anyone can accept instantly; an offer is a bid the owner chooses whether to accept, on a Satchel that's listed or not. | Yes |
| q-withdrawals | Can I cancel a listing or an offer? | Yes. | Yes |
| q-list | How do I list a Satchel for sale? | Pick NEAR or USDC, set a price, and list it once its quiet period has passed and (for USDC) your account is registered for payouts. | Yes (H-26) |
| q-usdc-payouts | How do USDC sale payouts work? | Your account needs a one-time registration (0.00125 NEAR) before you can list for USDC. | Link only (H-26) |
| q-paused | What happens while it's listed? | Sending and giving it away are paused, and the owner can't sign anything new, so the history a buyer checks can't change underneath them. | Yes |
| q-give | How do I give a Satchel away? | In one NEAR transaction to an account that already exists on NEAR testnet. | Yes (onboarding links it) |
| q-give-link | What's give by link? | A way to give a Satchel to someone without a NEAR account yet: it creates a fresh account for them and adds a little testnet NEAR so they can pay gas when they claim it. | Yes |
| q-inside | What can live inside a Satchel besides Bitcoin, Ethereum and Solana? | NEAR, USDC and wNEAR can sit inside it directly, on top of its three chain addresses. | Yes |
| q-withdraw-inside | Can I take NEAR, USDC or wNEAR back out of a Satchel? | Yes, only as its owner, and never while it's listed for sale. | Yes |
| q-storage-credit | What's storage credit? | A small prepaid balance (0.01 NEAR) that covers the one-time cost of holding a USDC or wNEAR deposit, so that cost never comes out of the deposit itself. | Link only (it also pays USDC offers) |
| q-safety-message | Is it safe to sign a message? | A signed message can never move coins out of a Satchel, but a site may still treat it as a login or as a promise made by whoever owns the Satchel at the time. | Yes |
| q-fees-near | Why does a signature cost NEAR? | About 0.004 NEAR covers the gas and the permanent record of that signature… paid by your connected NEAR account rather than the Satchel's own coins. | Yes |
| q-fees-chain | What about the network fee on each chain? | That one comes out of the Satchel's own coins, shown as an estimate before you confirm a send. | Yes |
| q-clean-sources | Where does the clean-history check get its data? | Straight from each chain: public Bitcoin, Ethereum and Solana sources, read in your own browser, not from Satchel's server. | Yes |
| q-why-blocked | Why would a Satchel be blocked from selling? | Clean history found a past signature that could still move its coins. | Yes |
| q-undo | Can I undo a send? | No. | Link only |
| q-txs-vs-activity | What's the difference between Transactions and Activity? | Transactions shows coins moving in and out… | Link only |
| q-what-is | What exactly is a Satchel? | An NFT on NEAR testnet that is a wallet. | **Fix first**: its body says "only its current owner can ask the contract to sign" (questions.ts:15) |
| q-where-arrive | Where do coins I receive show up? | Anyone can send to a Satchel's Bitcoin, Ethereum or Solana address, or add NEAR, USDC or wNEAR to it directly, and only its owner can take any of it back out. | **Fix first**: allowance holders can send from its addresses (questions.ts:27) |
Other ids (q-dust, q-address-book, q-wallets, q-feedback) aren't feature answers. The landing's seven are in §2.

## 4. Open questions for Razvan
1. **USDC on NEAR before H-26.** USDC prices, USDC offers and USDC inside need the final born with `usdc` set. The real
   Circle refund path is still untested (docs/testing/contract.md:457, :532; launch-checklist C-05 open); H-26 is due
   Nov 8. EVM USDC (four networks) is compiled in and safe either way. *Recommended:* name EVM USDC freely now; keep
   "in NEAR" as the default sale currency in the use case; mention NEAR-side USDC in one place that's easy to drop,
   and run C-05 on dev2 before Nov 8.
2. **`q-testnet` on the live dev site.** "Its contract can't be upgraded" is false for dev2 until the Nov 10 switch.
   *Recommended:* role-gate the sentence (as `q-keys` already is), so the refresh can ship before the birth.
3. **A dollar figure in simulated art (D-42 × D-50).** A fixed "≈ $X at mainnet prices" drifts from real prices, and
   `$`+digit is banned in copy strings. *Recommended:* show the D-50 structure with a round sample total, composed at
   render and drawn only in the aria-hidden art; the alt names no figure; re-check it at the Day-13 freeze. If an exact
   figure matters more than the look, show the app's own no-price state ("3 coins on 3 networks") instead.
4. **The same owner-only claim one click away.** `q-what-is`, `q-where-arrive` (the `/questions` lane) and app strings
   (Appendix) still say only the owner can send. *Recommended:* fix the two answers in this refresh, coordinated with
   the `/questions` lane; leave the app strings to an app pass.

## Appendix: the owner-only claim elsewhere (not on `/`)
`W/lib/copy/shell.ts:136` mint.get "Only its owner can move the coins" · `satchel.ts:14-15` how[1] "Only the owner can
sign" · `satchel.ts:90`, `:134` "Only its owner can send them out" · `satchel.ts:126` verify.guarantee "Only the current
owner can get signatures for them" · `multichain.ts:123` fundPage.whose · `multichain.ts:165` coins.chainNote "Only its
owner can send it." Also stale but off-page: `satchel.ts:132` fund.only.evm "Send only Sepolia ETH" (still shown for
Sepolia ETH; true there), `commerce.ts:188` checking line names only Bitcoin and Sepolia, `kb90:1184` README disclosure
("refuses… messages… contract calls"), `brand/README.md:90` "There are no approvals or revokes" (Revoke now exists).
