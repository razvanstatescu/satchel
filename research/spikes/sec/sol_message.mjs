// THROWAWAY SPIKE (sec, Phase 0). Question: for Solana the MPC Ed25519 domain signs the *message
// bytes themselves* (no hash), so the contract always sees the full message. Can a small strict
// parser (mirroring an on-chain Rust parser) (1) extract recentBlockhash, (2) detect a durable-nonce
// tx exactly like the runtime does, (3) handle legacy + v0 messages and address lookup tables,
// and (4) enforce an instruction allowlist (system transfer + compute budget only)?
import {
  Keypair, PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction,
  ComputeBudgetProgram, AddressLookupTableAccount, NONCE_ACCOUNT_LENGTH,
} from '@solana/web3.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import bs58 from 'bs58'
import assert from 'node:assert/strict'

let pass = 0
const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  PASS', m) }
const SYSTEM = SystemProgram.programId.toBase58()
const COMPUTE_BUDGET = ComputeBudgetProgram.programId.toBase58()

const seed = (b) => Keypair.fromSeed(Uint8Array.from(Array(32).fill(b)))
const satchel = seed(1), bob = seed(2), sellerKey = seed(3), nonceAcct = seed(4)
const blockhash = bs58.encode(Uint8Array.from(Array(32).fill(9)))

// ---------------- strict parser ----------------
function shortvec(buf, pos) { // Solana compact-u16, canonical only
  let v = 0
  for (let i = 0; i < 3; i++) {
    const b = buf[pos + i]
    if (b === undefined) throw new Error('shortvec: eof')
    v |= (b & 0x7f) << (7 * i)
    if ((b & 0x80) === 0) {
      if (i > 0 && b === 0) throw new Error('shortvec: non-canonical (alias) encoding')
      if (v > 0xffff) throw new Error('shortvec: overflow')
      return [v, pos + i + 1]
    }
  }
  throw new Error('shortvec: too long')
}
function take(buf, pos, n) { if (pos + n > buf.length) throw new Error('eof'); return [buf.subarray(pos, pos + n), pos + n] }
function parseSolMessage(buf) {
  let pos = 0, version = 'legacy'
  if (buf[0] & 0x80) { version = buf[0] & 0x7f; if (version !== 0) throw new Error(`unsupported message version ${version}`); pos = 1 }
  const header = { numRequiredSignatures: buf[pos], numReadonlySigned: buf[pos + 1], numReadonlyUnsigned: buf[pos + 2] }; pos += 3
  let n; [n, pos] = shortvec(buf, pos)
  const keys = []; for (let i = 0; i < n; i++) { let k; [k, pos] = take(buf, pos, 32); keys.push(bs58.encode(k)) }
  let bh; [bh, pos] = take(buf, pos, 32)
  let ni; [ni, pos] = shortvec(buf, pos)
  const ixs = []
  for (let i = 0; i < ni; i++) {
    const programIdIndex = buf[pos]; pos += 1
    let na; [na, pos] = shortvec(buf, pos); let accts; [accts, pos] = take(buf, pos, na)
    let nd; [nd, pos] = shortvec(buf, pos); let data; [data, pos] = take(buf, pos, nd)
    ixs.push({ programIdIndex, accounts: [...accts], data: Uint8Array.from(data) })
  }
  const lookups = []
  if (version === 0) {
    let nl; [nl, pos] = shortvec(buf, pos)
    for (let i = 0; i < nl; i++) {
      let k; [k, pos] = take(buf, pos, 32)
      let w; [w, pos] = shortvec(buf, pos); let wi; [wi, pos] = take(buf, pos, w)
      let r; [r, pos] = shortvec(buf, pos); let ri; [ri, pos] = take(buf, pos, r)
      lookups.push({ table: bs58.encode(k), writable: [...wi], readonly: [...ri] })
    }
  }
  if (pos !== buf.length) throw new Error('trailing bytes')
  // program ids must come from static keys (runtime rule for v0; trivially true for legacy)
  for (const ix of ixs) if (ix.programIdIndex >= keys.length) throw new Error('program id not in static keys')
  return { version, header, keys, recentBlockhash: bs58.encode(bh), instructions: ixs, lookups }
}
// Same rule as agave/solana-sdk get_durable_nonce: ix[0] is system program && data[..4] == 4u32 LE
const usesDurableNonce = (m) => {
  const ix = m.instructions[0]
  return !!ix && m.keys[ix.programIdIndex] === SYSTEM && ix.data.length >= 4 && ix.data[0] === 4 && ix.data[1] === 0 && ix.data[2] === 0 && ix.data[3] === 0
}
// MVP allowlist policy
function classifySol(buf, { expectedSigner } = {}) {
  let m
  try { m = parseSolMessage(buf) } catch (e) { return { ok: false, reason: e.message } }
  if (usesDurableNonce(m)) return { ok: false, reason: 'durable-nonce tx (never expires) refused' }
  if (m.lookups.length) return { ok: false, reason: 'address lookup tables refused in MVP (hidden accounts)' }
  if (m.header.numRequiredSignatures !== 1) return { ok: false, reason: 'exactly one signer (the Satchel) required' }
  if (expectedSigner && m.keys[0] !== expectedSigner) return { ok: false, reason: 'fee payer/signer is not this Satchel' }
  const transfers = []
  for (const ix of m.instructions) {
    const prog = m.keys[ix.programIdIndex]
    if (prog === COMPUTE_BUDGET && (ix.data[0] === 2 || ix.data[0] === 3)) continue // SetComputeUnitLimit / SetComputeUnitPrice
    if (prog === SYSTEM && ix.data.length === 12 && ix.data[0] === 2 && ix.data[1] === 0 && ix.data[2] === 0 && ix.data[3] === 0) {
      if (ix.accounts.length !== 2 || ix.accounts[0] !== 0) return { ok: false, reason: 'transfer must be from the signer' }
      transfers.push({ to: m.keys[ix.accounts[1]], lamports: Buffer.from(ix.data).readBigUInt64LE(4) })
      continue
    }
    return { ok: false, reason: `instruction refused: program ${prog.slice(0, 8)}… tag ${ix.data[0]}` }
  }
  return { ok: true, recentBlockhash: m.recentBlockhash, transfers, version: m.version }
}

