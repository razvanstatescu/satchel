/**
 * Solana devnet (kb/32; kb/90 §8.2 lib/chains/sol, P2). @solana/web3.js 1.99.0 (not 3.x).
 * A legacy single-transfer message, expiry rules, attach + ed25519 verify.
 * Durable nonces are never built (the contract refuses them, §5.9).
 */
import { Connection, Message, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { base58 } from '@scure/base'
import { toEd25519Signature, type MpcSignature } from '../../near/mpc'
import { classifySolBytes } from '../../policy/sol'
import { solOffchainMessageBytes } from '../../policy/msg'
import { hexToBytesStrict, utf8 } from '../../bytes'

export const SOL_DEVNET_RPC = 'https://api.devnet.solana.com'
export const SOL_FEE_LAMPORTS = 5000n
/** Rent-exempt minimum for a 0-data account, measured 2026-10-21; always re-read with getMinimumBalanceForRentExemption(0). */
export const SOL_RENT_MIN_LAMPORTS = 650_240n
/** A blockhash lives ~150 blocks ≈ 36 s on devnet; use one ≤ 10 s old at the click (spec §8.9). */
export const SOL_BLOCKHASH_MAX_AGE_MS = 10_000
export const LAMPORTS_PER_SOL = 1_000_000_000n

export interface SolTransferParams {
  from: string
  to: string
  lamports: bigint
  recentBlockhash: string
  lastValidBlockHeight: number
}

export interface BuiltSolTransfer {
  transaction: Transaction
  /** the serialized legacy message: the `SignRequest::Sol.message` and the Eddsa payload */
  message: Uint8Array
  lastValidBlockHeight: number
  recentBlockhash: string
}

/** Legacy message with exactly one System Transfer, fee payer = sender (the only signer). */
export function buildSolTransfer(p: SolTransferParams): BuiltSolTransfer {
  if (p.lamports <= 0n || p.lamports > 0xffffffffffffffffn) throw new RangeError('lamports out of range')
  const from = new PublicKey(p.from)
  const to = new PublicKey(p.to)
  const transaction = new Transaction({ feePayer: from, blockhash: p.recentBlockhash, lastValidBlockHeight: p.lastValidBlockHeight }).add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: p.lamports }),
  )
  const message = Uint8Array.from(transaction.serializeMessage())
  classifySolBytes(message) // must pass the contract policy (throws PolicyRefusal otherwise)
  return { transaction, message, lastValidBlockHeight: p.lastValidBlockHeight, recentBlockhash: p.recentBlockhash }
}

export type SolSendProblem = 'below_rent_new_recipient' | 'remainder_below_rent' | 'insufficient' | null

/**
 * Rent rules (kb/32 §Fees and rent): a new recipient needs ≥ rentMin; the sender must end at exactly 0 or ≥ rentMin.
 * "Max" = balance − 5000.
 */
export function checkSolSend(p: { balance: bigint; lamports: bigint; recipientExists: boolean; rentMin?: bigint }): SolSendProblem {
  const rent = p.rentMin ?? SOL_RENT_MIN_LAMPORTS
  if (!p.recipientExists && p.lamports < rent) return 'below_rent_new_recipient'
  const left = p.balance - p.lamports - SOL_FEE_LAMPORTS
  if (left < 0n) return 'insufficient'
  if (left > 0n && left < rent) return 'remainder_below_rent'
  return null
}

export const solMaxSend = (balance: bigint): bigint => (balance > SOL_FEE_LAMPORTS ? balance - SOL_FEE_LAMPORTS : 0n)

/** Expiry: past lastValidBlockHeight the signed tx can never land (status `expired`, spec §8.6). */
export const isSolExpired = (currentBlockHeight: number, lastValidBlockHeight: number): boolean => currentBlockHeight > lastValidBlockHeight

/** Use a blockhash only if it is fresh enough at the click (spec §8.9: ≤ 10 s; refresh every 10 s on Review). */
export const isBlockhashFresh = (fetchedAtMs: number, nowMs: number, maxAgeMs = SOL_BLOCKHASH_MAX_AGE_MS): boolean =>
  nowMs - fetchedAtMs <= maxAgeMs

export class SolSignatureError extends Error {}

export interface SignedSolTx {
  /** wire bytes for sendRawTransaction */
  raw: Uint8Array
  /** base58 signature = the Solana tx id */
  signature: string
}

/** Attach the MPC Ed25519 signature after verifying it over the message against the sender key. */
export function attachSolSignature(built: BuiltSolTransfer, sig: MpcSignature, fromAddress: string): SignedSolTx {
  const s = toEd25519Signature(sig)
  const pub = base58.decode(fromAddress)
  if (!ed25519.verify(s, built.message, pub)) throw new SolSignatureError('MPC signature does not verify for this message')
  const from = new PublicKey(fromAddress)
  built.transaction.addSignature(from, s as never)
  if (!built.transaction.verifySignatures()) throw new SolSignatureError('web3.js signature check failed')
  return { raw: Uint8Array.from(built.transaction.serialize()), signature: base58.encode(s) }
}

