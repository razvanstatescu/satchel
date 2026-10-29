// Throwaway: create sub-account(s) of the pay spike account (same public key as parent), optionally deploy a wasm.
// Usage: node create_sub.mjs <prefix> <nearAmount> [wasmPath]
import { Account, JsonRpcProvider, FailoverRpcProvider, KeyPairSigner, KeyPair, actions, nearToYocto } from 'near-api-js';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const ME = 'satchel-spk-pay-e9ea1a.testnet';
const [prefix, near, wasm] = process.argv.slice(2);
const sk = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${ME}.json`, 'utf8')).private_key;
const pk = KeyPair.fromString(sk).getPublicKey();
const provider = new FailoverRpcProvider([new JsonRpcProvider({ url: 'https://near-testnet.drpc.org' }), new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' })]);
const me = new Account(ME, provider, KeyPairSigner.fromSecretKey(sk));
const sub = `${prefix}.${ME}`;
const acts = [actions.createAccount(), actions.transfer(nearToYocto(near)), actions.addFullAccessKey(pk)];
if (wasm) acts.push(actions.deployContract(readFileSync(wasm)));
const t0 = Date.now();
const res = await me.signAndSendTransaction({ receiverId: sub, actions: acts, waitUntil: 'FINAL' });
console.log(JSON.stringify({ sub, tx_hash: res.transaction.hash, ms: Date.now() - t0, status: res.status, receipts: res.receipts_outcome.map(r => ({ ex: r.outcome.executor_id, st: Object.keys(r.outcome.status)[0], fail: r.outcome.status.Failure ? JSON.stringify(r.outcome.status.Failure).slice(0, 300) : undefined })) }));
