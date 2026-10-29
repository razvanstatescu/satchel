// Throwaway: download a contract's wasm with view_code and list exported functions (= callable methods).
const [net, contract] = process.argv.slice(2);
const RPC = net === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : (process.env.RPC || 'https://rpc.testnet.near.org');
const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_code', finality: 'final', account_id: contract } }) });
const j = await r.json();
if (j.error) { console.log(contract, 'ERROR', j.error.cause?.name, JSON.stringify(j.error).slice(0, 300)); process.exit(0); }
const buf = Buffer.from(j.result.code_base64, 'base64');
let names;
try { names = WebAssembly.Module.exports(new WebAssembly.Module(buf)).filter(e => e.kind === 'function').map(e => e.name); }
catch (e) { console.log(contract, 'wasm parse error', e.message.slice(0, 100)); process.exit(0); }
console.log(`${contract} code_hash=${j.result.hash} size=${buf.length}B methods(${names.length}): ${names.sort().join(', ')}`);
