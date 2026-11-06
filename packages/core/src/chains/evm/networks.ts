/**
 * Per-chain EVM network registry (C3, docs/specs/C1-C2-C3-C7.md §8.1): `networks-data.ts` (plain data) plus each
 * chain's viem `Chain` object. Import `networks-data` instead when the viem chain definitions are not needed.
 */
import type { Chain } from 'viem'
import { arbitrumSepolia, baseSepolia, optimismSepolia, sepolia } from 'viem/chains'
import { EVM_NETWORK_DATA, evmNetworkData, type EvmChainId, type EvmNetworkData } from './networks-data'

export * from './networks-data'

export interface EvmNetwork extends EvmNetworkData {
  viemChain: Chain
}

const VIEM_CHAIN: Readonly<Record<EvmChainId, Chain>> = {
  11155111: sepolia,
  84532: baseSepolia,
  421614: arbitrumSepolia,
  11155420: optimismSepolia,
}

export const EVM_NETWORKS: Readonly<Record<EvmChainId, EvmNetwork>> = Object.fromEntries(
  (Object.keys(EVM_NETWORK_DATA) as unknown as EvmChainId[]).map((id) => [id, { ...EVM_NETWORK_DATA[id], viemChain: VIEM_CHAIN[id] }]),
) as Record<EvmChainId, EvmNetwork>

/** The network for `chainId`; throws on an unsupported chain (the contract would refuse it with ERR_EVM_CHAIN_ID). */
export function evmNetwork(chainId: number | bigint): EvmNetwork {
  return EVM_NETWORKS[evmNetworkData(chainId).chainId]
}
