/** EVM vectors (spec §12.2): accepted type-2 Sepolia native transfers and every refusal class of §5.9. Built with viem. */
import { keccak256, serializeTransaction, toHex as vHex, parseTransaction, type Hex } from 'viem'
import { classifyEvm, encodeRlp, type RlpInput } from '@satchel/core/policy'
import { bigIntToBytesBE, concatBytes, hexToBytesStrict, toHex, utf8 } from '@satchel/core/bytes'
import { evmSignRequest } from '@satchel/core/near'
import { assert, vec, type Vector } from './lib'

const SEPOLIA = 11155111
const U64_MAX = 2n ** 64n - 1n
const U128_MAX = 2n ** 128n - 1n
const TO = '0x61739f33AdbB7F76c1b5B222E4119085257528BE' as const // kb/31 recipient (a derived Satchel address)
const WETH_SEPOLIA = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' as const // a contract address: still a plain transfer

const b = (v: bigint): Uint8Array => bigIntToBytesBE(v)
const raw = (h: string) => hexToBytesStrict(h)

/** 0x02 ‖ rlp(items) with full control over each item (to craft refusals). */
function type2(items: RlpInput[]): string {
  return toHex(concatBytes(Uint8Array.of(0x02), encodeRlp(items)))
}

function std(over: Partial<Record<'chainId' | 'nonce' | 'tip' | 'maxFee' | 'gas' | 'value', bigint>> & { to?: Uint8Array; data?: Uint8Array; access?: RlpInput[] } = {}): RlpInput[] {
  return [
    b(over.chainId ?? BigInt(SEPOLIA)),
    b(over.nonce ?? 3n),
    b(over.tip ?? 200_008n),
    b(over.maxFee ?? 200_028n),
    b(over.gas ?? 21_000n),
    over.to ?? raw(TO),
    b(over.value ?? 10n ** 14n),
    over.data ?? new Uint8Array(0),
    over.access ?? [],
  ]
}

const viemType2 = (p: { nonce: number; to: `0x${string}`; value: bigint; tip?: bigint; maxFee?: bigint; gas?: bigint }): Hex =>
  serializeTransaction({
    type: 'eip1559',
    chainId: SEPOLIA,
    nonce: p.nonce,
    to: p.to,
    value: p.value,
    gas: p.gas ?? 21_000n,
    maxFeePerGas: p.maxFee ?? 200_028n,
    maxPriorityFeePerGas: p.tip ?? 200_008n,
  })

