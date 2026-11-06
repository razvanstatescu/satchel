import { CHAIN_NAME, NETWORK_LABEL, TICKER } from "@/lib/copy";
import { formatAmount, type Ticker } from "@/lib/format";
import type { SatchelSnapshot } from "@/lib/data/types";
import { EXPLORERS, SOL_UI_ENABLED, USDC_CONTRACT } from "@/lib/config";
import { WNEAR_TESTNET } from "@satchel/core/near/constants";
import { anyEvmFunds } from "@/lib/evm-networks";

/** View helpers shared by server and client components. */

export type UiChain = "btc" | "evm" | "sol";
export const UI_CHAINS: UiChain[] = SOL_UI_ENABLED ? ["btc", "evm", "sol"] : ["btc", "evm"];

export function balanceBase(s: Pick<SatchelSnapshot, "balances">, chain: UiChain): bigint | null {
  if (chain === "btc") return s.balances.btc ? BigInt(s.balances.btc.confirmed_sats) : null;
  if (chain === "evm") return s.balances.evm ? BigInt(s.balances.evm.wei) : null;
  return s.balances.sol ? BigInt(s.balances.sol.lamports) : null;
}

export function balanceText(s: Pick<SatchelSnapshot, "balances">, chain: UiChain, withTicker = true): string | null {
  const b = balanceBase(s, chain);
  if (b === null) return null;
  return formatAmount(b, TICKER[chain], { withTicker });
}

/** C6: the allowlisted FTs a Satchel can hold inside it (docs/specs/C4-C6.md §2.3, `market_config().inside_fts`),
 * fixed at two on this contract. The UI shows a row for each regardless of balance, so "Add" is always reachable. */
export const INSIDE_FTS: { contract: string; ticker: Ticker; decimals: number }[] = [
  { contract: USDC_CONTRACT, ticker: "USDC", decimals: 6 },
  { contract: WNEAR_TESTNET, ticker: "wNEAR", decimals: 24 },
];

export function ftTicker(contract: string): Ticker {
  return INSIDE_FTS.find((f) => f.contract === contract)?.ticker ?? ("USDC" as Ticker);
}

/** "0.0123 BTC and 0.0500 ETH" — for transfer/buy sentences. */
export function holdingsSentence(s: Pick<SatchelSnapshot, "balances">): string {
  const parts = UI_CHAINS.map((c) => balanceText(s, c)).filter(Boolean) as string[];
  if (parts.length === 0) return "everything in it";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function holdingsList(s: Pick<SatchelSnapshot, "balances">): string {
  return UI_CHAINS.map((c) => balanceText(s, c)).filter(Boolean).join(" · ");
}

export function explorerFor(chain: UiChain, address: string) {
  return chain === "btc" ? EXPLORERS.btcAddress(address) : chain === "evm" ? EXPLORERS.evmAddress(address) : EXPLORERS.solAddress(address);
}

export function chainTxUrl(chain: UiChain, id: string) {
  return chain === "btc" ? EXPLORERS.btcTx(id) : chain === "evm" ? EXPLORERS.evmTx(id) : EXPLORERS.solTx(id);
}

export const chainName = (c: UiChain) => CHAIN_NAME[c];
export const networkLabel = (c: UiChain) => NETWORK_LABEL[c];

export function priceText(price: string, currency: "near" | "usdc") {
  return currency === "usdc" ? formatAmount(price, "USDC") : formatAmount(price, "NEAR");
}

/**
 * Nothing inside at all: every chain reads zero, and (C2, C3) no EVM testnet holds ETH or USDC. A Satchel with only
 * Base Sepolia ETH or only USDC is not empty, so Send stays on.
 */
export function allZero(s: Pick<SatchelSnapshot, "balances">): boolean {
  return UI_CHAINS.every((c) => balanceBase(s, c) === 0n) && !anyEvmFunds(s);
}
