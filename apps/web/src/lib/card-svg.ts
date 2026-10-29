import { ART, S_PATH } from "@/components/brand/art";
import { CARD_FONTS, CARD_LABEL_WIDTHS } from "@/lib/card-fonts.generated";
import { SOL_UI_ENABLED } from "@/lib/config";
import { copy, TICKER } from "@/lib/copy";

/**
 * The NFT media `/api/card/{id}.svg` (Satchel 2.0; design-system-impl §8; proto-cards.png; D-23): the sticker card in
 * its Day colours on any wallet ground. An 800×504 card (1.587:1) with an 8 px hard ink drop, a coral band with the
 * name and the charm S, "{n} signatures" over "recorded on NEAR testnet", then the state pill and the chain chips.
 * No balances, no owner, no fiat, no "Yours": the image is the same for everyone.
 *
 * Words come from the copy deck (`copy.pill`, `copy.card.svgSigs` / `svgSub`, the tickers). The brand faces travel
 * inside the SVG as WOFF2 subsets (data: URIs; scripts/build-card-fonts.mjs), so every renderer draws the same glyphs:
 * Funnel Display 800 for the name and the count, Onest 500 for the sub line, Onest 600 for the pill and chips. Pill and
 * chip widths are constants shaped from the same instance (`CARD_LABEL_WIDTHS`): nothing is measured at runtime.
 */

export type CardSvgStatus = "active" | "signing" | "listed";

export const CARD_STATUS_WORDS: Record<CardSvgStatus, string> = { active: copy.pill.active, signing: copy.pill.signing, listed: copy.pill.listed };
export const CARD_SUB = copy.card.svgSub;
/** The chain chips: Bitcoin and Ethereum, plus Solana only with the SOL UI flag (R1 #7). */
export const CARD_CHIPS: readonly string[] = SOL_UI_ENABLED ? [TICKER.btc, TICKER.evm, TICKER.sol] : [TICKER.btc, TICKER.evm];

/** Day values of the 2.0 tokens: the image is always Day (artwork, not UI). */
const DAY = {
  ink: ART.ink,
  coral: ART.coral,
  white: ART.white,
  muted: "#5E5776", // ink-muted
  sunken: "#ECEAF4", // surface-sunken
  success: "#0B6E54",
  frozen: "#2A63C7",
} as const;

/** Chain colours (Day) for the chips' dots. */
const CHAIN_DOT: Record<string, string> = { BTC: "#C96F00", ETH: "#5560B0", SOL: "#8447D6" };

/** Lucide paths (stroke 2) for the state glyphs: check, loader-circle, snowflake. */
const GLYPH: Record<CardSvgStatus, string[]> = {
  active: ["M20 6 9 17l-5-5"],
  signing: ["M21 12a9 9 0 1 1-6.219-8.56"],
  listed: [
    "m10 20-1.25-2.5L6 18",
    "M10 4 8.75 6.5 6 6",
    "m14 20 1.25-2.5L18 18",
    "m14 4 1.25 2.5L18 6",
    "m17 21-3-6h-4",
    "m17 3-3 6 1.5 3",
    "M2 12h6.5L10 9",
    "m20 10-1.5 2 1.5 2",
    "M22 12h-6.5L14 15",
    "m4 10 1.5 2L4 14",
    "m7 21 3-6-1.5-3",
    "m7 3 3 6h4",
  ],
};
const STATE_COLOR: Record<CardSvgStatus, string> = { active: DAY.success, signing: DAY.frozen, listed: DAY.frozen };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";
export const CARD_FAMILY = {
  display: `'${CARD_FONTS.display.family}', 'Funnel Display', ${FALLBACK}`,
  sans: `'${CARD_FONTS.sans.family}', 'Onest', ${FALLBACK}`,
  label: `'${CARD_FONTS.label.family}', 'Onest', ${FALLBACK}`,
} as const;

