// THROWAWAY spike 05: can a browser page (origin http://localhost:8765) call mempool.space testnet4 directly?
// Runs real Chrome headless via playwright-core and records which fetch variants succeed.
import http from 'node:http'
import { chromium } from 'playwright-core'

const BASES = ['https://mempool.space/testnet4/api', 'https://mempool.emzy.de/testnet4/api']
const ADDR = 'tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7'
const page = `<!doctype html><meta charset=utf-8><script>
async function t(name, url, init) {
  try { const r = await fetch(url, init); const b = await r.text(); return { name, ok: true, status: r.status, body: b.slice(0, 90) } }
  catch (e) { return { name, ok: false, error: String(e) } }
}
window.run = async (B, A) => Promise.all([
  t('GET tip height', B + '/blocks/tip/height'),
  t('GET address utxo', B + '/address/' + A + '/utxo'),
  t('GET v1 fees', B + '/v1/fees/recommended'),
  t('GET outspends', B + '/tx/515f4966b1ac04d2d3ecdc750c40e01d54138bd79be282b8d96d86c83491aa26/outspends'),
  t('POST /tx text/plain (default for string body)', B + '/tx', { method: 'POST', body: 'deadbeef' }),
  t('POST /tx with Content-Type: application/json (preflight)', B + '/tx', { method: 'POST', body: 'deadbeef', headers: { 'Content-Type': 'application/json' } }),
  t('POST /txs/test JSON (testmempoolaccept, preflight)', B + '/txs/test', { method: 'POST', body: '["deadbeef"]', headers: { 'Content-Type': 'application/json' } }),
  t('POST /txs/test text/plain', B + '/txs/test', { method: 'POST', body: '["deadbeef"]' }),
  t('GET with custom header (preflight)', B + '/blocks/tip/height', { headers: { 'X-Custom': '1' } }),
])
</script>`
const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page) }).listen(8765)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await browser.newPage()
await p.goto('http://localhost:8765/')
for (const B of BASES) {
  console.log('==', B)
  for (const r of await p.evaluate(([b, a]) => window.run(b, a), [B, ADDR])) console.log(JSON.stringify(r))
}
await browser.close(); server.close()
