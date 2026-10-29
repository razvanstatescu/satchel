import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, lerp, n2, useUid } from "./kit";

/**
 * ScanBeam: the browser's check sweeping a region (T5: across the history panel's three outlines). A sky scan bar
 * with an ink outline, trailed by two stepped sky tint bands (flat, no gradient), clipped to the region; optional ink
 * corner brackets frame the region. Lay it exactly over the region (same box).
 *
 * Props
 *   width, height  px     the region
 *   progress       0..1   bar position (0 = top/left edge, 1 = bottom/right edge)
 *   direction      "down" | "right"  default "down"
 *   brackets       0..1   default 1: corner brackets (scale them in/out)
 *   radius         px     default 16·k: region corner radius (clip)
 *   k              number default 2: stroke scale (bar 6k thick, outline 2.5k)
 *   style          CSSProperties on the root <svg>
 */
export interface ScanBeamProps {
  width: number;
  height: number;
  progress?: number;
  direction?: "down" | "right";
  brackets?: number;
  radius?: number;
  k?: number;
  style?: CSSProperties;
}

export function ScanBeam({ width, height, progress = 0.5, direction = "down", brackets = 1, radius, k = 2, style }: ScanBeamProps) {
  const uid = useUid("scan");
  const W = width;
  const H = height;
  const R = radius ?? 16 * k;
  const p = clamp(progress);
  const down = direction === "down";
  const len = down ? H : W;
  const pos = lerp(0, len, p);
  const trail = Math.min(len * 0.32, 120 * k);
  const bar = 6 * k;
  const b = clamp(brackets);
  const arm = 22 * k;
  const off = 9 * k;
  const bw = 3 * k;
  const band = (from: number, to: number, op: number) =>
    down ? <rect x={0} y={n2(from)} width={W} height={n2(Math.max(0, to - from))} fill={C.sky} opacity={op} /> : <rect x={n2(from)} y={0} width={n2(Math.max(0, to - from))} height={H} fill={C.sky} opacity={op} />;
  const corners: [number, number, number, number][] = [
    [-off, -off, 1, 1],
    [W + off, -off, -1, 1],
    [W + off, H + off, -1, -1],
    [-off, H + off, 1, -1],
  ];
  return (
    <svg width={n2(W)} height={n2(H)} viewBox={`0 0 ${n2(W)} ${n2(H)}`} style={{ display: "block", overflow: "visible", ...style }}>
      <defs>
        <clipPath id={`${uid}-c`}>
          <rect x={0} y={0} width={W} height={H} rx={R} />
        </clipPath>
      </defs>
      {p > 0 && p < 1 ? (
        <g clipPath={`url(#${uid}-c)`}>
          {band(pos - trail, pos - trail / 2, 0.14)}
          {band(pos - trail / 2, pos, 0.28)}
        </g>
      ) : null}
      {p > 0 && p < 1 ? (
        down ? (
          <rect x={-6 * k} y={n2(pos - bar / 2)} width={W + 12 * k} height={bar} rx={bar / 2} fill={C.sky} stroke={C.ink} strokeWidth={2.5 * k} />
        ) : (
          <rect x={n2(pos - bar / 2)} y={-6 * k} width={bar} height={H + 12 * k} rx={bar / 2} fill={C.sky} stroke={C.ink} strokeWidth={2.5 * k} />
        )
      ) : null}
      {b > 0.001
        ? corners.map(([x, y, sx, sy], i) => (
            <g key={i} transform={`translate(${n2(x)} ${n2(y)}) scale(${n2(b * 1000) / 1000})`}>
              <path d={`M0 ${n2(sy * arm)} V0 H${n2(sx * arm)}`} fill="none" stroke={C.ink} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))
        : null}
    </svg>
  );
}
