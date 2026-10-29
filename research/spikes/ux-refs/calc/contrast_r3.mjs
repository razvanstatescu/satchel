// THROWAWAY calculation script for kb/81 Revision 3 "Brand consolidated" (Phase 0, 2026-10-21). Not product code; never import it.
// Reads brand/tokens.json and the ux spike helpers READ-ONLY (research/spikes/ux/color.mjs, card_seed.mjs). Nothing there is modified.
// WCAG 2.x relative-luminance contrast; alpha is composited in sRGB (what browsers do for normal blending); gradients interpolate in sRGB
// (CSS default when every stop is a legacy hex colour).
// Run: node research/spikes/ux-refs/calc/contrast_r3.mjs                 (all sections)
//      node research/spikes/ux-refs/calc/contrast_r3.mjs claims          (one of: claims|text|nontext|brass|buttons|pressed|pills|accent|stitch|misc)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, hex2rgb, rgb2hex, over, rgb2oklch, oklch2rgb, oklchToHexClamped, inGamut } from '../../ux/color.mjs';
import { fnv1a32 } from '../../ux/card_seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(fs.readFileSync(path.join(here, '../../../../brand/tokens.json'), 'utf8'));
const B = {}; for (const t of tokens.color.tokens) B[t.name] = t.value; // B.ink.night, B.ink.day …
const TH = ['night', 'day'];
const f2 = (x) => x.toFixed(2);
const mix = (fgHex, a, bgHex) => rgb2hex(over(hex2rgb(fgHex), a, hex2rgb(bgHex)));
const c = (a, b) => contrast(a, b);
const want = process.argv[2];
const on = (k) => !want || want === k;
const SURF = ['ground', 'surface', 'surface-raised'];
const PASS = (v, need) => (v >= need ? 'pass' : '**FAIL**');
const failures = [];
const check = (label, v, need) => { if (v < need) failures.push(`${label}: ${f2(v)} < ${need}`); return v; };

// Derived R3 aliases (kb/81 R3 §Derived tokens). Values are brand values only; nothing new is invented here.
const D = {
  'brand-ink':  { night: B.brand.night, day: B.link.day },          // brass as text (Listed pill word); Day uses the brand's text-safe brass (= link)
  'brand-line': { night: B.brand.night, day: B['brand-deep'].day }, // brass as a thin non-text mark (tab indicator, Listed glyph on a page)
  'band-pill':  { night: B['on-brand'].night, day: B['on-brand'].day }, // #2B1D15 pill on the brass band (canvas)
};

if (on('claims')) {
  console.log('\n## claims: reproduce the brand README / tokens.json contrast claims');
  const rows = [];
  for (const th of TH) {
    const inkMin = Math.min(...SURF.map((s) => c(B.ink[th], B[s][th])));
    const mutedMin = Math.min(...SURF.map((s) => c(B['ink-muted'][th], B[s][th])));
    rows.push([`ink ≥ 12:1 on every surface (${th})`, inkMin, 12]);
    rows.push([`ink-muted ≥ 5.5:1 on every surface (${th})`, mutedMin, 5.5]);
    rows.push([`line-strong ≥ 3:1 on surface (${th})`, c(B['line-strong'][th], B.surface[th]), 3]);
    rows.push([`line-strong ≥ 3:1 on surface-raised (${th})`, c(B['line-strong'][th], B['surface-raised'][th]), 3]);
  }
  rows.push(['on-brand 7.7:1 on brand', c(B['on-brand'].night, B.brand.night), 7.7]);
  rows.push(['on-brand 10.4:1 on brand-bright', c(B['on-brand'].night, B['brand-bright'].night), 10.4]);
  rows.push(['link 8.9:1 on Night ground', c(B.link.night, B.ground.night), 8.9]);
  rows.push(['link 5.8:1 on Day ground', c(B.link.day, B.ground.day), 5.8]);
  rows.push(['brand-deep 3.9:1 on Day ground (brass-button border)', c(B['brand-deep'].day, B.ground.day), 3.9]);
  for (const th of TH) {
    const txt = ['ink', 'ink-muted', 'link', 'success', 'frozen', 'danger'];
    const m = Math.min(...txt.map((k) => c(B[k][th], B['surface-raised'][th])));
    const worst = txt.reduce((a, k) => (c(B[k][th], B['surface-raised'][th]) < c(B[a][th], B['surface-raised'][th]) ? k : a), 'ink');
    rows.push([`surface-raised: every text colour ≥ 4.5:1 (${th}; worst ${worst})`, m, 4.5]);
    const chains = ['chain-btc', 'chain-evm', 'chain-sol'];
    const cm = Math.min(...chains.flatMap((k) => SURF.map((s) => c(B[k][th], B[s][th]))));
    rows.push([`chain colours ≥ 3:1 as graphics on every surface (${th})`, cm, 3]);
  }
  console.log('| Claim | Computed | Claimed / needed | Result |');
  console.log('|---|---:|---:|---|');
  // A claim is "reproduced" when the computed ratio, rounded to the claim's own precision, is at least the claim.
  const dec = (x) => (String(x).split('.')[1] || '').length;
  const rnd = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
  for (const [k, v, need] of rows) {
    const ok = rnd(v, dec(need)) >= need; if (!ok) failures.push(`claim ${k}: ${v.toFixed(3)} < ${need}`);
    const note = v - need > 1 ? ' (the claim understates it)' : '';
    console.log(`| ${k} | ${v.toFixed(3)} | ${need} | ${ok ? 'reproduced' + note : '**not reproduced**'} |`);
  }
}

