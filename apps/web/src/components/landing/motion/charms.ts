import { play } from "@/lib/motion/play";
import { readMotionMode } from "@/lib/motion-flag";
import { swingFrames } from "./tracks";

/**
 * The hero's hanging charms (motion-spec §7 and §10): the coins on their strings at the shelf's ends (from 1100 px)
 * and the phone's charm row. Each swings about the top of its string once, 450 ms after load (110 ms apart), and once
 * when the pointer brushes it (the direction from the pointer). Never an idle loop; never restarted while a swing is
 * still above 60 % of its amplitude. Reduced motion: still.
 */

export const LOAD_SWING = { delay: 450, stagger: 110, halfMs: 520, ratio: 0.6, n: 4 } as const;
/** The first swing's amplitude by position (alternating), and a brush's. */
export const loadAmp = (i: number) => (i % 2 ? -6 : 7);
export const BRUSH_AMP = 5;

export function mountCharms(doc: Document | null): () => void {
  if (!doc || typeof window === "undefined" || readMotionMode() !== "full") return () => {};
  // only the ones on show at this width (the row below 1024, the hanging coins from 1100)
  const charms = [...doc.querySelectorAll<HTMLElement>("[data-charm]")].filter((el) => el.offsetParent !== null && typeof el.animate === "function");
  const until = new WeakMap<Element, number>();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const cleanups: (() => void)[] = [];

  const swing = (el: HTMLElement, amp: number) => {
    if (readMotionMode() !== "full") return;
    const busy = until.get(el);
    if (busy && performance.now() < busy - LOAD_SWING.halfMs * 2) return; // still swinging hard: let it settle
    const frames = swingFrames(0, amp, LOAD_SWING.halfMs, LOAD_SWING.ratio, LOAD_SWING.n);
    const T = frames[frames.length - 1][0];
    until.set(el, performance.now() + T);
    play([{ el, prop: "rotate", frames }], T);
  };

  charms.forEach((el, i) => {
    timers.push(setTimeout(() => swing(el, loadAmp(i)), LOAD_SWING.delay + i * LOAD_SWING.stagger));
    const brush = (e: PointerEvent) => swing(el, BRUSH_AMP * (e.movementX < 0 ? -1 : 1));
    el.addEventListener("pointerenter", brush);
    cleanups.push(() => el.removeEventListener("pointerenter", brush));
  });

  return () => {
    timers.forEach(clearTimeout);
    cleanups.forEach((off) => off());
    for (const el of charms) for (const a of el.getAnimations()) a.cancel();
  };
}
