/**
 * EVM dead-signature rule (spec §7.2): `spent` if the nonce count at `latest − 3` exceeds the record's nonce;
 * `settling` if only `latest` does; else `unused`. Two providers must agree; both are queried at the SAME
 * block number (min head − 3) so their answers are comparable. O(1) per address. Account check: getCode == "0x".
 * C3: one run per chain id, on that chain's providers (`eth_chainId` guard); USDC transfers (C2) follow the same rule.
 */
import { classifyEvm, EVM_SUPPORTED_CHAIN_IDS } from '../policy/evm'
import type { AccountReport, EvmSource, ItemReport, ItemStatus, Policy, SigRecordView } from './types'
import { agree, baseItem, settle } from './util'

export const SEPOLIA = 11155111

/** C3: the chain ids whose records the checker can judge (the contract's allowlist). */
export const EVM_CHECK_CHAINS: readonly number[] = EVM_SUPPORTED_CHAIN_IDS.map(Number)

const EXPLORERS: Readonly<Record<number, string>> = {
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
  421614: 'https://sepolia.arbiscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
}

export interface EvmCheckResult {
  items: ItemReport[]
  account: AccountReport
  /** items whose verdict is final (spent below latest − K) and may be cached */
  finals: { seq: number; evidence: Record<string, unknown> }[]
}

interface ProviderAnswer {
  name: string
  countSafe: bigint
  countLatest: bigint
  code: string
  tag: bigint
}

function recordNonce(r: SigRecordView): { nonce: bigint; chainId: number; erc20: ItemReport['erc20'] } | { error: string } {
  if (!('evm' in r.detail)) return { error: 'not_evm' }
  const d = r.detail.evm
  const c = classifyEvm(d.unsigned_tx)
  if (!c.ok) return { error: 'record_unparseable' }
  // the record must be internally consistent: keccak(unsigned_tx) == payload, nonce/chain match the parsed tx
  const payloadOk = c.mpcPayloads[0] && 'Ecdsa' in c.mpcPayloads[0] && c.mpcPayloads[0].Ecdsa === r.payload.toLowerCase()
  if (!payloadOk) return { error: 'record_inconsistent' }
  if (c.fields.nonce !== BigInt(d.nonce) || c.fields.chainId !== BigInt(d.chain_id)) return { error: 'record_inconsistent' }
  const e = c.fields.erc20
  const erc20 = e ? { token: e.token.slice(2), to: e.to.slice(2), amount: e.amount.toString() } : undefined
  return { nonce: c.fields.nonce, chainId: Number(c.fields.chainId), erc20 }
}

/**
 * Judge `records` (EVM transactions on `chainId`) on that chain's `sources`, plus the account check there.
 * `chainId` defaults to Sepolia (the pre-C3 behaviour). Records on any other chain are `unknown` / `chain_unsupported`.
 */
export async function checkEvm(
  address: string,
  records: SigRecordView[],
  sources: EvmSource[],
  policy: Policy,
  cachedSeqs: ReadonlyMap<number, Record<string, unknown>> = new Map(),
  chainId: number = SEPOLIA,
): Promise<EvmCheckResult> {
  // phase 1: chain guard + head per provider
  const p1 = await Promise.all(
    sources.map(async (s) => {
      const r = await settle(Promise.all([s.chainId(), s.blockNumber()]))
      if (!r.ok) return { s, ok: false as const, error: r.error }
      const [cid, head] = r.value
      if (cid !== chainId) return { s, ok: false as const, error: `wrong chain ${cid}` }
      return { s, ok: true as const, head }
    }),
  )
  const live = p1.filter((x) => x.ok) as { s: EvmSource; ok: true; head: bigint }[]
  const errors: Record<string, string> = Object.fromEntries(p1.filter((x) => !x.ok).map((x) => [x.s.name, (x as { error: string }).error]))
  const minHead = live.length ? live.reduce((m, x) => (x.head < m ? x.head : m), live[0]!.head) : 0n
  const tag = minHead - BigInt(policy.evmConfirmations)

  // phase 2: two counts + code per provider, at the common tag
  const answers: ProviderAnswer[] = []
  await Promise.all(
    live.map(async ({ s }) => {
      const r = await settle(Promise.all([s.getTransactionCount(address, tag), s.getTransactionCount(address, 'latest'), s.getCode(address)]))
      if (!r.ok) errors[s.name] = r.error
      else answers.push({ name: s.name, countSafe: r.value[0], countLatest: r.value[1], code: r.value[2], tag })
    }),
  )

  const items: ItemReport[] = []
  const finals: EvmCheckResult['finals'] = []
  for (const r of records) {
    const cached = cachedSeqs.get(r.seq)
    const n = recordNonce(r)
    if ('error' in n) {
      items.push({ ...baseItem(r), status: 'unknown', reason: n.error, evidence: {}, sources: 0, cached: false })
      continue
    }
    const explorer = EXPLORERS[n.chainId] ?? EXPLORERS[SEPOLIA]
    const common = { ...baseItem(r), chain_id: n.chainId, nonce: n.nonce.toString(), evidence_url: `${explorer}/address/${address}`, ...(n.erc20 ? { erc20: n.erc20 } : {}) }
    if (n.chainId !== chainId || !EVM_CHECK_CHAINS.includes(n.chainId)) {
      items.push({ ...common, status: 'unknown', reason: 'chain_unsupported', evidence: {}, sources: 0, cached: false })
      continue
    }
    if (cached) {
      items.push({ ...common, status: 'spent', reason: 'nonce_used', evidence: cached, sources: Number(cached.sources ?? 2), cached: true })
      continue
    }
    const per = answers.map((a) => {
      const status: ItemStatus = a.countSafe > n.nonce ? 'spent' : a.countLatest > n.nonce ? 'settling' : 'unused'
      return {
        status,
        reason: status === 'spent' ? 'nonce_used' : status === 'settling' ? 'nonce_used_unconfirmed' : 'nonce_not_used',
        evidence: { provider: a.name, count_at_tag: a.countSafe.toString(), count_latest: a.countLatest.toString(), tag: a.tag.toString() },
      }
    })
    const v = agree(per, policy.allowSingleSource)
    if (v.reason === 'providers_down') v.evidence = { errors }
    items.push({ ...common, ...v, cached: false })
    if (v.status === 'spent') finals.push({ seq: r.seq, evidence: { ...v.evidence, sources: v.sources } })
  }

  const acct = agree(
    answers.map((a) => {
      const empty = a.code === '0x' || a.code === '' || a.code === '0x0'
      return {
        status: (empty ? 'spent' : 'unused') as ItemStatus, // reuse agree(): spent = ok, unused = unsafe
        reason: empty ? 'no_code' : a.code.toLowerCase().startsWith('0xef0100') ? 'eip7702_delegation' : 'has_code',
        evidence: { provider: a.name, code: a.code.length > 50 ? `${a.code.slice(0, 50)}…` : a.code },
      }
    }),
    policy.allowSingleSource,
  )
  const account: AccountReport = {
    chain: 'evm',
    chain_id: chainId,
    address,
    status: acct.status === 'spent' ? 'ok' : acct.status === 'unused' ? 'unsafe' : 'unknown',
    reason: acct.reason,
    evidence: acct.reason === 'providers_down' ? { errors } : acct.evidence,
    sources: acct.sources,
  }
  // fail closed: one provider reports code and the other is down ⇒ unsafe even if single sources are disallowed
  if (account.status === 'unknown' && answers.length === 1 && answers[0]!.code !== '0x' && answers[0]!.code !== '') account.status = 'unsafe'
  return { items, account, finals }
}
