import { CircleCheck } from "lucide-react";
import { C, CHAIN, sans } from "../../brand/tokens";
import { ACCOUNTS, AMOUNTS, type Balances, CHAINS } from "./data";
import { Avatar, Dot, Field, NUM, Sheet, Spinner, STROKE, TY, UiButton } from "./kit";

/**
 * GiveSheet (P5): "Give Satchel #7" over the Satchel page (In-context board, Day). To `bob.near` + "Account found",
 * "Bob gets everything inside:" with the three amounts, then the coral "Give it to bob.near". No clean-history line
 * here (concepts-v2 §4.9 item 2: it keeps the reveal for T5).
 *
 * open     0..1 slides the sheet up over the scrim (full bleed over its parent; layer it over SatchelScreen or pass it
 *          as SatchelScreen's `overlay`)
 * typed    0..1 types the account into the field (caret 0..1 shows the caret while typing)
 * lookup   "none" | "checking" ("Checking account…") | "found" ("Account found")
 * cta      "idle" | "wallet" ("Approve in your wallet…") | "giving" ("Giving…")
 * press    0..1 the coral button's press       spin  turns the in-button spinner
 */

export interface GiveSheetProps {
  open?: number;
  to?: string;
  typed?: number;
  caret?: number;
  lookup?: "none" | "checking" | "found";
  cta?: "idle" | "wallet" | "giving";
  press?: number;
  spin?: number;
  balances?: Balances;
  id?: string;
  insetBottom?: number;
}

const firstName = (account: string) => {
  const n = account.split(".")[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export function GiveSheet({ open = 1, to = ACCOUNTS.bob, typed = 1, caret = 0, lookup = "found", cta = "idle", press = 0, spin = 0, balances = AMOUNTS.after, id = "7", insetBottom = 34 }: GiveSheetProps) {
  const shown = to.slice(0, Math.round(Math.max(0, Math.min(1, typed)) * to.length));
  const found = lookup === "found";
  const busy = cta !== "idle";
  return (
    <Sheet open={open} insetBottom={insetBottom}>
      <div style={{ ...TY.sheetTitle }}>Give Satchel #{id}</div>

      <div style={{ marginTop: 16, ...TY.caption, color: C.inkMuted }}>To</div>
      <Field
        style={{ marginTop: 6 }}
        value={shown}
        placeholder="name.near"
        focus={!found}
        caret={caret}
        right={found ? <CircleCheck size={20} strokeWidth={STROKE} color={C.success} /> : null}
      />
      <div style={{ height: 30, marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        {lookup === "found" ? (
          <>
            <Avatar account={to} size={24} />
            <span style={{ ...sans(650), fontSize: 14, color: C.success }}>Account found</span>
          </>
        ) : lookup === "checking" ? (
          <>
            <Spinner size={18} spin={spin} />
            <span style={{ ...TY.bodySm, color: C.inkMuted }}>Checking account…</span>
          </>
        ) : null}
      </div>

      <div style={{ marginTop: 10, padding: 14, borderRadius: 18, background: C.sunken }}>
        <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px", color: C.ink }}>{firstName(to)} gets everything inside:</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {CHAINS.map((c) => (
            <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...sans(600), fontSize: 13, lineHeight: "18px", padding: "7px 9px", borderRadius: 12, background: C.surface, color: C.ink, whiteSpace: "nowrap", ...NUM }}>
              <Dot chain={c} />
              {balances[c]} {CHAIN[c].ticker}
            </span>
          ))}
          {balances.usdc ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...sans(600), fontSize: 13, lineHeight: "18px", padding: "7px 9px", borderRadius: 12, background: C.surface, color: C.ink, whiteSpace: "nowrap", ...NUM }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: C.sky, boxShadow: `0 0 0 1.5px ${C.ink}` }} />
              {balances.usdc} USDC
            </span>
          ) : null}
        </div>
        <div style={{ ...TY.caption, color: C.inkMuted, marginTop: 10 }}>Its addresses and its history go with it.</div>
      </div>

      <UiButton
        block
        style={{ marginTop: 18 }}
        label={cta === "wallet" ? "Approve in your wallet…" : cta === "giving" ? "Giving…" : found ? `Give it to ${to}` : `Give Satchel #${id}`}
        busy={busy}
        spin={spin}
        press={busy ? 0 : press}
        disabled={!found && !busy}
      />
      <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted, textAlign: "center", marginTop: 10, opacity: found ? 1 : 0 }}>This can&apos;t be undone. Only {to} can give it back.</div>
    </Sheet>
  );
}
