> **Archived 2026-10-26 (D-44).** Superseded by `kb/81-design-tokens.md` Revision 4 (Satchel 2.0, the "Sticker S").
> Kept for history: references elsewhere to "kb/81 R3 §…" point here. Brand 1.0 itself is in `brand/archive/v1/`.

# Satchel design tokens: brand consolidated (Revision 3)

> **R3.1 note (2026-10-23, D-42, Razvan).** Two things below are superseded:
> - **Default theme:** Day (light) is the default site-wide, whatever the OS. Night and System stay in the toggle, and
>   the stored key `satchel:theme:v1` takes `day`, `night` or `system`.
> - **Day values:** they moved to cream (Night is unchanged): `ground` `#FFF9F0` (also `theme-color` and the manifest),
>   new `ground-alt` `#FCEEDC`, `surface-raised` `#FCEEDC`, `line` `#EBD6BD`, `ink-muted` `#5E4231`, `success` `#1B6E53`,
>   `danger` `#B32D47`, `chain-btc` `#C06600`, all AA (recomputed in scratchpad `landing-v4/build/contrast.py`).
>
> The landing adds `.scope-saddle`, `.scope-tile-*` and `.scope-night-band`. The live source is
> `apps/web/src/app/globals.css`; the rationale is in `brand/README.md` §Corrections.
> Owner: design (brand by Razvan) · Checked: 2026-10-21 · **Revision 3 "Brand consolidated", supersedes R2** · Confidence: high for colour, contrast and fonts (computed or parsed, numbers shown); medium for the derived sizes (design-lead review by Oct 31).

How R3 relates to the other sources:
- **Brand (source of truth for visual identity):** `brand/tokens.json` v2 (sha256 `c8e39cfd…a9441`, re-checked 2026-10-21) and `brand/design-system.md`. Every brand value below is copied **verbatim**; nothing in `brand/` is edited. Brand issues found while consolidating are listed in §Brand issues and go upstream.
- **Derived tokens** exist only where the brand has no role. Each is marked **derived** and names the brand values it comes from.
- **Behaviour and structure** come from `80-ux-spec.md` R3 (R2's Mobbin-backed flows, restyled here). References: `82-design-references.md`.
- **Evidence.** `research/spikes/ux-refs/calc/contrast_r3.mjs` (WCAG 2.x contrast; reads `brand/tokens.json` and the `research/spikes/ux/` helpers read-only), `fonts_r3.py` (axes, OpenType features and glyph coverage parsed from google/fonts `main`, plus the next 16.4.2 font typings) and `springs_r2.mjs` (motion@14.5.0, re-run). **[VERIFIED]** = computed or parsed, numbers shown.
- **R2** is kept verbatim at `research/spikes/ux-refs/r2-snapshot/81-design-tokens.r2.md` (rev 1 stays in `rev1-snapshot/`).

## R3.1 (2026-10-23): light by default (D-42, landing v4)

Day (light) is now the default theme site-wide; Night and System are in `ThemeControl`. `apps/web/src/app/globals.css` is the live source. Day values retuned from the brand v2 tokens (all AA per the landing-v4 axe runs, Night unchanged):

| Token | Brand v2 Day | Shipped Day |
|---|---|---|
| `--ground` | `#f7f5f1` | `#FFF9F0` (also the manifest colour) |
| `--surface-raised` | `#efeae3` | `#FCEEDC` |
| `--line` | `#e2dad0` | `#EBD6BD` |
| `--ink-muted` | `#6b5a4c` | `#5E4231` |
| `--success` | `#276b5b` | `#1B6E53` |
| `--danger` | `#c0354f` | `#B32D47` |
| `--chain-btc` | `#c96f00` | `#C06600` |

Re-run `research/spikes/ux-refs/calc/contrast_r3.mjs` against these values before the release, and propose them upstream to the brand design system.

## Changelog (R2 → R3): what the brand supersedes
| # | R2 | R3 | Decision |
|---|---|---|---|
| K3-01 | Dark only, graphite neutrals (`--bg` `#0A0B0D` … `--surface-4`), cool hue ≈ 260 | **Night (default) + Day**, brand leather and brass tokens verbatim (`ground`, `surface`, `surface-raised`, `line`, `line-strong`, `ink`, `ink-muted` …) | B-01 |
| K3-02 | Near-white CTA pill (`--cta` → `--cta-2`), every button a pill | **Brass primary** (`brand` + `on-brand`), once per screen, `radius-md` 14, not a pill; Day adds a 1 px `brand-deep` border; secondary = outline | B-03 |
| K3-03 | `--stamp-*` metal, chamfer motif, HallmarkStamp, success tile | **Removed.** The clean-history badge is `success` + shield-check + word + time + link | B-07 |
| K3-04 | Seeded alloys (8 metals), `--alloy` accent, `--alloy-glow`, `--alloy-tint`, card glass and scrim, frost layer | **Removed.** Per-token identity = the leather hue shifted ±12° (Night card body + swatch). The brand card has no glass or scrim: text sits on flat `surface` or on brass | B-04 |
| K3-05 | Archivo (wdth) + JetBrains Mono; mono-caps `label`; `engrave` (wdth 125, caps); `amount-hero` / `amount-xl` / `amount` / `ticker` | **Bricolage Grotesque** (display, `opsz`), **Instrument Sans** (text), **Spline Sans Mono** (addresses and hashes only). Brand styles `balance-hero`, `title`, `heading`, `body`, `body-sm`, `label`, `address`; derived `display`, `section`, `lead`, `caption`. **Sentence case everywhere**, never all caps | B-02 |
| K3-06 | Three chip kinds: round StatusPill (14 % tint), Tag (radius 4, mono caps), outlined MetaChip | **StatusPill** (icon + word on `surface-raised`; a band variant on the card) and **Chip** (`radius-sm`, `surface-raised`, sentence case). No tints | B-05 |
| K3-07 | Banners = status colour at 8 % + 32 % border | Banners = a `surface-raised` panel + the state icon + a title in the state colour. No tints | brand vocabulary |
| K3-08 | Status set success / warning / danger / info / `--state-frozen` / `--state-listed` | Brand set `success` / `frozen` / `danger` / `brand` + neutral `ink-muted`. No amber: warning-level states are neutral + a warning icon + an explicit word | B-05 |
| K3-09 | Hairlines `--hairline` 8 % / 12 % white; desktop panels outlined | Brand `line` (hairline between rows) and `line-strong` (control borders). Depth comes from `ground` → `surface` → `surface-raised`; only the card and overlays cast a shadow | brand |
| K3-10 | Radii: pill buttons, tag 4, chip 6, input 12, panel 12, tile 16, QR 16, sheet 24, card 3.72 % of width | `radius-sm` 8 · `radius-md` 14 · `radius-card` 22 · `radius-pill` 999 (brand); swatch radii derived | brand |
| K3-11 | Breakpoints 640 / 768 / 1024 / 1280; gutter 16 → 24 at 640 | `bp-sm` 480 · `bp-md` 768 · `bp-lg` 1024 · `bp-xl` 1280; `container-flow` 480; `container-app` 1200; gutter `space-4` → `space-6` at 768 | B-08 |
| K3-12 | Motion: stamp, frost in/out, materialise, tag stamp, card tilt, key rotation, stack lift | **One signature moment** (the handoff, ≈ 700 ms spring) + the signing pulse. Everything else is plain response feedback | B-06 |
| K3-13 | Account avatars with a hashed hue (`oklch(0.74 0.12 hue)`) | Neutral avatars: `surface-raised` circle, `ink` initial, 1 px `line-strong` ring. No colour outside the brand | brand |
| K3-14 | QR modules `#0A0B0D`; alloy-framed plate | Modules `on-brand` `#2B1D15` on a white plate (16.29:1) | brand |
| K3-15 | Destructive = danger text on a 14 % tint | Destructive = **danger outline** (transparent, 1 px `danger`, `danger` text) | B-03 |
| K3-16 | — | **New derived tokens:** `brand-ink`, `brand-line`, `brand-pressed`, `band-pill`, `stitch`, `scrim`, `satchel-body`, `satchel-swatch` (§Derived tokens) | R3 |
| K3-17 | — | **Pressed primary fix.** The brand's pressed state (`brand-deep` fill, `on-brand` text) measures **3.80:1** and fails AA. R3 uses `brand-pressed` `#B7913F` (5.53:1); flagged upstream (UX-34) | R3, verified |

## TL;DR
- **Brand tokens verbatim, two themes.** Night (dark tanned leather) is the default and the identity; Day follows `prefers-color-scheme: light`, with a manual override in `localStorage` applied as `data-theme` on `<html>` before first paint. `color-scheme: dark light`; `theme-color` per scheme.
- **Every brand contrast claim reproduces [VERIFIED]:** `ink` ≥ 12.31:1, `ink-muted` ≥ 6.40 (Night) / 5.498 (Day, rounds to the claimed 5.5), `on-brand` 7.74 on `brand`, `link` 11.97 / 5.83 on ground, `line-strong` ≥ 3.05, chain colours ≥ 3.05 as graphics. **Two findings:** the brand's pressed primary fails (3.80:1, fixed with `brand-pressed`), and brass is not a text colour in Day (1.76–2.10:1), so brass words use `brand-ink`.
- **Brass is spent once per screen as an action fill.** The logo tile and the Satchel card's brass band are identity, not the spend.
- **The card:** brass band (name + status pill) over a leather body (total + native chain chips). The **saddle stitch** appears only when the viewer owns it, on the mint preview and on the receiving card at the end of the handoff. The per-token accent shifts the leather hue ±12°; at the brand's chroma it is a quiet signature (ΔE ≤ 0.014 between extremes), not an identifier.
- **Type:** Bricolage Grotesque (`opsz` 12–96, `tnum`) for balances and titles, Instrument Sans (`tnum`) for everything people read and click, Spline Sans Mono only for addresses and hashes. Sentence case everywhere. `≈` is not in any served font subset, so R3 self-hosts a 16 KB Bricolage subset ("Satchel Symbols").
- **States are icon + word, never colour alone:** Active (`success`), Signing (`frozen`, pulsing), Listed (brass word and glyph; Listed = signing paused), Sold (neutral), Needs attention (`danger`).

## Principles (from the brand, applied)
1. **Brass is the brand, spent once per screen** as an action fill, always with `on-brand` text, so the primary button reads as a small piece of the logo.
2. **Leather is the ground and the ink.** Depth comes from `ground` → `surface` → `surface-raised`. Only the Satchel card (`shadow-card`) and overlays (`shadow-overlay`) cast shadows.
3. **The saddle stitch means "you own this".** It appears on the owned Satchel card, the mint preview and the receiving card in the handoff, and nowhere else.
4. **States are fixed and always icon + word.** Colour never carries meaning alone (WCAG 1.4.1).
5. **Mono only for addresses and hashes.** Everything else is Instrument Sans or Bricolage, in sentence case.
6. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) on every amount; the unit is dimmed, never the digits.
7. **One signature moment** (the transfer handoff). Everything else responds to the person's action.

