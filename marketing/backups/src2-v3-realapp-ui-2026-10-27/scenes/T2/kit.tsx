import type { CSSProperties, ReactNode } from "react";
import { interpolate, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../data/beats.json";
import { getScene } from "../../lib/timeline";
import { FPS } from "../../lib/time";
import { CaptionSlap, clamp, EASE2, SLAP_CONTACT } from "../../motion";

/**
 * Helpers shared by scenes T2, T3 and T4 (scene builder 5). Scene-local frames everywhere.
 *   sceneBeats(id)   the music's beat grid (beats.json gridBeatFrames) in scene-relative frames
 *   onBeat(f, beats) the beat nearest to f;  beatAfter(f, beats) the first beat at or after f
 *   voF(id)          VO helpers that return FRACTIONAL scene frames (word onsets, sentence starts)
 *   Caption          the kit's CaptionSlap, centred at (x, y), landing (contact) on a given frame, leaving with a pop
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
 * starts 4 f earlier) and, if `leaveAt` is given, pops out over 5 f from there (1 → 1.06 → 0) so the next caption can
 * slap over it. `size` 110–160 px.
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
}: {
  text: string;
  contact: number;
  leaveAt?: number;
  x?: number;
  y: number;
  size?: number;
  seed: string;
  color?: string;
  style?: CSSProperties;
}) {
  const from = Math.round(contact) - SLAP_CONTACT;
  const dur = leaveAt === undefined ? 100000 : Math.max(1, Math.round(leaveAt) + 6 - from);
  return (
    <Sequence from={from} durationInFrames={dur} layout="none" name={`cap:${text}`}>
      <CaptionBody text={text} leaveLocal={leaveAt === undefined ? undefined : Math.round(leaveAt) - from} x={x} y={y} size={size} seed={seed} color={color} style={style} />
    </Sequence>
  );
}

function CaptionBody({ text, leaveLocal, x, y, size, seed, color, style }: { text: string; leaveLocal?: number; x: number; y: number; size: number; seed: string; color?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const out = leaveLocal === undefined ? 1 : interpolate(f, [leaveLocal, leaveLocal + 2, leaveLocal + 5], [1, 1.06, 0], { ...clamp, easing: EASE2.fall });
  if (out <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: `${out}`, whiteSpace: "nowrap", ...style }}>
      <CaptionSlap text={text} size={size} seed={seed} color={color} />
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
