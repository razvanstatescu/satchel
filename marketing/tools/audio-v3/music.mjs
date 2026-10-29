#!/usr/bin/env node
// Score: one instrumental Eleven Music (music_v1) track from a composition plan whose sections follow the timeline.
//   node tools/audio-v3/music.mjs [--dry]      (--dry writes the plan only; no generation)
// Writes video/public/v2/music/score.mp3, video/src2/data/beats.json, and timeline.json.music (src2).
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { BUDGET, MUSIC, PATHS } from './config.mjs';
import { SR, decodeMono, ensureDir, envelopeDb, probeDuration, r3, readJson, usageLog, usageTotals, writeJson } from './lib.mjs';

const USAGE = resolve(PATHS.work, 'usage.jsonl');
const BEATS = resolve(PATHS.marketing, 'tools/beats.mjs');

// Lessons from the v5 film's four takes: music_v1 follows section intents better than music_v2_5 (which ignored them),
// but places big events (drop, breakdown) a few seconds late, and "silence" words can empty whole sections; the fix is
// always a bar-line edit (arrange.py + arrangement.json). Its tempo was exactly the requested 120 BPM.
// v3 take 1 (seed 2212): 8 s intro, one groove 8-72, bass-out breakdown 72-80, drop at 80, groove to 128, outro
// 128-133.5: no catch tension, no blocked dip, no landing. Take 2 states those three contrasts more bluntly.
const GLOBAL_POS = [
  '120 BPM', '4/4', 'instrumental', 'bright premium indie-pop', 'handclaps', 'plucked bass', 'glockenspiel',
  'whistled hook melody (whistling, no singing)', 'playful but grown-up', 'warm, crisp modern mix',
  'clean mix with space for a voiceover', 'continuous music, no gaps',
];
const GLOBAL_NEG = ['vocals', 'singing', 'choir', 'childish', 'nursery rhyme', 'kazoo', 'cartoon sound effects', 'EDM', 'dubstep', 'trap', 'cheesy', 'tempo changes', 'swing feel', 'lo-fi', 'long silent gaps'];

/**
 * v3 cues M1-M9 (concepts-v2 §4.6) as plan sections, written on the SOURCE clock: the take gets a 4 s intro and every
 * later section sits 2 s (one bar) later than on the film clock, because the edit keeps intro 0-2.5 s and joins the
 * groove (from source 4.5 s) at hookLand 2.5 s, so film time = source time - 2 s after the hook (bars stay on even seconds).
 * [id, name, startSrc, endSrc, pos, neg]
 */
const SRC_SHIFT = 2;
const V3 = [
  ['M1a', 'Intro', 0, 4, ['glockenspiel pickup notes', 'three light finger snaps', 'sparse and bright', 'a playful lift into the groove'], ['drums', 'bass']],
  ['M1b', 'Hook groove', 4, 14, ['the groove kicks in on the first beat: handclaps, plucked bass, tight kick and snare', 'glockenspiel and a whistled hook melody', 'bright and confident'], ['slow build', 'fade in']],
  ['M2a', 'Product build', 14, 26, ['the groove continues and builds', 'glockenspiel plinks on eighth notes', 'warm plucked bass', 'shaker'], ['breakdown']],
  ['M2b', 'Product send', 26, 34, ['a fuller groove', 'an extra synth pluck layer', 'confident and bright'], ['breakdown']],
  ['M2c', 'Comic break', 34, 40, ['one bar of stop-time with a short descending glide', 'then the groove comes back'], ['cartoon', 'kazoo']],
  ['M2d', 'Give lift', 40, 48, ['lift: rising energy toward the chorus', 'a snare build on the last bar'], ['breakdown']],
  ['M3', 'Chorus', 48, 60, ['the chorus: the warmest and fullest part of the track', 'big handclaps', 'the whistled hook in full', 'warm major chords', 'glockenspiel sparkle', 'ends abruptly on the last beat'], ['minor key', 'breakdown']],
  ['M4', 'Catch', 60, 74, ['the band stops dead on the first beat', 'only a soft low heartbeat kick and a quiet ticking hi-hat remain', 'dark minor key, very sparse and tense', 'one dull thud and one deep sub hit near the end'], ['bright', 'major key', 'melody', 'handclaps', 'chords', 'bass line']],
  ['M5', 'Riser', 74, 78, ['two-bar riser: snare roll and a rising noise swell building into a big drop'], ['melody']],
  ['M6a', 'Tech drop', 78, 92, ['the drop on the first beat: a driving groove on a heavier kit', 'the whistled hook melody in a confident register', 'plucked bass and handclaps', 'full energy'], ['breakdown', 'build-up', 'quiet start']],
  ['M6b', 'Tech groove', 92, 112, ['the driving confident groove continues', 'glockenspiel accents', 'constant energy'], ['breakdown', 'gaps']],
  ['M7', 'Blocked', 112, 118, ['everything drops out except the bass and a ticking hi-hat', 'sparse and deflated', 'a short build back on the last bar'], ['full drums', 'melody', 'handclaps']],
  ['M8a', 'Hand-off build', 118, 124, ['build-up: a rising filter sweep and a snare roll building to a big hit', 'anticipation'], ['fade', 'breakdown']],
  ['M8b', 'Landing', 124, 128, ['a big crash and landing hit on the first beat', 'the full band returns with handclaps and glockenspiel'], ['gaps']],
  ['M9', 'Outro', 128, 136, ['the whistled hook resolves on a warm major chord', 'a final short hit, then a natural ring-out', 'ends cleanly'], ['abrupt cut', 'new drums']],
];

