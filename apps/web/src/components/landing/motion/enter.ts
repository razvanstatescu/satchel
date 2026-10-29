import { play, rollTracks, stickOnTracks, type MotionHandle, type Track } from "@/lib/motion/play";
import { readMotionMode, subscribeMotionMode } from "@/lib/motion-flag";
import { appearTracks, EASE, swingInTracks } from "./tracks";

/**
 * The landing's once-on-enter moments (motion-spec §10 "Once on enter"; proto/motion/landing-motion.js `mountEnter`).
 * Each explains one thing, plays once when 60 % of its trigger is in view, and ends on the static CSS (the server frame),
 * so no JS, reduced motion and the end of a motion all show the same page.
 *
 * - Anything on screen (or above it) when the engine mounts stays as drawn; below the fold it waits on its first frame.
 * - The clean-history beats play in turn, at least GAP ms apart, even when several enter together.
 * - Never inside an inert tree (a dialog over the page): the frame simply shows its end.
 * - Reduced motion (live): everything in flight ends at once, on its end frame.
 */

/** The clean-history beats play at least this far apart (motion-spec §10). */
export const GAP = 700;

/**
 * Behind a modal: a dialog or the menu sheet over the page makes the background `inert` (FlowShell, MenuSheet). Only
 * `inert` counts here: the triggers are illustrations, `aria-hidden` themselves, so `inInertTree` would always say yes.
 */
function behindModal(el: Element): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) if (n.hasAttribute("inert") || (n as HTMLElement).inert === true) return true;
  return false;
}

/** A piece of a motion: a `[data-k]` inside the page. */
type Q<E> = (k: string) => E | null | undefined;

export interface EnterDef {
  name: string;
  /** What must be 60 % in view (a selector). */
  trigger: string;
  /** The motion's one clock (ms). */
  T: number;
  tracks<E>(q: Q<E>): Track<E>[];
  /** Runs at the end, before the animations cancel (the How card's swing comes to rest: `data-rest`). */
  after?: (q: Q<Element>) => void;
  /** Clean-history beats: queued GAP apart. */
  inTurn?: boolean;
}

const sparkPop = <E>(el: E | null | undefined, t0: number): Track<E>[] => [
  { el, prop: "opacity", frames: [[0, 0], [t0, 0], [t0 + 80, 1]] },
  { el, prop: "scale", frames: [[0, "0.2"], [t0, "0.2", EASE.out], [t0 + 180, "1.15", EASE.inOut], [t0 + 300, "1"]] },
];

