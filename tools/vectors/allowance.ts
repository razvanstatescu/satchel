/**
 * C5 allowance vectors (docs/specs/C5.md §3, §4) → vectors/allowance.json, consumed by
 * `contracts/satchel/src/allowance_tests.rs::shared_allowance_vectors` and `packages/core/test/allowance.test.ts`.
 *
 * - `debits`: a SignRequest through the stateless classifier, then the worst-case debits (or the refusal code).
 * - `evm_raw`: raw EVM tx bytes → debits, covering ERC-20 calldata that today's classifier refuses (C2 lands it).
 * - `window`: caps with prior spends + the debits of one request at `now_ms` → remaining before, then ok (remaining
 *   after) or the refusal code. Checks run per debit in order (ASSET, then EXCEEDED), then RATE.
 *
 * Every expected outcome is declared by hand from the spec rule and cross-checked against the TS mirror
 * (@satchel/core/policy); a disagreement fails generation. Deterministic: no clock, no randomness, no network.
 */
import { PublicKey, SystemProgram, Transaction, type TransactionInstruction } from '@solana/web3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bigIntToBytesBE, concatBytes, hexToBytesStrict, reverseBytes, toHex, utf8 } from '@satchel/core/bytes'
import { deriveSatchelAddresses, hash160 } from '@satchel/core/derive'
import { btcSignRequest, evmSignRequest, solSignRequest, type SignRequest } from '@satchel/core/near'
import { bip143Preimages, serializeOutputs, type BtcUnsignedTx } from '@satchel/core/chains/btc'
import {
  allowanceDebits,
  applyDebits,
  capRemaining,
  encodeRlp,
  evmDebits,
  AllowanceRefusal,
  type Asset,
  type CapState,
  type Debit,
  type RlpInput,
} from '@satchel/core/policy'
import { assert } from './lib'

const SEPOLIA = 11155111
const T0 = 1_793_000_000_000
const W = 86_400_000
const U128_MAX = 2n ** 128n - 1n
const USDC_SEPOLIA = '1c7d4b196cb0c7b01d743fbc6116a902379c7238'
const TO = hexToBytesStrict('61739f33adbb7f76c1b5b222e4119085257528be')

type DebitJson = { asset: Asset; amount: string }
const dj = (asset: Asset, amount: bigint): DebitJson => ({ asset, amount: amount.toString() })
const evmA = (chain_id = SEPOLIA): Asset => ({ evm: { chain_id } })
const erc20A = (token = USDC_SEPOLIA, chain_id = SEPOLIA): Asset => ({ erc20: { chain_id, token } })

type Expect = { ok: true; debits: DebitJson[] } | { ok: false; error: string }

interface DebitVector {
  name: string
  request: SignRequest
  expect: Expect
  note?: string
}
interface EvmRawVector {
  name: string
  unsigned_tx: string
  expect: Expect
  note?: string
}
interface WindowVector {
  name: string
  caps: { asset: Asset; limit: string; spends: { at_ms: number; amount: string }[] }[]
  now_ms: number
  debits: DebitJson[]
  expect: { ok: boolean; error?: string; remaining_before: string[]; remaining_after?: string[] }
  note?: string
}

const sameDebits = (a: Debit[], b: DebitJson[]) => JSON.stringify(a.map((d) => dj(d.asset, d.amount))) === JSON.stringify(b)

// ── builders ─────────────────────────────────────────────────────────────────────────────────────

const b = (v: bigint): Uint8Array => bigIntToBytesBE(v)
function evmTx(o: { chainId?: bigint; nonce?: bigint; maxFee?: bigint; gas?: bigint; to?: Uint8Array; value?: bigint; data?: Uint8Array; type?: number } = {}): Uint8Array {
  const items: RlpInput[] = [
    b(o.chainId ?? BigInt(SEPOLIA)),
    b(o.nonce ?? 0n),
    b(1_000_000_000n),
    b(o.maxFee ?? 2_000_000_000n),
    b(o.gas ?? 21_000n),
    o.to ?? TO,
    b(o.value ?? 10n ** 15n),
    o.data ?? new Uint8Array(),
    [],
  ]
  return concatBytes(Uint8Array.of(o.type ?? 0x02), encodeRlp(items))
}
const word = (v: bigint) => {
  const out = new Uint8Array(32)
  const x = bigIntToBytesBE(v)
  out.set(x, 32 - x.length)
  return out
}
const erc20Data = (selector: string, recipient: Uint8Array, amount: bigint) =>
  concatBytes(hexToBytesStrict(selector), new Uint8Array(12), recipient, word(amount))

