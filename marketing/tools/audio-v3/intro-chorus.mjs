#!/usr/bin/env node
// The cold open's news-voice chorus (scene H0): short VERBATIM fragments of the real plates (marketing/video/public/v2/
// intro/plates/plates.json), each read by one of four generic ElevenLabs library voices (never the film's narrator).
//   node tools/audio-v3/intro-chorus.mjs [--only F01,F02]
// Per fragment: TTS (eleven_v4) -> tight trim -> dry mp3 + a TV-speaker variant (300-3400 Hz band, light saturation) ->
// Scribe on both -> retake (<= 2) if the words don't transcribe -> loudness for the cue sheet.
// Outputs: video/public/v2/intro/audio/chorus/<id>-dry.mp3, <id>-tv.mp3; tools/audio-v3/work/intro/chorus.json.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { PATHS } from './config.mjs';
import { SR, decodeMono, encodeMp3, ensureDir, envelopeDb, probeDuration, r3, readJson, slice, usageLog, usageTotals, writeJson } from './lib.mjs';

const PHASE = 'intro-v6';
const USAGE = resolve(PATHS.work, 'usage.jsonl');
const WORK = ensureDir(resolve(PATHS.work, 'intro', 'chorus'));
const OUT = ensureDir(resolve(PATHS.publicDir, 'v2', 'intro', 'audio', 'chorus'));
const BUDGET_CHARS = 1500; // the chorus's share of the task's 5,000-credit cap (TTS bills about 1 credit per character)

