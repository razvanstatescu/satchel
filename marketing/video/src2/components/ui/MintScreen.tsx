import type { CSSProperties } from "react";
import { Check, Info, ShieldCheck } from "lucide-react";
import { C, type Chain, sans } from "../../brand/tokens";
import { SatchelCard } from "../Sticker";
import { ADDR7, CHAIN_NAME, CHAINS, truncate } from "./data";
import { AddressText, CoinFace, FlowHeader, Group, PhoneScreen, type PhoneChrome, Row, SectionLabel, Steps, STROKE, TY, UiButton } from "./kit";

/**
 * MintScreen (P1): /mint as a phone screen. The "New Satchel" preview card is the hero, then the three addresses it
 * will own, then the pinned Mint bar (kb/80 Mint; kb/82 §2.27: the button narrates the wallet).
 *
 * state: "idle" → "pressed" (the button sits 4px down) → "wallet" ("Approve in your wallet…") → "minting" ("Minting…")
 *        → "minted" (Satchel #7 with the lemon "New" badge, "Satchel #7 is yours.", the real addresses).
 * press 0..1 overrides the button press (animate the tap). spin turns the in-button spinner; pulse beats the active step.
 * addressReveal 0..1 types the three addresses in (default: 1 when minted, else 0); they print BTC → ETH → SOL.
 * cardStyle lets the scene hide or move the in-phone card while the "real" card leaps out of the phone.
 */

export type MintState = "idle" | "pressed" | "wallet" | "minting" | "minted";

export interface MintScreenProps extends PhoneChrome {
  state?: MintState;
  press?: number;
  spin?: number;
  pulse?: number;
  addressReveal?: number;
  id?: string;
  cardStyle?: CSSProperties;
}

export function MintScreen({ state = "idle", press, spin = 0, pulse = 0, addressReveal, id = "7", cardStyle, ...chrome }: MintScreenProps) {
  const minted = state === "minted";
  const busy = state === "wallet" || state === "minting";
  const reveal = addressReveal ?? (minted ? 1 : 0);
  const p = press ?? (state === "pressed" ? 1 : 0);

  const footer = (
    <>
      {minted ? (
        <div style={{ display: "flex", gap: 10 }}>
          <UiButton label="Add coins" style={{ flex: 1 }} />
          <UiButton label={`Open Satchel #${id}`} kind="secondary" style={{ flex: 1 }} />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <InfoCell label="You get" value="3 addresses" sub="Bitcoin · Ethereum · Solana" />
            <InfoCell label="Deposit" value="0.02 NEAR" sub="Unused part refunded" />
          </div>
          <UiButton
            block
            label={state === "wallet" ? "Approve in your wallet…" : state === "minting" ? "Minting…" : "Mint a Satchel"}
            busy={busy}
            spin={spin}
            press={busy ? 0 : p}
          />
        </>
      )}
    </>
  );

  return (
    <PhoneScreen {...chrome} footer={footer}>
      <FlowHeader title="Mint a Satchel" />
      <div style={{ flex: 1, minHeight: 0, padding: "6px 16px 0", display: "flex", flexDirection: "column" }}>
        <SatchelCard
          id={id}
          width={358}
          name={minted ? undefined : "New Satchel"}
          label={minted ? "Inside" : "Addresses on"}
          total="3 chains"
          chips={minted ? CHAINS.map((c) => ({ chain: c, amount: "0" })) : CHAINS.map((c) => ({ chain: c }))}
          pill={minted ? "new" : undefined}
          style={cardStyle}
        />

        {minted ? (
          <div style={{ marginTop: 22 }}>
            <div style={{ ...TY.title, fontSize: 28, lineHeight: "32px" }}>Satchel #{id} is yours.</div>
            <div style={{ ...TY.bodySm, color: C.inkMuted, marginTop: 4 }}>Minted on NEAR · a standard NEAR NFT</div>
          </div>
        ) : null}

        <SectionLabel style={{ marginTop: minted ? 20 : 24 }}>{minted ? "Its own addresses" : "It gets its own addresses"}</SectionLabel>
        <Group style={{ marginTop: 8 }}>
          {CHAINS.map((c, i) => (
            <AddressRow key={c} chain={c} index={i} reveal={reveal} minted={minted} />
          ))}
        </Group>

        {busy ? (
          <Steps
            style={{ marginTop: 14, gap: 7 }}
            pulse={pulse}
            steps={[
              ["Approve in your wallet", state === "wallet" ? "active" : "done"],
              ["Minting on NEAR", state === "minting" ? "active" : "future"],
              ["Minted", "future"],
            ]}
          />
        ) : !minted ? (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Only its holder can move the coins", "Every signature it makes goes on the record"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, ...TY.bodySm, color: C.ink }}>
                <ShieldCheck size={18} strokeWidth={STROKE} color={C.success} />
                {t}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10, ...TY.bodySm, color: C.inkMuted }}>
            <Info size={18} strokeWidth={STROKE} color={C.inkMuted} style={{ flexShrink: 0, marginTop: 1 }} />
            Anyone can fund it. Only its holder can send from it.
          </div>
        )}
      </div>
    </PhoneScreen>
  );
}

function AddressRow({ chain, index, reveal, minted }: { chain: Chain; index: number; reveal: number; minted: boolean }) {
  // staggered typing: BTC 0–0.45, ETH 0.275–0.725, SOL 0.55–1
  const local = Math.max(0, Math.min(1, (reveal - index * 0.275) / 0.45));
  const shown = local > 0;
  return (
    <Row divider={index > 0} style={{ padding: "10px 14px", minHeight: 59, boxSizing: "border-box" }}>
      <CoinFace chain={chain} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.label, color: C.ink }}>{CHAIN_NAME[chain]}</div>
        {shown ? (
          <AddressText value={truncate(ADDR7[chain], chain)} mode="truncated" size={13} reveal={local} />
        ) : (
          <div style={{ ...TY.caption, color: C.inkMuted }}>Its own {CHAIN_NAME[chain]} address</div>
        )}
      </div>
      {minted && local >= 0.999 ? <Check size={18} strokeWidth={2} color={C.success} /> : null}
    </Row>
  );
}

function InfoCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ ...TY.caption, color: C.inkMuted }}>{label}</div>
      <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px", color: C.ink }}>{value}</div>
      <div style={{ ...sans(400), fontSize: 12, lineHeight: "16px", color: C.inkMuted }}>{sub}</div>
    </div>
  );
}
