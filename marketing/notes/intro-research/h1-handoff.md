# H1 hand-off for the H0 cold open

> **Update, 2026-11-11 (H0 v7, the coordinator's one authorised change to H1).** The card no longer slides in: in
> `scenes/H1/hook.tsx`, `slideAt()` returns 1, so the card is **at rest from H1 f0** (and at every negative frame).
> The camera's 1.12 → 1 settle, its preroll for negative frames, and BTC's fall are unchanged. H1 frames f5–89 are
> pixel-identical to before; only f0–4 differ. The slide-up described below (the "direction warning", the slide and
> lift numbers, and the card at negative g) is history. H0 now slaps the card down at its rest pose (`build.md`).

For the agent building **H0** (the ~8 s cold open before H1). H1 is unchanged: every pixel at frames ≥ 0 is identical to
v4/v5 (proof below). Paths are relative to `marketing/video/src2/`; line numbers are as of 2026-11-11.

## TL;DR
- **Negative frames: yes.** H1's world is a pure function of one clock `g` (H1 frame = `g`). `<HookShot g={g} />`
  (`scenes/H1/hook.tsx:364`) and the data version `h1PoseAt(g)` (`scenes/H1/hook.tsx:463`) give sensible, continuous
  values for any `g < 0`. The card keeps sliding up from below, BTC keeps falling and the camera eases into its pull-back.
  The join at `g = 0` is continuous in position and velocity (C1). H0 can render H1's own world for its last frames:
  ```tsx
  import { HookShot } from "../H1/hook";
  // in H0, for its last N frames (N ≤ 12 recommended): g runs −N … −1, then H1 takes over at g = 0
  <HookShot g={frame - durationInFrames} />
  ```
  `HookShot` has no sound (H1's SFX live in `scenes/H1/index.tsx`), so H0 owns its own audio.
- **Direction warning.** At H1 frame 0 the card is **rising** into place: it is 85 % of the way through a slide up from
  below, decelerating, lifted 6 px. It is not slapping down. An H0 that ends on a slap-down onto that spot will not
  continue H1's motion. Either:
  - render `HookShot` for the last frames: the empty Day frame from g −12, the coral band entering from the bottom at
    g ≈ −10, BTC entering the top edge at g −1; or
  - build H0's own card and cut on g 0, matching the frame-0 pose in the table below. On screen the card then moves up
    17.7 px in f0→f1 and settles by f12, which reads like the rebound after a slap if H0's contact lands about 2 frames
    before.

## What is on screen, H1 frames 0–12
- **Ground:** the Day ground `C.ground` `#f6f5fb` (`brand/tokens.ts:4`), flat (no grain, vignette or gradient).
  `HookShot` fills the frame with it (`hook.tsx:364`).
- **Camera:** a world layer transformed by `translate(960, 540 + thump) scale(z) translate(−cam.x, −cam.y)`
  (`hook.tsx:380`). At g 0: centre (900, 600), zoom **1.12** (`CAM_OPEN`, `hook.tsx:86`). It pulls back to (960, 540) at
  zoom 1 over g 0–15 on `EASE2.out` = bezier(0.16, 1, 0.3, 1) (`motion/motion.ts:47`), mixed by `mixCam` (zoom in log
  space, centre without swing; `hook.tsx:66`, `camAt` `hook.tsx:88`). Rates at g 0: zoom −4.7 %/f instantaneous
  (−4.0 % averaged over g 0→1), centre +20.8 / −20.8 world px in g 0→1. No thump until hookLand (g 75; `hook.tsx:379`).
- **The card:** Satchel #7, the shared value card (`SatchelCard`, `components/Sticker.tsx:367`: coral band "Satchel #7"
  with the white S, "≈ $8,000.00", value bar, "BTC 50% · ETH 25% · SOL 15% · +1"; no pill, no "Yours"). It sits inside
  `CardWithCharms` (`illustration/characters/CardWithCharms.tsx:60`), which draws the **empty charm bar** (two posts, bar
  and three jump rings) under it from frame 0. World size `CW` 720 × `CH` 453.6 (k 1.8; `hook.tsx:32–34`), centre x `X0`
  900, rest top `TOP` 350 (`hook.tsx:36–38`).
  - Rotation 0°, scale 1, squash 0. The hand-off swing only starts at g 48 (`handoffAt`, `motion/HandOff.tsx:18`).
  - The slide (`slideAt`/`cardAt`, `hook.tsx:124–128`): `SLIDE_FROM` 0.85 of the way at g 0, ease-out cubic to rest by
    `T.cardSettle` 5 (`scenes/H1/timing.ts:27`). The world top is `TOP + (1 − slide) × 640`.
  - World velocity at g 0: 57.6 px/f upward (instantaneous); g 0→1 averages 46.9 px/f.
  - Lift (height above rest): `min(1 − slide, 0.15) × 40` = **6 px at g 0**, 0 by g 5.
  - Hard ink drop (`REST + lift`): 7.2 px at rest, **13.2 world px = 14.8 screen px at g 0**. Only the card and the
    hands cast drops; hanging charms have none.
- **BTC** (`fallAt`, `hook.tsx:158`; `FallingCharm`, `hook.tsx:273`): mid-fall at the top left on frame 0, the poster
  frame. Its pivot (stem top) is at world (400, 150), on a quadratic Bézier via (420, 886) to its ring (707.5, 846). It
  falls at **101.2 world px/f** (velocity (2.75, 101.2)), accelerating, and snaps onto its ring at g **8** (`T.btcSnap`,
  `timing.ts:28`).
  - Face `{ blink: 1, smile: 0.6 }` (eyes shut, small smile; `hook.tsx:285`), body angle −8°.
  - Smeared 1.25× along its motion, 0.8× across.
  - Two ink speed lines trail it for g ≤ 3 (`hook.tsx:284`).
  - Drawn in front of the card.
  - At the snap: squash 0.85 about the coin's top for 2 frames, then its personality swing (`personalSwing`,
    `hook.tsx:187`). Its eyes pop open on g 10 (`faceAt`, `hook.tsx:229`).
