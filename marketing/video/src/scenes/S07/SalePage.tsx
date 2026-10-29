import type { ReactNode } from "react";
import { display } from "../../brand/tokens";
import { BuyBlock, BuyButton, CleanHistoryPanel, CleanVerdict, FreezeBanner, GateLine, Swatch, type Aggregate } from "../../components/product";

export const PK = 2.1; // product scale for the sale page beats (keeps body-sm ≈ 27–28 px)
export const PANEL = { x: 120, w: 1040 };
export const RIGHT = { x: 1200, w: 600 };

/**
 * The buyer's sale page, rebuilt for video: Clean history report on the left, the buy block (+ freeze banner) on
 * the right. Pure: the beat passes every animated value.
 */
export function SalePage({
  top,
  tokenId,
  body,
  price,
  verdict,
  verdictTitle,
  verdictPop,
  count,
  spin,
  trustIn,
  rows,
  gate,
  gateText,
  lit,
  sheen,
  buyNudge = 0,
  panelShake = { x: 0, y: 0 },
}: {
  top: number;
  tokenId: string;
  body: string;
  price: string;
  verdict: Aggregate;
  verdictTitle?: string;
  verdictPop: number;
  count: number;
  spin: number;
  trustIn: number;
  rows: ReactNode;
  gate: Aggregate;
  gateText?: string;
  lit: number;
  sheen: number;
  buyNudge?: number;
  panelShake?: { x: number; y: number };
}) {
  return (
    <>
      <div style={{ position: "absolute", left: PANEL.x, top, width: PANEL.w, transform: `translate(${panelShake.x}px, ${panelShake.y}px)` }}>
        <CleanHistoryPanel k={PK} width={PANEL.w} style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
          <CleanVerdict status={verdict} title={verdictTitle} k={PK} spin={spin} iconPop={verdictPop} count={count} minLines={2} trustIn={trustIn} />
          <div style={{ marginTop: 14 * PK }}>{rows}</div>
        </CleanHistoryPanel>
      </div>
      <div style={{ position: "absolute", left: RIGHT.x, top, width: RIGHT.w }}>
        <BuyBlock
          k={PK}
          width={RIGHT.w}
          price={price}
          header={
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Swatch width={72} body={body} />
              <span style={{ ...display(650, 48), fontSize: 44, letterSpacing: "-0.01em" }}>Satchel #{tokenId}</span>
            </div>
          }
          gate={<GateLine k={PK} status={gate} text={gateText} spin={spin} />}
          button={
            <div style={{ transform: `translateX(${buyNudge}px)` }}>
              <BuyButton k={PK} label={`Buy for ${price}`} lit={lit} sheen={sheen} />
            </div>
          }
          style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
        />
        <div style={{ marginTop: 28 }}>
          <FreezeBanner k={PK} width={RIGHT.w} body={false} />
        </div>
      </div>
    </>
  );
}
