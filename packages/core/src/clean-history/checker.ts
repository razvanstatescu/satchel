/**
 * The isomorphic clean-history checker (spec §7; kb/70 §P3). Pure orchestration over injected sources:
 * the browser (Buy gate, every 10 s and right before Buy), the server route (hint only) and tools/e2e all call this.
 *
 *  1. NEAR (≥ 2 RPCs must agree): sig_count, every record seq 0..sig_count, contract keys + code hash, MPC keys
 *  2. our own derivation of the three addresses (vs the UI's and vs the MPC's derived_public_key)
 *  3. per record → spent | expired | unfunded | foreign | settling | unused | unknown; per account → ok | unsafe | unknown
 *  4. gate (role) → empty | unsafe | unknown | blocked | settling | clean
 */
import { deriveEd25519, deriveSatchelAddresses, deriveSecp256k1, nearKeyString, tokenPath } from '../derive'
import { checkBtc, ownBtcScripts } from './btc'
import { checkEvm } from './evm'
import { gate } from './gate'
import { checkSol } from './sol'
import {
  type CheckDeps,
  type CheckInput,
  type CleanHistoryReport,
  type ItemReport,
  type NearSnapshot,
  type Policy,
  type SigRecordView,
  TESTNET_POLICY,
} from './types'
import { cacheGet, cacheKey, cacheSet, normalizeCodeHash } from './util'

/** Safety-relevant fields only: status/signature legitimately lag between RPCs (on_signed), so they are ignored. */
function fingerprint(s: NearSnapshot): string {
  const recs = [...s.records]
    .sort((a, b) => a.seq - b.seq)
    .map((r) => [r.seq, r.request_id, r.input_index, r.chain, r.height, r.timestamp_ms, r.requester, r.payload.toLowerCase(), JSON.stringify(r.detail)])
  return JSON.stringify([s.sigCount, recs, s.contract.exists, s.contract.accessKeyCount, normalizeCodeHash(s.contract.codeHash), s.mpcKeys ?? null])
}

function complete(s: NearSnapshot): boolean {
  if (s.records.length !== s.sigCount) return false
  const seqs = s.records.map((r) => r.seq).sort((a, b) => a - b)
  return seqs.every((q, i) => q === i)
}

export interface NearMerge {
  ok: boolean
  snapshot: NearSnapshot | null
  sources: number
  reason: string | null
}

export function mergeNearSnapshots(results: CheckInput['near'], allowSingle: boolean): NearMerge {
  const ok = results.filter((r): r is NearSnapshot => !('error' in r))
  if (ok.length === 0) return { ok: false, snapshot: null, sources: 0, reason: 'near_unavailable' }
  const fp = fingerprint(ok[0]!)
  if (ok.some((s) => fingerprint(s) !== fp)) return { ok: false, snapshot: null, sources: ok.length, reason: 'near_disagree' }
  const snap = ok[0]!
  if (!complete(snap)) return { ok: false, snapshot: snap, sources: ok.length, reason: 'records_incomplete' }
  if (ok.length === 1 && !allowSingle) return { ok: false, snapshot: snap, sources: 1, reason: 'near_one_source' }
  return { ok: true, snapshot: snap, sources: ok.length, reason: null }
}

async function cachedFor(input: CheckInput, deps: CheckDeps, recs: SigRecordView[]): Promise<Map<number, Record<string, unknown>>> {
  const m = new Map<number, Record<string, unknown>>()
  await Promise.all(
    recs.map(async (r) => {
      const v = await cacheGet(deps.cache, cacheKey(input.contractId, input.tokenId, r))
      if (v) m.set(r.seq, v.evidence)
    }),
  )
  return m
}

