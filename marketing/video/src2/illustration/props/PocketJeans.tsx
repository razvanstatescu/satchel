import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { DROP, Dropped, dropColor, K, mix, n2, OUT, PAL, PropSvg, type Pt, roundedPoly, useUid } from "./kit";

/**
 * PocketJeans: a jeans back pocket the signed slip slides into (C1) and pokes out of (T6). Flat denim, lemon thread
 * stitching, brass rivets, no brand marks. The pocket is an occluder: render it in two layers around the item:
 *     <PocketJeans part="back" />  →  <SignedSlip … />  →  <PocketJeans part="front" />
 * (same position/scale). "back" = the shadowed inside of the opening (and the optional seat panel behind); "front" =
 * the pocket panel. The opening is the pocket's top edge (y = 0).
 *
 * Props
 *   scale   number  default 2. Pocket POCKET.w × POCKET.h = 200 × 214 UI (a SignedSlip at the same scale fits)
 *   fabric  boolean default false: the jeans seat behind the pocket (waistband, belt loop, yoke and centre-back seams;
 *           −70…270 × −104…300 UI, overflows the box). Leave it off when a scene draws its own jeans or hip.
 *   part    "all" | "back" | "front"  default "all"
 *   drop    number  default 1; night boolean (C1 is Night); style on the root <svg> (box = the pocket)
 */
export const POCKET = { w: 200, h: 214 } as const;

const PTS: Pt[] = [
  [0, 0],
  [200, 0],
  [200, 168],
  [100, 214],
  [0, 168],
];

function inset(pts: Pt[], d: number): Pt[] {
  // pocket-specific inset (convex): move each vertex toward the centroid-ish interior
  const cx = 100;
  const cy = 110;
  return pts.map(([x, y]) => {
    const vx = cx - x;
    const vy = cy - y;
    const l = Math.hypot(vx, vy) || 1;
    return [x + (vx / l) * d * 1.35, y + (vy / l) * d * 1.35] as Pt;
  });
}

export interface PocketJeansProps {
  scale?: number;
  fabric?: boolean;
  part?: "all" | "back" | "front";
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function PocketJeans({ scale = K, fabric = false, part = "all", drop = 1, night = false, style }: PocketJeansProps) {
  const uid = useUid("pocket");
  const dc = dropColor(night);
  const thread = C.lemon;
  const pocketD = roundedPoly(PTS, [6, 6, 16, 12, 16]);
  const stitch = inset(PTS.slice(0), 9);
  // open stitch path (no top edge): left side, V bottom, right side
  const st = stitch;
  const stitchD = `M${n2(st[0][0])} ${n2(22)} L${n2(st[4][0])} ${n2(st[4][1])} L${n2(st[3][0])} ${n2(st[3][1])} L${n2(st[2][0])} ${n2(st[2][1])} L${n2(st[1][0])} ${n2(22)}`;
  const back = (
    <g>
      {fabric ? (
        <Dropped id={`${uid}-fab`} dy={DROP * drop} color={dc}>
          {/* seat panel */}
          <path d="M-70 -104 H270 V258 Q270 300 228 300 H-28 Q-70 300 -70 258 Z" fill={PAL.denimDeep} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          {/* waistband */}
          <path d={`M-70 -104 H270 V-66 H-70 Z`} fill={PAL.denim} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          <path d="M-62 -96 H262" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          <path d="M-62 -74 H262" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          {/* belt loop */}
          <rect x={22} y={-110} width={20} height={52} rx={6} fill={PAL.denim} stroke={C.ink} strokeWidth={2.5} />
          <path d="M32 -102 V-66" stroke={thread} strokeWidth={1.8} strokeDasharray="5 4" strokeLinecap="round" />
          {/* yoke: slopes down toward the centre-back seam, double stitched */}
          <path d="M-70 -40 Q100 -36 246 -8" fill="none" stroke={PAL.denimDark} strokeWidth={2.5} />
          <path d="M-70 -32 Q100 -28 246 0" fill="none" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          <path d="M-70 -24 Q100 -20 246 8" fill="none" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          {/* centre-back seam */}
          <path d="M246 -66 V300" stroke={PAL.denimDark} strokeWidth={2.5} />
          <path d="M254 -60 V272" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          <path d="M261 -60 V266" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
        </Dropped>
      ) : null}
      {/* inside of the opening */}
      <rect x={4} y={-3} width={192} height={9} rx={4.5} fill={mix(PAL.denimDark, C.ink, 0.45)} />
    </g>
  );
  const front = (
    <Dropped id={uid} dy={DROP * 0.75 * drop} color={dc}>
      <path d={pocketD} fill={PAL.denim} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
      {/* hem: a folded band with two rows of stitching */}
      <path d={`M${OUT} 22 H${200 - OUT}`} stroke={PAL.denimDeep} strokeWidth={2.5} />
      <path d={`M10 8 H190`} stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
      <path d={`M10 15 H190`} stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
      <path d={stitchD} fill="none" stroke={thread} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
      {[
        [9, 11],
        [191, 11],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={5.2} fill={C.lemon} stroke={C.ink} strokeWidth={2} />
          <circle cx={x} cy={y} r={1.6} fill={C.ink} />
        </g>
      ))}
    </Dropped>
  );
  return (
    <PropSvg w={POCKET.w} h={POCKET.h} scale={scale} style={style}>
      {part !== "front" ? back : null}
      {part !== "back" ? front : null}
    </PropSvg>
  );
}