// ---------------- 1. legacy transfer ----------------
console.log('\n[1] legacy message: recentBlockhash extraction + Ed25519 over the message bytes')
const tx = new Transaction({ feePayer: satchel.publicKey, recentBlockhash: blockhash })
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: bob.publicKey, lamports: 1_234_567 }))
const msgBytes = tx.serializeMessage()
const c1 = classifySol(msgBytes, { expectedSigner: satchel.publicKey.toBase58() })
ok(c1.ok && c1.recentBlockhash === blockhash, `parser extracts recentBlockhash ${blockhash.slice(0, 8)}… from ${msgBytes.length}-byte message`)
ok(c1.transfers[0].lamports === 1_234_567n && c1.transfers[0].to === bob.publicKey.toBase58(), 'transfer amount and destination parsed')
const sig = ed25519.sign(msgBytes, satchel.secretKey.subarray(0, 32)) // MPC Eddsa payload = these bytes, unhashed
tx.addSignature(satchel.publicKey, Buffer.from(sig))
ok(tx.verifySignatures(), 'Ed25519 signature over the raw message bytes is the transaction signature (web3.js verifySignatures)')
ok(msgBytes.length <= 1232, `message ${msgBytes.length} B fits MPC EDDSA_PAYLOAD_SIZE_UPPER_BOUND_BYTES=1232`)

// ---------------- 2. durable nonce ----------------
console.log('\n[2] durable-nonce detection (never-expiring signatures)')
const nonceValue = bs58.encode(Uint8Array.from(Array(32).fill(7)))
const ntx = new Transaction({ feePayer: satchel.publicKey, nonceInfo: { nonce: nonceValue, nonceInstruction: SystemProgram.nonceAdvance({ noncePubkey: nonceAcct.publicKey, authorizedPubkey: satchel.publicKey }) } })
ntx.add(SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: bob.publicKey, lamports: 5 }))
const nm = parseSolMessage(ntx.serializeMessage())
ok(usesDurableNonce(nm) && nm.recentBlockhash === nonceValue, 'first ix = SystemProgram AdvanceNonceAccount detected; "recentBlockhash" field holds the nonce value')
ok(!classifySol(ntx.serializeMessage()).ok, `refused: ${classifySol(ntx.serializeMessage()).reason}`)
// nonce authority = seller's own key: the Satchel cannot invalidate it later, only the seller can advance the nonce
const ntx2 = new Transaction({ feePayer: satchel.publicKey, nonceInfo: { nonce: nonceValue, nonceInstruction: SystemProgram.nonceAdvance({ noncePubkey: nonceAcct.publicKey, authorizedPubkey: sellerKey.publicKey }) } })
ntx2.add(SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: sellerKey.publicKey, lamports: 5 }))
const nm2 = parseSolMessage(ntx2.serializeMessage())
ok(usesDurableNonce(nm2) && nm2.header.numRequiredSignatures === 2, 'variant with seller as nonce authority: 2 signers; only the seller could ever advance (kill) it')
// runtime matches on a 4-byte prefix, so trailing data still counts as AdvanceNonceAccount
const raw = Buffer.from(ntx.serializeMessage())
const m3 = parseSolMessage(raw); const ix0 = m3.instructions[0]
ok(ix0.data.length === 4, 'AdvanceNonceAccount data is exactly 04000000 when built normally')
console.log('  note: agave get_durable_nonce checks data.get(..4) == 4u32 LE (prefix) => contract must use the same prefix rule')
// AdvanceNonce NOT first: not a durable-nonce tx for the runtime (blockhash rules apply) — allowlist refuses anyway
const tx4 = new Transaction({ feePayer: satchel.publicKey, recentBlockhash: blockhash })
tx4.add(SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: bob.publicKey, lamports: 5 }), SystemProgram.nonceAdvance({ noncePubkey: nonceAcct.publicKey, authorizedPubkey: satchel.publicKey }))
const m4 = parseSolMessage(tx4.serializeMessage())
ok(!usesDurableNonce(m4) && !classifySol(tx4.serializeMessage()).ok, 'AdvanceNonce in position >0: not durable for the runtime, still refused by the allowlist')

