import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroSection } from "@/components/landing/HeroSection";
import { HeroStage } from "@/components/landing/hero/HeroStage";
import {
  ACTS,
  actAt,
  carriedBy,
  EMPTY_AT_REST,
  H,
  HAND,
  HERO_KEYS,
  heroTracks,
  HIDDEN_AT_REST,
  RESET,
  START_AT,
  T,
  TOUCH,
  travel,
  type HeroKey,
} from "@/components/landing/hero/timeline";
import { holdAt } from "@/components/landing/motion/tracks";
import { mergeTracks, toKeyframes, type Frame } from "@/lib/motion/play";
import { copy } from "@/lib/copy";

/**
 * The hero loop (design-spec §4.2; motion-spec §10; LANDING-CONCEPT-READY): the 12 s timeline as data, and the server
 * markup it animates in place. The loop mounts at START_AT, the frame the server HTML draws (act 3 at rest), so the data
 * must hold exactly that frame there, and loop seamlessly behind the card at the seam.
 */

const A = copy.landing.hero.anim;
const D = copy.landing.desk;
const css = readFileSync(new URL("../../src/components/landing/landing.css", import.meta.url), "utf8");
const stage = renderToStaticMarkup(createElement(HeroStage));
const hero = renderToStaticMarkup(createElement(HeroSection));
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
/** A string as React writes it into an attribute value. */
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The merged tracks, keyed by `${key} ${prop}` (the unit tests use the keys themselves as the "elements"). */
const DX = 227;
const merged = mergeTracks(heroTracks<HeroKey>((k) => k, DX));
const track = (k: HeroKey, prop: string) => merged.find((t) => t.el === k && t.prop === prop);
/** A track's keyframe list, padded to 0 and T as the engine plays it. */
const padded = (frames: readonly Frame[]): Frame[] => {
  const f = [...frames].sort((a, b) => a[0] - b[0]);
  if (f[0][0] > 0) f.unshift([0, f[0][1]]);
  if (f[f.length - 1][0] < T) f.push([T, f[f.length - 1][1]]);
  return f;
};
const isIdentity = (prop: string, v: string) =>
  prop === "translate" ? /^0(px)? 0(px)?$/.test(v) : prop === "rotate" ? /^-?0(deg)?$/.test(v) : prop === "scale" ? v === "1" || v === "1 1" : true;

