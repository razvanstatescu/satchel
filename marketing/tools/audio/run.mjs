#!/usr/bin/env node
// One command for the whole audio pipeline (run from anywhere):
//   node tools/audio/run.mjs           VO (cached per line; voice/model/text changes re-voice) -> QA -> timeline
//   node tools/audio/run.mjs --music   ...then re-compose the score from the new timeline (1 music generation)
// To swap the narrator, edit VOICE in tools/audio/config.mjs and re-run.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const step = (file, args = []) => {
  console.log(`\n== ${file} ${args.join(' ')}`);
  const r = spawnSync('node', [resolve(here, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
step('vo.mjs', process.argv.slice(2).filter((a) => a !== '--music'));
step('timeline.mjs');
if (process.argv.includes('--music')) step('music.mjs');

// Guard: the score is a hand-made bar-aligned edit of one music take (tools/audio/arrangement.json). If new VO moved
// the scene grid, say so loudly instead of silently shipping a score that no longer hits the cuts.
import { readFileSync } from 'node:fs';
const tl = JSON.parse(readFileSync(resolve(here, '../../video/src/data/timeline.json'), 'utf8'));
import { existsSync } from 'node:fs';
if (!existsSync(resolve(here, 'arrangement.json'))) { console.log('\nNo score arrangement (tools/audio/arrangement.json): the score is the raw take, or not made yet.'); process.exit(0); }
const arr = JSON.parse(readFileSync(resolve(here, 'arrangement.json'), 'utf8'));
const drift = [
  ['durationSec', tl.durationSec, arr.durationSec],
  ...Object.entries(arr.markers || {}).map(([k, v]) => [k, tl.markers[k], v]),
].filter(([, a, b]) => a !== b);
if (drift.length) console.warn(`\nWARNING: timeline no longer matches the score arrangement: ${drift.map(([k, a, b]) => `${k} ${a} vs ${b}`).join(', ')}.\nRe-edit tools/audio/arrangement.json and run python3 tools/audio/arrange.py && node tools/audio/music.mjs --analyze (or --music for a new take).`);
else console.log('\nScore arrangement matches the timeline (duration, sub hit, drop, stitch).');
