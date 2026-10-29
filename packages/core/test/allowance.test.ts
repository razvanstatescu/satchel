/** C5 allowance mirror against the shared vectors (the same file the Rust tests replay), plus the view helpers. */
import { describe, expect, it } from 'vitest'
import vectors from '../../../vectors/allowance.json' with { type: 'json' }
import {
  ALLOWANCE_WINDOW_MS,
  AllowanceRefusal,
  allowanceDebits,
  allowanceRemaining,
  applyDebits,
  assetKey,
  capRemaining,
  checkDelegatedSign,
  evmDebits,
  MAX_SPENDS,
  validateCaps,
  type AllowanceView,
  type Asset,
  type CapState,
} from '../src/policy'
import { ALLOWANCE_ATTACH, revokeAllowanceCall, setAllowanceCall, type SignRequest } from '../src/near'
import { hexToBytesStrict } from '../src/bytes'

type DebitJ = { asset: Asset; amount: string }
const W = ALLOWANCE_WINDOW_MS
const T0 = 1_793_000_000_000
const SEPOLIA = 11155111
const KB31 = '02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'
const KB31_DEBIT = 100_000_000_000_000n + 21_000n * 200_028n
const j = (ds: { asset: Asset; amount: bigint }[]): DebitJ[] => ds.map((d) => ({ asset: d.asset, amount: d.amount.toString() }))

describe('shared vectors: vectors/allowance.json', () => {
  it('has the expected schema and constants', () => {
    expect(vectors.schema).toBe('satchel-allowance-vectors/1')
    expect(vectors.window_ms).toBe(W)
    expect(vectors.max_spends).toBe(MAX_SPENDS)
  })

  it.each(vectors.debits.map((v) => [v.name, v] as const))('debits %s', (_, v) => {
    const r = allowanceDebits(v.request as SignRequest)
    if (v.expect.ok) {
      expect(r.ok).toBe(true)
      if (r.ok) expect(j(r.debits)).toEqual((v.expect as { debits: DebitJ[] }).debits)
    } else expect(r).toEqual({ ok: false, error: (v.expect as { error: string }).error })
  })

  it.each(vectors.evm_raw.map((v) => [v.name, v] as const))('evm_raw %s', (_, v) => {
    const tx = hexToBytesStrict(v.unsigned_tx)
    if (v.expect.ok) expect(j(evmDebits(tx))).toEqual((v.expect as { debits: DebitJ[] }).debits)
    else {
      let code: string | undefined
      try {
        evmDebits(tx)
      } catch (e) {
        expect(e).toBeInstanceOf(AllowanceRefusal)
        code = (e as AllowanceRefusal).code
      }
      expect(code).toBe((v.expect as { error: string }).error)
    }
  })

  it.each(vectors.window.map((v) => [v.name, v] as const))('window %s', (_, v) => {
    const caps: CapState[] = v.caps.map((c) => ({
      asset: c.asset as Asset,
      limit: BigInt(c.limit),
      spends: c.spends.map((s) => ({ at_ms: s.at_ms, amount: BigInt(s.amount) })),
    }))
    expect(caps.map((c) => capRemaining(c, v.now_ms).toString())).toEqual(v.expect.remaining_before)
    const r = applyDebits(caps, v.debits.map((d) => ({ asset: d.asset as Asset, amount: BigInt(d.amount) })), v.now_ms)
    if (v.expect.ok) {
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.caps.map((c) => capRemaining(c, v.now_ms).toString())).toEqual(v.expect.remaining_after)
    } else expect(r.ok ? 'ok' : r.error).toBe(v.expect.error)
  })
})

function view(over: Partial<AllowanceView> = {}): AllowanceView {
  return {
    token_id: '1',
    delegate: 'bot.testnet',
    owner_id: 'alice.testnet',
    set_at_ms: T0,
    expires_at_ms: null,
    status: 'active',
    now_ms: T0 + 1_000,
    window_ms: W,
    spends_in_window: 1,
    max_spends: 32,
    caps: [
      { asset: { evm: { chain_id: SEPOLIA } }, limit: (2n * KB31_DEBIT).toString(), spent: KB31_DEBIT.toString(), remaining: KB31_DEBIT.toString(), spends: [{ at_ms: T0, amount: KB31_DEBIT.toString() }] },
      { asset: 'btc', limit: '100000', spent: '0', remaining: '100000', spends: [] },
    ],
    ...over,
  }
}

