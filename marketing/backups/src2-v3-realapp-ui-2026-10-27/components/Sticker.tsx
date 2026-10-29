import type { CSSProperties, ReactNode } from "react";
import { Check, Gift, Handshake, LoaderCircle, Snowflake, TriangleAlert } from "lucide-react";
import { CharmShape, charmFill } from "../brand/Charm";
import { StickerS } from "../brand/Logo";
import { C, type Chain, CHAIN, display, DROP, mono, NIGHT, OUTLINE, R, sans } from "../brand/tokens";

/**
 * Satchel 2.0 sticker UI kit for video. Everything is authored at UI scale and multiplied by `k` (video usually
 * k ≈ 2–2.6 so text stays legible on phones). Stickers: 3px ink outline + hard ink drop, no blur.
 *   lift  0..1+ : the sticker rises off the page, its drop grows (4 → 4 + 8·lift) and it moves up by the same amount
 *   press 0..1  : a button sinks into its shadow (translateY 4, drop → 0)
 */

export function Sticker({
  k = 2,
  radius = R.card,
  bg = C.surface,
  lift = 0,
  press = 0,
  children,
  style,
  outline = true,
}: {
  k?: number;
  radius?: number;
  bg?: string;
  lift?: number;
  press?: number;
  children?: ReactNode;
  style?: CSSProperties;
  outline?: boolean;
}) {
  const drop = DROP * k * (1 - press) + 8 * k * lift;
  const dy = DROP * k * press - 8 * k * lift;
  return (
    <div
      style={{
        background: bg,
        borderRadius: radius * k,
        border: outline ? `${OUTLINE * k}px solid ${C.ink}` : undefined,
        boxShadow: `0 ${drop}px 0 ${C.ink}`,
        transform: `translateY(${dy}px)`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Button({ label, k = 2, kind = "primary", press = 0, width, style }: { label: ReactNode; k?: number; kind?: "primary" | "secondary"; press?: number; width?: number; style?: CSSProperties }) {
  const primary = kind === "primary";
  return (
    <div
      style={{
        ...sans(700),
        fontSize: 15 * k,
        lineHeight: `${20 * k}px`,
        padding: `${13 * k}px ${22 * k}px`,
        borderRadius: R.md * k,
        background: primary ? C.brand : C.surface,
        color: C.ink,
        border: primary ? `${2 * k}px solid ${C.ink}` : `${2 * k}px solid ${C.lineStrong}`,
        boxShadow: primary ? `0 ${DROP * k * (1 - press)}px 0 ${C.ink}` : undefined,
        transform: `translateY(${primary ? DROP * k * press : 0}px)`,
        textAlign: "center",
        width,
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

// App 2.0 states (D-44): Active, Signing, Paused for sale, Sold, Needs attention; a give ends in "Given".
export type PillKind = "sent" | "paused" | "attention" | "new" | "active" | "signing" | "sold" | "given";
const PILL: Record<PillKind, { word: string; color: string; Icon?: typeof Check }> = {
  sent: { word: "Sent", color: C.success, Icon: Check },
  active: { word: "Active", color: C.success, Icon: Check },
  signing: { word: "Signing", color: C.frozen, Icon: LoaderCircle },
  paused: { word: "Paused for sale", color: C.frozen, Icon: Snowflake },
  attention: { word: "Needs attention", color: C.danger, Icon: TriangleAlert },
  sold: { word: "Sold", color: C.inkMuted, Icon: Handshake },
  given: { word: "Given", color: C.inkMuted, Icon: Gift },
  new: { word: "New", color: C.ink },
};

export function Pill({ kind, k = 2, word, style }: { kind: PillKind; k?: number; word?: string; style?: CSSProperties }) {
  const p = PILL[kind];
  const isNew = kind === "new";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * k,
        ...sans(isNew ? 700 : 600),
        fontSize: 13 * k,
        lineHeight: `${18 * k}px`,
        padding: `${6 * k}px ${12 * k}px`,
        borderRadius: 999,
        background: isNew ? C.lemon : C.sunken,
        border: isNew ? `${2 * k}px solid ${C.ink}` : undefined,
        color: p.color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {p.Icon ? <p.Icon size={14 * k} strokeWidth={2} color={p.color} /> : null}
      {word ?? p.word}
    </span>
  );
}

export function ChainDot({ chain, k = 2 }: { chain: Chain; k?: number }) {
  return <span style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: CHAIN[chain].ui, display: "inline-block", flexShrink: 0 }} />;
}

export function Chip({ chain, amount, k = 2, style }: { chain: Chain; amount?: string; k?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * k,
        ...sans(500),
        fontSize: 13 * k,
        lineHeight: `${18 * k}px`,
        padding: `${6 * k}px ${10 * k}px`,
        borderRadius: R.sm * k,
        background: C.sunken,
        color: C.ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <ChainDot chain={chain} k={k} />
      {CHAIN[chain].ticker}
      {amount ? ` ${amount}` : null}
    </span>
  );
}

export function Address({ value, k = 2, style }: { value: string; k?: number; style?: CSSProperties }) {
  return <span style={{ ...mono(450), fontSize: 13 * k, lineHeight: `${18 * k}px`, color: C.ink, ...style }}>{value}</span>;
}

/** The lemon "Yours" (or "New") sticker after the card name, tilted −4° (app D-44). Authored at UI scale. */
export function NameSticker({ word = "Yours", style }: { word?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-block",
        ...sans(700),
        fontSize: 12,
        lineHeight: "16px",
        padding: "2px 8px",
        borderRadius: 999,
        background: C.lemon,
        color: C.ink,
        border: `2px solid ${C.ink}`,
        transform: "rotate(-4deg)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {word}
    </span>
  );
}

/** A small static charm (the coin with its face) for ledger rows, `size` px across. */
export function LedgerCharm({ chain, size = 24, night = false }: { chain: Chain; size?: number; night?: boolean }) {
  // CharmShape is drawn about its pivot; the coin centre sits at y 108, radius 64 + outline 12/2
  return (
    <svg viewBox="-70 38 140 140" width={size} height={size} style={{ display: "block", flexShrink: 0 }} aria-hidden>
      <CharmShape fill={charmFill(chain)} showStem={false} outlineColor={night ? NIGHT.lineStrong : C.ink} />
    </svg>
  );
}

/**
 * The Satchel card, brand 2.0 as built in the app (D-44, 2026-10-26): white body, 3px outline, hard drop, coral band
 * with "Satchel #N" (Funnel Display 800), an optional lemon "Yours"/"New" sticker after the name and the white sticker S
 * on the right. The body is the CHARM LEDGER: one row per chain, led by its coin charm, the native amount in Funnel
 * Display 800 (tabular) and the ticker in Onest 600 ink-muted. No fiat, no "{n} chains". The state pill sits bottom-left.
 * Authored at 400 × 252 (1.586:1) and scaled by `width`.
 *   chips      the rows: { chain, amount } (amount omitted → "Bitcoin address" etc. as on the mint preview)
 *   preview    mint preview: band "New Satchel" + "New" sticker, rows show "{Chain} address"
 *   yours      the lemon "Yours" sticker (the viewer owns it)
 *   pill       state pill (active, signing, paused, sold, given, attention, sent)
 *   icons      "charm" (app default) | "dot" (use when the film's hanging charms are already on screen)
 *   night      Night theme: surface #1c1538, ink #f4f2ff, outline #8A82AE (ink vanishes on Night), drop #000
 *   total      legacy: a custom body (used only when `chips` is empty)
 */
export function SatchelCard({
  id = "7",
  width = 640,
  chips = [
    { chain: "btc", amount: "0.0412" },
    { chain: "evm", amount: "0.85" },
    { chain: "sol", amount: "12.4" },
  ],
  lift = 0,
  pill,
  name,
  yours = false,
  preview = false,
  icons = "charm",
  night = false,
  total,
  label,
  children,
  style,
}: {
  id?: string;
  width?: number;
  chips?: { chain: Chain; amount?: string }[];
  lift?: number;
  pill?: PillKind;
  name?: string;
  yours?: boolean;
  preview?: boolean;
  icons?: "charm" | "dot";
  night?: boolean;
  total?: ReactNode;
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const BW = 400;
  const BH = 252;
  const k = width / BW;
  const drop = DROP + 8 * lift;
  const outline = night ? NIGHT.lineStrong : C.ink;
  const shadow = night ? "#000000" : C.ink;
  const ink = night ? NIGHT.ink : C.ink;
  const muted = night ? NIGHT.inkMuted : C.inkMuted;
  const n = chips.length;
  const amountSize = n >= 3 ? 26 : 32;
  const tickerSize = n >= 3 ? 14 : 15;
  const iconSize = n >= 3 ? 24 : 28;
  const legacy = n === 0 && total !== undefined;
  return (
    <div style={{ width, height: BH * k, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: BW,
          height: BH,
          transform: `translateY(${-8 * lift * k}px) scale(${k})`,
          transformOrigin: "0 0",
          borderRadius: R.card,
          background: night ? NIGHT.surface : C.surface,
          border: `${OUTLINE}px solid ${outline}`,
          boxShadow: `0 ${drop}px 0 ${shadow}`,
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 66, background: C.brand, borderBottom: `${OUTLINE}px solid ${outline}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", boxSizing: "border-box", flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...display(800), fontSize: 22, letterSpacing: "-0.02em", color: C.ink }}>{name ?? (preview ? "New Satchel" : `Satchel #${id}`)}</span>
            {preview ? <NameSticker word="New" /> : yours ? <NameSticker /> : null}
          </span>
          <StickerS height={40} />
        </div>
        <div style={{ flex: 1, padding: "14px 20px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
          {legacy ? (
            <div>
              {label ? <div style={{ ...sans(500), fontSize: 13, color: muted }}>{label}</div> : null}
              <div style={{ ...display(800), fontSize: 40, lineHeight: "44px", letterSpacing: "-0.03em", color: ink, fontVariantNumeric: "tabular-nums" }}>{total}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: n >= 3 ? 2 : 6 }}>
              {chips.map((c) => (
                <div key={c.chain} style={{ display: "flex", alignItems: "center", gap: 10, height: amountSize + 6 }}>
                  {icons === "charm" ? <LedgerCharm chain={c.chain} size={iconSize} night={night} /> : <span style={{ width: 12, height: 12, borderRadius: 99, background: CHAIN[c.chain].color, border: `2px solid ${outline}`, flexShrink: 0, marginLeft: (iconSize - 16) / 2, marginRight: (iconSize - 16) / 2 }} />}
                  {preview || c.amount === undefined ? (
                    <span style={{ ...sans(600), fontSize: 15, color: ink }}>{CHAIN[c.chain].name} address</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ ...display(800), fontSize: amountSize, lineHeight: `${amountSize + 4}px`, letterSpacing: "-0.02em", color: c.amount === "0" ? muted : ink, fontVariantNumeric: "tabular-nums" }}>{c.amount}</span>
                      <span style={{ ...sans(600), fontSize: tickerSize, color: muted }}>{CHAIN[c.chain].ticker}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", minHeight: 0 }}>{pill ? <Pill kind={pill} k={1} /> : null}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
