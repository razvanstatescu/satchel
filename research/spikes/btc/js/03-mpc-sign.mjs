// THROWAWAY spike 03: get REAL MPC signatures from v1.signer-prod.testnet for BTC sighashes, calling `sign`
// directly from the spike account (path satchel/1/btc => predecessor = the spike account, NOT a contract).
// Modes:
//   seq   : one tx per input, sent one after another
//   par   : one tx per input, sent concurrently (explicit nonces n+1, n+2)
//   batch : ONE tx with N FunctionCall actions to `sign` (one per input)
// Usage: node 03-mpc-sign.mjs <in.json> <mode> [gasTgasPerSign=50]
// Writes out/sigs-<mode>-<ts>.json. Private key is loaded from the legacy keychain and never printed.
import fs from 'node:fs'
import os from 'node:os'
import { KeyPairSigner, actions, createTransaction, baseDecode, baseEncode } from 'near-api-js'

const ACCOUNT = process.env.NEAR_ACCOUNT || 'satchel-spk-btc-e9ea1a.testnet'
const MPC = 'v1.signer-prod.testnet'
const RPC = process.env.NEAR_RPC || 'https://near-testnet.drpc.org'
const [inFile, mode = 'seq', gasArg = '50'] = process.argv.slice(2)
const PATH = process.env.SIGN_PATH || 'satchel/1/btc'
const GAS = BigInt(gasArg) * 10n ** 12n
const hashes = JSON.parse(fs.readFileSync(inFile, 'utf8')).inputs.map((i) => i.sighash)

const cred = JSON.parse(fs.readFileSync(`${os.homedir()}/.near-credentials/testnet/${ACCOUNT}.json`, 'utf8'))
const signer = KeyPairSigner.fromSecretKey(cred.private_key)
const pk = await signer.getPublicKey()

let rpcCalls = 0
async function rpc(method, params) {
  for (let attempt = 0; ; attempt++) {
    rpcCalls++
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'x', method, params }) })
    const text = await r.text()
    let j; try { j = JSON.parse(text) } catch { j = { error: { message: text.slice(0, 200) } } }
    if (j.error) {
      const m = JSON.stringify(j.error)
      if (/429|Rate|rate limit|TIMEOUT|Timeout/i.test(m) && attempt < 20) { await new Promise((s) => setTimeout(s, 2000)); continue }
      const e = new Error(m); e.rpc = j.error; throw e
    }
    return j.result
  }
}

const signAction = (h) => actions.functionCall('sign',
  { request: { payload_v2: { Ecdsa: h }, path: PATH, domain_id: 0 } }, GAS, 1n)

function summarize(outcome, t0) {
  const ms = Date.now() - t0
  const all = [outcome.transaction_outcome, ...outcome.receipts_outcome]
  const gasBurnt = all.reduce((a, r) => a + BigInt(r.outcome.gas_burnt), 0n)
  const tokensBurnt = all.reduce((a, r) => a + BigInt(r.outcome.tokens_burnt), 0n)
  const sigs = outcome.receipts_outcome.map((r) => r.outcome.status?.SuccessValue).filter(Boolean)
    .map((v) => { try { return JSON.parse(Buffer.from(v, 'base64').toString()) } catch { return null } })
    .filter((v) => v && v.big_r)
  const failures = outcome.receipts_outcome.filter((r) => r.outcome.status?.Failure).map((r) => r.outcome.status.Failure)
  const perReceipt = outcome.receipts_outcome.map((r) => ({ executor: r.outcome.executor_id, gasTgas: Number(r.outcome.gas_burnt) / 1e12,
    status: Object.keys(r.outcome.status)[0], block: r.block_hash }))
  const top = outcome.status.SuccessValue !== undefined && outcome.status.SuccessValue !== ''
    ? JSON.parse(Buffer.from(outcome.status.SuccessValue, 'base64').toString()) : outcome.status
  return { txHash: outcome.transaction.hash, ms, gasBurntTgas: Number(gasBurnt) / 1e12, tokensBurntNEAR: Number(tokensBurnt) / 1e24,
    receipts: outcome.receipts_outcome.length, status: Object.keys(outcome.status)[0], failures, sigs, perReceipt, result: top }
}

async function base() {
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: ACCOUNT, public_key: pk.toString() })
  return { nonce: BigInt(ak.nonce), blockHash: ak.block_hash }
}
async function freshTx(acts, nonceOffset, b) {
  const tx = createTransaction(ACCOUNT, pk, MPC, b.nonce + BigInt(nonceOffset), acts, baseDecode(b.blockHash))
  const { txHash, signedTransaction } = await signer.signTransaction(tx)
  return { hash: baseEncode(txHash), b64: Buffer.from(signedTransaction.encode()).toString('base64') }
}
// Broadcast without blocking (MPC yield can take up to ~200 blocks), then poll `tx` until it has a final status.
async function sendAndWait(s) {
  const t0 = Date.now()
  await rpc('send_tx', { signed_tx_base64: s.b64, wait_until: 'NONE' })
  const tSent = Date.now()
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      const o = await rpc('tx', { tx_hash: s.hash, sender_account_id: ACCOUNT, wait_until: 'FINAL' })
      if (o?.status && (o.status.SuccessValue !== undefined || o.status.Failure)) return { o, submitMs: tSent - t0 }
    } catch (e) {
      if (!/UNKNOWN_TRANSACTION|doesn't exist|not found|TIMEOUT/i.test(e.message)) throw e
      if (Date.now() - t0 > 600000) throw e
    }
  }
}

const out = { mode, path: PATH, predecessor: ACCOUNT, rpc: RPC, gasPerSignTgas: Number(gasArg), startedAt: new Date().toISOString(), hashes, results: [] }
const T0 = Date.now()
if (mode === 'seq') {
  for (const h of hashes) {
    const b = await base()
    const t0 = Date.now()
    const { o, submitMs } = await sendAndWait(await freshTx([signAction(h)], 1, b))
    out.results.push({ hash: h, submitMs, ...summarize(o, t0) })
  }
} else if (mode === 'par') {
  const b = await base()
  const signed = await Promise.all(hashes.map((h, i) => freshTx([signAction(h)], i + 1, b)))
  const t0 = Date.now()
  const outcomes = await Promise.all(signed.map((s) => sendAndWait(s)))
  outcomes.forEach(({ o, submitMs }, i) => out.results.push({ hash: hashes[i], submitMs, ...summarize(o, t0) }))
} else if (mode === 'batch') {
  const b = await base()
  const t0 = Date.now()
  const { o, submitMs } = await sendAndWait(await freshTx(hashes.map(signAction), 1, b))
  out.results.push({ hashes, submitMs, ...summarize(o, t0) })
} else throw new Error('mode must be seq|par|batch')
out.totalMs = Date.now() - T0
out.rpcCalls = rpcCalls

fs.mkdirSync('out', { recursive: true })
const file = `out/sigs-${mode}-${Date.now()}.json`
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(file)
console.log(JSON.stringify(out, null, 2))
