#!/usr/bin/env node
// Narrator audition for the Satchel 2.0 film: the same three lines (V01+V02, V17, V19) on eleven_v4 for each candidate.
//   node tools/audio-v3/audition.mjs [--only sarah,chris]
// Writes notes/probe/v3-voice-<name>.mp3 (+ .json with timings) and tools/audio-v3/work/audition.json (metrics:
// speaking rate, pauses, Scribe transcript vs script). Nobody can listen in this pipeline, so the pick is made from the
// voices' labels plus these measurements; the human can compare the samples later and swap VOICE in config.mjs.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { AUDITION, BUDGET, PATHS, VOICE } from './config.mjs';
import { ensureDir, norm, probeDuration, r3, readJson, usageLog, usageTotals, writeJson } from './lib.mjs';

const USAGE = resolve(PATHS.work, 'usage.jsonl');
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? new Set(process.argv[i + 1].split(',')) : null; })();

function metrics(words) {
  const w = words.map((x) => ({ text: x.word ?? x.text, start: x.start, end: x.end }));
  const span = w.at(-1).end - w[0].start;
  const gaps = w.slice(1).map((x, i) => ({ after: w[i].text, gap: x.start - w[i].end }));
  const longPauses = gaps.filter((g) => g.gap > 0.3);
  const speech = span - longPauses.reduce((a, g) => a + g.gap, 0);
  const notEven = w.findIndex((x) => /^not$/i.test(x.text.replace(/[^a-z]/gi, '')) && /^even/i.test(w[w.indexOf(x) + 1]?.text || ''));
  return {
    words: w.length,
    spanSec: r3(span),
    wpmOverall: Math.round((w.length / span) * 60), // including the paragraph pauses between the three lines
    wpmArticulation: Math.round((w.length / speech) * 60), // pauses > 0.3 s removed
    pauses: longPauses.map((g) => `${g.after}|${g.gap.toFixed(2)}`),
    notEvenOurs: notEven >= 0 ? { pauseBefore: r3(w[notEven].start - w[notEven - 1].end), durSec: r3(w[notEven + 2].end - w[notEven].start) } : null,
  };
}

async function main() {
  ensureDir(PATHS.probeDir);
  const out = readJson(resolve(PATHS.work, 'audition.json'), { text: AUDITION.text, model: VOICE.model, settings: VOICE.settings, voices: {} });
  for (const v of AUDITION.voices) {
    if (only && !only.has(v.name)) continue;
    const used = usageTotals(USAGE, BUDGET.phase).ttsChars;
    if (used + AUDITION.text.length > BUDGET.voChars) throw new Error(`VO budget would be exceeded (${used} used)`);
    const r = await eleven.tts(AUDITION.text, {
      voiceId: v.id, modelId: VOICE.model, outputFormat: VOICE.format, voiceSettings: VOICE.settings,
      withTimestamps: true, languageCode: 'en', seed: 4242,
    });
    usageLog(USAGE, { kind: 'tts', phase: BUDGET.phase, audition: v.name, chars: AUDITION.text.length, characterCost: r.characterCost, requestId: r.requestId });
    const file = resolve(PATHS.probeDir, `v3-voice-${v.name}.mp3`);
    writeFileSync(file, r.audio);
    const stt = await eleven.stt(file, { languageCode: 'en' });
    usageLog(USAGE, { kind: 'stt', phase: BUDGET.phase, audition: v.name, sec: probeDuration(file) });
    const m = metrics(r.words);
    const res = {
      id: v.id, why: v.why, file: `notes/probe/v3-voice-${v.name}.mp3`, durationSec: r3(probeDuration(file)),
      ...m, wpmOffTarget: Math.abs(m.wpmOverall - AUDITION.targetWpm),
      heard: stt.text, sttExact: norm(stt.text) === norm(AUDITION.text),
    };
    out.voices[v.name] = res;
    writeJson(resolve(PATHS.probeDir, `v3-voice-${v.name}.json`), { ...res, words: r.words.map((x) => ({ text: x.word, start: r3(x.start), end: r3(x.end) })) });
    console.log(`${v.name.padEnd(7)} ${res.durationSec}s  wpm ${res.wpmOverall} (artic ${res.wpmArticulation})  stt ${res.sttExact ? 'exact' : 'DIFF'}  notEvenOurs ${JSON.stringify(res.notEvenOurs)}  "${stt.text}"`);
  }
  writeJson(resolve(PATHS.work, 'audition.json'), out);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
