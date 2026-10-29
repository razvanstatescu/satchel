import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./tokens";
import { slapAt } from "./motion";

/**
 * One parameter, `lift` (px above rest), drives the element AND its hard shadow:
 *   lift 0      → shadow offset = rest (the brand's 0 4px 0 ink, scaled)
 *   lift > 0    → the sticker rises, the shadow stays on the ground: offset = rest + lift
 *   lift = -rest → pressed flat: moved down by rest, shadow offset 0 (the brand's button press)
 * box-shadow follows border-radius; no blur, ever.
 */
export const stickerStyle = (o: {
  fill: string;
  outline: number;
  rest: number;
  radius: number;
  lift?: number;
  ink?: string;
}): React.CSSProperties => {
  const lift = o.lift ?? 0;
  const ink = o.ink ?? C.ink;
  return {
    background: o.fill,
    border: `${o.outline}px solid ${ink}`,
    borderRadius: o.radius,
    boxSizing: "border-box",
    boxShadow: `0 ${Math.max(0, o.rest + lift)}px 0 ${ink}`,
    translate: `0 ${-lift}px`,
  };
};

/** For SVG stickers (charms, the sticker S): a hard drop-shadow that follows the alpha. Same lift model. */
export const hardShadowFilter = (rest: number, lift = 0, ink: string = C.ink) =>
  `drop-shadow(0 ${Math.max(0, rest + lift)}px 0 ${ink})`;

/** Sticker slap-on, mounted inside a <Sequence> that starts at the slap. Without w/h it hugs its content. */
export const SlapIn: React.FC<{
  w?: number;
  h?: number;
  padding?: string;
  fill: string;
  outline: number;
  rest: number;
  radius: number;
  origin?: string;
  children?: React.ReactNode;
}> = ({ w, h, padding, fill, outline, rest, radius, origin = "50% 50%", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, sy, lift, opacity } = slapAt(frame, fps, rest);
  return (
    <div
      style={{
        ...stickerStyle({ fill, outline, rest, radius, lift }),
        width: w,
        height: h,
        padding,
        opacity,
        scale: `${sx} ${sy}`,
        transformOrigin: origin,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Peel: a dog-ear. The peel direction is 45° from the corner into the sticker; the fold line is perpendicular
// to it at distance progress * (w + h) / √2 (progress 1 = the far corner). The stuck part keeps the face; the
// peeled part flips over the fold (a CSS reflection matrix) and shows the backing. Its hard shadow grows as it
// lifts. Keep progress ≤ 0.3 for a corner curl; past that the flap pokes beyond the edges (a page turn).
// ---------------------------------------------------------------------------------------------
type Pt = { x: number; y: number };
export type Corner = "tl" | "tr" | "bl" | "br";

/** Keep the part of a convex polygon where (p - c)·u >= d (Sutherland–Hodgman against one line). */
const clipHalfPlane = (poly: Pt[], c: Pt, u: Pt, d: number, keepAbove: boolean): Pt[] => {
  const side = (p: Pt) => ((p.x - c.x) * u.x + (p.y - c.y) * u.y - d) * (keepAbove ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
};

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** pad: how far the face's own outline and hard shadow reach outside w × h (keep them on the stuck side). */
export const peelGeometry = (w: number, h: number, progress: number, corner: Corner, pad = 0) => {
  const c: Pt = { x: corner.includes("r") ? w : 0, y: corner.includes("b") ? h : 0 };
  const u: Pt = { x: (corner.includes("r") ? -1 : 1) / Math.SQRT2, y: (corner.includes("b") ? -1 : 1) / Math.SQRT2 };
  const d = Math.max(0.001, progress) * ((w + h) / Math.SQRT2);
  const box = rect(0, 0, w, h);
  const stuck = clipHalfPlane(box, c, u, d, true);
  const stuckClip = clipHalfPlane(rect(-pad, -pad, w + pad, h + pad), c, u, d, true);
  const peeled = clipHalfPlane(box, c, u, d, false);
  const q = c.x * u.x + c.y * u.y + d; // fold line: p·u = q
  // reflection across the fold: p' = (I - 2uu^T) p + 2 q u   → CSS matrix(a, b, c, d, e, f)
  const m = [1 - 2 * u.x * u.x, -2 * u.x * u.y, -2 * u.x * u.y, 1 - 2 * u.y * u.y, 2 * q * u.x, 2 * q * u.y];
  const fold = stuck.filter((p) => Math.abs((p.x - c.x) * u.x + (p.y - c.y) * u.y - d) < 0.01); // crease ends
  return { stuckClip, peeled, matrix: `matrix(${m.map((v) => v.toFixed(5)).join(",")})`, fold };
};

export const polygon = (pts: Pt[]) =>
  pts.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${pts.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(",")})`;

export const Peel: React.FC<{
  w: number;
  h: number;
  progress: number; // 0 flat → 0.3 a dog-ear (stop here, then detach) → 1 fully turned over
  corner?: Corner;
  radius: number;
  outline: number;
  rest: number;
  backing?: string; // the underside: white for the Satchel card (its back), sunken for paper stickers
  children: React.ReactNode; // the face, drawn at w × h (it brings its own outline, radius and shadow)
}> = ({ w, h, progress, corner = "br", radius, outline, rest, backing = C.surface, children }) => {
  const g = peelGeometry(w, h, progress, corner, rest + outline);
  const flapShadow = rest + 36 * Math.min(1, progress * 2.5); // the flap's shadow grows as it lifts
  const [a, b] = g.fold;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", inset: 0, clipPath: polygon(g.stuckClip) }}>{children}</div>
      {progress > 0.002 ? (
        <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 ${flapShadow}px 0 ${C.ink})` }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: g.matrix,
              clipPath: polygon(g.peeled),
              background: backing,
              border: `${outline}px solid ${C.ink}`,
              borderRadius: radius,
              boxSizing: "border-box",
            }}
          />
          {a && b ? (
            <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={outline} strokeLinecap="round" />
            </svg>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
