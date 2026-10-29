// brand2/ink.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { clamp, EASE2, SPRING2 } from "./motion";

/** An ink line that draws itself: round caps and joins, nothing rendered at progress 0 (no stray cap dot). */
export const DrawOn: React.FC<{ d: string; progress: number; width: number; color?: string }> = ({
  d,
  progress,
  width,
  color = C.ink,
}) => {
  if (progress <= 0.001) return null;
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.min(1, progress), d);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};

/** A check mark in a 100 × 100 box: drawn in 8 f, then the whole mark pops 15% (SPRING2.pop). */
export const CheckMark: React.FC<{ size: number; color?: string }> = ({ size, color = C.success }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, 8], [0, 1], { ...clamp, easing: EASE2.out });
  const pop = 1 + 0.15 * (1 - spring({ frame: frame - 8, fps, config: SPRING2.pop })) * (frame >= 8 ? 1 : 0);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible", scale: `${pop}` }}>
      <DrawOn d="M22 54 L42 72 L78 32" progress={p} width={12} color={color} />
    </svg>
  );
};

