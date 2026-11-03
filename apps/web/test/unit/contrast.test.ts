import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUND } from "@/lib/theme";

/**
 * WCAG 2.2 AA contrast for the Satchel 2.0 tokens (design-system-impl §2, rulings R12), read from globals.css itself:
 * the token rule `:root, [data-scheme]` (every value light-dark(Day, Night) or constant). Text needs 4.5:1; graphics,
 * control boundaries and state indicators need 3:1 (WCAG 1.4.11). The "never" pairs are the documented failures: the
 * rules that keep them off screen (no ink on coral, no links on brand-soft, chain colours never as text…).
 */

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the first rule whose selector, whitespace-normalised, is exactly `selector`. */
function block(selector: string): string {
  const src = stripComments(css);
  const re = /([^{}]+)\{([^{}]*)\}/g;
  // the text before a `{` can carry a preceding statement (`@import …;`): the selector is what follows the last `;`
  for (const m of src.matchAll(re)) if ((m[1].split(";").pop() ?? "").replace(/\s+/g, " ").trim() === selector) return m[2];
  throw new Error(`no rule for ${selector}`);
}

/** Custom properties in a rule body. */
function tokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

type Theme = "day" | "night";
const THEMES = ["day", "night"] as const;

/** One theme's value of a token: light-dark(Day, Night) or a constant. */
function pick(value: string, theme: Theme): string {
  const m = /^light-dark\((.*)\)$/.exec(value);
  if (!m) return value;
  let depth = 0;
  for (let i = 0; i < m[1].length; i++) {
    const c = m[1][i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) return (theme === "day" ? m[1].slice(0, i) : m[1].slice(i + 1)).trim();
  }
  throw new Error(`bad light-dark(): ${value}`);
}

