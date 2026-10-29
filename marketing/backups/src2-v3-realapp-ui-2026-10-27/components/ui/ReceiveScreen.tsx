import { Check, CircleCheck, Copy, Hourglass, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { StickerS } from "../../brand/Logo";
import { C, type Chain, display, sans } from "../../brand/tokens";
import { AppSegmented, ChainFace, FlowSheet } from "./app";
import { ADDR7, AMOUNTS, CHAIN_NAME, CHAINS, TICKER } from "./data";
import { AddressText, type PhoneChrome, popScale, STROKE, UiButton } from "./kit";
import { QrCode } from "./Qr";
import { SatchelScreen } from "./SatchelScreen";

/**
 * ReceiveScreen (P2): the app's "Add coins to Satchel #7" sheet over the Satchel page (S/receive-btc, -mempool,
 * -received, -copied). The dark-pill chain switcher with charm faces, the QR panel headed by the card's coral band
 * (charm + chain, the QR in its plate, "This Satchel's Bitcoin address", the grouped mono address), the notes, the
 * Incoming block, and "Copy address" pinned at the bottom.
 *
 * chain     which tab is selected (QR and address follow)
 * incoming  "none" | "waiting" ("Waiting for coins…") | "mempool" ("+0.0513 BTC · in mempool") | "received"
 *           ("Received 0.0513 BTC" · "Satchel #7 now holds 0.0513 BTC.")
 * scroll    sheet body scroll in px; default: 0 while waiting, scrolled to the Incoming block once coins arrive
 * press / copied / qrReveal / spin / incomingPop / open as before. Addresses and QR are checksum-INVALID (data.ts).
 * Layout boxes: RECEIVE_LAYOUT (and RECEIVE_LAYOUT_SCROLLED) in ./layout.
 */

export type IncomingState = "none" | "waiting" | "mempool" | "received";

export interface ReceiveScreenProps extends PhoneChrome {
  chain?: Chain;
  incoming?: IncomingState;
  amount?: string;
  total?: string;
  press?: number;
  copied?: boolean;
  qrReveal?: number;
  spin?: number;
  incomingPop?: number;
  scroll?: number;
  open?: number;
  id?: string;
}

/** The body scroll (plus insetTop) that brings the Incoming block above the pinned Copy button. */
export const RECEIVE_INCOMING_SCROLL = 125;

const ONLY: Record<Chain, string> = { btc: "Send only Bitcoin to this address.", evm: "Send only ETH to this address.", sol: "Send only SOL to this address." };
const TIME: Record<Chain, string> = { btc: "Bitcoin confirmations take minutes to hours.", evm: "About 12 seconds to confirm.", sol: "A few seconds to confirm." };

export function ReceiveScreen({
  chain = "btc",
  incoming = "waiting",
  amount,
  total,
  press = 0,
  copied = false,
  qrReveal = 1,
  spin = 0,
  incomingPop,
  scroll,
  open = 1,
  id = "7",
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
}: ReceiveScreenProps) {
  const chrome = { statusBar, insetTop, insetBottom };
  const name = CHAIN_NAME[chain];
  const amt = `${amount ?? AMOUNTS.fill[chain]} ${TICKER[chain]}`;
  const sc = scroll ?? (incoming === "mempool" || incoming === "received" ? RECEIVE_INCOMING_SCROLL + insetTop : 0);
  const footer = (
    <span data-ui="copy" style={{ display: "block" }}>
      <UiButton block label={copied ? "Copied" : "Copy address"} icon={copied ? Check : Copy} press={press} />
    </span>
  );
  return (
    <FlowSheet {...chrome} title={`Add coins to Satchel #${id}`} open={open} footer={footer} bodyScroll={sc} backdrop={<SatchelScreen {...chrome} id={id} balances={{ btc: "0", evm: "0", sol: "0" }} />}>
      <AppSegmented items={CHAINS.map((c) => ({ key: c, label: CHAIN_NAME[c], lead: <ChainFace chain={c} size={20} /> }))} selected={chain} />

      <div data-ui="qrPanel" style={{ borderRadius: 24, border: `1px solid ${C.line}`, overflow: "hidden", background: C.surface }}>
        <div style={{ height: 50, background: C.brand, borderBottom: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px" }}>
          <span style={{ ...display(800), fontSize: 18, letterSpacing: "-0.02em", color: C.ink }}>Satchel #{id}</span>
          <StickerS height={30} />
        </div>
        <div style={{ padding: "18px 16px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...sans(600), fontSize: 15, color: C.inkMuted }}>
            <ChainFace chain={chain} size={20} />
            {name}
          </div>
          <div data-ui="qr" style={{ marginTop: 14, width: 220, height: 220, borderRadius: 18, border: `1.5px solid ${C.lineStrong}`, display: "grid", placeItems: "center", boxSizing: "border-box" }}>
            <QrCode chain={chain} size={158} variant="app" reveal={qrReveal} />
          </div>
          <div style={{ marginTop: 18, ...sans(400), fontSize: 14, color: C.inkMuted }}>This Satchel&apos;s {name} address</div>
          <div data-ui="address" style={{ marginTop: 10, textAlign: "center", padding: "0 6px" }}>
            <AddressText value={ADDR7[chain]} size={15} align="center" style={{ lineHeight: "24px" }} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Note icon={<TriangleAlert size={17} strokeWidth={STROKE} color={C.danger} />}>{ONLY[chain]}</Note>
        <Note icon={<Hourglass size={17} strokeWidth={STROKE} color={C.ink} />}>{TIME[chain]}</Note>
        <Note icon={<Info size={17} strokeWidth={STROKE} color={C.ink} />}>Anyone can add coins. Only the owner can send them out.</Note>
      </div>

      {incoming !== "none" ? (
        <div>
          <div style={{ ...sans(600), fontSize: 15, color: C.inkMuted }}>Incoming</div>
          <div data-ui="incoming" style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 18, background: C.sunken }}>
            <span style={{ marginTop: 1, display: "grid", transform: incoming === "received" && incomingPop !== undefined ? `scale(${popScale(incomingPop)})` : undefined }}>
              {incoming === "waiting" ? (
                <span style={{ display: "grid", transform: `rotate(${spin * 360}deg)` }}>
                  <LoaderCircle size={20} strokeWidth={STROKE} color={C.inkMuted} />
                </span>
              ) : incoming === "mempool" ? (
                <Hourglass size={20} strokeWidth={STROKE} color={C.frozen} />
              ) : (
                <CircleCheck size={20} strokeWidth={STROKE} color={C.success} />
              )}
            </span>
            <div>
              <div style={{ ...sans(650), fontSize: 16, lineHeight: "22px", color: incoming === "waiting" ? C.inkMuted : C.ink, fontVariantNumeric: "tabular-nums" }}>
                {incoming === "waiting" ? "Waiting for coins…" : incoming === "mempool" ? `+${amt} · ${chain === "btc" ? "in mempool" : "confirming"}` : `Received ${amt}`}
              </div>
              <div style={{ ...sans(400), fontSize: 13, lineHeight: "18px", color: C.inkMuted, marginTop: 2 }}>
                {incoming === "waiting" ? "This updates by itself. You can close this sheet." : incoming === "mempool" ? "It counts once it has 1 confirmation." : `Satchel #${id} now holds ${total ?? amt}.`}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </FlowSheet>
  );
}

function Note({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", ...sans(400), fontSize: 15, lineHeight: "21px", color: C.ink }}>
      <span style={{ marginTop: 2, display: "grid", flexShrink: 0 }}>{icon}</span>
      {children}
    </div>
  );
}
