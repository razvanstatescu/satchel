import type { CSSProperties, ReactNode } from "react";
import { C, CHAIN, type Chain, DROP, NIGHT, R, sans } from "../../brand/tokens";

/**
 * Shared pieces for C1 · T0 · T1 (scene builder 4): the world palette per theme, the Ethereum strip, a sticker button,
 * the charm amount tag, the Night die-cut outline, the Night rim for the charm rig, and the C1 → T0 whip offsets.
 */

export type Theme = "day" | "night";

/** The world palette per theme (brand tokens.json Day / Night). Outlines stay ink on both (the brand Night card). */
export const pal = (t: Theme) =>
  t === "night"
    ? {
        ground: NIGHT.ground,
        surface: NIGHT.surface,
        sunken: NIGHT.sunken,
        ink: NIGHT.ink,
        inkMuted: NIGHT.inkMuted,
        line: NIGHT.line,
        lineStrong: NIGHT.lineStrong,
        outline: C.ink,
        shadow: "#000000",
        danger: NIGHT.danger,
        frozen: NIGHT.frozen,
        dot: (c: Chain) => CHAIN[c].color,
      }
    : {
        ground: C.ground,
        surface: C.surface,
        sunken: C.sunken,
        ink: C.ink,
        inkMuted: C.inkMuted,
        line: C.line,
        lineStrong: C.lineStrong,
        outline: C.ink,
        shadow: C.ink,
        danger: C.danger,
        frozen: C.frozen,
        dot: (c: Chain) => CHAIN[c].ui,
      };

export type Pal = ReturnType<typeof pal>;

/**
 * Night die-cut outline for kit stickers that have no outline-colour prop (Hand, PocketJeans, SignedSlip, CoinSticker):
 * the app's Night rule draws sticker outlines in #8A82AE because the ink outline vanishes on the Night ground. Four
 * zero-blur drop-shadows grow a hard `px` ring around the sticker's silhouette (no blur, no glow). Use it as a CSS
 * `filter` on the sticker's root element; pass drop={0} to the sticker so the ring hugs the shape, not its shadow.
 */
export const nightOutline = (color: string = NIGHT.lineStrong, px = 3) =>
  `drop-shadow(${px}px 0 0 ${color}) drop-shadow(${-px}px 0 0 ${color}) drop-shadow(0 ${px}px 0 ${color}) drop-shadow(0 ${-px}px 0 ${color})`;

/**
 * The "Ethereum" strip (C1, T1): a long pill sticker that stands for the chain itself. A signature slapped onto it is
 * used on Ethereum. Night: surface fill, light border and text; Day: white sticker with ink outline.
 * Sized in px; `lift` / `press` follow the sticker model (hard drop, no blur).
 */
export function ChainStrip({
  chain = "evm",
  w,
  h,
  theme,
  align = "left",
  lift = 0,
  press = 0,
  style,
}: {
  chain?: Chain;
  w: number;
  h: number;
  theme: Theme;
  /** where the chain label sits ("right" leaves the left end free for a slip slapped onto it) */
  align?: "left" | "right";
  lift?: number;
  press?: number;
  style?: CSSProperties;
}) {
  const p = pal(theme);
  const k = h / 56; // UI height 56
  const out = Math.max(5, Math.round(3 * k));
  const rest = Math.max(6, Math.round(4 * k));
  const drop = Math.max(0, rest * (1 - press) + lift);
  const dy = rest * press - lift;
  const night = theme === "night";
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        background: p.surface,
        border: `${out}px solid ${night ? p.lineStrong : C.ink}`,
        boxShadow: `0 ${drop}px 0 ${p.shadow}`,
        transform: `translateY(${dy}px)`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 14 * k,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        paddingLeft: 22 * k,
        paddingRight: 24 * k,
        ...style,
      }}
    >
      <span style={{ width: 14 * k, height: 14 * k, borderRadius: 99, background: CHAIN[chain].color, border: `${Math.max(2, 1.5 * k)}px solid ${C.ink}`, flexShrink: 0 }} />
      <span style={{ ...sans(700), fontSize: 22 * k, lineHeight: 1, color: p.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{CHAIN[chain].name}</span>
    </div>
  );
}

/** A sticker button at UI scale × k. Night = the brand Night secondary button (surface, line-strong border, light text). */
export function StickerButton({ label, k, theme, press = 0, style }: { label: ReactNode; k: number; theme: Theme; press?: number; style?: CSSProperties }) {
  const p = pal(theme);
  const night = theme === "night";
  const rest = DROP * k;
  return (
    <div
      style={{
        ...sans(700),
        fontSize: 15 * k,
        lineHeight: `${20 * k}px`,
        padding: `${13 * k}px ${22 * k}px`,
        borderRadius: R.md * k,
        background: night ? p.surface : C.surface,
        color: p.ink,
        border: `${2 * k}px solid ${night ? p.lineStrong : C.ink}`,
        boxShadow: `0 ${rest * (1 - press)}px 0 ${p.shadow}`,
        transform: `translateY(${rest * press}px)`,
        textAlign: "center",
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

/** The small amount tag that hangs under a charm (P1/P2's tags). `roll` 0..1 rolls `from` up and out and `to` in. */
export function AmountTag({
  from,
  to,
  roll = 0,
  toColor,
  k,
  theme,
  style,
}: {
  from: string;
  to?: string;
  roll?: number;
  toColor?: string;
  k: number;
  theme: Theme;
  style?: CSSProperties;
}) {
  const p = pal(theme);
  const night = theme === "night";
  const r = Math.max(0, Math.min(1, roll));
  const fs = 15 * k;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 30 * k,
        padding: `0 ${11 * k}px`,
        borderRadius: 10 * k,
        background: night ? p.surface : C.surface,
        border: `${2 * k}px solid ${night ? p.lineStrong : C.ink}`,
        boxShadow: `0 ${3 * k}px 0 ${p.shadow}`,
        boxSizing: "border-box",
        overflow: "hidden",
        ...sans(700),
        fontSize: fs,
        lineHeight: 1,
        color: p.ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ visibility: "hidden" }}>{r < 0.5 || !to ? from : to}</span>
      {r < 0.99 ? (
        <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", translate: `0 ${-34 * k * Math.min(1, r * 1.6)}px` }}>{from}</span>
      ) : null}
      {to && r > 0.01 ? (
        <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: toColor ?? p.ink, translate: `0 ${34 * k * (1 - Math.max(0, Math.min(1, (r - 0.2) / 0.8)))}px` }}>{to}</span>
      ) : null}
    </div>
  );
}

