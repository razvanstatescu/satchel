# Satchel 2.0 motion bible

The motion language for the launch-film remake: Remotion 4.0.537, 1920×1080, 30 fps, about 2 minutes, "hypermotion"
pacing, brand 2.0. Written 2026-10-26. Scene builders follow this document. When it disagrees with the brand pack
(`marketing/brand-v2/`), the brand pack wins on look and the product facts (§7) win on words.

Brand 1.0 (leather, brass, the stitch, the Strap S, Bricolage, grain) is retired. From `hypermotion-cookbook.md`, keep
only the techniques: the beat grid, the readable-hold formula, sound placement, mix targets and render traps (§4–6
there). Its look, devices and springs do not carry over.

**How this was checked**
- Brand: `SOURCE.md`, `DESIGN-SYSTEM-README.md`, `tokens.json`, the six canvas boards, `_overview-sheet.png`, and every
  SVG (rendered with `qlmanage` and inspected). Fonts: the `fvar` tables of the three variable fonts in
  `video/public/v2/fonts/`.
- Code: every TSX block is copied from the kit in `marketing/notes/_scratch/sandbox/src/` (`brand2/*.tsx` plus
  `usage.tsx`). The kit typechecks with `tsc --noEmit` in strict mode against the video project's installed 4.0.537
  packages. The 22 blocks extracted from this file typecheck too (`_scratch/verify/`), and they match the kit line for
  line. Every move was also render-tested as stills; the contact sheets are in `_scratch/sandbox/out/`. API names were
  checked against the skill rules and the installed `.d.ts` files.
- Numbers: overshoot and settle times come from Remotion's own `spring()` and `measureSpring()`. The per-frame tables
  are the kit functions' output.
- Research: twelve references in Appendix A. The ones I could not open are marked there.

**Aligned with the locked script (v2 of this bible, 2026-10-26).** The film is `marketing/script/SCRIPT-v3.md`
(134 s, 120 BPM, narrator Sarah) and its world bible, `concepts-v2.md` §4. Where both describe a move, this bible now
gives the same move with exact numbers. That covers the swing, the charm personalities, the flip, the records, the
stamps, the frost, the Night blind, the captions and the end card. The director's amendments (A1–A7) win over both.

**In the film project (`video/src2/`).** Build with the shared kits and import them; never edit them: `src2/brand`,
`src2/components/Sticker.tsx`, `src2/illustration/*` and `src2/lib` (`<Sfx>`, `getScene`). The code below is the
reference implementation of the numbers. It is the kit in `marketing/notes/_scratch/sandbox/src/brand2/`, typechecked
and render-tested. When a shared kit lacks a move, copy the helper into your scene folder. Unit mapping:

