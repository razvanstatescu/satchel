import { assetKey, type Asset, type AllowanceView } from "@satchel/core/policy";
import { formatAmount, type Ticker } from "@/lib/format";
import type { UiChain } from "@/lib/view";

/**
 * C5 (docs/specs/C5.md) view helpers: map the contract's `Asset` (and the UI's three chains) onto each other, and
 * format a cap amount the same way the rest of the app formats balances. ERC-20 caps (future C2 UI) and EVM chain
 * ids the Send flow doesn't support yet (future C3 UI) have no UI chain: they still render in the facts list with
 * their raw amount, just without a ticker.
 */

export const ALLOWANCE_EVM_CHAIN_ID = 11155111;

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
