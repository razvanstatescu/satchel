# v5 QA fixes: C1, T0, T1 (scene builder 4)

Source: `r2-0052-0141.md` rows #2 and #6–#16. Checked against the v5 timeline (C1 56–68.5, T0 68.5–72.5, T1 72.5–78.5).
Scene-local frames are unchanged, because every time is relative to `getScene()`/`wordAt()`/`marker()`. C1 now ends at
f375, and its dark pause after V16 keeps 1.26 s. Film frames below are **Body** frames: Main is now H0 (240 f) + Body.

| # | Scene | Status | What changed |
|---|---|---|---|
| 2 | C1, T1 | fixed | The incoming caption shows from its slap frame 2, where it is already opaque. The outgoing caption stays until then. No empty or half-transparent frame on the swaps: C1 f101→102, f162→163, f282→283; T1 f132→133. |
| 6 | P6→C1 | fixed | New presentation `C1/nightBlindCut.tsx`, wired as `CUTS.P6` (18 f) in `src2/transitions.ts`. P6 holds its music-stop frame in a `Freeze`, which also mutes its sounds after the stop, so the stop stays hard. The Night blind falls over it (EASE2.fall, 10 px black edge) and C1, already Night, shows above the edge. C1's Day opening is gone. The cut is still on musicStop (Body f1680). The H2→P1 and T7→E1 peels are unchanged. |
| 7, 8 | C1 | fixed | "Signed before the sale." is one line at 102 px (104 px measured about 1,100 px wide). The camera from the tap to the hops is set lower (y 556). The glove clears the caption at f88, f108 and f126 at full resolution. |
| 9 | C1 | fixed | The Send button is drawn under both slip layers, so the slip never ducks behind it mid-hop. |
| 10 | C1 | fixed | The coins are drawn under the card and its charms. They dip left of and below the card into the pocket and never cross the total, the bar, the legend, the strip or the slip. |
| 11 | C1 | fixed | The reorder is dropped. The legend holds "BTC 67% · ETH 0% · SOL 20% · +1" to the end of C1, about 5 s. |
| 12 | T0 | fixed | T0 has its own flip spring (stiffness 90, damping 12): 90° on f+5, 180° on f+10, overshoot to about 195° kept. The turn reads over 5 frames and the wipe edge travels over f31–f39. The whoosh peak is on the edge-on frame. |
| 13 | T0 | fixed | Day latches from the first frame at ≥ 180°, so Night never comes back during the undershoot. |
| 14 | T0 | fixed | The card is 56 px lower (`CARD.y` 428), and the push target follows. Line 2 clears bob's glove by about 38 px (about 29 px mid-slap). |
| 15 | T0→T1 | won't fix | T1 re-enacts how that record was made. Fading the row during T0's push would show the erase on screen, and the drop's punch-in already marks the jump. |
| 16 | T1 | fixed | The Ethereum strip runs out from under the card's right edge: its left end is tucked 34 px under the card, `CARD_EDGE` is 1474, and the record is back at x 900 as in v4. The slap grows from the label's centre. "Ethereum" ends at least 108 px inside the frame on every frame (120–126 px at rest, measured). The captions are centred over the record, so they clear the card edge even mid-slap (≥ 38 px, about 115 px at rest). |

## Files

- `marketing/video/src2/scenes/C1/index.tsx`
- `marketing/video/src2/scenes/C1/nightBlindCut.tsx` (new)
- `marketing/video/src2/transitions.ts` (only the `P6` entry)
- `marketing/video/src2/scenes/T0/index.tsx`
- `marketing/video/src2/scenes/T1/index.tsx`

The checks are in `marketing/video/out/qa-v5/fix/`: half-scale `C1.mp4`, `T0.mp4` and `T1.mp4`; the `cut-*.mp4` clips with
their PNG sheets (P6→C1, H2→P1, T7→E1, C1→T0→T1); and the crops `c1-*`, `t0-*` and `t1-*`. `npx tsc --noEmit` is clean.

## For other owners

- **P6:** the blind now falls over P6's frame at the music stop (P6 local f195), frozen for 18 f. Whatever P6 shows at
  that frame is what the blind covers. Today that is the finale with "Hand over a treasury." still up.
- **Shared SatchelCard (open since v4):** the Night "Paused for sale" pill has low contrast in T0's opening.
