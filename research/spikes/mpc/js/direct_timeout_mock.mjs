// THROWAWAY: direct account -> mock.sign (timeout path) to see what a direct caller's tx outcome looks like.
import crypto from 'node:crypto';
import { loadAccount, submitCall, waitExecuted, summarize, tgas } from './nearlib.mjs';
const ME = 'satchel-spk-mpc-e9ea1a.testnet';
const a = loadAccount(ME);
const { hash, tSubmit } = await submitCall(a, 'mock.satchel-spk-mpc-e9ea1a.testnet', 'sign', { request: { path: 'timeout/direct', payload_v2: { Ecdsa: crypto.randomBytes(32).toString('hex') }, domain_id: 0 } }, '15000000000000', '1');
const { result, tDone } = await waitExecuted(hash, ME);
const s = await summarize(result);
console.log(JSON.stringify({ hash, latencyMs: tDone - tSubmit, txStatus: result.status, receipts: s.receipts.map((r) => `${r.method}@${r.height}:${Object.keys(r.status)[0]}`) }));
