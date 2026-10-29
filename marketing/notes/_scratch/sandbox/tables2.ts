import { spring, interpolate } from "remotion";
import { SPRING2, swingTrack, EASE2, clamp } from "./src/brand2/motion.ts";
const barX = (f: number) => -1400 + 1400 * spring({ frame: Math.max(0, f), fps: 30, config: SPRING2.carry });
for (const T of [10, 10.6, 9.5]) console.log("charm T", T, swingTrack(barX, 30, { periodF: T, zeta: 0.3, peakDeg: 12 }).map((v) => v.toFixed(1)).join(" "));
const slideX = (f: number) => interpolate(f, [6, 24], [480, 1440], { ...clamp, easing: EASE2.swing });
console.log("handoff", swingTrack(slideX, 40, { periodF: 10, zeta: 0.32, peakDeg: 10 }).map((v, f) => `${f}:${v.toFixed(1)}`).join(" "));
