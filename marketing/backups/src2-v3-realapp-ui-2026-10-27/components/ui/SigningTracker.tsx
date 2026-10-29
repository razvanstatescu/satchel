import type { CSSProperties } from "react";
import { CircleCheck, Hourglass } from "lucide-react";
import { C, type Chain, display, mono, sans } from "../../brand/tokens";
import { AppLink, FlowSheet, Stepper, type StepperRow } from "./app";
import { AMOUNTS, CHAIN_NAME, mmss, SEND_TO, SEND_TX, TICKER, truncate } from "./data";
import { type PhoneChrome, STROKE, Toast, UiButton } from "./kit";
import { SatchelScreen } from "./SatchelScreen";

/**
 * SigningTracker (P3 step 3; the app's SigningProgress, X/send-tracker-0, send-sent, send-confirmed): a vertical
 * stepper that becomes the receipt. Green check circles, a blue spinner on the active row (with its m:ss timer under
 * it), dashed circles for future rows, connector lines; after sending, each row keeps its time and explorer link.
 *   Approved in your wallet ✓ → Signing with NEAR's signer network (0:03) → Broadcast to Bitcoin → Waiting for 1
 *   confirmation (hourglass) → Confirmed.
 * stage "wallet" | "signing" | "broadcasting" | "sent" | "confirmed" · elapsedSec (jump-cut 3 → 9) · spin turns the
 * spinner (pulse is kept for compatibility).
 */

export type SignStage = "wallet" | "signing" | "broadcasting" | "sent" | "confirmed";

const EXPLORER: Record<Chain, string> = { btc: "mempool.space", evm: "Etherscan", sol: "Solana Explorer" };
const WAIT_SUB: Record<Chain, string> = { btc: "In mempool. Confirmations take minutes to hours.", evm: "About 12 seconds.", sol: "Usually a few seconds." };

export function trackerRows(stage: SignStage, chain: Chain, elapsedSec: number): StepperRow[] {
  const net = CHAIN_NAME[chain];
  const after = stage === "sent" || stage === "confirmed";
  const sep = <span style={{ margin: "0 6px" }}>·</span>;
  return [
    stage === "wallet" ? { label: "Approve in your wallet", state: "active" } : { label: "Approved in your wallet", state: "done", sub: after ? "14:02:11" : undefined },
    stage === "wallet"
      ? { label: "Sign with NEAR's signer network", state: "future" }
      : stage === "signing"
        ? { label: "Signing with NEAR's signer network", state: "active", sub: mmss(elapsedSec) }
        : {
            label: "Signed by NEAR's signer network",
            state: "done",
            sub: (
              <>
                <AppLink style={{ fontSize: 14 }}>NearBlocks</AppLink>
                {sep}in 0:07
              </>
            ),
          },
    stage === "broadcasting"
      ? { label: `Broadcasting to ${net}`, state: "active" }
      : after
        ? {
            label: `Broadcast to ${net}`,
            state: "done",
            sub: (
              <>
                <span style={{ ...mono(450), fontSize: 13.5 }}>{SEND_TX[chain]}</span>
                {sep}
                <AppLink style={{ fontSize: 14 }}>{EXPLORER[chain]}</AppLink>
                {sep}14:02:19
              </>
            ),
          }
        : { label: `Broadcast to ${net}`, state: "future" },
    stage === "confirmed" ? { label: "Confirmed", state: "done", sub: "14:12:40" } : stage === "sent" ? { label: "Waiting for 1 confirmation", state: "waiting", sub: WAIT_SUB[chain] } : { label: "Confirmation", state: "future" },
  ];
}

export function SigningTracker({ stage = "signing", chain = "btc", elapsedSec = 3, spin = 0, style }: { stage?: SignStage; chain?: Chain; elapsedSec?: number; pulse?: number; spin?: number; style?: CSSProperties }) {
  return <Stepper rows={trackerRows(stage, chain, elapsedSec)} spin={spin} style={style} />;
}

/** The "Sent 0.0100 BTC" toast (brand-soft sticker toast, success badge). Bitcoin adds "In mempool". */
export function SentToast({ chain = "btc", amount, show = 1, style }: { chain?: Chain; amount?: string; show?: number; style?: CSSProperties }) {
  return <Toast title={`Sent ${amount ?? AMOUNTS.send[chain]} ${TICKER[chain]}`} sub={chain === "btc" ? "In mempool" : undefined} show={show} style={style} />;
}

/**
 * SigningScreen: the Send sheet's tracker step ("Sending 0.0100 BTC / to bc1qw5…y8sd", the "Usually about 10
 * seconds." banner, the stepper, "Keep this tab open until it says Sent. / Signatures by NEAR Chain Signatures"),
 * Minimize while signing; once sent: the green-check heading, the receipt rows, Done + View activity.
 * toast 0..1 pops the Sent toast at the top · press 0..1 presses Done · open 0..1. Layout: SIGNING_LAYOUT in ./layout.
 */
export function SigningScreen({
  stage = "signing",
  chain = "btc",
  amount,
  elapsedSec = 3,
  spin = 0,
  toast = 0,
  press = 0,
  id = "7",
  open = 1,
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
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
  open?: number;
}) {
  const chrome = { statusBar, insetTop, insetBottom };
  const sent = stage === "sent" || stage === "confirmed";
  const amt = `${amount ?? AMOUNTS.send[chain]} ${TICKER[chain]}`;
  const footer = sent ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span data-ui="done">
        <UiButton block label="Done" press={press} />
      </span>
      <UiButton block label="View activity" kind="secondary" />
    </div>
  ) : undefined;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <FlowSheet
        {...chrome}
        title={`Send ${CHAIN_NAME[chain]}`}
        swatch
        sub={`From Satchel #${id}`}
        close={sent ? "close" : "minimize"}
        open={open}
        footer={footer}
        footerLine={false}
        bodyGap={18}
        backdrop={<SatchelScreen {...chrome} id={id} status={sent ? "active" : "signing"} spin={spin} activity={sent ? undefined : `Sending ${amt} · ${mmss(elapsedSec)}`} />}
      >
        <div data-ui="heading">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {sent ? <CircleCheck size={24} strokeWidth={STROKE} color={C.success} /> : null}
            <span style={{ ...display(700), fontSize: 20, lineHeight: "26px", fontVariantNumeric: "tabular-nums" }}>{sent ? `Sent ${amt}` : `Sending ${amt}`}</span>
          </div>
          <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 2 }}>to {truncate(SEND_TO[chain], chain)}</div>
        </div>
        {!sent ? (
          <div data-ui="banner" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 16, background: C.sunken, ...sans(650), fontSize: 15 }}>
            <Hourglass size={18} strokeWidth={STROKE} color={C.frozen} />
            Usually about 10 seconds.
          </div>
        ) : null}
        <SigningTracker stage={stage} chain={chain} elapsedSec={elapsedSec} spin={spin} />
        <div style={{ ...sans(400), fontSize: 13, lineHeight: "20px", color: C.inkMuted }}>
          {sent ? "You can close this tab. Activity keeps tracking it." : "Keep this tab open until it says Sent."}
          <br />
          Signatures by NEAR Chain Signatures
        </div>
      </FlowSheet>
      {toast > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: insetTop + 6, display: "flex", justifyContent: "center" }}>
          <SentToast chain={chain} amount={amount} show={toast} />
        </div>
      ) : null}
    </div>
  );
}
