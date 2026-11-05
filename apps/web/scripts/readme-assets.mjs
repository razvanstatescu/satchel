// Renders the README's images into docs/assets/readme/: the banner and the app screens.
//
//   1. Build and start the app in fixture mode (offline sample data, the same settings as the e2e tests):
//        NEXT_PUBLIC_DATA_MODE=fixture NEXT_PUBLIC_CONTRACT_ROLE=final \
//        NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet NEXT_PUBLIC_APP_URL=https://usesatchel.xyz \
//        NEXT_PUBLIC_EXPECTED_CODE_HASH= FASTNEAR_API_KEY= pnpm exec next build
//        pnpm exec next start -p 3388
//   2. node scripts/readme-assets.mjs [--base http://127.0.0.1:3388] [--only banner,satchel-page,...]
//
// Screens taken in fixture mode keep the app's own "Sample data" strip, so nobody mistakes them for live data.
// After the final birth, `--base https://usesatchel.xyz` re-shoots the public pages from the live app (the owner
// and buyer flows need the fixture mock wallet). Fonts and logos come from brand/ and docs/design/ (OFL fonts).
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(ROOT, "docs/assets/readme");
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const BASE = arg("base", "http://127.0.0.1:3388");
const LIVE = arg("live", "https://usesatchel.xyz"); // real chain data, for the history screen
const ONLY = arg("only", "")?.split(",").filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);

const ALICE = "alice.satchelhq.testnet"; // owner of #1 and the seller of #3 and #4 in the fixture data
const CAROL = "carol.satchelhq.testnet"; // a buyer
const RECIPIENT_EVM = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"; // the EIP-55 spec's checksum example (no warning)

const T = { ground: "#f6f5fb", surface: "#ffffff", sunken: "#eceaf4", line: "#e2dfee", ink: "#1d1340", muted: "#5e5776", coral: "#ff5c4d" };
// Embedded as data URIs: a page made with setContent may not load file:// fonts.
const font = (f) => `data:font/ttf;base64,${readFileSync(join(ROOT, "docs/design/satchel-2.0/prototypes/assets/fonts", f)).toString("base64")}`;
const FONTS = `
  @font-face { font-family: "Funnel Display"; src: url(${font("FunnelDisplay.ttf")}); font-weight: 300 800; }
  @font-face { font-family: "Onest"; src: url(${font("Onest.ttf")}); font-weight: 100 900; }
  @font-face { font-family: "Geist Mono"; src: url(${font("GeistMono.ttf")}); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; -webkit-font-smoothing: antialiased; }`;
