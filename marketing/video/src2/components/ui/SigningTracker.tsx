import type { CSSProperties, ReactNode } from "react";
import { Check, Hourglass, ShieldCheck } from "lucide-react";
import { C, type Chain, mono, sans } from "../../brand/tokens";
import { AMOUNTS, CHAIN_NAME, mmss, SEND_TO, SEND_TX, TICKER, truncate } from "./data";
import { CoinFace, FlowHeader, PhoneScreen, type PhoneChrome, PulseDot, Spinner, STROKE, Toast, TY, UiButton } from "./kit";

/**
 * SigningTracker (P3 step 3; product SigningProgress, kb/82 §2.14 Wise: a tracker that becomes the receipt):
 *   Approved in your wallet ✓ → Signing with NEAR's signer network · Usually about 10 seconds (pulsing frozen dot,
 *   m:ss timer) → Broadcast to Bitcoin ✓ (+ the transaction id) → Confirmation ("In mempool" for Bitcoin).
 *
 * stage       "wallet" | "signing" | "broadcasting" | "sent" | "confirmed"
 * elapsedSec  the signing timer (jump-cut it: 3 → 9); shown as m:ss on the active signing row
 * pulse 0..1  the frozen dot's beat      spin 0..1  the broadcasting spinner
 */

export type SignStage = "wallet" | "signing" | "broadcasting" | "sent" | "confirmed";
type RowState = "done" | "active" | "future" | "waiting";

const ORDER: SignStage[] = ["wallet", "signing", "broadcasting", "sent", "confirmed"];

