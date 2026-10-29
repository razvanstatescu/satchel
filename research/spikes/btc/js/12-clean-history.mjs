// THROWAWAY spike 12: BTC clean-history verdicts for logged outpoints, against live mempool.space testnet4.
// Verdicts: DEAD (spent by a tx with >= K confirmations), REPLACEABLE (spent by an unconfirmed tx),
// LIVE (unspent), NOT_CREATED (txid unknown -> no current funds at risk), BAD_VOUT.
const B = process.env.MEMPOOL || 'https://mempool.space/testnet4/api'
const K = Number(process.env.K || 1)
const get = async (p) => { const r = await fetch(B + p); return { status: r.status, body: r.status === 200 ? await r.json().catch(() => null) : await r.text() } }

export async function outpointVerdict(txid, vout, tip) {
  const tx = await get(`/tx/${txid}`)
  if (tx.status === 404) return { verdict: 'NOT_CREATED' }
  if (vout >= tx.body.vout.length) return { verdict: 'BAD_VOUT' }
  const os = (await get(`/tx/${txid}/outspend/${vout}`)).body
  if (!os.spent) return { verdict: 'LIVE', value: tx.body.vout[vout].value }
  if (!os.status?.confirmed) return { verdict: 'REPLACEABLE', spender: os.txid }
  const conf = tip - os.status.block_height + 1
  return { verdict: conf >= K ? 'DEAD' : 'REPLACEABLE', spender: os.txid, confirmations: conf }
}
// A request (one sign_btc call) is harmless iff ANY of its inputs is DEAD (SIGHASH_ALL commits to all prevouts),
// or all of them are NOT_CREATED (can only move coins that don't exist yet).
export function requestVerdict(inputs) {
  if (inputs.some((v) => v.verdict === 'DEAD')) return 'HARMLESS'
  if (inputs.every((v) => v.verdict === 'NOT_CREATED')) return 'PENDING_NOT_CREATED'
  return 'BLOCKS_SALE'
}

const tip = Number(await (await fetch(B + '/blocks/tip/height')).text())
const cases = {
  'spent+confirmed (efc545…:429 -> 515f4966…)': ['efc545bac36c6f3bddfbb6f727da7366dca008f5cb58e6e009440bd4b525a799', 429],
  'unspent (e300a99d…:0, coinbase output)': ['e300a99dc119890f08aec0a999996261e3f72066330d6fdab443a29738e0c97a', 0],
  'fabricated txid (spike 02 input 0)': ['37ea6fceca4d4c4068056ab1b0ad3fbb43a1a57a9963525a37dcef5ef6e042a0', 0],
  'real tx, vout out of range': ['515f4966b1ac04d2d3ecdc750c40e01d54138bd79be282b8d96d86c83491aa26', 99],
}
const verdicts = {}
for (const [name, [t, v]] of Object.entries(cases)) verdicts[name] = await outpointVerdict(t, v, tip)
console.log('tip', tip, 'K', K)
console.log(JSON.stringify(verdicts, null, 1))
console.log('request {spent, unspent} ->', requestVerdict([verdicts[Object.keys(cases)[0]], verdicts[Object.keys(cases)[1]]]))
console.log('request {unspent} ->', requestVerdict([verdicts[Object.keys(cases)[1]]]))
console.log('request {fabricated} ->', requestVerdict([verdicts[Object.keys(cases)[2]]]))
