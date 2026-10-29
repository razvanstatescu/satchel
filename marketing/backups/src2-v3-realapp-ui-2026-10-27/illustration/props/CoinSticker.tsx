import type { CSSProperties } from "react";
import { C, type Chain } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, mix, n2, OUT, PAL, useUid } from "./kit";

/**
 * CoinSticker: a plain coin in a chain colour (no logos, no faces): ink outline, a lighter rim band on the upper-left
 * edge (the edge highlight), an inner rim line and a hard drop. Flat: the flip is a 2D squash, never a 3D coin.
 *
 * Props
 *   chain   "btc" | "evm" | "sol" | "usdc"  default "btc" (illustration fills #f7931a / #a3abe0 / #c08cff; usdc #2775ca)
 *   size    px       default 96: outer diameter
 *   k       number   default size/48: stroke scale (outline 3k, drop 4k). Pin it (e.g. k={2}) so a shower of coins
 *                    of different sizes keeps one outline weight.
 *   flip    deg      default 0: spin about the vertical axis (scaleX = |cos|); 90 = edge-on
 *   squash  -1..1    default 0: >0 squashes (wider, shorter) from the bottom (gulp / landing), <0 stretches (fall)
 *   drop    number   default 1: drop multiplier (0 = none, e.g. mid-flight)
 *   fill    string   optional colour override
 *   night   boolean  default false: drop in #000
 *   style   CSSProperties on the root <svg> (box = size × size; the drop hangs below it)
 */
export type CoinKind = Chain | "usdc";

export const COIN_FILL: Record<CoinKind, string> = { btc: C.btc, evm: C.evm, sol: C.sol, usdc: PAL.usdc };

export interface CoinStickerProps {
  chain?: CoinKind;
  size?: number;
  k?: number;
  flip?: number;
  squash?: number;
  drop?: number;
  fill?: string;
  night?: boolean;
  style?: CSSProperties;
}

export function CoinSticker({ chain = "btc", size = 96, k, flip = 0, squash = 0, drop = 1, fill, night = false, style }: CoinStickerProps) {
  const uid = useUid("coin");
  const u = size / 48; // px per coin unit
  const ks = (k ?? u) / u; // stroke multiplier in coin units
  const base = fill ?? COIN_FILL[chain];
  const light = mix(base, C.white, chain === "usdc" ? 0.38 : 0.5);
  const deep = mix(base, C.ink, chain === "usdc" ? 0.32 : 0.26);
  const c = 24;
  const sx = Math.max(0.06, Math.abs(Math.cos((flip * Math.PI) / 180)));
  const sw = OUT * ks;
  const ro = 24 - sw / 2;
  const ri = ro * 0.66;
  const sq = clamp(squash, -1, 1);
  const tx = 1 + 0.16 * sq;
  const ty = 1 - 0.16 * sq;
  // edge highlight: the crescent between the outer disc and the same disc shifted down-right
  const off = ro * 0.16;
  return (
    <svg width={n2(size)} height={n2(size)} viewBox="0 0 48 48" style={{ display: "block", overflow: "visible", ...style }}>
      <defs>
        <clipPath id={`${uid}-c`}>
          <ellipse cx={c} cy={c} rx={ro * sx} ry={ro} />
        </clipPath>
      </defs>
      <Dropped id={uid} dy={DROP * ks * drop} color={dropColor(night)}>
        <g transform={`translate(${c} 48) scale(${n2(tx * 1000) / 1000} ${n2(ty * 1000) / 1000}) translate(${-c} -48)`}>
          <ellipse cx={c} cy={c} rx={ro * sx} ry={ro} fill={light} />
          <g clipPath={`url(#${uid}-c)`}>
            <ellipse cx={c + off * sx} cy={c + off} rx={ro * sx} ry={ro} fill={base} />
          </g>
          <ellipse cx={c} cy={c} rx={ri * sx} ry={ri} fill="none" stroke={deep} strokeWidth={2 * ks} />
          <ellipse cx={c} cy={c} rx={ro * sx} ry={ro} fill="none" stroke={C.ink} strokeWidth={sw} />
        </g>
      </Dropped>
    </svg>
  );
}
