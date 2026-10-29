# Satchel 2.0: web design system, implementation spec (`apps/web`)

Brand system architect, 2026-10-26. **Sources:** `design-system/project/{README.md,tokens.json}` (the brand, binding on
visual identity), the six canvas boards, the zip (`brand-v2/satchel-brand-v2/`), `marketing/brand-v2/_overview-sheet.png`
and the current code. **Versions:** Next 16.4.2, Tailwind 4.3.3, motion 14.5.0, lucide-react 1.61.0. Product facts (§9)
override brand sample copy. Items marked **[verified]** were measured. Evidence in `<R>`: `contrast.mjs` → `contrast-report.txt`,
`font-audit.py` → `font-audit.json`, `lc/probe.cjs` (theme mechanism in Chromium), `card-proto.cjs` → `proto-cards.png`
(NFT card), `proto/ui.png` (core components, Day | Night).

## 0. The ten rules builders must not break
1. **Colour only through tokens.** No hex in components, no `dark:` variants, no `color-mix()` or `/opacity` on tokens (§1.1).
2. **Coral budget: one coral fill per view,** the primary button. Card bands and the mark are identity, not budget.
   Text on coral is always `on-brand` #1D1340, never `ink` (Night `ink` on coral is 2.76:1).
3. **Every coral control has a 2 px `sticker-line` outline.** Day coral is 2.81:1 on `ground` and 2.56:1 on `surface-sunken`,
   so the outline *is* its boundary (WCAG 1.4.11).
4. **The press is the motion, never a darker fill:** `translateY(4px)` with the shadow at 0. (`brand-deep` under ink is 3.87:1.)
5. **Stickers are for what you own, press or celebrate:** card, primary button, badges, toast, illustrations. Everything
   else is flat: `surface` + 1 px `line` (§4.3).
6. **Native amounts only,** with `t-num`. No fiat, no "every chain". The card hero is "{n} chains".
7. **Faces:** Funnel Display for display only (balances, titles, headings, the card name); Onest for everything people read
   and tap (16 px body and inputs); Geist Mono for addresses and hashes only. No ≈ or arrows in display strings (§3).
8. **Every state is icon + word in a pill,** never colour alone. Chain colours are dots and charms, never text.
9. **Server HTML first.** Cards, pills and facts are real text in server components; skeletons never replace judge facts.
10. **Every animation ships its reduced-motion variant** (§5). Only transform and opacity are animated.

## 1. Tokens → CSS

### 1.1 Theme mechanism **[verified in Chromium against lightningcss 1.33 output and the shipped `.next` CSS]**
- **System is the default.** With no stored choice `<html>` has **no** `data-theme`, and `:root { color-scheme: light dark }`
  follows the OS in CSS alone (also without JS). A stored choice sets `<html data-theme="day|night">` before first paint.
- **How it compiles.** Next targets chrome/edge/firefox 111 and safari 16.4, which lack `light-dark()`. Lightning CSS turns
  `--x: light-dark(A, B)` into `var(--lightningcss-light, A) var(--lightningcss-dark, B)`, and sets the flags **only** on
  rules that declare `color-scheme` (plus an `@media (prefers-color-scheme: dark)` copy for `light dark`).
- **So a token resolves on the element that declares it.** An island that switches scheme must re-declare every token; the
  probe shows an island that sets only `color-scheme` silently keeps the page theme. Islands use
  `[data-scheme="day|night"]`, which shares the token selector (this replaces `.scope-night-band`).
- **Composites** (shadows, fonts) live in `@theme inline`, so their `var()` resolves at the element that uses them.
```css
@import "tailwindcss";
:root, [data-scheme] {                       /* brand tokens.json (Day, Night) + derived (§1.4); nothing else */
  --ground: light-dark(#f6f5fb, #120c26); --surface: light-dark(#ffffff, #1c1538); --surface-sunken: light-dark(#eceaf4, #29214b);
  --line: light-dark(#e2dfee, #352c5c); --line-strong: light-dark(#7f7999, #8a82ae);
  --ink: light-dark(#1d1340, #f4f2ff); --ink-muted: light-dark(#5e5776, #b7b0d1);
  --brand: #ff5c4d; --brand-deep: light-dark(#d9402f, #ff7a6c); --brand-soft: light-dark(#ffe3df, #3a1f33);
  --on-brand: #1d1340; --link: light-dark(#c7301f, #ff8a7e); --focus: light-dark(#1d1340, #ff8a7e);
  --lemon: #ffd84d; --sky: #8fd3ff;
  --success: light-dark(#0b6e54, #4fd9b0); --frozen: light-dark(#2a63c7, #8db8ff); --danger: light-dark(#c61f45, #ff7a92);
  --chain-btc: light-dark(#c96f00, #f7931a); --chain-evm: light-dark(#5560b0, #a3abe0); --chain-sol: light-dark(#8447d6, #c08cff);
  /* derived */
  --brand-hover: #ff6b5d; --brand-line: light-dark(#d9402f, #ff5c4d); --sticker-line: #1d1340; --sticker-shade: light-dark(#1d1340, #000000);
  --overlay-shade: light-dark(rgb(29 19 64 / 0.18), rgb(0 0 0 / 0.55)); --scrim: light-dark(rgb(29 19 64 / 0.4), rgb(0 0 0 / 0.4));
  --overlay-edge: light-dark(transparent, #352c5c);
}
:root { color-scheme: light dark; }                                   /* System: follows the OS, no JS needed */
:root[data-theme="day"], [data-scheme="day"] { color-scheme: light; }
:root[data-theme="night"], [data-scheme="night"] { color-scheme: dark; }
```
**Head script v2** (`src/lib/theme.ts`, inlined in `<head>` before `MOTION_HEAD_SCRIPT`, never throws). It needs no OS
listener, because System is pure CSS:
```js
(function(){try{var d=document.documentElement,t=null;try{t=localStorage.getItem("satchel:theme:v2")}catch(e){}
if(t==="day"||t==="night"){d.dataset.theme=t;var c=t==="night"?"#120c26":"#f6f5fb",m=document.querySelectorAll('meta[name="theme-color"]');
for(var i=0;i<m.length;i++)m[i].setAttribute("content",c)}}catch(e){}})();
```
- **`applyTheme(choice)`** stores the choice. `day`/`night` set `data-theme` and both metas' `content`; `system` removes
  `data-theme` and restores each meta to its media colour. `GROUND = { day: "#f6f5fb", night: "#120c26" }`. The key is v2:
  under v1 "day" meant the default, so a stored v1 value must not force Day now.
