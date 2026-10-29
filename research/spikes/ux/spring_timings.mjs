// Throwaway: measure Motion's real spring generator (motion@14.5.0) for candidate transitions.
import { spring } from "motion";
function measure(name, opts, from, to) {
  const gen = spring({ keyframes: [from, to], ...opts });
  const dist = to - from;
  let t95 = null, t99 = null, peak = from, lastOutside1 = 0, done = null;
  for (let t = 0; t <= 5000; t += 1) {
    const s = gen.next(t);
    const v = s.value;
    const p = (v - from) / dist;
    if (t95 === null && p >= 0.95) t95 = t;
    if (t99 === null && p >= 0.99) t99 = t;
    if ((dist > 0 && v > peak) || (dist < 0 && v < peak)) peak = v;
    if (Math.abs(p - 1) > 0.01) lastOutside1 = t;
    if (s.done && done === null) { done = t; break; }
  }
  const overshootPct = ((peak - to) / dist) * 100;
  const k = opts.stiffness, c = opts.damping, m = opts.mass ?? 1;
  const zeta = k ? (c / (2 * Math.sqrt(k * m))) : null;
  console.log(JSON.stringify({ name, ...opts, from, to, zeta: zeta && +zeta.toFixed(3), t95, t99, settle1pct: lastOutside1, done, overshootPct: +overshootPct.toFixed(2) }));
}
// visualDuration -> physics (Motion formula, bounce>0 so overdamped scale = 1)
const fromVisual = (vd, bounce) => { const z = 1 - bounce; const r = (2 * Math.PI) / (vd * 1.2); return { stiffness: +(r*r).toFixed(2), damping: +(2*z*r).toFixed(2), mass: 1 }; };
console.log("visual 0.7/0.2 ->", fromVisual(0.7, 0.2), " visual 0.5/0.15 ->", fromVisual(0.5, 0.15));
// Handoff slide candidates (x in px, ~240 px at 390 px viewport; ~520 px desktop)
measure("handoff-slide A (vd0.7,b0.2)", fromVisual(0.7, 0.2), 0, 240);
measure("handoff-slide A desktop", fromVisual(0.7, 0.2), 0, 520);
measure("handoff-slide B", { stiffness: 120, damping: 18, mass: 1.2 }, 0, 240);
measure("handoff-slide C", { stiffness: 140, damping: 20, mass: 1.4 }, 0, 240);
measure("handoff-slide D", { stiffness: 90, damping: 15, mass: 1 }, 0, 240);
measure("handoff-slide E", { stiffness: 100, damping: 16, mass: 1.1 }, 0, 240);
// Lift + tilt (rotate 0->6 deg, scale 1->1.04, y 0->-12)
measure("lift-rotate", { stiffness: 260, damping: 22, mass: 1 }, 0, 6);
measure("lift-y", { stiffness: 260, damping: 22, mass: 1 }, 0, -12);
measure("lift-scale", { stiffness: 260, damping: 22, mass: 1 }, 1, 1.04);
// Key icon rotate 180
measure("key-rotate", { stiffness: 140, damping: 16, mass: 1 }, 0, 180);
measure("key-rotate2", { stiffness: 180, damping: 20, mass: 1 }, 0, 180);
// Card flip rotateY 0->180
measure("flip (vd0.5,b0.15)", fromVisual(0.5, 0.15), 0, 180);
measure("flip alt", { stiffness: 170, damping: 22, mass: 1 }, 0, 180);
// Pointer tilt follow (deg)
measure("tilt-follow", { stiffness: 300, damping: 30, mass: 0.5 }, 0, 8);
measure("tilt-follow2", { stiffness: 220, damping: 24, mass: 0.6 }, 0, 8);
// Chip / pill layout
measure("chip-layout", { stiffness: 500, damping: 40, mass: 1 }, 0, 64);
