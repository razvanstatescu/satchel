import { handoffTimes } from "@/lib/motion/handoff";
import { rollTracks, stickOnTracks, type Track } from "@/lib/motion/play";
import { appearTracks, EASE, hopTracks, resetTrack } from "@/components/landing/motion/tracks";

/**
 * The hero loop as data (motion-spec §10; a port of proto/motion/landing-motion.js `heroTracks`). One 12 s clock, every
 * moving piece a track over the whole loop, so the loop is seekable by one number and testable without a DOM.
 *
 *   act 1 · 0–3.0 s   "Coins inside": the card fades in; the BTC, ETH and SOL chips stick on, the value bar fills
 *                      share by share, "+1"/"+2" appears, then the estimate rises in whole.
 *   act 2 · 3.0–5.4   "Seller lists it": the pill rolls Active → Paused for sale; the price tag swings in on its string.
 *   act 3 · 5.4–9.0   "Buyer checks first": the check slip slides up; its rows roll Checking… → Used; Clean history
 *                      sticks on; the sparkles pop. Settled by 7.72 s: the server frame (START_AT) is this act at rest.
 *   act 4 · 9.0–12.0  "Coins included": the tag unclips, the slip leaves, and the card does the free-card hand-off (lift,
 *                      carry `dx`, lag 5.8°, swing 10°, set down); the pill rolls back to Active, Yours sticks on, the
 *                      coins hop once (they came along). At the seam the card fades out and everything resets behind it.
 *
 * The engine mounts at START_AT, the frame the server HTML already shows (landing.css draws it), so hydration changes
 * nothing visible and the first thing that moves is the hand-off.
 */

/** One loop, in ms. */
export const T = 12_000;
/** Act 3 settled: the server frame, where the loop mounts. */
export const START_AT = 7_900;
/** Where each act (and its caption) starts. */
export const ACTS = [0, 3_000, 5_400, 9_000] as const;

/** The timeline, in ms (motion-spec §10's table). */
export const H = {
  fadeIn: 380,
  /** the BTC, ETH and SOL chips' coins, 360 ms apart */
  coins: [560, 920, 1_280],
  /** "+N" appears ("+1" from 352 px of card, "+2" below) */
  more: 1_640,
  /** each share starts filling this long after its trigger… */
  fill: 80,
  /** …and fills in this long */
  fillDur: 320,
  /** the estimate rises in whole (no counting number) */
  est: 2_100,
  toPaused: 3_200,
  tagIn: 3_500,
  slipIn: 5_600,
  ticks: [6_300, 6_550, 6_800],
  verdict: 7_100,
  sparks: [7_300, 7_420],
  tagOff: 9_000,
  slipOut: 9_050,
  hand: 9_350,
  seamOut: 11_500,
  seamDone: 11_850,
  /** each caption rolls out to the next one here */
  capOut: [3_000, 5_400, 9_000, 11_700],
  /** the bars empty for the next loop */
  barsOut: [11_550, 11_900],
} as const;

/**
 * The free-card hand-off (motion-spec §2 "Free-card variant"): X's strap timing (`handoffTimes`), plus the lift and the
 * set-down of a card that hangs from a hook 16 px above its top centre, its drop drawn by a plate that stays down.
 */
export const HAND = (() => {
  const t = handoffTimes(460);
  return { ...t, liftEnd: 180, fall: t.c1 + 420, settle: t.touch + 120 };
})();

const at = (ms: number) => H.hand + ms;
/** The card lands (the swing rests): the pill rolls back, Yours sticks on. */
export const TOUCH = at(HAND.touch);
/** The reset instant: the card is out of sight, everything behind it goes back to act 1. */
export const RESET = H.seamDone + 1;

type Coin = "btc" | "eth" | "sol";
type Seg = "btc" | "eth" | "sol" | "usdc";
type N3 = 1 | 2 | 3;
type N4 = 1 | 2 | 3 | 4;

/** Every moving piece of the stage: each is a `[data-k]` in the server markup (HeroStage.tsx). */
export type HeroKey =
  | "card"
  | "hanger"
  | "plate"
  | `coin-${Coin}`
  | `tick-${Coin}`
  | `seg-${Seg}`
  | "est"
  | "more"
  | "pill-active"
  | "pill-paused"
  | "tag"
  | "slip"
  | `sig-${N3}-used`
  | `sig-${N3}-checking`
  | "verdict"
  | "spark-1"
  | "spark-2"
  | "yours"
  | `cap-${N4}`
  | `bar-${N4}`;

