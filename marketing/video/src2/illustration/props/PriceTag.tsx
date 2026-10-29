import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { capOf, clamp, display, DROP, Dropped, dropColor, K, mono, n2, OUT, PropSvg, roundedPoly, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * PriceTag: a lemon sticker price tag (T4, T5, T7): pointed nose with a punched hole, a looping string, the price in
 * Funnel Display (tabular) with its unit in Onest, an optional mono note line ("bound to 3 signatures") and an optional
 * binder clip that snaps onto the tag's top edge (T7: the tag clips to the card).
 *
 * Props
 *   text    string   default "4,750.00 USDC": a trailing word becomes the unit ("USDC"); the tag width fits the text
 *   note    string   optional mono line under the price (e.g. "bound to 3 signatures"); makes the tag taller
 *   scale   number   default 2 (UI units → px). Height 56 UI (74 with a note); width from the text (≈ 208 UI default)
 *   clip    0..1     default 0 = no clip; 0→1 slides the binder clip down onto the top edge (1 = clamped on)
 *   string  boolean  default true: the string loop through the hole
 *   swing   deg      default 0: rotates the string loop about the hole (let it trail during moves)
 *   tilt    deg      default 0: rotates the whole tag about the hole; the drop stays straight down
 *   tone    "lemon" | "white" | "sky"  default "lemon"
 *   drop    number   default 1: drop multiplier (slap-in: 0 → 1)
 *   night   boolean  default false
 *   style   CSSProperties on the root <svg>
 * The root box is the tag body (hole at x 17 UI, y = middle); the string and clip overflow it.
 * `priceTagSize(text, note?)` returns the tag's UI size so scenes can anchor it.
 */
const TONE = { lemon: C.lemon, white: C.surface, sky: C.sky } as const;
const NOSE = 28;
const HOLE = { x: 17, r: 6 };

function split(text: string) {
  const m = text.match(/^(.*?)(\s+[A-Za-z]+)$/);
  return m ? { amount: m[1], unit: m[2].trim() } : { amount: text, unit: "" };
}
const AMOUNT = display(26);
/** The string: tied through the hole, one loop, a short tail (hole centre at hx, hy). */
const STRING = (hx: number, hy: number) =>
  `M${hx + 1} ${hy + 1} C${hx - 6} ${hy - 12} ${hx - 22} ${hy - 30} ${hx - 42} ${hy - 30} ` +
  `C${hx - 58} ${hy - 30} ${hx - 60} ${hy - 12} ${hx - 47} ${hy - 11} C${hx - 35} ${hy - 10} ${hx - 34} ${hy - 30} ${hx - 50} ${hy - 44} ` +
  `C${hx - 56} ${hy - 49} ${hx - 64} ${hy - 51} ${hx - 70} ${hy - 50}`;
const UNIT = sans(15, 800);
const NOTE = mono(11, 500);

export function priceTagSize(text = "4,750.00 USDC", note?: string) {
  const { amount, unit } = split(text);
  const aw = textWidth(amount, AMOUNT);
  const uw = unit ? textWidth(unit, UNIT) + 6 : 0;
  const nw = note ? textWidth(note, NOTE) : 0;
  const w = NOSE + 12 + Math.max(aw + uw, nw) + 18;
  return { w, h: note ? 74 : 56 };
}

export interface PriceTagProps {
  text?: string;
  note?: string;
  scale?: number;
  clip?: number;
  string?: boolean;
  swing?: number;
  tilt?: number;
  tone?: keyof typeof TONE;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function PriceTag({ text = "4,750.00 USDC", note, scale = K, clip = 0, string = true, swing = 0, tilt = 0, tone = "lemon", drop = 1, night = false, style }: PriceTagProps) {
  useBrandFonts();
  const uid = useUid("tag");
  const { amount, unit } = split(text);
  const { w: W, h: H } = priceTagSize(text, note);
  const cy = H / 2;
  const body = roundedPoly(
    [
      [NOSE, 0],
      [W, 0],
      [W, H],
      [NOSE, H],
      [0, cy],
    ],
    [7, 14, 14, 7, 9],
  );
  const hole = `M${HOLE.x - HOLE.r} ${cy} a${HOLE.r} ${HOLE.r} 0 1 0 ${HOLE.r * 2} 0 a${HOLE.r} ${HOLE.r} 0 1 0 ${-HOLE.r * 2} 0 Z`;
  const tx = NOSE + 12;
  const aw = textWidth(amount, AMOUNT);
  const priceCy = note ? 27 : cy;
  const c = clamp(clip);
  const clipX = W - 46;
  const clipDy = (1 - c) * -34;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`rotate(${tilt} ${HOLE.x} ${cy})`}>
          <path d={`${body} ${hole}`} fillRule="evenodd" fill={TONE[tone]} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          <Txt x={tx} cy={priceCy} spec={AMOUNT}>
            {amount}
          </Txt>
          {unit ? (
            <Txt x={tx + aw + 6} y={priceCy + capOf(AMOUNT) / 2} spec={UNIT}>
              {unit}
            </Txt>
          ) : null}
          {note ? (
            <Txt x={tx} cy={53} spec={NOTE} fill={C.inkMuted}>
              {note}
            </Txt>
          ) : null}
        </g>
      </Dropped>
      {string ? (
        <g transform={`rotate(${tilt + swing} ${HOLE.x} ${cy})`}>
          <path d={STRING(HOLE.x, cy)} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
      {c > 0 ? (
        <g transform={`rotate(${tilt} ${HOLE.x} ${cy}) translate(0 ${n2(clipDy)})`} opacity={clamp(c * 4)}>
          <BinderClip x={clipX} y={0} />
        </g>
      ) : null}
    </PropSvg>
  );
}

/** A flat binder clip gripping an edge at y (body centred on x): ink body, two wire "ears" (ink with a white core). */
export function BinderClip({ x, y }: { x: number; y: number }) {
  const body = roundedPoly(
    [
      [x - 13, y - 10],
      [x + 13, y - 10],
      [x + 16, y + 12],
      [x - 16, y + 12],
    ],
    4,
  );
  const ear = (s: number) =>
    `M${x + s * 6} ${y - 8} L${x + s * 17} ${y - 29} Q${x + s * 20} ${y - 34} ${x + s * 24} ${y - 30} L${x + s * 13} ${y - 8}`;
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={ear(s)} fill="none" stroke={C.ink} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={ear(s)} fill="none" stroke={C.white} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <path d={body} fill={C.ink} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d={`M${x - 9} ${y - 4} H${x + 4}`} stroke={C.white} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}
