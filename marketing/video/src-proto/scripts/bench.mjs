// Render-cost benchmark: one bundle, one browser, renderFrames per composition (JPEG, no encode).
// Usage (from marketing/video, check `ps` first: the CPU is shared):
//   GL=null CONC=4 FRAMES=90 node src-proto/scripts/bench.mjs Bench-img Bench-svg-combo ...
// Prints wall ms/frame (throughput at CONC tabs) and the median / p90 in-tab ms per frame; appends JSON lines to
// out/proto/bench/results.jsonl.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderFrames, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const ids = process.argv.slice(2);
const gl = process.env.GL && process.env.GL !== "null" ? process.env.GL : null;
const concurrency = Number(process.env.CONC ?? 4);
const frames = Number(process.env.FRAMES ?? 90);
const scale = Number(process.env.SCALE ?? 1);
const bundleDir = path.join(root, "out/proto/bundle");
const outRoot = path.join(root, "out/proto/bench");
fs.mkdirSync(outRoot, { recursive: true });

const serveUrl =
  process.env.BUNDLE === "reuse" && fs.existsSync(path.join(bundleDir, "index.html"))
    ? bundleDir
    : await bundle({ entryPoint: path.join(root, "src-proto/index.ts"), outDir: bundleDir, publicDir: path.join(root, "public") });

const browser = await openBrowser("chrome", { chromiumOptions: { gl } });
const pct = (arr, p) => [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(p * arr.length))];

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, puppeteerInstance: browser, port: 3530, chromiumOptions: { gl } });
  const outputDir = path.join(outRoot, "tmp", id);
  fs.rmSync(outputDir, { recursive: true, force: true });
  // warm-up: 4 frames (page load, shader compile, image decode) not counted
  await renderFrames({
    composition, serveUrl, inputProps: {}, outputDir, imageFormat: "jpeg", jpegQuality: 80, concurrency, frameRange: [0, 3],
    puppeteerInstance: browser, port: 3530, chromiumOptions: { gl }, scale, onStart: () => {}, onFrameUpdate: () => {},
  });
  const per = [];
  const t0 = performance.now();
  await renderFrames({
    composition, serveUrl, inputProps: {}, outputDir, imageFormat: "jpeg", jpegQuality: 80, concurrency,
    frameRange: [0, Math.min(composition.durationInFrames, frames) - 1], puppeteerInstance: browser, port: 3530,
    chromiumOptions: { gl }, scale, onStart: () => {}, onFrameUpdate: (_n, _i, ms) => per.push(ms),
  });
  const wall = performance.now() - t0;
  const n = per.length;
  const row = { id, gl: gl ?? "default", concurrency, scale, frames: n, wallMsPerFrame: +(wall / n).toFixed(1), medianTabMs: Math.round(pct(per, 0.5)), p90TabMs: Math.round(pct(per, 0.9)), at: new Date().toISOString() };
  console.log(`${id.padEnd(24)} gl=${row.gl.padEnd(7)} wall ${String(row.wallMsPerFrame).padStart(6)} ms/f   tab median ${String(row.medianTabMs).padStart(5)} ms   p90 ${String(row.p90TabMs).padStart(5)} ms`);
  fs.appendFileSync(path.join(outRoot, "results.jsonl"), JSON.stringify(row) + "\n");
  if (process.env.KEEP !== "1") fs.rmSync(outputDir, { recursive: true, force: true });
}
await browser.close({ silent: true });
