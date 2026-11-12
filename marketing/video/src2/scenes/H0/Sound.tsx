import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import sfxJson from "../../data/sfx.json";
import { DEVCON_SRC } from "./Barrage";
import { BAR2, BLACK, BRIDGE, CONTACT, H0_FRAMES, VOICE_AT, VOICE_FRAMES } from "./timing";

/**
 * H0's sound, one cue list on H0's clock (frames; 120 BPM, a bar is 60 f). Cue sheet: notes/intro-research/audio-v6.md.
 *   0–179    M0 (m0-3bar: sparse bar 1, stabs and its own riser in bar 2, the peak in bar 3, a HARD STOP on f180)
 *            + the barrage's hits (cold hit, punches, the whip, the shutter, glitches on the slams)
 *   0–64     the chorus's one line, F01 "Seed phrases in LastPass" (on the SEAL post), alone and whole; it ends before
 *            the Devcon voice starts. No other chorus fragment plays: each would sit under his words (QA v5 #6, #12)
 *   64–177   the Devcon line (+3.5 dB, never cut, sped or pitched; "Blind" on f66, "check" ends f175): the music and
 *            the hits dip under every word, so the voice is always clearly on top; the music swells back for the stop
 *   167–179  suck-in, stopping dead on its loudest point exactly on the cut to black
 *   180–254  DIGITAL SILENCE (every volume is forced to 0) but for one sound:
 *   195–245  the bridge, the narrator's first words, "That's why we built Satchel." (film v6), dry, at the body's VO
 *            level (net 0 dB, as AudioLayer plays every V line)
 *   255      the reveal: reveal-boom (take 2) + sticker-slap, the loudest moment of the intro. Both ring past the join:
 *            H0Tail plays the rest from the body's frame 0, faded out before "Stick it on." (body f30)
 * Every cue plays a WAV decoded from its MP3 (public/v2/intro/audio/wav/): an MP3 starts 25 ms late in Remotion (its
 * encoder delay), which would cut the stop at full level and skip M0's ramp (QA v5 #7).
 * Mix (pre-master; build.md): H0 integrated ≈ −17 LUFS through H0_MASTER_DB (~2 LU under the body).
 */
type Entry = { file: string; duration: number; peakSec?: number; gainDb?: number };
const CATALOG = sfxJson as unknown as Record<string, Entry>;
const dB = (d: number) => Math.pow(10, d / 20);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WAV = "v2/intro/audio/wav/";

export const VOICE_DB = 3.5;
/** The intro's master gain (re-measured in build.md). */
export const H0_MASTER_DB = 2.4;
const MUSIC_DB = -8.6; // audio-v6.md: m0-3bar at mixDb −20
const DUCK_DB = -8; // music and hits under the voice

/** The Devcon line's speech (H0 frames): "Blind signing is simply equivalent" · pause · "to signing a blank check." */
const SPEECH: [number, number][] = [
  [VOICE_AT + 1, VOICE_AT + 59.5],
  [VOICE_AT + 69, VOICE_AT + 111],
];
const SPEECH_END = SPEECH[1][1];
const trap = (f: number, a: number, b: number, ramp: number) => interpolate(f, [a - ramp, a, b, b + ramp], [0, 1, 1, 0], clamp);
/** 1 → DUCK_DB under the whole line (it stays down through the line's short pause). */
const voiceDuck = (f: number) => dB(DUCK_DB * trap(f, SPEECH[0][0], SPEECH_END, 3));
/** The bed builds into the stop once he has finished (QA v5 #17). */
const musicEnv = (f: number) => voiceDuck(f) * dB(2.5 * interpolate(f, [SPEECH_END + 1, BLACK - 1], [0, 1], clamp));

type Cue = {
  id: string;
  src: string;
  start: number; // H0 frame on which the file's t = 0 plays
  frames: number; // the file's length in frames (ceil)
  db: number;
  env?: (f: number) => number; // linear gain per H0 frame
  stop?: number; // H0 frame on which it is cut dead
  inBlack?: boolean; // plays through the black's silence (only the bridge)
};

/** A catalog sound (played from its WAV): `at` is its start, or its peak with align "peak" (an H0 frame). */
const sfx = (name: string, at: number, db = 0, opts: { align?: "peak"; env?: (f: number) => number } = {}): Cue => {
  const e = CATALOG[name];
  if (!e) throw new Error(`H0: no sfx "${name}" in sfx.json`);
  return {
    id: `${name}@${at}`,
    src: `${WAV}${name}.wav`,
    start: Math.round(at - (opts.align === "peak" ? (e.peakSec ?? 0) * 30 : 0)),
    frames: Math.ceil(e.duration * 30) + 1,
    db: (e.gainDb ?? 0) + db,
    env: opts.env,
    stop: at < BLACK ? BLACK : undefined,
  };
};

