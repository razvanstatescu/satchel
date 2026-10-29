// Builds src/lib/card-fonts.generated.ts: WOFF2 subsets of the brand faces for the NFT media /api/card/{id}.svg
// (Satchel 2.0; design-system-impl.md §8; D-23). Static instances (no variable axes left), only the glyphs the card can
// draw, embedded as data: URIs so the SVG renders the same in every wallet and browser. It also records the advance
// width of every label word (the status pill and the chain chips), shaped with HarfBuzz from the same instance, so the
// card lays its pills out from constants and measures nothing at runtime.
//
//   pnpm --filter web fonts:card            (needs network once; sources are cached and sha256-checked)
//
// Sources: google/fonts at pinned commits, SIL Open Font License 1.1 (subsetting and embedding are allowed; the OFL
// notice travels in the generated file). Output is deterministic: re-running it must not change the file.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import subsetFont from "subset-font";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "src/lib/card-fonts.generated.ts");
const cacheDir = process.env.CARD_FONT_CACHE ?? join(tmpdir(), "satchel-card-fonts");

const SOURCES = {
  funnel: {
    name: "Funnel Display",
    url: "https://raw.githubusercontent.com/google/fonts/f788e4777244983204dfd364d6dca2a1fab7d6b8/ofl/funneldisplay/FunnelDisplay%5Bwght%5D.ttf",
    sha256: "b4151c9c4b7b07eb74320096b4ff4156cca8821f5adfab34af9fd9a2d6c1179d",
    copyright: "Copyright 2023 The Funnel Project Authors (https://github.com/Dicotype/Funnel)",
  },
  onest: {
    name: "Onest",
    url: "https://raw.githubusercontent.com/google/fonts/4c1db3aec83c67dd223dd82a68c039cab30917a9/ofl/onest/Onest%5Bwght%5D.ttf",
    sha256: "966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31",
    copyright: "Copyright 2021 The Onest Project Authors (https://github.com/simpals/onest)",
  },
};

const DIGITS = "0123456789";
const uniq = (s) => [...new Set([...s])].sort().join("");

// The label words (src/lib/copy.ts `pill.active/signing/listed`, the tickers). test/unit/card-svg.test.ts checks that
// these are exactly the words the card draws, so a copy change fails the test until this script runs again.
const LABEL_WORDS = ["Active", "Signing", "Paused for sale", "BTC", "ETH", "SOL"];
const LABEL_SIZE = 24;

// Every string the card draws, per face (src/lib/card-svg.ts). test/unit/card-svg.test.ts checks the coverage.
const FACES = [
  { key: "display", family: "Satchel Card Display", source: "funnel", weight: 800, axes: { wght: 800 }, chars: uniq(`Satchel #${DIGITS} signatures`) },
  { key: "sans", family: "Satchel Card Sans", source: "onest", weight: 500, axes: { wght: 500 }, chars: uniq("recorded on NEAR testnet") },
  { key: "label", family: "Satchel Card Label", source: "onest", weight: 600, axes: { wght: 600 }, chars: uniq(LABEL_WORDS.join(" ")) },
];

const sha = (b) => createHash("sha256").update(b).digest("hex");

async function source(name) {
  const s = SOURCES[name];
  mkdirSync(cacheDir, { recursive: true });
  const p = join(cacheDir, `${name}-${s.sha256.slice(0, 12)}.ttf`);
  let buf = existsSync(p) ? readFileSync(p) : null;
  if (!buf) {
    const r = await fetch(s.url);
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(p, buf);
  }
  if (sha(buf) !== s.sha256) throw new Error(`${name}: sha256 mismatch (got ${sha(buf)})`);
  return buf;
}

// HarfBuzz ships with subset-font (no extra dependency); resolve it from there.
const require = createRequire(import.meta.url);
const hbPath = createRequire(require.resolve("subset-font")).resolve("harfbuzzjs");
const hb = await import(pathToFileURL(hbPath).href);

/** The advance width of `text` in px at `size`, shaped from `ttf` at the given axes (2 decimals). */
function advance(ttf, axes, text, size) {
  const face = new hb.Face(new hb.Blob(ttf));
  const font = new hb.Font(face);
  font.setVariations(Object.entries(axes).map(([tag, value]) => new hb.Variation(tag, value)));
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf);
  const units = buf.getGlyphPositions().reduce((sum, p) => sum + p.xAdvance, 0);
  return Math.round(((units * size) / face.upem) * 100) / 100;
}

const faces = [];
for (const f of FACES) {
  const ttf = await source(f.source);
  const woff2 = await subsetFont(ttf, f.chars, { targetFormat: "woff2", variationAxes: f.axes });
  faces.push({ ...f, bytes: woff2.length, sha256: sha(woff2), base64: woff2.toString("base64") });
  console.log(`${f.key.padEnd(8)} ${f.family.padEnd(22)} ${String(woff2.length).padStart(6)} B  ${f.chars.length} chars`);
}

const labelFace = FACES.find((f) => f.key === "label");
const labelTtf = await source(labelFace.source);
const widths = Object.fromEntries(LABEL_WORDS.map((w) => [w, advance(labelTtf, labelFace.axes, w, LABEL_SIZE)]));
console.log("label widths @24px", widths);

const lines = [
  "// GENERATED by scripts/build-card-fonts.mjs. Do not edit by hand; run `pnpm --filter web fonts:card`.",
  "//",
  "// WOFF2 subsets (static instances) of the Satchel 2.0 brand faces for the NFT media SVG (design-system-impl §8):",
  ...faces.map((f) => `//   ${f.family}: ${SOURCES[f.source].name} ${JSON.stringify(f.axes)}, ${f.bytes} B`),
  "//",
  `// ${SOURCES.funnel.copyright}`,
  `// ${SOURCES.onest.copyright}`,
  "// This Font Software is licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org).",
  "// No Reserved Font Name is declared. The CSS families are \"Satchel Card …\" so an installed copy never substitutes.",
  "",
  "export interface CardFontFace {",
  "  family: string;",
  "  weight: number;",
  "  /** every character the subset contains (sorted) */",
  "  chars: string;",
  "  bytes: number;",
  "  sha256: string;",
  "  woff2Base64: string;",
  "}",
  "",
  "export const CARD_FONTS = {",
  ...faces.map((f) => `  ${f.key}: { family: ${JSON.stringify(f.family)}, weight: ${f.weight}, chars: ${JSON.stringify(f.chars)}, bytes: ${f.bytes}, sha256: ${JSON.stringify(f.sha256)}, woff2Base64: ${JSON.stringify(f.base64)} },`),
  "} as const satisfies Record<string, CardFontFace>;",
  "",
  `/** Advance widths in px at ${LABEL_SIZE} px of the label words (Satchel Card Label), shaped with HarfBuzz from the same instance. */`,
  `export const CARD_LABEL_WIDTHS: Readonly<Record<string, number>> = ${JSON.stringify(widths)};`,
  "",
];
writeFileSync(out, lines.join("\n"));
console.log(`wrote ${out}`);
