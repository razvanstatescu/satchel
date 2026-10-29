import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { CheckBadge, clamp, display, easeOut, fit, K, keys, mix, n2, PropSvg, rng, textWidth, Txt, useBrandFonts, WarnBadge } from "./kit";

/**
 * Stamp: the verdict stamp of the browser check (T5: "Nonce used", "Coin spent", "Blockhash expired"; "Clean") and its
 * danger twin ("Unused", T6). A rubber-stamp impression, not a sticker: state-colour double border, icon and Funnel
 * Display text on a pale tint, no outline, no drop. `impact` plays the hit: it drops in big, squashes, settles, and a few
 * ink specks splash out and stay.
 *
 * Props
 *   text     string   default "Nonce used" ("Unused" reads best with variant="danger")
 *   variant  "success" | "danger"  default "success" (check badge / warning badge)
 *   shape    "rect" | "circle"     default "rect" (circle = round seal, icon over the text)
 *   impact   0..1     default 1 (rest). 0 = in the air (1.7×, invisible) → 0.22 contact (0.9×) → 1 settled.
 *                     Drive it linearly over ~10–12 frames from the bonk.
 *   tilt     deg      default -6 (the resting angle; impact adds a little twist)
 *   specks   boolean  default true: ink specks around the impression
 *   fill     "tint" | "white" | "none"  default "tint" (pale state tint under the ink, hides lines beneath)
 *   scale    number   default 2. Rect: 50 UI tall, width from the text. Circle: 112 UI.
 *   style    CSSProperties on the root <svg> (box = the unrotated stamp; position by its centre if you like)
 * `stampSize(text, shape)` returns the UI box; `StampMark` is the same drawing as an SVG <g> centred on (0,0).
 */
export type StampVariant = "success" | "danger";
export type StampShape = "rect" | "circle";

const TEXT = display(22, 800, -0.01);
const ICON_R = 10.5;
const RECT_H = 50;
const CIRCLE_D = 112;

export function stampSize(text = "Nonce used", shape: StampShape = "rect") {
  if (shape === "circle") return { w: CIRCLE_D, h: CIRCLE_D };
  return { w: 14 + ICON_R * 2 + 9 + textWidth(text, TEXT) + 16, h: RECT_H };
}

export interface StampMarkProps {
  text?: string;
  variant?: StampVariant;
  shape?: StampShape;
  impact?: number;
  tilt?: number;
  specks?: boolean;
  fill?: "tint" | "white" | "none";
}

/** The stamp as an SVG group centred on (0,0), in UI units. */
export function StampMark({ text = "Nonce used", variant = "success", shape = "rect", impact = 1, tilt = -6, specks = true, fill = "tint" }: StampMarkProps) {
  useBrandFonts();
  const color = variant === "danger" ? C.danger : C.success;
  const bg = fill === "tint" ? mix(color, C.white, 0.9) : fill === "white" ? C.surface : "none";
  const p = clamp(impact);
  const s = keys(p, [0, 0.22, 0.45, 0.7, 1], [1.7, 0.9, 1.06, 0.98, 1]);
  const op = keys(p, [0, 0.12], [0, 1]);
  const rot = tilt + keys(p, [0, 0.22, 1], [9, -1.5, 0]);
  const { w: W, h: H } = stampSize(text, shape);
  const travel = keys(p, [0.18, 0.6], [0, 1], easeOut);
  const speckScale = keys(p, [0.18, 0.3, 1], [0, 1.25, 1]);
  const r = rng(text.length * 31 + (shape === "circle" ? 7 : 3));
  const dots = specks
    ? Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + r() * 0.6 + 0.4;
        const ex = W / 2 + 4;
        const ey = H / 2 + 4;
        const dist = 4 + r() * 10;
        const rad = 1.4 + r() * 2.2;
        return { x: Math.cos(a) * (ex + dist * travel), y: Math.sin(a) * (ey + dist * travel), r: rad };
      })
    : [];
  return (
    <g opacity={op} transform={`rotate(${n2(rot)}) scale(${n2(s * 1000) / 1000})`}>
      {shape === "circle" ? (
        <g>
          <circle r={CIRCLE_D / 2 - 2} fill={bg} stroke={color} strokeWidth={4} />
          <circle r={CIRCLE_D / 2 - 9} fill="none" stroke={color} strokeWidth={1.5} />
          {variant === "danger" ? <WarnBadge x={0} y={-18} size={30} color={color} /> : <CheckBadge x={0} y={-18} r={14} color={color} />}
          <Txt x={0} cy={14} anchor="middle" spec={fit(text, TEXT, CIRCLE_D - 46)} fill={color}>
            {text}
          </Txt>
          <circle cx={-CIRCLE_D / 2 + 17} cy={2} r={2.4} fill={color} />
          <circle cx={CIRCLE_D / 2 - 17} cy={2} r={2.4} fill={color} />
        </g>
      ) : (
        <g transform={`translate(${n2(-W / 2)} ${-H / 2})`}>
          <rect x={1.75} y={1.75} width={W - 3.5} height={H - 3.5} rx={12} fill={bg} stroke={color} strokeWidth={3.5} />
          <rect x={6.5} y={6.5} width={W - 13} height={H - 13} rx={7.5} fill="none" stroke={color} strokeWidth={1.4} />
          {variant === "danger" ? (
            <WarnBadge x={14 + ICON_R} y={H / 2} size={ICON_R * 2.3} color={color} />
          ) : (
            <CheckBadge x={14 + ICON_R} y={H / 2} r={ICON_R} color={color} />
          )}
          <Txt x={14 + ICON_R * 2 + 9} cy={H / 2} spec={TEXT} fill={color}>
            {text}
          </Txt>
        </g>
      )}
      {dots.map((d, i) => (
        <circle key={i} cx={n2(d.x)} cy={n2(d.y)} r={n2(d.r * speckScale)} fill={color} />
      ))}
    </g>
  );
}

export interface StampProps extends StampMarkProps {
  scale?: number;
  style?: CSSProperties;
}

export function Stamp({ scale = K, style, ...mark }: StampProps) {
  useBrandFonts();
  const { w, h } = stampSize(mark.text ?? "Nonce used", mark.shape ?? "rect");
  return (
    <PropSvg w={w} h={h} scale={scale} style={style}>
      <g transform={`translate(${n2(w / 2)} ${n2(h / 2)})`}>
        <StampMark {...mark} />
      </g>
    </PropSvg>
  );
}
