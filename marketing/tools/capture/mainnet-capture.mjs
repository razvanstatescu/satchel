// Capture-time-only mainnet wording for two video plates. Same settings as marketing/tools/capture/capture.mjs.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const ROOT = "/Users/razvanstatescu/Documents/Work/near/Satchel";
const require = createRequire(path.join(ROOT, "apps/web/package.json"));
const { chromium } = require("@playwright/test");
const BASE = "http://127.0.0.1:3107";
const OUT = path.join(ROOT, "marketing/video/public/ui");
const CAPTURE_CSS = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
  div:has(> [data-testid="fixture-strip"]:only-child) { display: none !important; } [data-testid="fixture-strip"] { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`;
const blocked = new Set();
const problems = [];

async function newCtx(browser, { persona = null, delay = 1500 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: "no-preference", serviceWorkers: "block" });
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    blocked.add(`${u.protocol}//${u.host}${u.pathname}`);
    return route.abort();
  });
  await ctx.addInitScript(([acct, d]) => {
    try {
      if (acct) localStorage.setItem("satchel:mock-wallet", acct); else localStorage.removeItem("satchel:mock-wallet");
      localStorage.setItem("satchel:sim:mode", "normal");
      localStorage.setItem("satchel:sim:delay", String(d));
      localStorage.removeItem("satchel:mock-wallet:reject");
    } catch {}
  }, [persona, delay]);
  return ctx;
}
async function newPage(ctx, label) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) problems.push(`[${label}] console.error: ${m.text().slice(0, 200)}`); });
  return page;
}
async function settle(page, extraMs = 500) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((css) => {
    let s = document.getElementById("__capture_css");
    if (!s) { s = document.createElement("style"); s.id = "__capture_css"; document.head.appendChild(s); }
    s.textContent = css;
  }, CAPTURE_CSS);
  await page.waitForTimeout(extraMs);
}
async function go(page, route, extraMs) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page, extraMs);
}

// Rewrite visible wording to mainnet. Runs in the page.
function mainnetify() {
  const rules = [
    [/network-config testnet-fastnear/g, "network-config mainnet"],
    [/tx\.test\.fastnear\.com/g, "tx.main.fastnear.com"],
    [/near-testnet\.drpc\.org/g, "near.drpc.org"],
    [/NEAR testnet/g, "NEAR mainnet"],
    [/Bitcoin testnet4/g, "Bitcoin"],
    [/Ethereum Sepolia/g, "Ethereum"],
    [/Solana devnet/g, "Solana"],
    [/\b([a-z0-9_-]+(?:\.[a-z0-9_-]+)*)\.testnet\b/g, "$1.near"],
    [/\btb1q/g, "bc1q"],
  ];
  const fix = (s) => rules.reduce((a, [re, to]) => a.replace(re, to), s);
  const changed = [];
  // remove / hide whole elements first
  for (const el of [...document.querySelectorAll("a, button, span, p, div, small")]) {
    const t = (el.textContent || "").trim();
    if (/^Get testnet USDC$/.test(t) && el.children.length === 0) { changed.push("removed: " + t); el.remove(); }
  }
  for (const el of [...document.querySelectorAll("body *")]) {
    const t = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (t === "Testnet only. Coins here have no value." && ![...el.children].some((c) => (c.textContent || "").trim().replace(/\s+/g, " ") === t)) {
      el.style.setProperty("visibility", "hidden", "important"); changed.push("hidden footer");
    }
    if (t === "fixture" && el.children.length === 0) { el.style.setProperty("display", "none", "important"); changed.push("hidden fixture tag"); }
  }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const v = fix(n.nodeValue);
    if (v !== n.nodeValue) { changed.push(n.nodeValue.slice(0, 80) + " → " + v.slice(0, 80)); n.nodeValue = v; }
  }
  for (const el of document.querySelectorAll("*")) {
    for (const a of ["title", "aria-label", "alt", "placeholder", "value", "data-copy", "href"]) {
      const v = el.getAttribute(a);
      if (v != null) { const f = fix(v); if (f !== v) el.setAttribute(a, f); }
    }
  }
  // leftovers among visible text
  const left = [];
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while ((n = w2.nextNode())) {
    if (/testnet|sepolia|devnet|fixture|tb1/i.test(n.nodeValue)) {
      const el = n.parentElement; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const vis = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && el.closest("[style*='display: none']") === null && el.offsetParent !== null;
      left.push(`${vis ? "VISIBLE" : "hidden"} y=${Math.round(r.y)} ${n.nodeValue.trim().slice(0, 100)}`);
    }
  }
  // horizontal overflow check
  const over = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible" && el.clientWidth > 0) over.push(el.tagName + "." + (el.className || "").toString().slice(0, 40));
  }
  return { changed, left, over, docOverflow: document.documentElement.scrollWidth > innerWidth };
}

const browser = await chromium.launch();
try {
  // contract (visitor, same as desktop loop)
  const ctx = await newCtx(browser, {});
  const p = await newPage(ctx, "contract");
  await go(p, "/contract", 700);
  const r1 = await p.evaluate(mainnetify);
  await p.waitForTimeout(300);
  console.log("contract", JSON.stringify(r1, null, 1));
  await p.screenshot({ path: path.join(OUT, "desktop/contract-mainnet@2x.png"), animations: "disabled", caret: "hide", timeout: 60_000 });
  await ctx.close();

  // buy flow (carol): #4 first, then #3, as in capture.mjs
  const kctx = await newCtx(browser, { persona: "carol.satchelhq.testnet", delay: 1500 });
  const k = await newPage(kctx, "buy");
  await go(k, "/s/4/sale", 800);
  await k.locator("[data-testid='buy-block'] [data-gate='blocked']").waitFor({ timeout: 20_000 });
  await settle(k, 300);
  await go(k, "/s/3/sale", 800);
  await k.locator("[data-testid='buy-block'] [data-gate='clean']").waitFor({ timeout: 20_000 });
  await settle(k, 300);
  const r2 = await k.evaluate(mainnetify);
  await k.waitForTimeout(300);
  console.log("buy", JSON.stringify(r2, null, 1));
  await k.screenshot({ path: path.join(OUT, "flows/buy-s3-1-clean-mainnet@2x.png"), animations: "disabled", caret: "hide", timeout: 60_000 });
  // re-check text after shot (React re-renders could revert)
  const after = await k.evaluate(() => [...document.body.innerText.matchAll(/.{0,30}(testnet|Sepolia|devnet|fixture|tb1).{0,30}/gi)].map((m) => m[0]));
  console.log("buy innerText leftovers after shot:", after);
  await kctx.close();
} finally {
  await browser.close();
}
console.log("blocked:", [...blocked]);
console.log("problems:", problems);
