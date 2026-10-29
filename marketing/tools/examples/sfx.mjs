// node tools/examples/sfx.mjs "deep cinematic whoosh" --duration 1.2 [--influence 0.5] [--loop] [--model eleven_text_to_sound_v2] [--format mp3_44100_128] [--out sfx.mp3]
import { writeFileSync } from 'node:fs';
import { sfx } from '../lib/eleven.mjs';
import { args } from './args.mjs';
const a = args();
const buf = await sfx(a._[0], { durationSeconds: a.duration ? Number(a.duration) : undefined, promptInfluence: a.influence ? Number(a.influence) : undefined,
  loop: a.loop ? true : undefined, modelId: a.model, outputFormat: a.format });
writeFileSync(a.out || 'sfx.mp3', buf);
console.log(JSON.stringify({ out: a.out || 'sfx.mp3', bytes: buf.length, ...buf.meta }));
