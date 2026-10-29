import type { CSSProperties, ReactNode } from "react";
import { C } from "../../brand/tokens";
import { DROP, Dropped, dropColor, K, n2, OUT, PropSvg, roundedPoly, useUid } from "./kit";

/**
 * ExchangeSticker and WalletSticker: the two generic coin sources in P2 ("Fill it from any wallet or exchange"), as
 * round sticker badges. No brands: a classical building (exchange) on lemon, a snap wallet with a coin peeking out on
 * sky. White glyph fills, ink outlines, hard drop.
 *
 * Props (both)
 *   scale   number  default 2. Badge BADGE.d = 104 UI (208 px at scale 2)
 *   bg      string  badge fill override (Exchange: C.lemon, Wallet: C.sky)
 *   bump    0..1    default 0: a little squash-and-grow (fire it as each coin leaves)
 *   drop    number  default 1; night boolean; style on the root <svg>
 */
export const BADGE = { d: 104 } as const;

interface BadgeProps {
  scale?: number;
  bg?: string;
  bump?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

function RoundBadge({ scale = K, bg, bump = 0, drop = 1, night = false, style, children, uidPrefix }: BadgeProps & { children: ReactNode; uidPrefix: string }) {
  const uid = useUid(uidPrefix);
  const D = BADGE.d;
  const sx = 1 + 0.08 * Math.sin(bump * Math.PI);
  const sy = 1 - 0.06 * Math.sin(bump * Math.PI);
  return (
    <PropSvg w={D} h={D} scale={scale} style={style}>
      <g transform={`translate(${D / 2} ${D}) scale(${n2(sx * 1000) / 1000} ${n2(sy * 1000) / 1000}) translate(${-D / 2} ${-D})`}>
        <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
          <circle cx={D / 2} cy={D / 2} r={D / 2 - OUT / 2} fill={bg} stroke={C.ink} strokeWidth={OUT} />
          {children}
        </Dropped>
      </g>
    </PropSvg>
  );
}

const G = { fill: C.surface, stroke: C.ink, strokeWidth: 2.6, strokeLinejoin: "round" as const };

export function ExchangeSticker({ bg = C.lemon, ...p }: BadgeProps) {
  const cols = [28, 41.7, 55.3, 69];
  return (
    <RoundBadge {...p} bg={bg} uidPrefix="exch">
      <path
        d={roundedPoly(
          [
            [52, 21],
            [82, 39],
            [22, 39],
          ],
          3.5,
        )}
        {...G}
      />
      <circle cx={52} cy={32} r={3.4} fill={C.ink} />
      <rect x={23} y={39} width={58} height={8} rx={2.5} {...G} />
      {cols.map((x) => (
        <rect key={x} x={x} y={47} width={7} height={22} rx={1.5} {...G} />
      ))}
      <rect x={21} y={69} width={62} height={7.5} rx={2.5} {...G} />
      <rect x={16} y={76.5} width={72} height={8} rx={3} {...G} />
    </RoundBadge>
  );
}

export function WalletSticker({ bg = C.sky, ...p }: BadgeProps) {
  return (
    <RoundBadge {...p} bg={bg} uidPrefix="wallet">
      {/* a coin peeking out of the wallet */}
      <circle cx={44} cy={36} r={12} fill={C.lemon} stroke={C.ink} strokeWidth={2.6} />
      <circle cx={44} cy={36} r={7} fill="none" stroke={C.ink} strokeWidth={1.6} opacity={0.35} />
      <rect x={20} y={40} width={64} height={44} rx={10} {...G} />
      <rect x={25.5} y={45.5} width={53} height={33} rx={6} fill="none" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3.2" opacity={0.55} />
      <rect x={60} y={52} width={30} height={20} rx={8} {...G} />
      <circle cx={73} cy={62} r={3.6} fill={C.ink} />
    </RoundBadge>
  );
}
