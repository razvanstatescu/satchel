// THROWAWAY: verify the recommended viem fallback config (and that it fails over)
import { createPublicClient, fallback, http } from 'viem'
import { sepolia } from 'viem/chains'
const mk = (urls: string[]) => createPublicClient({ chain: sepolia, transport: fallback(urls.map((u) => http(u, { timeout: 10_000 })), { rank: false, retryCount: 1 }) })
const recommended = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org', 'https://rpc.sepolia.ethpandaops.io', 'https://0xrpc.io/sep']
const A = '0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d' as const
for (const [label, urls] of [['recommended', recommended], ['first-dead', ['https://rpc.sepolia.org', ...recommended]]] as const) {
  const c = mk(urls as any)
  const t0 = performance.now()
  const [chainId, nonce, fees, bal] = await Promise.all([c.getChainId(), c.getTransactionCount({ address: A, blockTag: 'pending' }), c.estimateFeesPerGas(), c.getBalance({ address: A })])
  console.log(JSON.stringify({ label, chainId, nonce, maxFeePerGas: fees.maxFeePerGas?.toString(), maxPriorityFeePerGas: fees.maxPriorityFeePerGas?.toString(), balance: bal.toString(), ms: Math.round(performance.now() - t0) }))
}
