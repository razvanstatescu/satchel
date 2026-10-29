// THROWAWAY spike helpers (2026-10-21). Not product code; do not copy.
import * as bitcoin from 'bitcoinjs-lib'
import { sha256 } from '@noble/hashes/sha2.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'

export const NET = bitcoin.networks.testnet // testnet3, testnet4 and signet share tb1 / 0x6f / 0xc4 / 0xef
export const N = secp256k1.Point.CURVE().n
export const HALF_N = N >> 1n

export const hex = (u8) => Buffer.from(u8).toString('hex')
export const unhex = (h) => new Uint8Array(Buffer.from(h, 'hex'))
export const sha256d = (b) => sha256(sha256(b))

const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }

// BIP143 preimage for a P2WPKH input with SIGHASH_ALL (the only type Satchel should ever sign).
// Built by hand so we can (a) log it, (b) re-hash it on-chain, (c) compare against bitcoinjs-lib.
export function bip143PreimageP2WPKH(tx, inIndex, pubkeyHash20, valueSats, hashType = bitcoin.Transaction.SIGHASH_ALL) {
  if (hashType !== bitcoin.Transaction.SIGHASH_ALL) throw new Error('only SIGHASH_ALL in this spike')
  const prevouts = Buffer.concat(tx.ins.map((i) => Buffer.concat([Buffer.from(i.hash), u32le(i.index)])))
  const sequences = Buffer.concat(tx.ins.map((i) => u32le(i.sequence)))
  const outputs = Buffer.concat(
    tx.outs.map((o) => Buffer.concat([u64le(o.value), Buffer.from([o.script.length]), Buffer.from(o.script)])),
  )
  const input = tx.ins[inIndex]
  const scriptCode = Buffer.concat([Buffer.from([0x19, 0x76, 0xa9, 0x14]), Buffer.from(pubkeyHash20), Buffer.from([0x88, 0xac])])
  return new Uint8Array(Buffer.concat([
    u32le(tx.version),
    Buffer.from(sha256d(prevouts)),
    Buffer.from(sha256d(sequences)),
    Buffer.from(input.hash), u32le(input.index), // outpoint: txid in internal (LE) byte order + vout
    scriptCode,
    u64le(valueSats),
    u32le(input.sequence),
    Buffer.from(sha256d(outputs)),
    u32le(tx.locktime),
    u32le(hashType),
  ]))
}

// Parse a 182-byte P2WPKH BIP143 preimage (what an on-chain validator / indexer would do).
export function parsePreimageP2WPKH(pre) {
  const b = Buffer.from(pre)
  if (b.length !== 182) throw new Error(`P2WPKH BIP143 preimage must be 182 bytes, got ${b.length}`)
  let o = 0
  const take = (n) => { const s = b.subarray(o, o + n); o += n; return s }
  const version = take(4).readUInt32LE()
  const hashPrevouts = hex(take(32))
  const hashSequence = hex(take(32))
  const txidLE = take(32)
  const vout = take(4).readUInt32LE()
  const scriptCode = take(26)
  if (!(scriptCode[0] === 0x19 && scriptCode[1] === 0x76 && scriptCode[2] === 0xa9 && scriptCode[3] === 0x14 && scriptCode[24] === 0x88 && scriptCode[25] === 0xac)) throw new Error('scriptCode is not P2WPKH')
  const amount = take(8).readBigUInt64LE()
  const sequence = take(4).readUInt32LE()
  const hashOutputs = hex(take(32))
  const locktime = take(4).readUInt32LE()
  const sighashType = take(4).readUInt32LE()
  return {
    version, hashPrevouts, hashSequence,
    outpoint: { txid: hex(Buffer.from(txidLE).reverse()), vout }, // display (BE) txid as used by explorers
    pubkeyHash: hex(scriptCode.subarray(4, 24)), amount, sequence, hashOutputs, locktime, sighashType,
  }
}

// MPC SignatureResponse JSON -> { r, s, recid } as bigints, with Bitcoin standardness checks.
export function mpcToRS(resp) {
  if (resp.scheme && resp.scheme !== 'Secp256k1') throw new Error('not a Secp256k1 response: ' + resp.scheme)
  const bigR = resp.big_r.affine_point // 33-byte compressed point, hex
  const r = BigInt('0x' + bigR.slice(2)) % N // r = x(R) mod n
  const s = BigInt('0x' + resp.s.scalar)
  if (r === 0n || s === 0n || s >= N) throw new Error('invalid r/s')
  return { r, s, recid: resp.recovery_id, lowS: s <= HALF_N, bigR }
}
export const to64 = (r, s) => unhex(r.toString(16).padStart(64, '0') + s.toString(16).padStart(64, '0'))
// Defensive normalisation (MPC already returns low-S, see RESULTS): s' = n - s flips parity of R => recid ^ 1
export function normalizeLowS({ r, s, recid }) {
  return s > HALF_N ? { r, s: N - s, recid: recid ^ 1, flipped: true } : { r, s, recid, flipped: false }
}

export const verifyStrict = (pub33, msg32, sig64) => secp256k1.verify(sig64, msg32, pub33, { prehash: false, lowS: true })
export const verifyLoose = (pub33, msg32, sig64) => secp256k1.verify(sig64, msg32, pub33, { prehash: false, lowS: false })

// vsize estimator for P2WPKH-only txs (exact for 1-byte varints; sigs are 71-72 bytes DER+type).
export function estimateVsizeP2WPKH(nIn, outScriptLens) {
  const base = 4 + 1 + nIn * (32 + 4 + 1 + 4) + 1 + outScriptLens.reduce((a, l) => a + 8 + 1 + l, 0) + 4
  const witness = 2 /* marker+flag */ + nIn * (1 + 1 + 72 + 1 + 33) // worst-case 72-byte sig
  return Math.ceil((base * 4 + witness) / 4)
}
export const DUST_P2WPKH = 294n // Bitcoin Core GetDustThreshold at dustrelayfee=3000 sat/kvB: (31 + 67) * 3
export const DUST_P2TR = 330n
export const DUST_P2PKH = 546n
