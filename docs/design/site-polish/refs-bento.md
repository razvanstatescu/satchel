# Bento grid for "What else it does" — research

> The saved images and shots (`refs/`, `shots/`) were working files and aren't kept; the Mobbin and site links are.

Baseline confirmed live at `localhost:3210/#more`, 1280/390, Day/Night (working shots, not kept): a flat
`.lp-more` list — icon in a 40/48px `--surface-sunken` disc, title + inline 44px help "?", one muted body line — on
the same `--ground` as Trust above and Questions below. 1 col → 3 col (768) → 5 col (1280), no card chrome, no band.

## Mobbin refs

| # | Ref | What to borrow |
|---|---|---|
| 1 | [Mercury — platform grid](https://mobbin.com/sites/sections/539c4090-e9d6-4bd2-9ff9-656e8d1ac13c) · `bento-01-mercury` | 6 peer tiles, even 3×2, on a full-bleed tinted-lavender band; each tile = small UI preview + title + body + "→". Closest fintech match for plain tile anatomy |
| 2 | [Family — "Explore Ethereum in a whole new way"](https://mobbin.com/sites/sections/93025b1c-8e8d-4ac2-89cd-d66c3a20938c) · `bento-02-family-ethereum` | Crypto wallet, genuine bento: 1 tall app-screenshot hero (spans 2 rows) + 5 smaller mixed tiles (text-only, stat, icon row) beside it |
| 3 | [Slush — "100% NON-CUSTODIAL"](https://mobbin.com/sites/sections/05891498-2de8-40de-9302-8b035d67fd10) · `bento-03-slush-noncustodial` | Crypto wallet, true bento: one big bold-statement tile + a plain icon tile, uneven row heights, thick black outline on every cell (reads like a sticker) |
| 4 | [Slush — "Your assets. Your control. Your privacy."](https://mobbin.com/sites/sections/12681724-8295-46f1-a7c5-204f44a4840b) · `bento-04-slush-privacy` | 3 even square tiles, saturated flat colour per tile, bold italic headline + a single line illustration — proof a grid can be very few words and still feel rich |
| 5 | [1Password — "All accounts include"](https://mobbin.com/sites/sections/76ef6cd4-8fbf-4e9c-a29c-49f3d450f30f) · `bento-05-1password` | Trust/security product: 1 wide hero tile on top, then a plain even list below (not a grid) — a lower-drama hero pattern |
| 6 | [Ramp — "Build anything on Ramp"](https://mobbin.com/sites/sections/b54966b6-e31a-4e18-af6a-80810799c008) · `bento-06-ramp` | Even 3×2 white cards, small icon-in-square, title, body, on a soft grey band — the plainest, lowest-risk tile anatomy |
| 7 | [Notion — "Go way beyond text"](https://mobbin.com/sites/sections/33294031-f219-4b40-80fd-241d174bc7f4) · `bento-07-notion` | Even 3×2, but tile *content* varies (icon+text only vs. icon+text+small image) while the frame stays uniform — shows size-uniform bento can still feel varied |
| 8 | [Spline — "And there is more!"](https://mobbin.com/sites/sections/a109b329-c268-4cf8-a8b4-099c06e7984a) · `bento-08-spline` | A dark, full-bleed band for a trailing "extras" coda (3×3 uniform icon tiles) — same page position/role as our "What else it does" |
| 9 | [IFTTT — featured + explore](https://mobbin.com/sites/sections/49ec32ab-8219-4f42-ba0c-788a8e34d0cc) · `bento-09-ifttt` | Older but genuinely uneven bento: 4 equal squares (row 1) + 2 wide tiles (row 2) — the inverse of our "wide row then even row" idea |
| 10 | [Coinbase Advanced — 4 dark cards](https://mobbin.com/sites/sections/309b035c-e264-4262-b5aa-fb0de290a241) · `bento-10-coinbase-advanced` | Dark-surface tile anatomy: icon badge, bold title, 2-line body, flat fill (no border) — useful Night-mode reference |

## Just Add (`justadd.app`) — Razvan's own product

Shots (not kept): `justadd-bento-1280.png`, `justadd-bento-390-a/b.png`. The clearest 2-row bento on the site is a
**6-column grid with only 4–6 children**, so columns are uneven by design (`lg:grid-cols-6` with per-tile spans, not
`repeat(6,1fr)` used evenly) — direct proof the span technique reads well. Tile anatomy: soft warm-grey fill (no
border — depth comes from a fill-tone step off the page, not a line), large radius (~24–28px), generous illustration
area (real phone screenshots / UI mocks, not icons), caption only on some tiles (others are image-only). Gutters are
tight (~12–16px) so the grid reads as one connected object. Type: bold warm sans headline, short body. At 390 every
tile becomes a full-width stacked card, same radius and illustration size kept (not shrunk) — confirms "adapt" should
mean reflow, not shrink. Motion not assessed (captured `reducedMotion:"reduce"`).

## Duskwatch (`duskwatch.app`)

Shots (not kept): `duskwatch-alerts-1280.png` (+`-390-a/b`), `duskwatch-highlights-1280.png` (+`-390-a/b`). Two patterns:
1. A plain 1-row 4-up grid ("Woken only for a real problem…"): white `border + rounded-cell` cards, a small realistic
   UI mock on top, bold title, 2–3 line body — exactly the "icon/art zone → title → body" anatomy we want, just richer
   art. A thin dotted timeline with timestamps sits above the row, tying the 4 cards into a sequence (not applicable to
   our 5 parallel features, but a nice "add motion/story without JS" idea).
2. **A genuine 2-row bento** ("Everything a night on call needs"): one bordered panel, hairline-divided (no gaps), row
   1 = 2 tiles **uneven width** (wider "Findings" + narrower "Logs"), row 2 = **3 even tiles**. This is Option C below,
   shipped, from Razvan's own hand. The whole grid is a **rounded container floating on the plain page background**
   (corner "+" marks, 1px border), *not* a full-bleed tinted band.
   At 390 this section becomes a **swipeable carousel** (1/5 dots, peek of the next card) instead of a vertical stack —
   noted, but not recommended for Satchel: our tiles are icon+title+1-line (far lighter than Duskwatch's rich cards),
   so a plain stack (as Just Add and Duskwatch's 4-up both do at mobile) keeps every word visible with no extra
   interaction or a11y cost.

## Layout comparison (5 tiles, 2 rows)

| Option | Shape | Hierarchy | 768 | 390 | Uneven-height risk |
|---|---|---|---|---|---|
| **A** 1 hero + 2×2 | tile 1 spans both rows (tall), tiles 2–5 fill a 2×2 beside it | Strongest: tile 1 visually leads | hero collapses to a full-width banner, 2×2 below | all 5 flatten to equal stacked cards | **High** — hero height must equal row1+gap+row2 of the 2×2 exactly; any extra line of copy desyncs it |
| **B** 6-col, 3+3 / 2+2+2 | row 1 = 2 tiles at half width, row 2 = 3 at thirds | Mild: tiles 1–2 lead equally, 3–5 read as a trio | 2-col grid: (1,2) / (3,4) / (5 full) | 1-col stack | **Low** — each row's siblings share a row, Grid stretches them equal automatically; rows never need to match each other |
| **C** 6-col, 4+2 / 2+2+2 | row 1 = 1 wide "lead" tile + 1 standard, row 2 = 3 standard | Clear but mild: tile 1 leads, 2–5 read as peers | lead tile full-width alone, then (2,3) / (4,5) | 1-col stack | **Low–medium** — only tiles 1&2 must match each other's height in row 1; same per-row stretch as B |

All three keep DOM order = visual order (tile 1 is always first both in the markup and on screen) **as long as the
"lead" slot is item 1 or item 5, never a middle item** — a mid-list item would need `grid-column`/`grid-row`
reordering that breaks tab order vs. reading order (WCAG 1.3.2). That's why A and C below both lead with **item 1,
Make an offer** (first in the list already, and the one with the most illustratable "a price is being proposed" idea).

## Recommendation: **C**, fallback **B**

C is Duskwatch's own shipped pattern (§ above), gives genuine bento asymmetry (Razvan asked for "bento," not an even
grid), and keeps uneven-height risk low because only two tiles ever need to match each other's height. None of the
five items has meaningfully more content than the others (all are icon + title + one line), so a dramatic full-height
hero (A) would be emphasis the content doesn't earn — keep A as a later option if the team wants more drama once art
is richer. B is the fallback: identical scaffold, just change tile 1/2's spans from 4+2 to 3+3 — minutes of CSS if C's
lead tile feels arbitrary in review.

**1280** (`grid-template-columns: repeat(6, 1fr)`, tight ~20px gaps):
```
┌───────────────────────────────┬───────────────────┐
│ 1 Make an offer          (4)  │ 2 Give by link (2)│
├─────────────────┬──────────────┼───────────────────┤
│ 3 Let someone    │ 4 USDC and  │ 5 Take it all out │
│   spend     (2)  │   L2s   (2) │              (2)  │
└─────────────────┴──────────────┴───────────────────┘
```
**768** (2 columns; lead tile alone, then even pairs):
```
┌─────────────────────────────────┐
│ 1 Make an offer                 │
├────────────────┬────────────────┤
│ 2 Give by link  │ 3 Let someone  │
│                 │    spend       │
├────────────────┼────────────────┤
│ 4 USDC and L2s  │ 5 Take it all  │
│                 │    out         │
└────────────────┴────────────────┘
```
**390** (1 column, unchanged order — same shape as today, now a card each):
```
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ 1 Make an offer    │  │ 2 Give by link    │  │ 3 Let someone spend│  …then 4, 5
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

**Fallback B, 1280 only** (768/390 differ too: natural half/half pairing, no lone lead row):
```
┌────────────────────┬────────────────────┐
│ 1 Make an offer (3) │ 2 Give by link (3)│
├─────────────┬────────┼──────────────────┤
│ 3 Spend (2)  │ 4 USDC(2)│ 5 Take out (2) │
└─────────────┴────────┴──────────────────┘
```
768 → (1,2) / (3,4) / (5 full-width); 390 → same 1-col stack as C.

## Band: Day and Night

**Full-bleed band, not a rounded container** — matches the one precedent already shipped on this page (`CleanSection`:
`border-y border-line bg-surface` on the `<section>` itself, `CONTAINER` div inside for the 1200px column). A floating
rounded container (Duskwatch's own choice) would double-round once bento tiles are also rounded cards — one level of
roundedness reads cleaner.

- **Band fill:** `bg-surface-sunken` (kb/81 already lists this token's use as "inputs, chips, pills, **banners**, hover
  rows" — it's the documented token for exactly this). Day `#ECEAF4`, Night `#29214B`. This also differentiates More
  from Clean (which already used plain `bg-surface` two sections up) instead of repeating the same recipe.
- **Band border:** `border-y border-line` (Day `#E2DFEE`, Night `#352C5C`), same as Clean.
- **Tiles:** the existing `panel` utility (`bg-surface` + `1px border-line`) + `rounded-md` (18px — kb/81's radius for
  "buttons, inputs, **groups**"; not `radius-card`/28px, which kb/81 reserves for the Satchel card, sheets and
  dialogs — using it here would visually conflate a feature tile with the product's own card).
- **Icon disc:** unchanged `bg-surface-sunken` circle — it now reads as "sunken into the white tile" instead of
  "sunken into the page," same token, zero new CSS.
- **Night note:** fill-contrast between adjacent surface tokens is low everywhere in this system by design (it's how
  Trust's sunken panel and How's sunken scene already work); legibility rides on the icon/ink contrast and the
  `border-line` hairline, not on the band-vs-tile fill difference — no new risk, just don't rely on the fill alone.

## Tile anatomy

A `<li>` (already `data-more={i+1}`, unused by CSS today — the spans above can hang off that attribute with zero
markup change): `panel` + `rounded-md`, ~20–24px padding. Icon in the 40px (48px ≥768) sunken disc at the top, plus one
small accent (below). Title (unchanged size/weight) with the existing 44px "?" help target inline, items 1–4 only.
One `ink-muted` body line. Gaps: reuse the existing scale, not a new value — `gap-4` (16px) stacked at 390, `gap-5`
(20px) at 768, `gap-5`/`gap-6` (20–24px) at 1280 — tighter than HowSection's card grid so the five tiles read as one
bento, not loose cards.

## Per-tile illustration idea (existing primitives only — `art.tsx` + the `lp-chip`/`lp-hangtag`/`lp-slip` CSS)

1. **Make an offer** — `Handshake` disc (unchanged) + a small coral-outlined price chip in the corner, echoing the
   hero's `lp-hangtag` price-tag shape at caption scale: "a price, proposed."
2. **Give by link** — `LinkIcon` disc (unchanged) + a small dashed-outline avatar (an `Initial`-style circle with no
   fill, no letter) peeking at the edge: a recipient who hasn't claimed it yet.
3. **Let someone spend** — `UserRoundPlus` disc (unchanged) + a tiny partially-filled bar reusing `lp-bar__seg`'s
   shape at mini scale: a daily cap, part used.
4. **USDC and L2s** — `Layers` disc (unchanged) + 2–3 small flat chain dots (kb/81's "8–12px chain dots" idiom) and a
   "+N" chip in the existing `lp-chips__more` style: the same overflow idiom `ArtOverview` already uses for coins.
5. **Take it all out** — `PackageOpen` disc (unchanged) + a small overlapping cluster of all three `Coin` chain
   charms (btc/evm/sol, ~16–18px, faces intact): every coin, leaving together — a warm, on-brand finale.

## Accessibility
AA text contrast is already verified for ink/ink-muted on both `surface` and `surface-sunken` (kb/81). Help links keep
their existing 44×44 hit target. Keep the `<ul>/<li>` semantic list and **never use CSS `order`** or non-sequential
`grid-column`/`grid-row` placement that would put a tile's visual position ahead of its DOM position — the lead tile
must stay item 1 (or item 5) for tab/reading order to match what's on screen.
