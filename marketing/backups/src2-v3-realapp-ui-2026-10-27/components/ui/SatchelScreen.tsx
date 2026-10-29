import type { CSSProperties, ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, CircleCheck, Copy, Gift, History, Info, Monitor, QrCode, ShieldCheck, Tag, Undo2 } from "lucide-react";
import { C, type Chain, display, sans } from "../../brand/tokens";
import type { PillKind } from "../Sticker";
import { AppCard, AppLink, AppTabs, AppTopBar, type AppStatus, ChainFace, Swatch, AppPill } from "./app";
import { ACCOUNTS, ADDR7, AMOUNTS, type Balances, CHAIN_NAME, CHAINS, PRICE, TICKER } from "./data";
import { AddressText, PhoneScreen, type PhoneChrome, STROKE, UiButton } from "./kit";

/**
 * SatchelScreen: the Satchel page on a phone as the real app draws it (S/wallet-owner-s1, wallet-owner-listed,
 * C/owner-ready, owner-listed). Top bar · "Satchel #7" + Wallet / Activity / Sell tabs · the charm-ledger card
 * (Yours, state pill) · Send (coral) / Add coins / Give / Sell · Inside (per chain: charm, amount, grouped address,
 * Copy · QR · explorer). It is also the dimmed page behind every flow sheet.
 *
 * balances        per chain (default after the P3 sends; count up with fmtAmount from ./data)
 * status          the card pill: "active" | "signing" | "paused" | "attention" | … (default from `listed` / `pill`)
 * pill            (old prop) "paused" → Paused for sale, "attention" → Needs attention; "new"/"sent" → Active
 * listed          for sale: the For sale panel, Send and Give dimmed, Stop selling, the paused note
 * tab             "wallet" (default) | "sell" (the owner's Sell tab: "Not for sale. ✓ Ready to list" + List for sale…,
 *                 or the listing panel with Stop selling when `listed`; then What buyers see)
 * pressSend / pressAddCoins / pressGive / pressSell / pressList  0..1 presses (pressGive also presses Stop selling)
 * activity        the top bar's live chip while signing, e.g. "Sending 0.0100 BTC · 0:02"
 * scroll          scrolls the page (px)            faces  optional charm faces in the Inside rows
 * cardStyle / cardLift   move or hide the in-phone card while the world card leaves the phone
 * Layout boxes: SATCHEL_LAYOUT in ./layout.
 */

export interface SatchelScreenProps extends PhoneChrome {
  id?: string;
  balances?: Balances;
  pill?: PillKind;
  status?: AppStatus;
  listed?: boolean;
  tab?: "wallet" | "sell";
  pressSend?: number;
  pressAddCoins?: number;
  pressGive?: number;
  pressSell?: number;
  pressList?: number;
  owner?: string;
  sigCount?: number;
  price?: string;
  activity?: string;
  spin?: number;
  scroll?: number;
  faces?: Partial<Record<Chain, { blink?: number; smile?: number; look?: { x: number; y: number }; wide?: number }>>;
  cardStyle?: CSSProperties;
  cardLift?: number;
  overlay?: ReactNode;
}

const EXPLORER: Record<Chain, string> = { btc: "mempool.space", evm: "Etherscan", sol: "Solana Explorer" };

