# Satchel UI capture (fixture mode) for the Remotion video

Captured 2026-10-22 from `apps/web` (Next 16.4.2 dev server, Turbopack) in **fixture mode, contract role `final`**, Night theme by default.
Output: `marketing/video/public/ui/` (146 files, 38 MB). Script: `marketing/tools/capture/capture.mjs`. Machine-readable index: `marketing/tools/capture/manifest.json`.

## How it was captured

- **Data.** Everything is fixture data from `apps/web/src/lib/data/fixtures.ts`. The #1 addresses are the real derived addresses. Balances, signatures, NEAR tx hashes and timestamps are placeholders. If the final cut claims live data, re-capture these screens against the live deploy.
- **Fixture strip hidden.** The app prints a "Fixture data: these pages show sample state…" strip on every page in fixture mode. The script hides it with injected CSS at capture time (the product code is unchanged). `desktop/s1-wallet-RAW-with-fixture-strip@2x.png` shows the page as served. Pass `--keep-strip` to capture with the strip.
- **Owner and buyer views.** These use the app's own fixture mock persona: localStorage `satchel:mock-wallet` set to alice or carol, the same mechanism the e2e tests use. Flows run against the in-browser simulation (`lib/data/sim.ts`). **No wallet was connected and nothing was signed or sent.** Every request not addressed to 127.0.0.1 was aborted at the browser level. Blocked-request log: **none attempted.** No console errors or page errors were recorded.
- **Capture settings.** Each shot waits for network idle and `document.fonts.ready`. Screenshots use `animations: "disabled"` with the caret hidden. The Next dev indicator is hidden. The handoff spring is JS-driven (motion), so its end state is captured after a 2.6–3 s wait.
- **Component crops.** These are rendered at deviceScaleFactor 3 with `html, body` made transparent, so crops on the page ground composite cleanly. Padded card crops (`card-*` without `-tight`) hide every other element and keep a 48 css px margin so the soft shadow survives as alpha. Crops marked "Opaque" sit on their own surface or the dialog surface.

## Re-run

```bash
cd apps/web
NEXT_PUBLIC_DATA_MODE=fixture NEXT_PUBLIC_CONTRACT_ROLE=final \
NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet NEXT_PUBLIC_APP_URL=http://127.0.0.1:3107 \
NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next dev -p 3107 -H 127.0.0.1 &   # writes only .next/dev (gitignored)
cd ../..
node marketing/tools/capture/capture.mjs                       # everything, about 4 min
node marketing/tools/capture/capture.mjs --only flows,cards     # subsets: desktop,mobile,components,flows,day,cards
node marketing/tools/capture/capture.mjs --keep-strip           # keep the "Fixture data" strip
kill %1; lsof -nP -iTCP:3107 -sTCP:LISTEN                       # must print nothing
```

- **Browser.** Playwright 1.64.1 from `apps/web/node_modules` with the cached Chromium 1248. Nothing was installed.
- **Optional variants.** For the 3-chain variant (P2, undecided DP7), add `NEXT_PUBLIC_SOL_UI=on` to the server env. The Day theme is captured through `prefers-color-scheme: light`.

## Assessment

### Strong enough to show judges, as screenshots or 3D-tilted plates
1. `desktop/home@2x.png`: H1 "An NFT that is a wallet." with the brass card. Clean hero.
2. `desktop/s1-wallet@2x.png`: card, stats, BTC and ETH rows with grouped mono addresses, then the Facts. The best single product screen.
3. `flows/send-evm-4-review-acked@2x.png` → `flows/send-evm-5-signing@2x.png` → `flows/send-evm-6-confirmed@2x.png`: the send story, ending on "Signing with NEAR's signer network".
4. `flows/transfer-6-handoff@2x.png` (and `-6a-handoff-midmotion`): "bob.satchelhq.testnet now controls 0.00189718 BTC and 0.048979 ETH."
5. `components/clean-history-s3-clean@3x.png` and `components/clean-history-s4-blocked@3x.png`: the headline feature (verdict, checks, signature rows). `flows/buy-s4-blocked@2x.png` shows the blocked purchase in context.
6. `desktop/contract@2x.png` / `components/contract-facts@3x.png`: "Born without a key", the code hash shown as "Matches", and 0 signer txs.
7. `flows/mint-1-preview@2x.png`, `components/card-s1-active-owned@3x.png` (the stitch) and `mobile/s1-wallet@3x.png`.

