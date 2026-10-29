// THROWAWAY Phase 0 spike helpers (web agent). Never import into the product.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { KeyPairSigner, actions, encodeTransaction, baseEncode, baseDecode, createTransaction, PublicKey } from 'near-api-js';

export const ACCOUNT = 'satchel-spk-web-e9ea1a.testnet';
export const MPC = 'v1.signer-prod.testnet';
export const RPCS = {
  fastnear: 'https://rpc.testnet.fastnear.com',
  fastnear2: 'https://test.rpc.fastnear.com',
  nearorg: 'https://rpc.testnet.near.org',
  drpc: 'https://near-testnet.drpc.org',
  intear: 'https://testnet-rpc.intea.rs',
};
export const YIELD_CONTRACT = 'requests.near-examples.testnet'; // near-examples/yield-resume: yields until someone calls respond (nobody does) -> 200-block timeout

// Load key from the legacy keychain. NEVER print it.
const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${ACCOUNT}.json`, 'utf8'));
export const signer = KeyPairSigner.fromSecretKey(cred.private_key);

let rpcId = 1;
// Raw JSON-RPC with no retries, so we observe the RPC's real behaviour.
export async function rpc(url, method, params, timeoutMs = 240_000) {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
      signal: ctl.signal,
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { nonJson: text.slice(0, 300) }; }
    return { http: res.status, ms: Date.now() - t0, body };
  } catch (e) {
    return { http: 0, ms: Date.now() - t0, body: { clientError: String(e?.name || e) } };
  } finally {
    clearTimeout(timer);
  }
}

let lastNonce = 0n;
export async function buildSignTx(url, { path = 'satchel/web-spike/evm', gasTgas = 50, target = 'mpc' } = {}) {
  const pk = await signer.getPublicKey();
  const ak = await rpc(url, 'query', {
    request_type: 'view_access_key', finality: 'final', account_id: ACCOUNT, public_key: pk.toString(),
  });
  if (!ak.body.result) throw new Error('view_access_key failed: ' + JSON.stringify(ak.body));
  const blk = await rpc(url, 'block', { finality: 'final' });
  const chainNonce = BigInt(ak.body.result.nonce);
  const nonce = (chainNonce + 1n > lastNonce + 1n) ? chainNonce + 1n : lastNonce + 1n;
  lastNonce = nonce;
  const payloadHex = randomBytes(32).toString('hex');
  let receiver, action;
  if (target === 'mpc') {
    const args = { request: { payload_v2: { Ecdsa: payloadHex }, path, domain_id: 0 } };
    receiver = MPC;
    action = actions.functionCall('sign', args, BigInt(gasTgas) * 10n ** 12n, 1n);
  } else if (target === 'yield') {
    receiver = YIELD_CONTRACT;
    action = actions.functionCall('request', { prompt: 'satchel web spike ' + payloadHex.slice(0, 8) }, 30n * 10n ** 12n, 0n);
  } else throw new Error('bad target');
  const tx = createTransaction(ACCOUNT, pk, receiver, nonce, [action], baseDecode(blk.body.result.header.hash));
  const { txHash, signedTransaction } = await signer.signTransaction(tx);
  return {
    txHash: baseEncode(txHash),
    signedB64: Buffer.from(encodeTransaction(signedTransaction)).toString('base64'),
    payloadHex,
    nonce: nonce.toString(),
    refBlock: blk.body.result.header.height,
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Summarise an RPC tx response/err for the results table.
export function summarize(r) {
  const b = r.body || {};
  if (b.error) {
    const c = b.error.cause || {};
    let pendingStatus;
    if (c.info && c.info.status) pendingStatus = `${c.info.cause}:${c.info.status.final_execution_status}`;
    else if (c.info && c.info.Pending) pendingStatus = c.info.Pending.status?.final_execution_status;
    return { http: r.http, ms: r.ms, kind: 'error', name: b.error.name, cause: c.name, causeInfo: c.info ? Object.keys(c.info) : undefined, pendingStatus };
  }
  if (b.result !== undefined) {
    const res = b.result;
    if (typeof res === 'string') return { http: r.http, ms: r.ms, kind: 'hash', value: res };
    return {
      http: r.http, ms: r.ms, kind: 'result', final_execution_status: res.final_execution_status,
      status: res.status === undefined ? undefined : (typeof res.status === 'string' ? res.status : Object.keys(res.status)[0]),
      receipts: res.receipts_outcome ? res.receipts_outcome.length : undefined,
    };
  }
  return { http: r.http, ms: r.ms, kind: 'other', body: JSON.stringify(b).slice(0, 200) };
}

// Decode the MPC signature from a final tx response.
export function extractSignature(result) {
  const sv = result?.status?.SuccessValue;
  if (sv === undefined) return { ok: false, status: result?.status };
  const json = Buffer.from(sv, 'base64').toString('utf8');
  return { ok: true, raw: json, value: json ? JSON.parse(json) : null };
}

export async function blockHeight(url, hash) {
  const r = await rpc(url, 'block', { block_id: hash });
  return r.body?.result?.header?.height;
}
