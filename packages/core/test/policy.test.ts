/** The reference classifier against the committed shared vectors (the same files the Rust tests consume). */
import { describe, expect, it } from 'vitest'
import evm from '../../../vectors/evm.json' with { type: 'json' }
import btc from '../../../vectors/btc.json' with { type: 'json' }
import sol from '../../../vectors/sol.json' with { type: 'json' }
import {
  checkEvmNonce,
  classifySignRequest,
  decodeCompactU16,
  decodeRlpExact,
  decodeVarint,
  encodeCompactU16,
  encodeRlp,
  encodeVarint,
  evmMaxAllowedNonce,
  maxSignedEvmNonce,
  RLP_MAX_DEPTH,
  type RlpInput,
} from '../src/policy'
import type { SignRequest } from '../src/near'
import { toHex } from '../src/bytes'

type V = {
  name: string
  request: unknown
  state?: { evm_max_nonce: string | null }
  expect: { ok: boolean; error?: string; hashes?: string[]; mpc?: { payload_v2: unknown }[] }
}

describe.each([
  ['evm', evm.vectors as V[]],
  ['btc', btc.vectors as V[]],
  ['sol', sol.vectors as V[]],
])('vectors/%s.json', (_set, vectors) => {
  it.each(vectors.map((v) => [v.name, v] as const))('%s', (_n, v) => {
    // the vectors model `sign_for` on a token with `state` (absent = no EVM record): pass it as the context
    const max = v.state?.evm_max_nonce
    const r = classifySignRequest(v.request as SignRequest, { evmMaxSignedNonce: max == null ? null : BigInt(max) })
    if (v.expect.ok) {
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.recordPayloads.map(toHex)).toEqual(v.expect.hashes)
        expect(r.mpcPayloads).toEqual(v.expect.mpc!.map((m) => m.payload_v2))
      }
    } else {
      expect(r).toMatchObject({ ok: false, error: v.expect.error })
    }
  })
})

describe('policy: schema coverage', () => {
  it('every chain error code of spec §5.15 has at least one refusal vector', () => {
    const codes = new Set([...evm.vectors, ...btc.vectors, ...sol.vectors].map((v) => (v.expect as { error?: string }).error).filter(Boolean))
    const spec = [
      'ERR_HEX',
      'ERR_EVM_TYPE', 'ERR_EVM_RLP', 'ERR_EVM_CHAIN_ID', 'ERR_EVM_INT_WIDTH', 'ERR_EVM_TO', 'ERR_EVM_DATA', 'ERR_EVM_ACCESS_LIST', 'ERR_EVM_TOO_LONG',
      'ERR_EVM_NONCE_GAP',
      'ERR_BTC_INPUT_COUNT', 'ERR_BTC_PREIMAGE_LEN', 'ERR_BTC_VERSION', 'ERR_BTC_SIGHASH', 'ERR_BTC_SCRIPTCODE', 'ERR_BTC_LOCKTIME', 'ERR_BTC_SEQUENCE',
      'ERR_BTC_MIXED_TX', 'ERR_BTC_PREVOUTS_INCOMPLETE', 'ERR_BTC_SEQUENCES_MISMATCH', 'ERR_BTC_OUTPUTS_MISMATCH', 'ERR_BTC_OUTPUTS_MALFORMED', 'ERR_BTC_DUPLICATE_INPUT',
      'ERR_SOL_TOO_LONG', 'ERR_SOL_VERSION', 'ERR_SOL_HEADER', 'ERR_SOL_MALFORMED', 'ERR_SOL_INSTRUCTION', 'ERR_SOL_DURABLE_NONCE',
    ]
    expect(spec.filter((c) => !codes.has(c))).toEqual([])
  })

  it('spec §12.2 named cases are present', () => {
    const names = new Set([...evm.vectors, ...btc.vectors, ...sol.vectors].map((v) => v.name))
    for (const n of [
      'eth_transfer_nonce0_kb31', 'eth_transfer_nonce7_kb70_f1', 'eth_transfer_large_value', 'eth_max_width_all', 'eth_to_contract_address',
      'legacy_eip155', 'legacy_pre155', 'type1_eip2930', 'type4_eip7702', 'auth_7702_chain0', 'eip191_personal_sign', 'eip712_permit',
      'chain_id_1_mainnet', 'chain_id_84532_base_sepolia', 'calldata_erc20_approve', 'contract_creation_empty_to', 'access_list_non_empty',
      'trailing_byte', 'non_canonical_int_leading_zero', 'nonce_over_wide_9_bytes', 'raw_32_byte_hash',
      'btc_1in_2out', 'btc_2in_2out', 'btc_4in_2out', 'btc_2in_taproot_recipient', 'sighash_none', 'sighash_single', 'sighash_all_anyonecanpay',
      'sighash_0x41', 'preimage_len_181', 'scriptcode_wrong_opcode', 'locktime_nonzero', 'sequence_below_fffffffd', 'mixed_tx',
      'prevouts_incomplete', 'sequences_mismatch', 'outputs_mismatch', 'outputs_trailing_byte', 'duplicate_input', 'input_count_11', 'version_1',
      'sol_transfer_new_account', 'sol_transfer_existing_account', 'sol_self_transfer', 'sol_v0_message', 'sol_durable_nonce_ix0',
      'sol_two_transfers', 'sol_compute_budget_plus_transfer', 'sol_system_assign', 'sol_spl_token_approve', 'sol_two_signers', 'sol_offchain_ff',
      'sol_trailing_byte', 'sol_too_long_1233', 'sol_raw_32_byte_hash',
    ])
      expect(names.has(n), n).toBe(true)
  })
})

