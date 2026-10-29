/**
 * The WAAPI motion engine (motion-spec §0 and §11): a TypeScript port of `play` + `mergeTracks` from
 * proto/motion/motion-kit.js. No dependencies, and never the `motion` package (R10).
 *
 * - **One clock per motion.** A motion is a set of tracks over ONE duration `T` (ms), so it seeks by one number (QA,
 *   frame captures, tests).
 * - **The static CSS is the end state.** Tracks animate FROM earlier states (`fill: "both"`) and the animations cancel
 *   themselves when they finish, so the page rests on plain CSS: no JS, reduced motion and the end of a motion all show
 *   the same frame.
 * - **Transform and opacity only**, as the individual `translate` / `rotate` / `scale` properties, so a static tilt on
 *   `transform` (the −4° Yours sticker) is kept.
 *
 * Owned by package X (the hand-off); reusable by any motion that follows the same rules.
 */

/** motion-spec §1 easings (the same curves as the `--ease-*` tokens in globals.css). */
export const EASE = {
  /** arrivals, settles, the press */
  out: "cubic-bezier(.2, 0, 0, 1)",
  /** exits, peel-off */
  in: "cubic-bezier(.3, 0, 1, 1)",
  /** squash, nudges, bar fills */
  inOut: "cubic-bezier(.65, 0, .35, 1)",
  /** sheets in (the iOS drawer curve) */
  sheet: "cubic-bezier(.32, .72, 0, 1)",
  /** between two swing extremes (a sine half-wave) */
  swing: "cubic-bezier(.37, 0, .63, 1)",
  /** the hand-off carry: gentle start, firm stop */
  carry: "cubic-bezier(.68, 0, .59, 1)",
  /** setting something down (gravity) */
  fall: "cubic-bezier(.55, 0, 1, .45)",
} as const;

export type MotionProp = "translate" | "rotate" | "scale" | "opacity";
export type FrameValue = string | number;
/** `[ms, value, easing of the segment that STARTS at this frame]` (linear when omitted). */
export type Frame = readonly [number, FrameValue, string?];

