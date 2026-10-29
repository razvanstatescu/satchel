// Satchel 2.0 composites, built only from generated takes in _raw/ (no API calls). Writes _raw/<name>.comp.wav.
//   node tools/sfx2/composite.mjs
// Why each exists (measured, see qa notes in choice.json): the model returns one note or one hit where the brief asks
// for a figure, or puts the energy below ~150 Hz where laptop and phone speakers cannot play it.
//   success-marimba : src-marimba-note (one note, f0 ~298 Hz) as a G4-C5-E5 rising flourish, 90 ms apart
//   error-boop      : error-boop v2 (one soft ~237 Hz boop) as "uh-oh": a minor third above, then the original
//   sneaky-pizz     : sneaky-pizz v2 (one pluck, f0 ~390 Hz) as a tiptoe motif: 0, +1, +2 semitones, then -5
//   magic-wand      : magic-wand v1 (sparkles, pitch falling) under a rising varispeed 0.7x -> 1.3x with a 200 ms swell
//   drum-hit-soft   : drum-hit-soft v2 (felt tom, ~151 Hz body, no attack) + button-thock attack at -9 dB + light saturation
//   boing-soft      : boing-soft v2 (one round bounce at ~108 Hz) raised x2.5 (~270 Hz) with a quick downward bend and wobble
//   button-thock-deep: button-thock v1 at 0.72x (about -5.7 semitones): the same key, deeper
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = resolve(dirname(fileURLToPath(import.meta.url)), '_raw');
const SR = 44100;
const decode = (f) => {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', resolve(RAW, f), '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-']);
  const x = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), n = x.length / 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
  return [L, R];
};
const writeWav = (ch, f) => {
  const n = ch[0].length, x = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { x[2 * i] = ch[0][i]; x[2 * i + 1] = ch[1][i]; }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', resolve(RAW, f)],
    { input: Buffer.from(x.buffer) });
  console.log('wrote', f, (n / SR).toFixed(3) + 's');
};
const peak = (ch) => ch.reduce((m, c) => c.reduce((a, v) => Math.max(a, Math.abs(v)), m), 0);
const norm = (ch) => { const p = peak(ch) || 1; return ch.map((c) => c.map((v) => v / p)); };
const sec = (ch, a, b) => ch.map((c) => c.slice(Math.round(a * SR), b == null ? undefined : Math.round(b * SR)));
const blank = (s) => [new Float32Array(Math.round(s * SR)), new Float32Array(Math.round(s * SR))];
const fadeOut = (ch, s) => { const f = Math.round(s * SR); for (const c of ch) for (let i = 0; i < Math.min(f, c.length); i++) c[c.length - 1 - i] *= i / f; return ch; };
const fadeIn = (ch, s) => { const f = Math.round(s * SR); for (const c of ch) for (let i = 0; i < Math.min(f, c.length); i++) c[i] *= i / f; return ch; };
const mixInto = (dst, src, atSec, gain = 1) => { const at = Math.round(atSec * SR); for (let k = 0; k < 2; k++) for (let i = 0; i < src[k].length && at + i < dst[k].length; i++) dst[k][at + i] += src[k][i] * gain; };
const onset = (ch, relDb = -20) => { const thr = peak(ch) * 10 ** (relDb / 20); for (let i = 0; i < ch[0].length; i++) if (Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i])) > thr) return i; return 0; };
const fromOnset = (ch, relDb = -20, preSec = 0.002) => ch.map((c) => c.slice(Math.max(0, onset(ch, relDb) - Math.round(preSec * SR))));
// variable-rate read: rate(tSec) = playback speed at output time t (>1 = higher and faster); linear interpolation
function varispeed(ch, rate, maxSec = 10) {
  const out = [[], []]; let p = 0, i = 0;
  while (p < ch[0].length - 1 && i < maxSec * SR) {
    const k = Math.floor(p), t = p - k;
    for (let c = 0; c < 2; c++) out[c].push(ch[c][k] * (1 - t) + ch[c][k + 1] * t);
    p += rate(i / SR); i++;
  }
  return out.map((a) => Float32Array.from(a));
}
const at = (r) => () => r; // constant rate
const ST = (n) => 2 ** (n / 12);