| This bible | `src2` shared kit |
|---|---|
| `lift` in px above rest (the shadow stays on the ground) | `Sticker` / `SatchelCard` `lift` = px ÷ 8k (lift 1 = 8k px up, drop 4k + 8k) |
| pressed: `lift = −rest` | `press` = −lift ÷ 4k (press 1 = 4k px down, drop 0) |
| `open` 1 → 0.12 | `CharmFace.blink` = (1 − open) ÷ 0.88 (0 open, 1 closed) |
| `lookX`, `lookY` in −1…1 | `CharmFace.look` = { x: 6·lookX, y: 4·lookY } (charm units) |
| landing squash 0.88 | `squash: 1` (the kit's 12%) |
| a spring `{ mass 1, stiffness k, damping c }` released from an angle | `pendulum(t, θ0, freqHz, ζ)` with freqHz = √k ÷ 2π and ζ = c ÷ 2√k (same extremes; the kit's cos form starts with a small kick) |
| `SPRING2.*` presets | pass the object to `spring({ config })`. The `SPRING` presets in `src2/lib/time.ts` are brand 1.0 values (heavier); do not use them for stickers |
| MarkBuild (§3) | `Mark` / `Lockup` props: `tile` (wrap in a CSS scale for the slap), `draw` 0 → 1, `drop` 1 → 2.2 → 0.6 → 1, `word` 0 → 1 |
| SFX in §6 | `<Sfx name="…" at={sec} align="peak" />` with the names in `src2/data/sfx.json` |

### Quick sheet

| Move | Numbers (30 fps; f = frame) |
|---|---|
| Beat grid | 120 BPM = 15 f per beat, 60 f per bar. Cuts and contacts land on the grid; choreograph against VO times (`getScene`) |
| Slap-on | 14 f. From scale 1.28 and 28 px up, ease-in fall, **contact on f4**: squash 1.07 × 0.93, shadow 0, held 2 f; rebound `{0.7, 500, 18}`; the shadow catches up 1 f late |
| Caption slap | Scale 1.2 → 1, contact f4, seeded tilt within ±2°. Hook and end captions only: a white sticker whose shadow snaps 0 → 8 px on contact |
| Press | Down 3 f (ease-in) to translateY +4k with shadow 0, **held 3 f**, released on `{0.7, 500, 18}` (pops 18% above rest). `button-thock` on the press frame |
| **Hand-off swing** | Lift 12 px, scale 1.04, lean 10° into the travel (6 f); slide 600 ms on an arc (apex = `charm-jingle`) while the pendulum runs **10° → −4.9° → +2.4° → −1.2°** (f0/6/12/18 of the slide, `{1, 267, 7.2}`); set down, contact = `sticker-slap` |
| Charms riding | 1.5× the card's angle, SOL and ETH 2 f behind, BTC 3 f; eyes closed from lift to landing |
| Charm personalities | BTC period 0.9 s `{1, 55.5, 5.2}`; ETH 0.7 s `{1, 88.5, 5.65}` with a ±6° head tilt; SOL 0.45 s `{1, 203, 5.7}`, overshoots. Reaction order SOL → ETH (+2 f) → BTC (+4 f) |
| Blink | 6 f (2 close, 1 closed, 3 open), every 75–120 f per charm, never in sync |
| Peel | Dog-ear 0 → 0.3 in 10 f (ease-in cubic), then detach. The whole-frame peel takes 22 f (H2→P1, T7→E1) |
| Flip (T0, T7) | The film's one 3D move: rotateY 0 → 180° on `{1, 800, 34}` (overshoot to about 196°, settles in 10 f), perspective 2400 px, scale 1.06 edge-on; Day sweeps back with the angle |
| Records, stamps, frost | Dashed outline (2k px, dash 8k/6k) drawn dash by dash in 16 f. Stamp: charm winds back −25° (6 f), strikes +55° (3 f), the stamp slaps at 1.25 → 1 tilted −7° → −4°. Frost wipes in over 10 f; melt 8 f |
| Night | One roller blind from the top: 18 f ease-in on the music stop, a 2% bounce, a hard 10 px black edge shadow |
| Outline and shadow | 3k and 4k px, where k = on-screen size ÷ UI size. At k 2.5 that is 8 px and 10 px. Never blurred |
| Text | Must-read ≥ 56 px; captions 110–160 px; key text inside the centre 1080 × 1080; text stops moving while it is read |
| Coral | One coral fill per frame: the card band or the one primary button. No coral floods in this film |

---

## 1. Personality and principles

**Personality.** Satchel 2.0 moves like a sticker you love: slapped on with conviction, peeled off with a grin, and,
when it is handed over, swinging like a charm on a keyring. Everything is flat vinyl and paper, never glass or metal.
Shapes have ink outlines and a hard ink shadow that tells you exactly how high they are. The charms have two dots and
a smile, and they act like Duolingo's characters do: blinks, glances and a wider smile, timed to the music. Things
travel between screens the way Family's cards do ("you float rather than walk"). Under the play sits the restraint of
a product that holds money: one coral thing per frame, ink for every word, facts that hold still long enough to read,
and a groove you can tap your foot to. The jokes live in the timing, not in effects.

**Five principles**
1. **Stickers have weight: they slap, they don't glide.** Objects accelerate *into* contact (ease-in), hit on a
   frame, squash 5–7%, hold 2 frames (hit-stop), then rebound. Nothing floats in on a slow ease-out, and nothing
   fades in except as a 2-frame anti-pop.
2. **Height lives in the hard shadow.** One number, `lift`, moves a sticker and leaves its ink shadow on the ground.
   Lifted means a bigger offset; pressed means 0. There is no blur, glow, gloss, gradient or 3D tilt (the scripted card
   flip is the one 3D move). Depth comes from the shadow, from scale, and from 2.5D parallax of flat layers.
3. **Whatever hangs, swings.** The card swings 10° → −5° → +2° → 0 in 600 ms. The charms ride it at 1.5×, a few
   frames late. Each charm has its own weight: BTC is heavy and slow, ETH is curious, SOL is quick and overshoots.
   Secondary motion is mandatory: if the bar moves, the charms answer, out of phase.
4. **Coral means "look here", once per frame.** Coral is the brand and the call to action: the card band, or the one
   primary button. One coral fill per frame, never duplicated and never a full-frame flood in this film. Ink carries
   every word; sky and lemon are small accents.
5. **Play in the timing, stillness for reading.** Characters act with blinks and glances; Notion's motion team called
   it "personality in subtlety". Big performances are rationed to the rare moments: mint, hand-off, clean history and
   the end card. This is Family's "Delight-Impact Curve": the less often a moment happens, the more delight it can
   carry. Text lands, then holds still, and the charms hold still too.

---

## 2. Motion vocabulary

### 2.0 Shared tokens, presets and physics

**Springs.** Remotion's `damping` is the coefficient *c*, so ζ = c / (2√(k·m)). The spatial presets are Material 3
Expressive's spring tokens converted to Remotion: fast spatial ζ 0.6 / k 800, default ζ 0.8 / k 380, slow ζ 0.8 / k 200,
and effects ζ 1 / k 1600, which never overshoots. `pop` and `rebound` are the cartoon end of the range. Do **not** use
Remotion's default spring (ζ 0.5, 28 f settle, +16% at f11): it is floaty, which is the opposite of a slap.

| Preset | Config `{mass, stiffness, damping}` | ζ | Overshoot (share of travel) | Settles | Use |
|---|---|---|---|---|---|
| `pop` | 0.8, 420, 16 | 0.44 | +21% at f5 | 16 f | Pills, badges, sparkles, smiles |
| `rebound` | 0.7, 500, 18 | 0.48 | +18% at f4 | 13 f | Recovery after contact, a press release |
| `quick` | 1, 800, 34 | 0.60 | +9% at f4 | 10 f | Knobs, chips, counter pops |
| `land` | 1, 380, 31 | 0.80 | +1.6% at f8 | 12 f | Cards and panels arriving, lifts |
| `carry` | 1, 200, 22.6 | 0.80 | +1.5% at f11 | 16 f | Big moves, the charm bar, camera |
| `fade` | 1, 1600, 80 | 1.00 | none | 6 f | Opacity and colour **only** |
| `swing` | 1, 393, 12.3 | 0.31 | the pendulum (§2.4) | 18 f | A generic charm pluck released at 10° |
| `handoff` | 1, 267, 7.2 | 0.22 | 10 → −4.9 (f6) → +2.4 (f12) → −1.2 (f18) | landing cancels it | **The card's hand-off swing** (§2.6) |
| `CHARM_SWING.btc` | 1, 55.5, 5.2 | 0.35 | −31% at f14, +10% at f27 | 43 f | BTC: heavy, slow, lands last (period 0.9 s) |
| `CHARM_SWING.eth` | 1, 88.5, 5.65 | 0.30 | −37% at f11, +14% at f21 | 36 f | ETH: curious (period 0.7 s) |
| `CHARM_SWING.sol` | 1, 203, 5.7 | 0.20 | −52% at f7, +27% at f14, −15% at f20 | 36 f | SOL: quick, overshoots, reacts first (period 0.45 s) |

**Easing** (for `interpolate`): `fall` = in-quad (into contact), `rip` = in-cubic (peels), `out` = bezier(0.16, 1,
0.3, 1) for text and UI that must not bounce, `backOut` = bezier(0.34, 1.56, 0.64, 1) for a pop without a spring,
`swing` = in-out cubic (slides that drive a pendulum), `pan` = bezier(0.65, 0, 0.35, 1) for camera moves.

**Durations (30 fps).** Tick 1–2 f. Press 3 + 3 + about 8 f. Slap 14 f. Pop 10–16 f. Dog-ear 10 f. Swing 18 f.
Hand-off about 40 f. Slide 14–18 f. Line rise 16 f with a 3 f stagger. Word slap one per beat (15 f) or half-beat
(7/8 f alternating; always compute from cumulative beats). Brand transitions 18–22 f. Blink 6 f. Eye dart 3 f.

**Stroke scale.** The brand's UI values are a 3 px outline (2 px on buttons and inputs) and a 4 px shadow. In the film
they scale with the element: outline = 3k, shadow = 4k, where k = on-screen size ÷ UI size. The floors are 5 px and
6 px, so they survive a phone screen and H.264. Examples: a 360 px phone card shown 900 px wide (k 2.5) gets an 8 px
outline and a 10 px shadow; a hero card at k 3.5 gets 11 px and 14 px. Illustrations (charms, the S) keep their own
SVG proportions when scaled.

```tsx
// brand2/tokens.ts
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Satchel 2.0 colour tokens (marketing/brand-v2/tokens.json). Day is the default.
export const C = {
  ground: "#f6f5fb", // cool off-white, never cream
  surface: "#ffffff",
  sunken: "#eceaf4",
  line: "#e2dfee",
  lineStrong: "#7f7999",
  ink: "#1d1340", // text, outlines, hard shadows
  inkMuted: "#5e5776",
  coral: "#ff5c4d", // the brand: one coral fill per frame
  coralDeep: "#d9402f", // pressed primary button
  coralSoft: "#ffe3df",
  lemon: "#ffd84d", // sticker accent only
  sky: "#8fd3ff", // sticker accent only
  success: "#0b6e54",
  frozen: "#2a63c7",
  danger: "#c61f45",
  btc: "#f7931a", // charm fills (illustration colours, both themes)
  eth: "#a3abe0",
  sol: "#c08cff",
  nightGround: "#120c26",
  nightSurface: "#1c1538",
  nightInk: "#f4f2ff",
  nightShadow: "#000000",
} as const;

/** The logo tile's corner ratio (112/512). The Satchel card and the coral iris use it too. */
export const TILE_RADIUS = 112 / 512;

/**
 * Stroke weights at video scale. k = on-screen size / UI size (a 360 px phone card shown 900 px wide: k = 2.5).
 * Brand UI values are outline 3 px and shadow 4 px; whole pixels, with floors so they survive a phone screen.
 */
export const stroke = (k: number) => ({
  outline: Math.max(5, Math.round(3 * k)),
  shadow: Math.max(6, Math.round(4 * k)),
});

export const FONT = { display: "Funnel Display", sans: "Onest", mono: "Geist Mono" } as const;

/** Call once at module level (Root.tsx). loadFont() from @remotion/fonts holds the render until each face is ready. */
export const loadBrand2Fonts = () =>
  Promise.all([
    loadFont({ family: FONT.display, url: staticFile("v2/fonts/FunnelDisplay-VF.ttf"), weight: "300 800" }),
    loadFont({ family: FONT.sans, url: staticFile("v2/fonts/Onest-VF.ttf"), weight: "100 900" }),
    loadFont({ family: FONT.mono, url: staticFile("v2/fonts/GeistMono-VF.ttf"), weight: "100 900" }),
  ]);
```

```tsx
// brand2/motion.ts
import { Easing, interpolate, random, spring } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 120 BPM at 30 fps: a beat is exactly 15 frames, a bar 60. Always count beats cumulatively. */
export const beat = (n: number) => Math.round(n * 15);

/**
 * Spring presets. Remotion's `damping` is the coefficient c, so zeta = c / (2 * sqrt(stiffness * mass)).
 * Overshoot is a share of the travel; settle frames come from measureSpring({ fps: 30, config }).
 */
export const SPRING2 = {
  pop: { mass: 0.8, stiffness: 420, damping: 16 }, // zeta 0.44: +21% at f5, settles in 16 f. Pills, badges, sparkles.
  rebound: { mass: 0.7, stiffness: 500, damping: 18 }, // zeta 0.48: +18% at f4, 13 f. Recovery after contact or a press.
  quick: { mass: 1, stiffness: 800, damping: 34 }, // zeta 0.60: +9% at f4, 10 f. Small UI: knobs, chips (M3 fast spatial).
  land: { mass: 1, stiffness: 380, damping: 31 }, // zeta 0.80: +1.5% at f8, 12 f. Cards and panels (M3 default spatial).
  carry: { mass: 1, stiffness: 200, damping: 22.6 }, // zeta 0.80: +1.5% at f11, 16 f. Big moves, camera (M3 slow spatial).
  fade: { mass: 1, stiffness: 1600, damping: 80 }, // zeta 1.0: no overshoot, about 6 f. Opacity and colour only.
  // The charm swing as a plain spring: spring({ frame, fps, from: 10, to: 0, config: SPRING2.swing }) equals
  // swingFromRest() below to 0.001°: 10, -3.6 (f5), +1.3 (f10), -0.5 (f15), inside 2.5% from f17.
  swing: { mass: 1, stiffness: 393, damping: 12.3 }, // zeta 0.31, damped period 10 f
  // The film's hand-off swing (concepts-v2 §4.1: -10° → +5° → -2° → 0 in 600 ms): released at 10° it reads
  // 10, -4.9 (f6), +2.4 (f12), -1.2 (f18); the landing cancels the rest. zeta 0.22, period 11.8 f (0.39 s).
  handoff: { mass: 1, stiffness: 267, damping: 7.2 },
} as const;

/**
 * Charm personalities (concepts-v2 §4.1), as springs released from an angle (spring({ from: deg, to: 0 })).
 * BTC heavy, slow, lands last: period 0.9 s, zeta 0.35 → extremes f14 -31%, f27 +10%, rests ≈ f43.
 * ETH curious: period 0.7 s, zeta 0.30 → f11 -37%, f21 +14%, rests ≈ f36. Tilts its head ±6° when it notices.
 * SOL quick, overshoots, reacts first: period 0.45 s, zeta 0.20 → f7 -52%, f14 +27%, f20 -15%, rests ≈ f36.
 * In src2's pendulum(t, theta0, freqHz, zeta): BTC 1.19 Hz / 0.35, ETH 1.50 Hz / 0.30, SOL 2.27 Hz / 0.20,
 * hand-off 2.60 Hz / 0.22 (freqHz is the undamped frequency there).
 */
export const CHARM_SWING = {
  btc: { mass: 1, stiffness: 55.5, damping: 5.2 },
  eth: { mass: 1, stiffness: 88.5, damping: 5.65 },
  sol: { mass: 1, stiffness: 203, damping: 5.7 },
} as const;

/** Reaction order: SOL first, ETH next, BTC last (frames after the cue). Riding a hand-off: 2, 2, 3 f behind. */
export const CHARM_LAG = { sol: 0, eth: 2, btc: 4 } as const;

export const EASE2 = {
  fall: Easing.in(Easing.quad), // into contact: a sticker accelerates onto the surface
  rip: Easing.in(Easing.cubic), // a peel speeds up as it lets go
  out: Easing.bezier(0.16, 1, 0.3, 1), // text and UI that must not bounce
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1), // a pop without a spring (about 10% overshoot)
  swing: Easing.inOut(Easing.cubic), // slides that drive a pendulum
  pan: Easing.bezier(0.65, 0, 0.35, 1), // camera moves between scenes
} as const;

// ---------------------------------------------------------------------------------------------
// Charm swing: a damped pendulum.
// theta(f) = theta0 * e^(-lambda f) * (cos(wd f) + (lambda / wd) sin(wd f))
//   wd = 2*pi / periodF (rad per frame), lambda = ln(40) / settleF (the envelope is 2.5% of theta0 at settleF).
// The sin term starts the swing at rest (a charm released at theta0). Without it you get theta0 e^(-lambda f) cos(wd f).
// Defaults (10 deg, period 10 f, settle 18 f = 600 ms): 10, -3.6 (f5), +1.3 (f10), -0.5 (f15), under 0.2 from f19.
// In seconds: wd = 18.85 rad/s, lambda = zeta * wn = 6.15 /s, wn = 19.83 rad/s, zeta = 0.31.
// ---------------------------------------------------------------------------------------------
export const swingFromRest = (f: number, theta0 = 10, periodF = 10, settleF = 18) => {
  if (f <= 0) return theta0;
  const wd = (2 * Math.PI) / periodF;
  const lambda = Math.log(40) / settleF;
  return theta0 * Math.exp(-lambda * f) * (Math.cos(wd * f) + (lambda / wd) * Math.sin(wd * f));
};

/**
 * Secondary swing: something hanging from a pivot that moves (charms on a sliding bar, the card in the hand-off).
 * Integrates theta'' = -wn^2 sin(theta) - 2 zeta wn theta' - (a / L) cos(theta) from frame 0, where a is the
 * pivot's horizontal acceleration (px/frame^2) taken from pivotX, the same function that places the bar.
 * Returns CSS degrees (positive = clockwise = the bob swings left), so a bar sliding right makes charms trail left.
 * pivotX must accept fractional and slightly negative frames (use clamped interpolate()).
 */
export const hangingSwing = (
  frame: number,
  pivotX: (f: number) => number,
  { lengthPx = 600, periodF = 10, zeta = 0.32, maxDeg = 12, substeps = 8 } = {},
) => {
  const wn = (2 * Math.PI) / periodF / Math.sqrt(1 - zeta * zeta); // damped period = periodF
  const dt = 1 / substeps;
  let th = 0;
  let om = 0;
  const steps = Math.max(0, Math.floor(frame * substeps));
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const a = (pivotX(t + dt) - 2 * pivotX(t) + pivotX(t - dt)) / (dt * dt);
    om += (-wn * wn * Math.sin(th) - 2 * zeta * wn * om - (a / lengthPx) * Math.cos(th)) * dt;
    th += om * dt;
  }
  const deg = (-th * 180) / Math.PI;
  return maxDeg * Math.tanh(deg / maxDeg); // soft limit: small swings stay linear, big ones never pass maxDeg
};
// Calibration for hangingSwing (≈10° peak): spring-driven move (SPRING2.carry) → lengthPx = travel;
// SPRING2.land → 2 × travel; an 18 f cubic in-out slide → 0.65 × travel. Avoid expo-out pivots: the jump in
// velocity on frame 0 kicks the charms into the soft limit and they plateau.

/**
 * The same pendulum, integrated once over a whole move and scaled so its largest excursion is exactly peakDeg.
 * Use it for authored moments (charms arriving on their bar: 12°). One pass, O(frames).
 */
export const swingTrack = (
  pivotX: (f: number) => number,
  frames: number,
  { periodF = 10, zeta = 0.3, peakDeg = 10, substeps = 8 } = {},
) => {
  const wn = (2 * Math.PI) / periodF / Math.sqrt(1 - zeta * zeta);
  const dt = 1 / substeps;
  let th = 0;
  let om = 0;
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    out.push((-th * 180) / Math.PI);
    for (let k = 0; k < substeps; k++) {
      const t = f + k * dt;
      const a = (pivotX(t + dt) - 2 * pivotX(t) + pivotX(t - dt)) / (dt * dt);
      om += (-wn * wn * th - 2 * zeta * wn * om - a / 1000) * dt; // small-angle form: the result is rescaled
      th += om * dt;
    }
  }
  const peak = Math.max(...out.map(Math.abs)) || 1;
  return out.map((d) => (peakDeg * d) / peak);
};

// ---------------------------------------------------------------------------------------------
// Blinks: close 2 f, closed 1 f, open 3 f (6 f = 200 ms). Eyes never close fully: 12% leaves a line.
// ---------------------------------------------------------------------------------------------
export const blinkAt = (f: number, start: number) =>
  interpolate(f - start, [0, 2, 3, 6], [1, 0.12, 0.12, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });

/** Idle blinks every 75–120 f (2.5–4 s) from a per-charm seed, 15% doubles, plus forced blinks (landings, look changes). */
export const blinkSchedule = (seed: string, from: number, to: number, forced: number[] = []) => {
  const out = [...forced];
  let f = from + Math.round(random(`${seed}-first`) * 40);
  for (let i = 0; f < to; i++) {
    out.push(f);
    if (random(`${seed}-double-${i}`) < 0.15) out.push(f + 9);
    f += 75 + Math.round(random(`${seed}-gap-${i}`) * 45);
  }
  return out;
};

export const eyeOpen = (f: number, blinks: number[]) => Math.min(1, ...blinks.map((b) => blinkAt(f, b)));

// ---------------------------------------------------------------------------------------------
// Slap-on (14 f): fall 4 f (ease-in), contact on f4, squash held 2 f, rebound, the shadow catches up 1 f late.
// lift is the height above rest in px: it drives both the element and its hard shadow (see Sticker.tsx).
// ---------------------------------------------------------------------------------------------
export const SLAP_CONTACT = 4; // put the slap SFX transient on this frame

export const slapAt = (f: number, fps: number, rest: number, { from = 1.28, squash = 0.07, drop = 28 } = {}) => {
  const fall = interpolate(f, [0, SLAP_CONTACT], [0, 1], { ...clamp, easing: EASE2.fall });
  if (f < SLAP_CONTACT) {
    const s = interpolate(fall, [0, 1], [from, 1]);
    return { sx: s, sy: s, lift: interpolate(fall, [0, 1], [drop, -rest]), opacity: interpolate(f, [0, 2], [0, 1], clamp) };
  }
  const body = spring({ frame: f - SLAP_CONTACT - 1, fps, config: SPRING2.rebound }); // squash held on f4 and f5
  const shade = spring({ frame: f - SLAP_CONTACT - 2, fps, config: SPRING2.rebound }); // shadow one frame behind
  const k = 1 - body; // 1 at contact, about -0.18 at the rebound (a small stretch), 0 at rest
  return { sx: 1 + squash * k, sy: 1 - squash * k, lift: -rest * (1 - shade), opacity: 1 };
};

/** Video-scale smear for fast moves: stretch along the motion, keep the area. v in px per frame. */
export const smear = (v: number) => {
  const s = 1 + Math.min(0.25, Math.abs(v) / 1000);
  return { along: s, across: 1 / s };
};
```

### 2.1 Sticker slap-on (and the shadow catching up)

**When:** every sticker entrance: cards, pills, badges, labels, the logo tile, words in a headline. Contacts land on
the beat, and the slap SFX transient goes on the contact frame (`SLAP_CONTACT` = f4).

**How:** the sticker comes from the camera side (bigger, higher) and *accelerates* into the surface. The squash is
held for 2 frames (the hit-stop that sells weight). It rebounds with a 1% stretch, and the hard shadow arrives one
frame after the body.

| f | Scale (x × y) | lift px | Shadow px | |
|---|---|---|---|---|
| 0 | 1.280 | +28.0 | 38.0 | opacity 0 → 1 over f0–f2 (anti-pop only) |
| 1 | 1.262 | +25.6 | 35.6 | |
| 2 | 1.210 | +18.5 | 28.5 | |
| 3 | 1.123 | +6.6 | 16.6 | |
| **4** | **1.070 × 0.930** | **−10.0** | **0** | **contact: SFX, pressed flat** |
| 5 | 1.070 × 0.930 | −10.0 | 0 | hit-stop |
| 6 | 1.050 × 0.950 | −10.0 | 0 | body rebounds, shadow still pressed |
| 7 | 1.017 × 0.983 | −7.1 | 2.9 | |
| 8 | 0.994 × 1.006 | −2.4 | 7.6 | |
| 9 | 0.988 × 1.012 | +0.8 | 10.8 | stretch peak |
| 10 | 0.991 × 1.009 | +1.8 | 11.8 | shadow overshoot |
| 12 | 1.001 × 0.999 | +0.4 | 10.4 | |
| 14+ | 1 | 0 | 10 | at rest (rest = 10 px, a k 2.5 sticker) |

Variants: words use `squash 0.06, drop 0`. Captions use `from 1.2` (§2.16). The logo tile uses `from 1.22, squash
0.05`, with no tile shadow. Stagger sticker sheets 3 f. Transform origin is the centre for face-on stickers and
`50% 100%` for objects landing on a floor.

**With the shared `Sticker` (k 2.5):** f0 `lift 1.4` → f2 `0.93` → f3 `0.33` → f4–f6 `press 1` → f7 `press 0.71` →
f8 `press 0.24` → f9 `lift 0.04` → f10 `lift 0.09` → rest. Apply the squash as a CSS `scale` on a wrapper.

```tsx
// brand2/Sticker.tsx (part 1 of 2: the lift model and the slap)
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./tokens";
import { slapAt } from "./motion";

/**
 * One parameter, `lift` (px above rest), drives the element AND its hard shadow:
 *   lift 0      → shadow offset = rest (the brand's 0 4px 0 ink, scaled)
 *   lift > 0    → the sticker rises, the shadow stays on the ground: offset = rest + lift
 *   lift = -rest → pressed flat: moved down by rest, shadow offset 0 (the brand's button press)
 * box-shadow follows border-radius; no blur, ever.
 */
export const stickerStyle = (o: {
  fill: string;
  outline: number;
  rest: number;
  radius: number;
  lift?: number;
  ink?: string;
}): React.CSSProperties => {
  const lift = o.lift ?? 0;
  const ink = o.ink ?? C.ink;
  return {
    background: o.fill,
    border: `${o.outline}px solid ${ink}`,
    borderRadius: o.radius,
    boxSizing: "border-box",
    boxShadow: `0 ${Math.max(0, o.rest + lift)}px 0 ${ink}`,
    translate: `0 ${-lift}px`,
  };
};

/** For SVG stickers (charms, the sticker S): a hard drop-shadow that follows the alpha. Same lift model. */
export const hardShadowFilter = (rest: number, lift = 0, ink: string = C.ink) =>
  `drop-shadow(0 ${Math.max(0, rest + lift)}px 0 ${ink})`;

/** Sticker slap-on, mounted inside a <Sequence> that starts at the slap. Without w/h it hugs its content. */
export const SlapIn: React.FC<{
  w?: number;
  h?: number;
  padding?: string;
  fill: string;
  outline: number;
  rest: number;
  radius: number;
  origin?: string;
  children?: React.ReactNode;
}> = ({ w, h, padding, fill, outline, rest, radius, origin = "50% 50%", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, sy, lift, opacity } = slapAt(frame, fps, rest);
  return (
    <div
      style={{
        ...stickerStyle({ fill, outline, rest, radius, lift }),
        width: w,
        height: h,
        padding,
        opacity,
        scale: `${sx} ${sy}`,
        transformOrigin: origin,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};
```

### 2.2 Sticker peel-off

**When, in v3:**
- **H1, f48–56:** alice pinches the card's top-left corner and peels it up. For 4 frames the curl shows the card's
  back with faint dashed outlines (the plant, paid off in T0). Use progress 0 → 0.25 and the `sticker-peel` SFX.
- **H2→P1 and T7→E1:** whole-frame peels, 22 f (§5).
- Stickers coming off a sheet.

It is the opposite of the slap: slow to start, quick to let go.

**How:** a dog-ear. The fold runs at 45° from the corner. The peeled part flips over the fold and shows the backing
(**white**, as the card's back is white, with the ink outline; use `sunken` for paper stickers). The crease gets an
ink line. The flap's hard shadow grows from rest to
rest + 36 px as it lifts. Peel 0 → 0.3 in 10 f with `rip` (ease-in cubic); the SFX "zzt" starts on the first frame
and peaks on the detach. Then **detach**: the whole sticker, curl and all, lifts (lift +40 px, scale 1.06), turns
8–15° away (only non-logo stickers) and leaves frame in 8 f with `fall`. Past 0.3 the flap pokes beyond the sticker's
edges and reads as a page turn, so stop there. (A fold perpendicular to the diagonal looked wrong on wide cards in
the render test; 45° fixed it.)

```tsx
// brand2/Sticker.tsx (part 2 of 2: the peel)
// ---------------------------------------------------------------------------------------------
// Peel: a dog-ear. The peel direction is 45° from the corner into the sticker; the fold line is perpendicular
// to it at distance progress * (w + h) / √2 (progress 1 = the far corner). The stuck part keeps the face; the
// peeled part flips over the fold (a CSS reflection matrix) and shows the backing. Its hard shadow grows as it
// lifts. Keep progress ≤ 0.3 for a corner curl; past that the flap pokes beyond the edges (a page turn).
// ---------------------------------------------------------------------------------------------
type Pt = { x: number; y: number };
export type Corner = "tl" | "tr" | "bl" | "br";

/** Keep the part of a convex polygon where (p - c)·u >= d (Sutherland–Hodgman against one line). */
const clipHalfPlane = (poly: Pt[], c: Pt, u: Pt, d: number, keepAbove: boolean): Pt[] => {
  const side = (p: Pt) => ((p.x - c.x) * u.x + (p.y - c.y) * u.y - d) * (keepAbove ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
};

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** pad: how far the face's own outline and hard shadow reach outside w × h (keep them on the stuck side). */
export const peelGeometry = (w: number, h: number, progress: number, corner: Corner, pad = 0) => {
  const c: Pt = { x: corner.includes("r") ? w : 0, y: corner.includes("b") ? h : 0 };
  const u: Pt = { x: (corner.includes("r") ? -1 : 1) / Math.SQRT2, y: (corner.includes("b") ? -1 : 1) / Math.SQRT2 };
  const d = Math.max(0.001, progress) * ((w + h) / Math.SQRT2);
  const box = rect(0, 0, w, h);
  const stuck = clipHalfPlane(box, c, u, d, true);
  const stuckClip = clipHalfPlane(rect(-pad, -pad, w + pad, h + pad), c, u, d, true);
  const peeled = clipHalfPlane(box, c, u, d, false);
  const q = c.x * u.x + c.y * u.y + d; // fold line: p·u = q
  // reflection across the fold: p' = (I - 2uu^T) p + 2 q u   → CSS matrix(a, b, c, d, e, f)
  const m = [1 - 2 * u.x * u.x, -2 * u.x * u.y, -2 * u.x * u.y, 1 - 2 * u.y * u.y, 2 * q * u.x, 2 * q * u.y];
  const fold = stuck.filter((p) => Math.abs((p.x - c.x) * u.x + (p.y - c.y) * u.y - d) < 0.01); // crease ends
  return { stuckClip, peeled, matrix: `matrix(${m.map((v) => v.toFixed(5)).join(",")})`, fold };
};

export const polygon = (pts: Pt[]) =>
  pts.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${pts.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(",")})`;

export const Peel: React.FC<{
  w: number;
  h: number;
  progress: number; // 0 flat → 0.3 a dog-ear (stop here, then detach) → 1 fully turned over
  corner?: Corner;
  radius: number;
  outline: number;
  rest: number;
  backing?: string; // the underside: white for the Satchel card (its back), sunken for paper stickers
  children: React.ReactNode; // the face, drawn at w × h (it brings its own outline, radius and shadow)
}> = ({ w, h, progress, corner = "br", radius, outline, rest, backing = C.surface, children }) => {
  const g = peelGeometry(w, h, progress, corner, rest + outline);
  const flapShadow = rest + 36 * Math.min(1, progress * 2.5); // the flap's shadow grows as it lifts
  const [a, b] = g.fold;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", inset: 0, clipPath: polygon(g.stuckClip) }}>{children}</div>
      {progress > 0.002 ? (
        <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 ${flapShadow}px 0 ${C.ink})` }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: g.matrix,
              clipPath: polygon(g.peeled),
              background: backing,
              border: `${outline}px solid ${C.ink}`,
              borderRadius: radius,
              boxSizing: "border-box",
            }}
          />
          {a && b ? (
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={outline} strokeLinecap="round" />
            </svg>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
```

### 2.3 Hard-shadow lift and press

**The model:** `lift` is the only number. The element translates by −lift, and its box-shadow offset is rest + lift,
so the shadow stays on the ground. Pick-up is lift +12 px with `land` (scale 1.04, since it is closer to the camera;
the world bible's lift). Hover in UI recreations is lift +4 px over 6 f. A press is lift −rest, which is exactly the brand's "press
4 px down into the shadow (shadow to 0, translateY 4px)" scaled by k. The pressed fill is `coral-deep`. A **disabled**
primary button is flat: `sunken` fill, `line-strong` 2k border, no shadow, `ink-muted` label. **Enabling** it raises
it out of the page (lift −rest → 0 on `rebound`, fill cross-fades to coral on `fade`): a button that wakes up. That is
the Buy payoff after clean history.

Press timeline (rest 10 px, press frame `at`):

| f | at−3 | at−2 | at−1 | **at** | at+1 | at+2 | at+3 | at+4 | at+5 | at+6 | at+8 | at+10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lift px | 0 | −1.1 | −4.4 | **−10** | −10 | −10 | −7.1 | −2.4 | +0.8 | **+1.8** | +0.4 | 0 |
| shadow px | 10 | 8.9 | 5.6 | **0** | 0 | 0 | 2.9 | 7.6 | 10.8 | 11.8 | 10.4 | 10 |

The SFX `button-thock` goes on `at` (`button-thock-deep` for Buy) and `tick-soft` on at+3. A thumb (sticker hand)
or tap dot arrives 6 f before `at` and squashes 10% on `at`. "Every tap presses its button 4 px into its shadow"
(world bible). With the shared `Button`, use `press` = −lift ÷ 4k: at−2 `0.11`, at−1 `0.44`, at…at+2 `1`, at+3 `0.71`,
at+4 `0.24`, then 0. The shared Button cannot rise above rest, so the 18% pop is lost there, which is acceptable.

```tsx
// brand2/ui.tsx (part 1 of 2: press)
import React from "react";
import { interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { C, FONT } from "./tokens";
import { clamp, EASE2, SPRING2 } from "./motion";
import { stickerStyle } from "./Sticker";

/**
 * Button press: down in 3 f (ease-in) so it is fully pressed ON `at` (the thock SFX frame), held on at, at+1,
 * at+2, released with SPRING2.rebound (it pops 18% of the travel above rest, then settles). Coral → coral-deep.
 */
export const pressAt = (f: number, at: number, rest: number, fps: number) => {
  if (f < at) {
    const p = interpolate(f, [at - 3, at], [0, 1], { ...clamp, easing: EASE2.fall });
    return { lift: -rest * p, pressed: p };
  }
  const r = spring({ frame: f - at - 2, fps, config: SPRING2.rebound });
  return { lift: -rest * (1 - r), pressed: Math.max(0, 1 - r) };
};

export const PrimaryButton: React.FC<{ label: string; at: number; k?: number }> = ({ label, at, k = 2.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rest = Math.round(4 * k);
  const { lift, pressed } = pressAt(frame, at, rest, fps);
  return (
    <div
      style={{
        ...stickerStyle({ fill: interpolateColors(pressed, [0, 1], [C.coral, C.coralDeep]), outline: Math.round(2 * k), rest, radius: 18 * k, lift }),
        padding: `${13 * k}px ${28 * k}px`,
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: 16 * k,
        color: C.ink, // ink on coral (5.7:1). Never white text on coral.
      }}
    >
      {label}
    </div>
  );
};
```

### 2.4 The charm swing (damped pendulum)

**The brief's form:** θ(t) = θ₀ · e^(−ζωt) · cos(ωt). Derivation for "a 10° swing that settles in about 600 ms":
1. **Period.** It swings like a *charm*, so it is short and quick: T = 10 frames = ⅓ s, so ω = 2π/T = **18.85 rad/s**
   (0.628 rad per frame). A simple pendulum with that period is 2.8 cm long, which is keyring-charm size, and with 10
   frames per cycle the extremes land exactly on frames 0, 5, 10 and 15.
2. **Settled** means the envelope is down to 2.5% of θ₀, so 0.25°. On a card with a 240 px radius that is 1 px at the
   edge. So e^(−ζω · 0.6 s) = 0.025, which gives ζω = ln 40 / 0.6 = **6.15 s⁻¹** (0.205 per frame).
3. So **ζ = 6.15 / 18.85 = 0.326** in the one-ω form. Strictly, with ω as the damped frequency, ωₙ = √(18.85² + 6.15²)
   = 19.83 rad/s and ζ = 0.31.
4. θ(t) = 10° · e^(−6.15t) · cos(18.85t). For a charm *released* from 10° (zero starting speed), add the sine term:
   θ(t) = 10° · e^(−6.15t) · [cos(18.85t) + 0.326 · sin(18.85t)].
5. In Remotion this is exactly a spring: `spring({ frame, fps, from: 10, to: 0, config: { mass: 1, stiffness: 393,
   damping: 12.3 } })`. Stiffness is ωₙ² and damping is 2ζωₙ, and the error is below 0.001° (checked over f0–f24).

| f | 0 | 1 | 2 | 3 | 4 | **5** | 6 | 7 | 8 | 9 | **10** | 12 | **15** | 18 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| θ° | 10 | 8.15 | 4.11 | 0.0 | −2.72 | **−3.59** | −2.93 | −1.48 | 0.0 | 0.98 | **1.29** | 0.53 | **−0.46** | 0.0 | 0.17 |

**Pivot:** the top of the stem: (0, −96) in the charm's own units, or 6% above the top edge of a card. CSS
`rotate(+θ)` is clockwise, so a hanging bob swings *left*.

**Secondary swing (when the bar moves).** The pivot's acceleration drives the pendulum: θ̈ = −ωₙ² sin θ − 2ζωₙ θ̇ −
(a(t)/L) cos θ. The acceleration a(t) comes from the bar's own x(t) by finite differences, with 8 substeps per frame
(`hangingSwing`). Give each charm its personality period and damping (BTC 27 f / ζ 0.35, ETH 21 f / 0.30, SOL
13.5 f / 0.20), so the three never swing in sync and the order of reactions reads as character. For authored
moments, use `swingTrack`, which integrates once and scales the result to an exact peak: 12° for charms arriving on
a `carry`-spring bar. Example (a 10 f period, 12° peak): f0–14 = 0, 4.7, 10.9, **12.0**, 7.3, −0.4, −7.4,
**−11.1**, −11.1, −8.0, −3.8, 0, 2.4, **3.0**, 2.4 … settled by about f25. The card's own hand-off swing is the
authored `SPRING2.handoff` (§2.6), not a driven track. Never drive a pivot with an expo-out ease: its jump in velocity
on frame 0 slams the charms into the limit and they plateau (render-tested).

**In this film** (concepts-v2 §4.1):
- **The card's hand-off swing** is `SPRING2.handoff`: 10° → −4.9° → +2.4° → −1.2° at f0/6/12/18, which is the
  world bible's "−10° → +5° → −2° → 0". It is a slightly longer swing (period 0.39 s, ζ 0.22) than the generic
  10-frame pluck above, and the landing cancels the remainder (§2.6).
- **Charms have personalities.** When they snap on, get bumped or are plucked, release each from its own angle on
  its own spring:
  - BTC: `CHARM_SWING.btc`, period 0.9 s, heavy, lands last.
  - ETH: `CHARM_SWING.eth`, period 0.7 s, curious, tilts its head ±6° (§2.15).
  - SOL: `CHARM_SWING.sol`, period 0.45 s, quick, overshoots.

  In H1 (f5, f15, f25) they snap on one per beat and then "all three swing at their own speeds". They react in the
  order SOL, ETH (+2 f), BTC (+4 f).
- **Riding the hand-off,** a charm's angle is 1.5× the card's, 2 f late for SOL and ETH and 3 f for BTC. Its eyes are
  closed, and the `charm-jingle` lands on the arc's apex.

**Rules:** never more than 15° (1.5 × the card's 10°). Only hanging things swing (charms, and the card in the hand-off
and on its hook), never the logo, the S or the wordmark. One jingle per swing event, never on every oscillation.

```tsx
// usage.tsx (A): the charm swing with the stock spring (released at 10°, rests in 600 ms)
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING2 } from "./brand2/motion";
import { ChainCharm } from "./brand2/Charm";

export const SwingingCharm: React.FC<{ at: number; fill: string }> = ({ at, fill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deg = frame < at ? 0 : spring({ frame: frame - at, fps, from: 10, to: 0, config: SPRING2.swing });
  return (
    <svg viewBox="-80 -110 160 190" width={320} height={380} style={{ overflow: "visible" }}>
      <g transform={`rotate(${deg} 0 -96)`}>
        <ChainCharm fill={fill} />
      </g>
    </svg>
  );
};
```

### 2.5 Charm faces (blink, smile, look-at, squash)

The three chain charms (Bitcoin #f7931a, Ethereum #a3abe0, Solana #c08cff) are Satchel's characters. Every face is
built from the illustration's own geometry, in coin units where the radius is 64: two ink dots (r 9) at (±22, −6)
and a smile M−16 18 Q0 32 16 18 (stroke 9). Following Notion's lesson, they act with **timing**, not detail.
- **Blink:** 6 f (close 2, closed 1 at 12% so a line remains, open 3). Idle blinks every 75–120 f (2.5–4 s),
  seeded per charm. 15% are double blinks, the second 9 f later. Never all three in sync, except once as a
  deliberate gag. Forced blinks come one frame after a landing, during a look change (a blink hides the jump) and in
  the cheer cascade (left to right, 2 f apart). A long, worried blink is close 3, closed 2, open 4.
- **Look-at:** eyes move up to 6 units on x and 4 on y; the smile follows at 60%, so the flat coin seems to turn. An
  eye dart takes 3 f (`out`). **Charms are pointers:** 6–8 f before something important happens (a button press, the
  card arriving), they look at it. While hanging, their eyes look where the swing goes next.
- **Expressions** (the world bible's set, the only ones allowed):
  - Eyes: open dots, closed arcs (joy), wide dots (surprise).
  - Mouth: smile, flat or "o".

  The smile's depth is 14 units × `smile`. Use 1 for the brand smile, 1.5–1.6 for joy (cheer: `pop`, staggered
  2 f) and 0 for flat (concern, in the catch). Wide dots are `open` 1.25, or the shared `CharmFace.wide` = 1, for
  2–4 f. In C1 the drained ETH charm goes "o" and grey (fill to `lineStrong` on `fade`).
  **No brows, limbs, teeth, tongues or blush.** The shared `CharmFace.smile` accepts negative values (a frown); keep
  them for a director's request only. No real chain logos inside a coin, and the S never gets a face.
- **They never speak.** No giggles, cheers or voices (amendment A3). They emote with motion and faces only; sounds
  are SFX (`charm-jingle`, `sparkle`, `success-marimba`, `pop`).
- **Squash on landing:** scaleY 0.88 and scaleX 1.136 (equal area) about the coin's bottom edge for 2 f, then
  `rebound`. Caught by its stem on a bar, it stretches instead: scaleY 1.06 about the stem top for 2 f.
- **Idle:** blinks only. No breathing bobs while text is on screen ("become still when the user needs to read"). On
  music-only holds they may nod 1.5° on each downbeat.
- **Shadow:** the world bible gives each charm "a 3 px ink outline, a hard shadow", as does the brand README; the
  SVG has none. Add it with `hardShadowFilter` (`drop-shadow(0 4k px 0 ink)`) on a **non-rotating wrapper** around
  the swinging charm. The filter is applied before the element's own transform, so a filter on the rotating element
  would swing its shadow sideways.

```tsx
// brand2/Charm.tsx
import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./tokens";
import { blinkSchedule, clamp, eyeOpen, SPRING2, swingFromRest, swingTrack } from "./motion";

// Geometry from illustration/satchel-charms-chains.svg, in its own units: coin r 64, outline 12, eyes r 9 at (±22, -6),
// smile M-16 18 Q0 32 16 18 (stroke 9), stem 12 × 40 from y -96 to -56 (rx 6). The swing pivot is the stem top.
export type Face = {
  open?: number; // 1 open … 0.12 closed (blinkAt / eyeOpen)
  lookX?: number; // -1 … 1: eyes move 6 units, the smile 60% of that (a flat coin that seems to turn)
  lookY?: number; // -1 … 1: 4 units
  smile?: number; // 0 flat (concern), 1 brand smile, 1.5 big smile. Never a frown, never teeth.
  squashY?: number; // 1 = none; 0.88 on a landing (scaleX compensates to keep the area)
};

export const ChainCharm: React.FC<Face & { fill: string; withStem?: boolean }> = ({
  fill,
  open = 1,
  lookX = 0,
  lookY = 0,
  smile = 1,
  squashY = 1,
  withStem = true,
}) => {
  const ex = 6 * lookX;
  const ey = 4 * lookY;
  const sx = 1 / squashY; // keep the area while squashing
  return (
    <g>
      {withStem ? <rect x={-6} y={-96} width={12} height={40} rx={6} fill={C.ink} /> : null}
      {/* squash about the coin's bottom edge (it lands on its bottom) */}
      <g transform={`translate(0 70) scale(${sx} ${squashY}) translate(0 -70)`}>
        <circle r={64} fill={fill} stroke={C.ink} strokeWidth={12} />
        <ellipse cx={-22 + ex} cy={-6 + ey} rx={9} ry={Math.max(1.6, 9 * open)} fill={C.ink} />
        <ellipse cx={22 + ex} cy={-6 + ey} rx={9} ry={Math.max(1.6, 9 * open)} fill={C.ink} />
        <path
          d={`M${-16 + 0.6 * ex} ${18 + 0.6 * ey} Q${0.6 * ex} ${18 + 14 * smile + 0.6 * ey} ${16 + 0.6 * ex} ${18 + 0.6 * ey}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
};

const CHAINS = [
  { key: "btc", fill: C.btc, x: -160 },
  { key: "eth", fill: C.eth, x: 0 },
  { key: "sol", fill: C.sol, x: 160 },
] as const;

/**
 * The three chain charms on their bar. The bar slides in (barX, best on SPRING2.carry), the charms trail and
 * swing (secondary action) with their personalities: BTC period 27 f (0.9 s, zeta 0.35), ETH 21 f (0.7 s, 0.30),
 * SOL 13.5 f (0.45 s, 0.20); peak 12°. Eyes look where the swing goes next; blinks run on per-charm clocks;
 * cheerAt widens the smiles in reaction order (SOL, ETH +2 f, BTC +4 f).
 * Render it inside an <svg> whose viewBox holds the illustration units, e.g. viewBox="-260 -150 520 260".
 */
const PERSONALITY = [
  { periodF: 27, zeta: 0.35, lag: 4 }, // BTC
  { periodF: 21, zeta: 0.3, lag: 2 }, // ETH
  { periodF: 13.5, zeta: 0.2, lag: 0 }, // SOL
];

export const CharmBar: React.FC<{ barX: (f: number) => number; frames?: number; cheerAt?: number }> = ({
  barX,
  frames = 120,
  cheerAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tracks = useMemo(() => PERSONALITY.map(({ periodF, zeta }) => swingTrack(barX, frames, { periodF, zeta, peakDeg: 12 })), [frames]);
  return (
    <g transform={`translate(${barX(frame)} 0)`}>
      <rect x={-220} y={-130} width={440} height={22} rx={11} fill={C.ink} />
      {CHAINS.map((c, i) => {
        const deg = tracks[i][Math.min(frame, frames - 1)] ?? 0;
        const lag = PERSONALITY[i].lag;
        const forced = cheerAt === undefined ? [] : [cheerAt + lag];
        const open = eyeOpen(frame, blinkSchedule(c.key, 20, 900, forced));
        const look = interpolate(deg, [-12, 12], [-1, 1], clamp); // eyes look where the swing goes next
        const cheer = cheerAt === undefined ? 0 : spring({ frame: frame - cheerAt - lag, fps, config: SPRING2.pop });
        return (
          <g key={c.key} transform={`translate(${c.x} 0) rotate(${deg} 0 -96)`}>
            <ChainCharm fill={c.fill} open={open} lookX={look} smile={1 + 0.5 * cheer} />
          </g>
        );
      })}
    </g>
  );
};

/** A single "pluck": the charm is tapped and swings from 10° to rest in 600 ms. */
export const PluckedCharm: React.FC<{ fill: string; at: number }> = ({ fill, at }) => {
  const frame = useCurrentFrame();
  const deg = frame < at ? 0 : swingFromRest(frame - at, 10, 10, 18);
  return (
    <g transform={`rotate(${deg} 0 -96)`}>
      <ChainCharm fill={fill} open={eyeOpen(frame, [at + 1])} lookX={interpolate(deg, [-10, 10], [-1, 1], clamp)} />
    </g>
  );
};
```

Use `barX = (f) => -1400 + 1400 * spring({ frame: Math.max(0, f), fps: 30, config: SPRING2.carry })`. A memoised
`barX` must not change identity per frame in a way that changes its values.

### 2.6 The hand-off (the brand's signature)

The brand defines one signature motion: "on hand-off the card swings like a charm (a 10° pendulum, 600ms) and slides
to the new owner". The world bible makes it a full performance ("The swing": lift y −12 px, scale 1.04, rotate up to
10° toward the travel; slide 600 ms with the pendulum −10° → +5° → −2° → 0; land with the shadow back at rest; charms
1.5× and 60–90 ms behind, eyes closed; jingle at the apex). Every hand-off uses it: H1, P5, the P6 vignettes, the sale
in C1 (with flat faces) and T7.

| f | Action | SFX (`src2/data/sfx.json`) |
|---|---|---|
| (−8 to 0) | Optional peel lead-in: the hand pinches a corner and dog-ears it 0 → 0.25 (§2.2) | `sticker-peel` |
| 0–6 | **Lift:** up 12 px (the hard shadow stays on the ground: drop 4k → 4k + 12), scale 1.04, lean 10° into the direction of travel (`land`) | `swing-swish` (peak f10) |
| 6–24 | **Slide 600 ms** (cubic in-out) on a shallow arc (8% of the distance). The pendulum is released from the 10° lean: **10° (f6) → −4.9° (f12) → +2.4° (f18) → −1.2° (f24)** (`SPRING2.handoff`). Charms ride at 1.5×, 2–3 f late, eyes closed | `charm-jingle`, its peak on the apex (f15) |
| 24–27 | **Set-down:** ease-in onto the new owner; **contact f27**: pressed flat, squash 4%, the residual swing is cancelled | `sticker-slap` + `chain-clink` |
| 27–35 | Rebound to rest, shadow back at 4k; the charms open their eyes (+1 f) and settle on their personality springs | `pop` on the name-tag swap |

The S printed on the card's coral band tilts with the card here, and only here, because the brand defines this
motion. Never tilt the mark, the sticker S or the wordmark on their own. In T7 the flip back to the front (§2.16) runs
inside this move, and the USDC tag crosses the card mid-frame, landing on the "landing" marker (2:02.0) with the
jingle.

```tsx
// brand2/HandOff.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, EASE2, SPRING2 } from "./motion";
import { stickerStyle } from "./Sticker";
import { C } from "./tokens";

/**
 * The hand-off, "the swing" of concepts-v2 §4.1, on one clock (30 fps):
 *   f0–6    lift: the card rises 12 px (its hard shadow stays on the ground), scales to 1.04 and leans 10° into
 *           the direction of travel (SPRING2.land)
 *   f6–24   slide 600 ms (cubic in-out) on a shallow arc whose apex (f15) carries the charm-jingle; the pendulum,
 *           released at the 10° lean, runs 10° → -4.9° (f12) → +2.4° (f18) → -1.2° (f24) (SPRING2.handoff)
 *   f24–27  set down (ease-in); contact f27 = sticker-slap; squash 4%; the shadow returns to rest; residue cancelled
 * The charms ride at 1.5× the card's angle, 2 f (SOL, ETH) or 3 f (BTC) late, eyes closed from f6 to f27.
 */
export const HANDOFF = { liftEnd: 6, slideStart: 6, apex: 15, slideEnd: 24, contact: 27 } as const;

export const handoffAt = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }) => {
  const T = HANDOFF;
  const dir = Math.sign(o.toX - o.fromX) || 1;
  const p = interpolate(frame, [T.slideStart, T.slideEnd], [0, 1], { ...clamp, easing: EASE2.swing });
  const up = spring({ frame, fps, config: SPRING2.land });
  const fall = interpolate(frame, [T.slideEnd, T.contact], [0, 1], { ...clamp, easing: EASE2.fall });
  const swing =
    frame < T.slideStart ? 10 * up : spring({ frame: frame - T.slideStart, fps, from: 10, to: 0, config: SPRING2.handoff });
  const settle = spring({ frame: frame - T.contact - 2, fps, config: SPRING2.rebound });
  return {
    x: o.fromX + (o.toX - o.fromX) * p,
    arcY: -0.08 * Math.abs(o.toX - o.fromX) * Math.sin(Math.PI * p), // apex mid-slide
    lift: frame < T.contact ? 12 * up - (12 + o.rest) * fall : -o.rest * (1 - settle),
    rotate: dir * swing * (1 - fall), // CSS degrees; positive leans the top toward +x
    scale: 1 + 0.04 * up * (1 - fall),
    squash: frame < T.contact ? 0 : 0.04 * (1 - spring({ frame: frame - T.contact - 1, fps, config: SPRING2.rebound })),
    eyesClosed: frame >= T.slideStart && frame < T.contact,
  };
};

/** A charm riding the hand-off: 1.5× the card's angle, lagF frames late (SOL 2, ETH 2, BTC 3). */
export const rideAngle = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }, lagF: number) =>
  1.5 * handoffAt(frame - lagF, fps, o).rotate;

/** The card on the hand-off clock (a plain sticker card here; in src2 wrap the shared SatchelCard the same way). */
export const HandOff: React.FC<{
  fromX: number;
  toX: number;
  y: number;
  w: number;
  h: number;
  rest: number;
  outline: number;
  children?: React.ReactNode;
}> = ({ fromX, toX, y, w, h, rest, outline, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = handoffAt(frame, fps, { fromX, toX, rest });
  return (
    <div
      style={{
        position: "absolute",
        left: m.x - w / 2,
        top: y + m.arcY - h / 2,
        width: w,
        height: h,
        ...stickerStyle({ fill: C.surface, outline, rest, radius: 28 * (w / 360), lift: m.lift }),
        rotate: `${m.rotate}deg`,
        transformOrigin: "50% -6%",
        scale: `${m.scale * (1 + m.squash)} ${m.scale * (1 - m.squash)}`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};
```

With the shared `SatchelCard`, put `handoffAt` on a wrapper div (`left/top`, `rotate`, `scale`, `transformOrigin`)
and pass `lift = m.lift / (8k)` while `m.lift ≥ 0`. On the pressed frames, translate the wrapper by −m.lift and set
the card's drop to 4k + m.lift. The render test shows the lean (f6), the −4.9° counter-swing at the apex, a level
arrival and contact f27, pressed flat.

**The card's face in the film** is the shared `SatchelCard`:
- A 1.586 : 1 ratio, with the coral band at the top (the frame's one coral) reading "Satchel #N" in Funnel Display
  800, and the sticker S at the right.
- Native amounts in tabular figures, and the charm bar along the bottom edge (world bible).
- The back (the flip, T0): white, with dashed record outlines under "History · N signatures" (§2.16).
- **No fiat total. No custom names on the band** (amendment A4): it always reads "Satchel #N".

### 2.7 Coral tile iris (optional; not in the v3 script)

A coral rounded square with the logo tile's corner ratio (21.9%) grows from a coral thing in scene A (in-cubic,
10 f) until it covers the frame, the cut happens under it, and it shrinks with expo-out (10 f) onto the coral thing in
scene B. **The locked script uses no coral floods** (its world is Day, with Night only for C1), so keep this for
social cut-downs or a director's request. The code (`tileIris`) is in §5.

### 2.8 Ink-line draw-ons

`evolvePath` with round caps and joins, in ink, or in the state colour for check marks. **Nothing renders at progress
0**, because a zero-length round-capped dash paints a dot. Widths at video scale: connectors 8 px, underlines and
circles 10 px, check marks 12/100 of their box. Durations: check 8 f (`out`) then a 15% `pop`; underline 10 f;
connector 14–18 f (in-out cubic); circling a word 16 f. **The pen leads:** for anything outlined and filled (the S,
an outlined arrow), the ink draws first and the fill follows 3 f behind. Use draw-ons for: Clean history and Sent
checks, the card → three addresses connectors, circling the one word that matters, and pointing arrows.

```tsx
// brand2/ink.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { clamp, EASE2, SPRING2 } from "./motion";

/** An ink line that draws itself: round caps and joins, nothing rendered at progress 0 (no stray cap dot). */
export const DrawOn: React.FC<{ d: string; progress: number; width: number; color?: string }> = ({
  d,
  progress,
  width,
  color = C.ink,
}) => {
  if (progress <= 0.001) return null;
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.min(1, progress), d);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};

/** A check mark in a 100 × 100 box: drawn in 8 f, then the whole mark pops 15% (SPRING2.pop). */
export const CheckMark: React.FC<{ size: number; color?: string }> = ({ size, color = C.success }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, 8], [0, 1], { ...clamp, easing: EASE2.out });
  const pop = 1 + 0.15 * (1 - spring({ frame: frame - 8, fps, config: SPRING2.pop })) * (frame >= 8 ? 1 : 0);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible", scale: `${pop}` }}>
      <DrawOn d="M22 54 L42 72 L78 32" progress={p} width={12} color={color} />
    </svg>
  );
};
```

### 2.9 Kinetic type

**The fonts, checked in the files.** `FunnelDisplay-VF.ttf` (v1.000) has a **single axis, wght 300–800**, default
300, with named instances Light to ExtraBold. It has **no wdth and no opsz**, so the old width-squeeze and
optical-size morphs are gone. It has `tnum`, `case` and `frac`. `Onest-VF.ttf` (v2.001) has wght 100–900 and `tnum`,
`ss01`, `ss02`. `GeistMono-VF.ttf` (v1.701) has wght 100–900. The brand canvases load Funnel Display at 500–800 from
Google Fonts.

| Role | Font, weight | Size (1080p) | Tracking, leading |
|---|---|---|---|
| Caption (sentence case; the film's headlines) | Funnel Display 800 | **110–160 px** (brief, world bible) | −0.035em, 0.95 |
| Hero word (rare: a verdict, the end line) | Funnel Display 800 | up to 220 px | −0.04em, 0.92 |
| Title or Satchel name | Funnel Display 750 | 90–120 px | −0.02em |
| Must-read line | Onest 600 | **≥ 56 px** (64–80 preferred) | 0, 1.12 |
| Accounts, addresses, hashes | Geist Mono 500 | ≥ 56 px if must-read; middle-truncated | 0 |
| Numbers | Funnel Display 800, `tabular-nums` | as headline | −0.03em |

**Moves:**
- **Caption slap.** Every caption: scale 1.2 → 1 with a ±2° tilt, landing on a VO word (`CaptionSlap`, §2.16).
- **Word slap.** For word-by-word lines such as H2's "Bitcoin. Ethereum. Solana.": one word per beat or VO word,
  scale 1.28 → 1, squash 6% on contact, and the "ink fills in" as weight goes from 600 to 800 over f2–f9.
- **Line rise.** The reading workhorse: each line rises out of its own mask in 16 f, with a 3 f stagger and no bounce.
- **Marker.** A lemon swash behind one word, wiped in over 10 f. Ink on lemon is 12.5:1.
- **Sticker label.** A key word set on a white pill sticker that slaps in (§2.1).
- **Type-on.** For accounts in Geist Mono only: string slicing, 2 f per character, caret solid while typing, then a
  16 f blink.

Animate weight only on words in their own inline-block, because weight changes the advance widths. Never animate
per-character opacity (skill rule). Never use italics, all caps, skew, outline-only type or gradient fills.
`backOut` is fine for a single label; use springs for everything spatial.

```tsx
// brand2/type.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./tokens";
import { clamp, EASE2, slapAt, SPRING2 } from "./motion";

// Funnel Display's variable file has one axis, wght 300–800 (no wdth, no opsz). Display type lands at 800.
// With a weight range declared in loadFont(), numeric fontWeight interpolates; it changes advance widths,
// so animate weight only on words that are centred in their own inline-block.

/** Words slap in one per `every` frames (15 = one beat at 120 BPM). Scale 1.28 → 1, squash on contact, ink-in. */
export const WordSlap: React.FC<{ text: string; every?: number; size?: number; color?: string }> = ({
  text,
  every = 15,
  size = 160,
  color = C.ink,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.24em", fontFamily: FONT.display, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.035em", color }}>
      {text.split(" ").map((word, i) => {
        const f = frame - i * every;
        const { sx, sy, opacity } = slapAt(f, fps, 0, { from: 1.28, squash: 0.06, drop: 0 });
        const weight = interpolate(f, [2, 9], [600, 800], { ...clamp, easing: EASE2.out }); // the ink fills in as it lands
        return (
          <span key={i} style={{ display: "inline-block", opacity, scale: `${sx} ${sy}`, transformOrigin: "50% 80%", fontWeight: weight }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** The reading workhorse: each line rises out of its own mask. 16 f per line, 3 f stagger, no bounce. */
export const LineRise: React.FC<{ lines: string[]; size?: number; weight?: number; font?: string; stagger?: number }> = ({
  lines,
  size = 64,
  weight = 600,
  font = FONT.sans,
  stagger = 3,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, lineHeight: 1.12, color: C.ink }}>
      {lines.map((line, i) => {
        const y = interpolate(frame, [i * stagger, i * stagger + 16], [110, 0], { ...clamp, easing: EASE2.out });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em" }}>
            <div style={{ translate: `0 ${y}%` }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** A lemon marker swipe behind a word (ink text on lemon is 12.5:1). Wipes left → right in 10 f. */
export const Marker: React.FC<{ children: React.ReactNode; at?: number }> = ({ children, at = 0 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: EASE2.out });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ position: "absolute", left: "-0.08em", right: "-0.08em", top: "18%", bottom: "4%", background: C.lemon, borderRadius: "0.16em", scale: `${p} 1`, transformOrigin: "0 50%" }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** Integer counter: tabular figures, every new integer pops 8% (put a pitched-up tick SFX on each change). */
export const Counter: React.FC<{ to: number; dur?: number; size?: number; suffix?: string }> = ({ to, dur = 24, size = 200, suffix = "" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const valueAt = (f: number) => Math.round(interpolate(f, [0, dur], [0, to], { ...clamp, easing: EASE2.out }));
  const n = valueAt(frame);
  let changedAt = frame; // walk back to the frame where this integer first showed
  while (changedAt > 0 && valueAt(changedAt - 1) === n) changedAt--;
  const pop = 1 + 0.08 * (1 - spring({ frame: frame - changedAt, fps, config: SPRING2.quick }));
  return (
    <span style={{ display: "inline-block", fontFamily: FONT.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: C.ink, scale: `${pop}` }}>
      {n}
      {suffix}
    </span>
  );
};

/** An account or address typed in Geist Mono: string slicing (never per-character opacity), 2 f per character. */
export const TypeOn: React.FC<{ text: string; perChar?: number; size?: number }> = ({ text, perChar = 2, size = 56 }) => {
  const frame = useCurrentFrame();
  const shown = text.slice(0, Math.max(0, Math.floor(frame / perChar)));
  const caretOn = Math.floor(frame / 8) % 2 === 0 || shown.length < text.length; // solid while typing, 16 f blink after
  return (
    <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: size, color: C.ink }}>
      {shown}
      <span style={{ opacity: caretOn ? 1 : 0 }}>|</span>
    </span>
  );
};
```

### 2.10 Number counters

`Counter` (in `type.tsx` above) counts with `out` over `dur` frames. Each time the integer changes it pops 8% on
`quick`, with `tick-soft` or a `bubble-tick-run` under the whole count.
- **Integers** (signatures, records) count with a pop per step. The history count never changes on screen: #7 reads
  "3 signatures" from T0 to T7.
- **Amounts** use the script's numbers exactly (SCRIPT-v3 "Numbers": fill 0.0513 BTC · 0.90 ETH · 13.65 SOL; sends
  0.0100 · 0.05 · 1.25; after 0.0412 · 0.85 · 12.4; the price 4,750.00 USDC), in tabular figures with fixed decimals
  per value. Only **P2's fill tags count up** (scripted). Run them 20–24 f with `out`, round to the tag's decimals
  every frame so the digits never jitter, end on the exact value with an 8% pop and `coin-ding`, and play
  `bubble-tick-run` under the count. Everywhere else amounts slap in at their final value; they are facts, not scores.
- No fiat, ever. A "0" result (the drained ETH tag in C1) pops one extra time.

### 2.11 UI micro-interactions

- **Primary button press:** §2.3. Coral fill, ink label, a 2k ink outline and a 4k hard shadow.
- **Toggle:** the knob travels on `quick` and stretches like a jelly bean mid-travel (×1.28 along the track, area
  kept). The track colour moves on `fade`. A tick SFX lands at at+2.
- **Pill swap:** for status words. The width springs (`land`) between measured label widths. The old word rolls up
  and out in 6 f (`fall`) and the new word rolls in over f2–f10 (`out`); the dot and text colour cross-fade on
  `fade`. Status always pairs an icon or dot with a word: Sent (success), **Paused for sale** (frozen, with the
  snowflake turning exactly 60°, which looks identical), Needs attention (danger).
- **Toast "Sent":** slaps in from the bottom (drop 28 px) on `coral-soft`, which is a tint and does not count as the
  coral. The check draws on, then the success chime plays.
- **Copy address:** the mono chip pops 4% (`pop`) and a pill swap shows "Copied".
- **Tap and cursor:** in v3 a sticker hand or thumb does the tapping (§2.15): it arrives 6 f before the press and
  squashes 4% on `at`. Without a hand, use a tap dot (a white 56 px circle with the outline weight in ink) that pops
  in 6 f early and shrinks out after. On the browser page (T5, carol), a Lucide pointer at stroke 2k travels on curved
  `pan` arcs, never in straight lines.

```tsx
// brand2/ui.tsx (part 2 of 2: toggle and pill swap)
/** Toggle: the knob travels on SPRING2.quick and stretches like a jelly bean mid-travel; colour uses the fade spring. */
export const Toggle: React.FC<{ at: number; k?: number; onColor?: string }> = ({ at, k = 2.5, onColor = C.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = 52 * k;
  const h = 32 * k;
  const knob = 24 * k;
  const pad = (h - knob) / 2;
  const p = spring({ frame: frame - at, fps, config: SPRING2.quick });
  const c = spring({ frame: frame - at, fps, config: SPRING2.fade });
  const stretch = 1 + 0.28 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: h, background: interpolateColors(c, [0, 1], [C.sunken, onColor]), border: `${Math.round(2 * k)}px solid ${C.ink}`, boxSizing: "border-box" }}>
      <div
        style={{
          position: "absolute",
          top: pad - 2 * k,
          left: pad - 2 * k + p * (w - h),
          width: knob,
          height: knob,
          borderRadius: knob,
          background: C.surface,
          border: `${Math.round(2 * k)}px solid ${C.ink}`,
          boxSizing: "border-box",
          scale: `${stretch} ${1 / stretch}`,
        }}
      />
    </div>
  );
};

/** Status pill swap: width springs (land) between the two labels, the old label rolls up and out, the new rolls in. */
export const PillSwap: React.FC<{
  from: { label: string; color: string };
  to: { label: string; color: string };
  at: number;
  k?: number;
}> = ({ from, to, at, k = 2.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontSize = 13 * k;
  const text = { fontFamily: FONT.sans, fontWeight: 600, fontSize } as const;
  const wA = measureText({ text: from.label, ...text }).width;
  const wB = measureText({ text: to.label, ...text }).width;
  const s = spring({ frame: frame - at, fps, config: SPRING2.land });
  const out = interpolate(frame, [at, at + 6], [0, -110], { ...clamp, easing: EASE2.fall });
  const inn = interpolate(frame, [at + 2, at + 10], [110, 0], { ...clamp, easing: EASE2.out });
  const color = interpolateColors(spring({ frame: frame - at, fps, config: SPRING2.fade }), [0, 1], [from.color, to.color]);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 * k, padding: `${6 * k}px ${12 * k}px`, borderRadius: 999, background: C.sunken, color, ...text }}>
      <span style={{ width: 8 * k, height: 8 * k, borderRadius: 999, background: color }} />
      <span style={{ position: "relative", height: "1.25em", width: interpolate(s, [0, 1], [wA, wB]), overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, translate: `0 ${out}%`, whiteSpace: "nowrap" }}>{from.label}</span>
        <span style={{ position: "absolute", left: 0, translate: `0 ${inn}%`, whiteSpace: "nowrap" }}>{to.label}</span>
      </span>
    </div>
  );
};
```

```tsx
// usage.tsx (E): "Paused for sale" — the snowflake turns exactly 60° (six-fold, so it lands on itself)
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Snowflake } from "lucide-react";
import { C } from "./brand2/tokens";
import { SPRING2 } from "./brand2/motion";

export const FrozenIcon: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turn = 60 * spring({ frame: frame - at, fps, config: SPRING2.quick });
  return <Snowflake size={size} strokeWidth={2} color={C.frozen} style={{ rotate: `${turn}deg` }} />;
};
```

### 2.12 Camera in a flat sticker world

The camera is a window over a flat board. It may **pan** (truck), **push or pull** (scale about a focus point) and
show **2.5D parallax** between flat planes. It may not rotate (no dutch angles), tilt in 3D, rack focus, blur or shake
sideways.
- **Board pan:** lay a chapter out on one big board and move between areas in 14–16 f with `pan` ("fly, don't
  teleport"). Stickers moving faster than 120 px/f get a **smear**: a stretch along the motion of up to 1.25, area
  kept, for their fastest 2–4 frames. Optionally add two 4 px ink speed lines for 3 f. This replaces motion blur.
- **Parallax:** depth 0.5 (back sheet of small stickers), 1 (subject) and 1.4–1.6 (foreground charms). Travel
  120–240 px over 2–3 s on `pan`; translate only.
- **Push-in on a hold:** at most 2% scale per second (`pan`). **Punch-in on a beat:** 1 → 1.12 in 8 f (`out`), never
  while text is being read.
- **Follow:** when the camera follows a moving sticker (the hand-off), it lags on `carry`, so the object leads the
  frame.
- **Impact thump:** on the heaviest contacts only (the logo slap, the hand-off landing, Buy unlocking), the whole
  frame drops 6 px and recovers in 5 f. Vertical only, at most 3 times in the film.

```tsx
// brand2/camera.tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE2 } from "./motion";

/**
 * 2.5D parallax of flat layers. depth 0.5 = far, 1 = subject, 1.4–1.6 = near (foreground stickers, charms).
 * Layers translate only (no perspective, no blur): a flat sticker world seen through a moving window.
 */
export const Parallax2D: React.FC<{
  layers: { node: React.ReactNode; depth: number }[];
  camX: (f: number) => number;
  camY?: (f: number) => number;
}> = ({ layers, camX, camY }) => {
  const frame = useCurrentFrame();
  const x = camX(frame);
  const y = camY ? camY(frame) : 0;
  return (
    <AbsoluteFill>
      {layers.map(({ node, depth }, i) => (
        <AbsoluteFill key={i} style={{ translate: `${-x * depth}px ${-y * depth}px` }}>
          {node}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

/** Slow drift on a hold (at most 2% scale per second) or a punch-in on a beat (1 → 1.12 in 8 f). */
export const PushIn: React.FC<{
  from?: number;
  to?: number;
  dur: number;
  focus?: string; // transform-origin, e.g. "62% 40%": the point that must not move
  punch?: boolean;
  children: React.ReactNode;
}> = ({ from = 1, to = 1.04, dur, focus = "50% 50%", punch = false, children }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [from, to], { ...clamp, easing: punch ? EASE2.out : EASE2.pan });
  return <AbsoluteFill style={{ scale: `${s}`, transformOrigin: focus }}>{children}</AbsoluteFill>;
};
```

```tsx
// usage.tsx (B, G): a smeared sticker on a pan, and the impact thump
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE2, smear } from "./brand2/motion";

export const SmearMove: React.FC<{ fromX: number; toX: number; dur: number; children: React.ReactNode }> = ({ fromX, toX, dur, children }) => {
  const frame = useCurrentFrame();
  const xAt = (f: number) => interpolate(f, [0, dur], [fromX, toX], { ...clamp, easing: EASE2.pan });
  const { along, across } = smear(xAt(frame) - xAt(frame - 1)); // px per frame → stretch ≤ 1.25
  return <div style={{ position: "absolute", left: 0, top: 0, translate: `${xAt(frame)}px 0`, scale: `${along} ${across}` }}>{children}</div>;
};

export const Thump: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame - at, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });
  return <AbsoluteFill style={{ translate: `0 ${y}px` }}>{children}</AbsoluteFill>;
};
```

### 2.13 Lemon sparkles and confetti (sparingly)

- **Sparkles:** 4-point lemon sparks with an ink outline (`makeSpark` from `@remotion/shapes`). A burst is 3–5 sparks
  on a ring around the hero, each popping on `pop`, shrinking out by f16, turning 0 → 30°, staggered 2 f. Use **at
  most 4 bursts in the film:** mint, clean-history result, hand-off landing, end card. The SFX is a glassy shimmer.
- **Confetti:** **once** (the end card or the clean-history payoff, not both). 18 flat pieces (rounded rectangles and
  dots) in lemon, sky and white with 4 px ink outlines, **never coral**. They launch upward at 26–42 px/f with
  gravity 1.6 px/f², flutter, and scale in and out (no opacity fades) over a 32 f life.

```tsx
// brand2/fx.tsx
import React from "react";
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { makeSpark } from "@remotion/shapes";
import { C } from "./tokens";
import { clamp, SPRING2 } from "./motion";

/**
 * Lemon sparkles: 4-point sparks with an ink outline, popped around a point. 3–5 per burst, 16 f each,
 * staggered 2 f. Max 4 bursts in the film (mint, clean history, the hand-off landing, the end card).
 * Render inside an <svg> in frame pixels.
 */
export const SparkBurst: React.FC<{ x: number; y: number; radius: number; count?: number; seed: string; size?: number }> = ({
  x,
  y,
  radius,
  count = 4,
  seed,
  size = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const f = frame - 2 * i;
        const angle = (i / count) * Math.PI * 2 + random(`${seed}-a${i}`) * 0.9;
        const r = radius * (0.85 + 0.3 * random(`${seed}-r${i}`));
        const s = size * (0.7 + 0.5 * random(`${seed}-s${i}`));
        const grow = spring({ frame: f, fps, config: SPRING2.pop });
        const shrink = interpolate(f, [9, 16], [1, 0], clamp);
        const scale = Math.max(0, grow * shrink);
        const spark = makeSpark({ width: s, height: s, edgeRoundness: 1.1, cornerRadius: s * 0.04 });
        const px = x + Math.cos(angle) * r - s / 2;
        const py = y + Math.sin(angle) * r - s / 2;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${interpolate(f, [0, 16], [0, 30], clamp)} ${s / 2} ${s / 2}) translate(${(s / 2) * (1 - scale)} ${(s / 2) * (1 - scale)}) scale(${scale})`}>
            <path d={spark.path} fill={C.lemon} stroke={C.ink} strokeWidth={5 / Math.max(scale, 0.01)} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};

/** Flat confetti in lemon, sky and white with ink outlines (never coral). Deterministic, 32 f lifetime. */
export const Confetti: React.FC<{ x: number; y: number; count?: number; seed: string }> = ({ x, y, count = 18, seed }) => {
  const frame = useCurrentFrame();
  const colors = [C.lemon, C.sky, C.surface];
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const t = frame;
        const a = -Math.PI / 2 + (random(`${seed}-dir${i}`) - 0.5) * 1.8; // upward fan
        const v = 26 + 16 * random(`${seed}-v${i}`); // px per frame
        const g = 1.6; // px per frame^2
        const px = x + Math.cos(a) * v * t + 10 * Math.sin(t * 0.35 + i); // flutter
        const py = y + Math.sin(a) * v * t + 0.5 * g * t * t;
        const rot = t * (8 + 10 * random(`${seed}-rot${i}`));
        const alive = interpolate(t, [0, 1, 26, 32], [0, 1, 1, 0], clamp); // scale in/out, no opacity fades
        const fill = colors[i % colors.length];
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot}) scale(${alive})`}>
            {i % 3 === 0 ? (
              <circle r={8} fill={fill} stroke={C.ink} strokeWidth={4} />
            ) : (
              <rect x={-12} y={-7} width={24} height={14} rx={5} fill={fill} stroke={C.ink} strokeWidth={4} />
            )}
          </g>
        );
      })}
    </g>
  );
};
```

### 2.14 Sticker-sheet layouts

Use a sheet for "what's inside", feature lists and states. Layout: a loose grid (3 × 2 or 4 × 3) on the Day ground or
on a white sheet card (radius 28k with outline and shadow). Gutters are 56–64 px. Each sticker gets a seeded tilt of
±4°, **except the mark, the sticker S and the wordmark**, which are never tilted. Sizes vary 0.8–1.2× for rhythm.
Stickers slap on in reading order, 3 f apart (or in seeded order, 2–4 f apart), and the sheet holds for at least one
beat. To leave a sheet, peel one sticker off (§2.2) and let the camera follow it into the next scene. Words on
stickers are Onest 700 at ≥ 56 px; accounts are Geist Mono.

```tsx
// usage.tsx (D): a sticker sheet
import React from "react";
import { AbsoluteFill, random, Sequence } from "remotion";
import { C, FONT, stroke } from "./brand2/tokens";
import { SlapIn } from "./brand2/Sticker";

