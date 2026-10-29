// node tools/examples/music.mjs "prompt" --ms 15000 [--plan] [--instrumental] [--model music_v1] [--format mp3_44100_128] [--out music.mp3]
// --plan: first POST /v1/music/plan (saved as <out>.plan.json), then compose from the plan (sections drive timing).
import { writeFileSync } from 'node:fs';
import { music, musicPlan } from '../lib/eleven.mjs';
import { args } from './args.mjs';
const a = args();
const out = a.out || 'music.mp3';
let buf;
if (a.plan) {
  const t0 = Date.now();
  const plan = await musicPlan(a._[0], Number(a.ms || 15000), { modelId: a.model });
  writeFileSync(out.replace(/\.\w+$/, '') + '.plan.json', JSON.stringify(plan, null, 1));
  console.log(`plan in ${Date.now() - t0} ms: ${plan.sections?.map((s) => `${s.section_name}:${s.duration_ms}`).join(', ')}`);
  buf = await music({ compositionPlan: plan, modelId: a.model, outputFormat: a.format, respectSectionsDurations: true });
} else {
  buf = await music({ prompt: a._[0], lengthMs: Number(a.ms || 15000), forceInstrumental: !!a.instrumental, modelId: a.model, outputFormat: a.format });
}
writeFileSync(out, buf);
console.log(JSON.stringify({ out, bytes: buf.length, ...buf.meta }));
