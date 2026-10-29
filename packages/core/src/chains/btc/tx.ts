/**
 * Plain transaction model + BIP143 P2WPKH preimages + the outputs serializer the contract checks (spec §5.3, §5.9;
 * kb/30 §3). Pure @noble code: no bitcoinjs, no Buffer, so the Review screen can compute txids cheaply.
 */
import { classifyBtcBytes, encodeVarint, sha256d } from '../../policy/btc'
import { concatBytes, hexToBytesStrict, reverseBytes, toHex, u32le, u64le } from '../../bytes'

export const SIGHASH_ALL = 1
export const SEQUENCE_RBF = 0xfffffffd
export const SEQUENCE_RBF_ALT = 0xfffffffe

export interface BtcTxInput {
  /** display-order txid (as explorers show it) */
  txid: string
  vout: number
  /** prevout value in sats */
  value: bigint
  sequence: number
}

export interface BtcTxOutput {
  script: Uint8Array
  value: bigint
  /** optional, for display */
  address?: string
}

export interface BtcUnsignedTx {
  version: number
  locktime: number
  inputs: BtcTxInput[]
  outputs: BtcTxOutput[]
}

const outpointBytes = (i: BtcTxInput): Uint8Array => concatBytes(reverseBytes(hexToBytesStrict(i.txid)), u32le(i.vout))

/** Σ(value u64 LE ‖ varint(len) ‖ script): `SignRequest::Btc.outputs`, exactly the bytes behind hashOutputs. */
export function serializeOutputs(outputs: BtcTxOutput[]): Uint8Array {
  return concatBytes(...outputs.map((o) => concatBytes(u64le(o.value), encodeVarint(o.script.length), o.script)))
}

/** P2WPKH scriptCode for BIP143: 0x19 76 a9 14 <pkh> 88 ac (26 bytes). */
export function p2wpkhScriptCode(pkh: Uint8Array): Uint8Array {
  if (pkh.length !== 20) throw new Error('pkh must be 20 bytes')
  return concatBytes(Uint8Array.of(0x19, 0x76, 0xa9, 0x14), pkh, Uint8Array.of(0x88, 0xac))
}

export function hashPrevouts(tx: BtcUnsignedTx): Uint8Array {
  return sha256d(concatBytes(...tx.inputs.map(outpointBytes)))
}

export function hashSequence(tx: BtcUnsignedTx): Uint8Array {
  return sha256d(concatBytes(...tx.inputs.map((i) => u32le(i.sequence))))
}

export function hashOutputs(tx: BtcUnsignedTx): Uint8Array {
  return sha256d(serializeOutputs(tx.outputs))
}

/** BIP143 preimage of input i (P2WPKH, SIGHASH_ALL): always 182 bytes. sha256d(preimage) == hashForWitnessV0. */
export function bip143Preimage(tx: BtcUnsignedTx, i: number, pkh: Uint8Array, sighashType = SIGHASH_ALL): Uint8Array {
  const inp = tx.inputs[i]
  if (!inp) throw new RangeError(`no input ${i}`)
  return concatBytes(
    u32le(tx.version),
    hashPrevouts(tx),
    hashSequence(tx),
    outpointBytes(inp),
    p2wpkhScriptCode(pkh),
    u64le(inp.value),
    u32le(inp.sequence),
    hashOutputs(tx),
    u32le(tx.locktime),
    u32le(sighashType),
  )
}

export function bip143Preimages(tx: BtcUnsignedTx, pkh: Uint8Array): Uint8Array[] {
  return tx.inputs.map((_, i) => bip143Preimage(tx, i, pkh))
}

/** Legacy (non-witness) serialization: the bytes whose sha256d is the txid. */
export function serializeTxNoWitness(tx: BtcUnsignedTx): Uint8Array {
  return concatBytes(
    u32le(tx.version),
    encodeVarint(tx.inputs.length),
    ...tx.inputs.map((i) => concatBytes(outpointBytes(i), Uint8Array.of(0), u32le(i.sequence))),
    encodeVarint(tx.outputs.length),
    serializeOutputs(tx.outputs),
    u32le(tx.locktime),
  )
}

/** txid in display order. Segwit txids exclude witnesses, so this is final before any signature exists (R-05). */
export function computeTxid(tx: BtcUnsignedTx): string {
  return toHex(reverseBytes(sha256d(serializeTxNoWitness(tx))))
}

/**
 * Rebuild the unsigned tx from logged preimages + outputs (the `sign_requested` event), e.g. for "Broadcast now"
 * from another device (spec §7.1, §7.6). Validates them with the same rules as the contract.
 */
export function btcTxFromPreimages(preimagesHex: string[], outputsHex: string): { tx: BtcUnsignedTx; pkh: Uint8Array; txid: string } {
  const f = classifyBtcBytes(preimagesHex.map(hexToBytesStrict), hexToBytesStrict(outputsHex))
  const tx: BtcUnsignedTx = {
    version: 2,
    locktime: 0,
    inputs: f.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: i.amountSats, sequence: i.sequence })),
    outputs: f.outputs.map((o) => ({ script: o.script, value: o.value })),
  }
  return { tx, pkh: f.pkh, txid: f.txid }
}