export const StickerSheet: React.FC<{ labels: string[]; cols?: number }> = ({ labels, cols = 3 }) => {
  const { outline, shadow } = stroke(2.5);
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`, gap: "64px 56px", alignItems: "center" }}>
        {labels.map((label, i) => (
          <div key={label} style={{ rotate: `${(random(`tilt-${label}`) - 0.5) * 8}deg`, justifySelf: "center" }}>
            <Sequence from={i * 3} layout="none">
              <SlapIn padding="36px 48px" fill={C.surface} outline={outline} rest={shadow} radius={40}>
                <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 56, color: C.ink }}>{label}</span>
              </SlapIn>
            </Sequence>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

### 2.15 Character actions (charms, hands, the card)

**Anticipation rule:** every strong action gets a wind-up of 3–6 f in the opposite direction, at 25–50% of the
action's size, and then accelerates into it (`fall`). Charms react in personality order: SOL first, ETH +2 f,
BTC +4 f.

| Action (scene) | Numbers | SFX |
|---|---|---|
| **Snap-on** (H1, P1) | The charm falls from above with its eyes closed and a 3 f smear. It snaps onto its hook with a 0.85 squash and swings on its personality spring, released at about 12°. The eyes pop open 2 f later. One per beat in H1 (f5 / f15 / f25); 6 f apart for P1's quicker echo. SOL overshoots its hook by 40 px and springs back | `pop`, `pop-high` for SOL |
| **Wiggle on its name** (H2) | A ±8° pluck on its own spring on the word's onset (`getScene("H2").word(…)`). BTC wiggles, ETH tilts its head, SOL hops 12 px on `pop` | `tick-soft` |
| **Gulp** (P2) | `gulpScale`: stretch up 1.08 (3 f), squash 0.85 × 1.15 as the coin goes in (2 f), cheeks puffed 1.1 wide (4 f), settle by f14 | `pop` + `coin-ding` |
| **Flick** (P3) | `flickAngle`: wind back −15° (4 f), snap to +20° (2 f; the coin launches on f6 on an arc, out of frame in 8 f with a smear), home on its spring. SOL flicks fastest | `whoosh-zip` |
| **Side-eye** (P4) | Eyes look at the stranger (look 1) with lids at 55% (`open` 0.55), held, one slow blink | none |
| **Giggle** (T2) | **Motion only** (amendment A3): two 4 px bobs in 10 f, eyes as closed arcs. No voice | none |
| **Bonk / stamp** (T5, T6) | `bonkAngle`: wind back −25° (6 f), strike to +55° (3 f, ease-in), contact = the V23 phrase onset, then home on its personality spring; the stamp slaps on at contact (§2.16) | `stamp-thunk`, `success-marimba` 2 f later |
| **Cheer** (T5, T7, E1) | Smile 1.6, eyes as closed arcs for 6 f, a 12 px hop on `pop`, in reaction order | `sparkle` (one of the 4 bursts) |
| **Concern** (C1) | Smile → 0 on `land`, eyes dart (3 f) to the threat, one long blink (3 / 2 / 4 f). The drained ETH charm goes "o" and its fill fades to grey | `tension-tick` bed |
| **ETH head tilt** | `headTilt`: ±6° about the coin centre, in on `quick`, held while it looks, out on `land` | none |
| **No-wobble** (P4) | `noWobbleX`: the card shakes sideways ±12 px, 3 swings in 12 f, decaying. **Translate only**: the card carries the S, so it never rotates for a "no" | `error-boop` |
| **Leap** (P1) | The card crouches (scaleY 0.92, 3 f), jumps out of the phone on a 14 f arc stretching 1.06 along the motion on its 3 fastest frames, and lands with the slap (§2.1). The charms snap on 6 f apart | `swoop-up`, `sticker-slap` |
| **Sticky note that won't stick** (P4) | It slaps (contact), holds 2 f, then slides down with gravity (`fall`), turns up to 12° (a note may rotate) and drops out of frame in 12 f | `paper-slide`, `swoop-down` |
| **Slide off the frost** (T4) | The hand's tap skids 80 px sideways on `out` with a 5° roll: the film's one deliberate glide, because frost is slippery | `whoosh-soft` |

**Hands** (world bible): flat sticker hands share one neutral fill and an ink outline. The sleeve and a small mono
name tag tell them apart: alice lemon, bob sky, carol white with ink stripes, the seller's sleeve ink, the stranger's
grey, the team's plain with a "satchelhq" tag.
- **Enter** from the frame edge on a shallow arc in 10–12 f (`land`, no bounce). Hands are calm; the stickers are the
  stars.
- **Pinch or press:** the fingers squash 4% on the contact frame.
- **Carry:** the card hangs from the hand's grip point (`transformOrigin` at the grip).
- **Catch:** the receiving hand rises 6 px 2 f before contact, dips 8 px on contact and recovers on `rebound`.
- **Exit:** accelerate out (`fall`, 8 f).
- **Wave** (P5): ±12° about the wrist, 3 swings in 18 f.

### 2.16 The script's props in motion: records, stamps, frost, the Night blind, the flip, captions

- **Record outlines** (T0, T1, T5, T6): the card's back has dashed outlines, 2k px ink with dash 8k / 6k (world
  bible), each holding a chain dot and a Geist Mono label (`ETH · nonce 1`). In T1 one outline **draws itself dash by
  dash** in 16 f (`RecordOutline`, reveal quantised to whole dashes, `pen-scribble`). The label then types at 2 f per
  character (`type-run`), the signing pill pulses "Signing with NEAR's signer network · Usually about 10 seconds"
  (`frozen`, a 1.0 → 1.04 scale breath every 15 f), and "Signed" prints in. The signature sticker peels out and flies
  toward Ethereum (`sticker-peel`, `whoosh-zip`), leaving the outline behind. T6's blocked outline is `danger`.
- **Stamps** (T5): on each V23 phrase onset (markers: "Nonce used." 104.12 s, "Coin spent." 105.58 s, "Blockhash
  expired." 107.12 s), its charm bonks its outline (§2.15) and the `Stamp` slaps on: scale 1.25 → 1, 6% squash, tilt
  −7° → −4° (stamps may sit askew; the logo never does), the ink spreads 1.4× → 1× in 3 f, success colour.
  `stamp-thunk` lands on the contact frame.
- **Frost laminate** (T4) and **melt** (T7): flat, never glass, and never `backdrop-filter`. It is sky at 35% with two
  flat white stripes at 45%. It wipes in left → right in 10 f like a squeegee (`freeze-chime` at the start), then the
  "Paused for sale" pill pops (`pop`; the snowflake turns exactly 60°, §2.11). The history header frosts over at
  "3 signatures". The melt wipes top → bottom in 8 f while three sky droplets (ink-outlined) fall 30 px and pop.
  **No countdown or timer anywhere after listing.**
- **Night falls** (C1): one roller blind from the top. The Night sheet's edge falls in 18 f (`fall`) on the music stop
  (marker `musicStop`, 58.0 s), lands with a 2% bounce, and casts a hard 10 px black shadow onto the Day frame below
  it.
- **The flip** (T0 at the `flip` marker, 73.0 s; back to the front in T7): **the film's one 3D move.**
  - rotateY 0 → 180° on `quick` (overshoots to about 196°, settles in 10 f), perspective 2400 px, scale 1.06
    edge-on. Faces swap at 90° with `backface-visibility: hidden`. No lighting, gloss or shading.
  - The card lifts 12 px before the flip and slaps down after it.
  - `whoosh-soft` peaks on the 90° frame.
  - **Day sweeps back with the rotation:** the Day wipe's edge sits at x = (θ / 180) × width, moving in the flip's
    direction. In T7 the reverse flip (180° → 360°) runs inside the hand-off and the frost melts as it turns.
- **Caption slap** (all captions): Funnel Display 800, sentence case, 110–160 px, ink (#f4f2ff on Night). Scale
  1.2 → 1 with contact on f4 and a seeded tilt within ±2°. **Only the hook and end captions** get the sticker
  treatment: a white fill, an ink outline and a hard shadow that snaps 0 → 8 px on contact. Hold each caption at
  least 0.8 s + 0.25 s per word after it lands. To leave, a caption peels (`sticker-peel`) or is slapped over by the
  next one.

```tsx
// brand2/script.tsx
// Moves the locked v3 script needs (concepts-v2 §4.1, §4.3): records, stamps, frost, the Night blind, the flip,
// caption slaps and charm actions. Numbers at 30 fps; px are video px unless a k (UI → video scale) is passed.
import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath, getLength } from "@remotion/paths";
import { makeRect } from "@remotion/shapes";
import { C, FONT } from "./tokens";
import { clamp, EASE2, slapAt, SPRING2 } from "./motion";

