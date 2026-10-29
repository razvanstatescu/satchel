// Calibrate the charm swing. All time in frames at 30 fps.
const FPS = 30;

// Closed form, released from theta0 at rest:
// theta(f) = theta0 * e^(-lambda f) * (cos(wd f) + (lambda/wd) sin(wd f))
function swing(f: number, theta0 = 10, periodF = 10, settleF = 18, settlePct = 0.025, fromRest = true) {
  if (f < 0) return theta0;
  const wd = (2 * Math.PI) / periodF;               // rad per frame
  const lambda = Math.log(1 / settlePct) / settleF;   // envelope hits settlePct at settleF
  const env = Math.exp(-lambda * f);
  const c = Math.cos(wd * f);
  const s = fromRest ? (lambda / wd) * Math.sin(wd * f) : 0;
  return theta0 * env * (c + s);
}
const wd = (2 * Math.PI) / 10, lambda = Math.log(40) / 18;
const wn = Math.sqrt(wd * wd + lambda * lambda);
console.log('T=10f: wd(rad/f)=', wd.toFixed(4), 'lambda(/f)=', lambda.toFixed(4),
  '| per second: wd=', (wd * FPS).toFixed(2), 'lambda=', (lambda * FPS).toFixed(2), 'wn=', (wn * FPS).toFixed(2), 'zeta=', (lambda / wn).toFixed(3));
let row = '';
for (let f = 0; f <= 24; f++) row += `${f}:${swing(f).toFixed(2)} `;
console.log('fromRest  ', row);
row = '';
for (let f = 0; f <= 24; f++) row += `${f}:${swing(f, 10, 10, 18, 0.025, false).toFixed(2)} `;
console.log('pure cos  ', row);

// Driven damped pendulum: theta'' = -wn^2 sin(theta) - 2 zeta wn theta' - (a/L) cos(theta)
// pivotX(f) in px; L in px; integrate with 8 substeps per frame (semi-implicit Euler).
function driven(pivotX: (f: number) => number, frames: number, opts: { periodF?: number; zeta?: number; L?: number; sub?: number } = {}) {
  const { periodF = 10, zeta = 0.3, L = 300, sub = 8 } = opts;
  const wnL = (2 * Math.PI) / periodF / Math.sqrt(1 - zeta * zeta); // so the damped period = periodF
  const dt = 1 / sub;
  let th = 0, om = 0;
  const out: number[] = [0];
  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < sub; k++) {
      const t = f + k * dt;
      const a = (pivotX(t + dt) - 2 * pivotX(t) + pivotX(t - dt)) / (dt * dt); // px / frame^2
      const acc = -wnL * wnL * Math.sin(th) - 2 * zeta * wnL * om - (a / L) * Math.cos(th);
      om += acc * dt;
      th += om * dt;
    }
    out.push((th * 180) / Math.PI);
  }
  return out;
}
// Slide of 900 px over 14 frames with an expo in-out (bezier 0.87,0,0.13,1 approximated by smoothstep^3 style)
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // cubic in-out
const slide = (D: number, dur: number) => (t: number) => D * ease(t / dur);
for (const [D, dur, L] of [[900, 14, 300], [900, 18, 300], [600, 14, 300], [300, 10, 120]] as const) {
  const th = driven(slide(D, dur), 40, { L });
  const peak = Math.max(...th.map(Math.abs));
  console.log(`slide D=${D} dur=${dur} L=${L}: peak=${peak.toFixed(1)}deg`, th.slice(0, 36).map((v, i) => `${i}:${v.toFixed(1)}`).join(' '));
}
