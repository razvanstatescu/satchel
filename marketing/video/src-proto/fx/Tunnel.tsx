import React from "react";
import { AbsoluteFill, random } from "remotion";
import { integrate } from "../lib/seed";

/**
 * (f) Z-tunnel: `count` cards on a helix around the camera axis, flying toward the camera and wrapping to the far
 * end (an endless doomscroll). Plain CSS 3D, no WebGL: every card shares the screen centre as its transform origin, so
 * perspective() inside each transform gives one common vanishing point, and zIndex = depth sorts them explicitly.
 *
 * Deterministic: positions come from random(seed + i); the distance travelled is the integral of `speed`, so a
 * speed ramp is just a different speed curve (no easing on a time remap).
 * Readability: cards fade in from the fog (no pop), never rotate more than ~30°, and the nearest are big enough to
 * read for 4–6 frames before they leave the frame.
 */
export type TunnelProps = {
  frame: number;
  width: number;
  height: number;
  renderCard: (index: number) => React.ReactNode; // a CARD_W × CARD_H node (DOM card or <Img>)
  cardW: number;
  cardH: number;
  count?: number;
  depth?: number; // px of tunnel
  near?: number; // closest z (px toward the camera) before wrapping
  perspective?: number;
  radius?: readonly [number, number];
  cardScale?: number;
  speed?: (f: number) => number; // px per frame along z
  seed?: string;
  /** progress offset (0..1) so the tunnel starts full instead of empty */
  phase?: number;
};

export const tunnelSpeedRamp = (f: number) => 40 + 260 * Math.pow(Math.min(1, f / 60), 2);

export type TunnelCard = { i: number; idx: number; x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number; fog: number; screenScale: number };

export const tunnelLayout = (p: Omit<TunnelProps, "renderCard">): TunnelCard[] => {
  const {
    frame,
    count = 12,
    depth = 4600,
    near = 650,
    perspective = 900,
    radius = [380, 760] as const,
    speed = tunnelSpeedRamp,
    seed = "tunnel",
    phase = 0.15,
  } = p;
  const travel = integrate(frame, speed);
  const out: TunnelCard[] = [];
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * (i * 0.381966 + 0.08 * random(`${seed}-th${i}`));
    const r = radius[0] + (radius[1] - radius[0]) * random(`${seed}-r${i}`);
    const x = Math.cos(theta) * r * 1.3;
    const y = Math.sin(theta) * r * 0.72;
    const u = i / count + phase + travel / depth;
    const lap = Math.floor(u);
    const frac = u - lap;
    const z = -depth + near + frac * depth;
    const fog = Math.min(1, Math.max(0, (frac - 0.02) / 0.3));
    const rotY = (-x / 1100) * 30;
    const rotX = (y / 700) * 18;
    const rotZ = (random(`${seed}-rz${i}`) - 0.5) * 10;
    out.push({ i, idx: i + lap * count, x, y, z, rotX, rotY, rotZ, fog, screenScale: perspective / (perspective - z) });
  }
  return out.sort((a, b) => a.z - b.z);
};

export const Tunnel: React.FC<TunnelProps> = (props) => {
  const { width, height, renderCard, cardW, cardH, perspective = 900, cardScale = 0.62 } = props;
  const cards = tunnelLayout(props);
  return (
    // isolation: the depth zIndex values (≈100 000) must not leak out and paint over siblings (slams, captions)
    <AbsoluteFill style={{ overflow: "hidden", isolation: "isolate" }}>
      {cards.map((c) =>
        c.fog <= 0 || c.screenScale > 6 ? null : (
          <div
            key={c.i}
            style={{
              position: "absolute",
              left: width / 2 - cardW / 2,
              top: height / 2 - cardH / 2,
              width: cardW,
              height: cardH,
              transformOrigin: "50% 50%",
              transform: `perspective(${perspective}px) translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateY(${c.rotY}deg) rotateX(${c.rotX}deg) rotateZ(${c.rotZ}deg) scale(${cardScale})`,
              opacity: c.fog,
              zIndex: Math.round(c.z + 100000),
            }}
          >
            {renderCard(c.idx)}
          </div>
        ),
      )}
    </AbsoluteFill>
  );
};
