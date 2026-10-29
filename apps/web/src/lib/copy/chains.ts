import { SOL_UI_ENABLED } from "@/lib/config";

/**
 * The chains a string names (D-45, D-46): Bitcoin, Ethereum and Solana while the SOL UI is on (the default since
 * D-46), Bitcoin and Ethereum when a build turns it off (`NEXT_PUBLIC_SOL_UI=off`, the cut switch). Never "every chain".
 */
export const SOL_NAMED = SOL_UI_ENABLED;
/** "Bitcoin, Ethereum and Solana" / "Bitcoin and Ethereum". */
export const chainList = (sol: boolean = SOL_NAMED) => (sol ? "Bitcoin, Ethereum and Solana" : "Bitcoin and Ethereum");
/** "BTC, ETH and SOL" / "BTC and ETH". */
export const tickerList = (sol: boolean = SOL_NAMED) => (sol ? "BTC, ETH and SOL" : "BTC and ETH");
