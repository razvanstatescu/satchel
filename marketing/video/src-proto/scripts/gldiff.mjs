// Does --gl=angle change the film's body? Renders the same stills from ONE bundle of src2 with gl=null and gl=angle,
// then compares them pixel by pixel (ffmpeg PSNR + count of differing pixels).
// Usage (from marketing/video): node src-proto/scripts/gldiff.mjs out/proto/gldiff H2:120 C1:200 T3:120 E1:60
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const [outDir, ...jobs] = process.argv.slice(2);
const out = path.resolve(root, outDir);
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src2/index.ts"), outDir: path.join(out, "bundle"), publicDir: path.join(root, "public") });

const files = {};
for (const gl of [null, "angle"]) {
  const browser = await openBrowser("chrome", { chromiumOptions: { gl } });
  for (const job of jobs) {
    const [id, frameStr] = job.split(":");
    const frame = Number(frameStr);
    const composition = await selectComposition({ serveUrl, id, inputProps: {}, puppeteerInstance: browser, port: 3530, chromiumOptions: { gl } });
    const output = path.join(out, `${id}-f${frame}-${gl ?? "default"}.png`);
    await renderStill({ composition, serveUrl, output, frame, inputProps: {}, puppeteerInstance: browser, port: 3530, chromiumOptions: { gl }, imageFormat: "png" });
    (files[job] ??= []).push(output);
  }
  await browser.close({ silent: true });
}
fs.rmSync(path.join(out, "bundle"), { recursive: true, force: true });

for (const [job, [a, b]] of Object.entries(files)) {
  let log = "";
  try {
    log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${a}" -i "${b}" -lavfi psnr -f null - 2>&1`], { encoding: "utf8" });
  } catch (e) {
    log = String(e.stdout ?? "");
  }
  const avg = (log.match(/average:([0-9.inf]+)/) ?? [])[1] ?? "?";
  // count differing pixels: difference blend → any non-zero channel
  const diff = path.join(out, `${job.replace(":", "-f")}-diff.png`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", a, "-i", b, "-filter_complex", "[0]format=rgb24[x];[1]format=rgb24[y];[x][y]blend=all_mode=difference,format=gray,geq=lum='if(gt(lum(X,Y),0),255,0)'", diff]);
  const stats = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${diff}" -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | head -1`], { encoding: "utf8" }).trim();
  const share = Number(stats.split("=")[1] ?? 0) / 255;
  console.log(`${job.padEnd(10)} PSNR ${avg.padStart(9)} dB   pixels differing: ${(share * 100).toFixed(4)}%`);
}
