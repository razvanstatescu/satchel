#!/usr/bin/env node
// Score: one instrumental Eleven Music (music_v1) track from a composition plan whose sections follow the timeline.
//   node tools/audio/music.mjs [--dry]      (--dry writes the plan only; no generation)
// Writes video/public/music/score.mp3 (+ score.plan.json), video/src/data/beats.json, and timeline.json.music.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { BUDGET, MUSIC, PATHS } from './config.mjs';
import { SR, decodeMono, ensureDir, envelopeDb, probeDuration, r3, readJson, usageLog, usageTotals, writeJson } from './lib.mjs';

const USAGE = resolve(PATHS.work, 'usage.jsonl');
const BEATS = resolve(PATHS.marketing, 'tools/beats.mjs');

// v1 lessons (music_v1, 2 takes): words like "silence" made the model drop out for whole bars and once left the
// outro completely silent; the drop landed 8 s late in BOTH takes, so the score had to be re-edited on bar lines
// (arrange.py). v2 uses music_v2_5, whose chunk durations are always enforced, keeps every section sounding, and
// still expects a bar-line edit if the structure drifts.
const GLOBAL_POS = [
  '120 BPM', '4/4', 'instrumental', 'premium cinematic electronic', 'warm analog synths', 'felt piano',
  'tight modern drums', 'deep sub bass', 'tactile, crafted, confident', 'polished modern tech launch film score',
  'clean mix with space for a voiceover', 'continuous music from the first beat to the last, no gaps',
];
const GLOBAL_NEG = ['vocals', 'singing', 'vocal chops', 'choir', 'EDM', 'big room', 'dubstep', 'cheesy', 'tempo changes', 'swing', 'lo-fi', 'risers that never resolve', 'long silent gaps', 'orchestral trailer braams'];

/** v2 arc, one section per scene (S07 split at S07c). [id, tag, pos, neg]
 * Take 1 (music_v2_5, seed 4130) ignored nearly every intent: one flat groove 0-64, breakdown 64-78, drop at 80,
 * then a fade from 112 and an almost silent S08b/S09. Take 2 goes back to music_v1, whose v1 take followed section
 * intents better (hits, drumless outro), and avoids every quiet word except the last bars of S05. */
const V2 = [
  ['S01', 'Hook', ['punchy confident hits on every beat', 'deep kick with short warm analog synth stabs', 'full energy from the very first beat'], ['intro', 'fade in', 'ambient pad intro']],
  ['W1', 'Groove', ['a bright confident groove kicks in', 'kick, snare and shaker groove', 'plucky warm analog synth arpeggio', 'optimistic premium product launch'], ['dark', 'heavy']],
  ['W2', 'Groove builds', ['the bright groove continues and builds', 'claps on two and four', 'warm analog bass line'], ['dark', 'breakdown']],
  ['W3', 'Build', ['the groove keeps building', 'felt piano chords join', 'rising energy, confident and bright'], ['breakdown', 'drop']],
  ['S04', 'Groove', ['full confident groove', 'warm analog bass', 'felt piano chords'], ['breakdown', 'gaps']],
  ['S02', 'Peak', ['the groove at its brightest and fullest', 'a short drum fill on the last bar'], ['breakdown', 'gaps']],
  ['U1', 'Chorus', ['bigger, warmer chorus: the warmest moment of the track', 'warm major chords', 'felt piano melody on top', 'claps and full drums continue', 'uplifting'], ['dark', 'minor key', 'breakdown']],
  ['S05', 'Dark turn', ['sudden dark turn on the first beat', 'minor key', 'tense pulsing sub bass and ticking hi-hats', 'suspense building', 'for the last four seconds the drums stop and only one deep sub boom and a low drone remain'], ['bright', 'major key', 'drop', 'melody']],
  ['S06', 'Riser', ['riser: snare roll and noise swell crescendo for the whole section', 'builds straight into a big drop'], ['drum groove', 'melody']],
  ['S07ab', 'Drop', ['big drop on the very first beat', 'driving warm four-on-the-floor groove', 'claps on two and four', 'warm analog bass', 'felt piano chords', 'full energy from start to end'], ['breakdown', 'build-up', 'quiet start', 'gaps']],
  ['S07ce', 'Drive', ['the driving warm groove continues', 'an analog synth arpeggio layer joins', 'constant energy'], ['breakdown', 'drop', 'gaps', 'fade']],
  ['S08', 'Build and hit', ['build-up: snare roll and rising filter sweep', 'then one big satisfying hit with a warm major chord', 'the groove returns'], ['fade', 'gaps']],
  ['S09', 'Outro', ['warm resolved outro', 'felt piano melody over a soft analog pad and gentle sub, playing through the whole section', 'calm, resolved, major key', 'the final chord rings out naturally over the last two seconds'], ['abrupt cut', 'early ending', 'gaps', 'new drums', 'riser']],
];

/** Music sections from the timeline: the scene boundaries (S07 split at its part c). */
export function sections(tl) {
  const sc = Object.fromEntries(tl.scenes.map((s) => [s.id, s]));
  const part = Object.fromEntries((sc.S07.parts || []).map((p) => [p.id, p]));
  const m = tl.markers;
  const bounds = {
    S01: [sc.S01.start, sc.S01.end], W1: [sc.W1.start, sc.W1.end], W2: [sc.W2.start, sc.W2.end], W3: [sc.W3.start, sc.W3.end],
    S04: [sc.S04.start, sc.S04.end], S02: [sc.S02.start, sc.S02.end], U1: [sc.U1.start, sc.U1.end],
    S05: [sc.S05.start, sc.S05.end], S06: [sc.S06.start, sc.S06.end],
    S07ab: [sc.S07.start, part.S07c.start], S07ce: [part.S07c.start, sc.S07.end],
    S08: [sc.S08.start, sc.S08.end], S09: [sc.S09.start, sc.S09.end],
  };
  return V2.map(([id, name, pos, neg]) => ({ id, name, pos, neg, start: bounds[id][0], end: bounds[id][1], ms: Math.round((bounds[id][1] - bounds[id][0]) * 1000) }));
}

