import { type CSSProperties, type ReactNode, useEffect, useId, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { C, F } from "../../brand/tokens";

/**
 * Shared drawing kit for src2/illustration/props.
 *
 * Every prop is authored at UI scale (outline 3, hard drop 4, detail lines 2, dashes 8/6) and multiplied by `scale`
 * (default 2 = hero: 6px outline, 8px drop). The drop is a hard ink silhouette offset straight down (an SVG filter on
 * a non-rotated group, so `tilt` props keep it vertical). No blur, no gradients: flat fills only.
 */

export const K = 2;
export const OUT = 3;
export const DROP = 4;
export const LINE = 2;
export const DASH = { on: 8, off: 6, width: 2 } as const;

/** Cap heights (em) of the brand fonts, measured in Chrome. Baseline for optical centring: cy + cap·size/2. */
export const CAP = { display: 0.675, sans: 0.707, mono: 0.71 } as const;

/** Non-brand fills used by props (kept out of the chain and state colours). */
export const PAL = {
  usdc: "#2775ca",
  usdcDeep: "#1c5aa3",
  usdcLight: "#cfe1f7",
  denim: "#5a7bb5",
  denimDeep: "#4867a0",
  denimDark: "#3a5487",
  frost: "#eef4ff",
  steel: "#c9c5dc",
  // the app's coin art (apps/web/src/components/brand/art.ts ART): never the real logos' colours exactly
  mint: "#7fe3b8",
  base: "#6e9bff",
  arbitrum: "#9ed8f2",
} as const;

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const n2 = (v: number) => Math.round(v * 100) / 100;

function hexRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const v = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
/** Flat colour mix a→b by t (sRGB). Used for tints and deep tones of the palette, never for gradients. */
export function mix(a: string, b: string, t: number) {
  const pa = hexRgb(a);
  const pb = hexRgb(b);
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * t))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Drop colour: ink on Day, black on Night (brand shadow-sticker). */
export const dropColor = (night?: boolean) => (night ? "#000000" : C.ink);

