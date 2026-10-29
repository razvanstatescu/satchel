// THROWAWAY: method support + 100-request concurrent-ish burst per RPC
const urls = ['https://ethereum-sepolia-rpc.publicnode.com','https://sepolia.drpc.org','https://gateway.tenderly.co/public/sepolia','https://1rpc.io/sepolia','https://rpc.sepolia.ethpandaops.io','https://0xrpc.io/sep','https://11155111.rpc.thirdweb.com']
const A = '0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d'
const call = async (u, method, params=[]) => { const t=performance.now(); try { const r = await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}); const j = await r.json().catch(()=>({})); return {ok: r.status===200 && 'result' in j, status:r.status, err:j.error?.message, ms: performance.now()-t} } catch(e) { return {ok:false, status:0, err:String(e.message), ms: performance.now()-t} } }
for (const u of urls) {
  const m = {}
  for (const [meth, p] of [['eth_maxPriorityFeePerGas',[]],['eth_feeHistory',['0x4','latest',[25,50]]],['eth_getTransactionCount',[A,'pending']],['eth_estimateGas',[{from:A,to:A,value:'0x0'}]],['eth_getBlockByNumber',['latest',false]]]) { const r = await call(u, meth, p); m[meth] = r.ok ? 'ok' : `FAIL(${r.status} ${r.err?.slice(0,60)})` }
  // burst: 100 requests, 10 at a time
  let ok=0, fail=0, codes={}; const t0=performance.now()
  for (let b=0;b<10;b++) { const rs = await Promise.all(Array.from({length:10},()=>call(u,'eth_blockNumber'))); for (const r of rs) { if (r.ok) ok++; else { fail++; codes[r.status]=(codes[r.status]||0)+1 } } }
  console.log(JSON.stringify({url:u, methods:m, burst100:{ok,fail,codes,totalMs:Math.round(performance.now()-t0)}}))
}
