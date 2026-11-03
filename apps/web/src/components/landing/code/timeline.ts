import { rollTracks, stickOnTracks, type Track } from "@/lib/motion/play";
import { EASE, resetTrack } from "@/components/landing/motion/tracks";

/**
 * Trust, dev's code-card loop (site polish round §2.4; the design prototype's `codeTracks`). A simplified `sign_for`
 * (`copy.landing.lock.dev.code`) whose rail walks its four steps, over and over: data only (no DOM), so it's
 * unit-tested by seeking. `T` is 10 s (over 5 s, so `CodeCard` renders a visible Pause, motion-spec §0.8); `START_AT`
 * is the server frame (step 3 held, "Written here, before anything is signed"), so hydration changes nothing.
 * Every track's value at `T` equals its value at 0 (the loop's seam is seamless).
 */

/** The loop's one clock (ms). Each step holds 2.4 s, long enough to read its caption. */
export const T = 10_000;
/** The server frame: step 3 held (`REST_STEP`). The engine mounts here, so hydration changes nothing visible. */
export const START_AT = 6_000;
/** Step k's start: the rail lands on line k+1, its caption rolls in. */
export const STEPS = [0, 2_400, 4_800, 7_200] as const;
/** The rail's move between lines. */
export const MOVE = 260;
/** The ticks fade, the rail glides from line 5 back to line 2, the caption rolls to step 1, the bars empty. */
export const SEAM = 9_600;
/** One line (fixed at every width), the rail's unit. */
export const LINE = 24;
/** The record step: the server frame's rest pose. */
export const REST_STEP = 3;

type N3 = 1 | 2 | 3;
type N4 = 1 | 2 | 3 | 4;
export type CodeKey = "code-rail" | `code-tick-${N3}` | `code-cap-${N4}` | `code-bar-${N4}`;

export const CODE_KEYS: readonly CodeKey[] = [
  "code-rail",
  ...([1, 2, 3] as const).map((k) => `code-tick-${k}` as const),
  ...([1, 2, 3, 4] as const).flatMap((n) => [`code-cap-${n}`, `code-bar-${n}`] as const),
];

export function codeTracks<E>(q: (k: CodeKey) => E | null | undefined): Track<E>[] {
  const tr: Track<E>[] = [];
  const y = (n: number) => `0 ${n * LINE}px`; // n lines below line 1
  tr.push({
    el: q("code-rail"),
    prop: "translate",
    frames: [
      [0, y(1)],
      [STEPS[1], y(1), EASE.inOut],
      [STEPS[1] + MOVE, y(2)],
      [STEPS[2], y(2), EASE.inOut],
      [STEPS[2] + MOVE, y(3)],
      [STEPS[3], y(3), EASE.inOut],
      [STEPS[3] + MOVE, y(4)],
      [SEAM, y(4), EASE.inOut],
      [T, y(1)],
    ],
  });
  ([1, 2, 3] as const).forEach((k) => {
    const el = q(`code-tick-${k}`);
    tr.push(...stickOnTracks(el, STEPS[k] + 60, { from: 1.5, turn: 0 }));
    tr.push({ el, prop: "opacity", frames: [[SEAM, 1, EASE.in], [SEAM + 200, 0], [T, 0]] });
    tr.push(resetTrack(el, "scale", SEAM + 200, "1", "1.5", T));
  });
  ([1, 2, 3, 4] as const).forEach((n, i) => {
    const t1 = i < 3 ? STEPS[i + 1] : SEAM;
    tr.push({
      el: q(`code-bar-${n}`),
      prop: "scale",
      frames: [[0, "0 1"], [STEPS[i], "0 1", "linear"], [t1, "1 1"], [SEAM, "1 1", EASE.inOut], [SEAM + 300, "0 1"], [T, "0 1"]],
    });
    tr.push(...rollTracks(q(`code-cap-${n}`), q(`code-cap-${((n % 4) + 1) as 1 | 2 | 3 | 4}`), i < 3 ? STEPS[i + 1] : SEAM));
  });
  return tr;
}
