import { Easing, interpolate } from "remotion";
import { clamp } from "../lib/seed";

/**
 * (g) Camera moves for the barrage: a zoom PUNCH (fast push-in that eases back to a held zoom) and a WHIP (fast
 * pan between cards laid out on a strip). Velocity and zoom rate are central differences of the same path, so the
 * motion blur always matches the move (GL route: motionLook(vx, vy, zoomRate)).
 */

/** Punch-in: 0 → ~+13% in 2 frames, eases back to a held +6% by about 10 frames. amt scales it. */
export const punchAt = (f: number, at: number, amt = 1) => {
  const t = f - at;
  if (t <= 0) return 0;
  return amt * (0.06 + 0.14 * Math.exp(-t / 4)) * (1 - Math.exp(-t / 0.8));
};

/** Whip between strip positions: a hard in-out (most of the travel in the middle 2 frames). */
export const WHIP_EASE = Easing.bezier(0.75, 0, 0.25, 1);
export const whipAt = (f: number, at: number, dur: number, from: number, to: number) =>
  interpolate(f, [at, at + dur], [from, to], { ...clamp, easing: WHIP_EASE });

export type Cam = { x: number; y: number; s: number };

/** Velocity (screen px/frame) and zoom rate (Δs/s per frame) of a camera path at frame f. */
export const camMotion = (path: (f: number) => Cam, f: number) => {
  const a = path(f - 0.5);
  const b = path(f + 0.5);
  const c = path(f);
  return { vx: -(b.x - a.x) * c.s, vy: -(b.y - a.y) * c.s, zoomRate: (b.s - a.s) / c.s };
};
