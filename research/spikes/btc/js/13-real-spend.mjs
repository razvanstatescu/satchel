// THROWAWAY spike 13: REAL testnet4 spend from the contract-controlled address (needs funding first).
//   node 13-real-spend.mjs plan
//   node 13-real-spend.mjs tx1 [--dry]   1 input  -> 2 outputs to self (split), signed via fanout contract (N=1)
//                                         + /txs/test probes: high-S, dust output, 0.05 sat/vB fee
//   node 13-real-spend.mjs tx2 [--dry]   2 inputs (tx1:0, tx1:1) -> 50,000 sats back to the faucet + change (N=2)
import fs from 'node:fs'
import os from 'node:os'
import * as bitcoin from 'bitcoinjs-lib'
import { KeyPairSigner, actions, createTransaction, baseDecode, baseEncode } from 'near-api-js'
import { NET, N, hex, unhex, sha256d, bip143PreimageP2WPKH, mpcToRS, to64, verifyStrict, estimateVsizeP2WPKH, DUST_P2WPKH } from './lib.mjs'

const MEMPOOL = 'https://mempool.space/testnet4/api'
const RPC = 'https://near-testnet.drpc.org'
const CALLER = 'satchel-spk-btc-e9ea1a.testnet'
const CONTRACT = 'fanout.satchel-spk-btc-e9ea1a.testnet'
const PUB = unhex('023e36ee8dbf9314fd73cfb4f204dc1f38249ef20d5ff72395eff009586e441df6') // derive(CONTRACT, satchel/1/btc)
const self = bitcoin.payments.p2wpkh({ pubkey: PUB, network: NET })
const FAUCET_RETURN = 'tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q'
const FEE_RATE = 2
const [cmd, flag] = process.argv.slice(2)
const log = (k, v) => { const f = 'out/real-spend.json'; const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; d[k] = v; fs.writeFileSync(f, JSON.stringify(d, (a, b) => (typeof b === 'bigint' ? b.toString() : b), 2)) }