const dataUri = (mime, buf) => `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
const brandFile = (p) => dataUri("image/svg+xml", readFileSync(join(ROOT, "brand", p)));

async function save(name, png) {
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`${name}.png  ${(png.length / 1024).toFixed(0)} KB`);
}

async function appPage(browser, { who = null, width = 1280, height = 800, scale = 2 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: "light" });
  await ctx.addInitScript((who) => {
    localStorage.setItem("satchel:onboarding:v1", JSON.stringify({ v: 1, doneAt: 0, skippedSurvey: true, submitted: false }));
    if (who) localStorage.setItem("satchel:mock-wallet", who);
    else localStorage.removeItem("satchel:mock-wallet");
  }, who);
  const page = await ctx.newPage();
  return { ctx, page };
}

async function shoot(browser, path, opts = {}) {
  const { ctx, page } = await appPage(browser, opts);
  await page.goto((opts.base ?? BASE) + path, { waitUntil: "networkidle" });
  if (opts.prepare) await opts.prepare(page);
  await page.waitForTimeout(opts.settle ?? 2500);
  const png = await page.screenshot({ clip: opts.clip });
  await ctx.close();
  return png;
}

/** Several phone screens side by side, each with a caption, on the Day ground. */
async function phones(browser, items) {
  const cells = items
    .map(
      (it) => `<figure>
        <img src="${dataUri("image/png", it.png)}" />
        <figcaption><b>${it.title}</b><span>${it.note}</span></figcaption>
      </figure>`,
    )
    .join("");
  const html = `<!doctype html><html><head><style>${FONTS}
    #f { display: inline-flex; gap: 40px; padding: 40px 48px 36px; background: ${T.ground}; border-radius: 28px; }
    figure { width: 300px; display: flex; flex-direction: column; gap: 16px; }
    img { width: 300px; border-radius: 22px; border: 1.5px solid ${T.line}; background: ${T.surface}; display: block; }
    figcaption { font-family: Onest; color: ${T.ink}; display: flex; flex-direction: column; gap: 4px; }
    figcaption b { font-family: "Funnel Display"; font-weight: 800; font-size: 20px; letter-spacing: -0.01em; }
    figcaption span { font-size: 15px; line-height: 1.4; color: ${T.muted}; }
  </style></head><body><div id="f">${cells}</div></body></html>`;
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator("#f").screenshot({ omitBackground: true });
  await page.close();
  return png;
}

async function banner(browser) {
  const card = await (await fetch(`${BASE}/api/card/1.svg`)).arrayBuffer();
  const html = `<!doctype html><html><head><style>${FONTS}
    #b { width: 1280px; height: 400px; background: ${T.ground}; border-radius: 28px; position: relative; overflow: hidden;
         display: flex; align-items: center; padding: 0 64px; font-family: Onest; color: ${T.ink}; }
    .left { width: 640px; display: flex; flex-direction: column; gap: 22px; }
    .lockup { height: 64px; align-self: flex-start; }
    h1 { font-family: "Funnel Display"; font-weight: 800; font-size: 46px; line-height: 1.05; letter-spacing: -0.02em; }
    p { font-size: 19px; line-height: 1.5; color: ${T.muted}; max-width: 600px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chips span { font-size: 14px; font-weight: 600; background: ${T.sunken}; border-radius: 999px; padding: 6px 12px; }
    .right { position: absolute; right: 56px; top: 0; width: 470px; height: 400px; }
    .charms { position: absolute; right: 8px; top: 26px; width: 230px; }
    .card { position: absolute; right: 34px; top: 138px; width: 370px; transform: rotate(-4deg); transform-origin: 70% 0; }
  </style></head><body><div id="b">
    <div class="left">
      <img class="lockup" src="${brandFile("logo/satchel-lockup-on-light.svg")}" />
      <h1>An NFT that is a wallet.</h1>
      <p>Each token of a NEP-171 contract on NEAR controls its own Bitcoin, Ethereum and Solana addresses through
         NEAR Chain Signatures. Transfer or sell the NFT, and the coins go with it.</p>
      <div class="chips"><span>NEAR testnet</span><span>Chain Signatures</span><span>NEP-171</span><span>Clean history</span></div>
    </div>
    <div class="right">
      <img class="charms" src="${brandFile("illustration/satchel-charms-chains.svg")}" />
      <img class="card" src="${dataUri("image/svg+xml", card)}" />
    </div>
  </div></body></html>`;
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator("#b").screenshot({ omitBackground: true });
  await page.close();
  return png;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  if (want("banner")) await save("banner", await banner(browser));

  // The owner's view of Satchel #1: what it holds, on which chains, and what the owner can do.
  if (want("satchel-page")) await save("satchel-page", await shoot(browser, "/s/1", { who: ALICE, height: 760 }));

  // The market: each listing with the result of its history check.
  if (want("market"))
    await save("market", await shoot(browser, "/market", { clip: { x: 256, y: 0, width: 1024, height: 430 } }));

  // Sending: the owner fills in the form, then reviews exactly what the contract will be asked to sign.
  if (want("send")) {
    const phone = { who: ALICE, width: 390, height: 780, scale: 2 };
    const step1 = await shoot(browser, "/s/1/send?chain=evm", {
      ...phone,
      prepare: async (p) => {
        const flow = p.getByTestId("send-flow");
        await flow.getByTestId("amount").fill("0.001");
        await flow.getByTestId("to").fill(RECIPIENT_EVM);
        await flow.getByTestId("recipient-resolved").waitFor();
      },
    });
    const step2 = await shoot(browser, "/s/1/send?chain=evm", {
      ...phone,
      prepare: async (p) => {
        const flow = p.getByTestId("send-flow");
        await flow.getByTestId("amount").fill("0.001");
        await flow.getByTestId("to").fill(RECIPIENT_EVM);
        await flow.getByTestId("recipient-resolved").waitFor();
        await flow.getByTestId("review").click();
        await flow.getByTestId("send").waitFor();
      },
    });
    await save(
      "send",
      await phones(browser, [
        { png: step1, title: "1. Fill in", note: "Amount and recipient, from the Satchel's Ethereum address." },
        { png: step2, title: "2. Review", note: "The exact transaction the contract will record, then ask the MPC network to sign." },
      ]),
    );
  }

  // Buying: the buyer's browser checks every past signature. Clean enables Buy; one unused signature blocks it.
  if (want("buy-check")) {
    const phone = { who: CAROL, width: 390, height: 780, scale: 2, settle: 6000 };
    const clean = await shoot(browser, "/s/3/sale", phone);
    const blocked = await shoot(browser, "/s/4/sale", phone);
    await save(
      "buy-check",
      await phones(browser, [
        { png: clean, title: "Clean: Buy is enabled", note: "Satchel #3. Its one past signature was used on Ethereum, so it can't move coins any more." },
        { png: blocked, title: "Blocked: 1 unused signature", note: "Satchel #4. An old signature could still move its ETH, so Buy stays off." },
      ]),
    );
  }

  // History: every signature Satchel #1 has issued, read live from the contract the app points at.
  if (want("activity"))
    await save("activity", await shoot(browser, "/s/1/activity", { base: LIVE, settle: 4000, clip: { x: 256, y: 0, width: 1024, height: 760 } }));
} finally {
  await browser.close();
}
