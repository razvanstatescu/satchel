/**
 * Pills, chain marks and the avatar — video ports of apps/web/src/components/ui.tsx.
 *
 * API (all pure; sizes = product px × k, default k = 2.25):
 *   <StatusPill status="active|signing|listed|sold|needs_attention|transferred|bought" k? pulse? />
 *       The NON-band pill (surface-raised, icon + word in the state colour). `pulse` (0..1) = opacity of the
 *       signing dot. For the pill on the card's brass band use BandPill from ../SatchelCard.
 *   <ItemPill status="spent|expired|unfunded|settling|unused|unknown|checking" from? progress? spin? k? />
 *       Clean-history item pill. Animate a change by passing `from` (the old status) and `progress` 0..1: the old
 *       word rolls up and out while the new one rolls in (both share one grid cell, so the pill never reflows).
 *       `spin` = LoaderCircle rotation in degrees for "checking" (drive it with frame * 12).
 *   <ChainMark chain="btc|evm|sol" size? />   the product's chain SVG marks on a surface-raised disc.
 *   <ChainDot chain size? />                 re-exported from ../SatchelCard.
 *   <Avatar account="bob.near" size? />    initial in a ringed disc (product sizes 20/32/40 → pass video px).
 */
import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, Clock, Handshake, Hourglass, Info, LoaderCircle, LockOpen, Tag, TriangleAlert, type LucideIcon } from "lucide-react";
import { C, F, type Chain } from "../../brand/tokens";
import { K, RADIUS, STROKE, clamp01, txt } from "./base";

export { ChainDot } from "../SatchelCard";

export type PillStatus = "active" | "signing" | "listed" | "sold" | "needs_attention" | "transferred" | "bought";

const PILL: Record<PillStatus, { word: string; Icon?: LucideIcon; color: string; iconColor?: string }> = {
  active: { word: "Active", Icon: LockOpen, color: C.success },
  signing: { word: "Signing", color: C.frozen },
  listed: { word: "Listed", Icon: Tag, color: C.brand, iconColor: C.brand },
  sold: { word: "Sold", Icon: Handshake, color: C.inkMuted },
  needs_attention: { word: "Needs attention", Icon: TriangleAlert, color: C.danger },
  transferred: { word: "Transferred", Icon: CircleCheck, color: C.success },
  bought: { word: "Bought", Icon: CircleCheck, color: C.success },
};

function pillShell(k: number, color: string, extra?: CSSProperties): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6 * k,
    background: C.surfaceRaised,
    borderRadius: RADIUS.pill,
    padding: `${5 * k}px ${11 * k}px`,
    fontFamily: F.sans,
    fontSize: 13 * k,
    lineHeight: `${18 * k}px`,
    fontWeight: 600,
    color,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function StatusPill({ status, k = K, pulse = 1, style }: { status: PillStatus; k?: number; pulse?: number; style?: CSSProperties }) {
  const p = PILL[status];
  return (
    <span style={pillShell(k, p.color, style)}>
      {p.Icon ? (
        <p.Icon size={14 * k} strokeWidth={STROKE} color={p.iconColor ?? p.color} />
      ) : (
        <span style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: C.frozen, opacity: pulse, display: "inline-block" }} />
      )}
      {p.word}
    </span>
  );
}

export type ItemStatus = "spent" | "expired" | "unfunded" | "settling" | "unused" | "unknown" | "checking";

export const ITEM: Record<ItemStatus, { word: string; Icon: LucideIcon; color: string }> = {
  spent: { word: "Settled", Icon: CircleCheck, color: C.success },
  expired: { word: "Expired", Icon: Clock, color: C.success },
  unfunded: { word: "Unfunded", Icon: Info, color: C.inkMuted },
  settling: { word: "Settling", Icon: Hourglass, color: C.frozen },
  unused: { word: "Unused", Icon: TriangleAlert, color: C.danger },
  unknown: { word: "Can't verify", Icon: TriangleAlert, color: C.inkMuted },
  checking: { word: "Checking…", Icon: LoaderCircle, color: C.inkMuted },
};

function ItemFace({ status, k, spin }: { status: ItemStatus; k: number; spin: number }) {
  const p = ITEM[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 * k, color: p.color }}>
      <span style={{ display: "inline-flex", transform: status === "checking" ? `rotate(${spin}deg)` : undefined }}>
        <p.Icon size={14 * k} strokeWidth={STROKE} />
      </span>
      {p.word}
    </span>
  );
}

export function ItemPill({ status, from, progress = 1, spin = 0, k = K, style }: { status: ItemStatus; from?: ItemStatus; progress?: number; spin?: number; k?: number; style?: CSSProperties }) {
  const t = clamp01(progress);
  const showFrom = from && t < 1;
  return (
    <span style={pillShell(k, ITEM[status].color, { display: "inline-grid", overflow: "hidden", ...style })}>
      {showFrom ? (
        <span style={{ gridArea: "1 / 1", transform: `translateY(${-130 * t}%)`, opacity: 1 - t }}>
          <ItemFace status={from} k={k} spin={spin} />
        </span>
      ) : null}
      <span style={{ gridArea: "1 / 1", transform: showFrom ? `translateY(${130 * (1 - t)}%)` : undefined, opacity: showFrom ? t : 1 }}>
        <ItemFace status={status} k={k} spin={spin} />
      </span>
    </span>
  );
}

const CHAIN_COLOR: Record<Chain, string> = { btc: C.btc, evm: C.evm, sol: C.sol };

/** Chain marks: small SVGs in the chain colour (never Lucide; never the logo). Verbatim paths from ui.tsx. */
export function ChainMark({ chain, size = 32 * K, disc = true }: { chain: Chain; size?: number; disc?: boolean }) {
  const color = CHAIN_COLOR[chain];
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 999,
        background: disc ? C.surfaceRaised : "transparent",
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {chain === "btc" && <path d="M8 5v14M8 5h5.5a3 3 0 0 1 0 6H8m0 0h6.5a3.5 3.5 0 0 1 0 7H8M10 3v2m3-2v2m-3 14v2m3-2v2" />}
        {chain === "evm" && <path d="M12 2.5 5.5 12 12 15.8 18.5 12 12 2.5Zm-6.5 11L12 21.5l6.5-8L12 17.3l-6.5-3.8Z" />}
        {chain === "sol" && <path d="M6.5 6.5h13l-2 2.5h-13zM4.5 10.75h13l2 2.5h-13zM6.5 15h13l-2 2.5h-13z" />}
      </svg>
    </span>
  );
}

export function Avatar({ account, size = 40 * K, style }: { account: string; size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 999,
        background: C.surfaceRaised,
        boxShadow: `0 0 0 ${Math.max(1, size / 40)}px ${C.lineStrong}`,
        fontFamily: F.display,
        fontWeight: 600,
        fontSize: size * 0.45,
        color: C.ink,
        ...style,
      }}
    >
      {account.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Neutral chip (ui.tsx Chip): surface-raised, body-sm, ink-muted. */
export function Chip({ children, k = K }: { children: ReactNode; k?: number }) {
  return (
    <span style={{ ...txt("bodySm", k), display: "inline-flex", alignItems: "center", gap: 6 * k, borderRadius: RADIUS.sm * k, background: C.surfaceRaised, padding: `${4 * k}px ${8 * k}px`, color: C.inkMuted }}>
      {children}
    </span>
  );
}
