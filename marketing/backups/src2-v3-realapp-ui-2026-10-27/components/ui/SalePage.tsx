import type { CSSProperties, ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, FileCode, History, Monitor, Moon, ShieldAlert, ShieldCheck, Snowflake, Sparkles, Store, Sun, Tag, TriangleAlert, Wallet } from "lucide-react";
import { Lockup } from "../../brand/Logo";
import { C, display, mono, sans } from "../../brand/tokens";
import { AppCard, AppLink, AppTabs, ChainFace, holdingsSentence } from "./app";
import { ACCOUNTS, AMOUNTS, appPillWord, appRecordLabel, type Balances, CHAINS, HISTORY_4, HISTORY_7, type HistoryRecord, PRICE, SATCHEL4, TICKER } from "./data";
import { Avatar, popScale, Spinner, STROKE, UiButton } from "./kit";
import { SparkleStar } from "./MintScreen";

/**
 * SalePage (T5–T7): Satchel #7's Buy tab in carol.near's browser as the real app draws it at 1280 (C/buy-checking,
 * buy-clean, buy-recheck, buy-wallet, buy-done, buy-blocked). Fills its parent (1280 × 800 page box).
 *   left sidebar: the lockup, My Satchels · Market · Mint · Contract facts, the account chip, the theme switch.
 *   left column (sticky): the charm-ledger card with "Paused for sale", the Price panel (tag, "4,750.00 USDC",
 *   "Listing #7 · listed 2 h ago by bob.near", the gate line, Buy, "Paid in USDC.").
 *   right column (scrolls): "Satchel #7", Wallet · Activity · Buy, the verdict card, "Paused while it's for sale.",
 *   You get, The record (checks, then one white card per signature with its charm, "Ethereum · nonce 1", "Would
 *   send …", the evidence link and the pill Used / Expired / Unused / Checking…), How buying works.
 *   done: the buyer's hand-off ("Satchel #7 is yours.", "You now control …", the receipt, Open your Satchel).
 *
 * verdict "checking" | "clean" | "blocked" · records (per-row status + pop) · buy "disabled" | "enabled" | "pressed"
 * | "recheck" | "wallet" | "done" · press · scan 0..1 (a beam down the record rows) · verdictPop 0..1 · spin
 * satchel "7" | "4" (#4: one unused `Ethereum · nonce 12`; holdings/price/seller are placeholders)
 * scroll (right column px) or focus "top" | "verdict" | "record" (presets that bring that region to the top)
 * compact: tighter top spacing for a ~1274 × 701 page box (the illustrator's default BrowserFrame).
 * Layout boxes: SALE_LAYOUT, SALE_LAYOUT_RECORD (focus="record"), SALE_DONE_LAYOUT in ./layout.
 */

export type Verdict = "checking" | "clean" | "blocked";
export type BuyState = "disabled" | "enabled" | "pressed" | "recheck" | "wallet" | "done";

/** Right-column scroll presets (px) for `focus`. */
export const SALE_FOCUS = { top: 0, verdict: 118, record: 600 } as const;

export interface SalePageProps {
  satchel?: "7" | "4";
  verdict?: Verdict;
  records?: HistoryRecord[];
  buy?: BuyState;
  press?: number;
  scan?: number;
  verdictPop?: number;
  spin?: number;
  buyer?: string;
  seller?: string;
  price?: string;
  balances?: Balances;
  scroll?: number;
  focus?: keyof typeof SALE_FOCUS;
  compact?: boolean;
  style?: CSSProperties;
}

