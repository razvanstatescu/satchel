import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, CircleX, Coins, Hash } from "lucide-react";
import { C, F, display } from "../../brand/tokens";
import { ChainMark, STROKE, mixColor } from "../../components/product";

/** A signing request as a card: what someone asks Satchel's contract to sign. */
export type RequestKind = "hash" | "approval" | "send";

export const REQUEST: Record<RequestKind, { title: string; sub: string; icon: ReactNode }> = {
  hash: { title: "Raw hash", sub: "0x9f3a7c1d…5be2c41e", icon: <Hash size={38} strokeWidth={STROKE} color={C.inkMuted} /> },
  approval: { title: "Token approval", sub: "approve(spender, unlimited)", icon: <Coins size={38} strokeWidth={STROKE} color={C.inkMuted} /> },
  send: { title: "Send 0.0100 ETH", sub: "to 0x53f9…1C2A", icon: <ChainMark chain="evm" size={64} disc={false} /> },
};

export const CARD_W = 840;
export const CARD_H = 162;

/**
 * `verdict` "refused": the border and icon turn danger, " · refused" is revealed after the title (p = 0..1).
 * `verdict` "plain": the border turns success and a check pops in on the right.
 */
export function RequestCard({ kind, verdict = "none", p = 0, flash = 0, style }: { kind: RequestKind; verdict?: "none" | "refused" | "plain"; p?: number; flash?: number; style?: CSSProperties }) {
  const r = REQUEST[kind];
  const tone = verdict === "refused" ? C.danger : verdict === "plain" ? C.success : C.line;
  const border = verdict === "none" ? C.line : mixColor(C.line, tone, Math.min(1, p * 1.6));
  return (
    <div
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "0 30px 0 28px",
        borderRadius: 28,
        background: C.surface,
        border: `2px solid ${border}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        overflow: "hidden",
        ...style,
      }}
    >
      {flash > 0 ? <span style={{ position: "absolute", inset: 0, background: tone, opacity: 0.16 * flash }} /> : null}
      <span style={{ position: "relative", width: 82, height: 82, borderRadius: 22, background: C.surfaceRaised, display: "grid", placeItems: "center", flexShrink: 0 }}>
        {verdict === "refused" && p > 0.05 ? (
          <span style={{ display: "inline-flex", transform: `scale(${0.6 + 0.4 * Math.min(1, p * 2)})` }}>
            <CircleX size={44} strokeWidth={STROKE} color={C.danger} />
          </span>
        ) : (
          r.icon
        )}
      </span>
      <div style={{ position: "relative", minWidth: 0, flex: 1 }}>
        <div style={{ ...display(650, 72), fontSize: 56, lineHeight: "64px", letterSpacing: "-0.015em", color: C.ink, whiteSpace: "nowrap" }}>
          {r.title}
          {verdict === "refused" ? (
            <span style={{ display: "inline-block", color: C.danger, clipPath: `inset(-10% ${100 - Math.min(1, p * 1.4) * 100}% -10% 0)` }}>&nbsp;· refused</span>
          ) : null}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 30, lineHeight: "38px", color: C.inkMuted, whiteSpace: "nowrap", fontFeatureSettings: '"zero" 1' }}>{r.sub}</div>
      </div>
      {verdict === "plain" && p > 0.02 ? (
        <span style={{ position: "relative", display: "inline-flex", transform: `scale(${0.5 + 0.5 * Math.min(1, p * 1.5)})`, opacity: Math.min(1, p * 2) }}>
          <CircleCheck size={58} strokeWidth={STROKE} color={C.success} />
        </span>
      ) : null}
    </div>
  );
}
