# Satchel design tokens: dark metallic
> Owner: ux · Checked: 2026-10-21 · Confidence: high for colour and contrast (computed); medium for typefaces (the design lead's call)

Companion to `80-ux-spec.md`. Every contrast ratio here was computed with the WCAG 2.x relative-luminance formula by `research/spikes/ux/tokens_table.mjs`, `tokens_final.mjs` and `card_seed.mjs`. Those are throwaway calculation scripts, not product code. **[VERIFIED]** means "computed, numbers shown".

## TL;DR
- **Dark only.** Graphite neutrals with a cool tint (hue about 260). Primary actions use **brushed silver**, a metal gradient with near-black text. There is no single bright brand accent: identity colour comes from each Satchel's own **alloy**, seeded by token id (see `80-ux-spec.md` › SatchelCard).
- **Every text colour passes AA (4.5:1) on every surface** `--bg`…`--surface-3`. The worst case is `--fg-muted` on `--surface-3` at 5.35:1. Non-text colours pass 3:1. **[VERIFIED]**
- **Card text rule:** text on a card gradient sits on glass `rgb(8 9 11 / 0.72)`. That gives at least 5.39:1 for every text colour over the worst gradient pixel found across token ids 1–100,000. White-only text may use the lighter scrim `rgb(8 9 11 / 0.48)` (6.33:1). **[VERIFIED]**
- **Type:** Archivo, one variable font with `wdth` 62–125, used two ways. Expanded (wdth 112–125) is an "engraved" display face used sparingly. Normal width (100) is the UI face, with tabular, slashed-zero figures. JetBrains Mono, with slashed zero, is for addresses and hashes. Font features were verified by parsing the font files. **[VERIFIED]**
- Chain colours: the brand hues (`--chain-btc` and friends) are for fills and icons only (3:1). Text, and icons on the card, use the lighter `--chain-*-fg` tints (4.5:1 or better). Solana purple `#9945FF` is not safe on the card glass (2.74:1).

## Principles
1. **Metal is the material; colour is information.** Surfaces are graphite and actions are silver. Hue appears only where it means something: chain identity, Satchel status, a token's alloy.
2. **One signature element.** The alloy card is the memorable thing. Everything around it stays quiet: hairline lines, no decorative gradients elsewhere.
3. **Numbers are instruments.** Every amount uses tabular, slashed-zero figures, right-aligned in rows.
4. **No text on raw gradient.** This is the scrim rule below.

## Colour

### Neutrals (graphite)
| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--bg` | `#0A0B0D` | 0.149 0.005 264.5 | Page background |
| `--surface-1` | `#111317` | 0.186 0.009 264.3 | Panels, rows, tab content |
| `--surface-2` | `#181B20` | 0.221 0.011 260.7 | Sheets, dialogs, popovers |
| `--surface-3` | `#20242A` | 0.259 0.013 258.4 | Inputs, hovered rows |
| `--surface-4` | `#2A2F37` | 0.304 0.016 259.8 | Pressed/selected (`--fg-muted` still 4.62:1 here) |
| `--line-subtle` | `#262A31` | 0.284 0.014 261.7 | Dividers (decorative) |
| `--line` | `#3A4049` | 0.369 0.017 258.4 | Card and panel outlines (decorative, 1.65–1.88:1) |
| `--line-input` | `#69717D` | 0.546 0.021 258.4 | Input borders, toggle outlines (non-text, 3:1 or better on all surfaces) |

### Text
| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--fg` | `#F3F5F8` | 0.969 0.005 258.3 | Primary text, amounts |
| `--fg-2` | `#B4BBC5` | 0.790 0.016 257.2 | Secondary text, labels |
| `--fg-muted` | `#8F98A5` | 0.677 0.022 257.5 | Tertiary text, timestamps, placeholders |
| `--fg-disabled` | `#5D6570` | 0.504 0.020 256.3 | Disabled only (WCAG-exempt; 2.93:1 on `--surface-2`) |
| `--link` | `#8CC8FF` | 0.812 0.100 247.0 | Links, explorer links (also underlined; not colour only) |

### Metal (primary action)
| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--metal-hi` | `#E9EDF2` | 0.944 0.008 253.9 | Top of the silver gradient; hover base `#F4F6F9` |
| `--metal-mid` | `#C7CFD8` | 0.851 0.015 251.2 | Middle stop |
| `--metal-lo` | `#AEB8C4` | 0.779 0.020 252.9 | Bottom stop, button edge |
| `--on-metal` | `#0A0B0D` | 0.149 0.005 264.5 | Text and icons on silver: 16.75 / 12.51 / 9.80:1 on hi / mid / lo **[VERIFIED]** |

Primary button: `background: linear-gradient(180deg, var(--metal-hi) 0%, var(--metal-mid) 55%, var(--metal-lo) 100%)` with `box-shadow: var(--shadow-metal)`. When pressed, reverse the gradient (180° becomes 0°). When disabled, use `--surface-3` with `--fg-disabled`, never a dimmed metal.

### Status (UI feedback)
| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--success` | `#4ADE9B` | 0.806 0.158 159.6 | Settled, Sent, Confirmed, Active dot |
| `--warning` | `#F6C453` | 0.844 0.140 84.8 | Slow signing, "can't verify" |
| `--danger` | `#FF7A7A` | 0.735 0.163 21.9 | Error text, "Unused signature" |
| `--danger-solid` | `#CF3B40` | 0.574 0.185 23.5 | Destructive button fill, with `#FFFFFF` text (4.82:1; 4.08:1 against `--bg`) **[VERIFIED]** |
| `--info` | `#7DB8FF` | 0.771 0.120 253.7 | Signing (pending) |

### Satchel status colours (StatusPill)
| Status | Text/icon | Pill fill | Glyph |
|---|---|---|---|
| Active | `--success` | `--success` at 14% | filled dot |
| Signing | `--info` | `--info` at 14% | spinner (static under reduced motion) |
| Listed · cooling down | `--state-frozen` `#9AD8FF` | 14% tint | snowflake |
| For sale | `--state-listed` `#E8C77A` | 14% tint | tag |
| Sold (flow end state only) | `--fg-2` | `--fg-2` at 14% | check |

The status is always written as text. Colour is never the only signal (WCAG 1.4.1).

### Chain accents
| Chain | Brand (fills, icons on `--bg`…`--surface-3`) | Text and icons on the card (`-fg`) | Soft fill |
|---|---|---|---|
| Bitcoin testnet4 | `--chain-btc` `#F7931A` | `--chain-btc-fg` `#FFA94D` | `-fg` at 14% |
| Ethereum Sepolia | `--chain-eth` `#627EEA` | `--chain-eth-fg` `#9AABF5` | `-fg` at 14% |
| Solana devnet | `--chain-sol` `#9945FF`, `--chain-sol-2` `#14F195` (gradient mark) | `--chain-sol-fg` `#C09BFF` | `-fg` at 14% |

Rule: brand colours are never text. On the card glass the brand colours measure BTC 5.39:1, ETH 3.36:1 and **SOL 2.74:1 (fails 3:1)**, so icons on the card always use the `-fg` tints (5.53:1 or better). **[VERIFIED]**

### Card glass and scrim (the "scrim under text on gradients" rule)
| Token | Value | Allowed content | Worst-case contrast **[VERIFIED]** |
|---|---|---|---|
| `--card-glass` | `rgb(8 9 11 / 0.72)` + `backdrop-filter: blur(8px)` | Any text colour: chips, pills, balances, owner | `--fg` 11.33, `--fg-2` 6.40, `--chain-btc-fg` 6.50, `--chain-eth-fg` 5.61, `--chain-sol-fg` 5.53, `--success` 7.20, `--state-frozen` 8.04, `--state-listed` 7.59, `--warning` 7.63, `--info` 6.00 |
| `--card-scrim` | `rgb(8 9 11 / 0.48)` | `--fg` (white) text only, for example the serial "SATCHEL № 0001" | `--fg` 6.33 (others fail: `--fg-2` 3.57) |

How it was measured: `card_seed.mjs sweep` generated the gradient for token ids 1–100,000. For each id it composited the specular highlight (white at 16%) over every stop and kept the brightest pixel, `#93AB99` (Patina, id 6110, relative luminance 0.377). Raw `--fg` on that pixel is 2.26:1, which is why no text goes on a raw gradient. Blur is ignored in the calculation, so the result is conservative. If the alloy table or the highlight alpha changes, re-run the sweep.

### Seeded identity colours
| Identity | Formula | Contrast **[VERIFIED]** |
|---|---|---|
| Satchel accent (per token; Rainbow-style identity) | `oklch(0.80, min(C×1.2+0.02, 0.14), h1)` from the token's alloy, gamut-clamped | Over ids 1–100,000, at least 9.98 on `--bg`, 9.42 on `--surface-1` and 8.75 on `--surface-2`, so it is safe for text |
| Account avatar (NEAR account) | hue = `fnv1a32(accountId) % 360`; fill `oklch(0.74 0.12 hue)`; initial in `#0A0B0D` | Initial at least 8.03:1 for every hue; fill at least 8.03:1 on `--bg` |

Examples: `alice.testnet` gets hue 354 (`#E68AB0`, rose) and `bob.testnet` gets hue 241 (`#5EB4EF`, blue). These are the "owner colours" the handoff key icon animates between.

### shadcn/ui variable mapping
shadcn components read these names. Set `<html class="dark">` so components that use `dark:` variants pick up the dark styles. The tokens live on `:root`, because Satchel has no light theme.

| shadcn var | Satchel token |
|---|---|
| `--background` / `--foreground` | `--bg` / `--fg` |
| `--card` / `--card-foreground` | `--surface-1` / `--fg` |
| `--popover` / `--popover-foreground` | `--surface-2` / `--fg` |
| `--primary` / `--primary-foreground` | `--metal-hi` / `--on-metal` (the button adds the gradient) |
| `--secondary` / `--secondary-foreground` | `--surface-3` / `--fg` |
| `--muted` / `--muted-foreground` | `--surface-2` / `--fg-muted` |
| `--accent` / `--accent-foreground` | `--surface-3` / `--fg` (shadcn uses "accent" for hover fills, not brand) |
| `--destructive` | `--danger-solid` |
| `--border` / `--input` / `--ring` | `--line` / `--line-input` / `--ring` (`#8CC8FF`) |

## Contrast table [VERIFIED]
Text needs 4.5:1. Non-text needs 3:1 (WCAG 1.4.11). Output of `tokens_table.mjs`:

| Foreground | --bg | --surface-1 | --surface-2 | --surface-3 | Min | Need | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| `--fg` #F3F5F8 | 18.03 | 17.03 | 15.81 | 14.27 | 14.27 | 4.5 | pass |
| `--fg-2` #B4BBC5 | 10.18 | 9.61 | 8.92 | 8.06 | 8.06 | 4.5 | pass |
| `--fg-muted` #8F98A5 | 6.75 | 6.38 | 5.92 | 5.35 | 5.35 | 4.5 | pass |
| `--link` #8CC8FF | 11.08 | 10.47 | 9.72 | 8.77 | 8.77 | 4.5 | pass |
| `--success` #4ADE9B | 11.45 | 10.81 | 10.04 | 9.07 | 9.07 | 4.5 | pass |
| `--warning` #F6C453 | 12.13 | 11.46 | 10.64 | 9.60 | 9.60 | 4.5 | pass |
| `--danger` #FF7A7A | 7.80 | 7.36 | 6.84 | 6.17 | 6.17 | 4.5 | pass |
| `--info` #7DB8FF | 9.54 | 9.01 | 8.36 | 7.55 | 7.55 | 4.5 | pass |
| `--state-frozen` #9AD8FF | 12.79 | 12.08 | 11.21 | 10.12 | 10.12 | 4.5 | pass |
| `--state-listed` #E8C77A | 12.08 | 11.41 | 10.59 | 9.56 | 9.56 | 4.5 | pass |
| `--chain-btc-fg` #FFA94D | 10.35 | 9.77 | 9.07 | 8.19 | 8.19 | 4.5 | pass |
| `--chain-eth-fg` #9AABF5 | 8.92 | 8.43 | 7.82 | 7.06 | 7.06 | 4.5 | pass |
| `--chain-sol-fg` #C09BFF | 8.79 | 8.30 | 7.71 | 6.96 | 6.96 | 4.5 | pass |
| `--chain-btc` #F7931A (non-text) | 8.57 | 8.10 | 7.52 | 6.79 | 6.79 | 3 | pass |
| `--chain-eth` #627EEA (non-text) | 5.34 | 5.04 | 4.68 | 4.22 | 4.22 | 3 | pass |
| `--chain-sol` #9945FF (non-text) | 4.36 | 4.12 | 3.82 | 3.45 | 3.45 | 3 | pass |
| `--chain-sol-2` #14F195 (non-text) | 13.17 | 12.44 | 11.55 | 10.43 | 10.43 | 3 | pass |
| `--ring` #8CC8FF (non-text) | 11.08 | 10.47 | 9.72 | 8.77 | 8.77 | 3 | pass |
| `--line-input` #69717D (non-text) | 3.99 | 3.77 | 3.50 | 3.16 | 3.16 | 3 | pass |

Tinted pills: the text is the tint colour itself, on a 14% fill of that colour.

| Text | on 14% over `--surface-1` | on 14% over `--surface-2` |
|---|---:|---:|
| `--success` | 8.25 | 7.49 |
| `--warning` | 8.57 | 7.77 |
| `--danger` | 6.03 | 5.51 |
| `--info` | 7.03 | 6.38 |
| `--state-frozen` | 8.88 | 8.12 |
| `--state-listed` | 8.54 | 7.75 |
| `--chain-btc-fg` | 7.56 | 6.88 |
| `--chain-eth-fg` | 6.65 | 6.04 |
| `--chain-sol-fg` | 6.55 | 5.96 |
| `--fg-2` | 7.35 | 6.74 |

Other pairs: on silver, `--on-metal` gives 9.80:1 or better. Against silver, the focus ring is only 1.51:1, so **the ring must use `ring-offset-2` with offset colour `--bg`**, which puts it at 11.08:1 against the background. White on `--danger-solid` is 4.82:1.

## Typography
Fonts verified by parsing GSUB and fvar in google/fonts `main`, 2026-10-21 **[VERIFIED]**:

| Face | Axes | `tnum` | `zero` | Notes |
|---|---|---|---|---|
| **Archivo** (variable) | wght 100–900, **wdth 62–125** | yes | yes | One file serves both display (expanded) and UI (normal width) |
| **JetBrains Mono** (variable) | wght 100–800 | n/a (mono) | yes | Addresses and hashes; enable `"zero"` for a slashed zero |
| Alternative: Martian Mono | wght 100–800, wdth 75–112.5 | n/a | no | More character, but no slashed-zero feature |
| Rejected: Geist / Geist Mono | wght only | Geist yes / mono n/a | no | Fine, but it's the create-next-app default (looks templated) and has no width axis |

Loading: `next/font/google` with `Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo' })` and `JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono' })` **[ASSUMED API shape; check against the web agent's 41-web-stack.md]**. Use `font-stretch: 125%` (or `font-variation-settings: "wdth" 125`) for the expanded style.

| Role (token) | Face, width, weight | Size / line height (mobile → ≥1024) | Tracking | Case | Numerals |
|---|---|---|---|---|---|
| `engrave` (wordmark, card serial, eyebrows) | Archivo wdth 125, 650 | 12/16 (card serial 15/20) | +0.08em | UPPER | lining |
| `display` (judge H1, mint reveal) | Archivo wdth 112, 700 | 30/34 → 44/48 | −0.01em | Sentence | — |
| `h1` | Archivo wdth 100, 650 | 24/30 → 28/34 | −0.005em | Sentence | — |
| `h2` | Archivo 100, 600 | 20/26 | 0 | Sentence | — |
| `h3` | Archivo 100, 600 | 16/22 | 0 | Sentence | — |
| `body` | Archivo 100, 400 | 15/22 → 16/24 | 0 | Sentence | — |
| `small` | Archivo 100, 450 | 13/18 | 0 | Sentence | — |
| `caption` (minimum size) | Archivo 100, 500 | 12/16 | +0.01em | Sentence | — |
| `amount-xl` (card balances, review total) | Archivo 100, 600 | 28/32 → 32/36 | −0.01em | — | `tabular-nums slashed-zero` |
| `amount` (rows, fees) | Archivo 100, 550 | 15/20 | 0 | — | `tabular-nums slashed-zero` |
| `mono` (addresses, hashes) | JetBrains Mono 450 | 13/18 (full address 14/22) | +0.02em | as-is | `"zero" 1` |

Rules: never smaller than 12px except the decorative `TESTNET` engraving on the card, which is `aria-hidden`. The expanded width appears only in `engrave` and `display`: no expanded body text, and no more than one expanded line per view outside the card. Full addresses render in 4-character groups separated by 0.35em gaps, using spans so that copying still yields the raw address.

## Radii
| Token | Value | Use |
|---|---|---|
| `--radius` | 12px | Base (shadcn) |
| `--radius-sm` / `-md` / `-lg` / `-xl` | 8 / 10 / 12 / 16px | Inputs / buttons / panels / sheets and dialogs |
| `--radius-pill` | 9999px | Pills, chips |
| Sheet top corners | 20px | Mobile bottom drawer |
| **Card** | **0.0372 × card width** | ISO/IEC 7810 ID-1: 85.60 × 53.98 mm (1.586:1) with a nominal 3.18 mm corner radius, so 3.18 ÷ 85.60 = 3.72%. Wikipedia gives a 2.88–3.48 mm range **[SOURCED](https://en.wikipedia.org/wiki/ISO/IEC_7810)**. That works out to 13px at 358px, 10px at 280px and 6px at 160px wide |

## Shadows and elevation (dark UI)
| Token | Value |
|---|---|
| `--shadow-raise-1` | `inset 0 1px 0 rgb(255 255 255 / 0.04), 0 1px 2px rgb(0 0 0 / 0.40)` |
| `--shadow-raise-2` | `inset 0 1px 0 rgb(255 255 255 / 0.05), 0 8px 24px -8px rgb(0 0 0 / 0.60)` |
| `--shadow-overlay` | `0 24px 64px -12px rgb(0 0 0 / 0.70)` |
| `--shadow-card` | `inset 0 1px 0 rgb(255 255 255 / 0.20), inset 0 -1px 0 rgb(0 0 0 / 0.35), 0 18px 40px -16px rgb(0 0 0 / 0.75)` |
| `--shadow-card-lifted` | `inset 0 1px 0 rgb(255 255 255 / 0.24), inset 0 -1px 0 rgb(0 0 0 / 0.35), 0 36px 72px -20px rgb(0 0 0 / 0.80)` |
| `--shadow-metal` | `inset 0 1px 0 rgb(255 255 255 / 0.65), inset 0 -1px 0 rgb(0 0 0 / 0.20), 0 1px 2px rgb(0 0 0 / 0.50)` |

## Spacing, layout, breakpoints, layers
| Item | Value |
|---|---|
| Spacing scale | Tailwind default (`--spacing: 0.25rem`) |
| Page gutter | 16px below 640px; 24px at 640px and up; max content width 1200px |
| Breakpoints | Tailwind defaults: `sm` 640, `md` 768, `lg` 1024 (two-column Satchel page), `xl` 1280 |
| Top bar | 56px (mobile) / 64px (desktop), sticky |
| Touch targets | 44×44px or larger for primary controls on mobile; 24×24px or larger for every target, with spacing (WCAG 2.5.8) |
| Scroll padding | `scroll-padding-top: 72px; scroll-padding-bottom: 96px`, so a focused element is never hidden under sticky bars (WCAG 2.4.11) |
| Z layers | content 0 · sticky bars 40 · overlay/sheet 50 · toast 60 |

## Motion tokens
CSS tweens are listed here. Springs live in `80-ux-spec.md` › Motion spec.

| Token | Value | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and change |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Exit |
| `--duration-fast` | 120ms | Hover, press |
| `--duration-base` | 160ms | Chips, value swaps |
| `--duration-slow` | 240ms | Message reveals |
| `--duration-slower` | 320ms | Colour change on handoff |

## CSS spec block (Tailwind v4)
This is a spec, to be re-typed in the product repo on or after Nov 1. It follows Tailwind v4's documented `@theme` / `@theme inline` model **[SOURCED](https://tailwindcss.com/docs/theme)**: tokens that reference other variables go in `@theme inline`.

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  /* graphite */
  --bg: #0A0B0D; --surface-1: #111317; --surface-2: #181B20; --surface-3: #20242A; --surface-4: #2A2F37;
  --line-subtle: #262A31; --line: #3A4049; --line-input: #69717D;
  --fg: #F3F5F8; --fg-2: #B4BBC5; --fg-muted: #8F98A5; --fg-disabled: #5D6570; --link: #8CC8FF;
  /* metal */
  --metal-hi: #E9EDF2; --metal-mid: #C7CFD8; --metal-lo: #AEB8C4; --on-metal: #0A0B0D;
  /* status */
  --success: #4ADE9B; --warning: #F6C453; --danger: #FF7A7A; --danger-solid: #CF3B40; --info: #7DB8FF;
  --state-frozen: #9AD8FF; --state-listed: #E8C77A;
  /* chains */
  --chain-btc: #F7931A; --chain-btc-fg: #FFA94D;
  --chain-eth: #627EEA; --chain-eth-fg: #9AABF5;
  --chain-sol: #9945FF; --chain-sol-2: #14F195; --chain-sol-fg: #C09BFF;
  /* card */
  --card-glass: rgb(8 9 11 / 0.72); --card-scrim: rgb(8 9 11 / 0.48);
  /* shadcn aliases */
  --background: var(--bg); --foreground: var(--fg);
  --card: var(--surface-1); --card-foreground: var(--fg);
  --popover: var(--surface-2); --popover-foreground: var(--fg);
  --primary: var(--metal-hi); --primary-foreground: var(--on-metal);
  --secondary: var(--surface-3); --secondary-foreground: var(--fg);
  --muted: var(--surface-2); --muted-foreground: var(--fg-muted);
  --accent: var(--surface-3); --accent-foreground: var(--fg);
  --destructive: var(--danger-solid);
  --border: var(--line); --input: var(--line-input); --ring: #8CC8FF;
  --radius: 0.75rem;
}

@theme inline {
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-card: var(--card); --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover); --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary); --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted); --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent); --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring);
  --color-surface-1: var(--surface-1); --color-surface-2: var(--surface-2); --color-surface-3: var(--surface-3); --color-surface-4: var(--surface-4);
  --color-fg-2: var(--fg-2); --color-fg-muted: var(--fg-muted); --color-link: var(--link);
  --color-success: var(--success); --color-warning: var(--warning); --color-danger: var(--danger); --color-info: var(--info);
  --color-frozen: var(--state-frozen); --color-listed: var(--state-listed);
  --color-btc: var(--chain-btc); --color-btc-fg: var(--chain-btc-fg);
  --color-eth: var(--chain-eth); --color-eth-fg: var(--chain-eth-fg);
  --color-sol: var(--chain-sol); --color-sol-2: var(--chain-sol-2); --color-sol-fg: var(--chain-sol-fg);
  --font-sans: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-archivo), ui-sans-serif, sans-serif;
  --font-mono: var(--font-jbmono), ui-monospace, monospace;
  --radius-sm: calc(var(--radius) - 4px); --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius); --radius-xl: calc(var(--radius) + 4px);
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); --ease-exit: cubic-bezier(0.3, 0, 1, 1);
}
```

## Figma variable naming (for the design lead)
- Collections: `primitive` (raw hex), `semantic` (the tokens above), `chain`, `state`, `card`. One mode: `dark`.
- Name variables 1:1 with the CSS, using a slash for the dash, so `surface/1` maps to `--surface-1` and `chain/btc-fg` to `--chain-btc-fg`. That keeps Code Connect and handoff trivial.
- Text styles follow the typography roles: `engrave`, `display`, `h1`…`caption`, `amount-xl`, `amount`, `mono`.

## Deltas vs plan
1. The plan says "dark and metallic" and nothing more. This doc defines it: graphite neutrals, a silver CTA, per-token alloy identity, and **no single bright accent**. A single acid accent on near-black is a generic look.
2. "Scrim under text on gradients" is now a measurable rule: 72% glass for any text, or 48% scrim for white only. The plan gave no values.
3. Chain brand colours cannot be text, and Solana purple can't even be an icon on the card. The `-fg` tints are required.
4. The card corner radius comes from the ID-1 spec (3.72% of width), next to the 1.586 ratio the plan already uses.

## Open questions / decisions for the design lead
1. **Typeface:** Archivo (expanded + normal) with JetBrains Mono is the recommendation. The alternative is Martian Mono for addresses (more character, no slashed zero). Decide by day 1 (Nov 1), because next/font setup touches the root layout.
2. **Dark only:** confirm. A light theme is out of scope for the 14 days.
3. **Silver CTA vs alloy-tinted CTA on the Satchel page:** the identity accent passes text contrast (8.75:1 or better), so a Rainbow-style per-Satchel button tint is possible. The recommendation is to keep silver for all primary buttons and use the alloy for the card, the header glow and the tab indicator only.
4. **Danger fill `#CF3B40`:** acceptable, or prefer outline-style destructive buttons (`--danger` on a 14% tint)? Both pass.
