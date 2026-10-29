// Process raw SFX -> video/public/sfx/<name>.mp3 (44.1 kHz stereo, 192 kbps) + catalog video/src/data/sfx.json.
//   node tools/sfx/process.mjs [--qa-only]
// Steps: decode -> onset trim (transient at 5 ms) -> cut to target with tail fade -> trailing-silence trim
// -> normalize (peak -3 dBFS; 'hit' group loudness-matched to its median, never above -3 dBFS peak)
// -> encode -> decode the mp3 again and verify (duration, onset, peak, RMS, silence, clipping).
// Source per effect: tools/sfx/choice.json `sources[name]` (a file in _raw/: a v2 regeneration or a composite from
// composite.mjs), else _raw/<name>.mp3. Prompts for v2 files come from regen-v2.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECS } from './specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(here, '../../video/public/sfx');
const RAW = resolve(dirname(fileURLToPath(import.meta.url)), '_raw');
const CATALOG = resolve(here, '../../video/src/data/sfx.json');
const CHOICE = resolve(here, 'choice.json');
const choice = existsSync(CHOICE) ? JSON.parse(readFileSync(CHOICE, 'utf8')) : {};
const REGEN = resolve(here, 'regen-v2.json');
const regenPrompts = existsSync(REGEN) ? JSON.parse(readFileSync(REGEN, 'utf8')) : {};
const SR = 44100, LEAD = 0.005, PEAK_TARGET_DB = -3;
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
const fromDb = (d) => 10 ** (d / 20);

function decode(path) { // -> [L, R] Float32Array at 44.1 kHz
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'],
    { maxBuffer: 1 << 28 });
  const f = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
}
function encode([L, R], out) {
  const f = new Float32Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { f[2 * i] = L[i]; f[2 * i + 1] = R[i]; }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-',
    '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', String(SR), '-ac', '2', out], { input: Buffer.from(f.buffer) });
}
const absAt = ([L, R], i) => Math.max(Math.abs(L[i]), Math.abs(R[i]));
function peakOf(ch) { let p = 0; for (let i = 0; i < ch[0].length; i++) p = Math.max(p, absAt(ch, i)); return p; }
function rmsOf([L, R], a = 0, b = L.length) {
  let s = 0; for (let i = a; i < b; i++) s += (L[i] * L[i] + R[i] * R[i]) / 2; return Math.sqrt(s / Math.max(1, b - a));
}
function envelope(ch, winSec = 0.01) { // RMS per hop of winSec
  const w = Math.round(winSec * SR), out = [];
  for (let a = 0; a + w <= ch[0].length; a += w) out.push(rmsOf(ch, a, a + w));
  return { env: out, hop: winSec };
}
function onsetIndex(ch, peak, relDb = -40) {
  const thr = Math.max(peak * fromDb(relDb), fromDb(-65));
  for (let i = 0; i < ch[0].length; i++) if (absAt(ch, i) > thr) return i;
  return 0;
}
function clipRuns(ch) { // runs of >=4 consecutive samples at |x| >= 0.995
  let runs = 0, len = 0;
  for (let i = 0; i < ch[0].length; i++) { if (absAt(ch, i) >= 0.995) { if (++len === 4) runs++; } else len = 0; }
  return runs;
}
function transients(ch, refractorySec = 0.04, riseDb = 8, floorDb = -30) { // onsets in a 5 ms envelope: rise > 8 dB over the previous 30 ms min, above peak-30 dB
  const { env } = envelope(ch, 0.005), top = Math.max(...env), out = [];
  let last = -1e9;
  for (let k = 0; k < env.length; k++) {
    const prevMin = k === 0 ? 1e-9 : Math.min(...env.slice(Math.max(0, k - 6), k));
    if (db(env[k]) > db(top) + floorDb && db(env[k]) - db(prevMin) > riseDb && (k - last) * 0.005 > refractorySec) { out.push(+(k * 0.005).toFixed(3)); last = k; }
  }
  return out;
}
function maxWindowRms(ch, winSec = 0.4) { // loudness proxy: loudest 400 ms window (or the whole clip)
  const w = Math.min(ch[0].length, Math.round(winSec * SR)); let best = 0;
  for (let a = 0; a + w <= ch[0].length; a += Math.round(0.01 * SR)) best = Math.max(best, rmsOf(ch, a, a + w));
  return best;
}
const slice = ([L, R], a, b) => [L.slice(a, b), R.slice(a, b)];
// ElevenLabs mp3s often end with a short click/bump in the final ~5-10 ms, after near-silence. If the last 15 ms
// peak more than 6 dB above the 45 ms before them, cut from the first 1 ms bin of that rise. Returns ms removed.
function endBump(ch, minLevel = 0) { // minLevel: ignore bumps quieter than this (linear)
  const ms = Math.round(0.001 * SR), n = ch[0].length;
  const binPeak = (a, b) => { let p = 0; for (let i = Math.max(0, a); i < Math.min(n, b); i++) p = Math.max(p, absAt(ch, i)); return p; };
  const before = binPeak(n - 60 * ms, n - 15 * ms);
  const tail = binPeak(n - 15 * ms, n);
  if (tail <= before * fromDb(6) || tail < minLevel) return 0;
  for (let a = n - 15 * ms; a < n; a += ms) if (binPeak(a, a + ms) > before * fromDb(6)) return n - a;
  return 0;
}
function fade(ch, inSamples, outSamples) {
  const n = ch[0].length;
  for (const c of ch) {
    for (let i = 0; i < Math.min(inSamples, n); i++) c[i] *= i / inSamples;
    for (let i = 0; i < Math.min(outSamples, n); i++) c[n - 1 - i] *= i / outSamples;
  }
}
function scale(ch, g) { for (const c of ch) for (let i = 0; i < c.length; i++) c[i] *= g; }

