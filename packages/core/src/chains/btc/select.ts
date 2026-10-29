/** Coin selection, vsize, fee and dust (kb/30 §6; spec §8.9). Largest-first: fewer inputs = fewer MPC signatures. */
import { MAX_BTC_INPUTS } from '../../policy/btc'

export type OutputType = 'p2wpkh' | 'p2tr' | 'p2wsh' | 'p2sh' | 'p2pkh'

/** Serialized output size in bytes (8 value + 1 len + script). */
export const OUTPUT_BYTES: Record<OutputType, number> = { p2wpkh: 31, p2tr: 43, p2wsh: 43, p2sh: 32, p2pkh: 34 }

/** Bitcoin Core dust thresholds at 3 sat/vB (kb/30 §TL;DR 10; spec §8.9). */
export const DUST: Record<OutputType, bigint> = { p2wpkh: 294n, p2tr: 330n, p2wsh: 330n, p2sh: 540n, p2pkh: 546n }

export function outputType(script: Uint8Array): OutputType | null {
  const s = script
  if (s.length === 22 && s[0] === 0x00 && s[1] === 0x14) return 'p2wpkh'
  if (s.length === 34 && s[0] === 0x00 && s[1] === 0x20) return 'p2wsh'
  if (s.length === 34 && s[0] === 0x51 && s[1] === 0x20) return 'p2tr'
  if (s.length === 23 && s[0] === 0xa9 && s[1] === 0x14 && s[22] === 0x87) return 'p2sh'
  if (s.length === 25 && s[0] === 0x76 && s[1] === 0xa9 && s[2] === 0x14 && s[23] === 0x88 && s[24] === 0xac) return 'p2pkh'
  return null
}

/**
 * vsize of a P2WPKH-input tx: ceil((4·(10 + 41·in + Σout) + 2 + 108·in) / 4).
 * Matches bitcoinjs virtualSize() with 72-byte signatures: 1/1 = 110, 1/2 = 141, 2/2 = 209, 4/2 = 345, 10/2 = 753.
 */
export function estimateVsize(nInputs: number, outputs: OutputType[]): number {
  const outBytes = outputs.reduce((a, t) => a + OUTPUT_BYTES[t], 0)
  return Math.ceil((4 * (10 + 41 * nInputs + outBytes) + 2 + 108 * nInputs) / 4)
}

export interface Utxo {
  txid: string
  vout: number
  value: bigint
  confirmed: boolean
}

export interface Selection {
  inputs: Utxo[]
  /** amount paid to the recipient */
  amount: bigint
  /** 0n when the change was folded into the fee */
  change: bigint
  fee: bigint
  vsize: number
}

export class SelectionError extends Error {
  constructor(public readonly code: 'below_dust' | 'insufficient' | 'too_many_inputs' | 'no_utxos', msg: string) {
    super(msg)
  }
}

const byValueDesc = (a: Utxo, b: Utxo) =>
  a.value === b.value ? (a.txid === b.txid ? a.vout - b.vout : a.txid < b.txid ? -1 : 1) : a.value > b.value ? -1 : 1

export interface SelectOptions {
  feeRate: number
  recipientType: OutputType
  /** spend unconfirmed UTXOs too (default false) */
  allowUnconfirmed?: boolean
  /** outpoints to skip ("txid:vout"), e.g. inputs already spent in the mempool */
  exclude?: ReadonlySet<string>
  maxInputs?: number
}

function usable(utxos: Utxo[], o: SelectOptions): Utxo[] {
  return utxos.filter((u) => (o.allowUnconfirmed || u.confirmed) && !o.exclude?.has(`${u.txid}:${u.vout}`)).sort(byValueDesc)
}

const feeFor = (vsize: number, rate: number) => BigInt(Math.ceil(vsize * rate))

