// usage.tsx (B, G): a smeared sticker on a pan, and the impact thump
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE2, smear } from "./brand2/motion";

export const SmearMove: React.FC<{ fromX: number; toX: number; dur: number; children: React.ReactNode }> = ({ fromX, toX, dur, children }) => {
  const frame = useCurrentFrame();
  const xAt = (f: number) => interpolate(f, [0, dur], [fromX, toX], { ...clamp, easing: EASE2.pan });
  const { along, across } = smear(xAt(frame) - xAt(frame - 1)); // px per frame → stretch ≤ 1.25
  return <div style={{ position: "absolute", left: 0, top: 0, translate: `${xAt(frame)}px 0`, scale: `${along} ${across}` }}>{children}</div>;
};

export const Thump: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame - at, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });
  return <AbsoluteFill style={{ translate: `0 ${y}px` }}>{children}</AbsoluteFill>;
};

