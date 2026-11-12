# Animation and transition review — Satchel 2.0 film v4 → v5

Film: `marketing/out/satchel-2-v4.mp4` (2:13, 1920×1080, 30 fps). Source: `marketing/video/src2` (Remotion; scenes in
`src2/scenes/<ID>/`). Script and change log: `marketing/script/SCRIPT-v4.md`; timeline: `marketing/script/timeline-v4.md`.
Brand/motion language: `marketing/notes/brand2-motion-bible.md` (stickers slap, peel, press, swing; hard ink shadows;
one coral fill per frame).

Scenes (s): H1 0–3 · H2 3–12 · P1 12–18 · P2 18–26 · P3 26–35 · P4 35–43 · P5 43–52 · P6 52–59 · C1 59–72 ·
T0 72–76 · T1 76–82 · T2 82–88.5 · T3 88.5–96 · T4 96–101 · T5 101–110.5 · T6 110.5–116 · T7 116–126.5 · E1 126.5–133.

The human says: "Some animations and transitions are a bit broken, some are too close to each other, or overlap."
Your job is to find every such problem in your range, precisely, so the scene owners can fix them. You don't fix code.

## What to look for
1. **Broken animations:** elements that pop in or out with no motion where the style expects a slap/peel/fade; flicker
   (an element visible for 1–3 frames, disappearing, reappearing); jitter or jumps mid-move; a spring that snaps back
   wrong; shadows detached from their sticker; wrong layering (things passing in front of what they should be behind);
   clipping (text or stickers cut by the frame edge, a phone/browser frame or another element when they shouldn't be);
   transitions that glitch (a peel/whip with a visible seam, a blank frame, a frame of the wrong scene); motion blur
   artefacts; elements that freeze while the rest moves.
2. **Too close in time:** two transitions or caption changes stacked within ~0.4 s; a caption replaced before it can be
   read (rule: it must be fully landed and still for ≥ 0.8 s + 0.25 s per word); several things landing on the same
   frame so none reads; a new beat starting while the previous move is still settling; hard cuts right after a whip.
3. **Overlaps in space:** text over text (an old caption still visible under a new one), captions over UI or stickers,
   stickers colliding (e.g. feature cards over tags, hands over key text), charms overlapping cards or labels,
   anything crowding the safe area (keep key text inside ~90 px of the edges), two coral fills competing.
4. **Cross-scene cuts** (at every scene boundary): continuity breaks (a card jumping position or size across a cut that
   should be continuous), duplicate elements across the cut, a caption from the previous scene lingering.
Also note **trim candidates**: holds, dead air or slow settles where 0.5–2 s could go without hurting (the film must
stay about the same length after a new intro is added).

## Method (you can't watch video: look at frames)
- Extract frames from the mp4 for your range (use your own scratch folder under `marketing/video/out/qa-v5/<you>/`):
  every frame at 960 px around every transition/caption change, and 10 fps elsewhere. Example:
  `ffmpeg -ss 18 -to 26 -i marketing/out/satchel-2-v4.mp4 -vf "fps=30,scale=960:-2" out/qa-v5/r1/f_%05d.jpg`
- Find candidate problem frames quickly: frame-difference spikes outside intended cuts
  (`ffmpeg -i … -vf "select='gt(scene,0.25)',showinfo" -f null -` lists big changes), then inspect strips
  (`tile=6x4`) around each, frame by frame. Look at every caption change and every transition.
- Read the scene's source (`src2/scenes/<ID>/`) when you need to understand intent (e.g. is a pop intended?).
- Rendering stills from source is optional (`npx remotion still src2/index.ts <SCENE> out/… --frame=N --port=35xx`;
  never port 3000); the mp4 is the ground truth. Don't run full-film renders (shared CPU).

## Output
Write `marketing/notes/qa-v5/<range>.md`: a table, one row per issue, ordered by time:
| t (s) / frame | scene | category (broken / too-close / overlap / cut) | severity (high / med / low) | what you see | suggested fix |
plus a short "trim candidates" list (t range, what, how much could go) and a "looks good, don't touch" list.
Attach the evidence: for every high/med issue save a small strip PNG (e.g. `out/qa-v5/<you>/issue-<n>.png`) and
reference it. Be precise and conservative: a deliberate stylistic choice that works is not a bug.
Never edit anything outside your notes/scratch folders. No git. Never publish anything.
