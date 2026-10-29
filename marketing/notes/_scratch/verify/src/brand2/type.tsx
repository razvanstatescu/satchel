// brand2/type.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./tokens";
import { clamp, EASE2, slapAt, SPRING2 } from "./motion";

// Funnel Display's variable file has one axis, wght 300–800 (no wdth, no opsz). Display type lands at 800.
// With a weight range declared in loadFont(), numeric fontWeight interpolates; it changes advance widths,
// so animate weight only on words that are centred in their own inline-block.

/** Words slap in one per `every` frames (15 = one beat at 120 BPM). Scale 1.28 → 1, squash on contact, ink-in. */
export const WordSlap: React.FC<{ text: string; every?: number; size?: number; color?: string }> = ({
  text,
  every = 15,
  size = 160,
  color = C.ink,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.24em", fontFamily: FONT.display, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.035em", color }}>
      {text.split(" ").map((word, i) => {
        const f = frame - i * every;
        const { sx, sy, opacity } = slapAt(f, fps, 0, { from: 1.28, squash: 0.06, drop: 0 });
        const weight = interpolate(f, [2, 9], [600, 800], { ...clamp, easing: EASE2.out }); // the ink fills in as it lands
        return (
          <span key={i} style={{ display: "inline-block", opacity, scale: `${sx} ${sy}`, transformOrigin: "50% 80%", fontWeight: weight }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** The reading workhorse: each line rises out of its own mask. 16 f per line, 3 f stagger, no bounce. */
export const LineRise: React.FC<{ lines: string[]; size?: number; weight?: number; font?: string; stagger?: number }> = ({
  lines,
  size = 64,
  weight = 600,
  font = FONT.sans,
  stagger = 3,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, lineHeight: 1.12, color: C.ink }}>
      {lines.map((line, i) => {
        const y = interpolate(frame, [i * stagger, i * stagger + 16], [110, 0], { ...clamp, easing: EASE2.out });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em" }}>
            <div style={{ translate: `0 ${y}%` }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** A lemon marker swipe behind a word (ink text on lemon is 12.5:1). Wipes left → right in 10 f. */
export const Marker: React.FC<{ children: React.ReactNode; at?: number }> = ({ children, at = 0 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: EASE2.out });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ position: "absolute", left: "-0.08em", right: "-0.08em", top: "18%", bottom: "4%", background: C.lemon, borderRadius: "0.16em", scale: `${p} 1`, transformOrigin: "0 50%" }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** Integer counter: tabular figures, every new integer pops 8% (put a pitched-up tick SFX on each change). */
export const Counter: React.FC<{ to: number; dur?: number; size?: number; suffix?: string }> = ({ to, dur = 24, size = 200, suffix = "" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const valueAt = (f: number) => Math.round(interpolate(f, [0, dur], [0, to], { ...clamp, easing: EASE2.out }));
  const n = valueAt(frame);
  let changedAt = frame; // walk back to the frame where this integer first showed
  while (changedAt > 0 && valueAt(changedAt - 1) === n) changedAt--;
  const pop = 1 + 0.08 * (1 - spring({ frame: frame - changedAt, fps, config: SPRING2.quick }));
  return (
    <span style={{ display: "inline-block", fontFamily: FONT.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: C.ink, scale: `${pop}` }}>
      {n}
      {suffix}
    </span>
  );
};

/** An account or address typed in Geist Mono: string slicing (never per-character opacity), 2 f per character. */
export const TypeOn: React.FC<{ text: string; perChar?: number; size?: number }> = ({ text, perChar = 2, size = 56 }) => {
  const frame = useCurrentFrame();
  const shown = text.slice(0, Math.max(0, Math.floor(frame / perChar)));
  const caretOn = Math.floor(frame / 8) % 2 === 0 || shown.length < text.length; // solid while typing, 16 f blink after
  return (
    <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: size, color: C.ink }}>
      {shown}
      <span style={{ opacity: caretOn ? 1 : 0 }}>|</span>
    </span>
  );
};

