// Build a labelled 1920x1080 contact sheet of every image in images.json (4x4 grid of 480x270 tiles).
//   node tools/images/contact.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../video/public');
const cat = JSON.parse(readFileSync(resolve(here, '../../video/src/data/images.json'), 'utf8'));
const font = resolve(pub, 'fonts/InstrumentSans-VF.ttf');
const names = Object.keys(cat).slice(0, 16);
// Homebrew ffmpeg here has no drawtext (no freetype), so tiles are unlabelled; order = images.json key order, row by row.
const hasDrawtext = execFileSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).includes(' drawtext ');
const label = (n) => hasDrawtext ? `drawtext=fontfile=${font}:text='${n}':x=8:y=8:fontsize=16:fontcolor=0xf3e9dc:box=1:boxcolor=0x17100c@0.75:boxborderw=4` : 'null';

const inputs = [];
const filters = [];
const tiles = [];
let i = 0;
for (const n of names) {
  const file = resolve(pub, cat[n].file);
  if (file.endsWith('.png')) {
    // cut-out: show it over the dark leather ground
    inputs.push('-i', resolve(pub, cat['leather-ground'].file), '-i', file);
    filters.push(`[${i}:v]scale=480:270[bg${i}];[${i + 1}:v]scale=-1:240[fg${i}];[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,${label(n)}[t${tiles.length}]`);
    i += 2;
  } else {
    inputs.push('-i', file);
    filters.push(`[${i}:v]scale=480:270,${label(n)}[t${tiles.length}]`);
    i += 1;
  }
  tiles.push(`[t${tiles.length}]`);
}
while (tiles.length < 16) {
  inputs.push('-f', 'lavfi', '-i', 'color=c=0x17100c:s=480x270:d=1');
  tiles.push(`[${i}:v]`);
  i += 1;
}
const layout = Array.from({ length: 16 }, (_, k) => `${(k % 4) * 480}_${Math.floor(k / 4) * 270}`).join('|');
filters.push(`${tiles.join('')}xstack=inputs=16:layout=${layout},format=rgb24`);
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filters.join(';'), '-frames:v', '1', resolve(pub, 'images/_contact.png')], { stdio: 'inherit' });
console.log('wrote', resolve(pub, 'images/_contact.png'));
