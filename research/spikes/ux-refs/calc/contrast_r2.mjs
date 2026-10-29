// THROWAWAY calculation script for kb/81 Revision 2 (Phase 0, 2026-10-21). Not product code; never import it.
// Imports the ux spike's helpers READ-ONLY (research/spikes/ux/color.mjs, card_seed.mjs). Nothing there is modified.
// Run: node research/spikes/ux-refs/calc/contrast_r2.mjs            (all sections)
//      node research/spikes/ux-refs/calc/contrast_r2.mjs glow        (one section: base|cta|hair|glow|banner|tag|frost|misc)
import { contrast, hex2rgb, rgb2hex, over, lum, rgb2oklch } from '../../ux/color.mjs';
import { seedCard } from '../../ux/card_seed.mjs';

const T = {
  '--bg': '#0A0B0D', '--surface-1': '#111317', '--surface-2': '#181B20', '--surface-3': '#20242A', '--surface-4': '#2A2F37',
  '--fg': '#F3F5F8', '--fg-2': '#B4BBC5', '--fg-muted': '#8F98A5', '--fg-disabled': '#5D6570', '--link': '#8CC8FF',
  '--success': '#4ADE9B', '--warning': '#F6C453', '--danger': '#FF7A7A', '--danger-solid': '#CF3B40', '--info': '#7DB8FF',
  '--state-frozen': '#9AD8FF', '--state-listed': '#E8C77A',
  '--chain-btc-fg': '#FFA94D', '--chain-eth-fg': '#9AABF5', '--chain-sol-fg': '#C09BFF',
  '--chain-btc': '#F7931A', '--chain-eth': '#627EEA', '--chain-sol': '#9945FF', '--chain-sol-2': '#14F195',
  '--ring': '#8CC8FF', '--line-input': '#69717D', '--line': '#3A4049', '--line-subtle': '#262A31',
  // R2 CTA (near-white pill with a <= 0.06 L "polish")
  '--cta': '#F1F4F7', '--cta-2': '#DCE2E8', '--cta-hover': '#F7F9FB', '--cta-hover-2': '#E6EAEF', '--cta-pressed': '#CFD6DE',
  '--on-cta': '#0A0B0D',
  // rev 1 brushed silver, for comparison only
  '--metal-hi': '#E9EDF2', '--metal-mid': '#C7CFD8', '--metal-lo': '#AEB8C4',
};
const S4 = ['--bg', '--surface-1', '--surface-2', '--surface-3'];
const S5 = [...S4, '--surface-4'];
const TEXT = ['--fg', '--fg-2', '--fg-muted', '--link', '--success', '--warning', '--danger', '--info', '--state-frozen', '--state-listed', '--chain-btc-fg', '--chain-eth-fg', '--chain-sol-fg'];
const f2 = (x) => x.toFixed(2);
const L = (hex) => rgb2oklch(hex2rgb(hex))[0].toFixed(3);
const mix = (fgHex, a, bgHex) => rgb2hex(over(hex2rgb(fgHex), a, hex2rgb(bgHex)));
const WHITE = [1, 1, 1];
const want = process.argv[2];
const on = (k) => !want || want === k;

if (on('base')) {
  console.log('\n## base: text tokens on every surface (WCAG 2.x)');
  console.log('| Foreground | ' + S5.join(' | ') + ' | Min (bg..s3) |');
  for (const k of TEXT) { const v = S5.map((s) => contrast(T[k], T[s])); console.log(`| ${k} ${T[k]} | ${v.map(f2).join(' | ')} | ${f2(Math.min(...v.slice(0, 4)))} |`); }
  for (const k of ['--chain-btc', '--chain-eth', '--chain-sol', '--chain-sol-2', '--ring', '--line-input']) {
    const v = S4.map((s) => contrast(T[k], T[s])); console.log(`| ${k} (non-text) | ${v.map(f2).join(' | ')} | ${f2(Math.min(...v))} |`);
  }
}

