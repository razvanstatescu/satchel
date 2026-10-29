import { spring, measureSpring } from "remotion";
const fps = 30;
const mk = (periodS: number, zeta: number) => {
  const wd = (2 * Math.PI) / periodS;
  const wn = wd / Math.sqrt(1 - zeta * zeta);
  return { mass: 1, stiffness: +(wn * wn).toFixed(1), damping: +(2 * zeta * wn).toFixed(2), wn, freqHzKit: wn / (2 * Math.PI) };
};
const rows: [string, number, number][] = [
  ["handoff (world bible -10,+5,-2,0)", 0.394, 0.22],
  ["BTC heavy 0.9 s", 0.9, 0.35],
  ["ETH curious 0.7 s", 0.7, 0.3],
  ["SOL quick 0.45 s", 0.45, 0.2],
];
for (const [name, T, z] of rows) {
  const c = mk(T, z);
  const config = { mass: 1, stiffness: c.stiffness, damping: c.damping };
  const vals = Array.from({ length: 61 }, (_, f) => spring({ frame: f, fps, from: 10, to: 0, config }));
  const ext: string[] = [];
  for (let f = 1; f < 60; f++) {
    if ((vals[f] - vals[f - 1]) * (vals[f + 1] - vals[f]) < 0) ext.push(`f${f}:${vals[f].toFixed(1)}`);
  }
  const settle = measureSpring({ fps, config, threshold: 0.025 });
  console.log(name.padEnd(36), JSON.stringify(config), `kit pendulum freqHz=${c.freqHzKit.toFixed(2)} zeta=${z}`, "| extremes", ext.slice(0, 5).join(" "), "| inside 2.5% from f" + settle);
}