/** Pay exactly `amount`; change (P2WPKH, back to the Satchel) only if ≥ 294 sats, otherwise it goes to the fee. */
export function selectLargestFirst(utxos: Utxo[], amount: bigint, o: SelectOptions): Selection {
  if (amount < DUST[o.recipientType]) throw new SelectionError('below_dust', `minimum is ${DUST[o.recipientType]} sats for this recipient`)
  const pool = usable(utxos, o)
  if (pool.length === 0) throw new SelectionError('no_utxos', 'no spendable coins')
  const max = Math.min(o.maxInputs ?? MAX_BTC_INPUTS, MAX_BTC_INPUTS)
  let sum = 0n
  for (let k = 1; k <= Math.min(pool.length, max); k++) {
    sum += pool[k - 1]!.value
    const vWith = estimateVsize(k, [o.recipientType, 'p2wpkh'])
    const feeWith = feeFor(vWith, o.feeRate)
    if (sum >= amount + feeWith + DUST.p2wpkh) {
      return { inputs: pool.slice(0, k), amount, change: sum - amount - feeWith, fee: feeWith, vsize: vWith }
    }
    const vNo = estimateVsize(k, [o.recipientType])
    const feeNo = feeFor(vNo, o.feeRate)
    if (sum >= amount + feeNo) return { inputs: pool.slice(0, k), amount, change: 0n, fee: sum - amount, vsize: vNo }
  }
  if (pool.length > max) {
    const top = pool.slice(0, max).reduce((a, u) => a + u.value, 0n)
    if (top < pool.reduce((a, u) => a + u.value, 0n)) throw new SelectionError('too_many_inputs', `needs more than ${max} inputs; consolidate first`)
  }
  throw new SelectionError('insufficient', 'insufficient funds')
}

/** "Max": sweep up to 10 largest UTXOs, no change; amount = Σ − fee. */
export function selectSweep(utxos: Utxo[], o: SelectOptions): Selection {
  const pool = usable(utxos, o).slice(0, Math.min(o.maxInputs ?? MAX_BTC_INPUTS, MAX_BTC_INPUTS))
  if (pool.length === 0) throw new SelectionError('no_utxos', 'no spendable coins')
  const sum = pool.reduce((a, u) => a + u.value, 0n)
  const vsize = estimateVsize(pool.length, [o.recipientType])
  const fee = feeFor(vsize, o.feeRate)
  const amount = sum - fee
  if (amount < DUST[o.recipientType]) throw new SelectionError('below_dust', 'balance too small to send after the fee')
  return { inputs: pool, amount, change: 0n, fee, vsize }
}

/**
 * Spend exactly these inputs (the retry rule, spec §8.7: same input set ⇒ at most one of the txs can ever confirm).
 * The outputs and fee may change; change below dust goes to the fee.
 */
export function selectExact(inputs: Utxo[], amount: bigint | 'max', o: SelectOptions): Selection {
  if (inputs.length === 0 || inputs.length > MAX_BTC_INPUTS) throw new SelectionError('too_many_inputs', `1..${MAX_BTC_INPUTS} inputs`)
  const sum = inputs.reduce((a, u) => a + u.value, 0n)
  if (amount === 'max') {
    const vsize = estimateVsize(inputs.length, [o.recipientType])
    const fee = feeFor(vsize, o.feeRate)
    if (sum - fee < DUST[o.recipientType]) throw new SelectionError('below_dust', 'balance too small to send after the fee')
    return { inputs: inputs.slice(), amount: sum - fee, change: 0n, fee, vsize }
  }
  if (amount < DUST[o.recipientType]) throw new SelectionError('below_dust', `minimum is ${DUST[o.recipientType]} sats for this recipient`)
  const vWith = estimateVsize(inputs.length, [o.recipientType, 'p2wpkh'])
  const feeWith = feeFor(vWith, o.feeRate)
  if (sum >= amount + feeWith + DUST.p2wpkh) return { inputs: inputs.slice(), amount, change: sum - amount - feeWith, fee: feeWith, vsize: vWith }
  const vNo = estimateVsize(inputs.length, [o.recipientType])
  if (sum >= amount + feeFor(vNo, o.feeRate)) return { inputs: inputs.slice(), amount, change: 0n, fee: sum - amount, vsize: vNo }
  throw new SelectionError('insufficient', 'insufficient funds for this input set')
}
