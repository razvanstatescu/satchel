// node tools/examples/stt.mjs file.mp3 [--align "exact script text"]  -> transcript words (Scribe) or forced alignment
import { writeFileSync } from 'node:fs';
import { stt, align } from '../lib/eleven.mjs';
import { args } from './args.mjs';
const a = args();
const t0 = Date.now();
const r = a.align ? await align(a._[0], a.align) : await stt(a._[0], { modelId: a.model });
const ms = Date.now() - t0;
if (a.out) writeFileSync(a.out, JSON.stringify(r, null, 1));
const words = (r.words || []).filter((w) => (!w.type || w.type === 'word') && w.text.trim());
console.log(JSON.stringify({ ms, text: r.text, loss: r.loss, words: words.map((w) => `${w.text}@${w.start.toFixed(2)}-${w.end.toFixed(2)}`).join(' ') }));
