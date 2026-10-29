import { getScene, TIMELINE } from "../../lib/timeline";

/**
 * S08 choreography (seconds, relative to the scene start), from L18's word times and the music.
 * Act 1 (buyer's view) and Act 2 (text card) ride the VO. Act 3 (the handoff) is timed BACKWARDS from the music's
 * `stitchLand` marker (timeline.json `markers`): the last stitch lands on the hit. Without the marker it falls back to
 * starting the lift as L18 ends.
 */
export function s08Timing() {
  const sc = getScene("S08");
  const L = sc.line("L18");
  const D = sc.duration;
  const clean = sc.wordAt("L18", "clean");
  const one = sc.wordAt("L18", "one");
  const transaction = sc.wordAt("L18", "transaction");
  const pays = sc.wordAt("L18", "pays");

  // Act 1: the press lands on "one"; a quick "Buying…"; punch through into the text card on "transaction".
  const press = one;
  const buying = press + 0.12;
  const cutText = Math.max(buying + 0.12, transaction);

  // Act 3, backwards from the last stitch: lift → slide (spring-handoff ≈ 0.72 s) → land → macro → sew.
  const sewSlow = 0.55; // the photographic macro insert: one stitch at a time
  const sewDur = 1.3;
  const chain = 0.25 + 0.72 + 0.1 + 0.04 + sewDur; // lift → last stitch
  const markers = (TIMELINE as unknown as { markers?: Record<string, number> }).markers;
  const mk = typeof markers?.stitchLand === "number" ? markers.stitchLand - sc.start : null;
  const minEnd = cutText + 1.5 + 0.3 + chain; // text card ≥ 1.5 s; the stage shows alice's stitched card ≥ 0.3 s
  const maxEnd = D - 3.2; // "Satchel #3 is yours." needs ≥ 1.8 s plus a calm tail
  const fallback = Math.max(L.end - 0.05, minEnd - chain) + chain;
  const sewEnd = Math.min(maxEnd, Math.max(minEnd, mk ?? fallback));
  const sewStart = sewEnd - sewDur;
  const macroCut = sewStart - 0.04;
  const land = macroCut - 0.1;
  const slideStart = land - 0.72;
  const t0 = slideStart - 0.25; // lift
  const unpickEnd = t0 + 0.4;
  const settleStart = slideStart + 0.55; // y / rotate / scale spring back
  const stageCut = Math.max(cutText + 1.5, t0 - 0.3);

  // Act 2: the binding line follows the headline quickly (the VO catches up); the "paid" line stays on screen, at the
  // same position, across the cut to the stage until the macro.
  const boundAt = cutText + 0.25;
  const paidAt = Math.min(boundAt + 0.5, stageCut - 0.6);

  const pullStart = sewStart + sewSlow;
  const pullEnd = sewEnd + 0.35;
  const pill = sewEnd + 0.06;
  const yours = sewEnd + 0.18;
  const fadeOut = D - 0.35;

  return {
    D, L, clean, one, press, buying, cutText, boundAt, paidAt, pays,
    stageCut, t0, unpickEnd, slideStart, settleStart, land, macroCut,
    sewStart, sewSlow, sewDur, sewEnd, pullStart, pullEnd, pill, yours, fadeOut,
  };
}

export type S08T = ReturnType<typeof s08Timing>;
