// THROWAWAY Phase 0 spike (web agent): submit an MPC `sign` tx with a given RPC submission mode,
// observe when the submit call returns (and with what), while a concurrent poller watches
// EXPERIMENTAL_tx_status(wait_until=NONE) to see the real progress of the receipt chain.
// Usage: node sign-modes.mjs <fastnear|nearorg> <mode>
//   mode: send_tx:NONE | send_tx:INCLUDED | send_tx:INCLUDED_FINAL | send_tx:EXECUTED_OPTIMISTIC |
//         send_tx:EXECUTED | send_tx:FINAL | broadcast_tx_commit | broadcast_tx_async
import { appendFileSync } from 'node:fs';
import { RPCS, ACCOUNT, MPC, rpc, buildSignTx, summarize, extractSignature, blockHeight, sleep } from './lib.mjs';

const [rpcName = 'fastnear', mode = 'send_tx:NONE', target = 'mpc', pollName = 'drpc', pollEveryMs = '1500'] = process.argv.slice(2);
const url = RPCS[rpcName];
const pollUrl = RPCS[pollName];
if (!url || !pollUrl) throw new Error('unknown rpc ' + rpcName + '/' + pollName);
const MAX_MS = target === 'yield' ? 260_000 : 200_000;

// build on the poll RPC (saves quota on the RPC under test); only the submit hits the RPC under test
const tx = await buildSignTx(pollUrl, { target });
console.log(`[${rpcName}] target=${target} mode=${mode} poll=${pollName} tx=${tx.txHash} nonce=${tx.nonce} refBlock=${tx.refBlock}`);

let submitParams, submitMethod;
if (mode.startsWith('send_tx:')) {
  submitMethod = 'send_tx';
  submitParams = { signed_tx_base64: tx.signedB64, wait_until: mode.split(':')[1] };
} else if (mode === 'broadcast_tx_commit' || mode === 'broadcast_tx_async') {
  submitMethod = mode;
  submitParams = [tx.signedB64];
} else throw new Error('bad mode');

const t0 = Date.now();
const seen = {}; // first ms at which each final_execution_status was observed by the poller
const pollLog = [];
let finalResp = null;
let pollDone = false;

const poller = (async () => {
  await sleep(300);
  while (Date.now() - t0 < MAX_MS) {
    const r = await rpc(pollUrl, 'EXPERIMENTAL_tx_status', { tx_hash: tx.txHash, sender_account_id: ACCOUNT, wait_until: 'NONE' }, 20_000);
    const ms = Date.now() - t0;
    const s = summarize(r);
    const key = s.kind === 'error' ? `ERR:${s.name}/${s.cause}` : `${s.final_execution_status}|${s.status}`;
    if (!(key in seen)) { seen[key] = ms; const { ms: rtt, ...rest } = s; pollLog.push({ t: ms, rtt, ...rest }); }
    if (s.kind === 'result' && s.final_execution_status === 'FINAL') { finalResp = r.body.result; break; }
    await sleep(Number(pollEveryMs));
  }
  pollDone = true;
})();

const sub = await rpc(url, submitMethod, submitParams, MAX_MS);
const subSummary = summarize(sub);
console.log('submit returned:', JSON.stringify(subSummary));
if (sub.body?.error) console.log('submit error body:', JSON.stringify(sub.body.error).slice(0, 1500));

await poller;
let sig = null, heights = {};
if (finalResp) {
  sig = extractSignature(finalResp);
  heights.txIncluded = await blockHeight(pollUrl, finalResp.transaction_outcome.block_hash);
  // receipt that carried the signature back (MPC executor, non-empty SuccessValue)
  const ro = finalResp.receipts_outcome;
  const sigReceipt = [...ro].reverse().find((o) => o.outcome.executor_id === MPC && o.outcome.status?.SuccessValue);
  if (sigReceipt) heights.sigReceipt = await blockHeight(pollUrl, sigReceipt.block_hash);
  heights.receipts = [];
  for (const o of ro) heights.receipts.push({ id: o.id, h: await blockHeight(pollUrl, o.block_hash), exec: o.outcome.executor_id, status: Object.keys(o.outcome.status)[0], gas_burnt: o.outcome.gas_burnt, logs: o.outcome.logs.length });
  heights.maxReceipt = Math.max(...heights.receipts.map((x) => x.h));
  heights.totalGasBurnt = finalResp.transaction_outcome.outcome.gas_burnt + ro.reduce((a, o) => a + o.outcome.gas_burnt, 0);
}
const rec = {
  at: new Date(t0).toISOString(), rpc: rpcName, target, pollRpc: pollName, mode, tx: tx.txHash, refBlock: tx.refBlock,
  submit: subSummary, poll: pollLog, finalSeenMs: finalResp ? Object.entries(seen).find(([k]) => k.startsWith('FINAL'))?.[1] : null,
  heights, signature: sig?.value ?? sig,
};
console.log(JSON.stringify(rec, null, 1));
appendFileSync(new URL('./results.jsonl', import.meta.url), JSON.stringify(rec) + '\n');