/** Plan sections on the source clock (see V3). Checked against the timeline: the film is source - 2 s long. */
export function sections(tl) {
  return V3.map(([id, name, a, b, pos, neg]) => ({ id, name, pos, neg, start: a, end: b, filmStart: Math.max(0, a - SRC_SHIFT), filmEnd: b - SRC_SHIFT, ms: Math.round((b - a) * 1000) }));
}

export function plan(tl, model = MUSIC.model) {
  const secs = sections(tl);
  for (let i = 0; i < secs.length; i++) {
    if (secs[i].ms < 3000) throw new Error(`section ${secs[i].id} is ${secs[i].ms} ms (< 3000)`);
    if (i && Math.abs(secs[i].start - secs[i - 1].end) > 1e-9) throw new Error(`gap/overlap before ${secs[i].id}`);
  }
  const total = secs.reduce((a, s) => a + s.ms, 0);
  if (total !== Math.round((tl.durationSec + SRC_SHIFT) * 1000)) throw new Error(`sections ${total} ms != film ${tl.durationSec} s + ${SRC_SHIFT} s`);
  if (model === 'music_v1') {
    return { secs, plan: { positive_global_styles: GLOBAL_POS, negative_global_styles: GLOBAL_NEG, sections: secs.map((s) => ({ section_name: `${s.name} (${s.id})`, positive_local_styles: s.pos, negative_local_styles: s.neg, duration_ms: s.ms, lines: [] })) } };
  }
  // music_v2 / v2_5 schema (from POST /v1/music/plan): chunks[{text, duration_ms, positive_styles, negative_styles, context_adherence}]
  return {
    secs,
    plan: {
      chunks: secs.map((s) => ({
        text: `[${s.name}]`,
        duration_ms: s.ms,
        // keep lists close to what the plan endpoint itself returns (~8 styles per chunk)
        positive_styles: ['120 BPM', 'instrumental', ...s.pos, 'premium cinematic electronic', 'warm analog synths', 'polished modern mix'].slice(0, 10),
        negative_styles: [...s.neg, 'vocals', 'EDM', 'cheesy', 'tempo changes'].slice(0, 8),
        context_adherence: 'high',
        conditioning_ref: null,
        condition_strength: null,
      })),
    },
  };
}

function loudnessProfile(file) {
  const x = decodeMono(file);
  const { db } = envelopeDb(x, 0.25);
  return Array.from(db, (v) => Math.round(v));
}

/**
 * beats.mjs tracks spectral flux and can lock onto the off-beat (hats/claps) when the kick+stab hits are on the
 * other half-beat (take 1: hits at 0.02 s + k/2, tracker said 0.28 s). Compare the loudness right after the grid
 * beats with right after the half-beat-shifted grid; if the shifted grid is clearly louder, shift everything.
 * Downbeats are then re-picked as the loudest of the 4 phases.
 */
