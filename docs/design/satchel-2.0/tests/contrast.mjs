// WCAG 2.x contrast audit for the Satchel 2.0 web design system (design-system-impl.md §2).
// Reads the brand tokens from design-system/project/tokens.json (the Design System artifact), adds the derived tokens
// proposed in design-system-impl.md §1.4, and checks every text/background and graphic/background pair the UI uses,
// in Day and Night. Text needs 4.5:1 (3:1 only where marked "large": >= 24 px, or >= 18.66 px bold); graphics, control
// boundaries and state indicators need 3:1 (WCAG 1.4.11). Translucent colours are composited over their ground first.
// For every failure it searches the nearest passing colour in OKLCH (same hue and chroma, lightness moved away from the
// background) and prints it as the "fix" column.
//
//   node contrast.mjs            (no dependencies; exit code 1 if any required pair fails without an accepted fix)
import { readFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const brand = JSON.parse(readFileSync(`${here}design-system/project/tokens.json`, "utf8"));

/** tokens[theme][name] = "#rrggbb" or "rgb(r g b / a)" */
const T = { day: {}, night: {} };
for (const t of brand.color.tokens) for (const th of ["day", "night"]) T[th][t.name] = t.value[th];

// Derived tokens (design-system-impl.md §1.4). Each says what it derives from.
const DERIVED = {
  "sticker-line": ["#1d1340", "#1d1340"], // brand ink (day ink), constant: outlines on stickers (canvas: Night card keeps #1D1340)
  "sticker-shadow": ["#1d1340", "#000000"], // shadow-sticker colour per theme
  "brand-hover": ["#ff6b5d", "#ff6b5d"], // brand + 6% white (oklch L +0.03): hover fill, ink text stays >= 4.5
  "brand-pressed": ["#ff5c4d", "#ff5c4d"], // = brand: the press is the 4 px drop, never a darker fill (brand-deep fails)
  "brand-line": ["#d9402f", "#ff5c4d"], // = brand-deep (Day) / brand (Night): coral strokes and indicators on grounds
  "disabled-fill": ["#eceaf4", "#29214b"], // = surface-sunken
  "disabled-ink": ["#7f7999", "#8a82ae"], // = line-strong: disabled labels (exempt from 1.4.3, kept >= 3:1 anyway)
  "toast": ["#ffe3df", "#3a1f33"], // = brand-soft (brand: "the toast behind 'Sent'"); text = ink + state colours
  "overlay-edge": ["#e2dfee", "#352c5c"], // = line: the 1 px edge of sheets, dialogs and flat panels
  "scrim": ["rgb(29 19 64 / 0.40)", "rgb(0 0 0 / 0.40)"], // ink 40% (Day), black 40% (Night, canvas Give sheet)
  "selected-row": ["#ffe3df", "#3a1f33"], // = brand-soft
  "skeleton": ["#eceaf4", "#29214b"], // = surface-sunken (static, no shimmer)
  "focus-on-brand": ["#1d1340", "#1d1340"], // = on-brand: a ring that must sit ON coral (never the themed focus)
};
for (const [k, [d, n]] of Object.entries(DERIVED)) Object.assign(T.day, { [k]: d }), Object.assign(T.night, { [k]: n });

// ---------- colour maths ----------
const parse = (c) => {
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(c);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  throw new Error(`bad colour ${c}`);
};
const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); // WCAG 2.x (0.04045 == 0.03928 for 8-bit)
const L = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// OKLab / OKLCH (Björn Ottosson), for hue-preserving fixes
const toOk = ({ r, g, b }) => {
  const [R, G, B] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const Lk = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bk = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L: Lk, C: Math.hypot(A, Bk), h: Math.atan2(Bk, A) };
};
const fromOk = ({ L: Lk, C, h }) => {
  const A = C * Math.cos(h), Bk = C * Math.sin(h);
  const l = (Lk + 0.3963377774 * A + 0.2158037573 * Bk) ** 3;
  const m = (Lk - 0.1055613458 * A - 0.0638541728 * Bk) ** 3;
  const s = (Lk - 0.0894841775 * A - 1.291485548 * Bk) ** 3;
  const enc = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const rgb = { r: enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g: enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), b: enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), a: 1 };
  const inGamut = [rgb.r, rgb.g, rgb.b].every((v) => v >= -0.5 && v <= 255.5);
  return { rgb, inGamut };
};
/** Nearest passing colour: move OKLCH lightness (either direction, the smaller move wins), same hue; chroma is
 *  reduced only if the candidate leaves the sRGB gamut. */
