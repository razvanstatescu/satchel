import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { getLength } from "@remotion/paths";
import { C, TILE_RADIUS } from "./tokens";
import { clamp } from "./motion";
import { peelGeometry, polygon } from "./Sticker";

// TransitionSeries renders the entering scene ON TOP of the exiting one, so each brand transition draws
// its effect inside the entering wrapper and leaves the exiting scene untouched.

// ---------------------------------------------------------------------------------------------
// 1. Coral tile iris: a coral tile (logo corner ratio) grows from a coral thing in scene A until it fills the
//    frame, then shrinks onto the coral thing in scene B. Coral is handed over, so the frame never shows two.
// ---------------------------------------------------------------------------------------------
type Box = { x: number; y: number; w: number; h: number; r?: number }; // frame px, top-left
type TileIrisProps = { from: Box; to: Box; outline?: number };

const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
  r: (a.r ?? TILE_RADIUS * Math.min(a.w, a.h)) + ((b.r ?? TILE_RADIUS * Math.min(b.w, b.h)) - (a.r ?? TILE_RADIUS * Math.min(a.w, a.h))) * t,
});

const coverFrom = (b: Box, W: number, H: number): Box => {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const half = 1.35 * Math.max(cx, W - cx, cy, H - cy); // a rounded square this big covers every corner
  return { x: cx - half, y: cy - half, w: 2 * half, h: 2 * half, r: TILE_RADIUS * 2 * half };
};

const TileIris: React.FC<TransitionPresentationComponentProps<TileIrisProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const closing = p < 0.5;
  const box = closing
    ? lerpBox(passedProps.from, coverFrom(passedProps.from, width, height), Easing.in(Easing.cubic)(p / 0.5))
    : lerpBox(coverFrom(passedProps.to, width, height), passedProps.to, Easing.bezier(0.16, 1, 0.3, 1)((p - 0.5) / 0.5));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: closing ? 0 : 1 }}>{children}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: box.r,
          background: C.coral,
          border: passedProps.outline ? `${passedProps.outline}px solid ${C.ink}` : undefined,
          boxSizing: "border-box",
        }}
      />
    </AbsoluteFill>
  );
};

export const tileIris = (props: TileIrisProps): TransitionPresentation<TileIrisProps> => ({ component: TileIris, props });

// ---------------------------------------------------------------------------------------------
// 2. Scene peel: scene A peels off like a sticker from a corner and reveals scene B ("Hand it over").
// ---------------------------------------------------------------------------------------------
type PeelOffProps = { corner?: "tl" | "tr" | "bl" | "br"; outline?: number };

const PeelOff: React.FC<TransitionPresentationComponentProps<PeelOffProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  const g = peelGeometry(width, height, p, passedProps.corner ?? "br");
  const outline = passedProps.outline ?? 8;
  const [a, b] = g.fold;
  // The crease (QA v5 #12): a round-capped line drawn over everything used to poke past the flap's border where the
  // fold meets the frame edge. It is now its own layer with the flap's transform, clipped to the flap's polygon grown
  // 1.5 px past the fold: a 2× stroke centred on the fold shows `outline` px on the flap side (meeting the border in a
  // clean mitre at the frame edge) and 1.5 px on scene B's side, which covers the flap's anti-aliased fold edge (its
  // white fill bleeds there). Extended past both ends, butt caps.
  const gCrease = peelGeometry(width, height, p + 1.5 / ((width + height) / Math.SQRT2), passedProps.corner ?? "br");
  const ext = (() => {
    if (!a || !b) return null;
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = ((b.x - a.x) / L) * 4 * outline;
    const dy = ((b.y - a.y) / L) * 4 * outline;
    return { x1: a.x - dx, y1: a.y - dy, x2: b.x + dx, y2: b.y + dy };
  })();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: polygon(g.peeled) }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ filter: `drop-shadow(0 ${interpolate(p, [0, 0.3], [8, 40], clamp)}px 0 ${C.ink})` }}>
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            transform: g.matrix,
            clipPath: polygon(g.peeled),
            background: C.surface,
            border: `${outline}px solid ${C.ink}`,
            boxSizing: "border-box",
          }}
        />
        {ext ? (
          <AbsoluteFill style={{ transformOrigin: "0 0", transform: g.matrix, clipPath: polygon(gCrease.peeled) }}>
            <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <line {...ext} stroke={C.ink} strokeWidth={2 * outline} strokeLinecap="butt" />
            </svg>
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const peelOff = (props: PeelOffProps = {}): TransitionPresentation<PeelOffProps> => ({ component: PeelOff, props });

// ---------------------------------------------------------------------------------------------
// 3. Ink swipe: one fat, round-capped ink stroke crosses the frame (covering A), then its tail follows
//    (revealing B). The all-ink middle frames are the doorway into a Night section.
// ---------------------------------------------------------------------------------------------
type InkSwipeProps = { tilt?: number };

const InkSwipe: React.FC<TransitionPresentationComponentProps<InkSwipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const { width: W, height: H } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const sw = 1.7 * H;
  const tilt = (passedProps.tilt ?? 0.12) * H;
  const d = `M ${-sw / 2 - 40} ${H / 2 + tilt} L ${W + sw / 2 + 40} ${H / 2 - tilt}`;
  const len = getLength(d);
  const ease = Easing.bezier(0.65, 0, 0.35, 1);
  const head = ease(interpolate(p, [0, 0.5], [0, 1], clamp));
  const tail = ease(interpolate(p, [0.5, 1], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: p < 0.5 ? 0 : 1 }}>{children}</AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {head - tail > 0.0005 ? (
          <path
            d={d}
            fill="none"
            stroke={C.ink}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${len * (head - tail)} ${len * 2}`}
            strokeDashoffset={-len * tail}
          />
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

export const inkSwipe = (props: InkSwipeProps = {}): TransitionPresentation<InkSwipeProps> => ({ component: InkSwipe, props });
