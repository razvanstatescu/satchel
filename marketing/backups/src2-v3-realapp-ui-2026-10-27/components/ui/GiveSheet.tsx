import type { ReactNode } from "react";
import { History, Info } from "lucide-react";
import { C, mono, sans } from "../../brand/tokens";
import { AppCard, FlowSheet, FootNote, holdingsSentence, Stepper } from "./app";
import { ACCOUNTS, AMOUNTS, type Balances } from "./data";
import { Avatar, Spinner, STROKE, UiButton } from "./kit";

/**
 * GiveSheet (P5): the app's give flow as a bottom sheet (X/give-recipient-found, give-review, give-wallet).
 *   step 1 "Give Satchel #7 · Step 1 of 2 · Who gets it": the card (Yours, Active), "To (NEAR account)", the field
 *          with bob.near, the account card ("bob.near · Account found · owns 1 Satchel"), Review.
 *   step 2 "Review gift · Step 2 of 2 · Review": the card tilted with the lemon "To bob.near" gift tag on a string,
 *          the bullets (bob.near gets everything inside …, only the new owner can sign, the history stays), "This
 *          can't be undone. Only bob.near can give it back." and the coral "Give it to bob.near".
 *          cta "wallet" / "giving" adds the stepper (Approve in your wallet → Handing it over on NEAR → Given).
 * Default step: 2 when the account is found and typed (or a cta is running), else 1.
 * Layered like before: pass it as SatchelScreen's `overlay` (it draws only the scrim and the sheet), or give it a
 * `backdrop` to render as a whole screen. open / typed / caret / lookup / cta / press / spin as before.
 * Layout boxes: GIVE_LAYOUT (review) and GIVE_RECIPIENT_LAYOUT in ./layout.
 */

export interface GiveSheetProps {
  open?: number;
  to?: string;
  from?: string;
  typed?: number;
  caret?: number;
  lookup?: "none" | "checking" | "found";
  step?: 1 | 2;
  cta?: "idle" | "wallet" | "giving";
  press?: number;
  spin?: number;
  balances?: Balances;
  id?: string;
  scroll?: number;
  backdrop?: ReactNode;
  statusBar?: boolean;
  insetTop?: number;
  insetBottom?: number;
}

