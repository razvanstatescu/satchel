// Shot list for the Satchel video plates. Prompts are the single source; gen.mjs reads them.
// Style rules: SCRIPT.md "Art direction" + brand/README.md. No text, logos, faces, coins, neon or glows.

export const STYLE = [
  'Low-key studio editorial photography, cinematic, luxury leather-goods campaign.',
  'A single warm key light raking from the upper left; deep, rich, soft shadows; shallow depth of field; subtle fine film grain.',
  'Colour palette strictly limited to near-black warm brown (#17100c), dark tanned leather browns (#432c1f to #6a4730), aged brass golds (#9a7428 to #ebcb7a) and warm cream paper (#f3e9dc).',
  'Crafted, tactile, premium, quiet. Photographic realism, real materials, no CGI or plastic look.',
  'Absolutely no text, letters, numbers, writing, logos, brand marks, watermarks or faces anywhere in the image.',
  'No coins, no crypto symbols, no neon, no glow effects, no lasers, no blue or cyan tones.',
].join(' ');

export const SHOTS = {
  'leather-ground': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'entire frame (uniform dark ground)',
    prompt: 'Full-frame macro photograph of dark tanned full-grain leather, almost black, a deep chocolate brown near #17100c. Fine natural pebble grain and pores visible across the whole frame, evenly focused, perfectly uniform with no seams, edges, stitches, folds or objects. Very soft, very low raking light from the upper left just barely revealing the grain texture. Mostly dark, calm, even tone so it works as a seamless background plate.',
  },
  'leather-ground-2': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'entire frame; brighter upper-left third suits headline, darker lower-right for UI',
    prompt: 'Full-frame macro photograph of dark tanned full-grain leather, warm deep brown (#432c1f to #6a4730 in the light, falling to near-black #17100c). Natural fine grain and pores across the whole frame, uniform, no seams, edges, stitches or objects. A soft warm light falls in from the upper-left corner and fades smoothly along a diagonal into darkness at the lower right. Calm, even background plate.',
  },
  'stitch-macro': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'upper-right and lower-left triangles either side of the diagonal seam',
    prompt: 'Extreme macro photograph of a hand saddle-stitched seam on dark tanned leather. Thick waxed thread the colour of polished brass (#c9a24a), neat slanted saddle stitches evenly spaced, running diagonally from the lower left to the upper right of the frame. Razor-thin depth of field: a few stitches in the centre pin-sharp, the seam dissolving into soft blur toward both ends. Warm raking key light from the upper left catching the thread twist and the leather grain; the rest falls into deep near-black brown shadow.',
  },
  'stitch-macro-straight': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'top third and bottom third (seam sits on the horizontal centre line)',
    prompt: 'Macro photograph of a single hand saddle-stitched seam on dark tanned leather, the seam running perfectly straight and perfectly horizontal across the full width of the frame exactly through the vertical centre, edge to edge. Thick waxed thread the colour of polished brass (#c9a24a), neat slanted saddle stitches, evenly spaced and identical along the whole line. Shot straight on, the camera square to the leather, the whole seam in sharp focus along its length. Warm soft raking light from the upper left; the leather above and below the seam is dark, even and calm, falling to near-black at the top and bottom edges.',
  },
  'brass-plate': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'entire frame (flat ground; dark text reads on it)',
    prompt: 'Full-frame macro photograph of a flat brushed brass sheet, fine straight horizontal brushing lines across the whole surface, warm aged gold (#9a7428 to #ebcb7a). Soft broad anisotropic highlight band stretching horizontally across the middle, gently falling off to deeper bronze toward the corners. Perfectly flat, uniform, no edges, scratches, objects, engravings, reflections of objects or patterns. Evenly lit so it works as a flat full-frame background colour field.',
  },
  'paper-plate': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'centre of the paper card (approx. x 28–72%, y 22–78%) for the 12-word grid',
    prompt: 'Top-down overhead photograph of a single blank rectangular card of aged heavy cream cotton paper (#f3e9dc), landscape orientation, lying centred on a dark tanned leather desk surface. The card fills about half of the frame width, with slightly soft deckled edges and a gentle curl at the corners casting soft shadows. The paper is completely blank and clean, fine paper fibre texture, warm. Warm key light from the upper left, the leather around it falling into deep near-black brown at the frame edges.',
  },
  'pocket-slip': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'left third (dark jacket shadow)',
    prompt: 'Noir film still, tight close-up: a man\'s hand sliding a small folded slip of cream paper into the inside breast pocket of a dark brown leather jacket, the jacket held open slightly. The paper slip is half inside the pocket, half still visible between the fingers. Only the hand, the jacket lining and the pocket are in frame, no face, no head. Composition weighted to the right two-thirds of the frame. Very low key, a single warm sliver of light from the upper left catching the knuckles, the paper edge and the leather; everything else falls into deep near-black brown shadow. Secretive, tense mood.',
  },
  'handshake': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'upper third and left quarter',
    prompt: 'Dramatic editorial photograph of two hands clasped in a firm handshake above a dark leather-topped desk, seen from the side at desk level. Shirt cuffs and dark jacket sleeves visible, faces and bodies out of frame. One wrist wears a slim aged brass watch with a plain blank dial (no numerals). Low key, near-black brown background, a warm rim light from the upper left tracing the edges of the hands and cuffs. Serious, quiet, like a deal being sealed in a private study; not a stock photo, no smiles, no office.',
  },
  'ledger': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'left third (dark desk); the ledger pages (right two-thirds) can hold ruled UI rows',
    prompt: 'Overhead three-quarter angle photograph of an open leather-bound ledger book lying on a dark wooden desk. The ledger occupies the right two-thirds of the frame; its two cream pages (#f3e9dc) are ruled with fine faint brown horizontal lines and a thin column margin, completely blank with no handwriting, no numbers, no marks. A brass fountain pen with the cap on rests diagonally across the lower page. The left third of the frame is dark desk falling into shadow. Warm key light from the upper left, shallow depth of field.',
  },
  'key-hooks-empty': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'top third and bottom third (hooks run across the middle band)',
    prompt: 'Very low-key photograph of a row of seven identical antique brass key hooks mounted in a straight horizontal line across a dark tanned leather wall board. Every single hook is empty: no keys, no rings, nothing hanging. Shot straight on at eye level, the row centred vertically, the hooks fading softly out of focus toward the left and right edges. A single warm raking light from the upper left catches the curved tops of the hooks; long soft shadows; the board falls into deep near-black brown. Still, quiet, minimal.',
  },
  'slip-cutout': {
    size: '1536x1024', model: 'gpt-image-2.5-flare', background: 'transparent',
    safeTextArea: 'n/a (cut-out; place on a plate)',
    prompt: 'Product cut-out photograph, top-down, of a single small slip of aged cream paper (#f3e9dc), folded once and opened flat, one short edge torn rough, slight crease shadow across the middle. On its lower half, a fast illegible fountain-pen scribble in dark brown ink, like a hurried signature: a dense tangle of small tight zig-zag loops that trails off into a long flicked underline stroke. It must be purely abstract and must not resemble any letter, initial or number. Soft warm light from the upper left. Isolated on a fully transparent background, no shadow on the ground, no other objects.',
  },
  'fan-of-copies': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    safeTextArea: 'left third and top band',
    prompt: 'Photograph of dozens of identical blank sheets of cream paper (#f3e9dc) fanned out in a long overlapping arc that recedes from the right foreground into deep darkness at the left, like copies multiplying endlessly. The sheets are completely blank, no writing. Shallow depth of field: the nearest sheets sharp, the far ones soft and swallowed by near-black brown shadow. Warm key light from the upper left grazing the paper edges.',
  },
  'leather-strap-macro': {
    size: '3840x2160', model: 'gpt-image-2.5-sunburst',
    safeTextArea: 'top-left quarter and bottom-right quarter (strap runs lower-left to upper-right)',
    prompt: 'Hero still-life product photograph, seen from above at a steep three-quarter angle: a single thick strap of dark tanned vegetable-tanned leather (#6a4730 in the light, #432c1f in shadow), its full length visible, lying on its flat side on a near-black brown suede surface (#17100c) and snaking in one clear, graceful S-shaped curve with two opposite bends, placed centre-right in the frame. A neat row of hand saddle stitches in waxed thread the colour of aged brass (#b8913e) runs along the centre of the strap, following the whole curve. Burnished, rounded, slightly darker edges; real leather with visible grain, creasing on the inside of the bends and natural imperfections. No buckle, no holes, no hardware, no embossing. Single warm key light from the upper left sculpting the curve, deep soft shadows, shallow depth of field with the far end gently out of focus. Shot on medium format, natural, not CGI.',
  },
};
