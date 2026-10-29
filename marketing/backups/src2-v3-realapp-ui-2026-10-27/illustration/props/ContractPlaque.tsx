import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, DASH, display, DROP, Dropped, dropColor, K, mix, mono, n2, OUT, PropSvg, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * ContractPlaque: the contract as a screwed-on sticker plaque (T2): "Contract" over `satchel.satchelhq.near` (Geist
 * Mono), and a recessed key slot holding only an EMPTY key (a dashed key-shaped outline) and a big "0". Optional mono
 * footnote under the plaque: "Access keys: 0 · Born in one transaction · No key ever added".
 *
 * Props
 *   account   string   default "satchel.satchelhq.near"
 *   label     string   default "Contract"
 *   scale     number   default 2. Plaque PLAQUE.h = 194 UI tall; width = max(380, account width + 84) (≈ 380 UI)
 *   zero      0..1+    default 1: scale of the "0" (pop it in with a spring)
 *   march     number   default 0: dash offset of the empty key (UI units; animate for "searching" marching dashes)
 *   footnote  boolean | string  default false (true = the standard line)
 *   reveal    0..1     default 1: footnote typing progress
 *   drop      number   default 1; night boolean; style on the root <svg> (box = the plaque; the footnote hangs below)
 * `plaqueSlot(account?)` returns the key slot's rect in plaque UI units ({x, y, w, h}) to aim a reaching hand at.
 */
export const PLAQUE = { h: 194 } as const;
export const FOOTNOTE = "Access keys: 0 · Born in one transaction · No key ever added";
const ACCT = mono(22, 600);

export function plaqueWidth(account = "satchel.satchelhq.near") {
  return Math.max(380, Math.ceil(textWidth(account, ACCT) + 84));
}
export function plaqueSlot(account = "satchel.satchelhq.near") {
  const W = plaqueWidth(account);
  return { x: 26, y: 86, w: W - 52, h: 84 };
}

/** Key silhouette (one closed outline): round bow with a hole, a shaft, two teeth. Bow centre (bx, by). */
function keyPath(bx: number, by: number) {
  const R = 19;
  const sh = 7; // shaft half-height
  const ax = bx + Math.sqrt(R * R - sh * sh);
  const end = bx + 104;
  return [
    `M${n2(ax)} ${n2(by - sh)}`,
    `H${end - 4} Q${end} ${by - sh} ${end} ${by - sh + 4} V${by + sh}`,
    `H${end - 6} V${by + sh + 13} H${end - 18} V${by + sh}`,
    `H${end - 27} V${by + sh + 9} H${end - 37} V${by + sh}`,
    `H${n2(ax)}`,
    `A${R} ${R} 0 1 1 ${n2(ax)} ${n2(by - sh)} Z`,
    `M${bx - 13} ${by} a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z`,
  ].join(" ");
}

export interface ContractPlaqueProps {
  account?: string;
  label?: string;
  scale?: number;
  zero?: number;
  march?: number;
  footnote?: boolean | string;
  reveal?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function ContractPlaque({ account = "satchel.satchelhq.near", label = "Contract", scale = K, zero = 1, march = 0, footnote = false, reveal = 1, drop = 1, night = false, style }: ContractPlaqueProps) {
  useBrandFonts();
  const uid = useUid("plaque");
  const W = plaqueWidth(account);
  const H = PLAQUE.h;
  const slot = plaqueSlot(account);
  const note = footnote === true ? FOOTNOTE : footnote || "";
  const shown = note.slice(0, Math.round(note.length * clamp(reveal)));
  const z = Math.max(0, zero);
  const keyBx = slot.x + 44;
  const keyBy = slot.y + slot.h / 2 - 3;
  const zx = slot.x + slot.w - 58;
  const zcy = slot.y + slot.h / 2 - 8;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <rect x={OUT / 2} y={OUT / 2} width={W - OUT} height={H - OUT} rx={26} fill={C.surface} stroke={C.ink} strokeWidth={OUT} />
      </Dropped>
      {[
        [17, 17],
        [W - 17, 17],
        [17, H - 17],
        [W - 17, H - 17],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5} fill={C.sunken} stroke={C.ink} strokeWidth={2} />
          <path d={`M${x - 2.6} ${y + 1.5} l5.2 -3`} stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      <Txt x={W / 2} cy={32} spec={sans(13, 600)} fill={C.inkMuted} anchor="middle">
        {label}
      </Txt>
      <Txt x={W / 2} cy={62} spec={ACCT} anchor="middle">
        {account}
      </Txt>
      {/* the recessed key slot */}
      <defs>
        <clipPath id={`${uid}-slot`}>
          <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={18} />
        </clipPath>
      </defs>
      <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={18} fill={C.sunken} />
      <g clipPath={`url(#${uid}-slot)`}>
        <rect x={slot.x} y={slot.y} width={slot.w} height={7} fill={mix(C.sunken, C.ink, 0.14)} />
      </g>
      <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={18} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <path
        d={keyPath(keyBx, keyBy)}
        fill="none"
        stroke={C.ink}
        strokeWidth={DASH.width + 0.5}
        strokeDasharray={`${DASH.on - 1} ${DASH.off - 1}`}
        strokeDashoffset={-march}
        strokeLinejoin="round"
      />
      {z > 0.001 ? (
        <g transform={`translate(${zx} ${zcy}) scale(${n2(z * 1000) / 1000})`}>
          <Txt x={0} cy={0} spec={display(56)} anchor="middle">
            0
          </Txt>
        </g>
      ) : null}
      <Txt x={zx} cy={slot.y + slot.h - 15} spec={sans(12, 700)} fill={C.inkMuted} anchor="middle">
        keys
      </Txt>
      {shown ? (
        <Txt x={W / 2} cy={H + 24} spec={mono(12, 500)} fill={night ? "#b7b0d1" : C.inkMuted} anchor="middle">
          {shown}
        </Txt>
      ) : null}
    </PropSvg>
  );
}
