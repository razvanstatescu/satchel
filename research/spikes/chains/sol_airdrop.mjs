// THROWAWAY: request devnet airdrop to the derived SOL address
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
const addr = new PublicKey(process.argv[2] ?? '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA')
const amount = Number(process.argv[3] ?? '1')
const rpc = process.argv[4] ?? 'https://api.devnet.solana.com'
const c = new Connection(rpc, 'confirmed')
console.log('balance before', (await c.getBalance(addr)) / LAMPORTS_PER_SOL)
try {
  const t0 = Date.now()
  const sig = await c.requestAirdrop(addr, amount * LAMPORTS_PER_SOL)
  console.log('airdrop sig', sig)
  const bh = await c.getLatestBlockhash()
  await c.confirmTransaction({ signature: sig, ...bh }, 'confirmed')
  console.log('confirmed in ms', Date.now() - t0)
} catch (e) { console.log('AIRDROP ERROR', e.message) }
console.log('balance after', (await c.getBalance(addr)) / LAMPORTS_PER_SOL)
