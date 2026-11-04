/**
 * BTC vectors (kb/90 §12.2): accepted 1-, 2-, 4- and 10-input P2WPKH sets (incl. a tb1p recipient) and every refusal
 * class of §5.9. Preimages come from @satchel/core and are cross-checked against bitcoinjs-lib 7 `hashForWitnessV0`
 * and its txid for every accepted vector.
 */
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoinerlab/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, hexToBytesStrict, reverseBytes, toHex, u32le, u64le, utf8 } from '@satchel/core/bytes'
import { deriveSatchelAddresses, hash160 } from '@satchel/core/derive'
import { btcSignRequest } from '@satchel/core/near'
import { bip143Preimage, bip143Preimages, computeTxid, serializeOutputs, type BtcUnsignedTx } from '@satchel/core/chains/btc'
import { encodeVarint } from '@satchel/core/policy'
import { assert, vec, type Vector } from './lib'
import fanout from '../../packages/core/test/fixtures/kb30-btc-fanout.json' with { type: 'json' }

bitcoin.initEccLib(ecc)
const NET = bitcoin.networks.testnet
const sha256d = (x: Uint8Array) => sha256(sha256(x))

const sender = deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1')
const PUB = hexToBytesStrict(sender.btcPubkey)
const PKH = hash160(PUB)
const SELF = bitcoin.address.toOutputScript(sender.btc, NET)
const RECIP = bitcoin.address.toOutputScript(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '2').btc, NET)
const TAPROOT = bitcoin.payments.p2tr({
  internalPubkey: hexToBytesStrict(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '3').btcPubkey).slice(1),
  network: NET,
})
assert(TAPROOT.address!.startsWith('tb1p'), 'taproot recipient')

/** deterministic fabricated outpoint txids (display order) */
const fakeTxid = (i: number) => toHex(reverseBytes(sha256d(utf8(`satchel-vector-input:${i}`))))

function makeTx(o: { n?: number; version?: number; locktime?: number; seq?: number | number[]; outs?: { script: Uint8Array; value: bigint }[]; inputs?: BtcUnsignedTx['inputs'] } = {}): BtcUnsignedTx {
  const n = o.n ?? 2
  const inputs =
    o.inputs ??
    Array.from({ length: n }, (_, i) => ({
      txid: fakeTxid(i),
      vout: i % 3,
      value: BigInt(30_000 + 1_000 * i),
      sequence: Array.isArray(o.seq) ? o.seq[i]! : (o.seq ?? 0xfffffffd),
    }))
  return {
    version: o.version ?? 2,
    locktime: o.locktime ?? 0,
    inputs,
    outputs: o.outs ?? [
      { script: RECIP, value: 40_000n },
      { script: SELF, value: BigInt(inputs.reduce((a, i) => a + Number(i.value), 0) - 40_000 - 500) },
    ],
  }
}

/** bitcoinjs oracle: sha256d(our preimage) == hashForWitnessV0, and our txid == bitcoinjs txid. */
function oracle(tx: BtcUnsignedTx, pub = PUB): void {
  const t = new bitcoin.Transaction()
  t.version = tx.version
  t.locktime = tx.locktime
  for (const i of tx.inputs) t.addInput(reverseBytes(hexToBytesStrict(i.txid)), i.vout, i.sequence)
  for (const o of tx.outputs) t.addOutput(o.script, o.value)
  assert(t.getId() === computeTxid(tx), 'txid matches bitcoinjs')
  const sc = bitcoin.payments.p2pkh({ hash: hash160(pub) }).output!
  tx.inputs.forEach((inp, i) => {
    const h = t.hashForWitnessV0(i, sc, inp.value, bitcoin.Transaction.SIGHASH_ALL)
    assert(toHex(sha256d(bip143Preimage(tx, i, hash160(pub)))) === toHex(h), `preimage ${i} == hashForWitnessV0`)
  })
}

const req = (pre: Uint8Array[], outputs: Uint8Array) => btcSignRequest(pre, outputs)
const set = (p: Uint8Array, off: number, bytes: Uint8Array) => {
  const c = Uint8Array.from(p)
  c.set(bytes, off)
  return c
}