/** Unique, CSS-safe id for defs (filters, masks, clips). */
export function useUid(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Hard sticker drop as an SVG filter: ink silhouette of the group, offset dy, merged under it. No blur. */
export function DropFilter({ id, dy, color = C.ink }: { id: string; dy: number; color?: string }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feFlood floodColor={color} result="flood" />
      <feComposite in="flood" in2="SourceAlpha" operator="in" result="sil" />
      <feOffset in="sil" dx={0} dy={dy} result="drop" />
      <feMerge>
        <feMergeNode in="drop" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/** A group with a hard drop (when dy > 0). Put rotations INSIDE it so the drop stays vertical. */
export function Dropped({ id, dy, color, children }: { id: string; dy: number; color?: string; children: ReactNode }) {
  if (dy <= 0.001) return <g>{children}</g>;
  return (
    <>
      <defs>
        <DropFilter id={id} dy={dy} color={color} />
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Fonts and text measurement

const FAMILIES = ["Funnel Display", "Onest", "Geist Mono"];

export function brandFontsReady(): boolean {
  if (typeof document === "undefined" || !("fonts" in document)) return true;
  const ok = new Set<string>();
  document.fonts.forEach((f) => {
    if (f.status === "loaded") ok.add(f.family.replace(/["']/g, ""));
  });
  return FAMILIES.every((x) => ok.has(x));
}

/**
 * Blocks the render (delayRender) until the brand fonts are in document.fonts, then re-renders so text measurements
 * use the real faces. Call it at the top of any prop that sizes itself from text.
 */
export function useBrandFonts(): boolean {
  const [ready, setReady] = useState(brandFontsReady);
  const [handle] = useState(() => (brandFontsReady() ? null : delayRender("Satchel props: waiting for brand fonts")));
  useEffect(() => {
    if (handle === null) return;
    let done = false;
    const started = Date.now();
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
      continueRender(handle);
    };
    const poll = () => {
      if (done) return;
      if (brandFontsReady() || Date.now() - started > 10000) finish();
      else setTimeout(poll, 20);
    };
    poll();
    return () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
  }, [handle]);
  return ready;
}

export interface TextSpec {
  family: string;
  weight: number;
  size: number;
  /** letter-spacing in em */
  ls?: number;
  tabular?: boolean;
}

export const display = (size: number, weight = 800, ls = -0.02): TextSpec => ({ family: F.display, weight, size, ls, tabular: true });
export const sans = (size: number, weight = 600, tabular = true): TextSpec => ({ family: F.sans, weight, size, tabular });
export const mono = (size: number, weight = 500): TextSpec => ({ family: F.mono, weight, size });

const widthCache = new Map<string, number>();

function measure100(text: string, t: TextSpec) {
  if (typeof document === "undefined") return text.length * 60;
  const el = document.createElement("span");
  el.style.position = "absolute";
  el.style.left = "-99999px";
  el.style.top = "-99999px";
  el.style.whiteSpace = "pre";
  el.style.display = "inline-block";
  el.style.fontFamily = t.family;
  el.style.fontWeight = String(t.weight);
  el.style.fontSize = "100px";
  el.style.letterSpacing = `${t.ls ?? 0}em`;
  el.style.fontVariantNumeric = t.tabular ? "tabular-nums" : "normal";
  el.textContent = text;
  document.body.appendChild(el);
  const w = el.getBoundingClientRect().width;
  document.body.removeChild(el);
  return w;
}

/** Advance width of `text` in the spec's units (measured at 100px, scaled linearly; cached once fonts are ready). */
export function textWidth(text: string, t: TextSpec): number {
  const key = [t.family, t.weight, t.ls ?? 0, t.tabular ? 1 : 0, text].join("|");
  let w = widthCache.get(key);
  if (w === undefined) {
    w = measure100(text, t);
    if (brandFontsReady()) widthCache.set(key, w);
  }
  return (w * t.size) / 100;
}

/** Shrinks the spec's size so `text` fits `maxW` (never grows it). */
export function fit(text: string, t: TextSpec, maxW: number): TextSpec {
  const w = textWidth(text, t);
  return w <= maxW ? t : { ...t, size: (t.size * maxW) / w };
}

export const capOf = (t: TextSpec) => (t.family === F.display ? CAP.display : t.family === F.mono ? CAP.mono : CAP.sans) * t.size;

/** SVG <text> in a TextSpec. `cy` (instead of y) centres the cap height on cy. */
export function Txt({
  x,
  y,
  cy,
  spec,
  fill = C.ink,
  anchor = "start",
  opacity,
  children,
}: {
  x: number;
  y?: number;
  cy?: number;
  spec: TextSpec;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  children: ReactNode;
}) {
  const baseline = cy !== undefined ? cy + capOf(spec) / 2 : (y ?? 0);
  return (
    <text
      x={x}
      y={baseline}
      fill={fill}
      textAnchor={anchor}
      opacity={opacity}
      style={{
        fontFamily: spec.family,
        fontWeight: spec.weight,
        fontSize: spec.size,
        letterSpacing: spec.ls ? `${spec.ls}em` : undefined,
        fontVariantNumeric: spec.tabular ? "tabular-nums" : undefined,
        whiteSpace: "pre",
      }}
    >
      {children}
    </text>
  );
}

/** Splits "Send 0.01 BTC → `bc1q…`" into runs; backticks mark Geist Mono runs. */
export function runs(text: string): { t: string; mono: boolean }[] {
  const out: { t: string; mono: boolean }[] = [];
  text.split("`").forEach((t, i) => {
    if (t.length) out.push({ t, mono: i % 2 === 1 });
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry

export type Pt = [number, number];
const f2 = (p: Pt) => `${n2(p[0])} ${n2(p[1])}`;

/** Closed polygon with rounded corners (quadratic corners, radius per vertex or one for all). */
export function roundedPoly(pts: Pt[], r: number | number[]): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const ri = Array.isArray(r) ? r[i] : r;
    const v1: Pt = [prev[0] - p[0], prev[1] - p[1]];
    const v2: Pt = [next[0] - p[0], next[1] - p[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1;
    const l2 = Math.hypot(v2[0], v2[1]) || 1;
    const dd = Math.min(ri, l1 / 2, l2 / 2);
    const a: Pt = [p[0] + (v1[0] / l1) * dd, p[1] + (v1[1] / l1) * dd];
    const b: Pt = [p[0] + (v2[0] / l2) * dd, p[1] + (v2[1] / l2) * dd];
    d += `${i === 0 ? "M" : "L"}${f2(a)} Q${f2(p)} ${f2(b)} `;
  }
  return d + "Z";
}

/** Rounded rectangle as a path (so it can be measured / evolved). Starts at the top-left after the corner. */
export function rrPath(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return [
    `M${n2(x + q)} ${n2(y)}`,
    `H${n2(x + w - q)}`,
    `A${n2(q)} ${n2(q)} 0 0 1 ${n2(x + w)} ${n2(y + q)}`,
    `V${n2(y + h - q)}`,
    `A${n2(q)} ${n2(q)} 0 0 1 ${n2(x + w - q)} ${n2(y + h)}`,
    `H${n2(x + q)}`,
    `A${n2(q)} ${n2(q)} 0 0 1 ${n2(x)} ${n2(y + h - q)}`,
    `V${n2(y + q)}`,
    `A${n2(q)} ${n2(q)} 0 0 1 ${n2(x + q)} ${n2(y)}`,
    "Z",
  ].join(" ");
}

/** Perimeter of a rounded rectangle (for dash draw-on). */
export const rrLength = (w: number, h: number, r: number) => {
  const q = Math.min(r, w / 2, h / 2);
  return 2 * (w - 2 * q) + 2 * (h - 2 * q) + 2 * Math.PI * q;
};

/** Circle as a path, clockwise from the top. */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${n2(cx)} ${n2(cy - r)} A${n2(r)} ${n2(r)} 0 1 1 ${n2(cx)} ${n2(cy + r)} A${n2(r)} ${n2(r)} 0 1 1 ${n2(cx)} ${n2(cy - r)} Z`;

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Piecewise-linear keyframes with optional per-segment easing (clamped). */
export function keys(t: number, xs: number[], ys: number[], ease?: (u: number) => number) {
  if (t <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (t <= xs[i]) {
      const u = (t - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
      return lerp(ys[i - 1], ys[i], ease ? ease(u) : u);
    }
  }
  return ys[ys.length - 1];
}
export const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// ---------------------------------------------------------------------------------------------------------------
// Icons (24-unit Lucide-style geometry, round caps), drawn at `size` with stroke `sw` in the parent's units.

export type IconName = "check" | "warning" | "snowflake" | "arrowUpRight" | "hash" | "infinity" | "clock" | "pen" | "x" | "message";

const ICON_PATHS: Record<IconName, string[]> = {
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  x: ["M7 7l10 10", "M17 7L7 17"],
  warning: ["M12 8.5v5", "M12 17.2v.1"],
  snowflake: [
    "M12 2.5v19",
    "M3.8 7.25l16.4 9.5",
    "M3.8 16.75l16.4-9.5",
    "M9.2 3.9L12 6.4l2.8-2.5",
    "M9.2 20.1L12 17.6l2.8 2.5",
    "M3.3 10.8l3.6-1.1-.8-3.7",
    "M20.7 13.2l-3.6 1.1.8 3.7",
    "M3.3 13.2l3.6 1.1-.8 3.7",
    "M20.7 10.8l-3.6-1.1.8-3.7",
  ],
  arrowUpRight: ["M7 17L17 7", "M8 7h9v9"],
  hash: ["M4.5 9h15", "M4.5 15h15", "M10 3.5L8 20.5", "M16 3.5l-2 17"],
  infinity: [
    "M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z",
  ],
  clock: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z", "M12 7.5V12l3.2 2"],
  pen: ["M13 19.5h7.5", "M16.4 3.9a2.1 2.1 0 0 1 3 3L7.6 18.7l-4 1.1 1.1-4Z"],
  message: ["M20.5 14.5a2 2 0 0 1-2 2H7.5l-4 4V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z", "M8 8.5h8", "M8 12h5"],
};

export function Icon({ name, x, y, size, color = C.ink, sw = 2 }: { name: IconName; x: number; y: number; size: number; color?: string; sw?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${n2(x - size / 2)} ${n2(y - size / 2)}) scale(${n2(s * 1000) / 1000})`}>
      {ICON_PATHS[name].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={sw / s} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
}

/** Filled warning triangle (rounded) with a "!" in `mark`. Centre (x, y), width `size`. */
export function WarnBadge({ x, y, size, color = C.danger, mark = C.white, outline }: { x: number; y: number; size: number; color?: string; mark?: string; outline?: number }) {
  const h = size * 0.88;
  const pts: Pt[] = [
    [x, y - h * 0.55],
    [x + size / 2, y + h * 0.45],
    [x - size / 2, y + h * 0.45],
  ];
  return (
    <g>
      <path d={roundedPoly(pts, size * 0.16)} fill={color} stroke={outline ? C.ink : "none"} strokeWidth={outline ?? 0} strokeLinejoin="round" />
      <path d={`M${n2(x)} ${n2(y - h * 0.2)} V${n2(y + h * 0.12)}`} stroke={mark} strokeWidth={size * 0.12} strokeLinecap="round" />
      <circle cx={x} cy={y + h * 0.3} r={size * 0.07} fill={mark} />
    </g>
  );
}

/** Filled check badge: circle in `color`, white check, optional ink ring. */
export function CheckBadge({ x, y, r, color = C.success, mark = C.white, outline }: { x: number; y: number; r: number; color?: string; mark?: string; outline?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke={outline ? C.ink : "none"} strokeWidth={outline ?? 0} />
      <path
        d={`M${n2(x - r * 0.45)} ${n2(y + r * 0.02)} L${n2(x - r * 0.12)} ${n2(y + r * 0.36)} L${n2(x + r * 0.48)} ${n2(y - r * 0.32)}`}
        fill="none"
        stroke={mark}
        strokeWidth={r * 0.26}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Root <svg> for a prop authored in UI units (w × h), rendered at `scale`. Overflow visible for drops and bursts. */
export function PropSvg({ w, h, scale, x0 = 0, y0 = 0, style, children }: { w: number; h: number; scale: number; x0?: number; y0?: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg width={n2(w * scale)} height={n2(h * scale)} viewBox={`${x0} ${y0} ${w} ${h}`} style={{ display: "block", overflow: "visible", ...style }}>
      {children}
    </svg>
  );
}
