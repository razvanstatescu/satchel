// U1 (use cases) plates: generate drafts/finals and catalogue them (append-only).
//   node tools/images/u1.mjs gen uc-sell uc-gift uc-treasury --quality medium --tag d1 [--out <dir>] [--extra "addendum"]
//       → <out>/<name>-<tag>-<quality>.png (default out: tools/images/raw), one line per call in gen-log.jsonl.
//   node tools/images/u1.mjs final uc-sell=<raw.png> [uc-gift=<raw.png> …] [--extra-uc-sell "addendum used"]
//       → crops the centre 1920×1080, writes video/public/images/<name>.jpg (JPEG q92, sips), and adds/refreshes ONLY
//         the U1 keys in video/src/data/images.json (every other entry is left untouched).
// Keys come from tools/lib/env.mjs inside openai-image.mjs and are never printed.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../lib/openai-image.mjs';
import { args } from '../examples/args.mjs';
import { STYLE, U1_NOTES, U1_SHOTS } from './u1-shots.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../video/public');
const catalogPath = resolve(here, '../../video/src/data/images.json');
const a = args();
const [cmd, ...rest] = a._;

const fullPrompt = (name, extra) => `${U1_SHOTS[name].prompt}${extra ? ' ' + extra : ''} ${STYLE}`;

async function gen() {
  const quality = a.quality || 'medium';
  const out = resolve(a.out || join(here, 'raw'));
  mkdirSync(out, { recursive: true });
  await Promise.all(rest.map(async (name) => {
    const s = U1_SHOTS[name];
    if (!s) throw new Error(`unknown shot ${name}`);
    const t0 = Date.now();
    try {
      const [buf] = await generate({ prompt: fullPrompt(name, a.extra), model: a.model || s.model, size: a.size || s.size, quality, outputFormat: 'png' });
      const file = join(out, `${name}${a.tag ? '-' + a.tag : ''}-${quality}.png`);
      writeFileSync(file, buf);
      appendFileSync(join(here, 'gen-log.jsonl'), JSON.stringify({ t: new Date().toISOString(), name, tag: a.tag, quality, model: a.model || s.model, size: a.size || s.size, file, ms: Date.now() - t0 }) + '\n');
      console.log(`ok ${name} ${quality} ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${file}`);
    } catch (e) {
      appendFileSync(join(here, 'gen-log.jsonl'), JSON.stringify({ t: new Date().toISOString(), name, quality, error: String(e.message).slice(0, 200) }) + '\n');
      console.log(`FAIL ${name}: ${String(e.message).slice(0, 200)}`);
    }
  }));
}

const dims = (f) => {
  const o = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f], { encoding: 'utf8' });
  return { w: Number(o.match(/pixelWidth: (\d+)/)[1]), h: Number(o.match(/pixelHeight: (\d+)/)[1]) };
};

function final() {
  const done = {};
  for (const pair of rest) {
    const [name, raw] = pair.split('=');
    if (!U1_SHOTS[name] || !raw) throw new Error(`usage: final <name>=<raw.png> (got ${pair})`);
    const src = resolve(raw);
    const { w, h } = dims(src);
    const tmp = join(dirname(src), `${name}-crop.png`);
    // centre crop to 16:9 at 1920 × 1080, then JPEG at quality 92
    execFileSync('sips', ['-c', String(Math.min(h, Math.round((w * 9) / 16))), String(w), src, '--out', tmp], { stdio: 'pipe' });
    if (w !== 1920) execFileSync('sips', ['-z', '1080', '1920', tmp, '--out', tmp], { stdio: 'pipe' });
    const file = `images/${name}.jpg`;
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', tmp, '--out', resolve(pub, file)], { stdio: 'pipe' });
    const d = dims(resolve(pub, file));
    done[name] = {
      file, w: d.w, h: d.h,
      model: U1_SHOTS[name].model,
      prompt: fullPrompt(name, a[`extra-${name}`]),
      safeTextArea: U1_NOTES[name]?.safeTextArea ?? '',
      notes: U1_NOTES[name]?.notes ?? '',
    };
    console.log(`ok ${file} ${d.w}x${d.h}`);
  }
  // read-modify-write right now (other builders may have appended since): only our keys change
  const cat = JSON.parse(readFileSync(catalogPath, 'utf8'));
  for (const [k, v] of Object.entries(done)) cat[k] = v;
  const tmpCat = `${catalogPath}.u1tmp`;
  writeFileSync(tmpCat, JSON.stringify(cat, null, 2) + '\n');
  renameSync(tmpCat, catalogPath);
  console.log('catalogued', Object.keys(done).join(', '), `(${Object.keys(cat).length} entries)`);
}

function notes() {
  // refresh only the notes/safeTextArea of U1 entries already in the catalogue
  const cat = JSON.parse(readFileSync(catalogPath, 'utf8'));
  for (const k of Object.keys(U1_SHOTS)) {
    if (!cat[k]) continue;
    cat[k].safeTextArea = U1_NOTES[k]?.safeTextArea ?? cat[k].safeTextArea;
    cat[k].notes = U1_NOTES[k]?.notes ?? cat[k].notes;
  }
  const tmpCat = `${catalogPath}.u1tmp`;
  writeFileSync(tmpCat, JSON.stringify(cat, null, 2) + '\n');
  renameSync(tmpCat, catalogPath);
  console.log('notes refreshed');
}

if (cmd === 'gen') await gen();
else if (cmd === 'final') final();
else if (cmd === 'notes') notes();
else console.log('usage: node tools/images/u1.mjs gen|final|notes …');
