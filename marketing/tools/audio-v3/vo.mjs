#!/usr/bin/env node
// Voiceover: TTS (with timestamps) -> trim to ~40 ms -> (L15: re-space phrases onto beats) -> Scribe QA vs script
// (retake up to BUDGET.retakesPerLine) -> forced alignment on the shipped file -> work/vo.json manifest.
//   node tools/audio-v3/vo.mjs [--only V08,V09] [--retake V10]   (cached takes are reused unless config/text changed)
// Shipped files: video/public/v2/vo/Vxx.mp3 (mono, 44.1 kHz, 192 kbps). Raw takes + QA: tools/audio-v3/work/.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { BUDGET, LINES, PATHS, VOICE } from './config.mjs';
import { SR, decodeMono, encodeMp3, ensureDir, envelopeDb, hash, norm, probeDuration, quietestPoint, r3, readJson, slice, speechBounds, usageLog, usageTotals, writeJson } from './lib.mjs';

const LEAD = 0.04, TAIL = 0.04, BEAT = 0.5;
const W = (...p) => resolve(PATHS.work, ...p);
const USAGE = W('usage.jsonl');

function argv() {
  const o = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  return o;
}

/** Shorten internal pauses longer than maxPause (energy-detected silence, middle removed, 10 ms crossfade). */
function tightenPauses(y, maxPause) {
  const hop = 0.01;
  const { db } = envelopeDb(y, hop);
  let peak = -200;
  for (const v of db) peak = Math.max(peak, v);
  const thr = Math.max(-50, peak - 35);
  const runs = [];
  let a = -1;
  for (let f = 0; f <= db.length; f++) {
    const quiet = f < db.length && db[f] <= thr;
    if (quiet && a < 0) a = f;
    if (!quiet && a >= 0) { if (a > 0 && f < db.length) runs.push([a * hop, f * hop]); a = -1; }
  }
  const xf = Math.round(0.01 * SR);
  const cuts = runs.filter(([s, e]) => e - s > maxPause).map(([s, e]) => { const m = (s + e) / 2, ex = e - s - maxPause; return [m - ex / 2, m + ex / 2]; });
  if (!cuts.length) return { samples: y, removed: [] };
  const parts = [];
  let pos = 0;
  for (const [cs, ce] of cuts) { parts.push([pos, Math.round(cs * SR)]); pos = Math.round(ce * SR); }
  parts.push([pos, y.length]);
  const out = new Float32Array(parts.reduce((n, [p0, p1]) => n + (p1 - p0), 0) - xf * (parts.length - 1));
  let w = 0;
  parts.forEach(([p0, p1], k) => {
    for (let i = p0; i < p1; i++) {
      const j = i - p0;
      if (k > 0 && j < xf) out[w - xf + j] = out[w - xf + j] * (1 - j / xf) + y[i] * (j / xf);
      else out[w + j - (k > 0 ? xf : 0)] = y[i];
    }
    w += p1 - p0 - (k > 0 ? xf : 0);
  });
  return { samples: out, removed: cuts.map(([cs, ce]) => [r3(cs), r3(ce)]) };
}

/**
 * Speech segments in [from, to): runs of 10 ms frames above max(-50 dBFS, peak - 40 dB), gaps < 120 ms merged.
 * Edge clean-up (v3): eleven_v4 sometimes leaves a short burst (the start of a next sound) or an inhale at the very end
 * of a take, which the plain bounds included (up to 0.55 s of extra tail with a click). A first/last segment is dropped
 * when it is separated by >= 150 ms and is either short (< 0.2 s) or much quieter than the speech (peak 15 dB down).
 */
const TRIM_VERSION = 2;
function speechSegments(x, from = 0, to = x.length / SR) {
  const { db, hopSec } = envelopeDb(x);
  const f0 = Math.floor(from / hopSec), f1 = Math.min(db.length, Math.ceil(to / hopSec));
  let peak = -200;
  for (let f = f0; f < f1; f++) peak = Math.max(peak, db[f]);
  const thr = Math.max(-50, peak - 40);
  const segs = [];
  for (let f = f0; f < f1; f++) {
    if (db[f] <= thr) continue;
    const last = segs.at(-1);
    if (last && (f - last.b) * hopSec < 0.12) { last.b = f + 1; last.peak = Math.max(last.peak, db[f]); }
    else segs.push({ a: f, b: f + 1, peak: db[f] });
  }
  const weak = (sg) => (sg.b - sg.a) * hopSec < 0.2 || sg.peak < peak - 15;
  while (segs.length > 1 && (segs.at(-1).a - segs.at(-2).b) * hopSec >= 0.15 && weak(segs.at(-1))) segs.pop();
  while (segs.length > 1 && (segs[1].a - segs[0].b) * hopSec >= 0.15 && weak(segs[0])) segs.shift();
  return { segs: segs.map((sg) => ({ start: sg.a * hopSec, end: sg.b * hopSec, peak: sg.peak })), peak, thr };
}

