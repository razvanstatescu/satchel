import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrustSection } from "@/components/landing/TrustSection";
import { CODE_KEYS, codeTracks, LINE, REST_STEP, SEAM, START_AT, STEPS, T, type CodeKey } from "@/components/landing/code/timeline";
import { holdAt } from "@/components/landing/motion/tracks";
import { mergeTracks, toKeyframes, type Frame } from "@/lib/motion/play";

/**
 * Trust, dev's code-card loop (site polish round §2.4, modelled on `hero-loop.test.ts`): the 10 s timeline as data, and
 * the server markup it animates in place. The loop mounts at `START_AT`, the frame the server HTML draws (step 3 held),
 * so the data must hold exactly that frame there, and loop seamlessly at the seam.
 */

const card = renderToStaticMarkup(createElement(TrustSection, { role: "dev" }));
const merged = mergeTracks(codeTracks<CodeKey>((k) => k));
const track = (k: CodeKey, prop: string) => merged.find((t) => t.el === k && t.prop === prop);
const padded = (frames: readonly Frame[]): Frame[] => {
  const f = [...frames].sort((a, b) => a[0] - b[0]);
  if (f[0][0] > 0) f.unshift([0, f[0][1]]);
  if (f[f.length - 1][0] < T) f.push([T, f[f.length - 1][1]]);
  return f;
};

describe("the code loop's clock (code/timeline.ts)", () => {
  it("is 10 s, mounting at 6 s (step 3, the record step, held)", () => {
    expect(T).toBe(10_000);
    expect(START_AT).toBe(6_000);
    expect(REST_STEP).toBe(3);
    expect([...STEPS]).toEqual([0, 2_400, 4_800, 7_200]);
    expect(LINE).toBe(24);
  });

  it("animates transform and opacity only, as keyframes from 0 to 1", () => {
    for (const t of merged) {
      expect(["opacity", "translate", "rotate", "scale"], `${t.el} ${t.prop}`).toContain(t.prop);
      const kf = toKeyframes(t.frames, t.prop, T);
      expect(kf[0].offset).toBe(0);
      expect(kf[kf.length - 1].offset).toBe(1);
      for (let i = 1; i < kf.length; i++) expect(kf[i].offset as number).toBeGreaterThanOrEqual(kf[i - 1].offset as number);
    }
  });

  it("the moved set is exactly CODE_KEYS, and every one is a [data-k] in the server HTML", () => {
    const moved = new Set(merged.map((t) => t.el));
    expect([...moved].sort()).toEqual([...CODE_KEYS].sort());
    for (const k of CODE_KEYS) expect(card, k).toContain(`data-k="${k}"`);
  });

  it("loops seamlessly: a track that ends somewhere else than it starts is out of sight (opacity 0) at both ends", () => {
    const opacityAtEnds = (k: CodeKey) => {
      const f = padded(track(k, "opacity")?.frames ?? [[0, 1]]);
      return [String(f[0][1]), String(f[f.length - 1][1])];
    };
    for (const t of merged) {
      const f = padded(t.frames);
      if (String(f[0][1]) === String(f[f.length - 1][1])) continue;
      expect(opacityAtEnds(t.el), `${t.el} ${t.prop}: ${f[0][1]} → ${f[f.length - 1][1]}`).toEqual(["0", "0"]);
    }
    // the rail and the bars return exactly to their start (they're always visible)
    expect(holdAt(padded(track("code-rail", "translate")!.frames), 0)).toBe(holdAt(padded(track("code-rail", "translate")!.frames), T));
    for (const n of [1, 2, 3, 4] as const) {
      const f = padded(track(`code-bar-${n}`, "scale")!.frames);
      expect(holdAt(f, 0)).toBe(holdAt(f, T));
    }
  });

  it("at START_AT the frame equals the static CSS: the rail on line 4, ticks 1–2 shown, caption 3, bars [1,1,.5,0]", () => {
    expect(holdAt(padded(track("code-rail", "translate")!.frames), START_AT)).toBe("0 72px");
    expect(holdAt(padded(track("code-tick-1", "opacity")!.frames), START_AT)).toBe("1");
    expect(holdAt(padded(track("code-tick-2", "opacity")!.frames), START_AT)).toBe("1");
    expect(holdAt(padded(track("code-tick-3", "opacity")!.frames), START_AT)).toBe("0");
    expect(holdAt(padded(track("code-cap-1", "opacity")!.frames), START_AT)).toBe("0");
    expect(holdAt(padded(track("code-cap-2", "opacity")!.frames), START_AT)).toBe("0");
    expect(holdAt(padded(track("code-cap-3", "opacity")!.frames), START_AT)).toBe("1");
    expect(holdAt(padded(track("code-cap-4", "opacity")!.frames), START_AT)).toBe("0");
    expect(holdAt(padded(track("code-bar-1", "scale")!.frames), START_AT)).toBe("1 1");
    expect(holdAt(padded(track("code-bar-2", "scale")!.frames), START_AT)).toBe("1 1");
    // bar 3 is mid-fill at START_AT (linear, exactly halfway between steps 3 and 4's starts: 4,800 and 7,200)
    const bar3 = padded(track("code-bar-3", "scale")!.frames);
    const [t0, v0] = bar3.find(([t]) => t === STEPS[2])!;
    const [t1, v1] = bar3.find(([t]) => t === STEPS[3])!;
    expect(String(v0)).toBe("0 1");
    expect(String(v1)).toBe("1 1");
    const frac = (START_AT - t0) / (t1 - t0);
    expect(frac).toBe(0.5);
    expect(holdAt(padded(track("code-bar-4", "scale")!.frames), START_AT)).toBe("0 1");
  });

  it("nothing changes for a beat around the rest frame (6.0–7.199 s)", () => {
    for (const t of merged) {
      const f = padded(t.frames);
      expect(holdAt(f, START_AT + 1_199), `${t.el} ${t.prop}`).toBe(holdAt(f, START_AT));
    }
  });

  it("the rail visits lines 2 → 3 → 4 → 5 in order, then returns to line 2 at the seam", () => {
    const rail = padded(track("code-rail", "translate")!.frames);
    const at = (ms: number) => holdAt(rail, ms);
    expect(at(1_000)).toBe("0 24px"); // line 2
    expect(at(3_500)).toBe("0 48px"); // line 3
    expect(at(6_000)).toBe("0 72px"); // line 4 (the rest frame)
    expect(at(8_300)).toBe("0 96px"); // line 5
    expect(at(SEAM - 1)).toBe("0 96px");
    expect(at(T)).toBe("0 24px"); // back to line 2
  });

  it("T is over 5 s, so CodeCard renders a visible Pause (motion-spec §0.8)", () => {
    expect(T).toBeGreaterThan(5_000);
    expect(card).toContain("data-code-pause");
  });
});
