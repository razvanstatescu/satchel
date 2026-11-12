# QA v5 fixes: P1, P2, P3

A fix pass on the v4 scenes. The look, motion and timing style are unchanged, and the scenes are checked against the v5
timeline (P1 11.5–17, P2 17–24.5, P3 24.5–33.5). Frame numbers below are scene-local (`P1+48`).

## Per row

| Row | Result | What changed |
|---|---|---|
| r1 #8 (med) | **fixed** | The flying card's wrapper had no height, so it scaled about its top edge and appeared about 41 px above the in-phone card. It now has the card's box, so it scales about its centre. It leaves from the in-phone card's exact pose: the 0.92 crouch, with "Yours" and the app's "Active" pill. The in-phone card is hidden from the takeoff frame, and its empty slot shows at once. The card then stretches 1.05 and pops the "Active" pill off in mid-air (6 f). "Yours" stays on throughout. Measured coral band: P1+47 (in phone) y 227–283, x 224–612; P1+48 (flying) y 229–286, x 226–613. |
| r1 #9 (med) | **fixed** | The leap is now a 60 px hop with a 3 % scale bump in mid-air, and the camera push is released into the crouch. The card's top stays at y ≥ 187, at least 35 px below the ink of "Mint a Satchel." (bottom y 152). |
| r1 #10 (med, P1–P3) | **fixed** | Every caption swap keeps the outgoing caption until the incoming one reaches full opacity (`SWAP` = 2 f). This covers both held hand-offs across the cuts. Two-line captions slap from 1.1, using a local copy of the kit's CaptionSlap with a `from` prop. Measured: no frame has an empty caption box at any of the 5 swaps. |
| r1 #12 (med) | **fixed** | The "Standard NEAR NFT" chip pops off (1 → 1.08 → 0 over 6 f) across the P1→P2 cut, keyed to the scene end. It is gone on P2+2, together with its caption. |
| r1 #16 (med) | **fixed** | The flicks are retimed: BTC on "native", ETH on "transaction", SOL 6 f later. The card rolls each amount in 8 f, and the toast check draws in 6 f. The total reads ≈ $8,000.00 from P3+251 and holds 19 f to the cut, and SOL's toast lands at P3+249. The toast column moved 30 px left and is scaled 1.36 → 1.30: it sits 13 px from the card and 98 px from the right edge. |
| r1 #5 (low, P2/P3) | **fixed (P3)** | P3's Send and Approve taps sit at the phone's bottom edge, where even the wrist is about 80 px from the frame edge. A tag on that sleeve could therefore only be clipped, so it is dropped there; the lemon sleeve still identifies alice. P2's tag is about 120 px inside at rest and only crosses the edge while the hand enters and leaves. P1's tag stays fully below the frame. |
| r1 #7 (low, optional) | won't fix | A push from "Minting…" to the minted screen needs about 8 f. That would move the leap later and pile its landing onto the charm snaps and the first tag on "Bitcoin". The swap reads as the app's in-place update. |
| r1 #11 (low) | **fixed** | The chip slaps from 1.15 and sits 16 px further right. At its slap peak it is 37 px clear of "One NFT.", and 62 px at rest. |
| r1 #13 (low) | **fixed** | The value card uses order `given`: BTC · ETH · SOL · +1, which is also the final value order. Nothing re-sorts during the fill, and the bar fills in place. |
| r1 #14 (low) | won't fix | There is no room for 1.6× (about 470 px). The free areas at that moment, the right column and the gap between the phone and the card, are about 340 px wide. A sticker that large would cover the card, the phone UI or the tags. The caption and the VO carry "four networks". |
| r1 #15 (low) | **fixed** | P3's second caption is set at 104 px. The "g" now clears the card's outline by 17 px, the same as P2's caption. |
| r3 #2 (optional) | **done** | P2's in-phone push and alice's hand start 4 f later (P2+6, P2+8), so the caption swap at the cut reads on its own. |
| r3 #3 (low) | **fixed** | P3 holds P2's caption until "Send on all three." reaches full opacity, the same rule as #10. |
| r1 #6 | skipped | As instructed. |

## Files

- `src2/scenes/P1/index.tsx`, `src2/scenes/P1/stage.tsx` (the stage shared by P1–P3), `src2/scenes/P2/index.tsx`,
  `src2/scenes/P3/index.tsx`. No shared files were changed.

## Verification

- `npx tsc --noEmit` is clean for the whole project.
- Main matches the scene renders exactly at the cuts on f510 (P1→P2) and f735 (P2→P3). P2→P3 is a still hold
  (f731–737 identical). P1→P2 is continuous: the chip's pop and the caption slap run across the cut.
- Half-scale clips are `marketing/video/out/qa-v5/fix/P1.mp4`, `P2.mp4` and `P3.mp4`. Strips and measurements are in
  `out/qa-v5/fix/P1-P3/`, including frames pulled from the clips (`clipframes-sheet.png`).

## For other owners

- #14 needs the coordinator's call: accept it as texture, or re-lay out P2's end.
- The motion kit's `CaptionSlap` has a fixed start scale of 1.2. A `from` prop there would let every owner slap
  two-line captions from 1.1. P1–P3 use a local copy for now.
