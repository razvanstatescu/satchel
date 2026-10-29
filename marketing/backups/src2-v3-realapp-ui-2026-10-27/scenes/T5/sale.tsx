import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Lock, RotateCw, X } from "lucide-react";
import { interpolate, random, spring } from "remotion";
import { type CharmFace, CharmShape } from "../../brand/Charm";
import { StickerS } from "../../brand/Logo";
import { C, type Chain, CHAIN, F, mono, sans } from "../../brand/tokens";
import { Avatar, type BuyState, HISTORY_4, HISTORY_7, type HistoryRecord, type RecordStatus, SalePage as KitSalePage, type Verdict } from "../../components/ui";
import { ScanBeam, Stamp, STAMP_TEXT, stampSize, Star4 } from "../../illustration/props";
import { clamp, EASE2, slapAt, SPRING2 } from "../../motion";

/**
 * Shared by T5 (the check), T6 (blocked) and T7 (the hand-off): carol.near's browser showing the REAL app's sale page
 * (the UI kit's SalePage at its native 1280 × 800, so the kit's layout maps apply), plus the film's illustrated layers:
 * the record charms hang on pegs on the browser frame's right edge, level with their record cards when the page is
 * scrolled to "The record", so each charm's bonk (+55°, motion kit `bonkAngle`) lands on its own card's right end;
 * the stamps print on the cards; the scan beam sweeps them.
 */

export type { Verdict, BuyState };

// ── geometry (UI px) ─────────────────────────────────────────────────────────────────────────────────────────────
/** The browser frame: the kit's 1280 × 800 page box inside a 3 px outline, 44 tab strip and 52 toolbar. */
export const BROWSER = { w: 1286, h: 902 } as const;
/** The page box inside the browser: exactly the UI kit SalePage's 1280 × 800 space (its layout maps apply as-is). */
export const PAGE = { x: 3, y: 99, w: 1280, h: 800 } as const;

/**
 * The record cards ("The record", one white card per signature) in the page. SALE_LAYOUT_RECORD measures them with the
 * clean verdict (first card at 917 − scroll, 99 tall, 10 apart); while the verdict is still checking the verdict card
 * is 26 px shorter, and a card is 76 tall until its evidence line appears (settled / unused: 99).
 */
export const REC = { x: 728, w: 520, gap: 10 } as const;
export const REC_TOP0: Record<Verdict, number> = { checking: 891, clean: 917, blocked: 917 };
export const recH = (status: RecordStatus) => (status === "settled" || status === "unused" ? 99 : 76);
export const RECORD_SCROLL = 680; // all three cards fit the MID framing
/** The cards' tops (page px) for a verdict, the cards' statuses and the right column's scroll. */
export const recTops = (verdict: Verdict, statuses: RecordStatus[], scroll: number) => {
  let y = REC_TOP0[verdict] - scroll;
  return statuses.map((s) => {
    const top = y;
    y += recH(s) + REC.gap;
    return top;
  });
};
/**
 * Where each charm's peg sits on the frame (page px, the card's "middle" for the contact geometry): chosen so the
 * charm hangs beside its card while the cards are checking and its bonk lands in the card's pill zone at contact.
 */
const MIDS = [249, 335, 450];
export const rowMid = (i: number) => MIDS[i];

/** The charms on the window frame: coin outer diameter 56 UI, brand stem 40 units. */
export const CH = { d: 56, u: 56 / 140, stemLen: 40 } as const;
/** Pivot → coin centre (UI px). */
export const CH_L = (12 + CH.stemLen + 56) * CH.u;
/** Where the coin centre sits at contact (+55°): just inside the record card's right end, a touch above its middle. */
const CONTACT_DX = 2;
const CONTACT_DY = -4;
/** Row i's charm pivot (page px): just outside the page, on the browser frame's right edge. */
export const pivotOf = (i: number) => {
  const a = (55 * Math.PI) / 180;
  return { x: REC.x + REC.w + CONTACT_DX + CH_L * Math.sin(a), y: rowMid(i) + CONTACT_DY - CH_L * Math.cos(a) };
};

