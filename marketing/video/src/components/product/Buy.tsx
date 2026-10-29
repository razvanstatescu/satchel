/**
 * Buy button + Buy block — video ports of the .btn-primary button and BuySection in client/SaleTab.tsx.
 *
 * API (pure; sizes = product px × k, default k = 2.25):
 *   <BuyButton label="Buy for 5.00 USDC" lit={0..1} sheen? press? width? k? block? />
 *       Brass primary button. `lit` 0 = the product's disabled state (aria-disabled → opacity 0.4), 1 = enabled.
 *       `sheen` 0..1 sweeps one soft highlight across the brass (use once, when it unlocks). `press` 0..1 = pressed
 *       (brand-pressed colour + scale 0.98). `block` = full width (.btn-block sizes, the Buy button's).
 *   <BuyBlock tokenId price listing? gate={<GateLine …/>} button={<BuyButton …/>} width? k? header? />
 *       The buy section: "Buy for" label, price (display), listing line, gate line, button, "Paid in …".
 */
import type { CSSProperties, ReactNode } from "react";
import { C, F, display } from "../../brand/tokens";
import { K, RADIUS, clamp01, mix, txt } from "./base";

const BRAND_PRESSED = "#b8923f";

export function BuyButton({
  label,
  lit = 1,
  sheen = 0,
  press = 0,
  width,
  k = K,
  block = true,
  style,
}: {
  label: ReactNode;
  lit?: number;
  sheen?: number;
  press?: number;
  width?: number;
  k?: number;
  block?: boolean;
  style?: CSSProperties;
}) {
  const l = clamp01(lit);
  const s = clamp01(sheen);
  const x = -30 + 160 * s;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        width: block ? (width ?? "100%") : width,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: (block ? 48 : 44) * k,
        padding: block ? `${14 * k}px ${18 * k}px` : `${12 * k}px ${18 * k}px`,
        borderRadius: RADIUS.md * k,
        background: press > 0 ? BRAND_PRESSED : C.brand,
        color: C.onBrand,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: (block ? 15 : 14) * k,
        lineHeight: `${18 * k}px`,
        opacity: mix(0.4, 1, l),
        transform: `scale(${1 - 0.02 * clamp01(press)})`,
        ...style,
      }}
    >
      {label}
      {s > 0 && s < 1 ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent ${x - 14}%, rgba(255,244,214,0.55) ${x}%, transparent ${x + 14}%)`,
            mixBlendMode: "soft-light",
          }}
        />
      ) : null}
    </div>
  );
}

export function BuyBlock({
  price,
  listing,
  gate,
  button,
  paidIn,
  header,
  width,
  k = K,
  style,
}: {
  price: string;
  listing?: string;
  gate?: ReactNode;
  button?: ReactNode;
  paidIn?: string;
  /** optional row above "Buy for" (e.g. a swatch + "Satchel #3") */
  header?: ReactNode;
  width?: number;
  k?: number;
  style?: CSSProperties;
}) {
  return (
    <section style={{ width, boxSizing: "border-box", borderRadius: RADIUS.md * k, background: C.surface, padding: 16 * k, color: C.ink, ...style }}>
      {header ? <div style={{ marginBottom: 12 * k }}>{header}</div> : null}
      <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: 0 }}>Buy for</p>
      <p style={{ ...display(650, 48), fontSize: 24 * k, lineHeight: `${28 * k}px`, letterSpacing: "-0.01em", margin: 0, fontVariantNumeric: "tabular-nums" }}>{price}</p>
      {listing ? <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: 0 }}>{listing}</p> : null}
      {gate ? <div style={{ marginTop: 12 * k }}>{gate}</div> : null}
      {button ? <div style={{ marginTop: 12 * k }}>{button}</div> : null}
      {paidIn ? <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: `${12 * k}px 0 0` }}>{paidIn}</p> : null}
    </section>
  );
}

/** The product's Swatch (a tiny Satchel: leather body + brass top band), for headers and lists. */
export function Swatch({ width = 40 * K, body = C.cardBody1, style }: { width?: number; body?: string; style?: CSSProperties }) {
  return (
    <span style={{ position: "relative", display: "inline-block", flexShrink: 0, overflow: "hidden", width, height: width / 1.6, borderRadius: width / 10, background: body, boxShadow: `inset 0 0 0 1px ${C.lineStrong}`, verticalAlign: "middle", ...style }}>
      <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: "28%", background: `linear-gradient(135deg, ${C.brandBright}, ${C.brand} 55%, ${C.brandDeep})` }} />
    </span>
  );
}