const CUES: Cue[] = [
  // ── the bed ──────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: "m0-3bar", src: `${WAV}m0-3bar.wav`, start: 0, frames: 180, db: MUSIC_DB, env: musicEnv, stop: BLACK },
  // ── the voices ───────────────────────────────────────────────────────────────────────────────────────────────
  { id: "devcon-voice", src: DEVCON_SRC, start: VOICE_AT, frames: VOICE_FRAMES + 1, db: VOICE_DB },
  // "Seed phrases in LastPass" (F01, TV take; audio-v6.md gainDb −8.2 at mixDb −26, +4 to lead): whole, ends f64
  { id: "chorus-F01", src: `${WAV}F01-tv.wav`, start: 0, frames: 67, db: -8.2 + 4 },
  // ── bar 1: the wall, the whip, the photo (kept under F01's words) ─────────────────────────────────────────────
  sfx("barrage-cold-hit", 0, -4),
  sfx("zoom-punch", 15, -6),
  sfx("whip-fast", 33, -9, { align: "peak" }),
  sfx("shutter-snap", 37, -10, { align: "peak" }),
  sfx("zoom-punch", 45, -9),
  sfx("glitch-hit-1", 49, -8), // the phishing prompt
  sfx("whip-fast", 58, -8, { align: "peak" }),
  // ── bar 2: the talk on the glass, then the tunnel (everything small under the voice) ──────────────────────────
  sfx("zoom-punch", BAR2, -4),
  sfx("glitch-hit-2", BAR2, -8),
  sfx("whip-fast", 96, -10, { align: "peak", env: voiceDuck }),
  sfx("glitch-hit-3", 98, -6, { env: voiceDuck }),
  sfx("notif-ping-1", 105, -6, { env: voiceDuck }),
  sfx("drum-hit-soft", 107, -4, { env: voiceDuck }), // "Sign" goes down
  ...[113, 120, 132, 139, 146, 154, 161, 168].map((f, i) => sfx(`glitch-hit-${(i % 3) + 1}`, f, -6, { env: voiceDuck })),
  // ── the stop ─────────────────────────────────────────────────────────────────────────────────────────────────
  sfx("glitch-stutter", 176, -2, { align: "peak", env: voiceDuck }),
  sfx("suck-in", BLACK, 3.5, { align: "peak", env: voiceDuck }),
  // ── the bridge: the narrator on the black, at the body's VO level (the master gain taken back out) ─────────────
  { id: "bridge-V00", src: BRIDGE.src, start: BRIDGE.at, frames: BRIDGE.frames, db: -H0_MASTER_DB, inBlack: true },
  // ── the reveal (the loudest moment; rings on into H1 through H0Tail) ───────────────────────────────────────────
  sfx("reveal-boom-2", CONTACT, 3),
  sfx("sticker-slap", CONTACT, -6),
];

/** No sound between the cut to black and the contact, but the bridge's voice. */
const silent = (f: number, cue: Cue) => f >= BLACK && f < CONTACT && !cue.inBlack;
/** The ring-out after the join: full for 8 frames, gone by body frame 24 (V01 "Stick it on." starts on body f30). */
const tailFade = (f: number) => interpolate(f, [H0_FRAMES + 8, H0_FRAMES + 24], [1, 0], clamp);

/**
 * The part of a cue between H0 frames [from, to), placed on a clock that starts at H0 frame `origin` (0 for H0
 * itself, H0_FRAMES for the body).
 */
const CuePart: React.FC<{ cue: Cue; from: number; to: number; origin: number }> = ({ cue, from, to, origin }) => {
  const a = Math.max(cue.start, from);
  const b = Math.min(cue.start + cue.frames, cue.stop ?? Infinity, to);
  if (b <= a) return null;
  const trim = a - cue.start;
  return (
    <Sequence from={a - origin} durationInFrames={b - a} layout="none" name={`h0:${cue.id}`}>
      <Audio
        src={staticFile(cue.src)}
        trimBefore={trim > 0 ? trim : undefined}
        volume={(fr) => {
          const f = a + fr;
          if (silent(f, cue)) return 0; // the silence is digital
          const g = dB(cue.db + H0_MASTER_DB) * (cue.env ? cue.env(f) : 1) * (f >= H0_FRAMES ? tailFade(f) : 1);
          return Math.max(0, g);
        }}
      />
    </Sequence>
  );
};

/** Everything H0 plays inside its own frames. */
export const H0Sound: React.FC = () => (
  <>
    {CUES.map((c) => (
      <CuePart key={c.id} cue={c} from={0} to={H0_FRAMES} origin={0} />
    ))}
  </>
);

/** The reveal's ring-out past the join, on the body's clock (Main and render-master's body render pass introTail). */
export const H0Tail: React.FC = () => (
  <>
    {CUES.map((c) => (
      <CuePart key={c.id} cue={c} from={H0_FRAMES} to={H0_FRAMES + 60} origin={H0_FRAMES} />
    ))}
  </>
);