/** The chips' coins (D-50): BTC, ETH and SOL stick on in act 1; USDC never gets a chip, only a bar share and "+N". */
const COINS = ["btc", "eth", "sol"] as const;
/** The value bar's four shares, largest first (site-refresh R9 sample). */
const SEGS = ["btc", "eth", "sol", "usdc"] as const;
const SIGS = [1, 2, 3] as const;
const FOUR = [1, 2, 3, 4] as const;

export const HERO_KEYS: readonly HeroKey[] = [
  "card",
  "hanger",
  "plate",
  ...COINS.flatMap((c) => [`coin-${c}`, `tick-${c}`] as const),
  ...SEGS.map((c) => `seg-${c}` as const),
  "est",
  "more",
  "pill-active",
  "pill-paused",
  "tag",
  "slip",
  ...SIGS.flatMap((n) => [`sig-${n}-used`, `sig-${n}-checking`] as const),
  "verdict",
  "spark-1",
  "spark-2",
  "yours",
  ...FOUR.map((n) => `cap-${n}` as const),
  ...FOUR.map((n) => `bar-${n}` as const),
];

/** The pieces the server frame (act 3 at rest) hides: `opacity: 0` in landing.css, so their space is kept. */
export const HIDDEN_AT_REST: readonly HeroKey[] = ["pill-active", "sig-1-checking", "sig-2-checking", "sig-3-checking", "yours", "cap-1", "cap-2", "cap-4"];

/** The empty progress bar in the server frame (acts 1–3 are done, act 4 has not started). */
export const EMPTY_AT_REST: readonly HeroKey[] = ["bar-4"];

/** Which box carries a piece out of sight at the seam (the card fades out, the slip has gone), or null. */
export function carriedBy(k: HeroKey): "card" | "slip" | null {
  if (/^(hanger|plate|coin-|tick-|seg-|est$|more$|pill-|yours)/.test(k)) return "card";
  if (/^(sig-|verdict)/.test(k)) return "slip";
  return null;
}

/** Which act is on at `ms` (1–4). */
export function actAt(ms: number): 1 | 2 | 3 | 4 {
  const t = ((ms % T) + T) % T;
  return t < ACTS[1] ? 1 : t < ACTS[2] ? 2 : t < ACTS[3] ? 3 : 4;
}

/**
 * How far the card travels in act 4 (motion-spec §10 `dx`): across the scene, less its margins and the swing room. The
 * 10° arrival swing reaches 0.174 × (card height + 16 px) past the card's right edge; the sky field's padding absorbs
 * part of it, so the swing stays inside the field. One layout read, before the loop starts.
 */
export function travel(g: { sceneWidth: number; cardWidth: number; cardLeft: number; cardHeight: number; fieldPadRight: number }): number {
  const room = Math.max(0, Math.round(0.174 * (g.cardHeight + 16)) - g.fieldPadRight + 6);
  return Math.max(0, Math.round(g.sceneWidth - g.cardWidth - 2 * g.cardLeft - room));
}

/**
 * The loop's tracks. `q` maps a piece to its element (an Element in the browser, the key itself in the unit tests);
 * `dx` is `travel(…)` in px. Tracks on one element and property are merged by the engine (`mergeTracks`).
 */
