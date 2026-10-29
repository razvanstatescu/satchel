import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { DROP, Dropped, dropColor, K, n2, OUT, PAL, PropSvg, sans, Txt, useBrandFonts, useUid } from "./kit";

/**
 * UsdcStack: the money side of the OTC trade (P6b): bundles of USDC notes (no number on screen), each a blue note over
 * its stacked edges, a white paper band, and a round seal with the "USDC" wordmark in Onest. Plain shapes, no real logos.
 *
 * Props
 *   bricks  1 | 2 | 3  default 3 (two side by side + one on top)
 *   layers  number     default 4: stacked note edges under each top note
 *   scale   number     default 2. One brick = 172 × (78 + 7·layers) UI; `usdcStackSize(bricks, layers)` gives the box
 *   drop    number     default 1; night boolean; style on the root <svg>
 */
const NW = 172;
const NH = 78;
const EDGE = 7;
const GAP = 10;

export function usdcStackSize(bricks: 1 | 2 | 3 = 3, layers = 4) {
  const bh = NH + EDGE * layers;
  if (bricks === 1) return { w: NW, h: bh };
  if (bricks === 2) return { w: NW * 2 + GAP, h: bh };
  return { w: NW * 2 + GAP, h: bh * 2 - 4 };
}

function Brick({ x, y, layers, uid, dc, drop }: { x: number; y: number; layers: number; uid: string; dc: string; drop: number }) {
  const offs = [0, -3, 2, -1, 3, -2];
  return (
    <Dropped id={uid} dy={DROP * drop} color={dc}>
      <g transform={`translate(${x} ${y})`}>
        {Array.from({ length: layers }, (_, i) => layers - 1 - i).map((i) => (
          <rect key={i} x={OUT / 2 + offs[(i + 1) % offs.length]} y={NH - 10 + EDGE * (i + 1) - 2} width={NW - OUT} height={12} rx={5} fill={i % 2 ? PAL.usdcLight : PAL.usdcDeep} stroke={C.ink} strokeWidth={2.5} />
        ))}
        <rect x={OUT / 2} y={OUT / 2} width={NW - OUT} height={NH - OUT / 2} rx={10} fill={PAL.usdc} stroke={C.ink} strokeWidth={OUT} />
        <rect x={10} y={9} width={NW - 20} height={NH - 18} rx={6} fill="none" stroke={PAL.usdcLight} strokeWidth={2} />
        {/* banknote ornaments: an oval each side, corner dots */}
        {[34, NW - 34].map((x) => (
          <ellipse key={x} cx={x} cy={NH / 2} rx={10} ry={15} fill="none" stroke={PAL.usdcLight} strokeWidth={1.8} />
        ))}
        {[
          [18, 17],
          [NW - 18, 17],
          [18, NH - 17],
          [NW - 18, NH - 17],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.2} fill={PAL.usdcLight} />
        ))}
        {/* paper band, then the seal */}
        <rect x={NW / 2 - 17} y={OUT / 2} width={34} height={NH + EDGE * layers - OUT} fill={C.surface} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={NW / 2} cy={NH / 2} r={24} fill={C.surface} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={NW / 2} cy={NH / 2} r={18.5} fill="none" stroke={PAL.usdc} strokeWidth={1.6} />
        <Txt x={NW / 2} cy={NH / 2} spec={{ ...sans(11.5, 800), ls: 0.02 }} fill={PAL.usdc} anchor="middle">
          USDC
        </Txt>
      </g>
    </Dropped>
  );
}

export interface UsdcStackProps {
  bricks?: 1 | 2 | 3;
  layers?: number;
  scale?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function UsdcStack({ bricks = 3, layers = 4, scale = K, drop = 1, night = false, style }: UsdcStackProps) {
  useBrandFonts();
  const uid = useUid("usdc");
  const dc = dropColor(night);
  const { w, h } = usdcStackSize(bricks, layers);
  const bh = NH + EDGE * layers;
  const spots: [number, number][] = bricks === 1 ? [[0, 0]] : bricks === 2 ? [[0, 0], [NW + GAP, 0]] : [[0, bh - 4], [NW + GAP, bh - 4], [(NW + GAP) / 2, 0]];
  return (
    <PropSvg w={n2(w)} h={n2(h)} scale={scale} style={style}>
      {spots.map(([x, y], i) => (
        <Brick key={i} x={x} y={y} layers={layers} uid={`${uid}-${i}`} dc={dc} drop={drop} />
      ))}
    </PropSvg>
  );
}
