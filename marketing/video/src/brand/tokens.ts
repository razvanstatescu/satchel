// Satchel brand tokens (Night theme), from brand/tokens.json v2 and apps/web/src/app/globals.css.
// The video is Night-only: Night is the brand's identity.

export const C = {
  ground: "#17100c",
  surface: "#221812",
  surfaceRaised: "#33251c",
  line: "#4a3628",
  lineStrong: "#8a6c50",
  ink: "#f3e9dc",
  inkMuted: "#b9a895",
  brand: "#d4ae55",
  brandBright: "#ebcb7a",
  brandDeep: "#9a7428",
  onBrand: "#2b1d15",
  success: "#6bbfa9",
  frozen: "#94bedf",
  danger: "#f37386",
  btc: "#f7931a",
  evm: "#a3abe0",
  sol: "#c08cff",
  leatherLight: "#6a4730", // logo only
  leatherDark: "#432c1f", // logo only
  bandPill: "#2b1d15",
  stitch: "rgba(212,174,85,0.45)",
  // Satchel #1's per-token leather body (kb/81 R3 vector: offset -1)
  cardBody1: "#27160b",
} as const;

export const BRASS_GRADIENT = `linear-gradient(135deg, ${C.brandBright}, ${C.brand} 55%, ${C.brandDeep})`;

export const F = {
  display: '"Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif',
  sans: '"Instrument Sans", system-ui, sans-serif',
  mono: '"Spline Sans Mono", ui-monospace, monospace',
} as const;

/** Bricolage variable axes: wght 200–800, opsz 12–96, wdth 75–100. */
export const display = (wght = 700, opsz = 96, wdth = 100) => ({
  fontFamily: F.display,
  fontWeight: wght,
  fontVariationSettings: `"opsz" ${opsz}, "wdth" ${wdth}`,
  fontStretch: `${wdth}%`,
});

export type Chain = "btc" | "evm" | "sol";
export const CHAIN = {
  btc: { color: C.btc, ticker: "BTC", name: "Bitcoin", network: "Bitcoin" },
  evm: { color: C.evm, ticker: "ETH", name: "Ethereum", network: "Ethereum" },
  sol: { color: C.sol, ticker: "SOL", name: "Solana", network: "Solana" },
} as const;

// Satchel #1's real derived addresses (README "Try it in 60 seconds").
export const ADDR = {
  btc: "bc1qtf95jlrryxd2kfrs2ug03p4awlwwm2wff5ral8",
  evm: "0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad",
  sol: "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd",
} as const;
