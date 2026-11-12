# QA v5 fixes · H1, H2, E1

This was a fix pass. The v2/v4 look, motion and timing style are unchanged. It is re-checked on the v5 timeline: H1 0–3,
H2 3–11.5, E1 123–129.5 (endPress 128). All cues still derive from `getScene()` / `marker()`, so the shorter H2 tail
needed no edits. Evidence is in `marketing/video/out/qa-v5/fix/`: half-scale clips `H1.mp4`, `H2.mp4` and `E1.mp4`,
frames extracted from them in `x/`, and stills in `hook/`.

| row | status | fix |
|---|---|---|
| r1 #1 "Stick it on." leaves mid-word | fixed | `T.stickOut` 43 → 47, on "on.". It is still flying off when "Hand it over." lands at g 60, so the band is never empty. |
| r1 #2 punch-in snaps in one frame; "Bitcoin." ghost on the coin | fixed | The punch is now one continuous 10-f in-out move (`PUNCH_EASE` bezier(0.5, 0, 0.2, 1), g 97–107). The zoom runs 1.0 → 1.25 → 1.6 → 2.1 → 2.5 → 2.75 → 2.9 with no snap. "Bitcoin." lands under its coin as the camera settles: the name stickers are world-anchored now (see #4). |
| r1 #3 "Solana." slaps over "Ethereum." | fixed | The name stickers slap from 1.1 instead of 1.2 (`StickerCaption` gained a `from` prop). "Solana." clears "Ethereum." on every slap frame. |
| r1 #4 (MED) name stickers float over the charms during the pull-back | fixed | The three stickers live in the world layer (drawn at punch size × 1/`PUNCH_Z`). They shrink and travel with their charms on the pull-back, then come unstuck and drop away beneath them. No text crosses a charm face or the card. |
| r1 #5 (H2 part) "bob.near" 40 px from the right edge | fixed | bob's arm is steeper (128° → 142°) and V04 is framed at zoom 0.68 (was 0.72) with the card centre at x 1335 (was 1350). The tag is ≥ 96 px inside the frame from the catch (H1 f75) on, and 134 px inside in V04. |
| r3 #1 H1's "Hand it over." peel-off truncated by the H2 cut | fixed | The exit starts at g 89 (was 91), after V02 has ended (g 87), and the sticker is off the top by g 100, before the punch-in's fast frames. The H1→H2 cut itself is continuous (one shot). |
| r3 #13 four moves in 0.6 s on E1's final press | fixed | The footer rises with the third chip (f120, was f138). The charms' blink cascade moved earlier (done ≈ f149). The frame holds still from f136 until the press on endPress (f150), so the press, its burst and SOL's last bounce have the beat to themselves. |
| caption swaps (no empty frame) | no change needed | No H1/H2/E1 caption blinks. Every outgoing caption has an animated exit (peel and fly, or drop) that overlaps the incoming slap, checked on the clips at g 47–61, 187–205 and 236–266. E1 has no swaps. |

**H1 hand-off for the intro:** `marketing/notes/intro-research/h1-handoff.md`. Negative frames: **yes**.
`<HookShot g={…} />` and `h1PoseAt(g)` are continuous across g 0. The card slides up from below, BTC falls in and the
camera eases into its pull-back over 12 frames. H1's pixels at frames ≥ 0 are identical: the maximum pixel difference at
frames 0, 5, 8, 12 and 30 is 0.

**Files changed:** `src2/scenes/H1/hook.tsx`, `src2/scenes/H1/timing.ts`, `src2/scenes/H1/stickers.tsx`,
`src2/scenes/E1/index.tsx` (`H2/index.tsx` unchanged).
