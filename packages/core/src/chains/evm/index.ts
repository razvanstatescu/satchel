/**
 * EVM Sepolia (kb/31; spec §8.2 lib/chains/evm). viem 2.57.7.
 * Native ETH only: unsigned type-2 tx with empty data and empty access list, chainId 11155111.
 */
import {
  createPublicClient,
  fallback,
  http,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  serializeTransaction,
  type Hex,
  type PublicClient,
  type TransactionSerializableEIP1559,
} from 'viem'
import { sepolia } from 'viem/chains'
import { hexToBytesStrict, strip0x, toHex } from '../../bytes'
import { toEvmSignature, type MpcSignature } from '../../near/mpc'

export const SEPOLIA_CHAIN_ID = 11155111
/** The classic intrinsic cost of a plain transfer to an existing account: the floor, never the assumption. */
export const EVM_TRANSFER_GAS = 21_000n
/**
 * Fallbacks when the node can't estimate. Sepolia's 2026 fork (state-gas accounting: `regularGasUsed` and
 * `stateGasUsed` in traces) charges 204,600 gas for a transfer that **creates** the recipient account. A 21,000 limit
 * then fails "out of gas"; the nonce is used and the value never moves (dev1 #1, 2026-10-29).
 */
export const EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK = 250_000n
export const EVM_CONTRACT_TRANSFER_GAS_FALLBACK = 100_000n

/**
 * spec §8.3: publicnode → ethpandaops → 0xrpc → tenderly. Never thirdweb (viem default), tenderly or 1rpc as primary.
 * sepolia.drpc.org was dropped on 2026-10-27: "chain is not available on free plan" (testnet smoke).
 */
export const SEPOLIA_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.ethpandaops.io',
  'https://0xrpc.io/sep',
  'https://sepolia.gateway.tenderly.co',
] as const

export const BLOCKSCOUT_SEPOLIA = 'https://eth-sepolia.blockscout.com'

export interface SepoliaClientOptions {
  /** per-request timeout per transport, ms (default 4000) */
  timeoutMs?: number
  /** ranking on by default ({interval: 30 s, sampleCount: 5, timeout: 2 s}); false disables */
  rank?: boolean
}

/** viem fallback transport with ranking (kb/31 §viem client). Isomorphic. */
export function createSepoliaClient(urls: readonly string[] = SEPOLIA_RPCS, opts: SepoliaClientOptions = {}): PublicClient {
  const timeout = opts.timeoutMs ?? 4_000
  return createPublicClient({
    chain: sepolia,
    transport: fallback(
      urls.map((u) => http(u, { timeout, retryCount: 0 })),
      { rank: opts.rank === false ? false : { interval: 30_000, sampleCount: 5, timeout: 2_000 }, retryCount: 1 },
    ),
  }) as PublicClient
}

export interface EvmTransferParams {
  nonce: number
  to: `0x${string}`
  value: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gas?: bigint
}

/** The unsigned tx object (no data, no access list → serialized as 0x80 / 0xc0, exactly what §5.9 accepts). */
export function buildUnsignedEvmTx(p: EvmTransferParams): TransactionSerializableEIP1559 {
  if (!/^0x[0-9a-fA-F]{40}$/.test(p.to)) throw new Error(`bad recipient address: ${p.to}`)
  if (p.value < 0n) throw new RangeError('negative value')
  return {
    type: 'eip1559',
    chainId: SEPOLIA_CHAIN_ID,
    nonce: p.nonce,
    to: p.to,
    value: p.value,
    gas: p.gas ?? EVM_TRANSFER_GAS,
    maxFeePerGas: p.maxFeePerGas,
    maxPriorityFeePerGas: p.maxPriorityFeePerGas,
  }
}

/** `0x02 ‖ rlp([chainId, nonce, tip, maxFee, gas, to, value, data, accessList])`: the bytes for `sign_for`. */
export function serializeUnsignedEvmTx(tx: TransactionSerializableEIP1559): Hex {
  if (tx.data && tx.data !== '0x') throw new Error('Satchel signs native transfers only (empty data)')
  if (tx.accessList && tx.accessList.length > 0) throw new Error('Satchel signs empty access lists only')
  return serializeTransaction({ ...tx, data: undefined, accessList: undefined })
}

