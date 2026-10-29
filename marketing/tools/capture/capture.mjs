// Satchel UI capture for the Remotion video. Fixture mode only; every non-local request is aborted (no chain reads,
// no wallet, no mainnet). The "wallet" used for owner/buyer views is the app's fixture mock persona
// (localStorage satchel:mock-wallet) feeding the in-browser simulation: nothing is signed or sent anywhere.
//
// Usage (server must already run in fixture mode, see marketing/notes/ui-capture.md):
//   node marketing/tools/capture/capture.mjs [--base http://127.0.0.1:3107] [--keep-strip] [--only desktop,mobile,components,flows,day,cards]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const require = createRequire(path.join(ROOT, "apps/web/package.json"));
const { chromium } = require("@playwright/test");

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const BASE = arg("--base", "http://127.0.0.1:3107");
const KEEP_STRIP = args.includes("--keep-strip");
const ONLY = (arg("--only", "desktop,mobile,components,flows,day,cards") || "").split(",");
const OUT = path.join(ROOT, "marketing/video/public/ui");
fs.mkdirSync(OUT, { recursive: true });

const ALICE = "alice.satchelhq.testnet";
const CAROL = "carol.satchelhq.testnet";
const BOB = "bob.satchelhq.testnet";

const manifest = [];
const problems = [];
const blocked = new Set();

const CAPTURE_CSS = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
  ${KEEP_STRIP ? "" : `div:has(> [data-testid="fixture-strip"]:only-child) { display: none !important; } [data-testid="fixture-strip"] { display: none !important; }`}
  *, *::before, *::after { caret-color: transparent !important; }
`;
const TRANSPARENT_CSS = `html, body { background: transparent !important; }`;

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function record(file, route, what) {
  const abs = path.join(OUT, file);
  const s = file.endsWith(".png") ? pngSize(abs) : null;
  manifest.push({ file, route, what, size: s ? `${s.w}x${s.h}` : "-" });
  console.log(`  ✓ ${file} ${s ? `${s.w}x${s.h}` : ""}`);
}

async function newCtx(browser, { w = 1440, h = 900, dsf = 2, scheme = "dark", persona = null, mobile = false, delay = 1500 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dsf,
    colorScheme: scheme,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "no-preference",
    serviceWorkers: "block",
  });
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    blocked.add(`${u.protocol}//${u.host}${u.pathname}`);
    return route.abort();
  });
  await ctx.addInitScript(
    ([acct, d]) => {
      try {
        if (acct) localStorage.setItem("satchel:mock-wallet", acct);
        else localStorage.removeItem("satchel:mock-wallet");
        localStorage.setItem("satchel:sim:mode", "normal");
        localStorage.setItem("satchel:sim:delay", String(d));
        localStorage.removeItem("satchel:mock-wallet:reject");
      } catch {}
    },
    [persona, delay],
  );
  return ctx;
}

async function newPage(ctx, label) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror ${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) problems.push(`[${label}] console.error ${page.url()}: ${m.text().slice(0, 300)}`);
  });
  return page;
}

async function settle(page, extraMs = 500) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((css) => {
    let s = document.getElementById("__capture_css");
    if (!s) {
      s = document.createElement("style");
      s.id = "__capture_css";
      document.head.appendChild(s);
    }
    s.textContent = css;
  }, CAPTURE_CSS);
  await page.waitForTimeout(extraMs);
}

async function go(page, route, extraMs) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page, extraMs);
}

