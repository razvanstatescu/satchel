## 5. Transitions catalogue

**Used in v3** (concepts-v2 §4.1 "Transitions", the brief's continuity notes). Durations are at 30 fps; transitions
shorten a `TransitionSeries` by their length. Scenes in `src2/Main.tsx` sit in plain `<Sequence>`s, so most of these
are built inside the scenes (the outgoing scene's last frames, the incoming scene's first frames).

| # | Transition | Frames | Where | How |
|---|---|---|---|---|
| T1 | **Hard cut + slap-in** | 0 | The default, on the beat | The next scene's hero or caption slaps in on the cut (§2.1, §2.16) |
| T2 | **Frame peel** | 22 | H2→P1, T7→E1 | The whole frame curls off from a corner like a sticker, white backing, ink crease, growing shadow (`peelOff`, or the same geometry inside the scene) |
| T3 | **Whip with a 2-frame smear** | 8 (cut at f4) | T0's whip to #7; topic changes | Camera travel 1.15 × width, `EASE.expoIn` out / `expoOut` in, cut on the fastest frame. The two frames around the cut stretch 1.25 along the motion (`smear`). `whoosh-zip` peaks on the cut. Optional `CameraMotionBlur` on those frames only (≤ 0.4 s, samples ≤ 6, never on readable text) |
| T4 | **Camera punch-in** | 8–13 | H1 f80–93 (1.0 → 1.3 toward the charms), emphasis | `PushIn` (`punch`), never while text is being read |
| T5 | **The flip** | 10–14 | T0 (Night → Day), T7 (back to the front) | §2.16: rotateY on `quick`; Day wipes in with the angle |
| T6 | **Night blind** | 18 + bounce | C1, on the music stop | §2.16 `NightBlind` |
| T7 | **Tab switch** | 8 | T5 → T6 (Satchel #4) | The browser's new tab slaps forward (§2.1), the page content arrives 40 px lower on `land`. No fade |
| T8 | **Pop swap** | 8–10 | Match cuts on an object | A's sticker pops out (1 → 1.08 → 0 in 6 f), B's pops in at the same spot (`pop`) |
| T9 | `slide()` + `springTiming(land)` | 14 | Page pushes inside the phone mocks only | Built-in DOM presentation |
| T10 | `pushCut()` with `flashOpacity: 0` | 10 | Punch cuts | Built-in, no flash |

**Not in v3, kept as options:** the **coral tile iris** (`tileIris`, a coral handover between two coral things, for
social cut-downs) and the **ink swipe** (`inkSwipe`). Night in this film arrives by the blind and leaves by the flip.

**Drop (brand 1.0 or off-brand):**
- Film grain and vignette; leather textures; brass gradients and sheen.
- Light leaks (`@remotion/light-leaks`); the stitch wipe and every stitch device.
- `Trail` echoes; long or full-scene motion blur.
- The shader presentations (`zoomBlur`, `crossZoom`, `dreamyZoom`, `filmBurn`, `linearBlur`, `blurSlide`,
  `dissolve`, `ripple`, `crosswarp`, `swap`, `zoomInOut`, `bookFlip`).
- RGB split and glitch; rack focus and DOF.
- 3D fly-ins and exploded 3D layers. The flip is the only 3D.
- Cross-dissolves, lens flares, `clockWipe`, the built-in `flip()`, the circular `iris()`, and camera shake with
  rotation.

From the old cookbook, these survive in 2.0 form: the per-word slam (now captions and WordSlap), the line mask-up
(LineRise), stroke draw-ons (now in ink, and dashed for records), parallax (now flat), the hit-stop (inside the slap),
beat-synced cuts, and a single **speed ramp** on the catch (optional, once).

