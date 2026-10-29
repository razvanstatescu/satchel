// THROWAWAY Phase 0 spike (web agent): wallet-agnostic tracker for a long-running NEAR tx
// (e.g. a call that yields on the MPC signer). Runs unchanged in the browser and Node 22
// (fetch, AbortController, atob, TextDecoder only). Rebuild from scratch on Nov 1; do not import.
//
// Strategy: long-poll tx(wait_until=EXECUTED_OPTIMISTIC). The node holds the
// request (nearcore default polling_timeout 10 s; FastNEAR testnet measured ~30 s) and then answers
// HTTP 408 TIMEOUT_ERROR with the last known status in error.cause.info.status. Every "not yet"
// answer (408, UNKNOWN_TRANSACTION, dRPC free-plan 408 code 30 after ~2 s, 429, 5xx, network) just
// means "ask again", with backoff and provider rotation. Complete = status has SuccessValue|Failure.

const TERMINAL = new Set(['EXECUTED_OPTIMISTIC', 'EXECUTED', 'FINAL']);

function decodeSuccessValue(b64) {
  if (!b64) return null; // empty SuccessValue = function returned nothing
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  try { return JSON.parse(text); } catch { return text; }
}

/** Classify one JSON-RPC answer. */
function classify(http, body) {
  if (body?.result) {
    const r = body.result;
    const st = r.status; // FinalExecutionStatus: "NotStarted" | "Started" | {SuccessValue} | {Failure}
    if (st && typeof st === 'object' && ('SuccessValue' in st || 'Failure' in st) && TERMINAL.has(r.final_execution_status)) {
      return { kind: 'done', outcome: r };
    }
    return { kind: 'pending', status: r.final_execution_status, outcome: r };
  }
  const e = body?.error;
  const cause = e?.cause?.name;
  if (cause === 'TIMEOUT_ERROR' || http === 408) {
    // nearcore 2.14 (live on testnet 2026-10-21) sends {cause:{name:'TIMEOUT_ERROR', info:{cause:'PENDING', status:{...}}}}
    const pending = e?.cause?.info?.status ?? e?.cause?.info?.Pending?.status;
    return { kind: 'pending', status: pending?.final_execution_status ?? 'UNKNOWN', outcome: pending };
  }
  if (cause === 'UNKNOWN_TRANSACTION') return { kind: 'unknown' };
  if (cause === 'INVALID_TRANSACTION') return { kind: 'fatal', error: e };
  if (http === 429 || http >= 500 || http === 0 || body?.error?.code === -429) return { kind: 'retry', error: e ?? { http } };
  return { kind: 'retry', error: e ?? { http } };
}

/**
 * @param {object} o
 * @param {string} o.txHash
 * @param {string} o.senderId
 * @param {string[]} o.rpcUrls        ordered failover list
 * @param {(ev:{stage:string, elapsedMs:number, detail?:any})=>void} [o.onStage]
 * @param {number} [o.deadlineMs]     give up after this (default 240 s: 200-block yield ~= 121 s on testnet + margin)
 * @param {number} [o.unknownGraceMs] how long UNKNOWN_TRANSACTION is tolerated (default 60 s)
 * @param {AbortSignal} [o.signal]
 */
export async function trackTx({ txHash, senderId, rpcUrls, onStage = () => {}, deadlineMs = 240_000, unknownGraceMs = 60_000, signal, stats = {} }) {
  stats.requests = 0;
  const t0 = Date.now();
  let i = 0, backoff = 500, lastStage = '';
  const stage = (s, detail) => { if (s !== lastStage) { lastStage = s; onStage({ stage: s, elapsedMs: Date.now() - t0, detail }); } };
  stage('submitted', { txHash });
  while (Date.now() - t0 < deadlineMs) {
    if (signal?.aborted) throw new Error('aborted');
    const url = rpcUrls[i % rpcUrls.length];
    let http = 0, body, selfAborted = false;
    const ctl = new AbortController();
    const timer = setTimeout(() => { selfAborted = true; ctl.abort(); }, 35_000); // > FastNEAR's ~30 s hold
    stats.requests++;
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ jsonrpc: '2.0', id: 'track', method: 'tx', // 'tx' is served by FastNEAR, dRPC and near.org; 'tx_status' (new name) is not on dRPC
          params: { tx_hash: txHash, sender_account_id: senderId, wait_until: 'EXECUTED_OPTIMISTIC' } }),
      });
      http = res.status;
      body = await res.json().catch(() => null);
    } catch { http = 0; } finally { clearTimeout(timer); }
    if (selfAborted) continue; // our own long-poll cap: just ask again

    const c = classify(http, body);
    if (c.kind === 'done') {
      const st = c.outcome.status;
      stage('executed', { final_execution_status: c.outcome.final_execution_status });
      if ('SuccessValue' in st) return { ok: true, value: decodeSuccessValue(st.SuccessValue), outcome: c.outcome, elapsedMs: Date.now() - t0, rpc: url };
      return { ok: false, failure: st.Failure, outcome: c.outcome, elapsedMs: Date.now() - t0, rpc: url };
    }
    if (c.kind === 'fatal') return { ok: false, fatal: c.error, elapsedMs: Date.now() - t0 };
    if (c.kind === 'pending') {
      // INCLUDED / INCLUDED_FINAL with status "Started" => tx is in, receipts (MPC yield) still running
      stage(c.status === 'NONE' || c.status === 'UNKNOWN' ? 'submitted' : 'included', { final_execution_status: c.status });
      backoff = 500; // long-poll answers are already paced by the server
      if (http === 408 && body?.error?.code === 30) await sleep(1500); // dRPC free plan cuts at ~2 s: pace manually
      continue;
    }
    if (c.kind === 'unknown') {
      if (Date.now() - t0 > unknownGraceMs) return { ok: false, lost: true, elapsedMs: Date.now() - t0 };
      await sleep(1000); continue; // wallet may not have broadcast yet / RPC node not synced
    }
    // retry: rate limit, 5xx, network -> rotate provider and back off
    i++; await sleep(backoff); backoff = Math.min(backoff * 2, 5000);
  }
  return { ok: false, deadline: true, elapsedMs: Date.now() - t0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CLI: node track-tx.mjs <txHash> <senderId> [rpcUrl...]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [txHash, senderId, ...urls] = process.argv.slice(2);
  const rpcUrls = urls.length ? urls : ['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'];
  const r = await trackTx({ txHash, senderId, rpcUrls, onStage: (e) => console.log(`[${e.elapsedMs}ms] ${e.stage}`, e.detail ? JSON.stringify(e.detail) : '') });
  console.log(JSON.stringify({ ok: r.ok, value: r.value, failure: r.failure, lost: r.lost, deadline: r.deadline, elapsedMs: r.elapsedMs, rpc: r.rpc }, null, 1));
}