describe('allowanceRemaining', () => {
  it('rolls the window forward from the view', () => {
    const v = view()
    expect(allowanceRemaining(v)[0]).toMatchObject({ remaining: KB31_DEBIT, spent: KB31_DEBIT, nextReleaseMs: T0 + W })
    expect(allowanceRemaining(v, T0 + W - 1)[0]!.remaining).toBe(KB31_DEBIT)
    expect(allowanceRemaining(v, T0 + W)[0]).toMatchObject({ remaining: 2n * KB31_DEBIT, spent: 0n, nextReleaseMs: null })
    expect(allowanceRemaining(v)[1]).toMatchObject({ asset: 'btc', remaining: 100000n, nextReleaseMs: null })
  })
})

describe('checkDelegatedSign', () => {
  const req: SignRequest = { evm: { unsigned_tx: KB31 } }
  it('passes within the cap and reports what is left', () => {
    const r = checkDelegatedSign(view(), req)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(j(r.debits)).toEqual([{ asset: { evm: { chain_id: SEPOLIA } }, amount: KB31_DEBIT.toString() }])
      expect(r.remainingAfter[0]!.remaining).toBe(0n)
    }
  })
  it('refuses over the cap, then passes once the window rolls', () => {
    const v = view()
    const twice = checkDelegatedSign({ ...v, caps: [{ ...v.caps[0]!, limit: KB31_DEBIT.toString() }] }, req)
    expect(twice).toMatchObject({ ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' })
    expect(checkDelegatedSign({ ...v, caps: [{ ...v.caps[0]!, limit: KB31_DEBIT.toString() }] }, req, { nowMs: T0 + W }).ok).toBe(true)
  })
  it('follows the contract order: expiry, listing, classifier, caps', () => {
    expect(checkDelegatedSign(view({ expires_at_ms: T0 + 1_000 }), req)).toEqual({ ok: false, error: 'ERR_ALLOWANCE_EXPIRED' })
    expect(checkDelegatedSign(view({ expires_at_ms: T0 + 1_001 }), req).ok).toBe(true)
    expect(checkDelegatedSign(view({ status: 'paused' }), req)).toEqual({ ok: false, error: 'ERR_FROZEN' })
    expect(checkDelegatedSign(view(), req, { listed: true })).toEqual({ ok: false, error: 'ERR_FROZEN' })
    expect(checkDelegatedSign(view(), { evm: { unsigned_tx: '02' } })).toMatchObject({ ok: false, error: 'ERR_EVM_RLP' })
    const sol: SignRequest = { sol: { message: '00' } }
    expect(checkDelegatedSign(view(), sol)).toMatchObject({ ok: false })
  })
  it('refuses an asset without a cap', () => {
    const v = view({ caps: [view().caps[1]!] })
    expect(checkDelegatedSign(v, req)).toEqual({ ok: false, error: 'ERR_ALLOWANCE_ASSET' })
  })
})

describe('validateCaps and the call builders', () => {
  it('normalizes tokens and refuses what set_allowance refuses', () => {
    const tok = '0x1C7D4B196CB0C7B01D743FBC6116A902379C7238'
    const ok = validateCaps([{ asset: { erc20: { chain_id: SEPOLIA, token: tok } }, limit: 5n }])
    expect(ok).toEqual({ ok: true, caps: [{ asset: { erc20: { chain_id: SEPOLIA, token: tok.slice(2).toLowerCase() } }, limit: 5n }] })
    const bad: Parameters<typeof validateCaps>[0][] = [
      [],
      Array.from({ length: 9 }, (_, i) => ({ asset: { erc20: { chain_id: SEPOLIA, token: i.toString(16).padStart(40, '0') } }, limit: 1n })),
      [{ asset: 'btc', limit: 0n }],
      [{ asset: 'btc', limit: 1n }, { asset: 'btc', limit: 2n }],
      [{ asset: { evm: { chain_id: 1 } }, limit: 1n }],
      [{ asset: { erc20: { chain_id: SEPOLIA, token: 'abcd' } }, limit: 1n }],
      [{ asset: { erc20: { chain_id: SEPOLIA, token: tok } }, limit: 1n }, { asset: { erc20: { chain_id: SEPOLIA, token: tok.toLowerCase() } }, limit: 1n }],
    ]
    for (const caps of bad) expect(validateCaps(caps)).toMatchObject({ ok: false, error: 'ERR_ALLOWANCE_CAPS' })
    expect(validateCaps([{ asset: { evm: { chain_id: 84532 } }, limit: 1n }], [SEPOLIA, 84532]).ok).toBe(true)
  })

  it('builds set_allowance / revoke_allowance exactly as the spec shows', () => {
    const c = setAllowanceCall('1', 'bot.alice.testnet', [{ asset: 'btc', limit: 100000n }, { asset: { evm: { chain_id: SEPOLIA } }, limit: 10n ** 16n }], 1794000000000)
    expect(c.methodName).toBe('set_allowance')
    expect(JSON.stringify(c.args)).toBe(
      '{"token_id":"1","delegate":"bot.alice.testnet","caps":[{"asset":"btc","limit":"100000"},{"asset":{"evm":{"chain_id":11155111}},"limit":"10000000000000000"}],"expires_at_ms":1794000000000}',
    )
    expect(c.deposit).toBe(ALLOWANCE_ATTACH.set.deposit.toString())
    expect(c.deposit).toBe('10000000000000000000000')
    expect(c.gas).toBe('30000000000000')
    expect(() => setAllowanceCall('1', 'bot.testnet', [])).toThrow(/ERR_ALLOWANCE_CAPS/)
    expect(() => setAllowanceCall('01', 'bot.testnet', [{ asset: 'btc', limit: 1n }])).toThrow()
    const r = revokeAllowanceCall('1', 'bot.alice.testnet')
    expect(r).toEqual({ methodName: 'revoke_allowance', args: { token_id: '1', delegate: 'bot.alice.testnet' }, gas: '30000000000000', deposit: '1' })
  })

  it('compares assets canonically', () => {
    expect(assetKey({ erc20: { chain_id: 1, token: '0xAB' } })).toBe(assetKey({ erc20: { chain_id: 1, token: 'ab' } }))
    expect(assetKey('btc')).not.toBe(assetKey('sol'))
    expect(assetKey({ evm: { chain_id: 1 } })).not.toBe(assetKey({ evm: { chain_id: 2 } }))
  })
})

describe('window accounting: randomized against a brute-force oracle', () => {
  // A seeded LCG keeps the run deterministic.
  let seed = 20261029
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed % n
  }
  it('applyDebits never lets any 24 h window exceed the cap', () => {
    const cases = Number(process.env.FUZZ_CASES ?? 300)
    for (let k = 0; k < cases; k++) {
      const limit = BigInt(1 + rnd(2000))
      let caps: CapState[] = [{ asset: 'btc', limit, spends: [] }]
      const history: [number, bigint][] = []
      let t = T0
      for (let s = 0; s < 60; s++) {
        t += [rnd(5000), W - 3000 + rnd(6000), rnd(2 * W)][rnd(3)]!
        const amount = BigInt(rnd(3) === 0 ? rnd(1000) : rnd(60))
        const inWin = history.filter(([at]) => t < at + W)
        const sum = inWin.reduce((a, [, x]) => a + x, 0n)
        const want = sum + amount > limit ? 'ERR_ALLOWANCE_EXCEEDED' : inWin.length + 1 > MAX_SPENDS ? 'ERR_ALLOWANCE_RATE' : 'ok'
        const r = applyDebits(caps, [{ asset: 'btc', amount }], t)
        expect(r.ok ? 'ok' : r.error).toBe(want)
        if (r.ok) {
          caps = r.caps
          history.push([t, amount])
        }
        expect(capRemaining(caps[0]!, t)).toBe(limit - history.filter(([at]) => t < at + W).reduce((a, [, x]) => a + x, 0n))
      }
    }
  })
})
