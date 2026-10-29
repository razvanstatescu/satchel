// brand2/fx.tsx
import React from "react";
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { makeSpark } from "@remotion/shapes";
import { C } from "./tokens";
import { clamp, SPRING2 } from "./motion";

/**
 * Lemon sparkles: 4-point sparks with an ink outline, popped around a point. 3–5 per burst, 16 f each,
 * staggered 2 f. Max 4 bursts in the film (mint, clean history, the hand-off landing, the end card).
 * Render inside an <svg> in frame pixels.
 */
export const SparkBurst: React.FC<{ x: number; y: number; radius: number; count?: number; seed: string; size?: number }> = ({
  x,
  y,
  radius,
  count = 4,
  seed,
  size = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const f = frame - 2 * i;
        const angle = (i / count) * Math.PI * 2 + random(`${seed}-a${i}`) * 0.9;
        const r = radius * (0.85 + 0.3 * random(`${seed}-r${i}`));
        const s = size * (0.7 + 0.5 * random(`${seed}-s${i}`));
        const grow = spring({ frame: f, fps, config: SPRING2.pop });
        const shrink = interpolate(f, [9, 16], [1, 0], clamp);
        const scale = Math.max(0, grow * shrink);
        const spark = makeSpark({ width: s, height: s, edgeRoundness: 1.1, cornerRadius: s * 0.04 });
        const px = x + Math.cos(angle) * r - s / 2;
        const py = y + Math.sin(angle) * r - s / 2;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${interpolate(f, [0, 16], [0, 30], clamp)} ${s / 2} ${s / 2}) translate(${(s / 2) * (1 - scale)} ${(s / 2) * (1 - scale)}) scale(${scale})`}>
            <path d={spark.path} fill={C.lemon} stroke={C.ink} strokeWidth={5 / Math.max(scale, 0.01)} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};

/** Flat confetti in lemon, sky and white with ink outlines (never coral). Deterministic, 32 f lifetime. */
export const Confetti: React.FC<{ x: number; y: number; count?: number; seed: string }> = ({ x, y, count = 18, seed }) => {
  const frame = useCurrentFrame();
  const colors = [C.lemon, C.sky, C.surface];
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const t = frame;
        const a = -Math.PI / 2 + (random(`${seed}-dir${i}`) - 0.5) * 1.8; // upward fan
        const v = 26 + 16 * random(`${seed}-v${i}`); // px per frame
        const g = 1.6; // px per frame^2
        const px = x + Math.cos(a) * v * t + 10 * Math.sin(t * 0.35 + i); // flutter
        const py = y + Math.sin(a) * v * t + 0.5 * g * t * t;
        const rot = t * (8 + 10 * random(`${seed}-rot${i}`));
        const alive = interpolate(t, [0, 1, 26, 32], [0, 1, 1, 0], clamp); // scale in/out, no opacity fades
        const fill = colors[i % colors.length];
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot}) scale(${alive})`}>
            {i % 3 === 0 ? (
              <circle r={8} fill={fill} stroke={C.ink} strokeWidth={4} />
            ) : (
              <rect x={-12} y={-7} width={24} height={14} rx={5} fill={fill} stroke={C.ink} strokeWidth={4} />
            )}
          </g>
        );
      })}
    </g>
  );
};

