// Throwaway spike: scan recent testnet blocks via neardata.xyz and find receipts to a given account,
// printing method names + logs. Usage: node scan_neardata.mjs <account> <nBlocks>
const account = process.argv[2] || 'v1.signer-prod.testnet';
const n = Number(process.argv[3] || 60);
const base = 'https://testnet.neardata.xyz/v0';
const t0 = Date.now();
const last = await fetch(`${base}/last_block/final`).then(r => r.json());
const top = last.block.header.height;
let found = 0, fetched = 0, bytes = 0, missing = 0;
const heights = Array.from({length: n}, (_, i) => top - i);
const conc = 6;
async function one(h) {
  const r = await fetch(`${base}/block/${h}`);
  const txt = await r.text(); bytes += txt.length; fetched++;
  if (txt === 'null') { missing++; return; }
  const b = JSON.parse(txt);
  if (!b.shards) { console.log('NON-BLOCK RESPONSE', h, r.status, JSON.stringify(Object.fromEntries(r.headers)), txt.slice(0,300)); missing++; return; }
  for (const s of b.shards) {
    for (const o of s.receipt_execution_outcomes) {
      const rc = o.receipt; const ex = o.execution_outcome;
      if (rc.receiver_id !== account) continue;
      found++;
      const acts = rc.receipt.Action?.actions?.map(a => a.FunctionCall?.method_name || Object.keys(a)[0]) || ['(data receipt)'];
      console.log(JSON.stringify({h, receipt_id: rc.receipt_id, predecessor: rc.predecessor_id, methods: acts, status: Object.keys(ex.outcome.status)[0], logs: ex.outcome.logs.map(l => l.slice(0, 160)), tx_hash: o.tx_hash}));
    }
  }
}
for (let i = 0; i < heights.length; i += conc) await Promise.all(heights.slice(i, i + conc).map(one));
console.log(`scanned ${fetched} blocks (${missing} null/skipped), top=${top}, found=${found} receipts to ${account}, bytes=${(bytes/1e6).toFixed(2)}MB, ${(Date.now()-t0)/1000}s`);
