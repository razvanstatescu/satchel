// Writes video/src/data/images.json from shots.mjs plus the picks below.
//   node tools/images/catalog.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS, STYLE } from './shots.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../video/public');

// name -> { shot (prompt source), file, extra prompt, notes, safeTextArea override }
const PICKS = {
  'leather-ground': { notes: 'Darkest ground. Faint raking light at upper left, right half near-black. Use as the default Night background; grade down further under UI.' },
  'leather-ground-2': { notes: 'Brighter variant with a clear diagonal falloff (warm upper-left to black lower-right). Good behind headline cards.' },
  'stitch-macro': {
    extra: 'The thread is a rich saturated golden brass colour, clearly golden rather than beige; the leather is dark chocolate brown.',
    notes: 'Second take (v2, golder thread). Seam runs lower-left to upper-right; sharp centre, blurred ends. Good for "you own this" stitch beats and pushes.',
  },
  'stitch-macro-straight': { notes: 'Seam sits at y ≈ 48.5% (≈ 524 px), edge to edge, sharp along its length: track a stitch or wipe along it. Light warms the left third.' },
  'brass-plate': { notes: 'Brushed brass, horizontal brushing, soft highlight band through the middle. Works as the full-frame "brass flood" (S05 "But…"); leather-dark text (#17100c) reads on it.' },
  'paper-plate': { notes: 'Blank deckle-edged card, top-down, card bbox ≈ x 28–70%, y 27–73% (≈ 545–1340 × 290–790 px). Put the 12-word seed grid inside with ~40 px inset.' },
  'pocket-slip': { notes: 'S05 noir: hand slipping a folded cream slip into a leather jacket pocket; slip at ≈ x 66–77%, y 31–56%. No face. Left third is dark shadow for text.' },
  'handshake': { notes: 'S08 deal sealed; watch dial is blank (no numerals). Hands at centre (y 25–65%). Desk props at lower corners; text best over the dark upper band or the lower centre.' },
  'ledger': { notes: 'S07a "writes down every signature". Ruled blank pages fill the right two-thirds (slightly perspective-skewed); brass pen across the left page. Text on the dark left third.' },
  'key-hooks-empty': { notes: 'S07e "born with no keys": seven brass hooks, all empty, row at y ≈ 35–60%. Top band is the cleanest text area.' },
  'slip-cutout': {
    notes: 'Transparent PNG, 688×928, cropped to the slip with ~24 px padding. Alpha clamped (>240 → 255, <4 → 0). Abstract ink scribble at lower half (no readable letters); torn bottom edge. For the S05 signed slip; add "Send 0.0123 BTC…" in code above the scribble.',
  },
  'fan-of-copies': { notes: 'S03 copies multiplying: a long receding line of blank cream sheets from foreground right to darkness at left. Reads more as a "domino line" than a fan; strong for an echo-trail transition.' },
  'leather-strap-macro': {
    notes: 'Optional hero (sunburst, 3840×2160, take v2). Strap snakes in an S from lower-left to upper-right with brass saddle stitch; most natural leather of the two takes. Strap spans the frame, so text sits top-left or bottom-right.',
  },
  'leather-strap-macro-alt': {
    shot: 'leather-strap-macro',
    prompt: 'Hero product photograph: a single thick strap of dark tanned vegetable-tanned leather (#6a4730 in the light, #432c1f in shadow) bent into a soft, elegant S-shaped curve, standing on its edge on a near-black brown surface (#17100c), placed centre-right in the frame. A neat row of hand saddle stitches in polished brass-coloured waxed thread (#c9a24a) runs along the centre of the strap, following its whole curve. Burnished, rounded edges. No buckle, no hardware, no embossing. Single warm key light from the upper left sculpting the curve, deep soft shadows, shallow depth of field with the far end of the strap gently out of focus.',
    safeTextArea: 'left 30% (strap sits centre-right)',
    notes: 'First take: cleaner composition with empty left third, bolder brass stitch, but the leather is a little smooth/CGI and the curve reads as a wave more than an S.',
  },
};

const size = (f) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f], { encoding: 'utf8' });
  return { w: Number(out.match(/pixelWidth: (\d+)/)[1]), h: Number(out.match(/pixelHeight: (\d+)/)[1]) };
};

const cat = {};
for (const [name, p] of Object.entries(PICKS)) {
  const s = SHOTS[p.shot || name];
  const file = `images/${name}.${s.background === 'transparent' ? 'png' : 'jpg'}`;
  const { w, h } = size(resolve(pub, file));
  cat[name] = {
    file, w, h,
    model: s.model,
    prompt: `${p.prompt || s.prompt}${p.extra ? ' ' + p.extra : ''} ${STYLE}`,
    safeTextArea: p.safeTextArea || s.safeTextArea,
    notes: p.notes,
  };
}
const out = resolve(here, '../../video/src/data/images.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(cat, null, 2) + '\n');
console.log('wrote', out, Object.keys(cat).length, 'entries');
