import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.dirname(new URL(import.meta.url).pathname);
const browserExecutable = "/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/video/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const jobs = JSON.parse(process.argv[2]); // [{id, frames:[...]}]

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  outDir: path.join(root, "tmp/bundle"),
  enableCaching: false,
  publicDir: path.join(root, "public"),
});
for (const job of jobs) {
  const composition = await selectComposition({ serveUrl, id: job.id, browserExecutable });
  for (const frame of job.frames) {
    const output = path.join(root, "out", `${job.id}-${String(frame).padStart(3, "0")}.png`);
    await renderStill({ serveUrl, composition, frame, output, browserExecutable, scale: 0.5, overwrite: true });
    console.log("ok", output);
  }
}