export const ENTER: readonly EnterDef[] = [
  {
    // #what: the address tags swing in on their strings, about the string's top on the card's edge: they go with it
    name: "what",
    trigger: '[data-enter="what"]',
    T: 1_400,
    tracks: (q) => [...swingInTracks(q("addr-btc"), 0, 16), ...swingInTracks(q("addr-eth"), 90, -16), ...swingInTracks(q("addr-sol"), 180, 16)],
  },
  {
    // How it works, step 1: the New card drops into its shadow, New sticks on, the sparkles pop: minting makes a sticker
    name: "how-mint",
    trigger: '[data-k="mint-card"]',
    T: 1_000,
    tracks: (q) => {
      const card = q("mint-card");
      return [
        { el: card, prop: "translate", frames: [[0, "0 -14px", EASE.fall], [240, "0 2px", EASE.out], [360, "0 0"]] },
        { el: card, prop: "scale", frames: [[0, "1.06", EASE.fall], [240, "1"]] },
        { el: card, prop: "opacity", frames: [[0, 0, EASE.out], [100, 1]] },
        ...stickOnTracks(q("mint-new"), 380),
        ...sparkPop(q("mint-spark-1"), 560),
        ...sparkPop(q("mint-spark-2"), 680),
      ];
    },
  },
  {
    // How it works, step 3: released from its drawn −8° pose (a static transform), the card swings to rest under the new
    // owner: −8 → +6.2 → −4.4 → +2.8 → −1.4 → 0 (the animated `rotate` adds to the static −8°), then rests at 0
    name: "how-give",
    trigger: '[data-k="give-pose"]',
    T: 1_800,
    tracks: (q) => [
      {
        el: q("give-pose"),
        prop: "rotate",
        frames: [[0, "0deg", EASE.swing], [380, "14.2deg", EASE.swing], [760, "3.6deg", EASE.swing], [1_140, "10.8deg", EASE.swing], [1_500, "6.6deg", EASE.out], [1_800, "8deg"]],
      },
    ],
    after: (q) => q("give-pose")?.setAttribute("data-rest", ""),
  },
  {
    // the catch, beat 1: the signed transfer slides out from behind the card (the seller keeps it)
    name: "beat-1",
    trigger: '[data-beat="1"] [data-desk]',
    T: 520,
    inTurn: true,
    tracks: (q) => {
      const note = q("note");
      return [
        { el: note, prop: "opacity", frames: [[0, 0, EASE.out], [160, 1]] },
        { el: note, prop: "translate", frames: [[0, "-56px -18px", EASE.out], [460, "0 0"]] },
        { el: note, prop: "rotate", frames: [[0, "-8deg", EASE.out], [460, "0deg"]] },
      ];
    },
  },
  {
    // beat 2: the ETH rolls 0.80 → 0.00, its coin turns sad and sinks, the stamp lands: moved after the sale
    name: "beat-2",
    trigger: '[data-beat="2"] [data-desk]',
    T: 820,
    inTurn: true,
    tracks: (q) => [
      ...rollTracks(q("eth-amt-old"), q("eth-amt-new"), 120),
      { el: q("eth-coin-old"), prop: "opacity", frames: [[0, 1], [120, 1, EASE.in], [240, 0]] },
      { el: q("eth-coin-new"), prop: "opacity", frames: [[0, 0], [120, 0, EASE.out], [240, 1]] },
      { el: q("eth-coin"), prop: "translate", frames: [[0, "0 0"], [120, "0 0", EASE.out], [260, "0 2px"], [380, "0 0"]] },
      ...stickOnTracks(q("stamp"), 440, { from: 1.8, turn: -14 }),
    ],
  },
  {
    // beat 3: Signature 3 writes into the record, the pen first
    name: "beat-3",
    trigger: '[data-beat="3"] [data-desk]',
    T: 640,
    inTurn: true,
    tracks: (q) => {
      const row = q("rec-row");
      return [
        { el: row, prop: "opacity", frames: [[0, 0, EASE.out], [180, 1]] },
        { el: row, prop: "translate", frames: [[0, "8px 0", EASE.out], [260, "0 0"]] },
        ...stickOnTracks(q("rec-pen"), 200, { from: 1.6, turn: -24 }),
      ];
    },
  },
  {
    // beat 4: the buyer's browser spots it: the head fades in, Unused sticks on, Buy nudges twice (no flashing)
    name: "beat-4",
    trigger: '[data-beat="4"] [data-desk]',
    T: 820,
    inTurn: true,
    tracks: (q) => [
      ...appearTracks(q("head-4"), 0, 200, 6),
      ...stickOnTracks(q("unused-4"), 180, { from: 1.4, turn: 0 }),
      {
        el: q("buy-4"),
        prop: "translate",
        frames: [[0, "0 0"], [540, "0 0", EASE.inOut], [590, "-2px 0", EASE.inOut], [640, "2px 0", EASE.inOut], [690, "-2px 0", EASE.inOut], [740, "2px 0", EASE.out], [790, "0 0"]],
      },
    ],
  },
  {
    // beat 5: Unused rolls to Used, the head rolls to Clean history, Buy rises from flat: the one coral in view
    name: "beat-5",
    trigger: '[data-beat="5"] [data-desk]',
    T: 720,
    inTurn: true,
    tracks: (q) => [
      ...rollTracks(q("row-5-old"), q("row-5-new"), 0),
      ...rollTracks(q("head-5-old"), q("head-5-new"), 140),
      { el: q("buy-5-old"), prop: "opacity", frames: [[0, 1], [300, 1, EASE.in], [420, 0]] },
      { el: q("buy-5-new"), prop: "opacity", frames: [[0, 0], [300, 0, EASE.out], [380, 1]] },
      { el: q("buy-5-new"), prop: "translate", frames: [[0, "0 3px"], [300, "0 3px", EASE.out], [520, "0 0"]] },
    ],
  },
  {
    // Trust: the two coins peek up from behind the contract facts (a slight overshoot, 90 ms apart): they're safe there
    name: "trust",
    trigger: '[data-enter="trust"]',
    T: 640,
    tracks: (q) =>
      (["peek-btc", "peek-eth"] as const).map((k, i) => ({
        el: q(k),
        prop: "translate" as const,
        frames: [[0, "0 34px"], [i * 90, "0 34px", "cubic-bezier(.34, 1.4, .64, 1)"], [i * 90 + 440, "0 0"]] as const,
      })),
  },
  {
    // the finale: the S face drops onto its own drop, which darkens as it nears, presses 10 units in and rests. "Stick it
    // on." The S never rotates.
    name: "finale",
    trigger: '[data-enter="finale"]',
    T: 520,
    tracks: (q) => {
      const face = q("s-face");
      return [
        { el: q("s-drop"), prop: "opacity", frames: [[0, 0, EASE.in], [300, 1]] },
        { el: face, prop: "opacity", frames: [[0, 0], [60, 0, EASE.out], [120, 1]] },
        { el: face, prop: "translate", frames: [[0, "0 -64px"], [60, "0 -64px", EASE.fall], [300, "0 10px", EASE.out], [460, "0 0"]] },
      ];
    },
  },
];