function phaseFix(file, b) {
  const x = decodeMono(file);
  const { db } = envelopeDb(x, 0.01);
  const at = (t) => {
    let m = -200;
    for (let f = Math.max(0, Math.round(t / 0.01) - 1); f <= Math.round((t + 0.06) / 0.01) && f < db.length; f++) m = Math.max(m, db[f]);
    return m;
  };
  const spb = 60 / b.bpmGrid;
  const med = (a) => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];
  const on = med(b.gridBeats.map(at)), off = med(b.gridBeats.map((t) => at(t + spb / 2)));
  const shift = off - on > 3 ? (b.gridOffset + spb / 2 >= spb ? -spb / 2 : spb / 2) : 0;
  const sh = (t) => +(t + shift).toFixed(4);
  const out = { ...b };
  if (shift) {
    out.gridOffset = +(((b.gridOffset + shift) % spb + spb) % spb).toFixed(4);
    out.beats = b.beats.map(sh).filter((t) => t >= 0 && t <= b.duration);
    out.gridBeats = [];
    for (let t = out.gridOffset; t <= b.duration; t += spb) out.gridBeats.push(+t.toFixed(4));
  }
  // downbeat phase: the backbeat (claps/snare, measured on a 2nd-difference high-passed signal) sits on beats 2 and 4,
  // which fixes the bar phase modulo 2 beats; of the two candidates take the one that starts the track (the
  // generator starts on bar 1). Plain loudness picked beat 3 in take 2, which is wrong (kicks are four-on-the-floor).
  const hp = new Float32Array(x.length);
  for (let i = 2; i < x.length; i++) hp[i] = x[i] - 2 * x[i - 1] + x[i - 2];
  const hpAt = (t) => {
    let e = 0;
    const i0 = Math.round(t * SR);
    for (let i = i0; i < Math.min(hp.length, i0 + Math.round(0.05 * SR)); i++) e += hp[i] * hp[i];
    return 10 * Math.log10(e + 1e-12);
  };
  const ph = [0, 1, 2, 3].map((p) => med(out.gridBeats.filter((_, i) => i % 4 === p).map(hpAt)));
  const q = ph[1] + ph[3] >= ph[0] + ph[2] ? 0 : 1; // backbeat on q+1, q+3 -> downbeat q or q+2
  const best = q;
  out.downbeatPhase = best;
  out.downbeats = out.gridBeats.filter((_, i) => i % 4 === best);
  if (b.fps) {
    out.beatFrames = out.beats.map((t) => Math.round(t * b.fps));
    out.gridBeatFrames = out.gridBeats.map((t) => Math.round(t * b.fps));
    out.downbeatFrames = out.downbeats.map((t) => Math.round(t * b.fps));
  }
  out.phaseCheck = { onbeatDb: Math.round(on), halfBeatDb: Math.round(off), shiftedBy: +shift.toFixed(4), trackerGridOffset: b.gridOffset, backbeatDbByPhase: ph.map(Math.round), note: 'downbeats = the beat before the backbeat, parity from the track start' };
  return out;
}

/**
 * Robust constant-tempo grid from STRONG mid-band transients (RBJ band-pass ~630 Hz, 10 ms frames, rises > 10 dB):
 * the circular mean of (t mod period) picks the phase, the period maximises its concentration. Used when beats.mjs's
 * own fit is poor (gridRmsMs > 15). v2 take 2 needed it: a 12 s drumless drone threw beats.mjs off (120.33-120.6 BPM,
 * rms ~56 ms), and broadband / high-band onset folds mis-read it as 119.73 BPM, while its kick/snare transients sit
 * on exactly 0.02 + k/2 s from start to end.
 */
export function strongTransients(x, { f0 = 630, q = 0.7, hopSec = 0.01, riseDb = 10 } = {}) {
  const w0 = (2 * Math.PI * f0) / SR, al = Math.sin(w0) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - al) / a0;
  const hop = Math.round(hopSec * SR), n = Math.floor(x.length / hop), env = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let f = 0; f < n; f++) {
    let e = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; e += y * y;
    }
    env[f] = 10 * Math.log10(e / hop + 1e-12);
  }
  const t = [];
  for (let f = 2; f < n - 1; f++) {
    const d = env[f] - env[f - 1];
    if (d > riseDb && d >= env[f - 1] - env[f - 2] && d >= env[f + 1] - env[f]) t.push(f * hopSec);
  }
  return t;
}