if (on('text')) {
  for (const th of TH) {
    console.log(`\n## text (${th}): text tokens on ground / surface / surface-raised (need 4.5)`);
    console.log('| Foreground | ground | surface | surface-raised | Min | Result |');
    console.log('|---|---:|---:|---:|---:|---|');
    const fgs = [['ink', B.ink[th]], ['ink-muted', B['ink-muted'][th]], ['link', B.link[th]], ['success', B.success[th]], ['frozen', B.frozen[th]], ['danger', B.danger[th]], ['brand-ink (derived)', D['brand-ink'][th]], ['brand (as text)', B.brand[th]]];
    for (const [k, fg] of fgs) {
      const v = SURF.map((s) => c(fg, B[s][th])); const m = Math.min(...v);
      if (!k.startsWith('brand (as text)')) check(`text ${k} (${th})`, m, 4.5);
      console.log(`| \`${k}\` ${fg} | ${v.map(f2).join(' | ')} | ${f2(m)} | ${PASS(m, 4.5)}${k.startsWith('brand (as text)') && m < 4.5 ? ' (so brass text uses brand-ink)' : ''} |`);
    }
  }
}

if (on('nontext')) {
  for (const th of TH) {
    console.log(`\n## nontext (${th}): graphics and control boundaries (need 3)`);
    console.log('| Graphic | ground | surface | surface-raised | Min | Result |');
    console.log('|---|---:|---:|---:|---:|---|');
    const gs = [['line-strong (control borders)', B['line-strong'][th], 3], ['focus (ring)', B.focus[th], 3], ['brand-line (derived: tab indicator, Listed glyph)', D['brand-line'][th], 3],
      ['chain-btc', B['chain-btc'][th], 3], ['chain-evm', B['chain-evm'][th], 3], ['chain-sol', B['chain-sol'][th], 3],
      ['success (icon)', B.success[th], 3], ['frozen (icon, pulse)', B.frozen[th], 3], ['danger (icon)', B.danger[th], 3],
      ['line (hairline, decorative)', B.line[th], 0], ['brand (fill edge)', B.brand[th], 0], ['brand-deep', B['brand-deep'][th], 0]];
    for (const [k, fg, need] of gs) {
      const v = SURF.map((s) => c(fg, B[s][th])); const m = Math.min(...v);
      if (need) check(`nontext ${k} (${th})`, m, need);
      console.log(`| \`${k}\` ${fg} | ${v.map(f2).join(' | ')} | ${f2(m)} | ${need ? PASS(m, need) : 'decorative'} |`);
    }
  }
}

// --- brass band (CSS linear-gradient(135deg, brand-bright 0%, brand 55%, brand-deep 100%)) ---
const stops = [[0, B['brand-bright'].night], [0.55, B.brand.night], [1, B['brand-deep'].night]];
function gradAt(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, a] = stops[i], [t1, b] = stops[i + 1];
    if (t <= t1) { const u = (t - t0) / (t1 - t0); const A = hex2rgb(a), Bc = hex2rgb(b); return rgb2hex(A.map((v, j) => v + (Bc[j] - v) * u)); }
  }
  return stops[stops.length - 1][1];
}
function bandT(x, y, W, H) { const th = (135 * Math.PI) / 180; const dx = Math.sin(th), dy = -Math.cos(th); const L = Math.abs(W * dx) + Math.abs(H * dy); return ((x - W / 2) * dx + (y - H / 2) * dy) / L + 0.5; }