/**
 * Rebuild a transfer from its logged message bytes (the `sign_requested` event or a pending intent) so a signature
 * can be re-attached, e.g. "Broadcast again". Validates the message with the contract policy first.
 */
export function solTransferFromMessage(message: Uint8Array, lastValidBlockHeight: number): BuiltSolTransfer {
  const f = classifySolBytes(message)
  const transaction = Transaction.populate(Message.from(message))
  transaction.lastValidBlockHeight = lastValidBlockHeight
  return { transaction, message, lastValidBlockHeight, recentBlockhash: base58.encode(f.recentBlockhash) }
}

export function createSolConnection(url = SOL_DEVNET_RPC): Connection {
  return new Connection(url, 'confirmed')
}

export interface PreparedSolSend extends BuiltSolTransfer {
  fetchedAt: number
  balance: bigint
  rentMin: bigint
  recipientExists: boolean
}

/** Read balance, recipient, rent minimum and a fresh blockhash, then build (kb/32 recipe). */
export async function prepareSolSend(conn: Connection, p: { from: string; to: string; lamports: bigint | 'max' }): Promise<PreparedSolSend> {
  const [bal, toInfo, rentMin, bh] = await Promise.all([
    conn.getBalance(new PublicKey(p.from)),
    conn.getAccountInfo(new PublicKey(p.to)),
    conn.getMinimumBalanceForRentExemption(0),
    conn.getLatestBlockhash('confirmed'),
  ])
  const balance = BigInt(bal)
  const lamports = p.lamports === 'max' ? solMaxSend(balance) : p.lamports
  const problem = checkSolSend({ balance, lamports, recipientExists: toInfo !== null, rentMin: BigInt(rentMin) })
  if (problem) throw new Error(problem)
  const built = buildSolTransfer({ from: p.from, to: p.to, lamports, recentBlockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight })
  return { ...built, fetchedAt: Date.now(), balance, rentMin: BigInt(rentMin), recipientExists: toInfo !== null }
}

/** Balance in lamports ("confirmed"). */
export async function getSolBalance(conn: Connection, address: string): Promise<bigint> {
  return BigInt(await conn.getBalance(new PublicKey(address), 'confirmed'))
}

/** Does the account exist (a new recipient needs ≥ the rent minimum, kb/32)? */
export async function solAccountExists(conn: Connection, address: string): Promise<boolean> {
  return (await conn.getAccountInfo(new PublicKey(address), 'confirmed')) !== null
}

/** True once the signature is confirmed or finalized without an error; false while unknown or pending. */
export async function isSolConfirmed(conn: Connection, signature: string): Promise<boolean> {
  const st = (await conn.getSignatureStatus(signature, { searchTransactionHistory: false })).value
  return !!st && !st.err && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')
}

/** Broadcast unless expired; preflight on. Returns the base58 signature. */
export async function broadcastSol(conn: Connection, signed: SignedSolTx, lastValidBlockHeight: number): Promise<string> {
  const h = await conn.getBlockHeight('confirmed')
  if (isSolExpired(h, lastValidBlockHeight)) throw new SolSignatureError('blockhash expired: rebuild and re-sign')
  return conn.sendRawTransaction(signed.raw)
}

/** base58 (Solana addresses, blockhashes, signatures), for callers that don't depend on @scure/base themselves. */
export const toBase58 = (b: Uint8Array): string => base58.encode(b)
export const fromBase58 = (s: string): Uint8Array => base58.decode(s)

export type ParsedSolAddress = { ok: true; address: string; onCurve: boolean } | { ok: false }

/**
 * Recipient check (kb/80 R3 §Recipient validation, Solana): base58 that decodes to exactly 32 bytes. `onCurve` false
 * means a program-derived address (no private key; kb/80 `val.sol.pda` warning). Whitespace is trimmed.
 */
export function parseSolAddress(input: string): ParsedSolAddress {
  const a = input.trim()
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return { ok: false }
  let bytes: Uint8Array
  try {
    bytes = base58.decode(a)
  } catch {
    return { ok: false }
  }
  if (bytes.length !== 32) return { ok: false }
  return { ok: true, address: base58.encode(bytes), onCurve: PublicKey.isOnCurve(bytes) }
}

export const solTxUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`
export const solAddressUrl = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`

/**
 * C7: verify a `sol_message` record's Ed25519 signature (`signature` hex from the `sig_records` view) over the Solana
 * off-chain message v0 the contract built from `message`, as `solana verify-offchain-signature` would.
 */
export function verifySolOffchainSignature(message: string | Uint8Array, signatureHex: string, pubkeyBase58: string): boolean {
  const body = typeof message === 'string' ? utf8(message) : message
  try {
    return ed25519.verify(hexToBytesStrict(signatureHex), solOffchainMessageBytes(body), base58.decode(pubkeyBase58))
  } catch {
    return false
  }
}
