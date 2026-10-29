import { EASE, rollTracks, stickOnTracks, type Track } from "@/lib/motion/play";

/**
 * The hand-off, the brand's one signature motion (motion-spec §2; `handoffTimes` + `handoffStrap` from
 * proto/motion/motion-kit.js). Data and pure track builders only; `components/client/Handoff.tsx` plays them.
 *
 * The card hangs on a 22 px stem from a strap between two owners. Its pivot is the stem's top (`transform-origin:
 * 50% 0`) and nothing lifts: the stem is carried along the strap with a gentle start and a firm stop, the card lags back
 * 5.8°, swings forward 10° when the stem stops, settles within 600 ms (a damped physical pendulum, period 400 ms,
 * damping ratio 0.30), and the stem clicks 3 px into the new owner's notch. The end position is the static layout, so
 * the only layout read is how far the card travels (`dx`).
 */

/** Timing in ms from the chain-confirmed success. `carryMs` is how long the hook is carried along the strap. */
export function handoffTimes(carryMs = 460) {
  const carry = carryMs;
  const c0 = 140;
  const c1 = c0 + carry;
  const touch = c1 + 540;
  return {
    /** the giver's Yours has peeled off */
    peelEnd: 180,
    /** the carry: c0 → c1 */
    c0,
    c1,
    carry,
    /** the swing's extremes [ms, deg]: rest, the lag, the 10° arrival swing, the settle, rest */
    swing: [
      [c0, 0],
      [c0 + Math.round(0.548 * carry), 5.8],
      [c1 + 16, -10],
      [c1 + 226, 3.7],
      [c1 + 436, -1.4],
      [touch, 0],
    ] as [number, number][],
    /** the swing rests and the stem clicks into its notch; the pill rolls, the To avatar answers */
    touch,
    /** the sentence and the receipt fade in */
    after: touch + 60,
    /** focus the sentence, then announce */
    focus: touch + 260,
    /** one clock for every track */
    T: touch + 360,
  };
}

/** The reduced-motion dip (motion-spec §2): fade out at the From end, jump while invisible, fade in at the To end. */
export const HANDOFF_REDUCED = { T: 480, out: 150, jump: 160, in: 350, ghost: [160, 360], after: [250, 450], focus: 450 } as const;

/** The pieces of the stage the motion moves (any may be missing except the card). */
export interface HandoffParts<E> {
  /** `.hook__card`: the stem and the card, pivoting at the stem's top. */
  card: E;
  /** The dashed outline of the place it left. Static opacity .7. */
  ghost?: E | null;
  /** The receiver's avatar: it answers when the card lands. */
  toAvatar?: E | null;
  /** The giver's or seller's Yours: it peels off as the card is picked up. Static opacity 0 (or removed). */
  peel?: E | null;
  /** The buyer's Yours: it sticks on when the card lands. Static opacity 1. */
  stick?: E | null;
  /** The card's state pill before (static opacity 0) and after (static) the hand-off: it rolls when the card lands. */
  pillFrom?: E | null;
  pillTo?: E | null;
  /** The two sparkles, popping as it lands. Static visible. */
  sparks?: readonly E[];
  /** The sentence and the receipt (`[data-after]`): they fade in, rising 6 px. Static visible. */
  after?: readonly E[];
}

export interface HandoffPlan<E> {
  tracks: Track<E>[];
  /** The one clock (ms). */
  T: number;
  /** When to focus the sentence and announce (ms). */
  focusAt: number;
}

/** The ghost's opacity at rest (the empty place the card left). */
export const GHOST_OPACITY = 0.7;

/**
 * The tracks of the strap hand-off. `dx` (px) is how far the card travels: it starts `dx` to the left of its static
 * place (under the giver) and ends at its static place (under the receiver). Every track ends on its element's static
 * value (the peeled Yours ends invisible; Handoff.tsx then removes it), so cancelling at the end changes nothing.
 */