if (on('brass')) {
  console.log('\n## brass: on-brand text on the brass fills and on the card band gradient');
  console.log(`on-brand ${B['on-brand'].night} on brand ${f2(c(B['on-brand'].night, B.brand.night))} · brand-bright (hover) ${f2(c(B['on-brand'].night, B['brand-bright'].night))} · brand-deep (pressed) ${f2(c(B['on-brand'].night, B['brand-deep'].night))}`);
  check('on-brand on brand-deep (pressed primary)', c(B['on-brand'].night, B['brand-deep'].night), 4.5);
  console.log('\nBand = 28 % of card height; card ratio 1.586. Name region = the left 60 % of the band (canvas: name left, status pill right on its own #2B1D15 fill).');
  console.log('| Card width | Band (px) | Darkest gradient pixel under the name | on-brand there | Darkest pixel anywhere (pill side) | on-brand there |');
  console.log('|---:|---:|---|---:|---|---:|');
  for (const W of [480, 400, 358, 312, 288]) {
    const H = Math.round((W / 1.586) * 0.28);
    let worstName = { cr: 99 }, worstAll = { cr: 99 };
    for (let x = 0; x <= W; x += 2) for (let y = 0; y <= H; y += 2) {
      const hex = gradAt(bandT(x, y, W, H)); const cr = c(B['on-brand'].night, hex);
      if (x <= 0.6 * W && cr < worstName.cr) worstName = { cr, hex };
      if (cr < worstAll.cr) worstAll = { cr, hex };
    }
    check(`band name region W=${W}`, worstName.cr, 4.5);
    console.log(`| ${W} | ${H} | ${worstName.hex} | ${f2(worstName.cr)} | ${worstAll.hex} | ${f2(worstAll.cr)} |`);
  }
  console.log('\nBand status pill (canvas): fill #2B1D15, word in brand-bright, glyph in the state colour. The pill is dark on brass in BOTH themes, so its glyphs use the Night state values.');
  const pill = D['band-pill'].night;
  console.log('| On the band pill | Ratio | Need | Result |'); console.log('|---|---:|---:|---|');
  const bp = [['word: brand-bright', B['brand-bright'].night, 4.5], ['glyph Active: success (Night)', B.success.night, 3], ['glyph Signing: frozen (Night)', B.frozen.night, 3], ['glyph Listed: brand', B.brand.night, 3], ['glyph Sold: ink-muted (Night)', B['ink-muted'].night, 3], ['glyph Needs attention: danger (Night)', B.danger.night, 3], ['pill edge vs brand (band)', B.brand.night, 3], ['pill edge vs brand-bright (band)', B['brand-bright'].night, 3]];
  for (const [k, fg, need] of bp) { const v = c(fg, pill); check(`band pill ${k}`, v, need); console.log(`| ${k} | ${f2(v)} | ${need} | ${PASS(v, need)} |`); }
}

