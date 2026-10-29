// THROWAWAY SPIKE (sec, Phase 0): the clean-history *status rules* run against live public data
// (read-only), using records shaped like the proposed on-chain summary. Rebuild after Nov 1.
const SEPOLIA = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org']
const MEMPOOL = 'https://mempool.space/testnet4/api'
const SOL = 'https://api.devnet.solana.com'
const BTC_MIN_CONF = 1 // testnet demo; mainnet: 6
const SOL_MIN_AGE_MS = 5 * 60_000

const post = async (url, method, params) => (await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })).json())
const get = async (path) => { const r = await fetch(MEMPOOL + path); return { status: r.status, body: r.status === 200 ? await r.text() : null } }

// ---- EVM: record = { chainId, address, maxSignedNonce } ----
async function evmStatus(rec) {
  const per = []
  for (const url of SEPOLIA) { // two providers must agree; disagreement => unknown
    const fin = BigInt((await post(url, 'eth_getTransactionCount', [rec.address, 'finalized'])).result)
    const lat = BigInt((await post(url, 'eth_getTransactionCount', [rec.address, 'latest'])).result)
    const code = (await post(url, 'eth_getCode', [rec.address, 'latest'])).result
    per.push({ fin, lat, code })
  }
  if (per.some((p) => p.fin !== per[0].fin || p.code !== per[0].code)) return { status: 'unknown', why: 'providers disagree' }
  const { fin, lat, code } = per[0]
  if (code !== '0x') return { status: 'unsafe', why: `account has code ${code.slice(0, 10)}… (EIP-7702 delegation 0xef0100… or contract)` }
  if (fin > rec.maxSignedNonce) return { status: 'spent', why: `finalized nonce ${fin} > max signed ${rec.maxSignedNonce}` }
  if (lat > rec.maxSignedNonce) return { status: 'settling', why: `included (latest ${lat}) but not finalized (finalized ${fin})` }
  return { status: 'unspent', why: `nonce ${rec.maxSignedNonce} not yet consumed (latest count ${lat})` }
}

// ---- BTC: record = { txid, vout } (the outpoint committed in the signed BIP143 preimage) ----
async function btcStatus(rec) {
  const tx = await get(`/tx/${rec.txid}`)
  if (tx.status === 404) return { status: 'unspent', why: 'outpoint does not exist (yet) — a pre-signed spend of a future output is still live' }
  const outs = JSON.parse(tx.body).vout
  if (rec.vout >= outs.length) return { status: 'unknown', why: 'vout out of range' }
  const o = JSON.parse((await get(`/tx/${rec.txid}/outspend/${rec.vout}`)).body)
  if (!o.spent) return { status: 'unspent', why: 'outpoint unspent' }
  if (!o.status?.confirmed) return { status: 'settling', why: `spent by unconfirmed ${o.txid.slice(0, 10)}… (replaceable under full-RBF)` }
  const tip = Number((await get('/blocks/tip/height')).body)
  const conf = tip - o.status.block_height + 1
  return conf >= BTC_MIN_CONF ? { status: 'spent', why: `spent by ${o.txid.slice(0, 10)}… with ${conf} confirmations` } : { status: 'settling', why: `${conf} confirmations` }
}

// ---- SOL: record = { blockhash, signedAtMs, signature? } (durable nonces are refused on-chain) ----
async function solStatus(rec) {
  if (rec.signature) {
    const s = (await post(SOL, 'getSignatureStatuses', [[rec.signature], { searchTransactionHistory: true }])).result.value[0]
    if (s?.confirmationStatus === 'finalized') return { status: 'spent', why: 'transaction landed (finalized)' }
  }
  const valid = (await post(SOL, 'isBlockhashValid', [rec.blockhash, { commitment: 'processed' }])).result.value
  if (valid) return { status: 'unspent', why: 'blockhash still valid (≤150 blocks old)' }
  if (Date.now() - rec.signedAtMs < SOL_MIN_AGE_MS) return { status: 'settling', why: 'blockhash not valid at processed, but record younger than 5 min (lagging RPC?)' }
  return { status: 'expired', why: 'blockhash no longer valid and record older than 5 min' }
}

// -------- sample live records --------
const out = []
// EVM: take a real sender from a recent finalized Sepolia block
const blk = (await post(SEPOLIA[0], 'eth_getBlockByNumber', ['finalized', true])).result
const sample = blk.transactions.find((t) => t.type === '0x2') ?? blk.transactions[0]
const from = sample.from, n = BigInt(sample.nonce)
out.push(['evm: signed nonce already finalized', await evmStatus({ chainId: 11155111, address: from, maxSignedNonce: n })])
out.push(['evm: signed nonce far in future', await evmStatus({ chainId: 11155111, address: from, maxSignedNonce: n + 1_000_000n })])
const t4 = blk.transactions.find((t) => t.type === '0x4')
if (t4) out.push([`evm: an EIP-7702 authority seen on Sepolia (${t4.authorizationList?.length ?? 0} auths in tx)`, { note: 'see code check below' }])
// BTC: a confirmed tx ~20 blocks deep
const h = Number((await get('/blocks/tip/height')).body)
const bh = (await get(`/block-height/${h - 20}`)).body
const txids = JSON.parse((await get(`/block/${bh}/txids`)).body)
const txj = JSON.parse((await get(`/tx/${txids[1]}`)).body)
out.push(['btc: input of a confirmed tx (outpoint spent)', await btcStatus({ txid: txj.vin[0].txid, vout: txj.vin[0].vout })])
const outspends = JSON.parse((await get(`/tx/${txids[1]}/outspends`)).body)
const ui = outspends.findIndex((o) => !o.spent)
if (ui >= 0) out.push(['btc: still-unspent output', await btcStatus({ txid: txids[1], vout: ui })])
out.push(['btc: outpoint of a tx that does not exist', await btcStatus({ txid: 'ab'.repeat(32), vout: 0 })])
// SOL
const lb = (await post(SOL, 'getLatestBlockhash', [{ commitment: 'confirmed' }])).result.value.blockhash
out.push(['sol: fresh blockhash', await solStatus({ blockhash: lb, signedAtMs: Date.now() })])
const slot = (await post(SOL, 'getSlot', [{ commitment: 'finalized' }])).result
let old
for (let s = slot - 500; !old && s > slot - 530; s--) old = (await post(SOL, 'getBlock', [s, { transactionDetails: 'none', rewards: false, maxSupportedTransactionVersion: 0 }])).result?.blockhash
out.push(['sol: blockhash ~500 slots old, record 10 min old', await solStatus({ blockhash: old, signedAtMs: Date.now() - 10 * 60_000 })])
out.push(['sol: blockhash ~500 slots old, record 1 min old', await solStatus({ blockhash: old, signedAtMs: Date.now() - 60_000 })])

for (const [k, v] of out) console.log(k.padEnd(58), JSON.stringify(v))