- **ETH:** not on screen until g 8. It drops straight down from (900, −170) **behind** the card (drawn before it), is
  visible above the card for g 8–11 and pops out under it on its snap at g 15. **SOL** starts at g 16 (off this range).
- **Captions:** none until "Stick it on." starts its slap at g 11 (`T.stickIn`; `hook.tsx:431`; `StickerCaption`,
  `scenes/H1/stickers.tsx:72`). At g 11 its opacity is 0; at g 12 it is at 50 % and 1.19× scale. Contact is at g 15, in
  the screen-space band centred at y 166.
- **Hands, lockup, thump, peel:** none (alice enters at g 27).

| g | camera (x, y, zoom) | card face on screen (left, top, w × h) | card drop on screen | BTC coin centre on screen · ⌀ | ETH | bar charms |
|---|---|---|---|---|---|---|
| -12 | 776.6, 723.4, 1.4868 | 608.2, 1146.4, 1070.5 × 674.4 | 19.6 px | (350.9, −1983.2) · 192.7 px, falling 101.2 px/f | – | empty |
| -10 | 779.6, 720.4, 1.4752 | 606.5, 976.1, 1062.1 × 669.1 | 19.5 px | (359.4, −1660.4) · 191.2 px | – | empty |
| -8 | 788.7, 711.3, 1.4408 | 601.7, 813.0, 1037.3 × 653.5 | 19.0 px | (368.3, −1304.4) · 186.7 px | – | empty |
| -6 | 804.3, 695.7, 1.3852 | 593.9, 664.5, 997.3 × 628.3 | 18.3 px | (377.1, −931.3) · 179.5 px | – | empty |
| -4 | 827.2, 672.8, 1.3109 | 583.5, 536.8, 943.9 × 594.6 | 17.3 px | (385.6, −557.1) · 169.9 px | – | empty |
| -3 | 841.7, 658.3, 1.2678 | 577.5, 482.3, 912.8 × 575.1 | 16.7 px | (389.5, −374.3) · 164.3 px | – | empty |
| -2 | 858.5, 641.5, 1.2213 | 571.0, 434.6, 879.3 × 554.0 | 16.1 px | (393.3, −196.6) · 158.3 px | – | empty |
| -1 | 877.9, 622.1, 1.1718 | 564.1, 394.1, 843.7 × 531.5 | 15.5 px | (396.8, −25.5) · 151.9 px | – | empty |
| **0** | **900.0, 600.0, 1.1200** | **556.8, 360.8, 806.4 × 508.0** | **14.8 px** | **(400.0, 137.6) · 145.2 px, 101.2 px/f** | – | empty |
| 1 | 920.8, 579.2, 1.0753 | 550.5, 343.1, 774.2 × 487.7 | 11.0 px | (404.9, 291.2) · 139.4 px | – | empty |
| 2 | 935.3, 564.7, 1.0462 | 546.5, 335.7, 753.2 × 474.5 | 8.9 px | (414.6, 433.8) · 135.6 px | – | empty |
| 3 | 944.5, 555.5, 1.0285 | 544.0, 334.6, 740.5 × 466.5 | 7.8 px | (431.1, 566.3) · 133.3 px | – | empty |
| 4 | 950.2, 549.8, 1.0177 | 542.5, 337.4, 732.8 × 461.6 | 7.4 px | (456.6, 687.4) · 131.9 px | – | empty |
| 5 | 953.9, 546.1, 1.0111 | 541.5, 341.7, 728.0 × 458.6 | 7.3 px | (494.0, 792.6) · 131.0 px | – | empty |
| 6 | 956.2, 543.8, 1.0069 | 541.0, 344.9, 724.9 × 456.7 | 7.2 px | (546.1, 875.2) · 130.5 px | – | empty |
| 7 | 957.7, 542.3, 1.0042 | 540.6, 346.9, 723.0 × 455.5 | 7.2 px | (616.3, 926.4) · 130.1 px | – | empty |
| 8 | 958.6, 541.4, 1.0024 | 540.3, 348.2, 721.8 × 454.7 | 7.2 px | on its ring (snap) | behind the card, coin (901.2, −82.2) | BTC 0.0° |
| 10 | 959.6, 540.4, 1.0007 | 540.1, 349.5, 720.5 × 453.9 | 7.2 px | on its ring | coin (900.4, 117.0) | BTC −7.6° |
| 12 | 959.9, 540.1, 1.0001 | 540.0, 349.9, 720.1 × 453.7 | 7.2 px | on its ring | coin (900.1, 389.2), behind the card | BTC −11.4° |