if (on('cta')) {
  console.log('\n## cta: near-white pill (R2) vs brushed silver (rev 1); text = --on-cta #0A0B0D');
  for (const k of ['--cta', '--cta-2', '--cta-hover', '--cta-hover-2', '--cta-pressed', '--metal-hi', '--metal-mid', '--metal-lo']) {
    console.log(`${k} ${T[k]}  OKLCH L ${L(T[k])}  on-cta ${f2(contrast(T['--on-cta'], T[k]))}`);
  }
  console.log(`L span R2 rest ${L(T['--cta'])} -> ${L(T['--cta-2'])}  (rev 1 ${L(T['--metal-hi'])} -> ${L(T['--metal-lo'])})`);
  console.log(`pill vs --bg (non-text edge): rest-bottom ${f2(contrast(T['--cta-2'], T['--bg']))}, pressed ${f2(contrast(T['--cta-pressed'], T['--bg']))}`);
  console.log(`ring #8CC8FF vs cta ${f2(contrast(T['--ring'], T['--cta']))} (fails 3:1 => ring-offset 2px in --bg), ring vs bg ${f2(contrast(T['--ring'], T['--bg']))}`);
  console.log(`secondary pill: --fg on --surface-3 ${f2(contrast(T['--fg'], T['--surface-3']))}, hover --fg on --surface-4 ${f2(contrast(T['--fg'], T['--surface-4']))}`);
  for (const s of ['--surface-1', '--surface-2']) { const t = mix(T['--danger'], 0.14, T[s]); console.log(`destructive: --danger on 14% danger over ${s} (${t}) ${f2(contrast(T['--danger'], t))}`); }
  console.log(`--danger-solid with white ${f2(contrast('#FFFFFF', T['--danger-solid']))}`);
  console.log(`disabled (exempt): --fg-disabled on --surface-3 ${f2(contrast(T['--fg-disabled'], T['--surface-3']))}`);
}

if (on('hair')) {
  console.log('\n## hair: white hairline at alpha a, composited on the surface; ratio vs that surface (decorative)');
  console.log('| alpha | ' + S5.join(' | ') + ' | range |');
  for (const a of [0.06, 0.08, 0.10, 0.12]) {
    const v = S5.map((s) => { const comp = rgb2hex(over(WHITE, a, hex2rgb(T[s]))); return contrast(comp, T[s]); });
    console.log(`| ${a} | ${v.map(f2).join(' | ')} | ${f2(Math.min(...v))}-${f2(Math.max(...v))} |`);
  }
  for (const a of [0.08, 0.12]) console.log(`hairline ${a} composite hex: ` + S5.map((s) => `${s} ${rgb2hex(over(WHITE, a, hex2rgb(T[s])))}`).join(' · '));
  console.log('rev 1 --line vs ' + S4.map((s) => `${s} ${f2(contrast(T['--line'], T[s]))}`).join(' · '));
  console.log('rev 1 --line-subtle vs ' + S4.map((s) => `${s} ${f2(contrast(T['--line-subtle'], T[s]))}`).join(' · '));
}

if (on('glow')) {
  console.log('\n## glow: seeded accent at alpha a over --bg, worst case over token ids 1..100000');
  const N = 100000; const accents = []; let minAccBg = 99, minAccS1 = 99, minAccS2 = 99;
  for (let i = 1; i <= N; i++) { const a = seedCard(String(i)).accent; accents.push(a); minAccBg = Math.min(minAccBg, contrast(a, T['--bg'])); minAccS1 = Math.min(minAccS1, contrast(a, T['--surface-1'])); minAccS2 = Math.min(minAccS2, contrast(a, T['--surface-2'])); }
  const uniq = [...new Set(accents)];
  console.log(`distinct accents: ${uniq.length}; accent as text/indicator: min on bg ${f2(minAccBg)}, s1 ${f2(minAccS1)}, s2 ${f2(minAccS2)}`);
  for (const a of [0.10, 0.12, 0.14, 0.18, 0.24]) {
    const worst = {}; let brightest = { l: -1 };
    for (const acc of uniq) {
      const comp = mix(acc, a, T['--bg']); const l = lum(hex2rgb(comp)); if (l > brightest.l) brightest = { l, hex: comp, acc };
      for (const k of TEXT) { const c = contrast(T[k], comp); if (!(k in worst) || c < worst[k]) worst[k] = c; }
    }
    console.log(`alpha ${a}: brightest glow pixel ${brightest.hex} (accent ${brightest.acc}) | ` + TEXT.map((k) => `${k} ${f2(worst[k])}`).join(' · '));
  }
}

if (on('banner')) {
  console.log('\n## banner: status colour at 8% over the host surface; text-to-fill ratios; border = status at 32% vs surface (decorative)');
  const ST = { success: T['--success'], warning: T['--warning'], danger: T['--danger'], info: T['--info'], neutral: T['--fg-2'], frozen: T['--state-frozen'] };
  console.log('| surface | status | fill | --fg | --fg-2 | --fg-muted | --link | status text | border 32% vs surface |');
  for (const s of ['--bg', '--surface-1', '--surface-2']) {
    for (const [name, hex] of Object.entries(ST)) {
      const fill = mix(hex, 0.08, T[s]); const border = mix(hex, 0.32, T[s]);
      console.log(`| ${s} | ${name} | ${fill} | ${f2(contrast(T['--fg'], fill))} | ${f2(contrast(T['--fg-2'], fill))} | ${f2(contrast(T['--fg-muted'], fill))} | ${f2(contrast(T['--link'], fill))} | ${f2(contrast(hex, fill))} | ${f2(contrast(border, T[s]))} |`);
    }
  }
  console.log('(10% comparison, --fg-muted on --surface-2):', Object.entries(ST).map(([n, h]) => `${n} ${f2(contrast(T['--fg-muted'], mix(h, 0.10, T['--surface-2'])))}`).join(' · '));
}