export function handoffTracks<E>(parts: HandoffParts<E>, dx: number, opts: { reduce?: boolean; carryMs?: number } = {}): HandoffPlan<E> {
  const from = `${-Math.max(0, Math.round(dx))}px 0`;
  const { card, ghost, toAvatar, peel, stick, pillFrom, pillTo } = parts;
  const sparks = parts.sparks ?? [];
  const after = parts.after ?? [];

  if (opts.reduce) {
    const r = HANDOFF_REDUCED;
    const tracks: Track<E>[] = [
      { el: card, prop: "opacity", frames: [[0, 1, EASE.in], [r.out, 0], [r.jump + 10, 0, EASE.out], [r.in, 1]] },
      { el: card, prop: "translate", frames: [[0, from], [r.jump - 1, from], [r.jump, "0 0"]] },
      { el: after, prop: "opacity", frames: [[0, 0], [r.after[0], 0, EASE.out], [r.after[1], 1]] },
      { el: ghost, prop: "opacity", frames: [[0, 0], [r.ghost[0], 0, EASE.out], [r.ghost[1], GHOST_OPACITY]] },
      { el: peel, prop: "opacity", frames: [[0, 1], [r.jump - 1, 1], [r.jump, 0]] },
      { el: stick, prop: "opacity", frames: [[0, 0], [r.jump - 1, 0], [r.jump, 1]] },
      { el: pillFrom, prop: "opacity", frames: [[0, 1], [r.jump - 1, 1], [r.jump, 0]] },
      { el: pillTo, prop: "opacity", frames: [[0, 0], [r.jump - 1, 0], [r.jump, 1]] },
      // the sparkles simply appear with the card (no pop under reduced motion)
      { el: sparks, prop: "opacity", frames: [[0, 0], [r.jump + 10, 0, EASE.out], [r.in, 1]] },
    ];
    return { tracks, T: r.T, focusAt: r.focus };
  }

  const t = handoffTimes(opts.carryMs ?? 460);
  const click = t.touch;
  const tracks: Track<E>[] = [
    // the hand that carries the hook along the strap, then the stem's click into its notch
    {
      el: card,
      prop: "translate",
      frames: [[0, from], [t.c0, from, EASE.carry], [t.c1, "0 0"], [click, "0 0", EASE.out], [click + 90, "0 3px", EASE.out], [click + 220, "0 0"]],
    },
    // the pendulum: sine half-waves between the extremes, the last segment easing out into rest
    { el: card, prop: "rotate", frames: t.swing.map(([ms, deg], i, a) => [ms, `${deg}deg`, i === a.length - 2 ? EASE.out : EASE.swing] as const) },
    // the sentence and the receipt
    { el: after, prop: "opacity", frames: [[0, 0], [t.after, 0, EASE.out], [t.after + 200, 1]] },
    { el: after, prop: "translate", frames: [[0, "0 6px"], [t.after, "0 6px", EASE.out], [t.after + 200, "0 0"]] },
    // the empty place it left
    { el: ghost, prop: "opacity", frames: [[0, 0], [t.c0 + 160, 0, EASE.out], [t.c0 + 420, GHOST_OPACITY]] },
    // the receiver answers when the card lands
    { el: toAvatar, prop: "scale", frames: [[0, "1"], [click, "1", EASE.out], [click + 110, "1.14", EASE.inOut], [click + 280, "1"]] },
    // "Yours" peels off as it is picked up: it isn't yours any more
    { el: peel, prop: "opacity", frames: [[0, 1], [60, 1, EASE.in], [t.peelEnd, 0]] },
    { el: peel, prop: "scale", frames: [[0, "1", EASE.in], [t.peelEnd, "1.25"]] },
    { el: peel, prop: "rotate", frames: [[0, "0deg", EASE.in], [t.peelEnd, "-10deg"]] },
    { el: peel, prop: "translate", frames: [[0, "0 0", EASE.in], [t.peelEnd, "0 -6px"]] },
    // the buyer's Yours sticks on as it lands, and the card's state word rolls
    ...stickOnTracks(stick, click + 40),
    ...rollTracks(pillFrom, pillTo, click),
  ];
  // two sparkles pop as it lands, 80 ms apart, inside the clock
  sparks.forEach((sp, i) => {
    const s0 = click + 40 + i * 80;
    tracks.push(
      { el: sp, prop: "opacity", frames: [[0, 0], [s0, 0], [s0 + 60, 1]] },
      { el: sp, prop: "scale", frames: [[0, "0.2"], [s0, "0.2", EASE.out], [s0 + 130, "1.15", EASE.inOut], [s0 + 220, "1"]] },
      { el: sp, prop: "rotate", frames: [[0, "-40deg"], [s0, "-40deg", EASE.out], [s0 + 220, "0deg"]] },
    );
  });
  return { tracks, T: t.T, focusAt: t.focus };
}

/**
 * The hand-off plays once per device per sale on the seller's Sold receipt (motion-spec §2 (c)). Storage blocked means
 * it plays once per page load. Returns true the first time a key is seen (and marks it).
 */
export function firstTimeFor(key: string, storage: Pick<Storage, "getItem" | "setItem"> | null | undefined): boolean {
  try {
    if (!storage) return true;
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

/** The localStorage key of a seen sale: `satchel:seen-sale:v1:{id}:{listing}`. */
export const seenSaleKey = (tokenId: string, listingId: string | number) => `satchel:seen-sale:v1:${tokenId}:${listingId}`;
