# QA v5 fixes · T2, T3, T4 (scene builder 5)

Source: `r2-0052-0141.md` (rows #2 T2 part, #5 T2 part, #17–#24). Fix pass only: the v2/v4 look, motion and timing
style are unchanged. Every time is still derived from `getScene()` / `wordAt()` / the beat grid. Checked against the v5
timeline (T2 78.5–85, T3 85–92, T4 92–96.5): the VO offsets and the beat phase inside each scene are unchanged, so every
event keeps its scene frame; only the T3 and T4 tails are shorter.

Files changed: `src2/scenes/T2/kit.tsx` (the `Caption` helper, used only by T2–T4), `src2/scenes/T2/index.tsx`,
`src2/scenes/T3/index.tsx`, `src2/scenes/T4/index.tsx`. No shared file was touched.

| # | scene | status | what changed |
|---|---|---|---|
| 2 | T2 | fixed | Caption swap: the outgoing caption pops out (1.06 → 0.5) in the 2 frames *before* the incoming slap starts, and the replacing caption (`swapIn`) starts its slap at full opacity. No empty or half-transparent frame (T2 f70–f72). |
| 5 | T2 | fixed | The "satchelhq" sleeve tag is drawn 40 px further up the arm than the kit's anchor (the kit's own tag is hidden on this hand with `tag={null}`). It stays above the 90 px bottom margin for the whole gag and only crosses it on the way in and out of frame. |
| 17 | T2 | fixed | "No admin key." lands on "there's" and is replaced at the "Not even ours." slap: about 1.7 s readable (rule 1.55 s). |
| 18 | T2 | fixed | Pinch → open: the arm's angle (34° → −6°) and the sleeve bend (0° → 26°) tween linearly over 6 frames around the pose change; the palm anchor holds and the tag rides along. |
| 19 | T3 | fixed | The widen to the full board runs from 9 f before to 5 f after the caption's contact, so it is finished before "Raw hash" is tossed in; the toss's high point now sits about 90 px below the caption's descenders. |
| 20 | T3 | fixed | Each rejected request rises to its own, slightly lower apex (200 / 175 / 150 px) and starts leaving before the next one rises; the reason pill pops in 2 f instead of 4. No overlaps. The three boops still land on the grid beats. |
| 21 | T3 | fixed | The message request holds 12 f longer before it sinks (sink starts at landing + 32, done on the beat after landing + 40; the tilt to the records follows and still ends about 1.1 s before the shorter T3 end). Its "ETH · message" tag is complete for about 0.5 s before the sink, and the punch-in frames it lower: about 54 px below the caption's descenders (was about 20). |
| 22 | T3 | fixed | The send and the message (and its tag) are clipped at the slot's mouth line, so nothing that sinks can show below the plate. |
| 23 | T4 | fixed (dropped) | The "Sell Satchel #7 · Ready to list ✓" mini sheet is gone (the tag already says it is listed). The opening is now: the card, the tag carried in and slapped on "it,", then a fully visible frost squeegee and the pill. Frost timing unchanged. |
| 24 | T4 | fixed | bob's hand (the Send attempt) recoils 1,100 px instead of 520, so it is off-frame (last fingertip f76) before it is removed (f79). The same fix for bob's first hand after the tag slap, which had the same bug (f28 → f29, not in the QA list). |

Also, for the v5 timeline: T4's small line "The history stops growing." now rises 4 f before the narrator's "The
history…" (the ice seal and push-in stay on "history"), so it still reads about 1.9 s on the shorter tail (rule 1.8 s).

## Needs another owner
- #2's P6, C1 and T1 swaps (their own caption helpers).

## Verification
- Half-scale clips on the v5 timeline: `marketing/video/out/qa-v5/fix/T2.mp4` (195 f), `T3.mp4` (210 f), `T4.mp4`
  (135 f).
- Full-resolution PNG sequences of every problem frame in `marketing/video/out/qa-v5/fix/seq/`, with sheets beside the
  clips: `T2-swap-full.png`, `T2-turn-full.png`, `T2-tag-margin.png`, `T3-raw-full.png`, `T3-bounce-full.png`,
  `T3-msg-full.png`, `T4-open-full.png`, `T4-exit-full.png`, `T3-end.png`, `T4-end.png`.
- `npx tsc --noEmit` passes for the whole project.

## Follow-up · verify-0116-end.md N3 (T3, low): fixed
The slot's clip line (from #22) sat at the plate's top edge, below the dark slot bar, so the sinking message's outline
and then its tag's dot and text were drawn over the bar for a frame each. Now, within the bar's width, the clip line
rises from the plate edge to the bar's top edge over the first 30 px of each sink. Whatever sinks goes into the bar,
and the bar is never drawn over (checked frame by frame: the send T3 f36–44, the message f140–149). While a request
rests in the slot, the clip stays at the plate edge, so its text is never cut. Only `src2/scenes/T3/index.tsx`
changed. New T3 half-scale clip (`out/qa-v5/fix/T3.mp4`) and sheets `T3-n3-msg.png`, `T3-n3-zoom.png`,
`T3-n3-send.png`; `npx tsc --noEmit` passes.
