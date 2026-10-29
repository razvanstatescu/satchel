// THROWAWAY: failover latency with a dead first transport under different settings
import { createPublicClient, fallback, http } from 'viem'
import { sepolia } from 'viem/chains'
const live = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org', 'https://rpc.sepolia.ethpandaops.io', 'https://0xrpc.io/sep']
const urls = ['https://rpc.sepolia.org', ...live] // first one times out
for (const cfg of [{ timeout: 4000, retryCount: 0 }, { timeout: 4000, retryCount: 1 }]) {
  const c = createPublicClient({ chain: sepolia, transport: fallback(urls.map((u) => http(u, { timeout: cfg.timeout })), { rank: false, retryCount: cfg.retryCount }) })
  const t0 = performance.now(); const n = await c.getBlockNumber(); const ms = Math.round(performance.now() - t0)
  const t1 = performance.now(); await c.getBlockNumber({ cacheTime: 0 }); const ms2 = Math.round(performance.now() - t1)
  console.log(JSON.stringify({ ...cfg, block: n.toString(), firstCallMs: ms, secondCallMs: ms2 }))
}
// rank:true — viem pings transports in the background and reorders them by latency/stability
const r = createPublicClient({ chain: sepolia, transport: fallback(urls.map((u) => http(u, { timeout: 4000 })), { rank: { interval: 5_000, sampleCount: 3, timeout: 2_000 }, retryCount: 0 }) })
const a = performance.now(); await r.getBlockNumber(); const first = Math.round(performance.now() - a)
await new Promise((res) => setTimeout(res, 12_000))
const b = performance.now(); await r.getBlockNumber({ cacheTime: 0 }); const later = Math.round(performance.now() - b)
console.log(JSON.stringify({ rank: true, firstCallMs: first, after12sMs: later }))
process.exit(0)
