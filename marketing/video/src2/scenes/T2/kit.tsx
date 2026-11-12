import type { CSSProperties, ReactNode } from "react";
import { interpolate, random, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import beatsJson from "../../data/beats.json";
import { getScene } from "../../lib/timeline";
import { FPS } from "../../lib/time";
import { CaptionSlap, clamp, FONT, K, SLAP_CONTACT, slapAt } from "../../motion";

/**
 * Helpers shared by scenes T2, T3 and T4 (scene builder 5). Scene-local frames everywhere.
 *   sceneBeats(id)   the music's beat grid (beats.json gridBeatFrames) in scene-relative frames
 *   onBeat(f, beats) the beat nearest to f;  beatAfter(f, beats) the first beat at or after f
 *   voF(id)          VO helpers that return FRACTIONAL scene frames (word onsets, sentence starts)
 *   Caption          the kit's CaptionSlap, centred at (x, y), landing (contact) on a given frame; a caption that
 *                    replaces another slaps over it (bible §2.16): the old one pops out in the 2 frames before the new
 *                    slap starts, and the new one starts at full opacity, so the caption band is never empty
 *   cameraStyle      world → screen transform for a flat board seen through a moving window (pan + zoom)
 */

const GRID: number[] = (beatsJson as unknown as { gridBeatFrames: number[] }).gridBeatFrames;

export function sceneBeats(id: string): number[] {
  const sc = getScene(id);
  const start = Math.round(sc.start * FPS);
  const end = Math.round(sc.end * FPS);
  return GRID.filter((f) => f >= start - 30 && f <= end + 30).map((f) => f - start);
}

export const onBeat = (f: number, beats: number[]) => beats.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a), beats[0]);
export const beatAfter = (f: number, beats: number[]) => beats.find((b) => b >= f - 0.001) ?? Math.round(f);

/** VO timing in fractional scene frames. */
export function voF(sceneId: string, lineId: string) {
  const sc = getScene(sceneId);
  const line = sc.line(lineId);
  const starts = (line.sentenceStarts as number[] | undefined) ?? [0];
  return {
    start: line.start * FPS,
    end: line.end * FPS,
    word: (n: number, which: "start" | "end" = "start") => sc.word(lineId, n, which) * FPS,
    wordAt: (prefix: string, which: "start" | "end" = "start") => sc.wordAt(lineId, prefix, which) * FPS,
    /** start of sentence i (0-based), from the pipeline's sentenceStarts */
    sentence: (i: number) => (line.start + (starts[Math.min(i, starts.length - 1)] ?? 0)) * FPS,
    duration: sc.duration * FPS,
  };
}

/**
 * A caption (Funnel Display 800, the kit's CaptionSlap) centred at (x, y) that lands on `contact` (scene frame; the slap
 * starts 4 f earlier). `leaveAt` is the frame it is gone by: it pops out over the 2 frames before (1.06, then 0.5), so
 * pass the replacing caption's first slap frame (its `contact` − 4). `swapIn` marks that replacing caption: its slap
 * starts at full opacity instead of the 2-frame anti-pop, so a swap has no empty or half-transparent frame.
 * `size` 110–160 px.
 */
export function Caption({
  text,
  contact,
  leaveAt,
  x = 960,
  y,
  size = 140,
  seed,
  color,
  style,
  swapIn = false,
}: {
  text: string;
  contact: number;
  leaveAt?: number;
  swapIn?: boolean;
  x?: number;
  y: number;
  size?: number;
  seed: string;
  color?: string;
  style?: CSSProperties;
}) {
  const from = Math.round(contact) - SLAP_CONTACT;
  const dur = leaveAt === undefined ? 100000 : Math.max(1, Math.round(leaveAt) - from);
  return (
    <Sequence from={from} durationInFrames={dur} layout="none" name={`cap:${text}`}>
      <CaptionBody text={text} leaveLocal={leaveAt === undefined ? undefined : Math.round(leaveAt) - from} x={x} y={y} size={size} seed={seed} color={color} style={style} swapIn={swapIn} />
    </Sequence>
  );
}

function CaptionBody({ text, leaveLocal, x, y, size, seed, color, style, swapIn }: { text: string; leaveLocal?: number; x: number; y: number; size: number; seed: string; color?: string; style?: CSSProperties; swapIn: boolean }) {
  const f = useCurrentFrame();
  // the pop-out: 1.06 on the second-to-last frame, 0.5 on the last; gone at leaveLocal (the Sequence ends there)
  const out = leaveLocal === undefined ? 1 : interpolate(f, [leaveLocal - 3, leaveLocal - 2, leaveLocal - 1], [1, 1.06, 0.5], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: `${out}`, whiteSpace: "nowrap", ...style }}>
      {swapIn ? <SwapSlap text={text} size={size} seed={seed} color={color} /> : <CaptionSlap text={text} size={size} seed={seed} color={color} />}
    </div>
  );
}

/** The kit's CaptionSlap (same type, slap, seeded tilt) without its 2-frame opacity anti-pop: for a caption that
 *  slaps over another one, so the swap never shows an empty or half-transparent caption band. */
function SwapSlap({ text, size, seed, color = K.ink }: { text: string; size: number; seed: string; color?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, sy } = slapAt(frame, fps, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const tilt = (random(`caption-${seed}`) - 0.5) * 4; // the same seeded −2° … +2° tilt as CaptionSlap
  return (
    <div style={{ display: "inline-block", fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.035em", color, scale: `${sx} ${sy}`, rotate: `${tilt}deg` }}>
      {text}
    </div>
  );
}

/** World → screen: the board point (cx, cy) lands on the screen centre, scaled by z. Optional smear (whips). */
export function cameraStyle(cx: number, cy: number, z: number, smearX = 1, smearY = 1): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
    transformOrigin: "0 0",
    transform: `translate(960px, 540px) scale(${smearX}, ${smearY}) translate(-960px, -540px) translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})`,
  };
}

/** A positioned box in world px (top-left at x, y). */
export function At({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", left: x, top: y, ...style }}>{children}</div>;
}
