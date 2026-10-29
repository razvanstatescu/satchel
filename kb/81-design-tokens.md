# Satchel design tokens: Satchel 2.0 (Revision 4)

> **R4 (2026-10-26, D-44, Razvan):** the "Sticker S" brand replaces brand 1.0. This revision supersedes R3 and R3.1.
> - R3 is archived at `kb/archive/81-design-tokens-R3.md`, and brand 1.0 is in `brand/archive/v1/`.
> - **The live source of every value below** is `apps/web/src/app/globals.css`. If they differ, the CSS wins, and this
>   file should be fixed.
> - The full specs (components, screens, motion, voice) are in `docs/design/satchel-2.0/`.
>
> Owner: design (brand by Razvan). Checked: 2026-10-26. Contrast: computed (98 pairs × 2 themes; script and report in
> `docs/design/satchel-2.0/`).

## TL;DR
- **Brand:**
  - a coral `#FF5C4D` tile with a white S, an ink `#1D1340` outline and a hard ink shadow;
  - chain **charms** with faces (BTC `#F7931A`, ETH `#A3ABE0`, SOL `#C08CFF`), always on a light field;
  - the lowercase "satchel" wordmark in Funnel Display ExtraBold.
- **Theme:** **Day first, whatever the OS** (D-42, kept by D-44). Night and System are in the toggle.
  `localStorage["satchel:theme:v1"]` stores `day`, `night` or `system`. The head script resolves it to
  `<html data-theme="day|night">` before first paint. With no JS, Day applies.
- **"Coral to tap, ink to read, stickers to smile":**
  - one coral **action** fill per view: the primary button (card bands are identity, not budget);
  - text on coral, lemon and sky is always `on-brand` `#1D1340`;
  - stickers (an outline plus a hard drop, no blur) only on what you own, press or celebrate;
  - everything else is a flat panel with a 1 px line.
- **Faces:** Funnel Display (display), Onest (UI; 16 px body and inputs), Geist Mono (addresses and hashes only).
- **The one signature motion:** on hand-off the card swings like a charm (a damped 10° pendulum) and slides to its new
  owner. Primary buttons press 4 px into their shadow.
- **Native amounts only.** No fiat and no "every chain"; the corrections are in `brand/README.md`.

## Theme mechanism
- **CSS:**
  - tokens are declared as `light-dark(Day, Night)` on `:root, [data-scheme]`;
  - `:root { color-scheme: light }` and `:root[data-theme="night"] { color-scheme: dark }`;
  - islands with another scheme (illustration fields, the coral finale) use `[data-scheme="day|night"]`, which
    re-declares every token.
  - Next compiles CSS with Lightning CSS, which polyfills `light-dark()` per declaring element. A scope that only sets
    `color-scheme` keeps the page's theme.
- **The `night:`/`dark:` variants** target `[data-theme="night"]` and are not island-aware.
- **`theme-color`:** Day `#F6F5FB`, Night `#120C26` (`GROUND` in `src/lib/theme.ts`). The manifest uses the Day ground.