async function shot(page, file, route, what, { fullPage = false } = {}) {
  const abs = path.join(OUT, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await page.screenshot({ path: abs, fullPage, animations: "disabled", caret: "hide", timeout: 60_000 });
  record(file, route, what);
}

/** Element crop; transparent page ground so it composites; pad > 0 keeps the soft shadow. */
async function crop(page, locator, file, route, what, { pad = 0, transparent = true } = {}) {
  const el = locator.first();
  try {
    await el.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    problems.push(`[crop] not found: ${file} (${route})`);
    return;
  }
  await el.scrollIntoViewIfNeeded();
  if (transparent) await page.addStyleTag({ content: TRANSPARENT_CSS });
  const abs = path.join(OUT, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (pad > 0) {
    // isolate the element: everything else becomes invisible (backgrounds included), so the padded clip is just the card + shadow
    await el.evaluate((n) => n.setAttribute("data-capture-target", ""));
    await page.addStyleTag({ content: `body *{visibility:hidden!important} [data-capture-target],[data-capture-target] *{visibility:visible!important}` });
    await page.waitForTimeout(150);
    const b = await el.boundingBox();
    await page.screenshot({ path: abs, clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.width + pad * 2, height: b.height + pad * 2 }, omitBackground: transparent, animations: "disabled", caret: "hide" });
  } else {
    await el.screenshot({ path: abs, omitBackground: transparent, animations: "disabled", caret: "hide" });
  }
  await page.evaluate(() => {
    document.querySelectorAll("style").forEach((s) => (s.textContent.includes("background: transparent !important") || s.textContent.includes("data-capture-target")) && s.remove());
    document.querySelectorAll("[data-capture-target]").forEach((n) => n.removeAttribute("data-capture-target"));
  });
  record(file, route, what);
}

const run = async (name, fn) => {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (e) {
    problems.push(`[${name}] FAILED: ${e.message.split("\n")[0]}`);
    console.log(`  ✗ ${name}: ${e.message.split("\n")[0]}`);
  }
};

const browser = await chromium.launch();

/* ───────────── 1. desktop pages (visitor, Night) ───────────── */
if (ONLY.includes("desktop")) {
  const ctx = await newCtx(browser, {});
  const page = await newPage(ctx, "desktop");
  const routes = [
    ["home", "/", "Landing: H1 'An NFT that is a wallet.', hero card #1, how it works, proof grid"],
    ["s1-wallet", "/s/1", "Satchel #1 (visitor): card, stats strip, holdings (BTC/ETH rows), judge facts"],
    ["s1-activity", "/s/1/activity", "Satchel #1 Activity timeline"],
    ["s1-receive-btc", "/s/1/receive?chain=btc", "Receive/Fund dialog: BTC QR on brass-banded plate"],
    ["s1-receive-evm", "/s/1/receive?chain=evm", "Receive/Fund dialog: Ethereum Sepolia QR"],
    ["s1-send-visitor", "/s/1/send?chain=evm", "Send dialog as a visitor (connect guard)"],
    ["s1-transfer-visitor", "/s/1/transfer", "Transfer dialog as a visitor (connect guard)"],
    ["s3-sale", "/s/3/sale", "Satchel #3 Buy tab (visitor): price, GateLine, clean history report"],
    ["s4-sale", "/s/4/sale", "Satchel #4 Buy tab (visitor): blocked by 1 unused signature"],
    ["s2-wallet", "/s/2", "Satchel #2 (gift, owned by bob)"],
    ["market", "/market", "Market: 3 listed cards with verdict hints"],
    ["mint", "/mint", "Mint dialog over Home (visitor: connect CTA), stitched preview card"],
    ["contract", "/contract", "Contract page: 'Born without a key', facts, verify commands"],
  ];
  for (const [name, route, what] of routes) {
    await run(`desktop ${name}`, async () => {
      await go(page, route, route.includes("sale") ? 2500 : 700);
      await shot(page, `desktop/${name}@2x.png`, route, `${what} (viewport)`);
      await shot(page, `desktop/${name}-full@2x.png`, route, `${what} (full page)`, { fullPage: true });
    });
  }
  // one raw reference with the fixture strip visible
  await run("desktop raw strip", async () => {
    await go(page, "/s/1", 500);
    await page.evaluate(() => document.getElementById("__capture_css")?.remove());
    await shot(page, `desktop/s1-wallet-RAW-with-fixture-strip@2x.png`, "/s/1", "Reference only: as served, with the 'Fixture data' strip");
  });
  await ctx.close();

  // owner views (fixture mock persona alice)
  const octx = await newCtx(browser, { persona: ALICE });
  const op = await newPage(octx, "desktop-owner");
  for (const [name, route, what] of [
    ["s1-wallet-owner", "/s/1", "Satchel #1 as owner: 'Your Satchel #1', stitched card, action row (Send/Fund/Transfer/Sell)"],
    ["s5-wallet-owner-listed", "/s/5", "Satchel #5 as owner while listed: FreezeBanner 'Signing paused while listed', Delist is brass"],
    ["s1-sale-owner", "/s/1/sale", "Satchel #1 Sell tab (owner, not listed)"],
    ["home-owner", "/", "Home with My Satchels (owner alice)"],
  ]) {
    await run(`desktop ${name}`, async () => {
      await go(op, route, 1200);
      await shot(op, `desktop/${name}@2x.png`, route, `${what} (viewport)`);
      await shot(op, `desktop/${name}-full@2x.png`, route, `${what} (full page)`, { fullPage: true });
    });
  }
  await octx.close();
}

/* ───────────── 2. mobile ───────────── */
if (ONLY.includes("mobile")) {
  const ctx = await newCtx(browser, { w: 390, h: 844, dsf: 3, mobile: true });
  const page = await newPage(ctx, "mobile");
  for (const [name, route, what] of [
    ["s1-wallet", "/s/1", "Satchel #1 on mobile (visitor)"],
    ["s3-sale", "/s/3/sale", "Satchel #3 Buy tab on mobile"],
    ["mint", "/mint", "Mint bottom sheet on mobile"],
    ["market", "/market", "Market on mobile"],
    ["s1-receive-btc", "/s/1/receive?chain=btc", "Receive bottom sheet on mobile (bonus)"],
  ]) {
    await run(`mobile ${name}`, async () => {
      await go(page, route, route.includes("sale") ? 2500 : 700);
      await shot(page, `mobile/${name}@3x.png`, route, `${what} (viewport)`);
      if (!["mint", "s1-receive-btc"].includes(name)) await shot(page, `mobile/${name}-full@3x.png`, route, `${what} (full page)`, { fullPage: true });
    });
  }
  await ctx.close();
  const octx = await newCtx(browser, { w: 390, h: 844, dsf: 3, mobile: true, persona: ALICE });
  const op = await newPage(octx, "mobile-owner");
  await run("mobile owner s1", async () => {
    await go(op, "/s/1", 1200);
    await shot(op, `mobile/s1-wallet-owner@3x.png`, "/s/1", "Satchel #1 on mobile as owner (stitched card, action row)");
  });
  await octx.close();
}

/* ───────────── 3. component crops @3x ───────────── */
if (ONLY.includes("components")) {
  const ctx = await newCtx(browser, { dsf: 3 });
  const p = await newPage(ctx, "comp-visitor");
  await run("components visitor", async () => {
    await go(p, "/s/1", 800);
    await crop(p, p.locator("figure[data-card='1']"), "components/card-s1-active@3x.png", "/s/1", "SatchelCard #1, Active, visitor (no stitch), with shadow", { pad: 48 });
    await crop(p, p.locator("figure[data-card='1']"), "components/card-s1-active-tight@3x.png", "/s/1", "SatchelCard #1, Active, tight crop (transparent rounded corners)");
    await crop(p, p.locator("dl.lg\\:grid").filter({ has: p.locator("[data-status]") }), "components/stats-strip-s1@3x.png", "/s/1", "Stats strip: Status pill Active, signatures 2, listed —, minted");
    await crop(p, p.locator("dl [data-status='active']"), "components/pill-active@3x.png", "/s/1", "StatusPill Active");
    await crop(p, p.locator("figure[data-card='1'] [data-status]"), "components/pill-band-active@3x.png", "/s/1", "StatusPill (band variant) Active", { transparent: false });
    await crop(p, p.locator("ul[aria-label='Holdings']"), "components/chainrows-s1@3x.png", "/s/1", "ChainRows (Bitcoin testnet4 + Ethereum Sepolia) with grouped addresses, copy/QR/explorer");
    await crop(p, p.locator("[data-chain-row='btc']"), "components/chainrow-btc@3x.png", "/s/1", "ChainRow Bitcoin testnet4");
    await crop(p, p.locator("[data-chain-row='evm']"), "components/chainrow-evm@3x.png", "/s/1", "ChainRow Ethereum Sepolia");
    await crop(p, p.locator("[data-chain-row='btc'] [data-address]"), "components/address-btc-grouped@3x.png", "/s/1", "AddressDisplay grouped (BTC tb1q…)");
    await crop(p, p.locator("[data-chain-row='evm'] [data-address]"), "components/address-evm-grouped@3x.png", "/s/1", "AddressDisplay grouped (EVM 0x…)");
    await crop(p, p.locator("section[data-judge-facts]"), "components/facts-s1@3x.png", "/s/1", "Judge facts block for #1 (owner, status, sig count, 3 full addresses, keys, code hash)");
    await crop(p, p.locator("#how-it-works"), "components/how-it-works@3x.png", "/s/1", "How it works 1-2-3");
    await crop(p, p.locator("nav[aria-label='Satchel sections']"), "components/navtabs-s1@3x.png", "/s/1", "Tabs Wallet / Activity");
    await crop(p, p.locator("aside").first(), "components/sidebar-nav@3x.png", "/s/1", "Left navigation with Satchel lockup", { transparent: false });

    await go(p, "/s/1/activity", 800);
    await crop(p, p.locator("main .space-y-6").first(), "components/timeline-s1@3x.png", "/s/1/activity", "Timeline (all rows, day groups)");
    const rows = p.locator("[data-activity]");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const kind = await rows.nth(i).getAttribute("data-activity");
      await crop(p, rows.nth(i), `components/timeline-row-${i + 1}-${kind}@3x.png`, "/s/1/activity", `Timeline row ${i + 1} (${kind})`);
    }
    await rows.first().locator("summary").click();
    await p.waitForTimeout(300);
    await crop(p, rows.first(), "components/timeline-row-1-expanded@3x.png", "/s/1/activity", "Timeline row expanded (date, fee, to, NearBlocks + mempool links)");

    await go(p, "/s/1/receive?chain=btc", 800);
    await crop(p, p.locator("section[aria-labelledby='qr-title']"), "components/receive-qr-btc@3x.png", "/s/1/receive?chain=btc", "Receive plate: brass band, QR, grouped BTC address", { transparent: false });
    await crop(p, p.locator(".flow-shell"), "components/dialog-receive-btc@3x.png", "/s/1/receive?chain=btc", "Whole Receive dialog (FlowShell)", { transparent: false });

    for (const id of ["2", "3", "4", "6"]) {
      await go(p, `/s/${id}`, 800);
      const st = id === "3" || id === "4" ? "listed" : "active";
      await crop(p, p.locator(`figure[data-card='${id}']`), `components/card-s${id}-${st}@3x.png`, `/s/${id}`, `SatchelCard #${id}, ${st}, visitor, per-token leather hue`, { pad: 48 });
    }
    await go(p, "/s/4", 800);
    await crop(p, p.locator("#freeze"), "components/freeze-banner-visitor@3x.png", "/s/4", "FreezeBanner (visitor copy)");
    await crop(p, p.locator("dl [data-status='listed']"), "components/pill-listed@3x.png", "/s/4", "StatusPill Listed");

    await go(p, "/contract", 600);
    await crop(p, p.locator("dl[data-judge-facts]"), "components/contract-facts@3x.png", "/contract", "Contract facts (keys: locked, birth tx, signer txs 0, code hash, expected Matches, MPC)");
    await crop(p, p.locator("section[aria-labelledby='verify-title']"), "components/contract-verify-commands@3x.png", "/contract", "Copy-paste verify commands");

    await go(p, "/market", 800);
    for (const id of ["3", "5", "4"]) {
      await crop(p, p.locator(`[data-market-item='${id}']`), `components/market-item-s${id}@3x.png`, "/market", `Market item #${id}: card + price + GateLine hint`, { pad: 24 });
      await crop(p, p.locator(`[data-market-item='${id}'] [data-gate]`), `components/gateline-hint-s${id}@3x.png`, "/market", `GateLine server hint for #${id}`);
    }
    await go(p, "/", 600);
    await crop(p, p.locator("section[aria-labelledby='hero-title']"), "components/home-hero@3x.png", "/", "Landing hero block (H1 + card)");
  });
  await ctx.close();

  // owner crops
  const octx = await newCtx(browser, { dsf: 3, persona: ALICE });
  const o = await newPage(octx, "comp-owner");
  await run("components owner", async () => {
    await go(o, "/s/1", 1200);
    await crop(o, o.locator("figure[data-card='1'][data-owned='true']"), "components/card-s1-active-owned@3x.png", "/s/1", "SatchelCard #1, Active, OWNED: saddle stitch visible", { pad: 48 });
    await crop(o, o.locator("figure[data-card='1'][data-owned='true']"), "components/card-s1-active-owned-tight@3x.png", "/s/1", "SatchelCard #1 owned, tight crop");
    await crop(o, o.locator("[data-testid='action-row']"), "components/action-row-owner@3x.png", "/s/1", "Owner action row: Send / Fund / Transfer / Sell");
    await crop(o, o.locator("[data-testid='owner-pill']"), "components/owner-pill@3x.png", "/s/1", "Owner pill 'Owned by you'");
    await go(o, "/s/5", 1200);
    await crop(o, o.locator("figure[data-card='5'][data-owned='true']"), "components/card-s5-listed-owned@3x.png", "/s/5", "SatchelCard #5, Listed, owned (stitch + Listed band pill)", { pad: 48 });
    await crop(o, o.locator("#freeze"), "components/freeze-banner-owner@3x.png", "/s/5", "FreezeBanner owner copy with Delist");
    await go(o, "/mint", 1200);
    await crop(o, o.locator("figure[data-card='preview']"), "components/mint-preview-card@3x.png", "/mint", "Mint preview card (stitched, 'Your new Satchel')", { transparent: false });
    await crop(o, o.locator("[data-testid='mint-flow'] .flow-shell"), "components/dialog-mint@3x.png", "/mint", "Whole Mint dialog as alice", { transparent: false });
  });
  await octx.close();

  // buyer (carol) crops after the in-browser clean check
  const bctx = await newCtx(browser, { dsf: 3, persona: CAROL });
  const b = await newPage(bctx, "comp-buyer");
  await run("components buyer", async () => {
    await go(b, "/s/3/sale", 800);
    await b.locator("[data-testid='buy-block'] [data-gate='clean']").waitFor({ timeout: 20_000 });
    await settle(b, 400);
    await crop(b, b.locator("[data-testid='buy-block']"), "components/buy-block-s3-clean@3x.png", "/s/3/sale", "Buy block #3: 5.00 USDC, GateLine clean, Buy enabled");
    await crop(b, b.locator("[data-testid='buy-block'] [data-gate]"), "components/gateline-clean@3x.png", "/s/3/sale", "GateLine: clean (browser check)");
    await crop(b, b.locator("#clean-history"), "components/clean-history-s3-clean@3x.png", "/s/3/sale", "CleanHistory report: CLEAN verdict, checks, settled signature row");
    await crop(b, b.locator("#clean-history [role='status']"), "components/clean-verdict-clean@3x.png", "/s/3/sale", "Clean verdict headline (shield + text)", { transparent: false });
    await crop(b, b.locator("[data-clean-item]"), "components/clean-row-s3-settled@3x.png", "/s/3/sale", "Clean-history row: EVM nonce 0, Settled pill", { transparent: false });
    await crop(b, b.locator("[data-testid='listing-facts']"), "components/listing-facts-s3@3x.png", "/s/3/sale", "Listing facts strip (price, listing #, signatures, server hint)");
    await go(b, "/s/4/sale", 800);
    await b.locator("[data-testid='buy-block'] [data-gate='blocked']").waitFor({ timeout: 20_000 });
    await settle(b, 400);
    await crop(b, b.locator("[data-testid='buy-block']"), "components/buy-block-s4-blocked@3x.png", "/s/4/sale", "Buy block #4: 2 NEAR, GateLine blocked, Buy disabled");
    await crop(b, b.locator("[data-testid='buy-block'] [data-gate]"), "components/gateline-blocked@3x.png", "/s/4/sale", "GateLine: blocked, 1 unused signature");
    await crop(b, b.locator("#buy-blocked"), "components/blocked-banner-s4@3x.png", "/s/4/sale", "Danger banner: blocked, nonce 1 not used yet");
    await crop(b, b.locator("#clean-history"), "components/clean-history-s4-blocked@3x.png", "/s/4/sale", "CleanHistory report: BLOCKED verdict, 'Can still move coins' group");
    await crop(b, b.locator("#clean-history [role='status']"), "components/clean-verdict-blocked@3x.png", "/s/4/sale", "Blocked verdict headline", { transparent: false });
    await crop(b, b.locator("[data-clean-item]"), "components/clean-row-s4-unused@3x.png", "/s/4/sale", "Clean-history row: nonce 1 not used yet, Unused pill", { transparent: false });
    await crop(b, b.locator("[data-item-status='unused']"), "components/pill-item-unused@3x.png", "/s/4/sale", "Item pill: unused (danger)", { transparent: false });
  });
  await bctx.close();
}

