// THROWAWAY spike: open a URL in system Chrome (headless), collect console + page errors, print #out text.
import { chromium } from 'playwright-core';
const [url, waitFor = 'DONE', timeoutMs = '60000'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`.slice(0, 400)));
page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 400)}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded' });
try { await page.waitForFunction((w) => document.querySelector('#out')?.textContent?.includes(w), waitFor, { timeout: Number(timeoutMs) }); } catch { logs.push('[runner] timeout waiting for ' + waitFor); }
console.log('--- #out after', Date.now() - t0, 'ms');
console.log(await page.evaluate(() => document.querySelector('#out')?.textContent ?? '(no #out)'));
console.log('--- logs'); for (const l of logs) console.log(l);
await browser.close();
