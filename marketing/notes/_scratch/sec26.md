### 2.6 The hand-off (the brand's signature)

The brand defines one signature motion: "on hand-off the card swings like a charm (a 10° pendulum, 600ms) and slides
to the new owner". The world bible makes it a full performance ("The swing": lift y −12 px, scale 1.04, rotate up to
10° toward the travel; slide 600 ms with the pendulum −10° → +5° → −2° → 0; land with the shadow back at rest; charms
1.5× and 60–90 ms behind, eyes closed; jingle at the apex). Every hand-off uses it: H1, P5, the P6 vignettes, the sale
in C1 (with flat faces) and T7.

| f | Action | SFX (`src2/data/sfx.json`) |
|---|---|---|
| (−8 to 0) | Optional peel lead-in: the hand pinches a corner and dog-ears it 0 → 0.25 (§2.2) | `sticker-peel` |
| 0–6 | **Lift:** up 12 px (the hard shadow stays on the ground: drop 4k → 4k + 12), scale 1.04, lean 10° into the direction of travel (`land`) | `swing-swish` (peak f10) |
| 6–24 | **Slide 600 ms** (cubic in-out) on a shallow arc (8% of the distance). The pendulum is released from the 10° lean: **10° (f6) → −4.9° (f12) → +2.4° (f18) → −1.2° (f24)** (`SPRING2.handoff`). Charms ride at 1.5×, 2–3 f late, eyes closed | `charm-jingle`, its peak on the apex (f15) |
| 24–27 | **Set-down:** ease-in onto the new owner; **contact f27**: pressed flat, squash 4%, the residual swing is cancelled | `sticker-slap` + `chain-clink` |
| 27–35 | Rebound to rest, shadow back at 4k; the charms open their eyes (+1 f) and settle on their personality springs | `pop` on the name-tag swap |

The S printed on the card's coral band tilts with the card here, and only here, because the brand defines this
motion. Never tilt the mark, the sticker S or the wordmark on their own. In T7 the flip back to the front (§2.16) runs
inside this move, and the USDC tag crosses the card mid-frame, landing on the "landing" marker (2:02.0) with the
jingle.

```tsx
// brand2/HandOff.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, EASE2, SPRING2 } from "./motion";
import { stickerStyle } from "./Sticker";
import { C } from "./tokens";

/**
 * The hand-off, "the swing" of concepts-v2 §4.1, on one clock (30 fps):
 *   f0–6    lift: the card rises 12 px (its hard shadow stays on the ground), scales to 1.04 and leans 10° into
 *           the direction of travel (SPRING2.land)
 *   f6–24   slide 600 ms (cubic in-out) on a shallow arc whose apex (f15) carries the charm-jingle; the pendulum,
 *           released at the 10° lean, runs 10° → -4.9° (f12) → +2.4° (f18) → -1.2° (f24) (SPRING2.handoff)
 *   f24–27  set down (ease-in); contact f27 = sticker-slap; squash 4%; the shadow returns to rest; residue cancelled
 * The charms ride at 1.5× the card's angle, 2 f (SOL, ETH) or 3 f (BTC) late, eyes closed from f6 to f27.
 */
export const HANDOFF = { liftEnd: 6, slideStart: 6, apex: 15, slideEnd: 24, contact: 27 } as const;

export const handoffAt = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }) => {
  const T = HANDOFF;
  const dir = Math.sign(o.toX - o.fromX) || 1;
  const p = interpolate(frame, [T.slideStart, T.slideEnd], [0, 1], { ...clamp, easing: EASE2.swing });
  const up = spring({ frame, fps, config: SPRING2.land });
  const fall = interpolate(frame, [T.slideEnd, T.contact], [0, 1], { ...clamp, easing: EASE2.fall });
  const swing =
    frame < T.slideStart ? 10 * up : spring({ frame: frame - T.slideStart, fps, from: 10, to: 0, config: SPRING2.handoff });
  const settle = spring({ frame: frame - T.contact - 2, fps, config: SPRING2.rebound });
  return {
    x: o.fromX + (o.toX - o.fromX) * p,
    arcY: -0.08 * Math.abs(o.toX - o.fromX) * Math.sin(Math.PI * p), // apex mid-slide
    lift: frame < T.contact ? 12 * up - (12 + o.rest) * fall : -o.rest * (1 - settle),
    rotate: dir * swing * (1 - fall), // CSS degrees; positive leans the top toward +x
    scale: 1 + 0.04 * up * (1 - fall),
    squash: frame < T.contact ? 0 : 0.04 * (1 - spring({ frame: frame - T.contact - 1, fps, config: SPRING2.rebound })),
    eyesClosed: frame >= T.slideStart && frame < T.contact,
  };
};

/** A charm riding the hand-off: 1.5× the card's angle, lagF frames late (SOL 2, ETH 2, BTC 3). */
export const rideAngle = (frame: number, fps: number, o: { fromX: number; toX: number; rest: number }, lagF: number) =>
  1.5 * handoffAt(frame - lagF, fps, o).rotate;

/** The card on the hand-off clock (a plain sticker card here; in src2 wrap the shared SatchelCard the same way). */
export const HandOff: React.FC<{
  fromX: number;
  toX: number;
  y: number;
  w: number;
  h: number;
  rest: number;
  outline: number;
  children?: React.ReactNode;
}> = ({ fromX, toX, y, w, h, rest, outline, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = handoffAt(frame, fps, { fromX, toX, rest });
  return (
    <div
      style={{
        position: "absolute",
        left: m.x - w / 2,
        top: y + m.arcY - h / 2,
        width: w,
        height: h,
        ...stickerStyle({ fill: C.surface, outline, rest, radius: 28 * (w / 360), lift: m.lift }),
        rotate: `${m.rotate}deg`,
        transformOrigin: "50% -6%",
        scale: `${m.scale * (1 + m.squash)} ${m.scale * (1 - m.squash)}`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};
```

With the shared `SatchelCard`, put `handoffAt` on a wrapper div (`left/top`, `rotate`, `scale`, `transformOrigin`)
and pass `lift = m.lift / (8k)` while `m.lift ≥ 0`. On the pressed frames, translate the wrapper by −m.lift and set
the card's drop to 4k + m.lift. The render test shows the lean (f6), the −4.9° counter-swing at the apex, a level
arrival and contact f27, pressed flat.

**The card's face in the film** is the shared `SatchelCard`:
- A 1.586 : 1 ratio, with the coral band at the top (the frame's one coral) reading "Satchel #N" in Funnel Display
  800, and the sticker S at the right.
- Native amounts in tabular figures, and the charm bar along the bottom edge (world bible).
- The back (the flip, T0): white, with dashed record outlines under "History · N signatures" (§2.16).
- **No fiat total. No custom names on the band** (amendment A4): it always reads "Satchel #N".

### 2.7 Coral tile iris (optional; not in the v3 script)

A coral rounded square with the logo tile's corner ratio (21.9%) grows from a coral thing in scene A (in-cubic,
10 f) until it covers the frame, the cut happens under it, and it shrinks with expo-out (10 f) onto the coral thing in
scene B. **The locked script uses no coral floods** (its world is Day, with Night only for C1), so keep this for
social cut-downs or a director's request. The code (`tileIris`) is in §5.

