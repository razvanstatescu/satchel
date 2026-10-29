import { BEAT, getScene } from "../../lib/timeline";
import { SPRING } from "../../lib/time";
import { landingFrame } from "./kit";

/**
 * U1 choreography (seconds, relative to the scene start), derived from L24–L26 word times.
 * Three vignettes cut on the beat where each line starts (the lines sit on bar downbeats), then a fast triptych whose
 * three panels land on consecutive half-beats, the last one ≥ 0.5 s before the cut to S05.
 */
export const HEAVY = { stiffness: 90, damping: 22, mass: 2 }; // the treasury card: 2× mass, lands in ≈ 0.67 s, ≈ 1 % overshoot

export function u1Times() {
  const sc = getScene("U1");
  const D = sc.duration;
  const L24 = sc.line("L24");
  const L25 = sc.line("L25");
  const L26 = sc.line("L26");
  const w = (id: string, prefix: string, which: "start" | "end" = "start") => sc.wordAt(id, prefix, which);
  const clampT = (t: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, t));
  const beatAtOrBefore = (t: number) => Math.floor((t + 0.07) / BEAT) * BEAT;
  const beatAtOrAfter = (t: number) => Math.ceil((t - 0.07) / BEAT) * BEAT;

  const cut2 = clampT(beatAtOrBefore(L25.start), 3.0, D - 6.0);
  const cut3 = clampT(beatAtOrBefore(L26.start), cut2 + 3.0, D - 3.5);
  const trip = clampT(beatAtOrAfter(Math.max(L26.end + 0.6, cut3 + 2.9)), cut3 + 2.4, D - 1.0);

  const handoffLand = landingFrame(SPRING.handoff) / 30;
  const heavyLand = landingFrame(HEAVY) / 30;
  const liftLand = landingFrame(SPRING.lift) / 30;

  // V1 · Sell a position. → One trade.
  const v1 = (() => {
    const head = Math.max(0, w("L24", "Sell") - 0.14);
    const focus = head + 0.42;
    const cardIn = Math.max(focus + 0.05, w("L24", "position") - 0.25);
    const cardLand = cardIn + handoffLand;
    const tagIn = cardIn + 0.12;
    const one = Math.max(w("L24", "one"), cardIn + 0.95);
    const line2 = one - 0.06;
    const swap = Math.min(one + 0.04, cut2 - 1.6);
    const land = swap + liftLand;
    return { head, focus, cardIn, cardLand, tagIn, line2, swap, land };
  })();

  // V2 · Gift a wallet.
  const v2 = (() => {
    const head = cut2 + 0.1;
    const tag = cut2 + 0.14; // the ink is written (0.42 s) while the photo is still sharp
    const focus = cut2 + 0.58;
    const toRow = focus + 0.08;
    const cardIn = Math.max(cut2 + 0.6, w("L25", "funded") - 0.05);
    const land = cardIn + handoffLand;
    const sew = land + 0.03;
    const sewEnd = sew + 0.72;
    const caption = land + 0.08;
    return { head, tag, focus, toRow, cardIn, land, sew, sewEnd, caption };
  })();

  // V3 · Hand over a treasury.
  const v3 = (() => {
    const head = cut3 + 0.1;
    const focus = cut3 + 0.45;
    const toRow = focus + 0.1;
    const cardIn = clampT(w("L26", "treasury") - 0.05, cut3 + 0.45, trip - 1.6);
    const land = cardIn + heavyLand;
    const sew = land + 0.03;
    const sewEnd = sew + 0.55;
    return { head, focus, toRow, cardIn, land, sew, sewEnd };
  })();

  const hits = [trip, trip + BEAT / 2, trip + BEAT];
  return { D, L24, L25, L26, cut2, cut3, trip, hits, v1, v2, v3 };
}

export type U1T = ReturnType<typeof u1Times>;
