# QA v5 · fixes in T5, T6, T7 (+ the shared peel)

Source: `r3-0141-end-and-cuts.md`, rows #4–#12. These are fixes only: the v2/v4 look and motion are unchanged. The work
was built and checked against the v5 timeline (T5 96.5–107, T6 107–112.5, T7 112.5–123). Every time is still derived
from `getScene()`, `wordAt()` and `marker()`.

Evidence is in `marketing/video/out/qa-v5/fix/`:
- half-scale clips: `T5.mp4`, `T6.mp4`, `T7.mp4`
- sheets: `t5-start.png`, `t5-end.png`, `t5-cap-desc.png`, `joins.png`, `t7-open.png`, `t7-pill.png`, `t7-badge.png`,
  `t7-tail.png`, `peel-both.png`, `peel-e1-edges.png`, `peel-p1-edges.png`
- full-resolution frames: `peelE1/` and `peelP1/` (Body frames), `joins/`

| # | sev | status | what changed |
|---|---|---|---|
| 4 | low | fixed | T5, T6 and T7 now share one lowered MID (T6's old MID6, browser top at y 274). T5's slow drift before the push-in now holds the browser's top edge still (`holdTop`), and "Checked in your browser." sits 8 px higher (y 14). Measured gap between the descender and the outline: 7 px at the slap overshoot (f25) and 25 px at rest. It used to touch or cross. |
| 5 | med | fixed | The ending is now computed back from the scene end. After SOL's contact (f229) the close-up holds still for 26 f (it was 5 f). It then hard-cuts to the page on a beat (f255, as in T6), so the tab and URL bars never sweep through the caption band. The verdict and "Checked" pop on the cut. "Clean history." lands at f259 and is alone for 39 f (1.3 s). Buy wakes at f298, 17 f before the switch to #4. The cheer keeps its joy faces but drops the hop. |
| 6 | low | fixed | Removed the 6 px `dy` jolt on the Buy wake. |
| 7 | med | fixed | The shared MID (see #4). The browser top edge measures 274 px on both sides of both tab switches (Body f3206–3214 and f3371–3380). |
| 8 | low | fixed | T7 has no 40 px content rise. Order: tab slap f0–4, then the camera push f5–18, then carol's hand from f13, then the press on f26 (unchanged, on "clean,"). |
| 9 | med | fixed | The "Paused for sale" pill (the kit `FrostLaminate` pill at 0.9 size) is right-aligned over the empty right half between the BTC and ETH rows. No record text sits under it. |
| 10 | med | fixed | "Yours" (the kit `NameSticker`) now slaps onto the band with the kit slap (1.3 → 1, contact f4) on the "Satchel #7 is yours." contact (f203). It no longer pops in for one frame at LAND+8. |
| 11 | low | fixed (copy change) | Dropped "You now control". The amounts line "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC." rises 0.6 s after the caption lands and is still for 2.9 s before the peel. Eight tokens need 2.8 s. **Needs the script owner's OK:** SCRIPT-v4 lists "You now control …". |
| 12 | low | fixed (shared) | `src2/motion/transitions.tsx` (`PeelOff` only). The crease is now its own layer, using the flap's transform and clipped to the flap polygon grown 1.5 px past the fold. The round cap no longer pokes past the border at the frame edge, and the white flap fill no longer bleeds through as a hairline along the fold. Both peels were checked frame by frame (H2→P1 Body f345–364, T7→E1 f3690–3709). The remaining step at the frame edge is the flap's hard drop shadow (correct geometry). |

## Files changed
- `src2/scenes/T5/index.tsx`
- `src2/scenes/T5/sale.tsx` (`CAM_MID`, `browserTop`, `holdTop`)
- `src2/scenes/T6/index.tsx`
- `src2/scenes/T7/index.tsx`
- `src2/motion/transitions.tsx` (`PeelOff`)

## For other owners
- #11 is a copy change and needs the script owner's OK.
- The `PeelOff` change also affects H2→P1, which I checked.
- `Peel` in `motion/Sticker.tsx` (the corner peel) still has the round-capped crease. QA didn't flag it.
- `Main` now begins with H0 (240 f), so frame numbers in `Main` are shifted. I used the `Body` composition for the frame
  checks.
- One of my peel renders overlapped briefly with another render in this project.

`npx tsc --noEmit`: clean.

## Follow-ups (verify-0116-end N4, N5)

| # | sev | status | what changed |
|---|---|---|---|
| N4 | low | fixed | Buy wakes 7 f earlier, on f291. "Clean history." lands on f259 and stays alone for 1.07 s, and it remains readable during the wake. The burst is now 4 sparks (the bible's 3–5) and starts on the wake. Measured: no lemon pixels from f311, 4 f before the switch on f315. Buy stays fully coral from f295. |
| N5 | low | fixed | The two-line captions now share one setting, `CAPTION_2L` (100 px, leading 0.95, y 49): "Checked in / your browser." (T5) and "Blocked: / 1 unused signature" (T6). At rest, measured from the frame top to the cap tops: T5 63 px, T6 61 px. Measured from the descenders down to the browser: T5 25 px, T6 22 px. The browser didn't move. The descender gap is 9 px on the first full-opacity slap frame (scale 1.15), then 16 px, then settles. T6's close-up is 10 px lower, so "signature" clears the panel's top edge by 15 px. |

Evidence: `out/qa-v5/fix/n4-wake.png`, `n5-captions.png`, `n5-t6cu.png`. Files: `scenes/T5/index.tsx`, `T5/sale.tsx`
(`Caption` leading, `CAPTION_2L`), `T6/index.tsx`. `npx tsc --noEmit`: clean.
