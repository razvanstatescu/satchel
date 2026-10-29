import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, Gift, Tag } from "lucide-react";
import { C, type Chain, mono, sans } from "../../brand/tokens";
import { type PillKind, SatchelCard } from "../Sticker";
import { ACCOUNTS, ADDR7, AMOUNTS, type Balances, CHAIN_NAME, CHAINS, TICKER, truncate } from "./data";
import { AppBar, Avatar, CoinFace, NUM, PausedBanner, PhoneScreen, type PhoneChrome, SectionLabel, TY, UiButton } from "./kit";

/**
 * SatchelScreen (P2–P5, T4): the Satchel page on a phone, after the brand 2.0 In-context board: the card (coral band
 * "Satchel #7", what's inside as native chips, never fiat), who holds it, the per-chain rows with the chain charms'
 * faces and full balances, and Send (coral) / Give pinned at the bottom.
 *
 * balances   per chain (default: after the P3 sends, 0.0412 BTC · 0.85 ETH · 12.4 SOL; fill numbers before)
 *            Count up with fmtAmount(value, chain) from ./data.
 * pill       the card's pill: "new" (lemon), "sent", "paused", "attention"
 * listed     Paused for sale: the card's pill, the frozen banner, Send off (40 %) and Delist instead of Give
 * pressSend / pressGive  0..1 button presses
 * faces      optional charm faces per chain (e.g. { btc: { smile: 1.6 } } when it gulps its coin)
 * cardStyle / cardLift   move or hide the in-phone card while the world card leaves the phone
 */

export interface SatchelScreenProps extends PhoneChrome {
  id?: string;
  balances?: Balances;
  pill?: PillKind;
  listed?: boolean;
  pressSend?: number;
  pressGive?: number;
  owner?: string;
  sigCount?: number;
  faces?: Partial<Record<Chain, { blink?: number; smile?: number; look?: { x: number; y: number }; wide?: number }>>;
  cardStyle?: CSSProperties;
  cardLift?: number;
  overlay?: ReactNode;
}

export function SatchelScreen({
  id = "7",
  balances = AMOUNTS.after,
  pill,
  listed = false,
  pressSend = 0,
  pressGive = 0,
  owner = ACCOUNTS.alice,
  sigCount = 3,
  faces,
  cardStyle,
  cardLift = 0,
  overlay,
  ...chrome
}: SatchelScreenProps) {
  const footer = (
    <div style={{ display: "flex", gap: 10 }}>
      <UiButton label="Send" icon={ArrowUpRight} iconRight press={pressSend} disabled={listed} style={{ flex: 1 }} />
      {listed ? <UiButton label="Delist" icon={Tag} kind="secondary" press={pressGive} style={{ flex: 1 }} /> : <UiButton label="Give" icon={Gift} kind="secondary" press={pressGive} style={{ flex: 1 }} />}
    </div>
  );
  return (
    <PhoneScreen {...chrome} footer={footer} footerStyle={{ background: "transparent", borderTop: "none", paddingTop: 10 }} overlay={overlay}>
      <AppBar account={owner} />
      <div style={{ flex: 1, minHeight: 0, padding: "6px 16px 0", display: "flex", flexDirection: "column" }}>
        <SatchelCard
          id={id}
          width={358}
          label="Inside"
          total="3 chains"
          chips={CHAINS.map((c) => ({ chain: c, amount: balances[c] }))}
          pill={listed ? "paused" : pill}
          lift={cardLift}
          style={cardStyle}
        />
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, ...TY.bodySm, color: C.inkMuted }}>
          <Avatar account={owner} size={22} />
          <span>
            <span style={{ color: C.ink, fontWeight: 600 }}>Held by you</span> · {sigCount} {sigCount === 1 ? "signature" : "signatures"} on the record
          </span>
        </div>

        {listed ? <PausedBanner id={id} style={{ marginTop: 16 }} /> : null}

        <SectionLabel style={{ marginTop: listed ? 18 : 24 }}>Balances</SectionLabel>
        <div style={{ marginTop: 4 }}>
          {CHAINS.map((c, i) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 2 ? `1px solid ${C.line}` : undefined }}>
              <CoinFace chain={c} size={38} face={faces?.[c]} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TY.label, fontSize: 16, color: C.ink }}>{CHAIN_NAME[c]}</div>
                <div style={{ ...mono(450), fontSize: 12.5, lineHeight: "18px", color: C.inkMuted }}>{truncate(ADDR7[c], c)}</div>
              </div>
              <div style={{ ...sans(700), fontSize: 16, color: C.ink, ...NUM }}>
                {balances[c]} <span style={{ ...sans(600), color: C.inkMuted }}>{TICKER[c]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneScreen>
  );
}
