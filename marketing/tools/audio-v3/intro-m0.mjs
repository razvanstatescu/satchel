#!/usr/bin/env node
// M0, the cold open's music bed (scene H0, before H1): one Eleven Music take, edited on bar lines into 3 / 3.5 / 4-bar
// variants that end with a hard stop (the cut to black). The film's own score (H1's glockenspiel pickup, a G major
// chord) is untouched; M0 is in G minor so the relief at H1 is the parallel major.
//   node tools/audio-v3/intro-m0.mjs --generate     one generation (refuses a second unless --again)
//   node tools/audio-v3/intro-m0.mjs --analyze      bar-by-bar analysis of the raw take
// The edit lists live in tools/audio-v3/intro/m0-*.json and are rendered with arrange.py (same splice/crossfade rules).
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as eleven from '../lib/eleven.mjs';
import { PATHS } from './config.mjs';
import { decodeMono, ensureDir, envelopeDb, r3, readJson, usageLog, usageTotals, writeJson } from './lib.mjs';

const PHASE = 'intro-v6';
const USAGE = resolve(PATHS.work, 'usage.jsonl');
const DIR = ensureDir(resolve(PATHS.work, 'intro'));
const RAW = resolve(DIR, 'm0.raw.mp3');
const SEED = 909;

const PLAN = {
  positive_global_styles: [
    '120 BPM', '4/4', 'instrumental', 'dark modern trailer and glitch hybrid', 'G minor', 'deep sub bass pulse',
    'ticking closed hi-hats', 'glitchy bit-crushed percussion', 'tense staccato synth stabs', 'cinematic tension',
    'tight, punchy modern mix', 'continuous, no gaps',
  ],
  negative_global_styles: [
    'melody', 'bright', 'major key', 'vocals', 'choir', 'piano', 'glockenspiel', 'EDM drop', 'dubstep wobble',
    'tempo changes', 'swing', 'lo-fi', 'long silent gaps', 'fade in',
  ],
  sections: [
    { section_name: 'Pulse', positive_local_styles: ['only a deep sub pulse on every beat and ticking closed hi-hats on sixteenths', 'sparse, tense and dark', 'starts on the very first beat'], negative_local_styles: ['drums', 'synth stabs', 'fade in'], duration_ms: 4000, lines: [] },
    { section_name: 'Glitch build', positive_local_styles: ['glitchy bit-crushed percussion enters', 'tense staccato synth stabs on the offbeats', 'building'], negative_local_styles: ['melody', 'release'], duration_ms: 4000, lines: [] },
    { section_name: 'Glitch build 2', positive_local_styles: ['denser glitch percussion and digital stutters', 'synth stabs on every beat', 'low toms', 'building harder'], negative_local_styles: ['melody', 'breakdown'], duration_ms: 4000, lines: [] },
    { section_name: 'Peak', positive_local_styles: ['full intensity: driving trailer percussion, distorted sub, stabs', 'a riser climbing on top'], negative_local_styles: ['release', 'drop', 'breakdown'], duration_ms: 4000, lines: [] },
    { section_name: 'Riser top', positive_local_styles: ['everything at its peak, the riser climbing to its very top', 'relentless'], negative_local_styles: ['fade', 'release', 'drop', 'silence'], duration_ms: 4000, lines: [] },
  ],
};

async function generate() {
  const done = usageTotals(USAGE, PHASE).music;
  if (done >= 1 && !process.argv.includes('--again')) throw new Error(`M0 already generated (${done}); pass --again for a second take`);
  const before = await eleven.subscription();
  const buf = await eleven.music({ compositionPlan: PLAN, respectSectionsDurations: true, outputFormat: 'mp3_44100_192', modelId: 'music_v1', seed: SEED + done, timeoutMs: 290_000 });
  const after = await eleven.subscription();
  usageLog(USAGE, { kind: 'music', phase: PHASE, model: 'music_v1', seconds: 20, seed: SEED + done, creditsDelta: after.character_count - before.character_count, requestId: buf.meta?.requestId });
  writeFileSync(done ? RAW.replace('.raw', `.raw${done + 1}`) : RAW, buf);
  writeJson(resolve(DIR, 'm0.plan.json'), PLAN);
  console.log(JSON.stringify({ raw: RAW, bytes: buf.length, creditsDelta: after.character_count - before.character_count }));
}

function analyze(file = RAW) {
  const beatsOut = file.replace(/\.mp3$/, '.beats.json');
  const r = spawnSync('node', [resolve(PATHS.marketing, 'tools/beats.mjs'), file, '--bpm', '120', '--fps', '30', '--out', beatsOut], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  const b = readJson(beatsOut);
  const x = decodeMono(file);
  const { db } = envelopeDb(x, 0.25);
  const prof = Array.from(db, (v) => Math.round(v));
  console.log(JSON.stringify({ duration: b.duration, bpmGrid: b.bpmGrid, gridOffset: b.gridOffset, gridRmsMs: b.gridRmsMs, downbeats: b.downbeats.slice(0, 12) }));
  let s = '';
  for (let i = 0; i < prof.length; i++) { if (i % 8 === 0) s += `\n${(i / 4).toFixed(0).padStart(4)}s `; s += String(prof[i]).padStart(5); }
  console.log(s);
}

if (process.argv.includes('--generate')) await generate();
if (process.argv.includes('--analyze')) analyze(process.argv[process.argv.indexOf('--analyze') + 1]?.endsWith('.mp3') ? resolve(process.argv[process.argv.indexOf('--analyze') + 1]) : RAW);