// ---------------------------------------------------------------------------------------------
// 1. A record outline that draws itself, dash by dash (the card's back: 2 px ink, dash 8/6 at UI scale).
//    The dash pattern sits on the visible path and the reveal in a mask, so the two never fight; the reveal is
//    quantised to whole dashes. With round caps, draw [8 - w, 6 + w] so the visible dash stays 8/6.
// ---------------------------------------------------------------------------------------------
export const RecordOutline: React.FC<{ w: number; h: number; k: number; progress: number; id: string; color?: string }> = ({
  w,
  h,
  k,
  progress,
  id,
  color = C.ink,
}) => {
  const sw = 2 * k;
  const dash: [number, number] = [8 * k - sw, 6 * k + sw];
  const { path } = makeRect({ width: w, height: h, cornerRadius: 12 * k });
  if (progress <= 0.001) return null;
  const len = getLength(path);
  const pitch = dash[0] + dash[1];
  const shown = Math.min(len, Math.ceil((progress * len) / pitch) * pitch);
  const reveal = evolvePath(shown / len, path);
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-w} y={-h} width={3 * w} height={3 * h}>
          <path d={path} fill="none" stroke="#fff" strokeWidth={sw * 4} strokeDasharray={reveal.strokeDasharray} strokeDashoffset={reveal.strokeDashoffset} />
        </mask>
      </defs>
      <path d={path} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dash.join(" ")} mask={`url(#${id})`} />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// 2. The stamp (T5): a charm winds back, swings up and bonks its outline; the stamp slaps on at contact.
