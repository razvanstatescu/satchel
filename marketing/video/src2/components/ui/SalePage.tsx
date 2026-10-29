import type { CSSProperties } from "react";
import { CircleCheck, FileCheck, MonitorCheck, Plus, ShieldAlert, ShieldCheck, Snowflake, Store, TriangleAlert, Wallet } from "lucide-react";
import { Lockup } from "../../brand/Logo";
import { C, display, mono, sans } from "../../brand/tokens";
import { SatchelCard } from "../Sticker";
import { ACCOUNTS, AMOUNTS, type Balances, CHAINS, HISTORY_4, HISTORY_7, type HistoryRecord, holdings, PRICE, SATCHEL4 } from "./data";
import { Avatar, CoinFace, NUM, popScale, Spinner, StatusPill, STROKE, TY, UiButton } from "./kit";

/**
 * SalePage (T5–T7): Satchel #7's sale page in carol.near's browser, at 1280 × 800 (fills its parent; the scene scales
 * it inside a BrowserFrame). Side nav · "Satchel #7" + "Paused for sale" · the card and the Buy block on the left ·
 * the HistoryPanel on the right ("History · 3 signatures", the three records as dashed outlines, "Checked in your
 * browser", the verdict). kb/82 §2.23–2.24: the gate sits with the button; problems first; evidence per row.
 *
 * verdict   "checking" | "clean" | "blocked"
 * records   the history rows with per-row status ("pending" | "checking" | "settled" | "unused") and pop 0..1;
 *           default: all checking / all settled (from `verdict`), or #4's one unused ETH record
 * buy       "disabled" (40 %, the reason under it) | "enabled" (coral) | "pressed" | "recheck" ("Re-checking
 *           history…") | "wallet" ("Approve in your wallet…") | "done" ("Satchel #7 is yours." + "You now control …");
 *           `press` 0..1 overrides the press
 * scan      0..1 a scan beam sweeping down the records (omit = none)
 * verdictPop 0..1 pops the verdict in       spin  turns spinners
 * satchel   "7" (default) or "4": #4 is the honest blocked example (one unused `ETH · nonce 12`); its holdings, price
 *           and seller are placeholders (override with balances / price / seller)
 */

