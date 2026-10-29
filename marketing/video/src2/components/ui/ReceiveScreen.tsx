import { Check, Copy, Hourglass, Info, Share } from "lucide-react";
import { StickerS } from "../../brand/Logo";
import { C, type Chain, display } from "../../brand/tokens";
import { ADDR7, AMOUNTS, CHAIN_NAME, CHAINS, TICKER } from "./data";
import { AddressText, CoinFace, Dot, FlowHeader, Group, PhoneScreen, type PhoneChrome, popScale, Row, SectionLabel, Segmented, Spinner, STROKE, TY, UiButton } from "./kit";
import { QrCode } from "./Qr";

/**
 * ReceiveScreen (P2): "Add coins to Satchel #7". A chain switcher (Bitcoin / Ethereum / Solana), the QR in a panel headed by
 * the card's coral band, "This Satchel's Bitcoin address" in grouped mono, Copy (the pressable coral button) and the
 * live Incoming row (kb/82 §2.9: one job per screen; the deposit block under the address).
 *
 * chain     which tab is selected (the QR and address follow it)
 * incoming  "none" | "waiting" ("Waiting for a deposit…") | "mempool" ("+0.0513 BTC · in mempool") | "received"
 *           ("Received 0.0513 BTC"). ETH and SOL say "confirming" instead of "in mempool".
 * amount    the incoming amount (default: SCRIPT-v3 fill numbers)
 * press     0..1 Copy button press      copied  label swaps to "Copied" with a check
 * qrReveal  0..1 sweeps the QR in       spin    turns the waiting spinner
 * The address and QR are checksum-INVALID on purpose (see data.ts).
 */

export type IncomingState = "none" | "waiting" | "mempool" | "received";

export interface ReceiveScreenProps extends PhoneChrome {
  chain?: Chain;
  incoming?: IncomingState;
  amount?: string;
  press?: number;
  copied?: boolean;
  qrReveal?: number;
  spin?: number;
  /** 0..1 pops the "received" check badge in (the mempool → received beat). */
  incomingPop?: number;
  id?: string;
}

export function ReceiveScreen({ chain = "btc", incoming = "waiting", amount, press = 0, copied = false, qrReveal = 1, spin = 0, incomingPop, id = "7", ...chrome }: ReceiveScreenProps) {
  const name = CHAIN_NAME[chain];
  const amt = `${amount ?? AMOUNTS.fill[chain]} ${TICKER[chain]}`;
  return (
    <PhoneScreen {...chrome}>
      <FlowHeader title={`Add coins to Satchel #${id}`} />
      <div style={{ flex: 1, minHeight: 0, padding: "4px 16px 0", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <Segmented items={CHAINS.map((c) => ({ key: c, label: CHAIN_NAME[c], lead: <Dot chain={c} /> }))} selected={chain} />

        {/* the QR panel: a little Satchel card */}
        <div style={{ alignSelf: "center", marginTop: 18, width: 252, borderRadius: 24, background: C.surface, border: `3px solid ${C.ink}`, boxShadow: `0 4px 0 ${C.ink}`, overflow: "hidden" }}>
          <div style={{ height: 42, background: C.brand, borderBottom: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px" }}>
            <span style={{ ...display(800), fontSize: 17, letterSpacing: "-0.02em", color: C.ink }}>Satchel #{id}</span>
            <StickerS height={26} />
          </div>
          <div style={{ padding: 20, display: "grid", placeItems: "center" }}>
            <QrCode chain={chain} size={204} reveal={qrReveal} />
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", ...TY.caption, fontWeight: 600, color: C.inkMuted }}>This Satchel&apos;s {name} address</div>
        <div style={{ marginTop: 4, padding: "0 10px", textAlign: "center" }}>
          <AddressText value={ADDR7[chain]} size={16} align="center" style={{ lineHeight: "24px" }} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <UiButton label={copied ? "Copied" : "Copy address"} icon={copied ? Check : Copy} press={press} style={{ flex: 1.5 }} />
          <UiButton label="Share" icon={Share} kind="secondary" style={{ flex: 1 }} />
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...TY.caption, color: C.inkMuted }}>
          <Info size={16} strokeWidth={STROKE} />
          Send only {name} to this address.
        </div>

        {incoming !== "none" ? (
          <div style={{ marginTop: "auto", paddingTop: 14 }}>
            <SectionLabel style={{ marginBottom: 8 }}>Incoming</SectionLabel>
            <Group>
              <Row divider={false} style={{ minHeight: 64, boxSizing: "border-box" }}>
                {incoming === "waiting" ? (
                  <>
                    <span style={{ width: 34, height: 34, display: "grid", placeItems: "center" }}>
                      <Spinner size={20} spin={spin} />
                    </span>
                    <span style={{ ...TY.body, fontSize: 15, color: C.inkMuted }}>Waiting for a deposit…</span>
                  </>
                ) : (
                  <>
                    <CoinFace chain={chain} size={34} face={incoming === "received" ? { smile: 1.5 } : undefined} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TY.label, fontWeight: 650, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                        {incoming === "mempool" ? `+${amt} · ${chain === "btc" ? "in mempool" : "confirming"}` : `Received ${amt}`}
                      </div>
                      <div style={{ ...TY.caption, color: C.inkMuted }}>{incoming === "mempool" ? "Waiting for 1 confirmation" : `Confirmed · in Satchel #${id}`}</div>
                    </div>
                    {incoming === "mempool" ? (
                      <span style={{ width: 32, height: 32, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
                        <Hourglass size={17} strokeWidth={STROKE} color={C.frozen} />
                      </span>
                    ) : (
                      <span style={{ width: 32, height: 32, borderRadius: 999, background: C.success, display: "grid", placeItems: "center", transform: `scale(${incomingPop === undefined ? 1 : popScale(incomingPop)})` }}>
                        <Check size={18} strokeWidth={2} color={C.white} />
                      </span>
                    )}
                  </>
                )}
              </Row>
            </Group>
          </div>
        ) : null}
      </div>
    </PhoneScreen>
  );
}
