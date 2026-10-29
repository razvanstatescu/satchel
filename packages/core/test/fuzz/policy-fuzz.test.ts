/**
 * TS-side fuzzing of the reference classifier (@satchel/core/policy). The Rust side and the Rust-vs-TS differential
 * live in contracts/satchel/src/parse/fuzz_tests.rs; method and findings in docs/security/fuzzing.md.
 *
 *   pnpm --filter @satchel/core exec vitest run test/fuzz             # fast (FUZZ_CASES=2000 per chain)
 *   FUZZ_CASES=100000 pnpm --filter @satchel/core exec vitest run test/fuzz
 */
import { keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { describe, expect, it } from 'vitest'
import { concatBytes, equalBytes, hexToBytesStrict, toHex } from '../../src/bytes'
import { corpus, loadSeeds, type Case, type Chain } from './gen'

const N = Number(process.env.FUZZ_CASES ?? 2000)
const SEED = Number(process.env.FUZZ_SEED ?? 1)

const CODES: Record<Chain, string[]> = {
  evm: ['ERR_EVM_TOO_LONG', 'ERR_EVM_TYPE', 'ERR_EVM_RLP', 'ERR_EVM_CHAIN_ID', 'ERR_EVM_INT_WIDTH', 'ERR_EVM_TO', 'ERR_EVM_DATA', 'ERR_EVM_ACCESS_LIST'],
  btc: [
    'ERR_BTC_INPUT_COUNT', 'ERR_BTC_PREIMAGE_LEN', 'ERR_BTC_VERSION', 'ERR_BTC_SIGHASH', 'ERR_BTC_SCRIPTCODE', 'ERR_BTC_LOCKTIME', 'ERR_BTC_SEQUENCE',
    'ERR_BTC_MIXED_TX', 'ERR_BTC_PREVOUTS_INCOMPLETE', 'ERR_BTC_SEQUENCES_MISMATCH', 'ERR_BTC_OUTPUTS_MISMATCH', 'ERR_BTC_OUTPUTS_MALFORMED',
    'ERR_BTC_DUPLICATE_INPUT',
  ],
  sol: ['ERR_SOL_TOO_LONG', 'ERR_SOL_VERSION', 'ERR_SOL_HEADER', 'ERR_SOL_MALFORMED', 'ERR_SOL_INSTRUCTION', 'ERR_SOL_DURABLE_NONCE'],
}

const sha256d = (b: Uint8Array) => sha256(sha256(b))
const u32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset).getUint32(o, true)
const hex = (s: string) => hexToBytesStrict(s)

/** Accept ⇒ every §5.9 invariant holds (checked with independent, minimal code). Returns a reason or null. */
function invariantViolation(chain: Chain, c: Case): string | null {
  if (chain === 'evm' && 'evm' in c.r) {
    const b = hex(c.r.evm.unsigned_tx)
    if (b.length > 128 || b[0] !== 2) return 'type/len'
    const head = b[1]! <= 0xf7 ? 2 : 3
    if (toHex(b.subarray(head, head + 4)) !== '83aa36a7') return 'chain id is not the first item = 11155111'
    if (toHex(b.subarray(-2)) !== '80c0') return 'data / access list not empty'
    if (c.h?.[0] !== toHex(keccak_256(b)) || c.f?.chain_id !== '11155111') return 'hash/fields'
    return null
  }
  if (chain === 'btc' && 'btc' in c.r) {
    const pre = c.r.btc.preimages.map(hex)
    const outs = hex(c.r.btc.outputs)
    if (pre.length < 1 || pre.length > 10 || outs.length > 1024 || outs.length === 0) return 'counts'
    const f = pre[0]!
    for (const p of pre) {
      if (p.length !== 182 || u32(p, 0) !== 2 || toHex(p.subarray(104, 108)) !== '1976a914' || toHex(p.subarray(128, 130)) !== '88ac') return 'layout'
      if (u32(p, 138) < 0xfffffffd || u32(p, 174) !== 0 || u32(p, 178) !== 1) return 'sequence/locktime/sighash'
      if (!equalBytes(p.subarray(4, 68), f.subarray(4, 68)) || !equalBytes(p.subarray(108, 128), f.subarray(108, 128)) || !equalBytes(p.subarray(142, 174), f.subarray(142, 174)))
        return 'mixed'
    }
    if (new Set(pre.map((p) => toHex(p.subarray(68, 104)))).size !== pre.length) return 'duplicate input'
    if (!equalBytes(sha256d(concatBytes(...pre.map((p) => p.subarray(68, 104)))), f.subarray(4, 36))) return 'hashPrevouts'
    if (!equalBytes(sha256d(concatBytes(...pre.map((p) => p.subarray(138, 142)))), f.subarray(36, 68))) return 'hashSequence'
    if (!equalBytes(sha256d(outs), f.subarray(142, 174))) return 'hashOutputs'
    if (JSON.stringify(c.h) !== JSON.stringify(pre.map((p) => toHex(sha256d(p))))) return 'record hashes'
    return null
  }
  if (chain === 'sol' && 'sol' in c.r) {
    const m = hex(c.r.sol.message)
    if (m.length > 1232 || m[0] !== 1 || m[1] !== 0) return 'len/header'
    const ix = m.subarray(-13)
    if (ix[0] !== 0x0c || toHex(ix.subarray(1, 5)) !== '02000000') return 'last instruction is not a 12-byte Transfer'
    const lamports = new DataView(ix.buffer, ix.byteOffset + 5).getBigUint64(0, true)
    if (c.f?.lamports !== lamports.toString() || c.h?.[0] !== toHex(sha256(m))) return 'fields/hash'
    return null
  }
  return 'chain mismatch'
}

describe('fuzz: TS reference classifier', () => {
  const seeds = loadSeeds()
  for (const chain of ['evm', 'btc', 'sol'] as const) {
    it(`${chain}: ${N} generated cases never throw, refuse with a stable code, and accept only valid requests`, () => {
      const hist: Record<string, number> = {}
      const bad: string[] = []
      for (const c of corpus(chain, N, SEED, seeds)) {
        hist[c.v] = (hist[c.v] ?? 0) + 1
        if (c.v.startsWith('THROW:')) bad.push(`throw ${c.v} on ${JSON.stringify(c.r).slice(0, 300)}`)
        else if (c.v === 'ok') {
          const why = invariantViolation(chain, c)
          if (why) bad.push(`accepted but ${why}: ${JSON.stringify(c.r).slice(0, 600)}`)
        } else if (c.v !== 'ERR_HEX' && !CODES[chain].includes(c.v)) bad.push(`unknown code ${c.v}`)
        if (bad.length > 10) break
      }
      expect(bad).toEqual([])
      expect(hist.ok ?? 0).toBeGreaterThan(N / 50)
      if (N >= 2000) for (const code of CODES[chain]) expect(hist[code] ?? 0, `${chain} never produced ${code}`).toBeGreaterThan(0)
    })
  }

  it('is deterministic for a seed', () => {
    const a = JSON.stringify([...corpus('btc', 40, 7, seeds)])
    const b = JSON.stringify([...corpus('btc', 40, 7, seeds)])
    expect(a).toBe(b)
    expect(JSON.stringify([...corpus('btc', 40, 8, seeds)])).not.toBe(a)
  })
})
