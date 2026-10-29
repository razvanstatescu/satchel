> **Archived 2026-10-26.** Superseded by Satchel 2.0, the "Sticker S" (see `../../README.md`). These files are
> kept for history only. Paths in this file are relative to `brand/archive/v1/`.

# brand/: the Satchel brand (source of truth for visual identity)

Razvan (design lead) created the Satchel logo and design system with Claude on 2026-10-21.

- **Canvas** (logo rationale, directions explored, logo system, colour and type, in-context mocks, web icons): https://claude.ai/artifact/P2aHpyp3grSaXjZdjcEZiN
- **Design System** (README, `tokens.json`, asset groups): https://claude.ai/artifact/Et6RrS5YMZafCRV7K25ANy (v2, last change 2026-10-21T16:20Z)

This folder holds verbatim copies of the brand pack (from `satchel-brand.zip`) and of the design system.

## Precedence

| Topic | Source of truth |
|---|---|
| Visual identity: logo, colour, themes, type, radii, shadows, the stitch, iconography, breakpoints, interaction states, motion principle | **this brand** |
| Structure and behaviour: flows, component anatomy, states, copy structure | `kb/80-ux-spec.md` (built from the Mobbin research in `kb/82`), restyled in brand tokens |
| Product facts and hard constraints | `kb/90-technical-spec.md` and `plan/decisions.md`. These override sample copy in the brand (list below) |
| The merged result: brand tokens plus derived tokens, decisions and verified contrast | `kb/81-design-tokens.md` Revision 3 |

## The concept (from the design system)

The "Strap S": a leather strap bent into an S and saddle-stitched like the bag, set on a brass tile.

- **Brass** is the brand: the primary action, spent once per screen.
- **Leather** is the ground and the ink.
- **The saddle stitch means "you own this".** It appears on the owned Satchel card, the mint preview and the receiving card in the transfer handoff, and nowhere else.
- **Themes:** Night (dark tanned leather) is the default and the identity. Day follows `prefers-color-scheme: light`.
  - **Product override (D-42, 2026-10-23, Razvan):** the app ships **Day (light) by default site-wide**, with Night and System in the theme control. The manifest uses cream `#FFF9F0`. Some Day tokens were retuned in the app (see kb/81 R3.1). The brand pack above is unchanged.

**Directions explored** (canvas "Directions explored"):

| Route | Verdict | Why |
|---|---|---|
| Bag and keyhole | dropped | too literal; Backpack, a multichain wallet with an NFT-centric brand, already owns the bag in crypto, and keyholes read as any password manager |
| Strap S, dark tile | runner-up | disappears among dark wallet icons in tab bars and docks |
| **Strap S, brass tile** | **selected** | stands out in a tab bar, survives at 16 px, and its stitch carries into the UI |
| Turn-lock | dropped | unreadable below 48 px |
| NFT key | dropped | keys are the most common wallet and security icon |

## Files

| Path | What | Where it goes on Nov 1 (Next.js `apps/web`) |
|---|---|---|
| `logo/satchel-mark.svg` | Primary mark (brass tile, leather S, brass stitch), 40 px and up | app icon and avatar; `public/brand/` |
| `logo/satchel-mark-small.svg` | Small-size cut, ≤ 32 px (flat brass, S at 92 units, no stitch) | source of the favicon |
| `logo/satchel-lockup-on-dark.svg`, `logo/satchel-lockup-on-light.svg` | Mark + wordmark for Night and Day | header (swap by theme), landing |
| `logo/satchel-wordmark.svg` | "Satchel", Bricolage Grotesque Bold opsz 96, outlined | only next to the mark or where the mark is on screen |
| `logo/satchel-glyph-leather.svg`, `logo/satchel-glyph-brass.svg` | The S alone (leather on light, brass on dark) | loading states, watermarks, the stitched-card motif. Not a substitute for the mark |
| `web/favicon.ico` (16/32/48), `web/favicon.svg`, `web/favicon-32.png` | Favicons | `app/favicon.ico` + `app/icon.svg` (Next file conventions), or `public/` |
| `web/apple-touch-icon.png` | 180 px, full-bleed brass (iOS masks it) | `app/apple-icon.png` or `public/` |
| `web/icon-192.png`, `web/icon-512.png`, `web/icon-maskable-512.png` | PWA icons: purpose `any` ×2, plus `maskable` with the S inside the 80 % safe circle | `public/` + manifest |
| `web/site.webmanifest` | name, short_name, description "An NFT that is a wallet on every chain.", colours `#17100c` | `app/manifest.ts` (same values) or `public/` |
| `web/og-image.png` | 1200 × 630 link preview: Night ground, stitched border, mark, wordmark, tagline | `app/opengraph-image.png`. It is the site-wide OG image, replacing a generated one |
| `web/head-snippet.html` | Reference head tags (icons, manifest, `color-scheme`, `theme-color` per scheme, OG/Twitter, fonts) | port to the Next Metadata API (`metadata.icons`, `manifest`, `openGraph`, `twitter`; `viewport.themeColor` per media query). Load fonts with `next/font/google` (self-hosted at build time) instead of the Google CSS link |
| `tokens.json` | Design tokens v2 (Night/Day colours, type styles, spacing, radii, shadows, stitch, layout), sha256 `c8e39cfd…a9441` | source for the Tailwind v4 `@theme` block in kb/81 R3 |
| `design-system.md` | Verbatim copy of the design-system README (logo rules, content fundamentals, visual foundations, interaction, motion, iconography) | read before any UI work |

