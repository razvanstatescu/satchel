import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { FacedCoinGroup } from "./CoinSticker";
import { DROP, Dropped, dropColor, K, mix, n2, OUT, PAL, PropSvg, useUid } from "./kit";

/**
 * NearStack: NEAR as money (P6 offers, T4–T7 prices in NEAR): columns of stacked mint coins seen edge-on, with one
 * faced NEAR coin (the app's mint coin, as in CoinSticker chain="near") leaning on the front. No number on screen:
 * the amount lives in the tag or offer sticker beside it.
 *
 * Props
 *   columns  number[]  default [4, 6, 3]: coins per column, left → right
 *   face     boolean   default true: the faced coin leaning on the front of the first column
 *   smile    number    default 1: its smile (1 brand smile, 1.6 grin, 0 flat)
 *   scale    number    default 2. Box = columns·(COIN_W + 6) − 6 wide × (tallest·EDGE + 6) UI; `nearStackSize()` gives it
 *   drop     number    default 1; night boolean; style on the root <svg> (the box's bottom is the surface it sits on)
 */
const COIN_W = 86;
const BAR_H = 18;
const EDGE = 13; // rise per coin (bars overlap by BAR_H − EDGE)
const GAP = 6;

export function nearStackSize(columns: number[] = [4, 6, 3]) {
  const tallest = Math.max(1, ...columns);
  return { w: columns.length * (COIN_W + GAP) - GAP, h: (tallest - 1) * EDGE + BAR_H };
}

export interface NearStackProps {
  columns?: number[];
  face?: boolean;
  smile?: number;
  scale?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function NearStack({ columns = [4, 6, 3], face = true, smile = 1, scale = K, drop = 1, night = false, style }: NearStackProps) {
  const uid = useUid("near");
  const { w: W, h: H } = nearStackSize(columns);
  const dc = dropColor(night);
  const light = mix(PAL.mint, C.white, 0.5);
  const deep = mix(PAL.mint, C.ink, 0.3);
  const jitter = [0, -3, 2, -1, 3, -2, 1, -3, 2];
  const coinD = 76; // the faced coin's diameter (UI)
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dc}>
        {columns.map((n, ci) => {
          const x0 = ci * (COIN_W + GAP);
          return (
            <g key={ci}>
              {Array.from({ length: n }, (_, i) => {
                const y = H - BAR_H - i * EDGE;
                const x = x0 + jitter[(i + ci * 3) % jitter.length];
                return (
                  <g key={i}>
                    <rect x={x + OUT / 2} y={y + OUT / 2} width={COIN_W - OUT} height={BAR_H - OUT} rx={(BAR_H - OUT) / 2} fill={PAL.mint} stroke={C.ink} strokeWidth={OUT} />
                    {/* the reeded edge: a light lip and three ticks */}
                    <path d={`M${x + 12} ${y + 6} H${x + COIN_W - 12}`} stroke={light} strokeWidth={2.4} strokeLinecap="round" />
                    {[0.3, 0.5, 0.7].map((t) => (
                      <path key={t} d={`M${n2(x + COIN_W * t)} ${y + 9.5} v3.5`} stroke={deep} strokeWidth={1.8} strokeLinecap="round" />
                    ))}
                  </g>
                );
              })}
            </g>
          );
        })}
      </Dropped>
      {face ? (
        <g transform={`translate(${n2(-coinD * 0.18)} ${n2(H - coinD + 2)}) rotate(-9 ${coinD / 2} ${coinD})`}>
          <Dropped id={`${uid}-f`} dy={DROP * drop} color={dc}>
            <g transform={`scale(${n2((coinD / 140) * 1000) / 1000})`}>
              <FacedCoinGroup fill={PAL.mint} face={{ smile }} />
            </g>
          </Dropped>
        </g>
      ) : null}
    </PropSvg>
  );
}