export function SatchelScreen({
  id = "7",
  balances = AMOUNTS.after,
  pill,
  status,
  listed = false,
  tab = "wallet",
  pressSend = 0,
  pressAddCoins = 0,
  pressGive = 0,
  pressSell = 0,
  pressList = 0,
  owner = ACCOUNTS.alice,
  sigCount = 3,
  price = PRICE,
  activity,
  spin = 0,
  scroll = 0,
  cardStyle,
  cardLift = 0,
  overlay,
  ...chrome
}: SatchelScreenProps) {
  const st: AppStatus = status ?? (listed || pill === "paused" ? "paused" : pill === "attention" ? "attention" : "active");
  return (
    <PhoneScreen {...chrome} overlay={overlay}>
      <AppTopBar account={owner} activity={activity} spin={spin} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <div style={{ padding: "0 16px", transform: `translateY(${-scroll}px)` }}>
          {tab === "wallet" ? (
            <>
              <div style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em", marginTop: 14 }}>Satchel #{id}</div>
              <AppTabs tabs={["Wallet", "Activity", "Sell"]} active="Wallet" style={{ marginTop: 14 }} />
              <AppCard id={id} width={358} balances={balances} status={st} spin={spin} lift={cardLift} style={{ marginTop: 22, ...cardStyle }} />
              {listed ? <ForSalePanel price={price} style={{ marginTop: 20 }} /> : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: listed ? 18 : 20 }}>
                <span data-ui="send">
                  <UiButton block label="Send" icon={ArrowUp} press={pressSend} disabled={listed} disabledLook="dim" kind={listed ? "tertiary" : "primary"} />
                </span>
                <span data-ui="addCoins">
                  <UiButton block label="Add coins" icon={ArrowDown} kind="secondary" press={pressAddCoins} />
                </span>
                <span data-ui="give">
                  <UiButton block label="Give" icon={Gift} kind={listed ? "tertiary" : "secondary"} press={listed ? 0 : pressGive} disabled={listed} disabledLook="dim" />
                </span>
                <span data-ui="sell">
                  {listed ? <UiButton block label="Stop selling" icon={Undo2} kind="secondary" press={pressGive || pressSell} /> : <UiButton block label="Sell" icon={Tag} kind="secondary" press={pressSell} />}
                </span>
              </div>
              {listed ? (
                <div style={{ marginTop: 14, display: "flex", gap: 8, ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted }}>
                  <Info size={16} strokeWidth={STROKE} style={{ flexShrink: 0, marginTop: 2 }} />
                  Sending and giving are paused while it&apos;s for sale.
                </div>
              ) : null}
              <div style={{ ...display(700), fontSize: 20, lineHeight: "26px", marginTop: 30 }}>Inside</div>
              <div data-ui="inside" style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "0 16px" }}>
                {CHAINS.map((c, i) => (
                  <InsideRow key={c} chain={c} amount={balances[c]} divider={i > 0} />
                ))}
              </div>
            </>
          ) : (
            <SellTab id={id} status={st} listed={listed} price={price} pressList={pressList || pressSell} pressStop={pressGive} sigCount={sigCount} />
          )}
        </div>
      </div>
    </PhoneScreen>
  );
}

function InsideRow({ chain, amount, divider }: { chain: Chain; amount: string; divider: boolean }) {
  return (
    <div style={{ padding: "16px 0", borderTop: divider ? `1px solid ${C.line}` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ChainFace chain={chain} size={32} />
        <span style={{ flex: 1, ...sans(600), fontSize: 15, color: C.ink }}>{CHAIN_NAME[chain]}</span>
        <span style={{ ...sans(650), fontSize: 16, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
          {amount} {TICKER[chain]}
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        <AddressText value={ADDR7[chain]} size={13.5} style={{ lineHeight: "22px" }} />
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <Chip icon={<Copy size={15} strokeWidth={STROKE} />} label="Copy" />
        <Chip icon={<QrCode size={15} strokeWidth={STROKE} />} label="QR" />
        <AppLink style={{ fontSize: 14, marginLeft: 6 }}>{EXPLORER[chain]}</AppLink>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 999, background: C.sunken, ...sans(600), fontSize: 14, color: C.ink }}>
      {icon}
      {label}
    </span>
  );
}

/** The owner's For sale panel on the Wallet tab (listed). */
function ForSalePanel({ price, style }: { price: string; style?: CSSProperties }) {
  return (
    <div data-ui="forSale" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: "18px 20px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Tag size={20} strokeWidth={STROKE} color={C.frozen} />
        <span style={{ ...display(700), fontSize: 20, lineHeight: "26px" }}>For sale at {price}</span>
      </div>
      <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 6 }}>Listing #7 · listed 2 h ago. Anyone can buy it right away.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, ...sans(600), fontSize: 14, lineHeight: "20px", color: C.success }}>
        <ShieldCheck size={16} strokeWidth={STROKE} style={{ flexShrink: 0, marginTop: 2 }} />
        Buyers see: Clean history, checked just now.
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={{ ...sans(600), fontSize: 15, color: C.link, textDecoration: "underline", textUnderlineOffset: 3 }}>See the listing</span>
      </div>
    </div>
  );
}

