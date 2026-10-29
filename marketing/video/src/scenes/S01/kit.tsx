// Helpers shared by scene builder A's scenes (S01, S02, S06, S09). Lives in S01's folder by ownership rules.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import imagesJson from "../../data/images.json";
import sfxJson from "../../data/sfx.json";
import { C, CHAIN, F, type Chain } from "../../brand/tokens";
import type { SceneData } from "../../lib/timeline";
import { EASE, FPS } from "../../lib/time";

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bricolage with all three axes set explicitly (font-variation-settings would otherwise fight font-weight). */
export const bric = (wght: number, wdth = 100, opsz = 96): CSSProperties => ({
  fontFamily: F.display,
  fontWeight: Math.round(wght),
  fontStretch: `${wdth}%`,
  fontVariationSettings: `"wght" ${wght.toFixed(1)}, "opsz" ${opsz.toFixed(1)}, "wdth" ${wdth.toFixed(1)}`,
});

/** Public path of a catalogued photo plate, or null while it doesn't exist yet (scenes fall back to code). */
export function plate(name: string): string | null {
  const cat = imagesJson as unknown as Record<string, unknown>;
  const e = cat[name];
  if (!e) return null;
  let p: unknown = e;
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    p = o.file ?? o.path ?? o.src ?? null;
  }
  if (typeof p !== "string" || !p) return null;
  return staticFile(p.replace(/^\/?(public\/)?/, ""));
}

/** The first of `names` that exists in the SFX library (lets a scene prefer a new sound and fall back meanwhile). */
export function pickSfx(...names: string[]): string {
  const cat = sfxJson as unknown as Record<string, unknown>;
  return names.find((n) => cat[n]) ?? names[names.length - 1];
}

/** Night ground with a warm key light raking from the upper left (code fallback for the leather plates). */
export function KeyLitGround({ plateName, plateOpacity = 0.32, dx = 0, dy = 0, scale = 1.08, light = 0.3 }: { plateName?: string; plateOpacity?: number; dx?: number; dy?: number; scale?: number; light?: number }) {
  const src = plateName ? plate(plateName) : null;
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      {src ? (
        <Img
          src={src}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: plateOpacity,
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          transform: `translate(${dx * 0.6}px, ${dy * 0.6}px)`,
          background: `radial-gradient(ellipse 70% 65% at 24% 10%, rgba(106,71,48,${light}) 0%, rgba(67,44,31,${light * 0.45}) 38%, rgba(23,16,12,0) 72%)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0) 50%, rgba(8,5,3,0.55) 100%)" }} />
    </AbsoluteFill>
  );
}

/** Simple geometric chain marks, drawn in the chain colour (accent only). */
export function ChainMark({ chain, size }: { chain: Chain; size: number }) {
  const col = CHAIN[chain].color;
  if (chain === "btc") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        <circle cx={50} cy={50} r={48} fill={col} />
        <g transform="rotate(14 50 50)">
          <rect x={41} y={16} width={5} height={14} rx={1.5} fill={C.ground} />
          <rect x={53} y={16} width={5} height={14} rx={1.5} fill={C.ground} />
          <rect x={41} y={70} width={5} height={14} rx={1.5} fill={C.ground} />
          <rect x={53} y={70} width={5} height={14} rx={1.5} fill={C.ground} />
          <text x={51} y={52} textAnchor="middle" dominantBaseline="central" fontFamily={F.display} fontWeight={800} fontSize={58} fill={C.ground}>
            B
          </text>
        </g>
      </svg>
    );
  }
  if (chain === "evm") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        <polygon points="50,2 80,51 50,69 20,51" fill={col} />
        <polygon points="50,2 50,69 20,51" fill={C.ground} opacity={0.22} />
        <polygon points="50,75 80,57 50,98 20,57" fill={col} />
        <polygon points="50,75 50,98 20,57" fill={C.ground} opacity={0.22} />
      </svg>
    );
  }
  // Solana: three slanted bars, the middle one reversed.
  const bar = (y: number, flip: boolean) =>
    flip ? `${4},${y} ${78},${y} ${96},${y + 18} ${22},${y + 18}` : `${22},${y} ${96},${y} ${78},${y + 18} ${4},${y + 18}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <polygon points={bar(12, false)} fill={col} />
      <polygon points={bar(41, true)} fill={col} />
      <polygon points={bar(70, false)} fill={col} />
    </svg>
  );
}

/** Middle-truncated address ("bc1qtf…rjcwy5"). */
export const shortAddr = (a: string, head = 6, tail = 6) => `${a.slice(0, head)}…${a.slice(-tail)}`;

/**
 * The saddle stitch sewing itself ONE STITCH AT A TIME along an SVG path (cookbook T17, progress-driven).
 * `progress` 0..1; negative direction (unpicking) is just a falling progress. Use only for ownership.
 */
export function SewPath({
  d,
  id,
  progress,
  dash = [12, 9],
  width = 4,
  color = C.brandBright,
  opacity = 0.9,
  needle = true,
}: {
  d: string;
  id: string;
  progress: number;
  dash?: [number, number];
  width?: number;
  color?: string;
  opacity?: number;
  needle?: boolean;
}) {
  if (progress <= 0) return null;
  const len = getLength(d);
  const pitch = dash[0] + dash[1];
  const p = clamp01(progress);
  const sewn = Math.min(len, Math.ceil((p * len) / pitch) * pitch);
  const reveal = evolvePath(Math.max(0.0001, sewn / len), d);
  const tip = getPointAtLength(d, Math.max(0, Math.min(len, p * len)));
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={10000} height={10000}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={width * 4} strokeDasharray={reveal.strokeDasharray} strokeDashoffset={reveal.strokeDashoffset} />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeDasharray={dash.join(" ")} strokeLinecap="round" mask={`url(#${id})`} />
      {needle && p > 0 && p < 1 && tip ? <circle cx={tip.x} cy={tip.y} r={width * 0.95} fill={C.ink} opacity={0.9} /> : null}
    </g>
  );
}

/** A circular path (for stitch rings), starting at 12 o'clock, clockwise. */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;

/** First local frame at which a spring reaches 1 (the "landing" frame, where impacts belong). */
export function landingFrame(config: { stiffness: number; damping: number; mass: number }) {
  for (let f = 0; f < 90; f++) {
    if (spring({ frame: f, fps: FPS, config }) >= 0.999) return f;
  }
  return 12;
}

/** Times (relative to the scene) of every word of a line whose text matches `word` (case/punctuation-insensitive). */
export function wordTimes(sc: SceneData, lineId: string, word: string): number[] {
  const l = sc.line(lineId);
  const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9#']/g, "");
  return l.words.filter((w) => clean(w.text) === clean(word)).map((w) => l.start + w.start);
}

/** Masked line reveal (cookbook T07): the line rises out of its own mask. `p` 0..1. */
export function MaskLine({ p, children, style }: { p: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 112}%)` }}>{children}</div>
    </div>
  );
}

export const ease = (frame: number, a: number, b: number, easing = EASE.expoOut) =>
  interpolate(frame, [a, b], [0, 1], { ...CLAMP, easing });
