/**
 * The data half of the registry: plain values only (no viem import), so the web shell can read names, ids, explorers
 * and USDC addresses without loading viem. `networks.ts` adds each chain's viem `Chain`.
 *
 * Per-chain EVM network registry (C3, docs/specs/C1-C2-C3-C7.md §8.1). The chain ids and USDC addresses must equal the
 * contract's frozen allowlists (`config().evm_chain_ids`, `config().erc20_tokens`).
 *
 * Every RPC below is keyless and CORS-enabled: probed 2026-10-29 with `Origin: https://satchel.example`, each answered
 * `eth_chainId` with the right id, sent `access-control-allow-origin` and answered the OPTIONS preflight with 2xx.
 * The checker uses the first two (two independent operators per chain); the rest are fallbacks for sends.
 * Never `sepolia.drpc.org` (its free plan dropped Sepolia on 2026-10-27).
 */
export type EvmChainId = 11155111 | 84532 | 421614 | 11155420

export interface EvmNetworkData {
  chainId: EvmChainId
  key: 'sepolia' | 'base-sepolia' | 'arbitrum-sepolia' | 'op-sepolia'
  name: string
  short: string
  nativeSymbol: 'ETH'
  /** ≥ 2 keyless, CORS-enabled RPCs, independent operators first */
  rpcs: readonly string[]
  explorer: string
  /** Blockscout API v2 base (keyless, CORS `*`), for history */
  blockscout: string
  usdc: { address: `0x${string}`; symbol: 'USDC'; decimals: 6 }
  /** OP-stack chains charge an L1 data fee on top of gas × price (read from the GasPriceOracle predeploy) */
  opStack: boolean
}

export const EVM_NETWORK_DATA: Readonly<Record<EvmChainId, EvmNetworkData>> = {
  11155111: {
    chainId: 11155111,
    key: 'sepolia',
    name: 'Ethereum Sepolia',
    short: 'Sepolia',
    nativeSymbol: 'ETH',
    rpcs: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.ethpandaops.io', 'https://0xrpc.io/sep', 'https://sepolia.gateway.tenderly.co'],
    explorer: 'https://sepolia.etherscan.io',
    blockscout: 'https://eth-sepolia.blockscout.com',
    usdc: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
    opStack: false,
  },
  84532: {
    chainId: 84532,
    key: 'base-sepolia',
    name: 'Base Sepolia',
    short: 'Base Sepolia',
    nativeSymbol: 'ETH',
    rpcs: ['https://base-sepolia-rpc.publicnode.com', 'https://sepolia.base.org', 'https://base-sepolia.gateway.tenderly.co'],
    explorer: 'https://sepolia.basescan.org',
    blockscout: 'https://base-sepolia.blockscout.com',
    usdc: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', decimals: 6 },
    opStack: true,
  },
  421614: {
    chainId: 421614,
    key: 'arbitrum-sepolia',
    name: 'Arbitrum Sepolia',
    short: 'Arbitrum Sepolia',
    nativeSymbol: 'ETH',
    rpcs: ['https://arbitrum-sepolia-rpc.publicnode.com', 'https://sepolia-rollup.arbitrum.io/rpc', 'https://arbitrum-sepolia.gateway.tenderly.co'],
    explorer: 'https://sepolia.arbiscan.io',
    blockscout: 'https://arbitrum-sepolia.blockscout.com',
    usdc: { address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', symbol: 'USDC', decimals: 6 },
    opStack: false,
  },
  11155420: {
    chainId: 11155420,
    key: 'op-sepolia',
    name: 'OP Sepolia',
    short: 'OP Sepolia',
    nativeSymbol: 'ETH',
    rpcs: ['https://optimism-sepolia-rpc.publicnode.com', 'https://sepolia.optimism.io', 'https://optimism-sepolia.gateway.tenderly.co'],
    explorer: 'https://sepolia-optimism.etherscan.io',
    blockscout: 'https://optimism-sepolia.blockscout.com',
    usdc: { address: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', symbol: 'USDC', decimals: 6 },
    opStack: true,
  },
}

export const EVM_CHAIN_ID_LIST = [11155111, 84532, 421614, 11155420] as const satisfies readonly EvmChainId[]

export function isSupportedEvmChain(chainId: number | bigint): chainId is EvmChainId {
  return (EVM_CHAIN_ID_LIST as readonly number[]).includes(Number(chainId))
}

/** The network for `chainId`; throws on an unsupported chain (the contract would refuse it with ERR_EVM_CHAIN_ID). */
export function evmNetworkData(chainId: number | bigint): EvmNetworkData {
  if (!isSupportedEvmChain(chainId)) throw new Error(`unsupported EVM chain ${chainId}`)
  return EVM_NETWORK_DATA[Number(chainId) as EvmChainId]
}

export const evmTxUrl = (chainId: number | bigint, hash: string) => `${evmNetworkData(chainId).explorer}/tx/${hash}`
export const evmAddressUrl = (chainId: number | bigint, addr: string) => `${evmNetworkData(chainId).explorer}/address/${addr}`