/* ───────────── 4. flows (fixture mock persona + in-browser simulation, no network) ───────────── */
if (ONLY.includes("flows")) {
  // Send EVM: form → filled → review → signing tracker → confirmed receipt
  const sctx = await newCtx(browser, { persona: ALICE, delay: 7000 });
  const s = await newPage(sctx, "flow-send");
  await run("flow send evm", async () => {
    await go(s, "/s/1/send?chain=evm", 1200);
    const flow = s.getByTestId("send-flow");
    await shot(s, "flows/send-evm-1-form@2x.png", "/s/1/send?chain=evm", "Send step 1 of 3: empty form (chain select, hero amount)");
    await flow.getByTestId("amount").fill("0.001");
    await flow.getByTestId("to").fill("0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a");
    await flow.getByTestId("recipient-resolved").waitFor();
    await flow.locator("#flow-title").focus();
    await settle(s, 300);
    await shot(s, "flows/send-evm-2-form-filled@2x.png", "/s/1/send?chain=evm", "Send step 1: 0.001 ETH, recipient resolved (Ethereum Sepolia address)");
    await flow.getByTestId("review").click();
    await flow.getByTestId("review-card").waitFor();
    await settle(s, 600);
    await shot(s, "flows/send-evm-3-review@2x.png", "/s/1/send?chain=evm", "Send step 2: Review (the exact outcome), checksum warning checkbox unticked");
    await flow.getByLabel("I checked this address").check();
    await settle(s, 300);
    await shot(s, "flows/send-evm-4-review-acked@2x.png", "/s/1/send?chain=evm", "Send step 2: Review, address acknowledged, 'Send 0.0010 ETH' enabled");
    await crop(s, flow.locator(".flow-shell"), "flows/send-evm-review-dialog@2x.png", "/s/1/send?chain=evm", "Review dialog only", { transparent: false });
    await flow.getByTestId("send").click();
    const tracker = flow.getByTestId("signing-progress");
    await tracker.waitFor({ timeout: 20_000 });
    await s.waitForSelector("[data-testid='signing-progress'][data-stage='signing']", { timeout: 20_000 });
    await settle(s, 300);
    await shot(s, "flows/send-evm-5-signing@2x.png", "/s/1/send?chain=evm", "Send step 3: tracker 'signing' (NEAR signer network), minimize, pending card");
    await crop(s, tracker, "flows/signing-progress-signing@2x.png", "/s/1/send?chain=evm", "SigningProgress component, signing stage", { transparent: false });
    await s.waitForSelector("[data-testid='signing-progress'][data-stage='confirmed']", { timeout: 45_000 });
    await settle(s, 500);
    await shot(s, "flows/send-evm-6-confirmed@2x.png", "/s/1/send?chain=evm", "Send receipt: 'Sent 0.001 ETH', confirmed");
    await crop(s, tracker, "flows/signing-progress-confirmed@2x.png", "/s/1/send?chain=evm", "SigningProgress component, confirmed receipt", { transparent: false });
    await go(s, "/s/1/activity", 1500);
    await shot(s, "flows/send-evm-7-activity-after@2x.png", "/s/1/activity", "Activity after the simulated send (new row on top)");
  });
  await sctx.close();

  // Send BTC review
  const bctx = await newCtx(browser, { persona: ALICE });
  const bp = await newPage(bctx, "flow-send-btc");
  await run("flow send btc", async () => {
    await go(bp, "/s/1/send?chain=btc", 1200);
    const flow = bp.getByTestId("send-flow");
    await flow.getByTestId("amount").fill("0.0001");
    await flow.getByTestId("to").fill("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
    await flow.getByTestId("to-error").waitFor();
    await settle(bp, 300);
    await shot(bp, "flows/send-btc-1-mainnet-refused@2x.png", "/s/1/send?chain=btc", "Send BTC: a mainnet address is refused inline");
    await flow.getByTestId("to").fill("tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u");
    await flow.getByTestId("recipient-resolved").waitFor();
    await settle(bp, 300);
    await shot(bp, "flows/send-btc-2-form-filled@2x.png", "/s/1/send?chain=btc", "Send BTC: 0.0001 BTC to a testnet4 address");
    await flow.getByTestId("review").click();
    await flow.getByTestId("review-card").waitFor();
    await settle(bp, 600);
    await shot(bp, "flows/send-btc-3-review@2x.png", "/s/1/send?chain=btc", "Send BTC: Review with sats fee");
  });
  await bctx.close();

  // Transfer: recipient → review → handoff
  const tctx = await newCtx(browser, { persona: ALICE, delay: 1500 });
  const t = await newPage(tctx, "flow-transfer");
  await run("flow transfer", async () => {
    await go(t, "/s/1/transfer", 1200);
    const flow = t.getByTestId("transfer-flow");
    await shot(t, "flows/transfer-1-recipient-empty@2x.png", "/s/1/transfer", "Transfer step 1: recipient");
    await flow.getByTestId("xfer-to").fill("satchel.satchelhq.testnet");
    await flow.getByTestId("xfer-error").waitFor();
    await settle(t, 300);
    await shot(t, "flows/transfer-2-refuses-contract@2x.png", "/s/1/transfer", "Transfer refuses the Satchel contract as recipient");
    await flow.getByTestId("xfer-to").fill(BOB);
    await flow.getByTestId("recipient-card").waitFor({ timeout: 10_000 });
    await settle(t, 300);
    await shot(t, "flows/transfer-3-recipient-found@2x.png", "/s/1/transfer", "Transfer: bob.satchelhq.testnet, Account found");
    await flow.getByTestId("xfer-review").click();
    await settle(t, 600);
    await shot(t, "flows/transfer-4-review@2x.png", "/s/1/transfer", "Transfer step 2: Review (stitched card, 'signature history stays with the Satchel')");
    await flow.getByTestId("xfer-cta").click();
    await t.waitForTimeout(250);
    await shot(t, "flows/transfer-5-in-flight@2x.png", "/s/1/transfer", "Transfer in flight: card lifted 6deg, progress steps");
    await flow.getByTestId("handoff").waitFor({ timeout: 20_000 });
    await t.waitForTimeout(450);
    await t.screenshot({ path: path.join(OUT, "flows/transfer-6a-handoff-midmotion@2x.png") });
    record("flows/transfer-6a-handoff-midmotion@2x.png", "/s/1/transfer", "Handoff animation mid-motion (card sliding to recipient)");
    await t.waitForTimeout(2600);
    await settle(t, 200);
    await shot(t, "flows/transfer-6-handoff@2x.png", "/s/1/transfer", "Handoff end state: card landed on bob, stitch drawn, Transferred pill, receipt");
    await crop(t, flow.getByTestId("handoff"), "flows/handoff-component@2x.png", "/s/1/transfer", "Handoff component end state", { transparent: false });
  });
  await tctx.close();

  // Sell flow (owner)
  const lctx = await newCtx(browser, { persona: ALICE });
  const l = await newPage(lctx, "flow-sell");
  await run("flow sell", async () => {
    await go(l, "/s/1/sale?list=1", 2500);
    await shot(l, "flows/sell-1-checklist@2x.png", "/s/1/sale?list=1", "Sell dialog: Before-you-list checklist (quiet period, USDC, past signatures)");
    await l.getByTestId("sell-flow").getByTestId("price").fill("5");
    await settle(l, 300);
    await shot(l, "flows/sell-2-priced@2x.png", "/s/1/sale?list=1", "Sell dialog: price 5 USDC, 'List for 5.00 USDC'");
  });
  await lctx.close();

  // Buy (carol) #3 → handoff; #4 blocked
  const kctx = await newCtx(browser, { persona: CAROL, delay: 1500 });
  const k = await newPage(kctx, "flow-buy");
  await run("flow buy", async () => {
    await go(k, "/s/4/sale", 800);
    await k.locator("[data-testid='buy-block'] [data-gate='blocked']").waitFor({ timeout: 20_000 });
    await settle(k, 300);
    await shot(k, "flows/buy-s4-blocked@2x.png", "/s/4/sale", "Buyer carol on #4: Blocked, Buy disabled, no override");
    await shot(k, "flows/buy-s4-blocked-full@2x.png", "/s/4/sale", "Buyer carol on #4 (full page)", { fullPage: true });
    await go(k, "/s/3/sale", 800);
    await k.locator("[data-testid='buy-block'] [data-gate='clean']").waitFor({ timeout: 20_000 });
    await settle(k, 300);
    await shot(k, "flows/buy-s3-1-clean@2x.png", "/s/3/sale", "Buyer carol on #3: Clean, 'Buy for 5.00 USDC' enabled");
    await shot(k, "flows/buy-s3-1-clean-full@2x.png", "/s/3/sale", "Buyer carol on #3 (full page)", { fullPage: true });
    await k.getByTestId("buy").click();
    await k.getByTestId("buy-done").waitFor({ timeout: 20_000 });
    await k.waitForTimeout(3000);
    await settle(k, 200);
    await shot(k, "flows/buy-s3-2-done@2x.png", "/s/3/sale", "Bought: 'Satchel #3 is yours.' reverse handoff + receipt");
    await crop(k, k.getByTestId("buy-done"), "flows/buy-done-component@2x.png", "/s/3/sale", "Buy-done handoff + receipt block", { transparent: false });
  });
  await kctx.close();

  // Mint → done
  const mctx = await newCtx(browser, { persona: ALICE, delay: 1500 });
  const m = await newPage(mctx, "flow-mint");
  await run("flow mint", async () => {
    await go(m, "/mint", 1200);
    await shot(m, "flows/mint-1-preview@2x.png", "/mint", "Mint dialog as alice: stitched preview, what you get, Mint CTA");
    await m.getByTestId("mint-cta").click();
    await m.getByTestId("mint-done").waitFor({ timeout: 20_000 });
    await settle(m, 600);
    await shot(m, "flows/mint-2-done@2x.png", "/mint", "Minted: 'Satchel #8 is yours.'");
  });
  await mctx.close();
}

/* ───────────── 5. Day theme ───────────── */
if (ONLY.includes("day")) {
  const ctx = await newCtx(browser, { scheme: "light" });
  const p = await newPage(ctx, "day");
  for (const [name, route, what] of [
    ["home", "/", "Landing, Day theme"],
    ["s1-wallet", "/s/1", "Satchel #1, Day theme"],
    ["s4-sale", "/s/4/sale", "Satchel #4 sale (blocked), Day theme"],
    ["market", "/market", "Market, Day theme"],
  ]) {
    await run(`day ${name}`, async () => {
      await go(p, route, route.includes("sale") ? 2500 : 700);
      await shot(p, `day/${name}@2x.png`, route, `${what} (viewport)`);
    });
  }
  await run("day card", async () => {
    await go(p, "/s/1", 600);
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, colorScheme: "light" });
    await c.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
    const pp = await c.newPage();
    await go(pp, "/s/1", 600);
    await crop(pp, pp.locator("figure[data-card='1']"), "components/card-s1-active-day@3x.png", "/s/1", "SatchelCard #1 in Day theme (surface body)", { pad: 48 });
    await c.close();
  });
  await ctx.close();
}