// ---------------- 3. v0 messages + address lookup tables ----------------
console.log('\n[3] v0 messages and address lookup tables')
const v0 = new TransactionMessage({ payerKey: satchel.publicKey, recentBlockhash: blockhash, instructions: [SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: bob.publicKey, lamports: 42 })] }).compileToV0Message()
const v0bytes = v0.serialize()
ok(v0bytes[0] === 0x80, 'v0 message starts with 0x80 version prefix')
const c3 = classifySol(v0bytes, { expectedSigner: satchel.publicKey.toBase58() })
ok(c3.ok && c3.version === 0 && c3.recentBlockhash === blockhash, 'v0 without lookups: parsed + accepted')
const alt = new AddressLookupTableAccount({ key: seed(5).publicKey, state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses: [bob.publicKey, seed(6).publicKey] } })
const v0alt = new TransactionMessage({ payerKey: satchel.publicKey, recentBlockhash: blockhash, instructions: [SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: bob.publicKey, lamports: 42 })] }).compileToV0Message([alt])
const altParsed = parseSolMessage(v0alt.serialize())
ok(altParsed.lookups.length === 1 && !altParsed.keys.includes(bob.publicKey.toBase58()), 'with an ALT the destination is NOT in the message bytes (only a table index) — contract cannot log it')
ok(!classifySol(v0alt.serialize()).ok, `v0 with ALT refused in MVP: ${classifySol(v0alt.serialize()).reason}`)
const vsig = ed25519.sign(v0bytes, satchel.secretKey.subarray(0, 32))
const vtx = new VersionedTransaction(v0, [vsig])
ok(ed25519.verify(vtx.signatures[0], vtx.message.serialize(), satchel.publicKey.toBytes()), 'v0: signature is over 0x80||message bytes')

// ---------------- 4. other refusals ----------------
console.log('\n[4] allowlist refusals (standing authorizations / account takeover)')
const assign = new Transaction({ feePayer: satchel.publicKey, recentBlockhash: blockhash }).add(SystemProgram.assign({ accountPubkey: satchel.publicKey, programId: seed(8).publicKey }))
ok(!classifySol(assign.serializeMessage()).ok, `SystemProgram.Assign (hands the wallet account to a program) refused: ${classifySol(assign.serializeMessage()).reason}`)
const create = new Transaction({ feePayer: satchel.publicKey, recentBlockhash: blockhash }).add(SystemProgram.createAccount({ fromPubkey: satchel.publicKey, newAccountPubkey: nonceAcct.publicKey, lamports: 1_000_000, space: NONCE_ACCOUNT_LENGTH, programId: SystemProgram.programId }))
ok(!classifySol(create.serializeMessage()).ok, 'CreateAccount refused')
const spl = new Transaction({ feePayer: satchel.publicKey, recentBlockhash: blockhash }).add({ programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), keys: [{ pubkey: satchel.publicKey, isSigner: true, isWritable: true }], data: Buffer.from([4, 1, 0, 0, 0, 0, 0, 0, 0]) /* Approve */ })
ok(!classifySol(spl.serializeMessage()).ok, 'SPL Token Approve (delegate) refused')
const offchain = Buffer.concat([Buffer.from([0xff]), Buffer.from('solana offchain'), Buffer.from([0, 0])])
ok(!classifySol(offchain).ok, `off-chain message (\\xffsolana offchain…) refused: ${classifySol(offchain).reason}`)
const trailing = Buffer.concat([Buffer.from(msgBytes), Buffer.from([0])])
ok(!classifySol(trailing).ok, 'trailing byte refused')
const twoSigners = new Transaction({ feePayer: sellerKey.publicKey, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: satchel.publicKey, toPubkey: sellerKey.publicKey, lamports: 1 }))
ok(!classifySol(twoSigners.serializeMessage()).ok, 'multi-signer message refused in MVP (Satchel must be the only signer)')

console.log(`\nALL ${pass} CHECKS PASSED`)