if (on('buttons')) {
  console.log('\n## buttons (B-03)');
  console.log('| Button part | Night | Day | Need | Result |'); console.log('|---|---:|---:|---:|---|');
  const row = (k, n, d, need) => { if (need) { check(`button ${k} (night)`, n, need); check(`button ${k} (day)`, d, need); } console.log(`| ${k} | ${f2(n)} | ${f2(d)} | ${need || 'info'} | ${need ? (Math.min(n, d) >= need ? 'pass' : '**FAIL**') : '—'} |`); };
  row('Primary: on-brand on brand (rest)', c(B['on-brand'].night, B.brand.night), c(B['on-brand'].day, B.brand.day), 4.5);
  row('Primary: on-brand on brand-bright (hover)', c(B['on-brand'].night, B['brand-bright'].night), c(B['on-brand'].day, B['brand-bright'].day), 4.5);
  row('Primary: on-brand on brand-deep (pressed)', c(B['on-brand'].night, B['brand-deep'].night), c(B['on-brand'].day, B['brand-deep'].day), 4.5);
  row('Primary boundary: brand fill vs ground', c(B.brand.night, B.ground.night), c(B.brand.day, B.ground.day), 0);
  row('Primary boundary: brand fill vs surface', c(B.brand.night, B.surface.night), c(B.brand.day, B.surface.day), 0);
  row('Primary Day border: brand-deep vs ground / surface (Day only)', c(B['brand-deep'].day, B.ground.day), c(B['brand-deep'].day, B.surface.day), 3);
  row('Secondary: ink on ground (transparent fill)', c(B.ink.night, B.ground.night), c(B.ink.day, B.ground.day), 4.5);
  row('Secondary: line-strong border vs ground', c(B['line-strong'].night, B.ground.night), c(B['line-strong'].day, B.ground.day), 3);
  row('Secondary hover: ink on surface-raised', c(B.ink.night, B['surface-raised'].night), c(B.ink.day, B['surface-raised'].day), 4.5);
  for (const s of SURF) row(`Destructive outline: danger text on ${s}`, c(B.danger.night, B[s].night), c(B.danger.day, B[s].day), 4.5);
  for (const s of SURF) row(`Destructive outline: danger border vs ${s}`, c(B.danger.night, B[s].night), c(B.danger.day, B[s].day), 3);
  row('Focus ring vs ground (2 px offset shows ground)', c(B.focus.night, B.ground.night), c(B.focus.day, B.ground.day), 3);
  row('Focus ring vs surface', c(B.focus.night, B.surface.night), c(B.focus.day, B.surface.day), 3);
  row('Focus ring vs surface-raised', c(B.focus.night, B['surface-raised'].night), c(B.focus.day, B['surface-raised'].day), 3);
  row('Focus ring vs brand fill (info: the offset separates them)', c(B.focus.night, B.brand.night), c(B.focus.day, B.brand.day), 0);
  const dis = (fg, bg, bgPage) => c(mix(fg, 0.4, bgPage), mix(bg, 0.4, bgPage));
  row('Disabled primary at 40 % opacity: text vs fill (exempt, info)', dis(B['on-brand'].night, B.brand.night, B.ground.night), dis(B['on-brand'].day, B.brand.day, B.ground.day), 0);
  row('Link (text button) on ground', c(B.link.night, B.ground.night), c(B.link.day, B.ground.day), 4.5);
}

if (on('pressed')) {
  console.log('\n## pressed: the brand pressed state (brand-deep fill) fails 4.5:1 with on-brand text; candidate fixes');
  const onb = B['on-brand'].night;
  console.log('| Candidate | Fill | on-brand on it | Result |'); console.log('|---|---|---:|---|');
  console.log(`| Brand as specified: fill brand-deep | ${B['brand-deep'].night} | ${f2(c(onb, B['brand-deep'].night))} | ${PASS(c(onb, B['brand-deep'].night), 4.5)} |`);
  console.log(`| (a) keep the brand fill, add an inset 2 px brand-deep ring | ${B.brand.night} | ${f2(c(onb, B.brand.night))} | ${PASS(c(onb, B.brand.night), 4.5)} (ring vs fill ${f2(c(B['brand-deep'].night, B.brand.night))}, a decorative cue) |`);
  for (const pct of [10, 20, 30, 35, 40, 45, 50, 60]) {
    const fill = mix(B['brand-deep'].night, pct / 100, B.brand.night);
    console.log(`| (b) color-mix(in srgb, brand-deep ${pct}%, brand) | ${fill} | ${f2(c(onb, fill))} | ${PASS(c(onb, fill), 4.5)} |`);
  }
  console.log(`| (c) brand-deep fill with pure black text (not a brand colour) | ${B['brand-deep'].night} | ${f2(c('#000000', B['brand-deep'].night))} | ${PASS(c('#000000', B['brand-deep'].night), 4.5)} |`);
  console.log('\nThin margins at three decimals: ' + [
    ['ink-muted day on surface-raised', B['ink-muted'].day, B['surface-raised'].day],
    ['danger day on surface-raised', B.danger.day, B['surface-raised'].day],
    ['frozen day on surface-raised', B.frozen.day, B['surface-raised'].day],
    ['line-strong night on surface-raised', B['line-strong'].night, B['surface-raised'].night],
    ['chain-btc day on surface-raised', B['chain-btc'].day, B['surface-raised'].day],
    ['brand-line day (brand-deep) on surface-raised', B['brand-deep'].day, B['surface-raised'].day]].map(([k, a, b]) => `${k} ${c(a, b).toFixed(3)}`).join(' · '));
}

