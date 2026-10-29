import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, Handshake, LoaderCircle, ShieldCheck } from "lucide-react";
import { C, F, display } from "../../brand/tokens";

/** Video-scale ports of the product's small UI pieces (apps/web/src/components/ui.tsx, Clean.tsx), local to S08. */

export function Avatar({ account, size = 76 }: { account: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: C.surfaceRaised,
        boxShadow: `0 0 0 ${Math.max(1, size / 32)}px ${C.lineStrong}`,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        ...display(600, 48),
        fontSize: size * 0.45,
        color: C.ink,
      }}
    >
      {account.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** GateLine, clean state: shield-check + "Clean history · checked {t}" in success. */
export function GateLine({ t, size = 56 }: { t: string; size?: number }) {
  return (
    <p style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32, margin: 0, color: C.success, fontFamily: F.sans, fontWeight: 500, fontSize: size, lineHeight: 1.1 }}>
      <ShieldCheck size={size * 1.05} strokeWidth={1.75} />
      Clean history · checked {t}
    </p>
  );
}

/** The product's primary block button (btn-primary btn-block), scaled. */
export function BuyButton({
  label,
  width,
  height,
  pressed = 0,
  sheen = -1,
  spinner,
  style,
}: {
  label: ReactNode;
  width: number;
  height: number;
  pressed?: number; // 0..1
  sheen?: number; // -1 (off) .. 0..1 position of the light band
  spinner?: number; // rotation in degrees when busy
  style?: CSSProperties;
}) {
  const bg = mix(C.brand, "#b7913f", pressed);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 24,
        background: bg,
        color: C.onBrand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: height * 0.42,
        position: "relative",
        overflow: "hidden",
        transform: `scale(${1 - 0.025 * pressed})`,
        boxShadow: `inset 0 2px 0 rgba(255,240,200,${0.35 - 0.25 * pressed}), 0 ${20 - 12 * pressed}px ${50 - 20 * pressed}px rgba(0,0,0,0.45)`,
        ...style,
      }}
    >
      {spinner !== undefined ? <LoaderCircle size={height * 0.42} strokeWidth={2} style={{ transform: `rotate(${spinner}deg)` }} /> : null}
      <span style={{ position: "relative" }}>{label}</span>
      {sheen >= 0 && sheen <= 1 ? (
        <div
          style={{
            position: "absolute",
            top: -height,
            bottom: -height,
            width: width * 0.22,
            left: -width * 0.3 + sheen * width * 1.4,
            transform: "rotate(18deg)",
            background: "linear-gradient(90deg, rgba(255,246,220,0) 0%, rgba(255,246,220,0.45) 50%, rgba(255,246,220,0) 100%)",
          }}
        />
      ) : null}
    </div>
  );
}

const PILLS = {
  bought: { word: "Bought", color: C.success, Icon: CircleCheck },
  sold: { word: "Sold", color: C.inkMuted, Icon: Handshake },
} as const;

/** StatusPill (non-band variant): surface-raised capsule, icon + word in the state colour. */
export function StatusPill({ status, scale = 3 }: { status: keyof typeof PILLS; scale?: number }) {
  const p = PILLS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * scale,
        background: C.surfaceRaised,
        borderRadius: 999,
        padding: `${5 * scale}px ${11 * scale}px`,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: 13 * scale,
        lineHeight: `${18 * scale}px`,
        color: p.color,
        whiteSpace: "nowrap",
      }}
    >
      <p.Icon size={14 * scale} strokeWidth={1.75} />
      {p.word}
    </span>
  );
}

/** A plain arrow pointer (ink, dark outline). */
export function Cursor({ size = 56, press = 0 }: { size?: number; press?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${1 - 0.12 * press})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
      <path d="M4 3 L4 19 L8.6 14.9 L11.6 21.2 L14.4 19.9 L11.5 13.7 L17.6 13.4 Z" fill={C.ink} stroke={C.ground} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

/** Mix two #rrggbb colours. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Masked line reveal (T07): text rises into a clip, with a small blur settle. `p` 0..1. */
export function MaskUp({ p, children, style }: { p: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.12em", marginBottom: "-0.12em", ...style }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)`, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>{children}</span>
    </span>
  );
}
