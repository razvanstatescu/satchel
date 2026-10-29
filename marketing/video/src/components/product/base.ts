/**
 * Shared base for the product component ports (src/components/product/*).
 *
 * Every product component is a PURE function of its props (no useCurrentFrame inside), so a scene drives it with
 * tweens/springs and it also works under <Freeze>, hit-stops and motion blur.
 *
 * Sizes: the product's CSS pixel sizes (apps/web globals.css type scale) multiplied by `k`. The default K = 2.25
 * turns body 15 px → 34 px, body-sm 13 → 29, label 14 → 31.5, heading 20 → 45, title 24 → 54, so video text stays
 * ≥ 28 px. Pass a smaller/larger `k` to any component to rescale it as a whole.
 */
import type { CSSProperties } from "react";
import { C, F } from "../../brand/tokens";

/** Default video scale for product UI (product px × K). */
export const K = 2.25;
/** Lucide stroke used across the product (ui.tsx STROKE). */
export const STROKE = 1.75;

/** The product type scale (px at k = 1), from apps/web/src/app/globals.css. */
export const TYPE = {
  caption: { size: 12, line: 16, weight: 500 },
  bodySm: { size: 13, line: 18, weight: 400 },
  label: { size: 14, line: 18, weight: 600 },
  body: { size: 15, line: 22, weight: 400 },
  heading: { size: 20, line: 26, weight: 600 },
  title: { size: 24, line: 28, weight: 650 },
  display: { size: 40, line: 42, weight: 700 },
} as const;

export type TypeKey = keyof typeof TYPE;

/** Text style for a product type token at scale k. `family` defaults to Instrument Sans (the product's body font). */
export function txt(key: TypeKey, k = K, family: "sans" | "display" | "mono" = "sans"): CSSProperties {
  const t = TYPE[key];
  return {
    fontFamily: F[family],
    fontSize: t.size * k,
    lineHeight: `${t.line * k}px`,
    fontWeight: t.weight,
    ...(family === "display" ? { fontVariationSettings: `"opsz" ${Math.min(96, t.size * 2)}` } : {}),
  };
}

/** Product radii (px at k = 1). */
export const RADIUS = { sm: 8, md: 14, card: 22, pill: 999 } as const;

/** State tones → Night colours (kb/81 state mapping). */
export type Tone = "success" | "frozen" | "danger" | "neutral" | "brand" | "muted";
export const TONE: Record<Tone, string> = {
  success: C.success,
  frozen: C.frozen,
  danger: C.danger,
  neutral: C.ink,
  brand: C.brand,
  muted: C.inkMuted,
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blend two #rrggbb colours (t = 0 → a, 1 → b). */
export function mixColor(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(mix(v, pb[i], clamp01(t))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Middle-truncate like the product's truncateAddress (0x… 6+4, tb1… 8+4, others 4+4). */
export function truncateAddress(addr: string) {
  const cut = (a: number, b: number) => (addr.length <= a + b + 1 ? addr : `${addr.slice(0, a)}…${addr.slice(-b)}`);
  if (addr.startsWith("0x")) return cut(6, 4);
  if (/^(tb1|bc1)/.test(addr)) return cut(8, 4);
  return cut(4, 4);
}
