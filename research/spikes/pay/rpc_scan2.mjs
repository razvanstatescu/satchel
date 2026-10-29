// Throwaway spike part 2: logs via tx status, EXPERIMENTAL_changes, GC depth; paced to avoid 429.
const RPC = process.argv[2] || 'https://rpc.testnet.near.org';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rpc(method, params) {
  await sleep(150);
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const txt = await r.text();
  try { const j = JSON.parse(txt); return j.error ? { error: j.error, http: r.status } : j.result; } catch { return { error: { http: r.status, body: txt.slice(0, 120) } }; }
}
const head = await rpc('block', { finality: 'final' });
const H = head.header.height;
console.log(RPC, 'final head', H);
const chunk = await rpc('chunk', { chunk_id: head.chunks[0].chunk_hash });
console.log('chunk keys:', Object.keys(chunk), '(no execution outcomes / logs in chunk RPC)');
const st = await rpc('EXPERIMENTAL_tx_status', { tx_hash: 'ESLmKLKBnqucsV3GgXnekte7vNAHniEUEk1US1MD9s3J', sender_account_id: 'tx-bench.testnet', wait_until: 'NONE' });
console.log('tx_status:', st.error ? JSON.stringify(st.error).slice(0, 200) : `final_execution_status=${st.final_execution_status} receipts_outcome=${st.receipts_outcome.length} logs=${JSON.stringify(st.receipts_outcome.map(r => r.outcome.logs.map(l => l.slice(0, 50))))}`);
const ch1 = await rpc('EXPERIMENTAL_changes', { changes_type: 'account_changes', account_ids: ['v1.signer-prod.testnet'], block_id: H });
console.log('account_changes @head:', ch1.error ? JSON.stringify(ch1.error).slice(0, 200) : `${ch1.changes.length} changes ${JSON.stringify(ch1.changes[0]?.cause || '')}`);
const ch2 = await rpc('EXPERIMENTAL_changes_in_block', { block_id: H });
console.log('changes_in_block @head:', ch2.error ? JSON.stringify(ch2.error).slice(0, 200) : `${ch2.changes.length} entries; sample ${JSON.stringify(ch2.changes.slice(0, 2))}`);
for (const back of [150_000, 200_000, 250_000, 300_000, 400_000, 1_000_000]) {
  const b = await rpc('block', { block_id: H - back });
  console.log(`block H-${back}:`, b.error ? `ERROR ${b.error.cause?.name || ''} ${JSON.stringify(b.error.data || b.error).slice(0, 100)}` : `ok ts=${new Date(b.header.timestamp_nanosec / 1e6).toISOString()}`);
}
