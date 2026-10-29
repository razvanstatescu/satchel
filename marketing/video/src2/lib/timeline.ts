import timelineJson from "../data/timeline.json";

/**
 * Satchel 2.0 film. The master timeline (written by the audio pipeline, marketing/tools/audio/): scene spans and VO lines in absolute
 * seconds, word timings relative to each line. Scenes read their own slice through `getScene(id)` and choreograph
 * against VO times, so re-generating the voice re-times the film automatically.
 */

export interface Word {
  text: string;
  start: number;
  end: number;
}
export interface VoLine {
  id: string;
  file: string | null;
  start: number;
  duration: number;
  text: string;
  words: Word[];
  // optional extras the audio pipeline may add (e.g. L15's three phrase starts)
  [k: string]: unknown;
}
export interface SceneSpan {
  id: string;
  start: number;
  end: number;
}
export interface Timeline {
  placeholder?: boolean;
  fps: number;
  bpm: number;
  durationSec: number;
  scenes: SceneSpan[];
  vo: VoLine[];
  duck: { start: number; end: number }[];
  /** Absolute times (s) of musical/story hits: hookLand, musicStop, thud, subHit, flip, drop, blocked, landing, endPress, end. */
  markers?: Record<string, number>;
}

export const TIMELINE = timelineJson as unknown as Timeline;

// Every line in timeline.json carries its own `scene` (v2 pipeline); SCENE_OF is an optional fallback.
const SCENE_OF: Record<string, string> = {};
const sceneOf = (l: VoLine) => (typeof l.scene === "string" ? l.scene : SCENE_OF[l.id]) ?? "";

export interface SceneData {
  id: string;
  start: number; // absolute
  end: number;
  duration: number;
  /** VO lines of this scene, with `start` made RELATIVE to the scene start. */
  lines: VoLine[];
  /** Relative start/end of a line in this scene (throws if missing, so typos surface early). */
  line: (id: string) => VoLine & { end: number };
  /** Relative time of the n-th word (0-based) of a line; `which` picks its start or end. */
  word: (lineId: string, n: number, which?: "start" | "end") => number;
  /** Relative time of the first word whose text starts with `prefix` (case-insensitive). */
  wordAt: (lineId: string, prefix: string, which?: "start" | "end") => number;
}

export function getScene(id: string): SceneData {
  const span = TIMELINE.scenes.find((x) => x.id === id);
  if (!span) throw new Error(`Scene ${id} not in timeline.json`);
  const lines = TIMELINE.vo
    .filter((l) => sceneOf(l) === id || (l.start >= span.start && l.start < span.end && !sceneOf(l)))
    .map((l) => ({ ...l, start: +(l.start - span.start).toFixed(3) }));
  const line = (lid: string) => {
    const l = lines.find((x) => x.id === lid);
    if (!l) throw new Error(`Line ${lid} not in scene ${id}`);
    return { ...l, end: +(l.start + l.duration).toFixed(3) };
  };
  const word = (lid: string, n: number, which: "start" | "end" = "start") => {
    const l = line(lid);
    const w = l.words[Math.max(0, Math.min(n, l.words.length - 1))];
    return w ? l.start + w[which] : l.start;
  };
  const wordAt = (lid: string, prefix: string, which: "start" | "end" = "start") => {
    const l = line(lid);
    const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9#']/g, "");
    const w = l.words.find((x) => clean(x.text).startsWith(clean(prefix)));
    return w ? l.start + w[which] : l.start;
  };
  return { id, start: span.start, end: span.end, duration: span.end - span.start, lines, line, word, wordAt };
}

/** Beat helpers (120 BPM unless the timeline says otherwise). `beat(n)` = time of beat n from scene start. */
export const BEAT = 60 / (TIMELINE.bpm || 120);

/** Absolute marker time in seconds (throws if missing, so typos surface early). */
export function marker(name: string): number {
  const v = TIMELINE.markers?.[name];
  if (typeof v !== "number") throw new Error(`Marker ${name} not in timeline.json`);
  return v;
}