// Generic premade library voices (ElevenLabs' own), none of them the narrator (Sarah) and none a clone of a public figure.
const VOICES = {
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel - Steady Broadcaster (British, male)' },
  matilda: { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda - Knowledgable, Professional (American, female)' },
  bill: { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill - Wise, Mature, Balanced (American, male)' },
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice - Clear, Engaging Educator (British, female)' },
};
const SETTINGS = { stability: 0.5, similarity_boost: 0.8 };
const CONTEXT = 'Breaking news tonight.'; // previous_text only: sets a broadcast read, never spoken

// text = the words as they stand on the plate (a contiguous run, or one with words dropped); say = what is read aloud
// (pronunciation only). T2-09's post spells "musked"; it is read as "masked".
export const FRAGMENTS = [
  { id: 'F01', plate: 'T1-01', voice: 'daniel', text: 'seed phrases in LastPass' },
  { id: 'F02', plate: 'T1-01', voice: 'matilda', text: 'your funds might be at risk' },
  { id: 'F03', plate: 'T1-04', voice: 'bill', text: 'private key information was inadvertently transmitted' },
  { id: 'F04', plate: 'T2-12', voice: 'alice', text: 'after signing a "permit" phishing signature' },
  { id: 'F05', plate: 'T2-01', voice: 'daniel', text: 'A victim lost $908,551' },
  { id: 'F06', plate: 'T2-01', voice: 'matilda', text: 'a phishing approval signed 458 days ago' },
  { id: 'F07', plate: 'T2-07', voice: 'bill', text: '32 users thus far have signed a malicious payload' },
  { id: 'F08', plate: 'T2-09', voice: 'alice', text: 'all the signers saw the musked UI', say: 'all the signers saw the masked UI' },
  { id: 'F09', plate: 'T2-10', voice: 'daniel', text: 'Hackers steal $1.5 billion' },
  { id: 'F10', plate: 'T4-01h', voice: 'matilda', text: 'Wallet Drainers Drain $494 Million' },
  { id: 'F11', plate: 'T2-18', voice: 'bill', text: 'drain more than $270 million from Drift' },
  { id: 'F12', plate: 'T1-07', voice: 'alice', text: '$7 Million Crypto Loss via Malicious Code' },
  { id: 'F13', plate: 'T1-05', voice: 'bill', text: 'new crypto-stealing Trojan' },
].map((f) => ({ ...f, say: f.say ?? f.text }));

/** Spelled-out English numbers -> digits ("two hundred and seventy million" -> "270 million", "thirty-two" -> "32"). */
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
function wordsToDigits(text) {
  const toks = text.toLowerCase().replace(/-/g, ' ').split(/\s+/);
  const out = [];
  for (let i = 0; i < toks.length; ) {
    let j = i, cur = 0, total = 0, any = false;
    while (j < toks.length) {
      const w = toks[j].replace(/[^a-z]/g, '');
      if (w in UNITS) { cur += UNITS[w]; any = true; } else if (w === 'hundred' && any) { cur *= 100; } else if (w === 'thousand' && any) { total += cur * 1000; cur = 0; } else if (w === 'and' && any && j + 1 < toks.length && toks[j + 1].replace(/[^a-z]/g, '') in UNITS) { /* "two hundred and seventy" */ } else break;
      j++;
    }
    if (any) { out.push(String(total + cur)); i = j; } else { out.push(toks[i]); i++; }
  }
  return out.join(' ');
}
// Words Scribe cannot tell apart by sound: accepted as the same word (the read is right, the spelling is a guess).
const HOMOPHONES = [[/\bfishing\b/g, 'phishing']];

/** Canonical words for the STT check: case, punctuation, "$", "dollars", thousands commas, hyphens and spelled-out
 *  numbers don't count. */
const canon = (s0) => HOMOPHONES.reduce((t, [re, w]) => t.replace(re, w), wordsToDigits(s0)).toLowerCase().replace(/[’']/g, '').replace(/(\d),(\d)/g, '$1$2').replace(/\$/g, '').replace(/\bdollars?\b/g, '')
  .replace(/-/g, ' ').replace(/[^a-z0-9. ]+/g, ' ').replace(/\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
const matches = (want, heard) => { const a = canon(want), b = canon(heard); return a === b || a.replace(/ /g, '') === b.replace(/ /g, ''); };

/** Tight trim: speech runs above max(-50 dBFS, peak - 40 dB), merged over 120 ms gaps, edge bursts/breaths dropped. */
function tightTrim(x, lead = 0.01, tail = 0.06) {
  const { db, hopSec } = envelopeDb(x);
  let peak = -200;
  for (const v of db) peak = Math.max(peak, v);
  const thr = Math.max(-50, peak - 40);
  const segs = [];
  for (let f = 0; f < db.length; f++) {
    if (db[f] <= thr) continue;
    const last = segs.at(-1);
    if (last && (f - last.b) * hopSec < 0.12) { last.b = f + 1; last.peak = Math.max(last.peak, db[f]); } else segs.push({ a: f, b: f + 1, peak: db[f] });
  }
  const weak = (sg) => (sg.b - sg.a) * hopSec < 0.2 || sg.peak < peak - 15;
  while (segs.length > 1 && (segs.at(-1).a - segs.at(-2).b) * hopSec >= 0.15 && weak(segs.at(-1))) segs.pop();
  while (segs.length > 1 && (segs[1].a - segs[0].b) * hopSec >= 0.15 && weak(segs[0])) segs.shift();
  return slice(x, segs[0].a * hopSec - lead, segs.at(-1).b * hopSec + tail, { fadeIn: 0.003, fadeOut: 0.015 });
}

function tvVariant(dry, out) {
  // a small TV speaker: 4th-order band 300-3400 Hz, a little tanh saturation, then back to a sane level
  const af = 'highpass=f=300,highpass=f=300,lowpass=f=3400,lowpass=f=3400,volume=9dB,asoftclip=type=tanh,volume=-5dB';
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', dry, '-af', af, '-ar', String(SR), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
  if (r.status !== 0) throw new Error(`ffmpeg tv: ${r.stderr}`);
}

function loudness(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const txt = r.stderr;
  const I = Number(txt.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1)?.match(/-?[\d.]+/)[0]);
  const peak = Number(txt.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.at(-1)?.match(/-?[\d.]+/)[0]);
  const M = Math.max(...[...txt.matchAll(/ M:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => v > -70));
  return { integratedLufs: I, momentaryMaxLufs: +M.toFixed(1), truePeakDb: peak };
}

async function voiceFragment(f, i) {
  const state = readJson(resolve(WORK, `${f.id}.json`));
  if (state?.ok && state.say === f.say && state.voice === f.voice) return state;
  const takes = [];
  for (let attempt = 0; attempt <= 2; attempt++) {
    const used = usageTotals(USAGE, PHASE).ttsChars;
    if (used + f.say.length > BUDGET_CHARS) throw new Error(`chorus budget would be exceeded (${used} used)`);
    const r = await eleven.tts(f.say, {
      voiceId: VOICES[f.voice].id, modelId: 'eleven_v4', outputFormat: 'mp3_44100_128', voiceSettings: SETTINGS,
      withTimestamps: true, languageCode: 'en', previousText: CONTEXT, seed: 6100 + i * 10 + attempt,
    });
    usageLog(USAGE, { kind: 'tts', phase: PHASE, line: f.id, attempt, chars: f.say.length, characterCost: r.characterCost, requestId: r.requestId });
    const raw = resolve(WORK, `${f.id}.t${attempt}.raw.mp3`);
    writeFileSync(raw, r.audio);
    const dry = resolve(WORK, `${f.id}.t${attempt}.dry.mp3`);
    encodeMp3(tightTrim(decodeMono(raw)), dry);
    const tv = resolve(WORK, `${f.id}.t${attempt}.tv.mp3`);
    tvVariant(dry, tv);
    const heardDry = (await eleven.stt(dry, { languageCode: 'en' })).text;
    const heardTv = (await eleven.stt(tv, { languageCode: 'en' })).text;
    usageLog(USAGE, { kind: 'stt', phase: PHASE, line: f.id, attempt, sec: 2 * probeDuration(dry) });
    const ok = matches(f.say, heardDry) && matches(f.say, heardTv);
    takes.push({ attempt, dry, tv, heardDry, heardTv, ok });
    console.log(`${f.id} t${attempt} ${ok ? 'OK ' : 'MISMATCH'} dry="${heardDry}" tv="${heardTv}"`);
    if (ok) break;
  }
  const chosen = takes.find((t) => t.ok) || takes[0];
  const outDry = resolve(OUT, `${f.id}-dry.mp3`), outTv = resolve(OUT, `${f.id}-tv.mp3`);
  writeFileSync(outDry, readFileBuf(chosen.dry));
  writeFileSync(outTv, readFileBuf(chosen.tv));
  const st = {
    ...f, voiceLabel: VOICES[f.voice].label, ok: chosen.ok, chosen: chosen.attempt,
    files: { dry: `v2/intro/audio/chorus/${f.id}-dry.mp3`, tv: `v2/intro/audio/chorus/${f.id}-tv.mp3` },
    durationSec: r3(probeDuration(outDry)), heard: { dry: chosen.heardDry, tv: chosen.heardTv },
    loudness: { dry: loudness(outDry), tv: loudness(outTv) },
    takes: takes.map((t) => ({ attempt: t.attempt, ok: t.ok, heardDry: t.heardDry, heardTv: t.heardTv })),
  };
  writeJson(resolve(WORK, `${f.id}.json`), st);
  return st;
}

import { readFileSync } from 'node:fs';
const readFileBuf = (p) => readFileSync(p);

/** Re-check the saved transcripts with the current matcher and re-pick the takes (no TTS, no STT). */
function reselect(f) {
  const st = readJson(resolve(WORK, `${f.id}.json`));
  if (!st) return null;
  const takes = st.takes.map((t) => ({ ...t, ok: matches(f.say, t.heardDry) && matches(f.say, t.heardTv), dry: resolve(WORK, `${f.id}.t${t.attempt}.dry.mp3`), tv: resolve(WORK, `${f.id}.t${t.attempt}.tv.mp3`) }));
  const chosen = takes.find((t) => t.ok) || takes[0];
  const outDry = resolve(OUT, `${f.id}-dry.mp3`), outTv = resolve(OUT, `${f.id}-tv.mp3`);
  writeFileSync(outDry, readFileBuf(chosen.dry));
  writeFileSync(outTv, readFileBuf(chosen.tv));
  const next = {
    ...st, ok: chosen.ok, chosen: chosen.attempt, durationSec: r3(probeDuration(outDry)),
    heard: { dry: chosen.heardDry, tv: chosen.heardTv }, loudness: { dry: loudness(outDry), tv: loudness(outTv) },
    takes: takes.map((t) => ({ attempt: t.attempt, ok: t.ok, heardDry: t.heardDry, heardTv: t.heardTv })),
  };
  writeJson(resolve(WORK, `${f.id}.json`), next);
  console.log(`${f.id} -> t${chosen.attempt} ${chosen.ok ? 'OK' : 'STILL MISMATCH'}`);
  return next;
}

async function main() {
  if (process.argv.includes('--reselect')) {
    const all = FRAGMENTS.map(reselect).filter(Boolean);
    writeJson(resolve(PATHS.work, 'intro', 'chorus.json'), { voices: VOICES, settings: SETTINGS, context: CONTEXT, fragments: all });
    return;
  }
  const only = (() => { const k = process.argv.indexOf('--only'); return k > 0 ? new Set(process.argv[k + 1].split(',')) : null; })();
  const all = [];
  for (const [i, f] of FRAGMENTS.entries()) {
    if (only && !only.has(f.id)) { const st = readJson(resolve(WORK, `${f.id}.json`)); if (st) all.push(st); continue; }
    all.push(await voiceFragment(f, i));
  }
  writeJson(resolve(PATHS.work, 'intro', 'chorus.json'), { voices: VOICES, settings: SETTINGS, context: CONTEXT, fragments: all });
  console.log(JSON.stringify({ fragments: all.length, ok: all.filter((s) => s.ok).length, usage: usageTotals(USAGE, PHASE) }));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
