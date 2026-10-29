import type { ReactNode } from "react";
import { CircleCheck, Tag, Undo2 } from "lucide-react";
import { C, display, sans } from "../../brand/tokens";
import { AppPill, FlowSheet, FootNote, holdingsSentence } from "./app";
import { ACCOUNTS, AMOUNTS, type Balances, PRICE } from "./data";
import { NUM, popScale, STROKE, UiButton } from "./kit";

/**
 * ListSheet (T4): the app's "Sell Satchel #7" sheet (C/sell-ready, sell-wallet). Title with the card swatch, "Holds
 * 0.0412 BTC, 0.85 ETH and 12.4 SOL", "Before you list" (Quiet period ✓, Past signatures ✓), Price with the NEAR |
 * USDC switch (USDC picked), the price field "4,750.00 USDC" + "Buyer gets …", the fee rows, "You receive", and
 * "List for 4,750.00 USDC" pinned. No countdown anywhere.
 * state "ready" | "pressed" | "wallet" ("Approve in your wallet…") | "listing" ("Listing…") | "listed" (the
 * "Paused for sale" pill + "For sale at 4,750.00 USDC · Listing #7" + Stop selling; the owner's Sell tab shows the
 * same panel: SatchelScreen tab="sell" listed).
 * press / spin / price / priceReveal / caret / pausedPop / open as before; scroll (body px); `backdrop` renders it as
 * a whole screen, otherwise it is an overlay (scrim + sheet). Layout boxes: LIST_LAYOUT in ./layout.
 */

export type ListState = "ready" | "pressed" | "wallet" | "listing" | "listed";

export interface ListSheetProps {
  open?: number;
  state?: ListState;
  press?: number;
  spin?: number;
  price?: string;
  priceReveal?: number;
  caret?: number;
  pausedPop?: number;
  balances?: Balances;
  id?: string;
  scroll?: number;
  backdrop?: ReactNode;
  statusBar?: boolean;
  insetTop?: number;
  insetBottom?: number;
}

export function ListSheet({
  open = 1,
  state = "ready",
  press,
  spin = 0,
  price = PRICE,
  priceReveal = 1,
  caret = 0,
  pausedPop,
  balances = AMOUNTS.after,
  id = "7",
  scroll = 0,
  backdrop,
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
}: ListSheetProps) {
  const [num, cur] = [price.replace(/\s*[A-Z]+$/, ""), price.match(/[A-Z]+$/)?.[0] ?? "USDC"];
  const busy = state === "wallet" || state === "listing";
  const p = press ?? (state === "pressed" ? 1 : 0);
  const listed = state === "listed";
  const typedNum = num.slice(0, Math.round(Math.max(0, Math.min(1, priceReveal)) * num.length));
  const chrome = { statusBar, insetTop, insetBottom };

  const footer = listed ? undefined : (
    <>
      <span data-ui="button" style={{ display: "block" }}>
        <UiButton block label={state === "wallet" ? "Approve in your wallet…" : state === "listing" ? "Listing…" : `List for ${num} ${cur}`} busy={busy} spin={spin} press={busy ? 0 : p} />
      </span>
      {state === "wallet" ? <FootNote style={{ marginTop: 10 }}>Check your NEAR wallet.</FootNote> : null}
    </>
  );

  return (
    <FlowSheet {...chrome} bare={!backdrop} backdrop={backdrop} title={`Sell Satchel #${id}`} swatch sub={`Holds ${holdingsSentence(balances)}`} open={open} footer={footer} bodyScroll={scroll} bodyGap={18}>
      {listed ? (
        <>
          <span style={{ display: "inline-block", transformOrigin: "0 50%", transform: pausedPop === undefined ? undefined : `scale(${popScale(pausedPop)})` }}>
            <AppPill status="paused" />
          </span>
          <div data-ui="listing" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: "20px 20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tag size={20} strokeWidth={STROKE} color={C.frozen} />
              <span style={{ ...display(700), fontSize: 20, lineHeight: "26px" }}>
                For sale at {num} {cur} · Listing #7
              </span>
            </div>
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "21px", marginTop: 10 }}>Stopping is instant: nobody can buy it after that, and you can send and give again.</div>
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "21px", color: C.inkMuted, marginTop: 10 }}>To change the price, stop selling and list it again.</div>
            <div style={{ marginTop: 16 }}>
              <UiButton label="Stop selling" icon={Undo2} kind="secondary" style={{ minWidth: 240 }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px" }}>Before you list</div>
            <div data-ui="checks" style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "0 16px" }}>
              <Check title="Quiet period" sub="No signature in the last 250 blocks" />
              <Check title="Past signatures" sub="All 3 can no longer move coins" divider />
            </div>
          </div>
          <div>
            <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px" }}>Price</div>
            <div style={{ marginTop: 10, display: "inline-flex", padding: 4, gap: 4, borderRadius: 999, background: C.sunken }}>
              {["NEAR", "USDC"].map((c) => (
                <span key={c} style={{ padding: "8px 12px", borderRadius: 999, background: c === cur ? C.ink : "transparent", color: c === cur ? C.white : C.inkMuted, ...sans(650), fontSize: 14 }}>
                  {c}
                </span>
              ))}
            </div>
            <div data-ui="price" style={{ marginTop: 12, borderRadius: 16, border: `2px solid ${C.ink}`, boxShadow: "inset 0 0 0 2px #ffffff", background: C.sunken, padding: "14px 16px 14px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ ...display(800), fontSize: 34, lineHeight: "40px", letterSpacing: "-0.03em", color: typedNum ? C.ink : C.inkMuted, ...NUM }}>{typedNum || "0"}</span>
                {caret > 0 ? <span style={{ width: 2, height: 30, background: C.ink, opacity: caret, marginLeft: 2 }} /> : null}
                <span style={{ marginLeft: "auto", ...sans(600), fontSize: 15, color: C.inkMuted }}>{cur}</span>
              </div>
              <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 6 }}>Buyer gets {holdingsSentence(balances)}.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <KV k="Price" v={`${num} ${cur}`} />
            <KV k="Satchel fee" v="none" />
            <KV k="Listing deposit" v="0.01 NEAR" sub="unused part refunded" />
            <KV k="You receive" v={`${num} ${cur}`} strong />
            <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted }}>Paid to {ACCOUNTS.alice} in the same transaction as the sale.</div>
          </div>
        </>
      )}
    </FlowSheet>
  );
}

function Check({ title, sub, divider = false }: { title: string; sub: string; divider?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 0", borderTop: divider ? `1px solid ${C.line}` : undefined }}>
      <CircleCheck size={20} strokeWidth={STROKE} color={C.success} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ ...sans(500), fontSize: 16, lineHeight: "22px" }}>{title}</div>
        <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted }}>{sub}</div>
      </div>
    </div>
  );
}

function KV({ k, v, sub, strong = false }: { k: string; v: string; sub?: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...sans(strong ? 650 : 400), fontSize: 15, lineHeight: "21px" }}>
      <span style={{ color: strong ? C.ink : C.inkMuted }}>{k}</span>
      <span style={{ textAlign: "right", ...NUM }}>
        {v}
        {sub ? <span style={{ display: "block", ...sans(400), fontSize: 13, lineHeight: "18px", color: C.inkMuted }}>{sub}</span> : null}
      </span>
    </div>
  );
}
