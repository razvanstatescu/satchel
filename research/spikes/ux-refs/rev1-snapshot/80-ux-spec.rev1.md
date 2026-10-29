# Satchel UX spec: routes, states, components, copy, motion
> Owner: ux · Checked: 2026-10-21 · Confidence: medium. Structure, copy, tokens and motion values are high confidence, because they are computed or sourced. Flows that depend on teammates' MPC, BTC and contract findings are medium and marked [ASSUMED].

Tokens, typography and contrast tables are in **`81-design-tokens.md`**. The calculation scripts behind every [VERIFIED] number live in `research/spikes/ux/` (throwaway, never imported). Phase tags: **P1** = MVP by Nov 6; **P2** = by Nov 13; **cut-n** = position in the plan's cut order (Solana, 1Click, delegates, dynamic SVG, BTC).

## TL;DR
- **Judge-first:** `/s/1` is server-rendered and readable with no wallet and no JS. Above the fold at 390px: the H1 "This NFT is a wallet.", the card with native balances, and the BTC row with its explorer link. Below it: a 3-step "How it works" and a machine-readable **Facts** list for AI judges. The rules say the "jury includes AI judges" **[SOURCED](https://nearhackathon.com/HACKATHON.md)**.
- **IA changes:** tabs become **URL segments** (`/s/[id]`, `/activity`, `/sale`, `/access`). Add **`/s/[id]/transfer`**, which is missing from B4 although transfer is P1 and the core demo moment, and **`/s/[id]/receive`** ("Fund this Satchel"). Send, transfer and receive are modal routes: a Drawer on mobile, a Dialog on desktop.
- **Status vocabulary:** Active · Signing · Listed (cooling down) · For sale · Sold, the last as a flow end state. "Frozen" and "Listed" are one contract state (`listed.is_some()`), so the plan's "Active / Frozen / Listed" pill set changes.
- **Measured facts that change copy** **[VERIFIED 2026-10-21]**:
  - NEAR testnet blocks average **0.56–0.57 s**. 210 blocks is about 2 min, but **143 blocks is about 81 s, not "~2 min"**.
  - The last 14 testnet4 blocks arrived exactly **1201 s apart**. A BTC send is "In mempool" for about 20 min, so the demo can't wait for a confirmation.
  - Testnet4 fees are **1 sat/vB** (about 141 sats per 1-in/2-out send; the plan's "~0.00002" example is 14× high).
  - Sepolia gas is **0.0002 gwei**, so fees need a "< 0.000001 ETH" display rule.
  - A Solana blockhash lives **60–90 s** **[SOURCED]**, which is shorter than a worst-case MPC sign of about 2 min.
- **New failure state the plan misses:** signed but not broadcast. The MPC signs and then the broadcast fails, or the tab closes, leaving an unused signature that turns Clean history red. The flow needs **"Broadcast again"**. Strong recommendation: a server-side broadcast relay, so closing the tab can't strand a signature.
- **shadcn changed in July 2026:** Base UI is the default ("Radix is still fully supported"). Toast is now a Base UI component (the components index I fetched lists Toast, not Sonner), and Drawer moved off Vaul **[SOURCED]**. This spec names primitives in a library-neutral way.
- **Motion (motion 14.5.0, measured):** the handoff slide uses `stiffness 120 / damping 18 / mass 1.2`, reaching 99% at 352 ms and settling within ±1% at 659 ms with 2.8% overshoot. The full handoff choreography takes about 1.3 s. Reduced motion becomes a 200 ms cross-fade plus text.
- **USD:** hide by default. Testnet coins have no value, so a naked "$1,284" reads as a false claim. When shown (Sell or Market only), it always reads "≈ $X at mainnet prices". The card hero shows native balances.

## IA & routes
| Route | Purpose | Phase | Render | Who sees what |
|---|---|---|---|---|
| `/` | Not connected: landing (featured Satchel #1, How it works, proof). Connected: **My Satchels** grid | P1 | SSR (landing) / client (owned list) | Everyone |
| `/s/[id]` | Satchel page, **Wallet** tab (default) | P1 | SSR (owner, state, addresses, balance snapshot), then client refresh | Everyone; actions depend on role (matrix below) |
| `/s/[id]/activity` | **Activity** tab, the timeline | P1 | SSR first page + client | Everyone |
| `/s/[id]/sale` | Labelled **Sell** for the owner (list/delist) and **Buy** for visitors while listed | P2 | SSR + client polling | Owner; visitors only when listed (otherwise "Not for sale") |
| `/s/[id]/access` | **Access** tab: delegates | P2 · cut-3 | client | Owner; a delegate sees only their own row |
| `/s/[id]/send?chain=btc\|evm\|sol` | Send flow | P1 (BTC, ETH) · SOL P2 cut-1 | client | Owner (or delegate, P2) |
| `/s/[id]/transfer` | Transfer (gift) the NFT, ending in the handoff | **P1 (new)** | client | Owner |
| `/s/[id]/receive?chain=` | Fund this Satchel: address, QR, faucet | **P1 (new)** | SSR-able | Everyone (anyone may fund) |
| `/market` | Listed Satchels | P2 | SSR + client | Everyone |
| `/mint` | Mint a Satchel | P1 | client | Connected accounts |
| `/s/[id]/opengraph-image` | Share card, 1200×630 | P1 polish (day 6) | Next.js file convention, cached | Crawlers |
| `/api/card/[id].svg` | NFT `media`: the seeded card art | **P1 static art** (wallets list only tokens with non-null metadata, per `01-prior-art.md`) · P2 live balances (cut-4) | route handler | NFT metadata `media` (MyNearWallet Collectibles) |

Implementation notes:
- Tabs are links. `app/s/[id]/layout.tsx` renders the header, card and NavTabs, and each tab is its own `page.tsx`. Use `aria-current="page"`, not an ARIA tablist, because tabs that navigate are links.
- Send, transfer and receive should be intercepting routes (`@modal/(.)send`) shown as a Drawer below `lg` and a Dialog at `lg` and up. A hard load renders the same flow as a full page. If that costs the web agent time, the fallback is a search-param-driven Drawer. Either way, persist in-flight signing state to `localStorage`, so wallet redirects and reloads resume (see the state machines). **[ASSUMED, owned by web]**
- Global chrome: TopBar with `◆ SATCHEL` wordmark, a `Testnet` badge, nav (My Satchels via the wordmark, Market (P2), Mint) and WalletButton. There is no bottom nav. On mobile the TopBar shows the wordmark, Testnet, Mint and the wallet. The footer has "How it works", the repo link and "Testnet only. Coins here have no value." The help link stays in the same place on every page (WCAG 3.2.6).

## Screens & states

### Role × status matrix (what each viewer can do)
Contract status comes from `satchel_state(token_id)` **[ASSUMED view name; sdk]** plus block height.

| Status (pill) | Contract condition | Owner | Connected visitor | Not connected | Delegate (P2) |
|---|---|---|---|---|---|
| **Active** | `listed = None`, `pending_signs = 0` | Send · Fund · Transfer · List (P2) · Access (P2) | Fund | Fund · Connect wallet | Send within cap · Fund |
| **Signing** | `pending_signs > 0` | Send (allowed) · Fund. Transfer and List disabled: "Wait for the signature in progress to finish" | Fund; pill says Signing | same | Send disabled while the owner's sign is pending [ASSUMED] |
| **Listed · cooling down** | `listed`, `height < listed_at + COOLDOWN` | Delist · Fund. Send and Transfer disabled ("Signing is paused while listed") | Buy disabled with countdown; Clean history runs | Buy needs connect, and is disabled | Send disabled (frozen) |
| **For sale** | `listed`, `height ≥ listed_at + COOLDOWN` | Delist · Fund | **Buy** enabled iff Clean history = clean | Connect to buy | disabled |
| **Sold** (end state, not stored) | `buy` succeeded | Seller: receipt "Sold to {buyer} for {price}" | Buyer: handoff, then owner view | — | Delegates void (`delegate_epoch++`) |

`COOLDOWN` is **read from the contract**. B2 says "200-block cooldown" while S-6 says `listed_at + 210`, so the UI must not hard-code it.

### Judge-first view: `/s/1` with no wallet (P1)
| Need | Design |
|---|---|
| "This NFT is a wallet" in 3 s | H1 "This NFT is a wallet." Sub: "Satchel #1 controls the Bitcoin and Ethereum addresses below. Whoever owns the NFT can move the coins." Card with **native** balances. Then the ChainRows with **full explorer links**. All of this is in the server HTML (no client fetch needed for first paint). Balances come from the indexer snapshot. If the P1 indexer isn't ready, fetch mempool.space and Sepolia server-side with a 1.5 s timeout, and if that fails, render the addresses with "Balance unavailable". Label balances "Balances read from each chain {relative}." |
| AI judges (HTML readers) | `<title>`: "Satchel #1 — an NFT that controls Bitcoin and Ethereum addresses". Meta description: "Satchel #1 is an NFT on NEAR testnet. It controls Bitcoin testnet4 address {btc} and Ethereum Sepolia address {evm} through NEAR Chain Signatures. Transfer the NFT and the new owner controls the funds." Plus a visible `<dl>` **Facts** block: Contract (NearBlocks link) · Token ID · Owner · each chain's full address and balance · Status · Signatures issued (latest, with explorer link) · "Contract keys: none (locked)" with a link to the key list. |
| How it works (3 steps; a real sequence, so numbering is honest) | 1 **Mint a Satchel**: "The NFT gets its own Bitcoin, Ethereum and Solana addresses. They're derived from the NFT, so they never change." (P1: drop "and Solana" until S-11 ships.) 2 **Only the owner can sign**: "To move coins, the owner asks the Satchel contract. It checks who owns the NFT, then asks NEAR's signer network for a signature." 3 **Transfer the NFT, transfer the wallet**: "Gift or sell it, and the new owner controls every coin inside. No bridge, no wrapped tokens, no seed phrase." |
| Proof strip | "Last send: 0.0100 BTC · {time} · mempool.space ↗" · "Last transfer: alice.testnet → bob.testnet · NearBlocks ↗" · "Contract locked · no full-access keys ↗" |
| Verify (collapsed disclosure, for judges) | "Verify these addresses": "Each address is derived by NEAR Chain Signatures from the contract {contract} and this token's number. Anyone can re-derive them. Only the current owner can get signatures for them." The derivation path stays out of the default UI (plan copy rule); showing it inside this disclosure is a design-lead decision (Open question 6). |
| USD | Hidden on `/s/[id]`. Optionally shown on Sell and Market as "≈ $X at mainnet prices". Never summed into the card hero. |
| OG/share image (`opengraph-image.tsx`, 1200×630) | `--bg` field with a soft radial glow of the token accent at 12%. Left: the card at 560×353, rotated −4°, built with the same seeded stops. Satori supports linear and radial gradients, `transform` and grid **[SOURCED](https://github.com/vercel/satori)**; skip the repeating brushed texture. Right: `SATCHEL #1` (engrave), "An NFT that is a wallet." (display 56px), "0.0123 BTC / 0.0500 ETH" (amount 32px, tabular), "Testnet · owned by alice.testnet", and the URL. Alt: "Satchel #1 card holding 0.0123 BTC and 0.0500 ETH on testnet". Satori renders variable fonts at their **default instance**, so ship a **static Archivo instance at wdth 125 / wght 700** for the display text **[SOURCED]**. Revalidate every 300 s. |

### Home `/` (P1)
| State | Condition | Shows | Copy |
|---|---|---|---|
| Landing | not connected | Eyebrow `SATCHEL`, H1 "An NFT that is a wallet.", live featured card (#1), CTAs, How it works, proof strip | `home.*` |
| Loading | connected, fetching `nft_tokens_for_owner` | 3 card skeletons (flat `--surface-2` card shape, no shimmer under reduced motion) | — |
| Empty | owns 0 | `Empty`: title, body, actions **Mint a Satchel** / **See Satchel #1** (P2: **Browse the market**) | `home.empty.*` |
| List | owns ≥ 1 | Grid of SatchelCard `md` (1 column below 640px, 2 from `sm`, 3 from `lg`), newest first; header "My Satchels" plus count plus **Mint** | `home.list.*` |
| Error | RPC failed after retries | Inline Alert with **Try again** | Error map E11 |

### Satchel page layout `/s/[id]` (P1)
| State | Condition | Shows |
|---|---|---|
| SSR default | token exists | Header (visitor: judge H1/sub; owner: "Satchel #1" + alloy name), card `lg`, ownership line, ActionBar by role, NavTabs |
| Not found | `nft_token` returns null, or the id is not an integer | HTTP 404 with `Empty`: "Satchel #{id} doesn't exist", actions **Mint a Satchel** / **Go to My Satchels** |
| RPC down at SSR | NEAR RPC failed | Still render the **addresses** (derived offline; the chains spike measured 1–20 ms per derivation) and the last DB snapshot. Banner `banner.rpc-down` |
| Ownership changed while open | 15 s poll sees a new `owner_id` | Banner `page.owner-changed`. Close the Send/Transfer modal unless it's already signing (signing then fails `ERR_NOT_OWNER` and is reported) |
| Pending signature (this browser) | in-flight record in localStorage | Sticky mini-bar "Sending 0.0100 BTC · signing 0:42" with **View** (reopens SigningProgress) |
| Pending signature (elsewhere) | `pending_signs > 0`, no local record | Pill **Signing** plus info line `page.pending-elsewhere` |
| Delegate view (P2) | viewer is an active delegate | Banner `access.delegate-banner`; Send capped |

### Wallet tab (P1; SOL row P2)
| Element state | Shows |
|---|---|
| Row loading | Chain label and address render immediately (derived). Balance is a 64×16 skeleton |
| Row loaded | Balance (`amount`, tabular, right-aligned), address truncated, **Copy**, **QR**, explorer link |
| Zero | "0 BTC" with **Fund** link |
| Incoming | "+0.0010 BTC incoming · unconfirmed" in `--info`. BTC: mempool stats; EVM/SOL: pending tx seen |
| Stale (older than 60 s) / error | "Balance unavailable" with **Retry**; the address stays usable |
| Footer | "Balances read from each chain {relative}." · **Fund this Satchel** (secondary) · "Verify these addresses" disclosure |

### Activity tab (P1)
| State | Shows |
|---|---|
| Loading | 4 skeleton rows |
| Empty | `Empty`: "No activity yet" / "Fund this Satchel and deposits show up here." / **Fund this Satchel** |
| Loaded | Timeline grouped by day, newest first. In-flight local items are pinned on top with a Signing status until indexed |
| Partial | Inline note per chain, e.g. "Bitcoin history is unavailable right now." |
| Error | Alert with **Try again** |

### Send `/s/[id]/send` (P1)
| Step / state | Shows |
|---|---|
| Guard: not connected | "Connect the owner's wallet" + **Connect wallet** |
| Guard: not owner | "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." |
| Guard: listed | "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." + **Go to Sell** |
| Guard: zero balance | "This Satchel has no {TICKER} yet." + **Fund this Satchel** |
| Form | ChainSelect (ToggleGroup) → AmountInput (Max) → RecipientInput → **Review**. Fee estimate inline ("Estimating fee…", or an error with **Retry**) |
| Review | ReviewCard with the exact outcome (Phantom pattern), helper copy about the wallet prompt, **Send {amount}** / **Back** |
| Signing | SigningProgress (state machine below) |
| Done | "Sent {amount}" + explorer link + per-chain confirmation note + **Done** / **View activity** |
| Errors | Error map (Copy deck) |

### Transfer `/s/[id]/transfer` (P1, new)
| Step / state | Shows |
|---|---|
| Guards | Not owner / listed ("Delist Satchel #{id} before transferring it.") / pending ("Wait for the signature in progress to finish, then transfer.") |
| Recipient | NEAR account input with a live existence check (RPC `view_account`, debounced 400 ms). **Block** missing accounts: an NFT transferred to a misspelled named account is stranded |
| Review | "{account} will control everything in this Satchel:" + balance list + "Approvals are cleared." (P2 adds "{n} delegate will be removed.") + "This can't be undone. Only {account} can transfer it back." + **Transfer to {account}** |
| In flight | Card in the lifted pose; steps "Approve in your wallet" → "Transferring…" |
| Success | HandoffAnimation, then "{account} now controls {balances}." + **View Satchel #{id}** / **Done** |
| Errors | Wallet rejected, `ERR_FROZEN`, pending signs, RPC |

### Receive / Fund `/s/[id]/receive` (P1, new)
Chain ToggleGroup, a 200px QR code (plain address, no URI amount), the full address grouped in 4s, **Copy**, the "Send only…" warning, and the faucet link per chain. There are no loading states, because addresses are derived.

### Sale tab `/s/[id]/sale`: owner "Sell" (P2)
| State | Shows |
|---|---|
| Ready | ListingForm: price + currency (USDC / NEAR), "Buyer gets {balances}", optional "≈ $X at mainnet prices", consequences copy, **pre-list Clean history check**, **List for {price}** |
| Blocked: pending | "A signature is still in progress. You can list once it finishes (up to ~2 min)." |
| Blocked: unused signature | "1 signature was issued but never used. Buyers can't buy until it's settled. Settle it before you list." + **How to settle**. A frozen Satchel can't sign, so the seller must settle **before** listing |
| Listing | wallet, then tx polling |
| Listed · cooling down | FreezeBanner (owner copy) + Clean history + **Delist** |
| For sale | "Listed for {price} · buyable now" + **Delist** |
| Delist confirm | AlertDialog: "Delist Satchel #{id}?" / "Buyers can no longer buy it, and signing resumes right away." |
| Sold | "Sold to {buyer} for {price}." / "{price} arrived in your NEAR account." |

### Sale tab: visitor "Buy" (P2)
| State | Shows |
|---|---|
| Not listed | "Satchel #{id} isn't for sale." The tab is hidden in nav; the route still answers |
| Cooling down | FreezeBanner (buyer copy) · CleanHistory · "You get" with **Verified balance** hallmark · **Buy** disabled: "Available in {t}" |
| Checking | CleanHistory "Checking {n} past signatures…"; Buy disabled |
| Blocked | Unused signature, or one that can't be verified: Buy disabled with the reason |
| Ready | **Buy for {price}**, Pay with USDC/NEAR (P2 mainnet clip: "Pay from any chain") |
| Insufficient funds | "You have {balance}. You need {price}." |
| Buying | "Approve in your wallet" → "Completing purchase" |
| Success | Reverse HandoffAnimation (seller → You), then "You now control {balances}." + **Open your Satchel** |
| Errors | delisted / price changed / cooldown race / USDC refunded / RPC |

### Access `/s/[id]/access` (P2, cut-3)
| State | Shows |
|---|---|
| Empty | "No delegates" / "Let another NEAR account send from this Satchel, up to a daily limit." / **Add delegate** |
| List | DelegateRow per delegate: account, chain, CapMeter "0.004 of 0.010 BTC used today", "Expires Nov 20" or **Expired**, **Revoke** |
| Add (Dialog) | NEAR account (existence check), Chain, Daily limit, Expires (date) → review → wallet |
| Revoke (AlertDialog) | "Revoke {account}?" / "They can't send from this Satchel anymore." |

### Market `/market` (P2)
| State | Shows |
|---|---|
| Loading | 6 MarketCard skeletons |
| Empty | "Nothing is listed right now." + **Mint a Satchel** |
| Loaded | MarketCard grid: card `md`, price, contents (native), hallmarks **Verified balance** and **Clean history**, status "Buyable now" / "Buyable in {t}" / "Unused signature" / "Checking…". Sort: Newest / Price |
| Error | Alert with **Try again** |

### Mint `/mint` (P1)
| State | Shows |
|---|---|
| Not connected | "Connect a NEAR testnet wallet to mint." + **Connect wallet** |
| Ready | Gunmetal placeholder card ("Its finish is set by its number"), storage cost line, **Mint a Satchel** |
| Minting | wallet → "Minting…" |
| Success | Mint reveal (placeholder cross-fades to the seeded alloy) + "Satchel #{id} is yours." + addresses + **Fund this Satchel** / **Open Satchel #{id}** |
| Errors | insufficient NEAR for storage, wallet rejected, RPC |

### Wireframes (390px)

**W1. `/s/1`, visitor, no wallet (the judge view)**
```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]        [Connect wallet] │ 56px TopBar
├──────────────────────────────────────────────┤
│ SATCHEL #1 · PATINA                          │ engrave 12/16
│ This NFT is                                  │ display 30/34
│ a wallet.                                    │
│ Satchel #1 controls the Bitcoin and Ethereum │ body 15/22 --fg-2
│ addresses below. Whoever owns the NFT can    │
│ move the coins.                              │
│ ╭──────────────────────────────────────────╮ │
│ │▒SATCHEL № 0001▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒[● Active]▒▒│ │ card 358×226 (1.586:1)
│ │▒▒▒▒▒▒▒▒▒ brushed patina gradient ▒▒▒▒▒▒▒▒│ │ radius 13px
│ │ ┌ glass 72% ─────────────┐               │ │
│ │ │ ₿ 0.0123 BTC           │               │ │ amount-xl, tabular
│ │ │ Ξ 0.0500 ETH           │               │ │
│ │ └────────────────────────┘               │ │
│ │ [◉ alice.testnet]          [⟲ Addresses] │ │ flip = Revolut pattern
│ ╰──────────────────────────────────────────╯ │ card bottom ≈ 480px
│ Owned by alice.testnet · Minted Nov 2        │
│  Wallet    Activity                          │ NavTabs (links)
│ ━━━━━━━━                                     │
│ ₿ Bitcoin testnet4              0.0123 BTC   │ ChainRow 72px
│   tb1qaanv…y8sd    [⧉][▦]   mempool.space ↗  │ ≈ 638px: still visible
│ Ξ Ethereum Sepolia              0.0500 ETH   │ in mobile Safari
│   0x53f9…1C2A      [⧉][▦]       Etherscan ↗  │
│ Balances read from each chain 12 s ago.      │ caption
│ [            Fund this Satchel            ]  │ secondary button
│ · · · · · · · · · · · fold · · · · · · · · · │
│ How it works   1 Mint · 2 Only the owner     │
│                signs · 3 Transfer = wallet   │
│ Facts (dl)  Proof strip  Verify (disclosure) │
└──────────────────────────────────────────────┘
```

**W2. Send: Review, then Signing (bottom Drawer)**
```
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│                 ━━━━━━                       │ │ Sending 0.0100 BTC                      [✕] │
│ Review send                             [✕]  │ │                                              │
│ From Satchel #1 · Bitcoin testnet4           │ │ ✓ Preparing transaction                      │
│ ╭──────────────────────────────────────────╮ │ │ ✓ Approve in your wallet                     │
│ │ You send               −0.0100 BTC       │ │ │ ◉ Signing with NEAR's signer network   0:42  │
│ │ Recipient gets          0.0100 BTC       │ │ │   Signing 2 of 3 inputs   ▰▰▱                │
│ │ Network fee             ~277 sats        │ │ │   Usually under a minute.                    │
│ │                  paid by this Satchel    │ │ │ ○ Broadcasting to Bitcoin testnet4           │
│ │ Satchel after           0.0023 BTC       │ │ │ ○ Sent                                       │
│ │ ──────────────────────────────────────── │ │ │                                              │
│ │ To  tb1q 9x7k m2rd … (full, groups of 4) │ │ │ Keep this page open until it says Sent.      │
│ │     ✓ Bitcoin testnet4 address           │ │ │ (relay variant: "You can close this page…")  │
│ │ NEAR fee  ~0.005 NEAR · your NEAR account│ │ │                                              │
│ │ Uses 3 coins → 3 signatures. Signing can │ │ │ role="status" region announces each step     │
│ │ take a little longer.                    │ │ │ and the 30 s / 90 s notes, never every tick  │
│ ╰──────────────────────────────────────────╯ │ └──────────────────────────────────────────────┘
│ Your wallet will ask you to approve a        │
│ request to satchel.team.testnet. That's this │
│ Satchel asking NEAR's signer network to sign.│
│ [           Send 0.0100 BTC            ]     │ metal CTA, 48px
│ [ Back ]                                     │
└──────────────────────────────────────────────┘
```

**W3. Buy tab (visitor, listed, cooling down; P2)**
```
┌──────────────────────────────────────────────┐
│ [card md 280×177 · ❄ Listed]   For sale      │
│                                250 USDC      │ amount-xl
│ ┌ FreezeBanner ────────────────────────────┐ │
│ │ ❄ Signing paused while listed            │ │
│ │ Safe to buy in 143 blocks (~1 min 20 s)  │ │ ETA from measured block time
│ │ ▰▰▰▰▰▰▱▱▱▱▱▱▱▱   67 of 210 blocks        │ │ role=progressbar
│ └──────────────────────────────────────────┘ │
│ Clean history                                │ h3
│ ✓ Clean: 4 of 4 past signatures settled      │ summary (role=status)
│ ✓ Ethereum · 0x3f…a91c · block 274,081,200   │ CleanHistory rows
│   Settled · nonce 3 used by 0x8b…41          │
│ ✓ Bitcoin · 7d…e2 · block 274,083,912        │
│   Settled · all 2 inputs spent               │
│ ⋯ 2 more                          [Show all] │
│ While it's listed, coins can only leave this │
│ Satchel through signatures issued before     │
│ listing. Clean history checks every one.     │
│ You get   0.0123 BTC · 0.0500 ETH · 1.20 SOL │
│ [◇ VERIFIED BALANCE]  read 8 s ago           │ hallmark badge
│ Pay with  ( USDC | NEAR )                    │ ToggleGroup
│ [      Buy for 250 USDC  (disabled)      ]   │
│ Available in 1 min 20 s                      │ reason (aria-describedby)
└──────────────────────────────────────────────┘
```

**W4. Transfer, then handoff storyboard (P1)**
```
F1 Review                                F2 In flight (lifted)               F3 Handoff (≈1.3 s)                 F4 Done
┌──────────────────────────────┐        ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Transfer Satchel #1          │        │      ╭──────────╮            │  │ (◉ You)  ───────▶  (◉ bob)   │  │ (◉ bob)  key now blue        │
│ To  [bob.testnet       ] ✓   │        │      │ card ↑12 │ rot 6°     │  │          ╭card╮→ slides      │  │ bob.testnet now controls     │
│     Account found            │        │      ╰──────────╯            │  │  key rotates 180°, colour    │  │ 0.0123 BTC and 0.0500 ETH.   │
│ bob.testnet will control:    │        │ (◉ You)            (◉ bob)   │  │  rose → blue (owner colours) │  │ [View Satchel #1]  [Done]    │
│ 0.0123 BTC · 0.0500 ETH      │        │ Approve in your wallet       │  │                              │  │                              │
│ Approvals cleared.           │        │ then "Transferring…"         │  │ runs only after the tx       │  │ focus → message heading;     │
│ This can't be undone.        │        │                              │  │ succeeds (never optimistic)  │  │ live region announces it     │
│ [Transfer to bob.testnet]    │        │                              │  │                              │  │                              │
└──────────────────────────────┘        └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

**Desktop (≥1024px):** a 12-column grid, max width 1200px, 48px gap. The left 5 columns hold a sticky panel (top 88px): card `lg` at 420–460px wide, ownership line, and ActionBar (Send · Fund · Transfer, or Buy). The right 7 columns hold the header H1/sub, NavTabs and tab content. Send, Transfer and Receive open as a 480px Dialog. In the handoff, the "You" and recipient avatars sit left and right of the Dialog body, giving a 520px slide distance. Market is a 3-column grid at `lg` and 4 columns at `xl`.
```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ SATCHEL [TESTNET]                         My Satchels  Market  Mint   (◉ alice.testnet)│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ╭──────────────────────────────╮    SATCHEL #1 · PATINA                                 │
│  │                              │    This NFT is a wallet.                               │
│  │      SatchelCard lg 440w     │    Satchel #1 controls the Bitcoin and Ethereum …      │
│  │                              │     Wallet   Activity   Sell   Access                  │
│  ╰──────────────────────────────╯    ━━━━━━                                              │
│  Owned by you · Active               ChainRow BTC ………………………………… 0.0123 BTC               │
│  [Send] [Fund] [Transfer]            ChainRow ETH ………………………………… 0.0500 ETH               │
│  (sticky)                            Facts · Verify                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Demo video beats (UX view of B7)
`00-hackathon-rules.md` reports that X caps non-Premium uploads at **140 s (2:20)**, so the plan's 2:45 cut doesn't fit unless the account has Premium. Every beat below is designed to survive jump cuts:

| Beat (≤ 2:20) | Screen | Must be visible | Edit note |
|---|---|---|---|
| 0:00–0:12 Hook | `/s/1` judge view | H1, card, balances | none |
| –0:35 Mint and fund | `/mint`, then the reveal, then `/s/[id]/receive` | Alloy reveal, addresses, faucet link | Speed-ramp the faucet wait |
| –1:00 Send ETH | Send: Review, then SigningProgress | Exact-outcome review, the running timer, then "Sent" with Etherscan | Jump-cut the MPC wait. Keep the timer on screen before and after the cut, so the wait is shown honestly |
| –1:30 Transfer, then Bob sends BTC | Transfer and handoff (≈1.3 s); Bob's browser sends BTC | "bob.testnet now controls…", then "In mempool" | Split screen with two browsers. Don't wait for the 20-minute BTC confirmation |
| –2:05 List, freeze, clean history, buy | Sell tab, then Buy tab | FreezeBanner countdown, "Clean: 4 of 4 past signatures settled", reverse handoff | Speed-ramp the ~2 min cooldown |
| –2:15 1Click clip | mainnet clip | Status steps, then **Complete purchase** | Cut first if over 2:20 |
| –2:20 Repo | README | "do X – see Y" | none |

## Components
Primitive names are library-neutral. shadcn's July 2026 default is Base UI, and `shadcn init -b radix` keeps Radix **[SOURCED](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)**. `41-web-stack.md` confirms that shadcn 4.22.1 `init -d` gives `base-nova` on `@base-ui/react` and that `--base radix|base` chooses; decide on day 1. The new Toast is "built on Base UI primitives", with Radix and React Aria variants; Drawer "now uses Base UI instead of Vaul" **[SOURCED](https://ui.shadcn.com/docs/components/drawer)**. If the web agent picks `-b radix`, map Toast to Sonner.

### Inventory
| Component | Kind | Built on | Phase | Used in |
|---|---|---|---|---|
| TopBar, NetworkBadge, WalletButton | custom | Button, Badge, Dropdown Menu, Avatar | P1 | global |
| NavTabs | custom | Link + Tabs styling, `aria-current` | P1 | `/s/[id]/*` |
| **SatchelCard** | custom | Aspect Ratio, Motion | P1 (static SVG art P1; live balances in the SVG P2) | everywhere |
| StatusPill | custom | Badge | P1 | card, header, market |
| **ChainChip** | custom | Badge | P1 | card, market, review |
| **ChainRow** | custom | Item | P1 | Wallet tab |
| **AddressDisplay** + CopyButton + QrCode | custom | Button, Tooltip, Popover (desktop QR), Toast | P1 | rows, review, receive, facts |
| ChainSelect | custom | Toggle Group | P1 | send, receive, add-delegate |
| **AmountInput** | custom | Field, Input Group, Button | P1 | send, list, delegate cap |
| **RecipientInput** | custom | Field, Input Group | P1 | send |
| AccountInput | custom | Field, Input Group | P1 | transfer, add delegate |
| **ReviewCard** | custom | Card, Separator | P1 | send, transfer, list, buy |
| **SigningProgress** | custom | Progress, Spinner | P1 | send (pattern reused for list/buy/transfer) |
| TxStatus + ExplorerLink | custom | Badge, Link | P1 | progress, timeline |
| **Timeline** | custom | Item, Scroll Area | P1 | Activity |
| **HandoffAnimation** | custom | Motion, Avatar | P1 | transfer, buy |
| AccountAvatar | custom | Avatar | P1 | handoff, owner line, delegates |
| HowItWorks, FactsList, ProofStrip, VerifyDisclosure | custom | Collapsible | P1 | landing, `/s/[id]` |
| EmptyState, InlineAlert | shadcn | Empty, Alert | P1 | all screens |
| Responsive modal | shadcn | Dialog (≥ lg) / Drawer (< lg) "responsive dialog" pattern | P1 | send, transfer, receive |
| Confirm | shadcn | Alert Dialog | P2 | delist, revoke |
| **FreezeBanner** | custom | Alert, Progress | P2 | Sale tab, market card |
| **CleanHistory** | custom | Item, Collapsible | P2 | Sale tab |
| ListingForm, BuyPanel, PriceTag | custom | Field, Toggle Group, Button | P2 | Sale tab |
| Hallmark (Verified balance / Clean history) | custom | Badge, Tooltip | P2 | market, Buy |
| MarketCard | custom | SatchelCard md + Card | P2 | `/market` |
| DelegateRow + CapMeter | custom | Item, Progress (`role="meter"`) | P2 cut-3 | Access |
| OneClickStepper | custom | SigningProgress pattern | P2 cut-2 (mainnet clip) | Buy |

### Shared types
```ts
type Chain = 'btc' | 'evm' | 'sol';
type SatchelStatus = 'active' | 'signing' | 'cooling_down' | 'for_sale';      // 'sold' is a flow end state
type ChainBalance = { chain: Chain; base: bigint; decimals: number; display: string; incomingBase?: bigint; asOf: number; error?: boolean };
type Viewer = { kind: 'owner' | 'visitor' | 'anonymous' | 'delegate'; accountId?: string };
```

### SatchelCard
| Aspect | Spec |
|---|---|
| Props | `tokenId: string; size: 'lg'\|'md'\|'sm'; status: SatchelStatus; ownerId?: string; balances?: ChainBalance[]; fiat?: {value:number} \| null; interactive?: boolean; face?: 'front'\|'back'; onFaceChange?(f): void; pose?: 'rest'\|'lifted'; loading?: boolean` |
| Geometry | 1.586:1 (ISO ID-1). Radius 3.72% of width. Sizes: lg 358px (mobile) / 440px (desktop); md 280px; sm 160px (serial and alloy only) |
| Front | Top row: serial `SATCHEL № 0001` (engrave, on `--card-scrim`) and StatusPill (on glass). Middle: glass plate with ChainChips (`amount-xl` in lg). Bottom: owner chip (AccountAvatar + id) and **Show addresses** flip button. Decorative `TESTNET` and alloy-name engraving are `aria-hidden` |
| Back (flip) | Glass over the whole face: 3 rows of chain icon, AddressDisplay (truncated) and Copy, plus a QR of the selected chain. Revolut-style "show details", but addresses are public, so no re-auth |
| States | loading (flat placeholder) · default · stale balances (chip shows last value plus a clock icon) · per status · back face · lifted (handoff) · sold (desaturate 40%, only in seller history) · reduced motion |
| Data | Seed: pure from `tokenId`. Owner: `nft_token`. Status: `satchel_state` + height. Balances: chain APIs via `/api/satchels/:id` |
| A11y | `<figure aria-labelledby>`. Visually hidden summary: "Satchel #1. Holds 0.0123 BTC and 0.0500 ETH. Status: active. Owner alice.testnet." Gradient layers are `aria-hidden`. Flip is a `<button aria-pressed>` "Show addresses"; the hidden face gets `inert`. Tilt only on `(hover: hover) and (pointer: fine)` and never under reduced motion |

**Deterministic gradient seeding (same output in CSS, SVG and OG):** this is a reference implementation for test vectors only (`research/spikes/ux/card_seed.mjs`). Re-implement it from this table.

| Step | Rule |
|---|---|
| 1 Seed | `seed = fnv1a32(utf8("satchel:" + tokenId))`. FNV-1a 32-bit: offset `0x811c9dc5`, prime `0x01000193`, `Math.imul`, `>>> 0`. The token id is the only input, so colours survive a `satchel-v2` redeploy |
| 2 PRNG | `rng = mulberry32(seed)`. The **draw order is part of the spec**: alloy, h1 jitter, Δ sign, Δ size, angle, sheenAt, highlightX, grain |
| 3 Alloy | `ALLOYS[floor(rng()*8)]`, each as name / base hue h / chroma C / jitter: Titanium 250/0.020/10 · Gunmetal 265/0.012/10 · Cobalt 262/0.120/10 · Anodized 302/0.110/12 · Rose Gold 22/0.075/8 · Electrum 86/0.080/8 · Patina 182/0.075/10 · Copper 50/0.100/8 |
| 4 Hues | `h1 = (h + (rng()*2−1)*jitter) mod 360`. `Δ = (rng()<0.5 ? −1 : 1) * (14 + rng()*16)`. `h2 = h1+Δ`. `hMid = h1 + Δ/2`. Never average wrapped hues: a first draft did, and it turned Rose Gold #8 teal |
| 5 Geometry | `angle = round(115 + rng()*50)` deg; `sheenAt = round(42 + rng()*18)` %; `highlightX = round(15 + rng()*70)` %; `grain = floor(rng()*1000)` (SVG feTurbulence seed) |
| 6 Stops (OKLCH, then sRGB hex) | 0%: (0.26, 0.8C, h1) · 28%: (0.42, C, hMid) · sheenAt%: (0.66, 0.6C, h2) · 76%: (0.40, C, hMid) · 100%: (0.24, 0.8C, h1). Out-of-gamut colours: bisect C down until in sRGB. Emit **hex**, so Satori and SVG need no OKLCH support |
| 7 Layers | CSS: `linear-gradient({angle}deg, s0 0%, s1 28%, s2 {sheenAt}%, s3 76%, s4 100%)`, then `radial-gradient(ellipse at {highlightX}% -10%, rgb(255 255 255/.16), transparent 60%)`, then a brushed texture `repeating-linear-gradient({angle+90}deg, rgb(255 255 255/.035) 0 1px, transparent 1px 3px)`, then `--shadow-card` |
| 8 SVG parity | viewBox 856×540 (ID-1 ×10), `rx=31.8`. Use `gradientUnits="userSpaceOnUse"` with the CSS angle: line length `L = \|W·sinθ\| + \|H·cosθ\|`, endpoints `center ± (L/2)·(sinθ, −cosθ)`. Brushed texture: `feTurbulence type="fractalNoise" baseFrequency="0.9 0.02" seed={grain}` at 6% opacity |
| 9 Identity accent | `oklch(0.80, min(1.2C+0.02, 0.14), h1)`: text-safe at 8.75:1 or better on `--surface-2` (see 81) |

Test vectors **[VERIFIED]** (stops listed as 0 / 28 / sheen / 76 / 100):
| id | alloy | angle / sheenAt / hlX | stops | accent |
|---|---|---|---|---|
| 1 | Patina | 131 / 44 / 82 | `#002B27 #0C5A4B #799B8C #015545 #002622` | `#5CD5C7` |
| 2 | Anodized | 147 / 57 / 29 | `#2F1544 #503F83 #888FBB #4B397D #2A0F3F` | `#D4A7FF` |
| 3 | Electrum | 117 / 49 / 48 | `#302100 #65460F #A68D73 #604107 #2A1D00` | `#E1B760` |
| 4 | Rose Gold | 115 / 55 / 21 | `#3C1617 #703C34 #AC897E #6A372F #371112` | `#FDA19F` |
| 5 | Anodized | 142 / 52 / 78 | `#27184A #5B3B7D #A286AE #553577 #231344` | `#C1B0FF` |
| 6 | Cobalt | 126 / 54 / 18 | `#101E52 #0D4D8C #6799B9 #044886 #0C194C` | `#A2BCFF` |
| 7 | Titanium | 131 / 50 / 51 | `#1E252C #474D58 #90929A #424853 #1A2027` | `#A9C0DA` |
| 8 | Rose Gold | 133 / 56 / 35 | `#3C1619 #6F3B47 #AA8793 #693541 #371115` | `#FCA0A4` |
| 42 | Rose Gold | 131 / 50 / 17 | `#3C1616 #703D2F #AA8B7A #6A382A #371112` | `#FDA19E` |

Over ids 1–100,000 the alloys are evenly spread (12,232 to 12,672 each). **Satchel #1 comes out Patina (verdigris teal).** To change the demo token's look, change the salt string and regenerate the vectors. Don't special-case ids (Open question 3).

### ChainChip · ChainRow · AddressDisplay
| Component | Props | States | Data | A11y |
|---|---|---|---|---|
| ChainChip | `chain, balance: ChainBalance, size: 'lg'\|'md'\|'sm'` | default · loading · zero · incoming (one-time glow) · stale · error ("—") | balance cache | Ticker text is always present (no colour-only meaning). Icon `aria-hidden`. Icons on the card use `--chain-*-fg` |
| ChainRow | `chain, networkLabel, balance, address, explorerUrl, canSend` | loading amount · loaded · zero (Fund link) · incoming · stale/error (Retry) | addresses: derived; balance: chain API | `Item` with heading = network label; the explorer link text names the site ("mempool.space") and adds "(opens in new tab)" for screen readers |
| AddressDisplay | `address, chain, mode: 'truncated'\|'full'\|'grouped', copy?: boolean, qr?: boolean` | default · copied (2 s check, Tokenbound pattern) · QR open | derived | Accessible name `"{This Satchel's} Bitcoin testnet4 address {full}"`; the copy button announces via a toast plus a fallback `role="status"` sr-only node "Bitcoin address copied"; QR is `role="img"` with the full address in `aria-label` |

Truncation rule: keep the format prefix plus 4 characters at the front and 4 at the end: `tb1qaanv…y8sd`, `0x53f9…1C2A`, `DvZu…bqGB`. In the Review step always show the **full address in groups of 4**, because address poisoning targets the visible ends. Use JetBrains Mono with `"zero"` on.

### AmountInput · RecipientInput · AccountInput
| Component | Props | Validation and behaviour | A11y |
|---|---|---|---|
| AmountInput | `chain, balanceBase, decimals, feeBase, value, onChange` | Positive · no more than max sendable · no more decimals than the chain allows · BTC at least **546 sats** · SOL to a new account at least **0.00089088 SOL** (rent-exempt minimum `(0+128)×3480×2` lamports) **[VERIFIED from SOURCED formula](https://solana.com/docs/core/accounts)**. **Max** = BTC: Σ UTXOs − fee (no change output); EVM: balance − 21000 × maxFeePerGas; SOL: balance − 5000 lamports, leaving 0 (close) or at least the rent-exempt minimum | `Field` label "Amount"; the error links via `aria-describedby`; Max is a real button "Use maximum: 0.0122 BTC" |
| RecipientInput | `chain, value, ownAddress` | See the table below. Validate on blur and on paste, not per keystroke. Keep the value across retries (WCAG 3.3.7) | inline error plus a fix suggestion (3.3.3) |
| AccountInput | `value` | NEAR account format; `view_account` existence check (debounced 400 ms); reject self (on transfer) and missing accounts; implicit 64-hex accepted with "Implicit account" note | status text in `aria-live="polite"` |

Recipient validation:
| Chain | Accept | Reject (copy key) | Warn |
|---|---|---|---|
| BTC testnet4 | `tb1q…` (bech32: 42 chars P2WPKH, 62 P2WSH) · `tb1p…` (bech32m, 62 P2TR) · `m…`/`n…` P2PKH · `2…` P2SH. Use the **same library call that builds the output script** (bitcoinjs-lib `address.toOutputScript(addr, networks.testnet)`), so UI validation can't drift from tx building **[ASSUMED, owned by btc]** | `bc1…`/`1…`/`3…` → `val.btc.mainnet` · `bcrt1…` → `val.btc.regtest` · checksum or length → `val.btc.typo` | Own address → `val.self` · `tb1` is shared by testnet3, testnet4 and signet, so it can't be told apart; show the static note `val.btc.network` |
| EVM Sepolia | `0x` + 40 hex. Mixed case must pass EIP-55; all-lowercase or all-uppercase is accepted. Implement explicitly with `isAddress(a, {strict:false})` plus `getAddress(a) === a` for mixed case, because viem's `strict` default checks checksums **[SOURCED](https://viem.sh/docs/utilities/isAddress)** | bad length or chars → `val.evm.format` · checksum mismatch → `val.evm.typo` · zero address → `val.evm.zero` | lowercase → `val.evm.nochecksum` · has code (`eth_getCode`) → `val.evm.contract` |
| Solana devnet | base58 (no `0 O I l`) decoding to 32 bytes | `val.sol.format` | off-curve (PDA) → `val.sol.pda` · recipient doesn't exist and amount is below rent-exempt → `val.sol.rent` (blocks) |

### ReviewCard (Phantom exact-outcome pattern)
| Row | Value | Source |
|---|---|---|
| You send | `−0.0100 BTC` (U+2212 minus, tabular) | form |
| Recipient gets | `0.0100 BTC` | form |
| Network fee | BTC in **sats**, e.g. `~141 sats` (1 in, 2 out at 1 sat/vB ≈ 141 vB) or `~277 sats` (3 inputs). ETH: `< 0.000001 ETH` when tiny. SOL: `0.000005 SOL`. Caption "paid by this Satchel" | mempool.space `/v1/fees/recommended`, viem `estimateFeesPerGas`, Solana constant |
| Satchel after | balance − amount − fee | computed |
| To | full address grouped, plus a validation check line | form |
| NEAR fee | `~0.005 NEAR` · "paid by your NEAR account" **[ASSUMED, plan estimate; owned by mpc/sdk]** | constant from gas estimate |
| BTC inputs note | "Uses {n} coins from this Satchel, so it needs {n} signatures. Signing can take a little longer." (only when n > 1) | UTXO selection |
| Warnings | stacked InlineAlerts (new contract recipient, no checksum, and so on) | validation |

ReviewCard a11y: render it as a `<dl>` (label/value pairs). The confirm button's accessible name extends its visible label, e.g. "Send 0.0100 BTC to tb1qaanv…y8sd" (WCAG 2.5.3). A warning that blocks sending disables the button and is linked to it via `aria-describedby`.

### SigningProgress
| Aspect | Spec |
|---|---|
| Props | `flow: 'send'\|'list'\|'buy'\|'transfer'; chain?: Chain; state: SigningState (machine below); startedAt: number; inputs?: {done:number; total:number}; nearTxHash?: string; chainTxId?: string; explorerUrl?: string; error?: MappedError; relay?: boolean` |
| Steps (send) | Preparing transaction → Approve in your wallet → Signing with NEAR's signer network → Broadcasting to {network} → Sent. List, buy and transfer use only the "Approve in your wallet" and "Processing" steps |
| Timer | `m:ss` elapsed since the NEAR tx was submitted, in tabular figures. Notes at **30 s** and **90 s** (plan copy) |
| A11y | Container `role="status"` (polite). It announces step changes, the 30/90 s notes, and the result. The timer itself is `aria-hidden`. Errors use `role="alert"` and move focus to the error title. Success moves focus to the "Sent" heading. Closing the modal while signing is allowed and shows the `sign.closed` toast |

### FreezeBanner · CleanHistory · Timeline · HandoffAnimation · others
| Component | Props | States | Data | A11y |
|---|---|---|---|---|
| FreezeBanner (P2) | `mode: 'owner'\|'buyer', listedAt, cooldownBlocks, height, avgBlockMs` | cooling down (countdown) · buyable · paused data (RPC) | `satchel_state.listed_at`, RPC `block` every 1 s; ETA = remaining × average over the last 100 blocks (measured 0.553–0.571 s) | `role="progressbar"` with `aria-valuetext="67 of 210 blocks, about 1 minute 20 seconds left"`. A separate status node announces only "Cooldown started", "Halfway" and "Safe to buy now" |
| CleanHistory (P2) | `items: {chain, payloadHashShort, block, status: 'settled'\|'unused'\|'checking'\|'unknown'\|'expired', evidence, evidenceUrl}[]` | checking · clean · blocked · unknown · empty | `/api/clean-history/:id` **[ASSUMED shape; owned by sec/pay]** | A `<ul>` whose summary is a `role="status"` heading. Each status is a word, not just an icon. "Show all" is a disclosure button |
| Timeline (P1) | `events: {kind, chain?, title, sub, amount?, status, txUrl, at}[]` | loading · empty · partial · loaded | indexer events (NEP-297 + chain txs) + local in-flight | `<ol>` grouped under day headings; a relative time with an absolute UTC `title` and `<time datetime>` |
| HandoffAnimation (P1) | `from: {accountId}, to: {accountId}, tokenId, balances, direction: 'give'\|'receive'` | idle · lifted (awaiting tx) · moving · landed · reduced | tx success event | Polite live region: "Transfer complete. bob.testnet now controls 0.0123 BTC and 0.0500 ETH." Then focus moves to the message |
| AccountAvatar (P1) | `accountId, size` | — | `hue = fnv1a32(accountId) % 360`, fill `oklch(0.74 0.12 hue)`, initial `#0A0B0D` (8.03:1 or better) | `aria-hidden`; name text next to it |
| Hallmark (P2) | `kind: 'verified-balance'\|'clean-history', state` | ok · warn · checking | balances `asOf`; clean history aggregate | Badge text plus a Tooltip (hoverable, dismissible, WCAG 1.4.13). The signature motif is an assay stamp: a chamfered 1px `--metal-lo` outline with engrave type |
| CapMeter (P2) | `used, cap, chain` | ok · near cap (≥ 80%) · at cap | delegate view + indexer | `role="meter"` with `aria-valuenow/min/max` and `aria-valuetext="0.004 of 0.010 BTC used today"` |

## State machines

### Data sources (all flows)
| Data | Source | Refresh |
|---|---|---|
| Owner, approvals | contract view `nft_token(token_id)` (NEP-171/178) | SSR; 15 s on page; after every tx |
| Owned tokens | `nft_tokens_for_owner(account_id)` (NEP-181) | on connect; after mint, transfer, buy |
| `pending_signs`, `listed {price,currency,listed_at}`, `delegate_epoch` | **new view needed**, e.g. `satchel_state(token_id)` **[ASSUMED; sdk]** | 5 s while Signing or Listed; 15 s otherwise |
| Cooldown length | view or constant (`cooldown_blocks`) **[ASSUMED; sdk]** | once |
| Height and average block time | RPC `block` (finality `final`) | 1 s during countdowns |
| Signature log | view `sig_log(token_id, from, limit)` or `SignatureIssued` events via the indexer **[ASSUMED; sdk/pay]** | on Sale tab |
| Clean-history status | `/api/clean-history/:id` (worker) | 10 s on Sale tab |
| Addresses | chainsig.js derivation, offline and deterministic (1–20 ms measured by the chains spike) | never (SSR) |
| BTC balance, UTXOs, fees, status, broadcast | mempool.space testnet4: `/api/address/:a`, `/utxo`, `/v1/fees/recommended`, `/tx/:id/status`, `POST /api/tx` **[SOURCED](https://mempool.space/testnet4/docs/api/rest)** | 15 s |
| ETH balance, nonce, fees, receipt, broadcast | Sepolia RPC via viem | 15 s; receipt poll 3 s |
| SOL balance, blockhash, status, broadcast | Solana devnet RPC | 15 s; status poll 1 s |
| Signing progress | NEAR tx status by hash (`tx` / `EXPERIMENTAL_tx_status`), reading the `sign_for` → `on_signed` outcome and `SignatureIssued` logs **[ASSUMED; web/mpc]** | 1.5 s while signing |
| Activity | indexer `/api/satchels/:id` (NEAR events + chain txs) | 15 s; local items optimistic |
| Prices ("at mainnet prices") | pay agent's price source (`50-data-and-indexing.md`) | 60 s server cache |
| NEAR account exists | RPC `view_account` | debounced 400 ms |
| Buyer USDC balance | `ft_balance_of` on the USDC contract | on Buy tab |
| 1Click | server `/api/oneclick/*` → `/v0/status` (JWT stays server-side) | 5 s |

### SigningProgress (send)
Persist the in-flight record on entering `preparing`: `localStorage["satchel:inflight:{tokenId}"] = {chain, unsignedTx, payloadHashes, nearTxHash?, startHeight?, step}`. **Recommended:** also `POST /api/pending-tx` so the worker broadcasts when `SignatureIssued` lands (the relay).

| State | Enter when | UI (copy key) | Exits | Data / timers |
|---|---|---|---|---|
| `idle` | Review shown | ReviewCard | CONFIRM → `preparing` | — |
| `preparing` | user taps **Send** | step 1 `sign.step.prepare`; after 10 s `sign.prepare.slow` | PREPARED → `awaiting_wallet` · PREPARE_FAILED → `failed` (mapped) | EVM nonce and fees; BTC UTXOs and fee rate; SOL blockhash or nonce; chainsig.js prepare yields payload hashes |
| `awaiting_wallet` | wallet request opened | step 2 `sign.step.wallet`; after 60 s `sign.wallet.slow` | SUBMITTED(txHash) → `signing` · REJECTED ("User rejected", "Wallet closed") → `cancelled` · WALLET_ERROR → `failed` | near-connect `signAndSendTransaction(s)`. One approval should cover N BTC inputs (one tx, N `sign_for` actions) **[ASSUMED; btc/mpc]** |
| `signing` | tx hash known | step 3 `sign.step.mpc` + timer; 30 s `sign.mpc.30`; 90 s `sign.mpc.90`; BTC `sign.mpc.inputs` (k of n) | ALL_SIGNED → `broadcasting` · PARTIAL(k) stays · CONTRACT_ERR(`ERR_NOT_OWNER`/`ERR_FROZEN`/…) → `failed` · MPC_TIMEOUT → `timed_out` · POLL_ERR ×3 → stays, with `banner.rpc-down` | Poll every 1.5 s. Timeout = the receipt carries the MPC error "Request has timed out." **[SOURCED: near/mpc `crates/contract/src/errors.rs`, `RequestError::Timeout`]**, or height > startHeight + 200 + 10. That is about 120 s at the measured 0.57 s/block |
| `broadcasting` | every signature in hand | step 4 `sign.step.broadcast` | OK(txid) → `sent` · FAIL(reason) → `signed_not_sent` · SOL blockhash expired → `expired` | chainsig.js finalize, then chain broadcast |
| `sent` | txid known | step 5 `sign.step.sent` + explorer + `sent.note.{chain}` | CONFIRMED → `confirmed` | BTC status poll 15 s (testnet4 ≈ 20 min per block) · ETH receipt (~12 s) · SOL status (~1 s) |
| `confirmed` | 1 confirmation | `sent.confirmed` | — | — |
| `cancelled` | wallet rejected | `sign.cancelled` + **Try again** / **Close** | RETRY → `preparing` | form kept |
| `timed_out` | MPC timeout | `sign.timeout` (plan copy) + **Try again** | RETRY → `preparing`, with fresh nonce/UTXOs/fees | `pending_signs` must already be decremented by `on_signed` **[ASSUMED; sdk]** |
| `signed_not_sent` | broadcast failed after signing, or the page was reloaded after the signature arrived | `sign.notsent` + **Broadcast again** | RETRY → `broadcasting` (same signed tx; no new signature) | Mirrors Rabby's "Pending: Broadcast failed". The signature stays "Unused" in Clean history until it's broadcast or replaced |
| `expired` (SOL) | blockhash older than 151 blocks (60–90 s) **[SOURCED](https://solana.com/developers/guides/advanced/confirmation)** | `sign.sol.expired` + **Try again** | RETRY → `preparing` | Durable nonces avoid this but change Clean history's "SOL signatures expire" assumption (chains/sec decision) |
| `failed` | any mapped error | the error map entry | per entry | — |
| *resume* | page load finds an in-flight record | reopen at the stored step: `signing` (poll by hash) or `signed_not_sent` | — | localStorage + `pending_signs` |

### Sale flow: list → cooling down → buy (P2)
| State | Contract condition (view) | Owner UI | Buyer UI | Transition (call) | Guard / error |
|---|---|---|---|---|---|
| Active | `listed=None`, `pending_signs=0` | ListingForm enabled | "Not for sale" | `list(price, currency)` → Listing | Pre-list Clean history warning (client) |
| Active · signing | `pending_signs>0` | List disabled (`sell.blocked.pending`) | — | `on_signed` resolves → Active | contract: `list` fails while pending **[ASSUMED code `ERR_PENDING_SIGNS`]** |
| Listing… | wallet/tx in flight | SigningProgress (wallet → processing) | — | success → Cooling down · failure → Active + error | — |
| Cooling down | `listed`, `height < listed_at + COOLDOWN` | FreezeBanner (owner) + **Delist** | FreezeBanner (buyer) + CleanHistory; Buy disabled | height reaches the end → For sale · `delist` → Active | `sign_for` → `ERR_FROZEN`; `buy` → **[ASSUMED `ERR_COOLDOWN`]** |
| For sale | `listed`, height ≥ end | "Buyable now" + **Delist** | **Buy** iff aggregate = clean or empty | `buy` (NEAR, attached = price) or `ft_transfer_call(usdc, price, {"buy": id})` → Buying | Stale-listing race → **[ASSUMED `ERR_NOT_LISTED` / price mismatch]** |
| Buying… | buyer tx in flight | — | wallet → "Completing purchase" | success → Sold · fail → For sale + error | wrong USDC amount is refunded (S-8) |
| Sold | owner = buyer, listing removed, seller paid (S-7) | `sell.sold` receipt | reverse handoff → owner view | — | delegates void, approvals cleared |
| Delisted | `delist` success | toast `sell.delisted` → Active | listing disappears | — | — |

Clean-history aggregate (gates Buy, UI only; **the contract does not enforce it**, which is disclosed as a trust assumption):
| Aggregate | Condition | Buy | Copy |
|---|---|---|---|
| empty | no signatures ever | enabled | `clean.none` |
| checking | any item `checking` | disabled | `clean.checking` |
| clean | every item `settled` or `expired` | enabled | `clean.ok` (plan copy) |
| blocked | any `unused` | disabled | `clean.blocked` (plan copy) |
| unknown | any `unknown` (API could not decide) | disabled (recommended) | `clean.unknown` |

Map the plan's `sig_check(status: spent|unspent|unknown)` as spent → Settled, unspent → Unused, unknown → "Can't verify". Add `expired` for SOL. Partial BTC signature sets (k of n inputs signed) can't be broadcast; mark them "Incomplete · can't be used" **[ASSUMED; sec decides]**.

### Transfer (P1)
`recipient` → (valid and exists) → `review` → CONFIRM → `awaiting_wallet` (card lifted) → SUBMITTED → `processing` (poll tx) → SUCCESS → `handoff` (≈1.3 s) → `done`.
Failures: REJECTED → `review` with `sign.cancelled`; `ERR_FROZEN` → `xfer.blocked.listed`; pending → `xfer.blocked.pending`; RPC → retry. The handoff runs **only after a successful final outcome**.

### Pay from any chain: 1Click (P2 cut-2, mainnet clip only) [ASSUMED; pay owns the API]
| 1Click status | Step | Copy key |
|---|---|---|
| (quote) | Quote | `oneclick.quote` |
| `PENDING_DEPOSIT` | Send deposit | `oneclick.pending` (shows the deadline from the quote) |
| `KNOWN_DEPOSIT_TX` | Deposit seen | `oneclick.known` |
| `PROCESSING` | Swapping | `oneclick.processing` |
| `SUCCESS` | USDC arrived → **Complete purchase** (`ft_transfer_call`) | `oneclick.success` |
| `INCOMPLETE_DEPOSIT` / `REFUNDED` / `FAILED` | end states | `oneclick.incomplete` / `.refunded` / `.failed` |

## Copy deck
Rules:
- Use BTC/ETH/SOL, address and signature freely. Never show yoctoNEAR, Tgas, payload, domain_id or the derivation path (the plan's copy rules).
- Sentence case. Active voice. No apologies.
- One verb per action across the whole flow: Send → Sent, Transfer → Transferred, List → Listed, Delist → Delisted, Buy → "You now control…", Fund (never "Receive" or "Deposit").
- Use "Satchel #1" in text. The engraved `№ 0001` is decorative.
- Every `{n}` string uses ICU plurals ("1 signature was…" / "2 signatures were…").
- Until S-11 ships, P1 strings name only Bitcoin and Ethereum.
- Keep strings in one `copy.ts` keyed as below, so the design lead can edit them without touching components.

### Formatting
| Thing | Rule | Example |
|---|---|---|
| BTC | up to 8 decimals, minimum 4, trailing zeros trimmed; fees in sats | `0.0123 BTC`, `~141 sats` |
| ETH | up to 6 decimals; below that show `< 0.000001 ETH` | `0.0500 ETH` |
| SOL | up to 6 decimals | `1.2000 SOL`, `0.000005 SOL` |
| NEAR | up to 4 decimals; below that `< 0.0001 NEAR` | `~0.005 NEAR` |
| USDC | 2 decimals | `250.00 USDC` |
| Rounding | balances round **down**; Max uses exact base units | — |
| Signs | `−` (U+2212) for outgoing, `+` for incoming | `−0.0100 BTC` |
| Fiat | only `≈ $1,284 at mainnet prices`, never bare | — |
| Time | relative ("12 s ago"), with absolute UTC in `title` and `<time>` | — |
| Blocks | `143 blocks (~1 min 20 s)` from the measured average | — |
| Accounts | full if 24 chars or fewer; otherwise middle-truncate | `satchel-buyer.testnet` |
| Network labels | Bitcoin testnet4 · Ethereum Sepolia · Solana devnet · NEAR testnet | — |

### Strings
| Key | String |
|---|---|
| `app.badge` / `.tip` | Testnet / "Satchel runs on NEAR testnet, Bitcoin testnet4, Ethereum Sepolia and Solana devnet. Coins here have no value." |
| `nav.*` | My Satchels · Market · Mint · Connect wallet · Connecting… · Copy account ID · View on NearBlocks · Disconnect |
| `banner.rpc-down` | "NEAR testnet isn't responding. Showing data from {time}." |
| `banner.offline` | "You're offline. Showing the last data loaded." |
| `footer.testnet` | "Testnet only. Coins here have no value." |
| `home.hero` | Eyebrow "SATCHEL" · H1 "An NFT that is a wallet." · "Each Satchel controls its own Bitcoin and Ethereum addresses. Transfer the NFT and you hand over the wallet." (P2: "Bitcoin, Ethereum and Solana") · **See Satchel #1** · **Connect wallet** |
| `home.empty` | "You don't own a Satchel yet" / "Mint one to get Bitcoin and Ethereum addresses that belong to the NFT." / **Mint a Satchel** · **See Satchel #1** |
| `home.list` | "My Satchels" · "{n} Satchels" · **Mint** |
| `how.1..3` | Mint a Satchel / Only the owner can sign / Transfer the NFT, transfer the wallet (bodies in the judge-view table) |
| `page.visitor.h1` / `.sub` | "This NFT is a wallet." / "Satchel #{id} controls the Bitcoin and Ethereum addresses below. Whoever owns the NFT can move the coins." |
| `page.owner-line` | "Owned by {owner}" · "Owned by you" · "Minted {date}" |
| `page.tabs` | Wallet · Activity · Sell (owner) / Buy (visitor) · Access |
| `page.actions` | Send · Fund · Transfer · Buy for {price} |
| `page.notfound` | "Satchel #{id} doesn't exist" / "No Satchel has this number yet." / **Mint a Satchel** · **Go to My Satchels** |
| `page.owner-changed` | "Satchel #{id} now belongs to {owner}. You can't send from it anymore." |
| `page.pending-mine` / `-elsewhere` | "Sending {amount} · signing {m:ss}" **View** / "A signature is in progress for this Satchel." |
| `verify.*` | "Verify these addresses" / "Each address is derived by NEAR Chain Signatures from the contract {contract} and this token's number. Anyone can re-derive them. Only the current owner can get signatures for them." |
| `wallet.row.*` | "Bitcoin testnet4" · "Copy" → "Copied" · aria "Copy Bitcoin address" · "Show QR code for Bitcoin address" · "mempool.space" / "Etherscan" / "Solana Explorer" · "+{amount} incoming · unconfirmed" · "Balance unavailable" **Retry** |
| `wallet.fresh` | "Balances read from each chain {relative}." |
| `wallet.fund` | "Fund this Satchel" |
| `fund.*` | "Fund Satchel #{id}" · "Send only Bitcoin testnet4 coins to this address." / "Send only Sepolia ETH to this address." / "Send only Solana devnet SOL to this address." · "Get testnet BTC" / "Get Sepolia ETH" / "Get devnet SOL" · "Anyone can fund a Satchel. Only its owner can send from it." |
| `toast.copied` | "Bitcoin address copied" · "Account ID copied" · "Transaction ID copied" |
| `act.empty` | "No activity yet" / "Fund this Satchel and deposits show up here." |
| `act.event.*` | "Minted by {account}" · "Received {amount}" · "Sent {amount} to {addr}" · "Signature issued · {Chain}" · "Transferred to {account}" · "Listed for {price}" · "Delisted" · "Sold to {account} for {price}" · "Delegate added: {account}" · "Delegate removed: {account}" |
| `act.status.*` | Signing · Pending · In mempool · Confirmed · Failed |
| `send.title` | "Send from Satchel #{id}" |
| `send.form.*` | "Chain" · "Amount" · "Max" · "Available {amount}" · "To" · placeholders "tb1… address" / "0x… address" / "Solana address" · "Paste" · **Review** · "Estimating fee…" · "Couldn't estimate the fee." **Retry** |
| `send.guard.*` | "Connect the owner's wallet" / "Only the owner of Satchel #{id} can send from it." · "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." · "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." · "This Satchel has no {TICKER} yet." |
| `send.review.*` | "Review send" · "You send" · "Recipient gets" · "Network fee" · "paid by this Satchel" · "Satchel after" · "To" · "NEAR fee" · "paid by your NEAR account" · "Uses {n} coins from this Satchel, so it needs {n} signatures. Signing can take a little longer." · "Your wallet will ask you to approve a request to {contract}. That's this Satchel asking NEAR's signer network to sign." · **Send {amount}** · **Back** |
| `val.btc.mainnet` | "That's a mainnet Bitcoin address. Satchel uses Bitcoin testnet4. Use a tb1… address." |
| `val.btc.regtest` | "That's a regtest address. Use a Bitcoin testnet4 address (tb1…)." |
| `val.btc.typo` | "This Bitcoin address has a typo. Its checksum doesn't match." |
| `val.btc.network` | "tb1… addresses look the same on testnet3, testnet4 and signet. Make sure the recipient uses testnet4." |
| `val.evm.format` / `.typo` / `.zero` | "Enter a 0x address with 40 characters after 0x." / "This address has a typo. Its checksum doesn't match." / "That's the zero address. Funds sent there are lost." |
| `val.evm.nochecksum` / `.contract` | "This address has no checksum. Double-check it." / "This is a contract. Make sure it can receive ETH." |
| `val.sol.format` / `.pda` / `.rent` | "Enter a Solana address (base58, 32–44 characters)." / "This is a program address. Funds sent here may be unrecoverable." / "New Solana accounts need at least 0.00089088 SOL. Send more, or pick an existing account." |
| `val.self` | "This is this Satchel's own address." |
| `val.amount.*` | "Enter an amount." · "That's more than this Satchel can send. Max is {max}." · "Bitcoin won't relay amounts under 546 sats." · "Too many decimals for {TICKER}." |
| `sign.step.*` | "Preparing transaction" · "Approve in your wallet" · "Signing with NEAR's signer network" · "Broadcasting to {network}" · "Sent" |
| `sign.prepare.slow` / `sign.wallet.slow` | "Still preparing…" / "Waiting for your wallet. Check its window." |
| `sign.mpc.30` / `.90` | "Usually under a minute." / "Still working. The network allows up to about 2 minutes." |
| `sign.mpc.inputs` | "Signing {k} of {n} inputs" |
| `sign.keepopen` / `.relay` | "Keep this page open until it says Sent." / "You can close this page. Satchel broadcasts it when the signature arrives." |
| `sign.closed` | "Signing continues in the background. Reopen it from Satchel #{id}." |
| `sign.title` / `.done` | "Sending {amount}" / "Sent {amount}" · **Done** · **View activity** |
| `sent.note.btc` / `.evm` / `.sol` | "In mempool. Testnet4 blocks arrive about every 20 minutes." / "Waiting for 1 confirmation (about 12 seconds)." / "Confirming…" |
| `sent.confirmed` | "Confirmed" |
| `sign.cancelled` | "You cancelled in your wallet. Nothing was signed." **Try again** · **Close** |
| `sign.timeout` | "The signer network did not answer in time. Nothing was sent and no funds moved. Try again." (plan) |
| `sign.notsent` | Title "Signed, not sent" / "{reason} The signed transaction is saved in this browser. Until it's broadcast or replaced, it counts as an unused signature." **Broadcast again** |
| `sign.sol.expired` | "The Solana transaction expired while it was being signed. Nothing was sent. Try again." |
| `xfer.*` | "Transfer Satchel #{id}" · "To (NEAR account)" · "name.testnet" · "Checking account…" · "Account found" · "No account named {x} on NEAR testnet." · "That's your account." · "Review transfer" · "{account} will control everything in this Satchel:" · "Approvals are cleared." · (P2) "{n} delegate will be removed." · "This can't be undone. Only {account} can transfer it back." · **Transfer to {account}** · "Transferring…" |
| `xfer.done` | "{account} now controls {balances}." **View Satchel #{id}** · **Done** · toast "Transferred Satchel #{id} to {account}" |
| `xfer.blocked.listed` / `.pending` | "Delist Satchel #{id} before transferring it." / "Wait for the signature in progress to finish, then transfer." |
| `sell.*` | "Sell Satchel #{id}" · "Price" · USDC · NEAR · "Buyer gets {balances}" · "Your price is below the mainnet-price value of the contents." · "Listing pauses signing. You can't send from this Satchel until you delist." · "Buyers can buy after a {n}-block cooldown (~{t})." · **List for {price}** |
| `sell.blocked.pending` / `.unused` | "A signature is still in progress. You can list once it finishes (up to ~2 min)." / "{n} signature was issued but never used. Buyers can't buy until it's settled. Settle it before you list." **How to settle** |
| `sell.settle.*` | EVM: "Send any transaction from this Satchel. It will use nonce {n}, which cancels the unused signature." · BTC: "Send these coins to this Satchel's own address. That spends the inputs the unused signature needs." · SOL: "Wait about 90 seconds. Unused Solana signatures expire." |
| `sell.listed` / `.delisted` / `.sold` | "Listed for {price}. Signing paused." / "Delisted. Signing resumed." / "Sold to {buyer} for {price}." "{price} arrived in your NEAR account." |
| `sell.delist.confirm` | "Delist Satchel #{id}?" / "Buyers can no longer buy it, and signing resumes right away." **Delist** · **Keep listing** |
| `freeze.title` / `.owner` / `.buyer` / `.done` | "Signing paused while listed" / "Buyable in {n} blocks (~{t})." / "Safe to buy in {n} blocks (~{t})." (plan, with a measured ETA) / "Cooldown complete" |
| `buy.explainer` | "While it's listed, coins can only leave this Satchel through signatures issued before listing. Clean history checks every one." |
| `clean.ok` / `.none` / `.checking` | "Clean: {k} of {n} past signatures settled" (plan) / "No signatures issued yet." / "Checking {n} past signatures…" |
| `clean.blocked` | "{n} signature was issued but never used. Ask the seller to cancel it by sending a replacement, or don't buy." (plan) |
| `clean.unknown` | "Couldn't verify {n} signature. Buying stays paused until it's checked." |
| `clean.item.*` | Settled · Unused · Checking… · Can't verify · Expired · "Nonce {n} used by {tx}" · "Nonce {n} not used yet" · "All {n} inputs spent" · "{k} of {n} inputs unspent" · "Blockhash expired. It can't be used." · "Can't verify: this signature doesn't match a transaction Satchel built." (an arbitrary 32-byte hash can't be classified later, per `01-prior-art.md` §7a, so it blocks) |
| `clean.disclosure` | "Satchel checks this off-chain, by reading each chain. The app blocks buying while a signature is unused. The contract doesn't." |
| `buy.*` | "For sale · {price}" · "You get {balances}" · "Pay with" · **Buy for {price}** · "Available in {t}" · "Blocked: unused signature" · "Checking history…" · "Connect wallet to buy" · "You have {balance}. You need {price}." · "Completing purchase" |
| `buy.done` | "You now control {balances}." / "Satchel #{id} is yours." **Open your Satchel** · toast "You bought Satchel #{id}" |
| `buy.err.*` | "The seller delisted Satchel #{id}." · "The price changed to {price}. Review and try again." · "The cooldown isn't over yet. Try again in {t}." · "Your USDC was refunded. The amount didn't match the price." |
| `hallmark.*` | VERIFIED BALANCE · "Balances read live from each chain for addresses derived from this NFT." · CLEAN HISTORY · "Every signature this Satchel issued has been used or has expired." |
| `market.*` | "Market" · "Nothing is listed right now." · "Buyable now" · "Buyable in {t}" · "Unused signature" · "Checking…" · "Couldn't load listings." |
| `access.*` | "No delegates" / "Let another NEAR account send from this Satchel, up to a daily limit." · **Add delegate** · "{Chain} · up to {cap}/day" · "{used} of {cap} used today" · "Expires {date}" · "Expired" · **Revoke** · "Revoke {account}?" / "They can't send from this Satchel anymore." · "Delegates are removed when the Satchel changes owner." |
| `access.delegate-banner` / `.over-cap` | "You're a delegate. You can send up to {remaining} more today, until {date}." / "That's over today's limit. You can send up to {remaining} more today." |
| `mint.*` | "Mint a Satchel" · "Your Satchel gets its own Bitcoin and Ethereum addresses. Its finish is set by its number." · "Storage deposit ~{x} NEAR. Unused deposit is refunded." · "Connect a NEAR testnet wallet to mint." · **Mint a Satchel** · "Minting…" · "Satchel #{id} is yours." / "Fund it to see the balances move." **Fund this Satchel** · **Open Satchel #{id}** · toast "Minted Satchel #{id}" |
| `oneclick.*` | "Pay from any chain" · quote "Pay {amountIn} {token} on {chain}. {price} arrives in your NEAR account, then you complete the purchase." · pending "Send exactly {amountIn} {token} to {address} before {deadline}." · known "Deposit seen. Waiting for confirmations." · processing "Swapping to USDC on NEAR." · success "{price} arrived." **Complete purchase** · incomplete "The deposit was less than quoted." · refunded "The swap didn't complete. Your deposit was refunded to {refundTo}." · failed "The swap failed. Nothing was bought." |

### Error map (failure → detection → message → action)
| # | Failure | Detect | Message (title / body) | Actions |
|---|---|---|---|---|
| E1 | Wallet rejected or closed | near-connect rejects with "User rejected" / "Wallet closed" (from near-connect source) or a wallet failure payload matching `/reject\|cancel\|denied\|closed/i` | `sign.cancelled` | Try again · Close |
| E2 | Wallet popup blocked | `window.open` returns null **[ASSUMED; web]** | "Your browser blocked the wallet window. Allow pop-ups for this site and try again." | Try again |
| E3 | Not owner | contract panic contains `ERR_NOT_OWNER` | "Only the owner of Satchel #{id} can sign. It may have changed hands in another tab." | Refresh |
| E4 | Frozen | `ERR_FROZEN` | "Signing is paused while Satchel #{id} is listed. Delist it to send." | Go to Sell |
| E5 | Pending signatures block list or transfer | **[ASSUMED `ERR_PENDING_SIGNS`]** | `sell.blocked.pending` / `xfer.blocked.pending` | — |
| E6 | Not enough NEAR for gas or deposit | RPC `NotEnoughBalance` / `LackBalanceForState` | "Your NEAR account needs about 0.01 NEAR for fees. Add testnet NEAR and try again." | Get testnet NEAR ↗ |
| E7 | Gas too low (bug) | "Exceeded the prepaid gas", or MPC `InsufficientGas` "Provided gas is lower than required…" **[SOURCED: near/mpc errors.rs]** | "This request ran out of gas before reaching the signer network. Nothing was signed." | Try again · report (log) |
| E8 | MPC rejected parameters (bug) | MPC `InsufficientDeposit` / `MalformedPayload` / `DomainNotFound` | "The signer network rejected this request. Nothing was signed." | Report |
| E9 | MPC timeout | "Request has timed out." in outcome, or height > start + 210 | `sign.timeout` | Try again |
| E10 | Same request already queued | MPC "Pending-request queue is full…" (limit 128) | "This exact transaction is already being signed. Wait for it to finish." | — |
| E11 | NEAR RPC failure | fetch error or 5xx ×3 | `banner.rpc-down`; in a flow: "Can't reach NEAR testnet. Your funds haven't moved. Retrying…" | auto-retry · Try again |
| E12 | Tx outcome unknown | polling exhausted (5 min) | "Still waiting for NEAR to confirm. Check transaction {hash} on NearBlocks." | NearBlocks ↗ |
| E13 | EVM insufficient funds | "insufficient funds for gas * price + value" | "This Satchel doesn't have enough Sepolia ETH for the amount plus the fee. Lower the amount or fund it." | Edit amount · Fund |
| E14 | EVM nonce too low | "nonce too low" | "Another transaction from this Satchel already used this nonce. Refresh and try again." | Try again |
| E15 | EVM replacement underpriced | "replacement transaction underpriced" | "A pending transaction from this Satchel is using this nonce. Wait for it to confirm, then try again." | — |
| E16 | EVM fee too low | "max fee per gas less than block base fee" / "transaction underpriced" | "The network fee rose while signing. Sign again with a new fee." | Try again (re-sign) |
| E17 | EVM already known | "already known" | treat as success, go to `sent` | — |
| E18 | BTC fee too low | "min relay fee not met" / "mempool min fee not met" / "insufficient fee" | "The fee is below what testnet4 nodes accept right now. Sign again with a higher fee." | Try again |
| E19 | BTC inputs spent | "bad-txns-inputs-missingorspent" / "missing-inputs" | "Some of this Satchel's coins were already spent. Refresh and try again." | Try again |
| E20 | BTC mempool conflict | "txn-mempool-conflict" | "A pending transaction already spends these coins. Wait for it to confirm." | — |
| E21 | BTC dust | "dust" | "Bitcoin won't relay amounts under 546 sats." | Edit amount |
| E22 | BTC/EVM bad signature (bug) | "non-mandatory-script-verify-flag…" / "invalid sender" | "The signature didn't match this transaction. Nothing was sent." | Report |
| E23 | Broadcast API down | mempool.space or RPC 429/5xx | `sign.notsent` with reason "mempool.space isn't responding." | Broadcast again |
| E24 | SOL blockhash expired | "Blockhash not found" / block height exceeded | `sign.sol.expired` | Try again |
| E25 | SOL rent | "insufficient funds for rent" | "This would leave an account below Solana's minimum balance (0.00089088 SOL). Send more, or send everything." | Edit amount |
| E26 | SOL no balance | "Attempt to debit an account but found no record of a prior credit" | "This Satchel's Solana address has no SOL yet. Fund it first." | Fund |
| E27 | Delegate over cap | **[ASSUMED `ERR_OVER_CAP`]** | `access.over-cap` | Edit amount |
| E28 | Buy races | **[ASSUMED `ERR_NOT_LISTED` / `ERR_COOLDOWN` / price mismatch]** | `buy.err.*` | Review |
| E29 | Price API down | price fetch fails | hide fiat silently; tooltip "Price unavailable" | — |
| E30 | Indexer down | `/api/*` 5xx | Activity: "Activity is temporarily unavailable. Balances and addresses still work." · Clean history: "Can't check signatures right now. Buying stays paused until the check runs." | Try again |

## Motion spec
Global: `<MotionConfig reducedMotion="user">` at the root. It "automatically disable[s] transform and layout animations, while preserving the animation of other values like opacity and backgroundColor" **[SOURCED](https://motion.dev/docs/react-accessibility)**. Choreographies also branch on `useReducedMotion()` so they get a shorter cross-fade variant. Only `transform` and `opacity` are animated, plus colour where noted. Use `will-change: transform` only during the handoff.

All springs below were measured with motion@14.5.0's own `spring()` generator (`research/spikes/ux/spring_timings.mjs`). Motion's defaults from source are stiffness 100, damping 10, mass 1, bounce 0.3. Note that **stiffness, damping or mass override duration and bounce** **[SOURCED](https://motion.dev/docs/react-transitions)**.

| Interaction | Animates | Transition | Measured **[VERIFIED]** | Reduced motion |
|---|---|---|---|---|
| Handoff · lift | y 0→−12px, scale 1→1.04, rotate 0→6°, shadow → `--shadow-card-lifted` | `{type:"spring", stiffness:260, damping:22, mass:1}` | 99% @192 ms; about 5% overshoot (peak 6.3°) | none |
| **Handoff · slide ("700 ms spring")** | x from the You slot to the recipient slot (240px mobile, 520px desktop) | `{type:"spring", stiffness:120, damping:18, mass:1.2}` (ζ 0.75) | 95% @313 ms · 99% @352 ms · **±1% @659 ms** · overshoot 2.84% · rest about 885–914 ms | 200 ms cross-fade of owner labels |
| (alternative, duration-based) | same | `{type:"spring", visualDuration:0.6, bounce:0.2}` (k 76.2, c 13.96) | 99% @451 ms · ±1% @728 ms · overshoot 1.52% | same |
| Handoff · key | rotate 0→180° | `{type:"spring", stiffness:180, damping:20, mass:1}` | 99% @260 ms · overshoot 2.98% · rest 658 ms | instant swap |
| Handoff · owner colour | key and ring colour, avatar A → B | tween 320 ms `--ease-standard` | — | tween 200 ms (colour is allowed) |
| Handoff · settle | rotate 6→0°, scale → 1, y → 0 | spring 260/22/1 | 99% @192 ms | — |
| Handoff · message | opacity 0→1, y 8→0; balances stagger 60 ms | tween 240 ms | — | opacity 200 ms |
| Card tilt (fine pointer only) | rotateX/rotateY up to ±8°, highlight follows | `useSpring(mv, {stiffness:300, damping:30, mass:0.5})` (ζ 1.22, overdamped) | 95% @261 ms, no overshoot | off |
| Card flip | rotateY 0→180°; `perspective:1200px`, `backface-visibility:hidden` | `{type:"spring", visualDuration:0.5, bounce:0.15}` (k 109.66, c 17.8) | 99% @427 ms · overshoot 0.63% | cross-fade 200 ms |
| ChainChip value change | old: opacity→0, y→−4; new: from y 4 | tween 160 ms `--ease-standard`; `AnimatePresence mode="popLayout"` | — | opacity only |
| Incoming funds | one glow pulse (accent ring 0→6px→0) | tween 600 ms, once | — | the "+ incoming" text only |
| Pill or chip width change | `layout` | `{type:"spring", stiffness:500, damping:40, mass:1}` | 99% @226 ms · overshoot 0.16% | instant |
| SigningProgress step done | check icon `pathLength` 0→1 | tween 240 ms | — | instant |
| SigningProgress active ring | opacity 0.4↔1 | 1.6 s ease-in-out loop; stops on any end state | — | static ring |
| Multi-input segments | segment scaleX 0→1 | tween 200 ms | — | instant |
| FreezeBanner bar | width per block | linear, duration = average block time (~570 ms) | — | instant steps |
| Mint reveal | Gunmetal placeholder → seeded alloy | cross-fade 400 ms | — | instant |
| Sheets, dialogs, toasts | primitive defaults (CSS) | do not re-implement with Motion | — | primitive handles it |
| Route and tab changes | none | — | — | — |

Handoff choreography (from the moment the tx succeeds):
| t (ms) | Event |
|---|---|
| 0 | Lift. In practice it already happened when "Approve in your wallet" opened; the card waits in the lifted pose |
| 150 | Slide starts. The "You" label fades to 50% |
| 600 | Key rotates 180°. Owner colour tweens from the sender's avatar hue to the recipient's (e.g. alice `#E68AB0` → bob `#5EB4EF`) |
| 800 | Settle (tilt back to 0°) |
| 950 | Message reveals, balances staggered |
| ≈1300 | Focus moves to the message; the live region announces it. Total under 1.5 s, so the video doesn't drag |

## Design tokens
Summary only; the source of truth is `81-design-tokens.md`.
- Graphite surfaces from `--bg #0A0B0D` through `--surface-4 #2A2F37`. Silver metal CTA (`--metal-hi/mid/lo`, text `--on-metal`, 9.80:1 or better). Status, Satchel-state and chain tokens all pass AA.
- Card glass `rgb(8 9 11/.72)` gives at least 5.39:1 for every text colour over 100,000 seeds. The scrim `rgb(8 9 11/.48)` is for white text only.
- Archivo (wdth 125 engrave / 112 display / 100 UI, `tabular-nums slashed-zero`) with JetBrains Mono (`"zero"`) for addresses.
- Radii: base 12px; card radius 3.72% of width. Elevation and motion tokens are listed in 81.

## Accessibility checklist (WCAG 2.2 AA) [SOURCED](https://www.w3.org/TR/WCAG22/)
| SC | Requirement in Satchel | Test |
|---|---|---|
| 1.1.1 Non-text content | Card `<figure>` has a text summary; QR has `role="img"` plus the full address; chain icons are `aria-hidden` next to ticker text | screen reader pass |
| 1.3.1 Info and relationships | Landmarks (header/nav/main/footer); one H1 per page; Facts is a `<dl>`; Timeline is an `<ol>` under day headings; CleanHistory is a `<ul>` | axe + manual |
| 1.4.1 Use of colour | Status, chain and validity are always written as words; links are underlined | grayscale screenshot |
| 1.4.3 / 1.4.11 Contrast | Every pair in 81 is computed. Text on the card always uses glass or scrim. Focus ring 3:1 or better against adjacent colours (use an offset on metal) | re-run the scripts if tokens change |
| 1.4.10 Reflow | 320px width: no horizontal scroll; full addresses wrap (`overflow-wrap:anywhere`) | 320px viewport |
| 1.4.12 Text spacing | No fixed heights on chips, pills or rows | bookmarklet |
| 1.4.13 Hover/focus content | Tooltips (fees, hallmarks, "at mainnet prices") are dismissible with Esc, hoverable and persistent | keyboard + mouse |
| 2.1.1 / 2.1.2 Keyboard, no trap | Every action is reachable. Esc closes modals and returns focus to the trigger. Drawers trap focus while open. Card flip is a button. Tilt is decorative | keyboard-only run of all flows |
| 2.2.1 Timing adjustable | No user time limits. The cooldown is a system wait. The 1Click deposit deadline is shown in full, with "Get a new quote" | — |
| 2.2.2 Pause, stop, hide | Signing pulse and countdown are essential progress; they are static under reduced motion. No auto-advancing carousels | — |
| 2.3.1 Three flashes | Incoming-funds glow runs once, under 3 Hz | — |
| 2.4.2 Page titled | "Satchel #1 · Activity — Satchel" pattern | — |
| 2.4.3 Focus order | Send: ChainSelect (arrow keys) → Amount → Max → To → Paste → Review → Send → Back. Transfer: account → Review → Transfer. Buy: currency → Buy | keyboard |
| 2.4.7 Focus visible | 2px `--ring` outline plus a 2px offset in `--bg` on every interactive element | — |
| 2.4.11 Focus not obscured | `scroll-padding-top:72px; scroll-padding-bottom:96px`; sticky bars never cover a focused element | tab through long pages |
| 2.5.3 Label in name | Visible label = accessible name ("Send 0.0100 BTC"). Icon-only buttons say what they copy ("Copy Bitcoin address") | — |
| 2.5.7 Dragging | Drawer swipe-to-dismiss also has a close button; no drag-only action | — |
| 2.5.8 Target size | All targets 24×24px or larger (icon buttons get padding); primary mobile targets 44×44px | overlay check |
| 3.2.6 Consistent help | "How it works" link in the footer of every page | — |
| 3.3.1–3.3.3 Errors | Field-level messages linked via `aria-describedby`, each with a fix ("Use a tb1… address") | — |
| 3.3.4 Error prevention (financial) | Every send, transfer, list and buy has a Review step and a button label naming the amount and recipient | — |
| 3.3.7 Redundant entry | Amount and recipient survive retries, timeouts and cancellations | — |
| 3.3.8 Accessible authentication | Wallet connect has no cognitive test inside Satchel's UI | — |
| 4.1.2 Name, role, value | Toggle groups, `aria-pressed` on flip, `aria-current` on NavTabs, `role="meter"` / `"progressbar"` | — |
| 4.1.3 Status messages | SigningProgress, FreezeBanner and CleanHistory summaries, and copy confirmations use `role="status"`; errors use `role="alert"`. Base UI Toast announces only `title`/`description` (default priority "low"; F6 jumps to the toast region), so the message goes in `title` **[SOURCED](https://base-ui.com/react/components/toast)**, with an sr-only status node as fallback | NVDA + VoiceOver |
| Reduced motion | `MotionConfig reducedMotion="user"` plus the variants above. Handoff becomes a cross-fade with text | macOS "Reduce motion" |

## Reference patterns
Mobbin was unavailable: the connector needs auth in this session. These came from web research by a helper agent; quotes are from the cited pages and repos.

| Product | Pattern | Borrow as | Source |
|---|---|---|---|
| Phantom | Fixed review screen (recipient, token, fees, amount). "Invalid format" when an address doesn't match the network. "Phantom may warn about new addresses." Fee shortfall reads "Not Enough SOL" with advice to "reduce the amount slightly" | ReviewCard rows; per-chain RecipientInput; "Max" leaves the fee | [send](https://help.phantom.com/hc/en-us/articles/5530158379539-Send-crypto-in-Phantom), [fees](https://help.phantom.com/hc/en-us/articles/30698882147859-Not-enough-SOL-ETH-or-other-tokens-to-pay-network-fees) |
| Rabby | Pending states "Pending: broadcasted" and "Pending: Broadcast failed". A timeline "Transaction created" → "Recently broadcasted" → "Checking status...". "Clear Pending Locally" with the caveat "may still be confirmed on-chain". Risk tiers Safe / Warning / Danger / Forbidden; "Found forbidden risk that can't be ignored" | `signed_not_sent` state + **Broadcast again**; Clean history "Unused" can't be bypassed (Buy disabled, no override) | [Rabby locale strings](https://github.com/RabbyHub/Rabby/blob/develop/_raw/locales/en/messages.json) |
| Coinbase Wallet | Transaction previews simulate "how their balance is expected to change" (Jan 2023) | "Satchel after" row | [The Block](https://www.theblock.co/post/206684/coinbase-wallet-shows-transaction-previews-to-protect-against-nft-scams) |
| Rainbow | Emoji and colour hashed from the address (`addressHashedColorIndex`); the accent drives the action-button backgrounds with contrast correction (`getHighContrastColor`) | Seeded alloy per token, plus `AccountAvatar` hashed from the account id; accent limited to card, glow and tab indicator (81 Open question 3) | [useAccountAccentColor.ts](https://github.com/rainbow-me/rainbow/blob/develop/src/hooks/useAccountAccentColor.ts) |
| Revolut | "Show details" on the card (behind passcode or Face ID); a 3D card-rotate interaction | Card flip to the addresses and QR. No re-auth: addresses are public | [help](https://help.revolut.com/en-US/help/cards/get-a-card/how-to-use-virtual-cards/) (403 to fetch; via search snippet), [60fps.design](https://60fps.design/shots/revolut-3d-card-rotate-interaction) |
| Tokenbound | NFT page panel with an address pill (click to copy, check icon for 1 s) and tabs "Collectibles" / "Assets". Buyer warning: "There are existing approvals on (N) tokens owned by this account. Check approval status… before purchasing." | Wallet tab on the NFT page; Copy feedback; Clean history as the buyer-facing risk banner | [docs](https://docs.tokenbound.org/iframe), [iframe repo](https://github.com/tokenbound/iframe) |
| OpenSea Learn (ERC-6551) | "Selling the parent NFT hands control of the TBA and everything inside to the new owner." | Transfer review copy ("{account} will control everything in this Satchel") | [OpenSea Learn](https://opensea.io/learn/token/what-is-erc-6551) |
| OpenSea / Magic Eden | "List for sale" with price, duration and fee rows; one-time approval, then confirm; "Buy now" → checkout. Inactive listings "can still be fulfilled"; below-floor warnings | ListingForm "Buyer gets" plus a below-value warning; Satchel needs no approval step (list is one call), so the modal is a single step | [OpenSea sell](https://support.opensea.io/en/articles/8867002-how-do-i-sell-an-nft), [ME floor warnings](https://help.magiceden.io/en/articles/8666054-what-floor-price-warnings-mean-on-magic-eden) |
| LI.FI / Rabby bridge | A timer that fills toward the ETA and then goes indeterminate; "This may take a few minutes."; "Closing won't cancel your deposit. You can come back to check on it here anytime."; "Still Bridging" / "Network is busy" | SigningProgress 30 s and 90 s notes; `sign.relay` copy (only if the relay exists); `sign.closed` | [LI.FI en.json](https://github.com/lifinance/widget/blob/main/packages/widget/src/i18n/en.json) |
| NEAR Intents 1Click | Statuses PENDING_DEPOSIT … REFUNDED; `deadline` "identifies when the user refund begins" | OneClickStepper | [status docs](https://docs.near-intents.org/api-reference/oneclick/check-swap-execution-status) |

## Deltas vs plan
| # | Plan says | Change | Why | Scope / schedule |
|---|---|---|---|---|
| D1 | IA has no transfer screen | Add `/s/[id]/transfer` (recipient, review, handoff) | Transfer = control is P1 and the core demo moment | P1, already in day 5 ("Transfer + handoff"); just name the route |
| D2 | "Fund this Satchel" with no flow | Add `/s/[id]/receive` (QR, warning, faucet links) | Judges and buyers need a way to fund | P1, small (half a day, S2) |
| D3 | Tabs Wallet / Activity / Sell / Access | Tabs are URL segments; Sell becomes `/sale` (Sell for the owner, Buy for visitors); Access is owner-only | Deep links for README "do X – see Y", SSR for AI judges | P1 layout choice, no extra time |
| D4 | Pill "Active / Frozen / Listed" | Active · Signing · Listed (cooling down) · For sale · Sold (flow end state) | Frozen and listed are one contract state; "Signing" (`pending_signs > 0`) was missing | none |
| D5 | B2 "200-block cooldown" vs S-6 `listed_at + 210` | UI reads the cooldown from the contract | The two sections disagree | sdk to confirm one value |
| D6 | "Safe to buy in 143 blocks (~2 min)" | ETA from the measured average (0.553–0.571 s/block), so 143 blocks ≈ 81 s ("~1 min 20 s") | Measured on testnet 2026-10-21 **[VERIFIED]** | copy only |
| D7 | Review example "−0.01 BTC, fee ~0.00002" | BTC fees in sats from the live fee API (1 sat/vB now, about 141–277 sats) | Live fees **[VERIFIED]** | copy only |
| D8 | Signing ends "Sent … pending/confirmed polling" | BTC end state is "In mempool"; testnet4 blocks every ~1201 s | Video and judges can't wait 20 min **[VERIFIED]** | Demo script: don't wait for a BTC confirmation |
| D9 | No "signed but not sent" state | Add `signed_not_sent` + **Broadcast again**, persist in-flight state, and strongly recommend a server broadcast relay (`/api/pending-tx` + worker) | A stranded signature is exactly the "unused signature" Clean history flags, and the seller caused it by accident | P1: +0.5 day (S2) for the persistence and retry state; the relay is +0.5 day for the worker (web/btc/sec decide) |
| D10 | SOL in P2 with no expiry handling | Add an `expired` state; flag that durable nonces would break "SOL signatures expire with their blockhash" | Blockhash lives 60–90 s, under the worst-case MPC sign | P2 / cut-1; chains + sec decision |
| D11 | Card shows "large total USD" | Native balances are the hero; USD hidden, or "≈ $X at mainnet prices" on Sell and Market only | Testnet coins have no value; a bare dollar figure reads as false to judges | none |
| D12 | "Sonner toasts", "sheet on mobile" | Primitive names are library-neutral; shadcn defaults to Base UI (Toast, Drawer without Vaul) since July 2026 | **[SOURCED]** changelog | web agent picks `-b radix` or Base UI on day 1 |
| D13 | Clean-history blocked copy "Ask the seller to cancel it by sending a replacement" | Add a **pre-list** check plus "How to settle" (per chain), because a listed Satchel can't sign | The seller can't fix it while frozen | P2: +0.25 day |
| D14 | Clean history statuses spent / unspent / unknown | Add `expired` (SOL) and "Incomplete" (partial BTC input sets); `unknown` blocks Buy | Honest gating; sec owns the final list | P2 |
| D15 | Clean history is off-chain (B5) | Add disclosure copy `clean.disclosure` on the Buy tab | The trust assumption must be visible in the product, not only the README | copy only |
| D16 | Access tab only | Add the delegate's own view (banner, capped Max, over-cap error); show "{n} delegate will be removed" in Transfer review; the contract needs `remove_delegate` for **Revoke** (not in B5's interface) | Delegates void on transfer; Revoke needs a method | P2 cut-3; sdk adds a method |
| D17 | Views not specified | Contract needs `satchel_state(token_id)`, `sig_log(...)`, a cooldown constant, and distinct error codes (`ERR_PENDING_SIGNS`, `ERR_COOLDOWN`, `ERR_NOT_LISTED`, `ERR_OVER_CAP`) | The UI maps each to copy | sdk, day 1–2 |
| D18 | B4 has no judge-specific design | SSR `/s/1` with Facts `<dl>`, meta description, OG image, Verify disclosure | AI judges read HTML | P1 day 6 (card art / empty states) |
| D19 | Transfer to any account | Block missing NEAR accounts (`view_account`) | An NFT sent to a typo'd account is stranded | P1, small |
| D20 | Handoff runs on transfer | Run it only after the final success; reuse it in reverse for buy | Never claim control moved before it did | none |
| D21 | Copy rule hides the derivation path | Keep it hidden by default; optionally reveal it in the collapsed "Verify" disclosure for judges | Verifiability for judges vs plain copy | design lead decides |
| D22 | Market badge "Verified balance" | Define it: live chain read for locally re-derived addresses, with "as of" | Avoid implying an on-chain proof | copy only |
| D23 | Dynamic SVG card in P2 | Ship **static seeded card art** at `/api/card/[id].svg` as NFT `media` in **P1**; live balances in the SVG stay P2 | MyNearWallet testnet lists only tokens with non-null metadata (`01-prior-art.md`). A visible card in a real wallet backs up "this NFT is a wallet" | P1: +0.5 day (S2), since the algorithm is already specified here |
| D24 | Video 2:45 (B7) | Design the beats for 2:20 with jump cuts (beats table above); handoff stays under 1.5 s; no on-screen waits | X caps non-Premium uploads at 140 s (`00-hackathon-rules.md`) | Video plan; 1Click clip is the first cut |

## Open questions / decisions for the design lead
1. **USD:** hidden everywhere (recommended), or "≈ $X at mainnet prices" on Sell and Market only?
2. **Typeface:** Archivo expanded/normal with JetBrains Mono (recommended), or a swap (81 Open question 1)? It must be decided by Nov 1 because it touches the root layout.
3. **Demo token look:** #1 seeds to **Patina** (teal). Keep it, or change the salt string (this changes every card's look; never special-case ids)? Show the alloy name in UI and metadata ("Satchel #1 · Patina")?
4. **Hallmark motif:** approve assay-stamp badges (chamfered, engraved) as the one signature element beyond the card?
5. **Send presentation:** modal route (Drawer/Dialog), recommended, or full page? This needs the web agent's input on wallet redirects.
6. **Verify disclosure:** show the derivation inputs (contract + path) and a copyable verify command to judges, or keep the path hidden entirely?
7. **Card SVG (static art P1, D23; dynamic P2):** should the P2 version include balances with an "as of" timestamp (dynamic NFT story), or stay with alloy, serial and chain marks (no stale numbers in wallet caches)?
8. **Mobile nav:** top bar only (recommended for 14 days), or a bottom tab bar?

Cross-team questions (owner):
- **sdk:** final view names, error codes, cooldown value (200 vs 210), `remove_delegate`, whether `on_signed` decrements `pending_signs` on timeout, and the mint storage cost.
- **mpc:** real latency distribution, to tune the 30 s / 90 s notes; NEAR fee per sign (plan: ~0.005 NEAR).
- **btc:** one tx with N `sign_for` actions vs N txs (one wallet approval or several?); recipient validation helper; fee and vsize estimates.
- **chains + sec:** Solana durable nonce or re-sign on expiry; the partial-signature status in Clean history.
- **web:** near-connect wallets (popup vs redirect); whether `signAndSendTransaction` returns before the yield resolves; intercepting-route modals; the server broadcast relay.
- **pay:** price source for "at mainnet prices"; `/api/clean-history/:id` and `/api/satchels/:id` shapes; 1Click deadline and refund copy.