//    contact = the V23 phrase onset. Charm: -25° wind-up (6 f, out), strike to +55° (3 f, in), then its
//    personality spring brings it home. Stamp: scale 1.25 → 1 with a 6% squash, tilt -7° → -4°, ink spreads
//    (stroke 1.4× → 1× in 3 f). SFX stamp-thunk on contact, success-marimba 2 f later.
// ---------------------------------------------------------------------------------------------
export const STAMP = { windUp: 6, strike: 3 } as const; // the bonk starts STAMP.windUp + STAMP.strike before contact

export const bonkAngle = (f: number, contact: number, homeSpring: { mass: number; stiffness: number; damping: number }, fps: number) => {
  const start = contact - STAMP.windUp - STAMP.strike;
  if (f < start + STAMP.windUp) return interpolate(f, [start, start + STAMP.windUp], [0, -25], { ...clamp, easing: EASE2.out });
  if (f < contact) return interpolate(f, [start + STAMP.windUp, contact], [-25, 55], { ...clamp, easing: EASE2.fall });
  return spring({ frame: f - contact, fps, from: 55, to: 0, config: homeSpring });
};

export const Stamp: React.FC<{ word: string; contact: number; k: number; color?: string }> = ({ word, contact, k, color = C.success }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < contact) return null;
  const { sx, sy } = slapAt(frame - contact + 4, fps, 0, { from: 1.25, squash: 0.06, drop: 0 }); // enters at its contact frame
  const tilt = interpolate(frame - contact, [0, 6], [-7, -4], { ...clamp, easing: EASE2.out });
  const spread = interpolate(frame - contact, [0, 3], [1.4, 1], clamp);
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${4 * k}px ${12 * k}px`,
        border: `${2 * k * spread}px solid ${color}`,
        borderRadius: 10 * k,
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: 15 * k,
        color,
        scale: `${sx} ${sy}`,
        rotate: `${tilt}deg`,
        whiteSpace: "nowrap",
      }}
    >
      {word}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// 3. Frost laminate (T4) and its melt (T7): a flat sheet, never glass. Sky at 35% + two flat white stripes at
//    45%, the card's radius, a squeegee wipe left → right in 10 f (out) on freeze-chime; melt = wiped off top →
//    bottom in 8 f (fall) while three droplets drop 30 px and pop.
// ---------------------------------------------------------------------------------------------
export const FrostLaminate: React.FC<{ w: number; h: number; radius: number; inAt: number; meltAt?: number; k: number }> = ({
  w,
  h,
  radius,
  inAt,
  meltAt,
  k,
}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [inAt, inAt + 10], [100, 0], { ...clamp, easing: EASE2.out }); // % hidden on the right
  const melt = meltAt === undefined ? 0 : interpolate(frame, [meltAt, meltAt + 8], [0, 100], { ...clamp, easing: EASE2.fall });
  const drops = meltAt === undefined ? [] : [0.25, 0.55, 0.8];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          overflow: "hidden",
          clipPath: `inset(${melt}% ${wipe}% 0 0)`,
          background: "rgba(143, 211, 255, 0.35)",
        }}
      >
        <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: "18%", width: "12%", background: "rgba(255,255,255,0.45)", rotate: "28deg" }} />
        <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: "36%", width: "5%", background: "rgba(255,255,255,0.45)", rotate: "28deg" }} />
      </div>
      {drops.map((x, i) => {
        const t = frame - (meltAt ?? 0) - 2 * i;
        const y = interpolate(t, [0, 10], [h * 0.9, h * 0.9 + 30 * (k / 2.5)], { ...clamp, easing: EASE2.fall });
        const s = interpolate(t, [0, 1, 9, 12], [0, 1, 1, 0], clamp);
        return <div key={i} style={{ position: "absolute", left: w * x, top: y, width: 12 * k, height: 12 * k, borderRadius: 99, background: C.sky, border: `${k}px solid ${C.ink}`, scale: `${s}` }} />;
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// 4. Night falls (C1): a roller blind from the top. The Night sheet's edge falls 0 → H in 18 f (fall) on the
//    music stop and lands with a 2% bounce (rebound); its edge casts a hard 10 px black shadow onto the Day frame.
// ---------------------------------------------------------------------------------------------
export const NightBlind: React.FC<{ at: number; night?: string }> = ({ at, night = "#120c26" }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const drop = frame < at + 18
    ? interpolate(frame, [at, at + 18], [0, 1], { ...clamp, easing: EASE2.fall })
    : 1 + 0.02 * Math.sin(Math.PI * Math.min(1, spring({ frame: frame - at - 18, fps, config: SPRING2.rebound })));
  const edge = Math.min(height + 12, drop * height);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: edge, background: night, boxShadow: `0 10px 0 #000000` }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 5. The flip (T0, and back in T7): the film's one 3D move. rotateY 0 → 180° on SPRING2.quick (it overshoots to