describe('policy: decoders', () => {
  it('RLP round trip and strictness', () => {
    const x = encodeRlp([Uint8Array.of(1), new Uint8Array(0), [Uint8Array.of(0x80)], new Uint8Array(60)])
    expect(decodeRlpExact(x)).toMatchObject({ kind: 'list' })
    expect(() => decodeRlpExact(Uint8Array.of(0x81, 0x05))).toThrow(/wrapped/)
    expect(() => decodeRlpExact(Uint8Array.of(0xb8, 0x01, 0xff))).toThrow(/long form/)
    expect(() => decodeRlpExact(Uint8Array.of(0xc1, 0x01, 0x00))).toThrow(/trailing/)
    expect(() => decodeRlpExact(Uint8Array.of(0xc2, 0x01))).toThrow(/truncated/)
  })
  it('Bitcoin varint is canonical', () => {
    for (const n of [0, 252, 253, 65535, 65536]) expect(decodeVarint(encodeVarint(n), 0)[0]).toBe(n)
    expect(() => decodeVarint(Uint8Array.of(0xfd, 0x10, 0x00), 0)).toThrow(/non-canonical/)
    expect(() => decodeVarint(Uint8Array.of(0xfe, 0xff, 0xff, 0x00, 0x00), 0)).toThrow(/non-canonical/)
  })
  it('Solana compact-u16 is canonical', () => {
    for (const n of [0, 127, 128, 16383, 16384, 65535]) expect(decodeCompactU16(encodeCompactU16(n), 0)[0]).toBe(n)
    expect(() => decodeCompactU16(Uint8Array.of(0x80, 0x00), 0)).toThrow(/non-canonical/)
    expect(() => decodeCompactU16(Uint8Array.of(0xff, 0xff, 0x04), 0)).toThrow(/overflow/)
  })
})

describe('policy: RLP depth limit (spec §5.9, fuzzing F-01; same as the contract)', () => {
  const nest = (k: number): RlpInput => (k === 0 ? [] : [nest(k - 1)])
  it('the outer item is depth 0; an item at depth 16 decodes, one at depth 17 is refused', () => {
    expect(RLP_MAX_DEPTH).toBe(16)
    expect(decodeRlpExact(encodeRlp(nest(16)))).toMatchObject({ kind: 'list' })
    expect(() => decodeRlpExact(encodeRlp(nest(17)))).toThrow(/deeper than 16/)
    expect(() => decodeRlpExact(encodeRlp([[nest(15)]]))).toThrow(/deeper than 16/)
  })
})

describe('policy: EVM nonce-gap rule (spec §5.9, D-43; review S-04)', () => {
  const rec = (nonce: number | string) => ({ detail: { evm: { chain_id: 11155111, nonce, unsigned_tx: '' } } })
  it('first EVM request: nonce 0 or 1; then at most the highest signed nonce + 1', () => {
    expect(evmMaxAllowedNonce(null)).toBe(1n)
    expect(evmMaxAllowedNonce(5n)).toBe(6n)
    expect(checkEvmNonce(0n, null)).toBeNull()
    expect(checkEvmNonce(1n, null)).toBeNull()
    expect(checkEvmNonce(2n, null)).toBe('ERR_EVM_NONCE_GAP')
    expect(checkEvmNonce(6n, 5n)).toBeNull()
    expect(checkEvmNonce(7n, 5n)).toBe('ERR_EVM_NONCE_GAP')
    expect(checkEvmNonce(0n, 5n)).toBeNull()
  })
  it('the highest signed nonce comes from every EVM record, whatever its status; BTC/SOL rows are ignored', () => {
    expect(maxSignedEvmNonce([])).toBeNull()
    expect(maxSignedEvmNonce([{ detail: { btc: { txid: '00', vout: 0, amount_sats: '1' } } }])).toBeNull()
    expect(maxSignedEvmNonce([rec(2), rec('9'), rec(4)])).toBe(9n)
  })
  it('classifySignRequest applies the rule only when given the token context (stateless otherwise)', () => {
    const far = (evm.vectors as V[]).find((v) => v.name === 'nonce_gap_far_future_poison')!
    expect(classifySignRequest(far.request as SignRequest).ok).toBe(true)
    expect(classifySignRequest(far.request as SignRequest, { evmMaxSignedNonce: null })).toMatchObject({ ok: false, error: 'ERR_EVM_NONCE_GAP' })
    const btcOk = (btc.vectors as V[]).find((v) => v.expect.ok)!
    expect(classifySignRequest(btcOk.request as SignRequest, { evmMaxSignedNonce: null }).ok).toBe(true)
  })
})

