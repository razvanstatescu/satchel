// brand2/StickerS.tsx
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { clamp, EASE2, slapAt, SPRING2 } from "./motion";

// The S centreline, verbatim from logo/satchel-mark.svg (viewBox 0 0 512 512). The mark is three strokes of it:
// shadow (ink, 92 wide, translated 10 down), outline (ink, 92), face (white, 56). All round caps.
export const S_PATH =
  "M330 184 C330 154 300 138 256 138 C206 138 182 162 182 194 C182 230 214 242 256 252 C298 262 330 274 330 310 C330 344 302 364 256 364 C210 364 182 348 180 316";

const SStroke: React.FC<{ p: number; color: string; width: number; dy?: number }> = ({ p, color, width, dy = 0 }) => {
  if (p <= 0.001) return null; // a zero-length round-capped dash can still paint a dot
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.min(1, p), S_PATH);
  return (
    <path
      d={S_PATH}
      transform={dy ? `translate(0 ${dy})` : undefined}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};

/**
 * The mark, built: the coral tile slaps in (f0, contact f4), the S is written top-right → bottom-left in ink
 * (f6–f24) with the white face 3 f behind it, then the S lifts off the tile and slaps back (f26–f38).
 * Ends pixel-exact on satchel-mark.svg: no rotation, the tile never changes colour, the shadow ends at 10 units.
 */
export const MarkBuild: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 1. tile: the whole mark squashes as one unit (never the S against the tile), max 5%
  const tile = slapAt(frame, fps, 0, { from: 1.22, squash: 0.05, drop: 0 });
  // 2. write the S: ink leads, face follows 3 f later
  const write = (start: number) =>
    interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ink = write(6);
  const face = write(9);
  // 3. the finished S pops off the tile and slaps back. sLift is in mark units: the S rises by sLift while its
  //    shadow stays on the tile (shadow dy = 10 + sLift), so the shadow never drops below 6 units.
  const sLift =
    frame < 30
      ? interpolate(frame, [26, 30], [0, 12], { ...clamp, easing: EASE2.out })
      : frame < 33
        ? interpolate(frame, [30, 33], [12, -4], { ...clamp, easing: EASE2.fall }) // contact on f33: slap SFX
        : -4 + 4 * spring({ frame: frame - 35, fps, config: SPRING2.rebound }); // held 2 f, then rebound
  const sScale = 1 + 0.004 * sLift;
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ overflow: "visible", opacity: tile.opacity, scale: `${tile.sx} ${tile.sy}` }}
    >
      <rect width={512} height={512} rx={112} fill={C.coral} />
      <g transform={`translate(256 256) scale(${sScale}) translate(-256 -256) translate(0 ${-sLift})`}>
        <SStroke p={ink} color={C.ink} width={92} dy={10 + sLift} />
        <SStroke p={ink} color={C.ink} width={92} />
        <SStroke p={face} color="#ffffff" width={56} />
      </g>
    </svg>
  );
};

