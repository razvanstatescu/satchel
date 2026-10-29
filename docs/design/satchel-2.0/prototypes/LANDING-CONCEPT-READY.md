# Landing concept: ready for motion (design lead, 2026-10-26)

`landing.html` + `landing.css` hold the structure; the rationale is in `design-spec.md` §4. Build the motion in
`motion-landing.html` (a copy of `landing.html`), not in my files. If you need markup changes in mine, ask in
`MOTION-NOTES.md`. Every frame below is already the server frame: the page reads completely with no JS and under reduced
motion. Motion only adds to it.

## The idea in one line
**Show the object.** One sample Satchel card, its coin charms and its record appear at real size and in real UI. Each
section shows one thing that happens to them:
1. it holds coins;
2. it has its own addresses;
3. it's handed over;
4. its record is checked;
5. its contract has no key.

The motion is how the card behaves as a physical sticker: it swings, its coins stick on, a price tag clips on, and the
check slip prints.

## Sections, in order (ids are anchors)
| # | Section (`id`) | Root hooks | Stage size (W × H) at 390 / 768 / 1280 | Motion (what it explains) | Reduced motion and no JS |
|---|---|---|---|---|---|
| 1 | Hero (`.hero`) | `figure.stage[data-stage][data-act]` | Scene 318×336 / 640×318 / 700×318 (`.stage__scene`, inside the sky shelf; option B: 488×368) | **The loop**, autoplay with Pause. Below. | Act 3 as drawn (the server frame); Pause hidden or disabled |
| 2 | What it is (`#what`) | `.what__art`, `[data-el=addr-btc\|addr-eth]` | Panel 358 wide / 720 / 568 | The two address tags drop in on their strings and **sway once** (±4°, origin at the string top), on enter | Static |
| 3 | Use cases (`#uses`) | `.use__icon` | 56 / 64 px tiles | None, or a 2 px lift on hover | Static |
| 4 | How it works (`#how`) | `.step`, `[data-el=mint-card]`, `.hang .swing-pose` | Scenes 358×206 / 46 % × row / 376×232 | Step 1: the card **sticks on** (scale .9 to 1, the drop appears) and the New badge pops. Step 3: **the hand-off swing**, once, on enter: from 0 to the drawn −8° pose, via the 10° pendulum | The drawn poses (step 3 stays at −8°) |
| 5 | Clean history (`#clean`) | `[data-story]`, `li.frame[data-beat=1–5]` | Desk 358×196 / ~350×224 / 2 + 3 frames, ~226 and ~222 wide | **Scroll-driven, light:** each frame plays its one change as it enters, beat by beat (below). Optional on lg: an autoplay sequence with Pause that steps the highlight 1 to 5 | All five frames visible, as drawn (the strip *is* the story) |
| 6 | Trust (`#trust`) | `.trust__peek img` | Panel 358 / 720 / 568 | The two coins **peek up** from behind the slip (translateY 24 px to 0, staggered 80 ms), once | Static (peeking) |
| 7 | Questions (`#questions`) | `details` | — | The plus rotates 45°, as in the CSS; nothing else | Same |
| 8 | Final CTA (`#try-it`) | `.finale__s[data-el=finale-s]` | S 132 px / 132 / 330 | The S **sticks on** once: scale .92 to 1, its drop from 0 to full. **Never rotate the S** (brand rule), and never swing it | Static |

## The hero loop (`figure.stage`)
- **Elements** (`data-el`):
  - `card`, the swinging part; it has `data-swing`;
  - `coin-btc`, `coin-eth`, the ledger rows;
  - `pill`;
  - `tag`, the 300 NEAR price tag;
  - `slip`, the check slip;
  - `sig-1`, `sig-2`, `sig-3`;
  - `verdict`;
  - `spark`, two of them;
  - `yours`, the hidden lemon sticker on the band;
  - `count` and `caption`;
  - `[data-pause]`.
- **The steps list** `ol.stage__steps` holds the 4 captions as text, so screen readers get them; the bars are its
  `li`s. The visible caption `p.stage__caption` is `aria-hidden`. Set `aria-current="step"` on the active `li`, and
  `data-done` on the earlier ones.
- **Acts** (my proposal: about 3 s each, 12 s per cycle; you own the timing):
  1. **"Bitcoin and Ethereum inside":** the card, with no tag, no slip and the Active pill. The coins **stick on** one
     after the other.
  2. **"Seller lists it":** the tag clips on, swinging in on its hole; the pill becomes Paused for sale.
  3. **"Buyer checks first":** the slip slides out from under the card. The rows tick 1, 2, 3 (Used); the verdict
     "Clean history" lands; the sparkles pop.
  4. **"Coins included":** the tag drops off, and the card does **the hand-off swing** (10°, 600 ms, about a pivot
     16 px above its top edge). The lemon **Yours** sticks on (the badge stick-on in design-system-impl §5). The coins
     stay in the ledger: they go with it.
- **Server frame = act 3, fully drawn.** It is the most meaningful single frame: for sale, checked and clean. Start
  the loop from act 1 only after hydration, and only if the stage is in view, with a quick cross-fade, never a jump.
- **Pause:** a visible Pause (WCAG 2.2.2). The loop also stops when the stage is off-screen, when the tab is hidden and
  when a sheet or dialog is open.
- **Reduced motion:** no loop. Show act 3 and hide or disable Pause.
- **The card never leaves the stage.** In act 4 the slide is short (`--dx` about 24 px on phones, 40 on desktop) and
  springs back by the next act 1, so nothing clips at 390.

## Clean history, beat by beat (`li.frame[data-beat]`)
1. The **Signed transfer** note slides out from behind the card (the seller keeps it).
2. The ETH amount ticks from 0.80 to 0.00; its coin swaps to the **sad** face (`chain-eth-sad.svg`); the stamp
   "Moved after the sale" lands at −4°.
3. **Signature 3** writes into the record: the highlighted row fades in, pen icon first.
4. **Unused** appears in danger red; Buy stays grey with its lock. One gentle shake (±2 px, twice) at most; no
   flashing.
5. **Used** ticks; the head turns to Clean history; **Buy** presses on (the sticker press in reverse: from 4 px down
   up to rest). This is the one coral fill in the viewport.

## Rules carried from the brief
- Transform and opacity only.
- No layout reads in loops.
- CLS ≈ 0: everything animates inside fixed-size stages.
- Use CSS, WAAPI or the installed `motion` 14.5.0.
- Nothing flashes more than 3 times a second.
- The S never rotates.
- Charms move on events, never in a constant idle jitter.
- Every animation has its reduced-motion state.
- No new copy. The visible words are the copy keys above, plus the desk labels: `landing.desk.*` and
  `landing.clean.labels.*`. Note the 2.0 changes there: "Used" replaces "Settled", and "Paused for sale" replaces
  "Listed".

## Changes (I note here anything that moves under you)
- 2026-10-26: first version.
- 2026-10-26, later: **`landing.html` now carries hero option A, "the shelf"** (recommended). It has centred copy and
  a two-line H1, and the stage is a wide sky shelf under the CTAs, with the two coins hanging at its ends
  (`.shelf__hang`, shown from 1100 px). The earlier split hero is now `landing-hero-b.html`, option B.
  - The stage markup and every `data-el` hook are **identical** in both, so your motion fits either.
  - The shelf scene is 318 px tall from 768 px and keeps a max width of 700 px; the coins hanging at the ends may sway
    once on enter (origin at their string tops).
