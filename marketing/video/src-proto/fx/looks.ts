import type { BarrageLook, Vec3 } from "./barrageShader";
import { intSeed } from "../lib/seed";

/**
 * intensity (0..1) → tuned shader amounts. Each function returns a PARTIAL look; merge them with mergeLooks().
 * All px values are at 1080p. The curves are deliberately non-linear: low intensities stay subtle (a "living screen"),
 * the top of the range is reserved for hits on cuts (2–6 frames).
 */
type Partial = Omit<BarrageLook, "time" | "seed">;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease2 = (i: number) => i * i;

/** (a) Wave: VHS line wave plus a soft Wave-Warp sway. */
export const waveLook = (i: number): Partial => ({
  wave: lerp(0, 24, i),
  waveFreq: lerp(2.2, 5.5, i),
  sway: lerp(0, 14, ease2(i)), // above ~15 px the card turns into a waving flag (cheesy)
  swayLen: 950,
  rgb: lerp(0, 3, i), // chroma bleeds with the wobble, as on tape
  rgbAngle: 0,
});

/** (b) Turbulence warp: fbm displacement. Animate warpEvo for boil; pair with burst() on cuts. */
export const warpLook = (i: number, frame: number): Partial => ({
  warp: lerp(0, 150, ease2(i)),
  warpSize: lerp(420, 260, i),
  warpEvo: frame * 0.18,
  zoom: 0.025 * ease2(i),
});

/** (c) RGB split: lens-like (grows toward the edges), direction drifts. */
export const rgbLook = (i: number, frame: number): Partial => ({
  rgb: lerp(0, 20, Math.pow(i, 1.6)), // 0.5 → 6.6 px; above ~12 px text doubles: keep for 1–2 frame hits
  rgbAngle: 0.15 * Math.sin(frame * 0.21),
  rgbRadial: 0.55,
});

/** (d) Slice glitch: stepped bands; fringes inside displaced bands. */
export const slicesLook = (i: number): Partial => ({
  slices: i,
  sliceShift: lerp(30, 260, i),
  rgb: lerp(0, 5, i),
});

/** (e) Screen: scanlines, rolling band, grain, vignette, a cold desaturated grade. */
export const screenLook = (i: number): Partial => ({
  scan: lerp(0.06, 0.42, i),
  scanGap: 4,
  roll: lerp(0, 0.9, i),
  grain: lerp(0.04, 0.38, i),
  vignette: lerp(0.15, 0.55, i),
  desat: lerp(0.1, 0.55, i),
  contrast: lerp(0, 0.12, i),
  shadowTint: [lerp(1, 0.84, i), lerp(1, 0.9, i), lerp(1, 1.06, i)] as Vec3,
});

/** (g) Motion blur from a velocity (px/frame) and a zoom rate (Δscale/scale per frame). shutter 0.5 = 180°. */
export const motionLook = (vx: number, vy: number, zoomRate: number, shutter = 0.5): Partial => ({
  blurX: vx * shutter,
  blurY: vy * shutter,
  zoom: Math.min(0.35, Math.abs(zoomRate) * shutter),
  rgb: Math.min(10, Math.hypot(vx, vy) / 40), // fast moves fringe a little
  rgbAngle: Math.atan2(vy, vx),
});

/** Later partials win, except numeric "amount" keys, which add (so wave + slices both contribute rgb). */
const ADDITIVE = new Set(["wave", "sway", "warp", "rgb", "slices", "scan", "roll", "grain", "blurX", "blurY", "zoom", "flash"]);
export const mergeLooks = (time: number, seed: number, ...parts: Partial[]): BarrageLook => {
  const out: Record<string, unknown> = { time, seed };
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      if (ADDITIVE.has(k) && typeof v === "number" && typeof out[k] === "number") out[k] = (out[k] as number) + v;
      else out[k] = v;
    }
  }
  return out as BarrageLook;
};

/** Stepped seed: glitch patterns hold for `hold` frames (2 reads as "digital", 1 as "strobe"). */
export const stepSeed = (frame: number, hold = 2, name = "barrage") => intSeed(name, frame, hold);

/**
 * The combined barrage look with ONE master intensity (for a builder who wants a single knob), plus a `hit`
 * (0..1, e.g. bursts() on the cut list) that adds the warp + slice + split spike on cuts.
 */
export const barrageLook = (frame: number, intensity: number, hit = 0, opts: { hold?: number; noiseSeed?: number } = {}): BarrageLook =>
  mergeLooks(
    frame,
    stepSeed(frame, opts.hold ?? 2),
    screenLook(0.35 + 0.45 * intensity),
    waveLook(0.25 * intensity + 0.5 * hit),
    rgbLook(0.25 + 0.35 * intensity + 0.4 * hit, frame),
    slicesLook(Math.max(0, hit * 0.9 - 0.1)),
    warpLook(0.85 * hit, frame),
    { noiseSeed: opts.noiseSeed ?? 7 },
  );
