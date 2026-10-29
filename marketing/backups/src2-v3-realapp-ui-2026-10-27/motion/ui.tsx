import React from "react";
import { interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { C, FONT } from "./tokens";
import { clamp, EASE2, SPRING2 } from "./motion";
import { stickerStyle } from "./Sticker";

/**
 * Button press: down in 3 f (ease-in) so it is fully pressed ON `at` (the thock SFX frame), held on at, at+1,
 * at+2, released with SPRING2.rebound (it pops 18% of the travel above rest, then settles). Coral → coral-deep.
 */
export const pressAt = (f: number, at: number, rest: number, fps: number) => {
  if (f < at) {
    const p = interpolate(f, [at - 3, at], [0, 1], { ...clamp, easing: EASE2.fall });
    return { lift: -rest * p, pressed: p };
  }
  const r = spring({ frame: f - at - 2, fps, config: SPRING2.rebound });
  return { lift: -rest * (1 - r), pressed: Math.max(0, 1 - r) };
};

export const PrimaryButton: React.FC<{ label: string; at: number; k?: number }> = ({ label, at, k = 2.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rest = Math.round(4 * k);
  const { lift, pressed } = pressAt(frame, at, rest, fps);
  return (
    <div
      style={{
        ...stickerStyle({ fill: interpolateColors(pressed, [0, 1], [C.coral, C.coralDeep]), outline: Math.round(2 * k), rest, radius: 18 * k, lift }),
        padding: `${13 * k}px ${28 * k}px`,
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: 16 * k,
        color: C.ink, // ink on coral (5.7:1). Never white text on coral.
      }}
    >
      {label}
    </div>
  );
};

/** Toggle: the knob travels on SPRING2.quick and stretches like a jelly bean mid-travel; colour uses the fade spring. */
export const Toggle: React.FC<{ at: number; k?: number; onColor?: string }> = ({ at, k = 2.5, onColor = C.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = 52 * k;
  const h = 32 * k;
  const knob = 24 * k;
  const pad = (h - knob) / 2;
  const p = spring({ frame: frame - at, fps, config: SPRING2.quick });
  const c = spring({ frame: frame - at, fps, config: SPRING2.fade });
  const stretch = 1 + 0.28 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: h, background: interpolateColors(c, [0, 1], [C.sunken, onColor]), border: `${Math.round(2 * k)}px solid ${C.ink}`, boxSizing: "border-box" }}>
      <div
        style={{
          position: "absolute",
          top: pad - 2 * k,
          left: pad - 2 * k + p * (w - h),
          width: knob,
          height: knob,
          borderRadius: knob,
          background: C.surface,
          border: `${Math.round(2 * k)}px solid ${C.ink}`,
          boxSizing: "border-box",
          scale: `${stretch} ${1 / stretch}`,
        }}
      />
    </div>
  );
};

/** Status pill swap: width springs (land) between the two labels, the old label rolls up and out, the new rolls in. */
export const PillSwap: React.FC<{
  from: { label: string; color: string };
  to: { label: string; color: string };
  at: number;
  k?: number;
}> = ({ from, to, at, k = 2.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontSize = 13 * k;
  const text = { fontFamily: FONT.sans, fontWeight: 600, fontSize } as const;
  const wA = measureText({ text: from.label, ...text }).width;
  const wB = measureText({ text: to.label, ...text }).width;
  const s = spring({ frame: frame - at, fps, config: SPRING2.land });
  const out = interpolate(frame, [at, at + 6], [0, -110], { ...clamp, easing: EASE2.fall });
  const inn = interpolate(frame, [at + 2, at + 10], [110, 0], { ...clamp, easing: EASE2.out });
  const color = interpolateColors(spring({ frame: frame - at, fps, config: SPRING2.fade }), [0, 1], [from.color, to.color]);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 * k, padding: `${6 * k}px ${12 * k}px`, borderRadius: 999, background: C.sunken, color, ...text }}>
      <span style={{ width: 8 * k, height: 8 * k, borderRadius: 999, background: color }} />
      <span style={{ position: "relative", height: "1.25em", width: interpolate(s, [0, 1], [wA, wB]), overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, translate: `0 ${out}%`, whiteSpace: "nowrap" }}>{from.label}</span>
        <span style={{ position: "absolute", left: 0, translate: `0 ${inn}%`, whiteSpace: "nowrap" }}>{to.label}</span>
      </span>
    </div>
  );
};
