/** SOL vectors (spec §12.2): legacy single System Transfer accepted; every refusal class of §5.9 (R-24 order). web3.js 1.99. */
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
} from '@solana/web3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, toHex, u64le, utf8 } from '@satchel/core/bytes'
import { deriveSatchelAddresses } from '@satchel/core/derive'
import { solSignRequest } from '@satchel/core/near'
import { assert, vec, type Vector } from './lib'

// kb/32 §Signing run: real MPC Ed25519 signature over exactly this message (NEAR tx H6xHyS25…)
const KB32 = {
  from: '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA',
  to: '8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r',
  lamports: 1_000_000n,
  blockhash: '2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW',
}
const FROM = new PublicKey(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1').sol)
const TO = new PublicKey(deriveSatchelAddresses('testnet', 'satchel.example.testnet', '2').sol)
const BH = new PublicKey(sha256(utf8('satchel-vector-blockhash'))).toBase58()
const seeded = (s: string) => Keypair.fromSeed(sha256(utf8(s))).publicKey
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

const msg = (tx: Transaction) => toHex(Uint8Array.from(tx.serializeMessage()))
const legacy = (ixs: TransactionInstruction[], feePayer = FROM, blockhash = BH) => {
  const t = new Transaction({ feePayer, blockhash, lastValidBlockHeight: 1 })
  for (const ix of ixs) t.add(ix)
  return msg(t)
}
const transfer = (from = FROM, to = TO, lamports = 1_000_000n) => SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })

export function solVectors(): Vector[] {
  const v: Vector[] = []
  const add = (name: string, hex: string, want: Parameters<typeof vec>[3], note?: string) => v.push(vec(name, 'sol', solSignRequest(hex), want, note))
  const addRaw = (name: string, hex: string, want: Parameters<typeof vec>[3], note?: string) => v.push(vec(name, 'sol', { sol: { message: hex } }, want, note))

  // ── accepted ───────────────────────────────────────────────────────────────────────────────
  const kb32 = legacy([transfer(new PublicKey(KB32.from), new PublicKey(KB32.to), KB32.lamports)], new PublicKey(KB32.from), KB32.blockhash)
  assert(kb32.length === 300 && kb32.startsWith('010001034ff32bf6a19245fa7842d0146aedfe5b'), 'kb/32 150-byte message prefix')
  add('sol_transfer_kb32', kb32, 'ok', 'kb/32 real MPC-signed message (150 B); signature 3HeVZAwB…MCYt verifies over it')
  add('sol_transfer_new_account', legacy([transfer(FROM, TO, 650_240n)]), 'ok', 'to a new account: ≥ rent minimum 650,240 lamports (UI rule, not a contract rule)')
  add('sol_transfer_existing_account', legacy([transfer(FROM, seeded('existing'), 12_345n)]), 'ok', 'to an existing account: any amount')
  add('sol_self_transfer', legacy([transfer(FROM, FROM, 1n)]), 'ok', 'from == to: keys [from, system], accounts [0, 0]')
  add('sol_transfer_max_lamports', legacy([transfer(FROM, TO, 2n ** 64n - 1n)]), 'ok', 'u64 max')
  addRaw('sol_0x_uppercase_input', `0x${kb32.toUpperCase()}`, 'ok')

  // ── refused ────────────────────────────────────────────────────────────────────────────────
  const v0 = new TransactionMessage({ payerKey: FROM, recentBlockhash: BH, instructions: [transfer()] }).compileToV0Message()
  add('sol_v0_message', toHex(v0.serialize()), 'ERR_SOL_VERSION', 'versioned message (0x80 prefix)')
  add('sol_offchain_ff', toHex(concatBytes(Uint8Array.of(0xff), utf8('solana offchain message'))), 'ERR_SOL_VERSION', '\\xff off-chain message prefix')
  const nonceAcct = seeded('nonce account')
  const advance = SystemProgram.nonceAdvance({ noncePubkey: nonceAcct, authorizedPubkey: FROM })
  assert(toHex(Uint8Array.from(advance.data)).startsWith('04000000'), 'AdvanceNonceAccount data')
  add('sol_durable_nonce_ix0', legacy([advance, transfer()]), 'ERR_SOL_DURABLE_NONCE', 'ix0 = AdvanceNonceAccount (04000000): never expires')
  add('sol_durable_nonce_ix1', legacy([transfer(), advance]), 'ERR_SOL_DURABLE_NONCE', 'every instruction is scanned')
  add('sol_durable_nonce_alone', legacy([advance]), 'ERR_SOL_DURABLE_NONCE')
  add('sol_two_transfers', legacy([transfer(), transfer(FROM, seeded('second'), 5n)]), 'ERR_SOL_INSTRUCTION', 'exactly one instruction')
  add('sol_compute_budget_plus_transfer', legacy([ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }), transfer()]), 'ERR_SOL_INSTRUCTION')
  add('sol_compute_budget_only', legacy([ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })]), 'ERR_SOL_INSTRUCTION', 'program is not System')
  add('sol_system_assign', legacy([SystemProgram.assign({ accountPubkey: FROM, programId: TOKEN_PROGRAM })]), 'ERR_SOL_INSTRUCTION', 'System but not Transfer')
  const splApprove = new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    keys: [
      { pubkey: seeded('token account'), isSigner: false, isWritable: true },
      { pubkey: seeded('delegate'), isSigner: false, isWritable: false },
      { pubkey: FROM, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(concatBytes(Uint8Array.of(4), u64le(2n ** 64n - 1n))),
  })
  add('sol_spl_token_approve', legacy([splApprove]), 'ERR_SOL_INSTRUCTION', 'SPL Approve (data 04 + u64): not System, not a durable nonce')
  add('sol_two_signers', legacy([transfer(seeded('other signer'), TO, 1n)]), 'ERR_SOL_HEADER', 'transfer from a second signer: num_required_signatures 2')

  // byte-level edits of the accepted message
  const base = legacy([transfer()])
  const b = Uint8Array.from(Buffer.from(base, 'hex'))
  add('sol_readonly_signed_1', toHex(Uint8Array.from([b[0]!, 1, ...b.slice(2)])), 'ERR_SOL_HEADER', 'num_readonly_signed must be 0')
  add('sol_readonly_unsigned_exceeds_keys', toHex(Uint8Array.from([b[0]!, b[1]!, 3, ...b.slice(3)])), 'ERR_SOL_MALFORMED', '1 signer + 3 readonly-unsigned > 3 keys')
  add('sol_trailing_byte', `${base}00`, 'ERR_SOL_MALFORMED')
  add('sol_truncated', base.slice(0, -2), 'ERR_SOL_MALFORMED')
  // num_keys = 3 lives at offset 3; 17 keys would exceed 16
  assert(b[3] === 3, 'layout: 3 keys')
  const ix = b.slice(4 + 3 * 32 + 32)
  const swapped = Uint8Array.from(ix)
  // ix layout: 01 (count) | 02 (program idx) | 02 (n accounts) | 00 01 | 0c | data…  → swap the accounts to [1, 0]
  assert(swapped[0] === 1 && swapped[1] === 2 && swapped[2] === 2 && swapped[3] === 0 && swapped[4] === 1, 'layout: transfer accounts [0,1]')
  swapped[3] = 1
  swapped[4] = 0
  add('sol_transfer_accounts_swapped', toHex(concatBytes(b.slice(0, 4 + 3 * 32 + 32), swapped)), 'ERR_SOL_INSTRUCTION', 'source must be the signer (index 0)')
  const oob = Uint8Array.from(ix)
  oob[4] = 7
  add('sol_account_index_out_of_range', toHex(concatBytes(b.slice(0, 4 + 3 * 32 + 32), oob)), 'ERR_SOL_MALFORMED')
  const noncanon = concatBytes(b.slice(0, 3), Uint8Array.of(0x83, 0x00), b.slice(4))
  add('sol_non_canonical_compact_u16', toHex(noncanon), 'ERR_SOL_MALFORMED', 'num_keys 3 as 83 00')
  add('sol_one_key', toHex(concatBytes(Uint8Array.of(1, 0, 0, 1), b.slice(4, 36), b.slice(4 + 96, 4 + 128), Uint8Array.of(0))), 'ERR_SOL_MALFORMED', 'num_keys must be ≥ 2')
  add('sol_too_long_1233', toHex(concatBytes(b, new Uint8Array(1233 - b.length))), 'ERR_SOL_TOO_LONG')
  addRaw('sol_empty', '', 'ERR_SOL_MALFORMED')
  // a raw 32-byte hash must never parse as a message: the expected error follows from its first bytes
  const h = sha256(utf8('satchel raw hash for ed25519'))
  const want = h[0]! & 0x80 ? 'ERR_SOL_VERSION' : h[0] !== 1 || h[1] !== 0 ? 'ERR_SOL_HEADER' : 'ERR_SOL_MALFORMED'
  add('sol_raw_32_byte_hash', toHex(h), want, `32-byte hash (first byte 0x${h[0]!.toString(16)})`)
  addRaw('sol_bad_hex', `${base}0`, 'ERR_HEX')
  return v
}