if (on('tag')) {
  console.log('\n## tag: text = tint colour on a 14% fill of that colour over the host surface');
  const K = ['--success', '--warning', '--danger', '--info', '--fg-2', '--state-frozen', '--state-listed', '--chain-btc-fg', '--chain-eth-fg', '--chain-sol-fg'];
  console.log('| text | ' + S4.join(' | ') + ' | min |');
  for (const k of K) { const v = S4.map((s) => contrast(T[k], mix(T[k], 0.14, T[s]))); console.log(`| ${k} | ${v.map(f2).join(' | ')} | ${f2(Math.min(...v))} |`); }
}

if (on('frost')) {
  console.log('\n## frost: card worst pixel with/without the modelled frost layer (ids 1..100000), then glass 0.72 / scrim 0.48');
  // frost model (visual-language §2.4): each stop mixed 30% toward an equal-luminance grey, then the existing 16% specular,
  // then a 6% white crystalline texture on top. Brightest composited pixel is the worst case for text on glass/scrim.
  const lin2g = (y) => (y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055);
  const greyOf = (rgb) => { const g = lin2g(lum(rgb)); return [g, g, g]; };
  const models = {
    'rev1 (no frost)': (rgb) => over(WHITE, 0.16, rgb),
    'R2 frost (30% grey + 16% spec + 6% texture)': (rgb) => over(WHITE, 0.06, over(WHITE, 0.16, over(greyOf(rgb), 0.30, rgb))),
    'sold (100% grey + 16% spec)': (rgb) => over(WHITE, 0.16, greyOf(rgb)),
  };
  const GLASS = hex2rgb('#08090B');
  const CARD_TEXT = ['--fg', '--fg-2', '--chain-btc-fg', '--chain-eth-fg', '--chain-sol-fg', '--success', '--warning', '--info', '--state-frozen', '--state-listed', '--danger'];
  for (const [name, fn] of Object.entries(models)) {
    let worst = { l: -1 };
    for (let i = 1; i <= 100000; i++) { const s = seedCard(String(i)); for (const st of s.stops) { const p = fn(hex2rgb(st.hex)); const l = lum(p); if (l > worst.l) worst = { l, id: i, alloy: s.alloy, hex: rgb2hex(p) }; } }
    const glass = rgb2hex(over(GLASS, 0.72, hex2rgb(worst.hex))); const scrim = rgb2hex(over(GLASS, 0.48, hex2rgb(worst.hex)));
    console.log(`${name}: worst ${worst.hex} (id ${worst.id}, ${worst.alloy}, Y ${worst.l.toFixed(3)}); raw --fg ${f2(contrast(T['--fg'], worst.hex))}`);
    console.log(`   glass ${glass}: ` + CARD_TEXT.map((k) => `${k} ${f2(contrast(T[k], glass))}`).join(' · '));
    console.log(`   scrim ${scrim}: --fg ${f2(contrast(T['--fg'], scrim))} · --fg-2 ${f2(contrast(T['--fg-2'], scrim))}`);
  }
}

if (on('misc')) {
  console.log('\n## misc');
  console.log(`QR dark module #0A0B0D on plate #FFFFFF: ${f2(contrast('#0A0B0D', '#FFFFFF'))}`);
  console.log(`label (--fg-muted 12px) min on bg..s3: ${f2(Math.min(...S4.map((s) => contrast(T['--fg-muted'], T[s]))))}; on s4 ${f2(contrast(T['--fg-muted'], T['--surface-4']))}`);
  console.log(`grouped address: ends --fg min ${f2(Math.min(...S4.map((s) => contrast(T['--fg'], T[s]))))}, middle --fg-2 min ${f2(Math.min(...S4.map((s) => contrast(T['--fg-2'], T[s]))))}`);
  console.log(`ticker --fg-2 min on bg..s3 ${f2(Math.min(...S4.map((s) => contrast(T['--fg-2'], T[s]))))}`);
  console.log(`failed amount --fg-muted + line-through min ${f2(Math.min(...S4.map((s) => contrast(T['--fg-muted'], T[s]))))}`);
  console.log(`info ring glyph (non-text) min on bg..s3 ${f2(Math.min(...S4.map((s) => contrast(T['--info'], T[s]))))}`);
  console.log(`MetaChip outline = hairline-strong (decorative); MetaChip text --fg-2 on bg ${f2(contrast(T['--fg-2'], T['--bg']))}`);
}
