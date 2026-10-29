// THROWAWAY SPIKE (chains agent): verify rent rules via simulateTransaction(sigVerify:false) from a funded
// devnet system account (a recent fee payer). No funds or keys needed. Run: node sol_rent_sim.mjs
import { Connection, PublicKey, SystemProgram, Transaction, Keypair } from '@solana/web3.js'
const c = new Connection('https://api.devnet.solana.com', 'confirmed')
const SYS = '11111111111111111111111111111111'
// cheap source of a funded system account: a validator identity (pays vote fees) from getVoteAccounts
let payer
const va = await c.getVoteAccounts()
for (const v of va.current.slice(0, 10)) {
  const info = await c.getAccountInfo(new PublicKey(v.nodePubkey))
  if (info && info.owner.toBase58() === SYS && info.data.length === 0 && info.lamports > 5_000_000) { payer = { key: new PublicKey(v.nodePubkey), lamports: info.lamports }; break }
}
if (!payer) throw new Error('no payer found')
const rentMin = await c.getMinimumBalanceForRentExemption(0)
const { blockhash } = await c.getLatestBlockhash()
async function sim(label, to, lamports) {
  const tx = new Transaction({ feePayer: payer.key, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: payer.key, toPubkey: to, lamports }))
  // web3.js v1: use raw RPC for sigVerify:false + replaceRecentBlockhash
  const raw = await fetch('https://api.devnet.solana.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'simulateTransaction', params: [tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }] }) }).then((x) => x.json())
  console.log(JSON.stringify({ label, lamports, err: raw.result?.value?.err ?? null, rpcError: raw.error?.message }))
}
const fresh = Keypair.generate().publicKey
console.log(JSON.stringify({ payer: payer.key.toBase58(), payerLamports: payer.lamports, rentMin0: rentMin }))
await sim('new recipient, amount = rentMin - 1', fresh, rentMin - 1)
await sim('new recipient, amount = rentMin', fresh, rentMin)
await sim('sender left with 1..rentMin-1 lamports (non-zero, below rent)', fresh, payer.lamports - 5000 - 1000)
await sim('sender drained to exactly 0 (Max = balance - fee)', fresh, payer.lamports - 5000)
