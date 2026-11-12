#!/usr/bin/env node
// The bridge line (film v6): Sarah's first words, spoken on the black between the cold open (H0's barrage) and the
// reveal, so the film turns from the industry's problems to Satchel with a sentence instead of a jump cut.
//   node tools/audio-v3/intro-bridge.mjs [--line V00] [--takes 4] [--choose 2]
// Per line: N takes (eleven_v4, the narrator's voice and settings, seeds 7000 + k) -> the vo.mjs trim (40 ms around the
// speech) -> Scribe on each take (must hear the exact words) -> loudness. --choose k ships take k: forced alignment
// (word times for the caption), video/public/v2/vo/<id>.mp3 and the WAV H0 plays (an MP3 starts 25 ms late in Remotion).
// Outputs: tools/audio-v3/work/intro/bridge/<id>.t<k>.{raw.mp3,mp3}, bridge.json; video/public/v2/intro/audio/wav/<id>.wav.
import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { PATHS, VOICE } from './config.mjs';
import { decodeMono, encodeMp3, ensureDir, envelopeDb, norm, probeDuration, r3, readJson, slice, usageLog, usageTotals, writeJson } from './lib.mjs';

const PHASE = 'bridge-v6';
const USAGE = resolve(PATHS.work, 'usage.jsonl');
const WORK = ensureDir(resolve(PATHS.work, 'intro', 'bridge'));
const WAV_DIR = ensureDir(resolve(PATHS.publicDir, 'v2', 'intro', 'audio', 'wav'));
const STATE = resolve(WORK, 'bridge.json');
const BUDGET_CHARS = 400; // this task's cap (TTS bills about 1 credit per character)
const LEAD = 0.04, TAIL = 0.04;

// previous_text / next_text shape the read and are never spoken: the cold open's three captions before it, the film's
// first two lines after it.
const BEFORE = 'Seed phrases get copied. Signatures drain wallets. Signed once. Used later.';
const AFTER = 'Stick it on. Hand it over.';
const LINES = {
  V00: { text: "That's why we built Satchel.", prev: BEFORE, next: AFTER },
};

function argv() {
  const o = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  return o;
}

/** vo.mjs's trim: speech = 10 ms frames above max(−50 dBFS, peak − 40 dB), gaps < 120 ms merged, weak edge bursts dropped. */
function speechBounds(x) {
  const { db, hopSec } = envelopeDb(x);
  let peak = -200;
  for (const v of db) peak = Math.max(peak, v);
  const thr = Math.max(-50, peak - 40);
  const segs = [];
  for (let f = 0; f < db.length; f++) {
    if (db[f] <= thr) continue;
    const last = segs.at(-1);
    if (last && (f - last.b) * hopSec < 0.12) { last.b = f + 1; last.peak = Math.max(last.peak, db[f]); }
    else segs.push({ a: f, b: f + 1, peak: db[f] });
  }
  const weak = (sg) => (sg.b - sg.a) * hopSec < 0.2 || sg.peak < peak - 15;
  while (segs.length > 1 && (segs.at(-1).a - segs.at(-2).b) * hopSec >= 0.15 && weak(segs.at(-1))) segs.pop();
  while (segs.length > 1 && (segs[1].a - segs[0].b) * hopSec >= 0.15 && weak(segs[0])) segs.shift();
  if (!segs.length) return null;
  return { start: segs[0].a * hopSec, end: segs.at(-1).b * hopSec };
}

function loudness(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = (re) => Number((s.match(re) || [])[1]);
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

function toWav(mp3, wav) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', wav]);
  if (r.status !== 0) throw new Error(`ffmpeg wav: ${r.stderr}`);
}

async function takes(id, n) {
  const line = LINES[id];
  if (!line) throw new Error(`no line ${id}`);
  const state = readJson(STATE, {});
  const done = state[id]?.takes ?? [];
  for (let k = done.length; k < n; k++) {
    const used = usageTotals(USAGE, PHASE).ttsChars;
    if (used + line.text.length > BUDGET_CHARS) throw new Error(`bridge budget would be exceeded (${used} chars used)`);
    const seed = 7000 + k;
    const r = await eleven.tts(line.text, {
      voiceId: VOICE.id, modelId: VOICE.model, outputFormat: VOICE.format, voiceSettings: VOICE.settings,
      previousText: line.prev, nextText: line.next, seed, languageCode: 'en',
    });
    usageLog(USAGE, { kind: 'tts', phase: PHASE, line: id, attempt: k, chars: line.text.length, characterCost: r.characterCost, requestId: r.requestId });
    const raw = resolve(WORK, `${id}.t${k}.raw.mp3`);
    writeFileSync(raw, r.audio);
    const x = decodeMono(raw);
    const b = speechBounds(x);
    if (!b) throw new Error(`${id} t${k}: no speech`);
    const mastered = resolve(WORK, `${id}.t${k}.mp3`);
    encodeMp3(slice(x, b.start - LEAD, b.end + TAIL), mastered);
    const heard = (await eleven.stt(mastered, { languageCode: 'en' })).text;
    usageLog(USAGE, { kind: 'stt', phase: PHASE, line: id, attempt: k, sec: probeDuration(mastered) });
    const ok = norm(heard) === norm(line.text);
    const take = { attempt: k, seed, requestId: r.requestId, raw, mastered, duration: r3(probeDuration(mastered)), heard, ok, ...loudness(mastered) };
    done.push(take);
    console.log(`${id} t${k} ${ok ? 'OK ' : 'MISMATCH'} ${take.duration}s ${take.lufs} LUFS heard="${heard}"`);
    writeJson(STATE, { ...state, [id]: { ...line, voice: VOICE, takes: done } });
  }
  return done;
}

async function choose(id, k) {
  const state = readJson(STATE, {});
  const t = state[id]?.takes?.[k];
  if (!t) throw new Error(`${id}: no take ${k}`);
  if (!t.ok) throw new Error(`${id} t${k} failed Scribe ("${t.heard}")`);
  const mp3 = resolve(PATHS.voDir, `${id}.mp3`);
  copyFileSync(t.mastered, mp3);
  const wav = resolve(WAV_DIR, `${id}.wav`);
  toWav(mp3, wav);
  const al = await eleven.align(mp3, LINES[id].text);
  usageLog(USAGE, { kind: 'align', phase: PHASE, line: id });
  const words = al.words.filter((w) => w.text.trim() !== '').map((w) => ({ text: w.text.trim(), start: r3(w.start), end: r3(w.end) }));
  const final = { attempt: k, file: `${PATHS.voPrefix}/${id}.mp3`, wav: `v2/intro/audio/wav/${id}.wav`, duration: r3(probeDuration(wav)), words, lufs: t.lufs, truePeak: t.truePeak };
  writeJson(STATE, { ...state, [id]: { ...state[id], final } });
  console.log(JSON.stringify(final));
}

async function main() {
  const a = argv();
  const id = a.line ?? 'V00';
  if (a.choose !== undefined) return choose(id, Number(a.choose));
  await takes(id, Number(a.takes ?? 4));
  console.log(JSON.stringify({ usage: usageTotals(USAGE, PHASE) }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
