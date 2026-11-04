/**
 * BTC send builder with the txid collision check and random output order (kb/90 §8.2 rule, §8.7; R-05 in
 * plan/decisions.md; INV-32 in kb/90 §6).
 *
 * Why: segwit txids exclude witnesses, so a deterministic builder lets a previous owner pre-sign a spend of a
 * predicted change outpoint. Satchel therefore never builds a tx whose txid is already referenced by a record of the
 * sending Satchel (or of the receiving Satchel when paying one), and shuffles output order by default.
 */
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoinerlab/secp256k1'
import { hexToBytesStrict, toHex } from '../../bytes'
import { btcSignRequest, type SignRequest } from '../../near/sign-request'
import { hash160 } from '../../derive'
import { sha256d } from '../../policy/btc'
import { selectExact, selectLargestFirst, selectSweep, outputType, type OutputType, type Selection, type Utxo, DUST } from './select'
import { bip143Preimages, computeTxid, serializeOutputs, SEQUENCE_RBF, SEQUENCE_RBF_ALT, type BtcTxOutput, type BtcUnsignedTx } from './tx'

let eccReady = false
/** bitcoinjs-lib 7 needs an ECC lib to encode/decode taproot (`tb1p`) addresses (kb/30 §TL;DR 11). Idempotent. */
export function ensureEcc(): void {
  if (!eccReady) {
    bitcoin.initEccLib(ecc)
    eccReady = true
  }
}

export type BtcNetwork = 'testnet' | 'mainnet'
export const bitcoinNetwork = (n: BtcNetwork) => (n === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet)

/** Address → output script (throws on an invalid or wrong-network address). */
export function addressToScript(address: string, network: BtcNetwork = 'testnet'): Uint8Array {
  ensureEcc()
  return Uint8Array.from(bitcoin.address.toOutputScript(address.trim(), bitcoinNetwork(network)))
}

export function recipientType(address: string, network: BtcNetwork = 'testnet'): OutputType {
  const t = outputType(addressToScript(address, network))
  if (!t) throw new Error('unsupported recipient script type')
  return t
}

/** Cryptographic RNG returning [0, 1). Injectable for seeded tests. */
export type Rng = () => number
export const cryptoRng: Rng = () => {
  const b = new Uint32Array(1)
  globalThis.crypto.getRandomValues(b)
  return b[0]! / 2 ** 32
}

/** Seeded RNG (mulberry32) for deterministic tests and vectors. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export interface BtcSendParams {
  /** the Satchel's P2WPKH address and compressed pubkey (lib/derive) */
  from: { address: string; pubkey: Uint8Array | string }
  to: string
  amount: bigint | 'max'
  utxos: Utxo[]
  feeRate: number
  /**
   * Txids referenced by records (`detail.btc.txid`) of the sending Satchel and, when `to` is a Satchel address
   * (lib/derive index), of the receiving Satchel. The builder never returns a tx with one of these ids.
   */
  forbiddenTxids?: Iterable<string>
  network?: BtcNetwork
  rng?: Rng
  /** keep [recipient, change] order (only for reproducing recorded vectors; never in the app) */
  fixedOrder?: boolean
  /** reuse this exact input set (retry rule, spec §8.7) instead of selecting */
  inputs?: Utxo[]
  allowUnconfirmed?: boolean
  exclude?: ReadonlySet<string>
}

export interface BuiltBtcSend {
  tx: BtcUnsignedTx
  txid: string
  preimages: Uint8Array[]
  /** serialized outputs (the `outputs` field of SignRequest::Btc) */
  outputs: Uint8Array
  signRequest: SignRequest
  /** sha256d(preimage_i): what the contract records and the MPC signs */
  payloads: Uint8Array[]
  pkh: Uint8Array
  pubkey: Uint8Array
  fee: bigint
  amount: bigint
  change: bigint
  vsize: number
  recipientIndex: number
  changeIndex: number | null
  /** perturbations applied to dodge a logged txid (0 = none) */
  perturbations: string[]
  /** "txid:vout" of every input, for the pending-intent store */
  inputOutpoints: string[]
}

export class UnsafeBtcTxError extends Error {
  constructor() {
    super("Can't build a safe transaction. Try a different amount.")
  }
}

