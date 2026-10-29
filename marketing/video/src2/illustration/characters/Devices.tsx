import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Lock, RotateCw, X } from "lucide-react";
import { StickerS } from "../../brand/Logo";
import { C, DROP, NIGHT, sans } from "../../brand/tokens";

/**
 * Device frames in the 2.0 sticker style (the In-context board): ink outlines, hard drops, flat fills.
 * Both are AUTHORED AT UI SIZE and scaled by `k`: children are laid out at UI px inside the screen / page box
 * (so you can copy numbers straight from the brand mocks) and the whole frame is multiplied by k.
 *
 * PhoneFrame — <PhoneFrame k={2.2}>{screen at 344 × 744 UI px}</PhoneFrame>
 *   k            scale (default 1). Outer UI size width × height (default 360 × 760, the In-context phone).
 *   screen       screen fill (default white; night → Night ground).
 *   bezel        ink bezel at UI px (default 8). radius 40.
 *   notch        the dynamic-island pill (default true). statusBar: "9:41" + glyphs (default false).
 *   homeBar      the home indicator (default true). url: the In-context bottom URL pill text (replaces homeBar).
 *   buttons      side buttons on the silhouette (default true).
 *   lift / press the sticker model: lift raises it (drop 4 → 4 + 8·lift), press sinks it into its shadow.
 *   night        Night screen and #000 shadow.
 *   PHONE_SCREEN = inner UI size for a default phone: { w: 344, h: 744 }.
 *
 * BrowserFrame — <BrowserFrame k={1.2} url="satchel/s/7" title="Satchel #7">{page at UI px}</BrowserFrame>
 *   k            scale (default 1). Outer UI size width × height (default 1280 × 800).
 *   url          url pill text (default "satchel/s/7"). title: tab title (default "Satchel #7").
 *   page         page fill (default Day ground). The page box is (width − 6) × (height − 3 − 96) UI px.
 *   lift / press as above. Tab favicon = the sticker S (never the coral tile here: one coral per frame).
 */

export const PHONE_SCREEN = { w: 344, h: 744 } as const;
export const BROWSER_CHROME = 96;

