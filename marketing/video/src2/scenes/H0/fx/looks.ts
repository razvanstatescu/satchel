import type { BarrageLook, Vec3 } from "./barrageShader";

/**
 * intensity (0..1) → tuned amounts of the barrage pass (px at 1080p). Ported from the prototype (tech.md §3); merge
 * partials with mergeLooks(). Low intensities stay subtle; the top of each range is for 1–3 frame hits on cuts.
 */
type Partial = Omit<BarrageLook, "time" | "seed">;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** VHS line wave plus a soft sway (sway capped: above ~15 px a card turns into a waving flag). */
export const waveLook = (i: number): Partial => ({ wave: lerp(0, 24, i), waveFreq: lerp(2.2, 5.5, i), sway: lerp(0, 14, i * i), swayLen: 950, rgb: lerp(0, 3, i) });

/** Turbulent displace: fbm warp, evolution on the frame; pair with burst() on cuts. */
export const warpLook = (i: number, frame: number): Partial => ({ warp: lerp(0, 150, i * i), warpSize: lerp(420, 260, i), warpEvo: frame * 0.18, zoom: 0.025 * i * i });

/** RGB split: lens-like (grows toward the edges); 0.5 → 6.6 px, 1 → 20 px. */
export const rgbLook = (i: number, frame: number): Partial => ({ rgb: lerp(0, 20, Math.pow(i, 1.6)), rgbAngle: 0.15 * Math.sin(frame * 0.21), rgbRadial: 0.55 });

/** Slice glitch: stepped bands, fringes inside displaced bands. */
export const slicesLook = (i: number): Partial => ({ slices: i, sliceShift: lerp(30, 260, i), rgb: lerp(0, 5, i) });

/** The screen: scanlines, rolling band, grain, vignette, a cold desaturated grade. */
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

/** Motion blur from a camera velocity (px/f) and zoom rate; shutter 0.5 = 180°. */
export const motionLook = (vx: number, vy: number, zoomRate: number, shutter = 0.5): Partial => ({
  blurX: vx * shutter,
  blurY: vy * shutter,
  zoom: Math.min(0.35, Math.abs(zoomRate) * shutter),
  rgb: Math.min(10, Math.hypot(vx, vy) / 40),
  rgbAngle: Math.atan2(vy, vx),
});

/** Later partials win, except the amounts listed here, which add up. */
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