//    about 196° and settles in 10 f), perspective 2400 px, the card lifts 12 px before and slaps down after,
//    scale 1.06 at edge-on, faces swap at 90°, no lighting or gloss. whoosh-soft peaks on the 90° frame.
//    Day sweeps back with the rotation: the Day wipe's edge x = (θ / 180) · width, in the flip's direction.
// ---------------------------------------------------------------------------------------------
export const flipAt = (f: number, at: number, fps: number) => {
  const p = spring({ frame: f - at, fps, config: SPRING2.quick }); // 0 → 1 (+9%)
  const deg = 180 * p;
  const rad = (deg * Math.PI) / 180;
  return { deg, back: Math.cos(rad) < 0, scale: 1 + 0.06 * Math.abs(Math.sin(rad)), dayWipe: Math.min(1, Math.max(0, deg / 180)) };
};

export const FlipCard: React.FC<{ at: number; w: number; h: number; front: React.ReactNode; back: React.ReactNode }> = ({ at, w, h, front, back }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = flipAt(frame, at, fps);
  return (
    <div style={{ width: w, height: h, perspective: 2400 }}>
      <div style={{ width: w, height: h, transformStyle: "preserve-3d", transform: `rotateY(${m.deg}deg) scale(${m.scale})` }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>{front}</div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>{back}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// 6. Caption slap (concepts-v2 §4.1): Funnel Display 800, sentence case, 110–160 px. Scale 1.2 → 1, contact f4,
//    a seeded tilt within ±2° (captions only, never the logo). Hook and end captions get the sticker treatment:
//    white fill, ink outline, and a hard shadow that snaps 0 → 8 px on contact. Others are plain ink.
// ---------------------------------------------------------------------------------------------
export const CaptionSlap: React.FC<{ text: string; size?: number; sticker?: boolean; seed: string; color?: string }> = ({
  text,
  size = 140,
  sticker = false,
  seed,
  color = C.ink,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, sy, opacity } = slapAt(frame, fps, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const tilt = (random(`caption-${seed}`) - 0.5) * 4; // −2° … +2°
  const shadow = frame >= 4 ? 8 : 0;
  return (
    <div
      style={{
        display: "inline-block",
        fontFamily: FONT.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.035em",
        color,
        opacity,
        scale: `${sx} ${sy}`,
        rotate: `${tilt}deg`,
        ...(sticker
          ? { background: C.surface, border: `6px solid ${C.ink}`, borderRadius: 28, padding: "0.12em 0.32em 0.18em", boxShadow: `0 ${shadow}px 0 ${C.ink}` }
          : {}),
      }}
    >
      {text}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// 7. Charm and card actions (keyframes; f = frames since the action starts).
// ---------------------------------------------------------------------------------------------
/** "No" wobble (P4): the card shakes sideways, never rotates (its band carries the S). ±12 px, 3 swings, 12 f. */
export const noWobbleX = (f: number) => (f < 0 || f > 12 ? 0 : 12 * Math.exp(-f / 5) * Math.sin((f / 12) * 3 * 2 * Math.PI));

/** Gulp (P2): stretch up 1.08 (3 f), squash 0.85 × 1.15 as the coin goes in (2 f), cheeks puff 1.1 wide (4 f), settle. */
export const gulpScale = (f: number) => ({
  x: interpolate(f, [0, 3, 5, 9, 14], [1, 0.94, 1.15, 1.1, 1], { ...clamp, easing: Easing.inOut(Easing.quad) }),
  y: interpolate(f, [0, 3, 5, 9, 14], [1, 1.08, 0.85, 0.96, 1], { ...clamp, easing: Easing.inOut(Easing.quad) }),
});

/** Flick (P3): wind back -15° (4 f), snap to +20° (2 f, the coin launches on f6 with whoosh-zip), home on its spring. */
export const flickAngle = (f: number, fps: number, home: { mass: number; stiffness: number; damping: number }) =>
  f < 4
    ? interpolate(f, [0, 4], [0, -15], { ...clamp, easing: EASE2.out })
    : f < 6
      ? interpolate(f, [4, 6], [-15, 20], { ...clamp, easing: EASE2.fall })
      : spring({ frame: f - 6, fps, from: 20, to: 0, config: home });

/** ETH's curious head tilt: ±6° about the coin centre, in on SPRING2.quick, held while it looks, out on land. */
export const headTilt = (f: number, fps: number, holdF: number, dir = 1) =>
  dir * 6 * (spring({ frame: f, fps, config: SPRING2.quick }) - spring({ frame: f - holdF, fps, config: SPRING2.land }));
```

---

## 3. The sticker S logo in motion

**What the mark is.** In `logo/satchel-mark.svg` (viewBox 512) the mark is a coral tile (rx 112) with **three strokes
of one centreline**: an ink *shadow* 92 wide translated 10 down, an ink *outline* 92 wide, and a white *face* 56 wide,
all with round caps. The outline is therefore 18 units per side and the shadow 10 units. The path runs from the
top-right terminal (330, 184), round the top bowl, down the spine and round the bottom bowl to (180, 316): the way a
hand writes an S. The tile itself has no outline and no shadow.

**MarkBuild (40 f, ends pixel-exact on `satchel-mark.svg`):**

| f | Action | SFX |
|---|---|---|
| 0–4 | The tile slaps in as a unit: scale 1.22 → 1, ease-in; **contact f4**: squash 5%, held 2 f | slap |
| 6–24 | The S is written in ink (shadow and outline together), in-out cubic over 18 f. It starts as an ink dot, like a pen touching down | marker squeak |
| 9–27 | The white face follows 3 f behind the ink ("the pen leads") | |
| 26–30 | The finished S pops off the tile: it rises 12 units and its shadow stays on the tile (offset 10 → 22) | pop |
| 30–33 | It falls back and presses in; **contact f33**: shadow 6 units, never less | slap |
| 35–40 | Rebound to rest: shadow 10 units, scale 1 | |

With the shared `Mark` / `Lockup`:
- **Tile:** wrap the mark in a CSS `scale` driven by `slapAt(f, fps, 0, { from: 1.22, squash: 0.05, drop: 0 })`.
- **`draw`:** 0 → 1 over f6–f24, in-out cubic. The kit draws the three strokes together, so there is no 3 f lag of
  the white face.
- **`drop`:** 1 → 2.2 (f26–30, `out`) → 0.6 (f33, `fall`) → 1 (`rebound` from f35). The kit moves the shadow rather
  than lifting the S, which reads the same.
- **`word`:** 0 → 1 in 12 f from about f36.

SFX: `sticker-slap` on f4, `pen-scribble` under the draw, `pop` on f26 and `sticker-slap` on f33.

**Where the logo appears in v3** (amendment A7: never rotate or tilt it, never on coral, never without its outline and
shadow once built, never a face on the S, wordmark lowercase):
- **H2:** on the word "Satchel" in V04 (use `getScene("H2").wordAt("V04", "Satchel")`), the **lockup slaps in at top
  left**. Run the mark slap (tile scale 1.22 → 1, contact f4) with the wordmark sliding out from behind the tile
  (`word` 0 → 1 in 12 f, `out`). A full MarkBuild (40 f) fits only if the scene has the room; otherwise slap the
  finished lockup. In P1 the lockup peels away to reveal the phone (§2.2).
- **E1 end card** (concepts-v2 §4.5) on the **Day ground**, held at least 5 s:
  - The lockup centred at about y 38%, with a quarter-tile clear space. It slaps in by scale and drop only.
  - +0.4 s: the headline "Stick it on. Hand it over." (Funnel Display 800, about 96 px, the sticker caption treatment).
  - +0.3 s apart: "Bitcoin, Ethereum and Solana in one NFT." and "Every signature on the record." (Onest 600,
    ink-muted). The world bible says about 40 px; the brief's must-read rule says ≥ 56 px, so use 56 px if they are
    meant to be read on a phone.
  - The footer "Built on NEAR Chain Signatures · NEAR HACKATHON 2026" (amendment A5; Onest 500, ≥ 32 px).
  - The charm bar at top right, as in the OG image: it swings gently, the charms blink in turn, and SOL gives a last
    bounce.
  - **On the `endPress` marker (132.0 s) the mark does the brand's button press:** with the shared `Mark`, `drop`
    goes 1 → 0.4 in 3 f, holds 2 f and springs back on `rebound` (`button-thock` plus a soft `sticker-slap`). The
    shadow never reaches 0.
  - Silence in the last 0.5 s.
- **Never** hang the mark or the S on the charm bar (the retired keyring), never put the mark on coral or in a coral
  flood, and never use the mark as a card band. The card band carries the **sticker S alone** (`StickerS`).

**Do-nots in motion** (from the Logo system board, translated to motion):
- **Never rotate the S or the mark**: no wobble, spin, tilt, swing or shake rotation. The only exception is the sticker
  S printed on the card's band, which rides along in the hand-off swing (§2.6).
- **Never recolour the tile:** no tints, colour pulses, gradients or hue shifts, and no coral fill inside the S on a
  coral tile.
- **Never put the mark on coral**, and never inside a coral flood or the coral iris. Use the sticker S alone there.
- **No ring or hook:** never hang the mark or the S from the charm bar. That is the retired keyring S.
- **Never drop the outline or the shadow:** the S's shadow stays between 6 and 22 units in motion and ends at 10.
  Squash the mark only as a unit (≤ 5%, ≤ 3 f), never the S against its tile.
- **Never give the S a face**: no eyes, no blinking S. Faces belong to the charms.
- **Never capitalise the wordmark**, and never animate its letters out of shape (no per-letter scale, rotation or
  weight). It is outlined artwork, not live text. Reveal it whole (mask or slide).
- Clear space is a quarter of the tile on every side. Minimum sizes are 16 px for the mark and 120 px wide for the
  lockup. Below 32 px use `satchel-mark-small.svg`.
- Never use the retired explorations (NFT buddy, money pouch, coin, keyring S).

```tsx
// brand2/StickerS.tsx
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { clamp, EASE2, slapAt, SPRING2 } from "./motion";

// The S centreline, verbatim from logo/satchel-mark.svg (viewBox 0 0 512 512). The mark is three strokes of it:
// shadow (ink, 92 wide, translated 10 down), outline (ink, 92), face (white, 56). All round caps.
export const S_PATH =
  "M330 184 C330 154 300 138 256 138 C206 138 182 162 182 194 C182 230 214 242 256 252 C298 262 330 274 330 310 C330 344 302 364 256 364 C210 364 182 348 180 316";

const SStroke: React.FC<{ p: number; color: string; width: number; dy?: number }> = ({ p, color, width, dy = 0 }) => {
  if (p <= 0.001) return null; // a zero-length round-capped dash can still paint a dot
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.min(1, p), S_PATH);
  return (
    <path
      d={S_PATH}
      transform={dy ? `translate(0 ${dy})` : undefined}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};

/**
 * The mark, built: the coral tile slaps in (f0, contact f4), the S is written top-right → bottom-left in ink
 * (f6–f24) with the white face 3 f behind it, then the S lifts off the tile and slaps back (f26–f38).
 * Ends pixel-exact on satchel-mark.svg: no rotation, the tile never changes colour, the shadow ends at 10 units.
 */
export const MarkBuild: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 1. tile: the whole mark squashes as one unit (never the S against the tile), max 5%
  const tile = slapAt(frame, fps, 0, { from: 1.22, squash: 0.05, drop: 0 });
  // 2. write the S: ink leads, face follows 3 f later
  const write = (start: number) =>
    interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ink = write(6);
  const face = write(9);
  // 3. the finished S pops off the tile and slaps back. sLift is in mark units: the S rises by sLift while its
  //    shadow stays on the tile (shadow dy = 10 + sLift), so the shadow never drops below 6 units.
  const sLift =
    frame < 30
      ? interpolate(frame, [26, 30], [0, 12], { ...clamp, easing: EASE2.out })
      : frame < 33
        ? interpolate(frame, [30, 33], [12, -4], { ...clamp, easing: EASE2.fall }) // contact on f33: slap SFX
        : -4 + 4 * spring({ frame: frame - 35, fps, config: SPRING2.rebound }); // held 2 f, then rebound
  const sScale = 1 + 0.004 * sLift;
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ overflow: "visible", opacity: tile.opacity, scale: `${tile.sx} ${tile.sy}` }}
    >
      <rect width={512} height={512} rx={112} fill={C.coral} />
      <g transform={`translate(256 256) scale(${sScale}) translate(-256 -256) translate(0 ${-sLift})`}>
        <SStroke p={ink} color={C.ink} width={92} dy={10 + sLift} />
        <SStroke p={ink} color={C.ink} width={92} />
        <SStroke p={face} color="#ffffff" width={56} />
      </g>
    </svg>
  );
};
```

```tsx
// usage.tsx (H): lockup reveal — MarkBuild, then the wordmark slides out from behind the tile
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp, EASE2 } from "./brand2/motion";
import { MarkBuild } from "./brand2/StickerS";

// Uses satchel-lockup-on-light.svg itself (viewBox 2220 × 512, tile = first 512 units), so the end frame is the
// lockup exactly. Copy brand-v2/logo/*.svg to video/public/v2/logo/ first. Start the wordmark ~f36 of MarkBuild.
export const LockupReveal: React.FC<{ height: number; wordAt: number }> = ({ height, wordAt }) => {
  const frame = useCurrentFrame();
  const width = height * (2220 / 512);
  const p = interpolate(frame, [wordAt, wordAt + 12], [0, 1], { ...clamp, easing: EASE2.out });
  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", left: height, top: 0, width: width - height, height, overflow: "hidden" }}>
        <Img
          src={staticFile("v2/logo/satchel-lockup-on-light.svg")}
          style={{ position: "absolute", left: -height, top: 0, width, height, translate: `${(p - 1) * (width - height)}px 0` }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <MarkBuild size={height} />
      </div>
    </div>
  );
};
```

Note the naming clash: the file `satchel-charm.svg` is the **sticker S alone** (no tile), and the *chain charms* are
the three coins with faces. In this document "charm" always means a chain charm.

---

## 4. Composition and colour choreography

**The ground** is the Day ground #f6f5fb, flat. It is cool off-white, never cream: no warm grade, no vignette, no
grain, no texture, no gradient. Surfaces are white with an ink outline. Contrast: ink on ground is 15.9:1, ink on
coral 5.7:1, ink on lemon 12.5:1. White on coral is 3.0:1 and never used for text.

**One coral fill per frame.** Count the coral areas in every frame; the answer is 1 (or 0).
- **In this film coral is only the card band or the one primary button. There are no coral floods** (the world is
  Day, with Night only in C1).
- The logo tile is coral too. When the lockup is on screen (H2, E1), keep any coral button out of the frame, and if a
  card band shares the frame, keep it small and away from the focus.
- UI recreations: a phone showing the card band *and* a coral button (Mint, Send, Give, Buy) puts the action on the
  button. The band then sits small and outside the focus, or out of the crop.
- A **disabled** Buy is grey (as on the shared kit's sale page), so the coral arrives exactly when Buy lights up (T5)
  or is pressed (T7).
- `coral-soft` (#ffe3df), used for the Sent toast and selected rows, is a tint and does not count. `coral-deep` is the
  pressed state of the same button.
- No coral confetti, coral text, coral outlines or coral sparkles. Frost over the band tints it, which is fine; never
  recolour the tile.

**Sky and lemon**
- **Sky** (#8fd3ff) is a sticker accent: bob's sleeve, the backdrop panel behind the charms, the frost tint, droplets.
  A backdrop panel carries the outline and shadow, covers at most about 45% of the frame, appears once per frame, and
  is never behind long text.
- **Lemon** (#ffd84d) is for alice's sleeve, the "New" badge, the seed-phrase sticky note (P4), sparkles, the marker
  swash and confetti, at most about 5–10% of the frame. Never use lemon or sky as a text colour or as a full-frame
  fill.
- **Chain colours** appear as 8k px dots beside chain names, as charm fills and as plain coin stickers (no logos),
  and nowhere else.

**Night** (`NIGHT` in `src2/brand/tokens.ts`: ground #120c26, surface #1c1538, ink #f4f2ff, success #4fd9b0, danger
#ff7a92; sticker shadows #000).
- **Only C1, the catch** (58.0–72.0 s). It falls as the roller blind on the music stop (§2.16) and leaves when the T0
  flip sweeps Day back in.
- No coral in C1: the seller's card shows no number, and the band may show only with no button. Its absence makes
  T5's lit Buy land.
- The charms keep their fills and ink outlines and act concerned: flat mouths, eyes on the slip, one long blink. The
  drained ETH charm goes "o" and grey. The slip's danger outline uses Night danger #ff7a92. Text is #f4f2ff.

**Colour script for v3**

| Scene | Ground | The one coral | Accents | Signature move |
|---|---|---|---|---|
| H1 Stick it on | Day | card band | lemon and sky sleeves | three snap-ons on beats, peel corner, the swing (§2.6) |
| H2 One NFT | Day | card band, then the lockup's tile | | name wiggles, lockup slap (§3) |
| P1 Mint | Day | the Mint button, then the card band | lemon "New" badge | press, leap out of the phone, quick snap-ons |
| P2 Fill | Day | (phone UI) | coin stickers | gulps, chips count up (integers or slapped amounts) |
| P3 Send | Day | Send button | frozen signing pill | press, tracker, flicks |
| P4 No seed phrase | Day | card band | lemon sticky note, grey sleeve | note won't stick, no-wobble, side-eye |
| P5 Give | Day | "Give it to bob.near" | | press, then the swing |
| P6 Use cases | Day | each card's band, one per frame | party hats, USDC stack | three swings on bar downbeats |
| C1 The catch | **Night** (blind) | none | danger slip | pocket slide, flat-faced sale swing, drained ETH |
| T0 The flip | Night → Day with the flip | (band on the front, then the back) | | the flip |
| T1–T3 | Day | (band out of frame or small) | frozen pill | records draw, the empty key slot, request bounces |
| T4 Paused for sale | Day | card band under frost | sky frost | price tag slap, frost wipe, the hand slides off |
| T5 The check | Day | "Buy for 4,750.00 USDC" lights up at the end | success stamps, scan beam | bonks and stamps, the verdict, Buy lights |
| T6 Blocked | Day | none (Buy greyed out) | danger outline | the bonk, the banner |
| T7 The hand-off | Day | Buy pressed, then the card band | lemon burst on landing | flip back, frost melt, the swing, USDC crosses |
| E1 End card | Day | the lockup's tile | charm bar | lockup, captions, the mark's press on `endPress` |

**Safe areas and legibility (1920×1080)**
- **Key text inside the centre 1080 × 1080 (x 420–1500)** so a square recut works (world bible). All must-read text
  stays inside x 160–1760, y 100–940, and the **bottom 150 px** stay free of must-read text (platform UI).
- Type sizes: captions **110–160 px** (Funnel Display 800); must-read **≥ 56 px**; mono addresses ≥ 56 px when
  must-read, middle-truncated (`bc1q9h…x4d7`). X shows a 1920-wide video about 390 pt wide on a phone (×0.2), so
  56 px becomes about 11 pt.
- Reading holds: at least 0.8 s + 0.25 s per word after landing (the brief); for long words also at least
  characters ÷ 15 s. Text never moves while it is read: no push-ins, no thumps, no idle bobs.
- One focal point per frame. New elements appear where the eye already is, or the charms look there first.
- UI recreations sit in the phone frame (8 px ink bezel, radius 40) at k ≈ 2–2.6. Their small UI text is never
  must-read; repeat the fact as a caption.

---

## 5. Transitions catalogue

**Used in v3** (concepts-v2 §4.1 "Transitions", the brief's continuity notes). Durations are at 30 fps; transitions
shorten a `TransitionSeries` by their length. Scenes in `src2/Main.tsx` sit in plain `<Sequence>`s, so most of these
are built inside the scenes (the outgoing scene's last frames, the incoming scene's first frames).

| # | Transition | Frames | Where | How |
|---|---|---|---|---|
| T1 | **Hard cut + slap-in** | 0 | The default, on the beat | The next scene's hero or caption slaps in on the cut (§2.1, §2.16) |
| T2 | **Frame peel** | 22 | H2→P1, T7→E1 | The whole frame curls off from a corner like a sticker, white backing, ink crease, growing shadow (`peelOff`, or the same geometry inside the scene) |
| T3 | **Whip with a 2-frame smear** | 8 (cut at f4) | T0's whip to #7; topic changes | Camera travel 1.15 × width, `EASE.expoIn` out / `expoOut` in, cut on the fastest frame. The two frames around the cut stretch 1.25 along the motion (`smear`). `whoosh-zip` peaks on the cut. Optional `CameraMotionBlur` on those frames only (≤ 0.4 s, samples ≤ 6, never on readable text) |
| T4 | **Camera punch-in** | 8–13 | H1 f80–93 (1.0 → 1.3 toward the charms), emphasis | `PushIn` (`punch`), never while text is being read |
| T5 | **The flip** | 10–14 | T0 (Night → Day), T7 (back to the front) | §2.16: rotateY on `quick`; Day wipes in with the angle |
| T6 | **Night blind** | 18 + bounce | C1, on the music stop | §2.16 `NightBlind` |
| T7 | **Tab switch** | 8 | T5 → T6 (Satchel #4) | The browser's new tab slaps forward (§2.1), the page content arrives 40 px lower on `land`. No fade |
| T8 | **Pop swap** | 8–10 | Match cuts on an object | A's sticker pops out (1 → 1.08 → 0 in 6 f), B's pops in at the same spot (`pop`) |
| T9 | `slide()` + `springTiming(land)` | 14 | Page pushes inside the phone mocks only | Built-in DOM presentation |
| T10 | `pushCut()` with `flashOpacity: 0` | 10 | Punch cuts | Built-in, no flash |

**Not in v3, kept as options:** the **coral tile iris** (`tileIris`, a coral handover between two coral things, for
social cut-downs) and the **ink swipe** (`inkSwipe`). Night in this film arrives by the blind and leaves by the flip.

**Drop (brand 1.0 or off-brand):**
- Film grain and vignette; leather textures; brass gradients and sheen.
- Light leaks (`@remotion/light-leaks`); the stitch wipe and every stitch device.
- `Trail` echoes; long or full-scene motion blur.
- The shader presentations (`zoomBlur`, `crossZoom`, `dreamyZoom`, `filmBurn`, `linearBlur`, `blurSlide`,
  `dissolve`, `ripple`, `crosswarp`, `swap`, `zoomInOut`, `bookFlip`).
- RGB split and glitch; rack focus and DOF.
- 3D fly-ins and exploded 3D layers. The flip is the only 3D.
- Cross-dissolves, lens flares, `clockWipe`, the built-in `flip()`, the circular `iris()`, and camera shake with
  rotation.

From the old cookbook, these survive in 2.0 form: the per-word slam (now captions and WordSlap), the line mask-up
(LineRise), stroke draw-ons (now in ink, and dashed for records), parallax (now flat), the hit-stop (inside the slap),
beat-synced cuts, and a single **speed ramp** on the catch (optional, once).

```tsx
// brand2/transitions.tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { getLength } from "@remotion/paths";
import { C, TILE_RADIUS } from "./tokens";
import { clamp } from "./motion";
import { peelGeometry, polygon } from "./Sticker";

// TransitionSeries renders the entering scene ON TOP of the exiting one, so each brand transition draws
// its effect inside the entering wrapper and leaves the exiting scene untouched.

// ---------------------------------------------------------------------------------------------
// 1. Coral tile iris: a coral tile (logo corner ratio) grows from a coral thing in scene A until it fills the
//    frame, then shrinks onto the coral thing in scene B. Coral is handed over, so the frame never shows two.
// ---------------------------------------------------------------------------------------------
type Box = { x: number; y: number; w: number; h: number; r?: number }; // frame px, top-left
type TileIrisProps = { from: Box; to: Box; outline?: number };

const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
  r: (a.r ?? TILE_RADIUS * Math.min(a.w, a.h)) + ((b.r ?? TILE_RADIUS * Math.min(b.w, b.h)) - (a.r ?? TILE_RADIUS * Math.min(a.w, a.h))) * t,
});

