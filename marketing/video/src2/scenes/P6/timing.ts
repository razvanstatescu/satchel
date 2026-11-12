import { getScene } from "../../lib/timeline";
import { HANDOFF } from "../../motion";
import { sec } from "../P5/rig";

/**
 * P6 timing (v5: 49.5–56 s), all derived from the VO (getScene) and the 120 BPM beat grid, so a re-voice re-times it.
 * Two vignettes, each a hand-off swing whose landing sits on the grid, then the finale: the two cards swinging in sync
 * up to the music stop (56.0 s). The v2 gift vignette (V11) is cut: no reference to V11 remains.
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
/** the bar downbeat / beat at or before a scene time (scene frame) */
export const barBefore = (t: number) => sec(Math.floor((SC.start + t + 1e-6) / BAR) * BAR - SC.start);
export const beatBefore = (t: number) => sec(Math.floor((SC.start + t + 1e-6) / BEAT) * BEAT - SC.start);

// v5: P6 starts mid-bar (49.5 s), so the moves sit on beats tied to the VO, not on bars (same scene times as v4)
export const CUT = {
  c: beatBefore(LINE.c.start - 0.5), // the beat half a second before V13: desk → relay (scene 4.0 s)
} as const;
export const CONTACT = {
  b: onBeat(SC.wordAt("V12", "trade")), // the heavy card lands on the beat of "trade," (scene 2.0 s)
  c: onBeat(LINE.c.start + 1), // the relay lands (scene 5.5 s)
} as const;
export const LIFT = { b: CONTACT.b - HANDOFF.contact, c: CONTACT.c - HANDOFF.contact } as const;
/** "or take an offer": the offer sticker flips to Accepted on "offer" */
export const OR = sec(SC.wordAt("V12", "or"));
export const ACCEPT = sec(SC.wordAt("V12", "offer"));
/** the finale: the two cards in sync, from the beat after the relay lands to the end of the scene (music stop; P6
 * then holds its final pose, frozen, under C1's falling Night blind: see transitions.ts) */
export const FINALE = CONTACT.c + 15;
export const END = sec(SC.duration);

/**
 * Captions land on their VO words, never before the whip into their vignette has settled. v5 (QA r2 #3, #4): "Or take
 * an offer." lands as "trade," ends (≥ 6 f after the heavy card's landing) and leaves with the desk's whip, so it never
 * sits over the relay; "Hand over a treasury." starts its slap one frame before the whip's cut (so the cut frame already
 * shows it at half opacity: no empty caption band), lands as the relay settles and holds to the end, over the finale.
 */
export const CAP = {
  b: Math.max(4, sec(SC.wordAt("V12", "sell"))),
  or: Math.max(sec(SC.wordAt("V12", "trade", "end")), CONTACT.b + 6),
  c: CUT.c + 3,
} as const;
