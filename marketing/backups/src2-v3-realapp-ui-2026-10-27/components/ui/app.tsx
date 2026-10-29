import type { CSSProperties, ReactNode } from "react";
import { Check, CircleCheck, CircleDashed, Hourglass, Menu, Minimize2, Snowflake, TriangleAlert, X } from "lucide-react";
import { Lockup, Mark, StickerS } from "../../brand/Logo";
import { C, type Chain, display, mono, sans } from "../../brand/tokens";
import { type Balances, CHAIN_NAME, CHAINS, TICKER } from "./data";
import { Avatar, CoinFace, PhoneScreen, type PhoneChrome, Spinner, STROKE } from "./kit";

/**
 * Pieces of the REAL Satchel 2.0 app (apps/web, frozen 2026-10-26), redrawn for the film at true UI px:
 * the phone top bar, the charm-ledger card, state pills, the dark segmented control, the bottom-sheet flow shell
 * (grab handle, big left title, sub line, ✕, the page dimmed behind, the coral primary pinned) and the stepper.
 * Elements a scene may target carry `data-ui="…"`; their boxes are exported per screen from ./layout.
 */

/** A box in screen px (390 × 844 phone, 1280 × 800 browser): x, y = top-left. */
export interface UiBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The chain charm as the app draws it in rows and the ledger: the coin with its face, no drop. */
export function ChainFace({ chain, size = 24, sad = false, style }: { chain: Chain; size?: number; sad?: boolean; style?: CSSProperties }) {
  return <CoinFace chain={chain} size={size} drop={false} face={sad ? { smile: -0.9 } : undefined} style={style} />;
}

/* ───────────── state pills (app StatusPill: icon + word on sunken) ───────────── */

export type AppStatus = "active" | "paused" | "signing" | "bought" | "given" | "attention";
const STATUS: Record<AppStatus, { word: string; color: string }> = {
  active: { word: "Active", color: C.success },
  paused: { word: "Paused for sale", color: C.frozen },
  signing: { word: "Signing", color: C.frozen },
  bought: { word: "Bought", color: C.success },
  given: { word: "Given", color: C.success },
  attention: { word: "Needs attention", color: C.danger },
};

export function AppPill({ status, spin = 0, bg = C.sunken, style }: { status: AppStatus; spin?: number; bg?: string; style?: CSSProperties }) {
  const s = STATUS[status];
  const icon =
    status === "active" ? <Check size={14} strokeWidth={STROKE} /> : status === "paused" ? <Snowflake size={14} strokeWidth={STROKE} /> : status === "signing" ? <Spinner size={14} spin={spin} color={s.color} /> : status === "attention" ? <TriangleAlert size={14} strokeWidth={STROKE} /> : <CircleCheck size={14} strokeWidth={STROKE} />;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: bg, color: s.color, ...sans(600), fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", flexShrink: 0, ...style }}>
      {icon}
      {s.word}
    </span>
  );
}

/** The lemon sticker badges on the card band: "Yours" (you own it) and "New" (the mint preview). */
export function BandBadge({ kind, scale = 1 }: { kind: "yours" | "new"; scale?: number }) {
  return (
    <span style={{ ...sans(700), fontSize: 12 * scale, lineHeight: `${16 * scale}px`, padding: `${1 * scale}px ${8 * scale}px`, borderRadius: 999, background: C.lemon, border: `${1.5 * scale}px solid ${C.ink}`, color: C.ink, whiteSpace: "nowrap", flexShrink: 0 }}>
      {kind === "yours" ? "Yours" : "New"}
    </span>
  );
}

/* ───────────── the card (charm ledger) ───────────── */

/**
 * The Satchel card as the app draws it: coral band (name, the lemon Yours/New sticker, the sticker S) over the charm
 * ledger (one row per chain: charm, native amount in Funnel 800, ticker), then the state pill. 1.586:1, 3px ink
 * outline, hard drop. `preview` = the mint preview ("Bitcoin address" rows). `lift` raises it (drop 4 → 6),
 * `tilt` rotates it (degrees; the Review gift card sits at −2°).
 */
