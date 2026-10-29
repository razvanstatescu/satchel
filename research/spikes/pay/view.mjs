// Throwaway: call view methods. Usage: node view.mjs <network> <contract> <method> '<json args>'
const [net, contract, method, args = '{}'] = process.argv.slice(2);
const RPC = net === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : (process.env.RPC || 'https://rpc.testnet.near.org');
const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'final', account_id: contract, method_name: method, args_base64: Buffer.from(args).toString('base64') } }) });
const j = await r.json();
if (j.error) { console.log(JSON.stringify({ contract, method, error: j.error.cause?.name || j.error.name, info: JSON.stringify(j.error.data || j.error.cause?.info).slice(0, 160) })); process.exit(0); }
if (j.result.error) { console.log(JSON.stringify({ contract, method, error: j.result.error.slice(0, 200) })); process.exit(0); }
const out = Buffer.from(j.result.result).toString();
console.log(JSON.stringify({ contract, method, block: j.result.block_height, result: (() => { try { return JSON.parse(out); } catch { return out; } })() }));
