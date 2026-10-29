/**
 * Gas and deposit formulas mirrored from spec §5.5 (single source of truth = the contract's `config()`).
 * apps/web/src/lib/near/constants.ts re-exports these and tests them against the live `config()` (diffConfig).
 * All gas values are bigint gas units; all deposits are bigint yoctoNEAR.
 */

export const TGAS = 1_000_000_000_000n
export const YOCTO_PER_NEAR = 10n ** 24n
export const ONE_YOCTO = 1n
export const MILLINEAR = 10n ** 21n

export const MPC_ACCOUNT_TESTNET = 'v1.signer-prod.testnet'
export const USDC_TESTNET = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af'
/** Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia (C3), as `config().evm_chain_ids`. */
export const EVM_CHAIN_IDS = [11155111, 84532, 421614, 11155420] as const
/** C2: `config().erc20_tokens` (Circle testnet USDC per chain; lowercase hex without 0x, as the contract prints it). */
export const ERC20_TOKENS = [
  { chain_id: 11155111, token: '1c7d4b196cb0c7b01d743fbc6116a902379c7238' },
  { chain_id: 84532, token: '036cbd53842c5426634e7929541ec2318f3dcf7e' },
  { chain_id: 421614, token: '75faf114eafb1bdbe2f0316df893fd58ce46aa4d' },
  { chain_id: 11155420, token: '5fd84259d66cd46123540766be93dfe6d43130d7' },
] as const
/** C7: `config().max_message_bytes`. */
export const MAX_MESSAGE_BYTES = 1024

export const COOLDOWN_BLOCKS = 250
export const MAX_BTC_INPUTS = 10
export const MPC_SIGN_STATIC_TGAS = 15
export const ON_SIGNED_TGAS = { base: 10, per_request: 2 } as const
export const MIN_SIGN_PREPAID_TGAS = { base: 30, per_request: 18 } as const
export const MAX_MPC_DEPOSIT = 10n ** 22n // 0.01 NEAR
export const STORAGE_BYTE_COST = 10n ** 19n
export const SIGN_DEPOSIT_PER_REQUEST = 5n * MILLINEAR // 0.005 NEAR

function checkN(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > MAX_BTC_INPUTS) throw new RangeError(`request count must be 1..${MAX_BTC_INPUTS}, got ${n}`)
}

/** Callers attach `min(300, 60 + 20·n)` Tgas (spec §5.5 SIGN_ATTACH_GAS). n=1 → 80, 2 → 100, 4 → 140, 10 → 260. */
export function signAttachGas(n: number): bigint {
  checkN(n)
  return BigInt(Math.min(300, 60 + 20 * n)) * TGAS
}

/** The contract refuses prepaid gas below `30 + 18·n` Tgas with ERR_GAS. */
export function minSignPrepaidGas(n: number): bigint {
  checkN(n)
  return BigInt(MIN_SIGN_PREPAID_TGAS.base + MIN_SIGN_PREPAID_TGAS.per_request * n) * TGAS
}

/** Static gas reserved for `on_signed`: `10 + 2·n` Tgas. */
export function onSignedGas(n: number): bigint {
  checkN(n)
  return BigInt(ON_SIGNED_TGAS.base + ON_SIGNED_TGAS.per_request * n) * TGAS
}

/**
 * Callers attach `0.005 NEAR × n` (covers ≈ 0.0028 NEAR of record storage + n × 1 yocto; the excess is refunded).
 * A raised `mpc_deposit` d (1 yocto … 0.01 NEAR) adds `n × d` on top.
 */
export function signAttachDeposit(n: number, mpcDeposit?: bigint): bigint {
  checkN(n)
  const base = SIGN_DEPOSIT_PER_REQUEST * BigInt(n)
  if (mpcDeposit === undefined || mpcDeposit === ONE_YOCTO) return base
  if (mpcDeposit < ONE_YOCTO || mpcDeposit > MAX_MPC_DEPOSIT) throw new RangeError('mpc_deposit outside [1 yocto, 0.01 NEAR]')
  return base + mpcDeposit * BigInt(n)
}

