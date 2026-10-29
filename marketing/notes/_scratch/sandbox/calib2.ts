import { spring, interpolate } from "remotion";
import { SPRING2, hangingSwing, EASE2, clamp } from "./src/brand2/motion.ts";
const fps = 30;
const entries: Record<string, (f: number) => number> = {
  land1400: (f) => -1400 + 1400 * spring({ frame: Math.max(0, f), fps, config: SPRING2.land }),
  carry1400: (f) => -1400 + 1400 * spring({ frame: Math.max(0, f), fps, config: SPRING2.carry }),
  swing18_1400: (f) => interpolate(f, [0, 18], [-1400, 0], { ...clamp, easing: EASE2.swing }),
  carry600: (f) => -600 + 600 * spring({ frame: Math.max(0, f), fps, config: SPRING2.carry }),
};
for (const [name, fn] of Object.entries(entries)) {
  for (const L of [600, 900, 1400, 2000]) {
    const th = Array.from({ length: 44 }, (_, f) => hangingSwing(f, fn, { lengthPx: L, periodF: 10, zeta: 0.3, maxDeg: 90 }));
    const pk = Math.max(...th.map(Math.abs));
    console.log(name.padEnd(13), "L", String(L).padEnd(5), "peak", pk.toFixed(1), th.slice(0, 40).map((v) => v.toFixed(1)).join(" "));
  }
}
