import { Easing, interpolate, spring } from "remotion";

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Seconds → frames (rounded). All timing in the project is authored in seconds. */
export const s = (sec: number) => Math.round(sec * FPS);

// Hypermotion easings: hard acceleration, long soft landing.
export const EASE = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  quintOut: Easing.bezier(0.22, 1, 0.36, 1),
  standard: Easing.bezier(0.2, 0, 0, 1), // product --ease-standard
  whip: Easing.bezier(0.9, 0, 0.1, 1),
};

/** interpolate() over [startSec, endSec] of the local timeline, clamped, with an easing. */
export function tween(frame: number, startSec: number, endSec: number, from = 0, to = 1, easing = EASE.expoOut) {
  return interpolate(frame, [s(startSec), s(endSec)], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Spring starting at `startSec`. Presets mirror the product's motion spec plus punchier video springs. */
export const SPRING = {
  lift: { stiffness: 260, damping: 22, mass: 1 }, // product spring-lift
  handoff: { stiffness: 120, damping: 18, mass: 1.2 }, // product spring-handoff (~700 ms)
  slam: { stiffness: 320, damping: 24, mass: 0.9 }, // kinetic type slam, tiny overshoot
  snap: { stiffness: 500, damping: 40, mass: 0.6 }, // UI snaps, no overshoot
  soft: { stiffness: 90, damping: 20, mass: 1 },
};

export function springAt(frame: number, fps: number, startSec: number, config = SPRING.slam, durationInFrames?: number) {
  return spring({ frame: frame - s(startSec), fps, config, durationInFrames });
}