export function heroTracks<E>(q: (k: HeroKey) => E | null | undefined, dx: number): Track<E>[] {
  const tr: Track<E>[] = [];
  const card = q("card");
  const hanger = q("hanger");
  const plate = q("plate");

  // the carrier: fades in at the seller's end, is carried dx in act 4, fades out where it landed at the seam
  tr.push({ el: card, prop: "opacity", frames: [[0, 0, EASE.out], [H.fadeIn, 1], [H.seamOut, 1, EASE.in], [H.seamDone, 0], [T, 0]] });
  tr.push({
    el: card,
    prop: "translate",
    frames: [[0, "0 8px", EASE.out], [H.fadeIn, "0 0"], [at(HAND.c0), "0 0", EASE.carry], [at(HAND.c1), `${dx}px 0`], [H.seamDone, `${dx}px 0`], [RESET, "0 8px"], [T, "0 8px"]],
  });
  // the hanger: lift, swing (the brand's 10° pendulum, caused by the carry), set down, press 2 px into its drop
  tr.push({
    el: hanger,
    prop: "translate",
    frames: [[0, "0 0"], [at(0), "0 0", EASE.out], [at(HAND.liftEnd), "0 -10px"], [at(HAND.fall), "0 -10px", EASE.fall], [TOUCH, "0 2px", EASE.out], [at(HAND.settle), "0 0"], [T, "0 0"]],
  });
  tr.push({ el: hanger, prop: "scale", frames: [[0, "1"], [at(0), "1", EASE.out], [at(HAND.liftEnd), "1.02"], [at(HAND.fall), "1.02", EASE.fall], [TOUCH, "1"], [T, "1"]] });
  tr.push({
    el: hanger,
    prop: "rotate",
    frames: [[0, "0deg"], ...HAND.swing.map(([ms, d], i, a) => [at(ms), `${d}deg`, i === a.length - 2 ? EASE.out : EASE.swing] as const), [T, "0deg"]],
  });
  // the drop stays on the ground while the card is up, and lightens (a higher sticker casts a lighter shadow)
  tr.push({
    el: plate,
    prop: "translate",
    frames: [[0, "0 0"], [at(0), "0 0", EASE.out], [at(HAND.liftEnd), "0 10px"], [at(HAND.fall), "0 10px", EASE.fall], [TOUCH, "0 -2px", EASE.out], [at(HAND.settle), "0 0"], [T, "0 0"]],
  });
  tr.push({ el: plate, prop: "opacity", frames: [[0, 1], [at(0), 1, EASE.out], [at(HAND.liftEnd), 0.5], [at(HAND.fall), 0.5, EASE.fall], [TOUCH, 1], [T, 1]] });

  // act 1: each coin sticks on with its chip's words, and its share of the value bar fills from the left, in the
  // chips' order. Act 4: the coins hop once after the landing (they came along).
  COINS.forEach((c, i) => {
    const t0 = H.coins[i];
    const turn = i % 2 ? 18 : -18;
    const coin = q(`coin-${c}`);
    tr.push(...stickOnTracks(coin, t0, { from: 1.7, turn }));
    tr.push(...hopTracks(coin, TOUCH + 300 + i * 150));
    tr.push(resetTrack(coin, "opacity", RESET, 1, 0, T), resetTrack(coin, "scale", RESET, "1", "1.7", T), resetTrack(coin, "rotate", RESET, "0deg", `${turn}deg`, T));
    const words = q(`tick-${c}`);
    tr.push(...appearTracks(words, t0 + 60, 220, 6));
    tr.push(resetTrack(words, "opacity", RESET, 1, 0, T), resetTrack(words, "translate", RESET, "0 0", "0 6px", T));
  });
  // the value bar fills share by share, in the chips' order: transform only (scale on x, origin left), never a width
  SEGS.forEach((c, i) => {
    const t0 = (i < COINS.length ? H.coins[i] : H.more) + H.fill;
    tr.push({
      el: q(`seg-${c}`),
      prop: "scale",
      frames: [[0, "0 1"], [t0, "0 1", EASE.inOut], [t0 + H.fillDur, "1 1"], [RESET, "1 1"], [RESET + 1, "0 1"], [T, "0 1"]],
    });
  });
  // "+N" (the app's rule: "+1" from 352 px of card, "+2" below, where the SOL chip folds in too) appears last
  const more = q("more");
  tr.push(...appearTracks(more, H.more, 220, 6));
  tr.push(resetTrack(more, "opacity", RESET, 1, 0, T), resetTrack(more, "translate", RESET, "0 0", "0 6px", T));
  // the estimate rises in whole once the coins are in: no counting number (transform and opacity only)
  const est = q("est");
  tr.push(...appearTracks(est, H.est, 240, 8));
  tr.push(resetTrack(est, "opacity", RESET, 1, 0, T), resetTrack(est, "translate", RESET, "0 0", "0 8px", T));

  // the pill: Active → Paused for sale (act 2) → Active again for the new owner (act 4)
  const active = q("pill-active");
  const paused = q("pill-paused");
  tr.push(...rollTracks(active, paused, H.toPaused), ...rollTracks(paused, active, TOUCH));

  // act 2: the price tag swings in on its string (no drop: the string stays pinned to the card's edge); act 4: it
  // unclips and falls
  const tag = q("tag");
  tr.push({ el: tag, prop: "opacity", frames: [[0, 0], [H.tagIn, 0, EASE.out], [H.tagIn + 100, 1], [H.tagOff, 1, EASE.in], [H.tagOff + 320, 0], [T, 0]] });
  tr.push({
    el: tag,
    prop: "rotate",
    frames: [
      [0, "28deg"],
      [H.tagIn, "28deg", EASE.swing],
      [H.tagIn + 290, "-12deg", EASE.swing],
      [H.tagIn + 560, "6.5deg", EASE.swing],
      [H.tagIn + 820, "-3deg", EASE.swing],
      [H.tagIn + 1_060, "1.2deg", EASE.out],
      [H.tagIn + 1_260, "0deg"],
      [H.tagOff, "0deg", EASE.in],
      [H.tagOff + 320, "30deg"],
      [T, "28deg"],
    ],
  });
  tr.push({ el: tag, prop: "translate", frames: [[0, "0 0"], [H.tagOff, "0 0", EASE.in], [H.tagOff + 320, "0 36px"], [H.tagOff + 321, "0 0"], [T, "0 0"]] });

  // act 3: the buyer's check slip comes in, its rows tick in order, the verdict sticks on, the sparkles pop
  const slip = q("slip");
  tr.push({ el: slip, prop: "opacity", frames: [[0, 0], [H.slipIn, 0, EASE.out], [H.slipIn + 200, 1], [H.slipOut, 1, EASE.in], [H.slipOut + 300, 0], [T, 0]] });
  tr.push({ el: slip, prop: "translate", frames: [[0, "0 28px"], [H.slipIn, "0 28px", EASE.out], [H.slipIn + 450, "0 0"], [H.slipOut, "0 0", EASE.in], [H.slipOut + 300, "0 24px"], [T, "0 28px"]] });
  tr.push({ el: slip, prop: "rotate", frames: [[0, "4deg"], [H.slipIn, "4deg", EASE.out], [H.slipIn + 450, "0deg"], [H.slipOut, "0deg", EASE.in], [H.slipOut + 300, "3deg"], [T, "4deg"]] });
  SIGS.forEach((n, i) => {
    const used = q(`sig-${n}-used`);
    const checking = q(`sig-${n}-checking`);
    tr.push(...rollTracks(checking, used, H.ticks[i]));
    tr.push(resetTrack(checking, "opacity", RESET, 0, 1, T), resetTrack(checking, "translate", RESET, "0 -8px", "0 0", T));
    tr.push(resetTrack(used, "opacity", RESET, 1, 0, T), resetTrack(used, "translate", RESET, "0 0", "0 8px", T));
  });
  const verdict = q("verdict");
  tr.push(...stickOnTracks(verdict, H.verdict, { from: 1.3, turn: 0 }));
  tr.push(resetTrack(verdict, "opacity", RESET, 1, 0, T), resetTrack(verdict, "scale", RESET, "1", "1.3", T), resetTrack(verdict, "rotate", RESET, "0deg", "0deg", T));
  ([1, 2] as const).forEach((n, i) => {
    const sp = q(`spark-${n}`);
    const t0 = H.sparks[i];
    tr.push({ el: sp, prop: "opacity", frames: [[0, 0], [t0, 0], [t0 + 80, 1], [H.tagOff, 1, EASE.in], [H.tagOff + 200, 0], [T, 0]] });
    // they hold full size through the server frame, then shrink away with the slip
    tr.push({ el: sp, prop: "scale", frames: [[0, "0.2"], [t0, "0.2", EASE.out], [t0 + 180, "1.15", EASE.inOut], [t0 + 300, "1"], [H.tagOff, "1", EASE.in], [H.tagOff + 200, "0.6"], [T, "0.2"]] });
    tr.push({ el: sp, prop: "rotate", frames: [[0, "-40deg"], [t0, "-40deg", EASE.out], [t0 + 300, "0deg"], [11_000, "0deg"], [T, "-40deg"]] });
  });

  // act 4: the lemon Yours sticks on as the card lands
  const yours = q("yours");
  tr.push(...stickOnTracks(yours, TOUCH + 40));
  tr.push(resetTrack(yours, "opacity", RESET, 1, 0, T), resetTrack(yours, "scale", RESET, "1", "1.6", T), resetTrack(yours, "rotate", RESET, "0deg", "-16deg", T));

  // the caption ticker (each caption rolls to the next) and the progress bars (each fills with its act's time)
  FOUR.forEach((n, i) => tr.push(...rollTracks(q(`cap-${n}`), q(`cap-${FOUR[(i + 1) % 4]}`), H.capOut[i])));
  const fullAt = [ACTS[1], ACTS[2], START_AT, 11_400];
  FOUR.forEach((n, i) => {
    tr.push({
      el: q(`bar-${n}`),
      prop: "scale",
      frames: [[0, "0 1"], [ACTS[i], "0 1", "linear"], [fullAt[i], "1 1"], [H.barsOut[0], "1 1", EASE.inOut], [H.barsOut[1], "0 1"], [T, "0 1"]],
    });
  });
  return tr;
}
