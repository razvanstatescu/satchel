import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, random } from "remotion";
import { C, F } from "../../brand/tokens";
import { clamp, EASE2, Peel, slapAt } from "../../motion";

/**
 * Hook typography: sticker captions (white fill, ink outline, hard ink shadow that snaps 0 → 8 px on contact) and
 * plain ink lines. Pure functions of a frame count (`f` = frames since the slap started), so the continuous H1→H2
 * shot can drive them from one clock. Entrances use the kit's slapAt (scale 1.2 → 1, contact f4, ±2° seeded tilt);
 * exits use the kit's Peel (a dog-ear 0 → 0.3 in 6 f, rip) followed by the detach (lift, turn, away in 8 f, fall).
 *
 * Widths: Funnel Display 800 advance widths in em with the caption tracking (−0.035 em per glyph), measured offline
 * from public/v2/fonts/FunnelDisplay-VF.ttf at wght 800 (Pillow, raqm). They size the sticker box exactly so the peel
 * geometry matches it, without measuring the DOM at render time.
 */
export const DISPLAY_EM: Record<string, number> = {
  "Stick it on.": 4.63,
  "Hand it over.": 5.645,
  "Bitcoin.": 3.362,
  "Ethereum.": 4.727,
  "Solana.": 3.347,
  "One NFT.": 4.07,
  "Whoever holds it": 7.54,
  "holds everything inside.": 10.735,
  "holds everything": 7.615,
  "inside.": 2.922,
};

const FPS = 30;
const BORDER = 6;
const RADIUS = 28;

/** The sticker caption box for `text` at `size` px: CaptionSlap's padding (0.12em 0.32em 0.18em) + a 6 px outline. */
export const stickerBox = (text: string, size: number) => ({
  w: Math.ceil(size * ((DISPLAY_EM[text] ?? text.length * 0.5) + 0.64) + 2 * BORDER),
  h: Math.ceil(size * 1.3 + 2 * BORDER),
});

const tiltOf = (seed: string) => (random(`caption-${seed}`) - 0.5) * 4; // −2° … +2° (captions only, never the logo)

function StickerFace({ text, size, w, h, shadow }: { text: string; size: number; w: number; h: number; shadow: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        boxSizing: "border-box",
        background: C.surface,
        border: `${BORDER}px solid ${C.ink}`,
        borderRadius: RADIUS,
        boxShadow: `0 ${shadow}px 0 ${C.ink}`,
        padding: "0.12em 0.32em 0.18em",
        fontFamily: F.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.035em",
        color: C.ink,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

/**
 * A hook/end sticker caption centred on (x, y). `f` = frames since its slap began (contact on f4); `out` = frames
 * since its peel-off began (undefined = stays). corner: which corner peels first.
 */
export function StickerCaption({
  text,
  size,
  x,
  y,
  f,
  out,
  seed,
  corner = "br",
  away = 1,
  exit = "fly",
}: {
  text: string;
  size: number;
  x: number;
  y: number;
  f: number;
  out?: number;
  seed: string;
  corner?: "tl" | "tr" | "bl" | "br";
  /** detach direction: +1 right, −1 left */
  away?: number;
  /** "fly": lifts off and flies up and away; "fall": comes unstuck and drops out of the bottom (gravity) */
  exit?: "fly" | "fall";
}) {
  if (f < 0) return null;
  const { w, h } = stickerBox(text, size);
  const { sx, sy, opacity } = slapAt(f, FPS, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const shadow = f >= 4 ? 8 : 0;
  const tilt = tiltOf(seed);
  // exit: a small dog-ear (rip), then the sticker lets go. "fly": lifts off and leaves up and away (fall easing);
  // "fall": comes unstuck and drops out of the bottom under gravity (it starts falling at once).
  const o = out ?? -1;
  const PEEL_F = exit === "fall" ? 4 : 6;
  const DET_F = 8;
  if (o >= PEEL_F + DET_F) return null;
  const peelMax = Math.min(0.3, (0.5 * h) / (w + h)); // a small dog-ear that stays inside a wide, short sticker
  const peel = o < 0 ? 0 : interpolate(o, [0, PEEL_F], [0, peelMax], { ...clamp, easing: EASE2.rip });
  const t = o < PEEL_F ? 0 : (o - PEEL_F) / DET_F; // 0 → 1 linear
  const det = exit === "fall" ? t : interpolate(t, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0.2, 0.75, 0.6) });
  const lift = o < 0 ? 0 : interpolate(o, [0, PEEL_F], [0, 10], clamp) + (exit === "fall" ? 0 : 30 * det);
  const style: CSSProperties = {
    position: "absolute",
    left: x - w / 2,
    top: y - h / 2,
    width: w,
    height: h,
    opacity,
    scale: `${sx * (1 + 0.06 * det)} ${sy * (1 + 0.06 * det)}`,
    rotate: `${tilt + away * (exit === "fall" ? 18 : 12) * det}deg`,
    translate:
      exit === "fall"
        ? `${away * 160 * det}px ${-lift + 60 * det + 1000 * det * det}px`
        : `${away * 700 * det}px ${-lift - 260 * det - 700 * det * det}px`, // it takes off at once and accelerates away
  };
  const face = <StickerFace text={text} size={size} w={w} h={h} shadow={shadow + lift * 0.6} />;
  return (
    <div style={style}>
      {peel > 0.002 ? (
        <Peel w={w} h={h} progress={peel} corner={corner} radius={RADIUS} outline={BORDER} rest={shadow + lift * 0.6} backing={C.surface}>
          {face}
        </Peel>
      ) : (
        face
      )}
    </div>
  );
}

/** A plain ink caption line (no box), left-aligned at (x, y top). Slaps in (scale 1.2 → 1, contact f4, ±2° tilt). */
export function InkLine({
  children,
  size,
  x,
  y,
  f,
  seed,
  origin = "50% 60%",
}: {
  children: ReactNode;
  size: number;
  x: number;
  y: number;
  f: number;
  seed: string;
  origin?: string;
}) {
  if (f < 0) return null;
  const { sx, sy, opacity } = slapAt(f, FPS, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const weight = interpolate(f, [2, 9], [620, 800], { ...clamp, easing: EASE2.out }); // the ink fills in as it lands
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: F.display,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.035em",
        color: C.ink,
        whiteSpace: "pre",
        opacity,
        scale: `${sx} ${sy}`,
        rotate: `${tiltOf(seed) * 0.6}deg`,
        transformOrigin: origin,
      }}
    >
      {children}
    </div>
  );
}

/** Ease helper for keyframed numbers (clamped). */
export const kf = (g: number, input: number[], output: number[], easing: (t: number) => number = Easing.inOut(Easing.quad)) =>
  interpolate(g, input, output, { ...clamp, easing });
