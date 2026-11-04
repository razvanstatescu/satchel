import type { CSSProperties } from "react";
import { C, type Chain, F } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, mix, n2, OUT, PAL, useUid } from "./kit";

/**
 * CoinSticker: a coin as a sticker with a hard drop. Two families:
 *   - chain coins "btc" | "evm" | "sol": plain discs in the chain colours (no logos, no faces): ink outline, a lighter
 *     rim band on the upper-left edge (the edge highlight) and an inner rim line.
 *   - faced coins "usdc" | "near" | "wnear": drawn like the app's CoinIcon (apps/web/.../brand/CoinIcon.tsx): a disc
 *     with the charm face (two dot eyes, a smile) and the app's heavier ink outline. USDC is sky, NEAR mint, wNEAR
 *     mint inside an ink ring. Optional `network` badge on the lower-right edge, as in the app: a lettered disc
 *     ("base" B, "arbitrum" A, "optimism" OP coral, "ethereum" E, "solana" S, "near" N, "bitcoin" ₿).
 *     (The app shows "S" for Sepolia; the film is mainnet-style, so Ethereum reads "E".)
 * Flat throughout: the flip is a 2D squash, never a 3D coin.
 *
 * Props
 *   chain    "btc" | "evm" | "sol" | "usdc" | "near" | "wnear"  default "btc"
 *   network  badge on faced coins (see above), default none. The badge overhangs the box by 10% (overflow visible).
 *   size     px       default 96: outer diameter (the box is size × size)
 *   k        number   stroke scale (outline 3k, drop 4k). Default size/48 for chain coins; faced coins default to
 *                     the app's outline ratio (12/140 of the size). Pin it so a shower of coins keeps one weight.
 *   flip     deg      default 0: spin about the vertical axis (scaleX = |cos|); 90 = edge-on (the face hides)
 *   squash   -1..1    default 0: >0 squashes (wider, shorter) from the bottom (gulp / landing), <0 stretches (fall)
 *   face     CoinFace optional: { blink 0..1, smile (1 = brand smile, 0 flat, 1.6 grin), look {x, y} } (faced coins)
 *   drop     number   default 1: drop multiplier (0 = none, e.g. mid-flight)
 *   fill     string   optional colour override; night boolean (drop in #000); style on the root <svg>
 */
export type CoinKind = Chain | "usdc" | "near" | "wnear";
export type CoinNetwork = "ethereum" | "base" | "arbitrum" | "optimism" | "solana" | "near" | "bitcoin";
export interface CoinFace {
  blink?: number;
  smile?: number;
  look?: { x: number; y: number };
}

export const COIN_FILL: Record<CoinKind, string> = { btc: C.btc, evm: C.evm, sol: C.sol, usdc: C.sky, near: PAL.mint, wnear: PAL.mint };
export const COIN_NETWORK: Record<CoinNetwork, { fill: string; letter: string }> = {
  ethereum: { fill: C.evm, letter: "E" },
  base: { fill: PAL.base, letter: "B" },
  arbitrum: { fill: PAL.arbitrum, letter: "A" },
  optimism: { fill: C.brand, letter: "OP" },
  solana: { fill: C.sol, letter: "S" },
  near: { fill: PAL.mint, letter: "N" },
  bitcoin: { fill: C.btc, letter: "₿" },
};
const FACED = new Set<CoinKind>(["usdc", "near", "wnear"]);

export interface CoinStickerProps {
  chain?: CoinKind;
  network?: CoinNetwork | null;
  size?: number;
  k?: number;
  flip?: number;
  squash?: number;
  face?: CoinFace;
  drop?: number;
  fill?: string;
  night?: boolean;
  style?: CSSProperties;
}

/**
 * The faced coin in the app's 140-unit grid (centre 70, 70; r 64), squashed horizontally by `sx`. `ow` is the ink
 * outline in grid units (the app uses 12). Reused by NearStack.
 */
