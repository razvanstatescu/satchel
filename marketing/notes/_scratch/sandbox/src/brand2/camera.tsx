import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE2 } from "./motion";

/**
 * 2.5D parallax of flat layers. depth 0.5 = far, 1 = subject, 1.4–1.6 = near (foreground stickers, charms).
 * Layers translate only (no perspective, no blur): a flat sticker world seen through a moving window.
 */
export const Parallax2D: React.FC<{
  layers: { node: React.ReactNode; depth: number }[];
  camX: (f: number) => number;
  camY?: (f: number) => number;
}> = ({ layers, camX, camY }) => {
  const frame = useCurrentFrame();
  const x = camX(frame);
  const y = camY ? camY(frame) : 0;
  return (
    <AbsoluteFill>
      {layers.map(({ node, depth }, i) => (
        <AbsoluteFill key={i} style={{ translate: `${-x * depth}px ${-y * depth}px` }}>
          {node}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

/** Slow drift on a hold (at most 2% scale per second) or a punch-in on a beat (1 → 1.12 in 8 f). */
export const PushIn: React.FC<{
  from?: number;
  to?: number;
  dur: number;
  focus?: string; // transform-origin, e.g. "62% 40%": the point that must not move
  punch?: boolean;
  children: React.ReactNode;
}> = ({ from = 1, to = 1.04, dur, focus = "50% 50%", punch = false, children }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [from, to], { ...clamp, easing: punch ? EASE2.out : EASE2.pan });
  return <AbsoluteFill style={{ scale: `${s}`, transformOrigin: focus }}>{children}</AbsoluteFill>;
};
