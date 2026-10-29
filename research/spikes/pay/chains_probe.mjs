// Throwaway: per-chain balance/history endpoints + browser CORS (simple request + preflight) check.
const ORIGIN = 'https://satchel-test.vercel.app';
const BTC = 'tb1qur7330emxypadqvr0mu4989sfzw32gpkxgyd2m';
const ETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // WETH on Sepolia (busy contract)
const SOL = 'TokenkegQfeZyiNwAJbNTGtqhjrZ7Lt2QBNMnFWfiMWZ'; // SPL token program (busy) - only for signatures
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function preflight(url) {
  try {
    const r = await fetch(url, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    return `${r.status} ACAO=${r.headers.get('access-control-allow-origin')} ACAH=${r.headers.get('access-control-allow-headers')}`;
  } catch (e) { return 'ERR ' + e.message; }
}
async function probe(name, url, opts = {}, pick = j => JSON.stringify(j).slice(0, 160)) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opts, headers: { Origin: ORIGIN, ...(opts.headers || {}) } });
    const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch { j = txt; }
    const rl = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'ratelimit-limit', 'x-rate-limit-limit', 'retry-after'].map(h => r.headers.get(h) ? `${h}=${r.headers.get(h)}` : '').filter(Boolean).join(' ');
    console.log(`${name}: HTTP ${r.status} ${Date.now() - t0}ms ACAO=${r.headers.get('access-control-allow-origin')} ${rl}\n    ${typeof j === 'string' ? j.slice(0, 160) : pick(j)}`);
    if (opts.method === 'POST') console.log(`    preflight: ${await preflight(url)}`);
  } catch (e) { console.log(`${name}: ERR ${e.message}`); }
  await sleep(400);
}
const rpc = (method, params) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
// --- BTC testnet4 (mempool.space; btc agent owns details)
await probe('mempool.space testnet4 /address', `https://mempool.space/testnet4/api/address/${BTC}`, {}, j => JSON.stringify(j.chain_stats));
await probe('mempool.space testnet4 /address/txs', `https://mempool.space/testnet4/api/address/${BTC}/txs`, {}, j => `${j.length} txs, first ${j[0]?.txid} confirmed=${j[0]?.status?.confirmed}`);
await probe('mempool.space testnet4 /address/utxo', `https://mempool.space/testnet4/api/address/${BTC}/utxo`, {}, j => `${j.length} utxos`);
// --- Sepolia JSON-RPC
for (const u of ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org', 'https://1rpc.io/sepolia', 'https://rpc.sepolia.org', 'https://sepolia.gateway.tenderly.co']) {
  await probe(`sepolia ${u} eth_getBalance`, u, rpc('eth_getBalance', [ETH, 'latest']), j => j.result ? `balance=${BigInt(j.result)} wei` : JSON.stringify(j).slice(0, 160));
}
// --- Sepolia explorers
await probe('etherscan v2 txlist (NO key)', `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${ETH}&page=1&offset=2&sort=desc`);
await probe('blockscout sepolia /api/v2/addresses', `https://eth-sepolia.blockscout.com/api/v2/addresses/${ETH}`, {}, j => `coin_balance=${j.coin_balance} is_contract=${j.is_contract}`);
await probe('blockscout sepolia /addresses/txs', `https://eth-sepolia.blockscout.com/api/v2/addresses/${ETH}/transactions`, {}, j => `${j.items?.length} items, first ${j.items?.[0]?.hash} next_page_params=${JSON.stringify(j.next_page_params)}`);
await probe('blockscout sepolia etherscan-compat txlist', `https://eth-sepolia.blockscout.com/api?module=account&action=txlist&address=${ETH}&page=1&offset=2&sort=desc`, {}, j => `status=${j.status} n=${j.result?.length}`);
// --- Solana devnet
await probe('solana devnet getBalance', 'https://api.devnet.solana.com', rpc('getBalance', [SOL]), j => JSON.stringify(j.result ?? j.error));
await probe('solana devnet getSignaturesForAddress', 'https://api.devnet.solana.com', rpc('getSignaturesForAddress', [SOL, { limit: 2 }]), j => JSON.stringify(j.result?.map(s => ({ sig: s.signature.slice(0, 12), slot: s.slot, err: s.err, status: s.confirmationStatus })) ?? j.error));
