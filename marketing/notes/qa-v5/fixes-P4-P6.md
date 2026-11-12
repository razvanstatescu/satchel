# QA v5 fixes: P4, P5, P6 (scene builder 3)

Fix pass on the v5 timeline (P4 33.5–41, P5 41–49.5, P6 49.5–56). All times are derived from `getScene()`/`wordAt()`,
so the frames below are scene-local (`P4+90` = 90 frames into P4). Verified with half-scale clips
(`marketing/video/out/qa-v5/fix/P4.mp4`, `P5.mp4`, `P6.mp4`), frames extracted around every fix
(`out/qa-v5/fix/x/`), stills (`out/qa-v5/fix/p4`, `p5`, `p6`) and `npx tsc --noEmit` (clean).

## Rows

| Row | Scene | Status | What changed |
|---|---|---|---|
| r1 #17 (med) | P4 | fixed | The pills pop in place in their own lane between the caption and the card: no rise; the card is 44 px lower and a little smaller (600 → 560 px). They sit about 50 px below the caption's descenders and 16 px above the band. "Not allowed" holds 1.4 s (the stranger now taps on the beat after "Only", P4+90). |
| r1 #18 (med) | P4 | fixed | The stranger leaves fully out of frame by P4+134. "Not allowed" is gone at P4+143, so "Who can spend" slaps in alone (P4+146–150). The teammate enters at P4+151 from the right edge at mid-height, a different path from the stranger's. |
| r1 #10 (med, P4/P5 parts) and r2 #2 (P6 part) | P4–P6 | fixed | `Caption` (`scenes/P5/rig.tsx`, used only by P4–P6) keeps the outgoing caption 2 f past the incoming slap's start, until the new one is fully opaque. No swap has an empty frame (checked at P4+84, P5+115, P5+178, P6+67). |
| r1 #20 (med) | P5 | fixed | No tuck and no small badge. After "Claimed" (P5+84) the claim link peels (a dog-ear) at P5+94 and leaves up, then right, passing above bob's glove. It is gone at P5+108: 6 f before the caption swap (P5+114) and 15 f before the swing lifts (P5+123). |
| r1 #19 (low) | P5 | fixed | The claim link lands at P5+56 (was +49), 11 f after "Even by link." has landed. |
| r1 #5 (low, P5 part) | P5 | fixed | alice's tag holds a fixed screen x (left edge ≈ 100 px), compensating the camera follow and the push. bob's tag rides with his hand (it used to float in ahead of it), with its right edge ≥ 90 px inside the frame at rest. |
| r2 #4 (med) | P6 | fixed | "Hand over a treasury." lands with the relay and holds to the end, over the finale and the frames frozen under the Night blind (about 2.5 s). Its slap starts 1 f before the whip's cut, so the cut frame isn't empty. |
| r2 #3 (low) | P6 | fixed, hold partly | "Or take an offer." rides out with the desk's whip, so it no longer sits over the relay. It lands as "trade," ends (P6+70), so its still hold is ~1.5 s. 1.8 s would need it to land during "one trade," or to linger into the relay. |
| r2 #1 (low) | P6 | fixed | The offer is drawn in front of the hanging #30: at the crossing the charms pass behind it, and "42,000 NEAR" stays readable. |
| r2 #5 (low, P6 part) | P6 | fixed | "old-team.near" is ≥ 90 px from the left. "new-team.near" rides with its hand (no floating tag), with its right edge ≥ 90 px inside. In the finale the holders grip the cards' outer edges, so no sleeve comes down from the top; the tag sits beside the sleeve. |

## P6 → C1 (blind over P6's last frame)
- P6 clamps its frame to its last frame, so it renders a frozen final pose for the extra frames under the blind.
- With the 0.5 s v5 tail, the finale is one quick in-sync rock that comes level on the last frame. The frozen frame is a clean still: both cards, the caption fully landed, no hand or whip in motion.
- The finale's charm jingle moved off the music stop; it rings out before 56.0 s.
- #30's holder stops its fingers short of "≈ $171,000.00".

## Also
- v5 timeline: P6 now starts mid-bar (49.5 s), so the desk landing, the whip and the relay sit on VO-tied beats (same scene times as v4). P5's end bounce on the beat after V10 is skipped when the shorter tail has no room for it.

## Files changed
`src2/scenes/P4/index.tsx` · `src2/scenes/P5/index.tsx` · `src2/scenes/P5/rig.tsx` (`Caption`) · `src2/scenes/P6/index.tsx`,
`timing.ts`, `Desk.tsx`, `Relay.tsx`, `Finale.tsx`. No shared files; nothing outside P4–P6 imports these helpers.

## For other owners
- r1 #10's optional "slap two-line captions from ~1.1" needs the shared kit's `CaptionSlap` (`src2/motion/script.tsx`, fixed at 1.2). Not changed.
- One of my P6 clip renders may have overlapped the C1 owner's render for part of its run.

## Follow-ups from verify-0008-0116 (v5 render)

| Row | Scene | Status | What changed |
|---|---|---|---|
| N1 (med) | P4 | fixed | Only the tag's rest spot on the sleeve is clamped inside the margin. The teammate's entry, press and exit offsets are added to it, so "sam.near" arrives and leaves with the sleeve and never floats alone (checked at P4+152–210). |
| N2 (low) | P5, P6 | fixed | "alice.near" (P5) and "old-team.near" (P6 relay) pop out (6 f, like the status pills) just before their card lifts. The leaning card never covers them, and they don't come back, so nothing trails alice's wave and exit or the runner's fall-back. "new-team.near" rides its hand's entrance but holds its spot when the hand closes onto #21, so it sits ~30 px clear of the card's edge and ~100 px inside the frame. "bob.near" and the finale tag were already attached, inside the margin and never covered. They stay on the gloves: these hands sit too close to the frame edge for a sleeve tag inside 90 px without moving the cards. |
| N3 (low) | P5 | fixed | "Claimed" pops 7 f earlier (P5+77) and settles in 5 f. The peel starts as late as it can (P5+98: dog-ear 3 f, away 7 f), so "Claimed" sits still for ~0.6 s before the link lifts (P5+101). The link is gone at P5+108, 6 f before the caption swap. |
| r2 #3 | P6 | left as is | As asked. |

Files: `src2/scenes/P4/index.tsx`, `src2/scenes/P5/index.tsx`, `src2/scenes/P6/Relay.tsx`. `tsc` clean. Stills:
`out/qa-v5/fix2/`. Half-scale clips: `out/qa-v5/fix/P4.mp4`, `P5.mp4`, `P6.mp4` (re-rendered once the shared CPU was free).
