# Prototype foundation: ready (design lead, 2026-10-26)

The shared base for every prototype in `proto/`. Visual check: `shots/foundation.png` (Day | Night side by side, from
`foundation.html`). I keep extending the CSS; renames get a line under "Changes" at the bottom.

## Use it
```html
<script src="assets/theme.js"></script>          <!-- in <head>, before the CSS: ?theme=day|night|system, Day by default -->
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<link rel="stylesheet" href="app.css">           <!-- product designer: your screen CSS (yours to own) -->
...
<body>
<!--@sprite--><!--/@sprite-->                    <!-- then: node tools/sync.mjs your-page.html (pastes the icon sprite) -->
```
- **Icons:** `<svg class="icon"><use href="#i-send"/></svg>`, Lucide at stroke 2. 73 ids `i-<lucide-name>` (check,
  circle-check, snowflake, loader-circle, triangle-alert, handshake, menu, x, chevron-*, sun, moon, monitor, copy,
  arrow-up-right, send, gift, tag, plus, qr-code, wallet, layout-grid, store, sparkles, file-code, shield-check, user,
  search, arrow-*, pause, play, key-round, lock, history, circle-dot, circle-dashed, circle-x, circle-question-mark,
  external-link, log-out, house, layers, scroll-text, badge-check, eye, info, hourglass, receipt, list, coins,
  hand-coins, package, rotate-ccw, refresh-cw, ellipsis, book-open, file-text, landmark, key, signature, pen-line,
  circle-alert, shield, wallet-minimal, sticker, scan-line). Need another? Add it to `ICONS` in `tools/build-assets.mjs`,
  run `node tools/build-assets.mjs`, then `node tools/sync.mjs`.
- **The lockup** (wordmark in `currentColor`, so one asset covers both themes): `<!--@lockup--><!--/@lockup-->` inside a
  link, then `tools/sync.mjs`. It renders `<svg class="lockup">`.
- **Assets** (`assets/`): `brand/*.svg` (the pack, verbatim: mark, mark-small, lockups, wordmark, charm, charm-coral,
  charms-chains); `chain-{btc,eth,sol}.svg` (one coin with a face) and `chain-{btc,eth,sol}-hang.svg` (with its stem);
  `fonts/` (Funnel Display, Onest, Geist Mono; loaded by `tokens.css`).
- **Themes:** `tokens.css` uses the planned `light-dark()` mechanism. No `data-theme` = System; `data-theme="day|night"`
  forces one; `data-scheme="day|night"` makes an island. Screenshot Night with `?theme=night`.
