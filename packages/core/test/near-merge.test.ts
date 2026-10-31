/**
 * Round two of the test audit (docs/testing/core-api.md "What remains untested"): `mergeNearSnapshots` on its own.
 * This is the single most security-relevant branch point in the clean-history gate — it decides whether Buy sees
 * `near.ok` at all — so every branch is exercised directly against the function, not just indirectly through
 * `checkCleanHistory`. Wrong-direction outcomes (unsafe/incomplete data read as agreeing and clean) are the ones
 * that matter; every case below either lands on `ok: false` with a specific reason, or on `ok: true` only when the
 * sources genuinely agree and are complete.
 */
import { describe, expect, it } from 'vitest'
import { mergeNearSnapshots } from '../src/clean-history'
import { evmRecord, snapshot } from './helpers'

const KB31_TX = '02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'
const REC = [evmRecord(0, KB31_TX)]

describe('mergeNearSnapshots', () => {
  it('zero sources (all errored) ⇒ near_unavailable, no snapshot, sources 0', () => {
    const m = mergeNearSnapshots([{ source: 'a', error: 'x' }, { source: 'b', error: 'y' }], true)
    expect(m).toEqual({ ok: false, snapshot: null, sources: 0, reason: 'near_unavailable' })
  })

  it('empty input array ⇒ near_unavailable', () => {
    const m = mergeNearSnapshots([], true)
    expect(m).toEqual({ ok: false, snapshot: null, sources: 0, reason: 'near_unavailable' })
  })

  it('two sources agree, complete records ⇒ ok, sources 2, reason null', () => {
    const m = mergeNearSnapshots([snapshot('a', REC), snapshot('b', REC)], true)
    expect(m.ok).toBe(true)
    expect(m.sources).toBe(2)
    expect(m.reason).toBeNull()
    expect(m.snapshot).not.toBeNull()
  })

  it('two sources disagree on a safety field ⇒ near_disagree, no snapshot (fails closed, not "pick one")', () => {
    const a = snapshot('a', REC)
    const b = snapshot('b', REC, { contract: { ...a.contract, accessKeyCount: 1 } })
    const m = mergeNearSnapshots([a, b], true)
    expect(m).toMatchObject({ ok: false, snapshot: null, reason: 'near_disagree' })
    expect(m.sources).toBe(2) // both were readable; they just didn't match
  })

  it('3 sources, 2 agree and 1 minority disagrees ⇒ still near_disagree, never "majority wins"', () => {
    const a = snapshot('a', REC)
    const b = snapshot('b', REC)
    const c = snapshot('c', REC, { sigCount: a.sigCount + 1 }) // minority: a different fingerprint
    const m = mergeNearSnapshots([a, b, c], true)
    expect(m).toMatchObject({ ok: false, snapshot: null, reason: 'near_disagree' })
    expect(m.sources).toBe(3)
  })

  it('3 sources, all agree ⇒ ok with sources 3 (not capped at 2)', () => {
    const m = mergeNearSnapshots([snapshot('a', REC), snapshot('b', REC), snapshot('c', REC)], true)
    expect(m).toMatchObject({ ok: true, sources: 3, reason: null })
  })

  it('3 sources, 1 errors and the other 2 agree ⇒ ok, sources counts only the readable ones (2)', () => {
    const m = mergeNearSnapshots([snapshot('a', REC), snapshot('b', REC), { source: 'c', error: 'timeout' }], true)
    expect(m).toMatchObject({ ok: true, sources: 2, reason: null })
  })

  it('records_incomplete: fewer records than sigCount', () => {
    const s = snapshot('a', REC, { sigCount: 2 }) // only 1 record but sigCount says 2
    const m = mergeNearSnapshots([s, snapshot('b', REC, { sigCount: 2 })], true)
    expect(m).toMatchObject({ ok: false, reason: 'records_incomplete', sources: 2 })
    expect(m.snapshot).not.toBeNull() // the (agreeing) snapshot is still surfaced for diagnostics
  })

  it('records_incomplete: seqs present but non-contiguous (e.g. 0 and 2, missing 1)', () => {
    const recs = [evmRecord(0, KB31_TX), { ...evmRecord(0, KB31_TX), seq: 2 }]
    const s = snapshot('a', recs, { sigCount: 2 })
    const m = mergeNearSnapshots([s, snapshot('b', recs, { sigCount: 2 })], true)
    expect(m).toMatchObject({ ok: false, reason: 'records_incomplete' })
  })

  it('records_incomplete: duplicate seq (two seq-0 records, sigCount 2, no seq 1)', () => {
    const recs = [evmRecord(0, KB31_TX), { ...evmRecord(0, KB31_TX), seq: 0 }]
    const s = snapshot('a', recs, { sigCount: 2 })
    const m = mergeNearSnapshots([s, snapshot('b', recs, { sigCount: 2 })], true)
    expect(m).toMatchObject({ ok: false, reason: 'records_incomplete' })
  })

  it('completeness check is order-independent: records out of seq order still count as complete', () => {
    const recs = [{ ...evmRecord(0, KB31_TX), seq: 1 }, { ...evmRecord(0, KB31_TX), seq: 0 }]
    const s = snapshot('a', recs, { sigCount: 2 })
    const m = mergeNearSnapshots([s, snapshot('b', recs, { sigCount: 2 })], true)
    expect(m).toMatchObject({ ok: true, reason: null })
  })

  it('near_one_source: a single readable source is rejected when allowSingleSource is false', () => {
    const m = mergeNearSnapshots([snapshot('a', REC)], false)
    expect(m).toMatchObject({ ok: false, sources: 1, reason: 'near_one_source' })
    expect(m.snapshot).not.toBeNull() // surfaced for diagnostics even though not trusted
  })

  it('near_one_source also fires when one of two sources errors, leaving one, and allowSingleSource is false', () => {
    const m = mergeNearSnapshots([snapshot('a', REC), { source: 'b', error: 'timeout' }], false)
    expect(m).toMatchObject({ ok: false, sources: 1, reason: 'near_one_source' })
  })

  it('a single readable source is accepted when allowSingleSource is true (H-25 "1 of 2 sources" UX)', () => {
    const m = mergeNearSnapshots([snapshot('a', REC)], true)
    expect(m).toMatchObject({ ok: true, sources: 1, reason: null })
  })

  it('near_disagree takes priority over records_incomplete: disagreement is checked first', () => {
    const a = snapshot('a', REC, { sigCount: 2 }) // incomplete AND will disagree with b
    const b = snapshot('b', REC, { sigCount: 2, contract: { ...a.contract, accessKeyCount: 9 } })
    const m = mergeNearSnapshots([a, b], true)
    expect(m.reason).toBe('near_disagree')
  })

  it('status and signature fields are explicitly ignored for agreement (they legitimately lag between RPCs)', () => {
    const a = snapshot('a', REC)
    const laggingRec = { ...REC[0]!, status: 'pending' as const, signature: null }
    const b = snapshot('b', [laggingRec])
    const m = mergeNearSnapshots([a, b], true)
    expect(m).toMatchObject({ ok: true, reason: null })
  })

  it('a changed safety field (height) on an otherwise-identical record still disagrees', () => {
    const a = snapshot('a', REC)
    const b = snapshot('b', [{ ...REC[0]!, height: REC[0]!.height + 1 }])
    const m = mergeNearSnapshots([a, b], true)
    expect(m.reason).toBe('near_disagree')
  })

  it('mpcKeys differing between sources also counts as disagreement (fingerprint includes mpcKeys)', () => {
    const a = snapshot('a', REC, { mpcKeys: { btc: 'secp256k1:x' } })
    const b = snapshot('b', REC, { mpcKeys: { btc: 'secp256k1:y' } })
    const m = mergeNearSnapshots([a, b], true)
    expect(m.reason).toBe('near_disagree')
  })

  it('a code hash that differs only in case (base58 vs hex casing) is normalized and does not disagree', () => {
    const hash = 'AB'.repeat(32)
    const a = snapshot('a', REC, { contract: { exists: true, accessKeyCount: 0, codeHash: hash.toLowerCase() } })
    const b = snapshot('b', REC, { contract: { exists: true, accessKeyCount: 0, codeHash: hash.toUpperCase() } })
    const m = mergeNearSnapshots([a, b], true)
    expect(m).toMatchObject({ ok: true, reason: null })
  })
})
