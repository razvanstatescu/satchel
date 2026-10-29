// node tools/examples/image.mjs "prompt" [--model gpt-image-2.5-sunburst] [--size 1024x1024] [--quality low] [--background transparent] [--format png] [--out img.png]
// node tools/examples/image.mjs "edit prompt" --edit ref1.png,ref2.png [--mask mask.png] ...
import { writeFileSync } from 'node:fs';
import { generate, edit } from '../lib/openai-image.mjs';
import { args } from './args.mjs';
const a = args();
const common = { prompt: a._[0], model: a.model, size: a.size, quality: a.quality, background: a.background, outputFormat: a.format, n: a.n ? Number(a.n) : undefined };
const imgs = a.edit ? await edit({ ...common, images: a.edit.split(','), mask: a.mask }) : await generate(common);
const out = a.out || 'image.png';
imgs.forEach((b, i) => writeFileSync(i ? out.replace(/(\.\w+)$/, `-${i}$1`) : out, b));
console.log(JSON.stringify({ out, count: imgs.length, bytes: imgs.map((b) => b.length), usage: imgs.usage, meta: imgs.meta }));
