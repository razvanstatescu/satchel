import { type CSSProperties, type ReactNode, useId } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { StickerS } from "../../brand/Logo";
import { C, type Chain, CHAIN, DROP, mono, OUTLINE, R, sans } from "../../brand/tokens";
import { clamp01, r2, svgId } from "./geometry";

/**
 * The back of the Satchel card: the history. A white backing with the card's ink outline and hard drop, the header
 * "History · N signatures" and one dashed outline per signature record (2px dashed ink, dash 8/6), each with a chain
 * dot and a Geist Mono label such as "ETH · nonce 1". Authored at UI size (400 × 252, the front's 1.586:1) and scaled
 * by `width`, exactly like SatchelCard, so the two faces line up in <CardFlip>.
 *
 * <CardBack width={800} count={3} records={[{ chain: "btc", label: "BTC · coin 1" }, …]} />
 *
 * CardBack props
 *   width     px (default 640). k = width / 400; outline 3k, drop 4k (+8k·lift).
 *   count     the N in the header (defaults to records.length). title overrides the whole header text.
 *   records   RecordProps[] (below). Rows shrink to fit 1–5 records.
 *   lift      0..1+ the sticker rises (as SatchelCard). night: Night shadow (#000).
 *   header    0..1 the header types on (default 1). countPop 0..1 pops the count (a recount beat).
 *   children  overlay drawn inside the card (frost, scan beam…), at UI scale (400 × 252).
 * RecordProps (one dashed outline)
 *   chain     "btc" | "evm" | "sol" (the dot colour).  label  mono text, e.g. "ETH · nonce 1".
 *   state     "recorded" (default: dashed ink — pending or already signed and gone)
 *             | "signed"   (the signature sticker sits in the outline: solid outline, white, hard drop, "Signed")
 *             | "stamped"  (dashed + a success stamp on the right; give `stamp` text, e.g. "Nonce used")
 *             | "unused"   (danger dashed outline, the " · Unused" suffix in danger, a warning icon).
 *   draw      0..1 the dashed outline draws itself, clockwise from the top-left (T1). Nothing shows at 0.
 *   typed     0..1 the label types on. sticker 0..1 overrides the signature sticker (pops in at 0→1).
 *   stamp     stamp text or any ReactNode (the props kit's stamp); stampIn 0..1 slaps it in (default 1).
 *   note      small ink-muted text on the right (e.g. "Signing…"), when there is no stamp.
 *   opacity   0..1 for the row (default 1).
 */

export type RecordState = "recorded" | "signed" | "stamped" | "unused";

export interface RecordProps {
  chain: Chain;
  label: string;
  state?: RecordState;
  draw?: number;
  typed?: number;
  sticker?: number;
  stamp?: ReactNode;
  stampIn?: number;
  note?: string;
  opacity?: number;
}

const CARD_W = 400;
const CARD_H = 252;

/** Perimeter of a rounded rect (for the draw-on mask). */
const perimeter = (w: number, h: number, r: number) => 2 * (w + h) - 8 * r + 2 * Math.PI * r;

/** Rounded rect as a path that starts on the top edge just after the top-left corner and runs clockwise. */
function rrPath(x: number, y: number, w: number, h: number, r: number) {
  return `M ${r2(x + r)} ${r2(y)} H ${r2(x + w - r)} A ${r} ${r} 0 0 1 ${r2(x + w)} ${r2(y + r)} V ${r2(y + h - r)} A ${r} ${r} 0 0 1 ${r2(x + w - r)} ${r2(y + h)} H ${r2(x + r)} A ${r} ${r} 0 0 1 ${r2(x)} ${r2(y + h - r)} V ${r2(y + r)} A ${r} ${r} 0 0 1 ${r2(x + r)} ${r2(y)}`;
}

/**
 * A dashed rounded outline that can draw itself on (UI px), clockwise from the top-left. As the motion kit's
 * RecordOutline: round caps with the dash compensated ([8 − w, 6 + w]) so the visible dash stays 8/6, and the
 * reveal quantised to whole dashes. Nothing renders at draw 0.
 */
export function DashedOutline({ w, h, radius = 12, color = C.ink, width = 2, draw = 1 }: { w: number; h: number; radius?: number; color?: string; width?: number; draw?: number }) {
  const id = svgId(useId(), "rec-draw");
  const inset = width / 2;
  const d = rrPath(inset, inset, w - width, h - width, radius - inset);
  const P = perimeter(w - width, h - width, radius - inset);
  const p = clamp01(draw);
  if (p <= 0.001) return null;
  const dash = [8 - width, 6 + width];
  const pitch = dash[0] + dash[1];
  const shown = Math.min(P, Math.ceil((p * P) / pitch) * pitch);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {shown < P ? (
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x={-10} y={-10} width={w + 20} height={h + 20}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={width * 4} strokeDasharray={`${r2(shown)} ${r2(P)}`} />
          </mask>
        </defs>
      ) : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash.join(" ")} strokeLinecap="round" mask={shown < P ? `url(#${id})` : undefined} />
    </svg>
  );
}

/**
 * The default status stamp, matching the motion kit's Stamp (success outline, radius 10, Onest 700) plus the brand's
 * status icon: `progress` 0..1 slaps it in (scale 1.25 → 1, tilt −7° → −4°, ink spreads 1.4× → 1×). Pass the kit's
 * frame-driven <Stamp> as `stamp` instead if the scene runs on its clock.
 */
