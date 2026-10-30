import { CHAIN_NAME, NETWORK_LABEL } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import { evmBalances, evmNetworkName, SEPOLIA } from "@/lib/evm-networks";
import { DECIMALS, formatAmount, type Ticker } from "@/lib/format";
import { SOL_UI_ENABLED, USDC_CONTRACT } from "@/lib/config";
import { WNEAR_TESTNET } from "@/lib/near/contract";

/** "btc" | "evm" | "sol" (the three addresses; view.ts re-exports it as UiChain). */
type UiChain = "btc" | "evm" | "sol";

/** The home-chain balances, read the way view.ts `balanceBase` reads them (no import of view.ts: it imports this). */
function balanceBase(s: Pick<SatchelSnapshot, "balances">, chain: UiChain): bigint | null {
  if (chain === "btc") return s.balances.btc ? BigInt(s.balances.btc.confirmed_sats) : null;
  if (chain === "evm") return s.balances.evm ? BigInt(s.balances.evm.wei) : null;
  return s.balances.sol ? BigInt(s.balances.sol.lamports) : null;
}

/**
 * Everything a Satchel holds, as one list (the Wallet tab's Holdings, the card's ledger, the buyer's "You get"): one
 * entry per coin per place. A place is either one of the Satchel's own chain addresses (Bitcoin testnet4, the four EVM
 * testnets at the one EVM address, Solana devnet) or the Satchel contract itself on NEAR testnet (C6, "inside").
 * Pure: no React, no fetches; the amounts come from the snapshot the server rendered and the browser polls.
 */

export type Coin = "BTC" | "ETH" | "SOL" | "USDC" | "NEAR" | "wNEAR";

/** Where a coin sits: a chain address, or inside the Satchel contract on NEAR. */
export type Network = "bitcoin" | "sepolia" | "base" | "arbitrum" | "optimism" | "solana" | "near";

export interface Holding {
  /** Stable id, used in URLs (`/s/[id]/coin/[key]`) and test ids: `btc`, `sol`, `evm-84532-eth`, `inside-usdc`… */
  key: string;
  coin: Coin;
  ticker: Ticker;
  /** "Bitcoin", "Ethereum", "USD Coin"… (the coin, never the network) */
  coinName: string;
  network: Network;
  /** "Bitcoin testnet4", "Base Sepolia", "Inside on NEAR testnet"… (where it is) */
  networkName: string;
  /** `chain`: at one of the Satchel's addresses; `inside`: held by the Satchel contract for this token (C6). */
  place: "chain" | "inside";
  /** The address it sits at (chain holdings only). */
  chain: UiChain | null;
  /** EVM holdings: the chain id. */
  chainId: number | null;
  /** Inside FT holdings: the NEP-141 contract. */
  ft: string | null;
  /** base units; null = unavailable (the read failed) */
  amount: bigint | null;
  decimals: number;
  /** BTC, ETH on Sepolia and SOL: always listed, even at zero (a Satchel's three home coins). */
  core: boolean;
  /** Shown on the coin icon when the coin isn't on its home chain (ETH on Base, any USDC, anything inside). */
  badge: Network | null;
}

const NETWORK_OF_EVM: Record<number, Network> = { 11155111: "sepolia", 84532: "base", 421614: "arbitrum", 11155420: "optimism" };
const COIN_NAME: Record<Coin, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", USDC: "USD Coin", NEAR: "NEAR", wNEAR: "Wrapped NEAR" };
export const INSIDE_NETWORK_NAME = `Inside on ${NETWORK_LABEL.near}`;

const big = (v: string | null | undefined): bigint | null => (v === null || v === undefined ? null : BigInt(v));

function chainHolding(key: string, coin: Coin, network: Network, networkName: string, chain: UiChain, chainId: number | null, amount: bigint | null, core: boolean, badge: Network | null): Holding {
  return { key, coin, ticker: coin, coinName: COIN_NAME[coin], network, networkName, place: "chain", chain, chainId, ft: null, amount, decimals: DECIMALS[coin], core, badge };
}

