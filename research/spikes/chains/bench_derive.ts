// THROWAWAY: per-derivation cost, chainsig.js local path vs noble-only
import { contracts } from 'chainsig.js'
import { evmAddr, btcAddr, solAddr } from './bundle/entry-minimal.ts'
const c = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
const N = 200
let t = performance.now()
for (let i = 0; i < N; i++) await c.getDerivedPublicKey({ path: `satchel/${i}/evm`, predecessor: 'satchel.example.testnet' })
const csSecp = (performance.now() - t) / N
t = performance.now()
for (let i = 0; i < N; i++) await c.getDerivedPublicKey({ path: `satchel/${i}/sol`, predecessor: 'satchel.example.testnet', IsEd25519: true })
const csEd = (performance.now() - t) / N
t = performance.now()
for (let i = 0; i < N; i++) { evmAddr('satchel.example.testnet', `satchel/${i}/evm`); btcAddr('satchel.example.testnet', `satchel/${i}/btc`); solAddr('satchel.example.testnet', `satchel/${i}/sol`) }
const nobleAll3 = (performance.now() - t) / N
console.log(JSON.stringify({ N, ms_per_chainsig_secp256k1: +csSecp.toFixed(3), ms_per_chainsig_ed25519: +csEd.toFixed(3), ms_per_noble_evm_btc_sol_triple: +nobleAll3.toFixed(3) }))
