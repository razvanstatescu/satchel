/**
 * Gate modes by CONTRACT_ROLE (spec §7.3, R-06, INV-33) and the aggregate verdict. Pure.
 *
 * | role  | lock or code-hash failure                                   | every other check |
 * | dev   | warning "dev_contract_checks_skipped" (+ the specific one)   | gates Buy         |
 * | rc    | unsafe                                                       | gates Buy         |
 * | final | unsafe                                                       | gates Buy         |
 */
import type { AccountStatus, Aggregate, ContractRole, ItemStatus } from './types'

export interface GateInput {
  role: ContractRole
  /** null = could not be determined (NEAR down or disagreeing) */
  sigCount: number | null
  nearOk: boolean
  contract: { exists: boolean | null; accessKeys: number | null; codeOk: boolean | null; expectedCodeHash: string | null }
  /** derived keys vs MPC view; addresses vs UI. false ⇒ unsafe in every mode; null ⇒ not checked */
  mpcKeysOk: boolean | null
  addressesOk: boolean | null
  accounts: AccountStatus[]
  items: ItemStatus[]
}

export interface GateResult {
  aggregate: Aggregate
  buyEnabled: boolean
  warnings: string[]
  reasons: string[]
}

export const BUY_ENABLED: ReadonlySet<Aggregate> = new Set(['clean', 'empty'])

export function gate(g: GateInput): GateResult {
  const warnings: string[] = []
  const unsafe: string[] = []
  const unknown: string[] = []

  // contract-level: lock + code hash depend on the role
  const lockProblems: string[] = []
  if (g.contract.exists === false) lockProblems.push('contract_missing')
  else if (g.contract.accessKeys !== null && g.contract.accessKeys > 0) lockProblems.push('contract_has_keys')
  if (g.role !== 'dev' && !g.contract.expectedCodeHash) lockProblems.push('expected_code_hash_not_configured')
  else if (g.contract.codeOk === false) lockProblems.push('code_hash_mismatch')
  const lockUnknown = g.contract.exists === null || g.contract.accessKeys === null || (g.contract.expectedCodeHash !== null && g.contract.codeOk === null)

  if (g.role === 'dev') {
    warnings.push('dev_contract_checks_skipped', ...lockProblems)
  } else {
    unsafe.push(...lockProblems)
    if (lockUnknown && lockProblems.length === 0) unknown.push('contract_facts_unavailable')
  }

  // checks that gate in every mode
  if (g.mpcKeysOk === false) unsafe.push('mpc_keys_mismatch')
  if (g.addressesOk === false) unsafe.push('displayed_addresses_mismatch')
  if (g.mpcKeysOk === null) warnings.push('mpc_keys_not_checked')
  if (g.accounts.includes('unsafe')) unsafe.push('account_unsafe')
  if (g.accounts.includes('unknown')) unknown.push('account_unverified')
  if (!g.nearOk || g.sigCount === null) unknown.push('near_records_unverified')
  if (g.items.includes('unknown')) unknown.push('item_unknown')

  let aggregate: Aggregate
  const reasons: string[] = []
  if (unsafe.length) {
    aggregate = 'unsafe'
    reasons.push(...unsafe)
  } else if (unknown.length) {
    aggregate = 'unknown'
    reasons.push(...unknown)
  } else if (g.items.includes('unused')) {
    aggregate = 'blocked'
    reasons.push('item_unused')
  } else if (g.items.includes('settling')) {
    aggregate = 'settling'
    reasons.push('item_settling')
  } else if (g.sigCount === 0) {
    aggregate = 'empty'
  } else {
    aggregate = 'clean' // every item spent, expired, unfunded or foreign
  }
  return { aggregate, buyEnabled: BUY_ENABLED.has(aggregate), warnings, reasons }
}

/** Banner per role (kb/80 R3 `role.dev` / `role.rc`, sentence case per E-46). */
export function roleBanner(role: ContractRole): string | null {
  if (role === 'dev') return 'Dev contract: lock and code checks skipped'
  if (role === 'rc') return 'Release candidate: testnet rehearsal'
  return null
}
