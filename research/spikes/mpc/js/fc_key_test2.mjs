// THROWAWAY: same as fc_key_test.mjs but sends with wait_until INCLUDED to surface the validation error.
import crypto from 'node:crypto';
import bs58 from 'bs58';
import { KeyPair, KeyPairSigner, PublicKey, actions, createTransaction, baseDecode } from 'near-api-js';
import { loadAccount, submitActions, waitExecuted, rpc, sleep } from './nearlib.mjs';
const ME = 'satchel-spk-mpc-e9ea1a.testnet', SPIKE = 'spike.satchel-spk-mpc-e9ea1a.testnet';
const owner = loadAccount(ME);
const kp = KeyPair.fromRandom('ed25519'); const fcPk = kp.getPublicKey().toString();
const add = await submitActions(owner, ME, [actions.addFunctionCallAccessKey(PublicKey.from(fcPk), SPIKE, [], 250_000_000_000_000_000_000_000n)]);
await waitExecuted(add.hash, ME); await sleep(3000);
const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: ME, public_key: fcPk });
const tx = createTransaction(ME, PublicKey.from(fcPk), SPIKE, BigInt(ak.result.nonce) + 1n,
  [actions.functionCall('sign_for', { path: 'satchel/1/evm', payload_hex: crypto.randomBytes(32).toString('hex'), domain_id: 0 }, 50_000_000_000_000n, 1n)], baseDecode(ak.result.block_hash));
const { signedTransaction } = await KeyPairSigner.fromSecretKey(kp.toString()).signTransaction(tx);
const r = await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: 'INCLUDED' });
console.log('FC key + 1 yocto, send_tx(wait_until=INCLUDED) ->', JSON.stringify(r.error ?? r.result).slice(0, 600));
const del = await submitActions(owner, ME, [actions.deleteKey(PublicKey.from(fcPk))]); await waitExecuted(del.hash, ME);
console.log('deleted FC key', fcPk);