## Colour
### Brand tokens (verbatim `brand/tokens.json` 2.0)
| Token | Day | Night | Use |
|---|---|---|---|
| `ground` | `#F6F5FB` | `#120C26` | page background, theme-color |
| `surface` | `#FFFFFF` | `#1C1538` | cards, sheets, panels |
| `surface-sunken` | `#ECEAF4` | `#29214B` | inputs, chips, pills, banners, hover rows |
| `line` | `#E2DFEE` | `#352C5C` | 1 px dividers and flat panels |
| `line-strong` | `#7F7999` | `#8A82AE` | input borders, secondary buttons |
| `ink` | `#1D1340` | `#F4F2FF` | text |
| `ink-muted` | `#5E5776` | `#B7B0D1` | secondary text |
| `brand` | `#FF5C4D` | `#FF5C4D` | the primary button, the card band, coral strokes |
| `brand-deep` | `#D9402F` | `#FF7A6C` | coral strokes only; **never** a fill under text (3.87:1) |
| `brand-soft` | `#FFE3DF` | `#3A1F33` | toasts, selected rows |
| `on-brand` | `#1D1340` | `#1D1340` | text on coral, lemon and sky |
| `link` | `#C7301F` | `#FF8A7E` | links |
| `focus` | `#1D1340` | `#FF8A7E` | 2 px focus ring, 2 px offset |
| `lemon` | `#FFD84D` | `#FFD84D` | sticker accents: New, Yours, Testnet; illustration fields |
| `sky` | `#8FD3FF` | `#8FD3FF` | illustration fields (the hero shelf, empty wallets) |
| `success` | `#0B6E54` | `#4FD9B0` | Active, Sent, Given, Bought, Used |
| `frozen` | `#2A63C7` | `#8DB8FF` | Paused for sale, Signing, Confirming |
| `danger` | `#C61F45` | `#FF7A92` | Needs attention, Unused, errors |
| `chain-btc` / `chain-evm` / `chain-sol` | `#C96F00` / `#5560B0` / `#8447D6` | `#F7931A` / `#A3ABE0` / `#C08CFF` | 8–12 px chain dots (graphics only, never text) |

### Derived tokens (each built from brand values)
| Token | Day | Night | Why |
|---|---|---|---|
| `brand-hover` | `#FF6B5D` | = | the primary's hover fill (on-brand 6.16:1) |
| `brand-line` | `#D9402F` | `#FF5C4D` | coral strokes on grounds: the tab underline, the nav bar, progress |
| `sticker-line` | `#1D1340` | **`#8A82AE`** | sticker outlines. In Night the ink outline vanishes (1.00–1.16:1), so it uses `line-strong` (Razvan, D-44). Badges and illustration objects on light fields keep the ink outline |
| `sticker-shade` | `#1D1340` | `#000000` | the hard drop |
| `scrim` · `overlay-shade` · `overlay-edge` | ink 40% · ink 18% · transparent | black 40% · black 55% · `#352C5C` | behind sheets and dialogs; overlay shadow; the 1 px Night overlay edge |
| `charm-btc/evm/sol` | `#F7931A` / `#A3ABE0` / `#C08CFF` | = | the charms' own fills, fixed in both themes |
| aliases | | | `toast` = `selected` = brand-soft; `skeleton` = `disabled` = sunken; `on-disabled` = line-strong; `inverse` = ink; `on-inverse` = ground |

## Contrast [VERIFIED]
- **Text, 4.5:1:** every pair the UI uses passes, in Day and Night:
  - `ink` and `ink-muted` on every surface and on brand-soft;
  - `link` on ground, surface and sunken;
  - the state colours on every surface (the lowest is frozen on Day brand-soft, 4.67);
  - `on-brand` on brand (5.65) and brand-hover (6.16);
  - `#1D1340` on lemon (12.45) and sky (10.60).
- **Graphics, 3:1:** `line-strong` ≥ 3.39, `focus` (Day ≥ 14.19, Night ≥ 6.45), state and chain dots (lowest 3.06),
  `brand-line` ≥ 3.73, and the Night `sticker-line` `#8A82AE` (4.85 on ground).
- **Rules that come from the failures:**
  - no links on brand-soft (Day 4.47);
  - chain colours are never text (Day BTC 3.06–3.65);
  - pressed is a 4 px move, never a darker fill (`brand-deep` under ink is 3.87; the darkest allowed coral is
    `#EA483B`);
  - every coral control carries a 2 px `sticker-line` outline (Day coral is 2.81:1 on ground, so the outline *is* its
    boundary);
  - never themed `ink` on coral (Night 2.76), never `on-brand` on Night brand-soft (1.17), never white text on coral
    (3.05).
- **Regression test:** `apps/web/test/unit/contrast.test.ts` reads `globals.css`.

