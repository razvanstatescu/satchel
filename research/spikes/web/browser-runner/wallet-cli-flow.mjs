// THROWAWAY spike (web agent): drive near-connect's "NEAR CLI" wallet in real Chrome to see what
// signAndSendTransaction resolves with for an MPC sign (long receipt chain).
// Flow: /wallet page -> connect(near-cli) -> fill account -> Sign via MPC -> read CLI command from the
// sandboxed iframe -> run it with `sign-with-legacy-keychain display` -> broadcast_tx_async ourselves
// -> paste hash immediately -> near-connect fetches tx(wait_until=NONE) -> record what the dApp got.
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';

const URL_ = process.argv[2] ?? 'http://localhost:3917/wallet';
const ACCOUNT = 'satchel-spk-web-e9ea1a.testnet';
const RPC = 'https://rpc.testnet.fastnear.com';
const t0 = Date.now();
const log = (...a) => console.log(`[+${String(Date.now() - t0).padStart(6)}ms]`, ...a);

async function findFrame(page, selector, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    for (const f of page.frames()) {
      try { if (await f.$(selector)) return f; } catch {}
    }
    await page.waitForTimeout(250);
  }
  throw new Error('frame with ' + selector + ' not found');
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext();
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();
page.on('pageerror', (e) => log('[pageerror]', String(e).slice(0, 200)));
await page.goto(URL_);
await page.waitForFunction(() => document.querySelector('#out')?.textContent?.includes('manifest loaded'), null, { timeout: 30000 });
log('page ready:', (await page.textContent('#out')).split('\n').pop());

await page.click('#connect-cli');
let f = await findFrame(page, '#account-id');
log('near-cli iframe url:', f.url().slice(0, 40), 'frames:', page.frames().length);
await f.fill('#account-id', ACCOUNT);
await f.click('#submit-btn');
// optional "Signing method" step
await page.waitForTimeout(800);
for (const fr of page.frames()) {
  const card = await fr.$('[data-method="sign-with-keychain"]').catch(() => null);
  if (card) {
    log('signing-method step shown; choosing keychain');
    await card.click();
    const btn = (await fr.$('#continue-btn')) || (await fr.$('button.btn'));
    if (btn) await btn.click();
  }
}
await page.waitForFunction(() => /connected|event wallet:signIn/.test(document.querySelector('#out')?.textContent ?? ''), null, { timeout: 30000 });
log('after connect:', (await page.textContent('#out')).split('\n').slice(-2).join(' | '));

await page.click('#sign-mpc');
f = await findFrame(page, '.command-block code');
const cmd = (await f.textContent('.command-block code')).trim();
log('CLI command shown to user:', cmd.replace(/\s+/g, ' ').replace(/"Ecdsa":"[0-9a-f]{64}"/, '"Ecdsa":"<64 hex>"'));

// Turn it into a non-interactive "sign but don't send" invocation with the legacy keychain.
const argv = cmd.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').replace(/^near\s+/, '').replace(/sign-with-keychain(\s+send)?\s*$/, 'sign-with-legacy-keychain display');
// naive shell-word split honouring single quotes (the connector single-quotes every value)
const words = [...argv.matchAll(/'([^']*)'|(\S+)/g)].map((m) => (m[1] !== undefined ? m[1] : m[2]));
const cli = spawnSync('near', words, { encoding: 'utf8', input: '' });
const outTxt = (cli.stdout || '') + (cli.stderr || ''); // near-cli-rs prints the signed tx on stderr
const b64 = outTxt.match(/Signed transaction \(serialized as base64\):\s*\n([A-Za-z0-9+/=]+)/)?.[1];
if (!b64) { console.log(outTxt.slice(0, 3000)); throw new Error('no signed tx in CLI output'); }
log('CLI signed tx locally (not sent)');
const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'broadcast_tx_async', params: [b64] }) }).then((r) => r.json());
const hash = res.result;
log('broadcast_tx_async ->', hash ?? JSON.stringify(res).slice(0, 200));
const tPaste = Date.now();
await f.fill('#tx-hash', hash);
await f.click('#verify-btn');
await page.waitForFunction(() => document.querySelector('#out')?.textContent?.includes('DONE'), null, { timeout: 120000 });
log('dApp log:\n' + (await page.textContent('#out')));
const last = await page.evaluate(() => (window).__lastResult);
log('resolved', Date.now() - tPaste, 'ms after paste; final_execution_status =', last?.final_execution_status, '; status =', JSON.stringify(last?.status)?.slice(0, 160), '; receipts_outcome =', last?.receipts_outcome?.length);
await browser.close();
