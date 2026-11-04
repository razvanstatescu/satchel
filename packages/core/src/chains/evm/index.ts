/**
 * EVM testnets (kb/31; kb/90 §8.2 lib/chains/evm; C2/C3 in docs/specs/C1-C2-C3-C7.md). viem 2.57.7.
 * What `sign_for` accepts: an unsigned type-2 tx on Sepolia, Base Sepolia, Arbitrum Sepolia or OP Sepolia with an empty
 * access list and either empty data (native ETH) or one `transfer(to, amount)` to the chain's Circle USDC (value 0).
 */
import {
  createPublicClient,
  encodeFunctionData,
  fallback,
  http,
  keccak256,
  parseAbi,
  parseTransaction,
  recoverMessageAddress,
  recoverTransactionAddress,
  serializeTransaction,
  type Hex,
  type PublicClient,
  type TransactionSerializableEIP1559,
} from 'viem'
import { sepolia } from 'viem/chains'
import { hexToBytesStrict, strip0x, toHex } from '../../bytes'
import { toEvmSignature, type MpcSignature, type RecordSignatureView } from '../../near/mpc'
import { EVM_TOKEN_ALLOWLIST, parseErc20TransferData } from '../../policy/evm'
import { evmNetwork, isSupportedEvmChain } from './networks'

export * from './networks'

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
 * Fallback gas limit for a USDC `transfer` when the node can't estimate. A first transfer to a fresh holder writes a new
 * balance slot, which the 2026 Sepolia state-gas accounting prices high; unused gas is refunded, so err high.
 */
export const EVM_ERC20_TRANSFER_GAS_FALLBACK = 300_000n
/** Headroom on an `eth_estimateGas` for a token transfer (the recipient's balance slot can change before inclusion). */
export const EVM_ERC20_GAS_HEADROOM_PERCENT = 20n

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
  return createEvmClient(SEPOLIA_CHAIN_ID, urls, opts)
}

/** C3: the same fallback client for any supported chain (default RPCs from `EVM_NETWORKS`). */
export function createEvmClient(chainId: number, urls?: readonly string[], opts: SepoliaClientOptions = {}): PublicClient {
  const net = evmNetwork(chainId)
  const timeout = opts.timeoutMs ?? 4_000
  return createPublicClient({
    chain: chainId === SEPOLIA_CHAIN_ID ? sepolia : net.viemChain,
    transport: fallback(
      (urls ?? net.rpcs).map((u) => http(u, { timeout, retryCount: 0 })),
      { rank: opts.rank === false ? false : { interval: 30_000, sampleCount: 5, timeout: 2_000 }, retryCount: 1 },
    ),
  }) as PublicClient
}

export interface EvmTransferParams {
  /** default Sepolia; one of the four supported chains (C3) */
  chainId?: number
  nonce: number
  to: `0x${string}`
  value: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gas?: bigint
}

const ADDR = /^0x[0-9a-fA-F]{40}$/

function checkChain(chainId: number): number {
  if (!isSupportedEvmChain(chainId)) throw new Error(`unsupported EVM chain ${chainId}`)
  return chainId
}

/** The unsigned native-transfer tx object (no data, no access list → serialized as 0x80 / 0xc0, what §5.9 accepts). */
export function buildUnsignedEvmTx(p: EvmTransferParams): TransactionSerializableEIP1559 {
  if (!ADDR.test(p.to)) throw new Error(`bad recipient address: ${p.to}`)
  if (p.value < 0n) throw new RangeError('negative value')
  return {
    type: 'eip1559',
    chainId: checkChain(p.chainId ?? SEPOLIA_CHAIN_ID),
    nonce: p.nonce,
    to: p.to,
    value: p.value,
    gas: p.gas ?? EVM_TRANSFER_GAS,
    maxFeePerGas: p.maxFeePerGas,
    maxPriorityFeePerGas: p.maxPriorityFeePerGas,
  }
}

