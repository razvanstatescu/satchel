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

