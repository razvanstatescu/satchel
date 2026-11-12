import React from "react";
import { AbsoluteFill } from "remotion";
import { stepRand, stepRandS } from "../lib/seed";

/**
 * (d) DOM slice glitch: the children are re-rendered once per DISPLACED band, each copy clipped to its band with
 * clip-path: inset() and shifted sideways. Cheap for an <Img>, expensive for a big DOM tree (cost × bands).
 * For a whole composed frame use the GL route (barrageLook slices) instead.
 *
 * What keeps it from looking like a preset: variable band heights (mostly thin slivers, one or two thick bands),
 * shifts snapped to a 6 px grid and biased to one side per hit, a few inverted stripes, and it HOLDS for 1–2 frames.
 */
export type SliceGlitchProps = {
  intensity: number; // 0..1
  frame: number;
  width: number;
  height: number;
  seed?: string;
  hold?: number; // frames per glitch pattern (1 = strobe, 2 = digital)
  maxShift?: number; // px at intensity 1
  invert?: boolean; // a few colour-inverted stripes (mix-blend-mode: difference)
  children: React.ReactNode;
};

type Band = { top: number; bottom: number; dx: number; inv: boolean };

export const sliceBands = (p: Omit<SliceGlitchProps, "children">): Band[] => {
  const { intensity: i, frame, width, height, seed = "slices", hold = 2, maxShift = 260, invert = true } = p;
  if (i <= 0) return [];
  const count = Math.round(3 + 9 * i + 4 * stepRand(seed, frame, hold, "n"));
  const bias = stepRandS(seed, frame, hold, "bias") > 0 ? 1 : -1; // most bands go the same way this hit
  const out: Band[] = [];
  for (let b = 0; b < count; b++) {
    const thick = stepRand(seed, frame, hold, `t${b}`) < 0.18;
    const h = thick ? 90 + 180 * stepRand(seed, frame, hold, `h${b}`) : 6 + 34 * stepRand(seed, frame, hold, `h${b}`);
    const top = stepRand(seed, frame, hold, `y${b}`) * (height - h);
    const dir = stepRand(seed, frame, hold, `d${b}`) < 0.75 ? bias : -bias;
    const mag = (0.25 + 0.75 * stepRand(seed, frame, hold, `m${b}`)) * maxShift * i;
    const dx = Math.round((dir * mag) / 6) * 6;
    const inv = invert && stepRand(seed, frame, hold, `i${b}`) < 0.12 * i;
    out.push({ top, bottom: top + h, dx: Math.max(-width, Math.min(width, dx)), inv });
  }
  return out;
};

export const SliceGlitch: React.FC<SliceGlitchProps> = (props) => {
  const { children, height } = props;
  const bands = sliceBands(props);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      {bands.map((b, k) => (
        <AbsoluteFill key={k} style={{ clipPath: `inset(${b.top}px 0 ${height - b.bottom}px 0)` }}>
          <AbsoluteFill style={{ translate: `${b.dx}px 0` }}>{children}</AbsoluteFill>
          {b.inv ? <AbsoluteFill style={{ background: "#fff", mixBlendMode: "difference" }} /> : null}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
