// Satchel 2.0 brand tokens (marketing/brand-v2/tokens.json). Day is the default theme and the film's world.

export const C = {
  ground: "#f6f5fb", // cool off-white, never cream
  surface: "#ffffff",
  sunken: "#eceaf4",
  line: "#e2dfee",
  lineStrong: "#7f7999",
  ink: "#1d1340", // text, outlines, hard sticker shadows
  inkMuted: "#5e5776",
  brand: "#ff5c4d", // coral: one coral fill per screen, ink text on it, never white text
  brandDeep: "#d9402f",
  brandSoft: "#ffe3df",
  onBrand: "#1d1340",
  link: "#c7301f",
  lemon: "#ffd84d", // sticker accent only, never text
  sky: "#8fd3ff", // sticker accent only
  success: "#0b6e54",
  frozen: "#2a63c7",
  danger: "#c61f45",
  // chain colours: charm fills and illustrations use the bright values on both themes
  btc: "#f7931a",
  evm: "#a3abe0",
  sol: "#c08cff",
  // chain dots on Day UI (graphics only)
  btcUi: "#c96f00",
  evmUi: "#5560b0",
  solUi: "#8447d6",
  white: "#ffffff",
} as const;

export const NIGHT = {
  ground: "#120c26",
  surface: "#1c1538",
  sunken: "#29214b",
  line: "#352c5c",
  lineStrong: "#8a82ae",
  ink: "#f4f2ff",
  inkMuted: "#b7b0d1",
  success: "#4fd9b0",
  frozen: "#8db8ff",
  danger: "#ff7a92",
  link: "#ff8a7e",
} as const;

export const F = {
  display: '"Funnel Display", Onest, system-ui, sans-serif',
  sans: 'Onest, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

/** Funnel Display has one variable axis: wght 300–800. The wordmark and balances use 800. */
export const display = (wght = 800) => ({ fontFamily: F.display, fontWeight: wght });
export const sans = (wght = 400) => ({ fontFamily: F.sans, fontWeight: wght });
export const mono = (wght = 450) => ({ fontFamily: F.mono, fontWeight: wght });

/** Sticker language at scale k (k = 1 is UI scale): 3px ink outline, hard 4px ink drop, no blur. */
export const OUTLINE = 3;
export const DROP = 4;
export const stickerBox = (k = 1, drop = 1) => ({
  border: `${OUTLINE * k}px solid ${C.ink}`,
  boxShadow: `0 ${DROP * k * drop}px 0 ${C.ink}`,
});

export const R = { sm: 12, md: 18, card: 28, pill: 999 } as const;

export type Chain = "btc" | "evm" | "sol";
export const CHAIN = {
  btc: { color: C.btc, ui: C.btcUi, ticker: "BTC", name: "Bitcoin" },
  evm: { color: C.evm, ui: C.evmUi, ticker: "ETH", name: "Ethereum" },
  sol: { color: C.sol, ui: C.solUi, ticker: "SOL", name: "Solana" },
} as const;

// Satchel #1's derived addresses (BTC re-encoded with the mainnet bc1 prefix for mainnet-style wording).
export const ADDR = {
  btc: "bc1qtf95jlrryxd2kfrs2ug03p4awlwwm2wff5ral8",
  evm: "0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad",
  sol: "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd",
} as const;