// success-marimba: G4 C5 E5 from a ~298 Hz marimba note
{
  const note = norm(fromOnset(decode('src-marimba-note.mp3'), -30));
  const f0 = 298, out = blank(0.95);
  [[392.0, 0.0, 0.72], [523.25, 0.09, 0.82], [659.25, 0.18, 1.0]].forEach(([hz, t, g]) =>
    mixInto(out, fadeOut(varispeed(note, at(hz / f0), 0.75), 0.05), t, g));
  writeWav(out, 'success-marimba.comp.wav');
}
// error-boop: "uh" a minor third up (short), then "oh" at the original pitch
{
  const boop = norm(fromOnset(decode('error-boop.v2.mp3'), -30));
  const out = blank(0.42);
  mixInto(out, fadeOut(varispeed(sec(boop, 0, 0.14), at(ST(3))), 0.025), 0, 0.85);
  mixInto(out, fadeOut(sec(boop, 0, 0.26), 0.11), 0.145, 1.0);
  writeWav(out, 'error-boop.comp.wav');
}
// sneaky-pizz: tiptoe up a semitone at a time, then a low plunk a fourth below
{
  const pluck = norm(fromOnset(decode('sneaky-pizz.v2.mp3'), -30));
  const out = blank(1.25);
  [[0, 0.0, 0.26, 0.8], [1, 0.28, 0.26, 0.8], [2, 0.56, 0.26, 0.86], [-5, 0.7, 0.38, 1.0]].forEach(([st, t, len, g]) =>
    mixInto(out, fadeOut(varispeed(sec(pluck, 0, len), at(ST(st))), len > 0.3 ? 0.15 : 0.06), t, g));
  writeWav(out, 'sneaky-pizz.comp.wav');
}
// magic-wand: sparkles with rising pitch (0.7x -> 1.3x over the clip) and a 200 ms swell
{
  const src = decode('magic-wand.mp3'), n = src[0].length / SR, r0 = 0.7, r1 = 1.3;
  const T = n / ((r0 + r1) / 2); // output length so the whole source is read
  writeWav(fadeIn(varispeed(src, (t) => r0 + (r1 - r0) * Math.min(1, t / T)), 0.2), 'magic-wand.comp.wav');
}
// drum-hit-soft: felt tom body + soft knock for definition, light saturation for audible harmonics
{
  const tom = norm(fromOnset(decode('drum-hit-soft.v2.mp3'), -30));
  const knock = norm(fromOnset(decode('button-thock.mp3'), -20));
  const out = blank(0.45);
  mixInto(out, tom, 0, 1.0);
  mixInto(out, fadeOut(sec(knock, 0, 0.06), 0.03), 0, 0.35);
  const d = 2.2, td = Math.tanh(d);
  for (const c of out) for (let i = 0; i < c.length; i++) c[i] = 0.65 * c[i] + 0.35 * Math.tanh(d * c[i]) / td;
  writeWav(fadeOut(out, 0.08), 'drum-hit-soft.comp.wav');
}
// boing-soft: raise the round bounce into the audible mid range, quick downward bend + decaying wobble
{
  const b = norm(fromOnset(decode('boing-soft.v2.mp3'), -30));
  const rate = (t) => 2.5 * (1 + 0.18 * Math.exp(-t / 0.035)) * (1 + 0.025 * Math.sin(2 * Math.PI * 11 * t) * Math.exp(-t / 0.15));
  writeWav(fadeOut(varispeed(b, rate, 0.4), 0.06), 'boing-soft.comp.wav');
}
// button-thock-deep: the same key, deeper
{
  writeWav(varispeed(decode('button-thock.mp3'), at(0.72)), 'button-thock-deep.comp.wav');
}
