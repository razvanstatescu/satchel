// THROWAWAY SPIKE (sec, Phase 0). Question: if sign_for receives the BIP143 *preimage* for a
// P2WPKH input instead of the 32-byte sighash, can the contract (1) compute exactly the hash the
// MPC must sign (sha256d(preimage) == bitcoinjs hashForWitnessV0), (2) extract the outpoint,
// amount and sighash type from a fixed layout, and (3) refuse non-SIGHASH_ALL variants?
import * as bitcoin from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import assert from 'node:assert/strict'

bitcoin.initEccLib(ecc)
const ECPair = ECPairFactory(ecc)
const network = bitcoin.networks.testnet // testnet4 uses the same bech32 hrp (tb) and version bytes
const key = ECPair.fromPrivateKey(Uint8Array.from(Buffer.from('1f'.repeat(32), 'hex')), { network })
const pay = bitcoin.payments.p2wpkh({ pubkey: key.publicKey, network })
const other = bitcoin.payments.p2wpkh({ pubkey: ECPair.fromPrivateKey(Uint8Array.from(Buffer.from('2e'.repeat(32), 'hex'))).publicKey, network })

const hex = (u8) => Buffer.from(u8).toString('hex')
const sha256d = (u8) => sha256(sha256(u8))
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }
const varint = (n) => (n < 0xfd ? Buffer.from([n]) : (() => { throw new Error('varint>0xfc not needed') })())
let pass = 0
const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  PASS', m) }

// A 2-input, 2-output P2WPKH spend (all inputs owned by `key`)
const prev = [
  { txid: 'aa'.repeat(31) + '01', vout: 0, value: 150_000n },
  { txid: 'bb'.repeat(31) + '02', vout: 3, value: 70_000n },
]
const tx = new bitcoin.Transaction()
tx.version = 2
for (const p of prev) tx.addInput(Uint8Array.from(Buffer.from(p.txid, 'hex').reverse()), p.vout, 0xfffffffd)
tx.addOutput(other.output, 200_000n)
tx.addOutput(pay.output, 19_000n) // change; fee 1000 sats
tx.locktime = 0

// scriptCode for P2WPKH per BIP143: 0x19 76 a9 14 <20-byte pkh> 88 ac (OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG)
const pkh = pay.hash
const scriptCodeNoLen = bitcoin.payments.p2pkh({ hash: pkh }).output // 25 bytes
const scriptCode = Buffer.concat([Buffer.from([0x19]), Buffer.from(scriptCodeNoLen)])

function bip143Preimage(tx, i, value, hashType) {
  const acp = (hashType & 0x80) !== 0, base = hashType & 0x1f
  const ZERO = Buffer.alloc(32)
  const hashPrevouts = acp ? ZERO : Buffer.from(sha256d(Buffer.concat(tx.ins.map((x) => Buffer.concat([Buffer.from(x.hash), u32le(x.index)])))))
  const hashSequence = acp || base === 2 || base === 3 ? ZERO : Buffer.from(sha256d(Buffer.concat(tx.ins.map((x) => u32le(x.sequence)))))
  const ser = (o) => Buffer.concat([u64le(o.value), varint(o.script.length), Buffer.from(o.script)])
  let hashOutputs = ZERO
  if (base !== 2 && base !== 3) hashOutputs = Buffer.from(sha256d(Buffer.concat(tx.outs.map(ser))))
  else if (base === 3 && i < tx.outs.length) hashOutputs = Buffer.from(sha256d(ser(tx.outs[i])))
  const inp = tx.ins[i]
  return Buffer.concat([u32le(tx.version), hashPrevouts, hashSequence, Buffer.from(inp.hash), u32le(inp.index), scriptCode, u64le(value), u32le(inp.sequence), hashOutputs, u32le(tx.locktime), u32le(hashType)])
}

// The on-chain check, in JS. Fixed layout, 182 bytes for P2WPKH.
function classifyBip143(pre, { expectedPkh } = {}) {
  if (pre.length !== 182) return { ok: false, reason: `length ${pre.length} != 182 (only P2WPKH scriptCode accepted)` }
  const sc = pre.subarray(104, 130)
  if (!(sc[0] === 0x19 && sc[1] === 0x76 && sc[2] === 0xa9 && sc[3] === 0x14 && sc[24] === 0x88 && sc[25] === 0xac)) return { ok: false, reason: 'scriptCode is not P2WPKH form' }
  if (expectedPkh && hex(sc.subarray(4, 24)) !== hex(expectedPkh)) return { ok: false, reason: 'scriptCode pkh != this token\'s pkh' }
  const sighashType = pre.readUInt32LE(178)
  if (sighashType !== 0x01) return { ok: false, reason: `sighash type 0x${sighashType.toString(16)} refused (only SIGHASH_ALL)` }
  const txidInternal = pre.subarray(68, 100)
  return {
    ok: true,
    payloadHash: hex(sha256d(pre)),
    fields: {
      version: pre.readUInt32LE(0),
      outpoint: { txid: hex(Buffer.from(txidInternal).reverse()) /* display order */, vout: pre.readUInt32LE(100) },
      amountSats: pre.readBigUInt64LE(130), sequence: pre.readUInt32LE(138), locktime: pre.readUInt32LE(174), sighashType,
      hashPrevouts: hex(pre.subarray(4, 36)), hashOutputs: hex(pre.subarray(142, 174)),
    },
  }
}

