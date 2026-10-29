// CI guard (kb/90 §8.3, §12.6): the deprecated near.org testnet RPC must appear nowhere in apps/web — sources, config,
// tests, and the built client/server output (.next) — excluding only third-party node_modules.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const needle = ["rpc", "testnet", "near", "org"].join(".");
const skip = new Set(["node_modules", ".git", "test-results", "playwright-report"]);
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (st.size < 20_000_000 && readFileSync(p).includes(needle)) hits.push(relative(root, p));
  }
}
walk(root);
if (hits.length) {
  console.error(`found ${needle} in:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`ok: ${needle} appears nowhere in apps/web (sources + .next build output)`);
