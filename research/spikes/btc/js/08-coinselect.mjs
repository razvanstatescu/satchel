// THROWAWAY spike 08: coinselect (as used by chainsig.js) vs exact P2WPKH vbyte math; dust behaviour.
import coinselect from 'coinselect'
import * as bitcoin from 'bitcoinjs-lib'
import { NET, unhex, estimateVsizeP2WPKH, DUST_P2WPKH } from './lib.mjs'

const self = bitcoin.payments.p2wpkh({ pubkey: unhex('021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d'), network: NET })
const TO = 'tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q'

// Real vsize of a P2WPKH tx with worst-case 72-byte DER sigs (what the network will measure)
function realVsize(nIn, nOut) {
  const psbt = new bitcoin.Psbt({ network: NET })
  for (let i = 0; i < nIn; i++) psbt.addInput({ hash: '11'.repeat(32), index: i, witnessUtxo: { script: self.output, value: 100000n } })
  for (let i = 0; i < nOut; i++) psbt.addOutput({ address: TO, value: 1000n })
  const tx = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
  tx.ins.forEach((inp) => { inp.witness = [new Uint8Array(72), new Uint8Array(33)] })
  return tx.virtualSize()
}

// Exact-ish selector: largest-first (fewest inputs = fewest MPC signatures), exact P2WPKH vbytes, dust-aware change.
function selectP2WPKH(utxos, amount, feeRate) {
  const sorted = [...utxos].sort((a, b) => Number(b.value - a.value))
  const chosen = []; let sum = 0n
  for (const u of sorted) {
    chosen.push(u); sum += u.value
    const feeWithChange = BigInt(Math.ceil(estimateVsizeP2WPKH(chosen.length, [22, 22]) * feeRate))
    const feeNoChange = BigInt(Math.ceil(estimateVsizeP2WPKH(chosen.length, [22]) * feeRate))
    if (sum >= amount + feeWithChange && sum - amount - feeWithChange >= DUST_P2WPKH)
      return { inputs: chosen, fee: feeWithChange, change: sum - amount - feeWithChange }
    if (sum >= amount + feeNoChange) return { inputs: chosen, fee: sum - amount, change: 0n } // leftover < dust goes to fee
  }
  throw new Error('insufficient funds')
}

const scenarios = [
  { name: 'A: 2 utxos, 40k send, 2 sat/vB', utxos: [30000, 25000], amount: 40000, feeRate: 2 },
  { name: 'B: 1 utxo, change would be ~200 sats, 1 sat/vB', utxos: [10000], amount: 9660, feeRate: 1 },
  { name: 'C: 3 utxos, 12k send, 2 sat/vB', utxos: [5000, 9000, 20000], amount: 12000, feeRate: 2 },
]
for (const s of scenarios) {
  const cs = coinselect(s.utxos.map((v, i) => ({ txId: '11'.repeat(32), vout: i, value: v })), [{ address: TO, value: s.amount }], s.feeRate)
  const csTrick = coinselect(
    s.utxos.map((v, i) => ({ txId: '11'.repeat(32), vout: i, value: v, script: new Uint8Array(27) })), // 41+27 = 68 vB per P2WPKH input
    [{ address: TO, value: s.amount, script: new Uint8Array(22) }], s.feeRate) // 9+22 = 31 vB per P2WPKH output
  const ours = selectP2WPKH(s.utxos.map((v, i) => ({ vout: i, value: BigInt(v) })), BigInt(s.amount), s.feeRate)
  const desc = (r) => r.inputs ? { nIn: r.inputs.length, nOut: r.outputs.length, fee: r.fee,
    change: r.outputs.find((o) => !o.address)?.value ?? 0, realVsize: realVsize(r.inputs.length, r.outputs.length),
    effFeeRate: +(r.fee / realVsize(r.inputs.length, r.outputs.length)).toFixed(2),
    changeIsDust: (r.outputs.find((o) => !o.address)?.value ?? 1e9) < 294 } : { failed: true }
  console.log(s.name)
  console.log('  coinselect default (P2PKH sizes):', JSON.stringify(desc(cs)))
  console.log('  coinselect + P2WPKH length hints:', JSON.stringify(desc(csTrick)))
  const nOut = ours.change > 0n ? 2 : 1
  console.log('  largest-first exact (spike):     ', JSON.stringify({ nIn: ours.inputs.length, nOut, fee: Number(ours.fee), change: Number(ours.change),
    realVsize: realVsize(ours.inputs.length, nOut), effFeeRate: +(Number(ours.fee) / realVsize(ours.inputs.length, nOut)).toFixed(2) }))
}
console.log('estimateVsizeP2WPKH vs real:', [[1, 1], [1, 2], [2, 2], [4, 2], [10, 2]].map(([i, o]) => `${i}in/${o}out ${estimateVsizeP2WPKH(i, Array(o).fill(22))} vs ${realVsize(i, o)}`).join('; '))
