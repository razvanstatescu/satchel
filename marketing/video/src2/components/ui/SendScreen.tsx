import type { ReactNode } from "react";
import { Check, CircleCheck, Clock, Fuel, Wallet, X } from "lucide-react";
import { C, type Chain, display, mono, sans } from "../../brand/tokens";
import { ACCOUNTS, AMOUNTS, type Balances, CHAIN_NAME, CHAINS, NEAR_FEE, NETWORK_FEE, SEND_TO, TICKER } from "./data";
import { AddressText, Dot, FlowHeader, Group, NUM, PhoneScreen, type PhoneChrome, Row, Segmented, Sheet, STROKE, TY, UiButton } from "./kit";

/**
 * SendScreen (P3 step 1–2): "Send Bitcoin" from Satchel #7. The chain switcher with each chain's balance, the amount
 * hero ("0.0100 BTC"), the resolved recipient in grouped mono, "Network fee ~282 sats · paid by this Satchel", and the
 * coral "Send 0.0100 BTC" (kb/82 §2.10–2.13: the whole intent on one screen; the button narrates the wallet).
 *
 * chain     btc | evm | sol (amount, recipient and fee follow it; SCRIPT-v3 sends 0.0100 BTC · 0.05 ETH · 1.25 SOL)
 * amount    the hero amount string (type it in: "0.01" → "0.0100")     to  the recipient
 * balances  what the switcher shows (default: the fill, before any send)
 * cta       "idle" | "wallet" ("Approve in your wallet…" with a spinner)
 * press     0..1 Send button press       spin  turns the in-button spinner
 * overlay   e.g. <WalletApproveSheet open={…} /> (or layer the sheet over the screen yourself)
 */

export interface SendScreenProps extends PhoneChrome {
  chain?: Chain;
  amount?: string;
  to?: string;
  balances?: Balances;
  cta?: "idle" | "wallet";
  press?: number;
  spin?: number;
  id?: string;
  overlay?: ReactNode;
}