export function SalePage({
  satchel = "7",
  verdict,
  records,
  buy,
  press,
  scan,
  verdictPop,
  spin = 0,
  buyer = ACCOUNTS.carol,
  seller,
  price,
  balances,
  scroll,
  focus,
  compact = false,
  style,
}: SalePageProps) {
  const is4 = satchel === "4";
  const v: Verdict = verdict ?? (is4 ? "blocked" : "clean");
  const recs = records ?? (is4 ? HISTORY_4 : HISTORY_7.map((r) => ({ ...r, status: v === "checking" ? ("checking" as const) : ("settled" as const) })));
  const b: BuyState = buy ?? (v === "clean" ? "enabled" : "disabled");
  const sell = seller ?? (is4 ? "mallory.near" : ACCOUNTS.bob);
  const pr = price ?? (is4 ? SATCHEL4.price : PRICE);
  const bal = balances ?? (is4 ? SATCHEL4.balances : AMOUNTS.after);
  const top = compact ? 28 : 40;
  const sc = scroll ?? SALE_FOCUS[focus ?? "top"];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: C.ground, color: C.ink, overflow: "hidden", ...sans(400), ...style }}>
      <SideNav account={buyer} />
      {b === "done" ? (
        <BoughtView id={satchel} seller={sell} price={pr} balances={bal} press={press} />
      ) : (
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 40, padding: `0 32px 0 32px`, position: "relative" }}>
          <div data-ui="leftCol" style={{ width: 400, flexShrink: 0, paddingTop: top, display: "flex", flexDirection: "column", gap: 16 }}>
            <AppCard id={satchel} width={400} balances={bal} badge={null} status="paused" />
            <BuyBlock state={b} verdict={v} price={pr} press={press} spin={spin} seller={sell} id={satchel} unused={recs.filter((r) => r.status === "unused").length} sigCount={recs.length} />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", position: "relative" }}>
            <div style={{ paddingTop: top, transform: `translateY(${-sc}px)` }}>
              <div style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em" }}>Satchel #{satchel}</div>
              <AppTabs tabs={["Wallet", "Activity", "Buy"]} active="Buy" style={{ marginTop: 16 }} />
              <HistoryPanel verdict={v} records={recs} scan={scan} verdictPop={verdictPop} spin={spin} balances={bal} id={satchel} seller={sell} style={{ marginTop: 24 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── sidebar ───────────────────────────── */

export function SideNav({ account = ACCOUNTS.carol, active }: { account?: string; active?: string }) {
  const items = [
    { label: "My Satchels", Icon: Wallet },
    { label: "Market", Icon: Store },
    { label: "Mint", Icon: Sparkles },
    { label: "Contract facts", Icon: FileCode },
  ];
  return (
    <div style={{ width: 256, flexShrink: 0, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", padding: "28px 16px 20px", boxSizing: "border-box" }}>
      <div style={{ padding: "0 8px" }}>
        <Lockup height={32} />
      </div>
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(({ label, Icon }) => {
          const on = label === active;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, height: 44, padding: "0 12px", borderRadius: 14, background: on ? C.sunken : "transparent", ...sans(on ? 650 : 500), fontSize: 15, color: on ? C.ink : C.inkMuted }}>
              <Icon size={20} strokeWidth={STROKE} />
              {label}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 12px 0 8px", borderRadius: 999, background: C.surface, border: `1.5px solid ${C.line}` }}>
          <Avatar account={account} size={28} />
          <span style={{ flex: 1, ...sans(650), fontSize: 15 }}>{account}</span>
          <ChevronUp size={18} strokeWidth={STROKE} color={C.inkMuted} />
        </div>
        <div style={{ ...sans(500), fontSize: 14, color: C.inkMuted, margin: "16px 0 8px" }}>Theme</div>
        <div style={{ display: "flex", padding: 4, gap: 2, borderRadius: 999, background: C.sunken }}>
          {[
            { l: "System", I: Monitor },
            { l: "Day", I: Sun },
            { l: "Night", I: Moon },
          ].map(({ l, I }) => (
            <span key={l} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 999, background: l === "Day" ? C.ink : "transparent", color: l === "Day" ? C.white : C.inkMuted, ...sans(600), fontSize: 14 }}>
              <I size={15} strokeWidth={STROKE} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── the right column: verdict, banner, you get, the record ───────────────────────────── */

/**
 * HistoryPanel: the Buy tab's right column below the tabs, as the app draws it: the verdict card, "Paused while
 * it's for sale.", You get, The record (checks + the signature cards), How buying works. `scan` sweeps a beam down
 * the signature cards. Fills its parent's width (520 in the page).
 */
export function HistoryPanel({
  verdict = "clean",
  records = HISTORY_7,
  scan,
  verdictPop,
  spin = 0,
  balances = AMOUNTS.after,
  id = "7",
  seller = ACCOUNTS.bob,
  how = true,
  style,
}: {
  verdict?: Verdict;
  records?: HistoryRecord[];
  scan?: number;
  verdictPop?: number;
  spin?: number;
  balances?: Balances;
  id?: string;
  seller?: string;
  how?: boolean;
  style?: CSSProperties;
}) {
  const n = records.length;
  const unused = records.filter((r) => r.status === "unused");
  const group = verdict === "checking" ? `Checking (${n})` : unused.length ? `Needs attention (${unused.length})` : `Can't move coins (${n})`;
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }}>
      <VerdictCard verdict={verdict} records={records} pop={verdictPop} spin={spin} />
      <div data-ui="paused" style={{ marginTop: 14, display: "flex", gap: 12, padding: "14px 18px", borderRadius: 18, background: C.sunken, ...sans(400), fontSize: 15, lineHeight: "22px" }}>
        <Snowflake size={18} strokeWidth={STROKE} color={C.frozen} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <span style={{ ...sans(600), color: C.frozen }}>Paused while it&apos;s for sale.</span> The seller can&apos;t sign anything new, so the history below is final for this listing.
        </span>
      </div>

      <div style={{ ...display(700), fontSize: 20, lineHeight: "26px", marginTop: 32 }}>You get</div>
      <div data-ui="youGet" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {CHAINS.map((c) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ChainFace chain={c} size={30} />
            <span style={{ ...display(800), fontSize: 21, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{balances[c]}</span>
            <span style={{ ...sans(600), fontSize: 14, color: C.inkMuted }}>{TICKER[c]}</span>
          </div>
        ))}
      </div>
      <div style={{ ...sans(400), fontSize: 14, color: C.inkMuted, marginTop: 12 }}>Its addresses come with it. Unconfirmed deposits never count.</div>

      <div style={{ ...display(700), fontSize: 20, lineHeight: "26px", marginTop: 36 }}>The record</div>
      <div style={{ ...sans(400), fontSize: 16, lineHeight: "24px", color: C.inkMuted, marginTop: 6 }}>Every signature this Satchel has made, each checked on its own chain.</div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {["Contract keys: none since birth (block 274,140,000)", "Code: matches the published build", "Ethereum address: no delegated code"].map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, ...sans(400), fontSize: 15 }}>
            <CircleOk />
            {t}
          </div>
        ))}
      </div>
      <div style={{ ...sans(600), fontSize: 14, color: C.inkMuted, marginTop: 20 }}>{group}</div>
      <div data-ui="records" style={{ position: "relative", marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {records.map((r, i) => (
          <RecordRow key={i} r={r} spin={spin} />
        ))}
        {scan !== undefined && scan > 0 && scan < 1 ? <ScanBeam t={scan} /> : null}
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 18, background: C.surface, border: `1px solid ${C.line}`, ...sans(600), fontSize: 15 }}>
        How Satchel checks this
        <ChevronDown size={18} strokeWidth={STROKE} />
      </div>
      {how ? (
        <>
          <div style={{ ...display(700), fontSize: 20, lineHeight: "26px", marginTop: 36 }}>How buying works</div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["You pay", `One transaction moves Satchel #${id} to you and pays ${seller}`, "You get everything inside"].map((s, i) => (
              <div key={s} style={{ background: C.sunken, borderRadius: 18, padding: "14px 14px 18px", display: "flex", gap: 10, alignItems: "flex-start", minHeight: 96 }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: C.surface, display: "grid", placeItems: "center", flexShrink: 0, ...sans(700), fontSize: 13 }}>{i + 1}</span>
                <span style={{ ...sans(400), fontSize: 15, lineHeight: "22px" }}>{s}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CircleOk() {
  return (
    <span style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${C.success}`, display: "grid", placeItems: "center", boxSizing: "border-box", flexShrink: 0 }}>
      <Check size={12} strokeWidth={STROKE + 1} color={C.success} />
    </span>
  );
}

function VerdictCard({ verdict, records, pop, spin }: { verdict: Verdict; records: HistoryRecord[]; pop?: number; spin: number }) {
  const n = records.length;
  const done = records.filter((r) => r.status === "settled" || r.status === "unused").length;
  const unused = records.filter((r) => r.status === "unused");
  const s = pop === undefined ? 1 : popScale(pop);
  const o = pop === undefined ? 1 : Math.min(1, pop * 4);
  const clean = verdict === "clean";
  const blocked = verdict === "blocked";
  const title = verdict === "checking" ? `Checking ${n} past ${n === 1 ? "signature" : "signatures"}…` : clean ? "Clean. No past signature can move these coins." : `${unused.length} past ${unused.length === 1 ? "signature" : "signatures"} could still move coins.`;
  const first = unused[0];
  return (
    <div data-ui="verdict" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: "20px 20px 18px" }}>
      <div style={{ display: "flex", gap: 14 }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: C.sunken, display: "grid", placeItems: "center", flexShrink: 0, transform: verdict === "checking" ? undefined : `scale(${s})` }}>
          {verdict === "checking" ? <Spinner size={28} spin={spin} color={C.frozen} /> : clean ? <ShieldCheck size={28} strokeWidth={STROKE} color={C.success} /> : <ShieldAlert size={28} strokeWidth={STROKE} color={C.danger} />}
        </span>
        <div style={{ minWidth: 0, opacity: verdict === "checking" ? 1 : o }}>
          <div style={{ ...sans(500), fontSize: 14, color: C.inkMuted }}>Clean history</div>
          <div style={{ ...display(700), fontSize: 22, lineHeight: "28px", letterSpacing: "-0.01em", marginTop: 2, maxWidth: 330 }}>{title}</div>
          {verdict === "checking" ? <div style={{ ...sans(400), fontSize: 15, lineHeight: "22px", marginTop: 4 }}>Reading Bitcoin, Ethereum and Solana from your browser.</div> : null}
          {blocked && first ? (
            <div style={{ ...sans(400), fontSize: 15, lineHeight: "22px", marginTop: 4 }}>
              {appRecordLabel(first)} isn&apos;t used yet. The seller has to clear it first.
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
        {verdict === "checking" ? (
          <span style={{ width: 30, height: 30, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
            <Spinner size={16} spin={spin} color={C.frozen} />
          </span>
        ) : blocked ? (
          <span style={{ width: 30, height: 30, borderRadius: 999, border: `2px solid ${C.danger}`, display: "grid", placeItems: "center", boxSizing: "border-box" }}>
            <TriangleAlert size={15} strokeWidth={STROKE} color={C.danger} />
          </span>
        ) : (
          records.map((_, i) => (
            <span key={i} style={{ width: 30, height: 30, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center" }}>
              <Check size={16} strokeWidth={STROKE} color={C.success} />
            </span>
          ))
        )}
        <span style={{ ...sans(600), fontSize: 14, marginLeft: 6 }}>
          {verdict === "checking" ? `Checking ${Math.min(n, done + 1)} of ${n}` : blocked ? `${unused.length} of ${n} could still move coins` : `${n} of ${n} can't move coins`}
        </span>
      </div>
      {verdict !== "checking" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, ...sans(400), fontSize: 14, color: C.inkMuted }}>
          <History size={15} strokeWidth={STROKE} />
          Checked in your browser just now
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: verdict === "checking" ? 12 : 4, ...sans(400), fontSize: 14, color: C.inkMuted }}>
        <Monitor size={15} strokeWidth={STROKE} />
        Runs in your browser. Satchel&apos;s server isn&apos;t trusted for this.
      </div>
      {blocked ? (
        <div style={{ marginTop: 14 }}>
          <span style={{ ...sans(600), fontSize: 15, color: C.link, textDecoration: "underline", textUnderlineOffset: 3 }}>See the signature</span>
        </div>
      ) : null}
    </div>
  );
}

function RecordRow({ r, spin }: { r: HistoryRecord; spin: number }) {
  const settled = r.status === "settled";
  const unused = r.status === "unused";
  const evidence = settled ? r.evidence : unused ? r.unusedEvidence ?? r.evidence : null;
  const would = `Would ${r.send.charAt(0).toLowerCase()}${r.send.slice(1)}`;
  const pillScale = r.pop === undefined ? 1 : popScale(r.pop);
  return (
    <div data-ui="record" style={{ background: C.surface, border: `1px solid ${unused ? C.danger : C.line}`, borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <ChainFace chain={r.chain} size={28} sad={unused} style={{ marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...sans(650), fontSize: 15, lineHeight: "22px" }}>{appRecordLabel(r)}</div>
        <div style={{ ...sans(400), fontSize: 14, lineHeight: "20px", color: C.inkMuted, marginTop: 4 }}>{would}</div>
        {evidence ? (
          <div style={{ marginTop: 2 }}>
            {unused ? <span style={{ ...sans(500), fontSize: 14, color: C.danger }}>{evidence}</span> : <AppLink style={{ fontSize: 14 }}>{evidence}</AppLink>}
          </div>
        ) : null}
      </div>
      <span style={{ display: "inline-flex", transform: `scale(${pillScale})`, transformOrigin: "100% 50%", opacity: r.pop === undefined ? 1 : Math.min(1, r.pop * 4) }}>
        {settled ? (
          <ItemPill color={C.success} icon={<Check size={14} strokeWidth={STROKE} />} word={appPillWord(r)} />
        ) : unused ? (
          <ItemPill color={C.danger} icon={<TriangleAlert size={14} strokeWidth={STROKE} />} word="Unused" />
        ) : r.status === "checking" ? (
          <ItemPill color={C.inkMuted} icon={<Spinner size={14} spin={spin} color={C.inkMuted} />} word="Checking…" />
        ) : null}
      </span>
    </div>
  );
}

function ItemPill({ color, icon, word }: { color: string; icon: ReactNode; word: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.sunken, color, ...sans(600), fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap" }}>
      {icon}
      {word}
    </span>
  );
}

/** A flat scan beam (no glow, no gradient): a frozen-blue band with a 2px leading edge, sweeping down. */
function ScanBeam({ t }: { t: number }) {
  return (
    <div style={{ position: "absolute", left: -6, right: -6, top: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 18 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: `calc(${t * 100}% - 46px)`, height: 46, background: "rgba(42, 99, 199, 0.07)", borderBottom: "2px solid rgba(42, 99, 199, 0.75)" }} />
    </div>
  );
}

/* ───────────────────────────── the Price panel ───────────────────────────── */

/**
 * BuyBlock: the app's Price panel. Tag + "Price", "4,750.00 USDC", "Listing #7 · listed 2 h ago by bob.near", the
 * gate line, the Buy button and "Paid in USDC.". disabled = the app's flat grey button (gate: "Checking history…" or
 * "Blocked: 1 unused signature"); enabled = coral; pressed; recheck "Re-checking history…"; wallet "Approve in your
 * wallet…" + "Check your NEAR wallet.".
 */
export function BuyBlock({
  state = "enabled",
  verdict = "clean",
  price = PRICE,
  press,
  spin = 0,
  seller = ACCOUNTS.bob,
  id = "7",
  unused = 0,
  style,
}: {
  state?: BuyState;
  verdict?: Verdict;
  price?: string;
  press?: number;
  spin?: number;
  seller?: string;
  id?: string;
  balances?: Balances;
  unused?: number;
  sigCount?: number;
  style?: CSSProperties;
}) {
  const busy = state === "recheck" || state === "wallet";
  const p = press ?? (state === "pressed" ? 1 : 0);
  const label = state === "recheck" ? "Re-checking history…" : state === "wallet" ? "Approve in your wallet…" : `Buy for ${price}`;
  const gate =
    state === "disabled" ? (
      verdict === "blocked" ? (
        <Gate color={C.danger} icon={<ShieldAlert size={16} strokeWidth={STROKE} />} text={`Blocked: ${unused} unused ${unused === 1 ? "signature" : "signatures"}`} />
      ) : (
        <Gate color={C.frozen} icon={<Spinner size={16} spin={spin} color={C.frozen} />} text="Checking history…" />
      )
    ) : (
      <Gate color={C.success} icon={<ShieldCheck size={16} strokeWidth={STROKE} />} text="Clean history · checked just now" />
    );
  return (
    <div data-ui="price" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24, padding: "20px 20px 18px", boxSizing: "border-box", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...sans(600), fontSize: 15, color: C.inkMuted }}>
        <Tag size={18} strokeWidth={STROKE} />
        Price
      </div>
      <div style={{ ...display(800), fontSize: 36, lineHeight: "42px", letterSpacing: "-0.03em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{price}</div>
      <div style={{ ...sans(400), fontSize: 14, color: C.inkMuted, marginTop: 4 }}>
        Listing #{id} · listed 2 h ago by {seller}
      </div>
      <div style={{ marginTop: 14 }}>{gate}</div>
      <span data-ui="buy" style={{ display: "block", marginTop: 10 }}>
        <UiButton block label={label} busy={busy} spin={spin} press={busy ? 0 : p} disabled={state === "disabled"} />
      </span>
      <div style={{ ...sans(400), fontSize: 14, color: C.inkMuted, marginTop: 10 }}>{state === "wallet" ? "Check your NEAR wallet." : `Paid in ${price.match(/[A-Z]+$/)?.[0] ?? "USDC"}.`}</div>
    </div>
  );
}

function Gate({ color, icon, text }: { color: string; icon: ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...sans(600), fontSize: 14, color }}>
      {icon}
      {text}
    </div>
  );
}

/* ───────────────────────────── done: the buyer's hand-off ───────────────────────────── */

function BoughtView({ id, seller, price, balances, press }: { id: string; seller: string; price: string; balances: Balances; press?: number }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", paddingTop: 36 }}>
      <div style={{ width: 560 }}>
        <div data-ui="stage" style={{ position: "relative", height: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...sans(400), fontSize: 14, color: C.inkMuted }}>
            <span>From</span>
            <span>To</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar account={seller} size={28} />
              <span style={{ ...mono(450), fontSize: 15 }}>{seller}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, ...sans(500), fontSize: 15 }}>
              You
              <Avatar account={ACCOUNTS.carol} size={28} />
            </span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, height: 10, borderRadius: 5, background: C.ink }} />
          <div style={{ position: "absolute", left: 0, top: 86, width: 210, height: 140, borderRadius: 24, border: `2px dashed ${C.lineStrong}`, opacity: 0.7 }} />
          <div style={{ position: "absolute", right: 120, top: 70, width: 3, height: 26, background: C.ink }} />
          <div style={{ position: "absolute", right: 0, top: 92 }}>
            <AppCard id={id} width={300} balances={balances} status="bought" badge="yours" />
          </div>
          <SparkleStar size={22} style={{ position: "absolute", right: -10, top: 78 }} />
        </div>
        <div data-ui="done" style={{ ...display(800), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em", marginTop: 8 }}>
          Satchel #{id} is yours.
        </div>
        <div style={{ ...sans(400), fontSize: 16, lineHeight: "24px", color: C.inkMuted, marginTop: 4 }}>You now control {holdingsSentence(balances)}.</div>
        <div style={{ marginTop: 18, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 20px", display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 8, ...sans(400), fontSize: 15 }}>
          <span style={{ color: C.inkMuted }}>Price</span>
          <span>{price}</span>
          <span style={{ color: C.inkMuted }}>Seller</span>
          <span style={{ ...mono(450), fontSize: 14 }}>{seller}</span>
          <span style={{ color: C.inkMuted }}>Listing</span>
          <span>#{id}</span>
          <span style={{ color: C.inkMuted }}>Transaction</span>
          <span>
            <AppLink monoText style={{ fontSize: 14 }}>
              79732e…bc4e
            </AppLink>{" "}
            <span style={{ color: C.inkMuted }}>· 14:02 UTC</span>
          </span>
        </div>
        <span data-ui="open" style={{ display: "block", marginTop: 18 }}>
          <UiButton block label="Open your Satchel" press={press} />
        </span>
      </div>
    </div>
  );
}
