// THROWAWAY Phase 0 spike: probe `sign` with malformed/edge-case requests, record the on-chain error.
// usage: node sign_probe.mjs [onlyCaseName]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadAccount, submitCall, waitExecuted, summarize, tgas } from './nearlib.mjs';
import { view } from './derive.mjs';
import { verifySecp, verifyEd } from './verify.mjs';

const ME = 'satchel-spk-mpc-e9ea1a.testnet';
const MPC = 'v1.signer-prod.testnet';
const G = '30000000000000';
const rnd = (n) => crypto.randomBytes(n).toString('hex');
const N_HEX = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'; // secp256k1 group order n
const P_MINUS_1 = 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2e';

const cases = {
  ecdsa_on_domain1: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(32) }, domain_id: 1 } },
  eddsa_on_domain0: { request: { path: 'probe', payload_v2: { Eddsa: rnd(32) }, domain_id: 0 } },
  domain2_ckd: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(32) }, domain_id: 2 } },
  domain3_foreigntx: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(32) }, domain_id: 3 } },
  domain99: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(32) }, domain_id: 99 } },
  ecdsa_31_bytes: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(31) }, domain_id: 0 } },
  ecdsa_0x_prefix: { request: { path: 'probe', payload_v2: { Ecdsa: '0x' + rnd(32) }, domain_id: 0 } },
  ecdsa_eq_n: { request: { path: 'probe', payload_v2: { Ecdsa: N_HEX }, domain_id: 0 } },
  ecdsa_p_minus_1: { request: { path: 'probe', payload_v2: { Ecdsa: P_MINUS_1 }, domain_id: 0 } },
  ecdsa_uppercase_hex: { request: { path: 'probe', payload_v2: { Ecdsa: rnd(32).toUpperCase() }, domain_id: 0 }, expectSig: true },
  eddsa_1233_bytes: { request: { path: 'probe', payload_v2: { Eddsa: rnd(1233) }, domain_id: 1 }, gas: '100000000000000' },
  missing_request_wrapper: { path: 'probe', payload_v2: { Ecdsa: rnd(32) }, domain_id: 0 },
  legacy_payload_array: { request: { path: 'probe', payload: [...crypto.randomBytes(32)], key_version: 0 }, expectSig: true },
  eddsa_empty: { request: { path: 'probe', payload_v2: { Eddsa: '' }, domain_id: 1 }, expectSig: true },
  eddsa_1_byte: { request: { path: 'probe', payload_v2: { Eddsa: rnd(1) }, domain_id: 1 }, expectSig: true },
  eddsa_1232_bytes: { request: { path: 'probe', payload_v2: { Eddsa: rnd(1232) }, domain_id: 1 }, gas: '100000000000000', expectSig: true },
  ecdsa_zero_payload: { request: { path: 'probe', payload_v2: { Ecdsa: '00'.repeat(32) }, domain_id: 0 }, expectSig: true },
  long_path_1000: { request: { path: 'p'.repeat(1000), payload_v2: { Ecdsa: rnd(32) }, domain_id: 0 }, expectSig: true },
};

const only = process.argv[2];
const roots = { 0: await view('public_key', { domain_id: 0 }), 1: await view('public_key', { domain_id: 1 }) };
const account = loadAccount(ME);
fs.mkdirSync('../data', { recursive: true });
const out = fs.createWriteStream('../data/probes.jsonl', { flags: 'a' });
for (const [name, c] of Object.entries(cases)) {
  if (only && !only.split(',').includes(name)) continue;
  const args = { ...c }; const gas = args.gas ?? G; delete args.gas; delete args.expectSig;
  const rec = { name, ts: new Date().toISOString(), gas };
  try {
    const { hash, tSubmit } = await submitCall(account, MPC, 'sign', args, gas, '1');
    rec.hash = hash;
    const { result, tDone } = await waitExecuted(hash, ME);
    const s = await summarize(result);
    rec.latencyMs = tDone - tSubmit;
    rec.totalBurntTgas = tgas(s.totalBurnt);
    rec.signReceiptBurntTgas = s.receipts[0] ? tgas(s.receipts[0].gas_burnt) : null;
    rec.failure = s.failure ? JSON.stringify(s.failure).slice(0, 700) : null;
    rec.value = s.value;
    const req = args.request;
    if (s.value?.scheme === 'Secp256k1') rec.verify = verifySecp(s.value, req.payload_v2?.Ecdsa ?? Buffer.from(req.payload).toString('hex'), roots[0], ME, req.path);
    if (s.value?.scheme === 'Ed25519') rec.verify = verifyEd(s.value, req.payload_v2.Eddsa, roots[1], ME, req.path);
  } catch (e) { rec.error = String(e.message ?? e).slice(0, 700); }
  out.write(JSON.stringify(rec) + '\n');
  console.log(JSON.stringify({ name, hash: rec.hash, latencyMs: rec.latencyMs, burnt: rec.totalBurntTgas, signBurnt: rec.signReceiptBurntTgas, failure: rec.failure, verify: rec.verify, error: rec.error }));
}
out.end();
