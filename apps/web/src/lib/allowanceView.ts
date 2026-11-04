import { MAX_CAPS, assetKey, type Asset, type AllowanceView } from "@satchel/core/policy";
import { DECIMALS, formatAmount, type Ticker } from "@/lib/format";
import { EVM_IDS, OTHER_EVM_IDS, USDC_DECIMALS, evmPickerName, usdcAddress, type EvmChainId } from "@/lib/evm-networks";
import { isDead, isMessage } from "@/components/Clean";
import type { CleanItem } from "@/lib/data/types";
import type { UiChain } from "@/lib/view";

/**
 * C5 (docs/specs/C5.md) view helpers: map the contract's `Asset` (and the UI's three native chains) onto each other,
 * and format a cap amount the same way the rest of the app formats balances. The Add sheet's full asset list — the
 * three native chains plus ETH on Base/Arbitrum/OP and USDC on all four EVM testnets (C2 + C3) — is built here too
 * (`extraCapOptions`), so its shape is covered by unit tests without rendering the form.
 */

export const ALLOWANCE_EVM_CHAIN_ID = 11155111;

/** One row the Add sheet's caps form can offer beyond the three native chains: a specific EVM-chain ETH or USDC cap. */
export interface CapOption {
  /** Stable React/test key; also the checkbox's `data-testid` suffix. */
  key: string;
  asset: Asset;
  ticker: Ticker;
  decimals: number;
  /** "Base", "Arbitrum", "OP" — the network picker's own short name (evm-networks.ts). */
  network: string;
}

/** ETH caps on the EVM testnets besides Sepolia (which already has its own native-chain row). */
export function ethOtherCapOptions(): CapOption[] {
  return OTHER_EVM_IDS.map((chainId) => ethCapOption(chainId));
}

export function ethCapOption(chainId: EvmChainId): CapOption {
  return { key: `eth:${chainId}`, asset: { evm: { chain_id: chainId } }, ticker: "ETH", decimals: DECIMALS.ETH, network: evmPickerName(chainId) };
}

/** USDC caps on all four EVM testnets, Sepolia included (it has no native-chain USDC row). */
export function usdcCapOptions(): CapOption[] {
  return EVM_IDS.map((chainId) => usdcCapOption(chainId));
}

export function usdcCapOption(chainId: EvmChainId): CapOption {
  return { key: `usdc:${chainId}`, asset: evmAsset(chainId, usdcAddress(chainId)), ticker: "USDC", decimals: USDC_DECIMALS, network: evmPickerName(chainId) };
}

/** Every option the Add sheet can offer beyond the three native-chain rows (C2 + C3), in a stable display order. */
export function extraCapOptions(): CapOption[] {
  return [...ethOtherCapOptions(), ...usdcCapOptions()];
}

export { MAX_CAPS };

export function assetChain(asset: Asset): UiChain | null {
  if (asset === "btc") return "btc";
  if (asset === "sol") return "sol";
  if (typeof asset === "object" && "evm" in asset && asset.evm.chain_id === ALLOWANCE_EVM_CHAIN_ID) return "evm";
  return null;
}

export function assetTicker(asset: Asset): Ticker | null {
  // C2 + C3: ETH on any of the four EVM testnets, USDC for an ERC-20 cap
  if (typeof asset === "object" && "evm" in asset) return "ETH";
  if (typeof asset === "object" && "erc20" in asset) return "USDC";
  const c = assetChain(asset);
  return c === "btc" ? "BTC" : c === "sol" ? "SOL" : null;
}

/** C2 + C3: the asset an EVM send debits: ETH on `chainId`, or that chain's USDC (token as the contract writes it). */
export function evmAsset(chainId: number, usdcToken?: string): Asset {
  return usdcToken ? { erc20: { chain_id: chainId, token: usdcToken.replace(/^0x/, "").toLowerCase() } } : { evm: { chain_id: chainId } };
}

/** This view's cap row for an asset, if it has one. */
export function capForAsset(view: Pick<AllowanceView, "caps">, asset: Asset): AllowanceView["caps"][number] | undefined {
  const key = assetKey(asset);
  return view.caps.find((c) => assetKey(c.asset) === key);
}

/** "0.0005 BTC", or the raw base-unit string for an asset the UI has no ticker for yet. */
export function formatCapAmount(asset: Asset, amountBase: string): string {
  const ticker = assetTicker(asset);
  return ticker ? formatAmount(amountBase, ticker) : amountBase;
}

/** The asset a UI chain's Send flow debits (docs/specs/C5.md §3): always the native coin, today's one EVM chain id. */
export const CHAIN_ASSET: Record<UiChain, Asset> = { btc: "btc", evm: { evm: { chain_id: ALLOWANCE_EVM_CHAIN_ID } }, sol: "sol" };

/** This view's cap row for a UI chain, if it has one. */
export function capForChain(view: Pick<AllowanceView, "caps">, chain: UiChain): AllowanceView["caps"][number] | undefined {
  const key = assetKey(CHAIN_ASSET[chain]);
  return view.caps.find((c) => assetKey(c.asset) === key);
}

/**
 * R3-A-1: a delegate's cap limits what it may SIGN per rolling day, not what it can send. A signature it holds and
 * hasn't broadcast stays valid, even after Revoke or expiry. These are that delegate's records (by `requester`) that the
 * clean-history check has not shown to be dead (spent, expired, unfunded, foreign) or a message: `unused`, `settling`
 * and `unknown` all still count.
 */
export function outstandingSigs(items: readonly CleanItem[], delegate: string): CleanItem[] {
  return items.filter((i) => i.requester === delegate && !isDead(i.status) && !isMessage(i.status));
}

/** R3-A-2: accounts whose access has not expired; any of them can still send zero-cost requests that restart the quiet period. */
export function activeDelegates(allowances: readonly Pick<AllowanceView, "delegate" | "status">[]): string[] {
  return allowances.filter((a) => a.status !== "expired").map((a) => a.delegate);
}
