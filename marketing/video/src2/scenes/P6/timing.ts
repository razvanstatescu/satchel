import { getScene } from "../../lib/timeline";
import { HANDOFF } from "../../motion";
import { sec } from "../P5/rig";

/**
 * P6 timing (v4: 52–59 s), all derived from the VO (getScene) and the 120 BPM grid (2 s bars), so a re-voice
 * re-times it. Two vignettes, each a hand-off swing whose landing sits on the grid, then the finale: the two cards
 * swinging in sync up to the music stop (59.0 s). The v2 gift vignette (V11) is cut: no reference to V11 remains.
 *   V12 "Sell a whole position in one trade, | or take an offer."      → the OTC desk (#30 · the offer sticker)
 *   V13 "Hand a treasury to the next team."                            → the relay (#21)
 */
export const SC = getScene("P6");
export const LINE = { b: SC.line("V12"), c: SC.line("V13") };
const BAR = 2;
const BEAT = 0.5;
/** first bar downbeat / beat at or after a scene time (scene frame) */
export const onBar = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BAR) * BAR - SC.start);
export const onBeat = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BEAT) * BEAT - SC.start);
/** the bar downbeat at or before a scene time (scene frame) */
export const barBefore = (t: number) => sec(Math.floor((SC.start + t + 1e-6) / BAR) * BAR - SC.start);

export const CUT = {
  c: barBefore(LINE.c.start), // 56.0 s: desk → relay
} as const;
export const CONTACT = {
  b: onBar(LINE.b.start + 1), // 54.0 s, on "trade"
  c: onBeat(LINE.c.start + 1), // 57.5 s
} as const;
export const LIFT = { b: CONTACT.b - HANDOFF.contact, c: CONTACT.c - HANDOFF.contact } as const;
/** "or take an offer": the offer sticker flips to Accepted on "offer" */
export const OR = sec(SC.wordAt("V12", "or"));
export const ACCEPT = sec(SC.wordAt("V12", "offer"));
/** the finale: the two cards in sync, from the bar after the relay lands to the end of the scene (music stop) */
export const FINALE = CONTACT.c + 15;
export const END = sec(SC.duration);

/** captions land on their VO words, never before the whip into their vignette has settled */
export const CAP = {
  b: Math.max(4, sec(SC.wordAt("V12", "sell"))),
  or: OR,
  c: Math.max(CUT.c + 4, sec(SC.wordAt("V13", "hand"))),
} as const;
