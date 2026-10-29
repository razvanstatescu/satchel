import { describe, expect, it } from 'vitest'
import { base58 } from '@scure/base'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import solVectors from '../../../vectors/sol.json' with { type: 'json' }
import {
  attachSolSignature,
  buildSolTransfer,
  checkSolSend,
  isBlockhashFresh,
  isSolExpired,
  parseSolAddress,
  fromBase58,
  toBase58,
  solMaxSend,
  solTransferFromMessage,
} from '../src/chains/sol'
import { toHex } from '../src/bytes'
import { PolicyRefusal } from '../src/policy'

// kb/32 §Signing run: NEAR tx H6xHyS25cUAoiGZKoaq5K5jXw8Hq1PPURgLbBo7TdaNw, real MPC Ed25519 signature
const KB32 = {
  from: '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA',
  to: '8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r',
  lamports: 1_000_000n,
  recentBlockhash: '2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW',
  lastValidBlockHeight: 500_719_657,
  signature: '3HeVZAwBwvAGAbjnVtEZ88wQQn7j2bsfrvJhvtAVzWdkD8ie2hiMapApoYG3QaBUGRhP8bTBXTcZpEiW72AMMCYt',
}
const sig = { scheme: 'Ed25519' as const, signature: Array.from(base58.decode(KB32.signature)) }

describe('sol builder', () => {
  it('reproduces the kb/32 150-byte legacy message', () => {
    const b = buildSolTransfer(KB32)
    expect(b.message.length).toBe(150)
    expect(toHex(b.message)).toBe(solVectors.vectors.find((v) => v.name === 'sol_transfer_kb32')!.hex)
  })

  it('rebuilds every accepted vector from its fields', () => {
    for (const v of solVectors.vectors.filter((x) => x.expect.ok && !x.name.includes('uppercase'))) {
      const f = v.expect.fields as { from: string; to: string; lamports: string; recent_blockhash: string }
      const enc = (h: string) => base58.encode(Uint8Array.from(Buffer.from(h, 'hex')))
      const b = buildSolTransfer({ from: enc(f.from), to: enc(f.to), lamports: BigInt(f.lamports), recentBlockhash: enc(f.recent_blockhash), lastValidBlockHeight: 1 })
      expect(toHex(b.message), v.name).toBe(v.hex)
    }
  })

  it('refuses amounts outside u64 and validates against the contract policy', () => {
    expect(() => buildSolTransfer({ ...KB32, lamports: 0n })).toThrow()
    expect(() => buildSolTransfer({ ...KB32, lamports: 2n ** 64n })).toThrow()
  })
})

describe('sol attach + verify (real MPC Ed25519 signature)', () => {
  it('verifies over the message against the derived key, and the signature is the Solana tx id', () => {
    const s = attachSolSignature(buildSolTransfer(KB32), sig, KB32.from)
    expect(s.signature).toBe(KB32.signature)
    expect(s.raw.length).toBe(1 + 64 + 150)
  })

  it('a tampered signature, another message or another key is refused before broadcast', () => {
    const bad = { ...sig, signature: sig.signature.map((x, i) => (i === 0 ? x ^ 1 : x)) }
    expect(() => attachSolSignature(buildSolTransfer(KB32), bad, KB32.from)).toThrow(/does not verify/)
    expect(() => attachSolSignature(buildSolTransfer({ ...KB32, lamports: 2n }), sig, KB32.from)).toThrow(/does not verify/)
    expect(() => attachSolSignature(buildSolTransfer(KB32), sig, KB32.to)).toThrow(/does not verify/)
  })

  it('rebuilds from logged message bytes and re-attaches (Broadcast again)', () => {
    const b = buildSolTransfer(KB32)
    const r = solTransferFromMessage(b.message, KB32.lastValidBlockHeight)
    expect(r.recentBlockhash).toBe(KB32.recentBlockhash)
    expect(attachSolSignature(r, sig, KB32.from).signature).toBe(KB32.signature)
    expect(() => solTransferFromMessage(Uint8Array.of(0x80, 1, 2), 1)).toThrow(PolicyRefusal)
  })
})

describe('sol rules (kb/32)', () => {
  it('rent: a new recipient needs ≥ 650,240 lamports; the sender ends at 0 or ≥ rent', () => {
    expect(checkSolSend({ balance: 10n ** 9n, lamports: 650_239n, recipientExists: false })).toBe('below_rent_new_recipient')
    expect(checkSolSend({ balance: 10n ** 9n, lamports: 650_240n, recipientExists: false })).toBeNull()
    expect(checkSolSend({ balance: 1_000_000n, lamports: 1_000n, recipientExists: true })).toBeNull()
    expect(checkSolSend({ balance: 1_000_000n, lamports: 994_000n, recipientExists: true })).toBe('remainder_below_rent')
    expect(checkSolSend({ balance: 1_000_000n, lamports: solMaxSend(1_000_000n), recipientExists: true })).toBeNull()
    expect(checkSolSend({ balance: 1_000n, lamports: 1_000n, recipientExists: true })).toBe('insufficient')
  })

  it('expiry and blockhash freshness', () => {
    expect(isSolExpired(500_719_657, 500_719_657)).toBe(false)
    expect(isSolExpired(500_719_658, 500_719_657)).toBe(true)
    expect(isBlockhashFresh(0, 10_000)).toBe(true)
    expect(isBlockhashFresh(0, 10_001)).toBe(false)
  })
})

describe('sol address parsing (recipient validation)', () => {
  it('accepts a 32-byte base58 key and flags off-curve (PDA) addresses', () => {
    expect(parseSolAddress(` ${KB32.from} `)).toEqual({ ok: true, address: KB32.from, onCurve: true })
    // a program-derived address is valid base58 of 32 bytes, but off the curve (no private key)
    const [pda] = PublicKey.findProgramAddressSync([new TextEncoder().encode('satchel')], SystemProgram.programId)
    expect(parseSolAddress(pda.toBase58())).toEqual({ ok: true, address: pda.toBase58(), onCurve: false })
  })

  it('refuses non-base58, wrong lengths and EVM/BTC strings', () => {
    for (const bad of ['', '0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741', 'tb1qaanvpz7r4c5u9yqd8m3yfk8yh2k7c5gzky8sd', 'O0IlO0IlO0IlO0IlO0IlO0IlO0IlO0Il', KB32.from.slice(0, 20), KB32.signature]) {
      expect(parseSolAddress(bad).ok, bad).toBe(false)
    }
  })

  it('base58 helpers round-trip', () => {
    expect(toBase58(fromBase58(KB32.recentBlockhash))).toBe(KB32.recentBlockhash)
  })
})
