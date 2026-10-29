import { evolvePath } from "@remotion/paths";
import type { CSSProperties } from "react";
import { C, type Chain, CHAIN } from "../../brand/tokens";
import { clamp, DASH, Dropped, Icon, K, mono, n2, PropSvg, rrLength, rrPath, sans, textWidth, Txt, useBrandFonts, useUid, WarnBadge } from "./kit";
import { StampMark, stampSize } from "./Stamp";

/**
 * RecordOutline: one signature record on the back of a Satchel ("History · N signatures"): a dashed sticker outline
 * (2 UI dashed ink, dash 8/6) with a chain dot and a Geist Mono label ("ETH · nonce 1"). The outline is where a
 * signature sticker sits; the sticker itself flies off to its chain and the outline stays as the receipt.
 *
 * States (all props, combine freely):
 *   drawing   draw 0..1 draws the dashes around the outline; type 0..1 types the label (caret while typing)
 *   recorded  draw = 1, type = 1 (the defaults)
 *   signed    signed 0..1 prints the chain-coloured signature sticker into the outline (left → right wipe).
 *             For the "peels out and flies off" beat, set signed = 0 and animate a separate <RecordFill/> instead.
 *   stamped   stamp 0..1 is the Stamp impact on the right end (stampText defaults per chain: ETH "Nonce used",
 *             BTC "Coin spent", SOL "Blockhash expired")
 *   unused    variant="unused": danger dashes and label, " · Unused" appended, a warning badge at the right end
 *
 * Props
 *   chain     Chain    default "evm"
 *   label     string   default "ETH · nonce 1"
 *   w, h      UI units default 340 × 46 (fits the card back at the card's own scale: card width/400)
 *   scale     number   default 2
 *   draw, type, signed, stamp  0..1 (see above); march: dash offset in UI units (marching dashes)
 *   stampText string   optional override; stampVariant "success" | "danger"
 *   variant   "record" | "unused"  default "record"
 *   style     CSSProperties on the root <svg> (box = w × h)
 */
export const STAMP_TEXT: Record<Chain, string> = { evm: "Nonce used", btc: "Coin spent", sol: "Blockhash expired" };
const R = 14;
const LABEL = mono(14, 500);

export interface RecordOutlineProps {
  chain?: Chain;
  label?: string;
  w?: number;
  h?: number;
  scale?: number;
  draw?: number;
  type?: number;
  signed?: number;
  stamp?: number;
  march?: number;
  stampText?: string;
  stampVariant?: "success" | "danger";
  variant?: "record" | "unused";
  style?: CSSProperties;
}

