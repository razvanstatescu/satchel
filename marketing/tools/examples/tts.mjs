// node tools/examples/tts.mjs "Text" --voice <id> [--model eleven_v3] [--format mp3_44100_128] [--timestamps] [--out file.mp3]
// Writes the audio and, with --timestamps, <out>.json holding { words, alignment, requestId, characterCost }.
import { writeFileSync } from 'node:fs';
import { tts } from '../lib/eleven.mjs';
import { args } from './args.mjs';
const a = args();
const r = await tts(a._[0], { voiceId: a.voice, modelId: a.model, outputFormat: a.format, withTimestamps: !!a.timestamps,
  voiceSettings: a.stability ? { stability: Number(a.stability), similarity_boost: 0.75, speed: Number(a.speed || 1) } : undefined });
const out = a.out || 'tts.mp3';
writeFileSync(out, r.audio);
if (a.timestamps) writeFileSync(out.replace(/\.\w+$/, '') + '.json', JSON.stringify({ words: r.words, alignment: r.alignment, requestId: r.requestId, characterCost: r.characterCost }, null, 1));
console.log(JSON.stringify({ out, bytes: r.audio.length, ms: r.ms, characterCost: r.characterCost, requestId: r.requestId, words: r.words?.map((w) => `${w.word}@${w.start.toFixed(2)}-${w.end.toFixed(2)}`).join(' ') }));
