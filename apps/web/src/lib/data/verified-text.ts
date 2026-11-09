import { holdingText, type Holding } from "@/lib/holdings";

/** "0 ETH on Ethereum Sepolia, 0.0001 BTC on Bitcoin testnet4": the coins that fell, for the notice before Buy. */
export function describeLowered(list: Holding[]): string {
  return list.map((h) => `${holdingText(h) ?? `${h.ticker} unavailable`} on ${h.networkName}`).join(", ");
}