console.log('\n[1] sha256d(BIP143 preimage) == bitcoinjs hashForWitnessV0, for every input')
const preimages = []
for (let i = 0; i < prev.length; i++) {
  const pre = bip143Preimage(tx, i, prev[i].value, bitcoin.Transaction.SIGHASH_ALL)
  const libHash = tx.hashForWitnessV0(i, scriptCodeNoLen, prev[i].value, bitcoin.Transaction.SIGHASH_ALL)
  ok(hex(sha256d(pre)) === hex(libHash), `input ${i}: sha256d(preimage) == hashForWitnessV0 (${hex(libHash).slice(0, 16)}…), preimage ${pre.length} bytes`)
  preimages.push(pre)
}

console.log('\n[2] fixed-layout parse of the preimage')
for (let i = 0; i < prev.length; i++) {
  const c = classifyBip143(preimages[i], { expectedPkh: pkh })
  ok(c.ok && c.fields.outpoint.txid === prev[i].txid && c.fields.outpoint.vout === prev[i].vout && c.fields.amountSats === prev[i].value, `input ${i}: outpoint ${c.fields.outpoint.txid.slice(0, 8)}…:${c.fields.outpoint.vout} and amount ${c.fields.amountSats} recovered (txid reversed to display order)`)
}

console.log('\n[3] MPC-style raw signature over sha256d(preimage) produces a valid witness; PSBT agrees')
for (let i = 0; i < prev.length; i++) {
  const h = sha256d(preimages[i])
  const sig = key.sign(h) // raw 64-byte compact (r||s), low-s — the MPC returns big_r/s/recovery_id; same thing
  tx.setWitness(i, [bitcoin.script.signature.encode(sig, bitcoin.Transaction.SIGHASH_ALL), key.publicKey])
  ok(key.verify(h, sig), `input ${i}: ECDSA verify(pubkey, sha256d(preimage), sig)`)
}
const psbt = new bitcoin.Psbt({ network })
psbt.setVersion(2)
prev.forEach((p) => psbt.addInput({ hash: p.txid, index: p.vout, sequence: 0xfffffffd, witnessUtxo: { script: pay.output, value: p.value } }))
psbt.addOutput({ script: other.output, value: 200_000n }); psbt.addOutput({ script: pay.output, value: 19_000n })
psbt.signAllInputs(key)
ok(psbt.validateSignaturesOfAllInputs((pk, msghash, signature) => ecc.verify(msghash, pk, signature)), 'PSBT signatures validate')
psbt.finalizeAllInputs()
const fromPsbt = psbt.extractTransaction()
ok(fromPsbt.getId() === tx.getId(), `same txid from manual-preimage path and PSBT path (${tx.getId().slice(0, 16)}…)`)
ok(hex(fromPsbt.toBuffer()) === hex(tx.toBuffer()), 'byte-identical signed tx (RFC6979 deterministic signatures)')

console.log('\n[4] refusal of non-ALL sighash types and non-P2WPKH scriptCodes')
const T = bitcoin.Transaction
for (const [name, ht] of [['NONE', T.SIGHASH_NONE], ['SINGLE', T.SIGHASH_SINGLE], ['ALL|ANYONECANPAY', T.SIGHASH_ALL | T.SIGHASH_ANYONECANPAY], ['NONE|ANYONECANPAY', T.SIGHASH_NONE | T.SIGHASH_ANYONECANPAY], ['SINGLE|ANYONECANPAY', T.SIGHASH_SINGLE | T.SIGHASH_ANYONECANPAY], ['0x41 (BCH FORKID style)', 0x41]]) {
  const pre = bip143Preimage(tx, 0, prev[0].value, ht)
  if ((ht & 0x1f) !== 0x01 || (ht & 0x80)) {
    // sanity: our preimage still matches bitcoinjs for the standard types
    if (ht !== 0x41) ok(hex(sha256d(pre)) === hex(tx.hashForWitnessV0(0, scriptCodeNoLen, prev[0].value, ht)), `preimage for ${name} matches bitcoinjs`)
  }
  const c = classifyBip143(pre)
  ok(!c.ok, `refuse ${name}: ${c.reason}; hashPrevouts zero? ${hex(pre.subarray(4, 36)) === '00'.repeat(32)}, hashOutputs zero? ${hex(pre.subarray(142, 174)) === '00'.repeat(32)}`)
}
const bad = Buffer.from(preimages[0]); bad[104] = 0x22 // pretend a P2WSH witnessScript of other length
ok(!classifyBip143(bad).ok, 'refuse altered scriptCode')
ok(!classifyBip143(Buffer.concat([preimages[0], Buffer.from([0])])).ok, 'refuse wrong length (183 bytes)')
ok(!classifyBip143(preimages[0], { expectedPkh: other.hash }).ok, 'refuse scriptCode for a different pkh (optional check once the contract knows its pkh)')

