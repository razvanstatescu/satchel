/**
 * BTC dead-signature rule (spec §7.2, R-20): ONE `GET /tx/:txid/outspends` per distinct txid, on two providers that
 * must agree, plus one tip per provider (genesis-guarded):
 *   404 ⇒ every outpoint of that txid is `unfunded`; vout ≥ length ⇒ `unfunded`; spent:false ⇒ `unused`;
 *   spent unconfirmed ⇒ `settling` (full-RBF); confirmed with tip − height + 1 ≥ K ⇒ `spent`.
 * Foreign prevouts (review S-07): when an input would be `unused`/`settling`, one `GET /tx/:txid` per such txid reads
 *   the prevout's scriptPubKey; if it is none of P2WPKH(pkh), P2SH-P2WPKH(pkh), P2WSH(P2PKH(pkh)) for this token's
 *   pkh, the input is `foreign` (dead: it can't move the coins being bought). No script ⇒ the verdict stays.
 * Then per request (SIGHASH_ALL + completeness): any input spent ⇒ the whole request is spent ("tx conflict");
 * else any unused ⇒ unused; else any unknown ⇒ unknown; else any settling ⇒ settling; else foreign; else unfunded.
 */
import { sha256 } from '@noble/hashes/sha2.js'
import { hexToBytesStrict, toHex } from '../bytes'
import { hash160 } from '../derive'
import type { BtcOutspend, BtcSource, ItemReport, ItemStatus, Policy, SigRecordView } from './types'
import { agree, baseItem, mapLimit, settle } from './util'

/**
 * The scriptPubKeys a signature by this token's key over a P2WPKH BIP143 preimage (scriptCode `76a914{pkh}88ac`) can
 * satisfy without tricks: native P2WPKH, P2SH-wrapped P2WPKH, and P2WSH of the plain P2PKH script. Anything else is
 * `foreign`. (A P2WSH script with OP_CODESEPARATOR could also accept such a signature, but no such output is ever at
 * this Satchel's address, so it is never part of what a buyer pays for.)
 */
export function ownBtcScripts(compressedPubkeyHex: string): Set<string> {
  const pkh = toHex(hash160(hexToBytesStrict(compressedPubkeyHex)))
  const p2wpkh = `0014${pkh}`
  return new Set([
    p2wpkh,
    `a914${toHex(hash160(hexToBytesStrict(p2wpkh)))}87`,
    `0020${toHex(sha256(hexToBytesStrict(`76a914${pkh}88ac`)))}`,
  ])
}

/** `vout[i].scriptpubkey` of an Esplora `/tx/:txid` answer, lowercase; null if the shape is not understood. */
function voutScripts(tx: unknown): (string | null)[] | null {
  const vout = (tx as { vout?: unknown } | null)?.vout
  if (!Array.isArray(vout)) return null
  return vout.map((o) => {
    const sp = (o as { scriptpubkey?: unknown } | null)?.scriptpubkey
    return typeof sp === 'string' && /^[0-9a-fA-F]*$/.test(sp) ? sp.toLowerCase() : null
  })
}

export interface BtcCheckResult {
  items: ItemReport[]
  finals: { seq: number; evidence: Record<string, unknown> }[]
  /** outpoints ("txid:vout") of records that are not dead (encumbered, spec §7.3) */
  encumbered: string[]
}

type Verdict = { status: ItemStatus; reason: string; evidence: Record<string, unknown> }

function outpointVerdict(os: BtcOutspend[] | null, vout: number, tip: number, k: number, provider: string): Verdict {
  if (os === null) return { status: 'unfunded', reason: 'tx_not_found', evidence: { provider } }
  if (vout >= os.length) return { status: 'unfunded', reason: 'vout_out_of_range', evidence: { provider, outputs: os.length } }
  const o = os[vout]!
  if (!o.spent) return { status: 'unused', reason: 'outpoint_unspent', evidence: { provider } }
  if (!o.status?.confirmed || o.status.block_height === undefined)
    return { status: 'settling', reason: 'spend_unconfirmed', evidence: { provider, spending_txid: o.txid, confirmations: 0 } }
  const conf = tip - o.status.block_height + 1
  if (conf >= k) return { status: 'spent', reason: 'outpoint_spent', evidence: { provider, spending_txid: o.txid, confirmations: conf } }
  return { status: 'settling', reason: 'confirming', evidence: { provider, spending_txid: o.txid, confirmations: conf, needed: k } }
}

const RANK: ItemStatus[] = ['spent', 'unused', 'unknown', 'settling', 'foreign', 'unfunded']

/** Request-level status from its inputs' statuses (precedence: spent > unused > unknown > settling > foreign > unfunded). */
export function requestStatus(statuses: ItemStatus[]): ItemStatus {
  for (const s of RANK) if (statuses.includes(s)) return s
  return 'unknown'
}