if (on('pills')) {
  console.log('\n## pills (B-05): page StatusPill / item tags = surface-raised fill, icon + word in the state colour, 13/600');
  console.log('| State | Token (word + icon) | Night word | Day word | Night icon (3:1) | Day icon (3:1) | Result |'); console.log('|---|---|---:|---:|---:|---:|---|');
  const st = [['Active · Settled · Expired · Clean history · Confirmed', 'success', B.success, B.success],
    ['Signing · Settling · In mempool · Signing paused (banner)', 'frozen', B.frozen, B.frozen],
    ['Listed', 'brand-ink (word) + brand-line (glyph)', D['brand-ink'], D['brand-line']],
    ['Sold · Unfunded · Can\'t verify · Checking · 1 of 2 sources', 'ink-muted', B['ink-muted'], B['ink-muted']],
    ['Needs attention · Unused · Blocked · Unsafe · Failed · Signed, not sent', 'danger', B.danger, B.danger]];
  for (const [k, tok, wordT, iconT] of st) {
    const wn = c(wordT.night, B['surface-raised'].night), wd = c(wordT.day, B['surface-raised'].day);
    const inn = c(iconT.night, B['surface-raised'].night), id = c(iconT.day, B['surface-raised'].day);
    check(`pill word ${k} night`, wn, 4.5); check(`pill word ${k} day`, wd, 4.5); check(`pill icon ${k} night`, inn, 3); check(`pill icon ${k} day`, id, 3);
    console.log(`| ${k} | \`${tok}\` | ${f2(wn)} | ${f2(wd)} | ${f2(inn)} | ${f2(id)} | ${Math.min(wn, wd) >= 4.5 && Math.min(inn, id) >= 3 ? 'pass' : '**FAIL**'} |`);
  }
  console.log('\nPill fill vs its host (decorative; the word carries the state): ' + TH.map((th) => `${th}: surface-raised vs ground ${f2(c(B['surface-raised'][th], B.ground[th]))}, vs surface ${f2(c(B['surface-raised'][th], B.surface[th]))}`).join(' · '));
  console.log('Brass as page text WITHOUT the alias (why Listed uses brand-ink in Day): ' + TH.map((th) => `${th} brand on surface-raised ${f2(c(B.brand[th], B['surface-raised'][th]))}`).join(' · '));
}

// --- per-token leather hue (B-04) ---
const H0 = 52; // OKLCH hue of the leather family: ground 51.2 · surface 52.3 · surface-raised 54.1 · leather-light 53.8 · leather-dark 50.3 · ink-day 50.8
const offsetOf = (id) => (fnv1a32(`satchel:${id}`) % 25) - 12; // integer −12…+12
const okl = (hex) => rgb2oklch(hex2rgb(hex));
const lab = (hex) => { const [L, C, H] = okl(hex); const h = (H * Math.PI) / 180; return [L, C * Math.cos(h), C * Math.sin(h)]; };
const dE = (a, b) => { const A = lab(a), Bq = lab(b); return Math.hypot(A[0] - Bq[0], A[1] - Bq[1], A[2] - Bq[2]); };
const [LS, CS] = okl(B.surface.night); // Night surface L 0.220, C 0.0197
const [LL, CL] = okl(B['leather-light'].night); // L 0.431, C 0.0597
const BODY_C = 0.034;
const body = (off, C = BODY_C) => oklchToHexClamped(LS, C, H0 + off);
const swatch = (off) => oklchToHexClamped(LL, CL, H0 + off);