export function SigningTracker({
  stage = "signing",
  chain = "btc",
  elapsedSec = 3,
  pulse = 0,
  spin = 0,
  style,
}: {
  stage?: SignStage;
  chain?: Chain;
  elapsedSec?: number;
  pulse?: number;
  spin?: number;
  style?: CSSProperties;
}) {
  const at = ORDER.indexOf(stage);
  const net = CHAIN_NAME[chain];
  const st = (row: number): RowState => {
    // row 0 wallet, 1 signing, 2 broadcast, 3 confirmation
    if (row === 3) return stage === "confirmed" ? "done" : stage === "sent" ? "waiting" : "future";
    if (at > row) return "done";
    if (at === row) return "active";
    return "future";
  };
  const rows: { label: string; sub?: ReactNode; right?: ReactNode; s: RowState }[] = [
    { s: st(0), label: st(0) === "done" ? "Approved in your wallet" : "Approve in your wallet" },
    {
      s: st(1),
      label: st(1) === "done" ? "Signed by NEAR's signer network" : st(1) === "active" ? "Signing with NEAR's signer network" : "Sign with NEAR's signer network",
      sub:
        st(1) === "active" ? (
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            Usually about 10 seconds
            <span style={{ ...sans(650), fontSize: 14, color: C.frozen, fontVariantNumeric: "tabular-nums" }}>{mmss(elapsedSec)}</span>
          </span>
        ) : undefined,
    },
    {
      s: st(2),
      label: st(2) === "active" ? `Broadcasting to ${net}` : `Broadcast to ${net}`,
      sub: st(2) === "done" ? <span style={{ ...mono(450), fontSize: 12.5 }}>{SEND_TX[chain]}</span> : undefined,
    },
    {
      s: st(3),
      label: st(3) === "done" ? "Confirmed" : st(3) === "waiting" ? (chain === "btc" ? "In mempool" : "Waiting for 1 confirmation") : "Confirmation",
      sub: st(3) === "waiting" ? (chain === "btc" ? "Waiting for 1 confirmation" : chain === "evm" ? "About 12 seconds" : "A few seconds") : undefined,
    },
  ];
  return (
    <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.line}`, padding: "8px 8px", ...style }}>
      {rows.map((r, i) => {
        const next = rows[i + 1];
        return (
          <div key={i} style={{ position: "relative", display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 10px", borderRadius: 14, background: r.s === "active" ? C.sunken : "transparent" }}>
            {/* connector to the next row */}
            {next ? (
              <span
                style={{
                  position: "absolute",
                  left: 10 + 13 - 1,
                  top: 10 + 26 + 2,
                  height: "calc(100% - 26px)",
                  width: 0,
                  borderLeft: `2px ${r.s === "done" && next.s !== "future" ? "solid" : "dashed"} ${r.s === "done" && next.s !== "future" ? C.success : C.lineStrong}`,
                  opacity: r.s === "done" && next.s !== "future" ? 0.55 : 0.6,
                }}
              />
            ) : null}
            <RowIcon s={r.s} pulse={pulse} spin={spin} broadcasting={i === 2 && r.s === "active"} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <div style={{ ...sans(r.s === "active" ? 650 : r.s === "future" ? 450 : 550), fontSize: 15, lineHeight: "21px", color: r.s === "future" ? C.inkMuted : C.ink }}>{r.label}</div>
              {r.sub ? <div style={{ ...TY.caption, color: C.inkMuted, marginTop: 1 }}>{r.sub}</div> : null}
            </div>
            {r.right ? <div style={{ paddingTop: 2 }}>{r.right}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

function RowIcon({ s, pulse, spin, broadcasting }: { s: RowState; pulse: number; spin: number; broadcasting: boolean }) {
  const box: CSSProperties = { width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0, boxSizing: "border-box", position: "relative", zIndex: 1 };
  if (s === "done") return <span style={{ ...box, background: C.success }}><Check size={16} strokeWidth={2} color={C.white} /></span>;
  if (s === "waiting") return <span style={{ ...box, background: C.surface, border: `2px solid ${C.frozen}` }}><Hourglass size={13} strokeWidth={2} color={C.frozen} /></span>;
  if (s === "active")
    return (
      <span style={{ ...box, background: C.surface, border: `2px solid ${C.frozen}` }}>
        {broadcasting ? <Spinner size={15} spin={spin} color={C.frozen} /> : <PulseDot pulse={pulse} size={10} />}
      </span>
    );
  return <span style={{ ...box, background: C.surface, border: `2px dashed ${C.lineStrong}` }} />;
}

/** The "Sent 0.0100 BTC" toast (brand-soft sticker toast, success badge). Bitcoin adds "In mempool". */
export function SentToast({ chain = "btc", amount, show = 1, style }: { chain?: Chain; amount?: string; show?: number; style?: CSSProperties }) {
  return <Toast title={`Sent ${amount ?? AMOUNTS.send[chain]} ${TICKER[chain]}`} sub={chain === "btc" ? "In mempool" : undefined} show={show} style={style} />;
}

/**
 * SigningScreen: the send flow's tracker step as a phone screen (product SendFlow "tracker"). A coin-face summary
 * ("Sending 0.0100 BTC" → "Sent 0.0100 BTC"), the SigningTracker, the keep-open note and the credit line; Done once
 * sent. `toast` 0..1 pops the Sent toast in at the top (or place SentToast yourself, outside the phone).
 */
export function SigningScreen({
  stage = "signing",
  chain = "btc",
  amount,
  elapsedSec = 3,
  pulse = 0,
  spin = 0,
  toast = 0,
  press = 0,
  id = "7",
  ...chrome
}: PhoneChrome & {
  stage?: SignStage;
  chain?: Chain;
  amount?: string;
  elapsedSec?: number;
  pulse?: number;
  spin?: number;
  toast?: number;
  press?: number;
  id?: string;
}) {
  const sent = stage === "sent" || stage === "confirmed";
  const amt = `${amount ?? AMOUNTS.send[chain]} ${TICKER[chain]}`;
  const footer = sent ? (
    <UiButton block label="Done" press={press} />
  ) : (
    <div style={{ ...TY.caption, color: C.inkMuted, textAlign: "center", padding: "4px 0 8px" }}>Keep this tab open until it says Sent.</div>
  );
  return (
    <PhoneScreen
      {...chrome}
      footer={footer}
      overlay={
        toast > 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: (chrome.insetTop ?? 54) + 6, display: "flex", justifyContent: "center" }}>
            <SentToast chain={chain} amount={amount} show={toast} />
          </div>
        ) : undefined
      }
    >
      <FlowHeader title={`Send ${CHAIN_NAME[chain]}`} subtitle={`from Satchel #${id}`} left="minimize" />
      <div style={{ flex: 1, minHeight: 0, padding: "0 16px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <CoinFace chain={chain} size={64} face={sent ? { smile: 1.6, blink: 0 } : { smile: 0.6, look: { x: 0, y: -6 } }} />
          <div style={{ ...TY.sheetTitle, marginTop: 14, fontVariantNumeric: "tabular-nums" }}>{sent ? `Sent ${amt}` : `Sending ${amt}`}</div>
          <div style={{ ...TY.bodySm, color: C.inkMuted, marginTop: 4 }}>
            to <span style={{ ...mono(500), fontSize: 13.5, color: C.ink }}>{truncate(SEND_TO[chain], chain)}</span>
          </div>
        </div>
        <SigningTracker style={{ marginTop: 26 }} stage={stage} chain={chain} elapsedSec={elapsedSec} pulse={pulse} spin={spin} />
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, ...TY.caption, color: C.inkMuted }}>
          <ShieldCheck size={15} strokeWidth={STROKE} />
          {sent ? "You can close this tab. Activity keeps tracking it." : "Signatures by NEAR Chain Signatures"}
        </div>
      </div>
    </PhoneScreen>
  );
}
