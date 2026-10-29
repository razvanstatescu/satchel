import { describe, expect, it } from 'vitest'
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import btcVectors from '../../../vectors/btc.json' with { type: 'json' }
import fanout from './fixtures/kb30-btc-fanout.json' with { type: 'json' }
import {
  addressToScript,
  attachBtcSignatures,
  bip143Preimage,
  bip143Preimages,
  bitcoinjsSighash,
  btcTxFromPreimages,
  buildBtcSend,
  computeTxid,
  DUST,
  EsploraClient,
  estimateVsize,
  MempoolClient,
  referencedTxids,
  seededRng,
  selectLargestFirst,
  selectSweep,
  serializeOutputs,
  testnet4FeeRate,
  toPsbt,
  UnsafeBtcTxError,
  WrongNetworkError,
  type BtcUnsignedTx,
  type Utxo,
} from '../src/chains/btc'
import { classifyBtc, sha256d } from '../src/policy'
import { hexToBytesStrict, toHex } from '../src/bytes'
import { deriveSatchelAddresses, hash160 } from '../src/derive'
import type { MpcSignature } from '../src/near'

const RUN2 = fanout.runs[0]!
const RUN4 = fanout.runs[1]!
const FANOUT_PUB = hexToBytesStrict(RUN2.pubkey)

function txFromRun(run: typeof RUN2): BtcUnsignedTx {
  const t = bitcoin.Transaction.fromBuffer(bitcoin.Psbt.fromBase64(run.psbt_base64).data.globalMap.unsignedTx.toBuffer())
  return {
    version: t.version,
    locktime: t.locktime,
    inputs: run.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: BigInt(i.value), sequence: i.sequence })),
    outputs: t.outs.map((o) => ({ script: Uint8Array.from(o.script), value: BigInt(o.value) })),
  }
}

describe('btc: BIP143 preimages and the outputs serializer (kb/70 F4)', () => {
  it('reproduces the recorded fan-out preimages; sha256d(preimage) == hashForWitnessV0 == the MPC payload', () => {
    for (const run of fanout.runs) {
      const tx = txFromRun(run)
      const pre = bip143Preimages(tx, hash160(hexToBytesStrict(run.pubkey)))
      expect(pre.map(toHex)).toEqual(run.preimages)
      pre.forEach((p, i) => {
        expect(p.length).toBe(182)
        expect(toHex(sha256d(p))).toBe(run.mpc_hashes[i])
        expect(toHex(bitcoinjsSighash(tx, i, hexToBytesStrict(run.pubkey)))).toBe(run.sighashes[i])
      })
      expect(computeTxid(tx)).toBe(run.unsigned_txid)
    }
  })

  it('outputs bytes are exactly what hashOutputs commits to (preimage[142..174])', () => {
    const tx = txFromRun(RUN2)
    const outs = serializeOutputs(tx.outputs)
    expect(toHex(sha256d(outs))).toBe(toHex(hexToBytesStrict(RUN2.preimages[0]!).slice(142, 174)))
  })

  it('preimage == hashForWitnessV0 for random txs (1..10 inputs, mixed outputs)', () => {
    const rng = seededRng(7)
    const pub = hexToBytesStrict(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '9').btcPubkey)
    const self = addressToScript(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '9').btc)
    for (let k = 0; k < 25; k++) {
      const n = 1 + Math.floor(rng() * 10)
      const tx: BtcUnsignedTx = {
        version: 2,
        locktime: 0,
        inputs: Array.from({ length: n }, (_, i) => ({
          txid: toHex(sha256d(Uint8Array.of(k, i))),
          vout: Math.floor(rng() * 5),
          value: BigInt(1000 + Math.floor(rng() * 1e6)),
          sequence: [0xfffffffd, 0xfffffffe, 0xffffffff][Math.floor(rng() * 3)]!,
        })),
        outputs: [{ script: self, value: 5000n }, { script: addressToScript('tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd'), value: 777n }],
      }
      for (let i = 0; i < n; i++) expect(toHex(sha256d(bip143Preimage(tx, i, hash160(pub))))).toBe(toHex(bitcoinjsSighash(tx, i, pub)))
      expect(computeTxid(tx)).toBe(bitcoin.Transaction.fromBuffer(toPsbt(tx, pub).data.globalMap.unsignedTx.toBuffer()).getId())
    }
  })

  it('accepted vectors round-trip through btcTxFromPreimages (rebuild from the sign_requested event)', () => {
    for (const v of btcVectors.vectors.filter((x) => x.expect.ok)) {
      const req = v.request as { btc: { preimages: string[]; outputs: string } }
      const { tx, pkh, txid } = btcTxFromPreimages(req.btc.preimages, req.btc.outputs)
      expect(txid, v.name).toBe((v.expect.fields as { txid: string }).txid)
      expect(bip143Preimages(tx, pkh).map(toHex), v.name).toEqual(req.btc.preimages.map((p) => p.replace(/^0x/i, '').toLowerCase()))
    }
  })
})