- **`viewport`:** `themeColor: [{ media: "(prefers-color-scheme: light)", color: GROUND.day }, { media:
  "(prefers-color-scheme: dark)", color: GROUND.night }]`, `colorScheme: "light dark"`. Server HTML has no `data-theme`;
  the ThemeControl's server snapshot is `"system"`.
- **Theme variant,** for rare non-colour cases. It is not island-aware, so never use it inside `[data-scheme]`:
  `@custom-variant night { &:where(:root[data-theme="night"] *) { @slot; } @media (prefers-color-scheme: dark) {
  &:where(:root:not([data-theme]) *) { @slot; } } }`. Define `dark` the same way, so Tailwind's media default can't
  override a forced Day.

### 1.2 Tailwind v4 mapping (`globals.css`) **[verified: compiled with Tailwind 4.3.3 (`tw/build.mjs`); `bg-white`, `shadow-md`, `text-xl` no longer exist]**
```css
@theme { --color-*: initial; --radius-*: initial; --shadow-*: initial; --text-*: initial; --breakpoint-*: initial;
  --breakpoint-sm: 30rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem;   /* 480 768 1024 1280 */
  --container-flow: 30rem; --container-app: 75rem;      /* max-w-flow, max-w-app; keep Tailwind's @container sizes */
  --radius-sm: 12px; --radius-md: 18px; --radius-card: 28px; --radius-pill: 999px;
  --ease-out: cubic-bezier(.2,0,0,1); --ease-in: cubic-bezier(.3,0,1,1); --ease-sheet: cubic-bezier(.32,.72,0,1);
  --ease-pop: cubic-bezier(.34,1.56,.64,1); --ease-swing: cubic-bezier(.37,0,.63,1); }
@theme inline {
  --color-ground: var(--ground); --color-surface: var(--surface); --color-surface-sunken: var(--surface-sunken); --color-line: var(--line);
  --color-line-strong: var(--line-strong); --color-ink: var(--ink); --color-ink-muted: var(--ink-muted); --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover); --color-brand-deep: var(--brand-deep); --color-brand-line: var(--brand-line);
  --color-brand-soft: var(--brand-soft); --color-on-brand: var(--on-brand); --color-link: var(--link); --color-focus: var(--focus);
  --color-lemon: var(--lemon); --color-sky: var(--sky); --color-success: var(--success); --color-frozen: var(--frozen);
  --color-danger: var(--danger); --color-chain-btc: var(--chain-btc); --color-chain-evm: var(--chain-evm); --color-chain-sol: var(--chain-sol);
  --color-sticker: var(--sticker-line); --color-scrim: var(--scrim); --color-overlay-edge: var(--overlay-edge); --color-toast: var(--brand-soft);
  --color-selected: var(--brand-soft); --color-skeleton: var(--surface-sunken); --color-disabled: var(--surface-sunken);
  --color-on-disabled: var(--line-strong); --color-inverse: var(--ink); --color-on-inverse: var(--ground);   /* transparent/current stay static */
  --shadow-sticker: 0 4px 0 var(--sticker-shade); --shadow-sticker-lift: 0 6px 0 var(--sticker-shade);
  --shadow-pressed: 0 0 0 var(--sticker-shade); --shadow-overlay: 0 16px 48px var(--overlay-shade);
  --font-display: var(--font-funnel), var(--font-onest), system-ui, sans-serif;
  --font-sans: var(--font-onest), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
@utility t-num { font-variant-numeric: tabular-nums; }
@utility sticker { border: 3px solid var(--sticker-line); box-shadow: 0 4px 0 var(--sticker-shade); }
@utility sticker-sm { border: 2px solid var(--sticker-line); box-shadow: 0 4px 0 var(--sticker-shade); }
@utility panel { background: var(--surface); border: 1px solid var(--line); }
```
- **Base layer:** `html, body` get `bg-ground text-ink`, sans 16/24, antialiased; `h1`–`h3` `font-display`;
  `:focus-visible` `outline: 2px solid var(--focus); outline-offset: 2px`; `::selection` brand with on-brand text (5.65:1).
- **Spacing:** keep `--spacing: .25rem`; brand space-1/2/3/4/6/8/12 map to `1 2 3 4 6 8 12`. **Gutters:** 16, 24 from md.
  **Card grid:** gap 24 (32 from lg); 1 column, 2 from lg, 3 from xl. **Delete:** the v1 scopes (`.scope-*`, `.hl/.cs`),
  `--stitch`, `--brass-gradient`, `--satchel-body/swatch`, and the "Satchel Symbols" `@font-face`.