function refitGrid(file, b, bpm = 120) {
  const x = decodeMono(file);
  const tr = strongTransients(x);
  const p0 = 60 / bpm;
  // period: the one whose phase histogram (5 ms bins, +-1 bin) has the tallest peak; ties go to the requested tempo
  const peakOf = (period) => {
    const bins = new Array(Math.ceil(period / 0.005)).fill(0);
    for (const t of tr) bins[Math.floor((((t % period) + period) % period) / 0.005) % bins.length]++;
    let best = { n: -1 };
    for (let i = 0; i < bins.length; i++) {
      const n = bins[(i - 1 + bins.length) % bins.length] + bins[i] + bins[(i + 1) % bins.length];
      if (n > best.n) best = { n, center: (i + 0.5) * 0.005 };
    }
    return best;
  };
  let best = { n: -1 };
  for (let period = p0 * 0.994; period <= p0 * 1.006; period += 0.00001) {
    const pk = peakOf(period);
    if (pk.n > best.n || (pk.n === best.n && Math.abs(period - p0) < Math.abs(best.period - p0))) best = { ...pk, period };
  }
  // offset: mean phase of the transients within 10 ms of the peak (robust to flams and fills)
  const near = tr.map((t) => (((t - best.center) % best.period) + best.period * 1.5) % best.period - best.period / 2).filter((d) => Math.abs(d) <= 0.01);
  best.off = (best.center + near.reduce((a, d) => a + d, 0) / Math.max(1, near.length) + best.period) % best.period;
  best.R = near.length / tr.length;
  const devs = tr.map((t) => { const k = Math.round((t - best.off) / best.period); return t - best.off - k * best.period; }).filter((d) => Math.abs(d) < 0.06);
  const rms = Math.sqrt(devs.reduce((a, d) => a + d * d, 0) / Math.max(1, devs.length)) * 1000;
  const dur = x.length / SR;
  const gridBeats = [];
  for (let t = best.off; t <= dur; t += best.period) gridBeats.push(+t.toFixed(4));
  return {
    ...b, trackerBeats: b.beats, trackerBpmGrid: b.bpmGrid, trackerGridOffset: b.gridOffset, trackerGridRmsMs: b.gridRmsMs,
    bpmGrid: +(60 / best.period).toFixed(3), gridOffset: +best.off.toFixed(4), gridRmsMs: +rms.toFixed(1),
    gridBeats, beats: gridBeats, transientsUsed: devs.length, transientShareOnGrid: +best.R.toFixed(3),
    gridSource: 'refit from strong mid-band transients (beats.mjs fit was poor; its output is kept as tracker*)',
  };
}

/** Beat grid + phase fix + section checks for an existing score; updates beats.json and timeline.json.music. */
/**
 * Beat grid + phase fix + section checks. raw=true (a take on the source clock): beats and loudness go to the work dir
 * and the timeline is left alone. raw=false (the shipped, arranged score on the film clock): writes src2/data/beats.json
 * and timeline.json.music.
 */
