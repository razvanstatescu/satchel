import { EVM_CHAIN_ID_LIST, EVM_NETWORKS, isSupportedEvmChain, type EvmChainId } from "@satchel/core/chains/evm";
import { SEPOLIA_RPCS } from "@/lib/config";
import type { EvmChainBalance, SatchelSnapshot } from "@/lib/data/types";

/**
 * C3 (four EVM testnets) and C2 (USDC) view helpers, from the core registry (`@satchel/core/chains/evm` networks.ts):
 * the same address on every chain, only the chain id differs. Sepolia keeps the env override (`NEXT_PUBLIC_SEPOLIA_RPCS`);
 * the other three use the registry's keyless, CORS-enabled RPCs.
 */

export type { EvmChainId };
export const SEPOLIA = 11155111 as const;
export const EVM_IDS: readonly EvmChainId[] = EVM_CHAIN_ID_LIST;
/** Base Sepolia, Arbitrum Sepolia, OP Sepolia: shown behind "Other networks". */
export const OTHER_EVM_IDS: readonly EvmChainId[] = EVM_CHAIN_ID_LIST.filter((c) => c !== SEPOLIA);

export const USDC_DECIMALS = 6;

export function isEvmChainId(v: unknown): v is EvmChainId {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isSafeInteger(n) && isSupportedEvmChain(n);
}

/** `?network=84532` → 84532, anything else → Sepolia. */
export function pickEvmChainId(raw: unknown): EvmChainId {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return isEvmChainId(v) ? (Number(v) as EvmChainId) : SEPOLIA;
}

export const evmNet = (chainId: number) => EVM_NETWORKS[(isEvmChainId(chainId) ? chainId : SEPOLIA) as EvmChainId];
/** "Ethereum Sepolia", "Base Sepolia", … */
export const evmNetworkName = (chainId: number) => evmNet(chainId).name;
/** One word per network, for compact pickers ("Sepolia · Base · Arbitrum · OP"). */
const PICKER_NAMES: Record<EvmChainId, string> = { 11155111: "Sepolia", 84532: "Base", 421614: "Arbitrum", 11155420: "OP" };
export const evmPickerName = (chainId: number) => PICKER_NAMES[evmNet(chainId).chainId];
const EXPLORER_NAMES: Record<EvmChainId, string> = { 11155111: "Etherscan", 84532: "Basescan", 421614: "Arbiscan", 11155420: "Etherscan" };
export const evmExplorerName = (chainId: number) => EXPLORER_NAMES[evmNet(chainId).chainId];
export const evmAddressLink = (chainId: number, addr: string) => `${evmNet(chainId).explorer}/address/${addr}`;
export const evmTxLink = (chainId: number, hash: string) => `${evmNet(chainId).explorer}/tx/${hash}`;
export const usdcAddress = (chainId: number) => evmNet(chainId).usdc.address;

/** RPCs for a chain (Sepolia honours the env list). */
export function evmRpcs(chainId: number): readonly string[] {
  return chainId === SEPOLIA ? SEPOLIA_RPCS : evmNet(chainId).rpcs;
}

/**
 * The per-chain balances of a snapshot, always four rows in registry order. Sepolia's ETH falls back to the legacy
 * `balances.evm` (older snapshots); a chain missing from `evm_chains` reads as unavailable.
 */
export function evmBalances(s: Pick<SatchelSnapshot, "balances">): EvmChainBalance[] {
  const list = s.balances.evm_chains ?? [];
  return EVM_IDS.map((id) => {
    const row = list.find((r) => r.chain_id === id);
    if (row) return row;
    if (id === SEPOLIA) return { chain_id: id, wei: s.balances.evm?.wei ?? null, usdc: s.balances.evm_chains ? null : "0" };
    return { chain_id: id, wei: s.balances.evm_chains ? null : "0", usdc: s.balances.evm_chains ? null : "0" };
  });
}

export function evmBalanceOf(s: Pick<SatchelSnapshot, "balances">, chainId: number, asset: "eth" | "usdc"): bigint | null {
  const row = evmBalances(s).find((r) => r.chain_id === chainId);
  const v = asset === "eth" ? row?.wei : row?.usdc;
  return v == null ? null : BigInt(v);
}

/** True when any EVM network holds ETH or USDC. */
export function anyEvmFunds(s: Pick<SatchelSnapshot, "balances">): boolean {
  return evmBalances(s).some((r) => (r.wei != null && BigInt(r.wei) > 0n) || (r.usdc != null && BigInt(r.usdc) > 0n));
}
