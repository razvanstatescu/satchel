// brand2/HandOff.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, EASE2, SPRING2 } from "./motion";
import { stickerStyle } from "./Sticker";
import { C } from "./tokens";

/**
 * The hand-off, "the swing" of concepts-v2 §4.1, on one clock (30 fps):
 *   f0–6    lift: the card rises 12 px (its hard shadow stays on the ground), scales to 1.04 and leans 10° into
 *           the direction of travel (SPRING2.land)
 *   f6–24   slide 600 ms (cubic in-out) on a shallow arc whose apex (f15) carries the charm-jingle; the pendulum,
 *           released at the 10° lean, runs 10° → -4.9° (f12) → +2.4° (f18) → -1.2° (f24) (SPRING2.handoff)
 *   f24–27  set down (ease-in); contact f27 = sticker-slap; squash 4%; the shadow returns to rest; residue cancelled
 * The charms ride at 1.5× the card's angle, 2 f (SOL, ETH) or 3 f (BTC) late, eyes closed from f6 to f27.
 */
export const HANDOFF = { liftEnd: 6, slideStart: 6, apex: 15, slideEnd: 24, contact: 27 } as const;

export const handoffAt = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }) => {
  const T = HANDOFF;
  const dir = Math.sign(o.toX - o.fromX) || 1;
  const p = interpolate(frame, [T.slideStart, T.slideEnd], [0, 1], { ...clamp, easing: EASE2.swing });
  const up = spring({ frame, fps, config: SPRING2.land });
  const fall = interpolate(frame, [T.slideEnd, T.contact], [0, 1], { ...clamp, easing: EASE2.fall });
  const swing =
    frame < T.slideStart ? 10 * up : spring({ frame: frame - T.slideStart, fps, from: 10, to: 0, config: SPRING2.handoff });
  const settle = spring({ frame: frame - T.contact - 2, fps, config: SPRING2.rebound });
  return {
    x: o.fromX + (o.toX - o.fromX) * p,
    arcY: -0.08 * Math.abs(o.toX - o.fromX) * Math.sin(Math.PI * p), // apex mid-slide
    lift: frame < T.contact ? 12 * up - (12 + o.rest) * fall : -o.rest * (1 - settle),
    rotate: dir * swing * (1 - fall), // CSS degrees; positive leans the top toward +x
    scale: 1 + 0.04 * up * (1 - fall),
    squash: frame < T.contact ? 0 : 0.04 * (1 - spring({ frame: frame - T.contact - 1, fps, config: SPRING2.rebound })),
    eyesClosed: frame >= T.slideStart && frame < T.contact,
  };
};

/** A charm riding the hand-off: 1.5× the card's angle, lagF frames late (SOL 2, ETH 2, BTC 3). */
export const rideAngle = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }, lagF: number) =>
  1.5 * handoffAt(frame - lagF, fps, o).rotate;

/** The card on the hand-off clock (a plain sticker card here; in src2 wrap the shared SatchelCard the same way). */
export const HandOff: React.FC<{
  fromX: number;
  toX: number;
  y: number;
  w: number;
  h: number;
  rest: number;
  outline: number;
  children?: React.ReactNode;
}> = ({ fromX, toX, y, w, h, rest, outline, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = handoffAt(frame, fps, { fromX, toX, rest });
  return (
    <div
      style={{
        position: "absolute",
        left: m.x - w / 2,
        top: y + m.arcY - h / 2,
        width: w,
        height: h,
        ...stickerStyle({ fill: C.surface, outline, rest, radius: 28 * (w / 360), lift: m.lift }),
        rotate: `${m.rotate}deg`,
        transformOrigin: "50% -6%",
        scale: `${m.scale * (1 + m.squash)} ${m.scale * (1 - m.squash)}`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

