import { getScene } from "../../lib/timeline";
import { HANDOFF } from "../../motion";
import { sec } from "../P5/rig";

/**
 * P6 timing, all derived from the VO (getScene) and the 120 BPM bar grid (2 s bars), so a re-voice re-times it.
 * Three 4 s vignettes, each a hand-off swing whose landing sits on a bar downbeat (46 + 2/6/10 s), then the finale:
 * the three cards swinging in sync up to the music stop at 58.0 s.
 */
export const SC = getScene("P6");
export const LINE = { a: SC.line("V11"), b: SC.line("V12"), c: SC.line("V13") };
const BAR = 2;
/** first bar downbeat at or after a scene time (scene frame) */
export const onBar = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BAR) * BAR - SC.start);
/** the bar downbeat at or before a scene time (scene frame) */
export const barBefore = (t: number) => sec(Math.floor((SC.start + t + 1e-6) / BAR) * BAR - SC.start);

export const CUT = {
  b: barBefore(LINE.b.start), // 50.0 s: gift → OTC desk
  c: barBefore(LINE.c.start), // 54.0 s: desk → relay
} as const;
export const CONTACT = {
  a: onBar(LINE.a.start + 1), // 48.0 s
  b: onBar(LINE.b.start + 1), // 52.0 s
  c: onBar(LINE.c.start + 1), // 56.0 s
} as const;
export const LIFT = { a: CONTACT.a - HANDOFF.contact, b: CONTACT.b - HANDOFF.contact, c: CONTACT.c - HANDOFF.contact } as const;
/** the finale: three cards in sync, from the beat after the relay lands to the end of the scene */
export const FINALE = CONTACT.c + 15;
export const END = sec(SC.duration);

/** captions land on their VO line's first word, never before the whip into their vignette has settled */
export const CAP = {
  a: Math.max(4, sec(SC.wordAt("V11", "gift"))),
  b: Math.max(CUT.b + 4, sec(SC.wordAt("V12", "sell"))),
  c: Math.max(CUT.c + 4, sec(SC.wordAt("V13", "hand"))),
} as const;
