import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, K, n2, OUT, PropSvg, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * ToastSticker: the "Sent" toast (P3: "Sent 0.0100 BTC", then "Sent 0.05 ETH", "Sent 1.25 SOL"). A brand-soft rounded
 * sticker with a success check disc and the amount in Onest (tabular).
 *
 * Props
 *   text    string  default "Sent 0.0100 BTC"
 *   check   0..1    default 1: the check disc pops (scale) and its tick draws on
 *   scale   number  default 2. 54 UI tall; width from the text (`toastSize(text)`)
 *   tilt    deg     default 0; drop number default 1; night boolean; style on the root <svg>
 */
const TXT = sans(17, 700);
const H = 54;

export function toastSize(text = "Sent 0.0100 BTC") {
  return { w: 54 + textWidth(text, TXT) + 22, h: H };
}

export function ToastSticker({ text = "Sent 0.0100 BTC", check = 1, scale = K, tilt = 0, drop = 1, night = false, style }: { text?: string; check?: number; scale?: number; tilt?: number; drop?: number; night?: boolean; style?: CSSProperties }) {
  useBrandFonts();
  const uid = useUid("toast");
  const { w: W } = toastSize(text);
  const c = clamp(check);
  const disc = clamp(c * 2.2, 0, 1);
  const tick = clamp((c - 0.35) / 0.65);
  const cx = 28;
  const cy = H / 2;
  const r = 13;
  const tickLen = 22;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
          <rect x={OUT / 2} y={OUT / 2} width={W - OUT} height={H - OUT} rx={18} fill={C.brandSoft} stroke={C.ink} strokeWidth={OUT} />
          {disc > 0 ? (
            <g transform={`translate(${cx} ${cy}) scale(${n2(disc * 1000) / 1000})`}>
              <circle r={r} fill={C.success} stroke={C.ink} strokeWidth={2} />
              <path
                d={`M${-r * 0.45} ${r * 0.02} L${-r * 0.12} ${r * 0.36} L${r * 0.48} ${-r * 0.32}`}
                fill="none"
                stroke={C.white}
                strokeWidth={r * 0.26}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${tickLen} ${tickLen}`}
                strokeDashoffset={n2(tickLen * (1 - tick))}
                opacity={tick > 0 ? 1 : 0}
              />
            </g>
          ) : null}
          <Txt x={54} cy={cy} spec={TXT}>
            {text}
          </Txt>
        </g>
      </Dropped>
    </PropSvg>
  );
}
