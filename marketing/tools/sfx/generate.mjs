// Generate raw SFX with ElevenLabs into tools/sfx/_raw/.
//   node tools/sfx/generate.mjs                 # generate any missing raw files
//   node tools/sfx/generate.mjs --regen a,b     # one regeneration each (saved as <name>.v2.mp3)
// Keys come from env.mjs via eleven.mjs; never printed. Costs are appended to tools/sfx/gen-log.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sfx } from '../lib/eleven.mjs';
import { loadEnv } from '../lib/env.mjs';
import { SPECS } from './specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(here, '_raw');
const LOG = resolve(here, 'gen-log.json');
loadEnv(['ELEVENLABS_API_KEY']);

const i = process.argv.indexOf('--regen');
const regen = i > 0 ? process.argv[i + 1].split(',') : [];
const prompts = {}; // optional prompt overrides for regenerations: --prompt-file overrides.json
const pf = process.argv.indexOf('--prompt-file');
if (pf > 0) Object.assign(prompts, JSON.parse(readFileSync(process.argv[pf + 1], 'utf8')));

const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : [];
for (const s of SPECS) {
  const isRegen = regen.includes(s.name);
  const out = resolve(RAW, `${s.name}${isRegen ? '.v2' : ''}.mp3`);
  if (existsSync(out)) continue;
  if (!isRegen && regen.length) continue;
  const o = isRegen ? (prompts[s.name] ?? {}) : {};
  const prompt = o.prompt ?? s.prompt;
  const durationSeconds = Math.max(0.5, o.gen ?? s.gen ?? s.dur);
  const buf = await sfx(prompt, { durationSeconds, promptInfluence: o.influence ?? s.influence ?? 0.6 });
  writeFileSync(out, buf);
  const entry = { name: s.name, version: isRegen ? 2 : 1, prompt, durationSeconds, bytes: buf.length,
    characterCost: buf.meta.characterCost, requestId: buf.meta.requestId, at: new Date().toISOString() };
  log.push(entry);
  writeFileSync(LOG, JSON.stringify(log, null, 2));
  console.log(`${s.name}${isRegen ? ' (v2)' : ''}: ${durationSeconds}s cost=${entry.characterCost} ${buf.meta.ms}ms`);
}
console.log('total cost so far:', log.reduce((a, e) => a + (e.characterCost || 0), 0));
