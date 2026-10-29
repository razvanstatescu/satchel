// U1-local helpers (scene ownership: nothing here is imported from other scenes).
import type { CSSProperties, ReactNode } from "react";
import { spring, staticFile } from "remotion";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import imagesJson from "../../data/images.json";
import { C, F } from "../../brand/tokens";
import { FPS } from "../../lib/time";

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bricolage with all three axes set (font-variation-settings would otherwise override font-weight). */
export const bric = (wght: number, wdth = 100, opsz = 96): CSSProperties => ({
  fontFamily: F.display,
  fontWeight: Math.round(wght),
  fontStretch: `${wdth.toFixed(1)}%`,
  fontVariationSettings: `"wght" ${wght.toFixed(1)}, "opsz" ${opsz.toFixed(1)}, "wdth" ${wdth.toFixed(1)}`,
});

/** staticFile() path of a catalogued plate, or null while it is not in images.json (the scene falls back to code). */
export function plate(name: string): string | null {
  const e = (imagesJson as unknown as Record<string, { file?: string } | undefined>)[name];
  if (!e || typeof e.file !== "string") return null;
  return staticFile(e.file.replace(/^\/?(public\/)?/, ""));
}

/** First frame at which a spring reaches 1 (impacts belong on it). */
export function landingFrame(config: { stiffness: number; damping: number; mass: number }) {
  for (let f = 0; f < 120; f++) if (spring({ frame: f, fps: FPS, config }) >= 0.999) return f;
  return 15;
}

/** Masked line reveal (cookbook T07): the content rises out of its own mask. */
export function MaskLine({ p, children, style }: { p: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.1em", marginBottom: "-0.1em", ...style }}>
      <div style={{ transform: `translateY(${(1 - clamp01(p)) * 115}%)` }}>{children}</div>
    </div>
  );
}

/** A horizontal-only SVG blur (cheap whip / slide smear). */
export function HBlur({ id, amount }: { id: string; amount: number }) {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      {/* sRGB: in the default linearRGB, 8-bit near-black browns quantise toward olive green */}
      <filter id={id} x="-15%" y="0" width="130%" height="100%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={`${Math.max(0, amount).toFixed(2)} 0`} />
      </filter>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The card's saddle stitch, sewn ONE STITCH AT A TIME with a needle leading (card units: 400 × 252, inset 8, r 14,
// dash 6 5). It starts on the left edge below the band, runs down, along the bottom, up the right and across the top.
// On the brass band the thread is dark (on-brand) so it stays visible; on the leather it is brass. Ownership only.

const BW = 400;
const BH = 252;
const BAND = BH * 0.28;
const I = 8;
const R = 14;
const START_Y = 150;
const STITCH_PATH = [
  `M ${I} ${START_Y}`,
  `L ${I} ${BH - I - R}`,
  `A ${R} ${R} 0 0 0 ${I + R} ${BH - I}`,
  `L ${BW - I - R} ${BH - I}`,
  `A ${R} ${R} 0 0 0 ${BW - I} ${BH - I - R}`,
  `L ${BW - I} ${I + R}`,
  `A ${R} ${R} 0 0 0 ${BW - I - R} ${I}`,
  `L ${I + R} ${I}`,
  `A ${R} ${R} 0 0 0 ${I} ${I + R}`,
  `L ${I} ${START_Y}`,
].join(" ");
const STITCH_LEN = getLength(STITCH_PATH);
const PITCH = 11;

/** Render INSIDE <SatchelCard> (as children): it draws in the card's own 400 × 252 units. */
export function CardStitch({ id, progress, needle = true }: { id: string; progress: number; needle?: boolean }) {
  if (progress <= 0) return null;
  const raw = Math.min(1, progress) * STITCH_LEN;
  const sewn = progress >= 1 ? STITCH_LEN + 2 : Math.min(STITCH_LEN, Math.ceil(raw / PITCH) * PITCH);
  const l = Math.max(0, Math.min(STITCH_LEN - 0.01, raw));
  const tip = getPointAtLength(STITCH_PATH, l) ?? { x: I, y: START_Y };
  const tan = getTangentAtLength(STITCH_PATH, l) ?? { x: 0, y: 1 };
  return (
    <svg
      width={BW}
      height={BH}
      viewBox={`0 0 ${BW} ${BH}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
    >
      <defs>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={BW + 40} height={BH + 40}>
          <path d={STITCH_PATH} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={`${sewn} ${STITCH_LEN * 2}`} />
        </mask>
        <clipPath id={`${id}-band`}>
          <rect x={-20} y={-20} width={BW + 40} height={BAND + 20} />
        </clipPath>
        <clipPath id={`${id}-body`}>
          <rect x={-20} y={BAND} width={BW + 40} height={BH} />
        </clipPath>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <path
          d={STITCH_PATH}
          fill="none"
          stroke={C.onBrand}
          strokeOpacity={0.6}
          strokeWidth={1.6}
          strokeDasharray="6 5"
          strokeLinecap="round"
          clipPath={`url(#${id}-band)`}
        />
        <path
          d={STITCH_PATH}
          fill="none"
          stroke={C.brandBright}
          strokeOpacity={0.85}
          strokeWidth={1.6}
          strokeDasharray="6 5"
          strokeLinecap="round"
          clipPath={`url(#${id}-body)`}
        />
      </g>
      {needle && progress > 0 && progress < 1 ? (
        <g>
          <line
            x1={tip.x - tan.x * 14}
            y1={tip.y - tan.y * 14}
            x2={tip.x + tan.x * 2.5}
            y2={tip.y + tan.y * 2.5}
            stroke={C.brandBright}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={tip.x + tan.x * 2.5} cy={tip.y + tan.y * 2.5} r={1.2} fill="#fff6dc" />
        </g>
      ) : null}
    </svg>
  );
}
