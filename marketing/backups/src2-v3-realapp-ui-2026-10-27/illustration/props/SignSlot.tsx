import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, Icon, K, mix, n2, OUT, PropSvg, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * SignSlot: the intake on the card's edge where request stickers go in (T3), labelled "Satchel signs". Seen from the
 * front: a dark mouth (the opening) sits on the plate's top edge; anything moving down into the mouth disappears
 * behind the plate. Render it in two layers around the stickers:
 *     <SignSlot part="back" />  →  <RequestSticker … />  →  <SignSlot part="front" />
 * (same position/scale for both parts). part="all" draws both (no occlusion), for stills.
 *
 * Props
 *   width    UI units default 340 (mouth = width − 40; a 'send' request at the same scale fits through)
 *   scale    number   default 2. Box = width × 90 UI; the mouth's centre line is y = 12 UI (the "entry line")
 *   label    string   default "Satchel signs"
 *   accept   0..1     status light → success (with a tick)
 *   reject   0..1     status light → danger (with a cross); the mouth lip flashes danger too
 *   part     "all" | "back" | "front"  default "all"
 *   night    boolean; style CSSProperties on the root <svg>
 */
export const SLOT = { h: 90, mouthY: 12 } as const;

export interface SignSlotProps {
  width?: number;
  scale?: number;
  label?: string;
  accept?: number;
  reject?: number;
  part?: "all" | "back" | "front";
  night?: boolean;
  style?: CSSProperties;
}

export function SignSlot({ width = 340, scale = K, label = "Satchel signs", accept = 0, reject = 0, part = "all", night = false, style }: SignSlotProps) {
  useBrandFonts();
  const uid = useUid("slot");
  const W = width;
  const Hh = SLOT.h;
  const my = SLOT.mouthY;
  const ac = clamp(accept);
  const rj = clamp(reject);
  const ls = sans(18, 800);
  const lw = textWidth(label, ls);
  const groupW = 22 + 8 + lw;
  const gx = W / 2 - groupW / 2 - 14;
  const ledX = W - 34;
  const ledY = 54;
  const ledFill = rj > 0 ? mix(C.surface, C.danger, rj) : mix(C.surface, C.success, ac);
  const lip = mix(C.ink, C.danger, rj * 0.9);
  const back = (
    <g>
      {/* the opening: a dark capsule whose lower half hides behind the plate */}
      <rect x={20} y={my - 10} width={W - 40} height={20} rx={10} fill={C.ink} />
      <rect x={28} y={my - 6} width={W - 56} height={6} rx={3} fill={mix(C.ink, C.white, 0.12)} />
    </g>
  );
  const front = (
    <Dropped id={uid} dy={DROP} color={dropColor(night)}>
      <path
        d={`M${OUT / 2} ${my} H${W - OUT / 2} V${Hh - 22} Q${W - OUT / 2} ${Hh - OUT / 2} ${W - 22} ${Hh - OUT / 2} H22 Q${OUT / 2} ${Hh - OUT / 2} ${OUT / 2} ${Hh - 22} Z`}
        fill={C.sunken}
        stroke={C.ink}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      {/* face plate screws */}
      {[18, W - 18].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={Hh - 18} r={4} fill={C.surface} stroke={C.ink} strokeWidth={1.8} />
          <path d={`M${sx - 2.2} ${Hh - 16.8} l4.4 -2.4`} stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      ))}
      {/* lip of the mouth on the plate's top edge */}
      <path d={`M24 ${my} H${W - 24}`} stroke={lip} strokeWidth={5} strokeLinecap="round" />
      <Icon name="pen" x={gx + 11} y={ledY} size={22} color={C.ink} sw={2.4} />
      <Txt x={gx + 22 + 8} cy={ledY} spec={ls}>
        {label}
      </Txt>
      <circle cx={ledX} cy={ledY} r={9} fill={ledFill} stroke={C.ink} strokeWidth={2.5} />
      {ac > 0.5 && rj < 0.5 ? (
        <path d={`M${ledX - 4} ${ledY + 0.5} l3 3 l5.5 -6`} fill="none" stroke={C.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {rj > 0.5 ? <path d={`M${ledX - 3.5} ${ledY - 3.5} l7 7 M${ledX + 3.5} ${ledY - 3.5} l-7 7`} stroke={C.white} strokeWidth={2.2} strokeLinecap="round" /> : null}
    </Dropped>
  );
  return (
    <PropSvg w={W} h={Hh} scale={scale} style={style}>
      {part !== "front" ? back : null}
      {part !== "back" ? front : null}
    </PropSvg>
  );
}

/** Entry line for scenes: a sticker is "inside" once its top passes this y (UI units from the slot's top). */
export const slotEntryY = (scale = K) => n2(SLOT.mouthY * scale);
