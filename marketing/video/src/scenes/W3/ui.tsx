import type { CSSProperties, ReactNode } from "react";
import { Check, CircleDashed, Hourglass, Minimize2, Wallet, X } from "lucide-react";
import { C, F, display, type Chain } from "../../brand/tokens";
import { Avatar, BuyButton, ChainMark, Swatch, SIGN_COPY } from "../../components/product";

/**
 * W3's product pieces: the Send FlowShell (480 px dialog) with its Review step (ReviewCard / OutcomeCard) and its
 * tracker step (SigningProgress), a NEUTRAL NEAR-wallet approval sheet (no real wallet's name or brand), and the
 * compact "Sent" receipt row. Ported from apps/web/src/components/client/{FlowShell,SendFlow,SigningProgress}.tsx
 * with the product copy (apps/web/src/lib/copy.ts send / sign), mainnet wording.
 * All pure (no useCurrentFrame): the scene drives every reveal value.
 *
 * Scale: product px × KP, with a 28 px floor for anything that has to be read.
 */
export const KP = 1.9;
export const PW = 480 * KP; // panel width
export const HEADER_H = 56 * KP; // FlowShell header (h-14)
export const PAD = 16 * KP; // px-4 / py-4
const fs = (px: number, min = 28) => Math.max(min, px * KP);

export const SEND = {
  id: "8",
  amount: "0.0100 BTC",
  total: "−0.01000282 BTC", // amount + 282 sats fee (U+2212)
  inAmount: "+0.0100 BTC",
  fee: "~282 sats",
  to: "bc1q95j44dlwk79h30ncuxaz9cdsq0dwf38emk29uc", // a checksum-valid demo address (no one's wallet)
  toShort: "bc1q95j4…29uc",
  network: "Bitcoin",
  txShort: "4f1c9a2e…b07d3e",
  sentAt: "14:02:19",
  contract: "satchel.satchelhq.near",
  account: "alice.near",
};

/** The other two "any chain" sends (amounts leave room for each chain's fee). */
export const RECEIPTS: { chain: Chain; amount: string; to: string }[] = [
  { chain: "btc", amount: "0.0100 BTC", to: SEND.toShort },
  { chain: "evm", amount: "0.0200 ETH", to: "0x53F9…1C2A" },
  { chain: "sol", amount: "0.5000 SOL", to: "7xKX…Yp2W" },
];

const mono = (size: number): CSSProperties => ({ fontFamily: F.mono, fontSize: size, fontFeatureSettings: '"zero" 1', fontVariantNumeric: "tabular-nums" });

// ---------------------------------------------------------------------------------------------------------------
// FlowShell frame

export function ShellHeader({ title, step, progress, icon }: { title: ReactNode; step: string; progress: number; icon: "close" | "minimize" }) {
  const Icon = icon === "close" ? X : Minimize2;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: HEADER_H, display: "flex", alignItems: "center", gap: 8 * KP, padding: `0 ${8 * KP}px`, borderBottom: `${1.5}px solid ${C.line}` }}>
      <span style={{ width: 44 * KP, height: 44 * KP, display: "inline-grid", placeItems: "center", color: C.ink, flexShrink: 0 }}>
        <Icon size={20 * KP} strokeWidth={1.75} />
      </span>
      <div style={{ flex: 1, overflow: "hidden", fontFamily: F.sans, fontSize: fs(20), fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>{title}</div>
      <span style={{ paddingRight: 12 * KP, fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted, whiteSpace: "nowrap" }}>{step}</span>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: -1.5, height: 2 * KP, background: C.line }}>
        <span style={{ display: "block", height: "100%", width: `${progress * 100}%`, background: C.brand }} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Review step

/** "Send" + balance-hero amount + "to bc1q…· Bitcoin". Rendered at panel scale; the scene flies it in from the hero. */
export function AmountGroup({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", whiteSpace: "nowrap", ...style }}>
      <span style={{ fontFamily: F.sans, fontSize: fs(14), lineHeight: 1.25, fontWeight: 600, color: C.inkMuted }}>Send</span>
      <span style={{ ...display(700, 96), fontSize: 48 * KP, lineHeight: `${52 * KP}px`, letterSpacing: "-0.02em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>{SEND.amount}</span>
      <span style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: 1.3, color: C.inkMuted }}>
        to {SEND.toShort} · {SEND.network}
      </span>
    </div>
  );
}
export const AMOUNT_W = 436; // rendered width of AmountGroup (measured in stills; for the hero centring)
export const AMOUNT_H = 38 + 52 * KP + 36;