function fix(fgC, bgC, min) {
  const ok = toOk(fgC);
  for (let step = 1; step <= 200; step++) {
    for (const dir of [L(fgC) > L(bgC) ? 1 : -1, L(fgC) > L(bgC) ? -1 : 1]) {
      let cand = { ...ok, L: ok.L + dir * step * 0.005 };
      if (cand.L < 0 || cand.L > 1) continue;
      let res = fromOk(cand);
      while (!res.inGamut && cand.C > 0.001) (cand = { ...cand, C: cand.C * 0.97 }), (res = fromOk(cand));
      const rounded = parse(hex(res.rgb));
      if (ratio(rounded, bgC) >= min) return hex(rounded);
    }
  }
  return null;
}

// ---------- the pairs ----------
// [fg, bg, kind, note]; kind: "text" (4.5), "large" (3, large text only), "graphic" (3), "info" (reported, not required)
const SURFACES = ["ground", "surface", "surface-sunken"];
const pairs = [];
const add = (fg, bgs, kind, note = "") => bgs.forEach((bg) => pairs.push([fg, bg, kind, note]));

add("ink", [...SURFACES, "brand-soft"], "text", "body text, balances");
add("ink-muted", [...SURFACES, "brand-soft"], "text", "secondary text, placeholders on sunken");
add("link", [...SURFACES, "brand-soft"], "text", "inline links, text buttons");
for (const s of ["success", "frozen", "danger"]) add(s, [...SURFACES, "brand-soft"], "text", "state word (pill, banner title, tracker)");
add("chain-evm", SURFACES, "text", "balance accent (if used as text)");
add("chain-sol", SURFACES, "text", "balance accent (if used as text)");
add("chain-btc", SURFACES, "text", "Bitcoin accent as text (brand: graphics only in Day)");
add("on-brand", ["brand", "brand-hover", "brand-pressed"], "text", "label on the coral button / card band");
add("on-brand", ["brand-deep"], "text", "tokens.json: brand-deep = pressed fill");
pairs.push(["#1d1340", "#ea483b", "text", "darkest same-hue coral that keeps ink at 4.5 (pressed-fill ceiling)"]);
pairs.push(["#ffffff", "brand", "info", "white on coral (brand: not for text)"]);
pairs.push(["ink", "brand", "never", "THEMED ink on coral: always on-brand instead (Night ink is near-white)"]);
pairs.push(["#1d1340", "lemon", "text", "ink on lemon: the New / Yours sticker"]);
pairs.push(["#1d1340", "sky", "text", "ink on sky: illustration panels with text"]);
pairs.push(["#1d1340", "brand-soft", "never", "on-brand/day ink on brand-soft: use themed ink there"]);
for (const f of ["ink", "success", "frozen", "danger"]) add(f, ["toast"], "text", "toast word + state icon");
add("disabled-ink", ["disabled-fill"], "info", "disabled label (exempt; target >= 3)");
// graphics
add("line-strong", [...SURFACES, "brand-soft"], "graphic", "input + secondary button borders, segment outline");
add("focus", [...SURFACES, "brand-soft"], "graphic", "focus ring (2 px, 2 px offset: sits on the ground)");
add("focus-on-brand", ["brand"], "graphic", "ring drawn against coral (offset 0 cases)");
add("brand", SURFACES, "graphic", "coral fill as a component boundary (needs the ink outline if < 3)");
add("brand-line", SURFACES, "graphic", "coral stroke: tab underline, progress, selected border");
add("sticker-line", SURFACES, "graphic", "3 px sticker outline (required in Day: it is the coral control's boundary)");
pairs.push(["#666094", "ground", "info", "candidate Night sticker outline"]);
pairs.push(["#666094", "surface", "info", "candidate Night sticker outline"]);
add("overlay-edge", SURFACES, "info", "1 px panel/sheet edge (decorative)");
add("sticker-shadow", SURFACES, "info", "hard sticker drop (decorative)");
for (const s of ["success", "frozen", "danger", "chain-btc", "chain-evm", "chain-sol"]) add(s, SURFACES, "graphic", "icon / 8 px dot");
add("lemon", SURFACES, "info", "lemon fill boundary (badge carries a 2 px ink outline)");
add("surface", ["ground"], "info", "plain panel vs page (flat surfaces)");
add("surface-sunken", ["surface"], "info", "input/chip fill vs card (input carries a line-strong border)");
add("brand-soft", ["ground"], "info", "selected row vs page");