export function evmVectors(): Vector[] {
  const v: Vector[] = []
  /**
   * An accepted vector whose nonce is above 1 gets the smallest token state that `sign_for`'s nonce-gap rule accepts
   * (`evm_max_nonce = nonce − 1`, spec §5.9, D-43), unless the vector states its own.
   */
  const minimalState = (unsigned: string): Vector['state'] => {
    const c = classifyEvm(unsigned)
    return c.ok && c.fields.nonce > 1n ? { evm_max_nonce: (c.fields.nonce - 1n).toString() } : undefined
  }
  const add = (name: string, unsigned: string, want: Parameters<typeof vec>[3], note?: string, state?: Vector['state']) =>
    v.push(vec(name, 'evm', { evm: { unsigned_tx: unsigned } }, want, note, state ?? (want === 'ok' ? minimalState(unsigned) : undefined)))

  // ── accepted ───────────────────────────────────────────────────────────────────────────────
  const kb31 = viemType2({ nonce: 0, to: TO, value: 10n ** 14n })
  assert(kb31 === '0x02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0', 'kb/31 48-byte tx')
  assert(keccak256(kb31) === '0xbc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377', 'kb/31 payload')
  v.push(vec('eth_transfer_nonce0_kb31', 'evm', evmSignRequest(kb31), 'ok', 'kb/31 real MPC-signed tx (48 B), keccak bc65…c377'))

  const f1 = '02f283aa36a7078459682f008506fc23ac0082520894000000000000000000000000000000000000dead872bb2c8eabcc00080c0'
  assert(keccak256(`0x${f1}`) === '0x8cb1b816dd6087e2a2680a1e77be488ee50a63fe49b1f384537c399513f6a1a9', 'kb/70 F1 hash')
  const f1p = parseTransaction(`0x${f1}`)
  assert(f1p.nonce === 7 && f1p.chainId === SEPOLIA, 'F1 is nonce 7 on Sepolia')
  assert(serializeTransaction(f1p as never) === `0x${f1}`, 'viem round-trips F1')
  add('eth_transfer_nonce7_kb70_f1', f1, 'ok', 'kb/70 F1 52-byte ETH transfer, keccak 8cb1…a1a9')

  add('eth_transfer_large_value', viemType2({ nonce: 1, to: TO, value: U128_MAX, maxFee: 10n ** 12n, tip: 10n ** 9n }), 'ok', 'value = 2^128 − 1 (16 bytes)')
  const maxw = viemType2({ nonce: Number.MAX_SAFE_INTEGER, to: TO, value: U128_MAX, tip: U128_MAX, maxFee: U128_MAX, gas: U64_MAX })
  add('eth_max_width_ints_viem', maxw, 'ok', 'tip/maxFee/value 16 bytes, gas 8 bytes')
  const maxAll = type2(std({ nonce: U64_MAX - 1n, gas: U64_MAX, tip: U128_MAX, maxFee: U128_MAX, value: U128_MAX }))
  assert(maxAll.length / 2 === 99, 'maximal native transfer is 99 bytes')
  add('eth_max_width_all', maxAll, 'ok', 'nonce 2^64−2 (largest allowed, EIP-2681), gas 2^64−1, fees/value 2^128−1: 99 bytes')
  add('eth_to_contract_address', viemType2({ nonce: 2, to: WETH_SEPOLIA, value: 1n }), 'ok', 'recipient is a contract; still empty data')
  add('eth_zero_value', viemType2({ nonce: 4, to: TO, value: 0n }), 'ok', 'value 0 = 0x80 (a self-cancel uses this shape)')
  add('eth_0x_uppercase_input', `0x${kb31.slice(2).toUpperCase()}`, 'ok', 'input with 0x prefix and uppercase: same bytes and hash as kb31')

  // ── nonce-gap rule (spec §5.9, D-43; security review S-04): state-dependent, checked after every rule above ─────
  const none = { evm_max_nonce: null }
  add('nonce_gap_first_request_nonce0', type2(std({ nonce: 0n })), 'ok', 'no EVM record yet: nonce 0 (the first real send; faucet deposits leave the nonce at 0)', none)
  add('nonce_gap_first_request_nonce1', type2(std({ nonce: 1n })), 'ok', 'no EVM record yet: nonce 1 is still allowed (demo #4: "nonce = current + 1")', none)
  add('nonce_gap_first_request_nonce2', type2(std({ nonce: 2n })), 'ERR_EVM_NONCE_GAP', 'no EVM record yet: nonce > 1 is refused', none)
  add('nonce_gap_far_future_poison', type2(std({ nonce: U64_MAX - 1n })), 'ERR_EVM_NONCE_GAP', 'S-04: a never-consumable nonce on a fresh token', none)
  add('nonce_gap_next_nonce', type2(std({ nonce: 4n })), 'ok', 'highest signed 3 → 4 allowed', { evm_max_nonce: '3' })
  add('nonce_gap_skip_one', type2(std({ nonce: 5n })), 'ERR_EVM_NONCE_GAP', 'highest signed 3 → 5 refused (max + 1 = 4)', { evm_max_nonce: '3' })
  add('nonce_gap_resign_same_nonce', type2(std({ nonce: 3n })), 'ok', 'retry / replacement of the highest nonce', { evm_max_nonce: '3' })
  add('nonce_gap_resign_lower_nonce', type2(std({ nonce: 0n })), 'ok', 'a lower nonce is always allowed (it can at most replace)', { evm_max_nonce: '3' })
  add('nonce_gap_max_nonce_after_max', type2(std({ nonce: U64_MAX - 1n })), 'ok', 'the largest allowed nonce, right after 2^64 − 3', { evm_max_nonce: (U64_MAX - 2n).toString() })
  add('nonce_gap_policy_code_first', type2(std({ nonce: 9n, chainId: 1n })), 'ERR_EVM_CHAIN_ID', 'a gap and a wrong chain: the stateless rule reports first', none)

  // ── refused ────────────────────────────────────────────────────────────────────────────────
  const legacy155 = serializeTransaction({ type: 'legacy', chainId: SEPOLIA, nonce: 0, to: TO, value: 1n, gas: 21000n, gasPrice: 1n })
  add('legacy_eip155', legacy155, 'ERR_EVM_TYPE', 'unsigned legacy EIP-155 (rlp list, first byte ≥ 0xc0)')
  const legacyPre = toHex(encodeRlp([b(0n), b(1n), b(21000n), raw(TO), b(1n), new Uint8Array(0)]))
  add('legacy_pre155', legacyPre, 'ERR_EVM_TYPE', 'pre-155: chain-independent hash (kb/70 F3)')
  const t1 = serializeTransaction({ type: 'eip2930', chainId: SEPOLIA, nonce: 0, to: TO, value: 1n, gas: 21000n, gasPrice: 1n, accessList: [] })
  assert(t1.startsWith('0x01'), 'type-1 prefix')
  add('type1_eip2930', t1, 'ERR_EVM_TYPE')
  const auth = [b(BigInt(SEPOLIA)), raw(TO), b(0n)]
  add('type4_eip7702', toHex(concatBytes(Uint8Array.of(0x04), encodeRlp([...std().slice(0, 9), [auth]]))), 'ERR_EVM_TYPE', 'EIP-7702 set-code tx')
  add('auth_7702_chain0', toHex(concatBytes(Uint8Array.of(0x05), encodeRlp([b(0n), raw(TO), b(0n)]))), 'ERR_EVM_TYPE', '0x05 ‖ rlp([0, addr, nonce]): valid on every chain')
  add('eip191_personal_sign', toHex(concatBytes(Uint8Array.of(0x19), utf8('Ethereum Signed Message:\n5hello'))), 'ERR_EVM_TYPE', '0x19 0x45 …')
  const permit = concatBytes(Uint8Array.of(0x19, 0x01), hexToBytesStrict(keccak256(utf8('domain') as never)), hexToBytesStrict(keccak256(utf8('permit') as never)))
  add('eip712_permit', toHex(permit), 'ERR_EVM_TYPE', '0x19 0x01 ‖ domainSeparator ‖ structHash (ERC-2612 / Permit2)')
  const h32 = keccak256(vHex('satchel raw hash'))
  assert(!h32.startsWith('0x02'), 'raw hash must not start with 02 for this vector')
  add('raw_32_byte_hash', h32, 'ERR_EVM_TYPE', 'a blind 32-byte hash is never signed')
  add('empty_payload', '', 'ERR_EVM_TYPE')
  add('chain_id_1_mainnet', type2(std({ chainId: 1n })), 'ERR_EVM_CHAIN_ID')
  add('chain_id_84532_base_sepolia', type2(std({ chainId: 84532n })), 'ERR_EVM_CHAIN_ID')
  add('chain_id_over_wide', type2(std({ chainId: 2n ** 64n + 11155111n })), 'ERR_EVM_CHAIN_ID', '9-byte chain id')
  const approve = concatBytes(hexToBytesStrict('095ea7b3'), new Uint8Array(12), raw(TO), new Uint8Array(32).fill(0xff))
  add('calldata_erc20_approve', type2(std({ data: approve, to: raw(WETH_SEPOLIA) })), 'ERR_EVM_DATA', 'approve(spender, max)')
  add('calldata_one_byte', type2(std({ data: Uint8Array.of(0x00) })), 'ERR_EVM_DATA')
  add('contract_creation_empty_to', type2(std({ to: new Uint8Array(0) })), 'ERR_EVM_TO')
  add('to_19_bytes', type2(std({ to: raw(TO).slice(1) })), 'ERR_EVM_TO')
  add('access_list_non_empty', type2(std({ access: [[raw(TO), []]] })), 'ERR_EVM_ACCESS_LIST')
  add('trailing_byte', `${f1}00`, 'ERR_EVM_RLP', 'kb/70 F1 + one byte')
  const tx = std()
  const ncLeadingZero = toHex(concatBytes(Uint8Array.of(0x02), encodeRlp([tx[0]!, Uint8Array.of(0x00, 0x03), ...tx.slice(2)])))
  add('non_canonical_int_leading_zero', ncLeadingZero, 'ERR_EVM_RLP', 'nonce 3 encoded as 0x820003')
  const enc = hexToBytesStrict(type2(std()))
  // nonce 3 is the single byte 0x03 at offset 6 (02 | e. | 83 aa36a7 | 03): wrap it as 0x8103 and fix the list length
  assert(enc[1]! >= 0xc0 && enc[1]! <= 0xf7 && enc[6] === 0x03, 'layout for the single-byte vector')
  const wrapped = concatBytes(Uint8Array.of(0x02, enc[1]! + 1), enc.slice(2, 6), Uint8Array.of(0x81, 0x03), enc.slice(7))
  add('non_canonical_single_byte_wrapped', toHex(wrapped), 'ERR_EVM_RLP', 'nonce 3 encoded as 0x8103')
  const zeroAs00 = toHex(concatBytes(Uint8Array.of(0x02), encodeRlp([tx[0]!, Uint8Array.of(0x00), ...tx.slice(2)])))
  add('non_canonical_zero_as_00', zeroAs00, 'ERR_EVM_RLP', 'integer zero must be 0x80, not 0x00')
  const body = encodeRlp(std()).slice(1)
  add('non_canonical_list_long_form', toHex(concatBytes(Uint8Array.of(0x02, 0xf8, body.length), body)), 'ERR_EVM_RLP', 'list < 56 bytes in long form')
  add('rlp_8_items', type2(std().slice(0, 8)), 'ERR_EVM_RLP')
  add('rlp_10_items', type2([...std(), new Uint8Array(0)]), 'ERR_EVM_RLP')
  add('rlp_truncated', type2(std()).slice(0, -2), 'ERR_EVM_RLP')
  add('rlp_item_is_list', type2([...std().slice(0, 7), [], []]), 'ERR_EVM_RLP', 'data must be a byte string')
  const nest = (k: number): RlpInput => (k === 0 ? [] : [nest(k - 1)])
  add('rlp_nested_deeper_than_16', type2(std({ access: [nest(15)] })), 'ERR_EVM_RLP', 'F-01: the deepest item at depth 17 (outer list = 0): the depth limit fires before the policy rules')
  add('rlp_nested_exactly_16_access_list', type2(std({ access: [nest(14)] })), 'ERR_EVM_ACCESS_LIST', 'F-01 boundary: depth 16 still decodes, so the access-list rule applies')
  add('rlp_nested_deeper_than_16_chain_1', type2(std({ chainId: 1n, access: [nest(15)] })), 'ERR_EVM_RLP', 'F-01: the depth limit pre-empts ERR_EVM_CHAIN_ID')
  add('nonce_over_wide_9_bytes', type2(std({ nonce: 2n ** 64n })), 'ERR_EVM_INT_WIDTH')
  add('nonce_u64_max_eip2681', type2(std({ nonce: U64_MAX })), 'ERR_EVM_INT_WIDTH', 'EIP-2681: nonce < 2^64 − 1')
  add('gas_over_wide_9_bytes', type2(std({ gas: 2n ** 64n })), 'ERR_EVM_INT_WIDTH')
  add('value_over_wide_17_bytes', type2(std({ value: 2n ** 128n })), 'ERR_EVM_INT_WIDTH', 'refused, never truncated')
  add('max_fee_over_wide_17_bytes', type2(std({ maxFee: 2n ** 128n })), 'ERR_EVM_INT_WIDTH')
  add('too_long_129_bytes', `02${'00'.repeat(128)}`, 'ERR_EVM_TOO_LONG')
  add('bad_hex_odd_length', kb31.slice(2, -1), 'ERR_HEX')
  add('bad_hex_characters', `02zz${kb31.slice(6)}`, 'ERR_HEX')
  add('bad_hex_double_prefix', `0x0x${kb31.slice(2)}`, 'ERR_HEX')
  return v
}