- **R6, decided:** the Night sticker outline is `--sticker-line` = **#8A82AE** (line-strong, 4.85:1), with the #000 drop
  kept. Evidence: `shots/night-outline-compare.png` (A canvas, B chosen, C #706A9F, D tinted drop).
- **Coral:** one *action* fill per view (`.btn--primary`). The card band is identity, not budget. Never coral text.

## Class names (one line each)
**Layout and utilities**
- `.container` (max 1200 + gutters 16/24/32) · `.container--flow` (480) · `.container--prose` (640)
- `.stack` (column, gap `--stack`, default 16) · `.cluster` (wrapping row, gap `--cluster`, default 8)
- `.visually-hidden` · `.skip-link` · `.icon` (20) + `.icon--14/16/24` · `.spin` (900 ms rotation)

**Type** (mirror the planned Tailwind utilities)
- `.text-balance-hero` 48/52 · `.text-balance-hero-sm` 38/42 · `.text-title` 30/34 · `.text-heading` 20/26
- `.text-body` · `.text-body-sm` · `.text-label` 15/20 600 · `.text-address` (mono 13/18) · `.text-button`
- `.text-caption` 13/18 · `.text-badge` 12/16 · `.text-display` (landing H1 40→56→72) · `.text-section` (32→44)
- `.text-lead` (18→20) · `.font-display` / `.font-sans` / `.font-mono` · `.t-num` (tabular) · `.muted` · `.eyebrow`

**Buttons** (one system for landing and app)
- `.btn` base (44 tall, radius 18, 2 px border) + one variant:
  - `.btn--primary`: coral sticker, **one per view**; press = 4 px down into its shadow (`:active` or `[data-pressed]`);
  - `.btn--secondary`: surface + line-strong border;
  - `.btn--link`: text link, 44 tall;
  - `.btn--danger`: outlined, never filled;
  - `.btn--icon`: 44 round (`.btn--icon-24` for 24 px icons; needs `aria-label`);
  - `.btn--paper`: the primary *on a coral ground* (white sticker);
  - `.btn--ghost-on-brand`: the secondary on coral.
- Sizes `.btn--lg` (52) · `.btn--xl` (56, landing hero and final CTA only) · `.btn--block` (full width)
- States: `aria-disabled="true"` / `:disabled`, `aria-busy="true"` (the leading icon spins)
- `.btn-row` (wrapping row, gap 12) · `.btn-row--stack` (column)

**The Satchel card** (a `<figure>` of real text; markup in `foundation.html`)
- `.card` (lg: fluid to 400) · `.card--md` (300) · `.card--sm` (240). Container queries size the inside.
- `.card__band` (coral, 28 %) › `.card__name` (h2/h3) + optional `.badge.badge--yours[data-yours]` + `img.card__charm`
- `.card__body` › `ul.card__inside` › `li.card__coin` (`img.coin` + `.card__amt` + `.card__tick`); `[data-zero]` and
  `[data-unavailable]` mute the amount
- `.card__foot` (the state pill) · `.card__empty` (all-empty line, if you use one) · `.card[data-coins="3"]` (SOL flag on)
- `a.card-link` wraps a card as one link (lift on hover, press on active) · `.card-thumb` (40×25 row thumbnail)

**Chips, pills, badges**
- `.chip` (sunken, caption) + `.dot` (8) / `.dot--12`, with `.dot--btc` / `.dot--evm` / `.dot--sol`
- `.chip--filter` + `aria-pressed` (selected = inverse)
- `.pill` + `.pill--success` / `--frozen` / `--danger` / `--muted`; 14 px icon first, word second
- `.badge` (lemon sticker, ink text and outline) · `.badge--yours` (tilted −4°) · `.badge--new` (+3°) · `.badge--sky`

**Charms and illustration**
- `img.coin` (32) + `.coin--20/24/48/64` · `.coin--drop` (hard ink drop) · `img.charm-s` (the sticker S, 96 tall)
- `.strap` (the ink bar charms hang from)
- `.illo` (sky sticker panel, light in both themes) · `.illo--white` · `.illo--lemon`

**Panels**
- `.panel` (flat: surface + 1 px line, radius 18) · `.panel--card` (radius 28) · `.panel--sunken` · `.panel--pad` (20/24)
- `.sticker` (3 px outline + drop) · `.sticker-sm` (2 px). Use them only for what you own, press or celebrate.

**Inputs and addresses**
- `.field` › `.field__label` + `.input` (`.input--mono` for accounts and addresses; `aria-invalid="true"`) +
  `.field__help` / `.field__error` (16 px icon first)
- `.amount` › `.amount__line` (`input.amount__value` + `.amount__tick` + a `.btn--link` "Max") + `.amount__avail`
- `.address` (mono, never wraps) · `.address--grouped` › `span` groups (`span[data-key]` = ink 600) · `.copy-line`

**Rows**
- `ul.list` (flat panel) or `.list--bare` › `li` › `.row` (`a.row` / `button.row` hover; `.row--2` = 64 tall)
- Inside a row: `.row__lead`, then `.row__main` (`.row__title` + `.row__meta`), then `.row__trail` (`.row__amt` +
  `.row__sub`), then `svg.row__chev`
- `.row[aria-current]` and `.row[aria-selected="true"]` take the selected fill

**Tabs and segmented**
- `nav.tabs` › `a.tab[aria-current="page"]` (3 px `brand-line` underline)
- `.seg[role=radiogroup]` › `label.seg__opt` › `input[type=radio]` + icon + word (selected = inverse); `.seg--sm`

**Overlays**
- `.scrim` · `section.sheet[role=dialog]`: bottom sheet below 768, a 480 dialog from 768
  - parts: `.sheet__grabber`, `.sheet__head` › `.sheet__titles` (`.sheet__title` or `.sheet__title--confirm`, plus
    `.sheet__step`), `.sheet__body`, `.sheet__foot` (`[data-scrolled]` adds the top line)
  - `.sheet--static` draws one inline, for prototype frames
- `.toast-region` (fixed, bottom centre) › `.toast` + `.toast--success|frozen|danger|muted` (icon colour) + `.toast__action`
- `.banner` + `.banner--success|frozen|danger` › icon + `.banner__main` (`.banner__title` + `.banner__body`)

**Feedback**
- `.skeleton` / `.skeleton--line`
- `.empty` › `.illo.empty__art` + `.empty__title` + `.empty__body` + one button
- `ol.tracker` › `li.tracker__step[data-state=done|active|future|failed]` › `svg.tracker__mark` + `.tracker__label`
  + `.tracker__meta`

**Account and shell** (full demo in `shell.html`)
- `.avatar` (32, sky + ink initial) / `.avatar--28` · `.account` (pill: avatar + `.account__name` + chevron)
- `.lockup` · `.brand-link`
- `header.topbar` (`[data-scrolled]` adds the line) › `.topbar__inner` › `.topbar__nav` (`a.topbar__link`, from
  1024) + `.topbar__actions`; a `[data-menu-button]` hides from 1024
- `.app` (grid with the side nav from 1024; its `.topbar` hides there) › `nav.sidenav` › `.sidenav__brand`,
  `ul.sidenav__list` › `a.nav-item[aria-current]`, `.sidenav__foot` · `.app__main` › `.app__content`
- `ul.menu-list` › `a.menu-row` (56 tall, 24 icon; the menu sheet)
- `footer.footer` › `.footer__grid` (`.footer__brand` + columns of `.footer__h` + `ul.footer__links`), `.footer__bottom`,
  `.footer__note`
- `.theme-control` › `.theme-control__label` + `.seg` (`name="theme"` radios drive the theme)

**Landing sections**
- `section.section` (padding 64 → 96 → 120) / `.section--tight`
- `.section__head` (+ `--center`) › `.section__title` + `.section__lead`

## Changes (no class was renamed; these were added or adjusted)
- `a.card-link` is now `display: block; width: 100%; max-width: 400px`, or 300 and 240 when it wraps `.card--md` or
  `.card--sm`. The old `fit-content` collapsed fluid cards inside grid cells.
- `assets/theme.js` syncs every radio whose name starts with `theme`. Give each ThemeControl its own name (`theme`,
  `theme-side`, `theme-menu`), because radios that share a name form one group across the page.
- `.footer__grid` has 2 columns below 480 (the brand column spans both), 3 from 480 and 4 from 1024.
- `.btn--paper` and `.illo--white` now use `var(--surface)`. Use them inside a `data-scheme="day"` island, where it is
  white. `.btn--ghost-on-brand` hovers to `--brand-hover`. No hex values remain in `components.css`.
- New `.account--icon`: a 44 px avatar-only account button for the top bar below 480.
- New assets:
  - `assets/sparkle.svg` (a lemon sparkle sticker, for celebrations only);
  - `assets/chain-eth-sad.svg` (only the landing's catch story uses it).
- Landing-only classes live in `landing.css`; they are listed in `LANDING-CONCEPT-READY.md` and `design-spec.md` §4.
