// THROWAWAY: devnet timing/fee facts
import { Connection, PublicKey, Transaction, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
const c = new Connection('https://api.devnet.solana.com', 'confirmed')
const samples = await c.getRecentPerformanceSamples(10)
const secPerSlot = samples.map(s => s.samplePeriodSecs / s.numSlots)
const avg = secPerSlot.reduce((a, b) => a + b, 0) / secPerSlot.length
const from = new PublicKey('6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA'), to = new PublicKey('8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r')
const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed')
const h = await c.getBlockHeight('confirmed')
const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 1_000_000 }))
const feeLegacy = await c.getFeeForMessage(tx.compileMessage(), 'confirmed')
const v0 = new TransactionMessage({ payerKey: from, recentBlockhash: blockhash, instructions: [SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 1_000_000 })] }).compileToV0Message()
const feeV0 = await c.getFeeForMessage(v0, 'confirmed')
const legacyBytes = tx.serializeMessage(); const v0Bytes = v0.serialize()
console.log(JSON.stringify({
  secPerSlotAvg: +avg.toFixed(3), secPerSlotMin: +Math.min(...secPerSlot).toFixed(3), secPerSlotMax: +Math.max(...secPerSlot).toFixed(3),
  blockHeight: h, lastValidBlockHeight, validityBlocks: lastValidBlockHeight - h, approxValiditySecs: +((lastValidBlockHeight - h) * avg).toFixed(1),
  feeLegacyLamports: feeLegacy.value, feeV0Lamports: feeV0.value,
  legacyMsgLen: legacyBytes.length, legacyFirstByte: legacyBytes[0], v0MsgLen: v0Bytes.length, v0FirstByte: '0x' + v0Bytes[0].toString(16),
}))
