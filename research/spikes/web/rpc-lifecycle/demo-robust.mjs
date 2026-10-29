// THROWAWAY Phase 0 spike (web agent): the robust pattern end to end.
//   1. build + sign locally (hash known BEFORE submit) -> persist {hash, sender} (here: a JSON file; in the app: localStorage)
//   2. submit with send_tx wait_until=INCLUDED (cheap, returns in ~1 s; falls back to NONE on another RPC)
//   3. trackTx(): long-poll EXPERIMENTAL_tx_status until SuccessValue/Failure, emitting UI stages
//   4. decode result.status.SuccessValue (base64 JSON) -> MPC signature
// Usage: node demo-robust.mjs [mpc|yield] [--kill-after-ms N]   (resume: node demo-robust.mjs --resume)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { RPCS, ACCOUNT, rpc, buildSignTx } from './lib.mjs';
import { trackTx } from './track-tx.mjs';

const PENDING_FILE = new URL('./pending-tx.json', import.meta.url);
const args = process.argv.slice(2);
const providers = [RPCS.fastnear, RPCS.drpc];
const t0 = Date.now();
const log = (...a) => console.log(`[+${String(Date.now() - t0).padStart(6)}ms]`, ...a);

let pending;
if (args.includes('--resume')) {
  pending = JSON.parse(readFileSync(PENDING_FILE, 'utf8'));
  log('resuming persisted tx', pending.txHash, 'submitted at', new Date(pending.submittedAt).toISOString());
} else {
  const target = args[0] === 'yield' ? 'yield' : 'mpc';
  const tx = await buildSignTx(RPCS.drpc, { target });
  pending = { txHash: tx.txHash, senderId: ACCOUNT, target, submittedAt: Date.now() };
  writeFileSync(PENDING_FILE, JSON.stringify(pending)); // persist BEFORE submitting
  log('stage: preparing -> signed locally; hash known before broadcast:', tx.txHash);
  let r = await rpc(RPCS.fastnear, 'send_tx', { signed_tx_base64: tx.signedB64, wait_until: 'INCLUDED' }, 20_000);
  log('send_tx INCLUDED @fastnear ->', r.http, r.body?.result?.final_execution_status ?? r.body?.error?.cause?.name ?? JSON.stringify(r.body).slice(0, 120));
  if (!r.body?.result) {
    r = await rpc(RPCS.drpc, 'send_tx', { signed_tx_base64: tx.signedB64, wait_until: 'NONE' }, 20_000); // idempotent re-send
    log('fallback send_tx NONE @drpc ->', r.http, JSON.stringify(r.body).slice(0, 120));
  }
}

const killIdx = args.indexOf('--kill-after-ms');
if (killIdx >= 0) setTimeout(() => { log('simulated page reload: process exits; pending tx stays in', PENDING_FILE.pathname); process.exit(0); }, Number(args[killIdx + 1]));

const stats = {};
const res = await trackTx({
  txHash: pending.txHash, senderId: pending.senderId, rpcUrls: providers, stats,
  onStage: (e) => log('stage:', e.stage, JSON.stringify(e.detail ?? {})),
});
log('result:', JSON.stringify({ ok: res.ok, value: res.value, failure: res.failure, lost: res.lost, deadline: res.deadline, rpc: res.rpc }));
if (res.outcome) {
  const o = res.outcome;
  log('JSON paths: result.final_execution_status =', o.final_execution_status,
    '| result.transaction.hash =', o.transaction?.hash,
    '| result.transaction_outcome.block_hash =', o.transaction_outcome?.block_hash,
    '| result.status.SuccessValue (base64) =', String(o.status?.SuccessValue).slice(0, 40) + '...',
    '| receipts_outcome.length =', o.receipts_outcome?.length);
}
log('total since original submit:', Date.now() - pending.submittedAt, 'ms; tracker RPC requests:', stats.requests);
