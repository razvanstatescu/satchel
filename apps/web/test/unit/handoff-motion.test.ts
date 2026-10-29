import { describe, expect, it } from "vitest";
import { firstTimeFor, GHOST_OPACITY, HANDOFF_REDUCED, handoffTimes, handoffTracks, seenSaleKey } from "@/lib/motion/handoff";
import { EASE, mergeTracks, play, rollTracks, stickOnTracks, toKeyframes, type Animatable, type Frame } from "@/lib/motion/play";

/**
 * The hand-off motion (motion-spec §2): the timing table, the WAAPI keyframes (seeked by sampling them, as the browser
 * would at that time), the reduced-motion dip and the "static CSS is the end state" rule. Node has no WAAPI, so the
 * elements are stubs that record what `play` asks of them.
 */

type Recorded = { keyframes: Keyframe[]; options: KeyframeAnimationOptions; anim: FakeAnimation };

class FakeAnimation {
  currentTime: number | null = 0;
  playbackRate = 1;
  playState: "running" | "paused" | "finished" | "idle" = "running";
  cancelled = false;
  private resolve!: () => void;
  finished = new Promise<void>((r) => (this.resolve = r));
  pause() {
    this.playState = "paused";
  }
  cancel() {
    this.cancelled = true;
    this.playState = "idle";
  }
  finish() {
    this.playState = "finished";
    this.resolve();
  }
}

class Stub implements Animatable {
  calls: Recorded[] = [];
  constructor(readonly name: string) {}
  animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    const anim = new FakeAnimation();
    this.calls.push({ keyframes, options, anim });
    return anim as unknown as Animation;
  }
  /** The keyframes this stub got for `prop` (one Animation per element and property after merging). */
  kf(prop: string) {
    const c = this.calls.find((x) => x.keyframes.some((k) => prop in k));
    if (!c) throw new Error(`${this.name}: no ${prop} track`);
    return c.keyframes;
  }
}

/** The value a keyframe list holds at `ms` (exact at keyframes; between keyframes, the earlier one is enough here). */
function valueAt(kf: Keyframe[], prop: string, ms: number, T: number): string | number {
  const at = ms / T;
  let v = kf[0][prop] as string | number;
  for (const k of kf) {
    if ((k.offset as number) <= at + 1e-9) v = k[prop] as string | number;
    else break;
  }
  return v;
}
const last = (kf: Keyframe[], prop: string) => kf[kf.length - 1][prop];
const first = (kf: Keyframe[], prop: string) => kf[0][prop];

function stage() {
  return {
    card: new Stub("card"),
    ghost: new Stub("ghost"),
    toAvatar: new Stub("toAvatar"),
    peel: new Stub("peel"),
    stick: new Stub("stick"),
    pillFrom: new Stub("pillFrom"),
    pillTo: new Stub("pillTo"),
    sparks: [new Stub("sparkA"), new Stub("sparkB")],
    after: [new Stub("sentence"), new Stub("receipt")],
  };
}

describe("handoffTimes (the damped pendulum, carried 460 ms)", () => {
  it("lags 5.8° at 392 ms, swings −10° at 616, settles by 1140, focuses at 1400, ends at 1500", () => {
    const t = handoffTimes();
    expect(t.swing).toEqual([
      [140, 0],
      [392, 5.8],
      [616, -10],
      [826, 3.7],
      [1036, -1.4],
      [1140, 0],
    ]);
    expect([t.c0, t.c1, t.touch, t.after, t.focus, t.T]).toEqual([140, 600, 1140, 1200, 1400, 1500]);
    // the swing settles 540 ms after the carry stops (within the brand's 600 ms)
    expect(t.touch - t.c1).toBeLessThanOrEqual(600);
  });
});