describe('btc: attach + strict verify (real MPC signatures, research/spikes/btc §8)', () => {
  it.each([
    ['2 inputs', RUN2],
    ['4 inputs', RUN4],
  ])('%s: attaches, verifies strictly, finalizes; txid unchanged', (_n, run) => {
    const tx = txFromRun(run)
    const signed = attachBtcSignatures(tx, run.mpc_responses as MpcSignature[], run.pubkey)
    expect(signed.txid).toBe(run.unsigned_txid)
    expect(signed.vsize).toBe(run.inputs.length === 2 ? 208 : 344)
    const t = bitcoin.Transaction.fromHex(signed.hex)
    for (const inp of t.ins) {
      expect(inp.witness.length).toBe(2)
      expect(toHex(Uint8Array.from(inp.witness[1]!))).toBe(run.pubkey)
      expect(inp.witness[0]![inp.witness[0]!.length - 1]).toBe(1) // SIGHASH_ALL
    }
  })

  it('rejects swapped signatures, a missing signature and a high-S variant', () => {
    const tx = txFromRun(RUN2)
    const sigs = RUN2.mpc_responses as MpcSignature[]
    expect(() => attachBtcSignatures(tx, [sigs[1]!, sigs[0]!], FANOUT_PUB)).toThrow(/does not verify/)
    expect(() => attachBtcSignatures(tx, [sigs[0]!, null], FANOUT_PUB)).toThrow(/not signed: 1/)
    const s = sigs[0] as Extract<MpcSignature, { scheme: 'Secp256k1' }>
    const high = (secp256k1.Point.Fn.ORDER - BigInt(`0x${s.s.scalar}`)).toString(16).padStart(64, '0')
    expect(() => attachBtcSignatures(tx, [{ ...s, s: { scalar: high } }, sigs[1]!], FANOUT_PUB)).toThrow(/high-S/)
  })
})

describe('btc: fees, dust, selection (kb/30 §6)', () => {
  it('vsize matches the kb/30 table and bitcoinjs: 1/1 110, 1/2 141, 2/2 209, 4/2 345, 10/2 753', () => {
    expect([estimateVsize(1, ['p2wpkh']), estimateVsize(1, ['p2wpkh', 'p2wpkh']), estimateVsize(2, ['p2wpkh', 'p2wpkh']), estimateVsize(4, ['p2wpkh', 'p2wpkh']), estimateVsize(10, ['p2wpkh', 'p2wpkh'])]).toEqual([110, 141, 209, 345, 753])
    expect(DUST).toEqual({ p2wpkh: 294n, p2tr: 330n, p2wsh: 330n, p2sh: 540n, p2pkh: 546n })
    expect(testnet4FeeRate({ halfHourFee: 1 })).toBe(2)
    expect(testnet4FeeRate({ halfHourFee: 3.2 })).toBe(4)
  })

  const U = (v: number, i: number, confirmed = true): Utxo => ({ txid: toHex(sha256d(Uint8Array.of(i))), vout: 0, value: BigInt(v), confirmed })

  it('largest-first reproduces the kb/30 spike: 2 UTXOs → 40k @2 sat/vB, fee 418, change 14,582', () => {
    const s = selectLargestFirst([U(25_000, 2), U(30_000, 1)], 40_000n, { feeRate: 2, recipientType: 'p2wpkh' })
    expect(s).toMatchObject({ amount: 40_000n, change: 14_582n, fee: 418n, vsize: 209 })
    expect(s.inputs.map((u) => u.value)).toEqual([30_000n, 25_000n])
  })

  it('change below 294 goes to the fee; dust amounts are refused per recipient type; max sweeps', () => {
    // 400 sats left: a change output would be 400 − 141 = 259 < 294, so it is folded into the fee
    expect(selectLargestFirst([U(10_000, 1)], 9_600n, { feeRate: 1, recipientType: 'p2wpkh' })).toMatchObject({ change: 0n, fee: 400n })
    // 500 left: change 359 ≥ 294 survives
    expect(selectLargestFirst([U(10_000, 1)], 9_500n, { feeRate: 1, recipientType: 'p2wpkh' })).toMatchObject({ change: 359n, fee: 141n })
    expect(() => selectLargestFirst([U(10_000, 1)], 293n, { feeRate: 1, recipientType: 'p2wpkh' })).toThrow(/294/)
    expect(() => selectLargestFirst([U(10_000, 1)], 545n, { feeRate: 1, recipientType: 'p2pkh' })).toThrow(/546/)
    expect(selectSweep([U(10_000, 1), U(5_000, 2)], { feeRate: 2, recipientType: 'p2wpkh' })).toMatchObject({ amount: 15_000n - 2n * 178n, change: 0n })
    expect(() => selectLargestFirst([U(10_000, 1, false)], 5_000n, { feeRate: 1, recipientType: 'p2wpkh' })).toThrow(/no spendable/)
    expect(selectLargestFirst([U(10_000, 1, false)], 5_000n, { feeRate: 1, recipientType: 'p2wpkh', allowUnconfirmed: true }).inputs.length).toBe(1)
  })

  it('never more than 10 inputs', () => {
    const many = Array.from({ length: 12 }, (_, i) => U(1_000, i))
    expect(() => selectLargestFirst(many, 11_000n, { feeRate: 1, recipientType: 'p2wpkh' })).toThrow(/10 inputs/)
  })
})

