# Verification pass: Satchel 2.0 film v5

Film: `marketing/out/satchel-2-v5.mp4` (137.5 s, 1920×1080, 30 fps). Raw parts: `marketing/video/out/satchel-2-v5-h0.mp4`
(the cold open) and `satchel-2-v5-body.mp4` (the body). What changed and why: `marketing/script/SCRIPT-v5.md`.

v5 = v4 plus three changes:
- a new 8 s cold open (H0);
- fixes for the 57 issues the first review found;
- 3.5 s of still holds trimmed from the body.

Your job has two parts:
1. **Verify the fixes.** For every issue row in the first review that falls in your range, confirm it is fixed in v5.
   - Review notes: `marketing/notes/qa-v5/r1-0000-0052.md`, `r2-0052-0141.md`, `r3-0141-end-and-cuts.md`. Their times
     and frames are v4's.
   - What each owner did: `marketing/notes/qa-v5/fixes-*.md`.
2. **Find regressions and new problems.** The categories are the same as the first pass (`script/QA-BRIEF-v5.md`):
   broken animations, things too close in time, overlaps in space, and cross-scene cuts.
   - Be precise and conservative. A deliberate stylistic choice that works is not a bug.

## Time map (v4 → v5 film)
| scene | v4 start | v5 film start | offset |
|---|---|---|---|
| H0 (new) | — | 0.0 | — |
| H1 | 0.0 | 8.0 | +8.0 |
| H2 | 3.0 | 11.0 | +8.0 |
| P1 | 12.0 | 19.5 | +7.5 |
| P2 | 18.0 | 25.0 | +7.0 |
| P3 | 26.0 | 32.5 | +6.5 |
| P4 | 35.0 | 41.5 | +6.5 |
| P5 | 43.0 | 49.0 | +6.0 |
| P6 | 52.0 | 57.5 | +5.5 |
| C1 | 59.0 | 64.0 | +5.0 |
| T0 | 72.0 | 76.5 | +4.5 |
| T1 | 76.0 | 80.5 | +4.5 |
| T2 | 82.0 | 86.5 | +4.5 |
| T3 | 88.5 | 93.0 | +4.5 |
| T4 | 96.0 | 100.0 | +4.0 |
| T5 | 101.0 | 104.5 | +3.5 (its end is 1 s longer) |
| T6 | 110.5 | 115.0 | +4.5 |
| T7 | 116.0 | 120.5 | +4.5 |
| E1 | 126.5 | 131.0 | +4.5 (end 137.5) |

Inside a scene, every voice line keeps its v4 offset. Only scene tails moved, and T5's end got 1 s longer.

## Method
- Extract frames from the mp4 into your scratch folder under `marketing/video/out/qa-v5/verify/<you>/`.
- For each issue, extract every frame at 960 px around the mapped time, and 10 fps elsewhere.
- Use frame-difference spikes to find cuts and flickers:
  `ffmpeg -i … -vf "select='gt(scene,0.25)',showinfo" -f null -`
- Use `tile` strips to inspect.
- Read the scene source (`marketing/video/src2/scenes/<ID>/`) when you need intent.
- Stills from source are optional: `npx remotion still src2/index.ts <ID> … --port=<your port>`, never port 3000.
- No full renders (the CPU is shared).

## Output
Write `marketing/notes/qa-v5/verify-<range>.md` with two tables:
1. **Fix verification.** One row per first-review issue in your range, with these columns:
   `id (r1#n/r2#n/r3#n) | v5 t / frame | status (fixed / partly / not fixed / regressed) | what you see | evidence`
2. **New issues.** Use the same columns as the first pass:
   `t / frame | scene | category | severity | what you see | suggested fix`. Add an evidence strip for every high or
   medium issue.

End with a short "looks good" list.

Never edit anything outside your notes and scratch folders. No git. Never publish anything.