function insideHolding(coin: "NEAR" | "USDC" | "wNEAR", ft: string | null, amount: bigint | null): Holding {
  const key = coin === "NEAR" ? "inside-near" : coin === "USDC" ? "inside-usdc" : "inside-wnear";
  return { key, coin, ticker: coin, coinName: COIN_NAME[coin], network: "near", networkName: INSIDE_NETWORK_NAME, place: "inside", chain: null, chainId: null, ft, amount, decimals: DECIMALS[coin], core: false, badge: "near" };
}

/** Every holding, in the canonical order: Bitcoin, Ethereum (Sepolia, then the other networks; ETH before USDC),
 * Solana, then inside (NEAR, USDC, wNEAR). */
export function holdings(s: Pick<SatchelSnapshot, "balances"> & Partial<Pick<SatchelSnapshot, "inside">>): Holding[] {
  const out: Holding[] = [chainHolding("btc", "BTC", "bitcoin", NETWORK_LABEL.btc, "btc", null, balanceBase(s, "btc"), true, null)];
  for (const r of evmBalances(s)) {
    const network = NETWORK_OF_EVM[r.chain_id] ?? "sepolia";
    const name = evmNetworkName(r.chain_id);
    const home = r.chain_id === SEPOLIA;
    const wei = home ? balanceBase(s, "evm") : big(r.wei);
    out.push(chainHolding(home ? "evm" : `evm-${r.chain_id}-eth`, "ETH", network, name, "evm", r.chain_id, wei, home, home ? null : network));
    out.push(chainHolding(`evm-${r.chain_id}-usdc`, "USDC", network, name, "evm", r.chain_id, big(r.usdc), false, network));
  }
  if (SOL_UI_ENABLED) out.push(chainHolding("sol", "SOL", "solana", NETWORK_LABEL.sol, "sol", null, balanceBase(s, "sol"), true, null));
  const inside = s.inside;
  if (inside) {
    out.push(insideHolding("NEAR", null, big(inside.near)));
    const ft = (contract: string) => inside.fts.find((f) => f.token === contract)?.amount ?? "0";
    out.push(insideHolding("USDC", USDC_CONTRACT, big(ft(USDC_CONTRACT))));
    out.push(insideHolding("wNEAR", WNEAR_TESTNET, big(ft(WNEAR_TESTNET))));
  }
  return out;
}

export const hasCoins = (h: Holding) => h.amount !== null && h.amount > 0n;

/**
 * The list as the Wallet tab shows it: what it holds first (canonical order), then the home coins still at zero (or
 * unavailable), and the rest of the empty places folded away (`empty`), so a new Satchel shows three rows, not 13.
 */
export function splitHoldings(list: Holding[]): { shown: Holding[]; empty: Holding[] } {
  const held = list.filter(hasCoins);
  const core = list.filter((h) => !hasCoins(h) && (h.core || h.amount === null));
  const empty = list.filter((h) => !hasCoins(h) && !h.core && h.amount !== null);
  return { shown: [...held, ...core], empty };
}

/** "0.0412 BTC", "0 USDC", or null when unavailable. */
export function holdingText(h: Holding, withTicker = true): string | null {
  if (h.amount === null) return null;
  return formatAmount(h.amount, h.ticker, { withTicker });
}

/** The URL key → the holding (the coin sheet's route), or null for an unknown key. */
export function findHolding(list: Holding[], key: string): Holding | null {
  return list.find((h) => h.key === key) ?? null;
}

/** The short network word for badges and dense lines ("Base", "Sepolia", "NEAR"…). */
export const NETWORK_SHORT: Record<Network, string> = {
  bitcoin: CHAIN_NAME.btc,
  sepolia: "Sepolia",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "OP",
  solana: CHAIN_NAME.sol,
  near: "NEAR",
};