const signer = KeyPairSigner.fromSecretKey(JSON.parse(fs.readFileSync(`${os.homedir()}/.near-credentials/testnet/${CALLER}.json`, 'utf8')).private_key)
const pk = await signer.getPublicKey()
async function rpc(method, params) {
  for (let a = 0; ; a++) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'x', method, params }) })
    const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { error: { message: t.slice(0, 200) } } }
    if (j.error) { if (/429|rate|timeout on the free/i.test(JSON.stringify(j.error)) && a < 30) { await new Promise((s) => setTimeout(s, 2000)); continue } throw new Error(JSON.stringify(j.error)) }
    return j.result
  }
}
async function signViaContract(preimages) {
  const n = preimages.length
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: CALLER, public_key: pk.toString() })
  const tx = createTransaction(CALLER, pk, CONTRACT, BigInt(ak.nonce) + 1n,
    [actions.functionCall('sign_btc', { token_id: '1', preimages_hex: preimages.map(hex) }, BigInt(40 + 20 * n) * 10n ** 12n, BigInt(n))], baseDecode(ak.block_hash))
  const { txHash, signedTransaction } = await signer.signTransaction(tx)
  const hash = baseEncode(txHash), t0 = Date.now()
  await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: 'NONE' })
  for (;;) {
    await new Promise((s) => setTimeout(s, 1000))
    try {
      const o = await rpc('tx', { tx_hash: hash, sender_account_id: CALLER, wait_until: 'FINAL' })
      if (o?.status?.SuccessValue !== undefined) return { nearTx: hash, ms: Date.now() - t0, sigs: JSON.parse(Buffer.from(o.status.SuccessValue, 'base64').toString()) }
      if (o?.status?.Failure) throw new Error('NEAR tx failed: ' + JSON.stringify(o.status.Failure))
    } catch (e) { if (!/UNKNOWN_TRANSACTION|TIMEOUT|timeout|doesn't exist/i.test(e.message)) throw e }
  }
}
const mp = async (p, init) => { const r = await fetch(MEMPOOL + p, init); return { status: r.status, body: await r.text() } }

function build(inputs, outputs) { // inputs [{txid,vout,value}] outputs [{address,value}]
  const psbt = new bitcoin.Psbt({ network: NET }); psbt.setVersion(2); psbt.setLocktime(0)
  for (const u of inputs) psbt.addInput({ hash: u.txid, index: u.vout, sequence: 0xfffffffd, witnessUtxo: { script: self.output, value: BigInt(u.value) } })
  for (const o of outputs) psbt.addOutput({ address: o.address, value: BigInt(o.value) })
  const tx = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
  const preimages = inputs.map((u, i) => bip143PreimageP2WPKH(tx, i, self.hash, BigInt(u.value)))
  const sighashes = inputs.map((u, i) => hex(tx.hashForWitnessV0(i, bitcoin.payments.p2pkh({ hash: self.hash }).output, BigInt(u.value), 1)))
  preimages.forEach((p, i) => { if (hex(sha256d(p)) !== sighashes[i]) throw new Error('preimage mismatch') })
  return { psbt, preimages, sighashes }
}
function finalize(psbt, sigs, sighashes, { highS = false } = {}) {
  const p = psbt.clone()
  const s64 = sigs.map((resp, i) => { const { r, s } = mpcToRS(resp); const sig = to64(r, highS && i === 0 ? N - s : s)
    if (!highS && !verifyStrict(PUB, unhex(sighashes[i]), sig)) throw new Error('bad sig ' + i); return sig })
  for (let i = 0; i < p.inputCount; i++) p.signInput(i, { publicKey: PUB, sign: () => s64[i] })
  p.finalizeAllInputs()
  const tx = p.extractTransaction(true)
  return { hex: tx.toHex(), txid: tx.getId(), vsize: tx.virtualSize() }
}
async function utxos() { return JSON.parse((await mp(`/address/${self.address}/utxo`)).body) }

if (cmd === 'plan') {
  console.log(self.address, await utxos())
} else if (cmd === 'tx1') {
  const u = (await utxos()).sort((a, b) => b.value - a.value)[0]
  if (!u) throw new Error('address not funded yet')
  const fee = Math.ceil(estimateVsizeP2WPKH(1, [22, 22]) * FEE_RATE)
  const a = 300_000, b = u.value - a - fee
  const main = build([u], [{ address: self.address, value: a }, { address: self.address, value: b }])
  const signed = await signViaContract(main.preimages)
  const good = finalize(main.psbt, signed.sigs, main.sighashes)
  const high = finalize(main.psbt, signed.sigs, main.sighashes, { highS: true })
  // probes need their own signatures (different txs)
  const dustTx = build([u], [{ address: FAUCET_RETURN, value: 200 }, { address: self.address, value: u.value - 200 - fee }])
  const lowFee = build([u], [{ address: self.address, value: a }, { address: self.address, value: u.value - a - 7 }]) // ~0.05 sat/vB
  const dustS = await signViaContract(dustTx.preimages), lowS = await signViaContract(lowFee.preimages)
  const probes = {
    good: await mp('/txs/test', { method: 'POST', body: JSON.stringify([good.hex]) }),
    highS: await mp('/txs/test', { method: 'POST', body: JSON.stringify([high.hex]) }),
    dust200: await mp('/txs/test', { method: 'POST', body: JSON.stringify([finalize(dustTx.psbt, dustS.sigs, dustTx.sighashes).hex]) }),
    fee7sats: await mp('/txs/test', { method: 'POST', body: JSON.stringify([finalize(lowFee.psbt, lowS.sigs, lowFee.sighashes).hex]) }),
  }
  const res = { input: u, nearTx: signed.nearTx, nearMs: signed.ms, txid: good.txid, vsize: good.vsize, fee, probes }
  if (flag !== '--dry') { const t0 = Date.now(); res.broadcast = await mp('/tx', { method: 'POST', body: good.hex }); res.broadcastMs = Date.now() - t0; res.rawHex = good.hex }
  log('tx1', res); console.log(JSON.stringify(res, null, 2))
} else if (cmd === 'tx2') {
  const t1 = JSON.parse(fs.readFileSync('out/real-spend.json', 'utf8')).tx1
  const ins = [0, 1].map((v) => ({ txid: t1.txid, vout: v, value: v === 0 ? 300_000 : Number(t1.input.value) - 300_000 - Number(t1.fee) }))
  const fee = Math.ceil(estimateVsizeP2WPKH(2, [22, 22]) * FEE_RATE)
  const change = ins[0].value + ins[1].value - 50_000 - fee
  if (change < Number(DUST_P2WPKH)) throw new Error('dust change')
  const t = build(ins, [{ address: FAUCET_RETURN, value: 50_000 }, { address: self.address, value: change }])
  const signed = await signViaContract(t.preimages)
  const good = finalize(t.psbt, signed.sigs, t.sighashes)
  const res = { inputs: ins, nearTx: signed.nearTx, nearMs: signed.ms, txid: good.txid, vsize: good.vsize, fee,
    test: await mp('/txs/test', { method: 'POST', body: JSON.stringify([good.hex]) }) }
  if (flag !== '--dry') { const t0 = Date.now(); res.broadcast = await mp('/tx', { method: 'POST', body: good.hex }); res.broadcastMs = Date.now() - t0; res.rawHex = good.hex }
  log('tx2', res); console.log(JSON.stringify(res, null, 2))
}
