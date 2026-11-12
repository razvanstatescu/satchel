// Render many stills from ONE bundle and ONE browser (npx remotion still re-bundles every call).
// Usage (from marketing/video):
//   node src-proto/scripts/stills.mjs <outDir> <comp>:<frame>[:<jsonProps>][@<file.png>] ...
//   GL=angle node src-proto/scripts/stills.mjs out/proto A-Wave:40 "C-Rgb:59" 'D-Slices:20:{"route":"css"}@d-css.png'
// Env: GL (null|angle|swangle…), SCALE (default 1), BUNDLE=reuse (skip re-bundling if out/proto/bundle exists).
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const [outDir, ...jobs] = process.argv.slice(2);
const gl = process.env.GL && process.env.GL !== "null" ? process.env.GL : null;
const scale = Number(process.env.SCALE ?? 1);
const entry = process.env.ENTRY ?? "src-proto/index.ts";
const bundleDir = path.join(root, entry.startsWith("src2") ? "out/proto/bundle-src2" : "out/proto/bundle");

const t0 = Date.now();
const serveUrl =
  process.env.BUNDLE === "reuse" && fs.existsSync(path.join(bundleDir, "index.html"))
    ? bundleDir
    : await bundle({ entryPoint: path.join(root, entry), outDir: bundleDir, publicDir: path.join(root, "public") });
console.log(`bundle ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const browser = await openBrowser("chrome", { chromiumOptions: { gl } });
fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
for (const job of jobs) {
  const [spec, fileName] = job.split("@");
  const [id, frameStr, ...rest] = spec.split(":");
  const inputProps = rest.length ? JSON.parse(rest.join(":")) : {};
  const frame = Number(frameStr ?? 0);
  const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, port: 3530, chromiumOptions: { gl } });
  const output = path.resolve(root, outDir, fileName ?? `${id}-f${frame}.png`);
  const t = Date.now();
  await renderStill({ composition, serveUrl, output, frame, inputProps, puppeteerInstance: browser, port: 3530, scale, chromiumOptions: { gl }, imageFormat: "png" });
  console.log(`${path.relative(root, output)}  ${Date.now() - t} ms`);
}
await browser.close({ silent: true });