/* ───────────── 6. NFT card SVGs ───────────── */
if (ONLY.includes("cards")) {
  await run("card svgs", async () => {
    fs.mkdirSync(path.join(OUT, "cards"), { recursive: true });
    const ctx = await newCtx(browser, { w: 1200, h: 800, dsf: 2 });
    const p = await newPage(ctx, "cards");
    for (const id of ["1", "2", "3", "4", "5", "6", "7"]) {
      const r = await p.request.get(`${BASE}/api/card/${id}.svg`);
      if (!r.ok()) {
        problems.push(`card svg ${id}: HTTP ${r.status()}`);
        continue;
      }
      const svg = await r.text();
      fs.writeFileSync(path.join(OUT, `cards/${id}.svg`), svg);
      manifest.push({ file: `cards/${id}.svg`, route: `/api/card/${id}.svg`, what: `NFT media SVG #${id} (embedded fonts)`, size: (svg.match(/viewBox="([^"]+)"/) || [])[1] ?? "-" });
      if (["1", "3"].includes(id)) {
        await p.goto(`${BASE}/api/contract`);
        await p.setContent(`<html><body style="margin:0;background:transparent"><img id="c" style="width:1200px;display:block" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`);
        await p.waitForFunction(() => document.getElementById("c").complete);
        await p.waitForTimeout(600);
        await p.locator("#c").screenshot({ path: path.join(OUT, `cards/card-svg-${id}@2x.png`), omitBackground: true });
        record(`cards/card-svg-${id}@2x.png`, `/api/card/${id}.svg`, `NFT media SVG #${id} rasterised at 1200 css px`);
      }
    }
    await ctx.close();
  });
}

await browser.close();
fs.writeFileSync(path.join(HERE, "manifest.json"), JSON.stringify({ base: BASE, keepStrip: KEEP_STRIP, at: new Date().toISOString(), manifest, problems, blocked: [...blocked] }, null, 2));
console.log(`\n${manifest.length} files. ${problems.length} problems. Blocked external hosts: ${[...blocked].join(", ") || "none"}`);
for (const pr of problems) console.log("  ! " + pr);