### 1.3 Type styles (`@theme` tokens, e.g. `--text-title: 30px; --text-title--line-height: 34px; --text-title--letter-spacing: -0.02em; --text-title--font-weight: 750;`; pair each with its family utility)
| Utility | Size/line | Wt | Tracking | Family | Use |
|---|---|---|---|---|---|
| `text-balance-hero` | 48/52 | 800 | -0.03em | display | Card total (container ≥ 22rem), wallet total |
| `text-balance-hero-sm` | 38/42 | 800 | -0.03em | display | Same, below 480 or on md cards |
| `text-title` | 30/34 | 750 | -0.02em | display | Page titles, flow sheet titles, the Satchel name on its page |
| `text-heading` | 20/26 | 700 | -0.01em | display | Section, dialog and confirm headings; card name (lg) |
| `text-body` / `text-body-sm` | 16/24 · 14/20 | 400 | 0 | sans | Default and inputs · helper, timestamps (`ink-muted`) |
| `text-label` | 15/20 | 600 | 0 | sans | Tabs, nav, field labels, row titles |
| `text-address` | 13/18 | 450 | 0 | mono | Addresses, hashes |
| derived `text-button` / `-lg` | 15/20 · 16/20 | 700 | 0 | sans | md · lg buttons (the canvas uses 700, not label's 600) |
| derived `text-caption` · `text-badge` | 13/18 · 12/16 | 500 · 700 | 0 | sans | Chips (pills add `font-semibold`) · New, Yours, Testnet |
| derived `text-display` → `md:` → `xl:` | 40/42 → 56/56 → 72/70 | 800 | -0.035em | display | Landing H1 (`text-balance`); the board is 96/0.95 |
| derived `text-section` → `md:` · `text-lead` → `md:` | 32/34 → 44/46 · 18/28 → 20/30 | 800 · 400 | -0.03em · 0 | display · sans | Landing H2 · lead |

### 1.4 Derived tokens (the brand lacks these; each is built only from brand values)
| Token | Day | Night | From | Use and why |
|---|---|---|---|---|
| `brand-hover` | #ff6b5d | = | brand, OKLCH L +0.03 | Primary hover fill; ink on it is 6.16:1 |
| `brand-line` | #d9402f | #ff5c4d | brand-deep (Day) / brand (Night) | Coral *strokes* on grounds: tab underline, nav bar, progress (3.73–6.23:1) |
| `sticker-line` | #1d1340 | #1d1340 | ink-day, constant | Sticker outlines; the canvas Night card keeps #1D1340 |
| `sticker-shade` | #1d1340 | #000000 | `shadow-sticker` | The hard drop |
| `overlay-shade` · `scrim` | ink 18% · ink 40% | black 55% · black 40% | `shadow-overlay` · ink, canvas Give sheet | Overlays · behind sheets and dialogs |
| `overlay-edge` | transparent | #352c5c | line | 1 px edge on Night overlays (a sheet vs the scrimmed page is 1.15:1) |
| `toast`, `selected` | = brand-soft | = | brand-soft | Toast fill; selected rows |
| `disabled` / `on-disabled` | sunken / line-strong | = | | Disabled controls (3.46 / 4.16:1; exempt but kept legible) |
| `inverse` / `on-inverse` | ink / ground | = | | Selected segment and filter chip (15.9 / 17.2:1) |
| `skeleton` | = sunken | = | | Static placeholders |
| (pressed fill) | = brand | = | | Never darker; the ceiling is `#ea483b` (ink 4.50:1) |

## 2. Contrast **[verified: `node contrast.mjs`; 98 pairs × Day/Night = 196 checks: 150 pass, 10 fail, 4 "never" rules, 32 info]**
**Text, 4.5:1. All of these pass:**
- `ink` and `ink-muted` on ground, surface, sunken and brand-soft (Day ≥ 14.19 / 5.58; Night ≥ 13.34 / 7.13);
- `link` on ground, surface and sunken (Day 5.00 / 5.42 / 4.56; Night ≥ 6.50);
- `success`, `frozen` and `danger` on every surface, sunken and brand-soft included (lowest: frozen on Day brand-soft, 4.67);
- `chain-evm` and `chain-sol` (≥ 4.58);
- on-brand on brand (5.65) and on brand-hover (6.16); #1D1340 on lemon (12.45) and on sky (10.60).

**Graphics, 3:1. All of these pass:** `line-strong` ≥ 3.39; `focus` (Day ≥ 14.19, Night ≥ 6.45); state and chain
dots/icons (lowest: Day chain-btc on sunken, 3.06); `brand-line` ≥ 3.73.

| # | Failure | Ratio | Fix (passing alternative) |
|---|---|---|---|
| F1 | Day `link` on `brand-soft` | 4.47 | Rule: no links on brand-soft; toast and row actions are ink + underline. Alt `#c52e1d` |
| F2 | Day `chain-btc` as text (ground / surface / sunken) | 3.36 / 3.65 / 3.06 | Rule: chain colours are never text (brand: "graphics only in Day"). Alt `#9f5703` passes on all three |
| F3 | Day `on-brand` on `brand-deep` (tokens.json: "pressed fill") | 3.87 | Pressed keeps `brand` and moves 4 px. Darkest allowed coral: `#ea483b` (4.50) |
| F4 | Day `brand` fill as a boundary on ground / sunken | 2.81 / 2.56 | 2 px `sticker-line` on every coral control (≥ 14.47). Alt fill `#f04e41` (not recommended) |
| F5 | Night `sticker-line` #1D1340 on ground / surface / sunken | 1.10 / 1.00 / 1.16 | Decorative in Night: the coral fill (≥ 4.87) and surfaces carry the boundary, so there is no 1.4.11 failure. If it must show: `#706a9f` (≥ 3:1 on all Night surfaces), Q1 |
| N1 | Themed `ink` on coral (Night) | 2.76 | Never. On coral, lemon and sky use `on-brand` (constant #1D1340) |
| N2 | `on-brand` on brand-soft (Night) | 1.17 | Never. On brand-soft use themed `ink` |
| N3 | White on coral | 3.05 | Never for text (brand rule) |

**Info (not required):** surface vs ground is 1.08 / 1.10, so flat panels need their 1 px `line`; lemon vs Day ground
is 1.28, so badges carry the 2 px outline; a Day sheet vs the scrimmed page is 2.70. **Test:** port the pair list into
`test/unit/contrast.test.ts`, reading `globals.css` as today.

## 3. Fonts **[verified: `font-audit.py` fetched the CSS exactly as next/font does (Chrome/104 UA), plus the upstream TTFs]**
All three are in `next/font/google` 16.4.2, each with capsize fallback metrics: `Funnel_Display` (wght 300–800,
latin/latin-ext), `Onest` (100–900) and `Geist_Mono` (100–900).
```ts
const display = Funnel_Display({ subsets: ["latin"], variable: "--font-funnel", display: "swap" });
const sans = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false,
  adjustFontFallback: false, fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"] });
```
- **Omit `weight`** (the full variable axis). 16.4.2 rejects a Google range like `"500 800"` ("Unknown weight"); ranges
  only work for local fonts.
- **Preloaded:** the latin files of Funnel (17.7 KB) and Onest (33.8 KB). Mono (23.1 KB) is not preloaded; its swap barely
  reflows (Geist Mono, SF Mono and Menlo are 0.6 em; Consolas is 0.55). **Weights used:** Funnel 700/750/800; Onest
  400/500/600/700; Geist Mono 450 (600 for grouped-address emphasis).
- **next/font self-hosts every subset Google serves** (it downloads all and preloads only `subsets`), so Onest's `math`
  and `symbols` files load on demand at the first ≈ or →.

| Glyph | Funnel Display | Onest | Geist Mono |
|---|---|---|---|
| … · – — − × ’ “ NBSP # € | served (latin) | served (latin) | served (latin) |
| ≈ U+2248 / → U+2192 | **not in font** | served (math; → also in symbols) | in font, **not served** |
| ₿ U+20BF | not in font | not in font | not in font |
| Tabular figures | default figures already equal (690 u); `tnum` present | proportional; `tnum` present, so **`t-num` is required** | monospaced |
| Zero | | | slashed by default (ss09 = plain). Drop `"zero" 1`; the served subset strips ss01–ss11 anyway |

**Retire "Satchel Symbols"** (`public/fonts/satchel-symbols.woff2` and its `@font-face`); nothing replaces it. Body ≈
and → render from Onest. Display strings must avoid ≈ and arrows: Funnel lacks them, and the browser would use "Funnel
Display Fallback" (local Arial) before Onest. ₿ is in no face and is already banned by the copy test.

## 4. Components (sizes in px; Day and Night differ only through tokens unless noted)

### 4.1 Buttons
- **Shared:** `inline-flex`, centred, gap 8, 20 leading icon, radius-md 18, 2 px border; focus ring 2 px with a 2 px offset.
- **md:** min-h 44, px 18, `text-button`. **lg/block:** min-h 52, px 24, `text-button-lg`, full width on phones.
- **Loading:** keeps label and width; the icon becomes a 16 spinning `LoaderCircle`; `aria-busy` and `aria-disabled`
  (it stays focusable).
- **Disabled:** `bg-disabled text-on-disabled border-line`, no shadow. Prefer `aria-disabled` plus a nearby reason.

| Variant | Rest | Hover (`@media (hover:hover)`) | Pressed (`:active`, `[data-pressed]`) |
|---|---|---|---|
| **Primary** (one per view) | `bg-brand text-on-brand sticker-sm` | `bg-brand-hover` | `translate-y-1 shadow-pressed`; the fill does not change |
| **Secondary** | `bg-surface text-ink border-line-strong`, no shadow | `bg-surface-sunken` | `bg-surface-sunken` |
| **Text/link** | `text-link font-semibold underline underline-offset-3`, 44 hit area | `decoration-2` | `text-ink` |
| **Destructive** | `bg-surface text-danger border-danger` (never coral, never filled) | `bg-surface-sunken` | same |
| **Icon** | 44×44, radius-pill, transparent, `text-ink`, icon 20 (24 in header and nav), `aria-label` required | `bg-surface-sunken` | + `scale-[.96]` |

**Phone flows:** pin the primary to the bottom in a sticky footer (`bg-surface` in a sheet, else `bg-ground`; p-4 plus
`env(safe-area-inset-bottom)`; a 1 px top `line` once content scrolls under it). Leave 4 px under every sticker for its drop.

### 4.2 The Satchel card (`SatchelCard`, a server component: a `<figure>` with real text)
**Box:** `@container aspect-[1.586/1] rounded-card bg-surface sticker overflow-hidden`. **lg** is `w-full max-w-[400px]`;
**md** is `w-[300px]`. Type switches on the container: `@min-[22rem]:` means lg.

| Part | lg (container ≥ 22rem) | md |
|---|---|---|
| Band, top 28% | `bg-brand`, 3 px `sticker-line` bottom border, px 20, centred, `justify-between` | px 16 |
| Name (h2/h3) | `font-display` 800 20/26 -0.01em `text-on-brand`, truncated: "Satchel #7" | 17/22 |
| Owned | Lemon **"Yours"** badge after the name (§4.4); it replaces v1's stitch as "you own this" | same |
| Charm, in the corner | `satchel-charm` (white S, ink outline and drop), 40 tall, `aria-hidden` | 32 |
| Body | p 20, column, `justify-between` | p 16 |
| Total | `font-display text-balance-hero t-num text-ink`: "{n} chains" (copy.card.totalNone) | `-sm` |
| State pill | Right of the total; the row wraps | **Not on the card:** in the meta row under it |
| Chips | `ul` gap 6; chip `bg-surface-sunken rounded-sm px-2.5 py-1.5 text-caption t-num text-ink`, 8 px chain dot, "BTC 0.0412" (NBSP); unavailable: "BTC —" | 12/16, px 2, py 1 |

**Variants** (words from `copy.pill`, per `voice-copy.md`): owned = the Yours badge; listed = "Paused for sale"; signing
= "Signing" with a spinner; needs attention = a danger pill; sold (the seller's receipt) = "Sold"; transferred = "Given";
mint preview = "New Satchel", ticker-only chips, the Yours badge, no pill. The band is coral in every variant.
Actions (Send, Give, Sell) sit **outside** the card: the canvas put them inside, but a figure holds no controls.

**As a link** (grids, My Satchels): the whole card is one `<a>`; nothing in the band is focusable on its own. Hover
`-translate-y-0.5 shadow-sticker-lift`; active `translate-y-1 shadow-pressed`; focus is the ring around the card; reduced
motion keeps only the shadow change.

**Row thumbnail** (replaces `Swatch`): 40×25, radius 4, 1.5 px `sticker-line`, coral top 28%, `bg-surface`, `aria-hidden`.

### 4.3 Sticker vs flat
| | Sticker | Flat panel | Overlay |
|---|---|---|---|
| Recipe | 3 px (2 px when ≤ 52 tall) `sticker-line` + `shadow-sticker` | `panel`: `bg-surface` + 1 px `line`, radius-md (groups) or card (sections), no shadow | `bg-surface shadow-overlay`, 1 px `overlay-edge`, radius-card |
| Use | The card, primary button, badges, toast, illustration panels (sky or white), ≤ 1 landing feature panel per section | List groups, form groups, info and fact panels, the side nav, banners (sunken) | Sheets, dialogs, menus, popovers |

**The test:** can you press it, do you own it, or is it celebrating? If none applies, it is flat. Never nest stickers,
except a badge on the card.

### 4.4 Chips, status pills, badges
- **Filter chip** (Market): a chip plus a 2 px transparent border, min-h 36 inside a 44 target; hover
  `border-line-strong`; selected `bg-inverse text-on-inverse` with `aria-pressed`.
- **Status pill:** `inline-flex gap-1.5 rounded-pill bg-surface-sunken px-3 py-1.5 text-caption font-semibold` in the
  state colour, with a 14 px Lucide icon. It is not interactive and never sits on coral.

| State | Colour | Icon | Word |
|---|---|---|---|
| active · sent · confirmed | success | `Check` | Active · Sent · Confirmed |
| transferred · bought | success | `CircleCheck` | Given · Bought |
| listed | frozen | `Snowflake` | Paused for sale (everywhere, incl. Facts and the NFT image) |
| signing / in progress | frozen | `LoaderCircle` (spins) | Signing |
| needs_attention, unused signature | danger | `TriangleAlert` | Needs attention |
| sold | ink-muted | `Handshake` | Sold |

- **Clean-history items** keep their kb/80 words with this colour map: settled and expired success; settling frozen;
  unused danger; unknown and foreign ink-muted.
- **Badge (sticker):** `bg-lemon text-on-brand text-badge rounded-pill px-2.5 py-0.5`, 2 px `sticker-line`, no drop:
  "New", "Yours", "Testnet" (header). Text on lemon is always `on-brand`; themed ink fails in Night.

### 4.5 Segmented control and tabs
- **Segmented** (theme, chain picker, unit): `role="radiogroup"`, arrow keys move and select. Track
  `bg-surface-sunken rounded-pill`; option min-h 44 (the whole target), px 14, `text-label text-ink-muted`, hover
  `text-ink`; selected `text-on-inverse` on an inset-4 px `bg-inverse` pill (`::before`). Not coral (rule 2).
- **Tabs and route tabs** (`/s/[id]` Wallet · Activity · Sale): links with `aria-current="page"` (or `role="tablist"`), a
  1 px `line` under the list; item min-h 44, gap 20, `text-label text-ink-muted`; selected `text-ink font-bold` + a 3 px
  `brand-line` underline (`shadow-[inset_0_-3px_0_var(--brand-line)]`): the brand's "coral selected tab" as a stroke (Q2).

### 4.6 Inputs and addresses
- **Text input:** a `text-label text-ink` label, gap 6, then the field: min-h 52, px 14, `bg-surface-sunken rounded-sm`,
  2 px `line-strong`, `text-body text-ink`, placeholder `ink-muted`. NEAR accounts and addresses use `font-mono` 16 (the
  canvas "To" field). Hover `border-ink-muted`; focus is the ring. Error: `border-danger`, `aria-invalid`, and a 16
  `TriangleAlert` with `text-body-sm text-danger` below (`aria-describedby`). Help `text-body-sm text-ink-muted`; disabled
  `bg-disabled text-on-disabled border-line`.
- **Amount input:** a group `bg-surface-sunken rounded-md p-4` with 2 px `line-strong`. The value is
  `font-display text-balance-hero-sm t-num` with `inputmode="decimal"`, then the ticker (`text-label text-ink-muted`) and a
  "Max" text button. Under it, `text-body-sm text-ink-muted t-num` "Available 0.0412 BTC". Errors as above.
- **Address:** `font-mono text-address`, middle-truncated by `truncateAddress` (tb1… 8+4, 0x 6+4), the full value in
  `aria-label` and `title`. A 44 `Copy` icon button beside it shows `Check` for 1.5 s while the polite status region says
  "Copied". Grouped mode (Receive): 4-character groups, the first two and the last in `ink` 600, the middle in `ink-muted`;
  the DOM text stays raw.

### 4.7 List rows
- **Container:** a flat panel (radius-md, `overflow-hidden`), or bare with dividers (the canvas chain rows). **Row:** min-h
  56 (64 with two lines), px 16, py 12, gap 12. **Leading:** a 12 px chain dot, 32 chain charm, 32 avatar or the thumbnail.
- **Text:** title `text-body text-ink`; meta `text-body-sm text-ink-muted`.
- **Trailing:** the amount `text-label font-bold t-num text-ink`; a sub `text-body-sm text-ink-muted` (status or time,
  **never fiat**); a 20 `ChevronRight` (ink-muted) if the row navigates.
- **Divider:** 1 px `line`, inset 16, none after the last row.
- **States:** hover and pressed `bg-surface-sunken`; focus is an inset ring (`outline-offset:-2px`, never clipped);
  selected `bg-selected` + `aria-current`/`aria-selected`.

### 4.8 Sheets and dialogs (FlowShell; behaviour stays as kb/80: routes, inert background, focus trap, Esc, replace)
- **Below 768:** bottom sheet, `fixed inset-x-0 bottom-0`, max-h `calc(100dvh - 16px)`, `rounded-t-card`, the overlay
  recipe, with a decorative 40×5 `line-strong` grabber (no drag-to-dismiss, WCAG 2.5.7).
- **From 768:** a centred dialog, `w-[480px]`, max-h `calc(100dvh - 96px)`, `rounded-card`.
- **Header** (px 20, pt 16): title `font-display text-title` for task flows (Send, Give, Sell, Mint), `text-heading` for
  confirms; step `text-body-sm text-ink-muted` "Step 1 of 3"; an `X` icon button. **Body:** px 20, scrolls. **Footer:** the
  pinned primary (§4.1). **Scrim:** `bg-scrim`.

### 4.9 Toasts and banners
- **Toast:** one at a time, ≤ 5 words: `bg-toast sticker-sm rounded-md px-4 py-3 text-label text-ink` with a 20 state
  icon; an action, if any, is an ink underlined text button, never `link` (F1). Bottom-centre (`bottom: calc(88px +
  safe-area)` on phones, 24 from md); 4 s, paused on hover and focus; `aria-hidden`, announced by the one polite status region.
- **Banner:** inline, flat, `bg-surface-sunken rounded-md p-4`: a 20 icon and a `text-label` title in the tone colour
  (success, frozen, danger or ink), a `text-body text-ink` body, ≤ 1 action, no tints; `role="status"` only for changes
  the user caused.

### 4.10 Skeleton, empty state, progress tracker
- **Skeleton:** `bg-skeleton`; text lines 12 tall with radius 6, blocks with the radius of what they replace. Static, no
  shimmer. Only for client-only data (balances, pending), never for judge facts.
- **Empty state:** centred, max-w 360, gap 12: the illustration on a light sticker panel (the **charm S** at 96 for "no
  Satchels yet", 404 and errors; the **chain charms** about 240 wide on a `bg-sky sticker rounded-card p-6` panel for an
  empty wallet and onboarding), then a `font-display text-heading` title, a `text-body text-ink-muted` body, one action.
- **Progress tracker** (SigningProgress, 4 steps): an `ol` of a 24 marker column plus a label, with a 2 px connector
  (`line-strong`; `success` once done). Markers: done `CircleCheck` success; active `LoaderCircle` frozen, spinning
  (`CircleDot` when reduced); future `CircleDashed` line-strong; failed `CircleX` danger; unknown `CircleQuestionMark`
  ink-muted. Labels: active `font-semibold text-ink` + `aria-current="step"`; future `text-ink-muted`. ETA line:
  `text-body-sm text-ink-muted` (§9 times).

### 4.11 Nav, header, footer, theme control
- **Top bar (below 1024):** sticky, h 64, `bg-ground`, a 1 px `line` once scrolled, px 16 (24 from md).
  - Left: the **Lockup** (inline SVG, h 32, wordmark `fill: var(--ink)`, so one asset covers both themes) and the lemon
    **"Testnet"** badge. Right: AccountControl ("Connect" secondary md, or a 32 avatar) and a `Menu` icon button.
  - The **menu sheet** (sheet recipe, `aria-expanded`): nav rows (h 56, 24 icons: My Satchels, Market, Mint, Contract),
    the ThemeControl and the footer links.
- **Side nav (from 1024):** `sticky top-0 h-dvh w-64 bg-ground`, a 1 px `line` on the right, p 24/16; Lockup h 36 and the
  Testnet badge at the top, AccountControl and ThemeControl at the bottom.
  - Items: min-h 44, px 12, gap 12, radius-md, a 20 icon, `text-label text-ink-muted`; hover `bg-surface-sunken text-ink`.
  - Current: `bg-surface-sunken text-ink font-bold`, `aria-current="page"`, and a 4×20 `brand-line` bar on the left edge.
  - Content: `max-w-app`, with the page title in `font-display text-title`.
- **Footer:** a 1 px top `line`, py 32, 3 columns from 480: headings `text-label text-ink`; links `text-body-sm
  text-ink-muted hover:text-ink hover:underline` in 44-tall rows; the "Testnet only. Coins here have no value." line and
  the ThemeControl.
- **ThemeControl:** "Theme" plus a segmented radiogroup **System · Day · Night** (`Monitor`, `Sun`, `Moon`, 16). With
  nothing stored, System is checked, also in the server HTML. It is 44 tall everywhere.

## 5. Motion (transform and opacity only; every row has its reduced variant)
| Motion | Spec | Reduced |
|---|---|---|
| **Sticker press** | Rest: `transition: transform 140ms var(--ease-out), box-shadow 140ms var(--ease-out), background-color 120ms`. `:active`, `[data-pressed]`: `translateY(4px)`, `box-shadow: 0 0 0 var(--sticker-shade)`, 70 ms `var(--ease-in)` | Same end states, `transition: none` |
| Card link lift | Hover `translateY(-2px)` + `shadow-sticker-lift`, 120 ms ease-out; press as above | Shadow only |
| **Sheet** in/out | `translateY(100%)→0` 320 ms `ease-sheet`; out 200 ms `ease-in`; scrim opacity 200 ms linear | Opacity 150 ms |
| **Dialog** in/out | Opacity + `scale(.96) translateY(8px)`→none, 220 ms `ease-out`; out opacity + `scale(.98)` 150 ms `ease-in` | Opacity 150 ms |
| Toast in/out | `translateY(12px) scale(.96)`→none + opacity, 240 ms `ease-pop`; out opacity 150 ms | Opacity 150 ms |
| Badge stick-on ("Yours" after a buy) | `scale .6→1`, `rotate -14°→-4°`, opacity, 220 ms `ease-pop` (badges may tilt; the S never rotates) | Opacity |
| Spinner · charm S loader | `LoaderCircle` 360° in 900 ms linear · charm S sway `rotate ±6°` about its top centre, 1.2 s `ease-swing` alternate, with `role="status"` and a word | Static |

**The charm-swing hand-off** (the one signature motion). `Handoff.tsx` runs it only after final success.
- The card is `md`, with `style={{ transformOrigin: "50% -16px" }}`, so it hangs from a point above its top edge.
- `dx = track.clientWidth - card.clientWidth`.
```ts
const [scope, animate] = useAnimate();             // motion/react 14.5: sequences with `at`, keyframe `times`, springs
const run = animate([
  ["[data-card]", { y: -10, scale: 1.03 }, { duration: 0.15, ease: [0.2, 0, 0, 1] }],                          // lift
  ["[data-card]", { rotate: [0, -10, 8, -5, 2.5, 0] },
    { duration: 0.6, times: [0, 0.2, 0.45, 0.68, 0.86, 1], ease: [0.37, 0, 0.63, 1], at: 0.1 }],                // 10° pendulum, 600 ms
  ["[data-card]", { x: dx }, { type: "spring", visualDuration: 0.45, bounce: 0.18, at: 0.7 }],                  // slide to the new owner
  ["[data-card]", { rotate: [0, 4, 0] }, { duration: 0.45, ease: "easeOut", at: 0.7 }],                         // inertia tilt
  ["[data-card]", { y: 0, scale: 1 }, { type: "spring", visualDuration: 0.25, bounce: 0.3, at: 1.1 }],          // land in its shadow
  ["[data-yours]", { opacity: [0, 1], scale: [0.6, 1], rotate: [-14, -4] }, { duration: 0.22, ease: [0.34, 1.56, 0.64, 1], at: 1.25 }], // buyer only
  ["[data-handoff-text]", { opacity: [0, 1] }, { duration: 0.2, at: 1.25 }],                                    // pill + sentence
]);
run.then(() => { sentenceRef.current?.focus(); announce(live); });                                             // ≈ 1.45 s
```
- **Reduced motion** (`useReducedMotion()`): the card renders at its destination and fades in (opacity 0→1, 200 ms
  linear); the pill and sentence fade in over 200 ms after 100 ms; focus and announce at 300 ms. The "from" side keeps the
  sender's avatar and name.
- **CSS-only equivalent,** if `motion` is dropped from the page: one 1350 ms animation on the individual `translate`,
  `rotate` and `scale` properties (they compose), `animation-timing-function: var(--ease-swing)` per stop. Stops
  (`translate / rotate / scale`): 0% `0 0 / 0 / 1`; 11% `0 -10px / 0 / 1.03`; 20% `-10deg`; 31% `8deg`; 41% `-5deg`;
  49% `2.5deg`; 56% `0 -10px / 0`; 67% `4deg`; 82% `calc(var(--dx) + 6px) -10px`; 89% `var(--dx) -10px / 0`;
  100% `var(--dx) 0 / 0 / 1`.

## 6. Iconography and illustration
- **Lucide at stroke 2.** Set `STROKE = 2` (was 1.75); no `absoluteStrokeWidth`; round caps and joins; `currentColor`.
  **Sizes:** 14 in pills and chips; 16 inline, in the theme control and helper text; 20 in buttons, rows, banners and
  inputs; 24 in the header, nav and menu. Icon-only controls carry an `aria-label`; decorative icons are `aria-hidden`.
- **Chain identity:** an **8 px dot** in chips and pills, **12 px** in chain rows; the **chain charm** (one coin with a
  face, cropped from `satchel-charms-chains.svg`: circle r64, stroke 12, viewBox `50 100 140 140` per coin) at 32 in
  pickers, rows and the Receive header, 48–64 in empty states. **Retire `ChainMark`:** its ₿, Ξ and Solana-bar glyphs are
  real chain logos.
- **The charm S** covers page-level loading, the "no Satchels" empty state, 404, and the card corner. It is never an icon
  in a button, and the logo is never an icon.
- **Don'ts:** no real logos in the charms; no face on the S; never rotate the S; never put the tile mark on coral (the
  charm S on the card band is the brand's own composition).
- **Illustrations** always sit on a light panel (sky, lemon or white), so their #1D1340 outline reads in Night. The charm
  colours #F7931A, #A3ABE0 and #C08CFF are fixed in both themes.

## 7. Assets plan
| Pack file (`brand-v2/satchel-brand-v2/`) | Goes to | Note |
|---|---|---|
| `web/favicon.svg` (= `logo/satchel-mark-small.svg`) | `src/app/icon.svg` | The small cut, for ≤ 32 px |
| `web/favicon.ico` (16 + 32) | `src/app/favicon.ico` | The head snippet claims 48; the ico lacks it (Q10) |
| `web/apple-touch-icon.png` (180) | `src/app/apple-icon.png` | Full-bleed coral |
| `web/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | `public/` (same names) | `manifest.ts` icons unchanged |
| `web/og-image.png` | **Not shipped:** its tagline is "The NFT that carries every chain." | Regenerate (below) |
| `web/site.webmanifest`, `head-snippet.html`, `favicon-32.png` | Not shipped (Next's metadata files cover them; never the Google Fonts link) | Keep in `brand/web/` |
| `logo/*.svg` (7, incl. `satchel-charm-coral.svg`), `illustration/satchel-charms-chains.svg` | `public/brand/` (external embeds, README) **and** inline components in `src/components/brand/`: `Mark`, `MarkSmall`, `Lockup` (wordmark `fill: var(--ink)`), `Charm`, `ChainCharm`, `ChainCharms` | Inline means no request, themed, in server HTML. Inline copies drop the ~7 KB C2PA `<metadata>`; `public/` and `brand/` keep files verbatim (Q9) |
| `explorations/*.svg` | `brand/explorations/` only | `satchel-option-ring.svg` is listed in `design-system.json` but missing from the zip |

- **Delete:** `public/brand/satchel-glyph-{brass,leather}.svg`, the v1 lockups, wordmark and marks, and
  `public/fonts/satchel-symbols.woff2`.
- **`manifest.ts`:** colours are `GROUND.day` (#f6f5fb), since a manifest can't follow the OS. The description stays
  "An NFT that is a wallet.".
- **OG image** (`src/app/opengraph-image.png` and `twitter-image.png`, 1200×630, plus `.alt.txt`): the pack's composition
  on the Day ground (the 360 px mark, the outlined wordmark, the charms on their bar at top right), with the line "An NFT
  that is a wallet." in Onest 500 36 `ink-muted`, text inside the centre 1000 px. Render a throwaway SVG/HTML with
  Playwright to a static PNG, then delete the script.
- **Repo `brand/`:** move 1.0 to `brand/archive/v1/`. Add the 2.0 pack: `README.md` (new: the essentials, §9's product
  corrections, where each file ships), `design-system.md` (the verbatim DS README), `tokens.json` (2.0), `SOURCE.md` (the
  artifact URLs and the zip), and `logo/`, `illustration/`, `web/` (with `og-image.png` marked "do not ship") and
  `explorations/`. `kb/81` becomes §1–3 of this file plus the contrast table. CLAUDE.md still describes brand 1.0 ("Strap
  S, brass and leather…"); the orchestrator should update it.

## 8. The NFT card image `/api/card/[id].svg` (prototype rendered: `proto-cards.png`)
**Frame:** `viewBox="0 0 800 512"`: the card at 800×504 (1.587:1) plus an 8 px hard drop. It is always Day; on dark
wallet grounds the white body and coral band carry the shape (checked).

**Draw, in order:** (1) the drop, `rect y=8 w=800 h=504 rx=56 fill=#1D1340`; (2) clipped to `rect w=800 h=504 rx=56`:
the body `#FFFFFF`, the band `rect h=141 fill=#FF5C4D` (28%), the seam `rect y=138 h=6 fill=#1D1340`; (3) the outline,
`rect x=3 y=3 w=794 h=498 rx=53 stroke=#1D1340 stroke-width=6 fill=none`.
- **Band:** "Satchel #{id}" in Funnel Display 800, 44 px, letter-spacing -0.88, `#1D1340`, x 44, baseline 88; the **charm
  S** (the 3 paths of `satchel-charm.svg`) in `<g transform="translate(683 22) scale(.27) translate(-120 -80)">`.
- **Body:** "{n} signature(s)" in Funnel Display 800, 72 px, letter-spacing -2.16, `#1D1340`, x 44, baseline 262;
  "recorded on NEAR testnet" in Onest 500, 24 px, `#5E5776`, baseline 306.
- **Bottom row** (y 412, h 48). **Status pill** at x 44: `rect rx=24 fill=#ECEAF4`, a Lucide icon path (24 px, stroke 2,
  at x+20, y+12) and the word in Onest 600 24 in the state colour (Day values): Active `#0B6E54` `Check`; Signing
  `#2A63C7` `LoaderCircle`; **Paused for sale** `#2A63C7` `Snowflake`. **Chain chips**, right-aligned to x 756, gap 10:
  `rx=24 fill=#ECEAF4`, an r8 dot in the Day chain colour, the ticker in Onest 600 24 `#1D1340`; BTC and ETH, plus SOL
  only when `SOL_UI_ENABLED` (Q7). Widths are constants per word (see `card-proto.cjs`); nothing is measured at runtime.

**No** stitch, balances, owner or fiat. Keep `role="img"` with `aria-label="Satchel #7. Active. 12 signatures recorded
on NEAR testnet."`.

**Fonts:** `scripts/build-card-fonts.mjs` takes these pinned `SOURCES` (both OFL 1.1, no Reserved Font Name):
- **Funnel Display:** `google/fonts@f788e4777244983204dfd364d6dca2a1fab7d6b8/ofl/funneldisplay/FunnelDisplay[wght].ttf`,
  sha256 `b4151c9c4b7b07eb74320096b4ff4156cca8821f5adfab34af9fd9a2d6c1179d`, "Copyright 2023 The Funnel Project Authors
  (https://github.com/Dicotype/Funnel)".
- **Onest:** `google/fonts@4c1db3aec83c67dd223dd82a68c039cab30917a9/ofl/onest/Onest[wght].ttf`, sha256
  `966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31`, "Copyright 2021 The Onest Project Authors
  (https://github.com/simpals/onest)".

`FACES` (measured: static instances of 2,748, 2,072 and 3,520 B, with no missing glyphs). `card-svg.ts` reads its words
from `copy.pill` and `copy.card.svgSigs`/`svgSub` instead of duplicating them:

| Face | Source | Axes | Chars |
|---|---|---|---|
| `display` "Satchel Card Display" | Funnel | `{wght:800}` | `Satchel #0-9 signatures` |
| `sans` "Satchel Card Sans" | Onest | `{wght:500}` | `recorded on NEAR testnet` |
| `label` "Satchel Card Label" | Onest | `{wght:600}` | `Active Signing Paused for sale BTC ETH SOL` |

Run `pnpm --filter web fonts:card` (network once; cached and sha-checked), then update the coverage and words in
`card-svg.test.ts`. The CSS fallbacks are `'Funnel Display'` and `'Onest'`, then system-ui.

## 9. Brand vs product conflicts (the product rule wins; the copy test also bans "Safe to buy", "cooldown", "MPC")
| Brand sample (where) | Correct for Satchel |
|---|---|
| Fiat totals "$4,812.40", "≈ $2,903.00", "about $4,812"; README "fiat to 2", "ink-muted: fiat values" (tokens, canvas) | **No fiat anywhere.** Card hero "{n} chains"; rows and chips show native amounts with tickers (D-37 UX-1) |
| "The NFT that carries every chain" (OG image, manifest, head snippet, cover); "One NFT. Every chain inside." (In context) | Never "every chain": Bitcoin and Ethereum, with the Solana UI behind `SOL_UI_ENABLED`. Tagline "An NFT that is a wallet." (D-37, D-40) |
| "real Bitcoin, Ethereum and Solana" (Main board, README intro) | **Testnet only** (testnet4, Sepolia, devnet). "Testnet only. Coins here have no value." stays visible (footer + the header's Testnet badge) |
| "Safe to buy in about 2 minutes" (README table, heading sample) | No wait between listing and buying; the only wait is a 250-block quiet period **before listing** (D-05 rev 2) |
| "Usually under a minute" (waiting copy) | "A signature usually takes about 10 seconds; the network allows up to about 2 minutes." (kb/90 §8.6) |
| "Frozen while listed or in cooldown" (`frozen` usage) | "Paused while it's for sale"; there is no cooldown state |
| Give sheet "Clean history: no unused signatures" before the hand-off (In context) | **Gifts aren't checked,** and the buyer's browser (never the contract) runs the check. No verdict in the Give flow |
| "give it to anyone in one tap", "Mint… fill it with Bitcoin, Ethereum and Solana" | No "one tap" (it is a signed transfer); BTC and ETH only |
| `danger` usage "…Revoke" | No approvals or revoke: unbuilt, and "approval" is banned |
| README: Day coral buttons take "a 1px brand-deep border"; `brand-deep` = pressed fill | The canvas sticker recipe: 2 px ink outline + drop; pressed = the 4 px move (F3, F4) |
| D-42 "light whatever the OS" | Brand 2.0: System by default (Night on a dark OS), with a System · Day · Night override (orchestrator's ruling) |
| Main board H1 "Stick it on. Hand it over." | D-41's H1 stays until Razvan decides (Q5) |

## 10. Open questions for the design lead and orchestrator (each with a recommendation)
1. **Night stickers lose their outline** (#1D1340 on Night surfaces is 1.00–1.16:1, F5). Keep it per the canvas, since
   coral and the surfaces carry the shape (`proto/ui.png`), or use `#706a9f` in Night? *Keep; revisit after a Night review.*
2. **"Selected tab" coral** is drawn as a 3 px `brand-line` underline, and segmented controls use inverse, so there is one
   coral fill per view. *Confirm.*
3. **The "Yours" lemon sticker** replaces v1's stitch as the ownership mark (card, mint preview, after a buy). *Confirm the
   word and the placement after the name.*
4. **Status words** are aligned with `voice-copy.md`: `pill.listed` "Paused for sale" everywhere (it reverses kb/80 R3),
   and `pill.transferred` "Given". The e2e text pins (judge card SVG "Listed") change with it.
5. **Landing H1:** D-41, or "Stick it on. Hand it over."? *Razvan's call.* Same for the **OG tagline** ("An NFT that is a
   wallet.", or the D-41 H1).
6. **Per-token leather hue** (kb/81 R3, `@satchel/core/card`) has no place in 2.0. *Drop it from the UI (`cardStyle`,
   `--satchel-*`); core stays untouched; `card.test.ts` pins core only.*
7. **NFT image chips:** BTC and ETH only, or always SOL (the contract can sign SOL)? *Follow `SOL_UI_ENABLED`, like the app.*
8. **Theme key bump** to `satchel:theme:v2` (it resets v1 users to System). *Yes.*
9. **C2PA manifests** inside the wordmark, charms and exploration SVGs: keep them verbatim in `brand/` and `public/`
   (provenance) and drop them from the inline components? *Confirm.*
10. **favicon.ico** has no 48 px frame. Regenerate 16/32/48 from `favicon.svg`? *Low priority.*
11. **Grids with many coral bands** (Market, My Satchels): is a band per card fine under "one coral fill per screen"?
    *We treat bands as identity (rule 2).*
