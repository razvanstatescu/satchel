// Intro (v5 cold open) composites, built only from generated takes (no API calls). Writes _raw/intro/<name>.comp.wav.
//   node tools/sfx2/composite-intro.mjs
// Both takes of each of these missed the brief in the same way (one event where the prompt asks for a pattern, or a
// pitch/level shape the opposite way), so the pattern is built from the generated material:
//   glitch-stutter : one blip from take 1, repeated 10 times with gaps shrinking 70 -> 18 ms (speeds up into a buzz)
//   zoom-punch     : take 1 (43-65 Hz thud, no click) raised an octave (tighter, ~90-130 Hz) + the first 45 ms of take 2
//                    (bright click) + saturation, so the thud also reads on small speakers
//   notif-ping-1   : take 1 (one glassy ping, ~754 Hz) as two notes, the second a fourth up, 75 ms later
//   notif-ping-2   : the library's single marimba note (src-marimba-note, ~298 Hz) as a quick falling E6-C6 tick-tock
//                    (ping 1 rises a fourth, so the two read as different alerts)
//   phone-buzz     : take 1 (one continuous buzz) cut into two 0.2 s buzzes with a 0.12 s gap
//   keyboard-burst : both takes layered 30 ms apart (each ~10-12 keystrokes/s; together ~20/s)
//   notif-swarm    : ~30 pings, chimes and buzzes from this set's takes, ever denser (3 -> 24 per second) and louder
//                    (-14 -> 0 dB) over 3 s, each detuned and panned
//   sub-drone      : take 2 (C2 drone, rich harmonics) extended with a phase-aligned loop, then varispeed so the pitch
//                    rises exactly 2 semitones over 8 s; the hard stop is made in process.mjs
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(here, '_raw/intro'), LIB_RAW = resolve(here, '_raw');
const SR = 44100;
const decode = (f, dir = RAW) => {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', resolve(dir, f), '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), n = x.length / 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
  return [L, R];
};
const writeWav = (ch, f) => {
  const n = ch[0].length, x = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { x[2 * i] = ch[0][i]; x[2 * i + 1] = ch[1][i]; }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', resolve(RAW, f)], { input: Buffer.from(x.buffer) });
  console.log('wrote', f, (n / SR).toFixed(3) + 's');
};
const peak = (ch) => ch.reduce((m, c) => c.reduce((a, v) => Math.max(a, Math.abs(v)), m), 0);
const norm = (ch) => { const p = peak(ch) || 1; return ch.map((c) => c.map((v) => v / p)); };
const sec = (ch, a, b) => ch.map((c) => c.slice(Math.round(a * SR), b == null ? undefined : Math.round(b * SR)));
const blank = (s) => [new Float32Array(Math.round(s * SR)), new Float32Array(Math.round(s * SR))];
const fadeOut = (ch, s) => { const f = Math.round(s * SR); for (const c of ch) for (let i = 0; i < Math.min(f, c.length); i++) c[c.length - 1 - i] *= i / f; return ch; };
const fadeIn = (ch, s) => { const f = Math.round(s * SR); for (const c of ch) for (let i = 0; i < Math.min(f, c.length); i++) c[i] *= i / f; return ch; };
const mixInto = (dst, src, atSec, gain = 1, pan = 0) => { // pan -1..1, equal power
  const at = Math.round(atSec * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < src[0].length && at + i < dst[0].length; i++) { if (at + i < 0) continue; dst[0][at + i] += src[0][i] * gl; dst[1][at + i] += src[1][i] * gr; }
};
const onset = (ch, relDb = -20) => { const thr = peak(ch) * 10 ** (relDb / 20); for (let i = 0; i < ch[0].length; i++) if (Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i])) > thr) return i; return 0; };
const fromOnset = (ch, relDb = -20, preSec = 0.002) => ch.map((c) => c.slice(Math.max(0, onset(ch, relDb) - Math.round(preSec * SR))));
function varispeed(ch, rate, maxSec = 20) { // rate(tSec) = playback speed at output time t; linear interpolation
  const out = [[], []]; let p = 0, i = 0;
  while (p < ch[0].length - 1 && i < maxSec * SR) {
    const k = Math.floor(p), t = p - k;
    for (let c = 0; c < 2; c++) out[c].push(ch[c][k] * (1 - t) + ch[c][k + 1] * t);
    p += rate(i / SR); i++;
  }
  return out.map((a) => Float32Array.from(a));
}
const at = (r) => () => r;
const ST = (n) => 2 ** (n / 12);
let seed = 20261111; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // deterministic

