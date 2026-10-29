// brand2/Charm.tsx
import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./tokens";
import { blinkSchedule, clamp, eyeOpen, SPRING2, swingFromRest, swingTrack } from "./motion";

// Geometry from illustration/satchel-charms-chains.svg, in its own units: coin r 64, outline 12, eyes r 9 at (±22, -6),
// smile M-16 18 Q0 32 16 18 (stroke 9), stem 12 × 40 from y -96 to -56 (rx 6). The swing pivot is the stem top.
export type Face = {
  open?: number; // 1 open … 0.12 closed (blinkAt / eyeOpen)
  lookX?: number; // -1 … 1: eyes move 6 units, the smile 60% of that (a flat coin that seems to turn)
  lookY?: number; // -1 … 1: 4 units
  smile?: number; // 0 flat (concern), 1 brand smile, 1.5 big smile. Never a frown, never teeth.
  squashY?: number; // 1 = none; 0.88 on a landing (scaleX compensates to keep the area)
};

export const ChainCharm: React.FC<Face & { fill: string; withStem?: boolean }> = ({
  fill,
  open = 1,
  lookX = 0,
  lookY = 0,
  smile = 1,
  squashY = 1,
  withStem = true,
}) => {
  const ex = 6 * lookX;
  const ey = 4 * lookY;
  const sx = 1 / squashY; // keep the area while squashing
  return (
    <g>
      {withStem ? <rect x={-6} y={-96} width={12} height={40} rx={6} fill={C.ink} /> : null}
      {/* squash about the coin's bottom edge (it lands on its bottom) */}
      <g transform={`translate(0 70) scale(${sx} ${squashY}) translate(0 -70)`}>
        <circle r={64} fill={fill} stroke={C.ink} strokeWidth={12} />
        <ellipse cx={-22 + ex} cy={-6 + ey} rx={9} ry={Math.max(1.6, 9 * open)} fill={C.ink} />
        <ellipse cx={22 + ex} cy={-6 + ey} rx={9} ry={Math.max(1.6, 9 * open)} fill={C.ink} />
        <path
          d={`M${-16 + 0.6 * ex} ${18 + 0.6 * ey} Q${0.6 * ex} ${18 + 14 * smile + 0.6 * ey} ${16 + 0.6 * ex} ${18 + 0.6 * ey}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
};

const CHAINS = [
  { key: "btc", fill: C.btc, x: -160 },
  { key: "eth", fill: C.eth, x: 0 },
  { key: "sol", fill: C.sol, x: 160 },
] as const;

/**
 * The three chain charms on their bar. The bar slides in (barX, best on SPRING2.carry), the charms trail and
 * swing (secondary action) with their personalities: BTC period 27 f (0.9 s, zeta 0.35), ETH 21 f (0.7 s, 0.30),
 * SOL 13.5 f (0.45 s, 0.20); peak 12°. Eyes look where the swing goes next; blinks run on per-charm clocks;
 * cheerAt widens the smiles in reaction order (SOL, ETH +2 f, BTC +4 f).
 * Render it inside an <svg> whose viewBox holds the illustration units, e.g. viewBox="-260 -150 520 260".
 */
const PERSONALITY = [
  { periodF: 27, zeta: 0.35, lag: 4 }, // BTC
  { periodF: 21, zeta: 0.3, lag: 2 }, // ETH
  { periodF: 13.5, zeta: 0.2, lag: 0 }, // SOL
];

export const CharmBar: React.FC<{ barX: (f: number) => number; frames?: number; cheerAt?: number }> = ({
  barX,
  frames = 120,
  cheerAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tracks = useMemo(() => PERSONALITY.map(({ periodF, zeta }) => swingTrack(barX, frames, { periodF, zeta, peakDeg: 12 })), [frames]);
  return (
    <g transform={`translate(${barX(frame)} 0)`}>
      <rect x={-220} y={-130} width={440} height={22} rx={11} fill={C.ink} />
      {CHAINS.map((c, i) => {
        const deg = tracks[i][Math.min(frame, frames - 1)] ?? 0;
        const lag = PERSONALITY[i].lag;
        const forced = cheerAt === undefined ? [] : [cheerAt + lag];
        const open = eyeOpen(frame, blinkSchedule(c.key, 20, 900, forced));
        const look = interpolate(deg, [-12, 12], [-1, 1], clamp); // eyes look where the swing goes next
        const cheer = cheerAt === undefined ? 0 : spring({ frame: frame - cheerAt - lag, fps, config: SPRING2.pop });
        return (
          <g key={c.key} transform={`translate(${c.x} 0) rotate(${deg} 0 -96)`}>
            <ChainCharm fill={c.fill} open={open} lookX={look} smile={1 + 0.5 * cheer} />
          </g>
        );
      })}
    </g>
  );
};

/** A single "pluck": the charm is tapped and swings from 10° to rest in 600 ms. */
export const PluckedCharm: React.FC<{ fill: string; at: number }> = ({ fill, at }) => {
  const frame = useCurrentFrame();
  const deg = frame < at ? 0 : swingFromRest(frame - at, 10, 10, 18);
  return (
    <g transform={`rotate(${deg} 0 -96)`}>
      <ChainCharm fill={fill} open={eyeOpen(frame, [at + 1])} lookX={interpolate(deg, [-10, 10], [-1, 1], clamp)} />
    </g>
  );
};

