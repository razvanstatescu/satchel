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
  evm: [
    'ERR_EVM_TOO_LONG', 'ERR_EVM_TYPE', 'ERR_EVM_RLP', 'ERR_EVM_CHAIN_ID', 'ERR_EVM_INT_WIDTH', 'ERR_EVM_TO', 'ERR_EVM_DATA', 'ERR_EVM_TOKEN',
    'ERR_EVM_VALUE', 'ERR_EVM_ACCESS_LIST',
  ],
  btc: [
    'ERR_BTC_INPUT_COUNT', 'ERR_BTC_PREIMAGE_LEN', 'ERR_BTC_VERSION', 'ERR_BTC_SIGHASH', 'ERR_BTC_SCRIPTCODE', 'ERR_BTC_LOCKTIME', 'ERR_BTC_SEQUENCE',
    'ERR_BTC_MIXED_TX', 'ERR_BTC_PREVOUTS_INCOMPLETE', 'ERR_BTC_SEQUENCES_MISMATCH', 'ERR_BTC_OUTPUTS_MISMATCH', 'ERR_BTC_OUTPUTS_MALFORMED',
    'ERR_BTC_DUPLICATE_INPUT',
  ],
  sol: ['ERR_SOL_TOO_LONG', 'ERR_SOL_VERSION', 'ERR_SOL_HEADER', 'ERR_SOL_MALFORMED', 'ERR_SOL_INSTRUCTION', 'ERR_SOL_DURABLE_NONCE'],
  msg: ['ERR_MSG_EMPTY', 'ERR_MSG_TOO_LONG', 'ERR_MSG_ENCODING'],
}

/** C3 chain id RLP items (first list item) and their C2 USDC, from the spec table. */
const CHAIN_HEADS: Record<string, string> = {
  '83aa36a7': '1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  '83014a34': '036cbd53842c5426634e7929541ec2318f3dcf7e',
  '83066eee': '75faf114eafb1bdbe2f0316df893fd58ce46aa4d',
  '83aa37dc': '5fd84259d66cd46123540766be93dfe6d43130d7',
}
const utf8ok = (m: Uint8Array) => Buffer.from(Buffer.from(m).toString('utf8'), 'utf8').equals(Buffer.from(m))

const sha256d = (b: Uint8Array) => sha256(sha256(b))
const u32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset).getUint32(o, true)
const hex = (s: string) => hexToBytesStrict(s)

/** Accept ⇒ every §5.9 invariant holds (checked with independent, minimal code). Returns a reason or null. */
function invariantViolation(chain: Chain, c: Case): string | null {
  if (chain === 'evm' && 'evm' in c.r) {
    const b = hex(c.r.evm.unsigned_tx)
    if (b.length > 160 || b[0] !== 2) return 'type/len'
    const head = b[1]! <= 0xf7 ? 2 : 3
    const token = CHAIN_HEADS[toHex(b.subarray(head, head + 4))]
    if (!token) return 'chain id is not the first item = one of the four testnets'
    // C2: … 94 ‖ token(20) ‖ 80 (value 0) ‖ b8 44 ‖ a9059cbb ‖ 12 zero ‖ to ‖ 16 zero ‖ amount ‖ c0. Decide by this shape,
    // not by the last two bytes: an amount ending in 0x80 also ends the tx with `80c0`.
    const t = b.subarray(-93)
    const transferShape = b.length >= 93 + 6 && t[0] === 0x94 && t[21] === 0x80 && toHex(t.subarray(22, 28)) === 'b844a9059cbb' && t[92] === 0xc0
    if (transferShape) {
      if (toHex(t.subarray(1, 21)) !== token) return "a transfer to something other than this chain's USDC"
      if (t.subarray(28, 40).some((x) => x !== 0) || t.subarray(60, 76).some((x) => x !== 0)) return 'non-canonical transfer words'
      if (!c.f?.erc20) return 'erc20 fields missing'
    } else if (toHex(b.subarray(-2)) !== '80c0') return 'data is neither empty nor a USDC transfer with value 0'
    else if (c.f?.erc20) return 'erc20 fields on a native transfer'
    if (c.h?.[0] !== toHex(keccak_256(b))) return 'hash/fields'
    return null
  }
  if (chain === 'msg' && ('evm_message' in c.r || 'sol_message' in c.r)) {
    const isEvm = 'evm_message' in c.r
    const m = hex('evm_message' in c.r ? c.r.evm_message.message : 'sol_message' in c.r ? c.r.sol_message.message : '')
    if (m.length < 1 || m.length > 1024 || !utf8ok(m)) return 'message length / UTF-8'
    const enc = new TextEncoder()
    const want = isEvm
      ? keccak_256(concatBytes(enc.encode(`\x19Ethereum Signed Message:\n${m.length}`), m))
      : sha256(concatBytes(Uint8Array.of(0xff), enc.encode('solana offchain'), Uint8Array.of(0, m.every((x) => x >= 0x20 && x < 0x7f) ? 0 : 1, m.length & 0xff, m.length >> 8), m))
    if (c.h?.[0] !== toHex(want) || c.f?.message !== toHex(m)) return 'hash/fields'
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
  for (const chain of ['evm', 'btc', 'sol', 'msg'] as const) {
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