describe('btc: send builder, collision check and output order (R-05, INV-32)', () => {
  const sender = deriveSatchelAddresses('testnet', 'fanout.satchel-spk-btc-e9ea1a.testnet', '1')
  const recipientScript = txFromRun(RUN2).outputs[0]!.script
  const recipient = bitcoin.address.fromOutputScript(recipientScript, bitcoin.networks.testnet)
  const utxos: Utxo[] = RUN2.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: BigInt(i.value), confirmed: true }))
  const params = { from: { address: sender.btc, pubkey: sender.btcPubkey }, to: recipient, amount: 40_000n, utxos, feeRate: 2 }

  it('with fixed order it rebuilds the recorded fan-out tx exactly (same txid, preimages, MPC payloads)', () => {
    const b = buildBtcSend({ ...params, fixedOrder: true })
    expect(b.txid).toBe(RUN2.unsigned_txid)
    expect(b.preimages.map(toHex)).toEqual(RUN2.preimages)
    expect(b.payloads.map(toHex)).toEqual(RUN2.mpc_hashes)
    expect(b).toMatchObject({ fee: 418n, change: 14_582n, recipientIndex: 0, changeIndex: 1, perturbations: [] })
    expect(classifyBtc((b.signRequest as { btc: { preimages: string[]; outputs: string } }).btc.preimages, (b.signRequest as { btc: { outputs: string } }).btc.outputs).ok).toBe(true)
  })

  it('output order is randomized by default (seeded RNG makes it reproducible)', () => {
    const orders = new Set<number>()
    for (let seed = 1; seed <= 20; seed++) orders.add(buildBtcSend({ ...params, rng: seededRng(seed) }).recipientIndex)
    expect([...orders].sort()).toEqual([0, 1])
    const a = buildBtcSend({ ...params, rng: seededRng(42) })
    expect(buildBtcSend({ ...params, rng: seededRng(42) }).txid).toBe(a.txid)
  })

  it('avoids_logged_txids: a candidate whose txid a record references is perturbed (fee +1 sat), and still passes the policy', () => {
    const first = buildBtcSend({ ...params, rng: seededRng(3) })
    const records = [{ detail: { btc: { txid: first.txid.toUpperCase(), vout: 1, amount_sats: '14582' } } }, { detail: { evm: {} } }]
    const forbidden = referencedTxids(records)
    const b = buildBtcSend({ ...params, rng: seededRng(3), forbiddenTxids: forbidden })
    expect(b.txid).not.toBe(first.txid)
    expect(b.perturbations).toEqual(['fee+1'])
    expect(b.fee).toBe(first.fee + 1n)
    expect(b.change).toBe(first.change - 1n)
    expect(forbidden.has(b.txid)).toBe(false)
    const req = (b.signRequest as { btc: { preimages: string[]; outputs: string } }).btc
    expect(classifyBtc(req.preimages, req.outputs).ok).toBe(true)
  })

  it('then flips nSequence fffffffd → fffffffe; refuses when no candidate is free', () => {
    const cands: string[] = []
    const order = buildBtcSend({ ...params, rng: seededRng(9) }).recipientIndex
    for (const bump of [0n, 1n, 2n, 3n]) {
      const t = buildBtcSend({ ...params, rng: seededRng(9), forbiddenTxids: cands })
      cands.push(t.txid)
      expect(t.fee).toBe(418n + bump)
    }
    const flipped = buildBtcSend({ ...params, rng: seededRng(9), forbiddenTxids: cands })
    expect(flipped.perturbations.at(-1)).toBe('nsequence-fffffffe')
    expect(flipped.tx.inputs.every((i) => i.sequence === 0xfffffffe)).toBe(true)
    expect(flipped.recipientIndex).toBe(order)
    cands.push(flipped.txid)
    expect(() => buildBtcSend({ ...params, rng: seededRng(9), forbiddenTxids: cands })).toThrow(UnsafeBtcTxError)
    expect(() => buildBtcSend({ ...params, rng: seededRng(9), forbiddenTxids: cands })).toThrow("Can't build a safe transaction. Try a different amount.")
  })

  it('"max" with no change takes the fee bump from the amount; a fixed amount without change skips to the nSequence flip', () => {
    const max = buildBtcSend({ ...params, amount: 'max', fixedOrder: true })
    const bumped = buildBtcSend({ ...params, amount: 'max', fixedOrder: true, forbiddenTxids: [max.txid] })
    expect(bumped.amount).toBe(max.amount - 1n)
    const exact = buildBtcSend({ ...params, amount: 55_000n - 2n * 178n, fixedOrder: true })
    expect(exact.change).toBe(0n)
    const dodge = buildBtcSend({ ...params, amount: exact.amount, fixedOrder: true, forbiddenTxids: [exact.txid] })
    expect(dodge.perturbations).toEqual(['nsequence-fffffffe'])
  })

  it('retry reuses the same input set (spec §8.7) even when fewer inputs would do', () => {
    const b = buildBtcSend({ ...params, amount: 10_000n, inputs: utxos, fixedOrder: true })
    expect(b.inputOutpoints).toEqual(utxos.map((u) => `${u.txid}:${u.vout}`))
  })

  it('pays a taproot (tb1p) recipient (bitcoinjs initEccLib)', () => {
    const tap = bitcoin.payments.p2tr({ internalPubkey: hexToBytesStrict(sender.btcPubkey).slice(1), network: bitcoin.networks.testnet }).address!
    const b = buildBtcSend({ ...params, to: tap, rng: seededRng(1) })
    expect(toHex(b.tx.outputs[b.recipientIndex]!.script).startsWith('5120')).toBe(true)
  })

  it('refuses a from address that is not the pubkey\'s P2WPKH', () => {
    expect(() => buildBtcSend({ ...params, from: { address: recipient, pubkey: sender.btcPubkey } })).toThrow(/not the P2WPKH/)
  })
})

