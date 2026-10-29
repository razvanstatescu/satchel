// Measure candidate spring presets with Remotion's own implementation (4.0.537).
const R = require('/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/video/node_modules/remotion');
const { spring, measureSpring } = R;
const fps = 30;
const presets = {
  // name: config
  slap:      { mass: 1, stiffness: 520, damping: 22 },
  slapSoft:  { mass: 1, stiffness: 380, damping: 20 },
  pop:       { mass: 0.8, stiffness: 420, damping: 16 },
  settle:    { mass: 1, stiffness: 380, damping: 31.2 }, // M3 expressive default spatial (zeta .8, k 380)
  fastSpatial:{ mass: 1, stiffness: 800, damping: 33.9 }, // M3 expressive fast spatial (zeta .6, k 800)
  slowSpatial:{ mass: 1, stiffness: 200, damping: 22.6 }, // M3 expressive slow spatial (zeta .8, k 200)
  effects:   { mass: 1, stiffness: 1600, damping: 80 },   // M3 default effects (zeta 1, k 1600)
  press:     { mass: 0.6, stiffness: 900, damping: 40 },
  release:   { mass: 0.7, stiffness: 500, damping: 18 },
  slide:     { mass: 1.1, stiffness: 170, damping: 22 },
  remotionDefault: { mass: 1, stiffness: 100, damping: 10 },
  smooth200: { mass: 1, stiffness: 100, damping: 200 },
};
const zeta = (c) => (c.damping / (2 * Math.sqrt(c.stiffness * c.mass))).toFixed(3);
for (const [name, config] of Object.entries(presets)) {
  const settle = measureSpring({ fps, config });
  let peak = 0, peakF = 0, first1 = null, under = 1, underF = null;
  const vals = [];
  for (let f = 0; f <= 60; f++) {
    const v = spring({ frame: f, fps, config });
    vals.push(v);
    if (v > peak) { peak = v; peakF = f; }
    if (first1 === null && v >= 1) first1 = f;
  }
  // first trough after peak
  for (let f = peakF; f <= 60; f++) { if (vals[f] < under) { under = vals[f]; underF = f; } }
  console.log(`${name.padEnd(16)} zeta=${zeta(config)} settle=${settle}f  first>=1 @f${first1}  peak=${peak.toFixed(4)} @f${peakF}  trough=${under.toFixed(4)} @f${underF}`);
  console.log('   ', vals.slice(0, 16).map((v) => v.toFixed(3)).join(' '));
}