/** C2: `transfer(to, amount)` calldata = `a9059cbb ‖ pad32(to) ‖ pad32(amount)`; amount must be < 2^128 (contract rule). */
export function erc20TransferData(to: `0x${string}`, amount: bigint): Hex {
  if (!ADDR.test(to)) throw new Error(`bad recipient address: ${to}`)
  if (amount < 0n || amount >= 1n << 128n) throw new RangeError('amount must be in [0, 2^128)')
  return `0xa9059cbb${strip0x(to).toLowerCase().padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`
}

/** The chain's allowlisted USDC (the only token `sign_for` transfers on it). */
export function usdcOf(chainId: number): `0x${string}` {
  return evmNetwork(chainId).usdc.address
}

export interface Erc20TransferParams {
  chainId: number
  nonce: number
  /** the token's recipient (not the tx's `to`, which is the USDC contract) */
  recipient: `0x${string}`
  /** base units (USDC: 6 decimals) */
  amount: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gas: bigint
}

/** C2: the unsigned USDC transfer: to = the chain's USDC, value 0, data = `transfer(recipient, amount)`. */
export function buildErc20TransferTx(p: Erc20TransferParams): TransactionSerializableEIP1559 {
  return {
    type: 'eip1559',
    chainId: checkChain(p.chainId),
    nonce: p.nonce,
    to: usdcOf(p.chainId),
    value: 0n,
    data: erc20TransferData(p.recipient, p.amount),
    gas: p.gas,
    maxFeePerGas: p.maxFeePerGas,
    maxPriorityFeePerGas: p.maxPriorityFeePerGas,
  }
}

/** Throws unless `tx` is one of the two shapes `sign_for` accepts (native, or a USDC transfer on its own chain). */
function assertSignable(tx: TransactionSerializableEIP1559): void {
  checkChain(tx.chainId ?? 0)
  if (tx.accessList && tx.accessList.length > 0) throw new Error('Satchel signs empty access lists only')
  if (!tx.data || tx.data === '0x') return
  const t = parseErc20TransferData(hexToBytesStrict(tx.data))
  if (!t) throw new Error('Satchel signs native transfers and one USDC transfer(to, amount) only')
  if (EVM_TOKEN_ALLOWLIST[String(tx.chainId)] !== tx.to?.toLowerCase()) throw new Error("a token transfer must go to this chain's USDC")
  if ((tx.value ?? 0n) !== 0n) throw new Error('a token transfer must have value 0')
}

function canonical(tx: TransactionSerializableEIP1559): TransactionSerializableEIP1559 {
  return { ...tx, data: tx.data && tx.data !== '0x' ? tx.data : undefined, accessList: undefined }
}

/** `0x02 ‖ rlp([chainId, nonce, tip, maxFee, gas, to, value, data, accessList])`: the bytes for `sign_for`. */
export function serializeUnsignedEvmTx(tx: TransactionSerializableEIP1559): Hex {
  assertSignable(tx)
  return serializeTransaction(canonical(tx))
}

/** keccak256(unsigned): the record payload and the MPC Ecdsa payload. */
export function evmPayloadHash(unsigned: Hex | Uint8Array): Uint8Array {
  const h = typeof unsigned === 'string' ? (`0x${strip0x(unsigned)}` as Hex) : (`0x${toHex(unsigned)}` as Hex)
  return hexToBytesStrict(keccak256(h))
}

/** Rebuild the tx from a record's `unsigned_tx` (spec §5.14 note: check keccak256(unsigned_tx) == payload). Any supported chain. */
export function parseUnsignedEvmTx(unsignedHex: string, expectedPayload?: string): TransactionSerializableEIP1559 {
  const hex = `0x${strip0x(unsignedHex).toLowerCase()}` as Hex
  if (expectedPayload !== undefined && toHex(evmPayloadHash(hex)) !== strip0x(expectedPayload).toLowerCase())
    throw new Error('unsigned_tx does not hash to the recorded payload')
  const tx = parseTransaction(hex)
  if (tx.type !== 'eip1559') throw new Error(`expected a type-2 tx, got ${tx.type}`)
  if (!isSupportedEvmChain(tx.chainId ?? 0)) throw new Error(`expected a supported chainId, got ${tx.chainId}`)
  return { ...tx, type: 'eip1559' } as TransactionSerializableEIP1559
}

