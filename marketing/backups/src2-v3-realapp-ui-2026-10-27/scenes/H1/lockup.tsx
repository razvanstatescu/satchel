import { interpolate, spring } from "remotion";
import { Lockup, Mark } from "../../brand/Logo";
import { clamp, EASE2, slapAt, SPRING2 } from "../../motion";

const FPS = 30;

/**
 * The lockup as two layers so the motion only ever touches the MARK (motion bible §3, amendment A7):
 *   slap   the mark slaps in as a unit (scale 1.22 → 1, contact f4, 5% squash), its S's hard shadow catches up
 *          (drop 1.6 → 0.6 → 1 on rebound, never below 6 units); the wordmark then slides out from behind the tile
 *          (word 0 → 1 in 12 f, out). Never rotated, never on coral, outline and shadow always on once built.
 *   press  the brand's button press (E1, on endPress): the mark sinks 4 px into its shadow (drop 1 → 0.4, a 4% squash
 *          about its base, fully pressed ON `pressAt`), holds 2 f, springs back on rebound (pops above rest).
 * `f` = frames since the slap started; `frame` and `pressAt` are on the same clock (scene frames).
 */
export function SlapLockup({ x, y, h, f, frame, pressAt }: { x: number; y: number; h: number; f: number; frame?: number; pressAt?: number }) {
  if (f < 0) return null;
  const slap = slapAt(f, FPS, 0, { from: 1.22, squash: 0.05, drop: 0 });
  const land = f < 4 ? 1.6 : f < 6 ? 0.6 : 0.6 + 0.4 * spring({ frame: f - 6, fps: FPS, config: SPRING2.rebound });
  const word = interpolate(f, [4, 16], [0, 1], { ...clamp, easing: EASE2.out });
  let drop = land;
  let squash = 0;
  let dy = 0;
  if (frame !== undefined && pressAt !== undefined && frame >= pressAt - 3) {
    if (frame <= pressAt) {
      const p = interpolate(frame, [pressAt - 3, pressAt], [0, 1], { ...clamp, easing: EASE2.fall });
      drop = 1 - 0.6 * p;
      squash = 0.04 * p;
      dy = 4 * p;
    } else if (frame <= pressAt + 2) {
      drop = 0.4;
      squash = 0.04;
      dy = 4;
    } else {
      const r = spring({ frame: frame - pressAt - 2, fps: FPS, config: SPRING2.rebound }); // overshoots ≈18%
      drop = 0.4 + 0.6 * r;
      squash = 0.04 * (1 - r);
      dy = 4 * (1 - r);
    }
  }
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y }}>
        <Lockup height={h} word={word} tile={0} draw={0} />
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: h,
          height: h,
          opacity: slap.opacity,
          translate: `0 ${dy}px`,
          scale: `${slap.sx * (1 + squash * 0.5)} ${slap.sy * (1 - squash)}`,
          transformOrigin: squash > 0 ? "50% 100%" : "50% 50%",
        }}
      >
        <Mark size={h} drop={drop} />
      </div>
    </>
  );
}
