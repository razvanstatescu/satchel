/**
 * The Day-5 fan-out (R-14, D-33 fallback F): split dev1 #1's large balances across the Satchel addresses, with the
 * per-address amounts of plan §5.3 / research/final-addresses.md. Data only; addresses are derived, never typed.
 */
import type { ToolConfig } from '../lib/config'
import { parseUnits } from '../lib/units'
import { addressesOf, resolveSet, type Target } from './common'

export interface FundingRow {
  set: 'final' | 'rc' | 'dev1'
  token: string
  /** Sepolia ETH, decimal string */
  eth?: string
  /** one BTC output (UTXO) per entry, sats */
  btcUtxos?: number[]
}

/** plan §5.3 "Funding plan" (fallback F: everything except dev1 #1, which is the source). */
export const FUNDING_PLAN: FundingRow[] = [
  { set: 'final', token: '1', eth: '0.05', btcUtxos: [100_000, 50_000, 50_000] },
  { set: 'final', token: '2', eth: '0.02', btcUtxos: [50_000, 50_000] },
  { set: 'final', token: '3', eth: '0.02', btcUtxos: [50_000] },
  { set: 'final', token: '4', eth: '0.01' },
  { set: 'final', token: '5', eth: '0.01', btcUtxos: [50_000, 50_000] },
  { set: 'final', token: '6', eth: '0.02', btcUtxos: [50_000] },
  { set: 'final', token: '7', eth: '0.02', btcUtxos: [50_000, 50_000] },
  { set: 'rc', token: '1', eth: '0.01', btcUtxos: [50_000, 50_000] },
  { set: 'rc', token: '2', eth: '0.01' },
  { set: 'dev1', token: '2', eth: '0.01', btcUtxos: [50_000] },
  { set: 'dev1', token: '3', eth: '0.01' },
]

export interface FanoutLeg extends Target {
  /** base units: wei for EVM, sats for BTC */
  amount: bigint
}

export function fundingLegs(cfg: ToolConfig, chain: 'evm' | 'btc', sets?: string[]): FanoutLeg[] {
  const legs: FanoutLeg[] = []
  for (const r of FUNDING_PLAN) {
    if (sets && !sets.includes(r.set)) continue
    const contract = resolveSet(cfg, r.set)
    const addr = addressesOf(cfg, r.token, contract)[chain]
    const label = `${r.set}#${r.token}`
    if (chain === 'evm' && r.eth) legs.push({ address: addr, label, contract, tokenId: r.token, amount: parseUnits(r.eth, 'eth') })
    if (chain === 'btc') for (const s of r.btcUtxos ?? []) legs.push({ address: addr, label, contract, tokenId: r.token, amount: BigInt(s) })
  }
  return legs
}

export const legsTotal = (legs: FanoutLeg[]): bigint => legs.reduce((s, l) => s + l.amount, 0n)

/** Targets with one amount each (`--targets … --amount-each …`). */
export const evenLegs = (targets: Target[], amountEach: bigint): FanoutLeg[] => targets.map((t) => ({ ...t, amount: amountEach }))
