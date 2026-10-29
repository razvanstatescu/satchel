import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, Handshake, LockOpen, Tag, TriangleAlert } from "lucide-react";
import { BRASS_GRADIENT, C, CHAIN, F, display, type Chain } from "../brand/tokens";

/**
 * Video port of apps/web/src/components/SatchelCard.tsx (kb/80 R3 §SatchelCard): brass band (name + status pill)
 * over a leather body ("{n} chains" + native chain chips). Authored at the product's 400 × 252 size and scaled.
 * The saddle stitch appears only on an owned card; `stitch` (0..1) sews it in, the brand's signature moment.
 */

export type CardStatus = "active" | "signing" | "listed" | "sold" | "needs_attention" | "transferred" | "bought";

const PILL: Record<CardStatus, { word: string; color: string; Icon?: typeof LockOpen }> = {
  active: { word: "Active", color: C.success, Icon: LockOpen },
  signing: { word: "Signing", color: C.frozen },
  listed: { word: "Listed", color: C.brand, Icon: Tag },
  sold: { word: "Sold", color: C.inkMuted, Icon: Handshake },
  needs_attention: { word: "Needs attention", color: C.danger, Icon: TriangleAlert },
  transferred: { word: "Transferred", color: C.success, Icon: CircleCheck },
  bought: { word: "Bought", color: C.success, Icon: CircleCheck },
};

export function BandPill({ status, pulse = 1 }: { status: CardStatus; pulse?: number }) {
  const p = PILL[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: C.bandPill,
        borderRadius: 999,
        padding: "4px 10px",
        fontFamily: F.sans,
        fontSize: 12,
        lineHeight: "16px",
        fontWeight: 600,
        color: C.brandBright,
        whiteSpace: "nowrap",
      }}
    >
      {p.Icon ? (
        <p.Icon size={12} strokeWidth={1.75} color={p.color} />
      ) : (
        <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, opacity: pulse }} />
      )}
      {p.word}
    </span>
  );
}

export function ChainDot({ chain, size = 8 }: { chain: Chain; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: CHAIN[chain].color, display: "inline-block", flexShrink: 0 }} />;
}

export function CardChip({ chain, amount }: { chain: Chain; amount?: string | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 8,
        background: C.surfaceRaised,
        padding: "5px 9px",
        fontFamily: F.sans,
        fontSize: 12,
        lineHeight: "16px",
        color: C.ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      <ChainDot chain={chain} />
      {CHAIN[chain].ticker}
      {amount === undefined ? null : ` ${amount ?? "—"}`}
    </span>
  );
}

/** The stitch: inset 8, radius 14, 1.5 px, dash 6 5, brass at 45 %. `progress` sews it in clockwise from top-left. */
export function StitchRect({ w, h, progress = 1, color = C.stitch, inset = 8, radius = 14, width = 1.5 }: { w: number; h: number; progress?: number; color?: string; inset?: number; radius?: number; width?: number }) {
  if (progress <= 0) return null;
  const maskId = `st-${w}-${h}-${Math.round(progress * 1000)}`;
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-10} y={-10} width={w + 20} height={h + 20}>
          <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} rx={radius} fill="none" stroke="#fff" strokeWidth={8} pathLength={1} strokeDasharray={`${progress} 1`} />
        </mask>
      </defs>
      <rect
        x={inset}
        y={inset}
        width={w - inset * 2}
        height={h - inset * 2}
        rx={radius}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray="6 5"
        strokeLinecap="round"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export function SatchelCard({
  tokenId = "1",
  width = 400,
  status = "active",
  chips = [
    { chain: "btc", amount: "0.0123" },
    { chain: "evm", amount: "0.0500" },
    { chain: "sol", amount: "1.2500" },
  ],
  stitch = 0,
  body = C.cardBody1,
  name,
  total,
  sub = "Balances below",
  pillPulse = 1,
  style,
  children,
}: {
  tokenId?: string;
  width?: number;
  status?: CardStatus | null;
  chips?: { chain: Chain; amount?: string | null }[];
  stitch?: number;
  body?: string;
  name?: string;
  total?: ReactNode;
  sub?: string;
  pillPulse?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const BW = 400;
  const BH = 252;
  const k = width / BW;
  return (
    <div style={{ width, height: BH * k, position: "relative", ...style }}>
      <div
        style={{
          width: BW,
          height: BH,
          transform: `scale(${k})`,
          transformOrigin: "0 0",
          position: "absolute",
          left: 0,
          top: 0,
          borderRadius: 22,
          overflow: "hidden",
          background: body,
          boxShadow: "inset 0 1px 0 rgba(235, 203, 122, 0.10), 0 18px 40px rgba(0, 0, 0, 0.45)",
          color: C.ink,
        }}
      >
        <div style={{ height: "28%", background: BRASS_GRADIENT, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <span style={{ ...display(650, 20), fontSize: 20, lineHeight: "26px", color: C.onBrand }}>{name ?? `Satchel #${tokenId}`}</span>
          {status ? <BandPill status={status} pulse={pillPulse} /> : null}
        </div>
        <div style={{ height: "72%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
          <div>
            <div style={{ ...display(700, 48), fontSize: 36, lineHeight: "40px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {total ?? `${chips.length} chains`}
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 12, lineHeight: "16px", color: C.inkMuted, marginTop: 2 }}>{sub}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chips.map((c) => (
              <CardChip key={c.chain} chain={c.chain} amount={c.amount} />
            ))}
          </div>
        </div>
        <StitchRect w={BW} h={BH} progress={stitch} />
        {children}
      </div>
    </div>
  );
}
