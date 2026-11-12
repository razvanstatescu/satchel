// Generate raw SFX with ElevenLabs into tools/sfx2/_raw/ (Satchel 2.0 library).
//   node tools/sfx2/generate.mjs                 # generate any missing raw files
//   node tools/sfx2/generate.mjs --regen a,b     # one regeneration each (saved as <name>.v2.mp3)
//   node tools/sfx2/generate.mjs --sources       # helper sources for composites (_raw/src-<name>.mp3)
//   add --set intro to any of these for the v5 cold-open set (specs-intro.mjs, raw files in _raw/intro/)
// Keys come from env.mjs via eleven.mjs; never printed. Costs are appended to tools/sfx2/gen-log.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sfx } from '../lib/eleven.mjs';
import { loadEnv } from '../lib/env.mjs';
import { SPECS as LIBRARY_SPECS, SOURCES } from './specs.mjs';
import { INTRO_SPECS } from './specs-intro.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const si = process.argv.indexOf('--set');
const SET = si > 0 ? process.argv[si + 1] : 'library';
if (!['library', 'intro'].includes(SET)) throw new Error(`unknown --set ${SET}`);
const SPECS = SET === 'intro' ? INTRO_SPECS : LIBRARY_SPECS;
const RAW = SET === 'intro' ? resolve(here, '_raw/intro') : resolve(here, '_raw');
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
  const entry = { set: SET, name: s.name, version: isRegen ? 2 : 1, prompt, durationSeconds, bytes: buf.length,
    characterCost: buf.meta.characterCost, requestId: buf.meta.requestId, at: new Date().toISOString() };
  log.push(entry);
  writeFileSync(LOG, JSON.stringify(log, null, 2));
  console.log(`${s.name}${isRegen ? ' (v2)' : ''}: ${durationSeconds}s cost=${entry.characterCost} ${buf.meta.ms}ms`);
}
// helper sources for composites (only with --sources)
if (process.argv.includes('--sources')) {
  for (const s of SOURCES) {
    const out = resolve(RAW, `src-${s.name}.mp3`);
    if (existsSync(out)) continue;
    const buf = await sfx(s.prompt, { durationSeconds: s.gen, promptInfluence: s.influence ?? 0.6 });
    writeFileSync(out, buf);
    log.push({ name: `src-${s.name}`, version: 'src', prompt: s.prompt, durationSeconds: s.gen, bytes: buf.length,
      characterCost: buf.meta.characterCost, requestId: buf.meta.requestId, at: new Date().toISOString() });
    writeFileSync(LOG, JSON.stringify(log, null, 2));
    console.log(`src-${s.name}: ${s.gen}s cost=${buf.meta.characterCost}`);
  }
}
console.log('total cost so far:', log.reduce((a, e) => a + (e.characterCost || 0), 0),
  `(set ${SET}: ${log.filter((e) => (e.set ?? 'library') === SET).reduce((a, e) => a + (e.characterCost || 0), 0)})`);
