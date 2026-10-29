import { Check, Snowflake } from "lucide-react";
import { C, display, sans } from "../../brand/tokens";
import { AMOUNTS, type Balances, holdings, PRICE } from "./data";
import { NUM, PausedBanner, Sheet, StatusPill, TY, UiButton } from "./kit";

/**
 * ListSheet (T4): "Sell Satchel #7" over the Satchel page. "Ready to list ✓", the price field "4,750.00 USDC", what the
 * buyer gets and what the seller receives, then the coral "List for sale". Once listed: the "Paused for sale" pill
 * and banner. There is no countdown and no "safe to buy in …" anywhere (no post-listing wait, kb/90 §5.7).
 *
 * state        "ready" | "pressed" | "wallet" ("Approve in your wallet…") | "listing" ("Listing…") | "listed"
 * press        0..1 overrides the button press       spin  turns the in-button spinner
 * priceReveal  0..1 types the price in ("4,750.00")  caret 0..1 the price caret
 * open         0..1 slides the sheet up (full bleed over its parent)
 * pausedPop    0..1 pops the "Paused for sale" pill in on the listed state
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
  insetBottom?: number;
}

export function ListSheet({ open = 1, state = "ready", press, spin = 0, price = PRICE, priceReveal = 1, caret = 0, pausedPop, balances = AMOUNTS.after, id = "7", insetBottom = 34 }: ListSheetProps) {
  const [num, cur] = [price.replace(/\s*[A-Z]+$/, ""), price.match(/[A-Z]+$/)?.[0] ?? "USDC"];
  const busy = state === "wallet" || state === "listing";
  const p = press ?? (state === "pressed" ? 1 : 0);

  if (state === "listed") {
    return (
      <Sheet open={open} insetBottom={insetBottom}>
        <StatusPill tone="frozen" icon={Snowflake} word="Paused for sale" pop={pausedPop} style={{ transformOrigin: "0 50%" }} />
        <div style={{ ...TY.sheetTitle, marginTop: 10 }}>Listed for sale</div>
        <div style={{ marginTop: 14, ...TY.caption, color: C.inkMuted }}>Price</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <span style={{ ...display(800), fontSize: 36, lineHeight: "40px", letterSpacing: "-0.03em", color: C.ink, ...NUM }}>{num}</span>
          <span style={{ ...display(700), fontSize: 18, color: C.inkMuted }}>{cur}</span>
        </div>
        <div style={{ ...TY.bodySm, color: C.inkMuted, marginTop: 6 }}>Anyone can buy it at exactly this price, right away.</div>
        <PausedBanner id={id} style={{ marginTop: 16 }} />
        <UiButton block kind="secondary" label="Delist" style={{ marginTop: 18 }} />
        <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted, textAlign: "center", marginTop: 10 }}>Delisting is instant. Sending resumes right away.</div>
      </Sheet>
    );
  }

  const typedNum = num.slice(0, Math.round(Math.max(0, Math.min(1, priceReveal)) * num.length));
  return (
    <Sheet open={open} insetBottom={insetBottom}>
      <div style={{ ...TY.sheetTitle }}>Sell Satchel #{id}</div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: C.sunken }}>
        <span style={{ width: 28, height: 28, borderRadius: 999, background: C.success, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Check size={17} strokeWidth={2} color={C.white} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px", color: C.ink }}>Ready to list</div>
          <div style={{ ...TY.caption, color: C.inkMuted }}>3 past signatures, all settled</div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...TY.caption, color: C.inkMuted }}>Price</span>
        <span style={{ display: "flex", padding: 3, gap: 2, borderRadius: 999, background: C.sunken }}>
          {["USDC", "NEAR"].map((c) => (
            <span key={c} style={{ ...sans(c === cur ? 650 : 550), fontSize: 12.5, padding: "3px 11px", borderRadius: 999, background: c === cur ? C.surface : "transparent", border: `1.5px solid ${c === cur ? C.ink : "transparent"}`, color: c === cur ? C.ink : C.inkMuted }}>
              {c}
            </span>
          ))}
        </span>
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, padding: "10px 16px", borderRadius: 12, background: C.sunken, border: `2px solid ${state === "ready" && priceReveal < 1 ? C.ink : C.lineStrong}` }}>
        <span style={{ ...display(800), fontSize: 34, lineHeight: "42px", letterSpacing: "-0.03em", color: typedNum ? C.ink : C.inkMuted, ...NUM }}>{typedNum || "0"}</span>
        {caret > 0 ? <span style={{ alignSelf: "center", width: 2, height: 30, background: C.ink, opacity: caret, marginLeft: -6 }} /> : null}
        <span style={{ ...display(700), fontSize: 18, color: C.inkMuted }}>{cur}</span>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <KV k="Buyer gets" v={holdings(balances)} />
        <KV k="Satchel fee" v="None" />
        <KV k="You receive" v={`${num} ${cur}`} strong />
      </div>
      <div style={{ ...TY.caption, color: C.inkMuted, marginTop: 12 }}>While it&apos;s listed, Satchel #{id} can&apos;t sign anything or be given. You can delist any time.</div>

      <UiButton
        block
        style={{ marginTop: 16 }}
        label={state === "wallet" ? "Approve in your wallet…" : state === "listing" ? "Listing…" : "List for sale"}
        busy={busy}
        spin={spin}
        press={busy ? 0 : p}
      />
    </Sheet>
  );
}

function KV({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...TY.bodySm, fontSize: 14 }}>
      <span style={{ color: C.inkMuted }}>{k}</span>
      <span style={{ ...sans(strong ? 700 : 500), color: C.ink, textAlign: "right", ...NUM }}>{v}</span>
    </div>
  );
}