const qaOnly = process.argv.includes('--qa-only');
const stage = [];
for (const s of SPECS) {
  const srcFile = choice.sources?.[s.name] ?? `${s.name}.mp3`;
  const v = srcFile.includes('.comp.') ? 'comp' : srcFile.includes('.v2.') ? 2 : 1;
  let raw = decode(resolve(RAW, srcFile));
  const endCut = endBump(raw);
  if (endCut) raw = slice(raw, 0, raw[0].length - endCut);
  const rawPeak = peakOf(raw), rawClip = clipRuns(raw);
  if (s.anchor === 'end') { // drop trailing silence, then keep the last `dur` seconds
    const fl = rawPeak * fromDb(-60); let e = raw[0].length; while (e > 1 && absAt(raw, e - 1) < fl) e--;
    raw = slice(raw, Math.max(0, e - Math.round(s.dur * SR) + Math.round(LEAD * SR)), e);
  }
  const on = s.anchor === 'end' ? Math.round(LEAD * SR) : onsetIndex(raw, rawPeak, s.onsetRelDb);
  const start = Math.max(0, on - Math.round(LEAD * SR));
  const leadPad = Math.round(LEAD * SR) - (on - start); // pad with silence if the onset was within 5 ms of 0
  let ch = slice(raw, start, Math.min(raw[0].length, start + Math.round(s.dur * SR) - Math.max(0, leadPad)));
  if (leadPad > 0) ch = ch.map((c) => { const p = new Float32Array(c.length + leadPad); p.set(c, leadPad); return p; });
  const truncated = start + Math.round(s.dur * SR) < raw[0].length;
  // trailing silence trim (below peak-60 dB), keep 10 ms
  const pk = peakOf(ch), floor = pk * fromDb(-60);
  let end = ch[0].length; while (end > 1 && absAt(ch, end - 1) < floor) end--;
  ch = slice(ch, 0, Math.min(ch[0].length, end + Math.round(0.01 * SR)));
  const fadeOutMs = s.fadeMs ?? (truncated ? 25 : 10);
  fade(ch, Math.round((s.fadeInMs ?? 2) / 1000 * SR), Math.round(Math.min(fadeOutMs / 1000, ch[0].length / SR / 3) * SR));
  stage.push({ s, v, srcFile, ch, rawPeak, rawClip, leadSec: start / SR, truncated, endCutMs: +(endCut / SR * 1000).toFixed(1) });
}
// normalization: peak -3 dBFS; the 'hit' group is matched to its median loudness (only ever turned down)
for (const x of stage) { x.peakGain = fromDb(PEAK_TARGET_DB) / peakOf(x.ch); x.loudAtPeak = db(maxWindowRms(x.ch) * x.peakGain); }
const hits = stage.filter((x) => x.s.group === 'hit').map((x) => x.loudAtPeak).sort((a, b) => a - b);
const hitTarget = hits[Math.floor(hits.length / 2)];
const catalog = {}, report = [];
for (const x of stage) {
  let gDb = db(x.peakGain);
  if (x.s.group === 'hit') gDb = Math.min(gDb, gDb + (hitTarget - x.loudAtPeak));
  scale(x.ch, fromDb(gDb));
  const out = resolve(PUB, `${x.s.name}.mp3`);
  if (!qaOnly) encode(x.ch, out);
  // verify the encoded file
  const dec = decode(out);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,bit_rate', '-of', 'json', out]).toString();
  const st = JSON.parse(probe).streams[0];
  const pk = peakOf(dec), on = onsetIndex(dec, pk) / SR;
  let tr20 = 0; while (tr20 < dec[0].length && absAt(dec, tr20) < pk * fromDb(-20)) tr20++;
  const { env, hop } = envelope(dec, 0.01);
  let kmax = 0; env.forEach((e, k) => { if (e > env[kmax]) kmax = k; });
  const peakSec = +((kmax + 0.5) * hop).toFixed(3);
  const silences = (execFileSync('sh', ['-c', `ffmpeg -i "${out}" -af silencedetect=n=-50dB:d=0.25 -f null - 2>&1 | grep -c silence_start || true`]).toString().trim());
  const tr = transients(dec, x.s.hitRefractorySec, x.s.hitRiseDb, x.s.hitFloorDb);
  const r = { name: x.s.name, v: x.v, dur: +dur.toFixed(3), target: x.s.dur, sr: st.sample_rate, chn: st.channels, kbps: Math.round(st.bit_rate / 1000),
    onsetMs: +(on * 1000).toFixed(1), transientMs: +(tr20 / SR * 1000).toFixed(1), peakDb: +db(pk).toFixed(1), rmsDb: +db(rmsOf(dec)).toFixed(1), loud400Db: +db(maxWindowRms(dec)).toFixed(1),
    peakSec, gainApplied: +gDb.toFixed(1), rawPeakDb: +db(x.rawPeak).toFixed(1), rawClipRuns: x.rawClip, lead: +x.leadSec.toFixed(3),
    trimmed: x.truncated, endCutMs: x.endCutMs, outEndBump: endBump(dec, pk * fromDb(-50)) > 0, silences: Number(silences), transients: tr.length, tAt: tr.slice(0, 12).join(' ') };
  const flags = [];
  if (r.rawPeakDb < -40) flags.push('EMPTY');
  if (r.rawClipRuns > 20) flags.push('CLIPPED-SRC');
  if (r.peakDb > -0.5) flags.push('HOT');
  if (r.outEndBump) flags.push('END-BUMP');
  if (x.s.anchor !== 'end' && (r.onsetMs > 12 || r.transientMs < 3)) flags.push('ONSET');
  if (x.s.minTransients && r.transients < x.s.minTransients) flags.push('FEW-TRANSIENTS');
  if (Math.abs(r.dur - x.s.dur) > 0.15 * x.s.dur + 0.05) flags.push('SHORT');
  r.flags = flags.join(',');
  report.push(r);
  r.gainDb = Math.round((x.s.mixDb - r.loud400Db) * 2) / 2;
  const promptSpec = choice.promptOf?.[x.s.name] ? SPECS.find((q) => q.name === choice.promptOf[x.s.name]) : x.s; // source effect's prompt
  const prompt = x.v === 2 ? regenPrompts[x.s.name]?.prompt ?? x.s.prompt : promptSpec.prompt;
  catalog[x.s.name] = { file: `sfx/${x.s.name}.mp3`, duration: r.dur, peakSec, prompt, gainDb: r.gainDb,
    source: x.v === 'comp' ? 'composite' : `eleven_text_to_sound_v2 (v${x.v})`, ...(x.s.hitRefractorySec ? { hitsSec: tr } : {}),
    ...(choice.notes?.[x.s.name] ? { note: choice.notes[x.s.name] } : {}) };
}
if (!qaOnly) writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(resolve(here, 'qa-report.json'), JSON.stringify(report, null, 2));
console.table(report.map(({ name, v, dur, target, onsetMs, transientMs, peakDb, rmsDb, loud400Db, peakSec, gainDb, rawPeakDb, rawClipRuns, silences, transients, flags }) =>
  ({ name, v, dur, target, onsetMs, transientMs, peakDb, rmsDb, loud400Db, peakSec, gainDb, rawPeakDb, rawClipRuns, silences, transients, flags })));
console.log('hit-group loudness target (dBFS, 400 ms RMS):', hitTarget.toFixed(1));
