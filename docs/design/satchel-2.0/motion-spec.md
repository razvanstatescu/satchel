# Satchel 2.0: motion spec (motion designer, 2026-10-26)

**Sources:** the brand (README "Interaction and motion"), `design-system-impl.md` §5 (the first draft), `rulings.md`, `refs.md` §10,
`design-spec.md`, `LANDING-CONCEPT-READY.md`, `app-screens.md` §7.3, the v4 engines (`hero-loop/engine.ts`, `catch-story/engine.ts`,
`lib/motion-flag.ts`). **Prototypes** (in `proto/`; serve with `python3 -m http.server`): `motion-handoff.html`, `motion-micro.html`,
`motion-landing.html` (built from the lead's `landing.html` by `motion-work/build-landing-motion.py`). **Engine and data:**
`proto/motion/motion-kit.js` (every number below is a table in it), `motion/landing-motion.js`, `motion/*.css`. **Evidence:** §13.

## 0. Rules (each one is checked in the prototypes)
1. **The static CSS is the end state.** A motion animates *from* earlier states (FLIP, `fill: both`), then cancels itself, so the
   page rests on plain CSS. Server HTML, no JS and reduced motion all show the end state (or the landing's server frame).
2. **Three verbs, one physics.** *Press* (into the shadow), *stick on* (a sticker lands from above; *peel off* reverses it),
   *swing* (a damped pendulum about a hook). Text changes *roll*. Nothing else moves.
3. **Transform and opacity only**, as the individual `translate` / `rotate` / `scale` properties, so static tilts in
   `transform` (the −4° Yours, the −5° tag, the 2.5° slip) are kept. Two scoped exceptions: the press changes the button's
   `box-shadow` with the same timing as its `translate` (one element), and hover fills change `background-color` (≤ 120 ms).
   A lifted card's drop is a separate **ground plate**, never an animated `box-shadow`.
4. **One measurement, no loops of reads.** A motion reads layout once (how far the card travels) before it starts.
5. **One clock per motion.** All tracks share one duration, so a motion is seekable by one number (QA, tests, captures).
6. **Delight is rare** (refs §0.5): swings and stick-on celebrations only for the hand-off, mint, a sale and arriving coins.
   Everyday actions (copy, navigate, send) stay quick and quiet.
7. **Reduced motion** (`<html data-motion="reduce">`, the v4 head flag): meaning-carrying motion becomes an opacity dip or
   cross-fade (the hand-off, steps, overlays, toasts); decoration becomes static; loops never start.
8. **Safety:** loops over 5 s have a visible Pause and stop off-screen (< 20 % visible), on a hidden tab and in an inert tree;
   nothing flashes more than 3 times a second (the fastest repeating change is the 1 s spinner); **the S never rotates**;
   charms never idle-loop.

## 1. Tokens (proposed `globals.css` `@theme`; the lead's `tokens.css` names are kept)
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.2,0,0,1)` | arrivals, settles, the press |
| `--ease-in` | `cubic-bezier(.3,0,1,1)` | exits, peel-off |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | stick-on's squash, nudges, bar fills |
| `--ease-sheet` | `cubic-bezier(.32,.72,0,1)` | sheet in (iOS drawer curve) |
| `--ease-swing` | `cubic-bezier(.37,0,.63,1)` | between two swing extremes (a sine half-wave) |
| `--ease-carry` **new** | `cubic-bezier(.68,0,.59,1)` | the hand-off carry: gentle start, firm stop (fitted to the simulated carry) |
| `--ease-fall` **new** | `cubic-bezier(.55,0,1,.45)` | setting a card down (gravity), the S stamp |
| `--dur-press-in` | **60 ms** (was 70, ease-in) | press down, now `--ease-out`: an ease-in press feels late on touch |
| `--dur-press` | 140 ms | release |
| `--dur-fast` / `--dur-base` | 150 / 220 ms | reduced fades / small UI |
| `--dur-sheet` | **360 ms** in, 240 out (was 320) | the drawer curve needs 360 to settle without a snap |

## 2. The hand-off (the one signature motion)
**What it explains:** the Satchel leaves one holder and hangs from the next; everything inside goes with it; ownership is the
lemon sticker. **Plays:** (a) Give success; (b) Buy success (buyer); (c) the seller's first look at a Sold receipt, once per
device per sale (`localStorage["satchel:seen-sale:v1:{id}:{listing}"]`, in try/catch; storage blocked = it plays once per load);
(d) the landing hero's act 4 (§10). Only after chain-confirmed success, never optimistically; never on page load otherwise.

**In flight** (wallet open, then "Giving…"): the review card is picked up and held, the product designer's pose: translate
0 −8 px, rotate −2°, its drop to 6 px (220 ms `--ease-out`), then still while it waits (no loop: the latched button carries the
progress). Cancel or failure: it is set down (180 ms `--ease-fall`, a 2 px press, back in 120 ms). Reduced: no pick-up.

**Stage** (the product designer's `.hook`, `app-screens.md` §7.3): From and To ends, an ink strap, the card hanging on a 22 px stem.
- The pivot is the stem's top on the strap: `.hook__card { transform-origin: 50% 0 }`. Nothing lifts: the stem slides along the strap.
- **End position = the static layout** (under the receiver), inset `--swing-room: 12px`. The 10° arrival swing reaches
  0.174 × (stem + card height) past the card's right edge (25 px at 208 wide, 30 at 240). The inset keeps it inside the sheet's
  20 px padding: no clipping, no scrollbar. Travel is measured once: `dx = card.offsetLeft`.
- **Travel on a 390 phone: 128 px** (the audit measured 58), plus the strap, the dashed ghost and the two ends, so the move reads
  at a glance. 186 px in the 480 dialog.

**Physics.** A damped physical pendulum (period 400 ms, damping ratio 0.30) whose hook is carried 460 ms with a gentle start and a
firm stop (simulated in `motion-work/asym.mjs`). The card lags back as it starts, swings forward 10° when the stem stops, and
settles in 600 ms. Between extremes the curve is a sine half-wave (`--ease-swing`); the last segment eases out.

| Time (ms, from success) | Element | Keyframes |
|---|---|---|
| 0–180 | `[data-yours]` on the card (giver, seller) | **peel off:** opacity 1→0 (from 60), scale 1→1.25, rotate 0→−10°, translate 0→−6 px, `--ease-in` |
| 140–600 | `.hook__card` translate | x −dx → 0, `--ease-carry` |
| 140 / 392 / 616 / 826 / 1036 / 1140 | `.hook__card` rotate | **0 → +5.8° → −10° → +3.7° → −1.4° → 0** (lag, the 10° pendulum, settle) |
| 300–560 | `.hook__ghost` | opacity 0 → .7 (the empty place it left) |
| 1140–1360 | `.hook__card` translate | y 0 → 3 px (90 ms) → 0 (130 ms), `--ease-out`: **the stem clicks into its notch** |
| 1140–1420 | the To avatar | scale 1 → 1.14 (at 1250) → 1 |
| 1140 | the card's state pill | **roll** Active / Paused for sale → Given / Bought / Sold (§3 roll) |
| 1180–1500 | `[data-yours]` (buyer) | **stick on** (§3): opacity 0→1 in 70 ms, scale 1.6→.92→1, rotate −16°→+2.4°→0 |
| 1180–1480 | `.spark` ×2 | pop: opacity 0→1 in 60 ms, scale .2→1.15→1, rotate −40°→0 (220 ms each), 80 ms apart |
| 1200–1400 | the sentence and receipt (`[data-after]`) | opacity 0→1, translate 6→0 px |
| **1400** | focus the sentence (`handoff-sentence`, `tabindex=-1`), then the polite announce | |

Total 1.5 s. **Reduced motion: a dip** (480 ms): the card fades out at the From end (150 ms, `--ease-in`), jumps while invisible,
fades in at the To end (170–350 ms, `--ease-out`); the ghost fades in (160–360); the pill and Yours swap while the card is
invisible; the text fades in 250–450; focus and announce at 450. **No JS:** these screens are client-only; the Sold receipt
renders its end frame (card under the buyer, Sold, sentence) and simply doesn't animate.

**Free-card variant** (no strap: the landing hero, any card on a field): same carry and swing, plus a lift and a set-down. The card
sits in a hanger (`transform-origin: 50% -16px`, a hook above its top centre) with its drop drawn by a **ground plate** that
stays down while the card is up: hanger y 0→−10 px and scale 1→1.02 (0–180, `--ease-out`); the plate counter-moves +10 px and
fades to .5 (a higher sticker casts a lighter shadow; it reads as lifted, not thick); set down at 1020→1140 (`--ease-fall`) to
+2 px (pressed into the shadow), back to 0 by 1260. Strips: `motion-landing-*-act4.png`.

**Implementation.** Recommended: **WAAPI**, the data in `src/lib/motion/handoff.ts` (a port of `handoffTimes()` and the tracks
above) played by a 60-line `play(tracks, T)` (`motion-kit.js` `play` + `mergeTracks`), the same engine the landing uses, so one set
of numbers drives both. It lets `Handoff.tsx` drop `motion` entirely (today its only importer, with `Providers`' `MotionConfig`).
If the team keeps `motion` 14.5.0, the same data maps 1:1 (verified against the installed build):
```ts
animate(card, { rotate: [0, 0, 5.8, -10, 3.7, -1.4, 0, 0] },
  { duration: 1.5, times: [0, .14, .392, .616, .826, 1.036, 1.14, 1.5].map(t => t / 1.5),
    ease: ["linear", ...Array(4).fill([.37, 0, .63, 1]), [.2, 0, 0, 1], "linear"] });   // controls.time = s seeks
```
Read reduced motion from `<html data-motion>` (`readMotionMode()`), not a second query. Cancel on unmount (StrictMode-safe).
Keep `data-testid="handoff"` and `handoff-sentence`; e2e: with reduced motion the sentence has focus within 600 ms; a unit
test seeks the WAAPI animation to 616 ms and expects `rotate: -10deg`.

## 3. Press, hover, latch, roll, card link, copy
- **Press** (`.btn--primary`, `.btn--paper`): down `translate 0 4px` + `box-shadow 0 0 0` in **60 ms `--ease-out`**; up in
  **140 ms `--ease-out`**. The shadow's bottom edge never moves (translate + shadow = 4 px). A quick tap still shows the whole press:
  `usePressable` sets `[data-pressed]` on pointerdown (and Space or Enter keydown) and clears it no sooner than **100 ms** later.
  Hover (hover-capable pointers only): fill to `brand-hover` in 120 ms, no movement. Disabled: no press.
- **Latched while busy:** when a press starts a request, the button stays down (`[data-latched]`, `aria-busy`) and its label
  rolls to the busy verb with a 16 px spinner ("Giving…", "Sending…"). Success: the flow moves on (or the label rolls to
  "Given" and the button pops up). Cancel or failure: it pops back up (140 ms) and the label rolls back; the cancel banner is
  neutral (`info`), never red. It explains "your press is being processed" without a second indicator.
- **Roll** (a label or a word changes): old one up 8 px and out (140 ms `--ease-in`); new one from 8 px below, starting at
  70 ms, in by 250 ms (`--ease-out`). All variants sit in one grid cell (`.m-morph`), so the button never resizes (CLS 0).
  Reduced: a 200 ms cross-fade.
- **Card as a link** (grids): hover `translate 0 -2px` + shadow 6 px (120 ms); press 4 px down + shadow 0 (60 ms); release 140 ms.
  Reduced: the same end states, no transition (the lead's global clamp already does this).
- **Copy:** the Copy icon fades (90 ms); a success Check **sticks on** (from 1.5×, no turn, 320 ms); 1.5 s later it fades and Copy
  returns. The polite region says "Copied". Secondary and icon buttons only change fill (icon buttons scale .96 on press).

## 4. Sheets, dialogs and flow steps
| | In | Out | Reduced |
|---|---|---|---|
| Bottom sheet (< 768) | `translate 0 100% → 0`, **360 ms `--ease-sheet`**; scrim opacity 0→1, 240 ms linear | → 100 %, **240 ms `cubic-bezier(.32,0,.67,0)`**; scrim 200 ms | opacity 150 ms |
| Dialog (≥ 768) | opacity 0→1 in 140 ms; scale .96→1 and translate 12 px→0 over **240 ms `--ease-out`**; scrim 200 ms | opacity→0 and scale→.98, **160 ms `--ease-in`** | opacity 150 ms |
| Flow step (1 → 2) | out: opacity→0, x→−16 px, 120 ms `--ease-in`; in: from x +16 px, 80→280 ms `--ease-out`. Back mirrors it | | opacity: out 100, in 80→200 ms |
- Flows are routes: Close and Esc play the exit, *then* `router.replace`; browser Back unmounts at once. Focus moves to the
  title on open (the animation doesn't delay it). Keep the sheet's height stable across steps (a min-height), so the top edge
  doesn't jump. Centre the dialog with `inset: 0; margin: auto; height: fit-content` instead of `translate(-50%,-50%)`: an
  individual `scale` composes *after* that translate and the dialog would drift ~10 px toward its bottom-right.

## 5. Toasts
In: opacity 0→1 (120 ms), translate 16 px→0 and scale .94→1 over **260 ms `--ease-out`**. Holds **4 s** (paused on hover and focus).
Out: opacity→0, translate 0→8 px, **160 ms `--ease-in`**. One at a time: a new toast waits for the old one's exit, then rises.
Position: above the pinned action bar (`bottom: calc(88px + safe-area)` on phones, 24 px from md), never on it. The state icon
carries the tone (success, frozen with a spinner for "Still signing", muted info for cancels). Reduced: opacity 150 ms.

## 6. Signing progress (about 10 s typical, up to about 2 min)
Honest milestones (`tracker`), never a percentage, never a fake bar. **Only two things move while you wait:** the active step's
`LoaderCircle` (1 turn per **1000 ms**, linear) and the elapsed clock (text, `t-num`, no animation; it appears when its step starts).
- **A step completes:** the spinner fades (100 ms); a `CircleCheck` **sticks on** (from 1.5×, 320 ms); the connector below fills
  with `success` (`scaleY 0→1`, origin top, **300 ms `--ease-in-out`**, starting 60 ms after); the next marker cross-fades from
  dashed to spinner (120–160 ms) and its label turns `font-semibold ink` (instant).
- **The waiting line rolls** (§3) at 20 s ("Taking longer than usual."), 60 s and 150 s. No colour change, no shake.
- **Sent:** the last check sticks on; the waiting line rolls out and "Sent 0.0010 ETH" (success pill) sticks on (from 1.3×).
- **Timed out / signed, not sent / expired:** the active marker cross-fades to `CircleX` (danger) or `CircleQuestionMark`; the
  explanation fades in (200 ms, 8 px). Nothing bounces or shakes: these are money states.
- Reduced: static `CircleDot` instead of the spinner, fills instant, checks fade (150 ms), the line cross-fades.

## 7. Charms
- **Chain charms on their bar** (empty wallet, onboarding, first mint, the landing's hanging coins): each swings about the top of
  its stem (`transform-box: fill-box; transform-origin: 50% 0`) **once when it comes into view** (60 % visible) and **once when
  the pointer brushes it** (direction from the pointer). Swing: first amplitude 9° / 7.5° / 8.5°, staggered 90 ms; half-period
  420 ms (520 for the landing's long strings); each extreme 0.62× the last; 5 extremes, ~2.3 s to rest. A brush: 5°. Never an
  idle loop; nothing while a swing is above 60 % of its amplitude. Reduced: static.
- **Charm S loader** (page loads over 400 ms, not buttons): the S never rotates. Its face (outline + white paths) **lifts 40 units
  and stamps 10 units into its own 10-unit drop**, then rests: one 1.6 s cycle, 0 → 24 % up (`--ease-out`) → 36 % pressed
  (`--ease-fall`) → 52 % rest, with `role="status"` and a word ("Opening Satchel #7"). Reduced: static S plus the word.

## 8. Coins sticking on
- **Coins arrive** (Receive, the card): "+0.0012 BTC · confirming" fades and "Received 0.0012 BTC" sticks on (from 1.25×); then
  the amount **rolls** 0 → 0.0012 while the ticker slides with it (FLIP, one width read); the BTC charm **re-sticks**: up 6 px,
  scale 1.18, −12°, then slaps down 1 px (scale .94) and settles (320 ms). Reduced: the number cross-fades; no hop.
- **Mint success:** the new card **drops into its shadow**: from 16 px up at scale 1.06 (the plate fades in as it falls) to +2 px
  (pressed) at 240 ms (`--ease-fall`), rest at 360; the BTC and ETH charms stick on at 420 and 540 ms (turning −18° / +18°);
  **Yours** sticks on at 720; the line "Satchel #8 is yours." at 900. **First mint only:** the chain-charm bar swings once (§7).
  Reduced: the card fades (200 ms), charms and Yours fade in 60 ms apart.

## 9. The clean-history check (buy page)
- The buyer's browser checks every past signature in parallel. **Results are revealed in list order, at least 220 ms apart, as
  they arrive**, never held longer (the verdict comes ≤ 220 ms × rows after the last result; cached results still reveal in turn).
- A row: the spinner fades (100 ms); its mark sticks on (from 1.5×; from 1.3× for a problem); the word rolls "Checking…" → Used /
  Expired / Unfunded / Not its coin / Confirming / Unused / Can't verify (`voice-copy` §1.2).
- **Clean:** 320 ms after the last row the verdict's `CircleCheck` sticks on and the line rolls to "Clean. No past signature can
  move these coins."; the gate line rolls to "Clean history · checked just now"; at +160 ms **Buy rises out of the page**: it loses
  `aria-disabled`, its face starts 3 px down with no drop and rises to rest as the drop grows to 4 px (220 ms `--ease-out`).
- **Needs attention:** the row gets a 3 px danger bar on its left (`scaleY 0→1`, 220 ms); the verdict's warning icon arrives with a
  plain "thunk" (scale 1.15→1, 220 ms), no sticker celebration; the gate rolls to "Blocked: 1 unused signature"; Buy stays flat.
  **Pressing the blocked Buy** nudges it once (x 0 → −4 → 4 → −3 → 2 → 0 px, 260 ms) and moves focus to the reason.
- Re-checks every 10 s are silent unless the verdict changes. Reduced: fades only, no nudge.

## 10. The landing (`motion-landing.html`; the lead's structure, untouched copy)
**The hero loop** (`figure.stage[data-stage]`, 12 s, autoplay with Pause). One WAAPI clock, each element a track over the whole
loop (the v4 `hero-loop/engine.ts` pattern; new data, same mount, pause and inert logic).
| Act (s) | Caption | What moves |
|---|---|---|
| 1 · 0–3.0 | 1 of 4 Bitcoin and Ethereum inside | the card fades in (0–0.38, rising 8 px); the BTC coin sticks on at 0.6, ETH at 1.05; each amount and ticker fades up 60 ms later |
| 2 · 3.0–5.4 | 2 of 4 Seller lists it | the pill rolls Active → Paused for sale (3.2); the 300 NEAR tag **swings in on its string** (3.5: 28° → −12 → 6.5 → −3 → 1.2 → 0 by 4.76, pivot at the string's top) |
| 3 · 5.4–9.0 | 3 of 4 Buyer checks first | the slip slides up 28 px and turns 4°→0 (5.6–6.05); rows roll Checking… → Used at 6.30 / 6.55 / 6.80; "Clean history" sticks on (7.1); the sparkles pop (7.30 / 7.42) |
| 4 · 9.0–12.0 | 4 of 4 Coins included | the tag unclips and falls (9.0–9.32); the slip and sparkles leave (9.05–9.35); **the free-card hand-off** (9.35–10.85: lift, carry `dx`, lag 5.8°, swing 10°, set down); the pill rolls back to Active and **Yours sticks on** (10.49 / 10.53); the coins hop once (10.79 / 10.94: they came along) |
| seam · 11.5–12.0 | rolls to 1 of 4 at 11.7 | the card fades out where it landed (11.5–11.85) and everything resets behind it; the bars empty (11.55–11.9) |
- **The first frame is the server frame and the first motion is the hand-off.** The engine mounts at **START_AT = 7.9 s** (act 3,
  settled), which is pixel-identical to the server HTML (checked: `shots/motion-landing-server-check-*.png`; only anti-aliasing
  differs). So hydration changes nothing, and 1.1 s later the visitor sees the brand's signature move. No cross-fade needed.
- `dx` = the scene width − the card − its margins − the swing room (0.174 × (card height + 16) − the field's padding): 40 px at
  390, 167 at 768, 227 at 1280; the 10° swing stays inside the sky field. (The app's strap stage carries 128 px at 390.)
- **Bars** fill with time inside each act (act 3's bar is full by 7.9 s); the steps list keeps `aria-current` and `data-done`
  in sync for screen readers; the visible caption is a 4-layer ticker (`aria-hidden`). **Below 430 px the "n of 4" count is
  hidden** (the longest caption needs 268 px; the bar has 230–260), so captions never wrap and the stage never changes height.
- **Pause** (`[data-pause]`, `aria-pressed`, label Pause/Play animation, icons swap) is visible only with JS and full motion
  (its space is always kept). The loop also pauses below 20 % visibility, on a hidden tab and in an inert tree (sheet, dialog).
  Resize rebuilds the tracks at the current time. Reduced motion or no JS: the server frame, nothing moves.

**Once on enter** (60 % visible; anything already on screen at mount stays as drawn; below the fold it waits on its first frame).
| Where | Motion (ms) | Explains |
|---|---|---|
| `#what` address tags | swing in on their strings about the string's top on the card's edge: ±16° → ∓9 → 5 → ∓2.6 → 1 → 0 over 1180, opacity in 120; ETH 140 later | the addresses hang off the card: they go with it |
| `#how` step 1 | the New card drops into its shadow (−14 px, 1.06 → +2 px at 240 → 0 at 360); New sticks on at 380; the sparkles pop 560 / 680 | minting makes a new sticker |
| `#how` step 3 | released from its drawn −8° pose: −8 → +6.2 → −4.4 → +2.8 → −1.4 → 0 by 1800 (half-period 380 ms), then rests at 0 | it hangs from the new owner now |
| `#clean` frames 1–5 | each frame plays its one change, **in turn, at least 700 ms apart** even when several enter together: 1 the note slides out of the card (460); 2 ETH rolls 0.80 → 0.00, the coin turns sad and sinks 2 px, the stamp sticks on (−14°, 440); 3 Signature 3's row fades in and the pen sticks on (200); 4 the head fades in, Unused sticks on, Buy nudges ±2 px twice (540–790); 5 Unused rolls to Used, the head rolls to Clean history, Buy rises from flat (300–520) | the catch, beat by beat |
| `#trust` | the two coins peek up 34 px from behind the slip (440 ms, slight overshoot, 90 ms apart) | they're safe behind the facts |
| `#try-it` finale | the S face drops from 64 units above onto its own drop (`--ease-fall`, 60–300) while the drop darkens in (0–300), presses 10 units in, rests at 460. No rotation | "Stick it on." |
| hero hanging coins (≥ 1100 px) and the phone charm row | one swing 450 ms after load (110 ms apart), then once per brush | they're charms on strings |

## 11. Notes for builders
- **Modules:** `src/lib/motion/{tokens,play,handoff,hero,enter,swing}.ts` (data and pure functions, unit-tested by seeking), plus
  `usePressable`, `<Morph>` (the grid-stacked label) and `<Handoff variant>`. Keep `lib/motion-flag.ts` (the head flag, live).
- **Never** animate during SSR or before hydration; a component that animates on mount renders its end state on the server.
- **Captures and QA:** every motion exposes `seek(ms)` in dev (`window.__satchelMotion`); frame strips come from seeking, not timers.
- **Performance:** one layout read per motion; no `will-change` except on the loop's stage card while the loop plays; pause
  offscreen; the loop's 40-odd tracks are compositor-only (transform, opacity). CLS stays 0: every layer is pre-laid out.
- **Accessibility:** focus moves only for the hand-off sentence and dialogs; announcements stay in the one polite region; the
  hero's Pause meets WCAG 2.2.2; reduced motion follows the OS live.

## 12. What changed from the first drafts, and why
- `design-system-impl` §5's hand-off swung in place, then slid with a spring that overshot. Now the swing is **caused by the
  carry** (lag, then the 10° arrival swing): physical, readable, and the stage never overshoots its end.
- Its charm-S loader swayed ±6°. **The brand forbids rotating the S**; the loader stamps into its own drop instead.
- Its badge stick-on ended at the −4° tilt with `rotate`; here it animates the *individual* `rotate` property back to 0, so the
  static `transform: rotate(-4deg)` carries the tilt (no drift between the animated and static pose).
- Press-in: 60 ms ease-out instead of 70 ms ease-in (see §1). Sheet in: 360 ms instead of 320.
- `LANDING-CONCEPT-READY`: the loop starts on the server frame, not act 1 (no cross-fade, and the hand-off is the first motion);
  How-step-3 settles to rest instead of freezing at −8° (a pendulum stopped mid-swing reads as stuck); its tag no longer needs
  a pivot wrapper (the lead's string already pivots at its top).

## 13. Evidence (`proto/shots/`)
- **Hand-off:** `motion-handoff-390-{give,buy}-full-day.png`, `-390-sell-full-night.png`, `-1280-give-full-night.png`,
  `-390-give-reduced-day.png`; onion-skin traces `motion-handoff-trace-{390-give-day,390-give-night,1280-buy-day}.png`;
  videos `motion-handoff-390-give-day.webm`, `motion-handoff-1280-buy-night.webm`.
- **Micro:** `motion-micro-{press,morph-ok,morph-cancel,card-hover,copy,sheet-in,sheet-step,sheet-out,dialog-in,dialog-out,toast,
  toast-swap,signing,signing-long,charms,s-loader,receive,mint,clean-ok,clean-attention,clean-nudge}.png`, Night copies
  (`-night`) and reduced copies (`-reduced`).
- **Landing:** `motion-landing-{1280,390}-story.png`, `-1280-act4.png`, `-390-act4-night.png`, `motion-landing-enter-*.png`,
  `motion-landing-server-check-{1280,390}.{png,json}`, videos `motion-landing-hero-{1280,390}.webm`.