export function GiveSheet({
  open = 1,
  to = ACCOUNTS.bob,
  from = ACCOUNTS.alice,
  typed = 1,
  caret = 0,
  lookup = "found",
  step,
  cta = "idle",
  press = 0,
  spin = 0,
  balances = AMOUNTS.after,
  id = "7",
  scroll,
  backdrop,
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
}: GiveSheetProps) {
  const found = lookup === "found";
  const st = step ?? (cta !== "idle" || (found && typed >= 1) ? 2 : 1);
  const busy = cta !== "idle";
  const shown = to.slice(0, Math.round(Math.max(0, Math.min(1, typed)) * to.length));
  const chrome = { statusBar, insetTop, insetBottom };

  const footer =
    st === 1 ? (
      <span data-ui="button" style={{ display: "block" }}>
        <UiButton block label="Review" press={found ? press : 0} disabled={!found} />
      </span>
    ) : (
      <>
        <FootNote icon={<Info size={17} strokeWidth={STROKE} color={C.ink} style={{ marginTop: 2 }} />} style={{ color: C.ink, ...sans(600), fontSize: 15, marginBottom: 12 }}>
          This can&apos;t be undone. Only {to} can give it back.
        </FootNote>
        <span data-ui="button" style={{ display: "block" }}>
          <UiButton block label={cta === "wallet" ? "Approve in your wallet…" : cta === "giving" ? "Giving…" : `Give it to ${to}`} busy={busy} spin={spin} press={busy ? 0 : press} />
        </span>
        {cta === "wallet" ? <FootNote style={{ marginTop: 10 }}>Check your NEAR wallet.</FootNote> : null}
      </>
    );

  return (
    <FlowSheet
      {...chrome}
      bare={!backdrop}
      backdrop={backdrop}
      title={st === 1 ? `Give Satchel #${id}` : "Review gift"}
      sub={st === 1 ? "Step 1 of 2 · Who gets it" : "Step 2 of 2 · Review"}
      open={open}
      footer={footer}
      bodyScroll={scroll ?? (st === 2 && busy ? (insetTop > 0 ? insetTop + 36 : 0) : 0)}
      bodyGap={18}
    >
      {st === 1 ? (
        <>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AppCard id={id} width={300} balances={balances} status="active" />
          </div>
          <div>
            <div style={{ ...sans(650), fontSize: 16, lineHeight: "22px" }}>To (NEAR account)</div>
            <div data-ui="to" style={{ marginTop: 8, height: 56, borderRadius: 14, border: `2px solid ${C.ink}`, boxShadow: "inset 0 0 0 2px #ffffff", background: C.sunken, display: "flex", alignItems: "center", padding: "0 16px", boxSizing: "border-box", ...mono(450), fontSize: 17, color: shown ? C.ink : C.inkMuted }}>
              {shown || (caret > 0 ? "" : "name.near")}
              {caret > 0 ? <span style={{ display: "inline-block", width: 2, height: 22, marginLeft: 1, background: C.ink, opacity: caret }} /> : null}
            </div>
            {found ? (
              <div data-ui="account" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, background: C.sunken }}>
                <Avatar account={to} size={40} />
                <div>
                  <div style={{ ...mono(450), fontSize: 15, lineHeight: "20px" }}>{to}</div>
                  <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted }}>Account found · owns 1 Satchel</div>
                </div>
              </div>
            ) : lookup === "checking" ? (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, ...sans(400), fontSize: 15, color: C.inkMuted }}>
                <Spinner size={18} spin={spin} />
                Checking account…
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div style={{ position: "relative", height: 250, display: "flex", justifyContent: "center" }}>
            <AppCard id={id} width={300} balances={balances} status="active" tilt={busy ? -2.5 : 0} lift={busy ? 1 : 0} style={{ marginTop: 10 }} />
            <GiftTag to={to} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Bullet icon={<Avatar account={to} size={32} />}>
              {to} gets everything inside: {holdingsSentence(balances)}. Its addresses go too, so coins sent to them later are {to}&apos;s.
            </Bullet>
            <Bullet icon={<Avatar account={from} size={32} />}>Only the new owner will be able to sign. You won&apos;t be able to send from it.</Bullet>
            <Bullet
              icon={
                <span style={{ width: 32, height: 32, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
                  <History size={17} strokeWidth={STROKE} color={C.ink} />
                </span>
              }
            >
              The signature history stays with the Satchel.
            </Bullet>
          </div>
          {busy ? (
            <Stepper
              spin={spin}
              rows={[
                { label: cta === "wallet" ? "Approve in your wallet" : "Approved in your wallet", state: cta === "wallet" ? "active" : "done" },
                { label: "Handing it over on NEAR", state: cta === "giving" ? "active" : "future" },
                { label: "Given", state: "future" },
              ]}
            />
          ) : null}
        </>
      )}
    </FlowSheet>
  );
}

/** The lemon gift tag hanging on a string from the review card: "To bob.near". */
function GiftTag({ to }: { to: string }) {
  return (
    <div data-ui="tag" style={{ position: "absolute", left: 160, top: 196, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ width: 2.5, height: 20, background: C.ink, marginLeft: 22 }} />
      <div style={{ transform: "rotate(-3deg)", transformOrigin: "22px 0", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 8px", borderRadius: 12, background: C.lemon, border: `2px solid ${C.ink}`, boxShadow: `0 3px 0 ${C.ink}`, ...sans(700), fontSize: 14, color: C.ink, whiteSpace: "nowrap" }}>
        <Avatar account={to} size={20} />
        To {to}
      </div>
    </div>
  );
}

function Bullet({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", ...sans(400), fontSize: 15, lineHeight: "22px", color: C.ink }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