/** Browser coordinates of a page point (for cameras). */
export const toBrowser = (x: number, y: number) => ({ x: x + PAGE.x, y: y + PAGE.y });

// ── camera ───────────────────────────────────────────────────────────────────────────────────────────────────────
export type Cam = { x: number; y: number; z: number };
export type CamKey = { f: number; cam: Cam; ease?: (t: number) => number };

/** Camera between keys: centre linear, zoom geometric, `pan` easing by default. Holds outside the keys. */
export function camAt(frame: number, keys: CamKey[]): Cam {
  if (frame <= keys[0].f) return keys[0].cam;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame < b.f) {
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      const e = (b.ease ?? EASE2.pan)(Math.max(0, Math.min(1, t)));
      return {
        x: a.cam.x + (b.cam.x - a.cam.x) * e,
        y: a.cam.y + (b.cam.y - a.cam.y) * e,
        z: Math.exp(Math.log(a.cam.z) + (Math.log(b.cam.z) - Math.log(a.cam.z)) * e),
      };
    }
  }
  return keys[keys.length - 1].cam;
}

/** A world layer seen through the camera (1920 × 1080 frame). */
export function CameraView({ cam, children, w = BROWSER.w, h = BROWSER.h, dy = 0 }: { cam: Cam; children: ReactNode; w?: number; h?: number; dy?: number }) {
  const tx = 960 - cam.x * cam.z;
  const ty = 540 - cam.y * cam.z + dy;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${cam.z})` }}>
      {children}
    </div>
  );
}

/** MID: the whole browser (and its frame charms), its top at y 262 so the caption band (0–262) holds two lines. */
export const CAM_MID: Cam = { x: 680, y: 222.4, z: 1.25 };

// ── the browser (the kit's BrowserFrame look, with tabs) ─────────────────────────────────────────────────────────
export interface TabSpec {
  title: string;
}

/**
 * carol's browser: the illustrator's BrowserFrame chrome (3 px ink outline, sunken tab strip, toolbar, hard drop),
 * extended with several tabs and an account chip (the kit frame has one tab). `active` = the open tab; `slap` = frames
 * since that tab was switched to (it slaps forward: §5 T7 "tab switch"), undefined = settled.
 */
export function Browser({
  tabs,
  active,
  url,
  account,
  slap,
  lift = 0,
  children,
}: {
  tabs: TabSpec[];
  active: number;
  url: string;
  account: string;
  slap?: number;
  lift?: number;
  children?: ReactNode;
}) {
  const O = 3;
  const stripH = 44;
  const barH = 52;
  const innerW = BROWSER.w - 2 * O;
  const tabW = 236;
  const tabX = (i: number) => 98 + i * (tabW + 6);
  const s = slap === undefined ? { sx: 1, sy: 1, lift: 0, opacity: 1 } : slapAt(slap, 30, 0, { from: 1.14, squash: 0.06, drop: 0 });
  const dot = (i: number) => <span key={i} style={{ width: 13, height: 13, borderRadius: 99, border: `2px solid ${C.ink}`, background: C.white, boxSizing: "border-box" }} />;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BROWSER.w,
        height: BROWSER.h,
        borderRadius: 20,
        border: `${O}px solid ${C.ink}`,
        background: C.white,
        boxShadow: `0 ${4 + lift}px 0 ${C.ink}`,
        transform: `translateY(${-lift}px)`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* tab strip */}
      <div style={{ position: "absolute", left: 0, top: 0, width: innerW, height: stripH, background: C.sunken, borderBottom: `2.5px solid ${C.ink}`, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: 18, top: 15, display: "flex", gap: 8 }}>{[0, 1, 2].map(dot)}</div>
        {tabs.map((t, i) =>
          i === active ? null : (
            <div key={t.title} style={{ position: "absolute", left: tabX(i), top: 9, width: tabW, height: stripH - 9, display: "flex", alignItems: "center", gap: 9, padding: "0 14px 2px 14px", boxSizing: "border-box" }}>
              <span style={{ opacity: 0.55, display: "flex" }}>
                <StickerS height={17} />
              </span>
              <span style={{ ...sans(550), fontSize: 14, color: C.inkMuted, flex: 1, whiteSpace: "nowrap" }}>{t.title}</span>
              <X size={13} strokeWidth={2.2} color={C.lineStrong} />
            </div>
          ),
        )}
        {/* separators between inactive tabs */}
        {tabs.map((_, i) => (i > 0 && i !== active && i - 1 !== active ? <span key={`sep${i}`} style={{ position: "absolute", left: tabX(i) - 3, top: 18, width: 1.5, height: 18, background: C.lineStrong, opacity: 0.6 }} /> : null))}
        <div
          style={{
            position: "absolute",
            left: tabX(active),
            top: 9,
            width: tabW,
            height: stripH - 9 + 1,
            background: C.white,
            border: `2.5px solid ${C.ink}`,
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "0 12px 2px 12px",
            transformOrigin: "50% 100%",
            transform: `scale(${s.sx}, ${s.sy})`,
          }}
        >
          <StickerS height={19} />
          <span style={{ ...sans(600), fontSize: 14, color: C.ink, flex: 1, whiteSpace: "nowrap" }}>{tabs[active].title}</span>
          <X size={14} strokeWidth={2.2} color={C.inkMuted} />
        </div>
      </div>
      {/* toolbar */}
      <div style={{ position: "absolute", left: 0, top: stripH, width: innerW, height: barH, display: "flex", alignItems: "center", gap: 14, padding: "0 14px 0 18px", boxSizing: "border-box", borderBottom: `2.5px solid ${C.ink}` }}>
        <ArrowLeft size={19} strokeWidth={2.2} color={C.ink} />
        <ArrowRight size={19} strokeWidth={2.2} color={C.lineStrong} />
        <RotateCw size={17} strokeWidth={2.2} color={C.ink} />
        <div style={{ flex: 1, height: 34, borderRadius: 999, background: C.sunken, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", marginLeft: 4 }}>
          <Lock size={13} strokeWidth={2.4} color={C.inkMuted} />
          <span style={{ ...sans(500), fontSize: 14.5, color: C.ink }}>{url}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px 0 5px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.white }}>
          <Avatar account={account} size={26} />
          <span style={{ ...mono(500), fontSize: 14, color: C.ink }}>{account}</span>
        </div>
      </div>
      {/* page */}
      <div style={{ position: "absolute", left: 0, top: stripH + barH, width: innerW, height: BROWSER.h - 2 * O - stripH - barH, background: C.ground, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ── the sale page: the UI kit's real-app SalePage, with the film's illustrated layers on top ─────────────────────
export interface CharmAnim {
  angle: number;
  face: CharmFace;
  squash?: number;
  /** UI px the charm jumps up on its peg (cheer). */
  hop?: number;
  /** 0..1 scale-in (the charm pops onto its peg). */
  show?: number;
}

export interface RecAnim {
  status: RecordStatus;
  /** 0..1 the kit pill's pop when the status lands. */
  pop?: number;
  /** 0..1 the illustrated stamp's impact (props Stamp; 0 = none). */
  stamp?: number;
  /** 0..1 the danger ring around the Unused pill (T6 bounce-off). */
  warnPop?: number;
}

export interface SaleProps {
  id: "7" | "4";
  recs: RecAnim[];
  verdict: Verdict;
  verdictPop?: number;
  buy: BuyState;
  press?: number;
  /** right-column scroll (px): 0 = top (verdict), RECORD_SCROLL = the record rows. */
  scroll: number;
  /** 0..1 the illustrated scan beam over the record rows (undefined = none). */
  scan?: number;
  scanBrackets?: number;
  spin?: number;
  contentY?: number;
  overlay?: ReactNode;
}

/**
 * carol's sale page exactly as the app draws it (UI kit SalePage: sidebar, ledger card + Price panel, Satchel #N,
 * tabs, verdict card, banner, You get, The record), plus the illustrated layers: each record's stamp (props Stamp,
 * over the card's lower right) and the scan beam over the record rows. The charms hang on the window frame
 * (FrameCharms, drawn outside the page so they can overhang the browser's edge).
 */
export function SalePage(p: SaleProps) {
  const base = p.id === "4" ? HISTORY_4 : HISTORY_7;
  const records: HistoryRecord[] = base.map((r, i) => ({ ...r, status: p.recs[i]?.status ?? r.status, pop: p.recs[i]?.pop }));
  const scroll = p.scroll;
  const n = records.length;
  const tops = recTops(p.verdict, records.map((r) => r.status), scroll);
  const recBottom = tops[n - 1] + recH(records[n - 1].status);
  return (
    <div style={{ position: "absolute", left: 0, top: p.contentY ?? 0, width: PAGE.w, height: PAGE.h }}>
      <KitSalePage satchel={p.id} verdict={p.verdict} records={records} buy={p.buy} press={p.press} verdictPop={p.verdictPop} spin={p.spin ?? 0} scroll={scroll} />
      {p.scan !== undefined && (p.scanBrackets ?? 0) > 0.001 ? (
        <div style={{ position: "absolute", left: REC.x, top: tops[0] }}>
          <ScanBeam width={REC.w} height={recBottom - tops[0]} progress={p.scan} brackets={p.scanBrackets ?? 1} radius={18} k={1} />
        </div>
      ) : null}
      {records.map((r, i) => {
        const a = p.recs[i];
        const top = tops[i];
        const st = a?.stamp ?? 0;
        const text = STAMP_TEXT[r.chain];
        const ss = stampSize(text);
        return (
          <div key={i}>
            {st > 0 ? (
              <div style={{ position: "absolute", left: REC.x + REC.w - 14 - ss.w, top: top + 66 - ss.h / 2 }}>
                <Stamp text={text} impact={st} tilt={-5} scale={1} />
              </div>
            ) : null}
            {a?.warnPop !== undefined && a.warnPop > 0 ? <WarnRing pop={a.warnPop} x={REC.x + REC.w - 62} y={top + 28} /> : null}
          </div>
        );
      })}
      {p.overlay}
    </div>
  );
}

/** A ring that pops out of the Unused pill when the charm's bonk bounces off the live signature (T6). */
function WarnRing({ pop, x, y }: { pop: number; x: number; y: number }) {
  const s = interpolate(pop, [0, 1], [0.6, 2.2]);
  const o = interpolate(pop, [0, 0.15, 1], [0, 0.9, 0]);
  return <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 99, border: `2.5px solid ${C.danger}`, transform: `scale(${s})`, opacity: o }} />;
}

/**
 * Each record's charm on a peg screwed to the browser frame's right edge, level with its record card when the
 * record is in view. Drawn in BROWSER px (render it after <Browser> inside the same camera layer).
 */
export function FrameCharms({ chains, charms }: { chains: Chain[]; charms: CharmAnim[] }) {
  return (
    <svg width={BROWSER.w} height={BROWSER.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {chains.map((chain, i) => {
        const pv = pivotOf(i);
        const c = charms[i];
        if (!c) return null;
        const sh = c.show ?? 1;
        if (sh <= 0.001) return null;
        const px = pv.x + PAGE.x;
        const py = pv.y + PAGE.y;
        const x0 = BROWSER.w - 7;
        return (
          <g key={i}>
            {/* the peg: a small ink bracket on the frame with a jump ring at its tip */}
            <rect x={x0} y={py - 3} width={px - x0 + 2} height={6} rx={3} fill={C.ink} />
            <rect x={x0 - 3} y={py - 9} width={8} height={18} rx={3} fill={C.ink} />
            <circle cx={px} cy={py + 2.4} r={3.4} fill={C.white} stroke={C.ink} strokeWidth={2.2} />
            <g transform={`translate(${px} ${py - (c.hop ?? 0)}) scale(${CH.u * sh})`}>
              <CharmShape fill={CHAIN[chain].color} angle={c.angle} face={c.face} squash={c.squash ?? 0} stemLen={CH.stemLen} drop={0} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ── captions (screen space) ──────────────────────────────────────────────────────────────────────────────────────
/**
 * Caption slap (motion bible §2.16): Funnel Display 800, sentence case, ink, scale 1.2 → 1 with contact on f4 and a
 * seeded tilt within ±2°. `contact` = the contact frame (the slap starts 4 f earlier). `out` = the frame it lifts off
 * (8 f, accelerating up and away). Centred on x, its top at `y`.
 */
export function Caption({ frame, text, contact, out, y, size = 120, seed, x = 960, color = C.ink, maxWidth }: { frame: number; text: ReactNode; contact: number; out?: number; y: number; size?: number; seed: string; x?: number; color?: string; maxWidth?: number }) {
  const start = contact - 4;
  if (frame < start) return null;
  const f = frame - start;
  const { sx, sy, opacity } = slapAt(f, 30, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const tilt = (random(`caption-${seed}`) - 0.5) * 4;
  let ex = 0;
  if (out !== undefined && frame >= out) {
    ex = interpolate(frame, [out, out + 8], [0, 1], { ...clamp, easing: EASE2.fall });
    if (ex >= 1) return null;
  }
  return (
    <div style={{ position: "absolute", left: x - 960, width: 1920, top: y, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: "-0.035em",
          color,
          opacity,
          textAlign: "center",
          maxWidth,
          whiteSpace: maxWidth ? "normal" : "nowrap",
          scale: `${sx * (1 + 0.05 * ex)} ${sy * (1 + 0.05 * ex)}`,
          rotate: `${tilt - 3 * ex}deg`,
          translate: `0 ${-240 * ex}px`,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ── sparkles at chosen points (motion bible §2.13: pop in, turn 0 → 30°, gone by f16, staggered 2 f) ───────────────
export function SparkPoints({ f, points, k = 1 }: { f: number; points: { x: number; y: number; r: number }[]; k?: number }) {
  if (f < 0 || f > points.length * 2 + 18) return null;
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {points.map((p, i) => {
        const g = f - 2 * i;
        if (g < 0) return null;
        const grow = spring({ frame: g, fps: 30, config: SPRING2.pop });
        const shrink = interpolate(g, [9, 16], [1, 0], clamp);
        const s = Math.max(0, grow * shrink);
        if (s <= 0.001) return null;
        return <Star4 key={i} x={p.x} y={p.y} r={p.r * s} k={k} rot={interpolate(g, [0, 16], [0, 30], clamp)} />;
      })}
    </svg>
  );
}

// ── charm faces ──────────────────────────────────────────────────────────────────────────────────────────────────
/** A face that eases between two looks by `t` (0..1). */
export function mixFace(a: CharmFace, b: CharmFace, t: number): CharmFace {
  const k = Math.max(0, Math.min(1, t));
  const n = (x: number | undefined, d: number) => x ?? d;
  return {
    blink: n(a.blink, 0) + (n(b.blink, 0) - n(a.blink, 0)) * k,
    smile: n(a.smile, 1) + (n(b.smile, 1) - n(a.smile, 1)) * k,
    wide: n(a.wide, 0) + (n(b.wide, 0) - n(a.wide, 0)) * k,
    joy: n(a.joy, 0) + (n(b.joy, 0) - n(a.joy, 0)) * k,
    grin: n(a.grin, 0) + (n(b.grin, 0) - n(a.grin, 0)) * k,
    o: n(a.o, 0) + (n(b.o, 0) - n(a.o, 0)) * k,
    tilt: n(a.tilt, 0) + (n(b.tilt, 0) - n(a.tilt, 0)) * k,
    look: {
      x: n(a.look?.x, 0) + (n(b.look?.x, 0) - n(a.look?.x, 0)) * k,
      y: n(a.look?.y, 0) + (n(b.look?.y, 0) - n(a.look?.y, 0)) * k,
    },
  };
}

export const CHAIN_OF_ROW: Chain[] = ["btc", "evm", "sol"];

