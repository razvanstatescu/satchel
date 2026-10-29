import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { EASE, FPS, tween } from "../../lib/time";
import type { S08T } from "./timing";

/**
 * The macro insert: an extreme close-up of real saddle stitching (the `stitch-macro-straight` plate) that sews itself
 * left → right, ONE STITCH AT A TIME, while the camera tracks the needle. The unsewn part of the seam is hidden by a
 * feathered patch of the same leather (the plate re-sampled from just above the seam), uncovered stitch by stitch.
 * Measured on the plate (1920 × 1080): seam centre y ≈ 524, stitches every ≈ 63 px.
 */
const PLATE = "images/stitch-macro-straight.jpg";
// right edge of each stitch along the seam (px, plate space), from a brightness scan of the plate
const STITCH_END = [68, 131, 191, 254, 317, 379, 441, 507, 568, 633, 697, 759, 825, 889, 954, 1017, 1080, 1139, 1201, 1265];
const FIRST = 6; // stitches already sewn (off to the left) when the shot opens
const COUNT = 9; // stitches sewn during the insert
const SEAM_Y = 524;

export function PhotoInsert({ T, available }: { T: S08T; available: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const a = T.macroCut;
  const b = T.sewStart + T.sewSlow;
  // linear stitch rate (a steady hand), quantised to whole stitches
  const p = Math.max(0, Math.min(1, (t - T.sewStart) / (b - T.sewStart)));
  const sewnF = p * COUNT;
  const n = Math.floor(sewnF);
  const glint = 1 - (sewnF - n);
  const edge = n <= 0 ? STITCH_END[FIRST - 1] + 18 : STITCH_END[Math.min(STITCH_END.length - 1, FIRST - 1 + n)] + 18;
  const newest = n > 0 ? STITCH_END[FIRST - 1 + n] - 14 : null;

  // camera: slow push and a track to the right, following the needle
  // (the needle is kept a little left of centre, with room ahead of it)
  const k = tween(frame, a, b + 0.1, 0, 1, EASE.standard);
  const scale = 1.34 + 0.08 * k;
  const ORIGIN = 0.34 * 1920;
  const from = STITCH_END[FIRST - 1];
  const edgeC = from + (STITCH_END[FIRST - 1 + COUNT] - from) * p;
  const target = 800 - 70 * p;
  const tx = target - (ORIGIN + (edgeC - ORIGIN) * scale);
  const open = tween(frame, a, a + 0.12, 0, 1, EASE.expoOut);

  if (!available) return null;
  return (
    <AbsoluteFill style={{ background: "#0d0907", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${tx}px) scale(${scale})`, transformOrigin: "34% 48.5%", filter: open < 1 ? `brightness(0.86) blur(${(1 - open) * 6}px)` : "brightness(0.86)" }}>
        <Img src={staticFile(PLATE)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }} />
        {/* the unsewn seam: leather from just above, feathered, uncovered stitch by stitch */}
        <div
          style={{
            position: "absolute",
            left: edge,
            top: SEAM_Y - 30,
            width: 1920 - edge + 40,
            height: 60,
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 36%, #000 64%, transparent 100%), linear-gradient(to right, transparent 0px, #000 10px)",
            WebkitMaskComposite: "source-in",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 36%, #000 64%, transparent 100%), linear-gradient(to right, transparent 0px, #000 10px)",
            maskComposite: "intersect",
          }}
        >
          <Img src={staticFile(PLATE)} style={{ position: "absolute", left: -edge, top: -(SEAM_Y - 30) + 58, width: 1920, height: 1080 }} />
        </div>
        {/* light catches the newest stitch as it is pulled tight */}
        {newest !== null ? (
          <div
            style={{
              position: "absolute",
              left: newest - 40,
              top: SEAM_Y - 40,
              width: 80,
              height: 80,
              borderRadius: 999,
              background: "radial-gradient(circle, rgba(255,236,190,0.55) 0%, rgba(255,236,190,0) 65%)",
              opacity: glint * 0.9,
              mixBlendMode: "screen",
            }}
          />
        ) : null}
      </AbsoluteFill>
      {/* lens falloff */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 62% at 45% 50%, rgba(10,6,4,0) 50%, rgba(10,6,4,0.6) 100%)" }} />
    </AbsoluteFill>
  );
}
