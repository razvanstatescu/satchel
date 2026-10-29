/**
 * Review SR-01 (docs/security/sprint-review.md): the EVM nonce rule's confirmation depth is per chain. Before the fix,
 * one block count (3) applied to every chain, so a Base / OP Sepolia "spent" verdict was ≈ 6 s deep and an Arbitrum
 * Sepolia one < 1 s deep, and "spent" verdicts are cached as final.
 */
import { describe, expect, it } from 'vitest'
import { serializeTransaction } from 'viem'
import { checkCleanHistory, checkEvm, evmDepth, TESTNET_POLICY, type CheckInput, type EvmSource, type SigRecordView } from '../src/clean-history'
import { evmRecord, fakeEvm, fakeSol, snapshot } from './helpers'

const RCPT = '0x61739f33adbb7f76c1b5b222e4119085257528be'
const SEPOLIA = 11155111
const BASE = 84532
const ARB = 421614
const OP = 11155420
const ADDR = '0x' + '11'.repeat(20)
const NOW = Date.parse('2026-11-05T12:00:00Z')

const native = (chainId: number, nonce: number) =>
  serializeTransaction({ type: 'eip1559', chainId, nonce, to: RCPT, value: 1n, gas: 21_000n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n }).slice(2)

/** A provider whose account nonce became 1 at block `usedAt` (head 1,000); records every block tag it was asked. */
function recentSpend(name: string, chainId: number, usedAt: bigint, tags: (bigint | 'latest')[]): EvmSource {
  return {
    name,
    chainId: async () => chainId,
    blockNumber: async () => 1000n,
    getTransactionCount: async (_a, b) => {
      tags.push(b)
      return b === 'latest' || b >= usedAt ? 1n : 0n
    },
    getCode: async () => '0x',
  }
}

function input(records: SigRecordView[]): CheckInput {
  return { network: 'testnet', contractId: 'dev1.satchelhq.testnet', tokenId: '1', role: 'dev', near: [snapshot('a', records), snapshot('b', records)], now: NOW }
}

describe('SR-01: per-chain EVM confirmation depth', () => {
  it('defaults: Sepolia keeps spec §7.4 (3 blocks); each L2 gets ≈ 60 s of blocks', () => {
    expect(evmDepth(TESTNET_POLICY, SEPOLIA)).toBe(3)
    expect(evmDepth(TESTNET_POLICY, BASE)).toBe(30)
    expect(evmDepth(TESTNET_POLICY, OP)).toBe(30)
    expect(evmDepth(TESTNET_POLICY, ARB)).toBe(240)
  })

  it('a per-chain value never makes the rule shallower than the global one', () => {
    expect(evmDepth({ ...TESTNET_POLICY, evmConfirmations: 50 }, BASE)).toBe(50)
    expect(evmDepth({ ...TESTNET_POLICY, evmConfirmationsByChain: { [BASE]: 1 } }, BASE)).toBe(3)
    expect(evmDepth({ ...TESTNET_POLICY, evmConfirmationsByChain: undefined }, ARB)).toBe(3)
  })

  it('a Base nonce used 10 blocks ago (≈ 20 s) is settling, not spent (was spent at depth 3)', async () => {
    const tags: (bigint | 'latest')[] = []
    const srcs = [recentSpend('base-a', BASE, 990n, tags), recentSpend('base-b', BASE, 990n, tags)]
    const recs = [evmRecord(0, native(BASE, 0))]
    const r = await checkEvm(ADDR, recs, srcs, TESTNET_POLICY, new Map(), BASE)
    expect(tags.filter((t) => t !== 'latest')).toEqual([970n, 970n]) // head − 30 on both providers
    expect([r.items[0]!.status, r.items[0]!.reason]).toEqual(['settling', 'nonce_used_unconfirmed'])
    expect(r.finals).toEqual([]) // nothing cached as final
    // the old behaviour, for the record: one global depth of 3 judged it spent and cached it
    const old = await checkEvm(ADDR, recs, srcs, { ...TESTNET_POLICY, evmConfirmationsByChain: {} }, new Map(), BASE)
    expect(old.items[0]!.status).toBe('spent')
  })

  it('an Arbitrum Sepolia nonce used 100 blocks ago (≈ 25 s) is still settling; 300 blocks ago it is spent', async () => {
    const recs = [evmRecord(0, native(ARB, 0))]
    const young = await checkEvm(ADDR, recs, [recentSpend('a', ARB, 900n, []), recentSpend('b', ARB, 900n, [])], TESTNET_POLICY, new Map(), ARB)
    expect(young.items[0]!.status).toBe('settling')
    const old = await checkEvm(ADDR, recs, [recentSpend('a', ARB, 700n, []), recentSpend('b', ARB, 700n, [])], TESTNET_POLICY, new Map(), ARB)
    expect(old.items[0]!.status).toBe('spent')
  })

  it('Sepolia is unchanged: a nonce used 5 blocks ago is spent at depth 3', async () => {
    const recs = [evmRecord(0, native(SEPOLIA, 0))]
    const r = await checkEvm(ADDR, recs, [recentSpend('a', SEPOLIA, 995n, []), recentSpend('b', SEPOLIA, 995n, [])], TESTNET_POLICY)
    expect(r.items[0]!.status).toBe('spent')
  })

  it('the checker uses the per-chain depth end to end, blocks Buy while settling, and reports the tags', async () => {
    const recs = [evmRecord(0, native(SEPOLIA, 0)), evmRecord(1, native(BASE, 0))]
    const deps = {
      evm: [fakeEvm('sep-a', { safe: 1n }), fakeEvm('sep-b', { safe: 1n })],
      evmByChain: { [BASE]: [recentSpend('base-a', BASE, 990n, []), recentSpend('base-b', BASE, 990n, [])] },
      btc: [],
      sol: [fakeSol('s', {})],
    }
    const r = await checkCleanHistory(input(recs), deps)
    expect(r.items.map((i) => [i.chain_id, i.status])).toEqual([[SEPOLIA, 'spent'], [BASE, 'settling']])
    expect([r.aggregate, r.buy_enabled]).toEqual(['settling', false])
    expect(r.policy.evm).toBe('latest-3')
    expect(r.policy.evm_by_chain).toEqual({ [SEPOLIA]: 'latest-3', [BASE]: 'latest-30' })
    // a Sepolia-only history keeps the pre-C3 report shape
    const only = await checkCleanHistory(input([recs[0]!]), deps)
    expect(only.policy).not.toHaveProperty('evm_by_chain')
  })
})