export function RecordOutline({
  chain = "evm",
  label = "ETH · nonce 1",
  w = 340,
  h = 46,
  scale = K,
  draw = 1,
  type = 1,
  signed = 0,
  stamp = 0,
  march = 0,
  stampText,
  stampVariant = "success",
  variant = "record",
  style,
}: RecordOutlineProps) {
  useBrandFonts();
  const uid = useUid("rec");
  const unused = variant === "unused";
  const color = unused ? C.danger : C.ink;
  const d = rrPath(DASH.width / 2, DASH.width / 2, w - DASH.width, h - DASH.width, R);
  const dr = clamp(draw);
  const evo = dr > 0 && dr < 1 ? evolvePath(dr, d) : null;
  const ty = clamp(type);
  const shown = label.slice(0, Math.round(label.length * ty));
  const caret = ty > 0 && ty < 1;
  const cy = h / 2;
  const lx = 30;
  const sw = textWidth(shown, LABEL);
  const sg = clamp(signed);
  const st = clamp(stamp);
  const sText = stampText ?? (unused ? "Unused" : STAMP_TEXT[chain]);
  const ss = stampSize(sText, "rect");
  // the stamp sits in the free space right of the full label (it may overhang the right edge a little)
  const labelEnd = lx + textWidth(label, LABEL) + (unused ? textWidth(" · Unused", mono(14, 700)) : 0);
  const room = w - labelEnd - 6;
  const sk = Math.max(0.6, Math.min(1, (h * 0.98) / ss.h, (room + 14) / ss.w));
  return (
    <PropSvg w={w} h={h} scale={scale} style={style}>
      {evo ? (
        <defs>
          <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-10} y={-10} width={w + 20} height={h + 20}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
          </mask>
        </defs>
      ) : null}
      {dr > 0 ? (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={DASH.width}
          strokeDasharray={`${DASH.on} ${DASH.off}`}
          strokeDashoffset={-march}
          mask={evo ? `url(#${uid}-m)` : undefined}
        />
      ) : null}
      {ty > 0 ? (
        <g>
          <circle cx={18} cy={cy} r={4.5} fill={unused ? C.danger : CHAIN[chain].ui} />
          <Txt x={lx} cy={cy} spec={LABEL} fill={color}>
            {shown}
          </Txt>
          {caret ? <rect x={lx + sw + 1.5} y={cy - 8.5} width={2} height={17} rx={1} fill={color} /> : null}
          {unused && ty >= 1 ? (
            <>
              <Txt x={lx + sw} cy={cy} spec={mono(14, 700)} fill={C.danger}>
                {" · Unused"}
              </Txt>
              {st <= 0 ? <WarnBadge x={w - 24} y={cy} size={20} color={C.danger} /> : null}
            </>
          ) : null}
        </g>
      ) : null}
      {sg > 0 ? (
        <g>
          <defs>
            <clipPath id={`${uid}-w`}>
              <rect x={-12} y={-12} width={(w + 24) * sg} height={h + 24} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid}-w)`}>
            <RecordFillGroup chain={chain} label={label} w={w} h={h} uid={uid} />
          </g>
        </g>
      ) : null}
      {st > 0 ? (
        <g transform={`translate(${n2(Math.max(labelEnd + 4 + (ss.w * sk) / 2, w - (ss.w * sk) / 2 - 10))} ${n2(cy)}) scale(${n2(sk * 1000) / 1000})`}>
          <StampMark text={sText} variant={unused ? "danger" : stampVariant} impact={st} tilt={-5} />
        </g>
      ) : null}
    </PropSvg>
  );
}

function RecordFillGroup({ chain, label, w, h, uid, drop = 1 }: { chain: Chain; label: string; w: number; h: number; uid: string; drop?: number }) {
  const inset = 5;
  const fw = w - inset * 2;
  const fh = h - inset * 2;
  const cy = h / 2;
  const sTxt = sans(14, 700);
  const sW = textWidth("Signed", sTxt);
  return (
    <Dropped id={`${uid}-fd`} dy={3 * drop}>
      <rect x={inset + 1.25} y={inset + 1.25} width={fw - 2.5} height={fh - 2.5} rx={R - 4} fill={CHAIN[chain].color} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={18} cy={cy} r={4.5} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <Txt x={30} cy={cy} spec={LABEL} fill={C.ink}>
        {label}
      </Txt>
      <Icon name="pen" x={w - 16 - sW - 14} y={cy} size={16} color={C.ink} sw={2.2} />
      <Txt x={w - 16} cy={cy} spec={sTxt} anchor="end" fill={C.ink}>
        Signed
      </Txt>
    </Dropped>
  );
}

/**
 * RecordFill: the signature sticker on its own (same box as its RecordOutline), for the T1 beat where it peels out of
 * the outline and flies off to its chain. Props: chain, label, w, h, scale, drop (lift it: 1 → 3), style.
 */
export function RecordFill({ chain = "evm", label = "ETH · nonce 1", w = 340, h = 46, scale = K, drop = 1, style }: { chain?: Chain; label?: string; w?: number; h?: number; scale?: number; drop?: number; style?: CSSProperties }) {
  useBrandFonts();
  const uid = useUid("recfill");
  return (
    <PropSvg w={w} h={h} scale={scale} style={style}>
      <RecordFillGroup chain={chain} label={label} w={w} h={h} uid={uid} drop={drop} />
    </PropSvg>
  );
}

/** Perimeter of a RecordOutline in UI units (for syncing a pen/charm to the draw-on). */
export const recordPerimeter = (w = 340, h = 46) => rrLength(w - DASH.width, h - DASH.width, R);