function assemble(
  sel: Selection,
  p: BtcSendParams,
  net: BtcNetwork,
  sequence: number,
  feeBump: bigint,
  order: 'given' | number[],
): { tx: BtcUnsignedTx; recipientIndex: number; changeIndex: number | null; fee: bigint; amount: bigint; change: bigint } {
  const fromScript = addressToScript(p.from.address, net)
  let amount = sel.amount
  let change = sel.change
  if (feeBump > 0n) {
    if (change > 0n) change -= feeBump
    else if (p.amount === 'max') amount -= feeBump
    else throw new UnsafeBtcTxError()
  }
  const outs: (BtcTxOutput & { role: 'recipient' | 'change' })[] = [{ role: 'recipient', script: addressToScript(p.to, net), value: amount, address: p.to }]
  if (change > 0n) outs.push({ role: 'change', script: fromScript, value: change, address: p.from.address })
  const ordered = order === 'given' ? outs : order.map((i) => outs[i]!).filter(Boolean)
  const tx: BtcUnsignedTx = {
    version: 2,
    locktime: 0,
    inputs: sel.inputs.map((u) => ({ txid: u.txid.toLowerCase(), vout: u.vout, value: u.value, sequence })),
    outputs: ordered.map(({ script, value, address }) => ({ script, value, ...(address ? { address } : {}) })),
  }
  const recipientIndex = ordered.findIndex((o) => o.role === 'recipient')
  const ci = ordered.findIndex((o) => o.role === 'change')
  return { tx, recipientIndex, changeIndex: ci < 0 ? null : ci, fee: sel.fee + feeBump, amount, change }
}

/**
 * Select inputs, build outputs in random order, and refuse any candidate whose txid a record already references.
 * Perturbation order (spec §8.2): fee +1 sat up to 3 times (taken from change, or from the amount for "max"),
 * then nSequence fffffffd ↔ fffffffe. Both stay inside the contract policy (§5.9).
 */
export function buildBtcSend(p: BtcSendParams): BuiltBtcSend {
  const net = p.network ?? 'testnet'
  const pubkey = typeof p.from.pubkey === 'string' ? hexToBytesStrict(p.from.pubkey) : p.from.pubkey
  const pkh = hash160(pubkey)
  const fromScript = addressToScript(p.from.address, net)
  if (toHex(fromScript) !== `0014${toHex(pkh)}`) throw new Error('from.address is not the P2WPKH address of from.pubkey')
  const rType = recipientType(p.to, net)
  const selOpts = {
    feeRate: p.feeRate,
    recipientType: rType,
    ...(p.allowUnconfirmed !== undefined ? { allowUnconfirmed: p.allowUnconfirmed } : {}),
    ...(p.exclude ? { exclude: p.exclude } : {}),
  }
  const sel: Selection = p.inputs
    ? selectExact(p.inputs, p.amount, selOpts)
    : p.amount === 'max'
      ? selectSweep(p.utxos, selOpts)
      : selectLargestFirst(p.utxos, p.amount, selOpts)

  const forbidden = new Set([...(p.forbiddenTxids ?? [])].map((t) => t.toLowerCase()))
  const rng = p.rng ?? cryptoRng
  const nOut = sel.change > 0n ? 2 : 1
  const order: 'given' | number[] = p.fixedOrder ? 'given' : shuffle([...Array(nOut).keys()], rng)

  const attempts: { seq: number; bump: bigint; label: string }[] = [
    { seq: SEQUENCE_RBF, bump: 0n, label: '' },
    { seq: SEQUENCE_RBF, bump: 1n, label: 'fee+1' },
    { seq: SEQUENCE_RBF, bump: 2n, label: 'fee+2' },
    { seq: SEQUENCE_RBF, bump: 3n, label: 'fee+3' },
    { seq: SEQUENCE_RBF_ALT, bump: 0n, label: 'nsequence-fffffffe' },
  ]
  const tried: string[] = []
  for (const a of attempts) {
    let built
    try {
      built = assemble(sel, p, net, a.seq, a.bump, order)
    } catch (e) {
      if (e instanceof UnsafeBtcTxError) continue // fee bump impossible without change: skip to the nSequence flip
      throw e
    }
    if (built.change > 0n && built.change < DUST.p2wpkh) continue
    const txid = computeTxid(built.tx)
    if (a.label) tried.push(a.label)
    if (forbidden.has(txid)) continue
    const preimages = bip143Preimages(built.tx, pkh)
    const outputs = serializeOutputs(built.tx.outputs)
    const signRequest = btcSignRequest(preimages, outputs)
    return {
      tx: built.tx,
      txid,
      preimages,
      outputs,
      signRequest,
      payloads: preimages.map(sha256d),
      pkh,
      pubkey,
      fee: built.fee,
      amount: built.amount,
      change: built.change,
      vsize: sel.vsize,
      recipientIndex: built.recipientIndex,
      changeIndex: built.changeIndex,
      perturbations: tried,
      inputOutpoints: built.tx.inputs.map((i) => `${i.txid}:${i.vout}`),
    }
  }
  throw new UnsafeBtcTxError()
}

/** Collect the txids referenced by BTC records (the view's `detail.btc.txid`), for `forbiddenTxids`. */
export function referencedTxids(records: Iterable<{ detail: unknown }>): Set<string> {
  const s = new Set<string>()
  for (const r of records) {
    const d = r.detail as { btc?: { txid?: string } } | undefined
    if (d?.btc?.txid) s.add(d.btc.txid.toLowerCase())
  }
  return s
}
