import { evolvePath } from "@remotion/paths";
import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { CheckBadge, clamp, DASH, DROP, Dropped, dropColor, Icon, type IconName, K, mix, mono, n2, OUT, PropSvg, rrPath, runs, sans, textWidth, Txt, useBrandFonts, useUid, WarnBadge } from "./kit";

/**
 * RequestSticker: a signing request arriving at the slot (T3). A white sticker chip with an icon disc and the request
 * text; backticks mark Geist Mono runs (addresses, hashes). Presets via `kind`:
 *   send          "Send 0.01 BTC → `bc1q…`"   (arrow)    — readable: it passes
 *   rawHash       "Raw hash `0x8cb1…`"        (hash)     — bounces: "Can't read it"
 *   approve       "Approve unlimited tokens"  (infinity) — bounces
 *   durableNonce  "Durable nonce"             (clock)    — bounces
 *
 * States (props, combine freely):
 *   neutral   all 0
 *   accepted  accepted 0..1 pops a success check badge on the top-right corner; outline 0..1 draws a dashed record
 *             outline around the chip ("it passes and gets an outline")
 *   bounced   bounced 0..1 turns the chip's outline danger and pops a danger "Can't read it" sticker under it
 *
 * Props
 *   kind     preset (default "send"); text / icon override it
 *   scale    number  default 2. Chip 46 UI tall; width from the text (`requestSize(text)`)
 *   accepted, outline, bounced  0..1
 *   reason   string  default "Can't read it"
 *   tilt     deg     default 0 (drop stays vertical); drop multiplier default 1; night boolean
 *   style    CSSProperties on the root <svg> (box = the chip)
 */
export type RequestKind = "send" | "rawHash" | "approve" | "durableNonce";
export const REQUESTS: Record<RequestKind, { text: string; icon: IconName }> = {
  send: { text: "Send 0.01 BTC → `bc1q…`", icon: "arrowUpRight" },
  rawHash: { text: "Raw hash `0x8cb1…`", icon: "hash" },
  approve: { text: "Approve unlimited tokens", icon: "infinity" },
  durableNonce: { text: "Durable nonce", icon: "clock" },
};

const H = 46;
const SANS = sans(16, 600);
const MONO = mono(15, 500);
const TX = 46;

export function requestSize(text: string) {
  const w = runs(text).reduce((a, r) => a + textWidth(r.t, r.mono ? MONO : SANS), 0);
  return { w: TX + w + 18, h: H };
}

export interface RequestStickerProps {
  kind?: RequestKind;
  text?: string;
  icon?: IconName;
  scale?: number;
  accepted?: number;
  outline?: number;
  bounced?: number;
  reason?: string;
  tilt?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function RequestSticker({ kind = "send", text, icon, scale = K, accepted = 0, outline = 0, bounced = 0, reason = "Can't read it", tilt = 0, drop = 1, night = false, style }: RequestStickerProps) {
  useBrandFonts();
  const uid = useUid("req");
  const t = text ?? REQUESTS[kind].text;
  const ic = icon ?? REQUESTS[kind].icon;
  const { w: W } = requestSize(t);
  const b = clamp(bounced);
  const a = clamp(accepted, 0, 1.3);
  const o = clamp(outline);
  const edge = mix(C.ink, C.danger, b);
  let x = TX;
  const parts = runs(t).map((r, i) => {
    const spec = r.mono ? MONO : SANS;
    const el = (
      <Txt key={i} x={x} cy={H / 2} spec={spec} fill={r.mono ? C.inkMuted : C.ink}>
        {r.t}
      </Txt>
    );
    x += textWidth(r.t, spec);
    return el;
  });
  const ringD = rrPath(-8, -8, W + 16, H + 16, 23);
  const evo = o > 0 && o < 1 ? evolvePath(o, ringD) : null;
  // bounce reason sticker
  const rs = sans(14, 700);
  const rw = 12 + 18 + 7 + textWidth(reason, rs) + 14;
  const rh = 32;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      {o > 0 ? (
        <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
          {evo ? (
            <defs>
              <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-30} y={-30} width={W + 60} height={H + 60}>
                <path d={ringD} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
              </mask>
            </defs>
          ) : null}
          <path d={ringD} fill="none" stroke={C.ink} strokeWidth={DASH.width} strokeDasharray={`${DASH.on} ${DASH.off}`} mask={evo ? `url(#${uid}-m)` : undefined} />
        </g>
      ) : null}
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
          <rect x={OUT / 2} y={OUT / 2} width={W - OUT} height={H - OUT} rx={15} fill={C.surface} stroke={edge} strokeWidth={OUT} />
          <circle cx={23} cy={H / 2} r={14} fill={b > 0.5 ? mix(C.danger, C.white, 0.86) : C.sunken} />
          <Icon name={ic} x={23} y={H / 2} size={17} color={b > 0.5 ? C.danger : C.ink} sw={2.3} />
          {parts}
        </g>
      </Dropped>
      {a > 0.001 ? (
        <g transform={`rotate(${tilt} ${W / 2} ${H / 2}) translate(${W - 4} 3) scale(${n2(a * 1000) / 1000})`}>
          <CheckBadge x={0} y={0} r={13} color={C.success} outline={2.5} />
        </g>
      ) : null}
      {b > 0.001 ? (
        <g transform={`translate(${n2(30 + rw / 2)} ${H + 14 + rh / 2}) rotate(-4) scale(${n2(b * 1000) / 1000})`}>
          <Dropped id={`${uid}-r`} dy={DROP * 0.75} color={dropColor(night)}>
            <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx={rh / 2} fill={C.danger} stroke={C.ink} strokeWidth={2.5} />
            <WarnBadge x={-rw / 2 + 12 + 9} y={0.5} size={18} color={C.white} mark={C.danger} />
            <Txt x={-rw / 2 + 12 + 18 + 7} cy={0} spec={rs} fill={C.white}>
              {reason}
            </Txt>
          </Dropped>
        </g>
      ) : null}
    </PropSvg>
  );
}