export function FacedCoinGroup({ fill, ring = false, sx = 1, ow = 12, face = {} }: { fill: string; ring?: boolean; sx?: number; ow?: number; face?: CoinFace }) {
  const r = 70 - ow / 2;
  const blink = clamp(face.blink ?? 0);
  const smile = face.smile ?? 1;
  const lx = face.look?.x ?? 0;
  const ly = face.look?.y ?? 0;
  const showFace = sx > 0.3;
  const ex = (x: number) => 70 + (x - 70) * sx;
  return (
    <g>
      <ellipse cx={70} cy={70} rx={r * sx} ry={r} fill={fill} stroke={C.ink} strokeWidth={ow} />
      {ring ? <ellipse cx={70} cy={70} rx={50 * sx} ry={50} fill="none" stroke={C.ink} strokeWidth={6} /> : null}
      {showFace ? (
        <g transform={`translate(${n2(lx * sx)} ${n2(ly)})`}>
          <ellipse cx={ex(48)} cy={64} rx={9 * sx} ry={Math.max(1.2, 9 * (1 - 0.88 * blink))} fill={C.ink} />
          <ellipse cx={ex(92)} cy={64} rx={9 * sx} ry={Math.max(1.2, 9 * (1 - 0.88 * blink))} fill={C.ink} />
          <path d={`M${n2(ex(54))} 88 Q70 ${n2(88 + 14 * smile)} ${n2(ex(86))} 88`} fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
}

export function CoinSticker({ chain = "btc", network = null, size = 96, k, flip = 0, squash = 0, face, drop = 1, fill, night = false, style }: CoinStickerProps) {
  const uid = useUid("coin");
  const sx = Math.max(0.06, Math.abs(Math.cos((flip * Math.PI) / 180)));
  const sq = clamp(squash, -1, 1);
  const tx = 1 + 0.16 * sq;
  const ty = 1 - 0.16 * sq;
  const base = fill ?? COIN_FILL[chain];

  if (FACED.has(chain)) {
    // the app's grid: 140 units across; outline 12 units unless k pins it (3k px)
    const upx = size / 140; // px per grid unit
    const ow = k !== undefined ? (OUT * k) / upx : 12;
    const dropPx = DROP * (k ?? size / 48);
    const b = network ? COIN_NETWORK[network] : null;
    const bsx = clamp((sx - 0.3) / 0.4);
    return (
      <svg width={n2(size)} height={n2(size)} viewBox="0 0 140 140" style={{ display: "block", overflow: "visible", ...style }}>
        <Dropped id={uid} dy={dropPx / upx * drop} color={dropColor(night)}>
          <g transform={`translate(70 140) scale(${n2(tx * 1000) / 1000} ${n2(ty * 1000) / 1000}) translate(-70 -140)`}>
            <FacedCoinGroup fill={base} ring={chain === "wnear"} sx={sx} ow={ow} face={face} />
            {b && bsx > 0 ? (
              <g transform={`translate(${n2(70 + 50 * sx)} 120) scale(${n2(bsx * 1000) / 1000} 1)`}>
                <circle r={30} fill={b.fill} stroke={C.ink} strokeWidth={8} />
                <text
                  x={0}
                  y={b.letter.length > 1 ? 8.8 : 11.7}
                  textAnchor="middle"
                  fill={C.ink}
                  style={{ fontFamily: F.sans, fontWeight: 800, fontSize: b.letter.length > 1 ? 25 : 33 }}
                >
                  {b.letter}
                </text>
              </g>
            ) : null}
          </g>
        </Dropped>
      </svg>
    );
  }

  const u = size / 48; // px per coin unit
  const ks = (k ?? u) / u; // stroke multiplier in coin units
  const light = mix(base, C.white, 0.5);
  const deep = mix(base, C.ink, 0.26);
  const c = 24;
  const sw = OUT * ks;
  const ro = 24 - sw / 2;
  const ri = ro * 0.66;
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
