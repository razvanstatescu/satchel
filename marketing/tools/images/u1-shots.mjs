// U1 (use cases) photo plates. Same art direction as shots.mjs: the STYLE suffix is shared verbatim.
// Owner: U1 scene builder. Generated and catalogued by tools/images/u1.mjs (append-only to images.json).
import { STYLE } from './shots.mjs';

export { STYLE };

const SPACE = 'The left third and the whole upper half of the frame are calm, empty, near-black brown shadow with nothing in them (clean negative space for titles).';

export const U1_SHOTS = {
  'uc-sell': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    prompt: `Dramatic editorial photograph of a private deal being closed across a dark leather-topped desk, seen from the side at desk height with a slight downward angle. Two hands meet over the desk right of centre: the hand coming from the left slides a slim, closed, dark tanned leather card case with a small aged-brass snap across the leather toward the hand coming from the right, which reaches in to take it, its fingertips touching the far edge of the case. Shirt cuffs and dark jacket sleeves only; faces, heads and bodies out of frame; no watches, no rings, no jewellery. Calm and decisive, a quiet late-evening study, not a stock photo, no office. ${SPACE} The hands and the case sit right of centre, just below the middle of the frame.`,
  },
  'uc-gift': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    prompt: `Low-key still-life photograph of a small square gift box covered in dark tanned leather, closed with a polished aged-brass clasp on its front and tied around with a thin dark leather cord in a simple knot. A small blank cream paper tag hangs from the cord and leans upright against the front of the box, facing the camera, completely blank and in sharp focus. The box sits on a dark leather surface right of centre, seen from a low three-quarter angle; the background falls away into soft darkness. A warm, generous, quiet mood. ${SPACE}`,
  },
  'uc-treasury': {
    size: '1920x1088', model: 'gpt-image-2.5-flare',
    prompt: `Low-key editorial photograph of a handover across a long, dark, polished boardroom table: one hand passes a heavy, thick, closed dark tanned leather document portfolio with aged-brass corners and a brass clasp to another hand reaching in from the right; both hands grip the portfolio at the moment it changes hands, just above the table, right of centre. Dark suit sleeves and cream shirt cuffs only; faces, heads and bodies out of frame; no watches, no rings, no papers showing. The table recedes into darkness; a sense of responsibility passing to the next team. ${SPACE}`,
  },
};

// Filled in after looking at each final plate (positions in 1920 × 1080 px). Read by u1.mjs when cataloguing.
export const U1_NOTES = {
  'uc-sell': {
    safeTextArea: 'upper half (y < 400) and the left third above the tray',
    notes: 'U1 "Sell a position.": a hand passes a slim leather card case (brass snap) to another hand across a leather desk. Hands ≈ x 860–1830, y 430–780; case ≈ x 1150–1450, y 535–695. Upper half near-black. A leather tray and book sit in the lower-left corner (x 0–470, y 640–1080).',
  },
  'uc-gift': {
    safeTextArea: 'left half and upper third',
    notes: 'U1 "Gift a wallet.": leather gift box, aged-brass clasp, tied with leather cord; box ≈ x 960–1790, y 290–910. The blank cream tag faces camera: centre ≈ (1287, 742), ≈ 152 px wide, leaning ≈ 8.7° clockwise (U1 inks "sam.near" on it in code, 27 px Spline Sans Mono, at (1291, 738)).',
  },
  'uc-treasury': {
    safeTextArea: 'upper-left quadrant (x < 700, y < 560)',
    notes: 'U1 "Hand over a treasury.": a hand passes a thick leather document portfolio (brass corners, strap and buckle) to another hand across a polished boardroom table. Hands and portfolio ≈ x 760–1920, y 230–690; the table fills the lower half with warm reflections.',
  },
};
