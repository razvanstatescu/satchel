// THROWAWAY spike 14: Buffer-free (browser-safe) BIP143 P2WPKH preimage; must equal lib.mjs output byte for byte.
import fs from 'node:fs'
import * as bitcoin from 'bitcoinjs-lib'
import { sha256 } from '@noble/hashes/sha2.js'
import { bip143PreimageP2WPKH as nodeVersion, NET, unhex } from './lib.mjs'

const sha256d = (b) => sha256(sha256(b))
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o }
const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b }
const u64 = (n) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b }
export function preimageP2WPKH(tx, i, pkh20, value) {
  const prevouts = cat(...tx.ins.flatMap((x) => [x.hash, u32(x.index)]))
  const seqs = cat(...tx.ins.map((x) => u32(x.sequence)))
  const outs = cat(...tx.outs.flatMap((o) => [u64(o.value), Uint8Array.of(o.script.length), o.script]))
  const inp = tx.ins[i]
  return cat(u32(tx.version), sha256d(prevouts), sha256d(seqs), inp.hash, u32(inp.index),
    Uint8Array.of(0x19, 0x76, 0xa9, 0x14), pkh20, Uint8Array.of(0x88, 0xac), u64(value), u32(inp.sequence),
    sha256d(outs), u32(tx.locktime), u32(1))
}
let ok = 0, total = 0
for (const f of ['out/unsigned-fake.json', 'out/unsigned-fanout-2.json', 'out/unsigned-fanout-4.json']) {
  const u = JSON.parse(fs.readFileSync(f, 'utf8'))
  const psbt = bitcoin.Psbt.fromBase64(u.psbtBase64, { network: NET })
  const tx = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
  const pkh = bitcoin.payments.p2wpkh({ pubkey: unhex(u.pubkey || '021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d'), network: NET }).hash
  u.inputs.forEach((inp, i) => {
    total++
    const a = Buffer.from(preimageP2WPKH(tx, i, pkh, BigInt(inp.value))).toString('hex')
    if (a === Buffer.from(nodeVersion(tx, i, pkh, BigInt(inp.value))).toString('hex') && a === inp.preimageHex &&
        Buffer.from(sha256d(preimageP2WPKH(tx, i, pkh, BigInt(inp.value)))).toString('hex') === inp.sighash) ok++
  })
}
console.log(`browser-safe preimage == Buffer version == stored preimage, and sha256d == sighash: ${ok}/${total}`)
