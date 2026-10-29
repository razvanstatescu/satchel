// THROWAWAY Phase 0 spike (orchestrator, 2026-10-21). Never import into the product.
// Question (spec A-17): does NEAR accept one tx that creates a sub-account with NO AddKey and then
// deploys, inits and calls the new contract 7 more times (11 actions)?
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { KeyPairSigner, actions, encodeTransaction, baseEncode, baseDecode, createTransaction } from 'near-api-js';

const SENDER = 'satchel-spk-web-e9ea1a.testnet';
const NEW = process.argv[2] || `kb2.${SENDER}`;
const RPC = 'https://test.rpc.fastnear.com';
const WASM = '/Users/razvanstatescu/Documents/Work/near/Satchel/research/spikes/sdk/vendor/near-workspaces-rs/examples/res/non_fungible_token.wasm';
const TGAS = 10n ** 12n;
const NEAR = 10n ** 24n;

const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${SENDER}.json`, 'utf8'));
const signer = KeyPairSigner.fromSecretKey(cred.private_key); // never printed

async function rpc(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return res.json();
}

const pk = await signer.getPublicKey();
const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: SENDER, public_key: pk.toString() });
const blk = await rpc('block', { finality: 'final' });
const nonce = BigInt(ak.result.nonce) + 1n;

const mint = (id) => actions.functionCall('nft_mint',
  { token_id: String(id), token_owner_id: SENDER, token_metadata: { title: `kb-${id}` } }, 20n * TGAS, (id === 7 ? 0n : NEAR / 100n));
const acts = [
  actions.createAccount(),
  actions.transfer(4n * NEAR),
  actions.deployContract(new Uint8Array(readFileSync(WASM))),
  actions.functionCall('new_default_meta', { owner_id: SENDER }, 30n * TGAS, 0n),
  ...[1, 2, 3, 4, 5, 6, 7].map(mint),
];
console.log('receiver:', NEW, '| actions:', acts.length, acts.map((a) => a.enum));

const tx = createTransaction(SENDER, pk, NEW, nonce, acts, baseDecode(blk.result.header.hash));
const { txHash, signedTransaction } = await signer.signTransaction(tx);
const t0 = Date.now();
const out = await rpc('send_tx', { signed_tx_base64: Buffer.from(encodeTransaction(signedTransaction)).toString('base64'), wait_until: 'FINAL' });
console.log('tx:', baseEncode(txHash), '| ms:', Date.now() - t0);
if (out.error) { console.log('error:', JSON.stringify(out.error).slice(0, 600)); process.exit(1); }
const r = out.result;
const burnt = r.receipts_outcome.reduce((s, o) => s + BigInt(o.outcome.gas_burnt), BigInt(r.transaction_outcome.outcome.gas_burnt));
console.log('status:', Object.keys(r.status)[0], JSON.stringify(r.status).slice(0, 200));
console.log('gas burnt (Tgas):', Number(burnt) / 1e12);
console.log('receipt failures:', r.receipts_outcome.filter((o) => o.outcome.status.Failure).map((o) => JSON.stringify(o.outcome.status.Failure).slice(0, 300)));