type RGBA = { r: number; g: number; b: number; a: number };
function parse(color: string): RGBA {
  const h = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (h) return { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: 1 };
  const r = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(color.trim());
  if (r) return { r: +r[1], g: +r[2], b: +r[3], a: r[4] === undefined ? 1 : +r[4] };
  throw new Error(`not a colour: ${color}`);
}
const over = (fg: RGBA, bg: RGBA): RGBA => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = ({ r, g, b }: RGBA) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function ratio(fg: string, bg: string): number {
  const b = parse(bg);
  const f = over(parse(fg), b);
  const [hi, lo] = [luminance(f), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const ROOT = tokens(block(":root, [data-scheme]"));
/** A token's value in `theme` (a literal colour passes through). */
const t = (name: string, theme: Theme) => (name.startsWith("#") ? name : pick(ROOT[`--${name}`] ?? fail(name), theme));
function fail(name: string): never {
  throw new Error(`no --${name} in the token rule`);
}

const TEXT = 4.5;
const GRAPHIC = 3;
const SURFACES = ["ground", "surface", "surface-sunken"];

/** Assert every fg on every bg at `min`, in both themes (or the given ones). */
function pairs(fgs: string[], bgs: string[], min: number, themes: readonly Theme[] = THEMES) {
  for (const theme of themes)
    for (const fg of fgs)
      for (const bg of bgs) expect(ratio(t(fg, theme), t(bg, theme)), `${theme}: ${fg} ${t(fg, theme)} on ${bg} ${t(bg, theme)}`).toBeGreaterThanOrEqual(min);
}

describe("the 2.0 tokens (globals.css :root, [data-scheme])", () => {
  it("are the brand's tokens.json values, with Day first and the R12 Night sticker outline", () => {
    const day = (n: string) => t(n, "day").toLowerCase();
    const night = (n: string) => t(n, "night").toLowerCase();
    expect(["ground", "surface", "surface-sunken", "line", "line-strong", "ink", "ink-muted"].map(day)).toEqual(["#f6f5fb", "#ffffff", "#eceaf4", "#e2dfee", "#7f7999", "#1d1340", "#5e5776"]);
    expect(["ground", "surface", "surface-sunken", "line", "line-strong", "ink", "ink-muted"].map(night)).toEqual(["#120c26", "#1c1538", "#29214b", "#352c5c", "#8a82ae", "#f4f2ff", "#b7b0d1"]);
    expect(["brand", "on-brand", "lemon", "sky", "brand-hover"].map(day)).toEqual(["#ff5c4d", "#1d1340", "#ffd84d", "#8fd3ff", "#ff6b5d"]);
    expect(["brand", "on-brand", "lemon", "sky"].map(night)).toEqual(["#ff5c4d", "#1d1340", "#ffd84d", "#8fd3ff"]); // constants
    expect([day("sticker-line"), night("sticker-line")]).toEqual(["#1d1340", "#8a82ae"]); // R12.4
    expect([day("sticker-shade"), night("sticker-shade")]).toEqual(["#1d1340", "#000000"]); // the #000 drop kept
  });

  it("the theme-color grounds (lib/theme GROUND) match --ground", () => {
    expect(GROUND.day.toLowerCase()).toBe(t("ground", "day"));
    expect(GROUND.night.toLowerCase()).toBe(t("ground", "night"));
  });

  it("Day is the default, Night is data-theme, and islands re-declare every token in their own scheme", () => {
    const flat = stripComments(css).replace(/\s+/g, " ");
    expect(flat).toContain(":root { color-scheme: light; }");
    expect(flat).toContain(':root[data-theme="night"] { color-scheme: dark; }');
    expect(flat).toContain('[data-scheme="day"] { color-scheme: light; }');
    expect(flat).toContain('[data-scheme="night"] { color-scheme: dark; }');
    expect(flat).not.toMatch(/:root \{ color-scheme: light dark; \}/); // not the "System is pure CSS" default (R12.3)
  });
});

describe("text, 4.5:1 (design-system-impl §2)", () => {
  it("ink and ink-muted on every surface and on brand-soft (toasts, selected rows)", () => pairs(["ink", "ink-muted"], [...SURFACES, "brand-soft"], TEXT));
  it("ink and ink-muted on --band (site polish round, #more's own band; kb/81 R4)", () => pairs(["ink", "ink-muted"], ["band"], TEXT));
  it("links on the grounds and surfaces", () => pairs(["link"], SURFACES, TEXT));
  it("state words (pills, banners, the tracker) on every surface and on brand-soft", () => pairs(["success", "frozen", "danger"], [...SURFACES, "brand-soft"], TEXT));
  it("the Ethereum and Solana colours if they ever carry text", () => pairs(["chain-evm", "chain-sol"], SURFACES, TEXT));
  it("on-brand on coral (the primary, the card band) and on its hover fill", () => pairs(["on-brand"], ["brand", "brand-hover"], TEXT));
  it("on-brand on lemon and sky (badges, illustration fields)", () => pairs(["on-brand"], ["lemon", "sky"], TEXT));
  it("the inverse pair: on-inverse (= ground) on inverse (= ink), the selected segment and filter chip", () => pairs(["ground"], ["ink"], TEXT));
});

describe("graphics, 3:1 (WCAG 1.4.11)", () => {
  it("control borders and the focus ring on every surface and on brand-soft", () => pairs(["line-strong", "focus"], [...SURFACES, "brand-soft"], GRAPHIC));
  it("state and chain icons and dots on every surface", () => pairs(["success", "frozen", "danger", "chain-btc", "chain-evm", "chain-sol"], SURFACES, GRAPHIC));
  it("coral strokes (the tab underline, the side nav bar) on the surfaces", () => pairs(["brand-line"], SURFACES, GRAPHIC));
  it("the sticker outline on every surface, in both themes (R6, R12.4: Night's #8A82AE)", () => pairs(["sticker-line"], SURFACES, GRAPHIC));
  it("a badge's constant ink outline on lemon and sky", () => pairs(["on-brand"], ["lemon", "sky"], GRAPHIC));
});

describe("the documented failures stay failures (the rules that keep them off screen)", () => {
  const below = (fg: string, bg: string, theme: Theme, min: number) => expect(ratio(t(fg, theme), t(bg, theme)), `${theme}: ${fg} on ${bg}`).toBeLessThan(min);
  it("N1: themed ink on coral in Night (text on coral is always on-brand)", () => below("ink", "brand", "night", TEXT));
  it("N2: on-brand on brand-soft in Night (on brand-soft use themed ink)", () => below("on-brand", "brand-soft", "night", TEXT));
  it("N3: white on coral (never for text)", () => below("#ffffff", "brand", "day", TEXT));
  it("F1: Day link on brand-soft (no links on toasts or selected rows)", () => below("link", "brand-soft", "day", TEXT));
  it("F2: Day chain-btc as text (chain colours are graphics only)", () => {
    for (const bg of SURFACES) below("chain-btc", bg, "day", TEXT);
  });
  it("F3: on-brand on brand-deep (the press moves 4 px; the fill never darkens)", () => below("on-brand", "brand-deep", "day", TEXT));
  it("F4: Day coral as a boundary (every coral control carries the 2 px sticker outline)", () => {
    for (const bg of ["ground", "surface-sunken"]) below("brand", bg, "day", GRAPHIC);
  });
});

/** Rule 1: colour only through tokens. The foundation's components hold no hex colour (the brand artwork's fixed
 * colours live in components/brand/art.ts). */
describe("no hex colours in the foundation components", () => {
  for (const file of ["components/ui.tsx", "components/SatchelCard.tsx", "components/client/FlowShell.tsx", "components/client/Toaster.tsx", "components/client/ThemeControl.tsx"]) {
    it(file, () => {
      const src = readFileSync(new URL(`../../src/${file}`, import.meta.url), "utf8");
      expect(src.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? [], file).toEqual([]);
    });
  }
});
