import type { ReactNode } from "react";
import { Check, Hourglass, Info, Wallet, X } from "lucide-react";
import { C, type Chain, display, mono, sans } from "../../brand/tokens";
import { AppSegmented, ChainFace, FlowSheet, FootNote, InfoChip, Swatch } from "./app";
import { ACCOUNTS, AMOUNTS, type Balances, CHAIN_NAME, CHAINS, NEAR_FEE, NETWORK_FEE, SEND_TO, TICKER, truncate } from "./data";
import { AddressText, NUM, type PhoneChrome, Sheet, STROKE, TY, UiButton } from "./kit";
import { SatchelScreen } from "./SatchelScreen";

/**
 * SendScreen (P3 steps 1–2): the app's "Send Bitcoin" sheet over the Satchel page (X/send-form-*, send-review*,
 * send-wallet). Title with the card swatch, "From Satchel #7 · Step 1 of 2".
 *   step 1 (form): the charm + ticker chain switcher (dark selected pill), the amount box ("0.0100 BTC",
 *          "Available 0.0513 BTC  Max"), To with the chain charm, the grouped address and "✓ Bitcoin address", Review.
 *   step 2 (review, default): the hero amount, "to bc1qw5…y8sd · Bitcoin", the From (swatch) / To (charm) box, the
 *          fee rows ("Network fee (est.) ~282 sats · paid by this Satchel", "Satchel #7 after", "NEAR fee"), the
 *          hourglass chip, "A Bitcoin send can't be undone…", and "Send 0.0100 BTC" pinned.
 * chain / amount / to / balances as before · cta "idle" | "wallet" ("Approve in your wallet…" + "Check your NEAR
 * wallet.") · press 0..1 presses Review / Send · spin · open 0..1 · scroll (body px) · overlay (e.g. WalletApproveSheet).
 * Layout boxes: SEND_LAYOUT (review) and SEND_FORM_LAYOUT in ./layout.
 */

export interface SendScreenProps extends PhoneChrome {
  chain?: Chain;
  amount?: string;
  to?: string;
  balances?: Balances;
  step?: 1 | 2;
  cta?: "idle" | "wallet";
  press?: number;
  spin?: number;
  id?: string;
  open?: number;
  scroll?: number;
  overlay?: ReactNode;
}

const AMOUNT_FEE: Record<Chain, string> = { btc: "−0.01000282 BTC", evm: "−0.05004 ETH", sol: "−1.250005 SOL" };
const CONFIRM: Record<Chain, string> = { btc: "Confirmation: minutes to hours", evm: "Confirmation: about 12 seconds", sol: "Confirmation: a few seconds" };
const FINAL: Record<Chain, string> = {
  btc: "A Bitcoin send can't be undone. Check the address above.",
  evm: "An Ethereum send can't be undone. Check the address above.",
  sol: "A Solana send can't be undone. Check the address above.",
};

export function SendScreen({
  chain = "btc",
  amount,
  to,
  balances = AMOUNTS.fill,
  step = 2,
  cta = "idle",
  press = 0,
  spin = 0,
  id = "7",
  open = 1,
  scroll = 0,
  overlay,
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
}: SendScreenProps) {
  const chrome = { statusBar, insetTop, insetBottom };
  const t = TICKER[chain];
  const amt = amount ?? AMOUNTS.send[chain];
  const dest = to ?? SEND_TO[chain];
  const after = AMOUNTS.after[chain];
  const wallet = cta === "wallet";

  const footer =
    step === 1 ? (
      <span data-ui="button" style={{ display: "block" }}>
        <UiButton block label="Review" press={press} />
      </span>
    ) : (
      <>
        <FootNote icon={<Info size={17} strokeWidth={STROKE} color={C.ink} style={{ marginTop: 2 }} />} style={{ color: C.ink, ...sans(600), fontSize: 15, marginBottom: 12 }}>
          {FINAL[chain]}
        </FootNote>
        <span data-ui="button" style={{ display: "block" }}>
          <UiButton block label={wallet ? "Approve in your wallet…" : `Send ${amt} ${t}`} busy={wallet} spin={spin} press={wallet ? 0 : press} />
        </span>
        <FootNote style={{ marginTop: 10 }}>
          {wallet ? (
            "Check your NEAR wallet."
          ) : (
            <>
              Your wallet will ask you to approve a request to {ACCOUNTS.contract}.
            </>
          )}
        </FootNote>
      </>
    );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <FlowSheet
        {...chrome}
        title={`Send ${CHAIN_NAME[chain]}`}
        swatch
        sub={`From Satchel #${id} · Step ${step} of 2`}
        close={wallet ? "minimize" : "close"}
        open={open}
        footer={footer}
        bodyScroll={scroll}
        backdrop={<SatchelScreen {...chrome} id={id} balances={balances} />}
      >
        {step === 1 ? <FormBody chain={chain} amt={amt} dest={dest} balances={balances} /> : <ReviewBody chain={chain} amt={amt} dest={dest} after={after} id={id} />}
      </FlowSheet>
      {overlay ? <div style={{ position: "absolute", inset: 0 }}>{overlay}</div> : null}
    </div>
  );
}