const coverFrom = (b: Box, W: number, H: number): Box => {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const half = 1.35 * Math.max(cx, W - cx, cy, H - cy); // a rounded square this big covers every corner
  return { x: cx - half, y: cy - half, w: 2 * half, h: 2 * half, r: TILE_RADIUS * 2 * half };
};

const TileIris: React.FC<TransitionPresentationComponentProps<TileIrisProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const closing = p < 0.5;
  const box = closing
    ? lerpBox(passedProps.from, coverFrom(passedProps.from, width, height), Easing.in(Easing.cubic)(p / 0.5))
    : lerpBox(coverFrom(passedProps.to, width, height), passedProps.to, Easing.bezier(0.16, 1, 0.3, 1)((p - 0.5) / 0.5));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: closing ? 0 : 1 }}>{children}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: box.r,
          background: C.coral,
          border: passedProps.outline ? `${passedProps.outline}px solid ${C.ink}` : undefined,
          boxSizing: "border-box",
        }}
      />
    </AbsoluteFill>
  );
};

export const tileIris = (props: TileIrisProps): TransitionPresentation<TileIrisProps> => ({ component: TileIris, props });

// ---------------------------------------------------------------------------------------------
// 2. Scene peel: scene A peels off like a sticker from a corner and reveals scene B ("Hand it over").
// ---------------------------------------------------------------------------------------------
type PeelOffProps = { corner?: "tl" | "tr" | "bl" | "br"; outline?: number };