if (on('accent')) {
  console.log(`\n## accent (B-04): offset = (fnv1a32(utf8("satchel:" + id)) mod 25) − 12; hue = ${H0} + offset (OKLCH)`);
  console.log(`Night card body = oklch(${LS.toFixed(3)} C ${H0}+off): the brand surface's L. Swatch (both themes) = oklch(${LL.toFixed(3)} ${CL.toFixed(4)} ${H0}+off): leather-light at offset 0.`);
  console.log('\nChroma choice for the Night body (perceptibility vs the brand surface; OKLab ΔE ≈ 0.02 is about one just-noticeable step):');
  console.log('| Body C | Body at −12 / 0 / +12 | ΔE −12↔+12 | ΔE neighbour (1°) | ΔE vs brand surface (max) | ink min | ink-muted min | Result |');
  console.log('|---:|---|---:|---:|---:|---:|---:|---|');
  for (const C of [CS, 0.026, 0.030, BODY_C, 0.040, 0.046]) {
    const hexes = []; for (let o = -12; o <= 12; o++) hexes.push(body(o, C));
    const im = Math.min(...hexes.map((h) => c(B.ink.night, h))), mm = Math.min(...hexes.map((h) => c(B['ink-muted'].night, h)));
    const dmax = Math.max(...hexes.map((h) => dE(h, B.surface.night)));
    const sel = Math.abs(C - BODY_C) < 1e-9 ? ' ← R3' : '';
    console.log(`| ${C.toFixed(4)}${sel} | ${body(-12, C)} / ${body(0, C)} / ${body(12, C)} | ${dE(body(-12, C), body(12, C)).toFixed(4)} | ${dE(body(0, C), body(1, C)).toFixed(4)} | ${dmax.toFixed(4)} | ${f2(im)} | ${f2(mm)} | ${im >= 12 && mm >= 5.5 ? 'keeps brand floors' : 'below a brand floor'} |`);
  }
  console.log(`\nEvery shifted surface at the R3 chroma (C ${BODY_C}), worst case over offsets −12…+12 (Night body; text needs 4.5, graphics 3):`);
  const bodies = []; for (let o = -12; o <= 12; o++) bodies.push(body(o));
  const worst = (fg, need, label) => { const v = Math.min(...bodies.map((h) => c(fg, h))); check(`accent body ${label}`, v, need); return `${f2(v)} ${need ? PASS(v, need) : '(decorative)'}`; };
  console.log('| On the Night card body | Worst ratio |'); console.log('|---|---|');
  console.log(`| \`ink\` (total, name of chips) | ${worst(B.ink.night, 4.5, 'ink')} |`);
  console.log(`| \`ink-muted\` (qualifier "at mainnet prices", "{n} signatures" label) | ${worst(B['ink-muted'].night, 4.5, 'ink-muted')} |`);
  console.log(`| \`link\` (if a link ever sits on the body) | ${worst(B.link.night, 4.5, 'link')} |`);
  console.log(`| \`danger\` (prices error, never expected) | ${worst(B.danger.night, 4.5, 'danger')} |`);
  console.log(`| chain chip fill \`surface-raised\` vs body | ${worst(B['surface-raised'].night, 0, 'chip fill')} |`);
  console.log(`| stitch: brand at 45 % composited on the body, vs the body | ${f2(Math.min(...bodies.map((h) => c(mix(B.brand.night, 0.45, h), h))))} (decorative) |`);
  console.log(`| body vs ground (card edge; shadow-card also separates it) | ${f2(Math.min(...bodies.map((h) => c(h, B.ground.night))))} (decorative) |`);
  console.log('\nSwatch (mini card: brass top strip over the token leather), both themes, worst over offsets:');
  const sw = []; for (let o = -12; o <= 12; o++) sw.push(swatch(o));
  console.log('| Swatch body vs | Night | Day |'); console.log('|---|---:|---:|');
  for (const s of SURF) console.log(`| ${s} | ${f2(Math.min(...sw.map((h) => c(h, B[s].night))))} | ${f2(Math.min(...sw.map((h) => c(h, B[s].day))))} |`);
  console.log(`| (brass top strip: brand vs ground) | ${f2(c(B.brand.night, B.ground.night))} | ${f2(c(B.brand.day, B.ground.day))} |`);
  console.log(`Swatch ΔE −12↔+12: ${dE(swatch(-12), swatch(12)).toFixed(4)}; neighbour 1°: ${dE(swatch(0), swatch(1)).toFixed(4)}; all in sRGB gamut: ${[...Array(25)].every((_, i) => inGamut(oklch2rgb(LL, CL, H0 + i - 12)))}`);
  console.log('\nTest vectors (body = Night card body; swatch = both themes):');
  console.log('| Token id | fnv1a32("satchel:"+id) | offset | hue | Night body | swatch |'); console.log('|---:|---:|---:|---:|---|---|');
  for (const id of ['1', '2', '3', '4', '5', '6', '7', '8', '42']) { const o = offsetOf(id); console.log(`| ${id} | ${fnv1a32(`satchel:${id}`)} | ${o > 0 ? '+' : ''}${o} | ${H0 + o} | \`${body(o)}\` | \`${swatch(o)}\` |`); }
  const counts = new Array(25).fill(0); for (let i = 1; i <= 100000; i++) counts[offsetOf(String(i)) + 12]++;
  console.log(`\nDistribution over ids 1–100,000: min ${Math.min(...counts)} · max ${Math.max(...counts)} per offset (ideal 4,000).`);
}