export function RecordStamp({ text, progress = 1, color = C.success }: { text: string; progress?: number; color?: string }) {
  const p = clamp01(progress);
  if (p <= 0) return null;
  const e = 1 - (1 - p) * (1 - p);
  const s = 1.25 - 0.25 * e;
  const tilt = -7 + 3 * e;
  const spread = 1 + 0.4 * (1 - Math.min(1, p * 2));
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px 3px 7px",
        border: `${r2(2 * spread)}px solid ${color}`,
        borderRadius: 10,
        background: C.white,
        color,
        ...sans(700),
        fontSize: 13.5,
        lineHeight: "17px",
        whiteSpace: "nowrap",
        transform: `rotate(${r2(tilt)}deg) scale(${r2(s)})`,
      }}
    >
      <Check size={14} strokeWidth={3} color={color} />
      {text}
    </span>
  );
}

function Dot({ chain, size = 10 }: { chain: Chain; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: CHAIN[chain].ui, flexShrink: 0, display: "inline-block" }} />;
}

/** One history record row at UI scale (w × h px). */
export function RecordRow({ rec, w, h }: { rec: RecordProps; w: number; h: number }) {
  const state = rec.state ?? "recorded";
  const draw = rec.draw ?? 1;
  const typed = clamp01(rec.typed ?? 1);
  const sticker = clamp01(rec.sticker ?? (state === "signed" ? 1 : 0));
  const danger = state === "unused";
  const color = danger ? C.danger : C.ink;
  const shown = rec.label.slice(0, Math.ceil(rec.label.length * typed));
  const [base, unusedTail] = danger && shown.includes(" · Unused") ? [shown.split(" · Unused")[0], " · Unused"] : [shown, ""];
  const stampNode = rec.stamp == null ? null : typeof rec.stamp === "string" ? <RecordStamp text={rec.stamp} progress={rec.stampIn ?? 1} /> : rec.stamp;
  const content = (withSticker: boolean) => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 10, padding: `0 ${stampNode && !withSticker && !danger ? 16 : 12}px 0 14px` }}>
      <Dot chain={rec.chain} />
      <span style={{ ...mono(500), fontSize: 14, color: C.ink, whiteSpace: "nowrap", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flexShrink: 1 }}>
        {base}
        {unusedTail ? <span style={{ color: C.danger }}>{unusedTail}</span> : null}
      </span>
      <span style={{ flex: 1, minWidth: 4 }} />
      {withSticker ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...sans(700), fontSize: 13, color: C.ink, flexShrink: 0 }}>
          <Check size={14} strokeWidth={3} color={C.ink} />
          Signed
        </span>
      ) : danger ? (
        <TriangleAlert size={16} strokeWidth={2.4} color={C.danger} style={{ flexShrink: 0 }} />
      ) : stampNode ? (
        <span style={{ flexShrink: 0, display: "inline-flex" }}>{stampNode}</span>
      ) : rec.note ? (
        <span style={{ ...sans(500), fontSize: 12.5, color: C.inkMuted, whiteSpace: "nowrap" }}>{rec.note}</span>
      ) : null}
    </div>
  );
  return (
    <div style={{ position: "relative", width: w, height: h, opacity: rec.opacity ?? 1 }}>
      <DashedOutline w={w} h={h} radius={12} color={color} draw={draw} />
      {typed > 0 && sticker < 1 ? content(false) : null}
      {sticker > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            background: C.white,
            border: `2px solid ${C.ink}`,
            boxShadow: `0 3px 0 ${C.ink}`,
            transform: `scale(${r2(1.12 - 0.12 * sticker)})`,
            opacity: Math.min(1, sticker * 4),
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "absolute", inset: -2 }}>{content(true)}</div>
        </div>
      ) : null}
    </div>
  );
}

export function CardBack({
  width = 640,
  count,
  title,
  records = [],
  lift = 0,
  header = 1,
  countPop = 0,
  night = false,
  showLogo = true,
  children,
  style,
}: {
  width?: number;
  count?: number;
  title?: string;
  records?: RecordProps[];
  lift?: number;
  header?: number;
  countPop?: number;
  night?: boolean;
  showLogo?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const k = width / CARD_W;
  const n = count ?? records.length;
  const head = title ?? `History · ${n} signature${n === 1 ? "" : "s"}`;
  const hA = head.includes(" · ") ? head.split(" · ")[0] : head;
  const typedHead = head.slice(0, Math.ceil(head.length * clamp01(header)));
  const showA = typedHead.slice(0, hA.length);
  const showB = typedHead.slice(hA.length);
  const padX = 18;
  const top = 64;
  const avail = CARD_H - top - 18;
  const gap = records.length > 3 ? 6 : 8;
  const rowH = records.length ? Math.min(46, (avail - gap * (records.length - 1)) / records.length) : 46;
  const drop = DROP + 8 * lift;
  const pop = 1 + 0.18 * Math.sin(Math.PI * clamp01(countPop));
  return (
    <div style={{ width, height: CARD_H * k, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CARD_W,
          height: CARD_H,
          transform: `translateY(${-8 * lift * k}px) scale(${k})`,
          transformOrigin: "0 0",
          borderRadius: R.card,
          background: C.surface,
          border: `${OUTLINE}px solid ${C.ink}`,
          boxShadow: `0 ${drop}px 0 ${night ? "#000" : C.ink}`,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", left: padX, right: padX, top: 18, height: 30, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ ...sans(700), fontSize: 18, color: C.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            {showA}
            <span style={{ display: "inline-block", color: C.inkMuted, fontWeight: 600, transform: `scale(${r2(pop)})`, transformOrigin: "0% 60%", whiteSpace: "pre" }}>{showB}</span>
          </span>
          {showLogo ? <StickerS height={30} /> : null}
        </div>
        <div style={{ position: "absolute", left: padX - 1.5, top: top - 3, display: "flex", flexDirection: "column", gap }}>
          {records.map((rec, i) => (
            <RecordRow key={i} rec={rec} w={CARD_W - 2 * padX - OUTLINE} h={rowH} />
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