/** The owner's Sell tab (C/owner-ready, C/owner-listed), then What buyers see. */
function SellTab({ id, status, listed, price, pressList, pressStop, sigCount }: { id: string; status: AppStatus; listed: boolean; price: string; pressList: number; pressStop: number; sigCount: number }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <Swatch />
        <span style={{ ...display(700), fontSize: 20, lineHeight: "26px", flex: 1 }}>Satchel #{id}</span>
        <AppPill status={status} />
      </div>
      <AppTabs tabs={["Wallet", "Activity", "Sell"]} active="Sell" style={{ marginTop: 18 }} />
      <div data-ui="sellPanel" style={{ marginTop: 22, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: "20px 20px 22px" }}>
        {listed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tag size={20} strokeWidth={STROKE} color={C.frozen} />
              <span style={{ ...display(700), fontSize: 20, lineHeight: "26px" }}>For sale at {price} · Listing #7</span>
            </div>
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "21px", color: C.ink, marginTop: 10 }}>Stopping is instant: nobody can buy it after that, and you can send and give again.</div>
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "21px", color: C.inkMuted, marginTop: 10 }}>To change the price, stop selling and list it again.</div>
            <span data-ui="stopSelling" style={{ display: "inline-block", marginTop: 16 }}>
              <UiButton label="Stop selling" icon={Undo2} kind="secondary" press={pressStop} style={{ minWidth: 260 }} />
            </span>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tag size={20} strokeWidth={STROKE} color={C.ink} />
              <span style={{ ...display(700), fontSize: 20, lineHeight: "26px" }}>Not for sale.</span>
            </div>
            <div data-ui="readyToList" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, ...sans(600), fontSize: 15, color: C.success }}>
              <CircleCheck size={17} strokeWidth={STROKE} />
              Ready to list
            </div>
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "21px", color: C.inkMuted, marginTop: 10 }}>A Satchel can be listed after 250 blocks (about 2 min 20 s) without a signature. Then anyone can buy it right away.</div>
            <span data-ui="listForSale" style={{ display: "inline-block", marginTop: 16 }}>
              <UiButton label="List for sale…" press={pressList} />
            </span>
          </>
        )}
      </div>
      <div style={{ ...display(700), fontSize: 20, lineHeight: "26px", marginTop: 28 }}>What buyers see</div>
      <div style={{ ...sans(400), fontSize: 16, lineHeight: "24px", color: C.inkMuted, marginTop: 4 }}>A buyer&apos;s browser runs this same check before Buy turns on.</div>
      <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: 20 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: C.sunken, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <ShieldCheck size={26} strokeWidth={STROKE} color={C.success} />
          </span>
          <div>
            <div style={{ ...sans(500), fontSize: 14, color: C.inkMuted }}>Clean history</div>
            <div style={{ ...display(700), fontSize: 20, lineHeight: "26px" }}>Clean. No past signature can move these coins.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
          {Array.from({ length: sigCount }).map((_, i) => (
            <span key={i} style={{ width: 30, height: 30, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
              <Check size={16} strokeWidth={STROKE} color={C.success} />
            </span>
          ))}
          <span style={{ ...sans(600), fontSize: 14, marginLeft: 6 }}>
            {sigCount} of {sigCount} can&apos;t move coins
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, ...sans(400), fontSize: 14, color: C.inkMuted }}>
          <History size={15} strokeWidth={STROKE} />
          Checked in your browser just now
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, ...sans(400), fontSize: 14, color: C.inkMuted }}>
          <Monitor size={15} strokeWidth={STROKE} />
          Runs in your browser. Satchel&apos;s server isn&apos;t trusted for this.
        </div>
      </div>
    </>
  );
}
