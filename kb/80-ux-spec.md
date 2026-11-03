# Satchel UX spec: routes, states, components, copy, motion (Revision 3, brand consolidated)
> Owner: ux · Checked: 2026-10-21 · **Revision 3 "Brand consolidated", supersedes R2** · Confidence: medium-high.
> - **High confidence:** structure, behaviour and copy (R2, reference-backed), tokens and contrast (computed in kb/81 R3).
> - **Medium:** the derived sizes and the per-token accent strength (design-lead decisions by Oct 31).
> - **Inherited:** flows that depend on contract or chain behaviour follow `90-technical-spec.md` and carry its [ASSUMED] items.

> **R4 note (2026-10-26, D-44, Razvan): Satchel 2.0.** The brand is now the "Sticker S" (`brand/`, tokens in kb/81
> R4), and the web app was rebuilt from scratch on it. The full 2.0 specs are in `docs/design/satchel-2.0/`:
> `design-spec.md`, `app-screens.md`, `motion-spec.md`, `voice-copy.md` and `design-system-impl.md`. They supersede
> this document's visual, vocabulary and structure sections wherever the two disagree. The behaviour, state machines,
> error map and honesty rules below still hold. What changed:
> - **Vocabulary** (one verb per action):
>   - **Give** → Giving… → Given. Never "Transfer" in UI copy. The Activity row says "Handed over to {to}", because a
>     sale's transfer lands there too.
>   - **List for sale** → Listing… → Listed, with the state pill **Paused for sale**. This reverses R3's retirement of
>     "For sale".
>   - **Stop selling** (was "Delist").
>   - **Add coins** (was "Fund"; never "Receive" or "Deposit").
>   - **Clean-history labels:** Used · Confirming · Not its coin (were Settled · Settling · Foreign); Unused, Expired,
>     Unfunded and Can't verify are kept.
>   - **Pill set:** Active · Signing · Paused for sale · Sold · Needs attention.
>   - **One connect label:** "Connect NEAR wallet".
> - **Structure:**
>   - **A new app home, `/satchels`** (My Satchels, plus escrowed proceeds with Withdraw). `/` is marketing only, with
>     no data (D-42). `/mint` moved into the app shell, and it closes back to `?from=`.
>   - **`/s/[id]`:** only the Wallet tab shows the full card and actions. Below 1024, Activity and Sale get a compact
>     header (thumb, "Satchel #N", pill); from 1024, the card sits in a sticky left column.
>   - **One fact, one place:** each fact appears once. A single `[data-judge-facts]` block per page holds them.
>   - **Buy above the fold:** on a phone, the buyer sees the price, the verdict and Buy in the first screen, with a
>     pinned buy bar.
>   - **One shell, one footer, one button system.** The footer note is the testnet line; the clean-history disclosure
>     lives on the buy page and in the FAQ.
> - **The card:**
>   - The **charm ledger** (each chain's charm plus its native amount) replaces "{n} chains". Still no fiat.
>   - A lemon **"Yours"** badge (`data-yours`) replaces the stitch as "you own this".
>   - There is no per-token hue.
> - **Motion:** the one signature motion is the hand-off swing, the card carried along a strap with a damped 10°
>   pendulum, now built on WAAPI. The `motion` package is gone.
> - **Feedback:**
>   - failures replace the tracker heading;
>   - your own wallet cancel is neutral, not red;
>   - guards are centred states;
>   - toasts carry a state icon and sit above pinned bars.
> - **Sell** defaults to NEAR and registers USDC inline. Satchel's own wallet picker opens the chosen wallet directly
>   (near-connect's `connect({ walletId })`).

> **D-52 note (2026-11-03, Razvan): the landing presents the mainnet product.**
> - **On `/` only:**
>   - the copy names the product's networks (Bitcoin, Solana, and Ethereum, Base, Arbitrum and Optimism);
>   - one testnet signal is left: the header badge and its tooltip, plus the phone menu sheet's line;
>   - the landing footer has no testnet row;
>   - the art shows "≈ $X" with no label.
> - **The app keeps** every testnet note and the labelled fiat total below.
> - **The RoleStrip is gone on every page.** The role shows on `/contract` and in the buyer's Clean history checks
>   (kb/90 E-55).

> **Decided 2026-10-21 (D-37):** UX-1 = **native only** (no fiat anywhere; the card hero ships the "{n} chains" fallback; prices route cut). UX-32 = landing H1 **"An NFT that is a wallet."** Brass-band stack (UX-17) and global Activity (UX-33) cut. All other R3 defaults accepted.

How R3 relates to the other docs:
- **Visual identity:** `brand/` (README, `design-system.md`, `tokens.json`, logo and web assets) is the source of truth. `81-design-tokens.md` R3 holds the brand tokens verbatim, the marked derived tokens, the mappings and the verified contrast.
- **Behaviour:** `90-technical-spec.md` is the source of truth. Where this doc disagrees with it, kb/90 wins; R3's deliberate departures are recorded in kb/90 §13 (E-45…E-47) and `plan/decisions.md` D-36.
- **Structure:** R2's Mobbin-backed flows, component anatomy, states and copy structure are **kept** and restyled in brand tokens. References: `82-design-references.md` (structure only since R3).
- **Snapshots:** R2 is kept verbatim at `research/spikes/ux-refs/r2-snapshot/80-ux-spec.r2.md`, rev 1 at `rev1-snapshot/` (kb/90 §13 E-01…E-44 quote both).

Phase tags: **P1** = Days 1–6 (MVP, G5 on Nov 6) · **P2** = Days 7–11 · **polish** = only if time; cut first · **R3 ±n h** = scope changed by R3 (§Scope and phasing).

Research IDs: `WC-` wallet-core · `NM-` nft-market · `TS-` trust-signing · `VL-` visual-language (`research/spikes/ux-refs/`). Orchestrator decisions **B-01…B-11** are summarised in `plan/decisions.md` D-36.

## Changelog (R2 → R3)
| # | Area | R2 → R3 | Decision |
|---|---|---|---|
| U3-01 | Themes | Dark only, graphite → **Night (default) + Day** in brand leather and brass. Day follows `prefers-color-scheme: light`; a System · Night · Day control (account menu and footer) overrides it. P1 ships Night; Day is switched on in P2 | B-01 |
| U3-02 | Type | Archivo + JetBrains Mono, mono-caps labels, `engrave` → **Bricolage Grotesque, Instrument Sans, Spline Sans Mono**. Sentence case everywhere; mono only for addresses and hashes | B-02 |
| U3-03 | Actions | Near-white pills → a **brass primary, once per screen**, `radius-md` 14 (not a pill); outline secondary; danger outline; disabled at 40 % with a written reason; pressed state fixed for AA | B-03 |
| U3-04 | SatchelCard | Identity-only alloy face (serial, alloy name, owner chip, glass and scrim) → the **brand card**: a brass band (name + status pill) over a leather body (≈ total + native chain chips), **the stitch only when the viewer owns it**, a per-token leather hue | B-04 |
| U3-05 | NFT SVG | Alloy plate + `{n} SIGNATURES` engraving → the brand card **without balances and without the stitch**: band, name, status, "{n} signatures", chain marks | B-04, D-23 |
| U3-06 | Fiat | None → **UX-1 reopened:** the card total "≈ $X" with "at mainnet prices"; "{n} chains" when prices are missing. The prices route returns (P1, the last R3 cut) | B-04 |
| U3-07 | States | Active · Signing · For sale · Sold → **Active · Signing · Listed · Sold + Needs attention**, always icon + word. Tags become pills; banners become `surface-raised` panels; no amber | B-05 |
| U3-08 | Material | Frost while listed, greyscale Sold, materialise at mint, the HallmarkStamp, the alloy glow → **removed** | B-04, B-06, B-07 |
| U3-09 | Badge | The chamfered Hallmark chip → the **ProofChip**: shield-check + "Clean history" + time + link to the report (R2's word/time/link kept). The GateLine above Buy stays | B-07 |
| U3-10 | Motion | Frost, stamp, materialise, tag stamp, tilt, key rotation, owner colours, stack lift → **one signature moment** (the handoff: lift, 6° tilt, ≈ 700 ms spring slide; the stitch appears on the receiving card) + the signing pulse | B-06 |
| U3-11 | Layout | One TopBar, breakpoints 640/768/1024/1280 → a **top bar below 1024, left navigation from 1024**; brand breakpoints 480/768/1024/1280; grids 1 → 2 (1024) → 3 (1280); left-aligned, only empty states centred | B-08 |
| U3-12 | Flows | Full pages styled like a sheet → **the same routes presented** as a bottom sheet below 768 and a centred 480 px dialog from 768, over the Satchel page the route renders itself. Sell (`/s/[id]/sale?list`) and Mint join. Resolves UX-5 / H-19 | B-08 |
| U3-13 | Activity | Per-Satchel tab only → plus a **global `/activity`** in the left nav, P2 and **cut by default** (+1.5 h) | B-08 |
| U3-14 | Home | A stack of 56 px alloy bands → a stack of the cards' **brass bands** (polish A-04); otherwise the brand grid | B-08 |
| U3-15 | Logo and assets | "◆ SATCHEL" set in `engrave` → the **lockup** (36 px, swapped by theme); brand favicon, PWA icons and manifest; the brand **`og-image.png` is the site-wide OG image** (the generated OG task is gone) | B-09 |
| U3-16 | Copy | Caps labels and tags, "For sale", hallmark wording, no fiat → **sentence case**, "Listed", the brand content fundamentals and its corrections table, tab titles, glyphs replaced by icons, the labelled fiat total | B-10 |
| U3-17 | Landing | Alloy-glow hero + "Every Satchel has its own finish" → a brand hero (`display` H1, `lead`, brass CTA) beside the live card #1; the finishes section is removed | B-04, B-08 |
| U3-18 | Avatars | Hashed-hue initials → neutral: `surface-raised` circle, `ink` initial, `line-strong` ring | brand |
| U3-19 | Receive | Alloy-framed QR → a `surface` panel headed by the card's brass band; leather-ink modules on a white plate | brand |
| U3-20 | Scope | +9.0 h (R2) → **+8.5 h**, weighted to P1 (themes, flow shell, prices) and away from polish (frost, stamp, materialise, finishes) | §Scope |

## Brand vs R2: who won what
| Topic | R2 | R3 (winner) | Why |
|---|---|---|---|
| Colour and themes | Graphite, dark only | Brand leather and brass, Night + Day | Visual identity is the brand's (rule 1, B-01) |
| Primary action | Near-white pill, every button a pill | Brass, once per screen, `radius-md` | Brand (B-03). R2's finding "metal reads as an object, not a control" is answered by the brand's flat brass fill with leather ink, a piece of the logo |
| Type | Archivo + JetBrains Mono, mono caps | Bricolage / Instrument Sans / Spline Sans Mono, sentence case | Brand (B-02) |
| Card face | Identity only, no numbers on metal | Brass band + total + native chips; the SVG stays balance-free | Brand (B-04); D-23 still holds for the NFT media |
| Per-token identity | 8 seeded alloys, glow, swatches | Leather hue ±12° (Night body + swatch) | Brand: "never a new brand colour" |
| State as material | Frost, greyscale, materialise, hallmark strike | Pills (icon + word), FreezeBanner, one handoff moment | Brand motion principle (B-06) |
| Clean-history badge | Chamfered assay hallmark | Shield-check ProofChip; word + time + link kept | Brand vocabulary (B-07); R2 semantics |
| Status words | For sale | Listed (+ Needs attention) | Brand state table; kb/90 erratum E-46 |
| Banners and tags | 8 % / 14 % tints, caps tags | `surface-raised` panels and pills, sentence case | Brand depth by colour steps |
| Flows | Full pages | The same routes, presented as sheet / dialog | B-08; R2's behaviour (deep links, SSR, resume) kept |
| Navigation | TopBar on every size | Top bar < 1024, left nav ≥ 1024 | Brand layout |
| Fiat | None | One labelled card total (UX-1 reopened) | Brand + the original plan; product fact: testnet coins have no value, so it is labelled |
| OG image | Generated per Satchel (Satori) | Brand `og-image.png`, site-wide | B-09 (a saving) |
| Flows, component order, states, copy structure, error map, a11y, SSR rules | R2 | **R2, kept** | Structure and behaviour stay R2 (rule 2) |
| Product facts (no cooldown, latency thresholds, fees, timeout honesty) | kb/90 | **kb/90** over brand sample copy | Rule 3; `brand/README.md` corrections table |

## R2 design decisions: status in R3
The full R2 rationale and references (R2-D01…D30) are in the R2 snapshot. Status here: **kept**, **restyled** (behaviour kept, visuals changed) or **superseded**.

| # | R2 decision (short) | R3 |
|---|---|---|
| R2-D01 | Mobile Home: a stack from 2 Satchels | restyled: a stack of the cards' brass bands; polish A-04 (UX-17) |
| R2-D02 | ChainRows are the holdings | kept. The card also shows native chips; rows keep the addresses, Copy, QR and explorer links |
| R2-D03 | Desktop: a left sticky panel (card → actions or Buy) | kept, beside the left nav from 1024 |
| R2-D04 | Owner ActionRow; visitor StickyBuyBar; pinned bar in flows | kept. While listed, Delist is the screen's brass |
| R2-D05 | Identity-only card face | **superseded** (B-04): total + native chips on the in-app card; the SVG stays balance-free |
| R2-D06 | Near-white CTA pill | **superseded** (B-03) |
| R2-D07 | Mono-caps `label` | **superseded** (B-02) |
| R2-D08 | `amount-hero` 44/48 → 56/60 | **superseded:** `balance-hero` 48/52 (36/40 below 480), stepping to 28/32 rather than wrapping |
| R2-D09 | Expired = success; Settling = info; Unfunded = neutral | kept; Settling and In mempool map to `frozen` |
| R2-D10 | Frost while listed | **superseded:** the Listed pill + FreezeBanner |
| R2-D11 | Hallmark on touch = a link to the report | kept for the ProofChip |
| R2-D12 | 4-row tracker | kept |
| R2-D13 | PendingPill (mobile top) / PendingCard (desktop bottom-right) | kept |
| R2-D14 | Toasts above the pinned bar (mobile) / top-centre (desktop) | kept (top-centre of the main column) |
| R2-D15 | Delist with no dialog | kept |
| R2-D16 | Advisory past-signatures row | kept |
| R2-D17 | Landing hero = the live card #1 | kept; no glow; the brand hero beside it |
| R2-D18 | Review heading "Send 0.0100 BTC" | kept; `label` "Send" (sentence case) over `balance-hero` |
| R2-D19 | Activity rows expand inline | kept |
| R2-D20 | One Activity row per sign request | kept |
| R2-D21 | Stats strip: Status · Signatures · Listed for · Minted | kept, sentence case |
| R2-D22 | Transfer soft guard inline | kept |
| R2-D23 | `label` eyebrow `CLEAN HISTORY` | restyled: "Clean history", `label` in `ink-muted` |
| R2-D24 | Warning-tier acknowledgement only | kept (the warning tier is neutral + warning icon) |
| R2-D25 | Clock times inside flows | kept |
| R2-D26 | "First send here" chip: P2, cut | kept |
| R2-D27 | Modals → a desktop right drawer | **superseded** (B-08): sheet below 768, 480 px dialog from 768 |
| R2-D28 | No success eyebrow | kept |
| R2-D29 | Alloy QR frame | **superseded:** a panel headed by the brass band (UX-22) |
| R2-D30 | Static ring for "sent, not confirmed" | kept, in `frozen` |

## TL;DR
- **Judge-first, unchanged.** `/s/1` renders blocking on the server (kb/90 §8.1).
  - Above the fold at 390 px: the H1 "This NFT is a wallet.", the brand card (band: "Satchel #1" + Active; body: the total and the BTC/ETH chips), the owner pill, the tabs and the first ChainRow with its explorer link (bottom edge at 594 px).
  - Below: the Facts grid (full addresses as visible text), How it works, Verify.
  - No judge fact lives only in a tooltip, a collapsed disclosure, an `aria-label`, a `hidden` node or the inert background of a flow.
- **The brand.** Night (dark tanned leather) by default, Day for light-mode systems. Brass is spent once per screen as an action fill. Leather is the ground and the ink. **The saddle stitch means "you own this".**
- **Flows are real routes** (deep links, SSR), presented as a bottom sheet below 768 px and a 480 px dialog from 768 px over the Satchel page.
- **Five pills, icon + word:** Active · Signing · Listed (= signing paused) · Sold · Needs attention. There is no cooldown anywhere; the only wait is the 250-block quiet period before listing, shown as a calm sentence.
- **One signature moment:** the transfer handoff. The card lifts, tilts 6°, slides to the recipient on a ≈ 700 ms spring, and the stitch appears on the receiving card. Signing pulses the `frozen` step indicator. Everything else is plain response feedback.
- **Signing reads like a Wise transfer** (R2): the Review button becomes "Approve in your wallet…", then a 4-row tracker that becomes the receipt; the copy changes at 20, 60 and 150 s; "Keep this tab open until it says Sent." until broadcast.
- **Failures say exactly what moved.** "Signed, not sent" is a recoverable, calm "Needs attention" state with **Broadcast again**, shown wherever the user looks.
- **Clean history reads like a car's health check:** one verdict sentence, the contract and account checks, the signatures grouped by whether they can still move coins, the sources and the check time. Buy sits under a GateLine; no override exists.
- **Fiat appears once:** the card total "≈ $X · at mainnet prices" (UX-1 reopened), or "{n} chains" without prices. Testnet coins have no value, and the page says so. (In the app. Since D-52 the landing art shows "≈ $X" alone.)
- **Measured numbers** (kb/90 §8.9): MPC p50 6.7 s ("usually about 10 seconds"); BTC fee ≈ 282 sats at 2 sat/vB; testnet4 "minutes to hours" to confirm; 250 blocks ≈ 2 min 20 s; SOL blockhash ≈ 36 s; NEAR fee "≈ 0.004 NEAR (gas + permanent signature record)".

## IA & routes (aligned with kb/90 §8.1)
| Route | Purpose | Phase | Render (kb/90 §8.1) | Who sees what | The server HTML must contain |
|---|---|---|---|---|---|
| `/` | Landing (not connected); **My Satchels** (connected) | P1 | SSR landing; the owned list is a client island | Everyone | H1, the featured card's facts (name, status, total or "{n} chains", native balances), links |
| `/s/[id]` | Satchel page, **Wallet** tab (default) | P1 | **Blocking SSR** (ids 1–7 prerendered) + 15 s client refresh | Everyone; actions depend on role | `<title>` "Satchel #1 · Satchel", meta description, H1, owner, status, **full** addresses, balances with "read {t} ago", `sig_count`, the last signature with its link, lock facts, the Facts `<dl>` |
| `/s/[id]/activity` | **Activity** tab | P1 | SSR first page + client | Everyone | NEAR events with explorer links; a "Show older" link |
| `/s/[id]/sale` | **Sale** tab: **Buy** (visitor, listed) or the owner's listing status; `?list` opens the **Sell flow** for the owner | P2 | Blocking SSR of the listing + the cached verdict *hint*. The browser checker gates Buy | Owner; visitors while listed (otherwise "isn't for sale") | listing, price, `listing_id`, `sig_count`, the verdict hint and its items |
| `/s/[id]/send?chain=btc\|evm\|sol` | **Send flow** | P1 (BTC, ETH) · SOL P2 (cut-1) | Client flow in the FlowShell over the SSR Satchel page | Owner | guard text |
| `/s/[id]/transfer` | **Transfer flow**, ending in the handoff | P1 | same | Owner | — |
| `/s/[id]/receive?chain=` | **Fund flow** | P1 | SSR (the addresses are in the flow) + an Incoming client island | Everyone (anyone may fund) | the addresses |
| `/market` | Listed Satchels | P2 | Blocking SSR + client | Everyone | listings with their verdict hints and the hints' age |
| `/mint` | **Mint flow**, over Home | P1 | Client flow in the FlowShell over the SSR Home | Connected accounts | — |
| `/contract` | Keyless and verification facts | P1 | Blocking SSR (cached 60 s) | Everyone | contract id, role, code hash vs expected, "Account is locked (no access keys)", birth tx + block, signer-tx count, oldest tx, MPC version, `config()`, verify commands |
| `/activity` | Global Activity: every record of the viewer's Satchels | P2, **cut by default** (+1.5 h) | client | Connected | — (needs a kb/90 §8.1 row if adopted) |
| `app/opengraph-image.png`, `app/twitter-image.png` | The site-wide link preview = `brand/web/og-image.png` (1200 × 630) | P1 | static file convention | Crawlers | — |
| ~~`/s/[id]/opengraph-image`~~ | Per-Satchel generated share card | **removed** (B-09) | — | — | — |
| `/api/card/[id].svg` | NFT `media`: the brand card without balances or stitch | P1 static art; status + `sig_count` in SAT-292 (cut-2) | Route handler | Wallets | — |
| `/api/prices` | Mainnet USD prices for the card total | P1 **if UX-1's default stands** (the last R3 cut) | Route handler, 60 s cache (kb/50 snippet: 1Click `/v0/tokens` → CoinGecko) | — | — |
| ~~`/s/[id]/access`~~ | Delegates | **cut** (D-13) | — | — | — |

Implementation notes:
- **Tabs are links.** `app/s/[id]/layout.tsx` renders the header, the card and the NavTabs; each tab is its own `page.tsx`. Use `aria-current="page"`, not an ARIA tablist. Labels: Wallet · Activity · Sell (owner) or Buy (visitor, listed). The third tab is hidden from visitors when the Satchel isn't listed, but the route still answers.
- **Flows are routes presented in the FlowShell** (B-08, D-26 as amended by D-36):
  - The flow route renders the **Satchel page itself as an inert background** (the layout plus the Wallet tab, or the Sale tab for `?list`; `/mint` renders Home) and the flow inside the shell. There are no intercepting routes and no parallel routes.
  - Below 768 the shell is a **bottom sheet**; from 768 it is a **centred 480 px dialog** (`radius-card`, `shadow-overlay`, 1 px `line`) over the `scrim`.
  - **Close** (✕, Esc, Done) replaces the URL with `/s/[id]`; it never relies on history, so deep links close correctly. **Minimize** (while signing) does the same and keeps the signing store alive (module level).
  - The in-flight intent lives in `localStorage["satchel:pending:v1"]` (kb/90 §8.6), so leaving or reloading resumes.
  - **SSR without JS:** the sheet or dialog markup is server-rendered and positioned by CSS only, so a no-JS visit shows the flow. Flow routes are not judge routes; judge facts never depend on the shell.
- **Global chrome:** the NavShell (top bar below 1024, left navigation from 1024), the RoleStrip for `dev` and `rc` (removed, D-52), the PendingPill (mobile) or PendingCard (desktop) while an intent is open, and a footer on every page with the help link in the same place (WCAG 3.2.6).

### NavShell, theme and brand assets (B-08, B-09, B-01)
| Part | Below 1024 | From 1024 |
|---|---|---|
| Frame | A 56 px sticky **top bar** on `ground`, with a `line` hairline under it | A 224 px **left navigation** on `surface`, full height and sticky; the main column (max `container-app` 1200) sits beside it, left-aligned |
| Logo | The **lockup** at 36 px tall (133 px wide), linking to `/`. Clear space a quarter of the tile height (9 px) | The lockup at the top of the nav, 36 px |
| Navigation | A **menu** button (44 px, `menu` icon) opens the **NavSheet** (the FlowShell sheet): My Satchels · Market · Mint (· Activity if built) · Contract facts · Theme | Links (`label`, `radius-sm`, 40 px tall, icon + word): My Satchels · Market · Mint (· Activity if built). Active: `surface-raised` + `ink`; inactive `ink-muted` (canvas) |
| Account | The account control: an AccountAvatar button when connected (opens the account menu), or **Connect wallet** (secondary, never brass in the chrome) | The **account pill** at the bottom of the nav: avatar + account id in `address` style, 1 px `line-strong`, `radius-pill`; its menu holds Copy account ID · View on NearBlocks · Theme · Disconnect |
| Testnet | A "Testnet" chip from 480 px (tooltip `app.badge.tip`); below 480 the note lives in the NavSheet and the footer (D-52: the landing footer has no note; the chip steps aside below 420 px, signed out, and the NavSheet line stands in) | A "Testnet only. Coins here have no value." note at the bottom of the nav |
| Theme control | "Theme: System · Night · Day" (segmented, `monitor` / `moon` / `sun`) in the NavSheet and the footer | In the account menu and the footer. **P2** (P1 forces Night and hides it) |

Brand assets (B-09), wired through the Next Metadata API (port `brand/web/head-snippet.html`; never its Google Fonts link):

| Asset | Source | Destination |
|---|---|---|
| Favicons | `brand/web/favicon.ico` (16/32/48), `favicon.svg` (the small cut) | `app/favicon.ico`, `app/icon.svg` |
| Apple touch icon | `brand/web/apple-touch-icon.png` (180 px, full-bleed brass) | `app/apple-icon.png` |
| PWA | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`; manifest name "Satchel", description "An NFT that is a wallet on every chain.", colours `#17100c` | `public/` + `app/manifest.ts` (same values) |
| Link preview | `brand/web/og-image.png` (1200 × 630) | `app/opengraph-image.png` + `app/twitter-image.png` (+ `alt.txt`: "Satchel: an NFT that is a wallet"); `twitter:card` `summary_large_image` |
| Header lockups | `brand/logo/satchel-lockup-on-dark.svg` / `-on-light.svg` | `public/brand/`; swapped by theme. Equivalent: one inline SVG whose wordmark is `currentColor` = `ink` (the two files differ only there) |
| Loading and empty mark | `satchel-glyph-brass.svg` (Night) / `satchel-glyph-leather.svg` (Day) | `public/brand/`; 32–56 px; may pulse in opacity (`--pulse`), never rotate |
| `theme-color`, `color-scheme` | head snippet | `viewport.themeColor` per media query; `color-scheme: dark light` in CSS |

Logo rules in the product: the mark never sits on a brass ground (so never on the card band or a brass button), is never recoloured, rotated or given a glow or shadow, and is never drawn as a line icon. Mark minimum 16 px (small cut at ≤ 32 px); lockup minimum 112 px wide; wordmark alone minimum 64 px.

Tab titles (brand): "{page} · Satchel": "Satchel #7 · Satchel", "Send Bitcoin · Satchel", "Fund Satchel #7 · Satchel", "Market · Satchel", "Contract · Satchel". While a signature is pending in a background tab: "(1) Signing… · Satchel".

## Screens & states

### Role × status matrix (what each viewer can do; kb/90 §5.10)
| Status (pill) | Derived from (kb/90 §5.14 `satchel(id)`) | Owner | Connected visitor | Not connected |
|---|---|---|---|---|
| **Active** | `listing == None` | Send · Fund · Transfer · Sell. "Before you list" shows the quiet period: "You can list in {n} blocks (~{t})" | Fund | Fund · Connect wallet |
| **Signing** (overlay on Active) | a `pending` record younger than 250 blocks, or a local in-flight intent | Send: a new one replaces the same nonce or inputs (kb/90 §8.7). Fund. Transfer stays allowed, with the D-08 soft guard on Review. Sell shows the quiet period | Fund; the pill says Signing | same |
| **Listed** (= signing paused) | `listing` is set | **Delist** (the screen's brass) · Fund. Send and Transfer are disabled with "Signing is paused while listed." | **Buy**, enabled only when the browser verdict is `clean` or `empty` | **Connect wallet to buy** |
| **Needs attention** (owner only, client-side) | a local intent in `signed_not_sent`, or a `signed` record with no matching chain tx (kb/90 §8.6 resume) | **Broadcast again** on the SignedNotSentCard; a new send on that chain shows the unsent-intent guard | — (visitors see the clean-history verdict instead) | — |
| **Sold** (flow end state, not stored) | a `sold` event | Seller: the Sold receipt | Buyer: the reverse handoff, then the owner view | — |

The quiet period comes from `config().cooldown_blocks` (250) and `satchel(id).listable_at`; the UI never hard-codes it. There is no post-listing wait of any kind (D-05 rev 2). SSR renders the contract-derived pill (Active, Signing or Listed); the client may upgrade it to Needs attention for the owner after hydration.

### Judge-first view: `/s/1` with no wallet (P1)
| Need | R3 design | References |
|---|---|---|
| "This NFT is a wallet" in 3 s | From the top:<br>1. Meta chips "Token #1" · "NEP-171" · "NEAR testnet", with ⋯.<br>2. The `title` H1 "This NFT is a wallet." and the sub "Whoever owns Satchel #1 controls the coins at the Bitcoin and Ethereum addresses below."<br>3. The `lg` **brand card**: band "Satchel #1" + Active; body "≈ $1,148.72 · at mainnet prices" (or "2 chains") and the chips "BTC 0.0123" · "ETH 0.0500". **No stitch** for visitors.<br>4. The OwnerPill "Owned by alice.testnet · 4 signatures".<br>5. NavTabs.<br>6. The BTC ChainRow with **mempool.space**, above the fold (budget below).<br>All of it is in the blocking server HTML | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) |
| AI judges (HTML readers) | `<title>`: "Satchel #1 · Satchel" (brand pattern).<br>Meta description (and `og:description`): "Satchel #1 is an NFT on NEAR testnet. It controls Bitcoin testnet4 address {btc} and Ethereum Sepolia address {evm} through NEAR Chain Signatures. Transfer the NFT and the new owner controls the funds."<br>The **FactsGrid** `<dl>`:<br>• Contract (NearBlocks) · Token · Owner · Status;<br>• Signatures (count, with the last one);<br>• Bitcoin testnet4 and Ethereum Sepolia, each with its **full address as visible text** and its balance;<br>• Contract keys "none since birth" (→ `/contract`);<br>• the data-source line.<br>The card's `<figure>` text (name, status, total, balances) is also real text. No Suspense boundary sits above any of it (kb/90 §8.1) | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Glow collectible detail](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e) |
| How it works | Three steps: a vertical stepper on mobile, three `line`-divided columns with Bricolage numerals 1 · 2 · 3 on desktop (no mono: mono is for addresses). Copy in `how.*` | [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479), [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84) |
| Proof | **ProofGrid** cells:<br>• "Last send 0.0100 BTC · {t} · mempool.space";<br>• "Last transfer alice.testnet → bob.testnet";<br>• "Contract locked · no access keys" | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) |
| Verify | **VerifyDisclosure** "Verify these addresses", collapsed:<br>• the contract;<br>• "Keys: none since birth" (birth tx);<br>• "Code hash: matches the published build";<br>• per chain, the path `satchel/1/btc`, the derived address and an explorer link;<br>• the guarantee sentence;<br>• a copyable verify command (→ `/contract`).<br>It only adds detail: every judge fact is also visible outside it | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) |
| Fiat | The card total only, always with "at mainnet prices" (UX-1); never in the Facts grid | — |
| Link preview | The site-wide brand `og-image.png` (B-09); no per-Satchel image | — |

**Fold budget** at 390 × 844 in iOS Safari (about 660 px visible); re-measure on Day 2 (SAT-210):

| Element | Height (px) | Running total |
|---|---:|---:|
| Top bar | 56 | 56 |
| gap + meta chips | 12 + 28 | 96 |
| gap + H1 (`title` 24/28, one line) | 12 + 28 | 136 |
| gap + sub (2 lines, 15/22) | 8 + 44 | 188 |
| gap + card `lg` 358 × 226 | 16 + 226 | 430 |
| gap + OwnerPill | 12 + 28 | 470 |
| gap + NavTabs | 8 + 44 | 522 |
| BTC ChainRow (72) | 72 | **594**: the row and its explorer link are visible |
| ETH ChainRow | 72 | 666 (at the fold) |

The owner view has no sub (−52) but adds the ActionRow (+76), so it lands at about the same point.

### Home `/` (P1)
| State | Condition | Shows | References |
|---|---|---|---|
| Landing | not connected | 1. **Hero** (left column on desktop): the eyebrow "NEAR Chain Signatures · testnet" (`label`, `ink-muted`); the `display` H1 (UX-32: "One strap, every chain." by default); the `lead` sub "Satchel is an NFT that is a wallet. Each one controls its own Bitcoin and Ethereum addresses; transfer the NFT and you hand over the wallet."; **See Satchel #1** (brass) and **Connect wallet** (secondary); the note "Testnet only. Coins here have no value."<br>2. **The live card #1** (`lg`, right column on desktop) with "Read 12 s ago" under it. No stitch, no glow.<br>3. How it works (`section` H2).<br>4. ProofGrid.<br>5. FAQ (P2).<br>6. Footer.<br>Every word is in the server HTML at first paint; nothing animates on entry | [Phantom hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Coinbase Wallet site](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b) |
| Loading | connected, fetching `nft_tokens_for_owner` | Static card-shaped skeletons: `surface-raised` on `surface`, `radius-card`, no pulse | [Locals](https://mobbin.com/screens/03fd9087-3149-4a8b-af6a-9dd82c88b01a) |
| Empty | owns 0 | **Centred** (the one centred layout): the brand glyph at 56 px (brass on Night, leather on Day), "You don't own a Satchel yet", one line, **Mint a Satchel** (brass) and a text link "See Satchel #1" | [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) |
| One Satchel | owns 1 | The `lg` card (stitched: you own it). The header reads "My Satchels" + **Mint** (secondary) | — |
| Stack (below 768, polish A-04) | owns 2 or more | Cards in ascending number, top to bottom. Each earlier card collapses to its **brass band** (name + status pill, ≈ 63 px at 358 wide); the newest card shows in full. Each band is a link to `/s/[id]` named "Satchel #3, Listed". No expand animation. Without A-04: one column of full cards | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) |
| Grid | owns 1 or more; from 1024 | `md` cards: 2 columns from 1024, 3 from 1280, gap `space-8`, left-aligned. Under each card: "Read {t} ago" (`body-sm`, `ink-muted`) and a ⋯ menu on desktop (Send · Fund · Copy addresses · View activity). A "New" pill for 24 h after a mint, buy or receive (P2, cut by default) | [Family wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec), [Family web row menu](https://mobbin.com/screens/0d16504e-cac4-4855-8290-415f3c1f110e) |
| Error | RPC failed after retries | InlineAlert (E11) with **Try again** | — |

### Satchel page layout `/s/[id]` (P1)
**Order below 1024 (390):**
1. Top bar, plus the RoleStrip (dev/rc; removed, D-52) and the PendingPill (while an intent is open).
2. Meta chips + ⋯ (overflow: Copy token ID (value previewed) · Contract facts → `/contract` · View on NearBlocks · Copy link · Share on X).
3. H1. Visitor: `title` "This NFT is a wallet." + the sub. Owner: `title` "Satchel #1", no sub.
4. **SatchelCard `lg`** (stitched for the owner).
5. Owner only: the **ActionRow**: Send · Fund · Transfer · Sell, which becomes **Delist** (brass) while listed.
6. **OwnerPill:** "Owned by alice.testnet · 4 signatures" (owner: "Owned by you · 4 signatures").
7. **FreezeBanner** while listed (on every tab). **SignedNotSentCard** for the owner while an intent is signed but not sent.
8. NavTabs: Wallet · Activity · Sell or Buy.
9. The tab content.
10. Visitor on a listed Satchel: the **StickyBuyBar** (pinned).

**From 1024** (beside the left nav; `minmax(320px, 400px) | 1fr`, gap `space-8`):
- *Left column, sticky (top `space-12`):* the card `lg` (≤ 400) → the owner's ActionRow, or for a visitor on a listed Satchel the BuyBlock ("Buy for" price → GateLine → **Buy**).
- *Right column:* meta chips + ⋯ → H1 (+ sub) → OwnerPill → **StatsStrip** "Status · Signatures · Listed for · Minted" → FreezeBanner → NavTabs → content.

| State | Condition | Shows |
|---|---|---|
| SSR default | the token exists | The order above, blocking-rendered |
| Not found | `nft_token` is null or the id isn't an integer | HTTP 404 with a centred Empty: "Satchel #{id} doesn't exist" / **Mint a Satchel** · **Go to My Satchels** |
| RPC down at SSR | NEAR RPC failed | Addresses still render (derived offline) with the last cached snapshot, "read {t} ago". `banner.rpc-down` as one line |
| Ownership changed while open | the 15 s poll sees a new `owner_id` | Banner `page.owner-changed`; the stitch disappears. A flow already signing continues; if it reaches the contract it fails `ERR_NOT_OWNER` (E3) |
| Pending signature (this browser) | an in-flight intent in `satchel:pending:v1` | PendingPill / PendingCard: "Sending 0.0100 BTC · 0:42". Tapping it reopens the tracker |
| Pending signature (elsewhere) | a `pending` record < 250 blocks old, no local intent | The pill says **Signing**, plus the line `page.pending-elsewhere` |
| Signed, not sent | a record is `signed` and no chain tx matches (kb/90 §8.6 resume) | The pill says **Needs attention** (owner); the **SignedNotSentCard** at the top of the Wallet tab, with **Broadcast again** (or the EVM nonce-gap note) |
| Listed | `listing` is set | The Listed pill, the FreezeBanner, the ListedPanel (owner) or the BuyBlock (visitor) |

### Wallet tab (P1; SOL row P2)
| Element state | Shows | References |
|---|---|---|
| Row loading | The chain label and address render immediately (they are derived); the balance is a 64 × 16 static skeleton | — |
| Row loaded | **ChainRow** (72 px, flat on `ground`, `line` hairlines):<br>• line 1: the 32 px chain mark in the chain colour on a `surface-raised` circle (the brand's "accent of that chain's balance row"), the network label (`label`, `ink`), the balance on the right (`label`, tabular; the ticker in `ink-muted`);<br>• line 2: the address (`address` 13, truncated below 1024, **full and grouped from 1024**), **Copy** (✓ for 2 s), **QR**, and the explorer link on the right ("mempool.space" + `arrow-up-right`, `link`) | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Cash App copied](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5) |
| One chain at zero | "0 BTC" with a **Fund** text button | — |
| **Every chain at zero** | A **FundCard** above the rows (`surface` panel, `radius-md`): "Fund this Satchel" (`heading`), the `wallet.fundcard` line, **Copy Bitcoin address** (the screen's brass), a QR icon button and "Get testnet BTC" | [Rainbow receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) |
| Incoming | "+0.0010 BTC incoming · unconfirmed" with the `hourglass` icon in `frozen`. BTC from mempool stats; EVM and SOL from a balance delta | — |
| Stale (older than 60 s) or error | "Balance unavailable" + **Retry**; the address stays usable; the card's chip shows "BTC —" and the total falls back to "{n} chains" | — |
| Footer | `wallet.fresh` "Read from each chain {relative}." · **Fund this Satchel** (secondary; visitors) · FactsGrid · VerifyDisclosure · HowItWorks (visitors) | [Family "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) |

**ActionRow** (owner, all sizes): four 48 px round buttons (Send `arrow-up` · Fund `arrow-down` · Transfer `arrow-left-right` · Sell `tag`), `surface-raised` with `ink` icons and `body-sm` labels. A disabled button stays visible (`aria-disabled`) and gets a reason line under the row ([Wise](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b)):
- every chain at zero → Send disabled: "This Satchel has no BTC or ETH yet.";
- listed → Send and Transfer disabled: "Signing is paused while listed.", and Sell becomes **Delist** (`undo-2`), the screen's one brass circle.

### Activity tab (P1)
| State | Shows | References |
|---|---|---|
| Loading | 4 static skeleton rows | — |
| Empty | "No activity yet" / "Sends, transfers and sales show up here. Deposits show on each chain's explorer." / **Fund this Satchel** (secondary) | — |
| Loaded | An **In progress** group pinned on top (client: local intents, Signing, In mempool, **Signed, not sent** with an inline **Broadcast now**). Then day groups (`label` `ink-muted` headers "Today" · "Nov 10") of TimelineRows, newest first. SSR renders the first page of NEAR events (FastNEAR tx API) | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) |
| Row expanded | Inline detail: Date · Status · Network · Type · Amount · Fee · From/To (with Copy). Sends add the final tracker. **Named** explorer links: "View on mempool.space", "View on Etherscan", "View on NearBlocks" | [Phantom detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44), [Wise complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) |
| Paging | The SSR page ends with a **Show older** link (`?before=`), so a no-JS judge can page. Footer: "Missing something? See every event on NearBlocks" | [Trust Wallet footer](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| Partial | "NEAR history is unavailable right now. Check NearBlocks" | — |
| Error | InlineAlert with **Try again** | — |

### Receive / Fund `/s/[id]/receive` (P1)
| Element | Spec | References |
|---|---|---|
| Shell | The FlowShell titled "Fund Satchel #{id}" over the Satchel page: a sheet below 768 (✕ and a pinned bar), a 480 px dialog from 768 | [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) |
| Chain switch | **ChainSelect** at the top (Bitcoin · Ethereum; Solana in P2), preselected from `?chain=`. Visible segments beat a dropdown for 2–3 fixed chains | — |
| QR panel | A `surface` panel (`radius-card`) **headed by the card's brass band** (48 px; "Satchel #{id}" in `on-brand` + the network in a band pill), UX-22. In its body: a **QrPlate** (white, `radius-md`, 240 px on mobile and 220 on desktop, modules `on-brand` `#2B1D15` (16.29:1), ECC M, quiet zone ≥ 4 modules, the plain address, no logo; in Day a 1 px `line-strong` edge). Under the plate: "This Satchel's Bitcoin testnet4 address" (`body-sm`, `ink-muted`) and the **full grouped address**, with the first two groups and the last group in `ink` 600 | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247) |
| Actions | **Copy address** (brass, pinned on mobile; toast "Bitcoin address copied"). **Share** (secondary), only where `navigator.share` exists | [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) |
| Info rows | Icon-led, `body-sm`:<br>• `triangle-alert` (neutral) `fund.only.*` (this network only);<br>• `clock` `fund.time.*` (time to confirm);<br>• `info` "Anyone can fund a Satchel. Only its owner can send from it.";<br>• "Get testnet BTC" (link) | [Coinbase web](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf), [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868) |
| **Incoming** (client island, R2) | "Incoming" (`label`, `ink-muted`), then a sequence: `loader-circle` "Waiting for a deposit…" → `hourglass` (`frozen`) "+0.0010 BTC · in mempool" → `circle-check` (`success`) "Received 0.0010 BTC". BTC uses mempool `mempool_stats` then `chain_stats`; EVM and SOL use the 15 s balance poll. It never carries a judge fact | [Binance web](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) |

The addresses are derived, so there is no loading state for them; the SSR page carries them.

### Send `/s/[id]/send` (P1)
| Step / state | Shows | References |
|---|---|---|
| Guard: not connected | "Connect the owner's wallet" + **Connect wallet** | — |
| Guard: not owner | "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." | — |
| Guard: listed | "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." + **Go to Sell** | — |
| Guard: zero balance | "This Satchel has no {TICKER} yet." + **Fund this Satchel** | — |
| Guard: an unsent intent exists (kb/90 §8.7) | Shows *that* intent's tracker in its `signed_not_sent` state, with the InlineAlert "You have an unsent signed transaction. Broadcast it or replace it." and **Broadcast** · **Replace**. Replace keeps the same nonce or inputs | [Phantom funds in transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) |
| **Form** (step 1 of 3) | Title "Send Bitcoin" (tab title "Send Bitcoin · Satchel"). **ChainSelect** (segments with balances: "BTC 0.0123 │ ETH 0.0500") → **AmountInput** (`balance-hero`, centred, ticker suffix, `inputmode="decimal"`, no keypad) → "Available 0.0123 BTC" + **Max** directly under it ("Max leaves room for the network fee." once used) → **RecipientInput** → the fee line "Network fee ~282 sats · paid by this Satchel" (or "Estimating fee…" / **Retry**) → the pinned **Review** (brass), disabled until valid | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Uniswap](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df) |
| **Review** (step 2 of 3) | The **ReviewCard** (component below). The BTC candidate is built and its txid collision-checked while Review is shown (kb/90 §8.2). The pinned CTA reads **Send 0.0100 BTC**, with the helper under it: "Your wallet will ask you to approve a request to satchel.<team>.testnet." | [Coinbase Wallet review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636), [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) |
| Approve (in place) | The Review stays, with its inputs locked. The CTA becomes "Preparing…" (`preparing`), then "Approve in your wallet…" (`awaiting_wallet`), with "Check the Meteor or Intear window." under it. At 60 s: `sign.wallet.slow` | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Chime](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) |
| **Tracker** (step 3 of 3) | **SigningProgress**, from the moment the watcher sees the record (`signing`). The shell's ✕ becomes **Minimize** | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) |
| Sent / Confirmed | The tracker after broadcast: the header "Sent 0.0100 BTC · to tb1q…y8sd"; rows 1–3 ✓ with times and links; row 4 pending with the per-chain note; "You can close this tab."; **Done** (brass) and View activity. The exit toast reads "Sent 0.0100 BTC · in mempool" | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) |
| Errors | Error map; flow errors render on the failing row | [Glow failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218) |

### Transfer `/s/[id]/transfer` (P1)
| Step / state | Shows | References |
|---|---|---|
| Guards | Not owner (E3). Listed: `xfer.blocked.listed` "Delist Satchel #{id} before transferring it." (`ERR_LISTED`) | — |
| **Recipient** (step 1 of 2) | **AccountInput** "To (NEAR account)", with a `view_account` existence check (debounced 400 ms). Once found, a RecipientCard appears: AccountAvatar · "bob.testnet" · "Account found · owns {n} Satchels" (NEP-181 `nft_supply_for_owner`).<br>Blocked, inline under the field:<br>• a missing account;<br>• self;<br>• the Satchel contract (`xfer.err.contract`);<br>• the MPC account (`xfer.err.mpc`), R-18.<br>An implicit 64-hex account is accepted with a note. The pinned CTA is **Review** | [Uniswap transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) |
| **Review** (step 2 of 2) | The card `md` as the hero (stitched: you own it until it moves), with an attached stub "To bob.testnet · Account found". Then three consequence rows:<br>• (bob's avatar) "bob.testnet will control everything in this Satchel: 0.0123 BTC · 0.0500 ETH. Its addresses go with it, so anything sent to them later is bob.testnet's too.";<br>• (your avatar) "Only the new owner will be able to sign. You won't be able to send from it.";<br>• (`activity` icon) "The signature history stays with the Satchel." (E-36).<br>Below: the **D-08 soft guard** when an intent is in flight (a neutral banner that doesn't disable the CTA), then "This can't be undone. Only bob.testnet can transfer it back.", then **Transfer to bob.testnet** (brass) | [Posh](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a), [Revolut Business](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd), [WhatsApp](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b), [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) |
| In flight | The card rises into the lifted pose (`shadow-overlay`). The CTA reads "Approve in your wallet…", then "Transferring…". A 3-step subset shows under it: Approved → Transferring on NEAR → Transferred | — |
| Success | The **HandoffAnimation** (the signature moment, only after the final outcome): the card slides to bob, lands under his avatar and **the stitch appears on it** (it marks the new owner, named beside it). End frame:<br>• the "Transferred" pill (`success`);<br>• the two avatars overlap;<br>• the sentence "bob.testnet now controls 0.0123 BTC and 0.0500 ETH.";<br>• a receipt: From alice.testnet · To bob.testnet · NEAR transaction 7Gh…k2 · 14:02 UTC;<br>• **View Satchel #1** · **Done** (brass);<br>• toast "Transferred Satchel #1 to bob.testnet" | [Family collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) |
| Errors | Rejected → back on Review with "You cancelled in your wallet. Nothing changed." · `ERR_LISTED` · `ERR_BAD_RECEIVER` · `ERR_NOT_OWNER` · RPC | — |

After the handoff, alice's Satchel page shows the card **without** the stitch (she no longer owns it).

### Sale tab, owner "Sell" (P2)
The Sale tab (`/s/[id]/sale`) stays a tab. For the owner it shows the listing status; **List for sale…** (brass) opens the **Sell flow** in the FlowShell at `/s/[id]/sale?list` (no new route; kb/90 §8.1 unchanged).

| State | Shows | References |
|---|---|---|
| Tab, not listed (owner) | "Not listed." + the quiet-period line ("You can list in {n} blocks (~{t})" or "Ready to list") + **List for sale…** (brass) | — |
| **Before you list** (Sell flow, Active) | **ListChecklist** (component below):<br>• *required:* the quiet period, and USDC registration when the currency is USDC;<br>• *advisory:* past signatures.<br>Then **ListingForm**:<br>• "Price", a currency segmented control (USDC \| NEAR; NEAR only if `usdc: None`, H-26) and a `title`-size input;<br>• the helper "Buyer gets 0.0123 BTC and 0.0500 ETH.";<br>• rows: Price · "Satchel fee: none" · "Listing deposit 0.01 NEAR · unused part refunded" · a bold **You receive 250.00 USDC** · "Paid to alice.testnet in the same transaction as the sale.";<br>• "While it's listed" consequences;<br>• the pinned **List for 250.00 USDC** (brass), disabled until the required rows pass | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273), [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0), [Wealthfront](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b) |
| Listing | The CTA narrates: "Approve in your wallet…", then "Listing…". A wallet rejection shows inline under it: "You cancelled in your wallet. Nothing changed." **Try again** | — |
| **Listed** | The flow closes. The pill reads **Listed**; toast "Listed for 250.00 USDC. Signing paused." The tab's **ListedPanel** reads "Listed for 250.00 USDC · Listing #7" with **Delist** (secondary) and `sell.delist.note`. The FreezeBanner (owner) shows on every tab. `sell.reprice`: "To change the price, delist and list again." **There is no countdown** | [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [StockX vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) |
| Delisting | **No dialog.** The wallet approval is the confirmation, and the CTA narrates "Approve in your wallet…" → "Delisting…". Toast "Delisted. Signing resumed." | [OpenSea canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) |
| **Sold** (seller) | The card shows the **Sold** pill and loses its stitch. The sentence hero reads "You sold Satchel #3 to carol.testnet for 250.00 USDC." / "250.00 USDC arrived in your NEAR account." Receipt rows: Price · Buyer · Paid · Transaction. If the `payout` event says `ok:false`: "250.00 USDC is waiting for you." + **Withdraw** (`withdraw_proceeds`) | [Cash App "You sold"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75), [Revolut order executed](https://mobbin.com/screens/26da4623-eb14-46ff-91fc-9b70e147a2a4) |
| Errors | `ERR_QUIET_PERIOD` → `sell.err.quiet` · `ERR_ALREADY_LISTED` · RPC | — |

### Sale tab, visitor "Buy" (P2)
| State | Shows | References |
|---|---|---|
| Not listed | "Satchel #{id} isn't for sale." The tab is hidden in the nav; the route still answers | — |
| SSR (no JS) | The BuyBlock ("Buy for 250.00 USDC" · "Listing #7 · listed 4 min ago by alice.testnet"), You get, and the CleanHistory **server hint** in `ink-muted`: "Server check 12 s ago: clean" and "Waiting for your browser's check". **Buy** disabled. AI judges read the verdict here (kb/90 §7.5) | [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) |
| Checking | Rows render from `sig_records` at once and each resolves on its own (rows say "Checking…"). The verdict reads "Checking 4 past signatures…". The GateLine reads "Checking history…" (`loader-circle`, static) and Buy is disabled | [CRED verification](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b), [ANZ Plus](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a) |
| Clean / empty | The verdict sentence with `shield-check` (`success`). The GateLine reads "Clean history · checked 8 s ago". **Buy for 250.00 USDC** (brass) is enabled | [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) |
| Settling / blocked / unknown / unsafe | The verdict sentence and a banner at the top of the Buy panel (`frozen`, `danger` or neutral + warning, per kb/81 R3 §State mapping), with the specific item and **See the signature**. Buy is disabled, and the reason is linked by `aria-describedby`. **No override.** Unsafe disables Buy with no recovery copy aimed at the buyer | [Coinbase web banner](https://mobbin.com/screens/7fa8f944-702b-4488-8de9-e0423e91c7a7), [Chime](https://mobbin.com/screens/55c01b3a-e6a4-4f34-be27-e94ca0091a21) |
| Payment line | "Paid in USDC." (fixed by the listing, D-14; **no currency toggle**). Connected: "You have 312.40 USDC." Short: "You have 120.00 USDC. You need 250.00 USDC." + "Get testnet USDC" | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| How buying works | A 3-step strip: "You pay → One transaction moves Satchel #3 to you and pays alice.testnet → You control the coins" | [eBay](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61) |
| Not connected | The CTA reads **Connect wallet to buy** (brass) and stays enabled; it opens the wallet selector | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) |
| Buying | The button changes in place: "Re-checking history…" (the synchronous browser re-check, kb/90 §7.5), then "Approve in your wallet…", then "Buying…". If the verdict changes during the re-check, the CTA disables and the new verdict is announced | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) |
| **Listing changed** | Before the call, the client re-reads `satchel(id)`. If `listing.id` or `sig_count` differs, an inline interstitial replaces the BuyBlock: "This listing changed. Listing #7 at 250.00 USDC was replaced by listing #8 at 240.00 USDC. Clean history runs again." **Review new listing** · Cancel. Delisted: "alice.testnet delisted Satchel #3." A late `ERR_LISTING_CHANGED` maps to the same copy | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| Refunded (USDC) | The used amount is `"0"` (kb/90 §5.12): "Not bought. Your 250.00 USDC was refunded." | — |
| **Success** | The reverse handoff (seller → you): the card arrives and **the stitch appears** (you own it now). End frame: the card large, "Satchel #3 is yours.", "You now control 0.0123 BTC and 0.0500 ETH.", a receipt (Price · Seller · Listing #7 · Transaction 8Fx…2k), **Open your Satchel** (brass); toast "You bought Satchel #3" | [Apple Wallet "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) |
| Below 768 | The **StickyBuyBar** (pinned) shows "250.00 USDC" + **Buy**, with the GateLine as its footnote ("Clean history · checked 8 s ago", or the reason). The in-panel Buy button is hidden below 1024, so there is never a second one | [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) |
| From 1024 | The BuyBlock and GateLine in the left sticky column; You get, the CleanHistory report, Payment, How buying works and the disclosure on the right | — |

### Market `/market` (P2)
| State | Shows | References |
|---|---|---|
| Loading | 6 static MarketCard skeletons | — |
| Empty | Centred: "Nothing is listed right now." + **Mint a Satchel** (brass) | [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) |
| Loaded | The toolbar reads "{n} listed" with Sort (Newest · Price); filter chips (Buyable now · Has BTC · Has ETH) are polish (cut-4). The grid has 1 column below 1024, 2 from 1024 and 3 from 1280, with **buyable listings first and blocked ones last, with their reason** (demo #4 is the honest blocked example). Footer verdicts come from the SSR **hint**, labelled with its real age; only the Buy tab's browser check enables Buy | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [OpenSea grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297) |
| Error | "Couldn't load listings." + **Try again** | — |

### Mint `/mint` (P1)
The Mint flow opens in the FlowShell over Home (landing or My Satchels).

| State | Shows | References |
|---|---|---|
| Ready / not connected | The **mint preview** is the hero: the brand card with the band "New Satchel", the body "2 chains" (`balance-hero` step) · "Bitcoin and Ethereum addresses", chips "BTC" · "ETH" (no balances), and **the stitch** (it will be yours). Under it, the **MintBar**: "You get" Bitcoin and Ethereum addresses │ "Deposit" 0.02 NEAR · unused part refunded │ **Mint a Satchel** (brass, pinned below 768). Not connected: the same layout with **Connect wallet to mint**. A "What you get" checklist follows: "Its own Bitcoin testnet4 address" · "Its own Ethereum Sepolia address" · "Only its owner can move the coins" · "A public record of every signature it makes" | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec), [Portrait](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410) |
| Minting | The CTA narrates: "Approve in your wallet…", then "Minting…" | [Uniswap buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) |
| Success | Plain feedback, no reveal: the band name swaps to "Satchel #8" (160 ms) and the body takes the token's leather. Then "Satchel #8 is yours." (`title`) and "Minted in 8Fx…2k". **Fund this Satchel** (brass) · **Open Satchel #8**. Toast "Minted Satchel #8"; Home shows "New" (P2) | [Apple Wallet adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) |
| Errors | Not enough NEAR (E6) · "You cancelled in your wallet. Nothing was minted." · RPC | — |

### Contract facts `/contract` (P1)
A blocking SSR page (kb/90 §8.1). Its layout and copy depend on the contract role:

| Role | Shows |
|---|---|
| `rc` / `final` | `title` "Born without a key" + the sub "satchel.<team>.testnet was created, deployed, initialized and minted in one transaction with no AddKey. Only `sign_for` can get signatures for its Satchels."<br>A FactsGrid (sentence-case labels):<br>• Contract · Role;<br>• Access keys: "Account is locked (no access keys)";<br>• Birth tx (+ block A);<br>• Signer txs 0 · Oldest tx = the birth;<br>• Code hash (SHA-256) vs Expected (`circle-check` "Matches");<br>• MPC version · Config.<br>Then a "Verify it yourself" block of copy-paste commands (`address` style, each with Copy). Proofs come from FastNEAR (kb/90 §5.16) |
| `dev` | The RoleStrip (removed, D-52), and the `title` "Development contract". It says plainly that this account has keys and that the lock and code-hash checks are skipped |

References: [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Glow facts](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e), [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea).

### Wireframes
Phone frames are 390 px (46 ASCII columns); desktop frames are ≥ 1024 px. The notes after a frame name the token or component. ASCII can't show the brass gradient, the leather tint or the shadow, so they are labelled. Legend:

| Glyph | Means | Glyph | Means |
|---|---|---|---|
| `▣ Satchel` | the lockup (36 px) | `▓` | the brass band (`brand-bright` → `brand` → `brand-deep`, 135°) |
| `┌┄┐` `┆` inside a card | **the saddle stitch** (owner, mint preview, receiving card) | `[[ Label ]]` | the screen's one **brass** primary |
| `[ Label ]` | secondary (outline) | `Label ↗` | external link (`arrow-up-right`) |
| `⊙` `●` `⌗` `⋈` `!` in a pill | Active (`lock-open`) · Signing (pulsing dot) · Listed (`tag`) · Sold (`handshake`) · Needs attention (`triangle-alert`) | `[• BTC 0.0123]` | chain chip: 8 px chain dot + ticker + native amount |
| `✓` `✕` `◷` `◌` `ⓘ` `❄` | `circle-check` / `shield-check` · `circle-x` · `hourglass` or `clock` · `loader-circle` (static) · `info` · `snowflake` | `(a)` `(b)` | neutral AccountAvatars (initial on `surface-raised`) |
| `(₿)` `(Ξ)` | chain marks in the chain colour | `▣▒` | the token swatch (brass strip over the token's leather) |
| `░` | the `scrim` over the inert page behind a flow | `(↑) (↓) (⇄) (⌗)` | 48 px round actions; `((↶))` = the brass Delist circle |

**W0. The Satchel card (B-04).** W0a is the in-app card as its owner sees it (`lg`, 400 × 252 on desktop, `min(100%, 400px)` on phones); W0b is the NFT media at `/api/card/[id].svg`.
```
╭──────────────────────────────────────────╮
│┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ stitch (owner only): inset 8 px, 1.5 px, dash 6/5, `stitch`
│┆▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓┆│ brass band, 28 % of the height, 135° brass gradient; name `heading` 20 at 650
│┆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆│ in `on-brand`; the pill on `band-pill` with a `brand-bright` word
│┆                                        ┆│ body: `surface` (Night: `satchel-body`, the token's leather)
│┆ ≈ $1,148.72                            ┆│ `balance-hero` at its 36/40 step, `ink`, tabular (UX-1)
│┆ at mainnet prices                      ┆│ `caption` `ink-muted`; without prices the hero reads "2 chains"
│┆                                        ┆│
│┆ [• BTC 0.0123]  [• ETH 0.0500]         ┆│ chain chips: `radius-sm`, `surface-raised`, 8 px chain dot, `caption` tabular `ink`
│└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ 1.586:1, `radius-card` 22, `shadow-card`; native amounts only
╰──────────────────────────────────────────╯
```
```
╭──────────────────────────────────────────╮
│▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓│ the same band; the pill comes from contract state (Active · Signing · Listed)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│                                          │ Night body with the token's leather (`satchel-body`)
│ 4 signatures                             │ `sig_count` where the in-app total sits (D-23)
│ recorded on NEAR testnet                 │ `caption` `ink-muted`
│                                          │
│ [• BTC]  [• ETH]                         │ chain marks without balances; no stitch, no owner
╰──────────────────────────────────────────╯
```
Sizes: **`lg`** ≤ 400 px wide (358 at 390, 288 at 320; band 63 / 51 px); **`md`** fills a grid cell (≈ 300–360 px); **`xs`** 40 × 25 mini card (brass strip over the token's leather) in rows; **inline** 20 × 13 in running text. There is no `sm`. The stitch and the band pill never appear below `md`.

**W1. `/s/1`, visitor, no wallet (the judge view, 390)**
```
┌──────────────────────────────────────────────┐
│ ▣ Satchel            [ Connect wallet ]  ≡   │ top bar 56: lockup 36 px, secondary button, menu
├──────────────────────────────────────────────┤
│ [Token #1] [NEP-171] [NEAR testnet]      ⋯   │ meta chips: `radius-sm`, `surface-raised`, `body-sm`
│ This NFT is a wallet.                        │ `title` 24/28 (28/32 from 480)
│ Whoever owns Satchel #1 controls the coins   │ `body` `ink-muted` (visitors only)
│ at the Bitcoin and Ethereum addresses        │
│ below.                                       │
│ ╭──────────────────────────────────────────╮ │ card `lg` 358 × 226; visitor: no stitch
│ │▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓│ │ brass band + band pill
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│ │ ≈ $1,148.72                              │ │ total (UX-1), in the SSR HTML
│ │ at mainnet prices                        │ │
│ │ [• BTC 0.0123]  [• ETH 0.0500]           │ │ native chain chips
│ ╰──────────────────────────────────────────╯ │
│ (a) Owned by alice.testnet · 4 signatures    │ OwnerPill: neutral avatar + `body-sm`
│  Wallet    Activity                          │ NavTabs = links (`aria-current`)
│  ━━━━━━                                      │ 2 px `brand-line` indicator
│ (₿) Bitcoin testnet4            0.0123 BTC   │ ChainRow 72: chain mark · `label` · balance
│     tb1qaa…y8sd  [⧉] [▦]   mempool.space ↗   │ `address` 13; Copy, QR; explorer `link`
│ (Ξ) Ethereum Sepolia            0.0500 ETH   │ bottom edge of the BTC row ≈ 594 px
│     0x53f9…1C2A  [⧉] [▦]       Etherscan ↗   │
│ Read from each chain 12 s ago.               │ `body-sm` `ink-muted`
│ [            Fund this Satchel            ]  │ secondary (outline)
│ · · · · · · · · · · fold · · · · · · · · ·   │
│ Facts                                        │ `label` `ink-muted`; `<dl>` rows
│ Owner              alice.testnet             │
│ Bitcoin testnet4                             │ the full address as visible text
│ tb1q aanv 9x7k m2rd 4hzc 0a8f 7xum d8z6 3kqe │ `address`; ends in `ink` 600
│ y8sd 4w             0.0123 BTC · mempool ↗   │
│ Contract keys      none since birth ↗        │ → /contract
│ How it works                                 │ `heading`
│ 1  Mint a Satchel                            │ Bricolage numerals; a real sequence
│ 2  Only the owner can sign                   │
│ 3  Transfer the NFT, transfer the wallet     │
│ ▸ Verify these addresses                     │ collapsed; extra detail only
└──────────────────────────────────────────────┘
```
Facts, How it works and Verify sit below the fold. Every fact is in the blocking server HTML, the card's total and balances included. Full addresses appear as text in the Facts block, not only in an `aria-label`.

**W2. `/s/[id]`, owner, while a send is signing (390)**
```
┌──────────────────────────────────────────────┐
│ ▣ Satchel                          (a)   ≡   │ top bar: avatar button = account menu
│       ( ● Sending 0.0100 BTC · 0:42 )        │ PendingPill 36: `frozen` pulsing dot
├──────────────────────────────────────────────┤
│ [Token #1] [NEP-171] [NEAR testnet]      ⋯   │
│ Satchel #1                                   │ `title` (owner view: no visitor sub)
│ ╭──────────────────────────────────────────╮ │
│ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ │ stitched: you own it
│ │┆▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓ (● Signing) ▓▓┆│ │ Signing: pulsing `frozen` dot + word
│ │┆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆│ │
│ │┆ ≈ $1,148.72                            ┆│ │
│ │┆ at mainnet prices                      ┆│ │
│ │┆ [• BTC 0.0123]  [• ETH 0.0500]         ┆│ │
│ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ │
│ ╰──────────────────────────────────────────╯ │
│     (↑)       (↓)        (⇄)        (⌗)      │ ActionRow: 48 px `surface-raised` circles,
│     Send      Fund     Transfer     Sell     │ `body-sm` labels; no brass while Active
│ (a) Owned by you · 5 signatures              │
│  Wallet    Activity    Sell                  │
│  ━━━━━━                                      │
│ (₿) Bitcoin testnet4            0.0023 BTC   │
│     tb1qaa…y8sd  [⧉] [▦]   mempool.space ↗   │
│ (Ξ) Ethereum Sepolia            0.0500 ETH   │
│     0x53f9…1C2A  [⧉] [▦]       Etherscan ↗   │
└──────────────────────────────────────────────┘
```
The PendingPill sits under the top bar and the card's pill reads Signing. The stitch shows because the connected viewer owns the Satchel.

**W3. Home `/`, My Satchels, mobile stack of brass bands (390; polish A-04)**
```
┌──────────────────────────────────────────────┐
│ ▣ Satchel                          (a)   ≡   │
├──────────────────────────────────────────────┤
│ My Satchels                       [ Mint ]   │ `title` + secondary
│ 6 Satchels                                   │ `body-sm` `ink-muted`
│ ╭──────────────────────────────────────────╮ │ each band ≈ 63 px is the card's own band:
│ │▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓│ │ a link named "Satchel #1, Active"
│ ╭──────────────────────────────────────────╮ │
│ │▓▓ Satchel #3 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⌗ Listed) ▓▓│ │
│ ╭──────────────────────────────────────────╮ │
│ │▓▓ Satchel #4 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⌗ Listed) ▓▓│ │
│ ╭──────────────────────────────────────────╮ │
│ │▓▓ Satchel #6 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓│ │
│ ╭──────────────────────────────────────────╮ │ the newest card shows in full
│ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ │ (stitched: yours)
│ │┆▓▓ Satchel #7 ▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓┆│ │
│ │┆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆│ │
│ │┆ ≈ $112.06                              ┆│ │
│ │┆ at mainnet prices                      ┆│ │
│ │┆ [• BTC 0.0010]  [• ETH 0.0200]         ┆│ │
│ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ │
│ ╰──────────────────────────────────────────╯ │
│ Polish A-04; without it: one column of cards │
└──────────────────────────────────────────────┘
```
From 1024 this becomes a grid of `md` cards (2 columns, 3 from 1280) with "Read {t} ago" and a ⋯ menu under each.

**W4. Fund `/s/[id]/receive`, as a bottom sheet (390)**
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ✕            Fund Satchel #1             │ │ `shadow-overlay`, 1 px `line`; `heading` title
│ │ ( • BTC 0.0123 │ • ETH 0.0500 )          │ │ ChainSelect: `radius-pill` segmented control
│ │ ╭──────────────────────────────────────╮ │ │ QR panel headed by the card's brass band (UX-22)
│ │ │▓▓ Satchel #1 ▓▓ (Bitcoin testnet4) ▓▓│ │ │
│ │ │      ┌────── white plate ──────┐     │ │ │ 240 px plate, modules `on-brand`, ECC M,
│ │ │      │          ▦▦▦▦           │     │ │ │ quiet zone ≥ 4 modules, no logo
│ │ │      └─────────────────────────┘     │ │ │
│ │ │ This Satchel's Bitcoin testnet4      │ │ │ `body-sm` `ink-muted`
│ │ │ tb1q aanv 9x7k m2rd 4hzc 0a8f 7xum   │ │ │ grouped; ends in `ink` 600
│ │ │ d8z6 3kqe y8sd 4w                    │ │ │
│ │ ╰──────────────────────────────────────╯ │ │
│ │ ! Send only Bitcoin testnet4 coins to    │ │ icon rows `body-sm` (neutral warning icon)
│ │   this address.                          │ │
│ │ ◷ Testnet4 confirmations are irregular:  │ │ `clock`
│ │   minutes to hours.                      │ │
│ │ ⓘ Anyone can fund a Satchel. Only its    │ │
│ │   owner can send from it.                │ │
│ │ Get testnet BTC ↗                        │ │
│ │ Incoming                                 │ │ client island: ◌ → ◷ in mempool → ✓ Received
│ │ ◌ Waiting for a deposit…                 │ │
│ │ [[     Copy address     ]]  [ Share ]    │ │ pinned: brass primary + secondary
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
From 768: the same content in the 480 px dialog, with the QR at 220 px.

**W5. Send: the form (sheet, 390)**
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ✕            Send Bitcoin                │ │ `shadow-overlay`, 1 px `line`; `heading` title · tab title "Send Bitcoin · Satchel"
│ │ ━━━━━━━━━━━━━━                           │ │ progress 1 of 3: `brand-line` on `line`
│ │ ( • BTC 0.0123  │  • ETH 0.0500 )        │ │ ChainSelect with balances
│ │                                          │ │
│ │              0.0100 BTC                  │ │ `balance-hero` 36/40 (48/52 from 480), centred;
│ │      Available 0.0123 BTC   [ Max ]      │ │ ticker `heading` `ink-muted`; Max = chip button
│ │ To                                       │ │ `body-sm` `ink-muted` field label
│ │ ┌──────────────────────────────────────┐ │ │ resolved row: `surface-raised`, `radius-sm`
│ │ │(₿) tb1q 9x7k m2rd 4hzc 0a8f    [✕]   │ │ │ full grouped address, ends emphasised
│ │ │    7xum d8z6 3kqe y8sd 4w            │ │ │
│ │ │    ✓ Bitcoin testnet4 address        │ │ │ or the swatch + "Satchel #4"
│ │ └──────────────────────────────────────┘ │ │
│ │ ⓘ tb1… addresses look the same on        │ │ Info tier: a static note
│ │   testnet3, testnet4 and signet.         │ │
│ │ Network fee ~282 sats · paid by this     │ │ fee line (Uniswap gas line)
│ │ Satchel                                  │ │
│ │ [[               Review               ]] │ │ pinned brass, full width, 15/600
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
From 768: the 480 px dialog (WD3), no keypad anywhere.

**W6. Send: Review as the exact outcome (sheet, 390)**
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ←            Review send                 │ │ `shadow-overlay`, 1 px `line`; `heading` title
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │ │ progress 2 of 3
│ │                  Send                    │ │ `label` `ink-muted`
│ │               0.0100 BTC                 │ │ `balance-hero`; the h1 reads "Send 0.0100 BTC"
│ │   to tb1q9x7k…y8sd · Bitcoin testnet4    │ │ `body-sm` `ink-muted`
│ │ ┌──────────────────────────────────────┐ │ │ OutcomeCard: `surface-raised`, `radius-md`
│ │ │ ▣▒ Satchel #1                        │ │ │ From: the token swatch
│ │ │    −0.01000282 BTC      amount + fee │ │ │ the total leaving
│ │ │    ↓                                 │ │ │
│ │ │(₿) To                    +0.0100 BTC │ │ │ what arrives
│ │ │    tb1q 9x7k m2rd 4hzc 0a8f 7xum     │ │ │ full grouped address
│ │ │    d8z6 3kqe y8sd 4w                 │ │ │
│ │ │    ✓ Bitcoin testnet4 address        │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │ Network fee (est.)   ~282 sats           │ │ `<dl>`: `body-sm` label / `label` value
│ │                      paid by this Satchel│ │
│ │ Satchel #1 after     0.0023 BTC          │ │
│ │ NEAR fee             ≈ 0.004 NEAR ⓘ      │ │ tooltip: needs ≈ 0.1–0.3 NEAR free
│ │ Time                 Signing: usually    │ │
│ │                      about 10 seconds    │ │
│ │ Uses 3 coins from this Satchel, so it    │ │ BTC only, n > 1
│ │ needs 3 signatures.                      │ │
│ │ ☐ I checked this address                 │ │ warning tier only (a real checkbox)
│ │ Bitcoin transfers are final. Check the   │ │ one finality line, `ink-muted`
│ │ address above.                           │ │
│ │ [[          Send 0.0100 BTC           ]] │ │ → "Preparing…" → "Approve in your wallet…"
│ │ Your wallet will ask you to approve a    │ │ (in place; inputs locked)
│ │ request to satchel.<team>.testnet.       │ │
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
**W7. Send: the tracker that becomes the receipt (sheet, 390)**

W7a: signing.
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ↙ Minimize   Sending 0.0100 BTC          │ │ `shadow-overlay`, 1 px `line`; `heading` title · Minimize, not ✕, while non-terminal
│ │ Usually about 10 seconds.                │ │ ETA line: changes at 20 / 60 / 150 s
│ │ ✓ Approved in your wallet       14:02:11 │ │ done: `success` check, past tense, clock time
│ │ │                                        │ │
│ │ ● Signing with NEAR's signer net…  0:07  │ │ active: the `frozen` dot pulses (the brand's
│ │ │ Signing 3 inputs                       │ │ signing pulse); bold; timer `aria-hidden`
│ │ │ NEAR transaction 7Gh…k2 ↗              │ │ evidence on the step where it appears
│ │ ○ Broadcast to Bitcoin testnet4          │ │ future: `circle-dashed`, `ink-muted`
│ │ ○ Confirmed                              │ │
│ │ Keep this tab open until it says Sent.   │ │ `ink-muted`, calm (no relay, D-12)
│ │ Signatures by NEAR Chain Signatures      │ │ credit `body-sm` `ink-muted` (UX-30)
│ │ ▸ Details                                │ │ the ReviewCard, read-only
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
W7b: after broadcast. The same component is now the receipt.
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ✕            Sent 0.0100 BTC             │ │ `shadow-overlay`, 1 px `line`; `heading` title · the header flips at `sent`
│ │ to tb1q9x7k…y8sd                         │ │
│ │ ✓ Approved in your wallet       14:02:11 │ │
│ │ ✓ Signed by NEAR's signer net…  14:02:19 │ │ + NearBlocks link
│ │ ✓ Broadcast to Bitcoin testnet4 14:02:21 │ │ + tx a1…9f, copy, link
│ │ ◷ Confirmed                              │ │ static `frozen` ring: never a check before final
│ │   In mempool. Testnet4 confirmations are │ │
│ │   irregular: minutes to hours.           │ │
│ │ You can close this tab. Activity keeps   │ │ shown from broadcast on
│ │ tracking it.                             │ │
│ │ [[                Done                ]] │ │ brass
│ │ [            View activity             ] │ │ secondary
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
W7c: a broadcast failure. The tracker keeps its rows, and the failing row hosts the SignedNotSentCard.
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Satchel page (inert) ░░░░░░░░░░░░░ │ `scrim` over the page the route renders
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ↙ Minimize   Sending 0.0100 ETH          │ │ `shadow-overlay`, 1 px `line`; `heading` title
│ │ ✓ Approved in your wallet       14:02:11 │ │
│ │ ✓ Signed by NEAR's signer net…  14:02:19 │ │
│ │ ✕ Broadcast to Ethereum Sepolia          │ │ the failing row (`danger`); rows above stay
│ │ ┌──────────────────────────────────────┐ │ │ SignedNotSentCard: a `surface-raised` panel;
│ │ │ ! Signed, not sent                   │ │ │ `danger` icon + title, `ink` body, calm copy
│ │ │ Sepolia RPC isn't responding.        │ │ │ reason + what moved
│ │ │ Nothing has left Satchel #1 yet.     │ │ │
│ │ │ The signed transaction is saved.     │ │ │ `sign.notsent.explain`
│ │ │ Until it's broadcast or replaced, it │ │ │
│ │ │ counts as an unused signature in     │ │ │
│ │ │ this Satchel's history.              │ │ │
│ │ │ [[ Broadcast again ]]     Details ▾  │ │ │ the screen's brass; nonce 7 · 0.0100 ETH
│ │ └──────────────────────────────────────┘ │ │
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
**W8. Activity with the In progress group (390)**
```
┌──────────────────────────────────────────────┐
│  Wallet    Activity    Sell                  │
│            ━━━━━━━━                          │
│ In progress                                  │ pinned group; `label` `ink-muted`
│ (₿↑) Sending to tb1q…y8sd    −0.0100 BTC     │ title `label` `ink` (the address in `address`)
│      Bitcoin testnet4 · 0:42  ● Signing      │ status word only when not final (`frozen`)
│ (Ξ!) Signed, not sent      [Broadcast now]   │ inline action (secondary); `danger` badge
│      Ethereum Sepolia · 14:02                │
│ Today                                        │ day header `label` `ink-muted`
│ (₿↑) Sent to tb1q…y8sd       −0.0100 BTC     │ U+2212 for outgoing
│      Bitcoin testnet4 · 14:02 ◷ In mempool   │ `frozen`
│ (▣⇄) Transferred to bob.testnet              │ NEAR events: the token swatch + an action badge
│      NEAR testnet · 13:40                    │
│ (Ξ↑) Sent to ▣▒ Satchel #4   −0.0100 ETH     │ the counterparty's swatch
│      Ethereum Sepolia · 10:15                │
│ (Ξ✕) Not signed: to 0x53f9…1C2A 0.0100 ETH   │ struck through + `danger` "Failed"
│      Ethereum Sepolia · 09:40    ✕ Failed    │
│ Nov 10                                       │
│ (▣+) Minted by alice.testnet                 │
│      NEAR testnet · 09:58                    │
│ Show older                                   │ ?before= link (SSR paging, no JS)
│ Missing something? See every event on        │
│ NearBlocks ↗                                 │
└──────────────────────────────────────────────┘
```
**W9. Sell flow: "Before you list" (owner, Active, inside the quiet period; sheet over the Sale tab, 390)**
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Sale tab (/s/3/sale?list) ░░░░░░░░ │ the Sell flow, presented in the sheet
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ✕            Sell Satchel #3             │ │ `shadow-overlay`, 1 px `line`; `heading` title
│ │ Before you list                          │ │ `label` `ink-muted`; ListChecklist
│ │ ◷ Quiet period                           │ │ REQUIRED (ERR_QUIET_PERIOD); `frozen`
│ │   You can list in 143 blocks (~1 min 20s)│ │ the countdown sits inside a sentence
│ │   ▰▰▰▰▰▰▰▰▱▱▱▱▱▱  107 of 250 blocks      │ │ thin track: `brand-line` on `line`
│ │ ✓ Past signatures                        │ │ ADVISORY: ✕ → How to settle; List stays
│ │   All 4 can no longer move coins         │ │ enabled (demo #4, D-32)
│ │ ! USDC payouts aren't set up             │ │ REQUIRED for a USDC listing only
│ │   [ Register · 0.00125 NEAR ]            │ │
│ │ Price                                    │ │
│ │ ( USDC │ NEAR )                          │ │ the listing fixes the currency (D-14)
│ │ [ 250.00                         USDC ]  │ │ `title`-size input, tabular
│ │ Buyer gets 0.0123 BTC and 0.0500 ETH.    │ │
│ │ Price                       250.00 USDC  │ │ `<dl>` rows
│ │ Satchel fee                        none  │ │
│ │ Listing deposit 0.01 NEAR · refunded     │ │
│ │ You receive                 250.00 USDC  │ │ the one bold number
│ │ While it's listed                        │ │ consequences
│ │ · You can't send from it or transfer it. │ │
│ │ · Anyone can buy it at exactly           │ │
│ │   250.00 USDC, right away.               │ │
│ │ · You can delist at any time.            │ │
│ │ [[       List for 250.00 USDC         ]] │ │ pinned; disabled until the required rows pass
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
**W10. Listed (owner): ActionRow with the brass Delist, FreezeBanner, ListedPanel (390)**
```
┌──────────────────────────────────────────────┐
│ [Token #3] [NEP-171] [NEAR testnet]      ⋯   │
│ Satchel #3                                   │
│ ╭──────────────────────────────────────────╮ │
│ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ │ stitched (owner); no frost
│ │┆▓▓ Satchel #3 ▓▓▓▓▓▓▓▓▓▓▓▓ (⌗ Listed) ▓▓┆│ │ Listed = signing paused
│ │┆ ≈ $123.10 · at mainnet prices          ┆│ │
│ │┆ [• ETH 0.0500]                         ┆│ │
│ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ │
│ ╰──────────────────────────────────────────╯ │
│     (↑)       (↓)        (⇄)       ((↶))     │ Send and Transfer `aria-disabled`; Delist is
│     Send      Fund     Transfer    Delist    │ the screen's one brass circle
│ Signing is paused while listed.              │ reason line
│ ┌──────────────────────────────────────────┐ │ FreezeBanner: `surface-raised` panel,
│ │ ❄ Signing paused while listed            │ │ `frozen` snowflake + title; on every tab
│ │ No coins can leave Satchel #3 until you  │ │ what is paused and what still works
│ │ delist it or it sells. Anyone can still  │ │
│ │ fund it.                       Delist ↗  │ │ text button; no countdown (E-37)
│ └──────────────────────────────────────────┘ │
│  Wallet    Activity    Sell                  │
│                        ━━━━                  │
│ Listed for 250.00 USDC · Listing #7          │ ListedPanel (`label`)
│ [ Delist ]                                   │ secondary; the wallet is the confirmation
│ Delisting is instant: buyers can't buy it    │
│ anymore, and sending and transfers resume.   │
│ To change the price, delist and list again.  │
└──────────────────────────────────────────────┘
```
**W11. Buy (visitor, listed, browser verdict clean; 390)**
```
┌──────────────────────────────────────────────┐
│ [Token #3] [NEP-171] [NEAR testnet]      ⋯   │
│ This NFT is a wallet.                        │
│ ╭──────────────────────────────────────────╮ │ visitor: no stitch
│ │▓▓ Satchel #3 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⌗ Listed) ▓▓│ │
│ │ ≈ $123.10 · at mainnet prices            │ │
│ │ [• ETH 0.0500]                           │ │
│ ╰──────────────────────────────────────────╯ │
│ ┌──────────────────────────────────────────┐ │ FreezeBanner, buyer copy
│ │ ❄ Signing paused while listed            │ │
│ │ The seller can't sign anything new, so   │ │
│ │ the history below is final for this      │ │
│ │ listing.                                 │ │
│ └──────────────────────────────────────────┘ │
│  Wallet    Activity    Buy                   │
│                        ━━━                   │
│ Buy for                                      │ `body-sm` `ink-muted`
│ 250.00 USDC                                  │ `title`, tabular
│ Listing #7 · listed 4 min ago by alice       │ `body-sm` `ink-muted`
│ You get                                      │
│ 0.0123 BTC · 0.0500 ETH                      │ verified balance
│ (◉ Verified balance · read 8 s ago)          │ ProofChip, neutral (`coins`)
│ Clean history                                │ eyebrow `label` `ink-muted`
│ ✓ Clean. No past signature can move          │ `heading` verdict, `shield-check` `success`;
│   these coins.                               │ role=status
│   4 settled · checked 8 s ago                │
│   Runs in your browser. Satchel's server     │ trust line (`monitor-check`)
│   isn't trusted for this.                    │
│ Checks                                       │
│ ✓ Contract keys: none since birth            │
│ ✓ Code: matches the published build          │
│ ✓ Ethereum address: no delegated code        │
│ Can't move coins (4)                         │ grouped; needs-attention first
│ Ethereum · nonce 0            (✓ Settled)    │ item pill, `success`
│   Would send 0.0100 ETH to 0x53f9…1C2A       │
│   Nonce 0 used by 0x8b…41 · 3 confirmations  │
│ Show all 4                                   │
│ ▸ Sources  ▸ How Satchel checks this         │
│ Payment: paid in USDC. You have 312.40.      │ fixed by the listing: no toggle
├──────────────────────────────────────────────┤
│ 250.00 USDC                    [[ Buy ]]     │ StickyBuyBar (pinned): the screen's brass
│ ✓ Clean history · checked 8 s ago            │ GateLine (aria-describedby on Buy)
└──────────────────────────────────────────────┘
```
**Blocked variant (demo #4).**
- A `danger` banner (`surface-raised` panel, `shield-alert` + title) at the top of the Buy panel: "1 past signature could still move coins" / "Nonce 4 isn't used yet. Until it is, whoever holds that signature can send 0.0100 ETH out of this Satchel." / **See the signature**.
- The StickyBuyBar footnote reads "Blocked: 1 unused signature" (`danger`), and **Buy** is disabled with that reason. There is no override.

**W12. Transfer, then the handoff storyboard (F1–F4)**
```
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│ F1 Review                    │  │ F2 In flight (lifted)        │  │ F3 Handoff (≈ 700 ms)        │  │ F4 Done (end frame)          │
│ Transfer Satchel #1          │  │                              │  │                              │  │      (b)(a)                  │
│ ╭──────────────────────────╮ │  │     ╭──────────────╮         │  │ (a) You ────────▶ (b) bob    │  │  ╭────────────────────╮      │
│ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ │  │     │ card ↑12 px  │ tilt 6° │  │        ╭card╮ → slides       │  │  │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│      │
│ │┆▓▓ Satchel #1 ▓▓▓ (⊙) ▓▓┆│ │  │     ╰──────────────╯         │  │   spring 120/18/1.2:         │  │  │┆▓▓ Satchel #1 ▓▓▓▓┆│      │
│ │┆ ≈ $1,148.72            ┆│ │  │      shadow-overlay          │  │   ±1 % at 659 ms             │  │  │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│      │
│ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ │  │                              │  │                              │  │  ╰────────────────────╯      │
│ ╰──────────────────────────╯ │  │ (a) You          (b) bob     │  │ lands under bob; the         │  │    (✓ Transferred)           │
│ │ To bob.testnet · found     │  │                              │  │ stitch draws in (300 ms)     │  │ bob.testnet now controls     │
│ (b) bob.testnet will         │  │ ◌ Approve in your wallet…    │  │                              │  │ 0.0123 BTC and 0.0500 ETH.   │
│   control everything:        │  │   then "Transferring…"       │  │ runs only after the tx       │  │ From   alice.testnet         │
│   0.0123 BTC · 0.0500 ETH    │  │ ✓ Approved                   │  │ succeeds: never optimistic   │  │ To     bob.testnet           │
│ (a) You won't be able        │  │ ● Transferring on NEAR       │  │                              │  │ NEAR   7Gh…k2 ↗              │
│   to send from it.           │  │ ○ Transferred                │  │ reduced motion: a 200 ms     │  │ Time   14:02 UTC             │
│ This can't be undone.        │  └──────────────────────────────┘  │ cross-fade + text            │  │ [View Satchel #1]            │
│ [[Transfer to bob.testnet]]  │                                    └──────────────────────────────┘  │ [[Done]]                     │
└──────────────────────────────┘                                                                      └──────────────────────────────┘
```
From 768 the handoff plays inside the 480 px dialog: the "You" and recipient avatars sit at its left and right edges (≈ 280 px slide). F4 is the only place a card is stitched for someone other than the viewer: it marks the new owner named above it. Back on the Satchel page, alice's card has no stitch.

**W13. Market: MarketCards (`md` brand cards; grid 1 → 2 → 3 columns)**
```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ ╭──────────────────────────────────╮ │  │ ╭──────────────────────────────────╮ │
│ │▓▓ Satchel #3 ▓▓▓▓▓▓ (⌗ Listed) ▓▓│ │  │ │▓▓ Satchel #4 ▓▓▓▓▓▓ (⌗ Listed) ▓▓│ │
│ │ ≈ $123.10 · at mainnet prices    │ │  │ │ ≈ $24.62 · at mainnet prices     │ │
│ │ [• ETH 0.0500]                   │ │  │ │ [• ETH 0.0100]                   │ │
│ ╰──────────────────────────────────╯ │  │ ╰──────────────────────────────────╯ │
│ 250.00 USDC                          │  │ 1.00 NEAR                            │
│ ✓ Clean history · checked 12 s ago › │  │ ! Blocked: 1 unused signature     ›  │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```
The card absorbs R2's meta row (name + status) and stats row (native balances); the price and the verdict hint (with its age) sit under it, and the whole block links to `/s/[id]/sale`. Buyable listings come first; blocked ones come last with their reason.

**W14. Mint flow over Home (sheet, 390)**
```
┌──────────────────────────────────────────────┐
│ ░░ dimmed Home (inert) ░░░░░░░░░░░░░░░░░░░░░ │ /mint renders Home behind the flow
│ ╭──────────────────────────────────────────╮ │ bottom sheet: `surface`, `radius-card` top corners,
│ │ ✕            Mint a Satchel              │ │ `shadow-overlay`, 1 px `line`; `heading` title
│ │ ╭──────────────────────────────────────╮ │ │ the mint preview: stitched (it will be yours)
│ │ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│ │ │
│ │ │┆▓▓ New Satchel ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆│ │ │ band name until minted; no pill
│ │ │┆ 2 chains                           ┆│ │ │ `balance-hero` step
│ │ │┆ Bitcoin and Ethereum addresses     ┆│ │ │
│ │ │┆ [• BTC]  [• ETH]                   ┆│ │ │ chips without balances
│ │ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│ │ │
│ │ ╰──────────────────────────────────────╯ │ │
│ │ You get   Bitcoin + Ethereum addresses   │ │ MintBar: `body-sm` labels / `label` values
│ │ Deposit   0.02 NEAR · unused refunded    │ │
│ │ ✓ Its own Bitcoin testnet4 address       │ │ "What you get"
│ │ ✓ Its own Ethereum Sepolia address       │ │
│ │ ✓ Only its owner can move the coins      │ │
│ │ ✓ A public record of every signature     │ │
│ │ [[           Mint a Satchel           ]] │ │ pinned; not connected: "Connect wallet to mint"
│ │ · · · · after the tx succeeds · · · · ·  │ │
│ │ "New Satchel" → "Satchel #8" (160 ms)    │ │ plain feedback, no reveal motion
│ │ Satchel #8 is yours.                     │ │ `title`
│ │ Minted in 8Fx…2k ↗                       │ │
│ │ [[         Fund this Satchel          ]] │ │
│ │ [           Open Satchel #8            ] │ │
│ ╰──────────────────────────────────────────╯ │
└──────────────────────────────────────────────┘
```
**W15. Landing `/` (not connected; 390)**
```
┌──────────────────────────────────────────────┐
│ ▣ Satchel            [ Connect wallet ]  ≡   │
├──────────────────────────────────────────────┤
│ NEAR Chain Signatures · testnet              │ eyebrow `label` `ink-muted`
│ One strap,                                   │ `display` 40/42 (56/57 from 768), opsz 96
│ every chain.                                 │ (UX-32; the alternative is R2's H1)
│ Satchel is an NFT that is a wallet. Each     │ `lead` 17/26 (19/30 from 768), `ink-muted`
│ one controls its own Bitcoin and Ethereum    │
│ addresses; transfer the NFT and you hand     │
│ over the wallet.                             │
│ [[  See Satchel #1  ]]  [ Connect wallet ]   │ brass + secondary
│ Testnet only. Coins here have no value.      │ persistent note (Slash)
│ ╭──────────────────────────────────────────╮ │ the live card #1: no stitch, no glow
│ │▓▓ Satchel #1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (⊙ Active) ▓▓│ │
│ │ ≈ $1,148.72 · at mainnet prices          │ │
│ │ [• BTC 0.0123]  [• ETH 0.0500]           │ │
│ ╰──────────────────────────────────────────╯ │
│ Read 12 s ago                                │ real data in the SSR HTML
│ · · · · · · · · · · fold · · · · · · · · ·   │
│ How it works                                 │ `section` 32/36 (44/48 from 768)
│ 1 · 2 · 3 steps · Proof · (P2) FAQ · Footer  │
└──────────────────────────────────────────────┘
```
From 1024 the hero splits: the eyebrow, H1, lead, CTAs and note on the left; the live card #1 (`lg`, 400 px) on the right. Left-aligned; no glow; no full-page stitch frame (the canvas landing frame is not adopted: the stitch means ownership, BI-5).

**WD1. Desktop `/s/[id]`, owner (≥ 1024; left nav 224 px; content `minmax(320px, 400px) | 1fr`)**
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▣ Satchel            │ ╭────────────────────────────────╮   [Token #1] [NEP-171] [NEAR testnet]   ⋯    │ left nav 224 px on `surface`; lockup 36 px
│                      │ │┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐│   Satchel #1                                 │
│ ▌ My Satchels        │ │┆▓▓ Satchel #1 ▓▓ (⊙ Active) ▓▓┆│   (a) Owned by you · 4 signatures            │ active link: `surface-raised` + `ink`
│   Market             │ │┆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆│   ┌──────────┬────────────┬─────────┐        │ StatsStrip `<dl>`: `body-sm` labels,
│   Mint               │ │┆ ≈ $1,148.72                  ┆│   │ Status   │ Signatures │ Minted  │        │ `line` hairlines
│                      │ │┆ at mainnet prices            ┆│   │ ⊙ Active │ 4          │ Nov 10  │        │
│                      │ │┆ [• BTC 0.0123] [• ETH 0.0500]┆│   └──────────┴────────────┴─────────┘        │
│                      │ │└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘│    Wallet    Activity    Sell                │ NavTabs; 2 px `brand-line`
│                      │ ╰────────────────────────────────╯    ━━━━━━                                    │
│                      │    (↑)    (↓)     (⇄)     (⌗)        (₿) Bitcoin testnet4          0.0123 BTC   │ ChainRows: full grouped addresses
│                      │    Send   Fund  Transfer  Sell           tb1q aanv 9x7k … y8sd 4w ⧉ ▦ mempool ↗ │ from 1024
│                      │                                      (Ξ) Ethereum Sepolia          0.0500 ETH   │
│                      │  sticky column: minmax(320, 400)         0x53f9 a1b2 … 9c3e 1C2A ⧉ ▦ Etherscan ↗│
│ ( a alice.testnet )  │                                      Read from each chain 12 s ago.             │
│ Testnet only. Coins  │                                      Facts: a 2-column `line` grid              │ account pill: `address` 13,
│ here have no value.  │                                      ▸ Verify these addresses                   │ 1 px `line-strong`, `radius-pill`
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
**WD2. Desktop `/s/[id]/sale`, visitor on a listed Satchel**
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▣ Satchel            │ ╭────────────────────────────────╮   [Token #3] [NEP-171] [NEAR testnet]   ⋯    │ visitor: no stitch
│                      │ │▓▓ Satchel #3 ▓▓▓▓ (⌗ Listed) ▓▓│   This NFT is a wallet.                      │
│   My Satchels        │ │ ≈ $123.10 · at mainnet prices  │   (a) Owned by alice.testnet · 4 sig.        │
│ ▌ Market             │ │ [• ETH 0.0500]                 │   ┌────────┬────────────┬─────────────┐      │
│   Mint               │ ╰────────────────────────────────╯   │ Status │ Signatures │ Listed for  │      │
│                      │ Buy for                              │ Listed │ 4          │ 250.00 USDC │      │
│                      │ 250.00 USDC                          └────────┴────────────┴─────────────┘      │
│                      │ Listing #7 · listed 4 min ago        ❄ Signing paused while listed.             │ FreezeBanner (`frozen`)
│                      │ ✓ Clean history · checked 8 s ago     Wallet    Activity    Buy                 │
│                      │ [[     Buy for 250.00 USDC     ]]                           ━━━                 │
│                      │ The contract doesn't run this check; You get 0.0123 BTC · 0.0500 ETH            │
│                      │ this app does.                       (◉ Verified balance · read 8 s ago)        │ ProofChip
│                      │                                      Clean history: verdict → checks →          │
│                      │                                      signatures → sources                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
The left column is sticky: the card, "Buy for", the GateLine and Buy stay visible while the report scrolls on the right (R2-D03).

**WD3. Desktop flow: `/s/1/send` as a 480 px dialog over the Satchel page (≥ 768)**
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░░░░░░░ Satchel #1 page, dimmed by `scrim`, inert ░░░░░░░░░░░░░░░░░░░│ /s/1/send at 1280: the route renders the page itself
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ ╭──────────────────────────────────────────────╮ ░░░░░░░░░░░░░░░░░░│ (no intercepting route); dialog 480 px: `surface`,
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │ Review send                                ✕ │ ░░░░░░░░░░░░░░░░░░│ `radius-card`, `shadow-overlay`, 1 px `line`
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │ ░░░░░░░░░░░░░░░░░░│
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │                     Send                     │ ░░░░░░░░░░░░░░░░░░│
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │                  0.0100 BTC                  │ ░░░░░░░░░░░░░░░░░░│ `balance-hero` 48/52
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │  OutcomeCard · fee rows · Time · finality    │ ░░░░░░░░░░░░░░░░░░│
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ │ [[            Send 0.0100 BTC             ]] │ ░░░░░░░░░░░░░░░░░░│ footer action, full width
│ ░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░ ╰──────────────────────────────────────────────╯ ░░░░░░░░░░░░░░░░░░│ Esc or ✕ replaces the URL with /s/1
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Demo video beats (≤ 2:15, D-17; designed to survive jump cuts)
| Beat | Screen | Must be visible | Edit note |
|---|---|---|---|
| 0:00–0:12 Hook | `/s/1` judge view | The H1, the brand card (band, Active, total, chips), the BTC row with mempool.space | none |
| –0:35 Mint and fund | `/mint` (stitched preview) → "Satchel #8 is yours." → `/s/[id]/receive` | The stitched mint preview; the QR panel under its brass band; the Incoming block flipping to "in mempool" | Speed-ramp the faucet wait |
| –1:00 Send ETH | Send: Review → "Approve in your wallet…" → tracker → receipt | The OutcomeCard; the pulsing `frozen` step with its timer; "Sent" with Etherscan | Jump-cut the MPC wait, but keep the timer on screen before and after the cut |
| –1:30 Transfer, then Bob sends BTC | Transfer review → **the handoff** (lift, tilt, slide; the stitch draws in on bob's card) → Bob's browser sends BTC | "bob.testnet now controls…", the receipt, then "In mempool" with the static ring | Split screen with two browsers. Never wait for a BTC confirmation |
| –2:00 List and buy | Sell flow "Before you list" (#3, EVM-only) → List → the Listed pill + FreezeBanner → carol's Buy tab → rows resolve → "Clean history" ProofChip and GateLine → Buy → reverse handoff (the stitch appears for carol) | The quiet-period sentence; "Signing paused while listed"; "Clean. No past signature can move these coins."; "Satchel #3 is yours." | No cooldown and no speed-ramp (D-05 rev 2). Cut to #4's blocked verdict for 2 s if time allows |
| –2:15 Repo | README | "do X → see Y" | none |

## Components
Primitive names are library-neutral. shadcn 4.22.1 `init -d` gives `base-nova` on `@base-ui/react`, and `--base radix|base` chooses between them; decide on Day 1 (kb/41). If the web lane picks Radix, map Toast to Sonner. Every primitive gets the kb/81 R3 override list (brass primary once per screen, outline secondary, `radius-md` buttons, no `shadow-sm` cards, underline tabs, static skeletons, the compact toast), so the result never reads as stock shadcn.

### Inventory
| Component | Kind | Built on | Phase | Used in | vs R2 |
|---|---|---|---|---|---|
| **NavShell** (top bar < 1024, left nav ≥ 1024, NavSheet), AccountControl / AccountPill, Testnet chip | custom | Button, Menu, Sheet | P1 | global | **new** (was TopBar) |
| **ThemeControl** (System · Night · Day) | custom | Toggle Group | P2 (P1 forces Night) | account menu, NavSheet, footer | **new** |
| RoleStrip | custom | — | P1 | global (`dev`/`rc`) | restyled (neutral); **removed** (D-52) |
| SystemBanner (`banner.rpc-down`, offline) | custom | — | P1 | global | restyled |
| Footer | custom | — | P1 | global | + theme control, fiat note |
| **FlowShell** (bottom sheet < 768, 480 px dialog ≥ 768, scrim, inert background, header with ✕/Minimize and the progress line, pinned action) | custom | Dialog/Drawer primitive | P1 | send, transfer, receive, sell (`?list`), mint, NavSheet | **new** (replaces FlowPage) |
| PinnedActionBar · StickyBuyBar | custom | Button | P1 / P2 | flows / Buy | restyled |
| NavTabs | custom | Link, `aria-current` | P1 | `/s/[id]/*` | brass indicator |
| MetaChips + OverflowMenu | custom | Menu | P1 (menu: polish A-09) | `/s/[id]` | sentence case, no alloy chip |
| OwnerPill | custom | Avatar | P1 | `/s/[id]` | restyled |
| StatsStrip | custom | `<dl>` | P1 | `/s/[id]` desktop | sentence case |
| **SatchelCard** (band, body, chips, stitch, per-token leather) | custom | Aspect Ratio, SVG overlay | P1 | everywhere | **changed** (brand card) |
| ActionRow | custom | Button | P1 | `/s/[id]` owner | brass Delist while listed |
| **StatusPill** (page and band variants) · **Chip** (meta, chain) | custom | — | P1 | everywhere | Tag and MetaChip merged into these |
| **ChainRow** | custom | Item | P1 | Wallet tab | restyled |
| FundCard | custom | — | P1 | Wallet tab (all zero) | restyled |
| **AddressDisplay** + CopyButton + QrButton | custom | Button, Tooltip, Toast | P1 | rows, review, receive, facts | mono only here |
| QrPanel (+ QrPlate) · IncomingBlock | custom | QR library (A-12) | P1 | receive | brass-band header |
| ChainSelect | custom | Toggle Group | P1 | send, receive | `radius-pill` segmented |
| **AmountInput** | custom | Field, Input | P1 | send, sell | `balance-hero` |
| **RecipientInput** · AccountInput + RecipientCard | custom | Field | P1 | send · transfer | restyled tiers |
| **ReviewCard** (OutcomeCard + rows) | custom | `<dl>` | P1 | send (pattern for transfer and buy) | restyled |
| **SigningProgress** (tracker → receipt) | custom | `<ol>` | P1 | send; 3-step subset for list, buy, transfer, mint | `frozen` pulse |
| PendingPill / PendingCard | custom | — | P1 | global | restyled |
| **SignedNotSentCard** · FailureCard | custom | — | P1 | flows, Wallet tab, Activity, Clean history | danger tone, calm copy |
| **Timeline** + TimelineRow | custom | `<ol>`, disclosure | P1 | Activity | canvas row style |
| **HandoffAnimation** + Receipt | custom | Motion, Avatar | P1 | transfer, buy | the signature moment |
| AccountAvatar | custom | — | P1 | owner pill, handoff, account | neutral |
| HowItWorks · FactsGrid · ProofGrid · VerifyDisclosure | custom | `<dl>`, `<details>` | P1 | landing, `/s/[id]`, `/contract` | restyled |
| EmptyState · InlineAlert · Toast · Skeleton | shadcn | Empty, Alert, Toast | P1 | all | kb/81 R3 overrides |
| **FreezeBanner** | custom | — | P2 | `/s/[id]` (every tab) | `frozen` + snowflake |
| ListChecklist · ListingForm · ListedPanel | custom | Field, Toggle Group | P2 | sale (owner) | Sell runs in the FlowShell |
| BuyBlock · **GateLine** · ListingChanged | custom | — | P2 | sale (visitor) | restyled |
| **CleanHistory** + CleanHistoryRow + Sources | custom | `<ul>`, disclosure | P2 | sale | pills, sentence case |
| **ProofChip** (clean history; verified balance) | custom | Tooltip | P2 | buy, market | **replaces** the Hallmark chip |
| MarketCard · MarketToolbar | custom | SatchelCard `md` | P2 | `/market` | card + price + verdict |
| MintBar | custom | — | P1 | `/mint` | restyled |
| ~~FrostLayer~~ · ~~HallmarkStamp~~ · ~~FinishesArc / FinishesWall~~ · ~~Tag~~ · ~~Hallmark~~ | — | — | — | — | **removed** (B-04, B-05, B-07) |
| ~~Responsive modal (Dialog/Drawer)~~ · ~~Confirm (AlertDialog)~~ · ~~DelegateRow + CapMeter~~ · ~~OneClickStepper~~ | — | — | — | — | removed (D-26 as amended, R2-D15, D-13, D-19) |

### Shared types (kb/90 names)
```ts
type Chain = 'btc' | 'evm' | 'sol';
type SatchelStatus = 'active' | 'signing' | 'listed' | 'needs_attention';   // 'sold' is a flow end state (kb/90 §5.10); kb/90's pill label "For sale" is "Listed" (E-46)
type ItemStatus = 'spent' | 'expired' | 'unfunded' | 'settling' | 'unused' | 'unknown';   // kb/90 §7.3; the UI adds 'checking'
type Aggregate = 'checking' | 'empty' | 'clean' | 'settling' | 'blocked' | 'unknown' | 'unsafe';
type ChainBalance = { chain: Chain; base: bigint; decimals: number; display: string; incomingBase?: bigint; asOf: number; error?: boolean };
type FiatTotal = { usd: number; asOf: number; source: '1click' | 'coingecko' } | null;   // null → the card shows "{n} chains" (UX-1)
type Viewer = { kind: 'owner' | 'visitor' | 'anonymous'; accountId?: string };       // no delegate kind (D-13)
type Theme = 'system' | 'night' | 'day';                                              // localStorage "satchel:theme:v1"
```

### SatchelCard (B-04)
| Aspect | Spec | Reference |
|---|---|---|
| Props | `tokenId: string; size: 'lg' \| 'md' \| 'xs' \| 'inline'; status: SatchelStatus \| 'sold'; owned: boolean` (the connected viewer owns it; drives the stitch) `; balances?: ChainBalance[]; fiat?: FiatTotal; sigCount?: number; variant?: 'app' \| 'mint-preview'; pose?: 'rest' \| 'lifted'; loading?: boolean`. **Removed:** `alloy`, `face`, `verdict`, `listed` (now `status`) | — |
| Geometry | 1.586:1, `radius-card` 22, `shadow-card`. `lg` = `min(100%, 400px)` (358 at 390; 288 at 320); `md` fills its grid cell; `xs` 40 × 25 (radius 4); `inline` 20 × 13 (radius 2). The band is 28 % of the height (71 px at 400; 63 at 358; 51 at 288) | brand canvas |
| **Band** | `--brass-gradient` (`linear-gradient(135deg, brand-bright, brand 55%, brand-deep)`). Left: the name "Satchel #7" (`heading` at weight 650, `on-brand`; mint preview "New Satchel"). Right: the **band StatusPill** (`band-pill` `#2B1D15` fill, `brand-bright` `caption` word at 600, the state glyph in the Night state colour, `radius-pill`, padding 4 × 10). Padding 0 16 px (0 14 px below 320). Verified: `on-brand` ≥ 6.61:1 over the darkest gradient pixel under the name; the pill word 10.36:1. **Never** place the logo mark or glyph on the band | canvas |
| **Body** | `surface`; in Night the per-token `satchel-body` (§Per-token leather hue). Padding 16 px (20 px at 400). Top: the **total** in `balance-hero` at its 36/40 step, `ink`, tabular: "≈ $1,148.72", stepping down to 28/32 rather than wrapping; under it the qualifier "at mainnet prices" (`caption`, `ink-muted`). Without prices, or if any balance is unavailable, the hero reads "{n} chains" (e.g. "2 chains") and the qualifier "Balances below". Bottom: **chain chips** | canvas |
| **Chain chips** | `radius-sm`, `surface-raised`, padding 5 × 9, an 8 px chain dot (`chain-btc` / `chain-evm` / `chain-sol`), then ticker + native amount in `caption`, tabular, `ink`: "BTC 0.0123", "ETH 0.0500" ("SOL …" in P2). An unavailable balance reads "BTC —". The mint preview shows the ticker only | canvas |
| **Stitch** | Only when `owned` (the connected viewer is the owner), on the mint preview, and on the receiving card at the end of a handoff. An inline SVG `<rect>`: inset 8 px, radius 14, `stitch-width` 1.5 px, `stroke-dasharray="6 5"`, colour `stitch`, `aria-hidden`. Never on another viewer's card, in the SVG media or in the OG image | brand |
| States | loading (a static `surface-raised` plate with the band) · default · Signing (pulsing dot in the band pill) · Listed · Needs attention (owner) · lifted (`shadow-overlay`, y −12 px, scale 1.04, rotate 6°; only during the handoff) · Sold (seller's view: the Sold pill, no stitch) · reduced motion (no lift or tilt) | — |
| **NFT SVG** (D-23, R-22) | `/api/card/[id].svg`, viewBox `0 0 800 504` (2 × the 400 × 252 card), `rx="44"`: the band (gradient, name, status pill from contract state: Active, Signing or Listed), the Night body in the token's `satchel-body`, **"{n} signatures"** in the total's place (`balance-hero` style) over "recorded on NEAR testnet", and the chain marks as chips without balances. **No stitch** (ownership is relative to the viewer), **no balances**, no owner. Text: embed a WOFF2 subset (Bricolage 650/700 for the name, digits and status words; Instrument Sans 500 for chips) as a `data:` URI inside the SVG, with `system-ui` behind it **[ASSUMED: wallets' `<img>` rendering honours data-URI fonts; check on Day 2; else outline the strings]** | — |
| Data | The per-token leather: pure from `tokenId`. Owner: `nft_token`. Status: `satchel(id)` + records (kb/90 §5.10). Balances: the page snapshot. Fiat: `/api/prices` (60 s), applied in the same blocking SSR render with a 1.5 s bound; a slow or failed price read renders "{n} chains", never a placeholder | — |
| A11y | `<figure aria-labelledby>`; the band name is the heading; the total, qualifier and chips are real text (so the summary reads "Satchel #1. Active. About 1,148.72 US dollars at mainnet prices. 0.0123 BTC, 0.0500 ETH."). The stitch, gradient and dots are `aria-hidden`. "Owned by you" is always written in the OwnerPill, so the stitch never carries meaning alone. No tilt on hover | — |

**Per-token leather hue** (kb/81 R3 §Per-token leather hue is normative): `offset = (fnv1a32(utf8("satchel:" + tokenId)) mod 25) − 12`; `hue = 52 + offset`; Night body `oklch(0.220 0.034 hue)`; swatch `oklch(0.431 0.0597 hue)`; emitted as hex. Test vectors for ids 1–8 and 42 are in kb/81 R3 (Satchel #1: offset −1, body `#27160B`, swatch `#6B4631`). It replaces R2's seeded alloy (`research/spikes/ux/card_seed.mjs` stays as R2 evidence only).

### ChainRow · AddressDisplay · FundCard · Chips
| Component | Anatomy and props | States | A11y | Reference |
|---|---|---|---|---|
| **ChainRow** (the holdings; R2-D02) | `chain, networkLabel, balance, address, explorerUrl`.<br>• Line 1: the 32 px chain mark (chain colour on a `surface-raised` circle), the network label (`label`, `ink`), the balance on the right (`label`, tabular; the ticker `ink-muted`).<br>• Line 2: AddressDisplay (truncated below 1024; **grouped and full from 1024**), Copy, QR, and the explorer link on the right.<br>• Flat on `ground` with `line` hairlines, 72 px | loading amount · loaded · zero (Fund) · incoming (`frozen` `hourglass`) · stale/error (Retry) | `Item` whose heading is the network label. The explorer link names the site and adds an sr-only "(opens in a new tab)" | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) |
| **AddressDisplay** | `address, chain, mode: 'truncated' \| 'full' \| 'grouped', copy?, qr?`. `address` style (Spline Sans Mono 13/18/450, slashed zero).<br>• Truncated: prefix + 4 … 4 (`tb1qaanv…y8sd`, `0x53f9…1C2A`).<br>• Grouped: 4-character groups with 0.35em gaps; **the first two groups and the last group in `ink` 600, the middle groups in `ink-muted` 450**. Copying yields the raw string | default · copied (`check` for 2 s + toast) · QR open | Name: "This Satchel's Bitcoin testnet4 address {full}". The QR is `role="img"` with the full address | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a) |
| **FundCard** | A `surface` panel (`radius-md`): "Fund this Satchel" (`heading`), the `wallet.fundcard` line, **Copy {Chain} address** (the screen's brass), a QR icon button and the faucet link | only when every chain is zero | A region named "Fund this Satchel" | [Rainbow receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) |
| **Chip** (meta / chain) | `radius-sm`, `surface-raised`, padding 4 × 8 (meta) or 5 × 10 (chain); meta = `body-sm` `ink-muted` ("Token #1", "NEP-171", "NEAR testnet", "Testnet"); chain = 8 px dot + `body-sm` `ink` ticker (+ amount, tabular). On the card the chain chip uses `caption` | default · loading · zero · stale · error ("—") | The ticker text is always present; the dot is `aria-hidden` | canvas |

### AmountInput · RecipientInput · AccountInput
| Component | Behaviour | A11y | Reference |
|---|---|---|---|
| **AmountInput** | • **Display:** `balance-hero` (48/52; 36/40 below 480), centred, the ticker as a `heading` suffix in `ink-muted`; `inputmode="decimal"`; "," normalised to "."; **no custom keypad**.<br>• **Never wraps:** 48 → 36 → 28 px by length (36 → 28 below 480).<br>• **Below it:** "Available {balance}" (`body-sm`) + **Max** (a chip button: `radius-sm`, `surface-raised`, `label`, 44 px hit area); after Max, "Max leaves room for the network fee."<br>• **Validation:** positive · ≤ max sendable · no more decimals than the chain allows · BTC dust per recipient type (P2WPKH 294, P2TR 330, P2SH 540, P2PKH 546 sats; E-03) · SOL new account ≥ 650,240 lamports (E-02).<br>• **Max:** BTC Σ UTXOs − fee (no change output); EVM balance − 21000 × maxFeePerGas; SOL balance − 5000 lamports, leaving 0 or at least the rent minimum | Label "Amount in BTC"; the error links via `aria-describedby`; Max is a real button "Use maximum: 0.0122 BTC" | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984) |
| **RecipientInput** | • **Field:** "To" (`body-sm` `ink-muted` label), `surface-raised` + 1 px `line-strong`, `radius-sm`, 48 px; a per-chain placeholder; a trailing **Paste** text button (`navigator.clipboard.readText()` on click). Validate on blur and on paste.<br>• **Resolved row:** when valid, the input collapses into the chain mark, the full grouped address (two lines of mono), `check` + "{Network} address" and a clear `x` that returns focus to the input.<br>• **Satchel recognition** via the `lib/derive` address → token index (kb/90 §8.2): another Satchel shows its swatch + "Satchel #4"; this Satchel shows the `val.self` error.<br>• **Tiers:** Error (`danger` icon + text; blocks Review), Warning (neutral `triangle-alert` + text; Review requires "I checked this address"), Info (`info` + text). The value survives retries | Polite status "Bitcoin testnet4 address accepted". Errors appear inline with a fix (WCAG 3.3.3) | [Glow](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df), [Family Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1), [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef) |
| AccountInput + RecipientCard | NEAR account format, with a `view_account` existence check (debounced 400 ms). **Rejected:** self, missing accounts, the Satchel contract and the MPC account (R-18). An implicit 64-hex account is accepted with a note. RecipientCard: AccountAvatar + the account (`address`) + "Account found · owns {n} Satchels" | Status text in `aria-live="polite"` | [Uniswap transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) |

Recipient validation (unchanged from R2; kb/90 E-02/E-03):

| Chain | Accept | **Error** (blocks Review) | **Warning** (Review requires "I checked this address") | **Info** (static note) |
|---|---|---|---|---|
| BTC testnet4 | `tb1q…` (42 or 62 chars), `tb1p…` (62), `m…`/`n…`, `2…`. Validate with the **same call that builds the output script** (`address.toOutputScript(addr, networks.testnet)`) | `val.btc.mainnet` (`bc1…`/`1…`/`3…`) · `val.btc.regtest` · `val.btc.typo` · `val.self` | — | `val.btc.network` |
| EVM Sepolia | `0x` + 40 hex; mixed case must pass EIP-55 (`isAddress(a,{strict:false})` + `getAddress(a) === a`) | `val.evm.format` · `val.evm.typo` · `val.evm.zero` · `val.self` | `val.evm.nochecksum` · `val.evm.contract` (`eth_getCode`) | — |
| Solana devnet (P2) | base58 decoding to 32 bytes | `val.sol.format` · `val.sol.rent` (new account below 650,240 lamports) · `val.self` | `val.sol.pda` | — |
| Another Satchel's address | — | not an error: it resolves to the swatch + "Satchel #{n}" | — | — |

### ReviewCard (the exact outcome)
| Part | Spec | Source | Reference |
|---|---|---|---|
| Headline (`h1`) | `label` "Send" (`ink-muted`) over `balance-hero` "0.0100 BTC" (what the recipient gets); sub "to tb1q9x7k…4w · Bitcoin testnet4" (`body-sm`) | form | [Cash App withdraw](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) |
| OutcomeCard · From | A `surface-raised` group (`radius-md`): the token swatch, "Satchel #1", "−0.01000282 BTC", "amount + fee" (U+2212) | computed | [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) |
| OutcomeCard · To | The chain mark, "To", "+0.0100 BTC", the **full grouped address**, then `check` "Bitcoin testnet4 address" or the swatch + "Satchel #4" | form | [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) |
| Network fee (est.) | BTC in sats: `max(2, halfHourFee)` sat/vB, so 1 in / 2 out ≈ 141 vB ≈ **282 sats**. ETH: "< 0.000001 ETH" when tiny. SOL: 0.000005 SOL. Then "paid by this Satchel" | mempool fees, viem, a constant | [Binance "Fee Paid By"](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) |
| Satchel #1 after | balance − amount − fee | computed | [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) |
| NEAR fee | "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account" (kb/90 §8.9 verbatim); tooltip "Needs ≈ 0.1–0.3 NEAR free while signing (refunded)." | constants | — |
| Time | "Signing: usually about 10 seconds", then "Confirmation: minutes to hours on testnet4" / "about 12 seconds" (ETH) / "a few seconds" (SOL) | kb/90 §8.9 | [Coinbase "Send time"](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539) |
| BTC inputs note | "Uses {n} coins from this Satchel, so it needs {n} signatures." (only when n > 1) | UTXO selection | — |
| Warning-tier ack | `<input type=checkbox>` "I checked this address" (checked = `ink` fill); the CTA's description names it; warning tier only | validation | [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) |
| Finality line | "Bitcoin transfers are final. Check the address above." in `ink-muted`, directly above the CTA | — | [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) |
| CTA | **Send 0.0100 BTC** (brass; accessible name "Send 0.0100 BTC to tb1q9x7k…4w", WCAG 2.5.3). Pressed: "Preparing…" → "Approve in your wallet…" + hint; inputs lock; the label swaps in 120 ms with no width animation | — | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) |
| Helper | "Your wallet will ask you to approve a request to satchel.<team>.testnet." P2: a "What your wallet will show" disclosure (cut by default) | — | — |

A11y: a `<dl>`. A blocking warning disables the CTA (`aria-disabled`) and links to it with `aria-describedby`. The same ReviewCard, read-only, is the tracker's "Details". Variants: **Transfer review** (the card hero + stub + rows), **List** (inline in the Sell flow; reversible, so no separate review), **Buy** ("You pay −250.00 USDC ↓ You get Satchel #3, controlling 0.0123 BTC · 0.0500 ETH (verified balance)").

### SigningProgress (a tracker that becomes the receipt)
| Aspect | Spec | Reference |
|---|---|---|
| Props | `flow: 'send' \| 'list' \| 'buy' \| 'transfer' \| 'mint'; chain?; stage (kb/90 §8.6); startedAt; inputs?: number; nearTxHash?; chainTxId?; explorerUrl?; error?: MappedError`. **No `relay`** | — |
| Header | `heading` "Sending 0.0100 BTC", which becomes "Sent 0.0100 BTC" at `sent` (+ "to tb1q…y8sd"). The ETA line sits under it (`body-sm` `ink-muted`). **Minimize** (`minimize-2`) in the FlowShell header while non-terminal; ✕ once terminal. Tab title "(1) Signing… · Satchel" while the tab is in the background | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) |
| Rows (send) | 1. "Approved in your wallet" (done on entry).<br>2. "Signing with NEAR's signer network" → "Signed by NEAR's signer network" + NearBlocks.<br>3. "Broadcasting to {network}" → "Broadcast to {network}" + tx id, copy, link.<br>4. "Waiting for 1 confirmation" → "Confirmed" | [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) |
| Row states | • **future:** `circle-dashed`, `ink-muted`;<br>• **active:** `label` weight, the **`frozen` step indicator pulsing** (`--pulse`), the elapsed `m:ss` timer right-aligned (tabular, `aria-hidden`);<br>• **done:** `check` in `success`, past tense, a clock time `14:02:11` (`<time>`, UTC in `title`), evidence;<br>• **failed:** `circle-x` in `danger`, with the FailureCard inline under the row | [Emergent](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) |
| ETA line (kb/90 §8.6, D-16) | 0 s: "Usually about 10 seconds." (kept until 20 s) · ≥ 20 s: "Taking longer than usual." · ≥ 60 s: "Still working. The network allows up to about 2 minutes." · ≥ 150 s: "Still waiting for the network. We'll keep checking." | — |
| BTC inputs | "Signing {n} inputs" on the active row, with one timer (E-08) | — |
| Footer | • Before broadcast: `sign.keepopen` "Keep this tab open until it says Sent."<br>• From broadcast on: `sign.closeok` "You can close this tab. Activity keeps tracking it."<br>• The credit "Signatures by NEAR Chain Signatures" (`body-sm` `ink-muted`, UX-30).<br>• `▸ Details` (the ReviewCard, read-only) | [MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de) |
| Subset (list, buy, transfer, mint) | Three rows: Approve in your wallet → {Listing \| Buying \| Transferring \| Minting} on NEAR → {Listed \| Bought \| Transferred \| Minted}. For transfer and buy, the HandoffAnimation follows | — |
| Sent / confirmed | Row 4 shows the **static `frozen` ring** (`hourglass`, never pulsing) with `sent.note.{chain}` while unconfirmed. At `confirmed` it shows `check` "Confirmed" in `success`. Buttons: **Done** (brass) and View activity | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) |
| A11y | `<ol>` with `aria-current="step"`. One app-wide `role="status"` region announces step changes, the ETA changes at 20/60/150 s and the result, never the timer. Errors use `role="alert"` and move focus to the failure title; success moves focus to the "Sent" heading. Minimize keeps signing (module-level store) and shows the `sign.minimized` toast | — |

### PendingPill · PendingCard
| Aspect | Spec | Reference |
|---|---|---|
| Below 1024 | A 36 px pill centred under the top bar (`surface-raised`, `radius-pill`, `body-sm` `ink`). States: the pulsing `frozen` dot + "Sending 0.0100 BTC · 0:42"; `check` "Sent 0.0100 BTC" (160 ms cross-fade; hides after 5 s); `triangle-alert` (`danger`) "Signed, not sent · Broadcast now" (stays). Tap or Enter reopens the tracker | [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) |
| From 1024 | A 320 px card at the viewport's bottom-right: `surface-raised`, `radius-md`, `shadow-overlay`; title, step, timer, **View** | [WRITER](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) |
| A11y | A button with the full text. Changes are announced through the one status region. Its height joins `scroll-padding-top` | — |

### SignedNotSentCard · FailureCard
| Aspect | Spec | Reference |
|---|---|---|
| Structure (every failure) | 1. Title: what failed.<br>2. What moved and what didn't.<br>3. A conditional line for unknowns.<br>4. An evidence link.<br>5. One primary action | [Glow](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218), [Zomato](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700) |
| **SignedNotSentCard** | A banner (`surface-raised` panel; a `danger` `triangle-alert` + the title in `danger`; body in `ink`; calm words, never a red fill):<br>• "Signed, not sent";<br>• "{reason} Nothing has left Satchel #{id} yet.";<br>• `sign.notsent.explain`;<br>• **Broadcast again** (brass) and Details ▾ (nonce or inputs · amount · to).<br>For an EVM nonce gap, the button is replaced by `sign.notsent.gap`. The owner's pill reads **Needs attention** while one exists | [Phantom funds in transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165), [Posh](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af) |
| Where it shows | 1. The tracker's failing row. 2. The top of the Wallet tab (owner). 3. Activity's In progress group, with an inline **Broadcast now**. 4. The owner's CleanHistory row ("Unused · Broadcast now"). 5. The Send flow's unsent-intent guard. 6. The PendingPill | [Revolut pending card](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7) |
| Rebuild source | The local intent; otherwise the record's `unsigned_tx` (EVM) or the `sign_requested` event (BTC), per kb/90 §8.6 resume | — |

### Timeline (Activity)
| Aspect | Spec | Reference |
|---|---|---|
| Groups | In progress (pinned, client), then day groups (`label` `ink-muted`: "Today" · "Yesterday" · "Nov 10"), newest first | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d) |
| Row (canvas style) | • **Icon:** a 40 px chain mark for chain txs, or the token swatch for NEAR events, with an 18 px action badge (`surface`, a 12 px Lucide icon: `arrow-up` sent · `arrow-down` received · `arrow-left-right` transferred · `plus` minted · `tag` listed · `undo-2` delisted · `handshake` sold/bought · `triangle-alert` signed, not sent · `circle-x` failed).<br>• **Line 1:** `label` 14 `ink`, verb + counterparty ("Sent to tb1q…y8sd"; the address in `address`; or the swatch + "Satchel #4").<br>• **Line 2:** `body-sm` `ink-muted`, "network · time".<br>• **Right:** the amount (`label`, tabular; U+2212 out; `success` only for incoming) over the **status word, only when not final**, in its colour with its icon (Signing · In mempool · Signed, not sent · Failed · Unused).<br>• `line` hairline between rows.<br>• **Failed amounts:** `<del>` + sr-only "Failed:" | [Family](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b), [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3), brand canvas |
| One row per request | One `sign_requested` event = one "Sent" row; the event's structured payload names the recipient and amount. A standalone "Signature issued · {Chain}" row appears only when no chain tx matches: that is the Unused case | — |
| Detail | Inline expansion: Date · Status · Network · Type · Amount · Fee · From/To (Copy) · NEAR transaction · **named** explorer links · the final tracker for sends | [Phantom detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44) |
| Paging and footer | SSR first page + **Show older** (`?before=`); "Missing something? See every event on NearBlocks" | [Trust Wallet](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| A11y | `<ol>` under day `<h3>`s; relative time with absolute UTC in `title` and `<time datetime>`; expansion is a button with `aria-expanded` | — |

### CleanHistory (verdict → checks → grouped signatures → sources and freshness)
| Part | Spec | Reference |
|---|---|---|
| Props | `aggregate: Aggregate; checkedAt; sources: {chain, provider, ok}[]; oneOfTwo: boolean; role: 'dev' \| 'rc' \| 'final'; checks: {name, result, ok}[]; items: {seq, chain, key, wouldPay, amountSource: 'chain' \| 'claimed', evidence, evidenceUrl, status: ItemStatus \| 'checking', signedAt, requester}[]; viewer: 'buyer' \| 'owner'; hint?: {aggregate, at}` | — |
| **Verdict** | • The eyebrow "Clean history" (`label`, `ink-muted`).<br>• The verdict sentence with its icon in the state colour (`heading` at 390, `title` from 1024; kb/81 R3 §State mapping).<br>• Meta: "Checked in your browser {t} ago · {n} signatures · Sources ▾" (`body-sm`).<br>• The trust line (`monitor-check`): "Runs in your browser. Satchel's server isn't trusted for this."<br>• A neutral "1 of 2 sources" chip (`info`) when H-25 applied | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [CRED verification](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b) |
| **Checks** | Name + result rows with `circle-check` / `circle-x`: "Contract keys: none since birth (block {A})" · "Code: matches the published build" · "Ethereum address: no delegated code" · "Solana account: plain wallet" (P2). `dev` role: a neutral warning row "Dev contract: lock and code checks skipped" | [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549) |
| **Signatures** | Grouped: **Needs attention ({n})** (Unused, Settling, Can't verify) first, then **Can't move coins ({n})** (Settled, Expired, Unfunded). Three rows, then "Show all {n}" | [1Password grouped](https://mobbin.com/screens/f0dc40a5-1e3c-4698-b108-7f55eed340aa) |
| CleanHistoryRow (≈ 72 px) | • **Title** (`label`): "{Chain} · nonce 3" / "{Chain} · coin 7d…e2:1" / "{Chain} · blockhash 9f…".<br>• **Line 2:** "Would send 0.0100 ETH to 0x53f9…1C2A". BTC amounts come from the chain; otherwise "(claimed)" (R-23).<br>• **Line 3, evidence:** "Nonce 3 used by 0x8b…41 · 3 confirmations" + link.<br>• **The item pill** on the right (kb/90 §7.3 words: Settled · Expired · Unfunded · Settling · Unused · Can't verify).<br>• **Expand:** signed at block and time (UTC) · requested by · sources · amount source.<br>• **Owner view:** **Broadcast now**, or the nonce-gap note, on Unused rows | [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Trust Wallet nonce](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35) |
| Unfunded row | Neutral (`ink-muted`, `info`); the kb/90 §7.3 copy verbatim | — |
| **Sources** | Per chain, e.g. "Bitcoin: mempool.space ✓ · mempool.emzy.de ✓" (icons), plus the one-source note. **Disagreement shows as Can't verify, never as "1 of 2"** | [Better Stack](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) |
| Checking and the two phases | • **SSR:** the server hint in `ink-muted` ("Server check {t} ago: clean") + "Waiting for your browser's check".<br>• **Client:** rows render from `sig_records` and resolve one by one as real results land (no fake stagger; 160 ms word swap).<br>• A silent re-check every 10 s; only verdict changes are announced | [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) |
| How Satchel checks this | The kb/90 §7.7 badge promise **verbatim**, then "What it doesn't cover" (the kb/90 §4 list) and "README disclosure". In the server HTML; it is the ProofChip's touch target | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) |
| A11y | The header is `role="status"` and announces verdict changes only. Rows are a `<ul>`; every status is a word; "Show all" is a disclosure button. The anchor `#clean-history` is the ProofChip's target | — |

### ProofChip · GateLine · FreezeBanner
| Component | Spec | Reference |
|---|---|---|
| **ProofChip** (B-07; replaces the Hallmark) | A `radius-pill` chip on `surface-raised`: an icon + a word + a time, as a **link** to its report section.<br>• **Clean history:** `shield-check` in `success` + "Clean history · checked 12 s ago" → `#clean-history`.<br>• **Verified balance:** `coins` in `ink` + "Verified balance · read 8 s ago" → `#you-get`.<br>• Desktop tooltip (hover and focus, dismissible with Esc, WCAG 1.4.13): kb/90 §7.7 verbatim, or the verified-balance definition. On touch it is just the link (R2-D11).<br>• **Never bare** (no word without a time); at most two per view. No assay or hallmark motif, no stamp on the card | [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) |
| **GateLine** | One line that repeats the verdict, directly above Buy (desktop) or as the StickyBuyBar footnote (mobile), icon + words:<br>• `shield-check` "Clean history · checked 8 s ago";<br>• `loader-circle` "Checking history…" / "Waiting for your browser's check";<br>• `hourglass` "Settling: 1 signature";<br>• `shield-alert` "Blocked: 1 unused signature";<br>• `triangle-alert` "Can't verify 1 signature";<br>• `shield-x` "Unsafe: {reason}".<br>Buy's `aria-describedby` points to it | [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) |
| **FreezeBanner** | A banner (`surface-raised`, `radius-md`): `snowflake` and the title "Signing paused while listed" in `frozen`; body in `ink`.<br>• **Owner:** "No coins can leave Satchel #{id} until you delist it or it sells. Anyone can still fund it." + a **Delist** text button.<br>• **Buyer:** "The seller can't sign anything new, so the history below is final for this listing."<br>On every Satchel tab while listed. **Never** a countdown, a progress bar, "Safe to buy in…" or "Buyable in…" (E-37). A `role="region"` named by its title, with no live updates | [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb), [Lloyds](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21) |

### HandoffAnimation + Receipt (the signature moment, B-06)
| Aspect | Spec | Reference |
|---|---|---|
| Props / states | `from, to, tokenId, balances, direction: 'give' \| 'receive'` · idle · lifted (awaiting the tx) · moving · landed · reduced | — |
| Choreography | It runs **only after the final success** (never optimistic). Lift (`spring-lift`), 6° tilt, the slide to the recipient (`spring-handoff`, ±1 % at 659 ms ≈ 700 ms), land; **the stitch draws in on the receiving card** (300 ms). Whole sequence ≈ 1.1 s (Motion spec) | brand |
| End frame | • The card under the recipient's avatar, stitched (it marks the new owner, named there).<br>• The "Transferred" pill (`success`, `circle-check`) fades in (160 ms).<br>• The two neutral avatars overlap.<br>• **The sentence is the hero**, then the Receipt | [Family collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) |
| Receipt | Key/value rows without rules: From · To · NEAR transaction (copy, link) · Time (UTC). A buy adds Price · Seller · Listing #{id}. The same component serves Sent, Sold and Minted | [Wealthsimple](https://mobbin.com/screens/03537080-3a52-4b30-90f4-482c89dd47f8) |
| A11y | A polite live region: "Transfer complete. bob.testnet now controls 0.0123 BTC and 0.0500 ETH." Focus moves to the sentence. Under reduced motion: a 200 ms cross-fade with the same text, and the stitch simply appears | — |

### StatusPill · Chip · Banner
| Component | Use | Spec | Reference |
|---|---|---|---|
| **StatusPill (page)** | The Satchel's own state, and clean-history item pills | `radius-pill`, `surface-raised`, padding 5 × 11, text 13/18 at 600 (the canvas pill size: `label` weight at `body-sm` size, derived), the state glyph (14 px) + the word, both in the state colour (kb/81 R3 §State mapping; Listed uses `brand-ink` + `brand-line`) | canvas |
| **StatusPill (band)** | The state on the card's brass band | `band-pill` fill, `brand-bright` `caption` at 600, the glyph (12 px) in the Night state colour, padding 4 × 10 | canvas |
| **Chip** | Identifiers and chains | `radius-sm`, `surface-raised`, `body-sm` (§Chips above) | canvas |
| **Banner** | FreezeBanner, SignedNotSentCard, the blocked verdict, `banner.rpc-down`, the D-08 soft guard | `surface-raised` panel, `radius-md`, padding `space-4`; 20 px icon + `label` title in the state colour; body `ink`; at most one action. No tints, no coloured borders | brand |
| RoleStrip | `dev` / `rc` contract roles. **Removed** (D-52) | A full-width strip under the nav: `surface-raised`, a neutral `triangle-alert` + "Dev contract: lock and code checks skipped" / "Release candidate: testnet rehearsal" (`body-sm` `ink`) | [Dialpad](https://mobbin.com/screens/6f48b680-0e25-4201-bfef-5b979d0a7029) |

### Sale, market and mint components (brief)
| Component | Spec | Reference |
|---|---|---|
| ListChecklist | Rows of icon + name + one-line result + an action:<br>• **required:** quiet period (`hourglass`, `frozen`), USDC registration;<br>• **advisory:** past signatures, which expands to the Unused rows with **Broadcast now** or the nonce-gap note.<br>The quiet-period row has a thin `role="progressbar"` track (`brand-line` on `line`; `aria-valuetext="107 of 250 blocks, about 1 minute 20 seconds left"`) | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273) |
| ListingForm | Currency segmented control → a `title`-size price input → the "Buyer gets" helper → `<dl>` rows ending in a bold **You receive** → "While it's listed" → **List for {price}** (brass, pinned below 768) | [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0) |
| ListedPanel | "Listed for {price} · Listing #{id}" (`label`) + **Delist** (secondary) + the note + "To change the price, delist and list again." | [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) |
| BuyBlock | "Buy for" (`body-sm` `ink-muted`) / the price (`title`, tabular) / "Listing #{id} · listed {t} ago by {seller}" / GateLine / **Buy for {price}** (brass; from 1024); the StickyBuyBar below 768 | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) |
| ListingChanged | An inline interstitial in place of the BuyBlock: old → new listing, **Review new listing** · Cancel | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| MarketCard | The `md` brand card (its band shows the name and the Listed pill; its body the total and chips) + the price (`label`, tabular) + the verdict hint with its age (GateLine style), linking to `/s/[id]/sale`. No extra border around the card | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) |
| MintBar | "You get" · "Deposit" (`body-sm` labels, `label` values) · the brass CTA in one bar; the same layout when not connected | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) |

### Shell components (R3)
| Component | Spec |
|---|---|
| **FlowShell** | Props: `title`, `step?: {index, count}`, `closeHref` (`/s/[id]` or `/`), `minimize?: boolean`, `children`, `action`. Below 768: a bottom sheet (`100dvh − 16px`, top corners `radius-card`); from 768: a centred 480 px dialog (max height `100dvh − 96px`). Both: `surface`, `shadow-overlay`, 1 px `line`, over `scrim`; header 56 px (✕ or ↙ Minimize, the `heading` title, the 2 px progress line in `brand-line` on `line`); scrolling content; a pinned action area (16 px gutters, full-width primary). The background page is `inert` + `aria-hidden`; focus moves to the title on open and is trapped; Esc = close (or Minimize while non-terminal); close replaces the URL with `closeHref`. Body scroll is locked. Enter: sheet slides up / dialog fades and scales 0.98 → 1 in 200 ms (`--duration-sheet`); reduced motion: fade only. Built on the Dialog/Drawer primitive, with no drag-to-dismiss (WCAG 2.5.7) |
| **NavShell** | §NavShell above. The NavSheet reuses the FlowShell's sheet (no progress line, no pinned action) |
| **ThemeControl** | A `radius-pill` segmented control "System · Night · Day" with `monitor` / `moon` / `sun`; radiogroup semantics with arrow keys; writes `localStorage["satchel:theme:v1"]` (absent = System) and updates `data-theme` and `theme-color` in place (kb/81 R3 §Theme switching). Hidden in P1 |
| **AccountPill / AccountAvatar** | Avatar: a `surface-raised` circle (20 / 32 / 40 px) with the account's first letter (Bricolage 600, `ink`) and a 1 px `line-strong` ring; no hashed colours. Pill: avatar + the account id (`address` 13, middle-truncated past 24 characters) + 1 px `line-strong`, `radius-pill`; it opens the account menu |

### Controls (brief)
| Control | Spec | Reference |
|---|---|---|
| ChainSelect | A `radius-pill` track in `surface-raised`; segments `label` `ink-muted`; the selected segment `surface` + 1 px `line-strong` + `ink`. 44 px below 1024, 36 px from 1024. Segments read "• BTC 0.0123". Radiogroup semantics with arrow keys | [Phantom tabs](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) |
| NavTabs | Underline links: active `ink` + a 2 px `brand-line` indicator; inactive `ink-muted`; `label`; `aria-current="page"` | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) |
| Buttons | Brass primary (once per screen) · outline secondary · danger outline · text button · round action (kb/81 R3 §Interaction states) | brand |
| Toast | `surface-raised`, `radius-md`, `shadow-overlay`; a 16 px state icon + five words or fewer (`label`/`body-sm` `ink`); one at a time. Below 768: above the pinned bar. From 1024: top-centre of the main column. The Base UI Toast `title` carries the message | [Phantom "Sent"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) |
| Empty / Skeleton | **Centred** empty states (the only centred layout): the brand glyph (56 px) + one sentence + one brass CTA. Static `surface-raised` skeletons. Waits longer than 2 s name their steps | [Coinbase Wallet empty](https://mobbin.com/screens/1fc3c65f-b166-44c7-a230-f2c4ea18d729) |
| Loading mark | The brand glyph (brass on Night, leather on Day), 32–56 px, opacity pulse (`--pulse`), never rotated; static + "Loading…" under reduced motion | brand |

## State machines

### Data sources (aligned with kb/90)
| Data | Source (kb/90) | Refresh |
|---|---|---|
| Owner | `nft_token(token_id)` (NEP-171) | SSR; 15 s on the page; after every tx |
| Owned tokens; tokens of a recipient | `nft_tokens_for_owner`, `nft_supply_for_owner` (NEP-181) | on connect; after mint, transfer and buy; Transfer's RecipientCard |
| Satchel state: `sig_count`, `last_sign_height`, `listable_at`, `listing{id, price, currency, listed_at, sig_count}` | view `satchel(id)` (§5.14) | 5 s while Signing or listed; 15 s otherwise; **re-read synchronously right before Buy** |
| Quiet-period length | `config().cooldown_blocks` (250) | once |
| Height and block time | RPC `block` (finality `final`), average of the last 100 blocks (0.554–0.573 s) | 1 s while the quiet-period row is visible |
| Signature records | `sig_records(id, from_seq, limit ≤ 50)` | Sale tab; the contract watcher every 2 s while signing (kb/90 §8.6) |
| NEAR events (Activity) | FastNEAR tx API `/v0/account`, `/v0/transactions` | SSR first page; 15 s |
| Clean history | browser checker `lib/clean-history` (§7); server **hint** `GET /api/clean-history/[id]` (15 s cache) | every 10 s on the Buy tab, plus synchronously right before Buy |
| Addresses | own derivation `lib/derive` (noble; no chainsig.js) | never (SSR) |
| BTC balance, UTXOs, fees, status, broadcast | mempool.space testnet4 (+ mempool.emzy.de for `/outspends`) | 15 s; tx status every 30–60 s |
| ETH balance, nonce, fees, receipt, broadcast | Sepolia through viem (4-endpoint fallback) | 15 s; receipt every 3 s |
| SOL (P2) | devnet RPC | 15 s; status 1 s; blockhash refreshed every 10 s on Review |
| Signing progress | contract watcher (`sig_records` at seq ≥ s0, matched by payload) + `trackTx` long-poll (FastNEAR, dRPC failover) | 2 s / long-poll |
| NEAR account exists | `view_account` | debounced 400 ms |
| Buyer USDC balance; seller USDC registration | `ft_balance_of`, `storage_balance_of` | on the Sale tab |
| **Mainnet prices (R3, if UX-1's default stands)** | `GET /api/prices` → 1Click `GET /v0/tokens` (keyless, CORS `*`), CoinGecko `/simple/price` fallback (kb/50 §Price route, both fetchers verified) | 60 s server cache; the client re-reads every 60 s. On failure: no fiat anywhere ("{n} chains"), never a stale number |
| Theme override | `localStorage["satchel:theme:v1"]` | read before first paint (head script) |
| ~~1Click quotes, worker, indexer, `satchel_state`, `sig_log`~~ | cut or renamed (kb/90 §13 E-12, E-13, E-17; D-19, D-20) | — |

### SigningProgress (send): R3 presentation of kb/90 §8.6
The intent is persisted **before** the wallet opens: `localStorage["satchel:pending:v1"]` (`PendingIntent`, kb/90 §8.6). Stages and exits are kb/90's; this table adds what the UI shows. R3 changes only the look (the `frozen` pulse, icons instead of glyphs, the FlowShell).

| Stage (kb/90 §8.6) | Enter when | UI | Copy keys | Exits |
|---|---|---|---|---|
| `idle` | Review shown | ReviewCard; CTA **Send {amount}** (brass) | `send.review.*` | CONFIRM → `preparing` |
| `preparing` | Send tapped | The CTA reads "Preparing…" in place; inputs lock | `sign.step.prepare` | intent persisted → `awaiting_wallet`; error → `failed` |
| `awaiting_wallet` | the wallet call started | CTA "Approve in your wallet…" + `send.review.wallet-hint`; at 60 s, `sign.wallet.slow` | `sign.step.wallet` | record seen at seq ≥ s0, or a hash → `signing`. Rejected with **no record within 10 s** → `cancelled`. Intear "Failed to send transaction 1: Timeout" is **not** a rejection: keep watching |
| `signing` | a record exists or the hash is known | **The tracker appears.** Row 1 `check` "Approved in your wallet" with its clock time; row 2 active with the **pulsing `frozen` indicator**, the timer and the ETA line; BTC "Signing {n} inputs"; the PendingPill/Card; the band pill reads Signing | `sign.step.mpc`, `sign.mpc.0` / `.20` / `.60` / `.150`, `sign.mpc.inputs` | all records `signed` → `signed`. Any record `failed` → `timed_out`. A contract panic → `failed`. No terminal state by `h0 + 250` → `unknown` |
| `signed` | every signature in hand | Row 2 `check` "Signed by NEAR's signer network" + NearBlocks | — | local verify OK → `broadcasting`; verify fails → `failed` (E22) |
| `broadcasting` | verified | Row 3 active (pulsing) | `sign.step.broadcast` | OK → `sent`; error → `signed_not_sent`; SOL `lastValidBlockHeight` passed → `expired` |
| `sent` | chain tx id known | The header flips to "Sent {amount}". Row 3 `check` + tx id. Row 4 shows the **static `frozen` ring** and `sent.note.{chain}`. `sign.closeok`, **Done** / View activity, and the exit toast | `sign.done`, `sent.note.*`, `sign.closeok`, `toast.sent` | confirmations → `confirmed` |
| `confirmed` | 1 confirmation | Row 4 `check` "Confirmed" (`success`) | `sent.confirmed` | — |
| `cancelled` | wallet rejected, no record | Back on Review; the message is inline under the CTA; the form is kept (WCAG 3.3.7) | `sign.cancelled` | **Try again** → `preparing` |
| `timed_out` | record `failed` | Row 2 `circle-x` + FailureCard. **Try again reuses the nonce or inputs** (kb/90 §8.7) | `sign.timeout`, `.cond`, `.retry.{chain}` | **Try again** → `preparing` |
| `signed_not_sent` | broadcast failed, or a reload found a signature with no chain tx | Row 3 `circle-x` + SignedNotSentCard; the owner's pill reads **Needs attention**. Also shown on the Wallet tab, in Activity, in CleanHistory (owner), on Send and in the PendingPill | `sign.notsent`, `.explain`, `.gap` | **Broadcast again** → `broadcasting` (same signed tx, no new signature) |
| `expired` (SOL) | the blockhash expired before broadcast | Row 3 `circle-x` + FailureCard | `sign.sol.expired` | **Try again** rebuilds with a new blockhash |
| `unknown` | 250 blocks with no terminal state | Row 2 `circle-question-mark` (neutral) + FailureCard. **Never labelled "failed"** | `sign.unknown` (E12) | **Check again**; NearBlocks |
| `failed` | a mapped error | The failing row `circle-x` + its Error-map entry | E-map | per entry |
| *resume* | page load finds a non-terminal intent | Reopen at the stored stage (kb/90 §8.6 resume). A signed record with no chain tx shows the SignedNotSentCard **on any device** | — | — |

Rules (kb/90 §8.7):
- A new send while an earlier intent for the same token and chain isn't `sent` or `confirmed` shows the Send flow's unsent-intent guard.
- **Minimize is not cancel.** The store lives at module level, so in-app navigation keeps signing. Closing or reloading the tab leaves a signed intent that needs **Broadcast now**.

### Clean history (kb/90 §7.3): item → pill; aggregate → verdict → Buy
| Item status | Pill (word · token · icon) | Evidence line (copy) | Blocks Buy |
|---|---|---|---|
| `spent` | Settled · `success` · `circle-check` | "Nonce {n} used by {tx} · {k} confirmations" / "Spent in {txid}" / "All {n} inputs spent" | no |
| `expired` | Expired · `success` · `clock` | "Blockhash expired. It can't be used." | no |
| `unfunded` | Unfunded · neutral · `info` | "Spends coins that don't exist. If they ever appear at this address, the previous owner could move them; they're excluded from what you buy." (kb/90 verbatim) | **no** (D-04) |
| `settling` | Settling · `frozen` · `hourglass` | "Spent in {txid}. Waiting for {k} more confirmation." | yes |
| `unused` | Unused · `danger` · `triangle-alert` | "Nonce {n} not used yet" / "{txid}:{vout} unspent" / "Blockhash still valid" | yes |
| `unknown` | Can't verify · neutral · `triangle-alert` | "Providers disagree" / "No provider answered" / "Too many coins to verify in the browser; ask the seller to consolidate." | yes |
| (UI) `checking` | Checking… · neutral · `loader-circle` | "Checking…" | yes, until it resolves |

| Aggregate (kb/90 §7.3) | Condition | Verdict key | GateLine | Buy |
|---|---|---|---|---|
| `checking` | any item checking | `clean.verdict.checking` | `loader-circle` "Checking history…" | disabled |
| `empty` | `sig_count == 0` and the accounts are OK | `clean.verdict.empty` | `shield-check` "Clean history · checked {t} ago" | **enabled** |
| `clean` | every item `spent`, `expired` or `unfunded` | `clean.verdict.clean` (+ the "1 of 2 sources" chip under H-25) | `shield-check` "Clean history · checked {t} ago" | **enabled**; `buy(listing_id, expected_sig_count = sig_count read in step 1)` |
| `settling` | any item settling | `clean.verdict.settling` | `hourglass` "Settling: {n} signature" | disabled |
| `blocked` | any item unused | `clean.verdict.blocked` | `shield-alert` "Blocked: {n} unused signature" | disabled, **no override** |
| `unknown` | any item unknown | `clean.verdict.unknown` + **Check again** | `triangle-alert` "Can't verify {n} signature" | disabled |
| `unsafe` | an account check fails; or, for roles `rc`/`final`, the contract has keys, doesn't exist or its code hash mismatches | `clean.verdict.unsafe.*` | `shield-x` "Unsafe: {reason}" | disabled, **no override** |

Gate modes (`NEXT_PUBLIC_CONTRACT_ROLE`, kb/90 §7.3): `dev`: the RoleStrip shows `role.dev`, and lock/code-hash failures become the neutral warning row in Checks · `rc`: the RoleStrip shows `role.rc`; strict gate · `final`: no strip; strict gate. Since D-52 no role shows a strip; dev's warning row in Checks stays (kb/90 E-55).

### Sale flow (kb/90 §5.10, §5.12): list → listed → buy. No cooldown.
| State | Contract (`satchel(id)`) | Owner UI | Buyer UI | Transition | Guard / error |
|---|---|---|---|---|---|
| Active, quiet period | `listing == None`, height < `listable_at` | Sale tab: "You can list in {n} blocks (~{t})"; the Sell flow's quiet-period row + track; **List disabled** | "isn't for sale" | height reaches `listable_at` | `ERR_QUIET_PERIOD` (E33) |
| Active, listable | `listing == None` | **List for sale…** → the Sell flow: checklist (required rows ✓; advisory rows may show ✕) + ListingForm | — | `list(price, currency)` → Listing… | `ERR_ALREADY_LISTED`, `ERR_PRICE`, `ERR_CURRENCY` |
| Listing… | tx in flight | The CTA narrates | — | success → Listed | rejection shown inline |
| **Listed** | `listing` set | The Listed pill + ListedPanel + FreezeBanner (owner); Delist is the brass in the ActionRow | The Listed pill + BuyBlock + CleanHistory + FreezeBanner (buyer). **Buy only if `clean`/`empty`, from the first block** | `delist` → Active. `buy(token_id, listing_id, expected_sig_count)` (NEAR, attached == price) or `usdc.ft_transfer_call(…, msg {"buy":{token_id, listing_id, expected_sig_count}})` → Buying… | `sign_for` → `ERR_FROZEN` (E4); `nft_transfer` → `ERR_LISTED` (E34) |
| Buying… | buyer tx in flight | — | In-button: "Re-checking history…" → "Approve in your wallet…" → "Buying…" | success → Sold. `ERR_LISTING_CHANGED` → the interstitial. USDC `SuccessValue "0"` → refunded | `ERR_NOT_LISTED`, `ERR_WRONG_AMOUNT`, `ERR_SELF_BUY`, `ERR_CURRENCY` |
| Sold | owner = buyer, listing cleared | Seller: the Sold pill + receipt (+ **Withdraw** if `payout ok:false`); no stitch | The reverse handoff; the stitch appears for the buyer | — | — |
| Delisted | `delist` succeeded | Toast; the Active pill; the ActionRow re-enables | The listing disappears | — | — |

### Transfer (P1)
1. **`recipient`**: the account is valid and exists, and is not self, the contract or the MPC account.
2. **`review`**: the D-08 soft guard shows if an intent is in flight.
3. CONFIRM → **`awaiting_wallet`**: the card is lifted (`shadow-overlay`).
4. SUBMITTED → **`processing`** (trackTx).
5. SUCCESS → **`handoff`** (≈ 1.1 s; the stitch draws in on the receiving card) → **`done`** (receipt).

Failures: REJECTED → `review` with `xfer.cancelled` · `ERR_LISTED` → `xfer.blocked.listed` · `ERR_BAD_RECEIVER` → `xfer.err.contract` / `.mpc` · `ERR_NOT_OWNER` → E3 · RPC → retry. The handoff never runs optimistically.

### Mint (P1)
1. **`ready`** (the same layout whether connected or not; the stitched preview).
2. CONFIRM → **`awaiting_wallet`** → **`minting`** (trackTx).
3. SUCCESS → **`done`**: the band name swaps to "Satchel #{id}" (160 ms) and the body takes the token's leather. No reveal animation.

Failures: REJECTED → `ready` with `mint.cancelled`; deposit too small → E6; RPC → retry.

## Copy deck
Rules (the brand's content fundamentals, with the corrections table applied):
- **Words.** The audience is crypto-native: Bitcoin, address, signature and confirmations are fine. Plumbing words are not: never show derivation path, MPC, yield/resume, `domain_id`, Tgas, yoctoNEAR, payload, freeze flag, `ERR_*` or `cooldown_blocks`, except the path inside VerifyDisclosure and on `/contract`.

  | Say | Never say |
  |---|---|
  | This Satchel's Bitcoin address | derivation path, `satchel/7/btc` (outside Verify and `/contract`) |
  | Signing with NEAR's signer network | MPC, yield/resume, domain_id |
  | Network fee ~282 sats | Tgas, yoctoNEAR, payload |
  | Signing paused while listed | freeze flag, `ERR_FROZEN`, "Frozen" as a Satchel state |
  | You can list in {n} blocks (~{t}) | cooldown, "Safe to buy in {n} blocks" |
- **Tone and case.** Sentence case everywhere, never all caps ("Send Bitcoin", "Listed", "Connect wallet", "Clean history"). Active voice. No apologies and no "Oops".
- **One verb per action across the flow** (the button, the progress, the toast):
  - Send → Sending → Sent;
  - Transfer → Transferring → Transferred;
  - List → Listing → Listed; Delist → Delisting → Delisted;
  - Buy → Buying → Bought ("Satchel #{id} is yours.");
  - Mint → Minting → Minted;
  - **Fund** (never Receive or Deposit; the `arrow-down` icon).
- **Names.** "Satchel #1" everywhere (no zero-padded serial, no engraving). Every `{n}` string uses ICU plurals.
- **Chains.** Until S-11 ships, P1 strings name only Bitcoin and Ethereum. The exception is the verbatim kb/90 §7.7 badge promise.
- **Failures say what happened and what to do**, in this order: title → what moved and what didn't → a conditional line where the app can't know → evidence → one action.
- **Never say "no signature exists"** (kb/70 F16, D-16), never "no signature was created", and **never "no funds moved" after a timeout** (brand correction). "Nothing was signed" is allowed only where no record can exist (`sign.cancelled`, which requires no record within 10 s; errors raised before `sign_for` writes a record). Once a record exists, say "Nothing was sent" and add the conditional line. Never call `unknown` "failed".
- **Waiting copy gives a time, at the measured thresholds:** 0 s "Usually about 10 seconds.", 20 s, 60 s and 150 s (kb/90 §8.6). Not the brand sample's "Usually under a minute" / 90 s.
- **No relay copy** (D-12): never "Satchel broadcasts it for you", never "You can close this page" before broadcast, never "Closing won't cancel".
- **Also forbidden:** cooldown copy of any kind (E-37); approvals or delegates (D-07, D-13); "Pay with" (D-14); fiat anywhere except the labelled card total.
- **Glyphs are icons, not characters** (kb/81 R3 §Iconography): the strings below carry words only; the icon is part of the component.
- **One file.** Keep the strings in `lib/copy.ts`, keyed as below, so the design lead can edit them without touching components.

Brand sample copy corrected by product facts (`brand/README.md` table, applied):

| Brand sample | Satchel copy | Evidence |
|---|---|---|
| "Safe to buy in 143 blocks (~2 min)" | No wait between listing and buying. Before listing only: "You can list in {n} blocks (~{t})" | D-05 rev 2; kb/90 §8.9 |
| "Usually under a minute"; "Still working…" at 90 s | 15 / 20 / 60 / 150 s thresholds, starting "Usually about 10 seconds." | kb/10; kb/90 §8.6; D-16 |
| "Nothing was sent and no funds moved. Try again." | `sign.timeout`: "The signer network did not return a signature. Nothing was sent." + the conditional line | kb/70 F16; kb/90 §8.6 |
| "Network fee ~0.00002 BTC" | "Network fee ~282 sats" (1–2 sat/vB on testnet4) | kb/30; kb/90 §8.9 |
| `frozen`: "Frozen while listed or in cooldown"; states Active / Frozen / Listed | Listed = signing paused (one state); pills Active · Signing · Listed · Sold + Needs attention | D-05 rev 2; kb/90 §5.10 |
| "$4,812.40"; "≈ $61.20" | Fiat only as "≈ $X · at mainnet prices" on the card (UX-1) | kb/50; checklist §6 |

### Formatting
| Thing | Rule | Example |
|---|---|---|
| BTC | Up to 8 decimals, minimum 4, trailing zeros trimmed; fees in sats | `0.0123 BTC`, `~282 sats` |
| ETH | Up to 6 decimals; below that, `< 0.000001 ETH` | `0.0500 ETH` |
| SOL | Up to 6 decimals | `1.2000 SOL`, `0.000005 SOL` |
| NEAR | Up to 4 decimals; below that, `< 0.0001 NEAR` | `≈ 0.004 NEAR` |
| USDC | 2 decimals | `250.00 USDC` |
| **Fiat (R3)** | 2 decimals, US dollars, always "≈" and always with "at mainnet prices" (in the app; the landing art drops the label, D-52); below $0.01 "< $0.01"; only on the card total | `≈ $1,148.72` |
| Rounding | Balances round **down**; Max uses exact base units | — |
| Numerals | `tabular-nums` on every amount | — |
| Signs and spacing | `−` (U+2212) for outgoing, `+` for incoming; a no-break space (U+00A0) before the ticker | `−0.0100 BTC` |
| Time | Relative ("12 s ago") with absolute UTC in `title` and `<time>`. **Inside flows** (tracker, receipt), clock times `14:02:11` (R2-D25) | — |
| Blocks | "{n} blocks (~{t})" from the measured 100-block average | `143 blocks (~1 min 20 s)` |
| Accounts | Full if 24 characters or fewer; otherwise middle-truncate; `address` style | `satchel-buyer.testnet` |
| Network labels | Bitcoin testnet4 · Ethereum Sepolia · Solana devnet · NEAR testnet | — |
| Tab titles | "{page} · Satchel"; background signing "(1) Signing… · Satchel" | "Send Bitcoin · Satchel" |

### Strings
**Global**

| Key | String |
|---|---|
| `app.badge` / `.tip` | "Testnet" / "Satchel runs on NEAR testnet, Bitcoin testnet4 and Ethereum Sepolia. Coins here have no value." (P2: "…, Ethereum Sepolia and Solana devnet") |
| `nav.*` | My Satchels · Market · Mint · Activity (only if built) · Contract facts · Menu · Connect wallet · Connecting… · Copy account ID · View on NearBlocks · Disconnect |
| `theme.*` | "Theme" · System · Night · Day |
| `title.*` | "{page} · Satchel" · `title.signing` "({n}) Signing… · Satchel" |
| `role.dev` / `role.rc` | "Dev contract: lock and code checks skipped" / "Release candidate: testnet rehearsal" (kb/90 §7.3 words, in sentence case). Deleted with the RoleStrip (D-52); the dev words stay in `clean.checks.dev` |
| `banner.rpc-down` | "NEAR testnet isn't responding · {duration} · Showing data from {time}" + **Retry** |
| `banner.offline` | "You're offline. Showing the last data loaded." |
| `footer.*` | Product: My Satchels · Market · Mint. Verify: Contract facts · NearBlocks · Repo · README. Hackathon: NEAR Hackathon · Demo video. Bottom row: `footer.testnet` "Testnet only. Coins here have no value." (app only; the landing drops it, D-52) · `footer.note.clean` "¹ Clean history is checked in your browser by reading each chain. The contract doesn't enforce it." · `footer.note.fiat` "Dollar totals use mainnet prices for the same coins." (only if UX-1's default stands) · the theme control |
| `toast.*` | "Bitcoin address copied" · "Ethereum address copied" · "Account ID copied" · "Transaction ID copied" · "Token ID copied" · "Link copied" · `toast.sent` "Sent {amount} · in mempool" (BTC) / "Sent {amount}" |

**The card**

| Key | String |
|---|---|
| `card.name` | "Satchel #{id}" · mint preview "New Satchel" |
| `card.total` / `.note` | "≈ {fiat}" / "at mainnet prices" |
| `card.total.none` / `.note.none` | "{n} chains" / "Balances below" (no prices, or a balance unavailable) |
| `card.chip` | "{TICKER} {amount}" · unavailable "{TICKER} —" |
| `card.svg.sigs` / `.sub` | "{n} signatures" / "recorded on NEAR testnet" |
| `pill.*` | Active · Signing · Listed · Sold · Needs attention |

**Landing and Home**

| Key | String |
|---|---|
| `home.hero` | Eyebrow "NEAR Chain Signatures · testnet". H1 (UX-32) "One strap, every chain." (alternative "An NFT that is a wallet."). Lead "Satchel is an NFT that is a wallet. Each one controls its own Bitcoin and Ethereum addresses; transfer the NFT and you hand over the wallet." (P2: "Bitcoin, Ethereum and Solana"). **See Satchel #1** · **Connect wallet**. Under the card "Read {t} ago". Note "Testnet only. Coins here have no value." |
| `how.1..3` | 1 **Mint a Satchel**: "The NFT gets its own Bitcoin and Ethereum addresses. They're derived from the NFT, so they never change." 2 **Only the owner can sign**: "To move coins, the owner asks the Satchel contract. It checks who owns the NFT, then asks NEAR's signer network for a signature." 3 **Transfer the NFT, transfer the wallet**: "Gift or sell it, and the new owner controls every coin inside. No bridge, no wrapped tokens, no seed phrase." |
| `proof.*` | "Last send {amount} · {t} · {explorer}" · "Last transfer {from} → {to}" · "Contract locked · no access keys" · "Signatures issued {n} · last {t}" |
| `home.empty` | "You don't own a Satchel yet" / "Mint one to get Bitcoin and Ethereum addresses that belong to the NFT." / **Mint a Satchel** · "See Satchel #1" |
| `home.list` | "My Satchels" · "{n} Satchels" · **Mint** · band link name "Satchel #{id}, {status}" · menu Send · Fund · Copy addresses · View activity · `home.new` "New" · "Read {t} ago" |

**Satchel page**

| Key | String |
|---|---|
| `page.chips` | "Token #{id}" · "NEP-171" · "NEAR testnet" |
| `page.menu.*` | "Copy token ID ({id})" · "Contract facts" · "View on NearBlocks" · "Copy link" · "Share on X" |
| `page.visitor.h1` / `.sub` | "This NFT is a wallet." / "Whoever owns Satchel #{id} controls the coins at the Bitcoin and Ethereum addresses below." |
| `page.owner.h1` | "Satchel #{id}" |
| `page.title` / `page.meta` | "Satchel #{id} · Satchel" / "Satchel #{id} is an NFT on NEAR testnet. It controls Bitcoin testnet4 address {btc} and Ethereum Sepolia address {evm} through NEAR Chain Signatures. Transfer the NFT and the new owner controls the funds." |
| `page.owner-pill` | "Owned by {owner}" · "Owned by you" · " · {n} signatures" |
| `page.stats.*` | Status · Signatures · Listed for · Minted |
| `page.tabs` | Wallet · Activity · Sell (owner) / Buy (visitor, listed) |
| `page.actions` | Send · Fund · Transfer · Sell · Delist · reasons "This Satchel has no BTC or ETH yet." / "Signing is paused while listed." |
| `page.notfound` | "Satchel #{id} doesn't exist" / "No Satchel has this number yet." / **Mint a Satchel** · **Go to My Satchels** |
| `page.owner-changed` | "Satchel #{id} now belongs to {owner}. You can't send from it anymore." |
| `page.pending.*` | "Sending {amount} · {m:ss}" · "Sent {amount}" · "Signed, not sent · Broadcast now" · `page.pending-elsewhere` "A signature is in progress for this Satchel." |
| `wallet.row.*` | "Bitcoin testnet4" · "Copy" → "Copied" · aria "Copy Bitcoin address" · "Show QR code for Bitcoin address" · "mempool.space" / "Etherscan" / "Solana Explorer" · "+{amount} incoming · unconfirmed" · "Balance unavailable" **Retry** · "0 {TICKER}" **Fund** |
| `wallet.fresh` | "Read from each chain {relative}." |
| `wallet.fundcard` | "Fund this Satchel" / "Anyone can send testnet coins to its addresses. Only its owner can send them out." / **Copy Bitcoin address** · "Get testnet BTC" |
| `facts.*` | Contract · Token · Owner · Status · Signatures · Last signature · Bitcoin testnet4 · Ethereum Sepolia · Contract keys "none since birth" · source "Read from NEAR testnet and each chain {relative}." |
| `verify.*` | "Verify these addresses" · rows "Contract {contract}" · "Keys: none since birth" · "Code hash: matches the published build" · "Path satchel/{id}/{chain}" · guarantee "Anyone can re-derive these addresses. Only the current owner can get signatures for them." · "Verify it yourself" (→ `/contract`) |

**Fund**

| Key | String |
|---|---|
| `fund.title` | "Fund Satchel #{id}" |
| `fund.label` | "This Satchel's {Network} address" |
| `fund.only.*` | "Send only Bitcoin testnet4 coins to this address." / "Send only Sepolia ETH to this address." / "Send only Solana devnet SOL to this address." |
| `fund.time.*` | "Testnet4 confirmations are irregular: minutes to hours." / "About 12 seconds to confirm." / "A few seconds to confirm." |
| `fund.anyone` | "Anyone can fund a Satchel. Only its owner can send from it." |
| `fund.faucet.*` | "Get testnet BTC" / "Get Sepolia ETH" / "Get devnet SOL" |
| `fund.copy` / `.share` | **Copy address** / **Share** |
| `fund.incoming.*` | "Incoming" · "Waiting for a deposit…" · "+{amount} · in mempool" · "+{amount} · confirming" · "Received {amount}" |

**Send**

| Key | String |
|---|---|
| `send.title` | "Send {Chain}" ("Send Bitcoin"; tab title "Send Bitcoin · Satchel") |
| `send.form.*` | "Chain" · "Amount" · "Max" · "Available {amount}" · `max-note` "Max leaves room for the network fee." · "To" · placeholders "tb1… address" / "0x… address" / "Solana address" · "Paste" · **Review** · "Estimating fee…" · "Couldn't estimate the fee." **Retry** · fee line "Network fee ~{fee} · paid by this Satchel" |
| `send.recipient.*` | "{Network} address" · "Satchel #{id}" · announce "{Network} address accepted" · clear "Clear address" |
| `send.guard.*` | "Connect the owner's wallet" / "Only the owner of Satchel #{id} can send from it." · "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." · "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." · "This Satchel has no {TICKER} yet." · `send.guard.unsent` "You have an unsent signed transaction. Broadcast it or replace it." **Broadcast** · **Replace** |
| `send.review.*` | Title "Review send" · label "Send" · sub "to {addr} · {network}" · `from` "From" · "amount + fee" · `to` "To" · "Network fee (est.)" · "paid by this Satchel" · `after` "Satchel #{id} after" · "NEAR fee" · `near` "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account" · `near.tip` "Needs ≈ 0.1–0.3 NEAR free while signing (refunded)." · `time` "Time" · `time.sign` "Signing: usually about 10 seconds" · `time.btc` "Confirmation: minutes to hours on testnet4" · `time.evm` "Confirmation: about 12 seconds" · `time.sol` "Confirmation: a few seconds" · `inputs` "Uses {n} coins from this Satchel, so it needs {n} signatures." · `ack` "I checked this address" · `final.btc` "Bitcoin transfers are final. Check the address above." / `final.evm` "Ethereum transfers are final. Check the address above." / `final.sol` "Solana transfers are final. Check the address above." · **Send {amount}** · `wallet-hint` "Check the Meteor or Intear window." · helper "Your wallet will ask you to approve a request to {contract}." |

**Signing**

| Key | String |
|---|---|
| `sign.title` / `sign.done` | "Sending {amount}" / "Sent {amount}" + "to {addr}" · **Done** · **View activity** |
| `sign.step.prepare` / `.wallet` | CTA labels "Preparing…" / "Approve in your wallet…" |
| `sign.step.*` (future → active → done) | wallet: — → — → "Approved in your wallet" · mpc: "Sign with NEAR's signer network" → "Signing with NEAR's signer network" → "Signed by NEAR's signer network" · broadcast: "Broadcast to {network}" → "Broadcasting to {network}" → "Broadcast to {network}" · confirm: "Confirmation" → "Waiting for 1 confirmation" → "Confirmed" |
| `sign.wallet.slow` | "Waiting for your wallet. Check its window." |
| `sign.mpc.0` / `.20` / `.60` / `.150` | "Usually about 10 seconds." / "Taking longer than usual." / "Still working. The network allows up to about 2 minutes." / "Still waiting for the network. We'll keep checking." (kb/90 §8.6) |
| `sign.mpc.inputs` | "Signing {n} inputs" |
| `sign.credit` | "Signatures by NEAR Chain Signatures" |
| `sign.keepopen` / `sign.closeok` | "Keep this tab open until it says Sent." / "You can close this tab. Activity keeps tracking it." |
| `sign.minimized` (toast) | "Still signing. Keep this tab open until it says Sent." |
| `sent.note.btc` / `.evm` / `.sol` | "In mempool. Testnet4 confirmations are irregular: minutes to hours." (E-25) / "Waiting for 1 confirmation (about 12 seconds)." / "Confirming…" |
| `sent.confirmed` | "Confirmed" |
| `sign.cancelled` | "You cancelled in your wallet. Nothing was signed." **Try again** · **Close** |
| `sign.timeout` | Title "Not signed" / "The signer network did not return a signature. Nothing was sent." · `.cond` "If a signature still turns up, Clean history lists it as Unused until it can't be used." · `.retry.evm` "Try again reuses nonce {n}, so only one of them can ever go through." · `.retry.btc` "Try again reuses the same coins, so only one of them can ever go through." · `.retry.sol` "Try again waits until the old blockhash expires." · **Try again** |
| `sign.notsent` | Title "Signed, not sent" / "{reason} Nothing has left Satchel #{id} yet." · `.explain` "The signed transaction is saved. Until it's broadcast or replaced, it counts as an unused signature in this Satchel's history." · `.gap` "Can't be broadcast yet: nonce {n} waits for nonce {count}." · **Broadcast again** · inline **Broadcast now** |
| `sign.sol.expired` | Title "Expired" / "The Solana transaction expired while it was being signed. Nothing was sent, and that signature can't be used anymore." **Try again** |
| `sign.unknown` (E12) | Title "Still waiting for NEAR" / "NEAR hasn't confirmed transaction {hash} yet. This app hasn't broadcast anything." **Check again** · "NearBlocks" |

**Activity**

| Key | String |
|---|---|
| `act.group.inprogress` · `act.day.*` | "In progress" · "Today" · "Yesterday" · "{Mon D}" |
| `act.row.*` | "Sending to {addr}" · "Sent to {addr \| Satchel #n}" · "Signed, not sent" · "Not signed: to {addr}" · "Signature issued · {Chain}" · "Transferred to {account}" · "Received from {account}" (a Satchel arriving) · "Minted by {account}" · "Listed for {price}" · "Delisted" · "Sold to {account} for {price}" · "Bought from {account} for {price}" |
| `act.status.*` | Signing · In mempool · Signed, not sent · Failed · Unused (only when not final) |
| `act.detail.*` | Date · Status · Network · Type · Amount · Fee · From · To · NEAR transaction · "View on mempool.space" / "View on Etherscan" / "View on NearBlocks" |
| `act.empty` | "No activity yet" / "Sends, transfers and sales show up here. Deposits show on each chain's explorer." / **Fund this Satchel** |
| `act.more` / `act.footer` / `act.partial` | "Show older" / "Missing something? See every event on NearBlocks" / "NEAR history is unavailable right now. Check NearBlocks" |

**Transfer**

| Key | String |
|---|---|
| `xfer.title` / `.review.title` | "Transfer Satchel #{id}" / "Review transfer" |
| `xfer.to.*` | "To (NEAR account)" · placeholder "name.testnet" · "Checking account…" · `found` "Account found · owns {n} Satchels" · "Implicit account. Make sure its owner has the key." |
| `xfer.err.*` | `missing` "No account named {x} on NEAR testnet." · `self` "That's your account." · `contract` "That's the Satchel contract. A Satchel sent there can never be used again." · `mpc` "That's NEAR's signer network. A Satchel sent there can never be used again." |
| `xfer.review.rows` | them "{account} will control everything in this Satchel: {balances}. Its addresses go with it, so anything sent to them later is {account}'s too." · you "Only the new owner will be able to sign. You won't be able to send from it." · history "The signature history stays with the Satchel." (E-36) |
| `xfer.soft.signing` (D-08) | "A signature from {t} ago is still in progress. If you transfer now, it stays valid for anyone holding it." |
| `xfer.final` | "This can't be undone. Only {account} can transfer it back." |
| CTA / in flight | **Transfer to {account}** · "Approve in your wallet…" · "Transferring…" |
| `xfer.done` | pill "Transferred" · "{account} now controls {balances}." · receipt From · To · NEAR transaction · Time · **View Satchel #{id}** · **Done** · toast "Transferred Satchel #{id} to {account}" |
| `xfer.blocked.listed` / `xfer.cancelled` | "Delist Satchel #{id} before transferring it." / "You cancelled in your wallet. Nothing changed." |

**Sell**

| Key | String |
|---|---|
| `sell.title` / `sell.check.title` | "Sell Satchel #{id}" / "Before you list" |
| `sell.tab.*` | "Not listed." · "Ready to list" · **List for sale…** |
| `sell.check.quiet` | Name "Quiet period" · "You can list in {n} blocks (~{t})" · done "No signature in the last {N} blocks" · never signed "No signatures yet" |
| `sell.check.history` | Name "Past signatures" · ok "All {n} can no longer move coins" · blocked "{n} could still move coins" + **How to settle** · settling "{n} is still settling" · unknown "Can't verify {n} right now" + **Check again** · `.warn` (under the CTA, advisory) "Buyers can't buy while it can still move coins. Settle it first, or list anyway." |
| `sell.check.usdc` | "Registered for USDC payouts" / "USDC payouts aren't set up" + **Register · 0.00125 NEAR** |
| `sell.settle.*` (kb/90 §7.6) | EVM: **Broadcast now** "uses nonce {n}." / gap "Can't be broadcast yet: nonce {n} waits for nonce {count}. Send from this Satchel until every nonce up to {max} is used." · BTC: **Broadcast now**, or "Send these coins to this Satchel's own address." · SOL: "Nothing to do. It expires in about 2 minutes." (E-01) |
| `sell.form.*` | "Price" · USDC · NEAR · `buyer-gets` "Buyer gets {balances}." · rows "Price" · "Satchel fee" "none" · "Listing deposit" "0.01 NEAR · unused part refunded" · **You receive** · `paid` "Paid to {account} in the same transaction as the sale." |
| `sell.while` | "While it's listed" · "You can't send from Satchel #{id} or transfer it." · "Anyone can buy it at exactly {price}, right away." · "The buyer gets everything in it." · "You can delist at any time." |
| CTA / in flight | **List for {price}** · "Approve in your wallet…" · "Listing…" |
| `sell.listed` (toast) / panel | "Listed for {price}. Signing paused." / "Listed for {price} · Listing #{id}" · **Delist** |
| `sell.delist.note` / `sell.reprice` | "Delisting is instant: buyers can't buy it anymore, and sending and transfers resume." / "To change the price, delist and list again." |
| Delisting / `sell.delisted` | "Approve in your wallet…" · "Delisting…" / toast "Delisted. Signing resumed." |
| `sell.sold` | "You sold Satchel #{id} to {buyer} for {price}." / "{price} arrived in your NEAR account." · receipt Price · Buyer · Paid · Transaction · `.escrow` "{price} is waiting for you." **Withdraw** |
| `sell.err.quiet` / `sell.cancelled` | "Not listed. You can list in {n} blocks (~{t})." / "You cancelled in your wallet. Nothing changed." |

**Freeze**

| Key | String |
|---|---|
| `freeze.title` | "Signing paused while listed" |
| `freeze.owner.body` | "No coins can leave Satchel #{id} until you delist it or it sells. Anyone can still fund it." **Delist** |
| `freeze.buyer.body` | "The seller can't sign anything new, so the history below is final for this listing." |

**Buy**

| Key | String |
|---|---|
| `buy.block.*` | "Buy for" · `listing` "Listing #{id} · listed {t} ago by {seller}" |
| `buy.youget.*` | "You get" · `excluded` "{amount} excluded: an earlier signature can still spend it." · `unconfirmed` "Unconfirmed deposits never count." |
| `buy.paidin` | "Paid in {currency}." · "You have {balance}." · `short` "You have {balance}. You need {price}." + "Get testnet USDC" |
| `buy.how` | "How buying works" · "You pay" → "One transaction moves Satchel #{id} to you and pays {seller}" → "You control the coins" |
| `buy.gate.*` (GateLine) | "Clean history · checked {t} ago" · "Checking history…" · "Waiting for your browser's check" · "Settling: {n} signature" · "Blocked: {n} unused signature" · "Can't verify {n} signature" · "Unsafe: {reason}" |
| CTA / in flight | **Buy for {price}** · **Connect wallet to buy** · "Re-checking history…" · "Approve in your wallet…" · "Buying…" |
| `buy.changed` | "This listing changed. Listing #{old} at {oldPrice} was replaced by listing #{new} at {newPrice}. Clean history runs again." **Review new listing** · **Cancel** |
| `buy.err.delisted` | "{seller} delisted Satchel #{id}." |
| `buy.refunded` | "Not bought. Your {price} was refunded." |
| `buy.done` | "Satchel #{id} is yours." / "You now control {balances}." · receipt Price · Seller · Listing #{id} · Transaction · **Open your Satchel** · toast "You bought Satchel #{id}" |
| `buy.blocked.banner` | "{n} past signature could still move coins" / "{item reason}. Until it is, whoever holds that signature can send {amount} out of this Satchel." · **See the signature** · "Why this blocks buying" |

**Clean history and proof chips**

| Key | String |
|---|---|
| `clean.eyebrow` / `.meta` | "Clean history" / "Checked in your browser {t} ago · {n} signatures · Sources" |
| `clean.verdict.checking` | "Checking {n} past signatures…" / "Reading Bitcoin testnet4 and Ethereum Sepolia from your browser." |
| `clean.verdict.empty` | "This Satchel has never signed anything." / "No signature from a previous owner can move these coins." |
| `clean.verdict.clean` | "Clean. No past signature can move these coins." / "{k} settled · {e} expired · {u} unfunded · checked {t} ago" (zero counts omitted) |
| `clean.verdict.settling` | "{n} signature is still settling." / "Spent in {txid}. Waiting for {k} more confirmation." |
| `clean.verdict.blocked` | "{n} past signature could still move coins." / "{item}. The seller has to settle it first." |
| `clean.verdict.unknown` | "Can't verify {n} signature right now." / "{cause}. Buying stays paused until it's checked." **Check again** |
| `clean.verdict.unsafe.*` | "Unsafe: this Ethereum address has delegated code." · "Unsafe: the contract has access keys." · "Unsafe: the contract code doesn't match the published build." · "Unsafe: the Solana account isn't a plain wallet." |
| `clean.checks.*` | "Contract keys: none since birth (block {A})" · "Code: matches the published build" · "Ethereum address: no delegated code" · "Solana account: plain wallet" · dev "Dev contract: lock and code checks skipped" |
| `clean.group.*` | "Needs attention ({n})" · "Can't move coins ({n})" · "Show all {n}" |
| `clean.item.*` | Titles "{Chain} · nonce {n}" / "{Chain} · coin {txid}:{vout}" / "{Chain} · blockhash {short}" · `wouldpay` "Would send {amount} to {addr}" (+ " (claimed)") · evidence lines (state table above) · pills Settled · Expired · Unfunded · Settling · Unused · Can't verify · Checking… |
| `clean.sources.*` | "{Chain}: {provider} · {provider}" (with status icons) · `one` "{provider} didn't answer. This verdict uses {other} only. Allowed on testnet." · chip "1 of 2 sources" |
| `clean.trust` / `.hint` | "Runs in your browser. Satchel's server isn't trusted for this." / "Server check {t} ago: {verdict}" + "Waiting for your browser's check" |
| `clean.how` | "How Satchel checks this" → kb/90 §7.7 badge promise verbatim → "What it doesn't cover" (kb/90 §4 list) → "README disclosure" |
| `clean.disclosure` | "The contract doesn't run this check; this app does, by reading each chain. Buy stays disabled until it passes." |
| `proof.clean` | "Clean history · checked {t} ago" · tooltip = kb/90 §7.7 **verbatim**: "Every signature this Satchel has issued is recorded on-chain. Your browser just checked each one against Bitcoin testnet4, Solana devnet and the four Ethereum testnets: none can still move the coins you are buying." |
| `proof.balance` | "Verified balance · read {t} ago" · tooltip "Read live from each chain for the addresses derived from this NFT. Coins an earlier signature can still spend are excluded. Unconfirmed deposits never count." |

**Market, Mint and Contract**

| Key | String |
|---|---|
| `market.*` | "Market" · "{n} listed" · "Sort" Newest · Price · chips (polish) Buyable now · Has BTC · Has ETH · footer "Clean history · checked {t} ago" / "Blocked: {n} unused signature" / "Checking…" / "Server check {t} ago" · `empty` "Nothing is listed right now." **Mint a Satchel** · `error` "Couldn't load listings." **Try again** |
| `mint.*` | "Mint a Satchel" · preview "New Satchel" · "{n} chains" · "Bitcoin and Ethereum addresses" · bar "You get" "Bitcoin + Ethereum addresses" · "Deposit" "0.02 NEAR · unused part refunded" · **Mint a Satchel** / **Connect wallet to mint** · `get` "Its own Bitcoin testnet4 address" · "Its own Ethereum Sepolia address" · "Only its owner can move the coins" · "A public record of every signature it makes" · "Approve in your wallet…" · "Minting…" · `done` "Satchel #{id} is yours." / "Minted in {tx}" · **Fund this Satchel** · **Open Satchel #{id}** · toast "Minted Satchel #{id}" · `cancelled` "You cancelled in your wallet. Nothing was minted." |
| `contract.*` | rc/final: "Born without a key" / "{contract} was created, deployed, initialized and minted in one transaction with no AddKey. Only sign_for can get signatures for its Satchels." · facts Access keys "Account is locked (no access keys)" · Birth tx · Signer txs · Oldest tx · Code hash · Expected · MPC version · Config · "Verify it yourself" · dev: "Development contract" / "This account has keys. Lock and code checks are skipped on dev." |

**Retired in R3:**
- every all-caps string (`TESTNET`, `TOKEN #1`, `BUY FOR`, `YOU GET`, `LISTED FOR`, `IN PROGRESS`, `INCOMING`, `CLEAN HISTORY`, `SIGNATURES BY NEAR CHAIN SIGNATURES`, the caps Tags, `DEV CONTRACT`, `RELEASE CANDIDATE`, `1 OF 2 SOURCES`) → sentence case, same words;
- "For sale" (pill) → "Listed"; "Completing purchase…" → "Buying…";
- `hallmark.*`, `hallmark.stamp.aria` → `proof.*` (no stamp);
- `home.finishes`, "A finish set by its number", the alloy chip in `page.chips`, the band name "{alloy}";
- glyphs inside strings (✓ ✕ ◌ ◷ ⓘ ⚠ ⛔ ❄ ◇ ⬡ ▧ ◆ ₿ Ξ ◎ ⧉ ▦ ↗): icons now.

R2's retired list (relay, access, 1Click, cooldown, "Pay with", approvals, delegates, `clean.ok`, "Buyable in") stays retired. Restored in R3: the fiat card total (`card.total`), labelled "at mainnet prices", if UX-1's default stands.

### Error map (failure → detection → message → action)
Unchanged from R2 in substance. In R3 every message renders in brand tokens with an icon (never a glyph character), sentence case, and "Get testnet NEAR" as a link.

Presentation rule (WC-C14):
- **Field errors** sit inline under the field.
- **Flow errors** replace the active tracker row's helper and keep every input.
- **System problems** (RPC, offline) use the one-line SystemBanner.
- **Never** a system `alert()` or a blocking modal for a recoverable error.

Every message follows the failure-card structure.

| # | Failure | Detect | Message | Actions |
|---|---|---|---|---|
| E1 | Wallet rejected or closed | rejection `/reject\|cancel\|denied\|closed/i` **and** no record within 10 s | `sign.cancelled` (flow-specific variants: `xfer.cancelled`, `sell.cancelled`, `mint.cancelled`) | Try again · Close |
| E2 | Wallet popup blocked | `window.open` returns null [ASSUMED] | "Your browser blocked the wallet window. Allow pop-ups for this site and try again." Nothing was signed | Try again |
| E3 | Not owner | `ERR_NOT_OWNER` | "Only the owner of Satchel #{id} can sign. It may have changed hands in another tab. Nothing was sent." | Refresh |
| E4 | Frozen | `ERR_FROZEN` | "Signing is paused while Satchel #{id} is listed. Delist it to send. Nothing was signed." | Go to Sell |
| ~~E5~~ | ~~Pending signatures~~ | removed (E-04, E-27) | — | — |
| E6 | Not enough NEAR | RPC `NotEnoughBalance` / `LackBalanceForState` | "Your NEAR account doesn't have enough NEAR for this. It needs about {needed} free (unused NEAR is refunded). Nothing changed." (signing needs ≈ 0.1–0.3 NEAR free; mint 0.02; list 0.01) | Get testnet NEAR ↗ |
| E7 | Gas too low (bug) | `ERR_GAS` (before any record) / MPC "Provided gas is lower than required…" (after the record) | `ERR_GAS`: "This request didn't include enough gas. Nothing was signed." MPC: "The signer network rejected this request for gas. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used; Try again reuses them." | Try again · report |
| E8 | MPC rejected parameters (bug) | MPC `InsufficientDeposit` / `MalformedPayload` / `DomainNotFound` (after the record) | "The signer network rejected this request. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used." | Report |
| E9 | MPC timeout | record `failed`, or the tx outcome "Request has timed out." (E-26) | `sign.timeout` + `.cond` + `.retry.{chain}` | Try again (same nonce or inputs) |
| E10 | Same request already queued | MPC "Pending-request queue is full…" | "This exact transaction is already being signed. Wait for it to finish." | — |
| E11 | NEAR RPC failure | fetch error / 5xx ×3 | Page: `banner.rpc-down`. In a flow: "Can't reach NEAR testnet. Nothing has been broadcast. Retrying…" | auto-retry · Try again |
| E12 | Tx outcome unknown | no terminal state by `h0 + 250` | `sign.unknown` | Check again · NearBlocks ↗ |
| E13 | EVM insufficient funds | "insufficient funds for gas * price + value" | "This Satchel doesn't have enough Sepolia ETH for the amount plus the fee. Nothing was sent." | Edit amount · Fund |
| E14 | EVM nonce too low | "nonce too low" | "Another transaction from this Satchel already used this nonce. Refresh and try again." | Try again |
| E15 | EVM replacement underpriced | "replacement transaction underpriced" | "A pending transaction from this Satchel uses this nonce. Wait for it to confirm, then try again." | — |
| E16 | EVM fee too low | "max fee per gas less than block base fee" | "The network fee rose while signing. Sign again with a new fee. Nothing was sent." | Try again (same nonce) |
| E17 | EVM already known | "already known" | treated as success → `sent` | — |
| E18 | BTC fee too low | "min relay fee not met" / "mempool min fee not met" | "The fee is below what testnet4 nodes accept right now. Sign again with a higher fee. Nothing was sent." | Try again (same inputs) |
| E19 | BTC inputs spent | "bad-txns-inputs-missingorspent" | "Some of this Satchel's coins were already spent. Nothing was sent. Refresh and try again." | Try again |
| E20 | BTC mempool conflict | "txn-mempool-conflict" | "A pending transaction already spends these coins. Wait for it to confirm." | — |
| E21 | BTC dust | "dust" | "Bitcoin won't relay {n} sats to this kind of address. The minimum is {dust} sats." (E-03) | Edit amount |
| E22 | Bad signature (bug) | local verify fails / "non-mandatory-script-verify-flag" / "invalid sender" | "The signature didn't match this transaction. Nothing was sent." | Report |
| E23 | Broadcast API down | mempool.space or RPC 429/5xx at broadcast | `sign.notsent` with the reason "{provider} isn't responding." | Broadcast again |
| E24 | SOL blockhash expired | "Blockhash not found" / block height exceeded | `sign.sol.expired` | Try again |
| E25 | SOL rent | "insufficient funds for rent" | "This would leave an account below Solana's minimum balance (0.00065024 SOL). Send more, or send everything." (E-02) | Edit amount |
| E26 | SOL no balance | "Attempt to debit an account but found no record of a prior credit" | "This Satchel's Solana address has no SOL yet. Fund it first." | Fund |
| ~~E27~~ | ~~Delegate over cap~~ | cut (D-13) | — | — |
| E28 | Buy races | `ERR_LISTING_CHANGED` / `ERR_NOT_LISTED` (no cooldown, E-37) | `buy.changed` / `buy.err.delisted`. Nothing was bought | Review new listing |
| ~~E29~~ | ~~Price API down~~ | prices cut | — | — |
| E30 | Upstream (clean-history hint, FastNEAR) down | `/api/*` 5xx | Activity: `act.partial`. CleanHistory SSR: "Server check unavailable. Your browser's check still runs." | Try again |
| E31 | Receiver refused | `ERR_BAD_RECEIVER` | `xfer.err.contract` / `xfer.err.mpc` (inline; caught before the wallet) | Edit account |
| E32 | Transfer while listed | `ERR_LISTED` | `xfer.blocked.listed` | Go to Sell |
| E33 | List inside the quiet period | `ERR_QUIET_PERIOD` | `sell.err.quiet` | — (the row counts down) |
| E34 | Already listed / not listed | `ERR_ALREADY_LISTED` / `ERR_NOT_LISTED` on delist | "Satchel #{id} is already listed." / "Satchel #{id} isn't listed anymore." | Refresh |
| E35 | USDC amount mismatch | `ERR_WRONG_AMOUNT` → `SuccessValue "0"` | `buy.refunded` | Try again |
| E36 | Self-buy | `ERR_SELF_BUY` | "You can't buy your own listing. Delist it instead." | — |
| E37 | Currency mismatch | `ERR_CURRENCY` | "This listing is priced in {currency}. Pay in {currency}." (shouldn't happen: the UI uses the listing's currency) | Refresh |
| E38 | Nothing to withdraw | `ERR_NOTHING_OWED` | "Nothing is waiting for you." | — |
| E39 | Policy refusal (bug) | `ERR_EVM_*` / `ERR_BTC_*` / `ERR_SOL_*` | "Satchel only signs plain {Chain} transfers. Nothing was signed." | Report |
| E40 | Solana disabled at the freeze | `ERR_CHAIN_UNSUPPORTED` | "Solana signing isn't enabled on this contract." | — |
| E41 | No safe BTC transaction | builder collision check exhausted (kb/90 §8.2) | "Can't build a safe transaction. Try a different amount. Nothing was signed." | Edit amount |


## Motion spec (B-06)
The brand's principle: **one signature moment** (the transfer handoff), the **signing pulse**, and plain response feedback for everything else. With `prefers-reduced-motion` the handoff becomes a cross-fade plus text.

Global setup:
- `<MotionConfig reducedMotion="user">` at the root. It "automatically disable[s] transform and layout animations, while preserving the animation of other values like opacity and backgroundColor" **[SOURCED](https://motion.dev/docs/react-accessibility)**. The handoff also branches on `useReducedMotion()` for its cross-fade variant.
- Only `transform`, `opacity` and the stitch's `stroke-dashoffset` are animated, plus colour on hover and press. `will-change: transform` only during the handoff.
- Springs are motion@14.5.0 measurements (`research/spikes/ux-refs/calc/springs_r2.mjs`, re-run 2026-10-21) **[VERIFIED]**. Stiffness, damping and mass override duration and bounce **[SOURCED](https://motion.dev/docs/react-transitions)**.
- **Never:** entrance motion that gates content (every word is in the first paint), confetti, scores, frost, stamps, reveals, tilt-on-hover or a moving logo.

| Interaction | Animates | Transition | Measured **[VERIFIED]** | Reduced motion |
|---|---|---|---|---|
| **Handoff · lift** (signature) | y 0 → −12 px, scale 1 → 1.04, rotate 0 → 6°, shadow → `shadow-overlay` | `spring-lift` 260/22/1 (ζ 0.68) | 99 % @ 192 ms; overshoot 5.00 % | none |
| **Handoff · slide** (signature) | x from the giver's slot to the recipient's (240 px on mobile; ≈ 280 px inside the 480 px dialog) | `spring-handoff` 120/18/1.2 (ζ 0.75) | 95 % @ 313 · 99 % @ 352 · **±1 % @ 659 ms** (the brand's "≈ 700 ms spring") · overshoot 2.84 % | a 200 ms cross-fade of the card between the two slots, with the sentence |
| **Handoff · land** | y → 0, rotate → 0°, scale → 1, shadow → `shadow-card` | `spring-lift` | ±1 % @ 405 ms; overshoot 5.33 % | none |
| **Handoff · stitch** | The giver's stitch fades out as the slide starts (160 ms); on landing **the stitch draws in on the receiving card** (`stroke-dashoffset` → 0) | tween 300 ms `--ease-standard` | — | the stitch appears with the cross-fade |
| Handoff · end frame | The "Transferred" pill fades in; then the sentence and the receipt (holdings staggered 60 ms, receipt rows 40 ms) | opacity 160 ms / 240 ms | — | opacity only |
| **Signing pulse** | The `frozen` step indicator: tracker active row, the Signing pill dot, the PendingPill dot (opacity 1 ↔ 0.4) | 1.6 s ease-in-out loop (`--pulse`); stops on any end state | — | static |
| Mempool wait | none: the `frozen` ring is static (R2-D30) | — | — | — |
| Loading glyph | opacity pulse (`--pulse`), never rotated | 1.6 s loop | — | static + "Loading…" |
| Tracker step done | the `check` icon fades in | 160 ms | — | instant |
| CTA label swap | "Send 0.0100 BTC" → "Preparing…" → "Approve in your wallet…": a label cross-fade, **no width animation** | 120 ms (`--duration-fast`) | — | instant |
| Value and word swaps | balances, the pill word, the PendingPill tense ("Sending…" → "Sent…"), the CleanHistory row words, the card name after mint | opacity 160 ms (`--duration-base`) | — | instant |
| Hover and press | colours (`surface` → `surface-raised`; `brand` → `brand-bright` → `brand-pressed`) | 120 ms | — | colour is allowed |
| FlowShell | sheet slides up / dialog fades and scales 0.98 → 1; exit reverses | 200 ms `--ease-standard` / 160 ms `--ease-exit` | — | fade only |
| Menus, tooltips, toasts | primitive defaults (CSS) | do not re-implement with Motion | — | primitive handles it |
| Route and tab changes | none | — | — | — |

Handoff choreography (from the moment the tx succeeds; the reverse handoff for Buy mirrors it, with the buyer as the recipient):

| t (ms) | Event |
|---|---|
| 0 | Lift. In practice it already happened while "Approve in your wallet…" was open; the card waits in the lifted pose |
| 150 | The slide starts; the giver's stitch fades out (Transfer: the giver no longer owns it; Buy: the seller's card had no stitch in the buyer's view) |
| ≈ 700 | **Land** under the recipient's avatar; the tilt returns to 0° |
| 750 | **The stitch draws in on the receiving card** (300 ms) |
| 800 | The "Transferred" (or "Bought") pill fades in |
| 900 | The sentence reveals, holdings staggered |
| 1050 | Receipt rows (From · To · NEAR transaction · Time) |
| ≈ 1150 | Focus moves to the sentence and the live region announces it. Total ≈ 1.15 s (R2: 1.3 s), so the video doesn't drag |

## Design tokens (summary; the source of truth is `81-design-tokens.md` R3, which copies `brand/tokens.json`)
- **Surfaces.** Night `ground #17100c` → `surface #221812` → `surface-raised #33251c`; Day `#f7f5f1` → `#ffffff` → `#efeae3`. Hairlines `line`; control borders `line-strong`. Only the card (`shadow-card`) and overlays (`shadow-overlay`) cast shadows.
- **Brass** (`brand #d4ae55`, `brand-bright`, `brand-deep`, text `on-brand #2b1d15`): one action fill per screen; the card band and the logo are identity. Derived: `brand-ink` (brass words), `brand-line` (thin marks), `brand-pressed` `#B7913F` (the AA-safe pressed state).
- **States:** `success`, `frozen`, `danger`, neutral `ink-muted`; Listed in brass; icon + word always. No amber, no tints.
- **The stitch:** `brand` @ 45 % (Night) / `brand-deep` @ 60 % (Day), 1.5 px, dash 6/5, inset 8, radius 14; ownership only.
- **Type:** Bricolage Grotesque (`balance-hero`, `title`, `heading`; derived `display`, `section`), Instrument Sans (`body`, `body-sm`, `label`; derived `lead`, `caption`), Spline Sans Mono (`address` only). Sentence case; tabular amounts.
- **Radii:** `radius-sm` 8 · `radius-md` 14 (buttons) · `radius-card` 22 (card, dialogs, sheets) · `radius-pill` 999 (pills, segmented controls). **Layout:** 480 / 768 / 1024 / 1280; `container-flow` 480; `container-app` 1200; left nav from 1024.

## Accessibility checklist (WCAG 2.2 AA) [SOURCED](https://www.w3.org/TR/WCAG22/)
| SC | Requirement in Satchel | Test |
|---|---|---|
| 1.1.1 Non-text content | The card `<figure>` is real text (name, status, total, balances); the stitch, gradient and dots are `aria-hidden`. The QR has `role="img"` and the full address. Chain marks are `aria-hidden` next to ticker text. Icons beside words are decorative; icon-only buttons have names | screen reader pass |
| 1.3.1 Info and relationships | Landmarks (header/nav, main, footer); one H1 per page; Facts, ReviewCard and the stats strip are `<dl>`; the Timeline is an `<ol>` under day headings; CleanHistory is a `<ul>`; the tracker is an `<ol>` with `aria-current="step"`; the FlowShell is a dialog (`aria-modal`, labelled by its title) | axe + manual |
| 1.4.1 Use of colour | Every status, tier and verdict is an icon **and** a word. The stitch never carries meaning alone ("Owned by you" is written). Listed is a word. Links are underlined; failed amounts are struck through **and** say "Failed" | grayscale screenshot, both themes |
| 1.4.3 / 1.4.11 Contrast | Every pair computed in kb/81 R3 for **both themes**: text ≥ 4.5 (thinnest: Day `danger` on `surface-raised` 4.54); graphics and control borders ≥ 3 (thinnest: Day `chain-btc` 3.05, Night `line-strong` on `surface-raised` 3.05). The brand's pressed state (3.80) is replaced by `brand-pressed` (5.53). Brass is never text in Day (`brand-ink`). The Day brass button relies on its `brand-deep` border (3.93) | re-run `contrast_r3.mjs` if tokens change |
| 1.4.10 Reflow | At 320 px: no horizontal scroll; the card renders at 288 px and its total steps down instead of wrapping; chips wrap; grouped addresses wrap (`overflow-wrap: anywhere`); the Testnet chip moves to the NavSheet | 320 px viewport |
| 1.4.12 Text spacing | No fixed heights on chips, pills, rows or the card body (the card keeps its ratio; its body grows only by stepping the total down) | bookmarklet |
| 1.4.13 Content on hover or focus | Tooltips (ProofChip, NEAR fee, disabled reasons) are dismissible with Esc, hoverable and persistent; every disabled reason is also a visible line | keyboard + mouse |
| 2.1.1 / 2.1.2 Keyboard, no trap | Every action is reachable. The FlowShell traps focus while open and releases it on close (Esc, ✕, Done); the NavSheet the same. Disabled actions use `aria-disabled` so they stay focusable and their reason is read | keyboard-only run of all flows |
| 2.2.1 Timing adjustable | No user time limits. The quiet period is a system wait shown as text plus a track. There is no buy cooldown | — |
| 2.2.2 Pause, stop, hide | The signing pulse is essential progress and stops at any end state; it and the loading glyph are static under reduced motion. Nothing auto-advances | — |
| 2.3.1 Three flashes | The pulse is 0.625 Hz, well under 3 Hz | — |
| 2.4.2 Page titled | "{page} · Satchel" ("Satchel #1 · Satchel", "Send Bitcoin · Satchel"); "(1) Signing… · Satchel" in a background tab | — |
| 2.4.3 Focus order | Flows open with focus on the shell title. **Send:** ChainSelect (arrow keys) → Amount → Max → To → Paste → (Clear) → Review → [Review] ack checkbox → Send. **Transfer:** account → Review → Transfer. **Buy:** Buy (GateLine described). **Sell:** checklist actions → currency → price → List | keyboard |
| 2.4.7 Focus visible | 2 px solid `focus` with a 2 px offset on every interactive element (≥ 5.31:1 against every surface, both themes); inset on list rows | — |
| 2.4.11 Focus not obscured | `scroll-padding-top` 72 px (+36 px while the PendingPill shows); `scroll-padding-bottom` 96 px + the safe area while a pinned or sticky bar is present; the left nav never overlaps content | tab through long pages |
| 2.5.3 Label in name | The visible label is contained in the accessible name ("Send 0.0100 BTC" → "Send 0.0100 BTC to tb1q…4w"). Icon-only buttons say what they act on ("Copy Bitcoin address", "Open menu") | — |
| 2.5.7 Dragging | No drag-only action: no slide-to-confirm and no swipe- or drag-to-dismiss sheets (the sheet closes with ✕ or Esc) | — |
| 2.5.8 Target size | Every target ≥ 24 × 24 px; primary mobile targets ≥ 44 × 44; round actions 48 px; stack bands ≈ 63 px | overlay check |
| 3.2.6 Consistent help | "How it works" and Contract facts in the footer of every page | — |
| 3.3.1–3.3.3 Errors | Field messages link via `aria-describedby`, each with a fix ("Use a tb1… address"). Error, Warning and Info tiers differ in icon and word, not only colour | — |
| 3.3.4 Error prevention (financial) | Send, Transfer and Buy have a review naming the amount and recipient (a buy names the price and the Satchel). List is reversible (Delist) and its form summarises everything. The wallet approval is a second confirmation | — |
| 3.3.7 Redundant entry | Amount and recipient survive retries, timeouts, cancellations and Minimize | — |
| 3.3.8 Accessible authentication | Wallet connect has no cognitive test inside Satchel's UI | — |
| 4.1.2 Name, role, value | Toggle groups (radiogroup: ChainSelect, ThemeControl), `aria-current` on NavTabs, nav links and the tracker step, `aria-expanded` on disclosures and expandable rows, `role="progressbar"` on the quiet-period track, `aria-disabled` on disabled actions | — |
| 4.1.3 Status messages | One app-wide `role="status"` region for signing (step changes, the 20/60/150 s lines, results), plus the CleanHistory verdict (changes only) and copy confirmations. Errors use `role="alert"`. Base UI Toast announces only `title`/`description`, so the message goes in `title` **[SOURCED](https://base-ui.com/react/components/toast)** | NVDA + VoiceOver |
| Themes and forced colours | Night and Day both verified; `color-scheme` set so form controls and scrollbars match. Every button keeps a 1 px border (transparent where unseen) so Windows forced-colors mode still draws its edge | toggle the OS theme; forced-colors emulation |
| Reduced motion | `MotionConfig reducedMotion="user"` + the variants above. The handoff becomes a cross-fade with text; the stitch simply appears; pulses are static | macOS "Reduce motion" |

## Reference patterns (summary)
The Mobbin library (north-star apps, 2–4 references per screen, conventions, anti-patterns, the moodboard) is **`82-design-references.md`**. Since R3 it is used for **structure and behaviour only**; visual identity comes from `brand/`, and kb/82 marks the superseded visual rows.

Non-Mobbin sources kept as **copy references** only:

| Source | Still used for | Link |
|---|---|---|
| Rabby locale strings | "Pending: Broadcast failed" → the `signed_not_sent` naming. "Found forbidden risk that can't be ignored" → no override on a blocked Buy | [messages.json](https://github.com/RabbyHub/Rabby/blob/develop/_raw/locales/en/messages.json) |
| LI.FI widget strings | The tone of "This may take a few minutes." for long waits. Its "Closing won't cancel your deposit" line is **not used**: there is no relay (D-12) | [en.json](https://github.com/lifinance/widget/blob/main/packages/widget/src/i18n/en.json) |
| Tokenbound | An address pill with a copy check; the buyer warning about existing approvals → the tone of the Clean-history banner | [docs](https://docs.tokenbound.org/iframe) |
| OpenSea Learn (ERC-6551) | "Selling the parent NFT hands control … to the new owner." → the transfer review copy | [OpenSea Learn](https://opensea.io/learn/token/what-is-erc-6551) |
| Phantom help centre | "Invalid format"; "Not Enough SOL … reduce the amount slightly" → per-chain validation; Max leaves room for the fee | [send](https://help.phantom.com/hc/en-us/articles/5530158379539-Send-crypto-in-Phantom), [fees](https://help.phantom.com/hc/en-us/articles/30698882147859-Not-enough-SOL-ETH-or-other-tokens-to-pay-network-fees) |
| Rainbow source | Hashing an identifier into a stable accent → now only the method behind the per-token leather hue (R3 has no hashed avatar colours) | [useAccountAccentColor.ts](https://github.com/rainbow-me/rainbow/blob/develop/src/hooks/useAccountAccentColor.ts) |
| Coinbase Wallet previews | "How their balance is expected to change" → "Satchel #1 after" | [The Block](https://www.theblock.co/post/206684/coinbase-wallet-shows-transaction-previews-to-protect-against-nft-scams) |

## Scope and phasing (R3 changes vs R2 and vs the plan's S2 hours)
S2 carries only 1 h of buffer (implementation plan §2). R2 added +9.0 h (P1 +3.0, P2 +1.5, polish +4.5). R3 keeps R2's core rows (S-01…S-12, A-01…A-04, A-09) and changes the rest:

| # | Change | Task | Phase | Δ h | Funding / cut position |
|---|---|---|---|---:|---|
| T-01 | Brand tokens for **both** themes via `light-dark()`, the lockup swap, `theme-color` per scheme; P1 renders `data-theme="night"` | SAT-201 | P1 | +0.25 | core |
| T-02 | **Day switched on:** the head script and override, the ThemeControl (account menu + footer), `theme-color` sync, a Day QA pass of every screen | SAT-300 | P2 | +1.0 | S1's Day-10/11 pairing buffer; R3 cut 3 (the app stays Night) |
| T-03 | **FlowShell:** sheet below 768, 480 px dialog from 768, the Satchel page rendered by the route as an inert background, focus trap, close by URL replace (replaces R2's FlowPage) | SAT-222 | P1 | +1.0 | core (structural, never cut) |
| T-04 | **NavShell:** the left nav from 1024; the mobile top bar with the menu → NavSheet (reuses T-03's sheet) | SAT-201 | P1 | +0.5 | core (structural) |
| T-05 | **Prices** (UX-1's reopened default): `/api/prices` (1Click → CoinGecko, 60 s, 1.5 s SSR bound), the card total and its "{n} chains" fallback | SAT-211, SAT-212 | P1 | +1.5 | R3 cut 4 (the card reads "{n} chains"; no layout change) |
| T-06 | Card face: native chain chips on the card (reverses half of R2's S-02 saving), the stitch overlay, the per-token leather | SAT-212 | P1 | +0.5 | core |
| T-07 | Brand assets through the Metadata API (favicons, PWA icons, manifest, the brand OG file); three next/font families + the Satchel Symbols subset | SAT-201 | P1 | +0.25 | core |
| T-08 | **Saving:** the brand card replaces the seeded alloy (no 5-stop OKLCH gradient, specular, brushed texture, SVG turbulence or alloy vectors) | SAT-212 | P1 | −0.5 | saving |
| T-09 | **Saving:** the handoff without the key rotation and owner-colour tween; neutral avatars | SAT-240 | P1 | −0.25 | saving |
| T-10 | **Saving:** the Receive QR panel without the alloy frame (A-01 drops from +0.5 to +0.25) | SAT-235 | P1 | −0.25 | saving |
| T-11 | **Saving:** no card tilt | SAT-300 | polish | −0.25 | saving |
| T-12 | **Saving:** the brand `og-image.png` replaces the generated OG image (SAT-292 keeps only the dynamic card SVG) | SAT-292 | P2 (cut-2) | −1.0 | saving (base plan) |
| T-13 | **Dropped R2 additions:** A-05 materialise (0.75), A-06 frost (1.0), A-07 hallmark strike (0.75), A-08 finishes wall (0.5), A-10 frost in the SVG (0.25) | — | polish | −3.25 | saving |
| C-11 | Global `/activity` route in the left nav (an aggregate of the viewer's Satchels' records) | — | P2 | +1.5 | **cut by default** |
| C-08 · C-09 | R2's stack animation and the modal right drawer | — | — | — | removed (no motion beyond the signature moment; B-08 replaces the drawer) |

R2's other cut-by-default rows (C-01 "New" pill, C-02 market filter chips, C-03 FAQ, C-04 landing clean-history bento, C-05 "Received" rows from chain histories, C-06 "First send here", C-07 "What your wallet will show", C-10 the ProofChip touch sheet) stay cut by default.

**Net effect if every non-cut row ships: +8.5 h of S2 work vs the plan** (R2: +9.0 h):
- **P1 +6.0 h** (R2 +3.0): R2's core +2.0 and Receive +1.0, plus T-01, T-03…T-07 (+4.0), minus T-08…T-10 (−1.0).
- **P2 +1.5 h** (R2 +1.5): A-03 and R2's core +1.5, plus T-02 (+1.0), minus T-12 (−1.0).
- **Polish +1.0 h** (R2 +4.5): A-04 (0.75) + A-09 (0.5) − T-11 (0.25).
- If T-05 (prices) is cut, P1 drops to +4.5 h and the total to +7.0 h.

The shift is from polish to P1: themes, the flow shell and the prices route are needed by G5, while frost, the stamp, materialise and the finishes wall are gone. **P1 funding:** the S2 Day-6 buffer (1 h) + **all four hours** of S1's Day-6 buffer as pairing (R2 already used two) + T-05 as the last R3 cut at DP3 = 6.5 h for 6.0 h. That leaves S1 no Day-6 slack, so the plan owner must confirm it (H-11). **P2:** S1's Day-10/11 pairing buffer (5 h), as in R2. **Polish:** only if time remains after DP8.

**Cut order** (appended to D-20's; R3 replaces R2's polish list): Solana UI → dynamic card (the OG image is no longer in this item) → USDC buy UI → market polish (incl. C-02) → **A-09 overflow menu → A-04 home stack → T-02 Day switch-on (the app stays Night) → T-05 prices ("{n} chains")**. T-03, T-04, T-06 and T-07 are structural and are not cut. A-01/A-02 stay with Receive (P1); A-03 stays with Buy (P2).

## Deltas vs plan
| # | Plan / earlier revision said | R3 | Why | Scope |
|---|---|---|---|---|
| D1 | IA has no transfer screen | `/s/[id]/transfer` (a flow route) | Transfer = control is P1 and the core demo moment | in plan (SAT-240) |
| D2 | "Fund this Satchel" with no flow | `/s/[id]/receive`, a flow with an Incoming block | Judges and buyers fund | SAT-235 + A-01/A-02 |
| D3 | Tabs Wallet / Activity / Sell / Access | Wallet · Activity · Sell/Buy as URL segments; **no Access tab** (D-13) | Deep links and SSR for judges | — |
| D4 | Pills "Active / Frozen / Listed" (plan); R2 "Active · Signing · For sale · Sold" | **Active · Signing · Listed · Sold + Needs attention** (brand state table; Listed = signing paused) | One contract state for listed; Signing derived from records; "Frozen" is not a state | kb/90 E-46 |
| D5–D6 | Cooldown 200/210; "Safe to buy in 143 blocks" | **No post-listing cooldown** (D-05 rev 2). The 250-block quiet period appears only before listing ("You can list in {n} blocks (~{t})") | kb/90 §5.7; brand correction | — |
| D7 | BTC fee "~0.00002" | ≈ 282 sats at `max(2, halfHourFee)` (kb/90 §8.9) | measured | copy |
| D8 | Signing ends in "pending/confirmed polling" | BTC ends "In mempool. Testnet4 confirmations are irregular: minutes to hours." (E-25) | measured | demo: never wait for BTC |
| D9 | No signed-but-not-sent state; rev 1 recommended a relay | `signed_not_sent` + **Broadcast again**, shown in 6 places, Needs attention for the owner; **no relay** (D-12) | kb/90 §8.6, D-16 | SAT-242 |
| D10 | SOL with no expiry | `expired` state; blockhash ≈ 36 s (E-01) | measured | P2 / cut-1 |
| D11 | The card shows "large total USD"; R2 removed it | **The card total returns, labelled:** "≈ $X · at mainnet prices", or "{n} chains" (UX-1 reopened); native chips on the card; no fiat anywhere else | brand + the original plan; testnet coins have no value, so it is labelled | T-05 |
| D12 | "Sonner toasts", "sheet on mobile"; R2: full pages | Flows are routes **presented** as a sheet (< 768) or a 480 px dialog (≥ 768) over the Satchel page (D-26 as amended) | brand layout + R2's deep links and SSR | T-03 |
| D13 | Clean-history blocked copy "Ask the seller to cancel it" | A pre-list "Before you list" checklist with How to settle (kb/90 §7.6). Past signatures are advisory, so demo #4 can still list | the seller can't fix it while frozen | SAT-272 |
| D14 | Statuses spent / unspent / unknown | kb/90 §7.3: Settled · Expired · **Unfunded** · Settling · Unused · Can't verify · Unsafe (E-09), each icon + word in brand tokens | — | — |
| D15 | Clean history is off-chain | `clean.disclosure` + `footer.note.clean` + "How Satchel checks this" (§7.7 verbatim) | the trust assumption is visible in the product | copy |
| ~~D16~~ | Access tab / delegates | cut (D-13) | — | −1.5 days (plan) |
| D17 | Views not specified | kb/90 §5.14 names: `config`, `satchel`, `sig_records`, `listings`, `proceeds_of` (E-17) | — | — |
| D18 | No judge-specific design | Blocking SSR `/s/1`, `/contract`, `/market`; a Facts grid with full addresses as text; Verify; the card's figure as real text | AI judges read HTML (kb/90 §8.1) | SAT-210, SAT-251 |
| D19 | Transfer to any account | Blocks missing accounts, self, the contract and the MPC account (R-18) | stranded NFTs | SAT-240 |
| D20 | The handoff runs on transfer | Only after the final success; reversed for Buy; the stitch appears on the receiving card | never claim control moved before it did | — |
| D21 | Derivation path hidden | Shown only inside the collapsed VerifyDisclosure and on `/contract` | verifiability vs plain copy | — |
| D22 | Market badge "Verified balance" | The ProofChip: icon + word + time + link; excludes encumbered coins | — | — |
| D23 | Dynamic SVG card | The brand card without balances or stitch; status + `sig_count` in SAT-292 (D-23 rev 2) | — | cut-2 |
| D24 | Video 2:45 | ≤ 2:15 (D-17); no cooldown speed-ramp; the handoff (with the stitch) is the one motion beat | X non-Premium limit | — |
| R3-1 | "Dark and metallic"; R2 graphite + near-white pill | The brand: leather and brass, Night + Day, brass primary once per screen | brand | T-01, T-02 |
| R3-2 | R2 identity-only alloy face | The brand card: band + total + native chips + stitch when owned | brand (B-04) | T-06, −T-08 |
| R3-3 | R2 TopBar everywhere; Archivo + JetBrains Mono | Left nav from 1024; Bricolage / Instrument Sans / Spline Sans Mono, sentence case | brand | T-04, T-07 |
| R3-4 | Generated per-Satchel OG image (Satori) | The brand `og-image.png`, site-wide | B-09 | −T-12 |

## Open questions / decisions for the design lead
All decisions, with defaults and the **Oct 31** deadline, are in **`plan/phase0-checklist.md` §6** (UX-1 … UX-34). The brand closes UX-2, -4, -5, -8, -9, -10, -11, -15, -16, -19, -20, -26 and -29; UX-1 is **reopened** with a new default.

Open (R3 defaults in the checklist): UX-1 (fiat total), UX-3 (moot → UX-31), UX-13 (Figma, partly done), UX-17 (home stack), UX-18 (desktop placement), UX-21 (landing hero), UX-22 (QR panel), UX-23 (toast and progress placement), UX-24, UX-25, UX-27, UX-28, UX-30, and the new UX-31 (per-token accent), UX-32 (landing H1 and tagline), UX-33 (global Activity) and UX-34 (pressed-state fix).

Cross-team questions (owner):
- **S1 (contract):** none new. R3 uses only kb/90 views, errors and events.
- **S2 (web), Day 1:**
  - Confirm `light-dark()` + `color-scheme` behave as specified with `data-theme` (kb/81 R3 CSS block) and that P1's forced Night has no Day flash.
  - Confirm next/font `Bricolage_Grotesque({ axes: ['opsz'] })` ships the `opsz` axis (the 16.4.2 typings allow it) and that `font-optical-sizing: auto` maps it.
  - Confirm the Tailwind 4.3.3 `--text-*` modifiers and `@utility`.
  - Confirm the FlowShell renders server-side without JS and that no judge fact sits only in its inert background; confirm the Incoming island, the PendingPill and the prices read never wrap judge facts in a Suspense boundary.
  - Day 2: check that Meteor and MyNearWallet render the card SVG's data-URI fonts (else outline the strings).
- **Release:** kb/90 §7.7's badge promise names "Solana devnet". If DP7 cuts the Solana UI and no SOL record exists, keep it verbatim or trim it? This is the spec owner's call; R3 keeps it verbatim. The brand tagline "on every chain" (OG, manifest) is a marketing line; product copy names the chains (UX-32).
