import { Easing, interpolate, random } from "remotion";
import { noise2D } from "@remotion/noise";

/**
 * Deterministic helpers. Never use Math.random(): every render worker must draw the same pixels for the same frame.
 * remotion's random(seed) is a stable hash of the seed string or number, in [0, 1).
 */

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** A value in [0, 1) that is stable for (seed, frame step). `hold` frames share one value (glitch looks stepped, not smooth). */
export const stepRand = (seed: string, frame: number, hold = 1, salt: string | number = 0) =>
  random(`${seed}|${Math.floor(frame / Math.max(1, hold))}|${salt}`);

/** Signed version in [-1, 1). */
export const stepRandS = (seed: string, frame: number, hold = 1, salt: string | number = 0) => stepRand(seed, frame, hold, salt) * 2 - 1;

/** A 32-bit integer seed for shaders (uint-safe, < 2^31). */
export const intSeed = (seed: string, frame = 0, hold = 1) => Math.floor(stepRand(seed, frame, hold, "int") * 2147483646);

/**
 * Burst envelope for an effect hit on a cut: instant attack at `at`, exponential-ish decay over `decay` frames.
 * Returns 0 before `at`, 1 on `at`, about 0.05 at `at + decay`. Multiply an effect's intensity by it.
 */
export const burst = (frame: number, at: number, decay = 6, attack = 0) => {
  const t = frame - at;
  if (t < -attack) return 0;
  if (t < 0) return interpolate(t, [-attack, 0], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  return Math.exp((-3 * t) / Math.max(1, decay));
};

/** Sum of bursts on a list of cut frames (capped at 1). */
export const bursts = (frame: number, cuts: number[], decay = 6, attack = 0) =>
  Math.min(1, cuts.reduce((acc, c) => acc + burst(frame, c, decay, attack), 0));

/**
 * Camera shake: smooth noise (not white noise) so it reads as a handheld jolt, decaying after a hit.
 * amp px, rotation deg. Translate only by default (rotation 0) — rotating screenshots makes text harder to read.
 */
export const shake = (frame: number, seed: string, amp: number, speed = 0.45, rotAmp = 0) => ({
  x: amp * noise2D(`${seed}x`, frame * speed, 0),
  y: amp * noise2D(`${seed}y`, frame * speed, 0),
  r: rotAmp * noise2D(`${seed}r`, frame * speed, 0),
});

/** Piecewise-linear time remap (speed ramp). Returns a fractional source frame. Never put an easing on a remap. */
export const remap = (frame: number, knots: [number, number][]) =>
  interpolate(
    frame,
    knots.map((k) => k[0]),
    knots.map((k) => k[1]),
    { extrapolateLeft: "clamp", extrapolateRight: "extend" },
  );

/** Integrate a speed curve (units per frame) from 0 to `frame` (inclusive of fractional part). O(frame), fine for intros. */
export const integrate = (frame: number, speed: (f: number) => number) => {
  let s = 0;
  const whole = Math.floor(frame);
  for (let f = 0; f < whole; f++) s += speed(f);
  return s + speed(whole) * (frame - whole);
};