export async function checkCleanHistory(input: CheckInput, deps: CheckDeps): Promise<CleanHistoryReport> {
  const policy: Policy = { ...TESTNET_POLICY, ...input.policy }
  const addrs = deriveSatchelAddresses(input.network, input.contractId, input.tokenId)
  const addresses = { btc: addrs.btc, evm: addrs.evm, sol: addrs.sol }

  let addressesOk: boolean | null = null
  if (input.displayedAddresses) {
    const d = input.displayedAddresses
    addressesOk =
      (d.btc === undefined || d.btc.toLowerCase() === addrs.btc.toLowerCase()) &&
      (d.evm === undefined || d.evm.toLowerCase() === addrs.evm.toLowerCase()) &&
      (d.sol === undefined || d.sol === addrs.sol)
  }

  const near = mergeNearSnapshots(input.near, policy.allowSingleSource)
  const snap = near.snapshot

  let mpcKeysOk: boolean | null = null
  if (snap?.mpcKeys) {
    const want = {
      btc: nearKeyString('secp256k1', deriveSecp256k1(input.network, input.contractId, tokenPath(input.tokenId, 'btc')).uncompressed),
      evm: nearKeyString('secp256k1', deriveSecp256k1(input.network, input.contractId, tokenPath(input.tokenId, 'evm')).uncompressed),
      sol: nearKeyString('ed25519', deriveEd25519(input.network, input.contractId, tokenPath(input.tokenId, 'sol'))),
    }
    const k = snap.mpcKeys
    mpcKeysOk = (k.btc === undefined || k.btc === want.btc) && (k.evm === undefined || k.evm === want.evm) && (k.sol === undefined || k.sol === want.sol)
  }

  const expected = normalizeCodeHash(input.expectedCodeHash ?? null)
  const actual = snap ? normalizeCodeHash(snap.contract.codeHash) : null
  let codeOk: boolean | null = null
  if (expected && actual) codeOk = expected === actual
  else if (expected && snap && !snap.contract.exists) codeOk = false

  const records = near.ok && snap ? [...snap.records].sort((a, b) => a.seq - b.seq) : []
  const byChain = (c: SigRecordView['chain']) => records.filter((r) => r.chain === c)
  const [evmRecs, btcRecs, solRecs] = [byChain('evm'), byChain('btc'), byChain('sol')]
  const [cEvm, cBtc, cSol] = await Promise.all([cachedFor(input, deps, evmRecs), cachedFor(input, deps, btcRecs), cachedFor(input, deps, solRecs)])

  const [evm, btc, sol] = await Promise.all([
    checkEvm(addrs.evm, evmRecs, deps.evm, policy, cEvm),
    checkBtc(btcRecs, deps.btc, policy, cBtc, ownBtcScripts(addrs.btcPubkey)),
    checkSol(addrs.sol, solRecs, deps.sol, policy, input.now, cSol),
  ])

  // persist final verdicts only
  const bySeq = new Map(records.map((r) => [r.seq, r]))
  const writes: Promise<void>[] = []
  for (const [chainFinals, status] of [
    [evm.finals, 'spent'],
    [btc.finals, 'spent'],
    [sol.finals, 'expired'],
  ] as const) {
    for (const f of chainFinals) {
      const r = bySeq.get(f.seq)
      if (r) writes.push(cacheSet(deps.cache, cacheKey(input.contractId, input.tokenId, r), { status, evidence: f.evidence, at: input.now }))
    }
  }
  await Promise.all(writes)

  const items: ItemReport[] = [...evm.items, ...btc.items, ...sol.items].sort((a, b) => a.seq - b.seq)
  const accounts = [evm.account, sol.account]

  const g = gate({
    role: input.role,
    sigCount: near.ok && snap ? snap.sigCount : null,
    nearOk: near.ok,
    contract: {
      exists: snap ? snap.contract.exists : null,
      accessKeys: snap ? snap.contract.accessKeyCount : null,
      codeOk,
      expectedCodeHash: expected,
    },
    mpcKeysOk,
    addressesOk,
    accounts: accounts.map((a) => a.status),
    items: items.map((i) => i.status),
  })
  if (near.reason) g.reasons.push(near.reason)

  const single =
    near.sources === 1 ||
    evm.account.sources === 1 ||
    items.some((i) => i.chain !== 'sol' && i.sources === 1 && i.status !== 'unknown')
  return {
    token_id: input.tokenId,
    checked_at: new Date(input.now).toISOString(),
    policy: { evm: `latest-${policy.evmConfirmations}`, btc_k: policy.btcK, sol_min_age_s: policy.solMinAgeMs / 1000, allow_single_source: policy.allowSingleSource },
    sig_count: near.ok && snap ? snap.sigCount : null,
    aggregate: g.aggregate,
    buy_enabled: g.buyEnabled,
    expected_sig_count: g.buyEnabled && snap ? snap.sigCount : null,
    sources_note: single && policy.allowSingleSource ? '1 of 2 sources' : null,
    warnings: g.warnings,
    reasons: g.reasons,
    contract: {
      account_id: input.contractId,
      role: input.role,
      exists: snap ? snap.contract.exists : null,
      access_keys: snap ? snap.contract.accessKeyCount : null,
      locked: snap ? snap.contract.exists && snap.contract.accessKeyCount === 0 : null,
      code_hash: actual,
      expected_code_hash: expected,
      code_ok: codeOk,
      mpc_keys_ok: mpcKeysOk,
      addresses_ok: addressesOk,
      near_sources: near.sources,
    },
    addresses,
    accounts,
    items,
    encumbered_outpoints: btc.encumbered,
  }
}