function FormBody({ chain, amt, dest, balances }: { chain: Chain; amt: string; dest: string; balances: Balances }) {
  const t = TICKER[chain];
  return (
    <>
      <AppSegmented items={CHAINS.map((c) => ({ key: c, label: TICKER[c], lead: <ChainFace chain={c} size={22} /> }))} selected={chain} />
      <div data-ui="amount" style={{ border: `2px solid ${C.lineStrong}`, background: C.sunken, borderRadius: 18, padding: "22px 16px 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ ...display(800), fontSize: 38, lineHeight: "42px", letterSpacing: "-0.03em", ...NUM }}>{amt}</span>
          <span style={{ ...sans(600), fontSize: 16, color: C.inkMuted }}>{t}</span>
        </div>
        <div style={{ marginTop: 12, ...sans(400), fontSize: 15, color: C.inkMuted, ...NUM }}>
          Available {balances[chain]} {t} <span style={{ ...sans(600), color: C.link, textDecoration: "underline", textUnderlineOffset: 3, marginLeft: 6 }}>Max</span>
        </div>
      </div>
      <div>
        <div style={{ ...sans(650), fontSize: 16, lineHeight: "22px" }}>To</div>
        <div data-ui="to" style={{ marginTop: 8, padding: "14px 14px 14px 14px", borderRadius: 16, background: C.sunken, border: `2px solid ${C.lineStrong}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ChainFace chain={chain} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <AddressText value={dest} size={14} style={{ lineHeight: "21px" }} />
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, ...sans(600), fontSize: 15, color: C.success }}>
              <Check size={16} strokeWidth={STROKE} />
              {CHAIN_NAME[chain]} address
            </div>
          </div>
          <X size={22} strokeWidth={STROKE} color={C.ink} style={{ flexShrink: 0 }} />
        </div>
      </div>
    </>
  );
}

function ReviewBody({ chain, amt, dest, after, id }: { chain: Chain; amt: string; dest: string; after: string; id: string }) {
  const t = TICKER[chain];
  return (
    <>
      <div data-ui="hero">
        <div style={{ ...display(800), fontSize: 36, lineHeight: "40px", letterSpacing: "-0.03em", ...NUM }}>
          {amt} {t}
        </div>
        <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 4 }}>
          to {truncate(dest, chain)} · {CHAIN_NAME[chain]}
        </div>
      </div>
      <div data-ui="to" style={{ borderRadius: 18, background: C.sunken, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Swatch />
          <div style={{ flex: 1 }}>
            <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px" }}>From</div>
            <div style={{ ...sans(400), fontSize: 13, color: C.inkMuted }}>Satchel #{id}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px", ...NUM }}>{AMOUNT_FEE[chain]}</div>
            <div style={{ ...sans(400), fontSize: 13, color: C.inkMuted }}>amount + fee</div>
          </div>
        </div>
        <div style={{ height: 1, background: C.line, margin: "14px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ChainFace chain={chain} size={32} />
          <span style={{ flex: 1, ...sans(650), fontSize: 15 }}>To</span>
          <span style={{ ...sans(650), fontSize: 15, ...NUM }}>
            +{amt} {t}
          </span>
        </div>
        <div style={{ paddingLeft: 44, marginTop: 8 }}>
          <AddressText value={dest} size={13.5} style={{ lineHeight: "21px" }} />
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, ...sans(600), fontSize: 14, color: C.success }}>
            <Check size={15} strokeWidth={STROKE} />
            {CHAIN_NAME[chain]} address
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ReviewKV k="Network fee (est.)" v={NETWORK_FEE[chain]} sub="paid by this Satchel" />
        <ReviewKV k={`Satchel #${id} after`} v={`${after} ${t}`} />
        <ReviewKV k="NEAR fee" v={NEAR_FEE} sub={"(gas + permanent signature record) ·\npaid by your NEAR account"} />
      </div>
      <InfoChip icon={<Hourglass size={18} strokeWidth={STROKE} />}>
        Signing: usually about 10 seconds
        <br />
        {CONFIRM[chain]}
      </InfoChip>
    </>
  );
}

function ReviewKV({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, ...sans(400), fontSize: 15, lineHeight: "21px" }}>
      <span style={{ color: C.inkMuted }}>{k}</span>
      <span style={{ textAlign: "right", ...NUM }}>
        {v}
        {sub ? <span style={{ display: "block", fontSize: 13, lineHeight: "18px", color: C.inkMuted, whiteSpace: "pre-line" }}>{sub}</span> : null}
      </span>
    </div>
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
      <div data-ui="request" style={{ ...TY.caption, color: C.inkMuted }}>Approve request to</div>
      <div style={{ ...mono(600), fontSize: 17, lineHeight: "24px", color: C.ink, marginTop: 2 }}>{contract}</div>
      <div style={{ marginTop: 14, borderRadius: 16, background: C.sunken, padding: "14px 16px" }}>
        <div style={{ ...sans(650), fontSize: 16, lineHeight: "22px", color: C.ink, ...NUM }}>{what}</div>
        <div style={{ height: 1, background: C.line, margin: "12px 0" }} />
        <KV k="Network fee" v={NEAR_FEE} />
        <KV k="Paid by" v={<span style={{ ...mono(450), fontSize: 13 }}>{account}</span>} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <span data-ui="reject" style={{ flex: 1, display: "block" }}>
          <UiButton block label="Reject" kind="neutralSecondary" />
        </span>
        <span data-ui="approve" style={{ flex: 1, display: "block" }}>
          <UiButton block label={approved ? "Approved" : "Approve"} icon={approved ? Check : undefined} kind="neutral" press={press} />
        </span>
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
