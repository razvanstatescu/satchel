// THROWAWAY SPIKE (sec, Phase 0). Read-only RPC probes of the exact queries a clean-history
// checker would make, to confirm response shapes and edge cases (finality lag, non-existent
// outpoints, unknown blockhashes). No keys, no writes.
const SEPOLIA_RPCS = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org']
const MEMPOOL = 'https://mempool.space/testnet4/api'
const SOL_DEVNET = 'https://api.devnet.solana.com'

const j = async (url, body) => {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
  const t = await r.text()
  try { return { status: r.status, json: JSON.parse(t) } } catch { return { status: r.status, text: t.slice(0, 200) } }
}
const rpc = (url, method, params = []) => j(url, { jsonrpc: '2.0', id: 1, method, params })
const out = {}

// ---------- EVM / Sepolia ----------
for (const url of SEPOLIA_RPCS) {
  try {
    const tags = {}
    for (const tag of ['latest', 'safe', 'finalized']) {
      const b = await rpc(url, 'eth_getBlockByNumber', [tag, false])
      tags[tag] = b.json?.result ? { number: parseInt(b.json.result.number, 16), timestamp: parseInt(b.json.result.timestamp, 16) } : b.json?.error ?? b
    }
    const lag = { safe: tags.latest.number - tags.safe.number, finalized: tags.latest.number - tags.finalized.number, finalizedSeconds: tags.latest.timestamp - tags.finalized.timestamp }
    // a known busy EOA is not needed: nonce/code queries on the zero-ish address show the shapes
    const probe = '0x000000000000000000000000000000000000dEaD'
    const nonces = {}
    for (const tag of ['pending', 'latest', 'safe', 'finalized']) nonces[tag] = (await rpc(url, 'eth_getTransactionCount', [probe, tag])).json?.result
    const code = (await rpc(url, 'eth_getCode', [probe, 'finalized'])).json
    const chainId = (await rpc(url, 'eth_chainId')).json?.result
    out[`sepolia ${url}`] = { chainId, tags, lag, nonces, code: code.result ?? code.error }
  } catch (e) { out[`sepolia ${url}`] = String(e) }
}

// ---------- BTC testnet4 / mempool.space ----------
try {
  const tipH = (await j(`${MEMPOOL}/blocks/tip/height`)).json
  const tipHash = (await j(`${MEMPOOL}/blocks/tip/hash`)).text ?? (await j(`${MEMPOOL}/blocks/tip/hash`)).json
  // a block ~20 deep, take its 2nd tx (not coinbase) and look at its outspends
  const deepHash = (await j(`${MEMPOOL}/block-height/${tipH - 20}`)).text
  const txids = (await j(`${MEMPOOL}/block/${deepHash}/txids`)).json
  const txid = txids[1] ?? txids[0]
  const tx = (await j(`${MEMPOOL}/tx/${txid}`)).json
  const outspends = (await j(`${MEMPOOL}/tx/${txid}/outspends`)).json
  const spentIdx = outspends.findIndex((o) => o.spent)
  const unspentIdx = outspends.findIndex((o) => !o.spent)
  const firstIn = tx.vin?.[0]
  const inputOutspend = firstIn && !firstIn.is_coinbase ? (await j(`${MEMPOOL}/tx/${firstIn.txid}/outspend/${firstIn.vout}`)).json : null
  const fake = 'ab'.repeat(32)
  const fakeOutspend = await j(`${MEMPOOL}/tx/${fake}/outspend/0`)
  const fakeTx = await j(`${MEMPOOL}/tx/${fake}`)
  const outOfRange = await j(`${MEMPOOL}/tx/${txid}/outspend/${tx.vout.length + 5}`)
  out['testnet4 mempool.space'] = {
    tipHeight: tipH, tipHash, sampleTx: txid, sampleTxStatus: tx.status, vouts: tx.vout.length,
    exampleSpentOutspend: spentIdx >= 0 ? outspends[spentIdx] : null,
    exampleUnspentOutspend: unspentIdx >= 0 ? outspends[unspentIdx] : null,
    outspendOfSampleInput: inputOutspend,
    nonexistentTxOutspend: fakeOutspend, nonexistentTx: fakeTx, outOfRangeVout: outOfRange,
  }
} catch (e) { out['testnet4 mempool.space'] = String(e) }

// ---------- Solana devnet ----------
try {
  const lb = (await rpc(SOL_DEVNET, 'getLatestBlockhash', [{ commitment: 'finalized' }])).json.result
  const bh = (await rpc(SOL_DEVNET, 'getBlockHeight', [{ commitment: 'finalized' }])).json.result
  const lbConfirmed = (await rpc(SOL_DEVNET, 'getLatestBlockhash', [{ commitment: 'confirmed' }])).json.result
  const valid = {}
  for (const c of ['processed', 'confirmed', 'finalized']) valid[c] = (await rpc(SOL_DEVNET, 'isBlockhashValid', [lbConfirmed.value.blockhash, { commitment: c }])).json.result?.value
  const random = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi' // syntactically valid, never a blockhash
  const randomValid = (await rpc(SOL_DEVNET, 'isBlockhashValid', [random, { commitment: 'processed' }])).json
  // an old blockhash: the block ~400 slots ago
  const slot = (await rpc(SOL_DEVNET, 'getSlot', [{ commitment: 'finalized' }])).json.result
  let old = null
  for (let s = slot - 400; s > slot - 420 && !old; s--) {
    const b = await rpc(SOL_DEVNET, 'getBlock', [s, { transactionDetails: 'none', rewards: false, maxSupportedTransactionVersion: 0 }])
    if (b.json.result) old = { slot: s, blockhash: b.json.result.blockhash, blockHeight: b.json.result.blockHeight }
  }
  const oldValid = old ? (await rpc(SOL_DEVNET, 'isBlockhashValid', [old.blockhash, { commitment: 'processed' }])).json.result?.value : null
  const fakeSig = '5'.repeat(87)
  const sigStatus = (await rpc(SOL_DEVNET, 'getSignatureStatuses', [[fakeSig], { searchTransactionHistory: true }])).json
  out['solana devnet'] = {
    latestFinalized: lb, finalizedBlockHeight: bh, lastValidMinusHeight: lb.value.lastValidBlockHeight - bh,
    isBlockhashValid_freshConfirmedBlockhash: valid, isBlockhashValid_random: randomValid.result?.value ?? randomValid.error,
    oldBlock: old, isBlockhashValid_old: oldValid, getSignatureStatuses_unknown: sigStatus.result ?? sigStatus.error,
  }
} catch (e) { out['solana devnet'] = String(e) }

console.log(JSON.stringify(out, null, 2))