// glitch-stutter: blips from take 1, gaps shrinking geometrically 70 -> 18 ms
{
  const src = norm(decode('glitch-stutter.mp3'));
  const blips = [0, 1, 2].map((k) => { // the first three blips of the take, each cut from its onset
    const env = []; const w = Math.round(0.005 * SR);
    for (let a = 0; a + w <= src[0].length; a += w) { let p = 0; for (let i = a; i < a + w; i++) p = Math.max(p, Math.abs(src[0][i]), Math.abs(src[1][i])); env.push(p); }
    const starts = []; for (let j = 1; j < env.length; j++) if (env[j] > 0.3 && env[j - 1] < 0.15) starts.push(j * w);
    const st = Math.max(0, (starts[k] ?? starts[0] ?? 0) - Math.round(0.002 * SR));
    return fadeOut(fadeIn(src.map((c) => c.slice(st, st + Math.round(0.035 * SR))), 0.002), 0.006);
  });
  const out = blank(0.5); let t = 0;
  for (let k = 0; k < 11; k++) {
    const gap = 0.07 * (0.018 / 0.07) ** (k / 9), len = Math.min(0.035, gap);
    const g = fadeOut(blips[k % 3].map((c) => c.slice(0, Math.round(len * SR))), Math.min(0.006, len / 3));
    mixInto(out, g, t, 0.9 + 0.1 * rnd());
    t += gap;
  }
  writeWav(out, 'glitch-stutter.comp.wav');
}
// zoom-punch: thud (take 1) + bright click (take 2's first 45 ms) + light saturation
{
  const thud = norm(varispeed(norm(fromOnset(decode('zoom-punch.mp3'), -30)), at(2)));
  const click = norm(fromOnset(decode('zoom-punch.v2.mp3'), -30));
  const out = blank(0.4);
  mixInto(out, thud, 0, 1.0);
  const d = 3.5, td = Math.tanh(d); // saturate the thud alone (harmonics), then add the clean click on top
  for (const c of out) for (let i = 0; i < c.length; i++) c[i] = 0.5 * c[i] + (0.5 * Math.tanh(d * c[i])) / td;
  mixInto(out, fadeOut(sec(click, 0, 0.045), 0.02), 0, 0.5);
  writeWav(fadeOut(out, 0.05), 'zoom-punch.comp.wav');
}
// notif-ping-1: glassy ping, then the same ping a perfect fourth up
{
  const ping = norm(fromOnset(decode('notif-ping-1.mp3'), -30));
  const out = blank(0.42);
  mixInto(out, fadeOut(sec(ping, 0, 0.3), 0.08), 0, 0.8);
  mixInto(out, fadeOut(varispeed(sec(ping, 0, 0.36), at(ST(5))), 0.08), 0.075, 1.0);
  writeWav(out, 'notif-ping-1.comp.wav');
}
// notif-ping-2: marimba tick-tock, G5 then C6, from the library's single marimba note (f0 ~298 Hz)
{
  const note = norm(fromOnset(decode('src-marimba-note.mp3', LIB_RAW), -30)), f0 = 298;
  const out = blank(0.36);
  mixInto(out, fadeOut(varispeed(note, at(1318.5 / f0), 0.3), 0.05), 0, 1.0);
  mixInto(out, fadeOut(varispeed(note, at(1046.5 / f0), 0.3), 0.05), 0.07, 0.9);
  writeWav(out, 'notif-ping-2.comp.wav');
}
// phone-buzz: two 0.2 s buzzes from take 1 with a 0.12 s gap
{
  const buzz = norm(decode('phone-buzz.mp3'));
  const out = blank(0.54);
  mixInto(out, fadeOut(fadeIn(sec(buzz, 0.03, 0.23), 0.008), 0.015), 0, 1.0);
  mixInto(out, fadeOut(fadeIn(sec(buzz, 0.25, 0.45), 0.008), 0.015), 0.32, 1.0);
  writeWav(out, 'phone-buzz.comp.wav');
}
// keyboard-burst: both takes layered (two typists)
{
  const a = norm(fromOnset(decode('keyboard-burst.mp3'), -30)), b = norm(fromOnset(decode('keyboard-burst.v2.mp3'), -30));
  const out = blank(1.05);
  mixInto(out, a, 0, 1.0, -0.15);
  mixInto(out, b, 0.03, 0.75, 0.15);
  writeWav(fadeOut(out, 0.03), 'keyboard-burst.comp.wav');
}
// notif-swarm: ever denser, louder pile of alerts over 3 s
{
  const pool = [
    { ch: norm(fromOnset(decode('notif-ping-1.mp3'), -30)), g: 1.0 }, // glassy ping ~754 Hz
    { ch: norm(fromOnset(decode('notif-ping-1.v2.mp3'), -30)), g: 0.8 }, // bright ping ~2.8 kHz
    { ch: norm(fromOnset(decode('notif-ping-3.mp3'), -30)), g: 1.0 }, // chat pop
    { ch: norm(fromOnset(decode('notif-swarm.mp3'), -30)).map((c) => c.slice(0, Math.round(0.3 * SR))), g: 0.9 }, // chime
    { ch: norm(fromOnset(decode('notif-swarm.v2.mp3'), -30)).map((c) => c.slice(0, Math.round(0.3 * SR))), g: 0.8 }, // chime
    { ch: norm(decode('phone-buzz.mp3')).map((c) => c.slice(Math.round(0.03 * SR), Math.round(0.2 * SR))), g: 0.6 }, // buzz
    { ch: norm(fromOnset(decode('src-marimba-note.mp3', LIB_RAW), -30)), g: 0.8, rate: 784 / 298 }, // marimba tick
  ];
  const detune = [0.84, 0.89, 0.94, 1, 1, 1.06, 1.12, 1.19, 1.26, 1.33];
  const T = 3.0, out = blank(T + 0.4);
  let t = 0, n = 0;
  while (t < T) {
    const e = pool[Math.floor(rnd() * pool.length)], r = (e.rate ?? 1) * detune[Math.floor(rnd() * detune.length)];
    let ev = r === 1 ? e.ch : varispeed(e.ch, at(r), 0.5);
    ev = fadeOut(ev.map((c) => c.slice(0, Math.round(0.35 * SR))), 0.04);
    const levelDb = -14 + 14 * (t / T) + (rnd() * 6 - 3);
    mixInto(out, ev, t, e.g * 10 ** (levelDb / 20), rnd() * 1.6 - 0.8);
    const rate = 3 * 8 ** (t / T); // events per second: 3 -> 24
    t += (1 / rate) * (0.6 + 0.8 * rnd()); n++;
  }
  console.log('notif-swarm events:', n);
  writeWav(fadeOut(out.map((c) => c.slice(0, Math.round((T + 0.05) * SR))), 0.05), 'notif-swarm.comp.wav');
}
// sub-drone: take 2 extended by a phase-aligned loop of its steady part, then a 2-semitone rise over 8 s
{
  const src = decode('sub-drone.v2.mp3');
  const A = sec(src, 0, 6.3), loopFrom = Math.round(3.0 * SR), xf = Math.round(0.4 * SR), period = Math.round(SR / 65.4);
  // align the loop start to A's crossfade region (best cross-correlation within one period of the fundamental)
  const ref = A[0].length - xf; let best = -Infinity, bestOff = 0;
  for (let off = 0; off < period; off++) {
    let s = 0; for (let i = 0; i < xf; i += 4) s += A[0][ref + i] * src[0][loopFrom + off + i];
    if (s > best) { best = s; bestOff = off; }
  }
  const B = sec(src, (loopFrom + bestOff) / SR, 6.3);
  const n = A[0].length + B[0].length - xf, joined = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    joined[c].set(A[c].subarray(0, ref));
    for (let i = 0; i < xf; i++) { const w = i / xf; joined[c][ref + i] = A[c][ref + i] * (1 - w) + B[c][i] * w; }
    joined[c].set(B[c].subarray(xf), ref + xf);
  }
  const rise = varispeed(joined, (t) => ST((2 * t) / 8), 8.05); // +2 semitones over 8 s
  writeWav(rise, 'sub-drone.comp.wav');
}