export function plan(tl, model = MUSIC.model) {
  const secs = sections(tl);
  for (let i = 0; i < secs.length; i++) {
    if (secs[i].ms < 3000) throw new Error(`section ${secs[i].id} is ${secs[i].ms} ms (< 3000)`);
    if (i && Math.abs(secs[i].start - secs[i - 1].end) > 1e-9) throw new Error(`gap/overlap before ${secs[i].id}`);
  }
  const total = secs.reduce((a, s) => a + s.ms, 0);
  if (total !== Math.round(tl.durationSec * 1000)) throw new Error(`sections ${total} ms != duration ${tl.durationSec}`);
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
function analyze(out, tl, extra = {}) {
  const dur = probeDuration(out);
  const beatsOut = resolve(PATHS.dataDir, 'beats.json');
  const r = spawnSync('node', [BEATS, out, '--bpm', String(tl.bpm), '--fps', String(tl.fps), '--out', beatsOut], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`beats.mjs failed: ${r.stderr}`);
  let raw = readJson(beatsOut);
  if (raw.gridRmsMs > 15) raw = refitGrid(out, raw, tl.bpm);
  const beats = phaseFix(out, raw);
  beats.file = out.startsWith(PATHS.publicDir) ? out.slice(PATHS.publicDir.length + 1) : out;
  writeJson(beatsOut, beats);
  const prof = loudnessProfile(out); // 0.25 s windows
  const mean = (a, b) => { const s = prof.slice(Math.round(a * 4), Math.round(b * 4)); return Math.round(s.reduce((p, q) => p + q, 0) / s.length); };
  const secs = sections(tl);
  const checks = secs.map((s) => ({ id: s.id, start: s.start, end: s.end, meanDb: mean(s.start, s.end), first1sDb: mean(s.start, s.start + 1) }));
  const drop = { before: mean(tl.markers.logoDrop - 2, tl.markers.logoDrop), after: mean(tl.markers.logoDrop, tl.markers.logoDrop + 2) };
  tl.music = {
    file: 'music/score.mp3', ...extra, durationSec: r3(dur),
    bpmGrid: beats.bpmGrid, beatOffset: beats.gridOffset, trackerOffset: beats.trackerGridOffset ?? beats.phaseCheck.trackerGridOffset, gridRmsMs: beats.gridRmsMs, gridSource: beats.gridSource ?? 'beats.mjs',
    firstDownbeat: beats.downbeats[0], sections: secs.map(({ id, start, end }) => ({ id, start, end })),
  };
  const arr = readJson(resolve(PATHS.marketing, 'tools/audio/arrangement.json'));
  if (arr && out.endsWith('score.mp3')) {
    tl.music.shipped = 'arranged edit (tools/audio/arrangement.json), mp3 320 kbps, 44.1 kHz stereo, sample peak -3 dBFS';
    tl.music.arrangedFrom = { source: arr.source, segments: arr.segments.map(({ t0, t1, s0 }) => ({ t0, t1, s0 })) };
    tl.music.sections = arr.cues;
    tl.music.hits = arr.subHits.map(({ t, why }) => ({ t, why }));
    tl.music.sweeps = arr.sweeps.map(({ type, t0, t1, fromHz, toHz }) => ({ type, t0, t1, fromHz, toHz }));
  }
  writeJson(resolve(PATHS.dataDir, 'timeline.json'), tl);
  writeJson(resolve(PATHS.work, 'score.loudness.json'), { hopSec: 0.25, db: prof, checks, drop });
  console.log(JSON.stringify({ out, dur, bpmGrid: beats.bpmGrid, trackerOffset: beats.phaseCheck.trackerGridOffset, beatOffset: beats.gridOffset, phase: beats.phaseCheck, firstDownbeat: beats.downbeats[0], drop }, null, 1));
  console.log(checks.map((c) => `${c.id.padEnd(6)} ${c.start}-${c.end} mean ${c.meanDb} dB, first 1 s ${c.first1sDb} dB`).join('\n'));
}

async function main() {
  const dry = process.argv.includes('--dry');
  const tlPath = resolve(PATHS.dataDir, 'timeline.json');
  const tl = readJson(tlPath);
  const out = resolve(PATHS.musicDir, 'score.mp3');
  if (process.argv.includes('--analyze')) return analyze(process.argv[process.argv.indexOf('--analyze') + 1]?.endsWith('.mp3') ? process.argv[process.argv.indexOf('--analyze') + 1] : out, tl, tl.music || {});
  const { secs, plan: p } = plan(tl);
  ensureDir(PATHS.musicDir);
  writeJson(resolve(PATHS.work, 'score.plan.json'), p);
  console.log(secs.map((s) => `${s.id} ${s.start}-${s.end} (${s.ms} ms)`).join('\n'));
  if (dry) return;

  const used = usageTotals(USAGE, BUDGET.phase).music;
  if (used >= 2) throw new Error(`music budget (2 generations in ${BUDGET.phase}) already used`);
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
  writeFileSync(out, buf);
  writeJson(resolve(dir, `score.${MUSIC.model}.seed${MUSIC.seed}.plan.json`), p);
  console.log(`raw take saved to ${raw}. Check the structure; if it drifts, write a bar-line edit list (tools/audio/arrangement.json) and run python3 tools/audio/arrange.py.`);
  analyze(out, tl, { format, model: MUSIC.model, seed: MUSIC.seed });
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
