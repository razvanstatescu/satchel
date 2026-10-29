// THROWAWAY Phase 0 spike B: contract-initiated MPC sign via spike.satchel-spk-mpc-e9ea1a.testnet `sign_for`.
// usage: node sign_contract.mjs <label> <n> <concurrency> <domain> <totalGas> [overridesJson] [path] [edLen]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadAccount, submitCall, waitExecuted, summarize, tgas, sleep } from './nearlib.mjs';
import { view } from './derive.mjs';
import { verifySecp, verifyEd } from './verify.mjs';

const ME = 'satchel-spk-mpc-e9ea1a.testnet';
const SPIKE = process.env.SPIKE ?? 'spike.satchel-spk-mpc-e9ea1a.testnet';
const [label = 'B', n = '1', conc = '1', domain = '0', totalGas = '100000000000000', overrides = '{}', pathTpl = 'satchel/1/evm', edLen = '32', userDeposit = '1'] = process.argv.slice(2);
const d = Number(domain);
const account = loadAccount(ME);
const root = await view('public_key', { domain_id: d === 1 ? 1 : 0 });
fs.mkdirSync('../data', { recursive: true });
const out = fs.createWriteStream('../data/spikeB.jsonl', { flags: 'a' });

let submitChain = Promise.resolve();
async function one(i) {
  const path = pathTpl.replaceAll('{i}', String(i + 1));
  const payloadHex = process.env.PAYLOAD ?? crypto.randomBytes(d === 1 ? Number(edLen) : 32).toString('hex');
  const args = { path, payload_hex: payloadHex, domain_id: d, ...JSON.parse(overrides) };
  const rec = { label, i, ts: new Date().toISOString(), domain: d, totalGas, overrides: JSON.parse(overrides), path, payloadLen: payloadHex.length / 2 };
  try {
    // serialize submissions so nonces reach the chain in order (concurrency is on-chain, not in the sender)
    const p = submitChain.then(() => submitCall(account, SPIKE, 'sign_for', args, totalGas, userDeposit));
    submitChain = p.catch(() => {});
    const { hash, tSubmit } = await p;
    rec.hash = hash;
    const { result, tDone, polls } = await waitExecuted(hash, ME);
    const s = await summarize(result);
    rec.latencyMs = tDone - tSubmit; rec.polls = polls; rec.txHeight = s.txHeight;
    rec.receipts = s.receipts.map((r) => ({ method: r.method, executor: r.executor, h: r.height, burnt: tgas(r.gas_burnt), prepaid: r.prepaid_gas ? tgas(r.prepaid_gas) : null,
      status: Object.keys(r.status)[0], fail: r.status.Failure ? JSON.stringify(r.status.Failure).slice(0, 500) : undefined, logs: r.logs.map((l) => l.slice(0, 400)) }));
    rec.totalBurntTgas = tgas(s.totalBurnt); rec.totalTokensBurntNear = (Number(s.totalTokens) / 1e24).toFixed(6);
    const hs = s.receipts.map((r) => r.height).filter((x) => x !== undefined);
    rec.blocksTxToLastReceipt = Math.max(...hs) - s.txHeight;
    const signR = s.receipts.find((r) => r.method === 'sign');
    const cbR = s.receipts.find((r) => r.method?.startsWith('on_signed'));
    rec.blocksSignToCallback = signR && cbR ? cbR.height - signR.height : null;
    rec.value = s.value; rec.failure = s.failure ? JSON.stringify(s.failure).slice(0, 600) : null;
    let v = s.value;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch {} } // raw callback returns JSON string
    if (v?.scheme === 'Secp256k1') rec.verify = verifySecp(v, payloadHex, root, SPIKE, path);
    if (v?.scheme === 'Ed25519') rec.verify = verifyEd(v, payloadHex, root, SPIKE, path);
    rec.ok = !!(rec.verify && (rec.verify.verifies) && (rec.verify.recoveredMatches ?? true));
  } catch (e) { rec.error = String(e.message ?? e).slice(0, 800); }
  out.write(JSON.stringify(rec) + '\n');
  const brief = { label, i, hash: rec.hash, ok: rec.ok, latencyMs: rec.latencyMs, blocks: rec.blocksTxToLastReceipt, signToCb: rec.blocksSignToCallback, totalBurntTgas: rec.totalBurntTgas,
    perReceipt: rec.receipts?.map((r) => `${r.method}:${r.burnt}/${r.prepaid ?? '-'}:${r.status}`).join(' | '), value: rec.verify ? undefined : rec.value, failure: rec.failure, error: rec.error,
    lowS: rec.verify?.lowS, recIdEqBigRParity: rec.verify?.bigRParityEqualsRecId };
  console.log(JSON.stringify(brief));
  if (process.env.SHOW_RECEIPTS) console.log(JSON.stringify(rec.receipts, null, 1));
  return rec;
}

const N = Number(n), C = Number(conc);
const all = [];
for (let i = 0; i < N; i += C) {
  const batch = [];
  for (let j = i; j < Math.min(N, i + C); j++) { batch.push(one(j)); await sleep(50); }
  all.push(...(await Promise.all(batch)));
}
await sleep(2500);
const stats = await view('stats', {}, SPIKE);
console.log('spike stats [pending, ok, err, mpc_gas_tgas, cb_gas_tgas] =', JSON.stringify(stats));
out.write(JSON.stringify({ label, statsAfter: stats, ts: new Date().toISOString() }) + '\n');
out.end();