const rowIn = (p: number): CSSProperties => ({ opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 26}px)` });

/** Full grouped address: 4-char groups, first two and last in ink 600, the middle in ink-muted (AddressDisplay). */
export function GroupedAddress({ address, shown, size }: { address: string; shown: number; size: number }) {
  const g: string[] = [];
  for (let i = 0; i < address.length; i += 4) g.push(address.slice(i, i + 4));
  return (
    <span style={{ ...mono(size), lineHeight: 1.3, display: "inline" }}>
      {g.map((part, i) => {
        const strong = i < 2 || i === g.length - 1;
        const vis = i < shown;
        return (
          <span key={i} style={{ display: "inline-block", fontWeight: strong ? 600 : 450, color: strong ? C.ink : C.inkMuted, marginRight: i === g.length - 1 ? 0 : "0.35em", opacity: vis ? 1 : 0 }}>
            {part}
          </span>
        );
      })}
    </span>
  );
}

export function ReviewBody({ amountVisible, from, to, addrShown, check, fee }: { amountVisible: boolean; from: number; to: number; addrShown: number; check: number; fee: number }) {
  return (
    <div style={{ padding: PAD, display: "flex", flexDirection: "column", gap: 16 * KP }}>
      <AmountGroup style={{ opacity: amountVisible ? 1 : 0 }} />
      {/* OutcomeCard */}
      <div style={{ borderRadius: 14 * KP, background: C.surfaceRaised, overflow: "hidden", opacity: Math.min(1, from * 2) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * KP, padding: 12 * KP, ...rowIn(from) }}>
          <Swatch width={20 * KP} body="#251709" />
          <span style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), fontWeight: 600, color: C.ink }}>From · Satchel #{SEND.id}</span>
          <span style={{ textAlign: "right", fontFamily: F.sans, fontSize: fs(14), fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
            {SEND.total}
            <span style={{ display: "block", fontSize: fs(13), fontWeight: 400, color: C.inkMuted }}>amount + fee</span>
          </span>
        </div>
        <div style={{ height: 1.5, background: C.line, opacity: to }} />
        <div style={{ padding: 12 * KP, ...rowIn(to) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * KP }}>
            <ChainMark chain="btc" size={24 * KP} />
            <span style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), fontWeight: 600, color: C.ink }}>To</span>
            <span style={{ fontFamily: F.sans, fontSize: fs(14), fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{SEND.inAmount}</span>
          </div>
          <div style={{ marginTop: 8 * KP }}>
            <GroupedAddress address={SEND.to} shown={addrShown} size={fs(13, 30)} />
          </div>
          <div style={{ marginTop: 4 * KP, display: "flex", alignItems: "center", gap: 4 * KP, fontFamily: F.sans, fontSize: fs(13), color: C.success, opacity: check, transform: `translateX(${(1 - check) * -12}px)` }}>
            <Check size={14 * KP} strokeWidth={1.75} />
            {SEND.network} address
          </div>
        </div>
      </div>
      {/* fee row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 * KP, ...rowIn(fee) }}>
        <span style={{ fontFamily: F.sans, fontSize: fs(15), color: C.inkMuted }}>Network fee (est.)</span>
        <span style={{ textAlign: "right", fontFamily: F.sans, fontSize: fs(15), color: C.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
          {SEND.fee}
          <span style={{ display: "block", fontSize: fs(13), color: C.inkMuted }}>paid by this Satchel</span>
        </span>
      </div>
    </div>
  );
}

/** The pinned action area: finality line, the brass CTA, the helper line. */
export function ReviewAction({ show, press, label, sheen }: { show: number; press: number; label: ReactNode; sheen: number }) {
  return (
    <div style={{ borderTop: `1.5px solid ${C.line}`, background: C.surface, padding: `${12 * KP}px ${PAD}px ${PAD}px`, opacity: show, transform: `translateY(${(1 - show) * 24}px)` }}>
      <p style={{ margin: `0 0 ${8 * KP}px`, fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted }}>Bitcoin transfers are final. Check the address above.</p>
      <BuyButton label={label} k={KP} press={press} sheen={sheen} style={{ fontSize: 32 }} />
      <p style={{ margin: `${8 * KP}px 0 0`, fontFamily: F.sans, fontSize: fs(13), lineHeight: 1.3, color: C.inkMuted }}>Your wallet will ask you to approve a request to {SEND.contract}.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Tracker step (SigningProgress)

export type RowState = "future" | "active" | "done";

function RowIcon({ state, pulse, hourglass }: { state: RowState; pulse: number; hourglass?: boolean }) {
  const s = 20 * KP;
  if (hourglass) return <Hourglass size={s} strokeWidth={1.75} color={C.frozen} />;
  if (state === "done") return <Check size={s} strokeWidth={1.75} color={C.success} />;
  if (state === "active") return <span style={{ width: 10 * KP, height: 10 * KP, borderRadius: 99, background: C.frozen, opacity: pulse }} />;
  return <CircleDashed size={s} strokeWidth={1.75} color={C.inkMuted} />;
}

export function TrackerRow({ state, label, pulse = 1, right, evidence, hourglass, pop = 1 }: { state: RowState; label: ReactNode; pulse?: number; right?: ReactNode; evidence?: ReactNode; hourglass?: boolean; pop?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 * KP }}>
      <span style={{ width: 20 * KP, height: 20 * KP, marginTop: 4, display: "inline-grid", placeItems: "center", flexShrink: 0, transform: `scale(${pop})` }}>
        <RowIcon state={state} pulse={pulse} hourglass={hourglass} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: F.sans, fontSize: fs(15, 32), lineHeight: 1.3, fontWeight: state === "active" ? 600 : 400, color: state === "future" ? C.inkMuted : C.ink, whiteSpace: "nowrap" }}>{label}</p>
        {evidence ? <div style={{ marginTop: 2 * KP }}>{evidence}</div> : null}
      </div>
      {right ? <span style={{ fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", marginTop: 6 }}>{right}</span> : null}
    </div>
  );
}

export function TrackerBody({
  sent,
  heading,
  timer,
  pulse,
  signState,
  bcState,
  confirmActive,
  creditLit,
}: {
  sent: boolean;
  heading: ReactNode;
  timer: string | null;
  pulse: number;
  signState: RowState;
  bcState: RowState;
  confirmActive: boolean;
  creditLit: number;
}) {
  return (
    <div style={{ padding: PAD }}>
      <div style={{ fontFamily: F.sans, fontSize: fs(20, 46), lineHeight: 1.2, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>{heading}</div>
      <p style={{ margin: 0, fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted }}>to {SEND.toShort}</p>
      <p style={{ margin: `${1 * KP}px 0 0`, fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted, opacity: sent ? 0 : 1 }}>Usually about 10 seconds.</p>
      <div style={{ marginTop: 14 * KP, display: "flex", flexDirection: "column", gap: 12 * KP }}>
        <TrackerRow state="done" label={SIGN_COPY.wallet.done} />
        <TrackerRow state={signState} pulse={pulse} label={SIGN_COPY.mpc[signState]} right={signState === "active" ? timer : null} />
        <TrackerRow
          state={bcState}
          pulse={pulse}
          label={bcState === "active" ? SIGN_COPY.broadcast.active(SEND.network) : SIGN_COPY.broadcast.done(SEND.network)}
          right={bcState === "done" ? SEND.sentAt : null}
          evidence={bcState === "done" ? <span style={{ ...mono(fs(13)), color: C.ink }}>{SEND.txShort}</span> : null}
        />
        <TrackerRow
          state={confirmActive ? "active" : "future"}
          hourglass={confirmActive}
          label={confirmActive ? SIGN_COPY.confirm.active : SIGN_COPY.confirm.future}
          evidence={confirmActive ? <span style={{ fontFamily: F.sans, fontSize: fs(13), color: C.inkMuted }}>In mempool.</span> : null}
        />
      </div>
      <div style={{ marginTop: 16 * KP, fontFamily: F.sans, fontSize: fs(13), lineHeight: 1.35, color: C.inkMuted }}>
        <p style={{ margin: 0 }}>{sent ? "You can close this tab. Activity keeps tracking it." : "Keep this tab open until it says Sent."}</p>
        <p style={{ margin: 0, color: creditLit > 0 ? mixHex(C.inkMuted, C.ink, creditLit) : C.inkMuted, fontWeight: creditLit > 0.5 ? 600 : 400 }}>{SIGN_COPY.credit}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The NEUTRAL wallet approval sheet (no real wallet's name or brand)

export const SHEET_W = 860;

export function WalletSheet({ press, approved }: { press: number; approved: number }) {
  return (
    <div
      style={{
        width: SHEET_W,
        boxSizing: "border-box",
        borderRadius: 34,
        background: C.surface,
        boxShadow: `0 40px 90px rgba(0,0,0,0.6), inset 0 0 0 1.5px ${C.lineStrong}`,
        padding: "34px 44px 40px",
        color: C.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ width: 72, height: 72, borderRadius: 999, display: "inline-grid", placeItems: "center", background: C.surfaceRaised, boxShadow: `0 0 0 1.5px ${C.lineStrong}`, color: C.ink }}>
          <Wallet size={38} strokeWidth={1.75} />
        </span>
        <span style={{ flex: 1, fontFamily: F.sans, fontSize: 44, fontWeight: 600 }}>Your NEAR wallet</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, borderRadius: 999, background: C.surfaceRaised, padding: "8px 18px 8px 8px" }}>
          <Avatar account={SEND.account} size={44} />
          <span style={{ ...mono(28), color: C.ink }}>{SEND.account}</span>
        </span>
      </div>
      <div style={{ height: 1.5, background: C.line, margin: "30px -44px 30px" }} />
      <p style={{ margin: 0, fontFamily: F.sans, fontSize: 46, fontWeight: 650, lineHeight: 1.15 }}>Approve request to</p>
      <p style={{ margin: "6px 0 0", ...mono(38), fontWeight: 600, color: C.ink }}>{SEND.contract}</p>
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 20, borderRadius: 22, background: C.surfaceRaised, padding: "22px 26px" }}>
        <ChainMark chain="btc" size={60} />
        <span style={{ fontFamily: F.sans, fontSize: 36, fontWeight: 600 }}>
          Send {SEND.amount} from Satchel #{SEND.id}
        </span>
      </div>
      <div style={{ marginTop: 34, display: "flex", gap: 20 }}>
        <span style={{ flex: 1, height: 96, borderRadius: 24, display: "grid", placeItems: "center", boxShadow: `inset 0 0 0 2px ${C.lineStrong}`, fontFamily: F.sans, fontSize: 34, fontWeight: 600, color: C.ink }}>Reject</span>
        <span
          style={{
            flex: 1.5,
            height: 96,
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background: mixHex(C.ink, "#cfc3b4", press),
            transform: `scale(${1 - 0.03 * press})`,
            fontFamily: F.sans,
            fontSize: 34,
            fontWeight: 650,
            color: C.ground,
          }}
        >
          {approved > 0 ? <Check size={36} strokeWidth={2.25} style={{ opacity: approved, transform: `scale(${0.6 + 0.4 * approved})` }} /> : null}
          {approved > 0.5 ? "Approved" : "Approve"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The compact "Sent" receipt row (the tracker header, collapsed)

export const ROW_H = 160;

export function ReceiptRow({ chain, amount, to, markIn = 1, checkIn = 1 }: { chain: Chain; amount: string; to: string; markIn?: number; checkIn?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, height: "100%", padding: `0 ${PAD + 6}px` }}>
      <span style={{ opacity: markIn, transform: `scale(${0.6 + 0.4 * markIn})`, display: "inline-flex" }}>
        <ChainMark chain={chain} size={88} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.sans, fontSize: 50, lineHeight: 1.15, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>Sent {amount}</div>
        <div style={{ fontFamily: F.sans, fontSize: 30, color: C.inkMuted, whiteSpace: "nowrap" }}>to {to}</div>
      </div>
      <span style={{ opacity: checkIn, transform: `scale(${0.5 + 0.5 * checkIn})`, display: "inline-flex" }}>
        <Check size={52} strokeWidth={2} color={C.success} />
      </span>
    </div>
  );
}

export function mixHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.max(0, Math.min(1, t));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