/** Trim to LEAD/TAIL around speech; for respaced lines, cut the phrases at the longest silences and place each on k * every * BEAT. */
function master(rawFile, line) {
  const x = decodeMono(rawFile);
  const { segs } = speechSegments(x);
  if (!segs.length) throw new Error(`${line.id}: no speech found`);
  const sb = { start: segs[0].start, end: segs.at(-1).end };
  if (!line.respace) {
    const trimmed = slice(x, sb.start - LEAD, sb.end + TAIL);
    if (!line.tighten) return { samples: trimmed, bounds: sb };
    const t = tightenPauses(trimmed, line.tighten.maxPause);
    return { samples: t.samples, bounds: sb, pausesRemoved: t.removed };
  }
  // phrases = speech split at the (phrases - 1) longest silences
  const gaps = segs.slice(1).map((g, i) => ({ i, len: g.start - segs[i].end, mid: (g.start + segs[i].end) / 2 }));
  const cutsAt = gaps.sort((p, q) => q.len - p.len).slice(0, line.respace.phrases - 1).sort((p, q) => p.mid - q.mid);
  if (cutsAt.length !== line.respace.phrases - 1) throw new Error(`${line.id}: could not find ${line.respace.phrases} phrases`);
  const bounds = [sb.start, ...cutsAt.map((g) => g.mid), sb.end];
  const out = [];
  for (let k = 0; k < line.respace.phrases; k++) {
    const inPhrase = segs.filter((sg) => sg.start >= bounds[k] - 1e-9 && sg.end <= bounds[k + 1] + 1e-9);
    out.push(slice(x, inPhrase[0].start - LEAD, inPhrase.at(-1).end + TAIL));
  }
  let period = line.respace.everyBeats * BEAT;
  const longest = Math.max(...out.slice(0, -1).map((sg) => sg.length / SR));
  while (period < longest + 0.12) period += BEAT; // keep a breath between phrases
  const total = Math.round((period * (out.length - 1)) * SR) + out.at(-1).length;
  const y = new Float32Array(total);
  out.forEach((sg, k) => y.set(sg, Math.round(k * period * SR)));
  return { samples: y, bounds: sb, period, phraseGrid: out.map((_, k) => r3(k * period)) };
}

function compare(script, heard) {
  const a = norm(script), b = norm(heard);
  const exact = a === b;
  const loose = a.replace(/ /g, '') === b.replace(/ /g, ''); // "blockhash" vs "block hash"
  return { ok: exact || loose, exact, script: a, heard: b };
}

async function voiceLine(line, i, { force }) {
  const settings = { ...VOICE.settings, ...(line.settings || {}) };
  const prev = LINES[i - 1]?.say, next = LINES[i + 1]?.say;
  const base = { voice: VOICE.id, model: VOICE.model, format: VOICE.format, settings, say: line.say, prev, next, respace: line.respace };
  const key = hash(base);
  const statePath = W('takes', `${line.id}.json`);
  const state = readJson(statePath);
  if (line.keep && state?.final) return { ...state, final: { ...state.final, scene: line.scene } }; // unchanged line: reuse as-is
  const masterKey = hash({ tighten: line.tighten, trim: TRIM_VERSION });
  if (state && state.key === key && !force && state.final) {
    if ((state.masterKey ?? hash({})) === masterKey) return state;
    // same TTS take, new mastering (e.g. pause tightening): re-master the chosen raw take, re-run QA, re-align
    const chosenAttempt = state.final.qa.chosen;
    const raw = W('takes', `${line.id}.t${chosenAttempt}.raw.mp3`);
    const m = master(raw, line);
    const mastered = W('takes', `${line.id}.t${chosenAttempt}.m${masterKey.slice(0, 6)}.mp3`);
    encodeMp3(m.samples, mastered);
    const sttRes = await eleven.stt(mastered, { languageCode: 'en' });
    usageLog(USAGE, { kind: 'stt', phase: BUDGET.phase, line: line.id, attempt: chosenAttempt, remaster: true, sec: m.samples.length / SR });
    const qa = compare(line.text, sttRes.text);
    console.log(`${line.id} remaster ${qa.ok ? 'OK ' : 'MISMATCH'} heard="${sttRes.text}" removed=${JSON.stringify(m.pausesRemoved || [])}`);
    // a take that never passed (e.g. "Coin spent" heard as "Coins spent" in every take) may stay as it was chosen
    if (!qa.ok && state.final.qa.takes.some((t) => t.ok)) throw new Error(`${line.id}: remastered take failed QA`);
    const takes = [...state.final.qa.takes.map((t) => ({ attempt: t.attempt, qa: { ok: t.ok, exact: t.exact }, heard: t.heard }))];
    const chosen = { attempt: chosenAttempt, mastered, heard: sttRes.text, qa, pausesRemoved: m.pausesRemoved, period: m.period, phraseGrid: m.phraseGrid };
    return finish(line, statePath, { key, masterKey, ...base }, takes, chosen);
  }

  const takes = [];
  for (let attempt = 0; attempt <= BUDGET.retakesPerLine; attempt++) {
    const seed = 2000 + i * 10 + attempt + (force ? 5 : 0);
    const before = usageTotals(USAGE, BUDGET.phase);
    if (before.ttsChars + line.say.length > BUDGET.voChars) throw new Error(`VO budget would be exceeded (${before.ttsChars} used in ${BUDGET.phase})`);
    const r = await eleven.tts(line.say, {
      voiceId: VOICE.id, modelId: VOICE.model, outputFormat: VOICE.format, voiceSettings: settings,
      withTimestamps: true, previousText: prev, nextText: next, seed, languageCode: 'en',
    });
    usageLog(USAGE, { kind: 'tts', phase: BUDGET.phase, line: line.id, attempt, chars: line.say.length, characterCost: r.characterCost, requestId: r.requestId });
    const raw = W('takes', `${line.id}.t${attempt}.raw.mp3`);
    ensureDir(W('takes'));
    writeFileSync(raw, r.audio);
    const m = master(raw, line);
    const mastered = W('takes', `${line.id}.t${attempt}.mp3`);
    encodeMp3(m.samples, mastered);
    const sttRes = await eleven.stt(mastered, { languageCode: 'en' });
    usageLog(USAGE, { kind: 'stt', phase: BUDGET.phase, line: line.id, attempt, sec: m.samples.length / SR });
    const qa = compare(line.text, sttRes.text);
    const take = { attempt, seed, requestId: r.requestId, raw, mastered, heard: sttRes.text, qa, period: m.period, phraseGrid: m.phraseGrid, pausesRemoved: m.pausesRemoved, ttsWords: r.words };
    takes.push(take);
    console.log(`${line.id} t${attempt} ${qa.ok ? 'OK ' : 'MISMATCH'} heard="${sttRes.text}"`);
    if (qa.ok) break;
  }
  const chosen = takes.find((t) => t.qa.ok) || takes.at(-1);
  return finish(line, statePath, { key, masterKey, ...base }, takes, chosen);
}