## Typography
- **Faces:** `next/font/google`, self-hosted at build, with the full variable axes (Next 16.4.2 rejects weight ranges):
  - Funnel Display (`--font-funnel`), weights 700, 750 and 800;
  - Onest (`--font-onest`), weights 400 to 700;
  - Geist Mono (`--font-geist-mono`), 450, plus 600 for grouped-address emphasis.
  - The 1.0 "Satchel Symbols" font is retired. Onest serves ≈ and → from its math and symbols subsets. Funnel lacks
    them, so display strings never use ≈ or arrows. ₿ is in no face, and the copy test bans it.
- **Styles** (Tailwind `text-*` utilities; each sets size/line, weight and tracking; display styles need
  `font-display`):

| Utility | Size/line | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-balance-hero` · `-sm` | 48/52 · 38/42 | 800 | −0.03em | card amounts (lg) · amount input, small cards |
| `text-title` | 30/34 | 750 | −0.02em | page and flow titles |
| `text-heading` | 20/26 | 700 | −0.01em | section, dialog and confirm headings |
| `text-body` · `text-body-sm` | 16/24 · 14/20 | 400 | 0 | text and inputs · helper text, timestamps |
| `text-label` | 15/20 | 600 | 0 | tabs, nav, field labels, row titles |
| `text-address` | 13/18 | 450 | 0 | addresses and hashes (mono) |
| `text-button` · `-lg` | 15/20 · 16/20 | 700 | 0 | md · lg/xl buttons |
| `text-caption` · `text-badge` | 13/18 500 · 12/16 700 | | | chips and pills · New, Yours, Testnet |
| `text-display` (`-md`, `-xl`) | 40/42 → 56/56 → 72/70 | 800 | −0.035em | the landing H1 |
| `text-section` (`-md`) · `text-lead` (`-md`) | 32/34 → 44/46 · 18/28 → 20/30 | 800 · 400 | −0.03em · 0 | landing H2 · lead |

- **Amounts** take `t-num` (tabular figures; Onest needs it, Funnel's figures are already even).
- **Addresses** render in 4-character groups that wrap only between groups. The first two groups and the last are in
  ink 600. The DOM text and `data-address` stay raw.

## Shape, depth, spacing, layout
- **Radii:** sm 12, md 18 (buttons, inputs, groups), card 28 (card, sheets, dialogs), pill 999.
- **Stickers:** `sticker` = a 3 px `sticker-line` plus `0 4px 0 sticker-shade`; `sticker-sm` = 2 px, for controls
  ≤ 52 px tall. `shadow-sticker-lift` (0 6 0) for hover on card links; `shadow-pressed` (0) for the press;
  `shadow-overlay` for sheets.
- **Sticker vs flat** (the test: can you press it, do you own it, or is it celebrating?):
  - **stickers:** the Satchel card, the primary button, badges, toasts, illustration objects;
  - **flat `panel`** (surface + 1 px line): lists, forms, facts, the side nav;
  - **banners:** sunken, with no outline;
  - stickers never nest, except a badge on the card.
- **Spacing:** Tailwind's 4 px scale (brand space 1/2/3/4/6/8/12).
- **Gutters:** 16 at 390, 24 from 768, 32 from 1024 (40 on the landing at 1280).
- **Breakpoints:** sm 480, md 768 (sheets become 480 dialogs), lg 1024 (the 256 px side nav, two columns), xl 1280.
- **Containers:** `max-w-flow` 480, `max-w-app` 1200, `max-w-copy` 640.
- **The Satchel card:**
  - 1.586:1, coral band on the top 28 %, the charm S in the corner;
  - the body is the **charm ledger** (one row per chain: charm, native amount, ticker); SOL rows only with
    `SOL_UI_ENABLED`;
  - a lemon **"Yours"** badge after the name when the viewer owns it (`data-yours`; it replaces 1.0's stitch);
  - the state pill;
  - actions sit outside the card.

## States (icon + word, never colour alone)
| State | Colour | Lucide icon | Word |
|---|---|---|---|
| active · sent · confirmed | success | `Check` | Active · Sent · Confirmed |
| given · bought | success | `CircleCheck` | Given · Bought |
| for sale | frozen | `Snowflake` | **Paused for sale** (the card, Facts, the NFT image) |
| signing | frozen | `LoaderCircle` (spins; static when reduced) | Signing |
| needs attention | danger | `TriangleAlert` | Needs attention |
| sold | ink-muted | `Handshake` | Sold |

**Clean-history items:**
- **Used** (success): it can't move coins;
- **Expired**, **Unfunded** (success): they can't move coins either;
- **Confirming** (frozen);
- **Unused** (danger);
- **Not its coin** and **Can't verify** (ink-muted).

## Iconography and illustration
- **Icons:** Lucide at **stroke 2** (`STROKE = 2`), with round caps, in `currentColor`. Sizes: 14 in pills and chips;
  16 inline; 20 in buttons, rows and banners; 24 in the header and nav.
- **Charms:** at 32 px in pickers and rows, 48–64 in empty states. Never put a real chain logo in them.
- **The charm S:** loading, empty states, 404 and the card corner. It is never an icon in a button, never rotates and
  never has a face.
- **Illustrations** always sit on a light field (sky, lemon, white; `data-scheme="day"` islands), so their ink outline
  reads in Night.

## Motion tokens
- **Durations:** `--dur-press-in` 60 ms (press down, ease-out); `--dur-press` 140 (release); `--dur-fast` 150
  (reduced-motion fades); `--dur-base` 220; `--dur-sheet` 360 (in); `--dur-sheet-out` 240.
- **Easings:** `ease-out` (.2,0,0,1), `ease-in` (.3,0,1,1), `ease-in-out`, `ease-sheet` (.32,.72,0,1), `ease-pop`
  (.34,1.56,.64,1), `ease-swing` (.37,0,.63,1), `ease-carry`, `ease-fall`.
- **Hand-off:**
  - the card is carried along a strap (460 ms) with a +5.8° lag;
  - it swings −10° on arrival and settles in 600 ms (a damped pendulum);
  - it clicks 3 px into the new owner's end;
  - reduced motion is a 480 ms dip;
  - WAAPI only (`src/lib/motion/{play,handoff}.ts`).
- **Other motion:** sheets (a bottom sheet below 768, a dialog from 768), toasts (one at a time, ≤ 5 words, above
  pinned bars), the label roll (`Morph`), coins sticking on, the clean-check reveal (≥ 220 ms per row) and the landing
  loop (12 s, Pause).
- **No `motion` package** (D-44).
- **Reduced motion:** a global clamp ends CSS transitions, and meaning-carrying fades run on WAAPI.
- Details: `docs/design/satchel-2.0/motion-spec.md`.

## The NFT image (`/api/card/{id}.svg`)
- **The card:** always Day, 800×512 with an 8 px drop.
- **The band:** "Satchel #{id}" in Funnel 800, plus the charm S.
- **The body:**
  - "{n} signature(s)" (Funnel 800, 72 px);
  - "recorded on NEAR testnet";
  - the status pill (Active · Signing · Paused for sale);
  - BTC/ETH chips (SOL only with the flag).
- **No** balances, owner, fiat or stitch.
- **Fonts:** embedded WOFF2 subsets of Funnel Display and Onest (`scripts/build-card-fonts.mjs`, pinned sources and
  sha256s).

## Tailwind v4
`globals.css` resets Tailwind's colours, radii, shadows, text sizes and breakpoints, so `bg-white`, `shadow-md` and
`text-xl` don't exist, and maps every token above to utilities (`bg-ground`, `text-ink-muted`, `border-sticker`,
`shadow-sticker`, `rounded-card`, `text-title`…). Rules:
- colour only through tokens: no hex in components, no `dark:` inside islands, no `/opacity` or `color-mix()` on tokens;
- hand-written CSS reads the raw tokens (`var(--ink)`), never `var(--color-*)`;
- set each CSS property once per element. Two utilities for one property resolve by Tailwind's order, not the class
  order.
