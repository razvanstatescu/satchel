// THROWAWAY: blocks between the MPC `sign` receipt and the yield-resume callback receipt, per tx.
const RPC = 'https://near-testnet.drpc.org'
const txs = process.argv.slice(2)
async function rpc(method, params) {
  for (let a = 0; ; a++) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'x', method, params }) })
    const j = await r.json(); if (j.error) { if (a < 10) { await new Promise((s) => setTimeout(s, 1500)); continue } throw new Error(JSON.stringify(j.error)) }
    return j.result
  }
}
const heightOf = new Map()
async function h(hash) { if (!heightOf.has(hash)) heightOf.set(hash, (await rpc('block', { block_id: hash })).header.height); return heightOf.get(hash) }
for (const t of txs) {
  const [hash, sender] = t.split('@')
  const o = await rpc('tx', { tx_hash: hash, sender_account_id: sender, wait_until: 'FINAL' })
  const txBlock = await h(o.transaction_outcome.block_hash)
  const mpc = o.receipts_outcome.filter((r) => r.outcome.executor_id === 'v1.signer-prod.testnet')
  const rows = []
  for (const r of mpc) rows.push({ status: Object.keys(r.outcome.status)[0], height: await h(r.block_hash) })
  const signH = rows.filter((r) => r.status === 'SuccessReceiptId').map((r) => r.height)
  const cbH = rows.filter((r) => r.status !== 'SuccessReceiptId').map((r) => r.height)
  console.log(hash, 'txBlock', txBlock, 'signReceipts', signH.join(','), 'callbacks', cbH.join(','), 'blocks(sign->cb)', cbH.map((c, i) => c - (signH[i] ?? signH[0])).join(','))
}
