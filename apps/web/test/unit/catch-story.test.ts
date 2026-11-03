import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CleanSection } from "@/components/landing/CleanSection";
import { HowSection } from "@/components/landing/HowSection";
import { WhatSection } from "@/components/landing/WhatSection";
import { FinaleSection } from "@/components/landing/FinaleSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { ENTER, GAP } from "@/components/landing/motion/enter";
import { holdAt } from "@/components/landing/motion/tracks";
import { mergeTracks, type Frame } from "@/lib/motion/play";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

/**
 * The catch strip and the once-on-enter moments (design-spec §4.3, §4.5, §4.6, §4.9; motion-spec §10). The strip is
 * itself the no-JS and reduced-motion state: five frames of real UI, each at its beat's end, with its beat as real text.
 * Each moment is data that ends on the static CSS (the server frame), so a motion that cancels at its end changes nothing.
 */

const C = copy.landing.clean;
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** The text layer of some markup: tags dropped, entities decoded, every run of whitespace (NBSP too) one space. */
const text = (html: string) => decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const labels = (html: string) => [...html.matchAll(/data-l="([^"]*)"/g)].map((m) => decode(m[1]));
const css = readFileSync(new URL("../../src/components/landing/landing.css", import.meta.url), "utf8");

const clean = renderToStaticMarkup(createElement(CleanSection));
const page = [
  clean,
  renderToStaticMarkup(createElement(HowSection)),
  renderToStaticMarkup(createElement(WhatSection)),
  renderToStaticMarkup(createElement(TrustSection, { role: "final" })),
  renderToStaticMarkup(createElement(FinaleSection)),
].join("");

