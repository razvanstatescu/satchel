// THROWAWAY: does one blocking send_tx (EXECUTED_OPTIMISTIC / FINAL) return the MPC result, or time out?
import crypto from 'node:crypto';
import { PublicKey, actions, createTransaction, baseDecode } from 'near-api-js';
import { loadAccount, rpc } from './nearlib.mjs';
const ME = 'satchel-spk-mpc-e9ea1a.testnet', SPIKE = 'spike2.satchel-spk-mpc-e9ea1a.testnet';
const a = loadAccount(ME);
for (const waitUntil of ['EXECUTED_OPTIMISTIC']) {
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: ME, public_key: a.publicKey });
  const tx = createTransaction(ME, PublicKey.from(a.publicKey), SPIKE, BigInt(ak.result.nonce) + 1n,
    [actions.functionCall('sign_for', { path: 'timeout/blocking', payload_hex: crypto.randomBytes(32).toString('hex'), domain_id: 0 }, 50_000_000_000_000n, 1n)], baseDecode(ak.result.block_hash));
  const { signedTransaction } = await a.signer.signTransaction(tx);
  const t0 = Date.now();
  const r = await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: waitUntil });
  const dt = (Date.now() - t0) / 1000;
  console.log(waitUntil, `${dt.toFixed(1)}s via ${r._url}`, r.error ? 'ERROR ' + JSON.stringify(r.error).slice(0, 300) : `final_execution_status=${r.result.final_execution_status} value=${Buffer.from(r.result.status.SuccessValue ?? '', 'base64').toString().slice(0, 80)}`);
}
