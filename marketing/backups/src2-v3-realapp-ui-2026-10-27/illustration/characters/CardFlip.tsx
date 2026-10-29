import type { CSSProperties, ReactNode } from "react";
import { r2 } from "./geometry";

/**
 * The film's one 3D flip (T0, and back in T7): front ↔ back around the vertical axis with CSS 3D (perspective,
 * preserve-3d, backface-visibility hidden). Each face brings its own outline and hard drop; because the flip turns
 * about the Y axis, a face's drop stays straight down under the card for the whole turn (it foreshortens with it)
 * and only the visible face casts one.
 *
 * <CardFlip flip={p} width={800} height={504} front={<SatchelCard width={800} />} back={<CardBack width={800} />} />
 *
 * Props
 *   flip         0 = front, 1 = back, 2 = front again (any number; angle = flip × 180° × direction).
 *   width,height px of the faces (both faces are laid out at this size, top-left aligned).
 *   front, back  the two faces (SatchelCard / CardBack, or anything).
 *   perspective  px (default 2400, as the motion kit's FlipCard).
 *   direction    1 (default: the left edge swings toward the viewer) or −1 (the right edge does).
 *   mode         "3d" (default) or "flat" (a 2D scaleX flip, no perspective, if a scene needs zero distortion).
 *   pop          edge-on scale boost (default 0.06 → 1.06 at 90°, as the kit's FlipCard).
 * Timing: drive it with the kit, e.g. flip={flipAt(frame, at, fps).deg / 180} (SPRING2.quick, overshoots to ~196°).
 * Use this rather than the kit's FlipCard when the flip must be prop-driven (no internal clock), when a scene needs
 * the flat mode, or with CardWithCharms (its charm bar rides along face-on via flipWidth).
 */
export function CardFlip({
  flip,
  width,
  height,
  front,
  back,
  perspective,
  direction = 1,
  mode = "3d",
  pop = 0.06,
  style,
}: {
  flip: number;
  width: number;
  height: number;
  front: ReactNode;
  back: ReactNode;
  perspective?: number;
  direction?: 1 | -1;
  mode?: "3d" | "flat";
  pop?: number;
  style?: CSSProperties;
}) {
  const deg = flip * 180 * direction;
  const sc = 1 + pop * Math.abs(Math.sin(flip * Math.PI));
  if (mode === "flat") {
    const c = Math.cos((deg * Math.PI) / 180);
    const showFront = c >= 0;
    return (
      <div style={{ position: "relative", width, height, ...style }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${r2(Math.abs(c) * sc * 1000) / 1000}, ${r2(sc * 1000) / 1000})`, transformOrigin: "50% 50%" }}>
          {showFront ? front : back}
        </div>
      </div>
    );
  }
  const face: CSSProperties = { position: "absolute", left: 0, top: 0, width, height, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <div style={{ position: "relative", width, height, perspective: `${perspective ?? 2400}px`, ...style }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `scale(${r2(sc * 1000) / 1000}) rotateY(${r2(deg)}deg)` }}>
        <div style={face}>{front}</div>
        <div style={{ ...face, transform: "rotateY(180deg)" }}>{back}</div>
      </div>
    </div>
  );
}

/** The on-screen width factor of a flipping card (|cos|), for things that ride along face-on (the charm bar). */
export const flipWidth = (flip: number) => Math.abs(Math.cos(flip * Math.PI));
