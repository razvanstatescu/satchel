import type { CSSProperties } from "react";
import { ArrowDown, CircleCheck } from "lucide-react";
import { C, display, mono, sans } from "../../brand/tokens";
import { AppCard, AppTopBar, ChainFace, FlowSheet, FootNote, Stepper } from "./app";
import { ACCOUNTS } from "./data";
import { PhoneScreen, type PhoneChrome, STROKE, UiButton } from "./kit";

/**
 * MintScreen (P1): the app's Mint sheet over My Satchels (H/mint-ready, H/mint-done-first). The "New Satchel" preview
 * card with its lemon New sticker and the three "… address" rows, "You get" (green check circles), Deposit, and the
 * pinned "Mint a Satchel". Done: the charms on their strap, the minted card (Yours, Active), "Satchel #7 is yours.",
 * "Minted in faf9ae…e14e", then Add coins (coral) and Open Satchel #7.
 *
 * state: "idle" → "pressed" → "wallet" ("Approve in your wallet…" + the stepper) → "minting" ("Minting…") → "minted"
 * press 0..1 overrides the button press · spin turns the spinners · open 0..1 slides the sheet up
 * cardStyle moves or hides the in-sheet card while the world card leaves the phone.
 * (addressReveal is kept for compatibility; the real Mint sheet shows no addresses, the scene prints the tags.)
 * Layout boxes: MINT_LAYOUT in ./layout.
 */

export type MintState = "idle" | "pressed" | "wallet" | "minting" | "minted";

export interface MintScreenProps extends PhoneChrome {
  state?: MintState;
  press?: number;
  spin?: number;
  pulse?: number;
  addressReveal?: number;
  id?: string;
  open?: number;
  cardStyle?: CSSProperties;
}

const GET = ["Its own Bitcoin address", "Its own Ethereum address", "Its own Solana address", "Only its owner can move the coins", "A public record of every signature it makes"];

export function MintScreen({ state = "idle", press, spin = 0, id = "7", open = 1, cardStyle, statusBar = true, insetTop = 54, insetBottom = 34 }: MintScreenProps) {
  const minted = state === "minted";
  const busy = state === "wallet" || state === "minting";
  const p = press ?? (state === "pressed" ? 1 : 0);
  const chrome = { statusBar, insetTop, insetBottom };

  const footer = minted ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span data-ui="addCoins">
        <UiButton block label="Add coins" icon={ArrowDown} press={p} />
      </span>
      <span data-ui="open">
        <UiButton block label={`Open Satchel #${id}`} kind="tertiary" />
      </span>
    </div>
  ) : (
    <>
      <span data-ui="button" style={{ display: "block" }}>
        <UiButton block label={state === "wallet" ? "Approve in your wallet…" : state === "minting" ? "Minting…" : "Mint a Satchel"} busy={busy} spin={spin} press={busy ? 0 : p} />
      </span>
      {state === "wallet" ? <FootNote style={{ marginTop: 10 }}>Check your NEAR wallet.</FootNote> : null}
    </>
  );

  return (
    <FlowSheet {...chrome} title="Mint a Satchel" full={false} open={open} footer={footer} footerLine={false} backdrop={<MySatchelsPage {...chrome} />} bodyGap={18}>
      {minted ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div data-ui="charms" style={{ position: "relative", width: 208, height: 96, marginBottom: 8 }}>
            {/* the app's compact charm strap (ChainCharms layout="strap"): a 10px strap, coins hanging close under it */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 10, borderRadius: 5, background: C.ink }} />
            {(["btc", "evm", "sol"] as const).map((c, i) => (
              <div key={c} style={{ position: "absolute", left: 6 + i * 68, top: 10, width: 60, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 5, height: 18, borderRadius: 3, background: C.ink }} />
                <ChainFace chain={c} size={60} style={{ marginTop: -4 }} />
              </div>
            ))}
            <SparkleStar size={22} style={{ position: "absolute", top: -6, right: -32 }} />
            <SparkleStar size={16} style={{ position: "absolute", top: 22, left: -28 }} />
          </div>
          <AppCard id={id} width={300} balances={{ btc: "0", evm: "0", sol: "0" }} status="active" badge="yours" style={cardStyle} />
          <div data-ui="done" style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em", marginTop: 22, textAlign: "center" }}>
            Satchel #{id} is yours.
          </div>
          <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 4 }}>
            Minted in <span style={{ ...mono(450), color: C.link, textDecoration: "underline", textUnderlineOffset: 3 }}>faf9ae…e14e</span>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AppCard width={300} preview style={cardStyle} />
          </div>
          <div>
            <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px" }}>You get</div>
            <div data-ui="youGet" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {GET.map((g) => (
                <div key={g} style={{ display: "flex", alignItems: "flex-start", gap: 10, ...sans(400), fontSize: 15, lineHeight: "22px" }}>
                  <CircleCheck size={20} strokeWidth={STROKE} color={C.success} style={{ flexShrink: 0, marginTop: 1 }} />
                  {g}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", ...sans(400), fontSize: 15, lineHeight: "22px" }}>
            <span style={{ color: C.inkMuted }}>Deposit</span>
            <span style={{ textAlign: "right" }}>
              0.02&nbsp;NEAR
              <span style={{ display: "block", ...sans(400), fontSize: 13, lineHeight: "18px", color: C.inkMuted }}>unused part refunded</span>
            </span>
          </div>
          {busy ? (
            <Stepper
              spin={spin}
              rows={[
                { label: state === "wallet" ? "Approve in your wallet" : "Approved in your wallet", state: state === "wallet" ? "active" : "done" },
                { label: "Minting on NEAR", state: state === "minting" ? "active" : "future" },
                { label: "Minted", state: "future" },
              ]}
            />
          ) : null}
        </>
      )}
    </FlowSheet>
  );
}

/** My Satchels behind the Mint sheet: the top bar, the title, an empty card slot. */
export function MySatchelsPage(chrome: PhoneChrome) {
  return (
    <PhoneScreen {...chrome}>
      <AppTopBar account={ACCOUNTS.alice} />
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em" }}>My Satchels</div>
        <div style={{ marginTop: 24, height: 226, borderRadius: 28, background: C.sunken }} />
      </div>
    </PhoneScreen>
  );
}

/** The app's sparkle: a four-point lemon star with an ink outline. */
export function SparkleStar({ size = 20, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", ...style }} aria-hidden>
      <path d="M12 1.5c.9 5.2 3.3 7.6 9 8.5-5.7.9-8.1 3.3-9 9-.9-5.7-3.3-8.1-9-9 5.7-.9 8.1-3.3 9-8.5Z" fill={C.lemon} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}
