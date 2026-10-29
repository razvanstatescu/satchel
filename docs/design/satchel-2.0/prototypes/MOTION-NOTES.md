# Motion notes (motion designer → design lead, product designer)

The spec is `../motion-spec.md`. I never edit your files: `motion-landing.html` is generated from `landing.html` by
`../motion-work/build-landing-motion.py` (re-run it after you edit; it stops with a message if a hook moved), and
`motion-handoff.html` loads `app.css` and overrides two rules locally. Everything below is a request, with the reason.

## Design lead (`landing.html`, `landing.css`, `tokens.css`, `components.css`)
1. **Adopt the motion layers** in `landing.html` (or the builders add them; the build script shows each one). Every layer is
   invisible in the server frame, so your page reads exactly as drawn:
   - the swinging card: `.stage__card > .stage__hanger > (.stage__plate + .card)`; the stage card's own `box-shadow` goes (the
     plate draws the drop and stays on the ground when the card lifts, so a lift reads as a lift, not as a thicker sticker);
   - the band's Yours without `hidden` (`opacity: 0`, so it keeps its place and nothing shifts when it sticks on);
   - the pill as a stack (`.m-pillstack`: Paused for sale over Active); each slip row's state as a stack (Used over Checking…);
   - the caption as a four-layer ticker (`.stage__ticker`), a `<b>` fill in each `.stage__step`, and the Pause button with both
     icons (pause and play);
   - clean-strip frame 2: the old ETH coin and "0.80"; frame 5: the old head "1 unused signature", the old row state Unused and
     the old grey Buy;
   - the finale S inline (its shadow path, then a `.m-s-face` group), so the face can stamp into its own drop.
2. **The caption wraps on phones.** "1 of 4 Bitcoin and Ethereum inside" needs 268 px; the bar has 230 px at 360 and 260 at 390.
   A wrap would grow the stage by 22 px mid-loop (a layout shift). My copy hides `.stage__count` below 430 px (the bars already
   show where you are). The other fix is reserving two lines. Your call.
3. **The loop starts on your server frame** (act 3, settled, 7.9 s into the loop), not on act 1: no cross-fade at hydration, and
   the first thing a visitor sees move is the hand-off. Checked pixel for pixel: `shots/motion-landing-server-check-*.png`.
4. **How it works, step 3:** the card is released from your −8° pose and swings to rest at 0° (`.swing-pose[data-rest]`). A
   pendulum frozen mid-swing reads as stuck once things move. The no-JS and reduced frame keeps your −8°.
5. **The price tag:** your string's pivot (`transform-origin: 50% -22px`) is exactly what the swing needs. The tag swings in
   about it with no drop, so the string stays pinned to the card's edge.
6. **Dialog centring** (`.sheet` from 768): please use `inset: 0; margin: auto; height: fit-content` instead of
   `transform: translate(-50%, -50%)`. The dialog's scale-in uses the individual `scale` property, which composes *after* your
   translate, so the dialog would drift about 10 px toward its bottom-right while it scales.
7. **Press tokens:** `--dur-press-in: 60ms` with `--ease-out` (yours: 70 ms ease-in, which feels late on touch).
   `--dur-sheet: 360ms` for the way in, 240 out. `.spin`: 1000 ms per turn reads calmer than 900 (either is fine; pick one).
8. The global reduced-motion clamp in `tokens.css` is fine: CSS transitions become instant (the spec's "static"). The cross-fades
   that carry meaning under reduced motion (the hand-off dip, overlays, toasts) run on WAAPI, which the clamp doesn't touch.

## Product designer (`app.css`, `app-*.html`, `app-screens.md`)
1. **The hand-off runs on your `.hook` stage as is** (`motion-handoff.html`: Give, Buy, Sold; Day and Night). Two additions:
   - `.hook { --swing-room: 12px } .hook__card { left: calc(100% - var(--card-w) - var(--swing-room)) }`. The 10° arrival swing
     reaches 25–30 px past the card's right edge; flush right, the sheet body clips it or shows a scrollbar. Travel stays 128 px
     at 390 (186 in the dialog), with your strap, stem and ghost doing the explaining;
   - the card's state pill as a stack, so it rolls when the card lands: `<span class="m-pillstack"><span class="pill …"
     data-pill="to">Given</span><span class="pill …" data-pill="from">Active</span></span>` (Buy and Sold: Paused for sale →
     Bought or Sold);
   - the giver's and the seller's card carries Yours at the start (`[data-peel]`, `opacity: 0` in the end state); the buyer's is
     `[data-stick]`, visible in the end state. Your ghost and sparkles are animated as they are.
2. **In flight** (wallet, "Giving…"): I keep your lifted pose (translate −8 px, −2°, drop 6 px) as the held "picked up" state:
   220 ms in, then still; it is set down on cancel. Reduced motion: no pick-up.
3. **CTAs whose label changes** (Give it to … → Giving… → Given; Send …→ Sending…): stack every label in one grid cell
   (`.m-morph`, see `motion-micro.html`), so the button never changes size; the button stays pressed (`[data-latched]`) while it
   is busy and pops back up on cancel. The cancel banner is neutral (info), as you specified.
4. **Toasts** sit above the pinned footer (`bottom: calc(88px + safe-area)` on phones), never on it.
5. **Flow sheets:** keep a stable `min-height` across steps, so the sheet's top edge doesn't jump when a step changes.
6. **The clean-history check:** each row's mark and word are stacks (spinner + result icon; "Checking…" + the result), and Buy
   rises out of the page when the verdict is clean (`motion-micro.html#clean`).
7. **The Sold receipt** plays the hand-off once per device per sale (a `localStorage` key); otherwise it shows its end frame.
