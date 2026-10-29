// THROWAWAY: find an EIP-7702-delegated EOA on Sepolia to show what eth_getCode returns (read-only)
const RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const post = async (m, p) => (await (await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: m, params: p }) })).json()).result
const tip = parseInt(await post('eth_blockNumber', []), 16)
let found = null, scanned = 0
for (let b = tip; b > tip - 300 && !found; b--) {
  const blk = await post('eth_getBlockByNumber', ['0x' + b.toString(16), true]); scanned++
  for (const t of blk.transactions) if (t.type === '0x4') {
    for (const cand of [t.from, t.to]) {
      const code = await post('eth_getCode', [cand, 'latest'])
      if (code?.startsWith('0xef0100')) { found = { block: b, tx: t.hash, account: cand, code, authChainIds: t.authorizationList.map((a) => a.chainId) }; break }
    }
    if (found) break
  }
}
console.log(JSON.stringify({ scannedBlocks: scanned, found }, null, 1))