export function AppCard({
  id = "7",
  name,
  width = 358,
  balances,
  preview = false,
  badge = "yours",
  status = "active",
  spin = 0,
  lift = 0,
  tilt = 0,
  style,
}: {
  id?: string;
  name?: string;
  width?: number;
  balances?: Balances;
  preview?: boolean;
  badge?: "yours" | "new" | null;
  status?: AppStatus | null;
  spin?: number;
  lift?: number;
  tilt?: number;
  style?: CSSProperties;
}) {
  const lg = width >= 352;
  const h = Math.round(width / 1.586);
  const band = lg ? 60 : 50;
  const z = (a: string) => /^0(\.0+)?$/.test(a.trim());
  return (
    <div
      data-ui="card"
      style={{
        width,
        height: h,
        boxSizing: "border-box",
        borderRadius: 28,
        background: C.surface,
        border: `3px solid ${C.ink}`,
        boxShadow: `0 ${4 + 2 * lift}px 0 ${C.ink}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transform: `translateY(${-8 * lift}px) rotate(${tilt}deg)`,
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={{ height: band, flexShrink: 0, background: C.brand, borderBottom: `3px solid ${C.ink}`, display: "flex", alignItems: "center", gap: 10, padding: lg ? "0 16px 0 20px" : "0 13px 0 16px", boxSizing: "border-box" }}>
        <span style={{ ...display(800), fontSize: lg ? 20 : 17, letterSpacing: "-0.02em", color: C.ink, whiteSpace: "nowrap" }}>{name ?? (preview ? "New Satchel" : `Satchel #${id}`)}</span>
        {preview ? <BandBadge kind="new" /> : badge ? <BandBadge kind={badge} /> : null}
        <span style={{ marginLeft: "auto" }}>
          <StickerS height={lg ? 38 : 30} />
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: lg ? "14px 20px 16px" : "11px 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: lg ? 4 : 2 }}>
          {CHAINS.map((c) => {
            const a = balances?.[c] ?? "0";
            const zero = !preview && z(a);
            return (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: lg ? 10 : 8 }}>
                <ChainFace chain={c} size={lg ? 24 : 20} />
                {preview ? (
                  <span style={{ ...sans(600), fontSize: lg ? 15 : 14, lineHeight: "20px", color: C.ink }}>{CHAIN_NAME[c]} address</span>
                ) : (
                  <>
                    <span style={{ ...display(800), fontSize: lg ? 26 : 20, lineHeight: lg ? "30px" : "24px", letterSpacing: "-0.02em", color: zero ? C.inkMuted : C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{zero ? "0" : a}</span>
                    <span style={{ ...sans(600), fontSize: lg ? 15 : 13, lineHeight: "18px", color: C.inkMuted }}>{TICKER[c]}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {status && !preview ? (
          <div>
            <AppPill status={status} spin={spin} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The flow sheets' title glyph: a tiny Satchel card (coral band over white). */
export function Swatch({ w = 40, h = 26 }: { w?: number; h?: number }) {
  return (
    <span style={{ width: w, height: h, borderRadius: 6, border: `2px solid ${C.ink}`, background: C.surface, overflow: "hidden", boxSizing: "border-box", flexShrink: 0, display: "block" }}>
      <span style={{ display: "block", height: "42%", background: C.brand, borderBottom: `2px solid ${C.ink}` }} />
    </span>
  );
}

/* ───────────── controls ───────────── */

/** The app's chain switcher: a sunken pill track; the selected segment is an ink pill with white text. */
export function AppSegmented<K extends string>({ items, selected, height = 44, style }: { items: { key: K; label: ReactNode; lead?: ReactNode }[]; selected: K; height?: number; style?: CSSProperties }) {
  return (
    <div data-ui="segmented" style={{ display: "flex", padding: 4, gap: 4, borderRadius: 999, background: C.sunken, boxSizing: "border-box", ...style }}>
      {items.map((it) => {
        const on = it.key === selected;
        return (
          <div
            key={it.key}
            style={{ flex: 1, height: height - 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, background: on ? C.ink : "transparent", color: on ? C.white : C.inkMuted, ...sans(on ? 650 : 550), fontSize: 15, whiteSpace: "nowrap" }}
          >
            {it.lead}
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

/** Page tabs (Wallet · Activity · Sell / Buy): the active one in ink with a coral underline, a hairline under all. */
export function AppTabs({ tabs, active, style }: { tabs: string[]; active: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.line}`, ...style }}>
      {tabs.map((t) => {
        const on = t === active;
        return (
          <div key={t} style={{ position: "relative", padding: "0 2px 12px", ...sans(on ? 650 : 500), fontSize: 15, lineHeight: "20px", color: on ? C.ink : C.inkMuted }}>
            {t}
            {on ? <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, borderRadius: 2, background: C.brandDeep }} /> : null}
          </div>
        );
      })}
    </div>
  );
}

/** The phone top bar: the lockup (or the mark + a live activity chip while signing), the account avatar, Menu. */
export function AppTopBar({ account = "alice.near", activity, spin = 0 }: { account?: string; activity?: string; spin?: number }) {
  return (
    <div style={{ height: 64, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
      {activity ? (
        <>
          <Mark size={32} />
          <span style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 999, background: C.surface, border: `1.5px solid ${C.line}`, ...sans(600), fontSize: 13, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            <Spinner size={15} spin={spin} color={C.frozen} />
            {activity}
          </span>
        </>
      ) : (
        <span style={{ marginRight: "auto" }}>
          <Lockup height={32} />
        </span>
      )}
      <span style={{ width: 42, height: 42, borderRadius: 999, background: C.surface, border: `1.5px solid ${C.line}`, display: "grid", placeItems: "center", boxSizing: "border-box" }}>
        <Avatar account={account} size={26} />
      </span>
      <Menu size={24} strokeWidth={STROKE} color={C.ink} style={{ marginLeft: 6 }} />
    </div>
  );
}

/* ───────────── the flow sheet ───────────── */

/**
 * FlowSheet: the app's FlowShell on a phone. The page `backdrop` (a full screen element) sits dimmed behind; the sheet
 * rises from the bottom with a grab handle, a big left-aligned Funnel title (an optional card swatch before it), a sub
 * line, ✕ (or Minimize while signing) on the right, the body, and the footer pinned at the bottom.
 * full = the sheet runs to just under the status bar (Send, Add coins, Give, Sell); otherwise it hugs its content
 * (Mint). `open` 0..1 slides it up over the scrim. `bodyScroll` scrolls the body (px).
 */
export function FlowSheet({
  title,
  sub,
  swatch = false,
  close = "close",
  open = 1,
  backdrop,
  footer,
  footerLine = true,
  full = true,
  bodyScroll = 0,
  bodyGap = 16,
  bare = false,
  children,
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
}: PhoneChrome & {
  /** No backdrop and a transparent root: the sheet + scrim alone, to layer over a screen (as its `overlay`). */
  bare?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  swatch?: boolean;
  close?: "close" | "minimize" | "none";
  open?: number;
  backdrop?: ReactNode;
  footer?: ReactNode;
  footerLine?: boolean;
  full?: boolean;
  bodyScroll?: number;
  bodyGap?: number;
  children?: ReactNode;
}) {
  const o = Math.max(0, Math.min(1, open));
  const Close = close === "minimize" ? Minimize2 : X;
  return (
    <div style={{ position: bare ? "absolute" : "relative", inset: bare ? 0 : undefined, width: "100%", height: "100%", overflow: "hidden", background: bare ? "transparent" : C.ground, color: C.ink, ...sans(400) }}>
      {bare ? null : <div style={{ position: "absolute", inset: 0 }}>{backdrop ?? <PhoneScreen statusBar={statusBar} insetTop={insetTop} insetBottom={insetBottom} />}</div>}
      <div style={{ position: "absolute", inset: 0, background: "rgba(29, 19, 64, 0.4)", opacity: o }} />
      <div
        data-ui="sheet"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top: full ? insetTop + 12 : undefined,
          maxHeight: full ? undefined : `calc(100% - ${insetTop + 12}px)`,
          transform: `translateY(${(1 - o) * 104}%)`,
          background: C.surface,
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -8px 32px rgba(29, 19, 64, 0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "#cfcbdd", margin: "10px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "20px 16px 0 20px", flexShrink: 0 }}>
          {swatch ? (
            <span style={{ marginTop: 5 }}>
              <Swatch />
            </span>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div data-ui="title" style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em", color: C.ink, textWrap: "balance" } as CSSProperties}>
              {title}
            </div>
            {sub ? <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 4 }}>{sub}</div> : null}
          </div>
          {close === "none" ? null : (
            <span data-ui="close" style={{ width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Close size={24} strokeWidth={STROKE} color={C.ink} />
            </span>
          )}
        </div>
        <div style={{ flex: full ? 1 : undefined, minHeight: 0, overflow: "hidden", position: "relative" }}>
          <div style={{ padding: `${bodyGap}px 20px 18px`, display: "flex", flexDirection: "column", gap: bodyGap, transform: `translateY(${-bodyScroll}px)` }}>{children}</div>
        </div>
        {footer ? (
          <div data-ui="footer" style={{ flexShrink: 0, padding: `14px 20px ${Math.max(14, insetBottom - 4)}px`, background: C.surface, borderTop: footerLine ? `1px solid ${C.line}` : undefined }}>
            {footer}
          </div>
        ) : (
          <div style={{ height: insetBottom, flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}

/** A muted helper line under a pinned button ("Check your NEAR wallet."). */
export function FootNote({ children, icon, style }: { children: ReactNode; icon?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, ...style }}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

/* ───────────── stepper (the tracker that becomes the receipt) ───────────── */

export type StepperState = "done" | "active" | "future" | "waiting";
export interface StepperRow {
  label: ReactNode;
  sub?: ReactNode;
  state: StepperState;
}

/** Vertical stepper: green check circles, a blue spinner on the active row, dashed circles for future, connectors. */
export function Stepper({ rows, spin = 0, style }: { rows: StepperRow[]; spin?: number; style?: CSSProperties }) {
  return (
    <div data-ui="stepper" style={{ display: "flex", flexDirection: "column", ...style }}>
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        const green = r.state === "done";
        return (
          <div key={i} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: last ? 0 : 16 }}>
            {!last ? <span style={{ position: "absolute", left: 11, top: 27, bottom: 3, width: 2, borderRadius: 1, background: green ? C.success : C.lineStrong, opacity: green ? 0.75 : 0.45 }} /> : null}
            <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {r.state === "done" ? (
                <CircleCheck size={24} strokeWidth={STROKE} color={C.success} />
              ) : r.state === "active" ? (
                <Spinner size={24} spin={spin} color={C.frozen} />
              ) : r.state === "waiting" ? (
                <Hourglass size={22} strokeWidth={STROKE} color={C.frozen} />
              ) : (
                <CircleDashed size={24} strokeWidth={STROKE} color={C.lineStrong} />
              )}
            </span>
            <div style={{ minWidth: 0, paddingTop: 1 }}>
              <div style={{ ...sans(r.state === "active" || r.state === "waiting" ? 650 : 400), fontSize: 16, lineHeight: "22px", color: r.state === "future" ? C.inkMuted : C.ink }}>{r.label}</div>
              {r.sub ? <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{r.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** An inline explorer link as the app draws it: link colour, underlined, ↗. */
export function AppLink({ children, monoText = false, style }: { children: ReactNode; monoText?: boolean; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.link, textDecoration: "underline", textUnderlineOffset: 3, ...(monoText ? mono(450) : sans(500)), ...style }}>
      {children}
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 7h10v10M7 17 17 7" />
      </svg>
    </span>
  );
}

/** "0.0412 BTC, 0.85 ETH and 12.4 SOL" (the app's holdings sentence). */
export const holdingsSentence = (b: Balances) => `${b.btc} ${TICKER.btc}, ${b.evm} ${TICKER.evm} and ${b.sol} ${TICKER.sol}`;

/** A sunken note chip with an icon (the review's "Signing: usually about 10 seconds" chip, the tracker banner). */
export function InfoChip({ icon, children, style }: { icon: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 16, background: C.sunken, ...sans(400), fontSize: 15, lineHeight: "20px", color: C.ink, ...style }}>
      <span style={{ marginTop: 0, color: C.frozen, display: "grid" }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