export async function checkBtc(
  records: SigRecordView[],
  sources: BtcSource[],
  policy: Policy,
  cachedSeqs: ReadonlyMap<number, Record<string, unknown>> = new Map(),
  /** this token's own scriptPubKeys (`ownBtcScripts(btcPubkey)`); without them no input is ever `foreign` */
  ownScripts?: ReadonlySet<string>,
): Promise<BtcCheckResult> {
  const recs = records.map((r) => {
    const d = 'btc' in r.detail ? r.detail.btc : null
    return { r, txid: d?.txid.toLowerCase() ?? '', vout: d?.vout ?? -1, amount: d ? String(d.amount_sats) : undefined }
  })
  const needed = [...new Set(recs.filter((x) => x.txid && !cachedSeqs.has(x.r.seq)).map((x) => x.txid))]
  const overCap = needed.length > policy.maxBtcTxids

  // per provider: genesis guard, tip, one outspends per distinct txid; any failure drops that provider
  const perProvider: { name: string; tip: number; outs: Map<string, BtcOutspend[] | null>; scripts: Map<string, (string | null)[] | null> }[] = []
  const errors: Record<string, string> = {}
  if (!overCap && needed.length > 0) {
    await Promise.all(
      sources.map(async (s) => {
        const r = await settle(
          (async () => {
            await s.assertTestnet4()
            const tip = await s.tipHeight()
            const outsList = await mapLimit(needed, 4, (t) => s.outspends(t))
            const outs = new Map(needed.map((t, i) => [t, outsList[i]!]))
            // S-07: prevout scripts, only for txids where some referenced output is still unused or settling
            const scripts = new Map<string, (string | null)[] | null>()
            if (ownScripts && s.tx) {
              const live = needed.filter((t) =>
                recs.some((x) => x.txid === t && !cachedSeqs.has(x.r.seq) && ['unused', 'settling'].includes(outpointVerdict(outs.get(t) ?? null, x.vout, tip, policy.btcK, s.name).status)),
              )
              const txs = await mapLimit(live, 4, (t) => settle(s.tx!(t)))
              live.forEach((t, i) => {
                const a = txs[i]!
                scripts.set(t, a.ok ? voutScripts(a.value) : null) // a failed /tx call never makes anything foreign
              })
            }
            return { tip, outs, scripts }
          })(),
        )
        if (r.ok) perProvider.push({ name: s.name, ...r.value })
        else errors[s.name] = r.error
      }),
    )
  }

  // per-record verdicts
  const own = new Map<number, Verdict & { sources: number; cached: boolean }>()
  for (const x of recs) {
    const cached = cachedSeqs.get(x.r.seq)
    if (cached) {
      own.set(x.r.seq, { status: 'spent', reason: String(cached.reason ?? 'outpoint_spent'), evidence: cached, sources: Number(cached.sources ?? 2), cached: true })
      continue
    }
    if (!x.txid || x.vout < 0) {
      own.set(x.r.seq, { status: 'unknown', reason: 'not_btc', evidence: {}, sources: 0, cached: false })
      continue
    }
    if (overCap) {
      own.set(x.r.seq, { status: 'unknown', reason: 'too_many_txids', evidence: { distinct_txids: needed.length, cap: policy.maxBtcTxids }, sources: 0, cached: false })
      continue
    }
    const answers = perProvider.map((p) => {
      const v = outpointVerdict(p.outs.get(x.txid) ?? null, x.vout, p.tip, policy.btcK, p.name)
      const script = p.scripts.get(x.txid)?.[x.vout]
      if (ownScripts && (v.status === 'unused' || v.status === 'settling') && typeof script === 'string' && !ownScripts.has(script))
        return { status: 'foreign' as const, reason: 'prevout_not_ours', evidence: { provider: p.name, scriptpubkey: script, outspend: v.status } }
      return v
    })
    const v = agree(answers, policy.allowSingleSource)
    if (v.reason === 'providers_down') v.evidence = { errors }
    own.set(x.r.seq, { ...v, cached: false })
  }

  // per-request aggregation
  const byRequest = new Map<number, typeof recs>()
  for (const x of recs) byRequest.set(x.r.request_id, [...(byRequest.get(x.r.request_id) ?? []), x])
  const items: ItemReport[] = []
  const finals: BtcCheckResult['finals'] = []
  const encumbered: string[] = []
  for (const x of recs) {
    const group = byRequest.get(x.r.request_id)!
    const reqStatus = requestStatus(group.map((g) => own.get(g.r.seq)!.status))
    const mine = own.get(x.r.seq)!
    const status = reqStatus
    const reason = mine.status === status ? mine.reason : status === 'spent' ? 'tx_conflict' : `request_${status}`
    const sources = status === 'spent' && mine.status !== 'spent' ? Math.min(...group.filter((g) => own.get(g.r.seq)!.status === 'spent').map((g) => own.get(g.r.seq)!.sources)) : mine.sources
    const item: ItemReport = {
      ...baseItem(x.r),
      status,
      reason,
      outpoint: `${x.txid}:${x.vout}`,
      ...(x.amount !== undefined ? { claimed_amount_sats: x.amount } : {}),
      evidence: { ...mine.evidence, input_status: mine.status },
      evidence_url: `https://mempool.space/testnet4/tx/${x.txid}`,
      sources,
      cached: mine.cached,
    }
    items.push(item)
    if (status === 'spent' && !mine.cached) finals.push({ seq: x.r.seq, evidence: { ...item.evidence, reason, sources } })
    if (status !== 'spent' && x.txid) encumbered.push(`${x.txid}:${x.vout}`)
  }
  return { items, finals, encumbered: [...new Set(encumbered)] }
}

/** Verified BTC balance (spec §7.3): confirmed UTXOs at depth ≥ K, excluding encumbered outpoints. */
export function verifiedBtcBalance(
  utxos: { txid: string; vout: number; value: number | bigint; status: { confirmed: boolean; block_height?: number } }[],
  encumbered: Iterable<string>,
  tip: number,
  k: number,
): { verified: bigint; encumbered: bigint; unconfirmed: bigint } {
  const enc = new Set([...encumbered].map((s) => s.toLowerCase()))
  let verified = 0n
  let encumberedSum = 0n
  let unconfirmed = 0n
  for (const u of utxos) {
    const v = BigInt(u.value)
    const deep = u.status.confirmed && u.status.block_height !== undefined && tip - u.status.block_height + 1 >= k
    if (enc.has(`${u.txid.toLowerCase()}:${u.vout}`)) encumberedSum += v
    else if (deep) verified += v
    else unconfirmed += v
  }
  return { verified, encumbered: encumberedSum, unconfirmed }
}