export function SendScreen({ chain = "btc", amount, to, balances = AMOUNTS.fill, cta = "idle", press = 0, spin = 0, id = "7", overlay, ...chrome }: SendScreenProps) {
  const t = TICKER[chain];
  const amt = amount ?? AMOUNTS.send[chain];
  const dest = to ?? SEND_TO[chain];
  const after = AMOUNTS.afterSend[chain];
  const footer = (
    <>
      <UiButton block label={cta === "wallet" ? "Approve in your wallet…" : `Send ${amt} ${t}`} busy={cta === "wallet"} spin={spin} press={cta === "wallet" ? 0 : press} />
      <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted, textAlign: "center", marginTop: 10, padding: "0 6px" }}>
        {cta === "wallet" ? "Check your NEAR wallet." : (
          <>
            Your wallet will ask you to approve a request to <span style={{ ...mono(500), fontSize: 12 }}>{ACCOUNTS.contract}</span>.
          </>
        )}
      </div>
    </>
  );
  return (
    <PhoneScreen {...chrome} footer={footer} overlay={overlay}>
      <FlowHeader title={`Send ${CHAIN_NAME[chain]}`} subtitle={`from Satchel #${id}`} />
      <div style={{ flex: 1, minHeight: 0, padding: "4px 16px 0", display: "flex", flexDirection: "column" }}>
        <Segmented
          items={CHAINS.map((c) => ({
            key: c,
            lead: <Dot chain={c} />,
            label: (
              <span>
                {TICKER[c]} <span style={{ ...sans(450), color: C.inkMuted }}>{balances[c]}</span>
              </span>
            ),
          }))}
          selected={chain}
        />

        <div style={{ marginTop: 52, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...TY.hero, fontSize: 52, lineHeight: "56px" }}>{amt}</span>
            <span style={{ ...display(700), fontSize: 24, color: C.inkMuted, letterSpacing: "-0.01em" }}>{t}</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...TY.bodySm, color: C.inkMuted, ...NUM }}>
              Available {balances[chain]} {t}
            </span>
            <span style={{ ...sans(600), fontSize: 13, padding: "4px 10px", borderRadius: 10, background: C.sunken, color: C.ink }}>Max</span>
          </div>
        </div>

        <div style={{ marginTop: 44, ...TY.caption, color: C.inkMuted }}>To</div>
        <div style={{ marginTop: 6, padding: "12px 12px 12px 14px", borderRadius: 12, background: C.sunken, border: `2px solid ${C.lineStrong}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AddressText value={dest} size={15} style={{ lineHeight: "22px" }} />
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, ...sans(600), fontSize: 13, color: C.success }}>
              <CircleCheck size={15} strokeWidth={STROKE} />
              {CHAIN_NAME[chain]} address
            </div>
          </div>
          <span style={{ width: 28, height: 28, borderRadius: 999, background: C.surface, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <X size={15} strokeWidth={STROKE} color={C.inkMuted} />
          </span>
        </div>

        <Group style={{ marginTop: 16 }}>
          <Row divider={false} style={{ padding: "11px 14px", gap: 10 }}>
            <Fuel size={17} strokeWidth={STROKE} color={C.inkMuted} />
            <span style={{ ...TY.bodySm, fontSize: 13, color: C.ink, whiteSpace: "nowrap", ...NUM }}>
              Network fee {NETWORK_FEE[chain]} · <span style={{ color: C.inkMuted }}>paid by this Satchel</span>
            </span>
          </Row>
          <Row style={{ padding: "11px 14px", gap: 10 }}>
            <Clock size={17} strokeWidth={STROKE} color={C.inkMuted} />
            <span style={{ ...TY.bodySm, fontSize: 13.5, color: C.ink }}>
              Signing <span style={{ color: C.inkMuted }}>· usually about 10 seconds</span>
            </span>
          </Row>
          <Row style={{ padding: "11px 14px", gap: 10 }}>
            <span style={{ width: 17, display: "grid", placeItems: "center" }}>
              <Dot chain={chain} size={9} />
            </span>
            <span style={{ ...TY.bodySm, fontSize: 13.5, color: C.inkMuted, flex: 1 }}>Satchel #{id} after</span>
            <span style={{ ...sans(650), fontSize: 13.5, color: C.ink, ...NUM }}>
              {after} {t}
            </span>
          </Row>
        </Group>
      </div>
    </PhoneScreen>
  );
}

/**
 * WalletApproveSheet (P3 step 2): the user's own NEAR wallet asking to approve the request. Deliberately NEUTRAL: no
 * coral, no sticker drop, no real wallet brand; it reads as a different app. "Approve request to satchel.satchelhq.near",
 * "Send 0.0100 BTC from Satchel #7", Reject / Approve.
 *
 * open      0..1 slides the sheet up over a scrim (full bleed over its parent: layer it over SendScreen or pass it as
 *           SendScreen's `overlay`)
 * press     0..1 Approve press (scales; the neutral button has no sticker drop)
 * approved  the Approve button turns into "Approved" with a check (hold it a few frames, then close the sheet)
 */
export function WalletApproveSheet({
  open = 1,
  press = 0,
  approved = false,
  account = ACCOUNTS.alice,
  contract = ACCOUNTS.contract,
  action,
  chain = "btc",
  amount,
  id = "7",
  insetBottom = 34,
}: {
  open?: number;
  press?: number;
  approved?: boolean;
  account?: string;
  contract?: string;
  action?: string;
  chain?: Chain;
  amount?: string;
  id?: string;
  insetBottom?: number;
}) {
  const what = action ?? `Send ${amount ?? AMOUNTS.send[chain]} ${TICKER[chain]} from Satchel #${id}`;
  return (
    <Sheet open={open} variant="neutral" insetBottom={insetBottom}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
          <Wallet size={21} strokeWidth={STROKE} color={C.ink} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ ...sans(700), fontSize: 16, lineHeight: "20px", color: C.ink }}>Your NEAR wallet</div>
          <div style={{ ...mono(450), fontSize: 13, color: C.inkMuted }}>{account}</div>
        </div>
      </div>
      <div style={{ height: 1, background: C.line, margin: "16px -20px 16px" }} />
      <div style={{ ...TY.caption, color: C.inkMuted }}>Approve request to</div>
      <div style={{ ...mono(600), fontSize: 17, lineHeight: "24px", color: C.ink, marginTop: 2 }}>{contract}</div>
      <div style={{ marginTop: 14, borderRadius: 16, background: C.sunken, padding: "14px 16px" }}>
        <div style={{ ...sans(650), fontSize: 16, lineHeight: "22px", color: C.ink, ...NUM }}>{what}</div>
        <div style={{ height: 1, background: C.line, margin: "12px 0" }} />
        <KV k="Network fee" v={NEAR_FEE} />
        <KV k="Paid by" v={<span style={{ ...mono(450), fontSize: 13 }}>{account}</span>} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <UiButton label="Reject" kind="neutralSecondary" style={{ flex: 1 }} />
        <UiButton label={approved ? "Approved" : "Approve"} icon={approved ? Check : undefined} kind="neutral" press={press} style={{ flex: 1 }} />
      </div>
    </Sheet>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...TY.bodySm, marginTop: 4 }}>
      <span style={{ color: C.inkMuted }}>{k}</span>
      <span style={{ color: C.ink, ...NUM }}>{v}</span>
    </div>
  );
}
