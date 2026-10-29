/**
 * Attach MPC signatures to a BTC tx, verify strictly (low-S, prehash false), finalize and extract (kb/30 §5).
 * bitcoinjs-lib 7 Psbt does DER + sighash and the P2WPKH witness; noble does the strict verify.
 */
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hexToBytesStrict, reverseBytes, toHex } from '../../bytes'
import { toSecpCompact64, type MpcSignature } from '../../near/mpc'
import { hash160 } from '../../derive'
import { bip143Preimage, computeTxid, SIGHASH_ALL, type BtcUnsignedTx } from './tx'
import { sha256d } from '../../policy/btc'

/** Strict verifier for bitcoinjs: rejects high-S (bitcoinjs itself does not, kb/30 §7). */
export const strictVerify = (pubkey: Uint8Array, msghash: Uint8Array, signature: Uint8Array): boolean => {
  try {
    return secp256k1.verify(signature, msghash, pubkey, { prehash: false, lowS: true })
  } catch {
    return false
  }
}

/** bitcoinjs Psbt for the model (P2WPKH inputs with witnessUtxo). */
export function toPsbt(tx: BtcUnsignedTx, pubkey: Uint8Array, network: bitcoin.Network = bitcoin.networks.testnet): bitcoin.Psbt {
  const script = Uint8Array.from([0x00, 0x14, ...hash160(pubkey)])
  const psbt = new bitcoin.Psbt({ network })
  psbt.setVersion(tx.version)
  psbt.setLocktime(tx.locktime)
  for (const i of tx.inputs) psbt.addInput({ hash: i.txid, index: i.vout, sequence: i.sequence, witnessUtxo: { script, value: i.value } })
  for (const o of tx.outputs) psbt.addOutput({ script: o.script, value: o.value })
  return psbt
}

/** bitcoinjs' own sighash for input i (the oracle that our preimage must match: sha256d(preimage) == this). */
export function bitcoinjsSighash(tx: BtcUnsignedTx, i: number, pubkey: Uint8Array): Uint8Array {
  const t = bitcoin.Transaction.fromBuffer(toPsbt(tx, pubkey).data.globalMap.unsignedTx.toBuffer())
  const scriptCode = bitcoin.payments.p2pkh({ hash: hash160(pubkey) }).output!
  return t.hashForWitnessV0(i, scriptCode, tx.inputs[i]!.value, bitcoin.Transaction.SIGHASH_ALL)
}

export interface SignedBtcTx {
  hex: string
  txid: string
  wtxid: string
  vsize: number
  weight: number
}

export class BtcSignatureError extends Error {}

/**
 * Attach one MPC signature per input (same order as the inputs / preimages) and return the raw tx.
 * Throws unless every signature verifies strictly against `pubkey` over sha256d(preimage_i), and the final txid
 * equals the txid computed before signing (so the collision check still holds).
 */
export function attachBtcSignatures(tx: BtcUnsignedTx, signatures: (MpcSignature | null)[], pubkeyIn: Uint8Array | string): SignedBtcTx {
  const pubkey = typeof pubkeyIn === 'string' ? hexToBytesStrict(pubkeyIn) : pubkeyIn
  if (signatures.length !== tx.inputs.length) throw new BtcSignatureError(`need ${tx.inputs.length} signatures, got ${signatures.length}`)
  const missing = signatures.flatMap((s, i) => (s ? [] : [i]))
  if (missing.length) throw new BtcSignatureError(`inputs not signed: ${missing.join(', ')} (retry with the same inputs)`)
  const pkh = hash160(pubkey)
  const compact = signatures.map((s, i) => {
    const c = toSecpCompact64(s!) // asserts low-S
    const h = sha256d(bip143Preimage(tx, i, pkh, SIGHASH_ALL))
    if (!strictVerify(pubkey, h, c)) throw new BtcSignatureError(`signature ${i} does not verify for this input`)
    return c
  })
  const psbt = toPsbt(tx, pubkey)
  for (let i = 0; i < tx.inputs.length; i++) {
    const sig = compact[i]!
    psbt.signInput(i, { publicKey: pubkey, sign: () => sig })
  }
  if (!psbt.validateSignaturesOfAllInputs(strictVerify)) throw new BtcSignatureError('psbt signature validation failed')
  psbt.finalizeAllInputs()
  const t = psbt.extractTransaction()
  const txid = t.getId()
  if (txid !== computeTxid(tx)) throw new BtcSignatureError('txid changed while signing')
  return { hex: t.toHex(), txid, wtxid: toHex(reverseBytes(t.getHash(true))), vsize: t.virtualSize(), weight: t.weight() }
}

/** Parse a raw tx hex back into its txid (for "Broadcast again" bookkeeping). */
export function rawTxid(hex: string): string {
  return bitcoin.Transaction.fromHex(hex).getId()
}

