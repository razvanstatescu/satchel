import { contrast, hex2rgb, rgb2hex, over, rgb2oklch } from './color.mjs';
// Proposed Satchel dark-metallic palette (v0, to iterate)
export const T = {
  bg: '#0A0B0D', surface1: '#111317', surface2: '#181B20', surface3: '#20242A', surface4: '#2A2F37',
  borderSubtle: '#262A31', border: '#3A4049', inputBorder: '#69717D',
  fg: '#F3F5F8', fg2: '#B4BBC5', fgMuted: '#8F98A5', fgDisabled: '#5D6570',
  metalHi: '#E9EDF2', metalLo: '#AEB8C4', onMetal: '#0A0B0D',
  ring: '#8CC8FF', link: '#8CC8FF',
  success: '#4ADE9B', warning: '#F6C453', danger: '#FF7A7A', info: '#7DB8FF',
  frozen: '#9AD8FF', listed: '#E8C77A',
  btc: '#F7931A', btcFg: '#FFA94D', eth: '#627EEA', ethFg: '#9AABF5', sol: '#9945FF', solFg: '#C09BFF', solGreen: '#14F195',
  dangerSolid: '#E5484D', onDangerSolid: '#FFFFFF',
};
const surfaces = ['bg','surface1','surface2','surface3'];
const rows = [];
const add = (fgName, bgName, fgHex, bgHex, need, note='') => { const r = contrast(fgHex, bgHex); rows.push({fg: fgName, bg: bgName, ratio: +r.toFixed(2), need, pass: r >= need, note}); };
for (const s of surfaces) {
  for (const t of ['fg','fg2','fgMuted']) add(t, s, T[t], T[s], 4.5);
  for (const t of ['link','success','warning','danger','info','frozen','listed','btcFg','ethFg','solFg']) add(t, s, T[t], T[s], 4.5);
  for (const t of ['btc','eth','sol','solGreen']) add(t+' (brand, non-text)', s, T[t], T[s], 3);
  add('ring (focus, non-text)', s, T.ring, T[s], 3);
  add('inputBorder (non-text)', s, T.inputBorder, T[s], 3);
  add('border (decorative)', s, T.border, T[s], 1, 'decorative only');
}
add('onMetal', 'metalHi', T.onMetal, T.metalHi, 4.5); add('onMetal', 'metalLo', T.onMetal, T.metalLo, 4.5);
add('metalLo (button edge, non-text)', 'bg', T.metalLo, T.bg, 3);
add('onDangerSolid', 'dangerSolid', T.onDangerSolid, T.dangerSolid, 4.5);
// tinted pill/chip backgrounds: colour at 14% over surface1 and surface2; text = full colour
for (const s of ['surface1','surface2']) for (const t of ['success','warning','danger','info','frozen','listed','btcFg','ethFg','solFg','fg2']) {
  const pill = over(hex2rgb(T[t]), 0.14, hex2rgb(T[s]));
  add(t, `${t}@14% on ${s} (${rgb2hex(pill)})`, T[t], rgb2hex(pill), 4.5);
}
console.table(rows.map(r => ({...r, pass: r.pass ? 'PASS' : 'FAIL'})));
const fails = rows.filter(r=>!r.pass); console.log('FAILS:', fails.length);
for (const k of Object.keys(T)) { const [L,C,H] = rgb2oklch(hex2rgb(T[k])); console.log(k.padEnd(14), T[k], `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`); }