function analyze(out, tl, extra = {}, { raw: isRaw = false } = {}) {
  const dur = probeDuration(out);
  const base = out.replace(/\.\w+$/, '');
  const beatsOut = isRaw ? `${base}.beats.json` : resolve(PATHS.dataDir, 'beats.json');
  const r = spawnSync('node', [BEATS, out, '--bpm', String(tl.bpm), '--fps', String(tl.fps), '--out', beatsOut], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`beats.mjs failed: ${r.stderr}`);
  let bt = readJson(beatsOut);
  if (bt.gridRmsMs > 15) bt = refitGrid(out, bt, tl.bpm);
  const beats = phaseFix(out, bt);
  beats.file = out.startsWith(PATHS.publicDir) ? out.slice(PATHS.publicDir.length + 1) : out;
  writeJson(beatsOut, beats);
  const prof = loudnessProfile(out); // 0.25 s windows
  const mean = (a, b) => { const s = prof.slice(Math.round(a * 4), Math.round(b * 4)); return Math.round(10 * Math.log10(s.reduce((p, q) => p + 10 ** (q / 10), 0) / Math.max(1, s.length))); };
  const secs = sections(tl);
  const at = (s) => (isRaw ? [s.start, s.end] : [s.filmStart, s.filmEnd]);
  const checks = secs.map((s) => { const [a, b] = at(s); return { id: s.id, start: a, end: b, meanDb: mean(a, b), first1sDb: mean(a, a + 1) }; });
  const d = tl.markers.drop + (isRaw ? SRC_SHIFT : 0);
  const drop = { at: d, before: mean(d - 2, d), after: mean(d, d + 2) };
  writeJson(`${PATHS.work}/${isRaw ? 'raw' : 'score'}.loudness.json`, { file: out, hopSec: 0.25, db: prof, checks, drop });
  console.log(JSON.stringify({ out, dur, clock: isRaw ? 'source' : 'film', bpmGrid: beats.bpmGrid, beatOffset: beats.gridOffset, gridRmsMs: beats.gridRmsMs, gridSource: beats.gridSource ?? 'beats.mjs', firstDownbeat: beats.downbeats[0], drop }, null, 1));
  console.log(checks.map((c) => `${c.id.padEnd(5)} ${c.start}-${c.end} mean ${c.meanDb} dB, first 1 s ${c.first1sDb} dB`).join('\n'));
  if (isRaw) return beats;
  tl.music = {
    file: `${PATHS.musicPrefix}/score.mp3`, ...extra, durationSec: r3(dur),
    bpmGrid: beats.bpmGrid, beatOffset: beats.gridOffset, trackerOffset: beats.trackerGridOffset ?? beats.phaseCheck.trackerGridOffset, gridRmsMs: beats.gridRmsMs, gridSource: beats.gridSource ?? 'beats.mjs',
    firstDownbeat: beats.downbeats[0],
  };
  const arr = readJson(resolve(PATHS.marketing, 'tools/audio-v3/arrangement.json'));
  if (arr) {
    tl.music.shipped = 'arranged edit (tools/audio-v3/arrangement.json), mp3 320 kbps, 44.1 kHz stereo, sample peak -3 dBFS';
    tl.music.arrangedFrom = { source: arr.source, segments: arr.segments.map(({ t0, t1, s0 }) => ({ t0, t1, s0 })) };
    tl.music.sections = arr.cues;
    tl.music.hits = (arr.subHits || []).map(({ t, why }) => ({ t, why }));
    tl.music.sweeps = (arr.sweeps || []).map(({ type, t0, t1, fromHz, toHz }) => ({ type, t0, t1, fromHz, toHz }));
  }
  writeJson(resolve(PATHS.dataDir, 'timeline.json'), tl);
  return beats;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const tlPath = resolve(PATHS.dataDir, 'timeline.json');
  const tl = readJson(tlPath);
  const out = resolve(PATHS.musicDir, 'score.mp3');
  if (process.argv.includes('--analyze')) {
    const f = process.argv[process.argv.indexOf('--analyze') + 1];
    const file = f?.endsWith('.mp3') || f?.endsWith('.wav') ? resolve(f) : out;
    return analyze(file, tl, tl.music || {}, { raw: file !== out });
  }
  const { secs, plan: p } = plan(tl);
  ensureDir(PATHS.musicDir);
  writeJson(resolve(PATHS.work, 'score.plan.json'), p);
  console.log(secs.map((s) => `${s.id} ${s.start}-${s.end} (${s.ms} ms)`).join('\n'));
  if (dry) return;

  const used = usageTotals(USAGE, BUDGET.phase).music;
  if (used >= BUDGET.musicGenerations) throw new Error(`music budget (${BUDGET.musicGenerations} generations in ${BUDGET.phase}) already used`);
  let buf, format;
  for (const f of MUSIC.formats) {
    try {
      buf = await eleven.music({
        compositionPlan: p, outputFormat: f, modelId: MUSIC.model, seed: MUSIC.seed, timeoutMs: 290_000,
        respectSectionsDurations: MUSIC.model === 'music_v1' ? true : undefined, // always enforced on v2/v2.5
      });
      format = f;
      break;
    } catch (e) {
      const why = `${e.message} ${e.body || ''}`;
      if ([400, 403, 422].includes(e.status) && /format/i.test(why)) { console.warn(`format ${f} refused (${e.status}); trying next`); continue; }
      throw e;
    }
  }
  if (!buf) throw new Error('no output format accepted');
  usageLog(USAGE, { kind: 'music', phase: BUDGET.phase, model: MUSIC.model, format, seconds: tl.durationSec, seed: MUSIC.seed, requestId: buf.meta?.requestId });
  const dir = ensureDir(resolve(PATHS.work, 'music', BUDGET.phase));
  const raw = resolve(dir, `score.${MUSIC.model}.seed${MUSIC.seed}.raw.mp3`);
  writeFileSync(raw, buf);
  writeJson(resolve(dir, `score.${MUSIC.model}.seed${MUSIC.seed}.plan.json`), p);
  console.log(`raw take saved to ${raw} (source clock). Write the bar-line edit list (tools/audio-v3/arrangement.json), then run python3 tools/audio-v3/arrange.py && node tools/audio-v3/music.mjs --analyze.`);
  analyze(raw, tl, { format, model: MUSIC.model, seed: MUSIC.seed }, { raw: true });
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