/** keccak256(unsigned): the record payload and the MPC Ecdsa payload. */
export function evmPayloadHash(unsigned: Hex | Uint8Array): Uint8Array {
  const h = typeof unsigned === 'string' ? (`0x${strip0x(unsigned)}` as Hex) : (`0x${toHex(unsigned)}` as Hex)
  return hexToBytesStrict(keccak256(h))
}

/** Rebuild the tx from a record's `unsigned_tx` (spec §5.14 note: check keccak256(unsigned_tx) == payload). */
export function parseUnsignedEvmTx(unsignedHex: string, expectedPayload?: string): TransactionSerializableEIP1559 {
  const hex = `0x${strip0x(unsignedHex).toLowerCase()}` as Hex
  if (expectedPayload !== undefined && toHex(evmPayloadHash(hex)) !== strip0x(expectedPayload).toLowerCase())
    throw new Error('unsigned_tx does not hash to the recorded payload')
  const tx = parseTransaction(hex)
  if (tx.type !== 'eip1559') throw new Error(`expected a type-2 tx, got ${tx.type}`)
  if (tx.chainId !== SEPOLIA_CHAIN_ID) throw new Error(`expected chainId ${SEPOLIA_CHAIN_ID}`)
  return { ...tx, type: 'eip1559' } as TransactionSerializableEIP1559
}

/** Attach the MPC signature (yParity = recovery_id) → signed raw tx. */
export function attachEvmSignature(tx: TransactionSerializableEIP1559, sig: MpcSignature): Hex {
  const { r, s, yParity } = toEvmSignature(sig)
  return serializeTransaction({ ...tx, data: undefined, accessList: undefined }, { r, s, yParity })
}

export async function recoverEvmSigner(signed: Hex): Promise<`0x${string}`> {
  return recoverTransactionAddress({ serializedTransaction: signed as `0x02${string}` })
}

export interface FinalizedEvmTx {
  signed: Hex
  /** keccak256(signed), known before broadcast: store it, then poll it (kb/31) */
  hash: Hex
  from: `0x${string}`
}

/** Attach + verify-before-broadcast: throws unless the signature recovers to `expectedFrom` (spec §8.6 `signed`). */
export async function finalizeEvmTx(tx: TransactionSerializableEIP1559, sig: MpcSignature, expectedFrom: string): Promise<FinalizedEvmTx> {
  const signed = attachEvmSignature(tx, sig)
  const from = await recoverEvmSigner(signed)
  if (from.toLowerCase() !== expectedFrom.toLowerCase()) throw new Error(`signature recovers to ${from}, expected ${expectedFrom}`)
  return { signed, hash: keccak256(signed), from }
}

export interface PreparedEvmSend {
  tx: TransactionSerializableEIP1559
  unsigned: Hex
  payload: Uint8Array
  balance: bigint
  /** worst case: gas × maxFeePerGas */
  feeMax: bigint
}

/**
 * Gas limit for a native transfer `from` → `to`: `eth_estimateGas` (with 1 wei, so the estimate never fails on
 * "insufficient funds", and so a fresh recipient is priced as created), never below 21,000. If the node can't
 * estimate: 250,000 for an empty recipient (no code, nonce 0, balance 0), 100,000 for a contract, else 21,000. If even
 * those reads fail, use 250,000. The contract accepts any gas limit up to u64, so only the fee cap grows (spec §5.9).
 */
export async function estimateTransferGas(client: PublicClient, p: { from: `0x${string}`; to: `0x${string}` }): Promise<bigint> {
  try {
    const g = await client.estimateGas({ account: p.from, to: p.to, value: 1n })
    return g > EVM_TRANSFER_GAS ? g : EVM_TRANSFER_GAS
  } catch {
    try {
      const [code, nonce, balance] = await Promise.all([
        client.getCode({ address: p.to }),
        client.getTransactionCount({ address: p.to }),
        client.getBalance({ address: p.to }),
      ])
      if (code && code !== '0x') return EVM_CONTRACT_TRANSFER_GAS_FALLBACK
      return nonce === 0 && balance === 0n ? EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK : EVM_TRANSFER_GAS
    } catch {
      return EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK
    }
  }
}