if (on('stitch')) {
  console.log('\n## stitch (decorative: "Owned by you" is also written in text)');
  console.log('| Where | Stitch colour | Composited | vs local background |'); console.log('|---|---|---|---:|');
  const n = mix(B.brand.night, 0.45, B.surface.night); console.log(`| Night, card body (brand surface) | brand @ 45 % | ${n} | ${f2(c(n, B.surface.night))} |`);
  const nb = mix(B.brand.night, 0.45, B.brand.night); console.log(`| Night, across the brass band (worst = brand) | brand @ 45 % | ${nb} | ${f2(c(nb, B.brand.night))} |`);
  const d = mix(B['brand-deep'].day, 0.6, B.surface.day); console.log(`| Day, card body (white) | brand-deep @ 60 % | ${d} | ${f2(c(d, B.surface.day))} |`);
  const db = mix(B['brand-deep'].day, 0.6, B['brand-bright'].day); console.log(`| Day, across the band (brand-bright end) | brand-deep @ 60 % | ${db} | ${f2(c(db, B['brand-bright'].day))} |`);
  const db2 = mix(B['brand-deep'].day, 0.6, B.brand.day); console.log(`| Day, across the band (brand) | brand-deep @ 60 % | ${db2} | ${f2(c(db2, B.brand.day))} |`);
  const nbr = mix(B['brand-bright'].night, 0.85, B['leather-dark'].night); console.log(`| (reference) logo: brand-bright @ 85 % on leather-dark | — | ${nbr} | ${f2(c(nbr, B['leather-dark'].night))} |`);
  const landing = mix(B.brand.night, 0.45, B.ground.night); console.log(`| (canvas landing frame, not adopted) Night ground | brand @ 45 % | ${landing} | ${f2(c(landing, B.ground.night))} |`);
}

if (on('misc')) {
  console.log('\n## misc');
  const SCRIM = { night: ['#000000', 0.6], day: ['#2B1D15', 0.4] }; // derived kb/81 R3 `scrim`
  for (const th of TH) {
    const dimmed = mix(SCRIM[th][0], SCRIM[th][1], B.ground[th]);
    console.log(`scrim (${th}) ${SCRIM[th][0]} @ ${SCRIM[th][1]} over ground → ${dimmed}; dialog (surface) vs dimmed page ${f2(c(B.surface[th], dimmed))}; + 1 px line border vs dimmed ${f2(c(B.line[th], dimmed))}; line-strong vs dimmed ${f2(c(B['line-strong'][th], dimmed))}`);
  }
  console.log(`QR modules on-brand ${B['on-brand'].night} on #FFFFFF: ${f2(c(B['on-brand'].night, '#FFFFFF'))} (R2 used #0A0B0D: ${f2(c('#0A0B0D', '#FFFFFF'))})`);
  console.log(`White QR plate vs Night surface ${f2(c('#FFFFFF', B.surface.night))}; vs Day surface ${f2(c('#FFFFFF', B.surface.day))} (Day plate needs its line border: line-strong vs white ${f2(c(B['line-strong'].day, '#FFFFFF'))})`);
  for (const th of TH) console.log(`theme-color (${th}) = ground ${B.ground[th]}; ink-muted on line? n/a; line (hairline) vs surface ${f2(c(B.line[th], B.surface[th]))} (decorative)`);
  console.log(`Avatar initial: ink on surface-raised — night ${f2(c(B.ink.night, B['surface-raised'].night))}, day ${f2(c(B.ink.day, B['surface-raised'].day))}; ring line-strong vs ground — night ${f2(c(B['line-strong'].night, B.ground.night))}, day ${f2(c(B['line-strong'].day, B.ground.day))}`);
  console.log(`Day card on Day ground: white surface vs ground ${f2(c(B.surface.day, B.ground.day))} (decorative; shadow-card Day separates it)`);
}

console.log('\n## result');
console.log(failures.length ? `${failures.length} check(s) below their threshold:\n- ` + failures.join('\n- ') : 'every checked pair meets its threshold');