describe("the catch strip's server markup (CleanSection.tsx)", () => {
  it("is the #clean band: the H2, the visually hidden description, then two chapters of frames, 1–2 and 3–5", () => {
    expect(clean).toMatch(/^<section id="clean" aria-labelledby="clean-title" class="[^"]*\bbg-surface\b/);
    expect(text(clean).startsWith(`${C.h2} ${C.alt}`)).toBe(true);
    const lists = [...clean.matchAll(/<ol (start="3" )?aria-label="([^"]+)"/g)].map((m) => [!!m[1], decode(m[2])]);
    expect(lists).toEqual([
      [false, C.labels.without],
      [true, C.labels.with],
    ]);
    expect([...clean.matchAll(/<li class="[^"]*" data-beat="(\d)">/g)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("holds the H2, the description and the five beats as text, in order, and nothing else", () => {
    expect(C.beats).toHaveLength(5);
    expect(text(clean)).toBe([C.h2, C.alt, ...C.beats].join(" "));
    for (const b of C.beats) expect(count(decode(clean), `>${b}<`), b).toBe(1);
  });

  it("every desk and both chapter chips are aria-hidden illustrations whose labels are attributes", () => {
    const desks = [...clean.matchAll(/<div class="lp-desk[^"]*" aria-hidden="true" data-desk="">/g)];
    expect(desks).toHaveLength(5);
    expect(clean.match(/<span class="lp-pill lp-pill--(danger|success) self-start" aria-hidden="true">/g)).toHaveLength(2);
    const l = labels(clean);
    for (const s of [C.labels.without, C.labels.with, C.labels.slipTitle, C.labels.slipWhat, C.labels.held, C.labels.moved, C.labels.recorded, C.labels.unusedHead]) expect(l, s).toContain(s);
    const d = copy.landing.desk;
    for (const s of [d.name, d.buyer, d.unused, d.settled, d.clean, d.buy, d.sig(3)]) expect(l, s).toContain(s);
    // the desk labels never reach the text layer (D-42: a reader of the raw HTML must not take them for facts)
    for (const s of [C.labels.moved, C.labels.noRecord, C.labels.unusedHead]) expect(text(clean)).not.toContain(s);
    expect(clean).not.toMatch(/<(a|button|input|select|textarea)\b|tabindex=/);
  });

  it("numbers beats 1–4 with an aria-hidden attribute and gives beat 5, the takeaway, a check and bold text", () => {
    const marks = [...clean.matchAll(/<span class="lp-l inline-grid[^"]*" data-l="(\d)" aria-hidden="true">/g)].map((m) => m[1]);
    expect(marks).toEqual(["1", "2", "3", "4"]);
    const five = clean.slice(clean.indexOf('data-beat="5"'));
    expect(five).toMatch(/<p class="[^"]*font-bold[^"]*"><span aria-hidden="true" class="[^"]*bg-success[^"]*"><svg[^>]*lucide-check/);
  });

  it("each frame is drawn at its beat's end: the note kept, 0.00 ETH with the sad coin, Signature 3 written, Unused, Clean history", () => {
    const frame = (k: number) => clean.slice(clean.indexOf(`data-beat="${k}"`), k < 5 ? clean.indexOf(`data-beat="${k + 1}"`) : undefined);
    expect(frame(1)).toContain('data-k="note"');
    // frame 2: the 0.00 shows, the 0.80 it had is the hidden old layer; the sad coin shows, the happy one is hidden
    expect(frame(2)).toMatch(/data-l="0.00" data-k="eth-amt-new"/);
    expect(frame(2)).toMatch(/data-l="0.80" data-k="eth-amt-old" data-off=""/);
    expect(frame(2)).toMatch(/data-k="eth-coin-old" data-off=""/);
    expect(frame(2)).toContain('stroke-width="9" stroke-linecap="round"></path>'); // the coins' mouths
    expect(frame(2)).toContain('d="M54 100 Q70 86 86 100"'); // the sad one
    expect(frame(3)).toMatch(/class="lp-slip__row lp-slip__row--hl" data-k="rec-row"/);
    expect(frame(4)).toMatch(/data-k="unused-4"/);
    expect(frame(4)).toMatch(/class="lp-buy lp-buy--off" data-k="buy-4"/);
    expect(frame(5)).toMatch(/data-k="head-5-old" data-off=""/);
    expect(frame(5)).toMatch(/data-k="row-5-old" data-off=""/);
    expect(frame(5)).toMatch(/class="lp-buy lp-buy--off" data-k="buy-5-old" data-off=""/);
    expect(frame(5)).toMatch(/class="lp-l lp-buy lp-buy--on" data-l="Buy" data-k="buy-5-new"/);
  });

  it("names no account, token id, timestamp or real transaction (the landing is simulated, D-42)", () => {
    expect(text(clean)).not.toMatch(/\.testnet|Satchel #|UTC|NearBlocks|This happened/);
    for (const l of labels(clean)) expect(l).not.toMatch(/\.testnet|#\d|UTC/);
    expect(clean).not.toContain("data-full-address");
  });
});

describe("How it works (HowSection.tsx)", () => {
  const html = renderToStaticMarkup(createElement(HowSection));
  const H = copy.landing.how;
  const steps = H.steps(LANDING_NAMES_SOL);

  it("the centred H2, then three steps in order: an aria-hidden number, an H3 and its line; scenes are illustrations", () => {
    expect(html).toMatch(/^<section id="how" aria-labelledby="how-title"/);
    expect(text(html)).toBe([H.h2, ...steps.flatMap((s) => [s.title, s.body])].join(" "));
    expect(count(html, "<h3")).toBe(3);
    expect([...html.matchAll(/data-l="(\d)" aria-hidden="true"/g)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(html.match(/<div aria-hidden="true"( data-scheme="day")? class="relative grid/g)).toHaveLength(3);
    expect(html).not.toMatch(/<a\b|<button/);
    // 48 words: the landing always names Bitcoin, Ethereum and Solana (D-45), the H2 included
    expect(text(html).split(" ").length).toBe(48);
  });

  it("the scenes: a New card on lemon, the signing tracker on sunken, the card mid-swing (−8°) over its new owner on sky", () => {
    const l = labels(html);
    for (const s of [copy.card.preview, copy.card.new, copy.overview.empty, copy.sign.steps.wallet.done, copy.pill.signing, copy.sign.mpc[0], C.labels.sent, copy.landing.uses.tags[2]]) expect(l, s).toContain(s);
    expect(html).toContain('data-k="mint-card"');
    expect(html).toContain('data-k="give-pose"');
    expect(css).toMatch(/\.lp-pose \{\s*transform: rotate\(-8deg\);\s*transform-origin: 50% -22px;/);
    expect(css).toMatch(/\.lp-pose\[data-rest\] \{\s*transform: none;/);
  });
});

/** Where a track ends, and where it starts (its first value), in its own clock. */
const ends = (f: readonly Frame[]) => {
  const s = [...f].sort((a, b) => a[0] - b[0]);
  return { first: String(s[0][1]), last: String(s[s.length - 1][1]), at: s[s.length - 1][0] };
};
const identity: Record<string, RegExp> = { translate: /^0(px)? 0(px)?$/, rotate: /^-?0(deg)?$/, scale: /^1( 1)?$/ };

describe("the once-on-enter moments (motion/enter.ts)", () => {
  const defs = ENTER.map((d) => ({ d, tracks: mergeTracks(d.tracks<string>((k) => k)) }));

  it("the moments the spec lists, each with its trigger in the server HTML", () => {
    expect(ENTER.map((d) => d.name)).toEqual(["what", "how-mint", "how-give", "beat-1", "beat-2", "beat-3", "beat-4", "beat-5", "trust", "finale"]);
    for (const { d } of defs) {
      const sel = d.trigger.match(/^\[data-([a-z]+)="([^"]+)"\]/)!;
      expect(page, d.name).toMatch(new RegExp(`data-${sel[1]}="${sel[2]}"`));
    }
    expect(ENTER.filter((d) => d.inTurn).map((d) => d.name)).toEqual(["beat-1", "beat-2", "beat-3", "beat-4", "beat-5"]);
    expect(GAP).toBeGreaterThanOrEqual(700);
  });

  it("every piece a moment moves is a [data-k] in the server HTML", () => {
    for (const { d, tracks } of defs) for (const t of tracks) expect(page, `${d.name}: ${t.el}`).toContain(`data-k="${t.el}"`);
  });

  it("transform and opacity only, every frame inside its clock, at most 1.8 s", () => {
    for (const { d, tracks } of defs) {
      expect(d.T, d.name).toBeLessThanOrEqual(1_800);
      for (const t of tracks) {
        expect(["opacity", "translate", "rotate", "scale"]).toContain(t.prop);
        for (const [ms] of t.frames) expect(ms, `${d.name} ${t.el}`).toBeLessThanOrEqual(d.T);
      }
    }
  });

  it("each ends on its static frame: in place and visible, except the layers the CSS hides (the old states)", () => {
    for (const { d, tracks } of defs) {
      for (const t of tracks) {
        const { last } = ends(t.frames);
        const at = `${d.name}: ${t.el} ${t.prop} ends at ${last}`;
        if (t.prop === "opacity") expect(last, at).toBe(/-old$/.test(t.el) ? "0" : "1");
        else if (d.name === "how-give") expect(last, at).toBe("8deg"); // + the static −8° = 0, then it rests (data-rest)
        else if (!/-old$/.test(t.el)) expect(last, at).toMatch(identity[t.prop]);
      }
    }
    // the How card swings from its drawn pose (−8° + 0) to rest (−8° + 8°)
    const give = defs.find(({ d }) => d.name === "how-give")!.tracks[0];
    expect(ends(give.frames).first).toBe("0deg");
  });

  it("the beats: each changes one thing, settling within about 0.8 s", () => {
    for (const { d, tracks } of defs.filter(({ d }) => d.inTurn)) {
      const settle = Math.max(...tracks.map((t) => ends(t.frames).at));
      expect(settle, d.name).toBeLessThanOrEqual(820);
      // a frame's first frame differs from its static end (it is armed below the fold and plays as it enters)
      expect(tracks.some((t) => ends(t.frames).first !== ends(t.frames).last), d.name).toBe(true);
    }
    // beat 4's Buy nudges ±2 px, twice, no more (no flashing; motion-spec §10)
    const nudge = defs.find(({ d }) => d.name === "beat-4")!.tracks.find((t) => t.el === "buy-4")!;
    expect(nudge.frames.map(([, v]) => v)).toEqual(["0 0", "0 0", "-2px 0", "2px 0", "-2px 0", "2px 0", "0 0"]);
    expect(holdAt(nudge.frames, 0)).toBe("0 0");
  });
});
