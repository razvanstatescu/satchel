// THROWAWAY spike 07: call fanout contract `sign_btc(token_id, preimages_hex)` -> N parallel MPC signs via .and().
// Usage: node 07-call-fanout.mjs <unsigned.json> <attachedTgas> [signGasTgas=15] [cbGasTgas=10] [--neg]
import fs from 'node:fs'
import os from 'node:os'
import { KeyPairSigner, actions, createTransaction, baseDecode, baseEncode } from 'near-api-js'

const RPC = process.env.NEAR_RPC || 'https://near-testnet.drpc.org'
const CALLER = 'satchel-spk-btc-e9ea1a.testnet'
const CONTRACT = 'fanout.satchel-spk-btc-e9ea1a.testnet'
const [inFile, attached = '100', signGas = '15', cbGas = '10', flag] = process.argv.slice(2)
const u = JSON.parse(fs.readFileSync(inFile, 'utf8'))
const signer = KeyPairSigner.fromSecretKey(JSON.parse(fs.readFileSync(`${os.homedir()}/.near-credentials/testnet/${CALLER}.json`, 'utf8')).private_key)
const pk = await signer.getPublicKey()

async function rpc(method, params) {
  for (let a = 0; ; a++) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'x', method, params }) })
    const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { error: { message: t.slice(0, 200) } } }
    if (j.error) { if (/429|rate|timeout on the free/i.test(JSON.stringify(j.error)) && a < 30) { await new Promise((s) => setTimeout(s, 2000)); continue } const e = new Error(JSON.stringify(j.error)); throw e }
    return j.result
  }
}
async function call(args, tgas, deposit) {
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: CALLER, public_key: pk.toString() })
  const tx = createTransaction(CALLER, pk, CONTRACT, BigInt(ak.nonce) + 1n,
    [actions.functionCall('sign_btc', args, BigInt(tgas) * 10n ** 12n, BigInt(deposit))], baseDecode(ak.block_hash))
  const { txHash, signedTransaction } = await signer.signTransaction(tx)
  const hash = baseEncode(txHash)
  const t0 = Date.now()
  await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: 'NONE' })
  for (;;) {
    await new Promise((s) => setTimeout(s, 1000))
    try {
      const o = await rpc('tx', { tx_hash: hash, sender_account_id: CALLER, wait_until: 'FINAL' })
      if (o?.status && (o.status.SuccessValue !== undefined || o.status.Failure)) return { o, hash, ms: Date.now() - t0 }
    } catch (e) { if (!/UNKNOWN_TRANSACTION|TIMEOUT|timeout|doesn't exist/i.test(e.message)) throw e }
  }
}
function summarize({ o, hash, ms }) {
  const all = [o.transaction_outcome, ...o.receipts_outcome]
  const gas = all.reduce((a, r) => a + r.outcome.gas_burnt, 0) / 1e12
  const top = o.status.SuccessValue ? JSON.parse(Buffer.from(o.status.SuccessValue, 'base64').toString()) : o.status
  return { txHash: hash, ms, gasBurntTgas: gas, tokensBurntNEAR: all.reduce((a, r) => a + Number(r.outcome.tokens_burnt), 0) / 1e24,
    receipts: o.receipts_outcome.length, status: Object.keys(o.status)[0],
    perReceipt: o.receipts_outcome.map((r) => ({ executor: r.outcome.executor_id, gasTgas: r.outcome.gas_burnt / 1e12, status: Object.keys(r.outcome.status)[0], logs: r.outcome.logs.map((l) => l.slice(0, 700)) })),
    result: top }
}

const preimages = u.inputs.map((i) => i.preimageHex)
const out = { contract: CONTRACT, inFile, nInputs: preimages.length, attachedTgas: Number(attached), signGasTgas: Number(signGas), cbGasTgas: Number(cbGas), startedAt: new Date().toISOString() }
if (flag === '--neg') {
  // (a) SIGHASH_NONE: patch the last 4 bytes of preimage 0 to 02000000 -> must fail ERR_SIGHASH_NOT_ALL before any MPC call
  const none = [preimages[0].slice(0, -8) + '02000000', ...preimages.slice(1)]
  out.neg_sighash_none = summarize(await call({ token_id: '1', preimages_hex: none }, 50, preimages.length))
  // (b) only first preimage -> hashPrevouts doesn't match a single outpoint -> ERR_PREVOUTS_INCOMPLETE
  out.neg_incomplete = summarize(await call({ token_id: '1', preimages_hex: preimages.slice(0, 1) }, 50, 1))
  for (const k of ['neg_sighash_none', 'neg_incomplete']) out[k] = { txHash: out[k].txHash, status: out[k].status, gasBurntTgas: out[k].gasBurntTgas, result: out[k].result }
} else {
  const r = summarize(await call({ token_id: '1', preimages_hex: preimages, sign_gas_tgas: Number(signGas), cb_gas_tgas: Number(cbGas) }, attached, preimages.length))
  out.results = [{ hashes: u.inputs.map((i) => i.sighash), sigs: Array.isArray(r.result) ? r.result : [], ...r }]
}
fs.mkdirSync('out', { recursive: true })
const file = `out/fanout-${preimages.length}in-${flag ? 'neg-' : ''}${Date.now()}.json`
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(file)
console.log(JSON.stringify(out, null, 2))
