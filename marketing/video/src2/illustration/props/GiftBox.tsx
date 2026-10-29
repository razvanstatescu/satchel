import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { DROP, Dropped, dropColor, K, mix, n2, OUT, PropSvg, roundedPoly, useUid } from "./kit";

/**
 * GiftBox: the P6a gift (Satchel #12 rises out of it). Lemon box, coral ribbon and bow, ink outlines, hard drops on the
 * box and the lid. `open` pops the lid up and off to the left; the dark opening appears above the box front.
 * For a card rising out of the box, render three layers at the same position/scale:
 *     <GiftBox part="back" open={o}/>  →  card  →  <GiftBox part="front" open={o}/>
 * ("back" = the opening; "front" = box front, ribbon and the lid, so the lid stays on top).
 *
 * Props
 *   open    0..1+  default 0 (closed). 1 = lid up and tilted; values > 1 overshoot further (springs are fine)
 *   box     string default C.lemon
 *   ribbon  string default C.brand (coral). Pass C.sky when a coral card band shares the frame and you want one coral.
 *   part    "all" | "back" | "front"  default "all"
 *   scale   number default 2. Box GIFT.w × GIFT.h = 200 × 196 UI (lid top at y 44; the bow rises to y ≈ 14)
 *   drop    number default 1; night boolean; style on the root <svg>
 * GIFT.mouth = { x, y, w } is the opening (UI units) a card rises from.
 */
export const GIFT = { w: 200, h: 196, mouth: { x: 18, y: 74, w: 164 } } as const;

export interface GiftBoxProps {
  open?: number;
  box?: string;
  ribbon?: string;
  part?: "all" | "back" | "front";
  scale?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function GiftBox({ open = 0, box = C.lemon, ribbon = C.brand, part = "all", scale = K, drop = 1, night = false, style }: GiftBoxProps) {
  const uid = useUid("gift");
  const o = Math.max(0, open);
  const dc = dropColor(night);
  const boxDeep = mix(box, C.ink, 0.2);
  const ribbonDeep = mix(ribbon, C.ink, 0.22);
  // lid: up, left and tilted; pivot at the lid centre
  const lidDx = -40 * o;
  const lidDy = -62 * o;
  const lidRot = -21 * o;
  const back = (
    <g>
      {/* the opening, seen a little from above: back rim + dark inside (hidden by the lid when closed) */}
      <rect x={14} y={60} width={172} height={20} rx={7} fill={boxDeep} stroke={C.ink} strokeWidth={OUT} />
      <rect x={22} y={66} width={156} height={14} rx={5} fill={C.ink} />
    </g>
  );
  const body = (
    <Dropped id={`${uid}-b`} dy={DROP * drop} color={dc}>
      <rect x={10 + OUT / 2} y={74} width={180 - OUT} height={122 - OUT / 2} rx={10} fill={box} stroke={C.ink} strokeWidth={OUT} />
      <rect x={88} y={74 + OUT / 2} width={24} height={122 - OUT} fill={ribbon} stroke={C.ink} strokeWidth={2.5} />
    </Dropped>
  );
  const bowLoop = (s: number) =>
    `M100 44 C${100 + s * 8} ${18} ${100 + s * 46} ${6} ${100 + s * 46} ${27} C${100 + s * 46} ${43} ${100 + s * 18} ${46} 100 44 Z`;
  const tail = (s: number) =>
    roundedPoly(
      [
        [100 + s * 2, 46],
        [100 + s * 12, 46],
        [100 + s * 24, 70],
        [100 + s * 16, 66],
        [100 + s * 12, 74],
      ],
      2,
    );
  const lid = (
    <g transform={`translate(${n2(lidDx)} ${n2(lidDy)}) rotate(${n2(lidRot)} 100 62)`}>
      <Dropped id={`${uid}-l`} dy={DROP * drop} color={dc}>
        <rect x={OUT / 2} y={44} width={200 - OUT} height={36} rx={9} fill={box} stroke={C.ink} strokeWidth={OUT} />
        <rect x={88} y={44 + OUT / 2} width={24} height={36 - OUT} fill={ribbon} stroke={C.ink} strokeWidth={2.5} />
        {/* bow */}
        <path d={tail(-1)} fill={ribbon} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={tail(1)} fill={ribbon} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={bowLoop(-1)} fill={ribbon} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
        <path d={bowLoop(1)} fill={ribbon} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
        <path d={`M${100 - 26} 26 C${100 - 20} 20 ${100 - 13} 25 ${100 - 9} 35`} fill="none" stroke={ribbonDeep} strokeWidth={2.4} strokeLinecap="round" />
        <path d={`M${100 + 26} 26 C${100 + 20} 20 ${100 + 13} 25 ${100 + 9} 35`} fill="none" stroke={ribbonDeep} strokeWidth={2.4} strokeLinecap="round" />
        <rect x={92} y={36} width={16} height={15} rx={5.5} fill={ribbon} stroke={C.ink} strokeWidth={OUT} />
      </Dropped>
    </g>
  );
  return (
    <PropSvg w={GIFT.w} h={GIFT.h} scale={scale} style={style}>
      {part !== "front" && o > 0.001 ? back : null}
      {part !== "back" ? (
        <>
          {body}
          {lid}
        </>
      ) : null}
    </PropSvg>
  );
}
