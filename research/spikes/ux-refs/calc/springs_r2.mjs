// THROWAWAY: measure motion@14.5.0's real spring generator for the kb/80 R2 motion rows (Phase 0, 2026-10-21).
// Loads `motion` READ-ONLY from research/spikes/ux/node_modules via createRequire; nothing there is modified.
// Run: node research/spikes/ux-refs/calc/springs_r2.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../ux/package.json'));
const { spring } = require('motion');

function measure(name, opts, from, to) {
  const gen = spring({ keyframes: [from, to], ...opts });
  const dist = to - from;
  let t95 = null, t99 = null, peak = from, lastOutside1 = 0, done = null;
  for (let t = 0; t <= 5000; t += 1) {
    const s = gen.next(t); const v = s.value; const p = (v - from) / dist;
    if (t95 === null && p >= 0.95) t95 = t;
    if (t99 === null && p >= 0.99) t99 = t;
    if ((dist > 0 && v > peak) || (dist < 0 && v < peak)) peak = v;
    if (Math.abs(p - 1) > 0.01) lastOutside1 = t;
    if (s.done && done === null) { done = t; break; }
  }
  const k = opts.stiffness, c = opts.damping, m = opts.mass ?? 1;
  const zeta = k ? +(c / (2 * Math.sqrt(k * m))).toFixed(2) : null;
  console.log(`| ${name} | ${from}→${to} | ${JSON.stringify(opts)} | ζ ${zeta} | 95% ${t95} ms | 99% ${t99} ms | ±1% ${lastOutside1} ms | rest ${done} ms | overshoot ${(((peak - to) / dist) * 100).toFixed(2)}% |`);
}

console.log('## R2 new springs');
measure('hallmark stamp (scale)', { stiffness: 520, damping: 32, mass: 1 }, 1.12, 1);
measure('hallmark stamp, rejected', { stiffness: 420, damping: 26, mass: 1 }, 1.12, 1);
measure('stack lift (P2)', { stiffness: 260, damping: 26, mass: 1 }, 0, -168);
measure('stack lift, no-bounce alt', { stiffness: 300, damping: 32, mass: 1 }, 0, -168);
measure('stack fan-out per card (P2)', { stiffness: 400, damping: 36, mass: 1 }, 0, 56);
measure('handoff land: card under recipient', { stiffness: 260, damping: 22, mass: 1 }, 0, 12);
console.log('## rev 1 springs re-verified (should match kb/80 rev 1)');
measure('handoff lift (rotate)', { stiffness: 260, damping: 22, mass: 1 }, 0, 6);
measure('handoff slide mobile', { stiffness: 120, damping: 18, mass: 1.2 }, 0, 240);
measure('handoff slide desktop', { stiffness: 120, damping: 18, mass: 1.2 }, 0, 520);
measure('handoff key', { stiffness: 180, damping: 20, mass: 1 }, 0, 180);
measure('pill/chip layout', { stiffness: 500, damping: 40, mass: 1 }, 0, 64);
measure('card tilt follow', { stiffness: 300, damping: 30, mass: 0.5 }, 0, 8);
