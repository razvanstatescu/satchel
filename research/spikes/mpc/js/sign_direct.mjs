// THROWAWAY Phase 0 spike A: call v1.signer-prod.testnet `sign` directly from an account.
// usage: node sign_direct.mjs <domain 0|1> <gas units> <deposit yocto> <n> [eddsaLen=32] [path=spike/direct] [label]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadAccount, submitCall, waitExecuted, summarize, tgas } from './nearlib.mjs';
import { view } from './derive.mjs';
import { verifySecp, verifyEd } from './verify.mjs';

const ME = 'satchel-spk-mpc-e9ea1a.testnet';
const MPC = 'v1.signer-prod.testnet';
const [domain = '0', gas = '30000000000000', deposit = '1', n = '1', edLen = '32', path = 'spike/direct', label = 'A'] = process.argv.slice(2);
const d = Number(domain);
const account = loadAccount(ME);
const root = await view('public_key', { domain_id: d });
fs.mkdirSync('../data', { recursive: true });
const out = fs.createWriteStream(`../data/spikeA.jsonl`, { flags: 'a' });

for (let i = 0; i < Number(n); i++) {
  const payloadHex = crypto.randomBytes(d === 0 ? 32 : Number(edLen)).toString('hex');
  const request = { path, payload_v2: d === 0 ? { Ecdsa: payloadHex } : { Eddsa: payloadHex }, domain_id: d };
  const rec = { label, ts: new Date().toISOString(), domain: d, gas, deposit, path, payloadLen: payloadHex.length / 2 };
  try {
    const { hash, tSubmit } = await submitCall(account, MPC, 'sign', { request }, gas, deposit);
    rec.hash = hash;
    const { result, tDone, polls } = await waitExecuted(hash, ME);
    const s = await summarize(result);
    rec.latencyMs = tDone - tSubmit; rec.polls = polls;
    rec.txHeight = s.txHeight;
    rec.receipts = s.receipts.map((r) => ({ method: r.method, executor: r.executor, h: r.height, gas_burnt_tgas: tgas(r.gas_burnt), prepaid_tgas: r.prepaid_gas ? tgas(r.prepaid_gas) : null, status: Object.keys(r.status)[0], fail: r.status.Failure ? JSON.stringify(r.status.Failure).slice(0, 400) : undefined, logs: r.logs.map((l) => l.slice(0, 200)) }));
    rec.totalBurntTgas = tgas(s.totalBurnt); rec.totalTokensBurntNear = (Number(s.totalTokens) / 1e24).toFixed(6);
    const heights = s.receipts.map((r) => r.height);
    rec.blocksTxToLastReceipt = Math.max(...heights) - s.txHeight;
    rec.value = s.value; rec.failure = s.failure ? JSON.stringify(s.failure).slice(0, 600) : null;
    if (s.value && s.value.scheme === 'Secp256k1') rec.verify = verifySecp(s.value, payloadHex, root, ME, path);
    if (s.value && s.value.scheme === 'Ed25519') rec.verify = verifyEd(s.value, payloadHex, root, ME, path);
  } catch (e) {
    rec.error = String(e.message ?? e).slice(0, 800);
  }
  out.write(JSON.stringify(rec) + '\n');
  console.log(JSON.stringify({ label: rec.label, hash: rec.hash, latencyMs: rec.latencyMs, blocks: rec.blocksTxToLastReceipt, totalBurntTgas: rec.totalBurntTgas, verify: rec.verify, failure: rec.failure, error: rec.error }));
  if (process.env.SHOW_RECEIPTS) console.log(JSON.stringify(rec.receipts, null, 1));
}
out.end();