/**
 * The C1 → T0 whip (8 frames, cut on the fastest frame): the camera travels right, so content slides left. Offsets in
 * px for C1's last four frames and T0's first five, with a 2-frame smear (1.25 along the motion) around the cut.
 */
export const WHIP_OUT = [0, -30, -150, -480]; // C1 frames end−4 … end−1
export const WHIP_IN = [520, 170, 45, 6, 0]; // T0 frames 0 … 4
export const whipSmear = (offsetPx: number) => (Math.abs(offsetPx) >= 400 ? 1.25 : Math.abs(offsetPx) >= 140 ? 1.12 : 1);

/**
 * Night rim for the charm rig. In Night the rig's ink bar, posts, rings and stems vanish into the ground, so this draws
 * the same shapes a few px wider in Night line-strong (the brand's sticker outline on Night surfaces) to sit BEHIND a
 * CardWithCharms (same parent, same origin = the card's top-left). Geometry and the 3D projection mirror CardWithCharms
 * (mount "posts", charmSize 0.18, spacing 1.3, stemLen 30, keepOrder, perspective 2400, pop 0.06); `angles` are the
 * three CharmShape angles (deg); `flip` as in CardWithCharms (0 front … 1 back).
 */
export function NightRig({
  width,
  angles,
  lift = 0,
  flip = 0,
  charmSize = 0.18,
  spacing = 1.3,
  stemLen = 30,
  rim = 3,
  color = NIGHT.lineStrong,
}: {
  width: number;
  angles: [number, number, number];
  lift?: number;
  flip?: number;
  charmSize?: number;
  spacing?: number;
  stemLen?: number;
  rim?: number;
  color?: string;
}) {
  const H = width * (252 / 400);
  const k = width / 400;
  const u = (width * charmSize) / 140;
  const theta = flip * Math.PI;
  const pop = 1 + 0.06 * Math.abs(Math.sin(theta));
  const P = 2400;
  const proj = (lx: number, ly: number) => {
    const x0 = lx - width / 2;
    const y0 = ly - H / 2;
    const c = Math.cos(theta);
    const X = x0 * Math.abs(c);
    const Z = -x0 * Math.sin(theta) * (c < 0 ? -1 : 1);
    const f = P / (P - Z);
    return { x: width / 2 + X * pop * f, y: H / 2 + y0 * pop * f, f: f * pop };
  };
  const rise = -8 * lift * k;
  const gapU = 160 * spacing;
  const barLenFull = 2 * gapU + 120;
  const barHalf = (barLenFull * u) / 2;
  const barH = 22 * u;
  const edgeY = H + rise;
  const barY = H + rise + 4 * k + 16 * u + barH / 2;
  const pivotY = barY + barH / 2;
  const cx = width / 2;
  const postX = (barLenFull / 2 - 46) * u;
  const coinTop = stemLen + 4 - 6; // the coin's outer edge in charm units (cy − r − outline/2)
  const barA = proj(cx - barHalf, barY);
  const barB = proj(cx + barHalf, barY);
  return (
    <svg width={width} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <g stroke={color} strokeLinecap="round" fill="none">
        {[-1, 1].map((sd) => {
          const top = proj(cx + sd * postX, edgeY - 6 * u);
          const bot = proj(cx + sd * postX, barY);
          return <line key={sd} x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} strokeWidth={12 * u * ((top.f + bot.f) / 2) + 2 * rim} />;
        })}
        <line x1={barA.x} y1={barA.y} x2={barB.x} y2={barB.y} strokeWidth={barH * ((barA.f + barB.f) / 2) + 2 * rim} />
        {angles.map((a, i) => {
          const q = proj(cx + (i - 1) * gapU * u, pivotY);
          const ring = proj(cx + (i - 1) * gapU * u, pivotY + 5 * u);
          const sc = u * q.f;
          const rad = (a * Math.PI) / 180;
          const at = (d: number) => ({ x: q.x - d * sc * Math.sin(rad), y: q.y + d * sc * Math.cos(rad) });
          const s0 = at(12);
          const s1 = at(coinTop);
          return (
            <g key={i}>
              <circle cx={ring.x} cy={ring.y} r={7.5 * u * ring.f} strokeWidth={5 * u * ring.f + 2 * rim} />
              <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} strokeWidth={12 * sc + 2 * rim} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