export type Verdict = "checking" | "clean" | "blocked";
export type BuyState = "disabled" | "enabled" | "pressed" | "recheck" | "wallet" | "done";

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
  /** Fit a ~1274 × 701 page box (the illustrator's default BrowserFrame): tighter spacing, no "How buying works". */
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
  compact = false,
  style,
}: SalePageProps) {
  const gap = compact ? 16 : 22;
  const is4 = satchel === "4";
  const v: Verdict = verdict ?? (is4 ? "blocked" : "clean");
  const recs = records ?? (is4 ? HISTORY_4 : HISTORY_7.map((r) => ({ ...r, status: v === "checking" ? ("checking" as const) : ("settled" as const) })));
  const b: BuyState = buy ?? (v === "clean" ? "enabled" : "disabled");
  const sell = seller ?? (is4 ? "mallory.near" : ACCOUNTS.bob);
  const pr = price ?? (is4 ? SATCHEL4.price : PRICE);
  const bal = balances ?? (is4 ? SATCHEL4.balances : AMOUNTS.after);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: C.ground, color: C.ink, overflow: "hidden", ...sans(400), ...style }}>
      <SideNav account={buyer} />
      <div style={{ flex: 1, minWidth: 0, padding: `${compact ? 18 : 26}px 40px 0 40px`, display: "flex", flexDirection: "column" }}>
        <div style={{ ...TY.caption, color: C.inkMuted }}>
          Market <span style={{ margin: "0 6px" }}>/</span> <span style={{ color: C.ink }}>Satchel #{satchel}</span>
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...display(800), fontSize: 36, lineHeight: "42px", letterSpacing: "-0.03em" }}>Satchel #{satchel}</span>
          {b === "done" ? <StatusPill tone="success" icon={CircleCheck} word="Bought" /> : <StatusPill tone="frozen" icon={Snowflake} word="Paused for sale" />}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, ...TY.bodySm, color: C.inkMuted }}>
            {b === "done" ? "Bought from" : "Listed by"} <Avatar account={sell} size={22} /> <span style={{ ...mono(500), fontSize: 13.5, color: C.ink }}>{sell}</span>
          </span>
        </div>

        <div style={{ marginTop: gap, display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ width: 392, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <SatchelCard id={satchel} width={392} label="Inside" total="3 chains" chips={CHAINS.map((c) => ({ chain: c, amount: bal[c] }))} />
            <BuyBlock style={{ marginTop: gap }} state={b} verdict={v} price={pr} press={press} spin={spin} seller={sell} id={satchel} balances={bal} unused={recs.filter((r) => r.status === "unused").length} sigCount={recs.length} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <HistoryPanel verdict={v} records={recs} scan={scan} verdictPop={verdictPop} spin={spin} />
            {compact ? null : <HowBuying id={satchel} seller={sell} price={pr} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "How buying works" (product buy.how): three numbered tiles. */
function HowBuying({ id, seller, price }: { id: string; seller: string; price: string }) {
  const steps = [`You pay ${price}`, `One transaction moves Satchel #${id} to you and pays ${seller}`, "You control the coins"];
  return (
    <div>
      <div style={{ ...sans(650), fontSize: 15, lineHeight: "20px", color: C.ink }}>How buying works</div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1.7fr 1fr", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center", flexShrink: 0, ...display(800), fontSize: 13, color: C.ink }}>{i + 1}</span>
            <span style={{ ...TY.caption, fontSize: 13, color: C.ink }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── side nav ───────────────────────────── */

export function SideNav({ account = ACCOUNTS.carol, active = "Market" }: { account?: string; active?: string }) {
  const items = [
    { label: "My Satchels", Icon: Wallet },
    { label: "Market", Icon: Store },
    { label: "Mint", Icon: Plus },
    { label: "Contract facts", Icon: FileCheck },
  ];
  return (
    <div style={{ width: 220, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", padding: "24px 14px 20px", boxSizing: "border-box" }}>
      <div style={{ padding: "0 8px" }}>
        <Lockup height={30} />
      </div>
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(({ label, Icon }) => {
          const on = label === active;
          return (
            <div key={label} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, height: 42, padding: "0 12px", borderRadius: 14, background: on ? C.sunken : "transparent", ...sans(on ? 650 : 500), fontSize: 15, color: on ? C.ink : C.inkMuted }}>
              {on ? <span style={{ position: "absolute", left: -14, top: 10, bottom: 10, width: 4, borderRadius: "0 4px 4px 0", background: C.brand }} /> : null}
              <Icon size={19} strokeWidth={STROKE} />
              {label}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 16, border: `1.5px solid ${C.line}` }}>
        <Avatar account={account} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono(500), fontSize: 13.5, color: C.ink }}>{account}</div>
          <div style={{ ...TY.caption, fontSize: 12, color: C.inkMuted }}>Connected</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── history panel ───────────────────────────── */

/**
 * HistoryPanel: the buyer's browser check. Header "History · N signatures" + "Checked in your browser", the verdict,
 * then one dashed outline per record (the record IS the outline, as on the card's back): mono label, what it would send,
 * and the chain's answer as a pill (Coin spent / Nonce used / Blockhash expired; Unused in danger).
 */
export function HistoryPanel({
  verdict = "clean",
  records = HISTORY_7,
  scan,
  verdictPop,
  spin = 0,
  style,
}: {
  verdict?: Verdict;
  records?: HistoryRecord[];
  scan?: number;
  verdictPop?: number;
  spin?: number;
  style?: CSSProperties;
}) {
  const n = records.length;
  return (
    <div style={{ background: C.surface, borderRadius: 24, border: `1px solid ${C.line}`, padding: "20px 22px 18px", boxSizing: "border-box", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ ...display(800), fontSize: 20, lineHeight: "26px", letterSpacing: "-0.01em" }}>
          History · {n} {n === 1 ? "signature" : "signatures"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, ...sans(600), fontSize: 13, padding: "6px 12px", borderRadius: 999, background: C.sunken, color: C.ink }}>
          {verdict === "checking" ? <Spinner size={15} spin={spin} color={C.ink} /> : <MonitorCheck size={15} strokeWidth={STROKE} />}
          {verdict === "checking" ? "Checking in your browser…" : "Checked in your browser"}
        </span>
      </div>

      <VerdictBlock verdict={verdict} count={n} unused={records.filter((r) => r.status === "unused").length} pop={verdictPop} spin={spin} />

      <div style={{ position: "relative", marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {records.map((r, i) => (
          <RecordRow key={i} r={r} spin={spin} />
        ))}
        {scan !== undefined && scan > 0 && scan < 1 ? <ScanBeam t={scan} /> : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, ...TY.caption, fontSize: 12.5, color: C.inkMuted }}>
        <ShieldCheck size={14} strokeWidth={STROKE} />
        Runs in your browser. Satchel&apos;s server isn&apos;t trusted for this.
      </div>
    </div>
  );
}

function VerdictBlock({ verdict, count, unused, pop, spin }: { verdict: Verdict; count: number; unused: number; pop?: number; spin: number }) {
  const s = pop === undefined ? 1 : popScale(pop);
  const o = pop === undefined ? 1 : Math.min(1, pop * 4);
  if (verdict === "checking") {
    return (
      <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", padding: "16px 18px", borderRadius: 18, background: C.sunken }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: C.surface, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Spinner size={24} spin={spin} color={C.inkMuted} />
        </span>
        <div>
          <div style={{ ...display(750), fontSize: 20, lineHeight: "26px", color: C.ink }}>Checking {count} past {count === 1 ? "signature" : "signatures"}…</div>
          <div style={{ ...TY.bodySm, color: C.inkMuted }}>Reading Bitcoin, Ethereum and Solana from your browser.</div>
        </div>
      </div>
    );
  }
  const clean = verdict === "clean";
  const color = clean ? C.success : C.danger;
  const Icon = clean ? ShieldCheck : ShieldAlert;
  return (
    <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", padding: "16px 18px", borderRadius: 18, background: C.sunken, opacity: o }}>
      <span style={{ width: 48, height: 48, borderRadius: 999, background: color, display: "grid", placeItems: "center", flexShrink: 0, transform: `scale(${s})` }}>
        <Icon size={26} strokeWidth={2} color={C.white} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...display(800), fontSize: 24, lineHeight: "28px", letterSpacing: "-0.02em", color }}>{clean ? "Clean history" : `Blocked: ${unused} unused ${unused === 1 ? "signature" : "signatures"}`}</div>
        <div style={{ ...TY.body, fontSize: 15, lineHeight: "22px", color: C.ink, marginTop: 2 }}>
          {clean ? "Clean. No past signature can move these coins." : `${unused} past ${unused === 1 ? "signature" : "signatures"} could still move coins. The seller has to settle it first.`}
        </div>
      </div>
    </div>
  );
}

function RecordRow({ r, spin }: { r: HistoryRecord; spin: number }) {
  const settled = r.status === "settled";
  const unused = r.status === "unused";
  const edge = settled ? C.success : unused ? C.danger : C.lineStrong;
  const evidence = settled ? r.evidence : unused ? r.unusedEvidence ?? r.evidence : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, border: `2px dashed ${edge}`, background: C.surface, minHeight: 74, boxSizing: "border-box" }}>
      <CoinFace chain={r.chain} size={34} face={settled ? { smile: 1.4 } : unused ? { smile: -0.6, wide: 0.6 } : { smile: 0.5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...mono(600), fontSize: 14.5, lineHeight: "20px", color: C.ink }}>{r.label}</div>
        <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.send}</div>
        {evidence ? <div style={{ ...TY.caption, fontSize: 12.5, color: unused ? C.danger : C.inkMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{evidence}</div> : null}
      </div>
      {settled ? (
        <StatusPill tone="success" icon={CircleCheck} word={r.settledWord} pop={r.pop} />
      ) : unused ? (
        <StatusPill tone="danger" icon={TriangleAlert} word="Unused" pop={r.pop} />
      ) : r.status === "checking" ? (
        <StatusPill tone="muted" icon="spinner" spin={spin} word="Checking…" />
      ) : null}
    </div>
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

/* ───────────────────────────── buy block ───────────────────────────── */

/**
 * BuyBlock: price, the Buy button and its gate line under it (kb/82 §2.23: gate, reason and button in one container).
 * disabled = 40 % with the reason; enabled = coral; pressed; recheck "Re-checking history…"; wallet "Approve in your
 * wallet…" (plus the line that binds the purchase to the checked history).
 */
export function BuyBlock({
  state = "enabled",
  verdict = "clean",
  price = PRICE,
  press,
  spin = 0,
  seller = ACCOUNTS.bob,
  id = "7",
  balances = AMOUNTS.after,
  unused = 0,
  sigCount = 3,
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
  const [num, cur] = [price.replace(/\s*[A-Z]+$/, ""), price.match(/[A-Z]+$/)?.[0] ?? "USDC"];
  const busy = state === "recheck" || state === "wallet";
  const p = press ?? (state === "pressed" ? 1 : 0);
  const label = state === "recheck" ? "Re-checking history…" : state === "wallet" ? "Approve in your wallet…" : `Buy for ${price}`;
  if (state === "done") {
    return (
      <div style={{ background: C.surface, borderRadius: 24, border: `1px solid ${C.line}`, padding: "20px 20px 18px", boxSizing: "border-box", ...style }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, background: C.success, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CircleCheck size={22} strokeWidth={2} color={C.white} />
          </span>
          <span style={{ ...display(800), fontSize: 26, lineHeight: "30px", letterSpacing: "-0.02em" }}>Satchel #{id} is yours.</span>
        </div>
        <div style={{ ...TY.body, fontSize: 15, lineHeight: "22px", marginTop: 10, ...NUM }}>
          You now control <span style={{ whiteSpace: "nowrap", fontWeight: 650 }}>{holdings(balances)}.</span>
        </div>
        <UiButton block style={{ marginTop: 16 }} label="Open your Satchel" press={p} />
        <div style={{ height: 1, background: C.line, margin: "16px 0 10px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", ...TY.caption, color: C.inkMuted }}>
          <span>Paid {seller} in the same transaction</span>
          <span style={{ ...sans(650), color: C.ink, ...NUM }}>{price}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: C.surface, borderRadius: 24, border: `1px solid ${C.line}`, padding: "18px 20px 18px", boxSizing: "border-box", ...style }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ ...TY.caption, color: C.inkMuted }}>Price</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ ...display(800), fontSize: 32, lineHeight: "38px", letterSpacing: "-0.03em", ...NUM }}>{num}</span>
            <span style={{ ...display(700), fontSize: 17, color: C.inkMuted }}>{cur}</span>
          </div>
        </div>
        <div style={{ ...TY.caption, color: C.inkMuted, paddingBottom: 6 }}>Paid in {cur}</div>
      </div>

      <UiButton block style={{ marginTop: 14 }} label={label} busy={busy} spin={spin} press={busy ? 0 : p} disabled={state === "disabled"} />

      <div style={{ marginTop: 12, minHeight: 40 }}>
        {state === "disabled" ? (
          verdict === "blocked" ? (
            <Gate tone={C.danger} Icon={ShieldAlert} text={`Blocked: ${unused} unused ${unused === 1 ? "signature" : "signatures"}`} sub="Buy stays off until no old signature can move coins." />
          ) : (
            <Gate tone={C.inkMuted} spinner spin={spin} text="Checking history…" sub="Buy turns on when your browser's check passes." />
          )
        ) : state === "wallet" ? (
          <Gate tone={C.success} Icon={ShieldCheck} text="Clean history · checked just now" sub={`Bound to this history: ${sigCount} ${sigCount === 1 ? "signature" : "signatures"}`} />
        ) : state === "recheck" ? (
          <Gate tone={C.inkMuted} spinner spin={spin} text="Checking again before you buy" sub="If anything changed, nothing is charged." />
        ) : (
          <Gate tone={C.success} Icon={ShieldCheck} text="Clean history · checked just now" sub={`Your purchase is bound to these ${sigCount} ${sigCount === 1 ? "signature" : "signatures"}.`} />
        )}
      </div>

      <div style={{ height: 1, background: C.line, margin: "14px 0 12px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ ...TY.caption, color: C.inkMuted }}>You get</span>
        <span style={{ ...sans(650), fontSize: 14, color: C.ink, ...NUM }}>{holdings(balances)}</span>
      </div>
    </div>
  );
}

function Gate({ tone, Icon, spinner, spin = 0, text, sub }: { tone: string; Icon?: typeof ShieldCheck; spinner?: boolean; spin?: number; text: string; sub?: string }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1 }}>{spinner ? <Spinner size={17} spin={spin} color={tone} /> : Icon ? <Icon size={17} strokeWidth={STROKE} color={tone} /> : null}</span>
      <div>
        <div style={{ ...sans(650), fontSize: 14, lineHeight: "20px", color: tone }}>{text}</div>
        {sub ? <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted }}>{sub}</div> : null}
      </div>
    </div>
  );
}
