// Read-only stills of the real Satchel 2.0 app (fixture mode) for the film's "this is the real app" moments.
// Runs against the app team's dev server (http://localhost:3210; use localhost, not 127.0.0.1). Never starts a server,
// never connects a real wallet, aborts every non-local request. Wording is rewritten to mainnet style at capture time
// only (`.near`, no "testnet"/"Sepolia"/"testnet4"; Testnet badges hidden), as the film requires; the app is untouched.
// Usage: node marketing/tools/capture/capture-v2app.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, "../../../apps/web/package.json"));
const { chromium } = require("@playwright/test");

const BASE = process.env.APP_URL ?? "http://localhost:3210";
const OUT = resolve(here, "../../video/public/v2/ui");
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: "s1-owner", path: "/s/1", account: "alice.satchelhq.testnet" },
  { name: "s3-sale-clean", path: "/s/3/sale", account: "carol.satchelhq.testnet", waitText: /Clean/ },
  { name: "s4-sale-blocked", path: "/s/4/sale", account: "carol.satchelhq.testnet", waitText: /Blocked|isn.t used yet/ },
  { name: "s1-send-evm", path: "/s/1/send?chain=evm", account: "alice.satchelhq.testnet" },
  { name: "s1-give", path: "/s/1/transfer", account: "alice.satchelhq.testnet" },
  { name: "landing", path: "/", account: null },
];

function mainnetRewrite() {
  const rules = [
    [/satchel\.satchelhq\.testnet/g, "satchel.satchelhq.near"],
    [/([a-z0-9_-]+)\.satchelhq\.testnet/g, "$1.near"],
    [/\.testnet\b/g, ".near"],
    [/Bitcoin testnet4/g, "Bitcoin"],
    [/Ethereum Sepolia/g, "Ethereum"],
    [/Solana devnet/g, "Solana"],
    [/NEAR testnet/g, "NEAR"],
    [/\btestnet4\b/g, ""],
    [/\bSepolia\b/g, ""],
    [/\bdevnet\b/g, ""],
    [/\btb1q/g, "bc1q"],
  ];
  const fix = (s) => rules.reduce((t, [re, to]) => t.replace(re, to), s);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = n.nodeValue;
    if (v && /testnet|Sepolia|devnet|tb1q/i.test(v)) n.nodeValue = fix(v);
  }
  for (const el of document.querySelectorAll("[title],[aria-label],[placeholder]")) {
    for (const a of ["title", "aria-label", "placeholder"]) {
      const v = el.getAttribute(a);
      if (v && /testnet|Sepolia|devnet|tb1q/i.test(v)) el.setAttribute(a, fix(v));
    }
  }
  // capture-only cleanup: Next's dev indicator, the fixture "Sample data" banner, testnet-faucet links
  const st = document.createElement("style");
  st.textContent = "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }";
  document.head.appendChild(st);
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 2) continue;
    const t = (el.textContent ?? "").trim();
    if (/^Sample data: these pages don.t read the chains live\.?$/i.test(t)) {
      const bar = el.closest("[role=status],[role=note],aside,header,div") ?? el;
      bar.style.display = "none";
    }
  }
  for (const a of document.querySelectorAll("a")) if (/testnet/i.test(a.textContent ?? "")) a.style.display = "none";
  // hide Testnet badges and the "Testnet only" footer lines
  for (const el of document.querySelectorAll("body *")) {
    const t = (el.textContent ?? "").trim();
    if ((el.children.length === 0 && /^Testnet$/i.test(t)) || (el.children.length <= 2 && /^Testnet only/i.test(t))) {
      (el.closest("p,span,div") ?? el).style.visibility = "hidden";
    }
  }
  // empty "Bitcoin " / "Ethereum " sublabels left by the rewrite: trim double spaces
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w2.nextNode(); n; n = w2.nextNode()) if (n.nodeValue) n.nodeValue = n.nodeValue.replace(/ {2,}/g, " ").replace(/ ·\s*$/, "");
}

const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
    await ctx.route("**/*", (route) => {
      const u = new URL(route.request().url());
      return u.hostname === "localhost" ? route.continue() : route.abort();
    });
    await ctx.addInitScript((acct) => {
      try {
        if (acct) window.localStorage.setItem("satchel:mock-wallet", acct);
        else window.localStorage.removeItem("satchel:mock-wallet");
        window.localStorage.setItem("satchel:theme:v1", "day");
        window.localStorage.setItem("satchel:sim:mode", "normal");
      } catch {}
    }, shot.account);
    const page = await ctx.newPage();
    await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (shot.waitText) await page.getByText(shot.waitText).first().waitFor({ timeout: 20000 }).catch(() => console.warn(`  (no ${shot.waitText} on ${shot.path})`));
    await page.waitForTimeout(1200);
    await page.evaluate(mainnetRewrite);
    const left = await page.evaluate(() => (document.body.innerText.match(/testnet|Sepolia|devnet|tb1q/gi) ?? []).length);
    await page.screenshot({ path: `${OUT}/${shot.name}@2x.png` });
    console.log(`${shot.name}: ${shot.path} as ${shot.account ?? "visitor"} · leftover testnet words: ${left}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
