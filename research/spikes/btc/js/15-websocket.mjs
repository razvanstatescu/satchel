// THROWAWAY spike 15: mempool.space testnet4 WebSocket (Node 22 global WebSocket + real Chrome from http://localhost:8765).
import http from 'node:http'
import { chromium } from 'playwright-core'
const URL = 'wss://mempool.space/testnet4/api/v1/ws'
const ADDR = 'tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7'
function nodeTest() {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL); const got = []
    ws.onopen = () => { ws.send(JSON.stringify({ action: 'want', data: ['blocks', 'stats'] })); ws.send(JSON.stringify({ 'track-address': ADDR })) }
    ws.onmessage = (m) => { const d = JSON.parse(m.data); got.push(Object.keys(d).join(',')) }
    ws.onerror = (e) => got.push('error ' + (e.message || ''))
    setTimeout(() => { ws.close(); resolve(got) }, 8000)
  })
}
console.log('node:', JSON.stringify(await nodeTest()))
const page = `<!doctype html><script>
window.run = (url, addr) => new Promise((res) => { const ws = new WebSocket(url); const got = [];
  ws.onopen = () => { got.push('open'); ws.send(JSON.stringify({ action: 'want', data: ['blocks'] })); ws.send(JSON.stringify({ 'track-address': addr })) };
  ws.onmessage = (m) => got.push(Object.keys(JSON.parse(m.data)).join(','));
  ws.onerror = () => got.push('error'); ws.onclose = (e) => got.push('close ' + e.code);
  setTimeout(() => { ws.close(); res(got) }, 8000) })</script>`
const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page) }).listen(8765)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await browser.newPage(); await p.goto('http://localhost:8765/')
console.log('chrome:', JSON.stringify(await p.evaluate(([u, a]) => window.run(u, a), [URL, ADDR])))
await browser.close(); server.close()