describe("the strap hand-off tracks", () => {
  it("seeking to 616 ms puts the card at rotate −10deg (the arrival swing), with sine half-waves between extremes", () => {
    const s = stage();
    const plan = handoffTracks(s, 130);
    const h = play(plan.tracks, plan.T);
    const rot = s.card.kf("rotate");
    expect(plan.T).toBe(1500);
    expect(valueAt(rot, "rotate", 616, plan.T)).toBe("-10deg");
    expect(valueAt(rot, "rotate", 392, plan.T)).toBe("5.8deg");
    expect(valueAt(rot, "rotate", 1140, plan.T)).toBe("0deg");
    const mid = rot.filter((k) => (k.offset as number) > 0 && (k.offset as number) < 1);
    expect(mid.slice(0, -2).every((k) => k.easing === EASE.swing)).toBe(true);
    expect(mid[mid.length - 2].easing).toBe(EASE.out); // the last segment eases into rest
    h.seek(616);
    expect(h.anims.every((a) => a.currentTime === 616 && a.playState === "paused")).toBe(true);
  });

  it("carries the card dx px along the strap (140 → 600 ms, the carry curve) and clicks the stem 3 px down at 1140", () => {
    const s = stage();
    const plan = handoffTracks(s, 128);
    play(plan.tracks, plan.T);
    const tr = s.card.kf("translate");
    expect(first(tr, "translate")).toBe("-128px 0");
    expect(valueAt(tr, "translate", 140, plan.T)).toBe("-128px 0");
    expect(tr.find((k) => Math.abs((k.offset as number) - 140 / 1500) < 1e-9)?.easing).toBe(EASE.carry);
    expect(valueAt(tr, "translate", 600, plan.T)).toBe("0 0");
    expect(valueAt(tr, "translate", 1230, plan.T)).toBe("0 3px");
    expect(last(tr, "translate")).toBe("0 0");
  });

  it("every track ends on its element's static value (the static CSS is the end state)", () => {
    const s = stage();
    const plan = handoffTracks(s, 140);
    play(plan.tracks, plan.T);
    expect(last(s.card.kf("rotate"), "rotate")).toBe("0deg");
    expect(last(s.ghost.kf("opacity"), "opacity")).toBe(GHOST_OPACITY);
    expect(last(s.toAvatar.kf("scale"), "scale")).toBe("1");
    expect(last(s.peel.kf("opacity"), "opacity")).toBe(0);
    expect(last(s.stick.kf("opacity"), "opacity")).toBe(1);
    expect(last(s.stick.kf("rotate"), "rotate")).toBe("0deg");
    expect(last(s.pillFrom.kf("opacity"), "opacity")).toBe(0);
    expect(last(s.pillTo.kf("opacity"), "opacity")).toBe(1);
    for (const sp of s.sparks) expect(last(sp.kf("opacity"), "opacity")).toBe(1);
    for (const a of s.after) {
      expect(first(a.kf("opacity"), "opacity")).toBe(0);
      expect(last(a.kf("opacity"), "opacity")).toBe(1);
      expect(last(a.kf("translate"), "translate")).toBe("0 0");
    }
    // one Animation per element and property, all on one clock, held before and after (fill both)
    for (const c of s.card.calls) expect(c.options).toMatchObject({ duration: 1500, fill: "both", easing: "linear" });
  });

  it("the Yours peels off in 180 ms; the buyer's sticks on 40 ms after the click; the pill rolls at the click", () => {
    const s = stage();
    const plan = handoffTracks(s, 140);
    play(plan.tracks, plan.T);
    expect(valueAt(s.peel.kf("opacity"), "opacity", 60, 1500)).toBe(1);
    expect(valueAt(s.peel.kf("opacity"), "opacity", 180, 1500)).toBe(0);
    expect(valueAt(s.stick.kf("opacity"), "opacity", 1179, 1500)).toBe(0);
    expect(valueAt(s.stick.kf("opacity"), "opacity", 1250, 1500)).toBe(1);
    expect(valueAt(s.pillFrom.kf("opacity"), "opacity", 1139, 1500)).toBe(1);
    expect(valueAt(s.pillTo.kf("opacity"), "opacity", 1390, 1500)).toBe(1);
    // the sentence fades in from 1200 and focus waits until 1400
    expect(valueAt(s.after[0].kf("opacity"), "opacity", 1199, 1500)).toBe(0);
    expect(plan.focusAt).toBe(1400);
  });

  it("a missing piece is skipped (give has no stick, buy no peel)", () => {
    const s = stage();
    const plan = handoffTracks({ card: s.card, after: s.after }, 100);
    const h = play(plan.tracks, plan.T);
    expect(s.card.calls).toHaveLength(2); // translate + rotate
    expect(h.anims).toHaveLength(2 + 2 * 2); // + opacity and translate for each `after`
  });
});

