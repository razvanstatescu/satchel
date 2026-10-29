import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, DROP, Dropped, Icon, lerp, n2, OUT, PAL, rng, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * FrostLaminate: the "Paused for sale" overlay (T4, melts in T7). A translucent frost sheet sweeps across a card
 * (left → right, slanted leading edge with a crisp white lip, two flat sheen bars), frost dendrites creep in from the
 * corners and six-arm crystals sit in the sheet: frozen blue at low opacity, flat. The card's ink outline stays crisp.
 * A sticker pill "Paused for sale" with a snowflake pops on top. Lay it exactly over the card (same box); it clips
 * itself to the card's rounded corners (inset by the outline).
 *
 * Props
 *   width, height  px      the card's box (SatchelCard: height = width · 252/400)
 *   radius         px      default width·28/400 (the SatchelCard corner)
 *   progress       0..1    default 1: the sweep (0 = clear, 1 = fully frosted)
 *   pill           0..1    default 1: pill scale (drive it with a spring; 0 hides it)
 *   melt           0..1    default 0: thaw (sheet fades, crystals shrink, pill drops away)
 *   text           string  default "Paused for sale"
 *   pillX, pillY   0..1    default 0.5, 0.5: pill centre as fractions of the card
 *   k              number  default width/400 (the card's own scale); the pill is drawn at 1.15·k
 *   seed           number  default 7: crystal layout
 *   style          CSSProperties on the root <svg>
 */
export interface FrostLaminateProps {
  width: number;
  height: number;
  radius?: number;
  progress?: number;
  pill?: number;
  melt?: number;
  text?: string;
  pillX?: number;
  pillY?: number;
  k?: number;
  seed?: number;
  style?: CSSProperties;
}

const SLANT = 0.28; // leading edge: x offset per unit of height

function dendrite(x0: number, y0: number, ang: number, len: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let d = `M${n2(x0)} ${n2(y0)} L${n2(x0 + dx * len)} ${n2(y0 + dy * len)}`;
  for (let i = 1; i <= 5; i++) {
    const t = i / 6.2;
    const px = x0 + dx * len * t;
    const py = y0 + dy * len * t;
    const bl = len * 0.34 * (1 - t);
    for (const s of [-1, 1]) {
      const a = ang + s * (Math.PI / 3);
      d += ` M${n2(px)} ${n2(py)} L${n2(px + Math.cos(a) * bl)} ${n2(py + Math.sin(a) * bl)}`;
    }
  }
  return d;
}

function crystal(cx: number, cy: number, r: number, rot: number) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    const ex = cx + Math.cos(a) * r;
    const ey = cy + Math.sin(a) * r;
    d += ` M${n2(cx)} ${n2(cy)} L${n2(ex)} ${n2(ey)}`;
    const bx = cx + Math.cos(a) * r * 0.58;
    const by = cy + Math.sin(a) * r * 0.58;
    for (const s of [-1, 1]) {
      const b = a + s * 0.85;
      d += ` M${n2(bx)} ${n2(by)} L${n2(bx + Math.cos(b) * r * 0.3)} ${n2(by + Math.sin(b) * r * 0.3)}`;
    }
  }
  return d;
}

