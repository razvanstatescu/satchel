/**
 * SOL dead-signature rule (kb/90 §7.2; R-19 in plan/decisions.md): `expired` if the record is ≥ 120 s old AND at
 * least one provider reports `isBlockhashValid(hash, processed) == false`. Dead by construction otherwise (durable
 * nonces refused, quiet period ≥ 138 s), so one provider suffices. Else `unused`. One query per distinct blockhash.
 * Account check: absent, or owned by the System program with empty data.
 */
import type { AccountReport, ItemReport, ItemStatus, Policy, SigRecordView, SolSource } from './types'
import { baseItem, hexToBase58, mapLimit, settle } from './util'

export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'

export interface SolCheckResult {
  items: ItemReport[]
  account: AccountReport
  finals: { seq: number; evidence: Record<string, unknown> }[]
}

export async function checkSol(
  address: string,
  records: SigRecordView[],
  sources: SolSource[],
  policy: Policy,
  now: number,
  cachedSeqs: ReadonlyMap<number, Record<string, unknown>> = new Map(),
): Promise<SolCheckResult> {
  const rows = records.map((r) => {
    const d = 'sol' in r.detail ? r.detail.sol : null
    return { r, hashHex: d?.recent_blockhash.toLowerCase() ?? '', ageMs: now - r.timestamp_ms }
  })
  const toQuery = [...new Set(rows.filter((x) => x.hashHex && !cachedSeqs.has(x.r.seq) && x.ageMs >= policy.solMinAgeMs).map((x) => x.hashHex))]
  const validity = new Map<string, { valid: boolean[]; errors: string[] }>()
  await mapLimit(toQuery, 4, async (h) => {
    const b58 = hexToBase58(h)
    const res = await Promise.all(sources.map((s) => settle(s.isBlockhashValid(b58))))
    validity.set(h, {
      valid: res.flatMap((x) => (x.ok ? [x.value] : [])),
      errors: res.flatMap((x, i) => (x.ok ? [] : [`${sources[i]!.name}: ${x.error}`])),
    })
  })

  const items: ItemReport[] = []
  const finals: SolCheckResult['finals'] = []
  for (const x of rows) {
    const common = { ...baseItem(x.r), recent_blockhash: x.hashHex ? hexToBase58(x.hashHex) : '', cached: false }
    const cached = cachedSeqs.get(x.r.seq)
    if (cached) {
      items.push({ ...common, status: 'expired', reason: 'blockhash_expired', evidence: cached, sources: 1, cached: true })
      continue
    }
    if (!x.hashHex) {
      items.push({ ...common, status: 'unknown', reason: 'not_sol', evidence: {}, sources: 0 })
      continue
    }
    if (x.ageMs < policy.solMinAgeMs) {
      items.push({ ...common, status: 'unused', reason: 'young', evidence: { age_s: Math.floor(x.ageMs / 1000) }, sources: 0 })
      continue
    }
    const v = validity.get(x.hashHex)!
    let status: ItemStatus
    let reason: string
    if (v.valid.includes(false)) [status, reason] = ['expired', 'blockhash_expired']
    else if (v.valid.length > 0) [status, reason] = ['unused', 'blockhash_valid']
    else [status, reason] = ['unknown', 'providers_down']
    const evidence = { valid: v.valid.length ? !v.valid.includes(false) : null, age_s: Math.floor(x.ageMs / 1000), ...(v.errors.length ? { errors: v.errors } : {}) }
    items.push({ ...common, status, reason, evidence, sources: status === 'expired' ? v.valid.filter((x) => !x).length : v.valid.length })
    if (status === 'expired') finals.push({ seq: x.r.seq, evidence })
  }

  const accts = await Promise.all(sources.map((s) => settle(s.getAccountInfo(address))))
  const answers = accts.flatMap((a) => (a.ok ? [a.value] : []))
  const verdicts = answers.map((a) => (a === null ? 'absent' : a.owner === SYSTEM_PROGRAM_ID && a.dataLength === 0 ? 'system' : a.owner !== SYSTEM_PROGRAM_ID ? 'not_system_owned' : 'has_data'))
  const okCount = verdicts.filter((v) => v === 'absent' || v === 'system').length
  const bad = verdicts.find((v) => v !== 'absent' && v !== 'system')
  const account: AccountReport = {
    chain: 'sol',
    address,
    status: answers.length === 0 ? 'unknown' : bad && okCount === 0 ? 'unsafe' : bad ? 'unknown' : 'ok',
    reason: answers.length === 0 ? 'providers_down' : bad && okCount > 0 ? 'providers_disagree' : (bad ?? verdicts[0]!),
    evidence: answers.length === 0 ? { errors: accts.map((a) => (a.ok ? null : a.error)) } : { answers: verdicts },
    sources: answers.length,
  }
  return { items, account, finals }
}
