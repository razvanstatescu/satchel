// THROWAWAY SPIKE (chains agent). Question: can the unsigned tx be persisted (sessionStorage/IndexedDB)
// across a reload/wallet redirect and still be finalized with the MPC response? (offline; reuses real MPC sig)
// Run: npx tsx persist_roundtrip.ts
import { readFileSync } from 'node:fs'
import { chainAdapters, contracts, utils } from 'chainsig.js'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { keccak256 } from 'viem'

const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
const evm = new chainAdapters.evm.EVM({ publicClient: {} as any, contract })
const sol = new chainAdapters.solana.Solana({ solanaConnection: new Connection('https://api.devnet.solana.com'), contract })

// --- EVM: reuse captured prepared tx + real MPC response
const L = readFileSync('out_evm_sign_1.txt', 'utf8').split('\n').filter((l) => l.startsWith('{'))
const p = JSON.parse(L.find((l) => l.includes('"step":"prepared"'))!).transaction
const mpc = JSON.parse(L.find((l) => l.includes('"step":"mpc"'))!).response
const fin = JSON.parse(L.find((l) => l.includes('"step":"finalized"'))!)
const tx = { ...p, value: BigInt(p.value), gas: BigInt(p.gas), maxFeePerGas: BigInt(p.maxFeePerGas), maxPriorityFeePerGas: BigInt(p.maxPriorityFeePerGas) }
const stored = evm.serializeTransaction(tx)                       // string to persist
const restored = evm.deserializeTransaction(stored)               // after reload
const signed = evm.finalizeTransactionSigning({ transaction: restored as any, rsvSignatures: [utils.cryptography.toRSV(mpc)] })
console.log(JSON.stringify({ evm: { storedHex: stored, storedLen: stored.length, sameHashAfterRestore: keccak256(evm.serializeTransaction(restored as any)) === '0xbc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377', signedEqualsOriginal: signed === fin.signedTx, restoredKeys: Object.keys(restored) } }))

// --- Solana: message bytes must be identical after restore (the signature covers them)
const from = new PublicKey('6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA'), to = new PublicKey('8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r')
const t = new Transaction({ feePayer: from, recentBlockhash: '2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW' }).add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 1_000_000 }))
const s = sol.serializeTransaction({ transaction: t, feePayer: from, recentBlockhash: t.recentBlockhash! })
const r = sol.deserializeTransaction(s)
console.log(JSON.stringify({ sol: { storedBase64Len: s.length, messageIdentical: Buffer.from(r.transaction.serializeMessage()).equals(Buffer.from(t.serializeMessage())), blockhashKept: r.recentBlockhash === t.recentBlockhash } }))