export function FrostLaminate({ width, height, radius, progress = 1, pill = 1, melt = 0, text = "Paused for sale", pillX = 0.5, pillY = 0.5, k, seed = 7, style }: FrostLaminateProps) {
  useBrandFonts();
  const uid = useUid("frost");
  const W = width;
  const H = height;
  const kc = k ?? W / 400;
  const R = radius ?? (W * 28) / 400;
  const p = clamp(progress);
  const m = clamp(melt);
  const slant = H * SLANT;
  // leading edge x at the top; the bottom trails by `slant`
  const edgeTop = lerp(-8 * kc, W + slant + 8 * kc, p);
  const edgeBot = edgeTop - slant;
  const sweep = `M${-20} ${-20} L${n2(edgeTop + (slant * 20) / H)} ${-20} L${n2(edgeBot - (slant * 20) / H)} ${H + 20} L${-20} ${H + 20} Z`;

  const r = rng(seed);
  const md = Math.min(W, H);
  const dens: string[] = [];
  // frost creeps in from the corners (clusters) and, smaller, from the edges
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [W, 0, Math.PI / 2],
    [W, H, Math.PI],
    [0, H, (3 * Math.PI) / 2],
  ];
  corners.forEach(([x, y, base]) => {
    [0.22, 0.785, 1.35].forEach((a, j) => {
      const len = md * (j === 1 ? 0.22 : 0.15 + r() * 0.04) * (1 - 0.5 * m);
      dens.push(dendrite(x, y, base + a, len));
    });
  });
  const crystals: string[] = [];
  const spots: [number, number][] = [
    [0.2, 0.3],
    [0.43, 0.2],
    [0.7, 0.32],
    [0.86, 0.62],
    [0.3, 0.7],
    [0.58, 0.78],
    [0.12, 0.55],
    [0.5, 0.5],
    [0.9, 0.2],
    [0.76, 0.86],
  ];
  spots.forEach(([fx, fy]) => {
    const cx = (fx + (r() - 0.5) * 0.06) * W;
    const cy = (fy + (r() - 0.5) * 0.08) * H;
    crystals.push(crystal(cx, cy, md * (0.025 + r() * 0.04) * (1 - 0.6 * m), r() * Math.PI));
  });
  // two sheen bars parallel to the leading edge: the laminate's flat glint
  const sheen = (x: number, w: number) => `M${n2(x)} 0 L${n2(x + w)} 0 L${n2(x + w - slant)} ${H} L${n2(x - slant)} ${H} Z`;
  const inset = OUT * kc;

  // pill
  const kp = kc * 1.15;
  const fs = sans(15, 700);
  const tw = textWidth(text, fs);
  const pw = 14 + 20 + 8 + tw + 16;
  const ph = 38;
  const pillScale = clamp(pill, 0, 2) * (1 - m);
  const px = W * pillX;
  const py = H * pillY + m * 30 * kc;
  const sheetOpacity = 0.55 * (1 - m);
  return (
    <svg width={n2(W)} height={n2(H)} viewBox={`0 0 ${n2(W)} ${n2(H)}`} style={{ display: "block", overflow: "visible", ...style }}>
      <defs>
        <clipPath id={`${uid}-card`}>
          <rect x={inset} y={inset} width={W - 2 * inset} height={H - 2 * inset} rx={Math.max(0, R - inset)} />
        </clipPath>
        <clipPath id={`${uid}-sweep`}>
          <path d={sweep} />
        </clipPath>
      </defs>
      {p > 0 && m < 1 ? (
        <g clipPath={`url(#${uid}-card)`}>
          <g clipPath={`url(#${uid}-sweep)`}>
            <rect x={0} y={0} width={W} height={H} fill={PAL.frost} opacity={sheetOpacity} />
            <g opacity={1 - m}>
              <path d={sheen(W * 0.16, 16 * kc)} fill={C.white} opacity={0.5} />
              <path d={sheen(W * 0.16 + 26 * kc, 6 * kc)} fill={C.white} opacity={0.5} />
            </g>
            <g opacity={1 - m} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={dens.join(" ")} stroke={C.frozen} strokeWidth={1.5 * kc} opacity={0.26} />
              <path d={crystals.join(" ")} stroke={C.frozen} strokeWidth={2 * kc} opacity={0.3} />
              <path d={crystals.join(" ")} stroke={C.white} strokeWidth={0.8 * kc} opacity={0.95} />
            </g>
          </g>
          {p < 1 ? (
            <g opacity={1 - m}>
              <path d={`M${n2(edgeTop - 6 * kc)} -10 L${n2(edgeBot - 6 * kc)} ${H + 10}`} stroke={C.frozen} strokeWidth={1.5 * kc} opacity={0.35} />
              <path d={`M${n2(edgeTop)} -10 L${n2(edgeBot)} ${H + 10}`} stroke={C.white} strokeWidth={3.5 * kc} />
            </g>
          ) : null}
        </g>
      ) : null}
      {pillScale > 0.001 ? (
        <g transform={`translate(${n2(px)} ${n2(py)}) scale(${n2(pillScale * kp * 1000) / 1000})`}>
          <Dropped id={`${uid}-pd`} dy={DROP}>
            <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={ph / 2} fill={C.surface} stroke={C.ink} strokeWidth={OUT} />
            <Icon name="snowflake" x={-pw / 2 + 14 + 10} y={0} size={20} color={C.frozen} sw={2.2} />
            <Txt x={-pw / 2 + 14 + 20 + 8} cy={0} spec={fs} fill={C.frozen}>
              {text}
            </Txt>
          </Dropped>
        </g>
      ) : null}
    </svg>
  );
}