### Looks unfinished or worth fixing before the final cut (product issues, not capture issues)
- **Repetitive card body.** Every card reads "2 chains / Balances below" over a large empty body. Cards on the Market and in My Satchels look identical apart from the number. The per-token leather hue is too subtle to tell apart on screen.
- **NFT media disagrees with the app.** The NFT media SVG (`cards/*.svg`) says "2 signatures · recorded on NEAR testnet" and shows **SOL** chips, while the app hides SOL (SOL_UI off). The two artefacts disagree.
- **Market.** The plural bug reads "1 signatures". The page feels empty with 3 listings.
- **Raw strings in the listing strip.** The /s/[id]/sale listing strip prints the raw aggregate in lowercase ("blocked · 2026-10-22 08:40:58 UTC", "clean · …"). It reads as debug text.
- **Stale state after a buy.** After the simulated buy, the listing facts strip (5.00 USDC / Listing #3) is still shown above "Satchel #3 is yours." While signing, the card and pills say Signing but Facts still says "Active".
- **Mobile address wrap.** On mobile the truncated BTC address in the ChainRow wraps onto 2 lines.
- **Mock persona label.** The account pill shows a "fixture" tag (`alice.s… fixture`) in every owner and buyer shot. Crop it out or rebuild the frame.
- **Timestamps.** The fixture "now" (2026-10-20) and the capture time (2026-10-22 08:3x UTC) both appear in different places.
- **Visitor guards.** The visitor Send and Transfer dialogs show only a connect guard, so use the owner flow shots instead.

### Rebuild natively in React/Remotion rather than animating PNGs
These components are small, token-driven and animate better as live DOM: real springs, the stitch draw-in and number roll-ups.

| Component | Source (exact styles) | Why |
|---|---|---|
| SatchelCard + Stitch | `apps/web/src/components/SatchelCard.tsx`; tokens in `apps/web/src/app/globals.css` (`--brass-gradient`, `--sh-card`, `--stitch`, radius-card 22px, aspect 1.586); per-token hue in `apps/web/src/lib/card.ts` (`@satchel/core/card` `tokenLeather`) | The hero object. Tilt, lift, stitch `stroke-dashoffset` draw (keyframe `stitch-in`), and band pill swaps |
| Handoff animation | `apps/web/src/components/client/Handoff.tsx`: lift spring 260/22/1, handoff spring 120/18/1.2, 6° tilt, 1.04 scale, stitch draws on landing | The brand's signature motion, specified exactly |
| StatusPill / ItemPill / ChainDot / ChainMark / Banner | `apps/web/src/components/ui.tsx` | Tiny. State colours in globals.css (`--success`, `--frozen`, `--danger`, `--band-pill`) |
| CleanHistory verdict, rows, GateLine | `apps/web/src/components/Clean.tsx` (copy in `apps/web/src/lib/copy.ts`) | Animate the check from checking → clean or blocked, with rows ticking in |
| SigningProgress tracker | `apps/web/src/components/client/SigningProgress.tsx` | Step-by-step state machine; `pulse` keyframe in globals.css |
| ChainRow + AddressDisplay | `apps/web/src/components/ChainRow.tsx`, `apps/web/src/components/AddressDisplay.tsx` (4-char groups, first two and last in ink 600) | Address reveal and balance count-up |
| FlowShell (dialog) | `apps/web/src/components/client/FlowShell.tsx` + `.flow-shell` in globals.css (480px, radius 22, `dialog-in` 200ms) | A frame for any step |

- **Fonts.** Bricolage Grotesque (display, opsz), Instrument Sans (UI) and Spline Sans Mono (addresses, `"zero" 1`), loaded via next/font in `apps/web/src/app/layout.tsx`.
- **Brand assets.** Logo and lockups are in `apps/web/public/brand/` (also `brand/`).
- **Dense screens.** Keep the Facts, contract page, Activity and Market as PNG plates (zoom, pan and parallax). They are dense text and gain nothing from a rebuild.

## Index

| File | Route / component | Size (px) | What it shows | Quality notes |
|---|---|---|---|---|
| `cards/1.svg` | /api/card/1.svg | 0 0 800 504 | NFT media SVG #1 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/2.svg` | /api/card/2.svg | 0 0 800 504 | NFT media SVG #2 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/3.svg` | /api/card/3.svg | 0 0 800 504 | NFT media SVG #3 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/4.svg` | /api/card/4.svg | 0 0 800 504 | NFT media SVG #4 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/5.svg` | /api/card/5.svg | 0 0 800 504 | NFT media SVG #5 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/6.svg` | /api/card/6.svg | 0 0 800 504 | NFT media SVG #6 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/7.svg` | /api/card/7.svg | 0 0 800 504 | NFT media SVG #7 (embedded fonts) | Raw SVG with embedded WOFF2 fonts |
| `cards/card-svg-1@2x.png` | /api/card/1.svg | 2400x1512 | NFT media SVG #1 rasterised at 1200 css px | NFT media: "2 signatures" + BTC/ETH/SOL chips (SOL shown here though the app hides SOL) |
| `cards/card-svg-3@2x.png` | /api/card/3.svg | 2400x1512 | NFT media SVG #3 rasterised at 1200 css px | NFT media, Listed |
| `components/action-row-owner@3x.png` | /s/1 | 1200x213 | Owner action row: Send / Fund / Transfer / Sell | Transparent crop, finished |
| `components/address-btc-grouped@3x.png` | /s/1 | 1122x48 | AddressDisplay grouped (BTC tb1q…) | Transparent crop, finished |
| `components/address-evm-grouped@3x.png` | /s/1 | 1122x48 | AddressDisplay grouped (EVM 0x…) | Transparent crop, finished |
| `components/blocked-banner-s4@3x.png` | /s/4/sale | 2160x330 | Danger banner: blocked, nonce 1 not used yet | Transparent crop, finished |
| `components/buy-block-s3-clean@3x.png` | /s/3/sale | 2160x729 | Buy block #3: 5.00 USDC, GateLine clean, Buy enabled | Transparent crop, finished |
| `components/buy-block-s4-blocked@3x.png` | /s/4/sale | 2160x663 | Buy block #4: 2 NEAR, GateLine blocked, Buy disabled | Transparent crop, finished |
| `components/card-s1-active-day@3x.png` | /s/1 | 1488x1044 | SatchelCard #1 in Day theme (surface body) | Day body = white surface; isolated |
| `components/card-s1-active-owned-tight@3x.png` | /s/1 | 1200x759 | SatchelCard #1 owned, tight crop | Transparent crop, finished |
| `components/card-s1-active-owned@3x.png` | /s/1 | 1488x1044 | SatchelCard #1, Active, OWNED: saddle stitch visible | Transparent, stitch visible |
| `components/card-s1-active-tight@3x.png` | /s/1 | 1200x759 | SatchelCard #1, Active, tight crop (transparent rounded corners) | Transparent crop, finished |
| `components/card-s1-active@3x.png` | /s/1 | 1488x1044 | SatchelCard #1, Active, visitor (no stitch), with shadow | Transparent PNG, card isolated, shadow kept (48 css px pad) |
| `components/card-s2-active@3x.png` | /s/2 | 1488x1044 | SatchelCard #2, active, visitor, per-token leather hue | Transparent crop, finished |
| `components/card-s3-listed@3x.png` | /s/3 | 1488x1044 | SatchelCard #3, listed, visitor, per-token leather hue | Transparent crop, finished |
| `components/card-s4-listed@3x.png` | /s/4 | 1488x1044 | SatchelCard #4, listed, visitor, per-token leather hue | Transparent crop, finished |
| `components/card-s5-listed-owned@3x.png` | /s/5 | 1488x1044 | SatchelCard #5, Listed, owned (stitch + Listed band pill) | Transparent crop, finished |
| `components/card-s6-active@3x.png` | /s/6 | 1488x1044 | SatchelCard #6, active, visitor, per-token leather hue | Transparent crop, finished |
| `components/chainrow-btc@3x.png` | /s/1 | 2160x261 | ChainRow Bitcoin testnet4 | Transparent crop, finished |
| `components/chainrow-evm@3x.png` | /s/1 | 2160x261 | ChainRow Ethereum Sepolia | Transparent crop, finished |
| `components/chainrows-s1@3x.png` | /s/1 | 2160x525 | ChainRows (Bitcoin testnet4 + Ethereum Sepolia) with grouped addresses, copy/QR/explorer | Transparent crop, finished |
| `components/clean-history-s3-clean@3x.png` | /s/3/sale | 2160x1359 | CleanHistory report: CLEAN verdict, checks, settled signature row | Transparent crop, finished |
| `components/clean-history-s4-blocked@3x.png` | /s/4/sale | 2160x1359 | CleanHistory report: BLOCKED verdict, 'Can still move coins' group | Transparent crop, finished |
| `components/clean-row-s3-settled@3x.png` | /s/3/sale | 2064x234 | Clean-history row: EVM nonce 0, Settled pill | Transparent crop, finished |
| `components/clean-row-s4-unused@3x.png` | /s/4/sale | 2064x234 | Clean-history row: nonce 1 not used yet, Unused pill | Transparent crop, finished |
| `components/clean-verdict-blocked@3x.png` | /s/4/sale | 2064x162 | Blocked verdict headline | Transparent crop, finished |
| `components/clean-verdict-clean@3x.png` | /s/3/sale | 2064x162 | Clean verdict headline (shield + text) | Transparent crop, finished |
| `components/contract-facts@3x.png` | /contract | 3456x1266 | Contract facts (keys: locked, birth tx, signer txs 0, code hash, expected Matches, MPC) | Transparent crop, finished |
| `components/contract-verify-commands@3x.png` | /contract | 3456x1086 | Copy-paste verify commands | Transparent crop, finished |
| `components/dialog-mint@3x.png` | /mint | 1440x1932 | Whole Mint dialog as alice | Transparent crop, finished |
| `components/dialog-receive-btc@3x.png` | /s/1/receive?chain=btc | 1440x2256 | Whole Receive dialog (FlowShell) | Transparent crop, finished |
| `components/facts-s1@3x.png` | /s/1 | 2160x1827 | Judge facts block for #1 (owner, status, sig count, 3 full addresses, keys, code hash) | Transparent crop, finished |
| `components/freeze-banner-owner@3x.png` | /s/5 | 2160x336 | FreezeBanner owner copy with Delist | Transparent crop, finished |
| `components/freeze-banner-visitor@3x.png` | /s/4 | 2160x228 | FreezeBanner (visitor copy) | Transparent crop, finished |
| `components/gateline-blocked@3x.png` | /s/4/sale | 567x54 | GateLine: blocked, 1 unused signature | Transparent crop, finished |
| `components/gateline-clean@3x.png` | /s/3/sale | 615x54 | GateLine: clean (browser check) | Transparent crop, finished |
| `components/gateline-hint-s3@3x.png` | /market | 987x57 | GateLine server hint for #3 | Transparent crop, finished |
| `components/gateline-hint-s4@3x.png` | /market | 570x57 | GateLine server hint for #4 | Transparent crop, finished |
| `components/gateline-hint-s5@3x.png` | /market | 987x57 | GateLine server hint for #5 | Transparent crop, finished |
| `components/home-hero@3x.png` | / | 3456x849 | Landing hero block (H1 + card) | Transparent crop, finished |
| `components/how-it-works@3x.png` | /s/1 | 2160x708 | How it works 1-2-3 | Transparent crop, finished |
| `components/listing-facts-s3@3x.png` | /s/3/sale | 2160x258 | Listing facts strip (price, listing #, signatures, server hint) | Transparent crop, finished |
| `components/market-item-s3@3x.png` | /market | 1230x1053 | Market item #3: card + price + GateLine hint | Transparent crop, finished |
| `components/market-item-s4@3x.png` | /market | 1230x1053 | Market item #4: card + price + GateLine hint | Transparent crop, finished |
| `components/market-item-s5@3x.png` | /market | 1230x1053 | Market item #5: card + price + GateLine hint | Transparent crop, finished |
| `components/mint-preview-card@3x.png` | /mint | 1338x849 | Mint preview card (stitched, 'Your new Satchel') | Transparent crop, finished |
| `components/navtabs-s1@3x.png` | /s/1 | 2160x135 | Tabs Wallet / Activity | Transparent crop, finished |
| `components/owner-pill@3x.png` | /s/1 | 564x78 | Owner pill 'Owned by you' | Transparent crop, finished |
| `components/pill-active@3x.png` | /s/1 | 243x84 | StatusPill Active | Transparent crop, finished |
| `components/pill-band-active@3x.png` | /s/1 | 222x75 | StatusPill (band variant) Active | Transparent crop, finished |
| `components/pill-item-unused@3x.png` | /s/4/sale | 267x84 | Item pill: unused (danger) | Transparent crop, finished |
| `components/pill-listed@3x.png` | /s/4 | 240x84 | StatusPill Listed | Transparent crop, finished |
| `components/receive-qr-btc@3x.png` | /s/1/receive?chain=btc | 1338x1071 | Receive plate: brass band, QR, grouped BTC address | Transparent crop, finished |
| `components/sidebar-nav@3x.png` | /s/1 | 672x2700 | Left navigation with Satchel lockup | Opaque (own surface background) |
| `components/stats-strip-s1@3x.png` | /s/1 | 2160x246 | Stats strip: Status pill Active, signatures 2, listed —, minted | Transparent crop, finished |
| `components/timeline-row-1-expanded@3x.png` | /s/1/activity | 2160x546 | Timeline row expanded (date, fee, to, NearBlocks + mempool links) | Transparent crop, finished |
| `components/timeline-row-1-sent@3x.png` | /s/1/activity | 2160x192 | Timeline row 1 (sent) | Transparent crop, finished |
| `components/timeline-row-2-sent@3x.png` | /s/1/activity | 2160x195 | Timeline row 2 (sent) | Transparent crop, finished |
| `components/timeline-row-3-minted@3x.png` | /s/1/activity | 2160x180 | Timeline row 3 (minted) | Transparent crop, finished |
| `components/timeline-s1@3x.png` | /s/1/activity | 2160x933 | Timeline (all rows, day groups) | Transparent crop, finished |
| `day/home@2x.png` | / | 2880x1800 | Landing, Day theme (viewport) | Finished |
| `day/market@2x.png` | /market | 2880x1800 | Market, Day theme (viewport) | Finished |
| `day/s1-wallet@2x.png` | /s/1 | 2880x1800 | Satchel #1, Day theme (viewport) | Finished |
| `day/s4-sale@2x.png` | /s/4/sale | 2880x1800 | Satchel #4 sale (blocked), Day theme (viewport) | Finished |
| `desktop/contract-full@2x.png` | /contract | 2880x2922 | Contract page: 'Born without a key', facts, verify commands (full page) | Finished |
| `desktop/contract@2x.png` | /contract | 2880x1800 | Contract page: 'Born without a key', facts, verify commands (viewport) | Finished; dense mono, reads best as a zoom target |
| `desktop/home-full@2x.png` | / | 2880x2110 | Landing: H1 'An NFT that is a wallet.', hero card #1, how it works, proof grid (full page) | Finished |
| `desktop/home-owner-full@2x.png` | / | 2880x3322 | Home with My Satchels (owner alice) (full page) | Finished |
| `desktop/home-owner@2x.png` | / | 2880x1800 | Home with My Satchels (owner alice) (viewport) | Finished |
| `desktop/home@2x.png` | / | 2880x1800 | Landing: H1 'An NFT that is a wallet.', hero card #1, how it works, proof grid (viewport) | Strong hero shot |
| `desktop/market-full@2x.png` | /market | 2880x1800 | Market: 3 listed cards with verdict hints (full page) | Finished |
| `desktop/market@2x.png` | /market | 2880x1800 | Market: 3 listed cards with verdict hints (viewport) | Finished, but sparse (3 cards, empty lower half); "1 signatures" plural bug |
| `desktop/mint-full@2x.png` | /mint | 2880x2110 | Mint dialog over Home (visitor: connect CTA), stitched preview card (full page) | Finished |
| `desktop/mint@2x.png` | /mint | 2880x1800 | Mint dialog over Home (visitor: connect CTA), stitched preview card (viewport) | Finished |
| `desktop/s1-activity-full@2x.png` | /s/1/activity | 2880x2050 | Satchel #1 Activity timeline (full page) | Finished |
| `desktop/s1-activity@2x.png` | /s/1/activity | 2880x1800 | Satchel #1 Activity timeline (viewport) | Finished |
| `desktop/s1-receive-btc-full@2x.png` | /s/1/receive?chain=btc | 2880x3928 | Receive/Fund dialog: BTC QR on brass-banded plate (full page) | Finished |
| `desktop/s1-receive-btc@2x.png` | /s/1/receive?chain=btc | 2880x1800 | Receive/Fund dialog: BTC QR on brass-banded plate (viewport) | Finished |
| `desktop/s1-receive-evm-full@2x.png` | /s/1/receive?chain=evm | 2880x3928 | Receive/Fund dialog: Ethereum Sepolia QR (full page) | Finished |
| `desktop/s1-receive-evm@2x.png` | /s/1/receive?chain=evm | 2880x1800 | Receive/Fund dialog: Ethereum Sepolia QR (viewport) | Finished |
| `desktop/s1-sale-owner-full@2x.png` | /s/1/sale | 2880x1800 | Satchel #1 Sell tab (owner, not listed) (full page) | Finished |
| `desktop/s1-sale-owner@2x.png` | /s/1/sale | 2880x1800 | Satchel #1 Sell tab (owner, not listed) (viewport) | Finished |
| `desktop/s1-send-visitor-full@2x.png` | /s/1/send?chain=evm | 2880x3928 | Send dialog as a visitor (connect guard) (full page) | Finished |
| `desktop/s1-send-visitor@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send dialog as a visitor (connect guard) (viewport) | Guard state only (not a flow step) |
| `desktop/s1-transfer-visitor-full@2x.png` | /s/1/transfer | 2880x3928 | Transfer dialog as a visitor (connect guard) (full page) | Finished |
| `desktop/s1-transfer-visitor@2x.png` | /s/1/transfer | 2880x1800 | Transfer dialog as a visitor (connect guard) (viewport) | Guard state only |
| `desktop/s1-wallet-full@2x.png` | /s/1 | 2880x3928 | Satchel #1 (visitor): card, stats strip, holdings (BTC/ETH rows), judge facts (full page) | Finished |
| `desktop/s1-wallet-owner-full@2x.png` | /s/1 | 2880x3868 | Satchel #1 as owner: 'Your Satchel #1', stitched card, action row (Send/Fund/Transfer/Sell) (full page) | Finished |
| `desktop/s1-wallet-owner@2x.png` | /s/1 | 2880x1800 | Satchel #1 as owner: 'Your Satchel #1', stitched card, action row (Send/Fund/Transfer/Sell) (viewport) | Finished |
| `desktop/s1-wallet-RAW-with-fixture-strip@2x.png` | /s/1 | 2880x1800 | Reference only: as served, with the 'Fixture data' strip | Reference: shows the app-wide "Fixture data" strip that all other shots hide |
| `desktop/s1-wallet@2x.png` | /s/1 | 2880x1800 | Satchel #1 (visitor): card, stats strip, holdings (BTC/ETH rows), judge facts (viewport) | Strong; best overall product screen |
| `desktop/s2-wallet-full@2x.png` | /s/2 | 2880x3928 | Satchel #2 (gift, owned by bob) (full page) | Finished |
| `desktop/s2-wallet@2x.png` | /s/2 | 2880x1800 | Satchel #2 (gift, owned by bob) (viewport) | Finished |
| `desktop/s3-sale-full@2x.png` | /s/3/sale | 2880x3764 | Satchel #3 Buy tab (visitor): price, GateLine, clean history report (full page) | Finished |
| `desktop/s3-sale@2x.png` | /s/3/sale | 2880x1800 | Satchel #3 Buy tab (visitor): price, GateLine, clean history report (viewport) | Visitor view: "Connect wallet to buy"; verdict is the browser check |
| `desktop/s4-sale-full@2x.png` | /s/4/sale | 2880x3988 | Satchel #4 Buy tab (visitor): blocked by 1 unused signature (full page) | Finished |
| `desktop/s4-sale@2x.png` | /s/4/sale | 2880x1800 | Satchel #4 Buy tab (visitor): blocked by 1 unused signature (viewport) | Strong: the blocked state is legible; listing strip shows the raw lowercase "blocked · <timestamp>" |
| `desktop/s5-wallet-owner-listed-full@2x.png` | /s/5 | 2880x4124 | Satchel #5 as owner while listed: FreezeBanner 'Signing paused while listed', Delist is brass (full page) | Finished |
| `desktop/s5-wallet-owner-listed@2x.png` | /s/5 | 2880x1800 | Satchel #5 as owner while listed: FreezeBanner 'Signing paused while listed', Delist is brass (viewport) | Finished |
| `flows/buy-done-component@2x.png` | /s/3/sale | 1440x1148 | Buy-done handoff + receipt block | Finished |
| `flows/buy-s3-1-clean-full@2x.png` | /s/3/sale | 2880x3764 | Buyer carol on #3 (full page) | Finished |
| `flows/buy-s3-1-clean@2x.png` | /s/3/sale | 2880x1800 | Buyer carol on #3: Clean, 'Buy for 5.00 USDC' enabled | Finished |
| `flows/buy-s3-2-done@2x.png` | /s/3/sale | 2880x1800 | Bought: 'Satchel #3 is yours.' reverse handoff + receipt | Works; the listing facts strip (5.00 USDC / Listing #3) stays visible after the buy (stale server strip) |
| `flows/buy-s4-blocked-full@2x.png` | /s/4/sale | 2880x3988 | Buyer carol on #4 (full page) | Finished |
| `flows/buy-s4-blocked@2x.png` | /s/4/sale | 2880x1800 | Buyer carol on #4: Blocked, Buy disabled, no override | Finished |
| `flows/handoff-component@2x.png` | /s/1/transfer | 892x774 | Handoff component end state | Finished |
| `flows/mint-1-preview@2x.png` | /mint | 2880x1800 | Mint dialog as alice: stitched preview, what you get, Mint CTA | Strong: stitched preview over My Satchels |
| `flows/mint-2-done@2x.png` | /mint | 2880x1800 | Minted: 'Satchel #8 is yours.' | Plain success state (by design: no reveal) |
| `flows/sell-1-checklist@2x.png` | /s/1/sale?list=1 | 2880x1800 | Sell dialog: Before-you-list checklist (quiet period, USDC, past signatures) | Finished |
| `flows/sell-2-priced@2x.png` | /s/1/sale?list=1 | 2880x1800 | Sell dialog: price 5 USDC, 'List for 5.00 USDC' | Finished |
| `flows/send-btc-1-mainnet-refused@2x.png` | /s/1/send?chain=btc | 2880x1800 | Send BTC: a mainnet address is refused inline | Finished |
| `flows/send-btc-2-form-filled@2x.png` | /s/1/send?chain=btc | 2880x1800 | Send BTC: 0.0001 BTC to a testnet4 address | Finished |
| `flows/send-btc-3-review@2x.png` | /s/1/send?chain=btc | 2880x1800 | Send BTC: Review with sats fee | Finished |
| `flows/send-evm-1-form@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send step 1 of 3: empty form (chain select, hero amount) | Finished |
| `flows/send-evm-2-form-filled@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send step 1: 0.001 ETH, recipient resolved (Ethereum Sepolia address) | Finished |
| `flows/send-evm-3-review@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send step 2: Review (the exact outcome), checksum warning checkbox unticked | Checksum warning checkbox unticked, so Send is disabled |
| `flows/send-evm-4-review-acked@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send step 2: Review, address acknowledged, 'Send 0.0010 ETH' enabled | Strong: the clearest Send screen |
| `flows/send-evm-5-signing@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send step 3: tracker 'signing' (NEAR signer network), minimize, pending card | Strong: tracker with the signer-network step active; background Facts still read Active |
| `flows/send-evm-6-confirmed@2x.png` | /s/1/send?chain=evm | 2880x1800 | Send receipt: 'Sent 0.001 ETH', confirmed | Receipt; simulated |
| `flows/send-evm-7-activity-after@2x.png` | /s/1/activity | 2880x1800 | Activity after the simulated send (new row on top) | Finished |
| `flows/send-evm-review-dialog@2x.png` | /s/1/send?chain=evm | 960x1392 | Review dialog only | Finished |
| `flows/signing-progress-confirmed@2x.png` | /s/1/send?chain=evm | 892x562 | SigningProgress component, confirmed receipt | Finished |
| `flows/signing-progress-signing@2x.png` | /s/1/send?chain=evm | 892x524 | SigningProgress component, signing stage | Finished |
| `flows/transfer-1-recipient-empty@2x.png` | /s/1/transfer | 2880x1800 | Transfer step 1: recipient | Finished |
| `flows/transfer-2-refuses-contract@2x.png` | /s/1/transfer | 2880x1800 | Transfer refuses the Satchel contract as recipient | Finished |
| `flows/transfer-3-recipient-found@2x.png` | /s/1/transfer | 2880x1800 | Transfer: bob.satchelhq.testnet, Account found | Finished |
| `flows/transfer-4-review@2x.png` | /s/1/transfer | 2880x1800 | Transfer step 2: Review (stitched card, 'signature history stays with the Satchel') | Finished |
| `flows/transfer-5-in-flight@2x.png` | /s/1/transfer | 2880x1800 | Transfer in flight: card lifted 6deg, progress steps | Finished |
| `flows/transfer-6-handoff@2x.png` | /s/1/transfer | 2880x1800 | Handoff end state: card landed on bob, stitch drawn, Transferred pill, receipt | Strong: the brand’s signature moment, end state |
| `flows/transfer-6a-handoff-midmotion@2x.png` | /s/1/transfer | 2880x1800 | Handoff animation mid-motion (card sliding to recipient) | Mid-spring frame; timing-dependent |
| `mobile/market-full@3x.png` | /market | 1170x4995 | Market on mobile (full page) | Finished |
| `mobile/market@3x.png` | /market | 1170x2532 | Market on mobile (viewport) | Finished |
| `mobile/mint@3x.png` | /mint | 1170x2532 | Mint bottom sheet on mobile (viewport) | Finished |
| `mobile/s1-receive-btc@3x.png` | /s/1/receive?chain=btc | 1170x2532 | Receive bottom sheet on mobile (bonus) (viewport) | Finished |
| `mobile/s1-wallet-full@3x.png` | /s/1 | 1170x8598 | Satchel #1 on mobile (visitor) (full page) | Finished |
| `mobile/s1-wallet-owner@3x.png` | /s/1 | 1170x2532 | Satchel #1 on mobile as owner (stitched card, action row) | Finished |
| `mobile/s1-wallet@3x.png` | /s/1 | 1170x2532 | Satchel #1 on mobile (visitor) (viewport) | Good; truncated BTC address wraps onto 2 lines ("tb1qtf95…" / "cwy5") |
| `mobile/s3-sale-full@3x.png` | /s/3/sale | 1170x7743 | Satchel #3 Buy tab on mobile (full page) | Finished |
| `mobile/s3-sale@3x.png` | /s/3/sale | 1170x2532 | Satchel #3 Buy tab on mobile (viewport) | Finished |