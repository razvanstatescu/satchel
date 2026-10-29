// Generate plates from shots.mjs.
//   node tools/images/gen.mjs <name> [<name>...] --quality medium|high --out <dir> [--tag v2] [--extra "prompt addendum"]
// Writes <dir>/<name>[-tag]-<quality>.png and appends a line to tools/images/gen-log.jsonl (no keys, ever).
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../lib/openai-image.mjs';
import { args } from '../examples/args.mjs';
import { SHOTS, STYLE } from './shots.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const a = args();
const quality = a.quality || 'medium';
const out = resolve(a.out || join(here, 'raw'));
mkdirSync(out, { recursive: true });

await Promise.all(a._.map(async (name) => {
  const s = SHOTS[name];
  if (!s) throw new Error(`unknown shot ${name}`);
  const prompt = `${s.prompt}${a.extra ? ' ' + a.extra : ''} ${STYLE}`;
  const t0 = Date.now();
  try {
    const [buf] = await generate({ prompt, model: a.model || s.model, size: a.size || s.size, quality, background: s.background, outputFormat: 'png' });
    const file = join(out, `${name}${a.tag ? '-' + a.tag : ''}-${quality}.png`);
    writeFileSync(file, buf);
    appendFileSync(join(here, 'gen-log.jsonl'), JSON.stringify({ t: new Date().toISOString(), name, tag: a.tag, quality, model: a.model || s.model, size: a.size || s.size, file, usage: buf && buf.length ? undefined : null, ms: Date.now() - t0 }) + '\n');
    console.log(`ok ${name} ${quality} ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${file}`);
  } catch (e) {
    appendFileSync(join(here, 'gen-log.jsonl'), JSON.stringify({ t: new Date().toISOString(), name, quality, error: String(e.message).slice(0, 200) }) + '\n');
    console.log(`FAIL ${name}: ${String(e.message).slice(0, 200)}`);
  }
}));
