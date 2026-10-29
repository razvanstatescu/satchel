// Throwaway: run the KB-50 snippets (types stripped) against live endpoints to confirm they work as written.
const TX = 'https://tx.test.fastnear.com';
const post = (path, body) => fetch(TX + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(r => { if (!r.ok) throw new Error(`fastnear ${r.status}`); return r.json(); });
async function satchelEvents(contract, id, limit = 60) {
  const { account_txs } = await post('/v0/account', { account_id: contract, desc: true, limit, is_success: true });
  const hashes = account_txs.map(t => t.transaction_hash);
  const out = [];
  for (let i = 0; i < hashes.length; i += 20) {
    const { transactions } = await post('/v0/transactions', { tx_hashes: hashes.slice(i, i + 20) });
    for (const t of transactions) for (const r of t.receipts) {
      if (r.receipt.receiver_id !== contract) continue;
      for (const log of r.execution_outcome.outcome.logs) {
        if (!log.startsWith('EVENT_JSON:')) continue;
        const ev = JSON.parse(log.slice(11));
        const rows = Array.isArray(ev.data) ? ev.data : [ev.data];
        if (rows.some(d => d?.token_id === id || d?.token_ids?.includes(id)))
          out.push({ tx: t.transaction.hash, block: r.execution_outcome.block_height, standard: ev.standard, event: ev.event });
      }
    }
  }
  return out;
}
const ev = await satchelEvents('recv.satchel-spk-pay-e9ea1a.testnet', '1');
console.log('satchelEvents ->', ev.length, 'events', JSON.stringify(ev));
const MS = 'https://mempool.space/testnet4/api';
const btcBalance = async a => { const j = await (await fetch(`${MS}/address/${a}`)).json(); return (j.chain_stats.funded_txo_sum - j.chain_stats.spent_txo_sum) + (j.mempool_stats.funded_txo_sum - j.mempool_stats.spent_txo_sum); };
console.log('btcBalance sats ->', await btcBalance('tb1qur7330emxypadqvr0mu4989sfzw32gpkxgyd2m'));
const SEP = 'https://ethereum-sepolia-rpc.publicnode.com';
const evm = (method, params) => fetch(SEP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then(r => r.json()).then(j => j.result);
console.log('ethBalanceWei ->', String(BigInt(await evm('eth_getBalance', ['0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', 'latest']))), 'ethNonce ->', Number(BigInt(await evm('eth_getTransactionCount', ['0x2527D02599Ba641c19FEa793cD0F167589a0f10D', 'latest']))));
const h = await fetch('https://eth-sepolia.blockscout.com/api/v2/addresses/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14/transactions').then(r => r.json());
console.log('ethHistory ->', h.items?.length, 'items');
const SOL = 'https://api.devnet.solana.com';
const sol = (method, params) => fetch(SOL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then(r => r.json()).then(j => j.result);
console.log('solLamports ->', (await sol('getBalance', ['Vote111111111111111111111111111111111111111', { commitment: 'confirmed' }])).value, 'solSigs ->', (await sol('getSignaturesForAddress', ['Vote111111111111111111111111111111111111111', { limit: 20 }])).length);
// price route functions (the `next` fetch option is Next.js-specific; plain Node ignores it)
const ID = { BTC: 'nep141:btc.omft.near', ETH: 'nep141:eth.omft.near', SOL: 'nep141:sol.omft.near', NEAR: 'nep141:wrap.near', USDC: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1' };
const rows = await fetch('https://1click.chaindefuser.com/v0/tokens', { next: { revalidate: 60 } }).then(r => r.json());
const m = Object.fromEntries(rows.map(t => [t.assetId, t]));
const p1 = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, m[id]?.price]));
console.log('from1Click ->', JSON.stringify(p1), 'allNumbers', Object.values(p1).every(v => typeof v === 'number'));
const j = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,near,usd-coin&vs_currencies=usd', { next: { revalidate: 60 } }).then(r => r.json());
const p2 = { BTC: j.bitcoin?.usd, ETH: j.ethereum?.usd, SOL: j.solana?.usd, NEAR: j.near?.usd, USDC: j['usd-coin']?.usd };
console.log('fromCoinGecko ->', JSON.stringify(p2), 'allNumbers', Object.values(p2).every(v => typeof v === 'number'));