async function finish(line, statePath, head, takes, chosen) {
  const out = resolve(PATHS.voDir, `${line.id}.mp3`);
  ensureDir(PATHS.voDir);
  copyFileSync(chosen.mastered, out);

  // forced alignment on the shipped file (preferred over the 40 ms-quantised TTS alignment)
  let words, wordSource = 'forced-alignment';
  try {
    const al = await eleven.align(out, line.say);
    usageLog(USAGE, { kind: 'align', phase: BUDGET.phase, line: line.id });
    words = al.words.filter((w) => w.text.trim() !== '').map((w) => ({ text: w.text.trim(), start: r3(w.start), end: r3(w.end) }));
  } catch (e) {
    console.warn(`${line.id}: forced alignment failed (${e.message}); using TTS alignment`);
    wordSource = 'tts-alignment';
    words = chosen.ttsWords.map((w) => ({ text: w.word, start: r3(w.start), end: r3(w.end) })); // pre-trim times: approximate
  }
  const scriptWords = line.text.split(/\s+/);
  if (words.length === scriptWords.length) words = words.map((w, k) => ({ ...w, text: scriptWords[k] }));
  else console.warn(`${line.id}: aligner returned ${words.length} words for ${scriptWords.length} script words`);

  const final = {
    id: line.id, scene: line.scene, text: line.text, say: line.say, file: `${PATHS.voPrefix}/${line.id}.mp3`,
    duration: r3(probeDuration(out)), words, wordSource,
    period: chosen.period, phraseGrid: chosen.phraseGrid, pausesRemoved: chosen.pausesRemoved,
    qa: { takes: takes.map((t) => ({ attempt: t.attempt, ok: t.qa.ok, exact: t.qa.exact, heard: t.heard })), chosen: chosen.attempt },
  };
  const st = { ...head, final };
  writeJson(statePath, st);
  return st;
}

async function main() {
  const a = argv();
  const only = a.only ? new Set(String(a.only).split(',')) : null;
  const retake = a.retake ? new Set(String(a.retake).split(',')) : new Set();
  ensureDir(PATHS.work);
  const manifest = [];
  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    if (only && !only.has(line.id)) {
      const st = readJson(W('takes', `${line.id}.json`));
      if (st?.final) manifest.push(st.final);
      continue;
    }
    const st = await voiceLine(line, i, { force: retake.has(line.id) });
    manifest.push(st.final);
  }
  writeJson(W('vo.json'), { voice: VOICE, lines: manifest });
  const t = usageTotals(USAGE, BUDGET.phase);
  console.log(JSON.stringify({ lines: manifest.length, totalVoSec: r3(manifest.reduce((s, l) => s + l.duration, 0)), usage: { phase: BUDGET.phase, ...t } }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