const sender = deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1')
const PKH = hash160(hexToBytesStrict(sender.btcPubkey))
const SELF = concatBytes(Uint8Array.of(0x00, 0x14), PKH)
const RECIP = concatBytes(Uint8Array.of(0x00, 0x14), hash160(hexToBytesStrict(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '2').btcPubkey)))
const P2PKH_SELF = concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), PKH, Uint8Array.of(0x88, 0xac))
const P2TR = concatBytes(Uint8Array.of(0x51, 0x20), sha256(utf8('satchel-allowance-taproot')))
const fakeTxid = (i: number) => toHex(reverseBytes(sha256(sha256(utf8(`satchel-allowance-input:${i}`)))))

function btcReq(inputs: bigint[], outputs: { script: Uint8Array; value: bigint }[], sighash?: number): SignRequest {
  const tx: BtcUnsignedTx = {
    version: 2,
    locktime: 0,
    inputs: inputs.map((value, i) => ({ txid: fakeTxid(i), vout: i, value, sequence: 0xfffffffd })),
    outputs,
  }
  const pre = bip143Preimages(tx, PKH)
  if (sighash !== undefined) for (const p of pre) p.set([sighash, 0, 0, 0], 178)
  return btcSignRequest(pre, serializeOutputs(outputs))
}

const FROM = new PublicKey(sender.sol)
const SOL_TO = new PublicKey(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '2').sol)
const BH = new PublicKey(sha256(utf8('satchel-allowance-blockhash'))).toBase58()
const solMsg = (ixs: TransactionInstruction[]) => {
  const t = new Transaction({ feePayer: FROM, recentBlockhash: BH })
  t.add(...ixs)
  return toHex(Uint8Array.from(t.serializeMessage()))
}

// ── 1. debits through the classifier ─────────────────────────────────────────────────────────────

