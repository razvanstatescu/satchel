/**
 * Banner + FreezeBanner — video ports of ui.tsx Banner and the freeze banner in client/SatchelPage.tsx.
 *
 * API (pure; sizes = product px × k, default k = 2.25):
 *   <Banner icon={LucideIcon} tone="success|frozen|danger|neutral|brand" title body? action? width? k? sweep? />
 *       Product anatomy: surface-raised panel (radius md), 20 px icon + label title in the state colour, body in ink.
 *       No tints. `sweep` (0..1, optional) runs a soft highlight band across the panel in the tone colour.
 *   <FreezeBanner viewer="buyer|owner" tokenId="1" width? k? sweep? iconTurn? />
 *       Snowflake + "Signing paused while listed" (frozen) + the product's buyer/owner body copy.
 *       `iconTurn` rotates the snowflake (degrees) for a frost-in moment; `sweep` = frozen sheen 0..1.
 */
import type { CSSProperties, ReactNode } from "react";
import { Snowflake, type LucideIcon } from "lucide-react";
import { C } from "../../brand/tokens";
import { K, RADIUS, STROKE, TONE, txt } from "./base";

export const FREEZE_COPY = {
  title: "Signing paused while listed",
  buyer: "The seller can't sign anything new, so the history below is final for this listing.",
  owner: (id: string) => `No coins can leave Satchel #${id} until you delist it or it sells. Anyone can still fund it.`,
} as const;

function Sweep({ p, color }: { p: number; color: string }) {
  if (p <= 0 || p >= 1) return null;
  const x = -40 + 180 * p; // band centre in % of width
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(105deg, transparent ${x - 22}%, ${color}33 ${x - 6}%, ${color}66 ${x}%, ${color}33 ${x + 6}%, transparent ${x + 22}%)`,
        mixBlendMode: "screen",
      }}
    />
  );
}

export function Banner({
  icon: I,
  tone,
  title,
  children,
  action,
  width,
  k = K,
  sweep = 0,
  iconTurn = 0,
  style,
}: {
  icon: LucideIcon;
  tone: "success" | "frozen" | "danger" | "neutral" | "brand";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  width?: number;
  k?: number;
  sweep?: number;
  iconTurn?: number;
  style?: CSSProperties;
}) {
  const color = TONE[tone];
  return (
    <section style={{ position: "relative", overflow: "hidden", width, borderRadius: RADIUS.md * k, background: C.surfaceRaised, padding: 16 * k, boxSizing: "border-box", ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 * k, color }}>
        <span style={{ display: "inline-flex", marginTop: 1 * k, flexShrink: 0, transform: iconTurn ? `rotate(${iconTurn}deg)` : undefined }}>
          <I size={20 * k} strokeWidth={STROKE} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...txt("label", k), color }}>{title}</div>
          {children ? <div style={{ ...txt("body", k), marginTop: 4 * k, color: C.ink }}>{children}</div> : null}
          {action ? <div style={{ marginTop: 12 * k }}>{action}</div> : null}
        </div>
      </div>
      <Sweep p={sweep} color={color} />
    </section>
  );
}

export function FreezeBanner({
  viewer = "buyer",
  tokenId = "1",
  width,
  k = K,
  sweep = 0,
  iconTurn = 0,
  body = true,
  style,
}: {
  viewer?: "buyer" | "owner";
  tokenId?: string;
  width?: number;
  k?: number;
  sweep?: number;
  iconTurn?: number;
  /** false = title only */
  body?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Banner icon={Snowflake} tone="frozen" title={FREEZE_COPY.title} width={width} k={k} sweep={sweep} iconTurn={iconTurn} style={style}>
      {body ? (viewer === "buyer" ? FREEZE_COPY.buyer : FREEZE_COPY.owner(tokenId)) : null}
    </Banner>
  );
}