**Logo rules** (from the design system):
- **Clear space:** a quarter of the tile height on every side.
- **Lockup geometry:** the wordmark's cap height is half the tile height; the gap between tile and wordmark is 0.23 of the tile height.
- **Minimum sizes:** mark 16 px (use the small cut at 32 px and below), lockup 112 px wide, wordmark alone 64 px wide.
- **Never:**
  - recolour the tile or the S;
  - add glows, bevels or drop shadows;
  - rotate or slant the S;
  - put the mark on a brass ground;
  - set "Satchel" in another face.
- **Themes:** the logo is the same in Night and Day.

## Pre-hackathon note

These are design assets (SVG, PNG, JSON tokens, a reference HTML snippet) created in Phase 0. That is allowed: the plan's ground rules permit Figma and design work before Nov 1. They are not product code. The README's "Pre-hackathon work" disclosure (decision H-24) names them.

## Corrections to propose upstream in the design system

These are sample lines in `design-system.md` and `tokens.json` usage notes that conflict with measured or decided facts. The product follows the right-hand column (kb/81 R3). Update the design system artifact when convenient.

| Brand text | Correct for Satchel | Evidence |
|---|---|---|
| "Safe to buy in 143 blocks (~2 min)" | There is **no wait between listing and buying**. The only wait is before listing: "You can list in {n} blocks (~{t})" | D-05 rev 2; kb/90 §8.9. Testnet blocks are ≈ 0.56 s, so 143 blocks ≈ 80 s |
| Waiting copy "Usually under a minute", then at 90 s "Still working…" | A sign typically takes ~7 s; copy thresholds are 15 / 20 / 60 / 150 s | kb/10 latency table; kb/90 §8.6 / D-16 |
| Timeout: "Nothing was sent and no funds moved" | Never claim no signature exists: a timed-out request can still produce a valid public signature. Use the kb/90 §8.6 timeout copy | kb/10 TL;DR 9; kb/70 F16 |
| "Network fee ~0.00002 BTC" | testnet4 runs at about 1–2 sat/vB, ≈ 141–282 sats per send | kb/30 fee data |
| `frozen`: "Frozen while listed or in cooldown" | "Signing paused while listed". There is no cooldown state | D-05 rev 2 |
| States "Active / Frozen / Listed" as three states | In the contract **Listed = signing paused** (one state). Pills: Active · Signing · Listed · Sold, plus Needs attention. The frozen colour and snowflake mark paused or in-progress signing | kb/80; kb/90 §5.10 |
| `balance-hero` sample "$4,812.40"; body-sm "≈ $61.20" | Testnet coins have no value. Any fiat amount is labelled "at mainnet prices" (decision UX-1) | kb/50 prices; checklist §6 |
| "Night is the default and the identity. Day follows `prefers-color-scheme: light`" | **Day (light) is the default site-wide** whatever the OS; Night and System stay in the toggle. Day moved to cream: `ground` `#FFF9F0`, `surface-raised` `#FCEEDC`, `line` `#EBD6BD`, `ink-muted` `#5E4231`, `success` `#1B6E53`, `danger` `#B32D47`, `chain-btc` `#C06600`, all AA. The landing adds saddle and cream colour fields and one dark band (direction C); Night values are unchanged. The logo, brass, leather, the type families and the stitch's meaning are unchanged; the OG image stays Night | D-42 (Razvan, 2026-10-23); `apps/web/src/app/globals.css`; scratchpad `landing-v4/build-spec.md` §1 |
| `site.webmanifest` description "An NFT that is a wallet on every chain."; colours `#17100c` | The app's `manifest.ts` uses "An NFT that is a wallet." (D-37 bans "every chain") and cream `#FFF9F0` | D-37; D-42 |