/**
 * C7: a message record stores its body (≤ 1024 B), so its storage grows with the length: attach
 * `0.005 NEAR + len × 1e19 yocto` (≤ 0.01524 NEAR). The contract charges the measured bytes and refunds the rest.
 */
export function messageSignAttachDeposit(len: number, mpcDeposit?: bigint): bigint {
  if (!Number.isInteger(len) || len < 1 || len > MAX_MESSAGE_BYTES) throw new RangeError(`message length must be 1..${MAX_MESSAGE_BYTES}, got ${len}`)
  return signAttachDeposit(1, mpcDeposit) + BigInt(len) * STORAGE_BYTE_COST
}

/** Fixed attachments for the other calls (spec §5.5). */
export const ATTACH = {
  mint: { gas: 30n * TGAS, deposit: 20n * MILLINEAR },
  transfer: { gas: 30n * TGAS, deposit: ONE_YOCTO },
  list: { gas: 30n * TGAS, deposit: 10n * MILLINEAR },
  delist: { gas: 30n * TGAS, deposit: ONE_YOCTO },
  withdraw: { gas: 50n * TGAS, deposit: ONE_YOCTO },
  /** deposit = exactly the listing price */
  buyNear: { gas: 50n * TGAS },
  /** usdc.ft_transfer_call: 1 yocto, 150 Tgas */
  buyUsdc: { gas: 150n * TGAS, deposit: ONE_YOCTO },
} as const

/** `listable_at` mirror: the first height at which `list` succeeds. */
export function listableAt(lastSignHeight: number): number {
  return lastSignHeight === 0 ? 0 : lastSignHeight + COOLDOWN_BLOCKS
}

/** The subset of `config()` the formulas above depend on (spec §5.14). */
export interface ContractConfigView {
  version?: string
  mpc_contract_id: string
  usdc_contract_id?: string | null
  cooldown_blocks: number
  evm_chain_ids: number[]
  /** C2 (absent on pre-C2 contracts, which diffConfig then reports) */
  erc20_tokens?: { chain_id: number; token: string }[]
  /** C7 */
  max_message_bytes?: number
  max_btc_inputs: number
  mpc_sign_gas_tgas: number
  on_signed_gas_tgas: { base: number; per_request: number }
  min_sign_prepaid_tgas: { base: number; per_request: number }
  max_mpc_deposit: string
  storage_byte_cost: string
  [k: string]: unknown
}

/** Lists every field where the live `config()` differs from these constants (empty = consistent; INV-27 mirror). */
export function diffConfig(cfg: ContractConfigView, expectMpc = MPC_ACCOUNT_TESTNET): string[] {
  const d: string[] = []
  const eq = (k: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) d.push(`${k}: contract ${JSON.stringify(a)} ≠ client ${JSON.stringify(b)}`)
  }
  eq('mpc_contract_id', cfg.mpc_contract_id, expectMpc)
  eq('cooldown_blocks', cfg.cooldown_blocks, COOLDOWN_BLOCKS)
  eq('evm_chain_ids', cfg.evm_chain_ids, [...EVM_CHAIN_IDS])
  eq('erc20_tokens', cfg.erc20_tokens, ERC20_TOKENS.map((t) => ({ ...t })))
  eq('max_message_bytes', cfg.max_message_bytes, MAX_MESSAGE_BYTES)
  eq('max_btc_inputs', cfg.max_btc_inputs, MAX_BTC_INPUTS)
  eq('mpc_sign_gas_tgas', cfg.mpc_sign_gas_tgas, MPC_SIGN_STATIC_TGAS)
  eq('on_signed_gas_tgas', cfg.on_signed_gas_tgas, ON_SIGNED_TGAS)
  eq('min_sign_prepaid_tgas', cfg.min_sign_prepaid_tgas, MIN_SIGN_PREPAID_TGAS)
  eq('max_mpc_deposit', cfg.max_mpc_deposit, MAX_MPC_DEPOSIT.toString())
  eq('storage_byte_cost', cfg.storage_byte_cost, STORAGE_BYTE_COST.toString())
  return d
}
