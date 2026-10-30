/**
 * The brand's fixed artwork (brand 2.0 pack, `brand/logo` and `brand/illustration`; the proto's `assets/`). Inline
 * copies drop the pack's C2PA `<metadata>` (R1 #9); `public/brand` keeps the files verbatim.
 *
 * These colours are artwork, not UI: the mark, the charm S, the chain charms and the sparkle look the same in Day and
 * Night (design-spec §6.7: badges and illustration objects keep the constant ink outline). UI colour comes only from
 * the tokens in globals.css.
 */
export const ART = {
  coral: "#FF5C4D",
  ink: "#1D1340",
  white: "#FFFFFF",
  lemon: "#FFD84D",
  btc: "#F7931A",
  evm: "#A3ABE0",
  sol: "#C08CFF",
  // the coins and network stickers beyond the three chain charms (CoinIcon): never the real logos' colours exactly
  sky: "#8FD3FF",
  mint: "#7FE3B8",
  base: "#6E9BFF",
  arbitrum: "#9ED8F2",
} as const;

/** The S stroke (logo/satchel-mark.svg), drawn three times: the drop (+10 y), the ink outline, the face. */
export const S_PATH =
  "M330 184 C330 154 300 138 256 138 C206 138 182 162 182 194 C182 230 214 242 256 252 C298 262 330 274 330 310 C330 344 302 364 256 364 C210 364 182 348 180 316";

/** The wordmark "satchel" in Funnel Display ExtraBold, as outlines (logo/satchel-lockup-on-light.svg). */
export const WORDMARK_PATH =
  "M334 12Q199 12 121.5 -45.0Q44 -102 38 -204H215Q223 -164 253.5 -145.0Q284 -126 342 -126Q432 -126 432 -173Q432 -192 418.5 -203.5Q405 -215 374 -221L240 -247Q56 -283 56 -419Q56 -507 127.0 -559.5Q198 -612 323 -612Q448 -612 520.0 -558.0Q592 -504 598 -406H421Q411 -445 385.5 -462.5Q360 -480 311 -480Q271 -480 249.5 -469.0Q228 -458 228 -436Q228 -420 241.0 -409.0Q254 -398 280 -393L418 -366Q514 -347 559.0 -304.0Q604 -261 604 -188Q604 -94 534.5 -41.0Q465 12 334 12Z M891 11Q783 11 722.5 -40.5Q662 -92 662 -178Q662 -267 725.5 -315.5Q789 -364 907 -364H1068V-386Q1068 -468 964 -468Q872 -468 852 -406H670Q691 -508 765.0 -560.0Q839 -612 963 -612Q1100 -612 1172.0 -551.5Q1244 -491 1244 -375V-180H1330V0H1146V-100H1104Q1073 -46 1022.0 -17.5Q971 11 891 11ZM919 -127Q963 -127 996.5 -142.0Q1030 -157 1049.0 -183.0Q1068 -209 1068 -241V-244H915Q838 -244 838 -187Q838 -158 859.5 -142.5Q881 -127 919 -127Z M1615 0Q1545 0 1506.5 -35.5Q1468 -71 1468 -144V-456H1368V-600H1470V-780H1650V-600H1782V-456H1652V-144H1796V0Z M2166 12Q2072 12 2000.5 -26.5Q1929 -65 1888.5 -135.0Q1848 -205 1848 -300Q1848 -395 1888.0 -465.0Q1928 -535 2000.0 -573.5Q2072 -612 2166 -612Q2288 -612 2366.5 -550.0Q2445 -488 2463 -382H2279Q2267 -415 2238.5 -433.5Q2210 -452 2166 -452Q2107 -452 2069.5 -412.5Q2032 -373 2032 -300Q2032 -227 2070.0 -187.5Q2108 -148 2166 -148Q2261 -148 2282 -227H2466Q2450 -116 2372.0 -52.0Q2294 12 2166 12Z M2530 0V-840H2714V-518H2718Q2747 -564 2794.5 -587.5Q2842 -611 2909 -611Q3022 -611 3088.0 -542.0Q3154 -473 3154 -357V0H2970V-321Q2970 -383 2937.5 -415.0Q2905 -447 2842 -447Q2779 -447 2746.5 -415.0Q2714 -383 2714 -321V0Z M3562 12Q3463 12 3390.0 -26.5Q3317 -65 3277.5 -135.5Q3238 -206 3238 -302Q3238 -398 3276.5 -467.5Q3315 -537 3386.5 -574.5Q3458 -612 3555 -612Q3651 -612 3720.0 -575.5Q3789 -539 3825.5 -471.0Q3862 -403 3862 -308V-249H3415Q3426 -191 3463.0 -161.5Q3500 -132 3561 -132Q3610 -132 3637.5 -147.5Q3665 -163 3677 -197H3861Q3842 -99 3763.0 -43.5Q3684 12 3562 12ZM3418 -369H3686Q3677 -419 3644.5 -443.5Q3612 -468 3556 -468Q3501 -468 3466.0 -443.0Q3431 -418 3418 -369Z M3953 0V-840H4137V0Z";
export const WORDMARK_TRANSFORM = "translate(609.31 372.00) scale(0.38667)";

/** Decorative unless labelled: `title` makes the SVG an image with that name; otherwise it is hidden from AT. */
export function artA11y(title?: string): { role: "img"; "aria-label": string } | { "aria-hidden": true } {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
}
