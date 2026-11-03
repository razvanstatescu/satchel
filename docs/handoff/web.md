# Handoff: `web` (apps/web)

Status (2026-10-22, wave 2): **Phase 1 routes + the P2 sale/market, the seller's Sold receipt + escrow/withdraw, the SOL
send flow (P2, behind a flag) and the font-embedded card SVG, all tested in fixture mode.** `next build` passes in fixture
and live mode; 122 vitest tests, 36 Playwright tests (fixture) and 265 `@satchel/core` tests pass; eslint: 0 warnings.
No testnet transaction was sent (live builds only made read-only RPC calls while prerendering).

**Wave 3 (2026-10-22): the marketing landing at `/`.** 154 vitest tests and 47 Playwright tests (fixture, role final) pass;
`next build` passes in fixture and live mode (live with no contract yet: facts read "unavailable", examples hide).
- Routes are now in two route groups (URLs unchanged): `(landing)/` = `/` and `/mint` with a full-width LandingShell
  (`(landing)/layout.tsx`: own header + in-page nav, RoleStrip, PendingIndicator, the shared Footer); `(app)/` = `contract`,
  `market`, `s` inside NavShell. The root layout no longer renders NavShell; `not-found.tsx` wraps itself in it.
- Sections live in `src/components/landing/` (assembled by `components/Landing.tsx`): Hero (live card #1) · LiveFacts
  (judge facts, full addresses) · HowItWorksSection (live receipts + `TransferDemo`, the click-to-play handoff) · UseCases ·
  TheCatch · CleanHistorySection (live clean/blocked examples from `getMarket()`) · NoAdminKey (`getContractFacts()`, dev
  twin) · Questions (every answer visible) · FinalCta. Shared: `primitives.tsx` (Section rhythm 64/96/128, SectionHead,
  Plate). Menu sheet: `client/LandingMenu.tsx`. Pure logic + tests: `lib/{landing-story,lock-facts,faq}.ts`.
- Copy: `copy.landing` (deck and the risky-claims list it was checked against are in the session notes; every claim is
  traced to kb/90 / kb/70 / decisions). Brass fills: only the two "See Satchel #1" buttons. Stitch: only the demo card.
- Photos (v1–v3 only): crops of the marketing plates in `src/assets/landing/`. Removed in wave 6 together with
  `scripts/build-landing-images.mjs`, the `images:landing` script and the `images` block in `next.config.ts`; the
  sources stay in `marketing/video/public/images/`.

**Wave 4 (2026-10-22): landing v2, motion and interactivity** (Razvan asked for a catchier, interactive page; the
brand's "nothing animates on entry" rule is relaxed for the landing only). 265 vitest tests and 85 Playwright tests
(fixture, role final) pass; fixture and live builds pass; axe clean in Night/Day × full/reduced motion; CLS ≈ 0.
- Order: Hero → live map → How it works (act 1, transfer demo) → The catch (act 2) → Clean history (act 3) → No admin
  key → Use cases → Questions → Final CTA. Acts 1–2 share one stage (`landing/stage/*`).
- Motion foundation `src/components/landing/motion/*` + `src/lib/motion-flag.ts`: a head script sets `<html data-js
  data-motion>`; content is never hidden unless `data-motion="full"` and `RevealController` has armed reveals; nothing
  reveals or autoplays inside `[inert]` (the `/mint` background). Each act self-runs once (≤ 5 s, ≥ 60 % in view, never
  under reduced motion) and keeps a replay control; `aria-live` only on user actions. `WalletFace` (`CardFaces.tsx`) and
  three optional `SatchelCard` props (`face`, `label`, `headingLevel="none"`); app pages render as before.
- Sections: live map with a real **Read again** (`/api/satchels/1`, only changed digits roll) and **Show the calls**
  (`lib/landing-calls.ts`); the catch simulator (`catch/CatchSim.tsx`, `lib/catch-script.ts`, personas, both endings in
  the SSR HTML); clean-history rules stepper + sticky instrument + **Run the check** replay of the real server check
  (`clean/*`, `lib/check-replay.ts`); the birth tape (`BirthTape.tsx`, `lib/birth-tape.ts`).
- Data: the live source now fills `birth_actions` from the FastNEAR tx API (`near/history.ts` `birthActions`/
  `readBirthActions`, `data/source.ts` `lock()`; fails soft to `[]` + an `errors` entry). `/contract`'s
  `ContractFactsGrid` doesn't show the action list yet.
- Human action for judging: keep a clean listing (e.g. #5) listed, or Run the check shows only the blocked #4.

**Wave 5 (2026-10-23): landing v3, clarity first** (D-41). Razvan found v2 crowded and mechanism-first; a comprehension
test measured it (5-second test 4/12, 8.5 % of the server HTML about value, use cases 68 % down the page). v3:
- **New H1:** "A wallet you can sell, with a history the buyer can check." "An NFT that is a wallet." stays the tagline
  (title tag, OG, README); `copy.home.h1` is pinned by the copy unit test.
- **Order:** Hero (subhead + a one-line problem) → Use cases ("Sending coins is easy. Handing over a wallet isn't.") →
  How it works (3 steps + the one-row transfer demo) → Clean history (the catch and the answer as one CatchSim with a
  Without/With toggle, opening on the drained end frame, no autoplay) → Trust band (`TrustBand.tsx`: "No admin key. Not
  even ours.", a one-line live proof of Satchel #1, what you still trust) + a closed **Under the hood** `<details>` (the
  six rules, Satchel #1's full addresses, "check it yourself" links) → five closed Questions → Try it.
- **Removed from the landing:** the live map, the check replay, the six-state instrument, the birth tape, DrawLine and
  travel. Their depth lives on `/s/1`, `/market`, the sale pages and `/contract`. Clean-history rule 1 and the chains
  answer share one Solana variant (`faq.ts` `LANDING_SOL`), so they can't contradict each other.
- **Guards in `test/e2e/landing.spec.ts`:** ≤ 900 visible words above Questions, ≤ 120 words in the hero and use cases,
  page ≤ 6,000 px at 1280; `responsive.spec.ts` keeps ≤ 8,500 px at 390. Final: 5,081 / 6,549 px, 632 words.
- **Polish after the re-test:** the hero adds a who-it's-for line and names NEAR; "Clean history" is defined in one line;
  Play runs both endings and ends on "Buy stays disabled"; the landing header says "Connect NEAR wallet" through
  `AccountControl`'s optional `connectLabel` (app pages keep "Connect wallet"); `copy.footer.noteClean` lost its "¹"
  marker and only shows on app pages.
- **Measured:** blind 5-second test 4/12 (v2) → 10/12; jargon 46 → 9; use cases first seen 69 % → about 10 % of the page.
  223 vitest tests and 77 Playwright tests pass; fixture and live builds pass.
- `birth_actions` still feeds `/api/contract` (public proof data); no landing UI reads it now.

**Wave 6 (2026-10-23): landing v4, friendly and simulated, light by default site-wide** (D-42). Razvan found v3 "too
serious and gloomy", the hero noisy and its visual static, and the catch section busy; he asked for generic, simulated
content. He picked direction C, "Saddle and cream", from three live prototypes, a scroll-driven catch story, and a light
default site-wide.
- **Theme:**
  - Day is the default for every first visit, whatever the OS.
  - `localStorage["satchel:theme:v1"]` holds `day`, `night` or `system`; anything else means Day. The toggle is
    Day · Night · System.
  - `THEME_HEAD_SCRIPT` resolves the theme before paint and keeps System live.
  - Day moved to cream (`--ground #FFF9F0`, raised `#FCEEDC`, `--ink-muted #5E4231`, new `--success`, `--danger` and
    `--chain-btc`, all AA); Night is unchanged.
  - Landing-only scopes in `globals.css`: `.scope-saddle`, `.scope-tile-*` and `.scope-night-band`. Lightning CSS
    polyfills `light-dark()`, so a scope must declare every token it uses.
  - The manifest and `themeColor` are cream.
- **The landing reads no data** (`Landing.tsx` is synchronous; guarded by `unit/landing-no-data.test.ts` and
  `e2e/landing-static.spec.ts`).
- **Sections:**
  1. Hero (H1, one line, two pills, and `landing/hero-loop/*`: a 14 s WAAPI loop with a pause toggle, paused off-screen,
     on a hidden tab, behind `/mint` and the menu sheet, and static under reduced motion or without JS);
  2. Use cases (illustrated tiles);
  3. How it works (3 static cards);
  4. Clean history: `landing/catch-story/*`, a scroll-driven sticky stage on a dark band, with stacked frames on phones;
  5. `TrustBand` ("No admin key" chosen by `CONTRACT_ROLE`, with no read);
  6. Under the hood (six rules and links, no addresses);
  7. Seven closed Questions (the browser-not-contract fact lives in `#q-proves`);
  8. Final CTA;
  9. `LandingFooter`.
- **Removed:** the v2/v3 motion primitives, stage, TransferDemo, CardFaces, `landing-story.ts`, `catch-script.ts`, the
  photo plates, and every live read on `/`. "My Satchels" still renders for a connected wallet.

**Wave 7 (2026-10-26): Satchel 2.0, the whole app rebuilt on the "Sticker S" brand** (D-44). Razvan replaced brand
1.0 (leather and brass) with Satchel 2.0 (`brand/`) and asked for the app and the site to be redone from scratch.
- **The team:**
  - research: brand system, app audit, Mobbin/web references, voice and copy;
  - design: a lead, a product designer and a motion designer, who made static prototypes;
  - a checkpoint with Razvan;
  - six builders: foundation, shell, landing, Satchel pages, send and give, commerce;
  - design QA, test QA and two blind tests.

  Specs, prototypes and QA notes are in `docs/design/satchel-2.0/`; the tokens are in `kb/81` R4.
- **Razvan's choices:**
  - the H1 "Sell a wallet with everything inside. The buyer checks it first." (two-tone), with a quiet who-line pill
    above it ("For anyone selling or gifting a wallet");
  - hero "the shelf": a sample card, price tag and check slip on a sky stage, with a 12 s loop and Pause;
  - **Day first whatever the OS** (D-42 kept);
  - a `#8A82AE` sticker outline in Night.
- **Tokens and theme:**
  - `globals.css` is rewritten: the 2.0 tokens as `light-dark()` on `:root, [data-scheme]`, the Tailwind defaults reset,
    the type utilities, `t-num`, `sticker` and `panel`.
  - `theme.ts` keeps the same mechanism and the `satchel:theme:v1` key, with new `GROUND` values (`#F6F5FB` /
    `#120C26`).
  - Fonts are Funnel Display, Onest and Geist Mono via `next/font/google`. The "Satchel Symbols" font is gone.
  - Icons, the OG/Twitter image (regenerated: "An NFT that is a wallet.", BTC + ETH charms), the manifest and
    `public/brand/*` are 2.0.
- **New structure:**
  - **App home `/satchels`** (My Satchels plus escrowed proceeds). `/` is marketing only and reads no data.
  - **`/mint`** moved under `(app)` and closes to `?from=`.
  - **One shell:** `src/components/NavShell.tsx` (`AppShell`, `TopBar` app/landing, `SideNav`, `MenuSheet`, `Footer`,
    `NotFoundView`). There is one connect label, "Connect NEAR wallet".
  - **Satchel's own wallet picker** (`client/ConnectButton` `useConnect`) calls near-connect's
    `connect({ walletId })`, which skips the library's own picker. This was verified in code and at runtime, with no
    sign-in.
  - **`/s/[id]`:**
    - the layout renders the article and its head;
    - the Wallet tab shows the full card and the 2×2 actions;
    - Activity and Sale get a compact header below 1024, and a sticky card column from 1024;
    - one `[data-judge-facts]` per page;
    - the Buy price, verdict and a pinned bar sit in the first screen on phones.
  - **Unknown ids:** the layout renders `NotFoundView` itself (HTTP 200, noindex, the heading in the server HTML). This
    replaces the earlier "soft 404 after the shell" (§3.5).
- **Vocabulary** (copy split into `src/lib/copy/{shell,satchel,flows,commerce,landing}.ts`, merged as `copy`):
  - Give / Giving… / Given;
  - Paused for sale;
  - Stop selling;
  - Add coins;
  - Used / Confirming / Not its coin;
  - "Sample data" (was "Fixture data").
- **The card:**
  - the charm ledger (each chain's charm and native amount; no fiat, no "{n} chains");
  - a lemon "Yours" badge (`data-yours`) replaces the stitch;
  - no per-token hue (`lib/card.ts` removed).
  - The NFT image (`/api/card/{id}.svg`) is redrawn in 2.0 with Funnel Display and Onest subsets.
- **Motion:**
  - WAAPI and CSS only (`src/lib/motion/{play,handoff}.ts`); **the `motion` package is removed**.
  - The hand-off is the brand's charm swing: carried along a strap, a damped 10° pendulum, a 3 px click; reduced
    motion is a dip.
  - FlowShell sheets take an opt-in `fill`, so the top edge stays put between steps.
  - Toasts carry state icons and sit above pinned bars.
  - The landing loop and its in-view moments are in `components/landing/` (WAAPI).
- **Honesty fixes from the audit:**
  - the server hint never says "checked in your browser";
  - a blocked listing never offers Connect;
  - the Market says "Server check …";
  - the owner's listing runs the browser check;
  - a failed check is "Can't verify", never clean.
  - The fixture-only switches `satchel:sim:clean` and `satchel:sim:usdc` live in `client/fixture-switches.ts`, and a
    unit test proves live mode never reads them.
- **Measured:**
  - unit tests 335/335;
  - Playwright 133/133 on two consecutive full runs (fixture, role final);
  - axe: 0 violations in 164 runs (41 routes and states × Day/Night × 390/1280);
  - keyboard: 10 flows completed without a mouse;
  - CLS 0 on `/`, `/s/1` and `/market`;
  - first-load JS (gz): `/` 336 KB, `/s/1` 392 KB, `/s/3/sale` 409 KB;
  - the live-mode build compiles and serves 200 with no contract yet (facts read "unavailable");
  - blind 5-second test: 9/12, then **11/12** with the who-line.
- **Open (outside the rebuild's scope):**
  - ~~In **live** mode while the contract can't be read, `lib/data/source.ts` renders a Satchel page instead of not
    found, and `lock()` maps an unknown account to `null`.~~ **Fixed the same day by satchel-da** (see "Fix 2026-10-26"
    below): a missing account or one with no code now 404s, and `lock()` reports `account_exists: false`.
  - In **fixture** mode, "Open Satchel #8" after a mint lands on not found, because the mint exists only in the browser
    simulation.
  - The "You have 12.40 USDC" line under Buy isn't built (no cheap balance read).
  - The Refunded and payout-pending states can't be reached with the mock wallet.

## 1. What is where
- `src/lib/config.ts` — zod env (kb/90 §8.4). `NEXT_PUBLIC_DATA_MODE=fixture|live` (default **fixture**, with a visible
  "Fixture data" strip on every page), `NEXT_PUBLIC_SATCHEL_CONTRACT` (default `satchel.satchelhq.testnet`),
  `NEXT_PUBLIC_CONTRACT_ROLE` (default `dev`). The near.org testnet RPC is refused by a regex (never written as a literal).
- `src/lib/near/` — `rpc.ts` (FailoverRpcProvider FastNEAR → dRPC, retries 2/250/×2; server adds the FastNEAR Bearer key),
  `contract.ts` (typed views + call builders, §5.6/§5.14, aligned with `docs/handoff/contract.md`), `track-tx.ts`
  (long-poll `tx` EXECUTED_OPTIMISTIC; classify 408/TIMEOUT (both nearcore shapes)/dRPC code 30/UNKNOWN/INVALID/429/5xx;
  rotate providers), `outcome.ts` (on_signed array, receipts_outcome fallback, ERR_* mapping, USDC used-amount),
  `history.ts` (FastNEAR `/v0/account`, `/v0/transactions` ≤ 20, height→tx, events per token), `wallet.tsx` (ONE
  NearConnector, testnet, `footerBranding: null`, no features filter; fixture mode uses `mock-wallet.ts` instead),
  `run-call.ts` (the 3-step subset for mint/transfer/list/delist/buy: hash → trackTx; never trusts the wallet value).
- `src/lib/signing/` — `types.ts` (PendingIntent, kb/90 §8.6 field names), `machine.ts` (pure state machine: the 10 s
  rejection rule, Intear timeout ≠ rejection, `h0 + 250` → unknown, timed_out, signed_not_sent, RETRY keeps nonce/inputs),
  `store.ts` (module-level, `localStorage["satchel:pending:v1"]`, persisted BEFORE the wallet opens, cross-tab sync),
  `watcher.ts` (match records by payload at seq ≥ s0), `runner.ts` (drives an intent from chain state; resume-on-load
  turns signed/broadcasting into "Signed, not sent" instead of broadcasting silently), `retry.ts` (§8.7), `client.ts`.
- `src/lib/chains/` (lazy, Send flow only) — `send.ts` (prepare EVM/BTC/SOL with `@satchel/core` builders; BTC collision
  rule via `referencedTxids`; retry reuse; BTC reads through core `MempoolClient`; SOL: `prepareSol` (rent/balance rules →
  `SolSendError.problem`), `refreshSolBlockhash` (D-09), `solBalance`, retry waits until the old `lastValidBlockHeight` has
  passed), `adapter.ts` (verify-before-broadcast, broadcast, confirmations; SOL: ed25519 verify via `attachSolSignature`,
  `broadcastSol`, "Blockhash not found"/expiry → `expired`, `isSolConfirmed`; BTC broadcast falls back only on provider
  failures, never after a 400).
- `src/lib/signing/sol-timing.ts` — D-09 numbers kept out of the chain bundle: ≤ 10 s at the click, refresh every 8 s.
- `src/lib/data/sale.ts` — the seller's side of a sale: `saleFromTxs` (pure: newest `sold` event of the token by this
  seller + the `payout` event of the same tx → paid / escrow / pending), `findSale` (live: FastNEAR `/v0/account` on the
  seller with `is_event_log`, fallback = the contract's last 40 txs; fixture: the simulation), `proceedsOf`, a shared cache
  per (token, seller). `components/client/useSale.ts` (`useMySale`, bounded re-check while the indexer trails),
  `components/client/SoldReceipt.tsx` (`SoldReceipt`, `EscrowPanel`, `useProceeds`).
- `src/lib/card-fonts.generated.ts` + `scripts/build-card-fonts.mjs` (`pnpm --filter web fonts:card`) — WOFF2 subsets
  (static instances) of Funnel Display 800 and Onest 500/600 for the 2.0 card SVG (Wave 7; was Bricolage/Instrument, see §3.6).
- `src/lib/data/` — `server.ts` ("use cache" reads: 15 s; 60 s for /contract; 1.5 s per upstream), `snapshot.ts`
  (the `/api/satchels/[id]` shape, shared by server + client), `source.ts` (live vs fixture), `fixtures.ts` (the D-32 demo
  world: #1 flagship, #2 bob's, #3 listed 5 USDC clean, #4 listed + unused nonce = blocked, #5 listed 1 NEAR clean BTC
  spend, #6/#7 empty; real Sepolia RLP + keccak payloads), `sim.ts` (fixture-only browser simulation of contract/MPC/
  chains; test knobs `satchel:sim:mode|delay`), `clean.ts` (aggregate + gate modes + fixture report), `clean-live.ts`
  (`@satchel/core/clean-history` with 2 NEAR sources, 2 Sepolia, mempool + emzy, devnet; maps the core report).
- `src/lib/{copy,format,theme,card,card-svg,clock,derive,validate,view}.ts` — copy deck (kb/80 R3), formatting, theme head
  script, card hue (core `tokenLeather`), NFT media SVG, shared clock, derivation (core), recipient validation.
- Routes: `/`, `/s/[id]` (+ `/activity`, `/send`, `/receive`, `/transfer`, `/sale[?list]`), `/mint`, `/contract`,
  `/market`, `/api/satchels/[id]`, `/api/contract`, `/api/clean-history/[id]`, `/api/card/{id}.svg`.

Tests: `test/unit/*.test.ts` (vitest; new this wave: `sale`, `sol-send`, `card-svg` + its `__snapshots__`;
`fake-window.ts` is a test helper) and `test/e2e/*.spec.ts` (Playwright, fixture build; new: `sale-sol.spec.ts`).

## 2. Live vs fixture
| Piece | Live | Fixture |
|---|---|---|
| NEAR views (nft_*, satchel, sig_records, listings, config) | FastNEAR → dRPC | `fixtures.ts` + `sim.ts` overlay |
| Addresses | `@satchel/core/derive` (no network) | same (fixture contract id = final id; test pins the research/final-addresses values) |
| Balances | mempool.space `/address`, Sepolia `eth_getBalance` (1.5 s) | fixture balances |
| Lock facts (/contract) | view_account + access keys + FastNEAR `is_any_signer` / oldest tx + MPC `version` | fixture: keyless, code hash = fixture hash |
| Activity | FastNEAR tx API events | fixture events |
| Clean history | `@satchel/core/clean-history` (browser gates Buy; server = hint, 8 s cap) | fixture report (#4 blocked) |
| Send build/broadcast | core builders + viem / `MempoolClient` / Solana devnet `Connection` | core builders with fixture nonce/fees/UTXOs and a clock-driven devnet stand-in (240 ms blocks, blockhash life 150 blocks); simulated broadcast with the live SOL expiry rule |
| Sold receipt / escrow | FastNEAR `sold` + `payout` events; `proceeds_of`; `withdraw_proceeds` (3-step subset) | the simulation records each sale and its payout; knob `satchel:sim:payout` = `fail` (sale payout fails → proceeds) / `fail-always` (withdraw fails again → re-credited) |
| Wallet | near-connect 0.11.4 | mock wallet (labelled "fixture"); applies effects via the core reference classifier |

**Production must set `NEXT_PUBLIC_DATA_MODE=live`.** The fixture strip makes a mistake visible, but please set it.

**Solana flags (P2, cut-1):** `NEXT_PUBLIC_SOL_SEND=on` adds Solana to the Send flow's ChainSelect and accepts
`/s/[id]/send?chain=sol`; `NEXT_PUBLIC_SOL_UI=on` is the wider SOL UI (cards, wallet rows, Receive) and implies SOL_SEND.
Both default **off** (DP7 / cut order). The Playwright build sets `NEXT_PUBLIC_SOL_SEND=on`. The clean-history checker
always has a SOL source (`cleanSources()` in `clean-live.ts`, pinned by a unit test), so Buy is never blocked by an
`unknown` SOL account check, whatever the flags.

## 3. Deviations (safer option chosen)
1. **No TanStack Query.** Under `cacheComponents`, a client hook that reads the clock during render (useQuery's staleness
   check) postpones the prerender, and the judge page then fails to build without a Suspense fallback. Client refresh is a
   tiny shared poller (`lib/data/client.ts`, 15 s live / 2 s fixture); `@tanstack/react-query` is not a dependency.
2. **No shadcn.** Every component is custom per kb/80 R3 (native `<dialog>` semantics in FlowShell, `<details>`, links);
   nothing ships stock defaults. (Wave 7: the `motion` package was removed; all motion is WAAPI/CSS.)
3. **Theme.** Superseded by D-42 and D-44: Day first whatever the OS; the System · Day · Night control (one per surface:
   the side nav, the menu sheet, the landing footer) writes `satchel:theme:v1`; the inline head script applies it before first paint.
4. **Solana address in the Facts grid.** The brief asks for three full addresses on `/s/1`; SOL is shown as a fact
   ("signable by the contract; sending from the app comes later"; with SOL_SEND on: its balance + "the owner can send SOL
   from the app"), not as a wallet row (SOL UI is P2).
5. **Unknown ids are a soft 404** (HTTP 200 + noindex + the not-found UI). Wave 7: the `/s/[id]` layout renders
   `NotFoundView` itself, so the heading is in the server HTML (it used to render after the shell was sent). `/api/satchels/[id]` is a hard 404. A hard 404 would need `dynamicParams=false` (breaks new mints) or a proxy.
6. **Card SVG fonts (D-23; kb/80 R3 "NFT SVG"):** three WOFF2 subsets are embedded as `data:` URIs (≈ 16 KB of fonts; the
   SVG is ≈ 24.5 KB): "Satchel Card Display" = Bricolage 650 (opsz 24) for the name and the status word, "Satchel Card
   Hero" = Bricolage 700 (opsz 36) for "{n} signatures", "Satchel Card Sans" = Instrument Sans 500 for the chips and the
   sub line. Only the glyphs the card can draw (digits + the fixed words); a unit test checks the coverage for every
   status and id/count shape, and pins the bytes (sha256). Sources: google/fonts at pinned commits, sha256-checked, OFL
   1.1 (no Reserved Font Name; the notice is in the generated file). Families are renamed so an installed copy never
   substitutes; the brand names then `system-ui` remain as fallbacks for renderers that ignore `@font-face` (e.g. resvg).
   Checked in headless Chromium: with the brand-name fallbacks removed, the embedded faces still render. The pill word
   moved from Instrument 600 to Bricolage 650 per kb/80. Still `[ASSUMED]`: how each wallet's image pipeline treats it.
7. Lint: 0 errors, 0 warnings. The ten warnings were fixed with external stores (`useLiveSnapshot`, `ThemeControl`),
   keyed/derived state (Send/Transfer validation, MySatchels loading, Incoming), render-phase stage tracking (SendFlow),
   timer-callback starts (`useCleanCheck`), a path-keyed menu state (NavSheet) and `router.push` (Sell flow).
8. FreezeBanner's "Delist" calls `delist` directly (toast on result); the Sale tab's Delist uses the tracked 3-step path.
9. **Sold receipt (kb/80 R3 "Sold (seller)"):** shown on the Sale tab to the connected account named as `seller_id` in the
   token's latest `sold` event (and not the current owner); the tab then reads **Sold** (a label kb/80 doesn't name), the
   card shows the Sold pill without the stitch. Rows: Price · Buyer · Paid · Listing · Transaction. The escrow amount is
   always `proceeds_of` (state wins over the event): owed ⇒ "{amount} is waiting for you." + **Withdraw**; the event said
   escrow but nothing is owed ⇒ "Withdrawn from escrow". The escrow panel also shows on My Satchels (proceeds are per
   account, not per Satchel). USDC escrow first offers "Register for USDC (0.00125 NEAR)" when `storage_balance_of` is
   null (otherwise the payout would fail again). After Withdraw the app re-reads `proceeds_of` (≤ 6 s) and says so if the
   payout was re-credited.
10. **SOL send (D-09):** Review prefetches the blockhash and refreshes it every 8 s while idle; the click handler refuses a
   hash older than 10 s (no await before the wallet: it refreshes and asks for a second click). `expired` shows the
   FailureCard with **Try again**, which rebuilds on the same intent (no second intent in flight); a SOL retry waits until
   the chain is past the old `lastValidBlockHeight` (at most one can land, §8.7). An `expired` SOL intent no longer
   blocks a new send (its signature can never land). Recipient: base58 → 32 bytes (error), self (error), PDA (warning +
   "I checked this address"). Rent rules map to kb/80 E25/E26. Max = balance − 5000 lamports.

## 4. Needed from other agents
- **contract:** nothing blocking; the interface in `contract.md` matches `lib/near/types.ts` / `contract.ts`. D1
  (`listable_at = 0` when never signed) is handled. Please keep `sign_for`'s tx result = on_signed's array (we decode it).
- **core:** thanks — derive, policy, chains/{evm,btc,sol}, clean-history, card are wired. Mock wallet uses
  `classifySignRequest`. `lib/chains` now uses `MempoolClient` (rename done). I added five small SOL helpers to
  `chains/sol` (listed in `core.md` §2), with tests; nothing existing changed.
- **human / orchestrator:** set `NEXT_PUBLIC_EXPECTED_CODE_HASH` for rc/final (missing ⇒ unsafe by design), the FastNEAR
  key (server only), the final app host in `NEXT_PUBLIC_APP_URL` (= the contract's `base_uri` host). Decide DP7 (keep the
  Solana UI?) and set `NEXT_PUBLIC_SOL_SEND` / `NEXT_PUBLIC_SOL_UI` accordingly (both in `.env.example`). New pinned
  devDependency `subset-font@2.9.0` (card font generator only; never bundled) — `pnpm-lock.yaml` changed.

## 5. Open issues
- Live paths (wallet, RPC, broadcast, `withdraw_proceeds`, the SOL devnet broadcast) are untested end to end here: no
  testnet tx in this wave. First live run: Day 1 smoke. Things to watch there: the FastNEAR `is_event_log` lookup for the
  seller's `sold`/`payout` events; the devnet public RPC's rate limit with an 8 s blockhash refresh on Review.
- SOL is behind `NEXT_PUBLIC_SOL_SEND` / `NEXT_PUBLIC_SOL_UI` (default off) until DP7 is decided; with SOL_UI on, the
  card chips, wallet rows and Receive need a visual pass (not done: the flag only flips `UI_CHAINS`).
- Card SVG: whether each wallet (MyNearWallet, Meteor, Intear) honours data-URI fonts in an `<img>` SVG is still the kb/80
  `[ASSUMED]` item (Day 2 check); the fallback is the brand names then `system-ui`, so the worst case is today's look.
- Global Activity cut (D-37).
- Root `pnpm-workspace.yaml`: I set `allowBuilds: sharp: false, unrs-resolver: false` (pnpm 11 placeholder).


## Fix 2026-10-26 (satchel-da): live mode, unreadable contract
- `lib/data/source.ts`: new `isMissingAccountError()` (near-api-js `AccountDoesNotExistError` / `UNKNOWN_ACCOUNT`) and `isNoCode()`. `lock()` now maps a missing account to `account_exists: false, locked: false` (it was `null`).
- `lib/data/snapshot.ts`: when neither `nft_token` nor `satchel` can be read **and** the account is missing or has no code, `buildSnapshot` returns `null` (404) instead of a degraded "Active · 0 signatures" page. A plain RPC outage (state unknown) still renders degraded.
- Test: `test/unit/live-missing-contract.test.ts` (5). Full suite after the fix: tsc 0, lint clean, vitest 340/340, Playwright 133/133.

## Update 2026-10-27 (D-45): the website names Bitcoin, Ethereum and Solana
- **Landing:** it always uses its Solana copy variants (`LANDING_SOL = "ui"`, `LANDING_NAMES_SOL` in `lib/faq.ts`),
  independent of the app's SOL flags. This covers the hero line, What it is, How it works, Under the hood, the chains
  answer and the meta description. `copy.home.lead` (the site description) names all three chains.
- **What it is:** the card now hangs three address tags. Each tag shows the chain name and a short address, and stacks
  its coin over the name below 768 px and at 1024–1279. Every string meets the card from 320 to 1440 px.
- **Images:** the OG/Twitter image has all three coin charms.
- **Tests:** unit 340/340; Playwright 133/133. The landing specs now pin the three-chain variants.

## Update 2026-10-27 (D-46): the Solana UI is on by default
- **The flag:** `NEXT_PUBLIC_SOL_UI` now defaults to `on` (`lib/config.ts`). The "Both default off" note in §2 is
  superseded. `off` stays as the cut switch.
- **The app** shows SOL in the card ledger, Inside rows, Add coins, Send, the Mint preview and "You get", the NFT image
  chips and `/s/[id]`'s meta description. App copy names the chains through `lib/copy/chains.ts` (`chainList()`).
- **The landing** hangs a third (Solana) coin on the hero shelf (from 1100 px) and on the phone's charm row. The first
  caption is "Coins inside", the use case "Sell BTC, ETH and SOL together", and the FAQ names all three chains.
- **Tests:**
  - unit 340/340; Playwright 133/133;
  - `responsive.spec`'s menu-row height check now waits for the sheet to settle (it was flaky mid-slide);
  - the `playwright.config.ts` environment still sets `NEXT_PUBLIC_SOL_SEND=on`, which is now redundant.

## Update 2026-11-03 (D-51): the landing catches up with the feature sprint
- **Copy** (`lib/copy/landing.ts`, `lib/faq.ts`):
  - What it is, `q-keys` and the strip name someone the owner lets spend within daily caps.
  - Under the hood rule 1 lists what the contract signs (ETH and USDC on four Ethereum testnets, Bitcoin, SOL, text
    messages). Rules 3, 5 and 6 cover offers.
  - `q-chains`, `q-proves` and `q-cost` cover USDC, the L2s, NEAR held inside, messages and giving by link.
  - `q-testnet` has a dev twin (`aDev`), picked in `faqItems` on the dev role.
- **App strings:**
  - the header badge's tooltip and `proof.cleanTip` name Solana and the four Ethereum testnets;
  - the send lines say "the owner, or someone they let spend within daily caps";
  - Sign a message and Take it all out keep owner-only guards (`multichain.msg.guard`, `walletOps.empty.guard`).
- **Art** (`landing/art.tsx`, `landing.css`, `hero/*`):
  - `ArtOverview` mimics the app's value card (D-50): "≈ $8,000.00 at mainnet prices", value bar, chips with shares,
    "+N", pill.
  - `ArtEmpty` is the app's empty card ("Nothing inside yet"), shown in How step 1.
  - The sample is `copy.landing.desk.{usd, mix}`, formatted at render by `usdText()`/`shareText()`. Both moved to
    `lib/format.ts` and are re-exported by `lib/overview.ts`.
  - The hero loop has 37 `data-k` keys (was 31). Act 1 fills the bar's segments as the chips stick on (560–1,640 ms),
    then shows the estimate (2,100 ms).
- **The strip:** `landing/MoreSection.tsx` + `more.css` (`#more`), between Trust and Questions. It has five items with
  `HelpLink`s to `/questions`.
- **Offers:** `MakeOfferFlow` (`Market.tsx`) refuses when the signature count moved during the re-check, and binds the
  checked count, as Buy does (`offers.spec.ts` regression test).
- **Budgets:** above Questions ≤ 380 words; page height ≤ 9,000 px at 390 (was 8,500) and ≤ 6,500 at 1280.
- **Research and design:** `docs/design/site-refresh/`; the blind test is `docs/design/satchel-2.0/tests/blind-test-3.md`.
- **Tests:** tsc 0, lint clean, vitest 636/636, Playwright 305/305 (`CI=1 E2E_PORT=3337`).
