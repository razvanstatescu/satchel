// Throwaway reference implementation of the SatchelCard seeding algorithm (spec in kb/80-ux-spec.md §Components).
// Purpose: produce test vectors + verify text contrast over all seeds. Re-implement from the spec on/after Nov 1.
import { oklchToHexClamped, contrast, hex2rgb, rgb2hex, over, lum } from './color.mjs';
export function fnv1a32(str) { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(a) { return function() { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const ALLOYS = [
  { name: 'Titanium',  h: 250, c: 0.020, hj: 10 },
  { name: 'Gunmetal',  h: 265, c: 0.012, hj: 10 },
  { name: 'Cobalt',    h: 262, c: 0.120, hj: 10 },
  { name: 'Anodized',  h: 302, c: 0.110, hj: 12 },
  { name: 'Rose Gold', h: 22,  c: 0.075, hj: 8  },
  { name: 'Electrum',  h: 86,  c: 0.080, hj: 8  },
  { name: 'Patina',    h: 182, c: 0.075, hj: 10 },
  { name: 'Copper',    h: 50,  c: 0.100, hj: 8  },
];
const r1 = (x) => Math.round(x * 10) / 10;
export function seedCard(tokenId) {
  const seed = fnv1a32(`satchel:${tokenId}`);
  const rng = mulberry32(seed);
  // draw order is part of the spec: alloy, h1 jitter, h2 sign, h2 offset, angle, sheen position, highlight x, grain
  const alloy = ALLOYS[Math.floor(rng() * ALLOYS.length)];
  const h1 = (alloy.h + (rng() * 2 - 1) * alloy.hj + 360) % 360;
  const sign = rng() < 0.5 ? -1 : 1;
  const delta = sign * (14 + rng() * 16);              // secondary hue offset, ±14..30°
  const h2 = (h1 + delta + 360) % 360;
  const hMid = (h1 + delta / 2 + 360) % 360;           // never average wrapped hues
  const angle = Math.round(115 + rng() * 50);          // deg
  const sheenAt = Math.round(42 + rng() * 18);         // % along gradient
  const highlightX = Math.round(15 + rng() * 70);      // % across card
  const grain = Math.floor(rng() * 1000);              // feTurbulence seed (SVG only)
  const c = alloy.c;
  const stops = [
    { at: 0,       hex: oklchToHexClamped(0.26, c * 0.8, h1) },
    { at: 28,      hex: oklchToHexClamped(0.42, c,       hMid) },
    { at: sheenAt, hex: oklchToHexClamped(0.66, c * 0.6, h2) },
    { at: 76,      hex: oklchToHexClamped(0.40, c,       hMid) },
    { at: 100,     hex: oklchToHexClamped(0.24, c * 0.8, h1) },
  ];
  const accent = oklchToHexClamped(0.80, Math.min(c * 1.2 + 0.02, 0.14), h1); // identity colour, text-safe on dark surfaces
  return { tokenId, seed, alloy: alloy.name, h1: r1(h1), h2: r1(h2), angle, sheenAt, highlightX, grain, stops, accent };
}
if (process.argv[2] === 'vectors') {
  for (const id of ['0','1','2','3','4','5','6','7','8','42','100','1000']) console.log(JSON.stringify(seedCard(id)));
}
if (process.argv[2] === 'sweep') {
  const FG = '#F3F5F8', FG2 = '#B4BBC5', GLASS = '#08090B';
  const HIGHLIGHT_A = 0.16;
  let worst = { l: -1 }; const alloyCount = {}; let minAccentBg = 99, minAccentS1 = 99, minAccentS2 = 99;
  for (let i = 1; i <= 100000; i++) {
    const s = seedCard(String(i)); alloyCount[s.alloy] = (alloyCount[s.alloy] || 0) + 1;
    // worst pixel = brightest stop + specular white highlight composited on top
    for (const st of s.stops) { const comp = over([1,1,1], HIGHLIGHT_A, hex2rgb(st.hex)); const l = lum(comp); if (l > worst.l) worst = { l, id: i, hex: rgb2hex(comp), raw: st.hex, alloy: s.alloy }; }
    minAccentBg = Math.min(minAccentBg, contrast(s.accent, '#0A0B0D'));
    minAccentS1 = Math.min(minAccentS1, contrast(s.accent, '#111317'));
    minAccentS2 = Math.min(minAccentS2, contrast(s.accent, '#181B20'));
  }
  console.log('alloy distribution (1..100000):', alloyCount);
  console.log('worst-case pixel (brightest stop + 16% highlight):', worst, 'fg on it raw:', contrast(FG, worst.hex).toFixed(2));
  for (const a of [0, 0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]) {
    const comp = rgb2hex(over(hex2rgb(GLASS), a, hex2rgb(worst.hex)));
    console.log(`glass/scrim #08090B @ ${a}: composite ${comp}  fg ${contrast(FG, comp).toFixed(2)}  fg2 ${contrast(FG2, comp).toFixed(2)}  btc ${contrast('#F7931A', comp).toFixed(2)}  ethFg ${contrast('#9AABF5', comp).toFixed(2)}  solFg ${contrast('#C09BFF', comp).toFixed(2)}  success ${contrast('#4ADE9B', comp).toFixed(2)} frozen ${contrast('#9AD8FF', comp).toFixed(2)} listed ${contrast('#E8C77A', comp).toFixed(2)}`);
  }
  console.log('identity accent min contrast: on bg', minAccentBg.toFixed(2), 'on surface1', minAccentS1.toFixed(2), 'on surface2', minAccentS2.toFixed(2));
}
