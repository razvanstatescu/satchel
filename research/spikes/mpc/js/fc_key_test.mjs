// THROWAWAY: can a function-call access key attach the 1 yocto that sign_for requires?
// Temporary FC key lives only in memory and is deleted at the end.
import crypto from 'node:crypto';
import { KeyPair, KeyPairSigner, PublicKey, actions } from 'near-api-js';
import { loadAccount, submitActions, submitCall, waitExecuted, rpc, sleep } from './nearlib.mjs';

const ME = 'satchel-spk-mpc-e9ea1a.testnet';
const SPIKE = 'spike.satchel-spk-mpc-e9ea1a.testnet';
const owner = loadAccount(ME);
const kp = KeyPair.fromRandom('ed25519');
const fcPk = kp.getPublicKey().toString();
const add = await submitActions(owner, ME, [actions.addFunctionCallAccessKey(PublicKey.from(fcPk), SPIKE, [], 250_000_000_000_000_000_000_000n)]);
await waitExecuted(add.hash, ME);
console.log('added FC key', fcPk, 'tx', add.hash);
await sleep(3000);
const fc = { accountId: ME, publicKey: fcPk, signer: KeyPairSigner.fromSecretKey(kp.toString()), nonce: null };
const payload = crypto.randomBytes(32).toString('hex');
for (const dep of ['1', '0']) {
  try {
    const { hash } = await submitCall(fc, SPIKE, 'sign_for', { path: 'satchel/1/evm', payload_hex: payload, domain_id: 0 }, '50000000000000', dep);
    const { result } = await waitExecuted(hash, ME, { timeoutMs: 60000 });
    console.log(`FC key, deposit=${dep}: tx ${hash} status`, JSON.stringify(result.status).slice(0, 300));
  } catch (e) { console.log(`FC key, deposit=${dep}: REJECTED`, String(e.message).slice(0, 400)); }
}
const del = await submitActions(owner, ME, [actions.deleteKey(PublicKey.from(fcPk))]);
await waitExecuted(del.hash, ME);
console.log('deleted FC key, tx', del.hash);
