import { measureSpring, spring } from "remotion";
import { SPRING2, slapAt, swingFromRest, hangingSwing, EASE2, clamp } from "./src/brand2/motion.ts";
import { interpolate } from "remotion";
const fps = 30;
console.log("== SPRING2 presets");
for (const [name, config] of Object.entries(SPRING2)) {
  const zeta = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));
  let peak = 0, peakF = 0;
  for (let f = 0; f <= 60; f++) { const v = spring({ frame: f, fps, config }); if (v > peak) { peak = v; peakF = f; } }
  console.log(name.padEnd(8), JSON.stringify(config), "zeta", zeta.toFixed(2), "settle", measureSpring({ fps, config }), "f", "peak", peak.toFixed(3), "@f" + peakF);
}
console.log("== slapAt (rest 10 px): frame sx sy lift shadowOffset opacity");
for (let f = 0; f <= 18; f++) { const s = slapAt(f, fps, 10); console.log(f, s.sx.toFixed(3), s.sy.toFixed(3), s.lift.toFixed(1), Math.max(0, 10 + s.lift).toFixed(1), s.opacity.toFixed(2)); }
console.log("== swingFromRest (10 deg, T 10 f, settle 18 f)");
console.log(Array.from({ length: 22 }, (_, f) => `${f}:${swingFromRest(f).toFixed(2)}`).join(" "));
console.log("== press (rest 10): frame lift shadow");
const pressAt = (f: number, at: number, rest: number) => {
  if (f < at) { const p = interpolate(f, [at - 3, at], [0, 1], { ...clamp, easing: EASE2.fall }); return -rest * p; }
  const r = spring({ frame: f - at - 3, fps, config: SPRING2.rebound }); return -rest * (1 - r);
};
console.log(Array.from({ length: 20 }, (_, i) => { const f = i + 7; const l = pressAt(f, 10, 10); return `${f}:${l.toFixed(1)}/${Math.max(0, 10 + l).toFixed(1)}`; }).join(" "));
console.log("== hangingSwing: bar slides 1400 px in 16 f expoOut (charms), periods 10/10.6/9.5");
const barX = (f: number) => interpolate(f, [0, 16], [-1400, 0], { ...clamp, easing: EASE2.out });
for (const T of [10, 10.6, 9.5]) console.log(T, Array.from({ length: 36 }, (_, f) => hangingSwing(f, barX, { lengthPx: 420, periodF: T, zeta: 0.3, maxDeg: 14 }).toFixed(1)).join(" "));
console.log("== hand-off normalised: slide 6..24 cubic in-out 960 px");
const slideX = (f: number) => interpolate(f, [6, 24], [480, 1440], { ...clamp, easing: EASE2.swing });
const raw = Array.from({ length: 40 }, (_, f) => hangingSwing(f, slideX, { lengthPx: 600, periodF: 10, zeta: 0.32, maxDeg: 90 }));
const pk = Math.max(...raw.map(Math.abs));
console.log("raw peak", pk.toFixed(1), raw.map((d, f) => `${f}:${(10 * d / pk).toFixed(1)}`).join(" "));