const PeelOff: React.FC<TransitionPresentationComponentProps<PeelOffProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  const g = peelGeometry(width, height, p, passedProps.corner ?? "br");
  const outline = passedProps.outline ?? 8;
  const [a, b] = g.fold;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: polygon(g.peeled) }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ filter: `drop-shadow(0 ${interpolate(p, [0, 0.3], [8, 40], clamp)}px 0 ${C.ink})` }}>
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            transform: g.matrix,
            clipPath: polygon(g.peeled),
            background: C.surface,
            border: `${outline}px solid ${C.ink}`,
            boxSizing: "border-box",
          }}
        />
        {a && b ? (
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={outline} strokeLinecap="round" />
          </svg>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const peelOff = (props: PeelOffProps = {}): TransitionPresentation<PeelOffProps> => ({ component: PeelOff, props });

// ---------------------------------------------------------------------------------------------
// 3. Ink swipe: one fat, round-capped ink stroke crosses the frame (covering A), then its tail follows
//    (revealing B). The all-ink middle frames are the doorway into a Night section.
// ---------------------------------------------------------------------------------------------
type InkSwipeProps = { tilt?: number };

const InkSwipe: React.FC<TransitionPresentationComponentProps<InkSwipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const { width: W, height: H } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const sw = 1.7 * H;
  const tilt = (passedProps.tilt ?? 0.12) * H;
  const d = `M ${-sw / 2 - 40} ${H / 2 + tilt} L ${W + sw / 2 + 40} ${H / 2 - tilt}`;
  const len = getLength(d);
  const ease = Easing.bezier(0.65, 0, 0.35, 1);
  const head = ease(interpolate(p, [0, 0.5], [0, 1], clamp));
  const tail = ease(interpolate(p, [0.5, 1], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: p < 0.5 ? 0 : 1 }}>{children}</AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {head - tail > 0.0005 ? (
          <path
            d={d}
            fill="none"
            stroke={C.ink}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${len * (head - tail)} ${len * 2}`}
            strokeDashoffset={-len * tail}
          />
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

export const inkSwipe = (props: InkSwipeProps = {}): TransitionPresentation<InkSwipeProps> => ({ component: InkSwipe, props });
```

```tsx
// usage.tsx (C): wiring the brand transitions (total = 120 + 90 + 90 + 120 − 20 − 22 − 18 frames)
import React from "react";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { pushCut } from "@remotion/transitions/push-cut";
import { EASE2, SPRING2 } from "./brand2/motion";
import { inkSwipe, peelOff, tileIris } from "./brand2/transitions";

export const Chapters: React.FC<{ a: React.ReactNode; b: React.ReactNode; c: React.ReactNode; d: React.ReactNode }> = ({ a, b, c, d }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={120}>{a}</TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={tileIris({ from: { x: 840, y: 420, w: 240, h: 240 }, to: { x: 510, y: 256, w: 900, h: 132, r: 70 }, outline: 8 })}
      timing={linearTiming({ durationInFrames: 20 })}
    />
    <TransitionSeries.Sequence durationInFrames={90}>{b}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={peelOff({ corner: "br" })} timing={linearTiming({ durationInFrames: 22 })} />
    <TransitionSeries.Sequence durationInFrames={90}>{c}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={inkSwipe()} timing={linearTiming({ durationInFrames: 18 })} />
    <TransitionSeries.Sequence durationInFrames={120}>{d}</TransitionSeries.Sequence>
  </TransitionSeries>
);

// In phone mocks: a page push on the land spring, and a punch-in cut with the flash switched off.
export const phonePush = { presentation: slide({ direction: "from-right" }), timing: springTiming({ config: SPRING2.land, durationInFrames: 14 }) };
export const punch = { presentation: pushCut({ outgoingScale: 1.08, incomingStartScale: 1.12, incomingEndScale: 1, flashOpacity: 0 }), timing: linearTiming({ durationInFrames: 10, easing: EASE2.out }) };
```

`tileIris` needs B's coral element rectangle in frame pixels (`to`) so that it lands exactly on it. Measure it once
and pass the numbers. The render test landed the iris on a card band seamlessly.

---

## 6. Sound personality

**Music.** Bright indie-pop with an electro-funk bounce, playful but premium, at **120 BPM** (15 f per beat,
frame-exact) in a major key. The locked palette (concepts-v2 §4.6) is handclaps, a plucked bass, glockenspiel and a
**whistled hook**. Add muted clean funk-guitar chops, marimba for the "success" colour, a warm Rhodes bed for the
premium layer, and tight, dry drums.
- **Premium, not childish:** short motifs, real-sounding instruments, a clean low end and a wide but tidy mix. No
  kazoo, slide whistle, ukulele-whistle cliché, cartoon library or lo-fi crackle.
- **Cue sheet** (the world bible's; times from `timeline-v3.md` markers):

| Cue | Time | What |
|---|---|---|
| M1 Hook | 0:00–0:12 | Three snaps (0.17 / 0.50 / 0.83 s, the snap-ons), a glockenspiel pickup, the jingle at the swing apex, the groove on the landing (2.6 s) |
| M2 Product | 0:12–0:46 | Builds every 8 bars; a 1-bar comic break at P4; a lift into the Give swing |
| M3 Use cases | 0:46–0:58 | The chorus; the three swings land on bar downbeats with the jingle |
| M4 Catch | 0:58–1:12 | Hard stop at `musicStop` 58.0 s (one muted pluck), the Night blind, a heartbeat pulse with a ticking hat, a thud at `thud` 66.0, a sub hit at `subHit` 68.0, near silence |
| M5 Flip | 1:12–1:16 | A 2-bar riser, a whoosh on `flip` 73.0, Day back, the **drop** at `drop` 76.0 |
| M6 Tech | 1:16–1:50 | A driving groove; accents for the outline drawing, the empty key slot, three bounces, the frost shimmer, the scan, **three stamps on the V23 phrases**, a bright chord on "Clean history" |
| M7 Blocked | 1:50–1:56 | Bass and tick only, a soft deflating "wah" on the banner; no horror sting |
| M8 Hand-off | 1:56–2:06.5 | A high-pass sweep, a snare roll, the **landing** at `landing` 122.0: a big slap, the jingle, the full band |
| M9 Outro | 2:06.5–2:14 | The whistled hook resolves, a final slap on the mark's press at `endPress` 132.0, ring-out, silence in the last 0.5 s |

- **Mix:** VO on top; music ducked about 13 dB under it (6 f attack, 12 f release; the `duck` spans in
  `timeline.json`); at most 1–3 SFX per second; master to −14 LUFS and ≤ −1 dBTP.

**SFX palette.** Use the 2.0 library through `<Sfx name … at … align …>`. Transients land **on the contact frame**;
swishes and whooshes use `align="peak"` so their loudest point sits on the fastest frame or the cut. Start around −6 dB
and balance by ear; the VO must stay clear.

| Moment | `name` | Sync |
|---|---|---|
| Sticker contact (slap-ins, captions, set-downs, the MarkBuild) | `sticker-slap` | the contact frame (f4 of a slap) |
| Peel (corner, frame, a sticker leaving) | `sticker-peel` | `align="peak"` on the detach |
| Snap-ons, pills, badges, smiles widening | `pop` (`pop-high` for SOL) | the contact frame |
| A big squash rebound (at most 3 in the film) | `boing-soft` | contact + 2 f |
| The swing's apex; charms arriving | `charm-jingle` | `align="peak"` on the apex |
| Set-down, bar stops | `chain-clink` | contact |
| The lift and slide of a hand-off | `swing-swish` | `align="peak"` mid-slide |
| Button press (Mint, Send, Give; Buy) | `button-thock` (`button-thock-deep` for Buy) | the press frame `at` |
| Counter steps, toggles | `tick-soft`, `bubble-tick-run` | each step, or under the count |
| Labels and accounts typing | `type-run` | the first character |
| The S writing itself, outlines drawing | `pen-scribble` | the start of the draw |
| Cards sliding, the slip into the pocket | `paper-slide`, `pocket-slip` | `align="peak"` |
| Stamps (T5) | `stamp-thunk` then `success-marimba` (+2 f) | the V23 phrase onsets |
| The empty key slot (T2) | `lock-click` | the fingers find nothing |
| Whips, the flip | `whoosh-zip`, `whoosh-soft` | `align="peak"` on the cut or the 90° frame |
| Leap, the sticky note falling | `swoop-up`, `swoop-down` | the take-off, the fall |
| Sparkle bursts (max 4) | `sparkle` | the burst start |
| Sent, Clean history | `success-marimba` | the state change |
| Coins landing, gulps | `coin-ding` | contact |
| Not the holder, bounced requests, Blocked | `error-boop` | the bounce or the banner |
| The seller's sneaky slip (C1) | `sneaky-pizz` | as the slip slides into the pocket |
| The catch's pulse | `tension-tick` | under C1 |
| Frost on (T4) | `freeze-chime` | the wipe start |
| The verdict and the frost melt | `magic-wand` | the verdict and the melt |
| Thud (C1), heavy accents | `drum-hit-soft` | on the marker |
| The riser into the flip | `riser-short` | ends on `flip` |

```tsx
// sfxUsage.tsx: sound on the contact frame with the project's helper (typechecked against video/src2/lib/Sfx.tsx).
// `at` is in seconds, scene-local; place it beside the moving element in your scene.
import React from "react";
import { Sfx } from "../../../../video/src2/lib/Sfx";
import { SLAP_CONTACT } from "./brand2/motion";

const FPS = 30;
export const SlapSounds: React.FC<{ slapStartSec: number }> = ({ slapStartSec }) => (
  <>
    <Sfx name="sticker-slap" at={slapStartSec + SLAP_CONTACT / FPS} />
    <Sfx name="charm-jingle" at={slapStartSec + 0.5} align="peak" gainDb={-4} />
  </>
);
```

**Voice.** Locked: **Sarah** (ElevenLabs `EXAVITQu4vr4xnSDxMaL`, `eleven_v4`). She is warm, smiling and adult,
reading at about 155 wpm. The world bible asks for a slight wry tilt on "Not even ours." and "Satchel keeps the
receipts."; never cutesy, and no character voices (the charms never speak, amendment A3).

The three profiles this brief asked for are the casting logic, kept for any re-records or cut-downs:
1. **The friendly maker** (this is Sarah): a warm mid-range voice, late 20s to 30s, conversational, 150–160 wpm. The
   energy lifts on the verbs ("give", "sell", "inside"), and the delivery is quietly delighted.
2. **The bright guide:** a crisper, higher-energy British or Australian voice, 160–170 wpm, with playful timing and a
   wink on the catch. Suits a faster social cut.
3. **The calm confidant:** a lower, warm baritone or alto, 140–150 wpm, reassuring. Suits a trust-led cut about clean
   history.

Direction for any of them:
- Short sentences, smiling vowels and no hype words.
- No crypto-bro register, no vocal fry, no kid voice.
- Pronunciation: ".near" is "dot near", "Satchel" is /ˈsætʃəl/, and say "Bitcoin, Ethereum and Solana" in full.
- If TTS: stability 0.45–0.55, similarity 0.75, style 0.25–0.35; generate 2–3 takes per line and pick one.

---

## 7. Do / don't

**Brand (look)**
- DO: Day ground #f6f5fb, flat (Night only in C1). Ink #1d1340 for text, outlines and hard shadows. One coral fill per
  frame: the card band or the one primary button. Ink text on coral. Sky and lemon as small accents. Chain colours as
  dots, charm fills and plain coin stickers only.
- DO: put a 3k ink outline and a 4k hard ink shadow (no blur) on stickers, cards, primary buttons, charms and
  illustrations. Plain surfaces stay flat. Use radii 12/18/28/pill × k, and give the card the tile's 22% corner ratio.
- DO: type.
  - Funnel Display 800 for captions (110–160 px, sentence case), titles and amounts.
  - Onest for UI and supers.
  - Geist Mono only for accounts, addresses, hashes and record labels.
  - Tabular figures on amounts.
- DO: 2px-stroke line icons (Lucide at stroke 2 × k) in ink or the state colour. A status is always an icon or dot
  plus a word: Sent, **Paused for sale**, Needs attention, Clean history, Blocked.
- DON'T: white or coral text; lemon or sky text; a second coral fill; coral floods; coral confetti; a cream or warm
  ground; colour grading.
- DON'T: rotate or tilt the S or the mark, put it on coral, drop its outline or shadow once built, give the S a face,
  add a ring or hook, recolour the tile, or capitalise the wordmark (amendment A7). Captions may tilt ±2°; the logo
  never does.
- DON'T: put real chain logos inside the charms, give them brows, limbs or teeth, let them speak (A3), or add charms
  for other chains.
- DON'T: use brand 1.0 (leather, brass, the stitch, the Strap S, Bricolage, Instrument Sans, Spline Sans Mono, grain,
  vignette, light leaks) or the retired explorations (buddy, pouch, coin, keyring S).
- DON'T: use blur (DOF, glass, `backdrop-filter`), glows, gradients, gloss, bevels, glossy 3D, lens flares, RGB split
  or glitch. Motion blur is allowed only as `CameraMotionBlur` on whips of ≤ 0.4 s (samples ≤ 6), never on readable
  text; prefer the 2-frame smear.

**Motion**
- DO: accelerate into contact; squash 5–7% and hold 2 f; rebound; let the shadow catch up 1 f late. Land contacts on
  the beat or on the VO word, with the SFX on the contact frame.
- DO: every hand-off uses the swing (§2.6): lean 10°, then 10 → −4.9 → +2.4 → −1.2 over the 600 ms slide; charms at
  1.5×, 2–3 f late, eyes closed; the jingle at the apex; the slap on contact.
- DO: give the charms their personalities (BTC slow, ETH curious, SOL quick; reaction order SOL, ETH, BTC).
- DO: keep the **flip** (T0, T7) as the film's only 3D move. Night arrives by the blind (C1) and leaves by the flip
  (T0). Peel the frame twice (H2→P1, T7→E1).
- DO: keep text still while it is read and keep characters calm while text is on screen. Ration delight: at most 4
  sparkle bursts, 1 confetti and 3 thumps.
- DON'T: use slow, floaty ease-outs for objects (the frost slide-off is the one deliberate glide), Remotion's default
  spring or brand 1.0's `SPRING` presets for stickers, elastic easing, expo-out pivots for hanging things,
  perspective on anything but the flip, or opacity cross-fades between scenes.
- DON'T: count amounts up like a score (only P2's fill tags count, as scripted), idle-bob during reading, rotate the
  card for a "no" (shake it sideways), or move the camera sideways in a shake.

**Copy and accuracy** (SCRIPT-v3 amendments and §4.7 win; product facts beat the brand pack's sample copy)
- DO: names and addresses.
  - Mainnet-style wording on screen (A6): `alice.near`, `bob.near`, `carol.near`, `sam.near`,
    `satchel.satchelhq.near`.
  - Addresses: `bc1q…` (Bitcoin), `0x…` (Ethereum), base58 (Solana), all middle-truncated.
  - Plain chain names: Bitcoin, Ethereum, Solana.
- DO: "native Bitcoin, Ethereum and Solana" or "three chains"; "send on all three chains".
- DO: app copy.
  - "Give" (never "Transfer"), "Send", "List for sale", "Buy for 4,750.00 USDC" (A1), "**Paused for sale**".
  - "Signing with NEAR's signer network · **Usually about 10 seconds**", "Satchel #7 is yours.".
  - "Clean history", "Blocked: 1 unused signature", "Not the holder".
- DO: card bands always read "Satchel #N" (A4): #7 hero, #12 gift, #21 treasury, #4 blocked. "Team treasury" is a
  label outside the card. The OTC vignette shows 1.20 BTC · 18 ETH · 300 SOL and an unnumbered USDC stack (A2).
- DO: keep the mechanism true (§4.8 of concepts-v2):
  - every signature is recorded on NEAR before NEAR's signer network makes it;
  - there is no admin key ("Not even ours");
  - it signs only plain transfers it can read;
  - listing pauses signing;
  - **the buyer's browser** checks every record, and **the app** keeps Buy off;
  - the buy is one transaction bound to that exact history and pays the seller.
- DO: use the script's numbers exactly (fill 0.0513 · 0.90 · 13.65; sends 0.0100 · 0.05 · 1.25; after 0.0412 · 0.85 ·
  12.4; #4 `ETH · nonce 12 · Unused`), in tabular figures. Block numbers and hashes are illustrative and must look
  real-format.
- DON'T: "testnet", "Sepolia", "devnet", "faucet", or `tb1q…` addresses on screen. Don't show the README's real
  testnet addresses.
- DON'T: "trustless"; "safe" (say "clean"); "real" (say "native"); "spend it like any wallet" (Satchel refuses contract
  calls and approvals).
- DON'T: "every chain", "all chains" or "any chain". That includes the brand samples "The NFT that carries every
  chain" and "One NFT. Every chain inside."
- DON'T: fiat (no "$" anywhere, not even inside UI shots).
- DON'T: a wait or countdown after listing.
- DON'T: "Safe to buy in about 2 minutes".
- DON'T: plumbing words (MPC, derivation path, payload, Tgas, yoctoNEAR, yield/resume, domain_id, cooldown_blocks,
  freeze flag, ERR_FROZEN). "NEAR Chain Signatures" and "NEAR's signer network" are fine.

**Remotion and render**
- DO: drive everything from `useCurrentFrame()`, and choreograph against VO times (`getScene(...).line()` and
  `.word()`), never hard-coded seconds. Only `random(seed)`, never `Math.random`.
- DO: use `<Img>` with `staticFile()`, premount `<Sequence>`s, and pass unique ids to any SVG `<mask>` or `<clipPath>`.
- DO: in `TransitionSeries`, draw effects in the *entering* wrapper (it renders on top), and remember that
  transitions shorten the timeline.
- DO: when clipping an element, pad the clip so its own outline and shadow survive (`Peel` does this). Skip
  zero-progress round-capped strokes. Animate font weight only on isolated words. Call `measureText` only once fonts
  are loaded. Put a swinging element's drop-shadow filter on a non-rotating wrapper.
- DO: render intermediate frames as PNG, or JPEG ≥ 95, and encode at CRF 16–18. Flat coral and ink edges show
  ringing and 4:2:0 bleed, so keep details ≥ 5 px.
- DON'T: CSS transitions or animations, Tailwind `animate-*`, CSS `background-image` assets, heavy full-frame filters
  on every frame, or the crossZoom, zoomBlur and linearBlur presentations (brief).

---

## 8. Top 12 moves for this film

1. **The hook in 3 seconds** (H1; §2.15, §2.2, §2.6): three snap-ons, one per beat (f5 BTC, f15 ETH, f25 SOL), each
   charm on its own spring. Then alice's corner peel flashes the dashed-outline plant for 4 f, and the swing carries
   the card to bob. Snap, snap, snap, peel, jingle, landing: the whole idea before the first full sentence.
2. **The swing** (§2.6): lean 10°, then 10 → −4.9 → +2.4 → −1.2° over the 600 ms slide (`{1, 267, 7.2}`). Charms ride
   at 1.5×, 2–3 f late, eyes closed; the jingle lands on the apex and the slap on contact. It is the brand's
   signature, and it appears in H1, P5, the three P6 vignettes, C1's flat-faced sale and the T7 landing (2:02.0).
3. **The flip** (T0, §2.16): the film's one 3D move on `quick`. Day sweeps back in with the rotation, and the back's
   "History · 3 signatures" pays off H1's plant. The riser ends on it and the drop follows at 76.0.
4. **Records draw themselves** (T1, §2.16): the dashed outline appears dash by dash (16 f), the label types, the
   frozen pill breathes "Usually about 10 seconds", "Signed" prints, and the sticker peels off toward Ethereum,
   leaving the outline. "Recorded first. Then signed." made visible.
5. **The stamps on the V23 beats** (T5, §2.15–2.16): each charm winds back, strikes and bonks its own outline on its
   phrase onset; `stamp-thunk`, then marimba. ETH "Nonce used", BTC "Coin spent", SOL "Blockhash expired", each with
   its personality (SOL snappiest, BTC heaviest).
6. **Frost on, frost off** (T4, T7): a flat sky laminate squeegees across with `freeze-chime` and the snowflake turns
   exactly 60°. A hand tries Send and slides off, the film's one glide. It melts inside T7's flip back to the front.
7. **The press into the shadow** (§2.3): Mint, Send, Give and Buy press 4k px into their shadows with `button-thock`
   (deep for Buy). The brand's own micro-interaction, and every CTA in the film.
8. **Night falls** (C1, §2.16): the roller blind drops on the music stop with a hard edge shadow. The sneaky slip
   (`sneaky-pizz`), the flat-faced sale and the drained ETH charm going "o" follow. Then silence.
9. **The logo, built and pressed** (§3): the lockup slaps in on "Satchel" (H2) and the wordmark slides out from
   behind the tile. On the end card, the mark presses into its shadow on `endPress` (132.0 s).
10. **Caption slaps** (§2.16): Funnel Display 800, scale 1.2 → 1, a ±2° tilt, landing on VO words. The hook and end
    captions are white stickers whose shadow snaps to 8 px.
11. **Charm acting** (§2.15): the gulp (P2), the flick (P3), the side-eye and the card's no-wobble (P4), the silent
    giggle (T2) and the cheer (T5, T7). These personalities keep the tech half warm without a single word from the
    charms.
12. **Continuity moves** (§5): two frame peels (H2→P1, T7→E1), whips with a 2-frame smear, punch-ins (H1 1.0 → 1.3
    toward the charms), and the tab switch into Satchel #4's blocked outline (T6).

---

## Appendix A. References (what to steal)

| # | Reference | Opened? | Steal |
|---|---|---|---|
| 1 | Benji Taylor, "Family Values": https://benji.org/family-values | Yes | Fluidity: "moving through water — you float rather than walk". Text morphs (Continue → Confirm), cards "move seamlessly between screens". The **Delight-Impact Curve**: "delight increases as the frequency of feature usage decreases". This is why delight is rationed (§1.5). |
| 2 | Family card morph, 60fps.design: https://60fps.design/shots/family-wallet-card-morph-to-screen-transition | Yes | A "spring-loaded morph" of card → sheet with staggered items. Source of the tile → card band handover and the 3 f staggers. |
| 3 | Family "Wallet Wrapped" by Algo: https://algo.tv/family-crypto-wallet | Yes | Data-driven Lottie modules; coins and colour encode the wallet's activity. The charms should react to product state, not just decorate. |
| 4 | Phantom identity: https://phantom.com/learn/blog/introducing-phantom-s-new-brand-identity, and Bakken & Bæck's case: https://bakkenbaeck.com/case/phantom | Yes (the case study has little motion detail) | The "dynamic, floating" ghost as a "trusted companion"; logo animations by Gianluca Alla; a mascot whose motion encodes state. The detail that the ghost "inclines after a transaction" comes **only from a search summary**. |
| 5 | Duolingo, World Characters lip-sync: https://blog.duolingo.com/world-character-visemes | Yes | Rive state machines; an idle layer ("head nods, blinking, and eyebrows moving") separate from the action layer; characters react to right and wrong answers. Our blink clock vs event reactions. |
| 6 | Mascot guidelines, lessons from Duolingo: https://mascotengine.com/blog/brand-mascot-guidelines-duolingo-lessons/ | Yes | Document "resting energy, typical easing, anticipation, overshoot, gesture size, blink behavior and transition speed"; say which parts may squash and which are protected identity features; characters "become still when the user needs to read". Our protected list (S, mark, wordmark) and the stillness rule. |
| 7 | BUCK × Notion AI face: https://the-brandidentity.com/project/how-buck-gave-notions-ai-assistant-a-hand-drawn-personality | Yes | A face of a few marks; "personality in subtlety"; "the timing of a blink"; "alert and engaged, but not distracting"; a state machine of behaviours. Exactly our two-dots-and-a-smile constraint. |
| 8 | Material 3 motion springs: https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md (standard: spatial ζ 0.9 at k 1400/700/300, effects ζ 1 at k 3800/1600/800) | Yes. The Expressive values (fast 0.6/800, default 0.8/380, slow 0.8/200) come **from search results** citing androidx `ExpressiveMotionTokens`. https://m3.material.io/blog/m3-expressive-motion-theming opened but its body did not render | Two spring families: spatial may overshoot, and effects (opacity, colour) never do. Our `quick`, `land`, `carry` and `fade`. |
| 9 | Spotify Wrapped 2024: https://www.itsnicethat.com/features/spotify-wrapped-2024-graphic-design-041224 | Yes | "Using our typeface as our main graphic element … looping and transforming it". Type as the hero; oversized counts. |
| 10 | Game feel on the web (squash, shake, juice): https://valdemird.com/blog/game-feel-on-the-web/; Jonasson & Purho, "Juice it or lose it" (GDC 2012) | Yes for the first. The talk is known **from search summaries** only | Squash 0.88 → 1.05/0.92 over about 420 ms with the origin at the bottom; hit-stop 60–90 ms; 14-particle bursts; every contact gets squash, sound and a pause. Our slap's 2 f hold. |
| 11 | Sticker peel: https://gsapvault.com/effects/sticker-peel and https://www.premiumbeat.com/blog/holographic-sticker-animation/ | Yes | The fold is perpendicular to the drag; the flap is a "mathematically reflected copy"; a gloss band runs along the crease; "the flap's cast shadow scales with peel progress"; CC Page Turn with fold radius 30. Our `Peel` (without the gloss, which is off-brand). |
| 12 | Blink and principles: https://www.bloopanimation.com/blinking-animation/ and https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation | Yes. Animation Mentor's blink tutorial returned **403** | Regular blink "closing lids (2 frames) hold eyes closed (1 frame) opening lids (3 frames)"; fast 2/3; long 3/2/4; eye darts 3 frames. Squash and stretch keeps volume; anticipation, follow-through, secondary action. |

Searched but not opened in full, so treat these as leads, not evidence:
- **Headspace**: calm flat motion; eyes and mouths are core brand features (It's Nice That, via search).
- **Mailchimp × Collins**: Freddie's wink kept as the signature gesture; "personal expression over realistic
  accuracy" (Creative Review, via search).
- **Cash App** brand guidelines: motion that blends "bold confidence" with "playful levity". The Creative Bloq article
  came back truncated.
- **Arc**: multi-sensory onboarding with sound, and the Pip character (via search).
- **Linear**: I found no playful 2D Linear piece to cite, so it is omitted.

---

## Appendix B. Verification log and traps

- **Typecheck:** the kit compiles with no errors (`tsc --noEmit`, strict, TS 5.9.3) against `remotion`,
  `@remotion/transitions`, `@remotion/paths`, `@remotion/shapes`, `@remotion/fonts`, `@remotion/layout-utils` and
  `@remotion/media` 4.0.537, React 19.3, and `lucide-react` 1.61. The sandbox links the video project's
  `node_modules`; nothing was written outside `marketing/notes/`.
- **Render test** (`_scratch/sandbox/render.mjs`: one bundle, then `renderStill` at 0.5 scale; sheets in
  `_scratch/sandbox/out/`):
  - MarkBuild ends identical to the mark.
  - The slap shows its contact squash and shadow catch-up.
  - The peel showed a page-turn artefact with a diagonal fold, now fixed to 45°.
  - The charm arrival plateaued with an expo-out bar, now fixed with `carry` and `swingTrack`.
  - The first, driven hand-off swing worked but was replaced by the world bible's swing (below).
  - The tile iris lands on the card band; the scene peel and the ink swipe (3 all-ink frames) work.
  - WordSlap, LineRise, the counter, type-on, the marker, the sparkles, the confetti, the lockup reveal and the sticker
    sheet all render.
- **Aligned with the locked v3 script (second pass, same day):**
  - The hand-off is now the world bible's swing (render-tested: the lean, the −4.9° apex, a level arrival, contact
    on f27).
  - The charm personalities are springs measured in Remotion: BTC −31% at f14, ETH −37% at f11, SOL −52% at f7.
  - The flip, the dash-by-dash records, the bonk and stamp, the frost wipe and melt, the Night blind and the caption
    slap were all render-tested (sheets `sheet-handoff3.png`, `sheet-script.png`, `sheet-frost.png`).
  - The `<Sfx>` example typechecks against `video/src2/lib/Sfx.tsx`.
- **Font axes:** read from the `fvar` tables with a small parser: Funnel Display wght 300–800 (no wdth or opsz);
  Onest and Geist Mono wght 100–900.
- **Still-valid traps from the cookbook:**
  - Transitions shorten the timeline.
  - Twelve shader transitions need a Chrome flag.
  - Use `<Img>`, not `background-image`.
  - Unique SVG ids.
  - Never put an easing on a time remap.
  - Mount the music bed at frame 0 so its volume callback sees composition frames.
- **New traps:**
  - Individual CSS transforms (`translate`, `rotate`, `scale`) apply in that fixed order, before `transform`.
  - `clip-path` clips an element's own box-shadow.
  - A spring with a negative frame returns `from` (the kit relies on this for delays).
  - `swingTrack` and `CharmBar` memoise on their inputs, so keep `barX` deterministic.