export function PhoneFrame({
  k = 1,
  width = 360,
  height = 760,
  bezel = 8,
  screen,
  notch = true,
  statusBar = false,
  homeBar = true,
  url,
  buttons = true,
  lift = 0,
  press = 0,
  night = false,
  children,
  style,
}: {
  k?: number;
  width?: number;
  height?: number;
  bezel?: number;
  screen?: string;
  notch?: boolean;
  statusBar?: boolean;
  homeBar?: boolean;
  url?: string;
  buttons?: boolean;
  lift?: number;
  press?: number;
  night?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const shadow = night ? "#000" : C.ink;
  const drop = DROP * k * (1 - press) + 8 * k * lift;
  const dy = DROP * k * press - 8 * k * lift;
  const sw = width - 2 * bezel;
  const sh = height - 2 * bezel;
  const fg = night ? NIGHT.ink : C.ink;
  const btn = (side: "l" | "r", top: number, h: number) => (
    <div
      style={{
        position: "absolute",
        [side === "l" ? "left" : "right"]: -4 * k,
        top: top * k,
        width: 6 * k,
        height: h * k,
        borderRadius: 3 * k,
        background: C.ink,
      }}
    />
  );
  return (
    <div style={{ position: "relative", width: width * k, height: height * k, transform: `translateY(${dy}px)`, ...style }}>
      {buttons ? (
        <>
          {btn("l", 150, 46)}
          {btn("l", 208, 46)}
          {btn("r", 180, 74)}
        </>
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 40 * k,
          border: `${bezel * k}px solid ${C.ink}`,
          background: screen ?? (night ? NIGHT.ground : C.white),
          boxShadow: `0 ${drop}px 0 ${shadow}`,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: sw, height: sh, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{children}</div>
          {statusBar ? (
            <div style={{ position: "absolute", left: 26, right: 22, top: 14, height: 22, display: "flex", alignItems: "center", justifyContent: "space-between", color: fg }}>
              <span style={{ ...sans(650), fontSize: 15, fontVariantNumeric: "tabular-nums" }}>9:41</span>
              <svg width={62} height={14} viewBox="0 0 62 14">
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} x={i * 5} y={10 - i * 3} width={3.2} height={4 + i * 3} rx={1} fill={fg} />
                ))}
                <path d="M 30 5.2 Q 35.5 0.5 41 5.2 M 32.3 7.8 Q 35.5 5 38.7 7.8" fill="none" stroke={fg} strokeWidth={1.8} strokeLinecap="round" />
                <circle cx={35.5} cy={10.6} r={1.5} fill={fg} />
                <rect x={45} y={1.5} width={14} height={11} rx={3} fill="none" stroke={fg} strokeWidth={1.4} />
                <rect x={47} y={3.5} width={9} height={7} rx={1.4} fill={fg} />
                <rect x={59.6} y={5} width={1.6} height={4} rx={0.8} fill={fg} />
              </svg>
            </div>
          ) : null}
          {notch ? <div style={{ position: "absolute", left: sw / 2 - 48, top: 10, width: 96, height: 28, borderRadius: 14, background: C.ink }} /> : null}
          {url ? (
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <div style={{ background: night ? NIGHT.sunken : C.sunken, borderRadius: 999, padding: "9px 14px", ...sans(500), fontSize: 12, color: night ? NIGHT.inkMuted : C.inkMuted, textAlign: "center" }}>{url}</div>
            </div>
          ) : homeBar ? (
            <div style={{ position: "absolute", left: sw / 2 - 60, bottom: 9, width: 120, height: 5, borderRadius: 3, background: fg }} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BrowserFrame({
  k = 1,
  width = 1280,
  height = 800,
  url = "satchel/s/7",
  title = "Satchel #7",
  page = C.ground,
  lift = 0,
  press = 0,
  children,
  style,
}: {
  k?: number;
  width?: number;
  height?: number;
  url?: string;
  title?: string;
  page?: string;
  lift?: number;
  press?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const drop = DROP * k * (1 - press) + 8 * k * lift;
  const dy = DROP * k * press - 8 * k * lift;
  const O = 3; // outline, UI px
  const stripH = 44;
  const barH = 52;
  const innerW = width - 2 * O;
  const dot = (i: number) => <span key={i} style={{ width: 13, height: 13, borderRadius: 99, border: `2px solid ${C.ink}`, background: C.white, boxSizing: "border-box" }} />;
  return (
    <div style={{ position: "relative", width: width * k, height: height * k, transform: `translateY(${dy}px)`, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transform: `scale(${k})`,
          transformOrigin: "0 0",
          borderRadius: 20,
          border: `${O}px solid ${C.ink}`,
          background: C.white,
          boxShadow: `0 ${drop / k}px 0 ${C.ink}`,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* tab strip */}
        <div style={{ position: "absolute", left: 0, top: 0, width: innerW, height: stripH, background: C.sunken, borderBottom: `2.5px solid ${C.ink}`, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 18, top: 15, display: "flex", gap: 8 }}>{[0, 1, 2].map(dot)}</div>
          <div
            style={{
              position: "absolute",
              left: 98,
              top: 9,
              width: 236,
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
            }}
          >
            <StickerS height={19} />
            <span style={{ ...sans(600), fontSize: 14, color: C.ink, flex: 1, whiteSpace: "nowrap" }}>{title}</span>
            <X size={14} strokeWidth={2.2} color={C.inkMuted} />
          </div>
        </div>
        {/* toolbar */}
        <div style={{ position: "absolute", left: 0, top: stripH, width: innerW, height: barH, display: "flex", alignItems: "center", gap: 14, padding: "0 18px", boxSizing: "border-box", borderBottom: `2.5px solid ${C.ink}` }}>
          <ArrowLeft size={19} strokeWidth={2.2} color={C.ink} />
          <ArrowRight size={19} strokeWidth={2.2} color={C.lineStrong} />
          <RotateCw size={17} strokeWidth={2.2} color={C.ink} />
          <div style={{ flex: 1, height: 34, borderRadius: 999, background: C.sunken, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", marginLeft: 4 }}>
            <Lock size={13} strokeWidth={2.4} color={C.inkMuted} />
            <span style={{ ...sans(500), fontSize: 14.5, color: C.ink }}>{url}</span>
          </div>
        </div>
        {/* page */}
        <div style={{ position: "absolute", left: 0, top: stripH + barH, width: innerW, height: height - 2 * O - stripH - barH, background: page, overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}