## Colour

### Brand tokens (verbatim from `brand/tokens.json` v2)
| Token | Night | Day | Brand usage note (abridged) |
|---|---|---|---|
| `ground` | `#17100c` | `#f7f5f1` | Page background; also `theme-color` per theme |
| `surface` | `#221812` | `#ffffff` | Panels, sheets, list groups, the body of a Satchel card |
| `surface-raised` | `#33251c` | `#efeae3` | Inputs, chips, hovered rows, the second level of raise |
| `line` | `#4a3628` | `#e2dad0` | Hairline dividers between rows. Decorative, never the only boundary of a control |
| `line-strong` | `#8a6c50` | `#8c7a68` | Control borders: inputs, secondary buttons, checkboxes |
| `ink` | `#f3e9dc` | `#2b1d15` | Primary text, balances, the wordmark |
| `ink-muted` | `#b9a895` | `#6b5a4c` | Secondary text: fiat, timestamps, helper copy |
| `brand` | `#d4ae55` | `#d4ae55` | Brass: primary fill, selected-tab indicator, the stitch, the Listed state. One brass fill per screen |
| `brand-bright` | `#ebcb7a` | `#ebcb7a` | Top of the brass gradient; primary hover |
| `brand-deep` | `#9a7428` | `#9a7428` | Bottom of the brass gradient; the Day brass-button border. Not for text |
| `on-brand` | `#2b1d15` | `#2b1d15` | Text and icons on brass (the logo's leather ink) |
| `link` | `#ebcb7a` | `#7a5a1c` | Inline links and text buttons |
| `focus` | `#ebcb7a` | `#7a5a1c` | Focus ring: 2 px solid, 2 px offset |
| `success` | `#6bbfa9` | `#276b5b` | Active, Sent, Confirmed, Clean history |
| `frozen` | `#94bedf` | `#37698f` | Signing paused while listed; in-progress signing (brand note "or in cooldown" is corrected: there is no cooldown, D-05 rev 2) |
| `danger` | `#f37386` | `#c0354f` | Errors, unspent signature (Needs attention), destructive actions |
| `chain-btc` | `#f7931a` | `#c96f00` | Bitcoin chip dot and balance accent. Graphics only |
| `chain-evm` | `#a3abe0` | `#5560b0` | Ethereum chip dot and balance accent. Graphics only |
| `chain-sol` | `#c08cff` | `#8447d6` | Solana chip dot and balance accent. Graphics only |
| `leather-light` / `leather-dark` | `#6a4730` / `#432c1f` | same | **Logo only** (the S strap gradient). Never in UI |

OKLCH of the leather family **[VERIFIED]**: `ground` h 51.2 · `surface` h 52.3 · `surface-raised` h 54.1 · `leather-light` 0.431 / 0.0597 / 53.8 · `leather-dark` 0.317 / 0.0407 / 50.3. The leather hue anchor is therefore **h₀ = 52°** (§Per-token leather hue).

### Derived tokens (R3; each built only from brand values)
| Token | Night | Day | Why it exists | Verified |
|---|---|---|---|---|
| `brand-ink` | `brand` `#d4ae55` | `link` `#7a5a1c` | Brass **as text** (the Listed word). `brand` is 1.76–2.10:1 on Day surfaces, so Day uses the brand's own text-safe brass | 7.02 / 5.31 on `surface-raised` |
| `brand-line` | `brand` `#d4ae55` | `brand-deep` `#9a7428` | Thin brass **marks**: the selected-tab indicator, the Listed glyph on a page, the flow progress line | ≥ 7.02 / ≥ 3.58 (non-text) |
| `brand-pressed` | `color-mix(in srgb, brand-deep 50%, brand)` = `#B7913F` | same | Pressed primary. The brand's `brand-deep` pressed fill gives `on-brand` text 3.80:1 (fails 4.5) | `on-brand` 5.53 |
| `band-pill` | `#2B1D15` (= `on-brand`) | same | The status pill on the card's brass band (canvas) | word `brand-bright` 10.36 |
| `stitch` | `brand` @ 45 % = `rgb(212 174 85 / 0.45)` | `brand-deep` @ 60 % = `rgb(154 116 40 / 0.6)` | The saddle stitch (values from `tokens.json` `stitch-dash` usage; the canvas uses the Night value) | decorative (§Stitch) |
| `scrim` | `rgb(0 0 0 / 0.6)` | `rgb(43 29 21 / 0.4)` (`on-brand` @ 40 %) | Dims the Satchel page behind a flow dialog or sheet | decorative |
| `satchel-body` | `oklch(0.220 0.034 h₀+offset)` per token | `surface` (white) | The Night card body (per-token leather) | `ink` ≥ 14.48, `ink-muted` ≥ 7.53 |
| `satchel-swatch` | `oklch(0.431 0.0597 h₀+offset)` per token | same | The mini-card swatch wherever a Satchel is named (both themes) | decorative; brass strip 8.95 (Night) |

Rule: any colour not in these two tables is a bug.

### Per-token leather hue (B-04)
| Step | Rule |
|---|---|
| 1 Offset | `offset = (fnv1a32(utf8("satchel:" + tokenId)) mod 25) − 12`, an integer −12…+12. FNV-1a 32-bit: offset basis `0x811c9dc5`, prime `0x01000193`, `Math.imul`, `>>> 0` (the R2 hash; the token id is the only input, so it survives a redeploy) |
| 2 Hue | `hue = 52 + offset` (OKLCH degrees). 52° is the leather family's hue (above) |
| 3 Night card body | `satchel-body = oklch(0.220, 0.034, hue)`: the brand `surface` lightness at 1.7× its chroma (0.0197 → 0.034), so the hue can show at all. Emit hex (gamut-clamped by bisecting chroma) so CSS, SVG and tests agree |
| 4 Swatch (both themes) | `satchel-swatch = oklch(0.431, 0.0597, hue)`: `leather-light` at offset 0 |
| 5 Where it applies | **Night:** the card body (`lg`, `md`, the NFT SVG) and the swatch. **Day:** the swatch only; the Day card body stays white (`surface`), as in the canvas. Never on buttons, text, borders, the band or the stitch |
| 6 Server | The page sets `--satchel-body` and `--satchel-swatch` inline per token (`<article style="--satchel-body:#27160B;--satchel-swatch:#6B4631">`), so the first paint is final |

Perceptibility **[VERIFIED]** (OKLab ΔE; ≈ 0.02 is about one just-noticeable step):

| Night body chroma | Body at −12 / 0 / +12 | ΔE −12 ↔ +12 | ΔE vs brand `surface` (max) | `ink` min | `ink-muted` min |
|---:|---|---:|---:|---:|---:|
| 0.0197 (brand `surface`) | `#231714` / `#221812` / `#211911` | 0.0112 | 0.0063 | 14.44 | 7.51 |
| 0.0300 | `#261610` / `#26160D` / `#24170B` | 0.0112 | 0.0119 | 14.45 | 7.51 |
| **0.0340 (R3)** | `#28150E` / `#27160B` / `#251709` | **0.0139** | **0.0155** | **14.48** | **7.53** |
| 0.0460 | `#2C1209` / `#2B1405` / `#291502` | 0.0189 | 0.0277 | 14.50 | 7.54 |

**Honest read:** at the brand's ±12° the body tints sit below one noticeable step from each other and from the brand surface. They read as dye-lot variations of one leather, which suits the brand ("never a new brand colour"), but they don't identify a token: the name "Satchel #n" does. The swatch spans ΔE 0.0242 (about one step). Stronger options are design-lead decision UX-31.

Test vectors **[VERIFIED]** (`contrast_r3.mjs accent`):

| Token id | fnv1a32 | offset | hue | `satchel-body` (Night) | `satchel-swatch` |
|---:|---:|---:|---:|---|---|
| 1 | 80220036 | −1 | 51 | `#27160B` | `#6B4631` |
| 2 | 130552893 | +6 | 58 | `#26160A` | `#69482E` |
| 3 | 113775274 | +12 | 64 | `#251709` | `#67492C` |
| 4 | 29887179 | −8 | 44 | `#28150D` | `#6C4535` |
| 5 | 13109560 | −2 | 50 | `#27160C` | `#6B4632` |
| 6 | 63442417 | +5 | 57 | `#26160A` | `#69482F` |
| 7 | 46664798 | +11 | 63 | `#261709` | `#68492C` |
| 8 | 4257743999 | +12 | 64 | `#251709` | `#67492C` |
| 42 | 3337176571 | +9 | 61 | `#261709` | `#68482D` |

Over ids 1–100,000 every offset gets 3,925–4,062 tokens (ideal 4,000). All 25 swatch colours are in sRGB gamut.

### The saddle stitch
| Property | Value |
|---|---|
| Meaning | "You own this." Shown on: the in-app Satchel card **when the connected viewer is its owner**; the mint preview; the receiving card at the end of the handoff (it marks the new owner, who is named beside it). **Nowhere else**: not on landing frames, panels, the NFT SVG or other people's cards |
| Geometry | Inset 8 px on every side; corner radius 14 px (= `radius-card` − inset, concentric; the canvas used 15) |
| Stroke | `stitch-width` 1.5 px; `stitch-dash` 6 px 5 px; round caps; colour `stitch` |
| Rendering | An inline SVG `<rect>` overlay with `stroke-dasharray="6 5"` and `vector-effect="non-scaling-stroke"`, `aria-hidden="true"`, `pointer-events: none`. Not CSS `border: dashed` (browsers draw their own dash lengths) |
| Contrast (decorative; "Owned by you" is also written in text) **[VERIFIED]** | Night on the body 2.70–2.72:1; Day on white 2.21:1. **Across the brass band it vanishes in Night (1.00:1) and is faint in Day (1.51–1.75:1)**: the stitch reads on the sides and bottom only. Kept as in the canvas; flagged upstream |
| Motion | At the end of the handoff the stitch draws in on the receiving card (`stroke-dashoffset` 300 ms, `--ease-standard`); reduced motion: it appears with the cross-fade |

### State and status mapping (B-05)
Every state shows an icon and a word. Icon names are Lucide (verified against `lucide-static` tags, 1,903 icons). Words are sentence case.

**The Satchel's own state (StatusPill).** Precedence: Sold (flow end) > Listed > Needs attention > Signing > Active.

| Pill | Derived from (kb/90 §5.10) | Word colour | Glyph | Band variant (on brass) |
|---|---|---|---|---|
| Active | `listing == None` | `success` | `lock-open` | word `brand-bright`, glyph `success` (Night value) |
| Signing | a `pending` record < 250 blocks old, or a local in-flight intent | `frozen` | 8 px dot, pulsing | same dot in `frozen` (Night) |
| Listed | `listing` is set. **Listed = signing paused** | `brand-ink` | `tag` in `brand-line` | glyph `brand` |
| Sold | flow end state only (seller's view after a `sold` event) | `ink-muted` | `handshake` | glyph `ink-muted` (Night) |
| Needs attention | **owner view only, client-side:** a local intent in `signed_not_sent`, or a `signed` record with no matching chain tx (kb/90 §8.6 resume) | `danger` | `triangle-alert` | glyph `danger` (Night) |

**Clean history** (kb/90 §7.3 statuses; the words are kb/90's UI labels):

| Item status | Word | Token | Icon | Blocks Buy |
|---|---|---|---|---|
| `spent` | Settled | `success` | `circle-check` | no |
| `expired` (SOL) | Expired | `success` | `clock` | no |
| `unfunded` | Unfunded | neutral `ink-muted` | `info` | no (D-04) |
| `settling` | Settling | `frozen` | `hourglass` | yes |
| `unused` | Unused (grouped under "Needs attention") | `danger` | `triangle-alert` | yes |
| `unknown` | Can't verify | neutral `ink-muted` + the warning icon | `triangle-alert` | yes |
| (UI) checking | Checking… | neutral `ink-muted` | `loader-circle` (static) | until it resolves |

| Aggregate | Verdict tone | Icon | Buy |
|---|---|---|---|
| `checking` | neutral | `loader-circle` (static) | disabled |
| `empty`, `clean` | `success` | `shield-check` | enabled |
| `settling` | `frozen` | `hourglass` | disabled |
| `blocked` | `danger` | `shield-alert` | disabled, no override |
| `unknown` | neutral + warning icon | `triangle-alert` | disabled |
| `unsafe` | `danger` | `shield-x` | disabled, no override |

**Activity and flows:** Signing, In mempool → `frozen` (`hourglass`; the mempool ring is static, never pulsing) · Signed, not sent → `danger` (`triangle-alert`) · Failed → `danger` (`circle-x`) · Confirmed, Sent, Transferred → `success` (`circle-check`) · 1 of 2 sources → neutral (`info`) · Dev contract / Release candidate strips → neutral (`triangle-alert`, ink). The FreezeBanner "Signing paused while listed" → `frozen` + `snowflake`. **Never a check on a non-final state.**

**Banner anatomy (replaces R2's tints).** `surface-raised` panel, `radius-md`, padding `space-4`; a 20 px icon and a `label` title in the state colour; body in `ink` (`body` or `body-sm`); at most one action. No tinted fill, no state-coloured border, never a solid red fill.

### Iconography
Lucide (`lucide-react`, 1.61.0 was latest on 2026-10-21; pin the exact version on Nov 1), `strokeWidth={1.75}` on the 24 px grid, default round caps and joins, colour `ink` or the state colour. The logo is never drawn as an icon. Chain marks (BTC, ETH, SOL) are small SVG marks in the chain colour, not Lucide.

| Use | Icon | Use | Icon |
|---|---|---|---|
| Send · Fund · Transfer | `arrow-up` · `arrow-down` · `arrow-left-right` | Sell · Delist · Mint | `tag` · `undo-2` · `plus` |
| My Satchels · Market · Activity | `wallet` · `store` · `activity` | Menu · Close · Minimize · Back | `menu` · `x` · `minimize-2` · `arrow-left` |
| Copy → copied · QR · Paste | `copy` → `check` · `qr-code` · `clipboard-paste` | External link | `arrow-up-right` (+ sr-only "opens in a new tab") |
| Theme: System · Night · Day | `monitor` · `moon` · `sun` | Overflow · Disclosure | `ellipsis` · `chevron-down` |
| Broadcast now | `send` | Runs in your browser (trust line) | `monitor-check` |
| Verified balance | `coins` | Tracker future step | `circle-dashed` |

**Glyphs are never typed into strings.** R2 strings carried ✓ ✕ ◌ ◷ ⓘ ⚠ ⛔ ❄ ◇ ⬡ ▧ ◆ ₿ Ξ ◎ ⧉ ▦. None of the three brand faces has ✓ (U+2713), and Instrument Sans has no ₿, Ξ or ◎ **[VERIFIED]**, so each becomes an icon or chain mark next to the text.

## Typography

### Faces [VERIFIED]
| Face (role) | Axes (fvar) | `tnum` | `zero` | Glyph gaps that matter | next/font (16.4.2 typings) |
|---|---|---|---|---|---|
| **Bricolage Grotesque** (`--font-display`: wordmark, balances, titles) | `opsz` 12–96, `wght` 200–800, `wdth` 75–100 | yes | no | has `≈` but Google serves it in **no** subset | `Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-bricolage', display: 'swap' })` |
| **Instrument Sans** (`--font-sans`: everything people read and click) | `wdth` 75–100, `wght` 400–700 | yes | no | **no `≈` (U+2248), no thin space (U+2009)** | `Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' })` |
| **Spline Sans Mono** (`--font-mono`: addresses and hashes only) | `wght` 300–700 | n/a (monospaced) | yes | — | `Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-spline-mono', display: 'swap' })` |
| **Satchel Symbols** (derived) | Bricolage subset: `≈` (and `₿`) | — | — | — | `next/font/local` or a plain `@font-face`, `unicode-range: U+2248, U+20BF`; 16,152-byte variable woff2 from `fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&text=≈₿` (OFL), downloaded once on Day 1 into `public/fonts/` |

Why the symbols face: the served unicode ranges (latin, latin-ext, vietnamese) exclude U+2248, so "≈ $1,148.72" would otherwise fall back to a system glyph at 36–48 px. It sits second in the display and sans stacks, so Instrument Sans text ("≈ 0.004 NEAR", kb/90 §8.9) gets a grotesque `≈` too. The thin space is dropped: put a no-break space (U+00A0) between an amount and its ticker.

Loading notes:
- **next/font only** (self-hosted at build time). Don't use the Google CSS `<link>` from `brand/web/head-snippet.html`; port its other tags to the Metadata API (kb/80 R3 §Brand assets).
- **`opsz` is automatic.** Bricolage's `font-optical-sizing: auto` maps `opsz` to the CSS px size, which equals the brand's per-style `opticalSize` (48, 28, 20). Set `font-variation-settings: "opsz" N` explicitly only where the brand departs from the size: the wordmark reference (96 at 40 px), derived `display` (96 at 56 px) and `section` (48 at 44 px).
- `font-variant-numeric: tabular-nums` on every amount. In mono, `font-feature-settings: "zero" 1` (slashed zero).
- `display: 'swap'` everywhere. The brand fallbacks (`system-ui`, `-apple-system`, `"Segoe UI"`, `ui-monospace`, `"SF Mono"`, `Menlo`) stay at the end of each stack.

### Type styles (brand verbatim, plus marked derived roles)
| Style | Face | Size / line height | Weight | Tracking | `opsz` | Narrow step | Use in R3 |
|---|---|---|---|---|---|---|---|
| `wordmark` (reference) | display | 40/40 | 700 | −0.01em | 96 | — | Never typeset: the wordmark ships as outlines |
| `balance-hero` | display | 48/52 | 700 | −0.02em | 48 | 36 px below 480 (line height 40, derived) | **Send / Review amount**; **the card total always uses the 36/40 step** (the canvas card used 34). Steps to 28/32 rather than wrap |
| `title` | display | 28/32 | 650 | −0.01em | 28 | 24 px below 480 (line height 28, derived) | Page H1 ("This NFT is a wallet.", "Satchel #1"), flow titles on desktop, the Buy price |
| `heading` | display | 20/26 | 600 | 0 | 20 | — | Section, panel, dialog and sheet headings; **the card-band name at weight 650** (canvas) |
| `body` | sans | 15/22 | 400 | 0 | — | — | Default reading text, max 68ch |
| `body-sm` | sans | 13/18 | 400 | 0 | — | — | Fiat, timestamps, helper text, `<dl>` labels, meta chips, the Activity sub-line |
| `label` | sans | 14/18 | 600 | 0 | — | — | Buttons, tabs, nav links, chips, status pills, row titles. **Sentence case, never all caps** |
| `address` | mono | 13/18 | 450 | 0 | — | — | Addresses, tx and payload hashes, NEAR account ids. Middle-truncate; full value in `title` and `aria-label`; a copy button beside it |
| `display` **(derived, canvas landing H1)** | display | 56/57 | 700 | −0.02em | 96 | 40/42 below 768 | Landing H1 only |
| `section` **(derived, canvas)** | display | 44/48 | 700 | −0.01em | 48 | 32/36 below 768 | Landing section H2 only |
| `lead` **(derived, canvas body 19/1.55)** | sans | 19/30 | 400 | 0 | — | 17/26 below 768 | The landing sub only |
| `caption` **(derived, canvas 12 px)** | sans | 12/16 | 500 (600 in the band pill) | 0 | — | — | **Satchel card internals only:** the qualifier line, chain chips on the card, the band pill |

Rules:
- **Sentence case everywhere.** R2's caps (`TOKEN #1`, `BUY FOR`, `SETTLED`, `IN PROGRESS`, `CLEAN HISTORY`, `SIGNATURES BY NEAR CHAIN SIGNATURES`, `DEV CONTRACT`) become sentence case with the same words.
- **Mono only for addresses and hashes.** Field labels, stats, day headers, chips, tags and eyebrows are Instrument Sans.
- **Tickers inside a `balance-hero` line** are `heading` (20/26, weight 600) in `ink-muted`, baseline-aligned (derived rule; the brand has no ticker style). In rows the ticker keeps the row's size and only turns `ink-muted`.
- **Grouped full addresses** (Review, Receive, Facts): 4-character groups with 0.35em gaps; the first two groups and the last group in `ink` 600, the middle groups in `ink-muted` 450; copying yields the raw string (R2 rule, restyled).
- **Signs.** U+2212 for outgoing amounts; a no-break space before the ticker.
- **Floor.** Nothing below 12 px; 12 px (`caption`) only inside the card.
- **Pill and chip text (derived, canvas):** page StatusPills use the `label` weight at 13/18 (the canvas's 13 px pill); chips use `body-sm`. The band pill uses `caption` at 600.

## Radii, shadows, spacing

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Inputs, chain and meta chips, small tiles, nav links (the canvas's 10 is not a token), tooltips |
| `radius-md` | 14px | **Buttons**, list groups, dropdowns and menus, toasts, banners, the QR plate |
| `radius-card` | 22px | The Satchel card (1.586:1), dialogs and bottom sheets |
| `radius-pill` | 999px | Status pills, the segmented control (ChainSelect, theme control), the PendingPill, the account pill |
| swatch radii **(derived)** | `xs` 40×25 → 4px; inline 20×13 → 2px | ≈ 5.5 % of the width, the card's own ratio at 400 px |
| `shadow-card` | Night `inset 0 1px 0 rgba(235, 203, 122, 0.10), 0 18px 40px rgba(0, 0, 0, 0.45)` · Day `0 1px 0 rgba(43, 29, 21, 0.06), 0 12px 32px rgba(43, 29, 21, 0.12)` | The Satchel card only |
| `shadow-overlay` | Night `0 16px 48px rgba(0, 0, 0, 0.55)` · Day `0 16px 48px rgba(43, 29, 21, 0.18)` | Dialogs, sheets, popovers, menus, toasts, the PendingCard, the wallet-connect modal, **the lifted card during the handoff** |
| `space-1` … `space-12` | 4 · 8 · 12 · 16 · 24 · 32 · 48 px | Identical to Tailwind's default `--spacing: 0.25rem` steps 1, 2, 3, 4, 6, 8, 12 |
| `stitch-width` / `stitch-dash` | 1.5px / 6px 5px | The stitch (§The saddle stitch) |

Dialogs and sheets add a 1 px `line` border **(derived)**: in Night the dimmed page and the dialog's `surface` differ by only 1.16:1 **[VERIFIED]**, and `shadow-overlay` doesn't show on near-black.

## Layout
| Item | Value |
|---|---|
| Breakpoints (brand) | `bp-sm` 480 (desktop sizes for `balance-hero` and `title`) · `bp-md` 768 (sheets become dialogs; gutter `space-6`) · `bp-lg` 1024 (left navigation; 2-column grids) · `bp-xl` 1280 (3-column grids) |
| Containers (brand) | `container-flow` 480 (Send, Receive, Transfer, Sell, Mint, Connect) · `container-app` 1200 (the main column next to the left nav) |
| Gutters | `space-4` below 768, `space-6` from 768; page top margin `space-12` on desktop |
| Top bar **(derived)** | Below 1024: 56 px, sticky. Lockup 36 px tall (133 px wide) + the account control + a menu button. The Testnet chip appears from 480 |
| Left navigation **(derived)** | From 1024: 224 px, full height, sticky. Lockup at the top; links My Satchels · Market · Mint (+ Activity only if built); bottom: the account pill, the theme control and the Testnet note |
| Card grids | 1 column below 1024 (cards ≤ 400 px, left-aligned); 2 from 1024; 3 from 1280; gap `space-8` |
| Satchel page from 1024 | `grid-template-columns: minmax(320px, 400px) minmax(0, 1fr)`, gap `space-8`; the left column (card + actions or the BuyBlock) is sticky (top `space-12`) |
| Flow shell | Below 768: a bottom sheet, height `100dvh − 16px`, `radius-card` on the top corners. From 768: a centred dialog, 480 px wide, max height `100dvh − 96px`. Both are `surface`, `shadow-overlay`, 1 px `line` border, over `scrim` |
| Pinned action (below 768) | In flows, Mint and the visitor's Buy bar: 16 px gutters, a full-width primary (15/600, padding 14, ≥ 48 px tall), `padding-bottom: max(16px, env(safe-area-inset-bottom))`, a 24 px `surface` fade above it. Viewport meta `interactive-widget=resizes-content` |
| Touch targets | ≥ 44 × 44 px for primary mobile controls; ≥ 24 × 24 px for every target (WCAG 2.5.8) |
| Scroll padding | top 72 px (+ 36 px while the PendingPill shows); bottom 96 px + the safe area while a pinned bar shows (WCAG 2.4.11) |
| Z layers | content 0 · sticky bars and the PendingPill 40 · scrim + sheet/dialog 50 · menus and tooltips 55 · toasts 60 |

## Interaction states (brand rules + R3 fixes)
| Element | Rest | Hover | Pressed | Focus-visible | Disabled |
|---|---|---|---|---|---|
| **Primary** (brass, once per screen) | `brand` fill, `on-brand` `label` 14/600, padding 12 × 18, `radius-md`; Day adds a 1 px `brand-deep` border; mobile pinned: full width, 15/600, padding 14 | `brand-bright` (10.36:1) | **`brand-pressed`** (5.53:1; the brand's `brand-deep` is 3.80:1) | 2 px solid `focus`, 2 px offset (ring vs ground 11.97 / 5.83) | 40 % opacity, `cursor: not-allowed`, `aria-disabled="true"` (stays focusable), the reason as a visible line + a tooltip |
| **Secondary** | transparent, 1 px `line-strong` (3.89 / 3.78), `ink` | `surface-raised` fill | `surface-raised` | same ring | same |
| **Destructive** (no v1 action needs it) | transparent, 1 px `danger`, `danger` text (≥ 5.35 / ≥ 4.54) | `surface-raised` fill | `surface-raised` | same ring | same |
| Text button / link | `link`, underlined | thicker underline | — | same ring | same |
| Round action (owner ActionRow) | 48 px `surface-raised` circle, 20 px `ink` icon, `body-sm` `ink-muted` label under it | 1 px `line-strong` ring | `surface` fill | same ring | same. **While listed, Delist is the screen's brass:** a `brand` circle with an `on-brand` icon |
| Row (interactive) | transparent on `ground`, or `surface` | `surface-raised` | `surface-raised` | ring inset (`outline-offset: -2px`) | — |
| Input | `surface-raised` fill, 1 px `line-strong`, `radius-sm`, `ink` text, `ink-muted` placeholder | — | — | 2 px `focus` ring, 2 px offset | 40 % |
| Checkbox | 1 px `line-strong` on `surface-raised`; checked = `ink` fill with a `ground` check (brass stays for the primary) | — | — | ring | 40 % |
| NavTabs (links) | `ink-muted` `label` | `ink` | — | ring | — · **active:** `ink` + a 2 px `brand-line` underline, `aria-current="page"` |
| Left-nav link | `ink-muted`, transparent, `radius-sm` | `ink` on `surface-raised` | — | ring | — · **active:** `surface-raised` + `ink` (canvas) |
| Segmented control | track `surface-raised`, `radius-pill`; segments `ink-muted` | `ink` | — | ring | — · **selected:** `surface` fill + 1 px `line-strong` + `ink` |

Never use `:hover` alone for meaning. Hover and press colour changes take 120 ms (`--duration-fast`).

## Motion tokens (B-06)
| Token | Value | Use |
|---|---|---|
| `--ease-standard` / `--ease-exit` | `cubic-bezier(0.2, 0, 0, 1)` / `cubic-bezier(0.3, 0, 1, 1)` | Enter/change / exit |
| `--duration-fast` | 120 ms | Hover and press colours, the CTA label swap |
| `--duration-base` | 160 ms | Value swaps, the pill word, the card-name swap after mint |
| `--duration-sheet` | 200 ms | Sheet slide-up and dialog fade/scale (0.98 → 1); reduced-motion cross-fades |
| `--duration-stitch` | 300 ms | The stitch draws in on the receiving card |
| `--pulse` | 1.6 s ease-in-out loop, opacity 1 ↔ 0.4 | The `frozen` signing indicator (tracker, Signing pill, PendingPill) and the loading glyph. Static under reduced motion; it stops on any end state |
| `spring-handoff` | stiffness 120 / damping 18 / mass 1.2 (ζ 0.75) | **The signature moment:** the slide to the recipient. 99 % at 352 ms, **±1 % at 659 ms** (the brand's "≈ 700 ms spring"), overshoot 2.84 % **[VERIFIED]** |
| `spring-lift` | 260 / 22 / 1 (ζ 0.68) | Lift (y −12 px, scale 1.04, rotate 6°): 99 % at 192 ms, overshoot 5.00 %; the landing settle: ±1 % at 405 ms **[VERIFIED]** |

Removed in R3: `spring-stamp`, `spring-key`, `spring-tilt`, `spring-stack`, `spring-fan`, `--duration-frost-in`, `--duration-frost-out`, `--duration-materialise`, `--duration-reveal`, the tag stamp and the incoming glow pulse.

## Contrast tables [VERIFIED]
WCAG 2.x; text needs 4.5:1, graphics and control boundaries 3:1 (1.4.11). Output of `node research/spikes/ux-refs/calc/contrast_r3.mjs`.

**Brand claims reproduced** (a claim passes when the ratio, rounded to the claim's precision, meets it):

| Claim (brand README / tokens.json) | Computed | Result |
|---|---:|---|
| `ink` ≥ 12:1 on every surface | Night 12.305 · Day 13.611 | reproduced |
| `ink-muted` ≥ 5.5:1 on every surface | Night 6.397 · Day **5.498** | reproduced (Day rounds to 5.5; strictly 0.002 under) |
| `on-brand` 7.7:1 on `brand` | 7.745 | reproduced |
| `on-brand` 10.4:1 on `brand-bright` | 10.359 | reproduced (rounds to 10.4) |
| `link` 8.9:1 on Night ground | **11.969** | reproduced; the claim understates it (9.39 on `surface-raised`) |
| `link` 5.8:1 on Day ground | 5.832 | reproduced |
| `brand-deep` 3.9:1 on Day ground | 3.934 | reproduced |
| `line-strong` ≥ 3:1 on `surface` / `surface-raised` | Night 3.596 / 3.053 · Day 4.119 / 3.442 | reproduced |
| Every text colour ≥ 4.5:1 on `surface-raised` | Night 5.349 (worst `danger`) · Day 4.542 (worst `danger`) | reproduced |
| Chain colours ≥ 3:1 as graphics | Night 5.932 · Day 3.048 (`chain-btc` on `surface-raised`) | reproduced |

**Text tokens (Night)**

| Foreground | `ground` | `surface` | `surface-raised` | Min | Result |
|---|---:|---:|---:|---:|---|
| `ink` `#f3e9dc` | 15.68 | 14.49 | 12.31 | 12.31 | pass |
| `ink-muted` `#b9a895` | 8.15 | 7.54 | 6.40 | 6.40 | pass |
| `link` `#ebcb7a` | 11.97 | 11.06 | 9.39 | 9.39 | pass |
| `success` `#6bbfa9` | 8.65 | 7.99 | 6.79 | 6.79 | pass |
| `frozen` `#94bedf` | 9.58 | 8.85 | 7.52 | 7.52 | pass |
| `danger` `#f37386` | 6.82 | 6.30 | 5.35 | 5.35 | pass |
| `brand-ink` = `brand` `#d4ae55` | 8.95 | 8.27 | 7.02 | 7.02 | pass |

**Text tokens (Day)**

| Foreground | `ground` | `surface` | `surface-raised` | Min | Result |
|---|---:|---:|---:|---:|---|
| `ink` `#2b1d15` | 14.96 | 16.29 | 13.61 | 13.61 | pass |
| `ink-muted` `#6b5a4c` | 6.04 | 6.58 | 5.50 | 5.50 | pass |
| `link` `#7a5a1c` | 5.83 | 6.35 | 5.31 | 5.31 | pass |
| `success` `#276b5b` | 5.77 | 6.29 | 5.25 | 5.25 | pass |
| `frozen` `#37698f` | 5.39 | 5.87 | 4.90 | 4.90 | pass |
| `danger` `#c0354f` | 4.99 | 5.44 | 4.54 | 4.54 | pass (thinnest text pair) |
| `brand-ink` = `link` `#7a5a1c` | 5.83 | 6.35 | 5.31 | 5.31 | pass |
| `brand` as text `#d4ae55` | 1.93 | 2.10 | 1.76 | 1.76 | **fail: never brass text in Day** (hence `brand-ink`) |

**Graphics and control boundaries**

| Graphic | Night (`ground` / `surface` / `surface-raised`) | Day (same) | Result |
|---|---|---|---|
| `line-strong` (control borders) | 3.89 / 3.60 / 3.05 | 3.78 / 4.12 / 3.44 | pass |
| `focus` ring | 11.97 / 11.06 / 9.39 | 5.83 / 6.35 / 5.31 | pass |
| `brand-line` (tab indicator, Listed glyph, progress line) | 8.95 / 8.27 / 7.02 | 3.93 / 4.28 / 3.58 | pass |
| `chain-btc` | 8.19 / 7.57 / 6.43 | 3.35 / 3.65 / 3.05 | pass |
| `chain-evm` | 8.48 / 7.83 / 6.65 | 5.23 / 5.70 / 4.76 | pass |
| `chain-sol` | 7.56 / 6.99 / 5.93 | 5.00 / 5.45 / 4.55 | pass |
| `success` / `frozen` / `danger` icons | ≥ 6.79 / ≥ 7.52 / ≥ 5.35 | ≥ 5.25 / ≥ 4.90 / ≥ 4.54 | pass |
| `line` (hairline) | 1.66 / 1.53 / 1.30 | 1.27 / 1.38 / 1.16 | decorative (never a control's only boundary) |
| Brass fill edge (`brand` vs page) | 8.95 / 8.27 / 7.02 | 1.93 / 2.10 / 1.76 | Day relies on the 1 px `brand-deep` border (3.93 / 4.28) |

**Brass, the band and buttons**

| Pair | Night | Day | Result |
|---|---:|---:|---|
| `on-brand` on `brand` (primary rest) | 7.74 | 7.74 | pass |
| `on-brand` on `brand-bright` (hover) | 10.36 | 10.36 | pass |
| `on-brand` on `brand-deep` (**brand pressed state**) | **3.80** | **3.80** | **fail** → `brand-pressed` |
| `on-brand` on `brand-pressed` `#B7913F` (R3 pressed) | 5.53 | 5.53 | pass |
| Alternative: keep the `brand` fill + an inset 2 px `brand-deep` ring | 7.74 | 7.74 | pass (ring vs fill 2.04, decorative) |
| Card band: `on-brand` name over the darkest gradient pixel under it (`#C6A04A`, left 60 % of the band; widths 288–480 px) | 6.61 | 6.61 | pass |
| Band pill word `brand-bright` on `#2B1D15` | 10.36 | 10.36 | pass |
| Band pill glyphs on `#2B1D15`: `success` / `frozen` / `brand` / `ink-muted` / `danger` (Night values) | 7.49 / 8.29 / 7.74 / 7.06 / 5.90 | same | pass |
| Band pill edge vs `brand` / `brand-bright` | 7.74 / 10.36 | same | pass |
| Darkest band pixel (`brand-deep`, the pill side) vs `on-brand` | 3.80 | 3.80 | info: nothing but the pill (its own fill) sits there |
| Secondary: `ink` on `ground`; border `line-strong` vs `ground` | 15.68; 3.89 | 14.96; 3.78 | pass |
| Destructive outline: `danger` on `ground` / `surface` / `surface-raised` | 6.82 / 6.30 / 5.35 | 4.99 / 5.44 / 4.54 | pass |
| Disabled primary at 40 % (text vs fill) | 2.29 | 1.88 | exempt (WCAG 1.4.3 inactive); the reason is always written |

**Status pills on `surface-raised`** (word ≥ 4.5, glyph ≥ 3)

| State | Token | Word Night / Day | Glyph Night / Day |
|---|---|---:|---:|
| Active · Settled · Expired · Clean history · Confirmed | `success` | 6.79 / 5.25 | 6.79 / 5.25 |
| Signing · Settling · In mempool · Signing paused | `frozen` | 7.52 / 4.90 | 7.52 / 4.90 |
| Listed | `brand-ink` + `brand-line` | 7.02 / 5.31 | 7.02 / 3.58 |
| Sold · Unfunded · Can't verify · Checking · 1 of 2 sources | `ink-muted` | 6.40 / 5.50 | 6.40 / 5.50 |
| Needs attention · Unused · Blocked · Unsafe · Failed · Signed, not sent | `danger` | 5.35 / 4.54 | 5.35 / 4.54 |

**Per-token surfaces** (worst over offsets −12…+12)

| On the Night card body (`satchel-body`, C 0.034) | Worst ratio | Result |
|---|---:|---|
| `ink` (total, chip text) | 14.48 | pass |
| `ink-muted` (qualifier) | 7.53 | pass |
| `link` / `danger` (not expected on the card) | 11.05 / 6.29 | pass |
| Chip fill `surface-raised` vs body; body vs `ground` | 1.18; 1.07 | decorative (chips carry text; `shadow-card` separates the card) |
| Day card (white `surface`): `ink` / `ink-muted` / chip text `ink` on `surface-raised` | 16.29 / 6.58 / 13.61 | pass |
| Swatch body vs `ground` / `surface` / `surface-raised` | Night 2.27 / 2.10 / 1.78 · Day 7.48 / 8.14 / 6.80 | decorative; the name is always written; in Night the brass strip (8.95) carries the shape |

**Other pairs:** QR modules `on-brand` on white 16.29 (R2 19.69) · white plate vs Night `surface` 17.39; in Day the plate needs its 1 px `line-strong` edge (4.12) · avatar initial `ink` on `surface-raised` 12.31 / 13.61, ring `line-strong` vs `ground` 3.89 / 3.78 · Day card vs Day ground 1.09 (decorative; `shadow-card` separates it) · scrimmed page: Night `#090605` (dialog `surface` vs it 1.16, so the 1 px `line` border), Day `#A59F99` (2.62).

**Thin margins to watch** (three decimals): Day `ink-muted` on `surface-raised` 5.498 · Day `danger` on `surface-raised` 4.542 · Day `frozen` on `surface-raised` 4.902 · Night `line-strong` on `surface-raised` 3.053 · Day `chain-btc` on `surface-raised` 3.048. Re-run `contrast_r3.mjs` if `brand/tokens.json` changes (its sha256 is in the header above).

## CSS spec block (Tailwind v4)
A spec, re-typed in the product repo on or after Nov 1 (SAT-201); never copied from `research/`. Colours use `light-dark()`, so each token is declared once and follows the used `color-scheme`. Browsers without `light-dark()` drop the second declaration and keep Night. Only the two shadows need per-theme blocks. **P1 ships `<html data-theme="night">`** (Night for everyone); P2 removes that attribute to enable Day (kb/80 R3 §Scope). Tailwind's `@theme` / `@theme inline` model is **[SOURCED](https://tailwindcss.com/docs/theme)**; the `--text-*--line-height` / `--letter-spacing` / `--font-weight` modifiers and `@utility` are **[ASSUMED for 4.3.3; check on Day 1]**.

```css
@import "tailwindcss";

/* Brand tokens (brand/tokens.json v2, verbatim): Night first, then light-dark(Day, Night). */
:root {
  color-scheme: dark light;
  --ground: #17100c;         --ground: light-dark(#f7f5f1, #17100c);
  --surface: #221812;        --surface: light-dark(#ffffff, #221812);
  --surface-raised: #33251c; --surface-raised: light-dark(#efeae3, #33251c);
  --line: #4a3628;           --line: light-dark(#e2dad0, #4a3628);
  --line-strong: #8a6c50;    --line-strong: light-dark(#8c7a68, #8a6c50);
  --ink: #f3e9dc;            --ink: light-dark(#2b1d15, #f3e9dc);
  --ink-muted: #b9a895;      --ink-muted: light-dark(#6b5a4c, #b9a895);
  --brand: #d4ae55; --brand-bright: #ebcb7a; --brand-deep: #9a7428; --on-brand: #2b1d15;
  --link: #ebcb7a;           --link: light-dark(#7a5a1c, #ebcb7a);
  --focus: #ebcb7a;          --focus: light-dark(#7a5a1c, #ebcb7a);
  --success: #6bbfa9;        --success: light-dark(#276b5b, #6bbfa9);
  --frozen: #94bedf;         --frozen: light-dark(#37698f, #94bedf);
  --danger: #f37386;         --danger: light-dark(#c0354f, #f37386);
  --chain-btc: #f7931a;      --chain-btc: light-dark(#c96f00, #f7931a);
  --chain-evm: #a3abe0;      --chain-evm: light-dark(#5560b0, #a3abe0);
  --chain-sol: #c08cff;      --chain-sol: light-dark(#8447d6, #c08cff);
  /* derived (kb/81 R3 §Derived tokens) */
  --brand-ink: #d4ae55;      --brand-ink: light-dark(#7a5a1c, #d4ae55);
  --brand-line: #d4ae55;     --brand-line: light-dark(#9a7428, #d4ae55);
  --brand-pressed: #b7913f;  /* color-mix(in srgb, brand-deep 50%, brand) */
  --band-pill: #2b1d15;      /* always dark: its glyphs use the Night state values */
  --band-pill-success: #6bbfa9; --band-pill-frozen: #94bedf; --band-pill-muted: #b9a895; --band-pill-danger: #f37386;
  --stitch: rgb(212 174 85 / 0.45); --stitch: light-dark(rgb(154 116 40 / 0.6), rgb(212 174 85 / 0.45));
  --scrim: rgb(0 0 0 / 0.6); --scrim: light-dark(rgb(43 29 21 / 0.4), rgb(0 0 0 / 0.6));
  --satchel-body: #221812;   /* Night, per token, set inline by the server; Day uses --surface */
  --satchel-swatch: #6a4730; /* per token, set inline by the server */
  --brass-gradient: linear-gradient(135deg, var(--brand-bright), var(--brand) 55%, var(--brand-deep));
  /* shadows (geometry differs per theme) */
  --sh-card: inset 0 1px 0 rgba(235, 203, 122, 0.10), 0 18px 40px rgba(0, 0, 0, 0.45);
  --sh-overlay: 0 16px 48px rgba(0, 0, 0, 0.55);
}
:root[data-theme="night"] { color-scheme: dark; }
:root[data-theme="day"]   { color-scheme: light; --sh-card: 0 1px 0 rgba(43, 29, 21, 0.06), 0 12px 32px rgba(43, 29, 21, 0.12); --sh-overlay: 0 16px 48px rgba(43, 29, 21, 0.18); }
@media (prefers-color-scheme: light) {
  :root:not([data-theme="night"]) { --sh-card: 0 1px 0 rgba(43, 29, 21, 0.06), 0 12px 32px rgba(43, 29, 21, 0.12); --sh-overlay: 0 16px 48px rgba(43, 29, 21, 0.18); }
}

@theme inline {
  --color-ground: var(--ground); --color-surface: var(--surface); --color-surface-raised: var(--surface-raised);
  --color-line: var(--line); --color-line-strong: var(--line-strong);
  --color-ink: var(--ink); --color-ink-muted: var(--ink-muted);
  --color-brand: var(--brand); --color-brand-bright: var(--brand-bright); --color-brand-deep: var(--brand-deep);
  --color-on-brand: var(--on-brand); --color-link: var(--link); --color-focus: var(--focus);
  --color-success: var(--success); --color-frozen: var(--frozen); --color-danger: var(--danger);
  --color-chain-btc: var(--chain-btc); --color-chain-evm: var(--chain-evm); --color-chain-sol: var(--chain-sol);
  --color-brand-ink: var(--brand-ink); --color-brand-line: var(--brand-line); --color-brand-pressed: var(--brand-pressed);
  --color-band-pill: var(--band-pill); --color-stitch: var(--stitch); --color-scrim: var(--scrim);
  --color-satchel-body: var(--satchel-body); --color-satchel-swatch: var(--satchel-swatch);
  --shadow-card: var(--sh-card); --shadow-overlay: var(--sh-overlay);
  --font-display: var(--font-bricolage), "Satchel Symbols", var(--font-instrument), system-ui, sans-serif;
  --font-sans: var(--font-instrument), "Satchel Symbols", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-spline-mono), ui-monospace, "SF Mono", Menlo, monospace;
}

@theme {
  --breakpoint-sm: 30rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem; --breakpoint-2xl: initial;
  --radius-sm: 8px; --radius-md: 14px; --radius-card: 22px; --radius-pill: 999px;
  --container-flow: 30rem; --container-app: 75rem;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); --ease-exit: cubic-bezier(0.3, 0, 1, 1);
  /* brand type styles (mobile first; the -wide variants apply at ≥ 480 / ≥ 768 as noted) */
  --text-balance-hero: 2.25rem; --text-balance-hero--line-height: 2.5rem; --text-balance-hero--letter-spacing: -0.02em; --text-balance-hero--font-weight: 700;
  --text-balance-hero-wide: 3rem; --text-balance-hero-wide--line-height: 3.25rem; --text-balance-hero-wide--letter-spacing: -0.02em; --text-balance-hero-wide--font-weight: 700; /* ≥ 480 */
  --text-title: 1.5rem; --text-title--line-height: 1.75rem; --text-title--letter-spacing: -0.01em; --text-title--font-weight: 650;
  --text-title-wide: 1.75rem; --text-title-wide--line-height: 2rem; --text-title-wide--letter-spacing: -0.01em; --text-title-wide--font-weight: 650; /* ≥ 480 */
  --text-heading: 1.25rem; --text-heading--line-height: 1.625rem; --text-heading--font-weight: 600;
  --text-body: 0.9375rem; --text-body--line-height: 1.375rem; --text-body--font-weight: 400;
  --text-body-sm: 0.8125rem; --text-body-sm--line-height: 1.125rem; --text-body-sm--font-weight: 400;
  --text-label: 0.875rem; --text-label--line-height: 1.125rem; --text-label--font-weight: 600;
  --text-address: 0.8125rem; --text-address--line-height: 1.125rem; --text-address--font-weight: 450;
  /* derived */
  --text-display: 2.5rem; --text-display--line-height: 2.625rem; --text-display--letter-spacing: -0.02em; --text-display--font-weight: 700;
  --text-display-wide: 3.5rem; --text-display-wide--line-height: 3.5625rem; --text-display-wide--letter-spacing: -0.02em; --text-display-wide--font-weight: 700; /* ≥ 768 */
  --text-section: 2rem; --text-section--line-height: 2.25rem; --text-section--letter-spacing: -0.01em; --text-section--font-weight: 700;
  --text-section-wide: 2.75rem; --text-section-wide--line-height: 3rem; --text-section-wide--letter-spacing: -0.01em; --text-section-wide--font-weight: 700; /* ≥ 768 */
  --text-lead: 1.0625rem; --text-lead--line-height: 1.625rem; --text-lead-wide: 1.1875rem; --text-lead-wide--line-height: 1.875rem;
  --text-caption: 0.75rem; --text-caption--line-height: 1rem; --text-caption--font-weight: 500;
}

@utility t-num     { font-variant-numeric: tabular-nums; }
@utility t-address { font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.125rem; font-weight: 450; font-feature-settings: "zero" 1; }
@utility t-opsz-96 { font-variation-settings: "opsz" 96; }   /* wordmark reference, display */
@utility t-opsz-48 { font-variation-settings: "opsz" 48; }   /* section */
@utility brass     { background: var(--brass-gradient); color: var(--on-brand); }
@utility focus-ring { outline: 2px solid var(--focus); outline-offset: 2px; }
```

**Theme switching (B-01), as a spec:**

| Step | What happens |
|---|---|
| Storage | `localStorage["satchel:theme:v1"]` = `"night"` \| `"day"`; absent = follow the system. Read and written in `try/catch` (private modes throw) |
| Before first paint | An inline script in `<head>` (root layout, ahead of any stylesheet-dependent paint) sets `document.documentElement.dataset.theme` to the stored value, if any, and rewrites both `<meta name="theme-color">` tags to that theme's `ground`. `<html suppressHydrationWarning>`, because the server never knows the override |
| No stored value | Nothing is set. `color-scheme: dark light` plus `light-dark()` follow `prefers-color-scheme`. The Metadata API emits `themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#17100c' }, { media: '(prefers-color-scheme: light)', color: '#f7f5f1' }]` |
| Control | "Theme: System · Night · Day" (a segmented control) in the account menu (connected) and in the footer (always, so judges who never connect can switch). Changing it writes storage and updates `data-theme` and `theme-color` in place, with no reload |
| P1 vs P2 | P1 renders `data-theme="night"` from the server, so Night is forced and the control is hidden. P2 removes the attribute and shows the control |

### shadcn/ui mapping and overrides
| shadcn var | R3 token |
|---|---|
| `--background` / `--foreground` | `--ground` / `--ink` |
| `--card` / `--card-foreground` | `--surface` / `--ink` |
| `--popover` / `--popover-foreground` | `--surface` / `--ink` (+ `shadow-overlay`) |
| `--primary` / `--primary-foreground` | `--brand` / `--on-brand` |
| `--secondary` / `--secondary-foreground` | `--surface-raised` / `--ink` (fills only; the secondary *button* is the outline) |
| `--muted` / `--muted-foreground` | `--surface-raised` / `--ink-muted` |
| `--accent` / `--accent-foreground` | `--surface-raised` / `--ink` (hover fills) |
| `--destructive` | `--danger` (outline use only) |
| `--border` / `--input` / `--ring` | `--line` / `--line-strong` / `--focus` |
| `--radius` | 14px; set `--radius-sm/md/lg/xl` directly to the brand radii instead of shadcn's `calc()` steps |

| Primitive | Stock look | R3 |
|---|---|---|
| Button | `rounded-md`, flat dark primary | Brass primary (once per screen), outline secondary, danger outline, `radius-md`, no shadows; `aria-disabled` with a written reason |
| Card | border + `shadow-sm` | `surface` panels without border or shadow; only the SatchelCard has `shadow-card` |
| Tabs | pill-in-a-box | Underline **links** (`aria-current`) with the 2 px `brand-line` indicator |
| Badge | generic | StatusPill (icon + word) or Chip |
| Skeleton | `animate-pulse` | Static `surface-raised` shapes on `surface`, radii matching the content; no pulse |
| Toast | default card | `surface-raised`, `radius-md`, `shadow-overlay`, 16 px state icon, `label`/`body-sm` `ink`, five words or fewer, one at a time |
| Dialog / Drawer | flow containers | The flow shell only (kb/80 R3): `radius-card`, `shadow-overlay`, 1 px `line`, over `scrim` |
| Input / Select / Menu / Tooltip | defaults | `surface-raised` + `line-strong` inputs at `radius-sm`; menus on `surface` + `shadow-overlay` at `radius-md`; tooltips `surface-raised`, `radius-sm`, dismissible with Esc |

## Figma variable naming (brand namespace)
- **Collections:**
  - `brand` (modes **Night**, **Day**): exactly the `tokens.json` names (`ground`, `surface`, `surface-raised`, `line`, `line-strong`, `ink`, `ink-muted`, `brand`, `brand-bright`, `brand-deep`, `on-brand`, `link`, `focus`, `success`, `frozen`, `danger`, `chain-btc`, `chain-evm`, `chain-sol`), plus `logo/leather-light` and `logo/leather-dark`.
  - `derived` (modes Night, Day): `brand-ink`, `brand-line`, `brand-pressed`, `band-pill`, `stitch`, `scrim`.
  - `satchel` (one mode per test-vector token: `#1 −1°`, `#2 +6°`, `#3 +12°`, `#4 −8°`, `#5 −2°`, `#6 +5°`, `#7 +11°`, `#8 +12°`, `#42 +9°`): `body`, `swatch`. Switching a card instance's mode re-tints it exactly as the product will.
  - `layout`: `space-1` … `space-12`, `radius-sm|md|card|pill`, `stitch-width`, `bp-*`, `container-flow`, `container-app`.
- **Text styles:** the brand names (`balance-hero`, `balance-hero/narrow`, `title`, `title/narrow`, `heading`, `body`, `body-sm`, `label`, `address`), then `derived/display`, `derived/display-narrow`, `derived/section`, `derived/section-narrow`, `derived/lead`, `derived/caption`, `derived/ticker`.
- **Effect styles:** `shadow-card/night`, `shadow-card/day`, `shadow-overlay/night`, `shadow-overlay/day` (effect styles have no modes).
- **Components:** the kb/80 R3 names (SatchelCard, StatusPill, Chip, ChainRow, ReviewCard, SigningProgress, FlowShell, NavShell, ProofChip …), with variant properties mirroring props (`size`, `status`, `owned`, `theme`, `verdict`). The brand canvas already holds the card, header, activity rows, buttons, pills and landing boards (UX-13).

## Brand issues found (report upstream; `brand/` is not edited)
| # | Brand source | Issue (verified) | R3 handling |
|---|---|---|---|
| BI-1 | design-system "Pressed: primary to brand-deep" | `on-brand` on `brand-deep` = **3.80:1** (fails AA 4.5) | `brand-pressed` `#B7913F` (5.53:1), or the inset-ring alternative (UX-34) |
| BI-2 | `link` usage "8.9:1 on Night ground" | Computed **11.97:1** (9.39 on `surface-raised`) | Numbers in R3 are computed; fix the note |
| BI-3 | `ink-muted` usage "5.5:1 or better on every surface" | Day on `surface-raised` = **5.498** | AA holds; darken one step or claim 5.4 |
| BI-4 | Canvas header lockup 30 px tall | 110.9 px wide (< the 112 px lockup minimum) and a 30 px tile (below the 33 px small-cut threshold), with no small-cut lockup shipped | R3 header lockup is **36 px** (133 px wide; full mark legal) |
| BI-5 | "The stitch … nowhere else" vs the canvas landing frame (2 px dashed at 28 px) and the stitched border on `og-image.png` | The rule and two brand artefacts disagree | R3 UI follows the rule (no landing frame); the OG asset ships as is |
| BI-6 | Canvas stitch around the whole card | Over the brass band it vanishes in Night (1.00:1) and is faint in Day (1.51–1.75) | Kept; consider an `on-brand` segment on the band |
| BI-7 | `radius-card` note "the same 22 % corner ratio as the logo tile" | The card's 22 px is 5.5 % of 400 px; the tile is 21.9 % (112/512) | Reword |
| BI-8 | Canvas nav links radius 10; 12 px text (card chips, qualifier, band pill, account pill, activity sub-line) | Neither is a token | R3: `radius-sm` 8; derived `caption` 12/16 for card internals only; the account pill and Activity use `address` 13 |
| BI-9 | Canvas pills: dot + word; README state table: icon + word | Two rules | R3 uses the icon (the dot only for Signing's pulse) |
| BI-10 | Head snippet loads fonts from Google CSS | `≈` is in no served subset; Instrument Sans has no `≈` or U+2009 | Satchel Symbols subset; no-break space instead of U+2009 |
| BI-11 | "Disabled … reason in a tooltip" | A `disabled` button can't take focus, so keyboard users never see the tooltip | `aria-disabled` + a visible reason line + the tooltip |
| BI-12 | `brand-bright` "the stitch on leather" vs `stitch-dash` "brand at 45 % on Night" (and the canvas) | Two stitch colours | R3: `brand` @ 45 % (Night), `brand-deep` @ 60 % (Day) |
| BI-13 | Canvas card total 34 px vs `balance-hero` 48 (36 below 480) | Off the scale | R3: the card always uses the 36/40 step |
| BI-14 | Tagline "on every chain" (OG, manifest), canvas H1 "One strap, every chain." | v1 covers Bitcoin testnet4, Ethereum Sepolia and (P2) Solana devnet | Product copy names the chains; the landing H1 is UX-32 |
| BI-15 | The README corrections table (cooldown, "Safe to buy in…", fees, timeouts, Frozen state, fiat sample) | Already listed in `brand/README.md` | Applied in kb/80 R3 copy |
| BI-16 | Per-token accent "±12° of the leather hue" | Imperceptible at the surface chroma (ΔE 0.011–0.014 between extremes) | UX-31: R3 default quiet tint + swatch; or widen the range upstream |

## Deltas vs plan and R2
1. The plan's "dark and metallic" became R2's graphite + near-white pill + alloys; R3 replaces both with the brand: leather and brass, Night and Day.
2. R2's "no numbers on metal" is gone: the brand card shows the total and native balances (B-04). The NFT SVG still has no balances (D-23).
3. Fiat returns as **one labelled number**, the card total "≈ $X at mainnet prices", if UX-1's reopened default stands; otherwise the card shows "{n} chains".
4. Two verified accessibility fixes the brand needs: the pressed state (BI-1) and keyboard-reachable disabled reasons (BI-11).

## Open questions / decisions for the design lead
All are rows in `plan/phase0-checklist.md` §6 (deadline **Oct 31**): UX-1 (fiat total, reopened), UX-31 (per-token accent strength and placement), UX-32 (landing H1 and tagline), UX-34 (pressed-state fix). The brand closes UX-2, -4, -5, -8, -9, -10, -11, -15, -16, -19, -20, -26 and -29 (kb/80 R3 §Open questions).
