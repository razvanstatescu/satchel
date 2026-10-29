import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { DROP, Dropped, dropColor, K, mix, n2, OUT, useUid } from "./kit";

/**
 * TradeDesk: the OTC vignette's table (P6b): a flat sticker desk strip, a white top slab over a front apron with a
 * centre drawer pull (the "mid-table" mark where the card and the USDC stack cross), two legs. Items sit on its top
 * edge (y = 0 of the box).
 *
 * Props
 *   width    px      default 1400: total width of the slab
 *   scale    number  default 2: stroke/detail scale (slab 18 UI, apron 34 UI, legs `legs` UI)
 *   legs     number  default 64: leg length in UI units (0 = no legs, just the strip)
 *   tone     "neutral" | "lemon" | "sky"  default "neutral" (white top, sunken apron)
 *   divider  boolean default true: the centre drawer pull
 *   drop     number  default 1; night boolean; style on the root <svg> (box = width × (50 + legs)·scale)
 */
const TONES = {
  neutral: { top: C.surface, apron: C.sunken },
  lemon: { top: C.lemon, apron: mix(C.lemon, C.ink, 0.12) },
  sky: { top: C.sky, apron: mix(C.sky, C.ink, 0.14) },
} as const;

export interface TradeDeskProps {
  width?: number;
  scale?: number;
  legs?: number;
  tone?: keyof typeof TONES;
  divider?: boolean;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function TradeDesk({ width = 1400, scale = K, legs = 64, tone = "neutral", divider = true, drop = 1, night = false, style }: TradeDeskProps) {
  const uid = useUid("desk");
  const W = width / scale;
  const t = TONES[tone];
  const slabH = 18;
  const apronY = slabH - 2;
  const apronH = 34;
  const H = apronY + apronH + legs;
  const legW = 22;
  const legX = [Math.max(40, W * 0.06), W - Math.max(40, W * 0.06) - legW];
  return (
    <svg width={n2(width)} height={n2(H * scale)} viewBox={`0 0 ${n2(W)} ${n2(H)}`} style={{ display: "block", overflow: "visible", ...style }}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        {legs > 0
          ? legX.map((x) => <rect key={x} x={x} y={apronY + apronH - 6} width={legW} height={legs + 6 - OUT / 2} rx={6} fill={C.lineStrong} stroke={C.ink} strokeWidth={OUT} />)
          : null}
        <rect x={22} y={apronY} width={W - 44} height={apronH} rx={8} fill={t.apron} stroke={C.ink} strokeWidth={OUT} />
        {divider ? <rect x={W / 2 - 34} y={apronY + apronH / 2 - 4} width={68} height={8} rx={4} fill={C.ink} /> : null}
        <rect x={OUT / 2} y={OUT / 2} width={W - OUT} height={slabH} rx={9} fill={t.top} stroke={C.ink} strokeWidth={OUT} />
      </Dropped>
    </svg>
  );
}
