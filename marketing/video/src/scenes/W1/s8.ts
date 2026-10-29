import type { Chain } from "../../brand/tokens";

/**
 * Satchel #8, the viewer's freshly minted Satchel in W1/W2. Its addresses are MADE UP for the film (plausible format,
 * not derived): the bc1q string deliberately fails the bech32 checksum, so a wallet that scans the QR in W2
 * (public/images/qr-btc-s8.svg, generated from this value) rejects it instead of sending coins anywhere.
 */
export const S8_ID = "8";
export const S8_ADDR: Record<Chain, string> = {
  btc: "bc1qf7v4aytt2pm5khypyl93yg94gmru7cpt8h6lql",
  evm: "0x3b51CDAf1EACeA6B07022AE31dA05D1F15a869e7",
  sol: "2q8n1QwPTU3NB1xgYiXieobnweJwtBoTkpsiQf5CveNM",
};
export const S8_QR_BTC = "images/qr-btc-s8.svg";

/** What W2 deposits (native units, no fiat). */
export const S8_DEPOSIT: Record<Chain, { amount: number; decimals: number }> = {
  btc: { amount: 0.0123, decimals: 4 },
  evm: { amount: 0.05, decimals: 4 },
  sol: { amount: 1.25, decimals: 4 },
};

/** Where the card sits on W1's last frame (W2 picks it up from here). */
export const W1_END_CARD = { cx: 390, cy: 525, w: 540 };
