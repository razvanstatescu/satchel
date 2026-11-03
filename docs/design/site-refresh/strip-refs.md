# Strip + balance-card references

> The saved `refs/` images were working files and aren't kept; the Mobbin links are.

Sources: Mobbin (`search_sections`/`search_screens`, task_intent "Add a compact more-features strip and a
balance-card illustration to a friendly crypto wallet landing page") — images examined directly, cited by
`mobbin_url`, saved to `refs/`. Two live fetches (current phantom.com, rainbow.me) since both have moved past what
Mobbin captured. Brand check: `brand/canvas/Main.png`, `In-context.png`, `Web-icons.png` and
`docs/design/satchel-2.0/screens/proto-app-satchel-owner-1280-day.png` (the brand already has small circular
"charm" marks with faces — use those as the strip's icons rather than importing a line-icon set).

## The strip: 3 patterns for "What else it does" (6 items)

### 1. Minimal icon row, no card chrome — **recommended**
- **Why it fits lean.** Nothing frames the items but whitespace — no border, no fill, no shadow. Six items read as
  six facts, not six products being sold. Closest to "one idea per section, uncrowded."
- **Anatomy.** Small icon (or checkmark) → bold 3–6 word title → one line (≤10 words) of plain support copy. 3
  columns × 2 rows; the gutter (40–64px) does the separating, not rules or boxes.
- **Phone vs desktop.** Desktop: 3-col grid. Phone: collapses to one column, same icon–title–line unit repeated
  6×. Nothing resizes or truncates — the safest mobile behaviour of the three patterns.
- **References.**
  - Mercury, "Engineered for the startup journey" — https://mobbin.com/sites/sections/88f5b776-abaa-4d28-80e3-54a3d50332cc — `refs/strip1-mercury-startup-journey.webp`
  - Wise, "A great experience / Easily implemented / Better organise payments / Safe and secure" — https://mobbin.com/sites/sections/3949a08d-c755-493c-be6d-d933eddf2041 — `refs/strip1-wise-great-experience.webp`
  - Fluz, "Not your average gift card." — https://mobbin.com/sites/sections/6ecc4e3c-dd19-4152-9f47-2286233835d2 — `refs/strip1-fluz-not-average-giftcard.webp`

### 2. Soft icon tile, one hue of chip
- **Why it fits lean.** Adds just enough shape to feel designed — a flat rounded-square icon chip in a single
  accent colour — without boxing each item in a bordered card. Closer to Satchel's charm-icon language (a
  coloured tile holding a mark) than pattern 1, still quieter than a bordered bento.
- **Anatomy.** Icon inside a flat rounded-square (one brand colour, no gradient) → bold 2–4 word title under it →
  one short line below. No card edge — the coloured tile is the only "object"; text floats on the page bg.
- **Phone vs desktop.** Desktop: 3×2 grid of near-square tiles. Phone: stacks 1-per-row, or becomes a horizontal
  snap-scroll row with the next tile peeking at the edge — an established fintech move, not a reach (see the
  carousel evidence below, from the same sites).
- **References.**
  - Fluz, "More to explore" — https://mobbin.com/sites/sections/2df617cb-84d6-427a-b309-4cf66ea0496a — `refs/strip2-fluz-more-to-explore.webp`
  - Current, "Do even more with your money" — https://mobbin.com/sites/sections/36d06219-9c85-497c-9f88-c6aa12b1976d — `refs/strip2-current-do-even-more.webp`
  - Base, "Unlock new revenue streams" (crypto-native, abstract icon marks) — https://mobbin.com/sites/sections/f5b86c7f-8568-4ea8-a98f-f57d8de0366e — `refs/strip2-base-unlock-revenue.webp`

### 3. Asymmetric bento, one hero tile
- **Why it fits lean.** Giving ONE item (e.g. offers, the newest capability) a bigger illustrated tile while the
  other five stay small text-only cells reads as *more* restrained, not less: it signals "here's the one thing
  worth a picture," instead of pretending all six are equally weighted. The direct "Linear-style bento" option.
- **Anatomy.** A grid where one cell spans 2× width or height (small illustration/screenshot inside), the rest are
  1×1 text cells (bold title + 1 line). Thin 1px borders or very light fill at most — never a hard shadow, that
  stays reserved for Satchel's own stickers.
- **Phone vs desktop.** Desktop: the asymmetric grid as designed. Phone: the hero tile becomes a full-width first
  item, the small tiles stack beneath it in the same order — just `grid-template-columns: 1fr`, no regrid logic.
- **References.**
  - Linear, features bento (Issues / Real-time Sync / Cycles / Projects / Roadmap / Backlog) — https://mobbin.com/sites/sections/2754727c-0d9b-426e-8f87-f3bf560afda4 — `refs/strip3-linear-bento.webp`
  - Monarch, "Everything you need, all in one app" (centre phone mockup, 4 corner tiles) — https://mobbin.com/sites/sections/484401ea-fc2f-400e-9069-107ed3dcf00d — `refs/strip3-monarch-bento-hero.webp`
  - Mercury, "Just one part of Mercury's full financial platform" (6 tiles, each with a real mini-screenshot) — https://mobbin.com/sites/sections/539c4090-e9d6-4bd2-9ff9-656e8d1ac13c — `refs/strip3-mercury-platform-bento.webp`

**Recommendation: pattern 1.** The charm icons and coral accent already do work elsewhere on the page (hero, FAQ);
the strip doesn't need to repeat it. Six plain icon+title+line items in a 3×2 grid is fastest to build, easiest to
hold to a one-line copy budget, and stays out of the hero's way. Fall back to pattern 2 if the strip reads too flat
without any Satchel colour in it.

**Phone-carousel evidence** (for pattern 2's scroller option):
- Revolut, kids-account section: 3 cards + visible dot pagination — confirms "grid on desktop, swipeable dots on
  phone" is live on a mainstream neobank site. https://mobbin.com/sites/sections/4611fd1d-a64f-44da-bff0-230db451dcf3 — `refs/behavior-revolut-carousel-dots.webp`
- Cash App, "Explore more": 3 image tiles + caption + pill link, the same shape works as a row or a carousel. https://mobbin.com/sites/sections/da6972f1-9288-4527-aa01-24cf576afb9d — `refs/behavior-cashapp-explore-more.webp`
- Live check, rainbow.me (fetched directly — not in Mobbin, their marketing site moved on since its last capture
  there): the current features section is 5 plain-text items stacked in one column at every width, no icons, no
  grid at all. A legitimate lean option, but flatter than Satchel's charm-forward brand should want.
- General guidance (bento stacks to 1 column under ~640px; 5–9 items is the scannable ceiling before it reads as
  noise): [setproduct.com bento guide](https://www.setproduct.com/blog/bento-grid-layout-design-guide), [saasframe.io 2026 bento guide](https://www.saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide)

## Balance-card illustration: references

Satchel's new card (`SatchelCard.tsx`) needs: "≈ $X · at mainnet prices" as the headline, a multi-segment
horizontal bar under it, and a coin-chip legend (icon + ticker + share%). Two reference families matter: the
**anatomy** (bar + legend, from utilitarian dashboards) and the **feel** (illustrated, playful, from wallet
marketing pages). Satchel's card already has the anatomy right — these are for polishing proportion and motion.

1. **Origin, "Estimated Net Worth"** — closest anatomical match: one total, one bar split into coloured segments
   (Cash / Investments / Other), a dot-legend row directly under it. Confirms bar-then-chips is the right order,
   not bar-then-table. https://mobbin.com/screens/1eb1f32e-30c0-4fa3-aa69-2e5aaacb70c6 — `refs/card-origin-networth-bar.webp`
2. **Cofounder, "Spend Breakdown"** — same bar+legend anatomy, but the legend pairs each segment's dollar value
   *and* percentage ("Custom Agent $32.05 (58.3%)") the way Satchel's card does ("ETH 43%"). Proof that showing
   both numbers at once doesn't feel crowded. https://mobbin.com/screens/ff1e6087-0115-4d23-99c6-ebd0534a16c2 — `refs/card-cofounder-spend-breakdown.webp`
3. **Phantom, "Meet your money app" illustration** — the feel reference: "My Balance $18,207.41" sits in a glassy
   rounded chip tilted in 3-D space, next to a grinning coin character, floating over a soft purple blob scene — not
   a literal screenshot in a device frame. Closest in spirit to a card living inside an illustrated scene rather
   than a bare UI capture (this one is blog hero art, not the product page, but it's Phantom's own illustration
   style for exactly this number). https://mobbin.com/sites/sections/66845ca9-71a3-4268-b2d3-c2a670c029eb — `refs/card-phantom-balance-bento.webp`

Supporting, if the hero loop needs a second data point: MetaMask's peach-bg balance card (big numeral + mascot,
close to Satchel's own chain-charm mascots) — https://mobbin.com/sites/sections/274437fc-75b5-444b-a8a6-1c4f91ebe918 — `refs/card-metamask-balance-peach.webp`; Cash App's black balance card (flat numeral, two plain buttons, no
chart at all — the deliberately quietest option) — https://mobbin.com/sites/sections/0e0552d9-b698-4c03-810f-6488b99f65e7 — `refs/card-cashapp-control-cash.webp`; Copilot Money's horizontal "top movers" chip row (icon + ticker + %, the
same shape as a coin-chip legend, scrolling) — https://mobbin.com/screens/2444a48a-5b13-42cf-ab60-5c4fd12de356 — `refs/card-copilot-top-movers.webp`.

## Anti-patterns to avoid

- **Crowding.** Lemon Squeezy's numbered feature grid: 6 items, each a heading *plus* a 3-line paragraph — a wall
  of text that takes real reading time per cell. Satchel's strip needs one line, not three. https://mobbin.com/sites/sections/dbe87aec-c64b-4928-867b-7997f9288c72 — `refs/anti-lemonsqueezy-wall-of-text.webp`
- **Feature-dump grids.** Midday's 8-item icon grid: two more cells than Mercury's 6-item version above, and it
  already reads as a spec sheet instead of a scan. Six is near the ceiling for "uncrowded" — don't let the list
  grow past it once copy drafts start adding "just one more." https://mobbin.com/sites/sections/ec123707-04ca-4719-b2d4-d2aab5586d21 — `refs/anti-midday-8-item-dump.webp`
- **Jargon tiles.** GTE's feature bento: "Central Limit Order Book," "Non-Custodial," "CEX-level speed with DeFi
  properties." Exactly the register Satchel's copy unit test already bans (MPC, approval, yield…) — a live example
  of a crypto product leaning on insider terms instead of plain language. https://mobbin.com/sites/sections/05bf2eb2-2513-4ff3-b17a-9df427d34aba — `refs/anti-gte-jargon-tiles.webp`
- **Too many stickers.** Family's hero, "Your favorite crypto wallet": 15+ floating mascot stickers (hearts, coins,
  stars, bugs, a cat, speech bubbles) scattered around the headline on both sides. Family and Satchel are both
  cute-mascot crypto wallets, which makes this the sharpest cautionary parallel — Satchel's own restraint (one
  illustration, the chain charms, a hard shadow on the S tile only) is what keeps it from landing here. https://mobbin.com/sites/sections/b36c6af6-3c75-4a17-8fb6-fec0631d2a20 — `refs/anti-family-hero-stickers.webp`