/** Attach the MPC signature (yParity = recovery_id) → signed raw tx. Keeps a USDC transfer's calldata. */
export function attachEvmSignature(tx: TransactionSerializableEIP1559, sig: MpcSignature): Hex {
  const { r, s, yParity } = toEvmSignature(sig)
  return serializeTransaction(canonical(tx), { r, s, yParity })
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
export async function estimateTransferGas(client: PublicClient, p: { from: `0x${string}`; to: `0x${string}`; data?: Hex }): Promise<bigint> {
  if (p.data && p.data !== '0x') return estimateErc20TransferGas(client, { from: p.from, token: p.to, data: p.data })
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
 * C2: gas limit for a USDC `transfer`: `eth_estimateGas` of the exact call + 20 % headroom (never below 21,000), or
 * 300,000 when the node can't estimate (e.g. the sender holds too little USDC to simulate). Unused gas is refunded.
 */
export async function estimateErc20TransferGas(client: PublicClient, p: { from: `0x${string}`; token: `0x${string}`; data: Hex }): Promise<bigint> {
  try {
    const g = await client.estimateGas({ account: p.from, to: p.token, data: p.data, value: 0n })
    const padded = g + (g * EVM_ERC20_GAS_HEADROOM_PERCENT) / 100n
    return padded > EVM_TRANSFER_GAS ? padded : EVM_TRANSFER_GAS
  } catch {
    return EVM_ERC20_TRANSFER_GAS_FALLBACK
  }
}

const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])
const GAS_PRICE_ORACLE = '0x420000000000000000000000000000000000000F' as const
const GPO_ABI = parseAbi(['function getL1Fee(bytes) view returns (uint256)'])
/** Reserved when an OP-stack L1 fee can't be read (testnet L1 fees are far below this). */
export const OP_L1_FEE_FALLBACK = 10n ** 13n

/** C2: `balanceOf(owner)` on `token`, at `blockTag` (the checker policy uses `latest − 3`). */
export async function erc20BalanceOf(client: PublicClient, token: `0x${string}`, owner: `0x${string}`, blockNumber?: bigint): Promise<bigint> {
  const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] })
  const r = await client.call({ to: token, data, ...(blockNumber !== undefined ? { blockNumber } : {}) })
  if (!r.data || r.data === '0x') throw new Error('balanceOf returned no data')
  return BigInt(r.data)
}

/**
 * OP-stack chains (Base Sepolia, OP Sepolia) charge an L1 data fee on top of gas × price. Read it from the
 * GasPriceOracle predeploy for the unsigned tx, ×1.5 for L1 fee drift; 0 on other chains.
 */
export async function estimateL1Fee(client: PublicClient, chainId: number, unsigned: Hex): Promise<bigint> {
  if (!evmNetwork(chainId).opStack) return 0n
  try {
    const r = await client.call({ to: GAS_PRICE_ORACLE, data: encodeFunctionData({ abi: GPO_ABI, functionName: 'getL1Fee', args: [unsigned] }) })
    const fee = r.data && r.data !== '0x' ? BigInt(r.data) : OP_L1_FEE_FALLBACK
    return fee + fee / 2n
  } catch {
    return OP_L1_FEE_FALLBACK
  }
}

const chainOf = (client: PublicClient, chainId?: number): number => chainId ?? client.chain?.id ?? SEPOLIA_CHAIN_ID

/**
 * Read nonce (pending), fees, balance and the transfer's gas limit, and build the unsigned tx (kb/31 recipe). Pass `nonce` to reuse one on retry
 * (spec §8.7). `value: 'max'` sends balance − gas × maxFee (− the L1 fee on OP-stack chains). `chainId` defaults to the client's chain.
 */