const resolve = (name, theme) => (name.startsWith("#") || name.startsWith("rgb") ? name : T[theme][name]);

let failures = 0;
const rows = [];
for (const theme of ["day", "night"]) {
  for (const [fg, bg, kind, note] of pairs) {
    const bgC = parse(resolve(bg, theme));
    const fgC = over(parse(resolve(fg, theme)), bgC);
    const r = ratio(fgC, bgC);
    const min = kind === "text" ? 4.5 : kind === "info" ? 0 : kind === "never" ? 4.5 : 3;
    const pass = r >= min;
    const fixHex = !pass && kind !== "never" ? fix(fgC, bgC, min) : null;
    if (!pass && kind !== "never") failures++;
    rows.push({ theme, fg, bg, kind, ratio: r, pass, fix: fixHex, note, fgHex: hex(fgC), bgHex: hex(bgC) });
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("theme", 6), pad("fg", 17), pad("bg", 15), pad("kind", 8), pad("ratio", 7), pad("ok", 5), pad("fix", 9), "note");
for (const r of rows) {
  const flag = r.kind === "info" ? "info" : r.kind === "never" ? "NEVER" : r.pass ? "PASS" : "FAIL";
  console.log(pad(r.theme, 6), pad(r.fg, 17), pad(r.bg, 15), pad(r.kind, 8), pad(r.ratio.toFixed(2), 7), pad(flag, 5), pad(r.fix ?? "", 9), `${r.note} [${r.fgHex} on ${r.bgHex}]`);
}

// Scrim: the sheet surface against the scrimmed page behind it (the sheet's edge), info only
for (const theme of ["day", "night"]) {
  const behind = over(parse(T[theme].scrim), parse(T[theme].ground));
  console.log(`\nscrim ${theme}: page under scrim = ${hex(behind)}; sheet surface vs it = ${ratio(parse(T[theme].surface), behind).toFixed(2)}:1`);
}

// Search: the darkest coral (same hue) that still carries on-brand ink at 4.5:1, and the lightest that keeps 3:1 on ground
const coral = parse(T.day.brand), ink = parse(T.day["on-brand"]);
const ok = toOk(coral);
let darkest = null;
for (let i = 0; i <= 60; i++) {
  const c = parse(hex(fromOk({ ...ok, L: ok.L - i * 0.0025 }).rgb));
  if (ratio(c, ink) >= 4.5) darkest = hex(c);
  else break;
}
console.log(`\ncoral search: darkest same-hue coral with ink >= 4.5:1 = ${darkest} (ink on it ${ratio(parse(darkest), ink).toFixed(2)}:1); brand-deep #d9402f gives ${ratio(parse("#d9402f"), ink).toFixed(2)}:1`);
console.log(`brand-hover ${T.day["brand-hover"]}: ink ${ratio(parse(T.day["brand-hover"]), ink).toFixed(2)}:1`);

const required = rows.filter((r) => r.kind !== "info" && r.kind !== "never" && !r.pass);
const nevers = rows.filter((r) => r.kind === "never" && !r.pass);
console.log(`\n${nevers.length} "never" pair(s) (rules, expected to fail):`);
for (const r of nevers) console.log(`  ${r.theme} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 (${r.note})`);
console.log(`\n${required.length} required pair(s) fail:`);
for (const r of required) console.log(`  ${r.theme} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 -> fix ${r.fix ?? "none found"} (${r.note})`);
process.exitCode = required.length ? 1 : 0;