export interface EnterHandle {
  /** QA: play one moment from its start (`name`), or seek it to `ms` and hold. */
  play(name: string): void;
  seek(name: string, ms: number): void;
  destroy(): void;
}

const NOOP: EnterHandle = { play() {}, seek() {}, destroy() {} };

/** Arm every once-on-enter moment of the page under `doc`. */
export function mountEnter(doc: Document | null): EnterHandle {
  if (!doc || typeof window === "undefined") return NOOP;
  const q: Q<Element> = (k) => doc.querySelector(`[data-k="${k}"]`);
  const live = new Map<string, MotionHandle>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let nextSlot = 0;
  let io: IntersectionObserver | null = null;

  const end = (name: string) => {
    live.get(name)?.cancel();
    live.delete(name);
  };
  /** Build a moment's animations, held at `ms` (its first frame: 0). */
  const arm = (def: EnterDef, ms = 0) => {
    end(def.name);
    const h = play(def.tracks(q), def.T, { keep: true });
    h.seek(ms);
    live.set(def.name, h);
    return h;
  };
  const run = (def: EnterDef, trigger: Element) => {
    const h = live.get(def.name) ?? arm(def);
    // never behind a modal: show its end at once
    if (behindModal(trigger) || readMotionMode() !== "full") return end(def.name);
    h.anims.forEach((a) => a.play());
    void h.finished.then(() => {
      if (live.get(def.name) !== h) return;
      def.after?.(q);
      end(def.name);
    });
  };
  /** The beats take turns: each starts at least GAP after the previous one. */
  const inTurn = (fn: () => void) => {
    const t = performance.now();
    const wait = Math.max(0, nextSlot - t);
    nextSlot = Math.max(t, nextSlot) + GAP;
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, wait);
    timers.add(id);
  };

  const full = readMotionMode() === "full" && typeof doc.body?.animate === "function";
  if (full && typeof IntersectionObserver !== "undefined") {
    const armed = new Map<Element, EnterDef>();
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio < 0.6) continue;
          const def = armed.get(e.target);
          if (!def) continue;
          io?.unobserve(e.target);
          armed.delete(e.target);
          const go = () => run(def, e.target);
          if (def.inTurn) inTurn(go);
          else go();
        }
      },
      { threshold: [0.6] },
    );
    for (const def of ENTER) {
      const trigger = doc.querySelector(def.trigger);
      if (!trigger) continue;
      // on screen or above it: it stays as drawn
      if (trigger.getBoundingClientRect().top < window.innerHeight) continue;
      arm(def);
      armed.set(trigger, def);
      io.observe(trigger);
    }
  }

  // reduced motion (live): everything ends on its end frame; nothing is armed again
  const offMotion = subscribeMotionMode(() => {
    if (readMotionMode() === "full") return;
    io?.disconnect();
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const name of [...live.keys()]) end(name);
  });

  const byName = (name: string) => ENTER.find((d) => d.name === name);
  return {
    play(name) {
      const def = byName(name);
      const trigger = def && doc.querySelector(def.trigger);
      if (!def || !trigger) return;
      arm(def);
      run(def, trigger);
    },
    seek(name, ms) {
      const def = byName(name);
      if (def) arm(def, ms);
    },
    destroy() {
      io?.disconnect();
      offMotion();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const name of [...live.keys()]) end(name);
      // the How card keeps its drawn pose after a remount
      q("give-pose")?.removeAttribute("data-rest");
    },
  };
}
