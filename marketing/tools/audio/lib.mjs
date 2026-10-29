// Shared helpers for the audio pipeline (Node 22 + ffmpeg). No keys are touched here.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

export const SR = 44100;

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}
export const readJson = (p, fallback = null) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
export function writeJson(p, v) {
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(v, null, 1) + '\n');
}
export const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
export const r3 = (x) => Math.round(x * 1000) / 1000;

/** Decode any audio file to mono float32 at 44.1 kHz. */
export function decodeMono(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr}`);
  const b = Buffer.from(r.stdout);
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}

/** Encode mono float32 (44.1 kHz) to mp3 192 kbps CBR, 44.1 kHz. */
export function encodeMp3(samples, out) {
  ensureDir(dirname(out));
  const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-ar', String(SR), '-c:a', 'libmp3lame', '-b:a', '192k', out], { input: buf, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg encode failed: ${r.stderr}`);
}

export function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(String(r.stdout).trim());
}

/** 10 ms RMS envelope in dBFS. */
export function envelopeDb(x, hopSec = 0.01) {
  const hop = Math.round(SR * hopSec);
  const n = Math.ceil(x.length / hop);
  const out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, c = 0;
    for (let i = f * hop; i < Math.min(x.length, (f + 1) * hop); i++) s += x[i] * x[i], c++;
    out[f] = 10 * Math.log10(s / Math.max(1, c) + 1e-12);
  }
  return { db: out, hopSec };
}

/** Speech bounds [start, end] in seconds: first/last 10 ms frame above max(-50 dBFS, peak - 40 dB). */
export function speechBounds(x, from = 0, to = x.length / SR) {
  const { db, hopSec } = envelopeDb(x);
  const f0 = Math.floor(from / hopSec), f1 = Math.min(db.length, Math.ceil(to / hopSec));
  let peak = -200;
  for (let f = f0; f < f1; f++) peak = Math.max(peak, db[f]);
  const thr = Math.max(-50, peak - 40);
  let a = -1, b = -1;
  for (let f = f0; f < f1; f++) if (db[f] > thr) { if (a < 0) a = f; b = f; }
  if (a < 0) return null;
  return { start: a * hopSec, end: (b + 1) * hopSec, thr, peak };
}

/** Lowest-energy point (s) in [lo, hi]; used to split phrases. */
export function quietestPoint(x, lo, hi) {
  const { db, hopSec } = envelopeDb(x);
  let best = lo, bv = Infinity;
  for (let f = Math.floor(lo / hopSec); f <= Math.min(db.length - 1, Math.ceil(hi / hopSec)); f++) if (db[f] < bv) bv = db[f], best = f * hopSec;
  return best;
}

/** Copy [start, end] seconds of x with short fades (in 5 ms, out 12 ms). */
export function slice(x, start, end, { fadeIn = 0.005, fadeOut = 0.012 } = {}) {
  const a = Math.max(0, Math.round(start * SR)), b = Math.min(x.length, Math.round(end * SR));
  const y = Float32Array.from(x.subarray(a, b));
  const fi = Math.round(fadeIn * SR), fo = Math.round(fadeOut * SR);
  for (let i = 0; i < Math.min(fi, y.length); i++) y[i] *= i / fi;
  for (let i = 0; i < Math.min(fo, y.length); i++) y[y.length - 1 - i] *= i / fo;
  return y;
}

/** Normalise for script comparison: lower case, no punctuation, single spaces. */
export const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function usageLog(file, entry) {
  ensureDir(dirname(file));
  appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}
/** Totals from the usage ledger; `phase` filters entries (v1 entries carry no phase tag and count as 'v1'). */
export function usageTotals(file, phase) {
  if (!existsSync(file)) return { ttsChars: 0, ttsCalls: 0, music: 0, stt: 0, align: 0 };
  const t = { ttsChars: 0, ttsCalls: 0, music: 0, stt: 0, align: 0, sttSec: 0 };
  for (const l of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(l);
    if (phase && (e.phase || 'v1') !== phase) continue;
    if (e.kind === 'tts') t.ttsChars += e.chars, t.ttsCalls++;
    if (e.kind === 'music') t.music++;
    if (e.kind === 'stt') t.stt++, (t.sttSec += e.sec || 0);
    if (e.kind === 'align') t.align++;
  }
  return t;
}
