import { spring, measureSpring } from "remotion";
import { swingFromRest } from "./src/brand2/motion.ts";
const wd = 2 * Math.PI / (10 / 30); // rad/s
const lambda = Math.log(40) / (18 / 30); // 1/s
const wn = Math.sqrt(wd * wd + lambda * lambda);
const config = { mass: 1, stiffness: +(wn * wn).toFixed(1), damping: +(2 * lambda).toFixed(2) };
console.log("wn", wn.toFixed(3), "zeta", (lambda / wn).toFixed(3), "config", JSON.stringify(config), "measureSpring", measureSpring({ fps: 30, config, threshold: 0.025 }), "f @2.5%");
let maxErr = 0;
const rows: string[] = [];
for (let f = 0; f <= 24; f++) {
  const a = swingFromRest(f, 10, 10, 18);
  const b = spring({ frame: f, fps: 30, from: 10, to: 0, config });
  maxErr = Math.max(maxErr, Math.abs(a - b));
  rows.push(`${f}:${a.toFixed(2)}/${b.toFixed(2)}`);
}
console.log(rows.join(" "));
console.log("max abs error (deg)", maxErr.toFixed(3));