/** The element surface the engine needs: `Element` in the browser, a stub in unit tests. */
export interface Animatable {
  animate(keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation;
}

export interface Track<E = Animatable> {
  /** One element, several (each gets the same frames), or nothing (the track is skipped). */
  el: E | readonly E[] | null | undefined;
  prop: MotionProp;
  frames: readonly Frame[];
}

export interface MergedTrack<E = Animatable> {
  el: E;
  prop: MotionProp;
  frames: Frame[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const listOf = <E>(el: Track<E>["el"]): E[] => (el == null ? [] : Array.isArray(el) ? [...(el as readonly E[])] : [el as E]);
const byTime = (a: Frame, b: Frame) => a[0] - b[0];

/** When a track starts changing: the time of the last frame that still holds its first value. */
function changeStart(frames: readonly Frame[]): number {
  let i = 0;
  while (i + 1 < frames.length && String(frames[i + 1][1]) === String(frames[0][1])) i++;
  return frames[i][0];
}

/**
 * Two tracks on the same element and property would fight (the later Animation wins outright), so they are merged into
 * one keyframe list: each track owns the time from where it starts changing until the next one starts.
 */
export function mergeTracks<E>(tracks: readonly Track<E>[]): MergedTrack<E>[] {
  const byEl = new Map<E, Map<MotionProp, Frame[][]>>();
  const order: [E, MotionProp][] = [];
  for (const tr of tracks) {
    if (!tr.frames.length) continue;
    for (const el of listOf(tr.el)) {
      let props = byEl.get(el);
      if (!props) byEl.set(el, (props = new Map()));
      let list = props.get(tr.prop);
      if (!list) {
        props.set(tr.prop, (list = []));
        order.push([el, tr.prop]);
      }
      list.push([...tr.frames].sort(byTime));
    }
  }
  return order.map(([el, prop]) => {
    const list = byEl.get(el)!.get(prop)!.sort((a, b) => changeStart(a) - changeStart(b));
    let frames: Frame[] = [];
    list.forEach((f, k) => {
      const from = k === 0 ? -Infinity : changeStart(f);
      const to = k + 1 < list.length ? changeStart(list[k + 1]) : Infinity;
      frames = frames.concat(f.filter(([t]) => t >= from && t < to));
    });
    return { el, prop, frames };
  });
}

/** One merged track as WAAPI keyframes over `T`: offsets in [0, 1], held flat before the first and after the last. */
export function toKeyframes(frames: readonly Frame[], prop: MotionProp, T: number): Keyframe[] {
  const f = [...frames].sort(byTime);
  const kf: Keyframe[] = f.map(([t, v, e]) => {
    const k: Keyframe = { offset: clamp01(t / T), [prop]: v };
    if (e) k.easing = e;
    return k;
  });
  if ((kf[0].offset as number) > 0) kf.unshift({ offset: 0, [prop]: f[0][1] });
  if ((kf[kf.length - 1].offset as number) < 1) kf.push({ offset: 1, [prop]: f[f.length - 1][1] });
  return kf;
}

export interface MotionHandle {
  readonly anims: Animation[];
  readonly T: number;
  /** Resolves when every animation has finished or was cancelled. */
  readonly finished: Promise<void>;
  cancel(): void;
  /** Pause every track at `ms` (captures, QA, tests): a frame is a pure function of the time. */
  seek(ms: number): void;
  /** Speed (captures at ¼×). */
  setRate(rate: number): void;
}

/**
 * Play tracks over one clock `T` (ms). Each merged track becomes one Animation (`fill: "both"`, linear overall, the
 * per-segment easing in its keyframes). Unless `keep`, the animations cancel themselves once all have finished, so
 * the element rests on its static CSS (which must equal the last frame).
 */
export function play<E extends Animatable>(tracks: readonly Track<E>[], T: number, opts: { keep?: boolean } = {}): MotionHandle {
  const anims: Animation[] = [];
  for (const tr of mergeTracks(tracks)) {
    if (typeof tr.el.animate !== "function" || !tr.frames.length) continue;
    anims.push(tr.el.animate(toKeyframes(tr.frames, tr.prop, T), { duration: T, fill: "both", easing: "linear" }));
  }
  const finished = Promise.all(anims.map((a) => a.finished.then(() => undefined, () => undefined))).then(() => undefined);
  const handle: MotionHandle = {
    anims,
    T,
    finished,
    cancel: () => anims.forEach((a) => a.cancel()),
    seek: (ms) =>
      anims.forEach((a) => {
        a.pause();
        a.currentTime = ms;
      }),
    setRate: (rate) => anims.forEach((a) => (a.playbackRate = rate)),
  };
  if (!opts.keep) {
    void finished.then(() => {
      if (anims.every((a) => a.playState === "finished")) handle.cancel();
    });
  }
  return handle;
}

/** A handle that does nothing (no WAAPI, or nothing to move). */
export const NO_MOTION: MotionHandle = {
  anims: [],
  T: 0,
  finished: Promise.resolve(),
  cancel: () => {},
  seek: () => {},
  setRate: () => {},
};

/**
 * The label roll as tracks at `at` (motion-spec §3 "Roll"): the old one rolls up 8 px and out (140 ms ease-in), the
 * new one rolls up from 8 px below, starting 70 ms later, in by 250 ms (ease-out). Reduced: a cross-fade.
 */
export function rollTracks<E>(cur: E | null | undefined, next: E | null | undefined, at: number, reduce = false): Track<E>[] {
  if (reduce) {
    return [
      { el: cur, prop: "opacity", frames: [[0, 1], [at, 1, EASE.in], [at + 120, 0]] },
      { el: next, prop: "opacity", frames: [[0, 0], [at + 60, 0, EASE.out], [at + 200, 1]] },
    ];
  }
  return [
    { el: cur, prop: "opacity", frames: [[0, 1], [at, 1, EASE.in], [at + 140, 0]] },
    { el: cur, prop: "translate", frames: [[0, "0 0"], [at, "0 0", EASE.in], [at + 140, "0 -8px"]] },
    { el: next, prop: "opacity", frames: [[0, 0], [at + 70, 0, EASE.out], [at + 250, 1]] },
    { el: next, prop: "translate", frames: [[0, "0 8px"], [at + 70, "0 8px", EASE.out], [at + 250, "0 0"]] },
  ];
}

/**
 * A sticker pressed onto the surface at `at` (motion-spec §3 "stick on"): from above (bigger, turned), it lands slightly
 * squashed and settles in 320 ms. It animates the individual `scale` and `rotate`, so a static `transform` tilt stays.
 */
export function stickOnTracks<E>(el: E | null | undefined, at: number, o: { from?: number; turn?: number } = {}): Track<E>[] {
  const big = o.from ?? 1.6;
  const turn = o.turn ?? -16;
  return [
    { el, prop: "opacity", frames: [[0, 0], [at, 0], [at + 70, 1]] },
    { el, prop: "scale", frames: [[0, `${big}`], [at, `${big}`, EASE.out], [at + 160, "0.92", EASE.inOut], [at + 320, "1"]] },
    { el, prop: "rotate", frames: [[0, `${turn}deg`], [at, `${turn}deg`, EASE.out], [at + 160, `${-turn * 0.15}deg`, EASE.inOut], [at + 320, "0deg"]] },
  ];
}
