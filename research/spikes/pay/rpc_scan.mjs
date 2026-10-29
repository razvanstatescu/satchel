// Throwaway spike: what can plain JSON-RPC give an "indexer"? block -> chunk -> tx status (logs) -> changes; GC depth.
const RPC = process.argv[2] || 'https://rpc.testnet.fastnear.com';
let calls = 0;
async function rpc(method, params) {
  calls++;
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json();
  if (j.error) return { error: j.error };
  return j.result;
}
const t0 = Date.now();
const head = await rpc('block', { finality: 'final' });
const H = head.header.height;
console.log('final head', H, 'chunks', head.chunks.length);
// 1) scan last N blocks for txs/receipts to v1.signer-prod.testnet using chunk RPC
const target = 'v1.signer-prod.testnet';
let hits = [];
for (let h = H; h > H - 15; h--) {
  const b = await rpc('block', { block_id: h });
  if (b.error) { console.log('block err', h, b.error.cause?.name); continue; }
  const chunks = await Promise.all(b.chunks.filter(c => c.height_included === h).map(c => rpc('chunk', { chunk_id: c.chunk_hash })));
  for (const ch of chunks) {
    if (ch.error) continue;
    for (const tx of ch.transactions) if (tx.receiver_id === target) hits.push({ h, kind: 'tx', hash: tx.hash, signer: tx.signer_id });
    for (const rc of ch.receipts) if (rc.receiver_id === target) hits.push({ h, kind: 'receipt', id: rc.receipt_id, pred: rc.predecessor_id, methods: rc.receipt.Action?.actions?.map(a => a.FunctionCall?.method_name) });
  }
}
console.log('chunk-scan hits (15 blocks):', JSON.stringify(hits.slice(0, 6)), 'total', hits.length);
console.log('chunk objects have keys:', Object.keys((await rpc('chunk', { chunk_id: head.chunks[0].chunk_hash }))));
// 2) logs need tx status per tx:
const txHit = hits.find(x => x.kind === 'tx');
if (txHit) {
  const st = await rpc('EXPERIMENTAL_tx_status', { tx_hash: txHit.hash, sender_account_id: txHit.signer, wait_until: 'NONE' });
  console.log('tx_status keys', Object.keys(st), 'final_execution_status', st.final_execution_status, 'receipt logs', JSON.stringify(st.receipts_outcome?.map(r => r.outcome.logs.map(l => l.slice(0, 60)))));
}
// 3) EXPERIMENTAL_changes: account state changes for target in the head block
const ch1 = await rpc('EXPERIMENTAL_changes', { changes_type: 'account_changes', account_ids: [target], block_id: H });
console.log('account_changes @head:', ch1.error ? ch1.error : `${ch1.changes.length} changes`, ch1.changes?.[0] ? JSON.stringify(ch1.changes[0].cause) : '');
const ch2 = await rpc('EXPERIMENTAL_changes_in_block', { block_id: H });
console.log('changes_in_block @head:', ch2.error ? ch2.error : `${ch2.changes.length} changed accounts; sample ${JSON.stringify(ch2.changes.slice(0, 2))}`);
// 4) GC depth: how old a block can a non-archival node serve?
for (const back of [10_000, 100_000, 200_000, 300_000, 500_000, 1_000_000]) {
  const b = await rpc('block', { block_id: H - back });
  console.log(`block H-${back}:`, b.error ? `ERROR ${b.error.cause?.name || b.error.name}: ${(b.error.data || b.error.message || '').toString().slice(0, 80)}` : `ok ts=${new Date(b.header.timestamp_nanosec / 1e6).toISOString()}`);
}
console.log(`rpc calls=${calls}, ${(Date.now() - t0) / 1000}s`);