console.log('\n[5] why raw hashes are dangerous on BTC: the legacy SIGHASH_SINGLE "hash = 1" bug')
const one = tx.hashForSignature(5 /* index >= outs */, pay.output, T.SIGHASH_SINGLE)
const tx2 = new bitcoin.Transaction(); tx2.addInput(Buffer.alloc(32, 7), 9); tx2.addOutput(other.output, 1n)
const one2 = tx2.hashForSignature(3, pay.output, T.SIGHASH_SINGLE)
ok(hex(one) === hex(one2), `legacy hashForSignature(SINGLE, index>=outputs) is the same constant for unrelated txs (${hex(one)} in bitcoinjs byte order) — one signature over it spends legacy P2PKH coins of the key in any tx`)
ok(classifyBip143(Buffer.from(one)).ok === false, 'the preimage-in contract can never be asked to sign that constant (32 bytes is not a 182-byte BIP143 preimage)')

console.log('\n[6] outspend semantics (what the checker relies on)')
console.log('  Under any sighash type the BIP143 preimage commits to *this* input\'s outpoint (bytes 68..104).')
console.log('  => once that outpoint is spent (confirmed, deep enough), every signature over it is dead.')
console.log('  SIGHASH_ALL is still required: NONE/SINGLE/ANYONECANPAY signatures are bearer instruments while unspent.')

console.log('\n[7] frontend helper: BIP143 preimage from a PSBT (what chainsig.js builds), checked against the hash a mock signer captures')
// chainsig.js Bitcoin.prepareTransactionForSigning captures hashesToSign via a mock signer passed to psbt.signInput;
// it never exposes the preimage, so the frontend rebuilds it from public PSBT fields:
function preimageFromPsbt(psbt, i, sighashType = 0x01) {
  const ins = psbt.txInputs, outs = psbt.txOutputs
  const prevouts = Buffer.concat(ins.map((x) => Buffer.concat([Buffer.from(x.hash), u32le(x.index)])))
  const seqs = Buffer.concat(ins.map((x) => u32le(x.sequence ?? 0xffffffff)))
  const outsSer = Buffer.concat(outs.map((o) => Buffer.concat([u64le(o.value), varint(o.script.length), Buffer.from(o.script)])))
  const wu = psbt.data.inputs[i].witnessUtxo // { script: 0x0014<pkh>, value }
  const pkhFromScript = Buffer.from(wu.script).subarray(2, 22)
  const sc = Buffer.concat([Buffer.from([0x19, 0x76, 0xa9, 0x14]), pkhFromScript, Buffer.from([0x88, 0xac])])
  return Buffer.concat([u32le(psbt.version), Buffer.from(sha256d(prevouts)), Buffer.from(sha256d(seqs)), Buffer.from(ins[i].hash), u32le(ins[i].index), sc, u64le(wu.value), u32le(ins[i].sequence ?? 0xffffffff), Buffer.from(sha256d(outsSer)), u32le(psbt.locktime), u32le(sighashType)])
}
const psbt2 = new bitcoin.Psbt({ network })
psbt2.setVersion(2)
prev.forEach((p) => psbt2.addInput({ hash: p.txid, index: p.vout, sequence: 0xfffffffd, witnessUtxo: { script: pay.output, value: p.value } }))
psbt2.addOutput({ script: other.output, value: 200_000n }); psbt2.addOutput({ script: pay.output, value: 19_000n })
const captured = []
for (let i = 0; i < psbt2.inputCount; i++) psbt2.signInput(i, { publicKey: key.publicKey, sign: (h) => { captured[i] = Buffer.from(h); return new Uint8Array(64) } })
for (let i = 0; i < prev.length; i++) {
  const pre = preimageFromPsbt(psbt2, i)
  ok(hex(sha256d(pre)) === hex(captured[i]) && classifyBip143(pre).ok, `input ${i}: sha256d(preimageFromPsbt) == hash captured by mock signer (chainsig.js style); classifier accepts`)
}
console.log(`\nALL ${pass} CHECKS PASSED`)
