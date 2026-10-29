// THROWAWAY spike 06: create fanout.<spike account> (3 NEAR) and deploy the fan-out spike contract, via drpc.
// The new key is written to the legacy keychain (~/.near-credentials/testnet/<acct>.json, mode 600) like
// `near ... save-to-legacy-keychain` would. Nothing secret is printed.
import fs from 'node:fs'
import os from 'node:os'
import { KeyPair, KeyPairSigner, actions, createTransaction, baseDecode, baseEncode, parseNearAmount } from 'near-api-js'

const RPC = process.env.NEAR_RPC || 'https://near-testnet.drpc.org'
const PARENT = 'satchel-spk-btc-e9ea1a.testnet'
const CHILD = 'fanout.' + PARENT
const WASM = new URL('../contract-fanout/target/near/btc_fanout_spike.wasm', import.meta.url)
const credDir = `${os.homedir()}/.near-credentials/testnet`

async function rpc(method, params) {
  for (let a = 0; ; a++) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'x', method, params }) })
    const j = JSON.parse(await r.text())
    if (j.error) { if (/429|rate/i.test(JSON.stringify(j.error)) && a < 20) { await new Promise((s) => setTimeout(s, 2000)); continue } throw new Error(JSON.stringify(j.error)) }
    return j.result
  }
}
async function send(signerAccount, signer, receiver, acts) {
  const pk = await signer.getPublicKey()
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: signerAccount, public_key: pk.toString() })
  const tx = createTransaction(signerAccount, pk, receiver, BigInt(ak.nonce) + 1n, acts, baseDecode(ak.block_hash))
  const { txHash, signedTransaction } = await signer.signTransaction(tx)
  await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: 'NONE' })
  let o
  for (;;) {
    await new Promise((s) => setTimeout(s, 1500))
    try { o = await rpc('tx', { tx_hash: baseEncode(txHash), sender_account_id: signerAccount, wait_until: 'FINAL' }); if (o?.status && (o.status.SuccessValue !== undefined || o.status.Failure)) break } catch (e) { if (!/UNKNOWN_TRANSACTION|TIMEOUT|timeout/i.test(e.message)) throw e }
  }
  return { hash: baseEncode(txHash), status: o.status, gasTgas: [o.transaction_outcome, ...o.receipts_outcome].reduce((a, r) => a + r.outcome.gas_burnt, 0) / 1e12 }
}

const parent = KeyPairSigner.fromSecretKey(JSON.parse(fs.readFileSync(`${credDir}/${PARENT}.json`, 'utf8')).private_key)
const childFile = `${credDir}/${CHILD}.json`
let childKey
if (fs.existsSync(childFile)) childKey = KeyPair.fromString(JSON.parse(fs.readFileSync(childFile, 'utf8')).private_key)
else {
  childKey = KeyPair.fromRandom('ed25519')
  fs.writeFileSync(childFile, JSON.stringify({ account_id: CHILD, public_key: childKey.getPublicKey().toString(), private_key: childKey.toString() }), { mode: 0o600 })
}
const exists = await rpc('query', { request_type: 'view_account', finality: 'final', account_id: CHILD }).then(() => true, () => false)
if (!exists) {
  const r = await send(PARENT, parent, CHILD, [actions.createAccount(), actions.transfer(BigInt(parseNearAmount('3'))), actions.addFullAccessKey(childKey.getPublicKey())])
  console.log('create', CHILD, r.hash, Object.keys(r.status)[0], 'gasTgas', r.gasTgas)
}
const child = new KeyPairSigner(childKey)
const d = await send(CHILD, child, CHILD, [actions.deployContract(new Uint8Array(fs.readFileSync(WASM)))])
console.log('deploy', d.hash, Object.keys(d.status)[0], 'gasTgas', d.gasTgas)
