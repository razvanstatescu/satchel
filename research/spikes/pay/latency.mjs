// Throwaway: deploy receiver_v2 to recv.<pay>, call emit(), then measure when indexers show it.
import { Account, JsonRpcProvider, FailoverRpcProvider, KeyPairSigner, actions } from 'near-api-js';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const ME = 'satchel-spk-pay-e9ea1a.testnet', RECV = `recv.${ME}`, SELLER = `seller.${ME}`;
const sk = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${ME}.json`, 'utf8')).private_key;
const provider = new FailoverRpcProvider([new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' }), new JsonRpcProvider({ url: 'https://near-testnet.drpc.org' })]);
const signer = KeyPairSigner.fromSecretKey(sk);
const recv = new Account(RECV, provider, signer), me = new Account(ME, provider, signer);
if (process.argv[2] === 'deploy') {
  const d = await recv.signAndSendTransaction({ receiverId: RECV, actions: [actions.deployContract(readFileSync('wat/receiver_v2.wasm'))], waitUntil: 'FINAL' });
  console.log('deploy tx', d.transaction.hash, JSON.stringify(d.status));
}
const t0 = Date.now();
const res = await me.signAndSendTransaction({ receiverId: RECV, actions: [actions.functionCall('emit', {}, 10n ** 13n, 0n)], waitUntil: 'FINAL', throwOnFailure: false });
const tFinal = Date.now();
const hash = res.transaction.hash;
console.log('emit tx', hash, 'ms_to_FINAL', tFinal - t0, 'logs', JSON.stringify(res.receipts_outcome.flatMap(r => r.outcome.logs).map(l => l.slice(0, 70))));
const post = (u, b) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const seen = {};
const checks = {
  txapi_receiver: async () => (await post('https://tx.test.fastnear.com/v0/account', { account_id: RECV, limit: 5, desc: true })).account_txs?.some(t => t.transaction_hash === hash),
  txapi_seller_event_log: async () => (await post('https://tx.test.fastnear.com/v0/account', { account_id: SELLER, limit: 5, desc: true, is_event_log: true })).account_txs?.some(t => t.transaction_hash === hash),
  fastnear_nft_index_seller: async () => JSON.stringify(await fetch(`https://test.api.fastnear.com/v1/account/${SELLER}/nft`).then(r => r.json())).includes(RECV),
  ...(process.env.SKIP_NB ? {} : { nearblocks_tx: async () => ((await fetch(`https://api-testnet.nearblocks.io/v1/txns/${hash}`).then(r => r.json())).txns || []).length > 0 }),
};
while (Date.now() - tFinal < 240e3 && Object.keys(seen).length < Object.keys(checks).length) {
  for (const [k, f] of Object.entries(checks)) if (!seen[k]) { try { if (await f()) { seen[k] = Date.now() - tFinal; console.log(`  ${k}: visible ${seen[k]} ms after FINAL`); } } catch (e) { /* transient */ } }
  await new Promise(r => setTimeout(r, k_interval()));
}
function k_interval() { return 3000; }
for (const k of Object.keys(checks)) if (!seen[k]) console.log(`  ${k}: NOT visible within 240 s`);
console.log('fastnear nft index for seller:', JSON.stringify(await fetch(`https://test.api.fastnear.com/v1/account/${SELLER}/nft`).then(r => r.json())));
