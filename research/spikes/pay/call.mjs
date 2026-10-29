// Throwaway: sign+send one function call from the pay spike account with RPC failover; prints hash, status, logs, timing.
// Usage: node call.mjs <contract> <method> '<json args>' [depositYocto] [tgas]
import { Account, JsonRpcProvider, FailoverRpcProvider, KeyPairSigner, actions } from 'near-api-js';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const ME = process.env.ME || 'satchel-spk-pay-e9ea1a.testnet';
const [contractId, methodName, argsJson = '{}', deposit = '0', tgas = '30'] = process.argv.slice(2);
const key = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${ME}.json`, 'utf8')).private_key; // never printed
const provider = new FailoverRpcProvider([
  new JsonRpcProvider({ url: 'https://near-testnet.drpc.org' }),
  new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' }),
  new JsonRpcProvider({ url: 'https://archival-rpc.testnet.fastnear.com' }),
]);
const account = new Account(ME, provider, KeyPairSigner.fromSecretKey(key));
const t0 = Date.now();
try {
  const res = await account.signAndSendTransaction({ receiverId: contractId, actions: [actions.functionCall(methodName, JSON.parse(argsJson), BigInt(tgas) * 10n ** 12n, BigInt(deposit))], waitUntil: 'FINAL', throwOnFailure: false });
  const ms = Date.now() - t0;
  const st = res.status;
  const heights = {};
  for (const r of res.receipts_outcome) if (!heights[r.block_hash]) { try { heights[r.block_hash] = (await provider.viewBlock({ blockId: r.block_hash })).header.height; } catch { heights[r.block_hash] = '?'; } }
  for (const r of res.receipts_outcome) r.block_hash = String(heights[r.block_hash]) + '';
  console.log(JSON.stringify({
    at: new Date(t0).toISOString(), ms_to_FINAL: ms, tx_hash: res.transaction.hash, final_execution_status: res.final_execution_status,
    status: st.SuccessValue !== undefined ? { SuccessValue: Buffer.from(st.SuccessValue, 'base64').toString() } : st,
    receipts: res.receipts_outcome.map(r => ({ id: r.id, executor: r.outcome.executor_id, block: r.block_hash, status: Object.keys(r.outcome.status)[0], fail: r.outcome.status.Failure ? JSON.stringify(r.outcome.status.Failure).slice(0, 300) : undefined, logs: r.outcome.logs, tokens_burnt: r.outcome.tokens_burnt, gas_burnt: r.outcome.gas_burnt })),
  }, null, 1));
} catch (e) {
  console.log('ERROR after', Date.now() - t0, 'ms:', e.type || e.name, (e.message || '').slice(0, 600));
  if (e.context) console.log('context', JSON.stringify(e.context).slice(0, 300));
}