describe("the loop's clock (timeline.ts)", () => {
  it("is 12 s in four acts (3.0 / 2.4 / 3.6 / 3.0 s), mounting at 7.9 s: act 3, settled", () => {
    expect(T).toBe(12_000);
    expect([...ACTS]).toEqual([0, 3_000, 5_400, 9_000]);
    expect(START_AT).toBe(7_900);
    expect([0, 2_999, 3_000, 5_399, 5_400, 8_999, 9_000, 11_999, 12_000, -1].map(actAt)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 1, 4]);
    expect(actAt(START_AT)).toBe(3);
  });

  it("the hand-off is the brand's: carried 460 ms from 9.49 s, lag +5.8°, the 10° swing, set down by 10.61 s", () => {
    expect(H.hand).toBe(9_350);
    const rotate = track("hanger", "rotate")!.frames;
    expect(rotate.find(([, v]) => v === "5.8deg")?.[0]).toBe(H.hand + 392);
    expect(rotate.find(([, v]) => v === "-10deg")?.[0]).toBe(H.hand + 616);
    expect(TOUCH).toBe(H.hand + HAND.touch);
    expect(TOUCH).toBe(10_490);
    const carry = track("card", "translate")!.frames;
    expect(carry.find(([, v]) => v === `${DX}px 0`)?.[0]).toBe(H.hand + HAND.c1);
    // the hanger lifts 10 px and sets down 2 px into its drop, the plate counter-moves and lightens
    expect(track("hanger", "translate")!.frames.map(([, v]) => v)).toEqual(expect.arrayContaining(["0 -10px", "0 2px"]));
    expect(track("plate", "opacity")!.frames.map(([, v]) => v)).toContain(0.5);
    // Yours sticks on as it lands; the pill rolls back to Active for the new owner
    expect(track("yours", "opacity")!.frames.find(([t, v]) => v === 1 && t > TOUCH)?.[0]).toBe(TOUCH + 40 + 70);
  });

  it("the card's travel keeps the 10° swing inside the sky field: 40 px at 390, 167 at 768, 227 at 1280", () => {
    expect(travel({ sceneWidth: 318, cardWidth: 261, cardLeft: 0, cardHeight: 164, fieldPadRight: 20 })).toBe(40);
    expect(travel({ sceneWidth: 640, cardWidth: 400, cardLeft: 30, cardHeight: 252, fieldPadRight: 40 })).toBe(167);
    expect(travel({ sceneWidth: 700, cardWidth: 400, cardLeft: 30, cardHeight: 252, fieldPadRight: 40 })).toBe(227);
    expect(travel({ sceneWidth: 100, cardWidth: 400, cardLeft: 30, cardHeight: 252, fieldPadRight: 40 })).toBe(0);
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

  it("every piece of the stage moves, and only the pieces the markup marks", () => {
    const moved = new Set(merged.map((t) => t.el));
    expect([...moved].sort()).toEqual([...HERO_KEYS].sort());
    for (const k of HERO_KEYS) expect(stage, k).toContain(`data-k="${k}"`);
  });

  it("at START_AT every track rests on the server frame: visible pieces in place, the hidden ones transparent", () => {
    for (const t of merged) {
      const v = holdAt(padded(t.frames), START_AT);
      const at = `${t.el} ${t.prop} at ${START_AT}`;
      const hidden = HIDDEN_AT_REST.includes(t.el);
      if (t.prop === "opacity") {
        expect(v, at).toBe(hidden ? "0" : "1");
      } else if (!hidden) {
        expect(v, `${at} holds`).toBeDefined();
        if (t.el.startsWith("bar-")) expect(v, at).toBe(EMPTY_AT_REST.includes(t.el) ? "0 1" : "1 1");
        else expect(isIdentity(t.prop, v!), `${at} = ${v}`).toBe(true);
      }
    }
    // and nothing moves for a beat around it (the hand-off starts at 9.0 s)
    for (const t of merged) {
      if (t.el.startsWith("bar-")) continue;
      expect(holdAt(padded(t.frames), START_AT + 1_000), `${t.el} ${t.prop} still at 8.9 s`).toBe(holdAt(padded(t.frames), START_AT));
    }
  });

  it("loops seamlessly: a track that ends somewhere else than it starts is out of sight at the seam", () => {
    const opacityAtSeam = (k: HeroKey) => {
      const f = padded(track(k, "opacity")?.frames ?? [[0, 1]]);
      return [String(f[0][1]), String(f[f.length - 1][1])];
    };
    const unseen = (k: HeroKey) => {
      const box = carriedBy(k);
      return opacityAtSeam(k).every((v) => v === "0") || (box !== null && opacityAtSeam(box).every((v) => v === "0"));
    };
    for (const t of merged) {
      const f = padded(t.frames);
      if (String(f[0][1]) === String(f[f.length - 1][1])) continue;
      expect(unseen(t.el), `${t.el} ${t.prop}: ${f[0][1]} → ${f[f.length - 1][1]}`).toBe(true);
    }
    // the card and the slip are both gone at the seam, and everything behind them resets one millisecond after
    expect(opacityAtSeam("card")).toEqual(["0", "0"]);
    expect(opacityAtSeam("slip")).toEqual(["0", "0"]);
    expect(RESET).toBe(H.seamDone + 1);
  });

  it("one caption at a time: each rolls to the next on its act's boundary, and the bars fill with each act", () => {
    const shown = (ms: number) => ([1, 2, 3, 4] as const).filter((n) => holdAt(padded(track(`cap-${n}`, "opacity")!.frames), ms) === "1");
    expect(shown(1_500)).toEqual([1]);
    expect(shown(4_000)).toEqual([2]);
    expect(shown(START_AT)).toEqual([3]);
    expect(shown(10_000)).toEqual([4]);
    expect(H.capOut).toEqual([3_000, 5_400, 9_000, 11_700]);
    expect(holdAt(padded(track("bar-3", "scale")!.frames), START_AT)).toBe("1 1"); // act 3's bar is full by 7.9 s
  });
});

describe("the stage's server markup (HeroStage.tsx)", () => {
  it("is a Day island in the sky shelf, act 3, with its description first", () => {
    expect(stage).toMatch(/^<figure class="lp-stage" data-scheme="day" data-stage="" data-act="3">/);
    expect(stage).toContain(`<p class="sr-only">${attr(A.alt)}</p>`);
    expect(stage.indexOf('class="sr-only"')).toBeLessThan(stage.indexOf("lp-stage__scene"));
  });

  it("the scene and the hanging coins are aria-hidden art with no text: every label is an attribute", () => {
    const scene = stage.slice(stage.indexOf('<div class="lp-stage__scene"'), stage.indexOf('<div class="lp-stage__bar"'));
    expect(scene).toMatch(/^<div class="lp-stage__scene" data-scene="" aria-hidden="true">/);
    expect(text(scene)).toBe("");
    for (const l of [D.name, D.btc.split("\u00a0")[0], D.price, D.sigs, D.checkedBy, D.sig(3), D.settled, D.checking, D.clean, copy.pill.listed, copy.pill.active, copy.card.yours]) {
      expect(scene, l).toContain(`data-l="${attr(l)}"`);
    }
    expect(stage.match(/<div class="lp-hang lp-hang--[lr]" data-charm="" aria-hidden="true">/g)).toHaveLength(2);
  });

  it("the server frame: Paused for sale over a hidden Active, Used over hidden Checking…, Yours unseen (landing.css)", () => {
    expect(stage).toMatch(/data-k="pill-active" data-off=""/);
    for (const n of [1, 2, 3]) expect(stage).toMatch(new RegExp(`data-k="sig-${n}-checking" data-off=""`));
    expect(css).toMatch(/\.lp-stack > \[data-off\] \{\s*opacity: 0;/);
    expect(css).toMatch(/\.lp-stage \[data-k="yours"\] \{\s*opacity: 0;/);
    expect(css).toMatch(/\.lp-stage__ticker > :not\(\[data-cap="3"\]\) \{\s*opacity: 0;/);
    expect(css).toMatch(/\.lp-stage__step\[data-done\] > b,\s*\.lp-stage__step\[aria-current\] > b \{\s*scale: 1 1;/);
  });

  it("the steps list holds the four captions as real text, act 3 current; the visible ticker is aria-hidden attributes", () => {
    const list = /<ol class="lp-stage__steps" aria-label="([^"]+)">([\s\S]*?)<\/ol>/.exec(stage)!;
    expect(decode(list[1])).toBe(A.stepsLabel);
    expect(text(list[2])).toBe(A.captions.join(" "));
    expect([...list[2].matchAll(/<li class="lp-stage__step" data-step="(\d)"( data-done="")?( aria-current="step")?>/g)].map((m) => [m[1], !!m[2], !!m[3]])).toEqual([
      ["1", true, false],
      ["2", true, false],
      ["3", false, true],
      ["4", false, false],
    ]);
    const ticker = /<p class="lp-stage__ticker" aria-hidden="true">([\s\S]*?)<\/p>/.exec(stage)![1];
    expect(text(ticker)).toBe("");
    A.captions.forEach((c, i) => expect(ticker).toContain(`data-l="${attr(A.count(i + 1, 4))}"></span><span class="lp-l" data-l="${attr(c)}"`));
    // the count steps aside below 430 px, so no caption wraps (MOTION-NOTES 2)
    expect(css).toMatch(/@media \(max-width: 429px\) \{\s*\.lp-stage__count \{\s*display: none;/);
  });

  it("Pause: one name plus aria-pressed (WCAG 2.2.2), 44 px, both icons, shown only while the loop is live", () => {
    expect(stage).toContain(`<button type="button" class="lp-stage__pause" data-pause="" aria-pressed="false" aria-label="${A.pause}">`);
    expect(copy.landing.hero.anim).not.toHaveProperty("play");
    expect(css).toMatch(/\.lp-stage__pause \{[^}]*width: 44px;\s*height: 44px;[^}]*visibility: hidden;/);
    expect(css).toMatch(/\.lp-stage\[data-live\] \.lp-stage__pause \{\s*visibility: visible;/);
    expect(stage.match(/class="lucide[^"]*lp-i-(pause|play)"/g)).toHaveLength(2);
  });

  it("is generic: no token id, account, timestamp or live wording", () => {
    expect(text(stage)).not.toMatch(/#\d|\.testnet|UTC|\balice\b|\bbob\b|Live from/i);
    for (const [, l] of stage.matchAll(/data-l="([^"]*)"/g)) expect(decode(l)).not.toMatch(/#\d|\.testnet|UTC/);
  });
});

describe("the hero section (HeroSection.tsx)", () => {
  it("the who-line, then one H1, H1 C two-tone (each sentence its own span), then the lead, the two CTAs and the note, in order", () => {
    expect(hero.match(/<h1\b/g)).toHaveLength(1);
    const [what, why] = copy.home.h1.split(/(?<=\.)\s+/);
    expect(hero).toMatch(new RegExp(`<h1 id="hero-title"[^>]*><span class="lg:block">${what}</span> <span class="text-ink-muted lg:block">${why}</span></h1>`));
    const t = text(hero);
    const at = [copy.landing.hero.who, copy.home.h1, copy.landing.hero.lead(true), copy.landing.hero.cta.primary, copy.landing.hero.cta.secondary, copy.home.note, A.alt.replace(/\u00a0/g, " ")].map((s) =>
      t.replace(/\u00a0/g, " ").indexOf(s),
    );
    for (const p of at) expect(p).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("Look inside a Satchel is the coral primary (→ /s/1), See Satchels for sale the secondary (→ /market)", () => {
    const links = [...hero.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], text(m[2]), /bg-brand/.test(m[0])]);
    expect(links).toEqual([
      ["/s/1", copy.landing.hero.cta.primary, true],
      ["/market", copy.landing.hero.cta.secondary, false],
    ]);
  });

  it("the phone's charm row is aria-hidden art, hidden from 1024", () => {
    expect(hero).toMatch(/<div class="lp-charmrow" aria-hidden="true">/);
    expect(css).toMatch(/@media \(min-width: 1024px\) \{\s*\.lp-charmrow \{\s*display: none;/);
  });
});
