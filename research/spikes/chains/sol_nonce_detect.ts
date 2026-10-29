// THROWAWAY SPIKE (chains agent). Question: can we detect a durable-nonce Solana message from the raw
// bytes that Satchel's contract receives as payload_v2.Eddsa (the full message)? (spec for contract/sec)
// Run: npx tsx sol_nonce_detect.ts
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionMessage, NONCE_ACCOUNT_LENGTH } from '@solana/web3.js'

function readCompactU16(b: Uint8Array, o: number): [number, number] {
  let v = 0, s = 0, i = 0
  for (;;) { const x = b[o + i]; v |= (x & 0x7f) << s; i++; if ((x & 0x80) === 0) break; s += 7 }
  return [v, i]
}
/** Parses a legacy or v0 Solana message; returns static keys, blockhash and instructions. */
export function parseMessage(b: Uint8Array) {
  let o = 0
  let version: 'legacy' | number = 'legacy'
  if (b[0] & 0x80) { version = b[0] & 0x7f; o = 1 }
  const header = { numRequiredSignatures: b[o], numReadonlySigned: b[o + 1], numReadonlyUnsigned: b[o + 2] }; o += 3
  let [n, l] = readCompactU16(b, o); o += l
  const keys: string[] = []
  for (let i = 0; i < n; i++) { keys.push(new PublicKey(b.slice(o, o + 32)).toBase58()); o += 32 }
  const recentBlockhash = new PublicKey(b.slice(o, o + 32)).toBase58(); o += 32
  ;[n, l] = readCompactU16(b, o); o += l
  const ixs: { programIndex: number; accounts: number[]; data: Uint8Array }[] = []
  for (let i = 0; i < n; i++) {
    const programIndex = b[o]; o += 1
    let [na, la] = readCompactU16(b, o); o += la
    const accounts = Array.from(b.slice(o, o + na)); o += na
    let [nd, ld] = readCompactU16(b, o); o += ld
    ixs.push({ programIndex, accounts, data: b.slice(o, o + nd) }); o += nd
  }
  return { version, header, keys, recentBlockhash, ixs }
}
const SYSTEM = '11111111111111111111111111111111'
/** True if instruction 0 is System::AdvanceNonceAccount (u32 LE discriminator 4) => tx never expires. */
export function isDurableNonce(b: Uint8Array): boolean {
  const m = parseMessage(b)
  const ix = m.ixs[0]
  if (!ix) return false
  const prog = m.keys[ix.programIndex] // program ids must be static keys (cannot come from a lookup table)
  return prog === SYSTEM && ix.data.length >= 4 && ix.data[0] === 4 && ix.data[1] === 0 && ix.data[2] === 0 && ix.data[3] === 0
}

const satchel = new PublicKey('6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA')
const attacker = Keypair.generate().publicKey
const nonceAcct = Keypair.generate().publicKey
const fakeNonceValue = Keypair.generate().publicKey.toBase58() // stands in for the stored nonce (used as recentBlockhash)

const normal = new Transaction({ feePayer: satchel, recentBlockhash: fakeNonceValue }).add(SystemProgram.transfer({ fromPubkey: satchel, toPubkey: attacker, lamports: 1 }))
const durable = new Transaction({ feePayer: satchel, recentBlockhash: fakeNonceValue })
  .add(SystemProgram.nonceAdvance({ noncePubkey: nonceAcct, authorizedPubkey: satchel }))
  .add(SystemProgram.transfer({ fromPubkey: satchel, toPubkey: attacker, lamports: 1 }))
const durableV0 = new TransactionMessage({ payerKey: satchel, recentBlockhash: fakeNonceValue, instructions: [
  SystemProgram.nonceAdvance({ noncePubkey: nonceAcct, authorizedPubkey: satchel }),
  SystemProgram.transfer({ fromPubkey: satchel, toPubkey: attacker, lamports: 1 }),
] }).compileToV0Message().serialize()
// nonce instruction NOT first => runtime treats it as a normal (expiring) tx
const nonceSecond = new Transaction({ feePayer: satchel, recentBlockhash: fakeNonceValue })
  .add(SystemProgram.transfer({ fromPubkey: satchel, toPubkey: attacker, lamports: 1 }))
  .add(SystemProgram.nonceAdvance({ noncePubkey: nonceAcct, authorizedPubkey: satchel }))

const nm = durable.serializeMessage()
const pm = parseMessage(nm)
console.log(JSON.stringify({
  normal: isDurableNonce(normal.serializeMessage()), durableLegacy: isDurableNonce(nm), durableV0: isDurableNonce(durableV0), nonceSecond: isDurableNonce(nonceSecond.serializeMessage()),
  durableLegacyParsed: { header: pm.header, keys: pm.keys, ix0: { program: pm.keys[pm.ixs[0].programIndex], dataHex: Buffer.from(pm.ixs[0].data).toString('hex') } },
  feePayerIsKey0: pm.keys[0] === satchel.toBase58(), NONCE_ACCOUNT_LENGTH,
}))