export function btcVectors(): Vector[] {
  const v: Vector[] = []
  const add = (name: string, r: ReturnType<typeof req>, want: Parameters<typeof vec>[3], note?: string) => v.push(vec(name, 'btc', r, want, note))
  const accepted = (name: string, tx: BtcUnsignedTx, note?: string, pub = PUB) => {
    oracle(tx, pub)
    add(name, req(bip143Preimages(tx, hash160(pub)), serializeOutputs(tx.outputs)), 'ok', note)
  }

  // ── accepted ───────────────────────────────────────────────────────────────────────────────
  accepted('btc_1in_2out', makeTx({ n: 1, outs: [{ script: RECIP, value: 20_000n }, { script: SELF, value: 9_718n }] }), '1 input, recipient + change, fee 282')
  accepted('btc_2in_2out', makeTx(), '2 inputs')
  accepted('btc_4in_2out', makeTx({ n: 4 }), '4 inputs')
  accepted('btc_10in_1out', makeTx({ n: 10, outs: [{ script: RECIP, value: 300_000n }] }), 'MAX_BTC_INPUTS = 10, sweep without change')
  accepted('btc_2in_taproot_recipient', makeTx({ outs: [{ script: TAPROOT.output!, value: 40_000n }, { script: SELF, value: 20_500n }] }), `tb1p recipient ${TAPROOT.address}`)
  accepted('btc_sequence_fffffffe_ffffffff', makeTx({ seq: [0xfffffffe, 0xffffffff] }), 'nSequence ≥ 0xfffffffd is allowed (the builder flips fffffffd↔fffffffe)')
  accepted('btc_16_outputs', makeTx({ n: 1, outs: Array.from({ length: 16 }, () => ({ script: RECIP, value: 1_000n })) }), 'maximum 16 outputs')

  // the recorded contract fan-out runs (real MPC signed these preimages, research/spikes/btc §8)
  for (const run of fanout.runs) {
    const psbt = bitcoin.Psbt.fromBase64(run.psbt_base64)
    const t = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
    const tx: BtcUnsignedTx = {
      version: t.version,
      locktime: t.locktime,
      inputs: run.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: BigInt(i.value), sequence: i.sequence })),
      outputs: t.outs.map((o) => ({ script: Uint8Array.from(o.script), value: BigInt(o.value) })),
    }
    const pub = hexToBytesStrict(run.pubkey)
    assert(JSON.stringify(bip143Preimages(tx, hash160(pub)).map(toHex)) === JSON.stringify(run.preimages), 'recorded preimages reproduce')
    accepted(`btc_kb30_fanout_${run.inputs.length}in`, tx, `recorded fan-out ${run.near_tx}: MPC signed sha256d of these preimages`, pub)
  }
  const base = makeTx()
  const pre = bip143Preimages(base, PKH)
  const outs = serializeOutputs(base.outputs)
  add('btc_0x_uppercase_input', { btc: { preimages: pre.map((p) => `0X${toHex(p).toUpperCase()}`), outputs: `0x${toHex(outs)}` } }, 'ok', 'hex with prefix and uppercase')

  // ── refused ────────────────────────────────────────────────────────────────────────────────
  add('input_count_0', req([], outs), 'ERR_BTC_INPUT_COUNT')
  const t11 = makeTx({ n: 11, outs: [{ script: RECIP, value: 300_000n }] })
  add('input_count_11', req(bip143Preimages(t11, PKH), serializeOutputs(t11.outputs)), 'ERR_BTC_INPUT_COUNT')
  for (const [name, sh] of [
    ['sighash_none', 0x02],
    ['sighash_single', 0x03],
    ['sighash_all_anyonecanpay', 0x81],
    ['sighash_0x41', 0x41],
  ] as const)
    add(name, req([set(pre[0]!, 178, u32le(sh)), pre[1]!], outs), 'ERR_BTC_SIGHASH')
  add('preimage_len_181', req([pre[0]!.slice(0, 181), pre[1]!], outs), 'ERR_BTC_PREIMAGE_LEN')
  add('preimage_len_183', req([concatBytes(pre[0]!, Uint8Array.of(0)), pre[1]!], outs), 'ERR_BTC_PREIMAGE_LEN')
  add('scriptcode_wrong_opcode', req([set(pre[0]!, 128, Uint8Array.of(0x88, 0xad)), pre[1]!], outs), 'ERR_BTC_SCRIPTCODE', '…88 ad (OP_CHECKSIGVERIFY)')
  add('scriptcode_p2sh_like', req([set(pre[0]!, 104, Uint8Array.of(0x19, 0xa9, 0x14)), pre[1]!], outs), 'ERR_BTC_SCRIPTCODE')
  const lt = makeTx({ locktime: 1 })
  add('locktime_nonzero', req(bip143Preimages(lt, PKH), serializeOutputs(lt.outputs)), 'ERR_BTC_LOCKTIME')
  const sq = makeTx({ seq: 0xfffffffc })
  add('sequence_below_fffffffd', req(bip143Preimages(sq, PKH), serializeOutputs(sq.outputs)), 'ERR_BTC_SEQUENCE', 'relative timelock / non-final')
  const v1 = makeTx({ version: 1 })
  add('version_1', req(bip143Preimages(v1, PKH), serializeOutputs(v1.outputs)), 'ERR_BTC_VERSION')
  const other = makeTx({ inputs: [{ txid: fakeTxid(50), vout: 0, value: 30_000n, sequence: 0xfffffffd }, { txid: fakeTxid(51), vout: 1, value: 31_000n, sequence: 0xfffffffd }] })
  add('mixed_tx', req([pre[0]!, bip143Preimages(other, PKH)[1]!], outs), 'ERR_BTC_MIXED_TX', 'preimages of two different transactions')
  add('mixed_pkh', req([pre[0]!, set(pre[1]!, 108, hash160(utf8('other key')))], outs), 'ERR_BTC_MIXED_TX', 'scriptCode pkh differs between inputs')
  add('prevouts_incomplete', req([pre[0]!], outs), 'ERR_BTC_PREVOUTS_INCOMPLETE', '1 of 2 preimages')
  add('prevouts_wrong_order', req([pre[1]!, pre[0]!], outs), 'ERR_BTC_PREVOUTS_INCOMPLETE', 'inputs out of order')
  add('sequences_mismatch', req([pre[0]!, set(pre[1]!, 138, u32le(0xffffffff))], outs), 'ERR_BTC_SEQUENCES_MISMATCH', "nSequence differs from hashSequence's")
  const otherOuts = serializeOutputs([{ script: RECIP, value: 40_001n }, { script: SELF, value: 20_499n }])
  add('outputs_mismatch', req(pre, otherOuts), 'ERR_BTC_OUTPUTS_MISMATCH', 'outputs of another tx')
  // malformed outputs whose hash IS committed by the preimages, so only the format rule fails
  const withHashOutputs = (bytes: Uint8Array) => {
    const h = sha256d(bytes)
    return req(pre.map((p) => set(p, 142, h)), bytes)
  }
  add('outputs_trailing_byte', withHashOutputs(concatBytes(outs, Uint8Array.of(0))), 'ERR_BTC_OUTPUTS_MALFORMED')
  add('outputs_empty', withHashOutputs(new Uint8Array(0)), 'ERR_BTC_OUTPUTS_MALFORMED', 'zero outputs')
  add('outputs_17', withHashOutputs(serializeOutputs(Array.from({ length: 17 }, () => ({ script: RECIP, value: 1_000n })))), 'ERR_BTC_OUTPUTS_MALFORMED', 'more than 16 outputs')
  add('outputs_script_521', withHashOutputs(serializeOutputs([{ script: new Uint8Array(521).fill(0x51), value: 1_000n }])), 'ERR_BTC_OUTPUTS_MALFORMED', 'script > 520 bytes')
  add(
    'outputs_over_1024_bytes',
    withHashOutputs(serializeOutputs([{ script: new Uint8Array(510).fill(0x51), value: 1n }, { script: new Uint8Array(510).fill(0x51), value: 1n }])),
    'ERR_BTC_OUTPUTS_MALFORMED',
    '1,042 bytes',
  )
  const nonCanon = concatBytes(u64le(40_000n), Uint8Array.of(0xfd, RECIP.length, 0x00), RECIP)
  add('outputs_non_canonical_varint', withHashOutputs(nonCanon), 'ERR_BTC_OUTPUTS_MALFORMED', 'script length 22 as fd 16 00')
  add('outputs_truncated_script', withHashOutputs(concatBytes(u64le(40_000n), encodeVarint(22), RECIP.slice(0, 10))), 'ERR_BTC_OUTPUTS_MALFORMED')
  const dupIn = { txid: fakeTxid(7), vout: 0, value: 30_000n, sequence: 0xfffffffd }
  const dup = makeTx({ inputs: [dupIn, { ...dupIn }] })
  add('duplicate_input', req(bip143Preimages(dup, PKH), serializeOutputs(dup.outputs)), 'ERR_BTC_DUPLICATE_INPUT', 'same outpoint twice (commitments consistent)')
  add('bad_hex_preimage', { btc: { preimages: [`${toHex(pre[0]!)}0`, toHex(pre[1]!)], outputs: toHex(outs) } }, 'ERR_HEX')
  add('bad_hex_outputs', { btc: { preimages: pre.map(toHex), outputs: 'zz' } }, 'ERR_HEX')
  return v
}