describe("reduced motion: a 480 ms dip, never a jump cut", () => {
  it("fades the card out at the From end, moves it while invisible, fades it in at the To end; focus at 450", () => {
    const s = stage();
    const plan = handoffTracks(s, 130, { reduce: true });
    play(plan.tracks, plan.T);
    expect(plan.T).toBe(HANDOFF_REDUCED.T);
    expect(plan.focusAt).toBe(450);
    const op = s.card.kf("opacity");
    expect(valueAt(op, "opacity", 150, plan.T)).toBe(0);
    expect(valueAt(op, "opacity", 350, plan.T)).toBe(1);
    const tr = s.card.kf("translate");
    expect(valueAt(tr, "translate", 159, plan.T)).toBe("-130px 0");
    expect(valueAt(tr, "translate", 160, plan.T)).toBe("0 0");
    // nothing rotates or scales under reduced motion
    expect(s.card.calls.some((c) => c.keyframes.some((k) => "rotate" in k))).toBe(false);
    expect(s.toAvatar.calls).toHaveLength(0);
    // the pill and the stickers swap while the card is invisible
    expect(valueAt(s.pillTo.kf("opacity"), "opacity", 160, plan.T)).toBe(1);
    expect(valueAt(s.peel.kf("opacity"), "opacity", 160, plan.T)).toBe(0);
    expect(valueAt(s.stick.kf("opacity"), "opacity", 160, plan.T)).toBe(1);
  });
});

describe("the engine (play, mergeTracks, toKeyframes)", () => {
  it("merges two tracks on one element and property: each owns the time from where it starts changing", () => {
    const el = new Stub("el");
    const a: Frame[] = [[0, "0 0"], [100, "0 -10px"]];
    const b: Frame[] = [[0, "0 -10px"], [400, "0 -10px"], [500, "0 0"]];
    const [m] = mergeTracks([
      { el, prop: "translate", frames: b },
      { el, prop: "translate", frames: a },
    ]);
    expect(m.frames).toEqual([[0, "0 0"], [100, "0 -10px"], [400, "0 -10px"], [500, "0 0"]]);
  });

  it("holds the first and last values flat to offsets 0 and 1", () => {
    const kf = toKeyframes([[200, 0, EASE.out], [400, 1]], "opacity", 1000);
    expect(kf).toEqual([{ offset: 0, opacity: 0 }, { offset: 0.2, opacity: 0, easing: EASE.out }, { offset: 0.4, opacity: 1 }, { offset: 1, opacity: 1 }]);
  });

  it("cancels itself once finished unless `keep` (the page rests on its static CSS)", async () => {
    const el = new Stub("el");
    const h = play([{ el, prop: "opacity", frames: [[0, 0], [100, 1]] }], 100);
    (h.anims[0] as unknown as FakeAnimation).finish();
    await h.finished;
    await Promise.resolve();
    expect((h.anims[0] as unknown as FakeAnimation).cancelled).toBe(true);
    const k = play([{ el, prop: "opacity", frames: [[0, 0], [100, 1]] }], 100, { keep: true });
    (k.anims[0] as unknown as FakeAnimation).finish();
    await k.finished;
    await Promise.resolve();
    expect((k.anims[0] as unknown as FakeAnimation).cancelled).toBe(false);
  });

  it("the roll and the stick-on keep their published timings", () => {
    const cur = new Stub("cur");
    const next = new Stub("next");
    play(rollTracks(cur, next, 0), 250);
    expect(valueAt(cur.kf("translate"), "translate", 140, 250)).toBe("0 -8px");
    expect(valueAt(next.kf("translate"), "translate", 69, 250)).toBe("0 8px");
    expect(last(next.kf("opacity"), "opacity")).toBe(1);
    const st = new Stub("st");
    play(stickOnTracks(st, 0), 320);
    expect(first(st.kf("scale"), "scale")).toBe("1.6");
    expect(valueAt(st.kf("scale"), "scale", 160, 320)).toBe("0.92");
    expect(last(st.kf("rotate"), "rotate")).toBe("0deg");
  });
});

describe("once per device per sale (the seller's Sold receipt)", () => {
  it("plays the first time a key is seen, never again; blocked storage plays once per load", () => {
    const m = new Map<string, string>();
    const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const key = seenSaleKey("3", 7);
    expect(key).toBe("satchel:seen-sale:v1:3:7");
    expect(firstTimeFor(key, storage)).toBe(true);
    expect(firstTimeFor(key, storage)).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    expect(firstTimeFor(key, blocked)).toBe(true);
    expect(firstTimeFor(key, null)).toBe(true);
  });
});
