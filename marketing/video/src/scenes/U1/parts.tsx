import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img } from "remotion";
import { C, CHAIN, F, type Chain } from "../../brand/tokens";
import { Avatar } from "../../components/product";
import { EASE, tween } from "../../lib/time";
import { bric, clamp01, lerp, MaskLine, plate } from "./kit";

/**
 * A full-bleed photo plate with a slow push (≤ 1.5 %/s) and a rack focus: `focus` 0 = the photo is the subject,
 * 1 = the product UI is (the plate softens to 4.5 px and dims to 60 %). `children` live in plate space (they push, blur
 * and dim with the photo, e.g. ink written on the gift tag). Falls back to a key-lit ground while a plate is missing.
 */
export function Plate({
  name,
  frame,
  t0,
  t1,
  focus,
  origin,
  scale = [1.04, 1.09],
  children,
}: {
  name: string;
  frame: number;
  t0: number;
  t1: number;
  focus: number;
  origin: string;
  scale?: [number, number];
  children?: ReactNode;
}) {
  const src = plate(name);
  const k = tween(frame, t0, t1, 0, 1, EASE.standard);
  const sc = lerp(scale[0], scale[1], k);
  const fo = clamp01(focus);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.ground }}>
      <AbsoluteFill
        style={{
          transform: `scale(${sc})`,
          transformOrigin: origin,
          filter: fo > 0.005 ? `blur(${(4.5 * fo).toFixed(2)}px) brightness(${lerp(1, 0.6, fo).toFixed(3)})` : undefined,
        }}
      >
        {src ? (
          <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} />
        ) : (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 70% 65% at 70% 55%, rgba(106,71,48,0.45) 0%, rgba(67,44,31,0.2) 40%, rgba(23,16,12,0) 75%)`,
            }}
          />
        )}
        {children}
      </AbsoluteFill>
      {/* legibility for the headline corner (the plates are already near-black there) */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(14,9,6,0.5) 0%, rgba(14,9,6,0) 40%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(14,9,6,0.45) 0%, rgba(14,9,6,0) 42%)" }} />
    </AbsoluteFill>
  );
}

/** The kinetic line: each line rises out of its mask while Bricolage settles from condensed/heavy to full width. */
export function Headline({
  frame,
  lines,
  size = 140,
  top = 150,
  left = 150,
  lineGap = 1.0,
}: {
  frame: number;
  lines: { text: string; at: number }[];
  size?: number;
  top?: number;
  left?: number;
  lineGap?: number;
}) {
  return (
    <div style={{ position: "absolute", left, top, fontSize: size, lineHeight: lineGap, letterSpacing: "-0.035em", color: C.ink }}>
      {lines.map((ln, i) => {
        const p = tween(frame, ln.at, ln.at + 0.5, 0, 1, EASE.expoOut);
        const settle = tween(frame, ln.at, ln.at + 0.85, 0, 1, EASE.quintOut);
        return (
          <MaskLine key={i} p={p}>
            <div style={{ ...bric(lerp(800, 730, settle), lerp(80, 100, settle)), whiteSpace: "nowrap" }}>{ln.text}</div>
          </MaskLine>
        );
      })}
    </div>
  );
}

/** "To  (S)  sam.near": the receiving account, product Avatar + mono account id. */
export function ToRow({ account, p, x, y, avatar = 84 }: { account: string; p: number; x: number; y: number; avatar?: number }) {
  const q = clamp01(p);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: q,
        transform: `translateY(${(1 - q) * 22}px)`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: C.inkMuted }}>To</span>
      <Avatar account={account} size={avatar} />
      <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 50, color: C.ink, letterSpacing: "-0.01em" }}>{account}</span>
    </div>
  );
}

/** Amounts with their chain dots ("● 0.40 BTC  ● 2.00 ETH"): chain colours as small accents only. */
export function Holdings({ items, size = 40, style }: { items: { chain: Chain; text: string }[]; size?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.7,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: size,
        color: C.ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {items.map((it) => (
        <span key={it.chain} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3 }}>
          <span style={{ width: size * 0.32, height: size * 0.32, borderRadius: 99, background: CHAIN[it.chain].color, display: "inline-block" }} />
          {it.text}
        </span>
      ))}
    </div>
  );
}

/** Horizontal speed (px/frame) of a position function around frame f, for velocity-driven smear. */
export const speed = (x: (f: number) => number, f: number) => Math.abs(x(f + 1) - x(f - 1)) / 2;
