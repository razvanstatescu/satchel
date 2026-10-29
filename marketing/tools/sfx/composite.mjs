// Composite sources built from generated grains (no extra API calls), written to tools/sfx/_raw/*.comp.wav.
//   stitch-single.comp.wav : one puncture = body grain (stitch-run v1 @0.172 s) + crisp grain (stitch-single v2), layered
//   stitch-run.comp.wav    : six of those punctures, ~165 ms apart, with small pitch/gain/timing variation (seeded)
//   heartbeat-tension.comp.wav : the v2 lub-dub (0-1.0 s) twice, 1.0 s apart (60 bpm)
//   approve-chime.comp.wav : the v1 note (C5, ~523 Hz), then the same note a fifth up (x1.5, ~785 Hz) 130 ms later
//   count-up.comp.wav      : counter-roll's ticks (0-0.80 s) under a rising varispeed 0.72x -> 1.0x, so count-up and
//                            counter-roll share one tick sound; pitch and tick rate rise ~5.7 semitones
// Why: both stitch-run generations came back as 1-2 hits, not a rhythmic run; heartbeat v2 has only one beat in 2 s;
// both approve-chime generations were a single sustained note (C5, then C6), not a two-note chime.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = resolve(dirname(fileURLToPath(import.meta.url)), './_raw');
const SR = 44100;
const decode = (f) => { // stereo -> [L, R]
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
};
const peak = (ch) => ch.reduce((m, c) => c.reduce((a, v) => Math.max(a, Math.abs(v)), m), 0);
// grain: find onset (peak-30 dB) inside [a,b], cut from onset-3 ms for lenSec, fade out the last fadeSec, normalize to peak 1
function grain(src, a, b, lenSec, fadeSec) {
  const s = Math.round(a * SR), e = Math.round(b * SR), w = src.map((c) => c.slice(s, e)), pk = peak(w);
  let on = 0; while (on < w[0].length && Math.max(Math.abs(w[0][on]), Math.abs(w[1][on])) < pk * 0.0316) on++;
  const st = s + Math.max(0, on - Math.round(0.003 * SR)), n = Math.round(lenSec * SR), f = Math.round(fadeSec * SR);
  const g = src.map((c) => c.slice(st, st + n));
  for (const c of g) { for (let i = 0; i < c.length; i++) { c[i] /= pk; if (i >= c.length - f) c[i] *= (c.length - i) / f; } }
  return g;
}
const resample = (ch, rate) => ch.map((c) => { // rate > 1 = higher pitch, shorter
  const n = Math.floor(c.length / rate), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i * rate, k = Math.floor(p), t = p - k; o[i] = c[k] * (1 - t) + (c[k + 1] ?? 0) * t; }
  return o;
});
const mixInto = (dst, src, at, gain) => { for (let k = 0; k < 2; k++) for (let i = 0; i < src[k].length && at + i < dst[k].length; i++) dst[k][at + i] += src[k][i] * gain; };
const blank = (sec) => [new Float32Array(Math.round(sec * SR)), new Float32Array(Math.round(sec * SR))];

// --- stitch puncture: body + crisp layer, aligned on onsets
const body = grain(decode('stitch-run.mp3'), 0.12, 0.40, 0.14, 0.06);
const crisp = grain(decode('stitch-single.v2.mp3'), 0.0, 0.25, 0.14, 0.06);
const punct = blank(0.15);
mixInto(punct, body, 0, 1.0);
mixInto(punct, crisp, 0, 0.5);
const pn = peak(punct); for (const c of punct) for (let i = 0; i < c.length; i++) c[i] /= pn;
writeWav(punct, 'stitch-single.comp.wav');

// --- stitch run: 6 punctures, ~165 ms apart, deterministic humanization
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const run = blank(1.05);
for (let k = 0; k < 6; k++) {
  const at = Math.round((0.0 + k * 0.165 + rnd() * 0.008) * SR);
  const p = resample(punct, 1 + rnd() * 0.035);
  mixInto(run, p, Math.max(0, at), 10 ** ((rnd() * 1.5 - (k === 5 ? 0 : 0.5)) / 20));
}
writeWav(run, 'stitch-run.comp.wav');

// --- heartbeat: the v2 lub-dub twice at 60 bpm
const hb = decode('heartbeat-tension.v2.mp3').map((c) => c.slice(0, Math.round(1.0 * SR)));
for (const c of hb) for (let i = c.length - Math.round(0.1 * SR); i < c.length; i++) c[i] *= (c.length - i) / (0.1 * SR);
const beat = blank(2.0);
mixInto(beat, hb, 0, 1.0);
mixInto(beat, hb, Math.round(1.0 * SR), 10 ** (-1.5 / 20));
writeWav(beat, 'heartbeat-tension.comp.wav');
// --- approve chime: v1 note, then the same note a fifth up, 130 ms later (the ElevenLabs end-of-file click is cut off)
const note = decode('approve-chime.mp3').map((c) => c.slice(0, Math.round(0.64 * SR)));
for (const c of note) for (let i = c.length - Math.round(0.04 * SR); i < c.length; i++) c[i] *= (c.length - i) / (0.04 * SR);
const chime = blank(0.72);
mixInto(chime, note, 0, 10 ** (-1.5 / 20));
mixInto(chime, resample(note, 1.5), Math.round(0.13 * SR), 1.0);
writeWav(chime, 'approve-chime.comp.wav');
// --- count-up: varispeed read of counter-roll; rate r(t) rises linearly r0 -> r1, read position p = integral of r
const roll = decode('counter-roll.mp3').map((c) => c.slice(0, Math.round(0.80 * SR)));
const r0 = 0.72, r1 = 1.0, T = Math.floor(roll[0].length / ((r0 + r1) / 2));
const up = blank(T / SR);
for (let i = 0; i < T; i++) {
  const u = i / T, p = T * (r0 * u + ((r1 - r0) * u * u) / 2), k = Math.floor(p), t = p - k;
  for (let c = 0; c < 2; c++) up[c][i] = (roll[c][k] ?? 0) * (1 - t) + (roll[c][k + 1] ?? 0) * t;
}
writeWav(up, 'count-up.comp.wav');
console.log('wrote stitch-single, stitch-run, heartbeat-tension, approve-chime, count-up (.comp.wav)');