/** The @font-face block (constant: the same bytes for every token, so caches and snapshots stay stable). */
export const CARD_FONT_CSS = (Object.values(CARD_FONTS) as { family: string; weight: number; woff2Base64: string }[])
  .map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;src:url(data:font/woff2;base64,${f.woff2Base64}) format('woff2')}`)
  .join("");

/** A label word's width at 24 px (the build script shapes every word the card draws; unknown words never ship). */
export function labelWidth(word: string): number {
  const w = CARD_LABEL_WIDTHS[word];
  if (w === undefined) throw new Error(`card-svg: no width for "${word}"; run \`pnpm --filter web fonts:card\``);
  return w;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function cardSvg(tokenId: string, status: CardSvgStatus, sigCount: number): string {
  const word = CARD_STATUS_WORDS[status];
  const color = STATE_COLOR[status];
  const sigs = copy.card.svgSigs(sigCount);
  // the pill: 20 padding · 24 glyph · 10 gap · word · 22 padding, at x 44 on the bottom row (y 412, 48 tall)
  const pillW = round(20 + 24 + 10 + labelWidth(word) + 22);
  // the chips, right-aligned to x 756 with 10 between: 18 padding · 16 dot · 10 gap · ticker · 20 padding
  let x = 756;
  const chips = [...CARD_CHIPS]
    .reverse()
    .map((t) => {
      const w = round(18 + 16 + 10 + labelWidth(t) + 20);
      x = round(x - w);
      const g = `<g transform="translate(${x} 412)"><rect width="${w}" height="48" rx="24" fill="${DAY.sunken}"/><circle cx="26" cy="24" r="8" fill="${CHAIN_DOT[t]}"/><text x="44" y="32" font-family="${CARD_FAMILY.label}" font-size="24" font-weight="600" fill="${DAY.ink}">${t}</text></g>`;
      x = round(x - 10);
      return g;
    })
    .reverse()
    .join("");
  const glyph = GLYPH[status].map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 512" width="800" height="512" role="img" aria-label="${esc(`Satchel #${tokenId}. ${word}. ${sigs} ${CARD_SUB}.`)}">
<defs><style>${CARD_FONT_CSS}</style><clipPath id="card"><rect width="800" height="504" rx="56"/></clipPath></defs>
<rect y="8" width="800" height="504" rx="56" fill="${DAY.ink}"/>
<g clip-path="url(#card)"><rect width="800" height="504" fill="${DAY.white}"/><rect width="800" height="141" fill="${DAY.coral}"/><rect y="138" width="800" height="6" fill="${DAY.ink}"/></g>
<rect x="3" y="3" width="794" height="498" rx="53" fill="none" stroke="${DAY.ink}" stroke-width="6"/>
<text x="44" y="88" font-family="${CARD_FAMILY.display}" font-size="44" font-weight="800" letter-spacing="-0.88" fill="${DAY.ink}">Satchel #${esc(tokenId)}</text>
<g transform="translate(683 22) scale(0.27) translate(-120 -80)" fill="none" stroke-linecap="round"><path d="${S_PATH}" transform="translate(0 10)" stroke="${DAY.ink}" stroke-width="92"/><path d="${S_PATH}" stroke="${DAY.ink}" stroke-width="92"/><path d="${S_PATH}" stroke="${DAY.white}" stroke-width="56"/></g>
<text x="44" y="262" font-family="${CARD_FAMILY.display}" font-size="72" font-weight="800" letter-spacing="-2.16" fill="${DAY.ink}">${esc(sigs)}</text>
<text x="44" y="306" font-family="${CARD_FAMILY.sans}" font-size="24" font-weight="500" fill="${DAY.muted}">${esc(CARD_SUB)}</text>
<g transform="translate(44 412)"><rect width="${pillW}" height="48" rx="24" fill="${DAY.sunken}"/><g transform="translate(20 12)" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g><text x="54" y="32" font-family="${CARD_FAMILY.label}" font-size="24" font-weight="600" fill="${color}">${esc(word)}</text></g>
${chips}
</svg>`;
}