function debitVectors(): DebitVector[] {
  const out: DebitVector[] = []
  const add = (name: string, request: SignRequest, expect: Expect, note?: string) => {
    const r = allowanceDebits(request)
    const ok = r.ok ? expect.ok && sameDebits(r.debits, expect.debits) : !expect.ok && r.error === expect.error
    assert(ok, `allowance vector ${name}: spec says ${JSON.stringify(expect)}, mirror says ${JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`)
    out.push(note ? { name, request, expect, note } : { name, request, expect })
  }
  const KB31 = '02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'
  add('evm_kb31', { evm: { unsigned_tx: KB31 } }, { ok: true, debits: [dj(evmA(), 100_000_000_000_000n + 21_000n * 200_028n)] }, 'value 1e14 + 21000 × max_fee 200028')
  add('evm_value0_huge_tip', evmSignRequest(evmTx({ value: 0n, maxFee: 10n ** 12n })), { ok: true, debits: [dj(evmA(), 21_000n * 10n ** 12n)] }, 'value 0 still debits the worst-case fee')
  add('evm_create_account_gas', evmSignRequest(evmTx({ gas: 204_600n, maxFee: 3_000_000_000n, value: 10n ** 16n })), { ok: true, debits: [dj(evmA(), 10n ** 16n + 204_600n * 3_000_000_000n)] }, 'Sepolia account-creating transfer gas (CLAUDE.md)')
  add('evm_zero_cost', evmSignRequest(evmTx({ value: 0n, maxFee: 0n })), { ok: true, debits: [dj(evmA(), 0n)] }, 'a 0 debit still needs a cap and a spend entry')
  add('evm_max_value_overflow', evmSignRequest(evmTx({ value: U128_MAX, gas: 1n, maxFee: 1n })), { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, 'value + fee > u128: refused, never wrapped')
  add('evm_fee_overflow', evmSignRequest(evmTx({ gas: 2n ** 64n - 1n, maxFee: 2n ** 127n })), { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' })
  add('evm_max_value_no_fee', evmSignRequest(evmTx({ value: U128_MAX, maxFee: 0n })), { ok: true, debits: [dj(evmA(), U128_MAX)] })
  add('evm_chain_1_refused_by_classifier', evmSignRequest(evmTx({ chainId: 1n })), { ok: false, error: 'ERR_EVM_CHAIN_ID' }, 'the classifier refusal comes first')
  add('evm_calldata_refused_by_classifier', evmSignRequest(evmTx({ data: erc20Data('a9059cbb', TO, 1n) })), { ok: false, error: 'ERR_EVM_TOKEN' }, 'C2: a transfer() to a contract that is not the chain USDC')
  add('erc20_usdc_transfer_debits', evmSignRequest(evmTx({ to: hexToBytesStrict(USDC_SEPOLIA), value: 0n, gas: 65_000n, maxFee: 3_000_000_000n, data: erc20Data('a9059cbb', TO, 5_000_000n) })), { ok: true, debits: [dj(erc20A(), 5_000_000n), dj(evmA(), 65_000n * 3_000_000_000n)] }, 'C2 through the classifier: token amount, then the ETH gas')
  add('evm_message_refused_for_delegates', { evm_message: { message: '68656c6c6f' } }, { ok: false, error: 'ERR_ALLOWANCE_KIND' }, 'C7: messages move no coins, so no cap measures them; owner only')
  add('sol_message_refused_for_delegates', { sol_message: { message: '68656c6c6f' } }, { ok: false, error: 'ERR_ALLOWANCE_KIND' }, 'C7: owner only')

  add('btc_change_not_counted', btcReq([61_000n], [{ script: RECIP, value: 40_000n }, { script: SELF, value: 20_500n }]), { ok: true, debits: [dj('btc', 40_000n + 500n)] }, '40000 out + 500 fee; 20500 change to 0014‖pkh')
  add('btc_no_change', btcReq([50_000n], [{ script: RECIP, value: 49_000n }]), { ok: true, debits: [dj('btc', 50_000n)] }, 'everything leaves: 49000 + 1000 fee')
  add('btc_p2pkh_to_own_pkh_counts', btcReq([50_000n], [{ script: P2PKH_SELF, value: 10_000n }, { script: SELF, value: 39_000n }]), { ok: true, debits: [dj('btc', 11_000n)] }, 'only 0014‖pkh is change')
  add('btc_taproot_recipient', btcReq([93_000n], [{ script: P2TR, value: 1_000n }, { script: RECIP, value: 2_000n }, { script: SELF, value: 89_000n }]), { ok: true, debits: [dj('btc', 4_000n)] })
  add('btc_outputs_above_inputs', btcReq([1_000n], [{ script: RECIP, value: 5_000n }]), { ok: true, debits: [dj('btc', 5_000n)] }, 'no negative fee (the signature would be invalid anyway)')
  add('btc_all_to_self', btcReq([10_000n], [{ script: SELF, value: 10_000n }]), { ok: true, debits: [dj('btc', 0n)] })
  // AUDIT-01: a delegate signs BTC with exactly one input (BIP143 commits each amount only in its own sighash)
  add('btc_two_inputs_refused_for_delegates', btcReq([30_000n, 31_000n], [{ script: RECIP, value: 40_000n }, { script: SELF, value: 20_500n }]), { ok: false, error: 'ERR_ALLOWANCE_BTC_ONE_INPUT' }, 'AUDIT-01: n > 1 is refused whatever the debit would be')
  add('btc_three_inputs_refused_for_delegates', btcReq([30_000n, 31_000n, 32_000n], [{ script: P2TR, value: 1_000n }, { script: RECIP, value: 2_000n }, { script: SELF, value: 89_000n }]), { ok: false, error: 'ERR_ALLOWANCE_BTC_ONE_INPUT' })
  add('btc_split_amount_half_refused', btcReq([1_000_000n, 1n], [{ script: SELF, value: 1_000_000n }]), { ok: false, error: 'ERR_ALLOWANCE_BTC_ONE_INPUT' }, 'AUDIT-01 repro: one half of a split-amount pair (B stated as 1 sat) would debit 1 sat for a 1,000,000-sat real fee')
  add('btc_one_input_all_fee', btcReq([1_000_000n], [{ script: SELF, value: 1n }]), { ok: true, debits: [dj('btc', 999_999n)] }, 'one input: the stated amount is the signed amount, so the whole fee is debited')
  add('btc_two_inputs_bad_sighash_classifier_first', btcReq([10_000n, 10_000n], [{ script: RECIP, value: 9_000n }], 2), { ok: false, error: 'ERR_BTC_SIGHASH' }, 'the classifier refusal comes before the one-input rule')
  add('btc_sighash_none_refused_by_classifier', btcReq([10_000n], [{ script: RECIP, value: 9_000n }], 2), { ok: false, error: 'ERR_BTC_SIGHASH' })

  const tr = (to: PublicKey, lamports: bigint) => SystemProgram.transfer({ fromPubkey: FROM, toPubkey: to, lamports })
  add('sol_transfer', solSignRequest(solMsg([tr(SOL_TO, 1_000_000n)])), { ok: true, debits: [dj('sol', 1_005_000n)] }, 'lamports + 5000 fee')
  add('sol_self_transfer', solSignRequest(solMsg([tr(FROM, 1n)])), { ok: true, debits: [dj('sol', 5_001n)] }, 'counted anyway (conservative)')
  add('sol_max_lamports', solSignRequest(solMsg([tr(SOL_TO, 2n ** 64n - 1n)])), { ok: true, debits: [dj('sol', 2n ** 64n - 1n + 5_000n)] })
  const advance = SystemProgram.nonceAdvance({ noncePubkey: new PublicKey(sha256(utf8('nonce'))), authorizedPubkey: FROM })
  add('sol_durable_nonce_refused_by_classifier', solSignRequest(solMsg([advance, tr(SOL_TO, 1n)])), { ok: false, error: 'ERR_SOL_DURABLE_NONCE' })
  return out
}

// ── 2. raw EVM bytes ─────────────────────────────────────────────────────────────────────────────

function evmRawVectors(): EvmRawVector[] {
  const out: EvmRawVector[] = []
  const add = (name: string, tx: Uint8Array, expect: Expect, note?: string) => {
    let ok: boolean
    let got: unknown
    try {
      const d = evmDebits(tx)
      got = d.map((x) => dj(x.asset, x.amount))
      ok = expect.ok && sameDebits(d, expect.debits)
    } catch (e) {
      if (!(e instanceof AllowanceRefusal)) throw e
      got = e.code
      ok = !expect.ok && e.code === expect.error
    }
    assert(ok, `evm_raw vector ${name}: spec says ${JSON.stringify(expect)}, mirror says ${JSON.stringify(got)}`)
    const v: EvmRawVector = { name, unsigned_tx: toHex(tx), expect }
    if (note) v.note = note
    out.push(v)
  }
  const usdc = hexToBytesStrict(USDC_SEPOLIA)
  const gasCost = 65_000n * 3_000_000_000n
  const erc = (data: Uint8Array, value = 0n) => evmTx({ to: usdc, value, gas: 65_000n, maxFee: 3_000_000_000n, data })
  add('native_plain', evmTx(), { ok: true, debits: [dj(evmA(), 10n ** 15n + 21_000n * 2_000_000_000n)] })
  add('native_base_sepolia', evmTx({ chainId: 84532n }), { ok: true, debits: [dj(evmA(84532), 10n ** 15n + 21_000n * 2_000_000_000n)] }, 'C3 chain: the debit names the chain id; the cap must exist for it')
  add('erc20_transfer_usdc', erc(erc20Data('a9059cbb', TO, 5_000_000n)), { ok: true, debits: [dj(erc20A(), 5_000_000n), dj(evmA(), gasCost)] }, 'C2: token amount, then the ETH gas')
  add('erc20_transfer_with_value', erc(erc20Data('a9059cbb', TO, 7n), 3n), { ok: true, debits: [dj(erc20A(), 7n), dj(evmA(), gasCost + 3n)] }, 'C2 refuses value ≠ 0; the debit still counts it')
  add('erc20_amount_u128_max', erc(erc20Data('a9059cbb', TO, U128_MAX)), { ok: true, debits: [dj(erc20A(), U128_MAX), dj(evmA(), gasCost)] })
  add('erc20_amount_2_128', erc(erc20Data('a9059cbb', TO, 2n ** 128n)), { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, 'uint256 above u128: refused')
  add('erc20_approve', erc(erc20Data('095ea7b3', TO, 1n)), { ok: false, error: 'ERR_ALLOWANCE_KIND' }, 'approve is never a delegate payment')
  add('erc20_transfer_from', erc(concatBytes(hexToBytesStrict('23b872dd'), word(1n), word(2n), word(3n))), { ok: false, error: 'ERR_ALLOWANCE_KIND' })
  add('erc20_transfer_short', erc(erc20Data('a9059cbb', TO, 1n).subarray(0, 67)), { ok: false, error: 'ERR_ALLOWANCE_KIND' })
  add('erc20_transfer_long', erc(concatBytes(erc20Data('a9059cbb', TO, 1n), Uint8Array.of(0))), { ok: false, error: 'ERR_ALLOWANCE_KIND' })
  add('one_byte_calldata', erc(Uint8Array.of(0)), { ok: false, error: 'ERR_ALLOWANCE_KIND' })
  add('legacy_type_byte', evmTx({ type: 0x01 }), { ok: false, error: 'ERR_ALLOWANCE_KIND' })
  add('fee_overflow_before_calldata', evmTx({ gas: 2n ** 64n - 1n, maxFee: 2n ** 127n, data: Uint8Array.of(1) }), { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, 'the overflow check runs before the calldata rule')
  return out
}

// ── 3. window ────────────────────────────────────────────────────────────────────────────────────

function windowVectors(): WindowVector[] {
  const out: WindowVector[] = []
  type CapJ = WindowVector['caps'][number]
  const c = (asset: Asset, limit: bigint, spends: [number, bigint][] = []): CapJ => ({
    asset,
    limit: limit.toString(),
    spends: spends.map(([at_ms, a]) => ({ at_ms, amount: a.toString() })),
  })
  const add = (name: string, caps: CapJ[], now_ms: number, debits: DebitJson[], want: { ok: true; after: bigint[] } | { ok: false; error: string }, before: bigint[], note?: string) => {
    const state: CapState[] = caps.map((x) => ({ asset: x.asset, limit: BigInt(x.limit), spends: x.spends.map((s) => ({ at_ms: s.at_ms, amount: BigInt(s.amount) })) }))
    const gotBefore = state.map((s) => capRemaining(s, now_ms))
    assert(JSON.stringify(gotBefore.map(String)) === JSON.stringify(before.map(String)), `window ${name}: remaining before ${gotBefore} ≠ ${before}`)
    const r = applyDebits(state, debits.map((d) => ({ asset: d.asset, amount: BigInt(d.amount) })), now_ms)
    if (want.ok) {
      assert(r.ok, `window ${name}: spec says ok, mirror says ${!r.ok && r.error}`)
      const after = r.caps.map((s) => capRemaining(s, now_ms))
      assert(JSON.stringify(after.map(String)) === JSON.stringify(want.after.map(String)), `window ${name}: remaining after ${after} ≠ ${want.after}`)
    } else assert(!r.ok && r.error === want.error, `window ${name}: spec says ${want.error}, mirror says ${r.ok ? 'ok' : r.error}`)
    const expect: WindowVector['expect'] = { ok: want.ok, remaining_before: before.map(String) }
    if (want.ok) expect.remaining_after = want.after.map(String)
    else expect.error = want.error
    const v: WindowVector = { name, caps, now_ms, debits, expect }
    if (note) v.note = note
    out.push(v)
  }
  const full32 = (at: number): [number, bigint][] => Array.from({ length: 32 }, (_, i) => [at + i, 0n] as [number, bigint])
  add('fresh_exact_cap', [c(evmA(), 1000n)], T0, [dj(evmA(), 1000n)], { ok: true, after: [0n] }, [1000n])
  add('fresh_one_over', [c(evmA(), 1000n)], T0, [dj(evmA(), 1001n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [1000n])
  add('spend_counts_until_window_end', [c('btc', 1000n, [[T0, 600n]])], T0 + W - 1, [dj('btc', 401n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [400n], 'at at_ms + W − 1 the spend still counts')
  add('spend_fits_inside_window', [c('btc', 1000n, [[T0, 600n]])], T0 + W - 1, [dj('btc', 400n)], { ok: true, after: [0n] }, [400n])
  add('spend_released_at_window_end', [c('btc', 1000n, [[T0, 600n]])], T0 + W, [dj('btc', 1000n)], { ok: true, after: [0n] }, [1000n], 'released exactly at at_ms + W')
  add('sliding_not_daily', [c('sol', 1000n, [[T0, 600n], [T0 + W / 2, 400n]])], T0 + W, [dj('sol', 601n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [600n], 'only the older spend has left the window')
  add('two_debits_same_asset_accumulate', [c(evmA(), 1000n)], T0, [dj(evmA(), 600n), dj(evmA(), 401n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [1000n])
  add('erc20_and_gas', [c(erc20A(), 5_000_000n), c(evmA(), 10n ** 15n, [[T0 - 10, 10n ** 14n]])], T0, [dj(erc20A(), 5_000_000n), dj(evmA(), 195n * 10n ** 12n)], { ok: true, after: [0n, 10n ** 15n - 10n ** 14n - 195n * 10n ** 12n] }, [5_000_000n, 9n * 10n ** 14n])
  add('erc20_without_gas_cap', [c(erc20A(), 5_000_000n)], T0, [dj(erc20A(), 1n), dj(evmA(), 1n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [5_000_000n], 'gas needs an EVM cap')
  add('asset_missing', [c('btc', 10n)], T0, [dj('sol', 1n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [10n])
  add('zero_debit_needs_cap', [c('btc', 10n)], T0, [dj(evmA(), 0n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [10n])
  add('other_chain_id_is_another_asset', [c(evmA(), 10n)], T0, [dj(evmA(84532), 1n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [10n])
  add('other_token_is_another_asset', [c(erc20A(), 10n)], T0, [dj(erc20A('11'.repeat(20)), 1n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [10n])
  add('order_asset_first', [c('btc', 10n)], T0, [dj('sol', 1n), dj('btc', 11n)], { ok: false, error: 'ERR_ALLOWANCE_ASSET' }, [10n], 'checks run per debit in order')
  add('order_exceeded_first', [c('btc', 10n)], T0, [dj('btc', 11n), dj('sol', 1n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [10n])
  add('rate_full', [c(evmA(), 1000n, full32(T0))], T0 + 100, [dj(evmA(), 0n)], { ok: false, error: 'ERR_ALLOWANCE_RATE' }, [1000n], '32 debits already inside the window')
  add('rate_exceeded_wins_over_rate', [c(evmA(), 0n + 1000n, full32(T0))], T0 + 100, [dj(evmA(), 1001n)], { ok: false, error: 'ERR_ALLOWANCE_EXCEEDED' }, [1000n])
  add('rate_freed_by_pruning', [c(evmA(), 1000n, full32(T0))], T0 + W + 31, [dj(evmA(), 1000n)], { ok: true, after: [0n] }, [1000n], 'all 32 left the window')
  add('rate_partly_freed', [c(evmA(), 1000n, full32(T0))], T0 + W, [dj(evmA(), 5n)], { ok: true, after: [995n] }, [1000n], 'the entry at T0 left; 31 remain')
  add('rate_two_entries_need_two_slots', [c(erc20A(), 10n), c(evmA(), 1000n, full32(T0).slice(0, 31))], T0 + 100, [dj(erc20A(), 1n), dj(evmA(), 1n)], { ok: false, error: 'ERR_ALLOWANCE_RATE' }, [10n, 1000n])
  add('spent_above_lowered_limit', [c('btc', 100n, [[T0, 500n]])], T0 + 1, [dj('btc', 0n)], { ok: true, after: [0n] }, [0n], 'a re-set lower cap keeps older spends: remaining saturates at 0')
  add('multi_cap_untouched', [c('btc', 7n, [[T0, 2n]]), c('sol', 9n)], T0 + 1, [dj('sol', 9n)], { ok: true, after: [5n, 0n] }, [5n, 9n])
  return out
}

export function allowanceVectors() {
  return {
    schema: 'satchel-allowance-vectors/1',
    set: 'allowance',
    generator: 'tools/vectors/allowance.ts',
    window_ms: W,
    max_spends: 32,
    debits: debitVectors(),
    evm_raw: evmRawVectors(),
    window: windowVectors(),
  }
}