describe('btc: mempool.space client (simple requests, guards, fallback)', () => {
  const GEN = '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043'

  it('refuses testnet4.mempool.space (it is mainnet) and wrong-genesis providers', async () => {
    expect(() => new EsploraClient('https://testnet4.mempool.space/api')).toThrow(WrongNetworkError)
    const mainnet = new EsploraClient('https://x/testnet4/api', { fetch: async () => new Response('000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f') })
    await expect(mainnet.tipHeight()).rejects.toThrow(/not testnet4/)
  })

  it('POST /tx sends the raw hex as a bare string: no headers, so no preflight', async () => {
    const seen: { url: string; init?: { method?: string; body?: string; headers?: unknown } }[] = []
    const c = new EsploraClient('https://m/testnet4/api', {
      fetch: async (url, init) => {
        seen.push({ url, init })
        return new Response(url.endsWith('/block-height/0') ? GEN : 'abcd')
      },
    })
    expect(await c.broadcast('0200deadbeef')).toBe('abcd')
    const post = seen.find((s) => s.init?.method === 'POST')!
    expect(post.url).toBe('https://m/testnet4/api/tx')
    expect(post.init!.body).toBe('0200deadbeef')
    expect(post.init!.headers).toBeUndefined()
    expect(seen.every((s) => s.init?.headers === undefined)).toBe(true)
  })

  it('falls back to emzy on a provider failure but not on a definite rejection (400)', async () => {
    const calls: string[] = []
    const f = (status: number, body: string) => async (url: string) => {
      calls.push(url)
      if (url.endsWith('/block-height/0')) return new Response(GEN)
      return new Response(body, { status })
    }
    const down = new MempoolClient({ fetch: async (u) => (u.includes('mempool.space') ? f(503, 'down')(u) : f(200, 'txid1')(u)) })
    expect(await down.broadcast('00')).toBe('txid1')
    const rejected = new MempoolClient({ fetch: f(400, 'sendrawtransaction RPC error: {"code":-25,"message":"bad-txns-inputs-missingorspent"}') })
    await expect(rejected.broadcast('00')).rejects.toThrow(/missingorspent/)
    expect(calls.filter((u) => u.endsWith('/tx') && u.includes('emzy')).length).toBe(1) // only the 503 case reached emzy
  })
})
