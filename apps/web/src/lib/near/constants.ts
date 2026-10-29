/**
 * Gas and deposit formulas mirrored from kb/90 §5.5 (single source of truth: the contract's `config()`;
 * `constants.test.ts` compares these with the fixture/live config view).
 * Every value handed to a wallet is a decimal string.
 */

export const TGAS = 10n ** 12n;
export const YOCTO_PER_NEAR = 10n ** 24n;
export const ONE_YOCTO = 1n;

export const COOLDOWN_BLOCKS = 250; // the quiet period before `list` (read from config() at runtime)
export const MAX_BTC_INPUTS = 10;
export const EVM_CHAIN_ID = 11155111;
export const MPC_SIGN_STATIC_TGAS = 15;
export const MAX_MPC_DEPOSIT = 10n ** 22n; // 0.01 NEAR

/** min(300, 60 + 20·n) Tgas, what callers attach to sign_for. */
export function signAttachTgas(n: number): number {
  assertInputs(n);
  return Math.min(300, 60 + 20 * n);
}
/** The contract's floor: 30 + 18·n Tgas (ERR_GAS below it). */
export function minSignPrepaidTgas(n: number): number {
  assertInputs(n);
  return 30 + 18 * n;
}
/** 0.005 NEAR × n. Covers ≈ 0.0028 NEAR of record storage + n × 1 yocto; the contract refunds the excess. */
export function signAttachDeposit(n: number): bigint {
  assertInputs(n);
  return 5n * 10n ** 21n * BigInt(n);
}

function assertInputs(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_BTC_INPUTS) throw new RangeError(`request count ${n} outside 1..${MAX_BTC_INPUTS}`);
}

export const tgas = (t: number) => (BigInt(t) * TGAS).toString();

export const ATTACH = {
  mint: { gas: tgas(30), deposit: (2n * 10n ** 22n).toString() }, // 0.02 NEAR
  transfer: { gas: tgas(30), deposit: ONE_YOCTO.toString() }, // exactly 1 yocto
  list: { gas: tgas(30), deposit: (10n ** 22n).toString() }, // 0.01 NEAR, excess refunded
  delist: { gas: tgas(30), deposit: ONE_YOCTO.toString() },
  withdraw: { gas: tgas(50), deposit: ONE_YOCTO.toString() },
  buyNearGas: tgas(50), // deposit = exactly price
  buyUsdc: { gas: tgas(150), deposit: ONE_YOCTO.toString() }, // usdc.ft_transfer_call
  usdcRegister: { gas: tgas(30), deposit: (125n * 10n ** 19n).toString() }, // 0.00125 NEAR
} as const;

/** Testnet block time used for "{n} blocks (~{t})"; replaced by the measured 100-block average when known. */
export const DEFAULT_BLOCK_MS = 560;
