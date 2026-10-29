// THROWAWAY spike 10: why the contract must only sign SIGHASH_ALL preimages.
// Local throwaway key (NOT MPC). Sign input 0 under each sighash type, then let an "attacker" rewrite the tx
// (redirect outputs / add inputs) and check whether the ORIGINAL signature still verifies for the modified tx.
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { NET } from './lib.mjs'

const T = bitcoin.Transaction
const priv = sha256(new TextEncoder().encode('throwaway-demo-key'))
const pub = secp256k1.getPublicKey(priv, true)
const me = bitcoin.payments.p2wpkh({ pubkey: pub, network: NET })
const scriptCode = bitcoin.payments.p2pkh({ hash: me.hash }).output
const victimPay = bitcoin.address.toOutputScript('tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q', NET)
const attacker = bitcoin.address.toOutputScript('tb1qn5j4v0pzxcl6z7ecwxnck40dgev5k6zqq4m7r4', NET)
const VALUE = 50_000n

function baseTx() {
  const tx = new T(); tx.version = 2
  tx.addInput(new Uint8Array(32).fill(7), 0, 0xfffffffd)
  tx.addOutput(victimPay, 40_000n); tx.addOutput(me.output, 9_000n)
  return tx
}
const variants = {
  'redirect all outputs to attacker': (tx) => { tx.outs = []; tx.addOutput(attacker, 49_000n) },
  'add attacker input + output (input 0 unchanged)': (tx) => { tx.addInput(new Uint8Array(32).fill(9), 3, 0xfffffffd); tx.addOutput(attacker, 1_000n) },
  'change output 1 only (keep output 0)': (tx) => { tx.outs[1] = { script: attacker, value: 9_000n } },
}
const types = { ALL: T.SIGHASH_ALL, NONE: T.SIGHASH_NONE, SINGLE: T.SIGHASH_SINGLE,
  'ALL|ANYONECANPAY': T.SIGHASH_ALL | T.SIGHASH_ANYONECANPAY, 'NONE|ANYONECANPAY': T.SIGHASH_NONE | T.SIGHASH_ANYONECANPAY }
const table = {}
for (const [tn, ht] of Object.entries(types)) {
  const h = baseTx().hashForWitnessV0(0, scriptCode, VALUE, ht)
  const sig = secp256k1.sign(h, priv, { prehash: false, lowS: true }) // compact 64 bytes in noble v2
  table[tn] = {}
  for (const [vn, mutate] of Object.entries(variants)) {
    const tx = baseTx(); mutate(tx)
    const h2 = tx.hashForWitnessV0(0, scriptCode, VALUE, ht)
    table[tn][vn] = secp256k1.verify(sig, h2, pub, { prehash: false }) ? 'STILL VALID (reusable!)' : 'invalid'
  }
}
console.table(table)
