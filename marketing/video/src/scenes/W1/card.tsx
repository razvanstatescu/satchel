// Satchel card variant for W1/W2 (copied from components/SatchelCard.tsx, extended for animation): the band name,
// pill and chip labels accept nodes so they can roll/count, and the mint-preview look (tickers only, stitched) is a mode.
import type { CSSProperties, ReactNode } from "react";
import { BRASS_GRADIENT, C, F, display, type Chain } from "../../brand/tokens";
import { BandPill, ChainDot, StitchRect, type CardStatus } from "../../components/SatchelCard";

export const CARD_BASE_W = 400;
export const CARD_BASE_H = 252;
export const cardH = (w: number) => (CARD_BASE_H * w) / CARD_BASE_W;

/** Two labels sharing one cell: `from` rolls up and out while `to` rolls in (p 0..1). */
export function Roll({ from, to, p, style }: { from: ReactNode; to: ReactNode; p: number; style?: CSSProperties }) {
  const t = Math.max(0, Math.min(1, p));
  if (t <= 0) return <span style={style}>{from}</span>;
  if (t >= 1) return <span style={style}>{to}</span>;
  return (
    <span style={{ display: "inline-grid", overflow: "hidden", verticalAlign: "bottom", ...style }}>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${-110 * t}%)`, opacity: 1 - t }}>{from}</span>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${110 * (1 - t)}%)`, opacity: t }}>{to}</span>
    </span>
  );
}

export function WalletCard({
  width,
  name,
  status = null,
  pillOpacity = 1,
  total = "3 chains",
  sub = "Balances below",
  chips,
  stitch = 0,
  strongStitch = false,
  body = C.cardBody1,
  style,
}: {
  width: number;
  name: ReactNode;
  status?: CardStatus | null;
  pillOpacity?: number;
  total?: ReactNode;
  sub?: ReactNode;
  chips: { chain: Chain; label: ReactNode }[];
  stitch?: number;
  /** Film-legible stitch (brand-bright at 75 %, 2 px) for the moments where the stitch itself is the message. */
  strongStitch?: boolean;
  body?: string;
  style?: CSSProperties;
}) {
  const k = width / CARD_BASE_W;
  return (
    <div style={{ width, height: CARD_BASE_H * k, position: "relative", ...style }}>
      <div
        style={{
          width: CARD_BASE_W,
          height: CARD_BASE_H,
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
          <span style={{ ...display(650, 20), fontSize: 20, lineHeight: "26px", color: C.onBrand, whiteSpace: "nowrap" }}>{name}</span>
          {status && pillOpacity > 0 ? (
            <span style={{ opacity: pillOpacity, transform: `translateX(${(1 - pillOpacity) * 8}px)` }}>
              <BandPill status={status} />
            </span>
          ) : null}
        </div>
        <div style={{ height: "72%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
          <div>
            <div style={{ ...display(700, 48), fontSize: 36, lineHeight: "40px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{total}</div>
            <div style={{ fontFamily: F.sans, fontSize: 12, lineHeight: "16px", color: C.inkMuted, marginTop: 2 }}>{sub}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chips.map((c) => (
              <span
                key={c.chain}
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
                <ChainDot chain={c.chain} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <StitchRect w={CARD_BASE_W} h={CARD_BASE_H} progress={stitch} {...(strongStitch ? { color: "rgba(235,203,122,0.75)", width: 2 } : {})} />
      </div>
    </div>
  );
}
