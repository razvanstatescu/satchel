import { EASE, type Frame, type Track } from "@/lib/motion/play";

/**
 * The landing's own track builders (motion-spec §0–§3, §7, §10; ported from proto/motion/motion-kit.js and
 * landing-motion.js). The engine, `mergeTracks` and the shared builders (`stickOnTracks`, `rollTracks`) are X's
 * `@/lib/motion/play`; these are the ones only the landing uses. Data only (no DOM), so they are unit-tested by value:
 * every builder ends on its element's static CSS, so a motion that cancels at its end changes nothing.
 */

export { EASE };

/** A degree value as a short CSS string (`-2.4deg`, never `3.5999999999999996deg`). */
export const deg = (x: number) => `${Math.round(x * 100) / 100 || 0}deg`;

/** Appear: fade in at `at` over `dur`, rising `dy` px. */
export function appearTracks<E>(el: E | null | undefined, at: number, dur = 200, dy = 6): Track<E>[] {
  const tr: Track<E>[] = [{ el, prop: "opacity", frames: [[0, 0], [at, 0, EASE.out], [at + dur, 1]] }];
  if (dy) tr.push({ el, prop: "translate", frames: [[0, `0 ${dy}px`], [at, `0 ${dy}px`, EASE.out], [at + dur, "0 0"]] });
  return tr;
}

/**
 * Re-stick (motion-spec §8, the hero's coins "came along"): a sticker that is already there peels up 6 px, turns and
 * slaps back down 1 px into the card, in 320 ms.
 */
export function hopTracks<E>(el: E | null | undefined, at: number): Track<E>[] {
  return [
    { el, prop: "translate", frames: [[0, "0 0"], [at, "0 0", EASE.out], [at + 120, "0 -6px", EASE.fall], [at + 230, "0 1px", EASE.out], [at + 320, "0 0"]] },
    { el, prop: "scale", frames: [[0, "1"], [at, "1", EASE.out], [at + 120, "1.18", EASE.inOut], [at + 230, "0.94", EASE.out], [at + 320, "1"]] },
    { el, prop: "rotate", frames: [[0, "0deg"], [at, "0deg", EASE.out], [at + 120, "-12deg", EASE.inOut], [at + 230, "2deg", EASE.out], [at + 320, "0deg"]] },
  ];
}

/**
 * A hard reset on a loop's seam: `from` until `at`, `to` one millisecond later and until the end `T`. The loop moves
 * everything back to act 1 while the card is out of sight (motion-spec §10 "seam").
 */
export function resetTrack<E>(el: E | null | undefined, prop: Track<E>["prop"], at: number, from: string | number, to: string | number, T: number): Track<E> {
  return { el, prop, frames: [[0, from], [at, from], [at + 1, to], [T, to]] };
}

/**
 * A damped pendulum about 0 (motion-spec §7): from rest to `amp` in a quarter period, then each extreme `ratio` of the
 * last, `n` extremes, back to rest. Never loops.
 */
export function swingFrames(t0: number, amp: number, halfMs: number, ratio: number, n: number): Frame[] {
  const fr: Frame[] = [[t0, "0deg", EASE.swing]];
  let a = amp;
  let t = t0 + halfMs / 2;
  for (let i = 0; i < n; i++) {
    fr.push([Math.round(t), deg(a), i === n - 1 ? EASE.out : EASE.swing]);
    t += halfMs;
    a = -a * ratio;
  }
  fr.push([Math.round(t - halfMs / 2), "0deg"]);
  return fr;
}

/**
 * A tag swinging in on its string (motion-spec §10, `#what`): it fades in while it swings about the string's top, ±amp
 * → ∓0.56 → 0.31 → ∓0.16 → 0.06 → 0 over 1180 ms from `at`.
 */
export function swingInTracks<E>(el: E | null | undefined, at: number, amp: number): Track<E>[] {
  return [
    { el, prop: "opacity", frames: [[0, 0], [at, 0, EASE.out], [at + 120, 1]] },
    {
      el,
      prop: "rotate",
      frames: [
        [0, deg(amp)],
        [at, deg(amp), EASE.swing],
        [at + 260, deg(-amp * 0.56), EASE.swing],
        [at + 520, deg(amp * 0.31), EASE.swing],
        [at + 770, deg(-amp * 0.16), EASE.swing],
        [at + 1000, deg(amp * 0.06), EASE.out],
        [at + 1180, "0deg"],
      ],
    },
  ];
}

/**
 * A track's value at `t` when it needs no interpolation: `t` falls on a frame, or inside a segment whose two ends are
 * equal. `undefined` while the value is changing (QA and the unit tests: "the loop rests on its server frame").
 */
export function holdAt(frames: readonly Frame[], t: number): string | undefined {
  const f = [...frames].sort((a, b) => a[0] - b[0]);
  if (!f.length) return undefined;
  if (t <= f[0][0]) return String(f[0][1]);
  if (t >= f[f.length - 1][0]) return String(f[f.length - 1][1]);
  for (let i = 0; i + 1 < f.length; i++) {
    const [a, va] = f[i];
    const [b, vb] = f[i + 1];
    if (t === b) return String(vb);
    if (t >= a && t < b) return String(va) === String(vb) ? String(va) : undefined;
  }
  return undefined;
}