/**
 * Read nonce (pending), fees, balance and the transfer's gas limit, and build the unsigned tx (kb/31 recipe). Pass `nonce` to reuse one on retry
 * (spec §8.7). `value: 'max'` sends balance − gas × maxFee.
 */
export async function prepareEvmSend(
  client: PublicClient,
  p: { from: `0x${string}`; to: `0x${string}`; value: bigint | 'max'; nonce?: number },
): Promise<PreparedEvmSend> {
  const [nonce, fees, balance, gas] = await Promise.all([
    p.nonce !== undefined ? Promise.resolve(p.nonce) : client.getTransactionCount({ address: p.from, blockTag: 'pending' }),
    client.estimateFeesPerGas(),
    client.getBalance({ address: p.from }),
    estimateTransferGas(client, { from: p.from, to: p.to }),
  ])
  const feeMax = gas * fees.maxFeePerGas
  const value = p.value === 'max' ? balance - feeMax : p.value
  if (value <= 0n || value + feeMax > balance) throw new Error('insufficient funds')
  const tx = buildUnsignedEvmTx({ nonce, to: p.to, value, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas })
  const unsigned = serializeUnsignedEvmTx(tx)
  return { tx, unsigned, payload: evmPayloadHash(unsigned), balance, feeMax }
}

const MAYBE_SENT = /already known|known transaction|nonce too low|replacement transaction underpriced/i

/**
 * Broadcast a signed tx. viem's fallback can reach two nodes after a timeout, so "already known"/"nonce too low"
 * means "maybe sent": check by hash before reporting an error (kb/31 §Gotchas 7).
 */
export async function broadcastEvm(client: PublicClient, signed: Hex): Promise<{ hash: Hex; alreadyKnown: boolean }> {
  const hash = keccak256(signed)
  try {
    const h = await client.sendRawTransaction({ serializedTransaction: signed })
    return { hash: h, alreadyKnown: false }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message} ${(e as { details?: string }).details ?? ''}` : String(e)
    if (MAYBE_SENT.test(msg)) {
      const found = await client.getTransaction({ hash }).catch(() => null)
      if (found) return { hash, alreadyKnown: true }
    }
    throw e
  }
}

export async function waitEvmReceipt(client: PublicClient, hash: Hex, opts: { confirmations?: number; timeoutMs?: number } = {}) {
  return client.waitForTransactionReceipt({ hash, confirmations: opts.confirmations ?? 1, timeout: opts.timeoutMs ?? 120_000 })
}

/** "fee < 0.000001 ETH" rule lives in format/; this gives the two numbers (kb/31 §Fee display). */
export function evmFeeBounds(gas: bigint, maxFeePerGas: bigint, baseFee: bigint, tip: bigint): { feeMax: bigint; feeLikely: bigint } {
  return { feeMax: gas * maxFeePerGas, feeLikely: gas * (baseFee + tip) }
}

export interface BlockscoutTx {
  hash: string
  nonce: number
  status: string | null
  result: string | null
  block_number: number | null
  timestamp: string | null
  value: string
  fee: { value: string } | null
  from: { hash: string }
  to: { hash: string } | null
}

export interface BlockscoutPage {
  items: BlockscoutTx[]
  next_page_params: Record<string, string | number> | null
}

/** Blockscout API v2 address history (keyless, CORS `*`). Simple GET only. */
export async function blockscoutHistory(
  address: string,
  opts: { fetch?: typeof fetch; base?: string; pageParams?: Record<string, string | number> | null } = {},
): Promise<BlockscoutPage> {
  const f = opts.fetch ?? fetch
  const q = opts.pageParams ? `?${new URLSearchParams(Object.entries(opts.pageParams).map(([k, v]) => [k, String(v)]))}` : ''
  const r = await f(`${opts.base ?? BLOCKSCOUT_SEPOLIA}/api/v2/addresses/${address}/transactions${q}`)
  if (r.status === 404) return { items: [], next_page_params: null } // never-seen address
  if (!r.ok) throw new Error(`blockscout ${r.status}`)
  const j = (await r.json()) as BlockscoutPage
  return { items: j.items ?? [], next_page_params: j.next_page_params ?? null }
}

export const sepoliaTxUrl = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`
export const sepoliaAddressUrl = (addr: string) => `https://sepolia.etherscan.io/address/${addr}`
