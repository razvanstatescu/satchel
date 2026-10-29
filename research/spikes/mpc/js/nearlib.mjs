// THROWAWAY Phase 0 spike helpers: sign+broadcast a function call, poll until executed,
// and summarize receipts (gas per receipt, block heights, logs, final value).
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import bs58 from 'bs58';
import { KeyPairSigner, PublicKey, actions, createTransaction, baseDecode } from 'near-api-js';

export const RPCS = (process.env.RPCS ?? 'https://rpc.testnet.fastnear.com,https://near-testnet.drpc.org,https://archival-rpc.testnet.fastnear.com').split(',');
let rpcIdx = 0;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const rpcStats = { calls: 0, rateLimited: 0, byUrl: {} };
export async function rpc(method, params, { tries = 12 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const url = RPCS[rpcIdx % RPCS.length];
    rpcStats.calls++;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      let j = null; try { j = await res.json(); } catch {}
      // fastnear/near.org signal rate limits as HTTP 429 and/or JSON-RPC error code -429
      if (res.status === 429 || res.status >= 500 || j?.error?.code === -429 || !j) {
        rpcStats.rateLimited++; rpcStats.byUrl[url] = (rpcStats.byUrl[url] ?? 0) + 1;
        lastErr = new Error(`HTTP ${res.status} ${JSON.stringify(j?.error ?? '').slice(0, 120)} from ${url}`);
        rpcIdx++; await sleep(Math.min(400 * (i + 1), 4000)); continue;
      }
      return { ...j, _url: url };
    } catch (e) { lastErr = e; rpcIdx++; await sleep(300 * (i + 1)); }
  }
  throw lastErr;
}

export function loadAccount(accountId) {
  const f = `${os.homedir()}/.near-credentials/testnet/${accountId}.json`;
  const { private_key, public_key } = JSON.parse(fs.readFileSync(f, 'utf8'));
  return { accountId, publicKey: public_key, signer: KeyPairSigner.fromSecretKey(private_key), nonce: null };
}

/** Build + sign a tx with arbitrary actions, broadcast with wait_until NONE. */
export async function submitActions(account, receiverId, actionList) {
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: account.accountId, public_key: account.publicKey });
  if (ak.error || ak.result?.error) throw new Error('view_access_key: ' + JSON.stringify(ak.error ?? ak.result.error));
  const chainNonce = BigInt(ak.result.nonce);
  account.nonce = account.nonce === null || account.nonce < chainNonce ? chainNonce + 1n : account.nonce + 1n;
  const tx = createTransaction(account.accountId, PublicKey.from(account.publicKey), receiverId, account.nonce, actionList, baseDecode(ak.result.block_hash));
  const { txHash, signedTransaction } = await account.signer.signTransaction(tx);
  const hash = bs58.encode(txHash);
  const tSubmit = Date.now();
  const r = await rpc('send_tx', { signed_tx_base64: Buffer.from(signedTransaction.encode()).toString('base64'), wait_until: 'NONE' });
  if (r.error) throw new Error('send_tx error: ' + JSON.stringify(r.error));
  return { hash, tSubmit };
}

/** Build + sign a single FunctionCall tx (nonce/blockhash via our retrying rpc), broadcast with wait_until NONE. */
export async function submitCall(account, receiverId, method, args, gas, deposit) {
  const ak = await rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: account.accountId, public_key: account.publicKey });
  if (ak.error || ak.result?.error) throw new Error('view_access_key: ' + JSON.stringify(ak.error ?? ak.result.error));
  // local nonce counter so concurrent submissions from one key never collide
  const chainNonce = BigInt(ak.result.nonce);
  account.nonce = account.nonce === null || account.nonce < chainNonce ? chainNonce + 1n : account.nonce + 1n;
  const tx = createTransaction(account.accountId, PublicKey.from(account.publicKey), receiverId, account.nonce,
    [actions.functionCall(method, args, BigInt(gas), BigInt(deposit))], baseDecode(ak.result.block_hash));
  const { txHash, signedTransaction } = await account.signer.signTransaction(tx);
  const hash = bs58.encode(txHash);
  const b64 = Buffer.from(signedTransaction.encode()).toString('base64');
  const tSubmit = Date.now();
  const r = await rpc('send_tx', { signed_tx_base64: b64, wait_until: 'NONE' });
  if (r.error) throw new Error('send_tx error: ' + JSON.stringify(r.error));
  return { hash, tSubmit };
}

/** Poll until the tx and all its receipts are executed (EXECUTED_OPTIMISTIC). */
export async function waitExecuted(hash, senderId, { timeoutMs = 400_000 } = {}) {
  const t0 = Date.now();
  let polls = 0;
  while (Date.now() - t0 < timeoutMs) {
    polls++;
    const r = await rpc('EXPERIMENTAL_tx_status', { tx_hash: hash, sender_account_id: senderId, wait_until: 'EXECUTED_OPTIMISTIC' });
    if (r.result && r.result.status && (('SuccessValue' in r.result.status) || ('Failure' in r.result.status))) {
      return { result: r.result, tDone: Date.now(), polls };
    }
    // TIMEOUT_ERROR / UNKNOWN_TRANSACTION while pending -> keep polling
    await sleep(250);
  }
  throw new Error('waitExecuted timeout for ' + hash);
}

const blockCache = new Map();
export async function blockHeight(blockHash) {
  if (blockCache.has(blockHash)) return blockCache.get(blockHash);
  const r = await rpc('block', { block_id: blockHash });
  let h = r.result?.header?.height;
  if (h === undefined) { await sleep(500); const r2 = await rpc('block', { block_id: blockHash }); h = r2.result?.header?.height; }
  blockCache.set(blockHash, h);
  return h;
}

/** Summarize a final tx result. */
export async function summarize(result) {
  const txo = result.transaction_outcome;
  const receipts = [];
  for (const ro of result.receipts_outcome) {
    const o = ro.outcome;
    receipts.push({
      id: ro.id, executor: o.executor_id, gas_burnt: o.gas_burnt, tokens_burnt: o.tokens_burnt,
      height: await blockHeight(ro.block_hash), status: o.status, logs: o.logs,
    });
  }
  // map receipt id -> receipt (function call method names come from result.receipts when available)
  const methods = {};
  for (const r of result.receipts ?? []) {
    const fc = r.receipt?.Action?.actions?.find((a) => a.FunctionCall);
    methods[r.receipt_id] = fc ? fc.FunctionCall.method_name : (r.receipt?.Action ? 'transfer/other' : 'data');
    const rr = receipts.find((x) => x.id === r.receipt_id);
    if (rr) { rr.method = methods[r.receipt_id]; rr.prepaid_gas = fc?.FunctionCall?.gas; rr.predecessor = r.predecessor_id; rr.deposit = fc?.FunctionCall?.deposit; }
  }
  const txHeight = await blockHeight(txo.block_hash);
  const totalBurnt = BigInt(txo.outcome.gas_burnt) + receipts.reduce((a, r) => a + BigInt(r.gas_burnt), 0n);
  const totalTokens = BigInt(txo.outcome.tokens_burnt) + receipts.reduce((a, r) => a + BigInt(r.tokens_burnt), 0n);
  let value = null;
  if (result.status.SuccessValue !== undefined) {
    const s = Buffer.from(result.status.SuccessValue, 'base64').toString();
    try { value = JSON.parse(s); } catch { value = s; }
  }
  return { txHeight, txGasBurnt: txo.outcome.gas_burnt, receipts, totalBurnt, totalTokens, value, failure: result.status.Failure ?? null };
}

export const tgas = (g) => (Number(BigInt(g)) / 1e12).toFixed(3);
