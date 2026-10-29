## 4. Composition and colour choreography

**The ground** is the Day ground #f6f5fb, flat. It is cool off-white, never cream: no warm grade, no vignette, no
grain, no texture, no gradient. Surfaces are white with an ink outline. Contrast: ink on ground is 15.9:1, ink on
coral 5.7:1, ink on lemon 12.5:1. White on coral is 3.0:1 and never used for text.

**One coral fill per frame.** Count the coral areas in every frame; the answer is 1 (or 0).
- **In this film coral is only the card band or the one primary button. There are no coral floods** (the world is
  Day, with Night only in C1).
- The logo tile is coral too. When the lockup is on screen (H2, E1), keep any coral button out of the frame, and if a
  card band shares the frame, keep it small and away from the focus.
- UI recreations: a phone showing the card band *and* a coral button (Mint, Send, Give, Buy) puts the action on the
  button. The band then sits small and outside the focus, or out of the crop.
- A **disabled** Buy is grey (as on the shared kit's sale page), so the coral arrives exactly when Buy lights up (T5)
  or is pressed (T7).
- `coral-soft` (#ffe3df), used for the Sent toast and selected rows, is a tint and does not count. `coral-deep` is the
  pressed state of the same button.
- No coral confetti, coral text, coral outlines or coral sparkles. Frost over the band tints it, which is fine; never
  recolour the tile.

**Sky and lemon**
- **Sky** (#8fd3ff) is a sticker accent: bob's sleeve, the backdrop panel behind the charms, the frost tint, droplets.
  A backdrop panel carries the outline and shadow, covers at most about 45% of the frame, appears once per frame, and
  is never behind long text.
- **Lemon** (#ffd84d) is for alice's sleeve, the "New" badge, the seed-phrase sticky note (P4), sparkles, the marker
  swash and confetti, at most about 5–10% of the frame. Never use lemon or sky as a text colour or as a full-frame
  fill.
- **Chain colours** appear as 8k px dots beside chain names, as charm fills and as plain coin stickers (no logos),
  and nowhere else.

**Night** (`NIGHT` in `src2/brand/tokens.ts`: ground #120c26, surface #1c1538, ink #f4f2ff, success #4fd9b0, danger
#ff7a92; sticker shadows #000).
- **Only C1, the catch** (58.0–72.0 s). It falls as the roller blind on the music stop (§2.16) and leaves when the T0
  flip sweeps Day back in.
- No coral in C1: the seller's card shows no number, and the band may show only with no button. Its absence makes
  T5's lit Buy land.
- The charms keep their fills and ink outlines and act concerned: flat mouths, eyes on the slip, one long blink. The
  drained ETH charm goes "o" and grey. The slip's danger outline uses Night danger #ff7a92. Text is #f4f2ff.

**Colour script for v3**

| Scene | Ground | The one coral | Accents | Signature move |
|---|---|---|---|---|
| H1 Stick it on | Day | card band | lemon and sky sleeves | three snap-ons on beats, peel corner, the swing (§2.6) |
| H2 One NFT | Day | card band, then the lockup's tile | | name wiggles, lockup slap (§3) |
| P1 Mint | Day | the Mint button, then the card band | lemon "New" badge | press, leap out of the phone, quick snap-ons |
| P2 Fill | Day | (phone UI) | coin stickers | gulps, chips count up (integers or slapped amounts) |
| P3 Send | Day | Send button | frozen signing pill | press, tracker, flicks |
| P4 No seed phrase | Day | card band | lemon sticky note, grey sleeve | note won't stick, no-wobble, side-eye |
| P5 Give | Day | "Give it to bob.near" | | press, then the swing |
| P6 Use cases | Day | each card's band, one per frame | party hats, USDC stack | three swings on bar downbeats |
| C1 The catch | **Night** (blind) | none | danger slip | pocket slide, flat-faced sale swing, drained ETH |
| T0 The flip | Night → Day with the flip | (band on the front, then the back) | | the flip |
| T1–T3 | Day | (band out of frame or small) | frozen pill | records draw, the empty key slot, request bounces |
| T4 Paused for sale | Day | card band under frost | sky frost | price tag slap, frost wipe, the hand slides off |
| T5 The check | Day | "Buy for 4,750.00 USDC" lights up at the end | success stamps, scan beam | bonks and stamps, the verdict, Buy lights |
| T6 Blocked | Day | none (Buy greyed out) | danger outline | the bonk, the banner |
| T7 The hand-off | Day | Buy pressed, then the card band | lemon burst on landing | flip back, frost melt, the swing, USDC crosses |
| E1 End card | Day | the lockup's tile | charm bar | lockup, captions, the mark's press on `endPress` |

**Safe areas and legibility (1920×1080)**
- **Key text inside the centre 1080 × 1080 (x 420–1500)** so a square recut works (world bible). All must-read text
  stays inside x 160–1760, y 100–940, and the **bottom 150 px** stay free of must-read text (platform UI).
- Type sizes: captions **110–160 px** (Funnel Display 800); must-read **≥ 56 px**; mono addresses ≥ 56 px when
  must-read, middle-truncated (`bc1q9h…x4d7`). X shows a 1920-wide video about 390 pt wide on a phone (×0.2), so
  56 px becomes about 11 pt.
- Reading holds: at least 0.8 s + 0.25 s per word after landing (the brief); for long words also at least
  characters ÷ 15 s. Text never moves while it is read: no push-ins, no thumps, no idle bobs.
- One focal point per frame. New elements appear where the eye already is, or the charms look there first.
- UI recreations sit in the phone frame (8 px ink bezel, radius 40) at k ≈ 2–2.6. Their small UI text is never
  must-read; repeat the fact as a caption.

---