export async function prepareEvmSend(
  client: PublicClient,
  p: { chainId?: number; from: `0x${string}`; to: `0x${string}`; value: bigint | 'max'; nonce?: number },
): Promise<PreparedEvmSend> {
  const chainId = chainOf(client, p.chainId)
  const [nonce, fees, balance, gas] = await Promise.all([
    p.nonce !== undefined ? Promise.resolve(p.nonce) : client.getTransactionCount({ address: p.from, blockTag: 'pending' }),
    client.estimateFeesPerGas(),
    client.getBalance({ address: p.from }),
    estimateTransferGas(client, { from: p.from, to: p.to }),
  ])
  const build = (value: bigint) =>
    buildUnsignedEvmTx({ chainId, nonce, to: p.to, value, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas })
  const l1 = await estimateL1Fee(client, chainId, serializeUnsignedEvmTx(build(p.value === 'max' ? balance : p.value)))
  const feeMax = gas * fees.maxFeePerGas + l1
  const value = p.value === 'max' ? balance - feeMax : p.value
  if (value <= 0n || value + feeMax > balance) throw new Error('insufficient funds')
  const tx = build(value)
  const unsigned = serializeUnsignedEvmTx(tx)
  return { tx, unsigned, payload: evmPayloadHash(unsigned), balance, feeMax }
}

export interface PreparedErc20Send extends PreparedEvmSend {
  /** the sender's USDC balance (base units); `balance` is the ETH that pays the fee */
  tokenBalance: bigint
  amount: bigint
}

/** C2: build a USDC send on `chainId` (`amount: 'max'` sends the whole USDC balance). ETH must cover the fee. */
export async function prepareErc20Send(
  client: PublicClient,
  p: { chainId?: number; from: `0x${string}`; to: `0x${string}`; amount: bigint | 'max'; nonce?: number },
): Promise<PreparedErc20Send> {
  const chainId = chainOf(client, p.chainId)
  const token = usdcOf(chainId)
  const [nonce, fees, balance, tokenBalance] = await Promise.all([
    p.nonce !== undefined ? Promise.resolve(p.nonce) : client.getTransactionCount({ address: p.from, blockTag: 'pending' }),
    client.estimateFeesPerGas(),
    client.getBalance({ address: p.from }),
    erc20BalanceOf(client, token, p.from),
  ])
  const amount = p.amount === 'max' ? tokenBalance : p.amount
  if (amount <= 0n || amount > tokenBalance) throw new Error('insufficient USDC')
  const gas = await estimateTransferGas(client, { from: p.from, to: token, data: erc20TransferData(p.to, amount) })
  const tx = buildErc20TransferTx({ chainId, nonce, recipient: p.to, amount, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas })
  const unsigned = serializeUnsignedEvmTx(tx)
  const feeMax = gas * fees.maxFeePerGas + (await estimateL1Fee(client, chainId, unsigned))
  if (feeMax > balance) throw new Error('insufficient ETH for the fee')
  return { tx, unsigned, payload: evmPayloadHash(unsigned), balance, feeMax, tokenBalance, amount }
}

/**
 * C7: verify an `evm_message` record's signature (the `sig_records` signature view `{r, s, recovery_id}`) as any
 * EIP-191 verifier would: recover the signer of `personal_sign(message)` with v = 27 + recovery_id.
 */
export async function verifyEvmMessageSignature(
  message: string | Uint8Array,
  sig: Extract<RecordSignatureView, { r: string }>,
  expectedAddress: string,
): Promise<boolean> {
  const signature = `0x${strip0x(sig.r)}${strip0x(sig.s)}${(27 + sig.recovery_id).toString(16)}` as Hex
  const msg = typeof message === 'string' ? message : { raw: message }
  const addr = await recoverMessageAddress({ message: msg, signature })
  return addr.toLowerCase() === expectedAddress.toLowerCase()
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
