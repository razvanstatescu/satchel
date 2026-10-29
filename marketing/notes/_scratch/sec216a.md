### 2.16 The script's props in motion: records, stamps, frost, the Night blind, the flip, captions

- **Record outlines** (T0, T1, T5, T6): the card's back has dashed outlines, 2k px ink with dash 8k / 6k (world
  bible), each holding a chain dot and a Geist Mono label (`ETH · nonce 1`). In T1 one outline **draws itself dash by
  dash** in 16 f (`RecordOutline`, reveal quantised to whole dashes, `pen-scribble`). The label then types at 2 f per
  character (`type-run`), the signing pill pulses "Signing with NEAR's signer network · Usually about 10 seconds"
  (`frozen`, a 1.0 → 1.04 scale breath every 15 f), and "Signed" prints in. The signature sticker peels out and flies
  toward Ethereum (`sticker-peel`, `whoosh-zip`), leaving the outline behind. T6's blocked outline is `danger`.
- **Stamps** (T5): on each V23 phrase onset (markers: "Nonce used." 104.12 s, "Coin spent." 105.58 s, "Blockhash
  expired." 107.12 s), its charm bonks its outline (§2.15) and the `Stamp` slaps on: scale 1.25 → 1, 6% squash, tilt
  −7° → −4° (stamps may sit askew; the logo never does), the ink spreads 1.4× → 1× in 3 f, success colour.
  `stamp-thunk` lands on the contact frame.
- **Frost laminate** (T4) and **melt** (T7): flat, never glass, and never `backdrop-filter`. It is sky at 35% with two
  flat white stripes at 45%. It wipes in left → right in 10 f like a squeegee (`freeze-chime` at the start), then the
  "Paused for sale" pill pops (`pop`; the snowflake turns exactly 60°, §2.11). The history header frosts over at
  "3 signatures". The melt wipes top → bottom in 8 f while three sky droplets (ink-outlined) fall 30 px and pop.
  **No countdown or timer anywhere after listing.**
- **Night falls** (C1): one roller blind from the top. The Night sheet's edge falls in 18 f (`fall`) on the music stop
  (marker `musicStop`, 58.0 s), lands with a 2% bounce, and casts a hard 10 px black shadow onto the Day frame below
  it.
- **The flip** (T0 at the `flip` marker, 73.0 s; back to the front in T7): **the film's one 3D move.**
  - rotateY 0 → 180° on `quick` (overshoots to about 196°, settles in 10 f), perspective 2400 px, scale 1.06
    edge-on. Faces swap at 90° with `backface-visibility: hidden`. No lighting, gloss or shading.
  - The card lifts 12 px before the flip and slaps down after it.
  - `whoosh-soft` peaks on the 90° frame.
  - **Day sweeps back with the rotation:** the Day wipe's edge sits at x = (θ / 180) × width, moving in the flip's
    direction. In T7 the reverse flip (180° → 360°) runs inside the hand-off and the frost melts as it turns.
- **Caption slap** (all captions): Funnel Display 800, sentence case, 110–160 px, ink (#f4f2ff on Night). Scale
  1.2 → 1 with contact on f4 and a seeded tilt within ±2°. **Only the hook and end captions** get the sticker
  treatment: a white fill, an ink outline and a hard shadow that snaps 0 → 8 px on contact. Hold each caption at
  least 0.8 s + 0.25 s per word after it lands. To leave, a caption peels (`sticker-peel`) or is slapped over by the
  next one.

```tsx