Screen px at 1920 × 1080. "Card face" is the lifted face, without its drop. The coin ⌀ includes the outline. The values
come from `h1PoseAt(g)` with `worldToScreen` (`hook.tsx:450`) and `H1_WORLD` (`hook.tsx:447`), which use the same
functions the render uses.

## Negative frames: before and after this pass
- **Before:** every pose was clamped to its frame-0 value.
  - The card was frozen for g < 0, so its velocity would jump from 0 to 47 px/f at g 0.
  - BTC was invisible for g < 0 (`visible: g >= 0`) and would pop into the frame mid-air at g 0.
  - The camera was frozen. The join would show.
- **After:** three continuations, used only for g < 0 (frames ≥ 0 take exactly the old code paths):
  - **Card** (`slideAt`, `hook.tsx:124`): slides up from below the frame at the ease's frame-0 speed
    (`SLIDE_V0` = 0.09 of the travel per frame = 57.6 px/f), lift held at 6. It enters the bottom edge at g ≈ −10.
  - **BTC** (`hook.tsx:173`): falls in a straight line at its frame-0 velocity. It enters the top edge at g −1.
  - **Camera** (`openMixAt`, `hook.tsx:81`): eases into its pull-back over `PREROLL_F` 12 frames. It starts from rest at
    zoom 1.487 (held before g −12) and reaches EASE2.out's own starting speed (`OPEN_V0` = 1 / (0.16 × 15) per frame)
    exactly at g 0. The pull-back is one in-out move from g −12 to g 15.
  - Everything else is off at g < 0: charms hidden on the bar, no hands or captions, peel 0, the hand-off at rest.
- **On-screen speed across the join** (card top, px/f): −80 (g −6), −61, −44, −33 → **g 0** → −18, −7, −1, +3: a
  smooth deceleration. BTC's coin: +175, +186, +174, +163 → **g 0** → +154, +143, +133. With the camera held
  instead, the card would drop from −64.5 to −17.7 px/f in one frame.
- **Proof that H1 is unchanged:** full-resolution stills of H1 at frames 0, 5, 8, 12 and 30, rendered before and after
  the refactor, have a **maximum per-pixel difference of 0** (0 of 2,073,600 pixels differ). The files are in
  `video/out/qa-v5/fix/hook/before/` and `.../after/`. Stills of the preroll (g −20 … +3, rendered through a temporary
  `<HookShot g={frame − 24} />` harness, since reverted) are in `video/out/qa-v5/fix/hook/neg2/`.
- **Limits:**
  - Before g −12 the frame is empty Day ground, with the camera held at zoom 1.487, so start H0's handover no earlier
    than about g −12.
  - The world, camera and timing constants live in `H1_WORLD` and `T` (`scenes/H1/timing.ts:25`). Re-voicing changes
    T's VO-derived cues, but not frames 0–23 (the snaps sit on the beat grid).
  - The music starts at film time 0 in `AudioLayer`. If H0 plays before H1, the score's glockenspiel pickup and the
    groove at hookLand (2.5 s) have to move with H1; that is the timeline pipeline's job, not `HookShot`'s.
