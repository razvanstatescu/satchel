// Small 2D helpers for the character rigs (screen coordinates: x right, y down; + angles are clockwise, as SVG rotate).

export type Pt = { x: number; y: number };

export const P = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, s: number): Pt => ({ x: a.x * s, y: a.y * s });
export const mix = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const len = (a: Pt) => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** Rotate a point about the origin by `deg` (clockwise on screen). */
export function rot(p: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** Unit vector for an angle measured from "up" (0 = up, 90 = right, −90 = left). */
export const dirUp = (deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
};

/** A stadium (capsule) from a to b with radius r, as an SVG path. */
export function capsulePath(a: Pt, b: Pt, r: number): string {
  let d = sub(b, a);
  let L = len(d);
  if (L < 1e-3) {
    d = { x: 0, y: -1 };
    L = 0;
  } else d = mul(d, 1 / L);
  const n = { x: -d.y, y: d.x };
  const p1 = add(a, mul(n, r));
  const p2 = add(b, mul(n, r));
  const p3 = sub(b, mul(n, r));
  const p4 = sub(a, mul(n, r));
  return `M ${r2(p1.x)} ${r2(p1.y)} L ${r2(p2.x)} ${r2(p2.y)} A ${r2(r)} ${r2(r)} 0 0 0 ${r2(p3.x)} ${r2(p3.y)} L ${r2(p4.x)} ${r2(p4.y)} A ${r2(r)} ${r2(r)} 0 0 0 ${r2(p1.x)} ${r2(p1.y)} Z`;
}

/**
 * A tapered capsule: the convex hull of a circle r0 at a and a circle r1 at b (a thumb: wide base, rounder tip).
 */
export function taperPath(a: Pt, b: Pt, r0: number, r1: number): string {
  const d = dist(a, b);
  if (d <= Math.abs(r0 - r1) + 1e-3) {
    const [c, r] = r0 >= r1 ? [a, r0] : [b, r1];
    return `M ${r2(c.x - r)} ${r2(c.y)} A ${r2(r)} ${r2(r)} 0 1 0 ${r2(c.x + r)} ${r2(c.y)} A ${r2(r)} ${r2(r)} 0 1 0 ${r2(c.x - r)} ${r2(c.y)} Z`;
  }
  const u = mul(sub(b, a), 1 / d);
  const n = { x: -u.y, y: u.x };
  const ca = (r0 - r1) / d;
  const sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const dp = add(mul(u, ca), mul(n, sa));
  const dm = sub(mul(u, ca), mul(n, sa));
  const Ap = add(a, mul(dp, r0));
  const Bp = add(b, mul(dp, r1));
  const Bm = add(b, mul(dm, r1));
  const Am = add(a, mul(dm, r0));
  const bigB = ca < 0 ? 1 : 0; // the tip arc spans more than 180° only when the tip is the larger end
  const bigA = 1 - bigB;
  return `M ${r2(Ap.x)} ${r2(Ap.y)} L ${r2(Bp.x)} ${r2(Bp.y)} A ${r2(r1)} ${r2(r1)} 0 ${bigB} 0 ${r2(Bm.x)} ${r2(Bm.y)} L ${r2(Am.x)} ${r2(Am.y)} A ${r2(r0)} ${r2(r0)} 0 ${bigA} 0 ${r2(Ap.x)} ${r2(Ap.y)} Z`;
}

/** A chain of tapered capsules whose radius runs from r0 at the first point to r1 at the last. */
export function taperChainPath(pts: Pt[], r0: number, r1: number): string {
  if (pts.length === 1) return taperPath(pts[0], pts[0], r0, r0);
  const segs = pts.slice(1).map((q, i) => dist(pts[i], q));
  const total = segs.reduce((x, v) => x + v, 0) || 1;
  const out: string[] = [];
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const ra = lerp(r0, r1, acc / total);
    acc += segs[i];
    const rb = lerp(r0, r1, acc / total);
    out.push(taperPath(pts[i], pts[i + 1], ra, rb));
  }
  return out.join(" ");
}

/** A chain of capsules (a finger with joints) as one path string (overlapping sub-paths, drawn with nonzero fill). */
export function chainPath(pts: Pt[], r: number): string {
  if (pts.length === 1) return capsulePath(pts[0], pts[0], r);
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(capsulePath(pts[i], pts[i + 1], r));
  return out.join(" ");
}

/** Distance from p to the segment ab. */
export function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const L2 = ab.x * ab.x + ab.y * ab.y;
  if (L2 < 1e-9) return dist(p, a);
  const t = clamp01(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / L2);
  return dist(p, add(a, mul(ab, t)));
}

export function distToChain(p: Pt, pts: Pt[]): number {
  if (pts.length === 1) return dist(p, pts[0]);
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, distToSeg(p, pts[i], pts[i + 1]));
  return m;
}

/** Point along a polyline at fraction t of its length. */
export function alongChain(pts: Pt[], t: number): Pt {
  if (pts.length === 1) return pts[0];
  const segs = pts.slice(1).map((p, i) => dist(pts[i], p));
  const total = segs.reduce((s, v) => s + v, 0);
  let want = clamp01(t) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) return mix(pts[i], pts[i + 1], segs[i] ? want / segs[i] : 0);
    want -= segs[i];
  }
  return pts[pts.length - 1];
}

/** Rounded rectangle path. */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M ${r2(x + rr)} ${r2(y)} H ${r2(x + w - rr)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x + w)} ${r2(y + rr)} V ${r2(y + h - rr)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x + w - rr)} ${r2(y + h)} H ${r2(x + rr)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x)} ${r2(y + h - rr)} V ${r2(y + rr)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x + rr)} ${r2(y)} Z`;
}

/** Clean SVG id from React's useId(). */
export const svgId = (raw: string, prefix: string) => `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
