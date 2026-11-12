import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ArrowRight, HandCoins, Lock, MonitorCheck, RotateCw, ShieldAlert, ShieldCheck, Snowflake, X } from "lucide-react";
import { interpolate, interpolateColors, random, spring } from "remotion";
import { type CharmFace, CharmShape } from "../../brand/Charm";
import { StickerS } from "../../brand/Logo";
import { C, type Chain, CHAIN, display, F, mono, sans } from "../../brand/tokens";
import { Avatar, NUM, popScale, Spinner, StatusPill, STROKE, TY } from "../../components/ui";
import { RecordOutline, ScanBeam, Star4 } from "../../illustration/props";
import { clamp, EASE2, slapAt, SPRING2 } from "../../motion";

/**
 * Shared by T5 (the check), T6 (blocked) and T7 (the hand-off): carol.near's browser with the Satchel sale page, laid
 * out for the film (UI px, the camera scales it). The page is the product's sale page (kb/80) rebuilt from the UI kit's
 * pieces so that the three history records can carry their chain's charm: each record row has its charm hanging on a
 * small peg just right of the row, so the charm's bonk (+55°, motion kit `bonkAngle`) lands on the row's right end,
 * where the stamp prints. No card band and no lockup tile on the page: the Buy button is the frame's only coral.
 */

// ── geometry (UI px) ─────────────────────────────────────────────────────────────────────────────────────────────
export const BROWSER = { w: 1280, h: 800 } as const;
/** The page box inside the browser (3 px outline, 44 tab strip + 52 toolbar). */
export const PAGE = { x: 3, y: 99, w: 1274, h: 698 } as const;

export const ROW = { x: 562, y: 238, w: 600, h: 64, gap: 16 } as const;
export const PANEL = { x: 540, y: 96, w: 644, pad: 22 } as const;
export const VERDICT = { x: 562, y: 156, w: 600, h: 66 } as const;
export const BUY = { x: 40, y: 96, w: 420 } as const;

/** Row i's vertical middle (page px). */
export const rowMid = (i: number) => ROW.y + i * (ROW.h + ROW.gap) + ROW.h / 2;

/** The charms on the page: coin outer diameter 56 UI, brand stem 40 units. */
export const CH = { d: 56, u: 56 / 140, stemLen: 40 } as const;
/** Pivot → coin centre (UI px). */
export const CH_L = (12 + CH.stemLen + 56) * CH.u;
/** Where the coin centre sits at contact (+55°): just inside the row's right end, a touch above its middle. */
const CONTACT_DX = 2;
const CONTACT_DY = -4;
/** Row i's charm pivot (page px). */
export const pivotOf = (i: number) => {
  const a = (55 * Math.PI) / 180;
  return { x: ROW.x + ROW.w + CONTACT_DX + CH_L * Math.sin(a), y: rowMid(i) + CONTACT_DY - CH_L * Math.cos(a) };
};

/** Browser coordinates of a page point (for cameras). */
export const toBrowser = (x: number, y: number) => ({ x: x + PAGE.x, y: y + PAGE.y });

// ── camera ───────────────────────────────────────────────────────────────────────────────────────────────────────
export type Cam = { x: number; y: number; z: number };
export type CamKey = { f: number; cam: Cam; ease?: (t: number) => number };

/** Camera between keys: centre linear, zoom geometric, `pan` easing by default. Holds outside the keys. */
export function camAt(frame: number, keys: CamKey[]): Cam {
  if (frame <= keys[0].f) return keys[0].cam;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame < b.f) {
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      const e = (b.ease ?? EASE2.pan)(Math.max(0, Math.min(1, t)));
      return {
        x: a.cam.x + (b.cam.x - a.cam.x) * e,
        y: a.cam.y + (b.cam.y - a.cam.y) * e,
        z: Math.exp(Math.log(a.cam.z) + (Math.log(b.cam.z) - Math.log(a.cam.z)) * e),
      };
    }
  }
  return keys[keys.length - 1].cam;
}

/** A world layer seen through the camera (1920 × 1080 frame). */
export function CameraView({ cam, children, w = BROWSER.w, h = BROWSER.h, dy = 0 }: { cam: Cam; children: ReactNode; w?: number; h?: number; dy?: number }) {
  const tx = 960 - cam.x * cam.z;
  const ty = 540 - cam.y * cam.z + dy;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${cam.z})` }}>
      {children}
    </div>
  );
}

/**
 * MID: the whole browser, its top at y 274 so the caption band (0–274) holds two caption lines with their descenders
 * clear of the tab bar. One framing for T5, T6 and T7, so both tab switches keep the chrome perfectly still.
 */
export const CAM_MID: Cam = { x: BROWSER.w / 2, y: 209 - 12 / 1.33, z: 1.33 };
/** The browser's top edge on screen (px) for a camera (to keep slow drifts from creeping into the caption band). */
export const browserTop = (cam: Cam) => 540 - cam.y * cam.z;
/** The same framing at another zoom, with the browser's top edge held where `base` puts it. */
export const holdTop = (base: Cam, z: number): Cam => ({ x: base.x, y: (540 - browserTop(base)) / z, z });

// ── the browser (the kit's BrowserFrame look, with tabs) ─────────────────────────────────────────────────────────
export interface TabSpec {
  title: string;
}

/**
 * carol's browser: the illustrator's BrowserFrame chrome (3 px ink outline, sunken tab strip, toolbar, hard drop),
 * extended with several tabs and an account chip (the kit frame has one tab). `active` = the open tab; `slap` = frames
 * since that tab was switched to (it slaps forward: §5 T7 "tab switch"), undefined = settled.
 */
export function Browser({
  tabs,
  active,
  url,
  account,
  slap,
  lift = 0,
  children,
}: {
  tabs: TabSpec[];
  active: number;
  url: string;
  account: string;
  slap?: number;
  lift?: number;
  children?: ReactNode;
}) {
  const O = 3;
  const stripH = 44;
  const barH = 52;
  const innerW = BROWSER.w - 2 * O;
  const tabW = 236;
  const tabX = (i: number) => 98 + i * (tabW + 6);
  const s = slap === undefined ? { sx: 1, sy: 1, lift: 0, opacity: 1 } : slapAt(slap, 30, 0, { from: 1.14, squash: 0.06, drop: 0 });
  const dot = (i: number) => <span key={i} style={{ width: 13, height: 13, borderRadius: 99, border: `2px solid ${C.ink}`, background: C.white, boxSizing: "border-box" }} />;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BROWSER.w,
        height: BROWSER.h,
        borderRadius: 20,
        border: `${O}px solid ${C.ink}`,
        background: C.white,
        boxShadow: `0 ${4 + lift}px 0 ${C.ink}`,
        transform: `translateY(${-lift}px)`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* tab strip */}
      <div style={{ position: "absolute", left: 0, top: 0, width: innerW, height: stripH, background: C.sunken, borderBottom: `2.5px solid ${C.ink}`, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: 18, top: 15, display: "flex", gap: 8 }}>{[0, 1, 2].map(dot)}</div>
        {tabs.map((t, i) =>
          i === active ? null : (
            <div key={t.title} style={{ position: "absolute", left: tabX(i), top: 9, width: tabW, height: stripH - 9, display: "flex", alignItems: "center", gap: 9, padding: "0 14px 2px 14px", boxSizing: "border-box" }}>
              <span style={{ opacity: 0.55, display: "flex" }}>
                <StickerS height={17} />
              </span>
              <span style={{ ...sans(550), fontSize: 14, color: C.inkMuted, flex: 1, whiteSpace: "nowrap" }}>{t.title}</span>
              <X size={13} strokeWidth={2.2} color={C.lineStrong} />
            </div>
          ),
        )}
        {/* separators between inactive tabs */}
        {tabs.map((_, i) => (i > 0 && i !== active && i - 1 !== active ? <span key={`sep${i}`} style={{ position: "absolute", left: tabX(i) - 3, top: 18, width: 1.5, height: 18, background: C.lineStrong, opacity: 0.6 }} /> : null))}
        <div
          style={{
            position: "absolute",
            left: tabX(active),
            top: 9,
            width: tabW,
            height: stripH - 9 + 1,
            background: C.white,
            border: `2.5px solid ${C.ink}`,
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "0 12px 2px 12px",
            transformOrigin: "50% 100%",
            transform: `scale(${s.sx}, ${s.sy})`,
          }}
        >
          <StickerS height={19} />
          <span style={{ ...sans(600), fontSize: 14, color: C.ink, flex: 1, whiteSpace: "nowrap" }}>{tabs[active].title}</span>
          <X size={14} strokeWidth={2.2} color={C.inkMuted} />
        </div>
      </div>
      {/* toolbar */}
      <div style={{ position: "absolute", left: 0, top: stripH, width: innerW, height: barH, display: "flex", alignItems: "center", gap: 14, padding: "0 14px 0 18px", boxSizing: "border-box", borderBottom: `2.5px solid ${C.ink}` }}>
        <ArrowLeft size={19} strokeWidth={2.2} color={C.ink} />
        <ArrowRight size={19} strokeWidth={2.2} color={C.lineStrong} />
        <RotateCw size={17} strokeWidth={2.2} color={C.ink} />
        <div style={{ flex: 1, height: 34, borderRadius: 999, background: C.sunken, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", marginLeft: 4 }}>
          <Lock size={13} strokeWidth={2.4} color={C.inkMuted} />
          <span style={{ ...sans(500), fontSize: 14.5, color: C.ink }}>{url}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px 0 5px", borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.white }}>
          <Avatar account={account} size={26} />
          <span style={{ ...mono(500), fontSize: 14, color: C.ink }}>{account}</span>
        </div>
      </div>
      {/* page */}
      <div style={{ position: "absolute", left: 0, top: stripH + barH, width: innerW, height: BROWSER.h - 2 * O - stripH - barH, background: C.ground, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ── the sale page ────────────────────────────────────────────────────────────────────────────────────────────────
export interface RowSpec {
  chain: Chain;
  label: string;
  variant?: "record" | "unused";
  stampText?: string;
}

export interface RowAnim {
  /** 0..1 the dashed outline draws itself. */
  draw?: number;
  /** 0..1 the label types on. */
  type?: number;
  /** 0..1 the stamp impact (0 = none). */
  stamp?: number;
  /** 0..1 the "Checking…" pill (shown while the browser checks this row). */
  checking?: number;
  /** px sideways shake (the red row's no-wobble in T6). */
  shake?: number;
  /** 0..1 pop of the danger warning badge (T6 bonk). */
  warnPop?: number;
  /** For an "unused" row: 0 = still drawn as a plain ink record, 1 = red (the check reveals it). Default 1. */
  unusedMix?: number;
}

export interface CharmAnim {
  angle: number;
  face: CharmFace;
  squash?: number;
  /** UI px the charm jumps up on its peg (cheer). */
  hop?: number;
  /** 0..1 scale-in (the charm pops onto its peg). */
  show?: number;
}

export type BuyMode = "checking" | "blocked" | "enabled" | "recheck" | "wallet";

export interface BuyAnim {
  mode: BuyMode;
  /** 0..1 fill/border/label cross-fade from greyed out to coral (fade spring). */
  wake: number;
  /** UI px above (+) / below (−) rest: −4 = flat in the page (greyed), 0 rest, a little + while it pops. */
  lift: number;
  /** 0..1 the press into the shadow (coral → coral-deep). */
  press?: number;
  spin?: number;
  /** 0..1 pop of the gate line when it changes. */
  gatePop?: number;
  /** px sideways "no" shake of the greyed Buy / Make an offer buttons (T6: "Buy and offers stay off"). */
  shake?: number;
  offerShake?: number;
}

export type Verdict = "checking" | "clean" | "blocked";

export interface SalePageProps {
  id: "7" | "4";
  price: string;
  seller?: string;
  rows: RowSpec[];
  rowAnim: RowAnim[];
  charms: CharmAnim[];
  /** pegs + charms visible (0..1 scale-in). */
  charmShow?: number;
  scan?: number;
  scanBrackets?: number;
  verdict: Verdict;
  /** 0..1 since the verdict changed (pop). undefined = settled. */
  verdictPop?: number;
  checked: boolean;
  /** 0..1 pop of the header pill when it switches to "Checked in your browser". */
  checkedPop?: number;
  buy: BuyAnim;
  balances: string;
  spin?: number;
  /** page content offset (tab switch: arrives 40 px lower). */
  contentY?: number;
  /** stagger-in of the page blocks: frames since the page appeared (undefined = settled). */
  enter?: number;
  /** Extra layer drawn over the page, in page px (hands, sparkles). */
  overlay?: ReactNode;
}

const enterY = (enter: number | undefined, delay: number) =>
  enter === undefined ? 0 : interpolate(enter - delay, [0, 12], [28, 0], { ...clamp, easing: EASE2.out });

export function SalePage(p: SalePageProps) {
  const n = p.rows.length;
  const rowsH = n * ROW.h + (n - 1) * ROW.gap;
  const footerY = ROW.y + rowsH + 18;
  const panelH = footerY + 20 + 18 - PANEL.y;
  const e = p.enter;
  return (
    <div style={{ position: "absolute", left: 0, top: p.contentY ?? 0, width: PAGE.w, height: PAGE.h }}>
      {/* header */}
      <div style={{ position: "absolute", left: 40, top: 20 + enterY(e, 0), display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ ...display(800), fontSize: 36, lineHeight: "44px", letterSpacing: "-0.03em", color: C.ink }}>Satchel #{p.id}</span>
        <StatusPill tone="frozen" icon={Snowflake} word="Paused for sale" />
      </div>
      {p.seller ? (
        <div style={{ position: "absolute", right: 40, top: 30 + enterY(e, 2), display: "flex", alignItems: "center", gap: 8, ...TY.bodySm, color: C.inkMuted }}>
          Listed by <Avatar account={p.seller} size={22} /> <span style={{ ...mono(500), fontSize: 13.5, color: C.ink }}>{p.seller}</span>
        </div>
      ) : null}

      {/* left column: price + Buy + how buying works */}
      <div style={{ position: "absolute", left: BUY.x, top: BUY.y + enterY(e, 3), width: BUY.w }}>
        <BuyPanel price={p.price} balances={p.balances} sigCount={n} unused={p.rows.filter((r) => r.variant === "unused").length} buy={p.buy} spin={p.spin ?? 0} />
        <HowBuying id={p.id} price={p.price} seller={p.seller} />
      </div>

      {/* right column: the history panel */}
      <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y + enterY(e, 5), width: PANEL.w, height: panelH, background: C.surface, borderRadius: 24, border: `1.5px solid ${C.line}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: 0, top: enterY(e, 5), width: PAGE.w, height: PAGE.h }}>
        <div style={{ position: "absolute", left: ROW.x, top: 112, width: ROW.w, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ ...display(800), fontSize: 22, lineHeight: "30px", letterSpacing: "-0.015em", color: C.ink }}>
            History · {n} {n === 1 ? "signature" : "signatures"}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              ...sans(600),
              fontSize: 13.5,
              padding: "6px 12px",
              borderRadius: 999,
              background: C.sunken,
              color: C.ink,
              transform: `scale(${p.checked && p.checkedPop !== undefined ? popScale(p.checkedPop) : 1})`,
              transformOrigin: "100% 50%",
            }}
          >
            {p.checked ? <MonitorCheck size={15} strokeWidth={STROKE} /> : <Spinner size={15} spin={p.spin ?? 0} color={C.ink} />}
            {p.checked ? "Checked in your browser" : "Checking in your browser…"}
          </span>
        </div>
        <VerdictBlock verdict={p.verdict} count={n} pop={p.verdictPop} spin={p.spin ?? 0} />
        {p.rows.map((r, i) => {
          const a = p.rowAnim[i] ?? {};
          const y = ROW.y + i * (ROW.h + ROW.gap);
          const checking = a.checking ?? 0;
          const mix = r.variant === "unused" ? Math.max(0, Math.min(1, a.unusedMix ?? 1)) : 1;
          return (
            <div key={i} style={{ position: "absolute", left: ROW.x + (a.shake ?? 0), top: y, width: ROW.w, height: ROW.h }}>
              {mix < 1 ? (
                <div style={{ position: "absolute", inset: 0, opacity: 1 - mix }}>
                  <RecordOutline chain={r.chain} label={r.label} variant="record" w={ROW.w} h={ROW.h} scale={1} draw={a.draw ?? 1} type={a.type ?? 1} />
                </div>
              ) : null}
              <div style={{ position: "absolute", inset: 0, opacity: mix }}>
                <RecordOutline
                  chain={r.chain}
                  label={r.label}
                  variant={r.variant ?? "record"}
                  stampText={r.stampText}
                  w={ROW.w}
                  h={ROW.h}
                  scale={1}
                  draw={a.draw ?? 1}
                  type={a.type ?? 1}
                  stamp={a.stamp ?? 0}
                />
              </div>
              {checking > 0.001 ? (
                <div style={{ position: "absolute", right: 16, top: ROW.h / 2, transform: `translateY(-50%) scale(${checking})`, transformOrigin: "100% 50%" }}>
                  <StatusPill tone="muted" icon="spinner" spin={p.spin ?? 0} word="Checking…" />
                </div>
              ) : null}
              {a.warnPop !== undefined && a.warnPop > 0 ? <WarnRing pop={a.warnPop} /> : null}
            </div>
          );
        })}
        {p.scan !== undefined && (p.scanBrackets ?? 0) > 0.001 ? (
          <div style={{ position: "absolute", left: ROW.x, top: ROW.y }}>
            <ScanBeam width={ROW.w} height={rowsH} progress={p.scan} brackets={p.scanBrackets ?? 1} radius={14} k={1} />
          </div>
        ) : null}
        <div style={{ position: "absolute", left: ROW.x, top: footerY, display: "flex", alignItems: "center", gap: 7, ...TY.caption, fontSize: 12.5, color: C.inkMuted }}>
          <ShieldCheck size={14} strokeWidth={STROKE} />
          Runs in your browser. Satchel&apos;s server isn&apos;t trusted for this.
        </div>
        <CharmPegs rows={p.rows} charms={p.charms} show={p.charmShow ?? 1} />
      </div>
      {p.overlay}
    </div>
  );
}

/** A ring that pops out of the danger badge when the charm's bonk bounces off the unused record (T6). */
function WarnRing({ pop }: { pop: number }) {
  const s = interpolate(pop, [0, 1], [0.6, 1.9]);
  const o = interpolate(pop, [0, 0.15, 1], [0, 0.9, 0]);
  return <div style={{ position: "absolute", right: 12, top: ROW.h / 2 - 16, width: 32, height: 32, borderRadius: 99, border: `2.5px solid ${C.danger}`, transform: `scale(${s})`, opacity: o }} />;
}

/** The verdict block at the top of the history panel (the UI kit's VerdictBlock, re-laid for the film). */
function VerdictBlock({ verdict, count, pop, spin }: { verdict: Verdict; count: number; pop?: number; spin: number }) {
  const s = pop === undefined ? 1 : popScale(pop);
  const box: CSSProperties = { position: "absolute", left: VERDICT.x, top: VERDICT.y, width: VERDICT.w, height: VERDICT.h, display: "flex", gap: 14, alignItems: "center", padding: "0 18px", borderRadius: 18, background: C.sunken, boxSizing: "border-box" };
  if (verdict === "checking") {
    return (
      <div style={box}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: C.surface, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Spinner size={24} spin={spin} color={C.inkMuted} />
        </span>
        <div>
          <div style={{ ...display(750), fontSize: 20, lineHeight: "26px", color: C.ink }}>
            Checking {count} past {count === 1 ? "signature" : "signatures"}…
          </div>
          <div style={{ ...TY.bodySm, color: C.inkMuted }}>Reading Bitcoin, Ethereum and Solana from your browser.</div>
        </div>
      </div>
    );
  }
  const clean = verdict === "clean";
  const color = clean ? C.success : C.danger;
  const Icon = clean ? ShieldCheck : ShieldAlert;
  return (
    <div style={box}>
      <span style={{ width: 48, height: 48, borderRadius: 999, background: color, display: "grid", placeItems: "center", flexShrink: 0, transform: `scale(${s})` }}>
        <Icon size={27} strokeWidth={2.2} color={C.white} />
      </span>
      <div style={{ minWidth: 0, transform: `scale(${pop === undefined ? 1 : 0.94 + 0.06 * Math.min(1, s)})`, transformOrigin: "0 50%" }}>
        <div style={{ ...display(800), fontSize: 24, lineHeight: "28px", letterSpacing: "-0.02em", color }}>{clean ? "Clean history" : `Blocked: 1 unused signature`}</div>
        <div style={{ ...TY.body, fontSize: 15, lineHeight: "21px", color: C.ink, marginTop: 1 }}>
          {clean ? "Clean. No past signature can move these coins." : "1 past signature could still move coins. The seller has to settle it first."}
        </div>
      </div>
    </div>
  );
}

/** Each record's charm on its peg, right of the row (drawn over the panel's edge). */
function CharmPegs({ rows, charms, show }: { rows: RowSpec[]; charms: CharmAnim[]; show: number }) {
  if (show <= 0.001) return null;
  return (
    <svg width={PAGE.w} height={PAGE.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {rows.map((r, i) => {
        const pv = pivotOf(i);
        const c = charms[i];
        if (!c) return null;
        const sh = show * (c.show ?? 1);
        if (sh <= 0.001) return null;
        const pegX0 = PANEL.x + PANEL.w - 2;
        return (
          <g key={i}>
            {/* the peg: a short ink arm from the panel edge with a jump ring at its tip */}
            <rect x={pegX0} y={pv.y - 3} width={pv.x - pegX0 + 2} height={6} rx={3} fill={C.ink} />
            <circle cx={pv.x} cy={pv.y + 2.4} r={3.4} fill={C.white} stroke={C.ink} strokeWidth={2.2} />
            <g transform={`translate(${pv.x} ${pv.y - (c.hop ?? 0)}) scale(${CH.u * sh})`}>
              <CharmShape fill={CHAIN[r.chain].color} angle={c.angle} face={c.face} squash={c.squash ?? 0} stemLen={CH.stemLen} drop={0} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ── the Buy panel (the UI kit's BuyBlock, with a Buy button that can wake up and press) ─────────────────────────────
function BuyPanel({ price, balances, sigCount, unused, buy, spin }: { price: string; balances: string; sigCount: number; unused: number; buy: BuyAnim; spin: number }) {
  const [num, cur] = [price.replace(/\s*[A-Z]+$/, ""), price.match(/[A-Z]+$/)?.[0] ?? "NEAR"];
  const busy = buy.mode === "recheck" || buy.mode === "wallet";
  const label = buy.mode === "recheck" ? "Re-checking history…" : buy.mode === "wallet" ? "Approve in your wallet…" : `Buy for ${price}`;
  const gp = buy.gatePop === undefined ? 1 : popScale(buy.gatePop);
  return (
    <div style={{ background: C.surface, borderRadius: 24, border: `1.5px solid ${C.line}`, padding: "18px 20px 18px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ ...TY.caption, color: C.inkMuted }}>Price</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ ...display(800), fontSize: 34, lineHeight: "40px", letterSpacing: "-0.03em", color: C.ink, ...NUM }}>{num}</span>
            <span style={{ ...display(700), fontSize: 18, color: C.inkMuted }}>{cur}</span>
          </div>
        </div>
        <div style={{ ...TY.caption, color: C.inkMuted, paddingBottom: 7 }}>Paid in {cur}</div>
      </div>
      <BuyButton label={label} buy={buy} busy={busy} spin={spin} />
      <OfferButton on={buy.wake} shake={buy.offerShake ?? 0} />
      <div style={{ marginTop: 12, minHeight: 42, transform: `scale(${gp})`, transformOrigin: "0 50%" }}>
        {buy.mode === "checking" ? (
          <Gate tone={C.inkMuted} spinner spin={spin} text="Checking history…" sub="Buy and offers turn on when your browser's check passes." />
        ) : buy.mode === "blocked" ? (
          <Gate tone={C.danger} Icon={ShieldAlert} text={`Blocked: ${unused} unused ${unused === 1 ? "signature" : "signatures"}`} sub="Buy and offers stay off until no old signature can move coins." />
        ) : buy.mode === "recheck" ? (
          <Gate tone={C.inkMuted} spinner spin={spin} text="Checking again before you buy" sub="If anything changed, nothing is charged." />
        ) : buy.mode === "wallet" ? (
          <Gate tone={C.success} Icon={ShieldCheck} text="Clean history · checked just now" sub={`Bound to this history: ${sigCount} ${sigCount === 1 ? "signature" : "signatures"}`} />
        ) : (
          <Gate tone={C.success} Icon={ShieldCheck} text="Clean history · checked just now" sub={`Your purchase is bound to these ${sigCount} signatures.`} />
        )}
      </div>
      <div style={{ height: 1, background: C.line, margin: "12px 0 12px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ ...TY.caption, color: C.inkMuted }}>You get</span>
        <span style={{ ...sans(650), fontSize: 14, color: C.ink, ...NUM }}>{balances}</span>
      </div>
    </div>
  );
}

/**
 * The Buy button. Greyed out = flat in the page (sunken fill, line-strong border, ink-muted label, no shadow).
 * Waking up (motion bible §2.3): it rises out of the page (lift −4 → 0 on rebound) while the fill fades to coral.
 * Pressed: 4 px into its shadow, coral → coral-deep. Ink label on coral, never white.
 */
function BuyButton({ label, buy, busy, spin }: { label: string; buy: BuyAnim; busy: boolean; spin: number }) {
  const w = Math.max(0, Math.min(1, buy.wake));
  const press = Math.max(0, Math.min(1, buy.press ?? 0));
  const coral = interpolateColors(press, [0, 1], [C.brand, C.brandDeep]);
  const fill = interpolateColors(w, [0, 1], [C.sunken, coral]);
  const border = interpolateColors(w, [0, 1], [C.lineStrong, C.ink]);
  const text = interpolateColors(w, [0, 1], [C.inkMuted, C.ink]);
  // lift: −4 flat … 0 rest; press sinks it 4 px
  const lift = buy.lift - 4 * press;
  const shadow = Math.max(0, 4 + lift) * w;
  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        ...sans(700),
        fontSize: 17,
        lineHeight: "22px",
        padding: "15px 20px",
        borderRadius: 18,
        background: fill,
        color: text,
        border: `2px solid ${border}`,
        boxShadow: `0 ${shadow}px 0 ${C.ink}`,
        transform: `translate(${buy.shake ?? 0}px, ${-lift}px)`,
        whiteSpace: "nowrap",
        opacity: interpolate(w, [0, 1], [0.4, 1]),
      }}
    >
      {busy ? <Spinner size={19} spin={spin} color={C.ink} /> : null}
      <span>{label}</span>
    </div>
  );
}

/**
 * "Make an offer" under Buy (the app's secondary button: white, line-strong border, ink label, no sticker drop).
 * It shares Buy's gate: greyed out (sunken, 40 %) while the history is checking or blocked, awake once it's clean.
 */
function OfferButton({ on, shake = 0 }: { on: number; shake?: number }) {
  const w = Math.max(0, Math.min(1, on));
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...sans(700),
        fontSize: 16,
        lineHeight: "22px",
        padding: "12px 20px",
        borderRadius: 18,
        background: interpolateColors(w, [0, 1], [C.sunken, C.surface]),
        color: interpolateColors(w, [0, 1], [C.inkMuted, C.ink]),
        border: `2px solid ${C.lineStrong}`,
        whiteSpace: "nowrap",
        opacity: interpolate(w, [0, 1], [0.4, 1]),
        translate: `${shake}px 0`,
      }}
    >
      <HandCoins size={18} strokeWidth={STROKE} />
      <span>Make an offer</span>
    </div>
  );
}

function Gate({ tone, Icon, spinner, spin = 0, text, sub }: { tone: string; Icon?: typeof ShieldCheck; spinner?: boolean; spin?: number; text: string; sub?: string }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
      <span style={{ marginTop: 1 }}>{spinner ? <Spinner size={17} spin={spin} color={tone} /> : Icon ? <Icon size={17} strokeWidth={STROKE} color={tone} /> : null}</span>
      <div>
        <div style={{ ...sans(650), fontSize: 14.5, lineHeight: "20px", color: tone }}>{text}</div>
        {sub ? <div style={{ ...TY.caption, fontSize: 12.5, color: C.inkMuted }}>{sub}</div> : null}
      </div>
    </div>
  );
}

/** "How buying works" (product buy.how) as a compact list under the Buy panel. */
function HowBuying({ id, price, seller }: { id: string; price: string; seller?: string }) {
  const steps = [`You pay ${price}`, `One transaction moves Satchel #${id} to you${seller ? ` and pays ${seller}` : " and pays the seller"}`, "You control the coins"];
  return (
    <div style={{ marginTop: 18, padding: "0 4px" }}>
      <div style={{ ...sans(650), fontSize: 14.5, lineHeight: "20px", color: C.ink }}>How buying works</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: C.sunken, display: "grid", placeItems: "center", flexShrink: 0, ...display(800), fontSize: 12, color: C.ink }}>{i + 1}</span>
            <span style={{ ...TY.caption, fontSize: 13, color: C.ink }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── captions (screen space) ──────────────────────────────────────────────────────────────────────────────────────
/**
 * The two-line captions over the browser (T5 "Checked in / your browser.", T6 "Blocked: / 1 unused signature"): one
 * shared setting so their cap tops sit ≥ 60 px from the frame top and their descenders ≥ 20 px over the browser's top
 * edge (y 274) at rest (QA v5 N5). Leading 0.95 is the motion bible's caption leading.
 */
export const CAPTION_2L = { y: 49, size: 100, leading: 0.95 } as const;
/**
 * Caption slap (motion bible §2.16): Funnel Display 800, sentence case, ink, scale 1.2 → 1 with contact on f4 and a
 * seeded tilt within ±2°. `contact` = the contact frame (the slap starts 4 f earlier). `out` = the frame it lifts off
 * (8 f, accelerating up and away). Centred on x, its top at `y`.
 */
export function Caption({ frame, text, contact, out, y, size = 120, seed, x = 960, color = C.ink, maxWidth, leading = 1.02 }: { frame: number; text: ReactNode; contact: number; out?: number; y: number; size?: number; seed: string; x?: number; color?: string; maxWidth?: number; leading?: number }) {
  const start = contact - 4;
  if (frame < start) return null;
  const f = frame - start;
  const { sx, sy, opacity } = slapAt(f, 30, 0, { from: 1.2, squash: 0.05, drop: 0 });
  const tilt = (random(`caption-${seed}`) - 0.5) * 4;
  let ex = 0;
  if (out !== undefined && frame >= out) {
    ex = interpolate(frame, [out, out + 8], [0, 1], { ...clamp, easing: EASE2.fall });
    if (ex >= 1) return null;
  }
  return (
    <div style={{ position: "absolute", left: x - 960, width: 1920, top: y, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: size,
          lineHeight: leading,
          letterSpacing: "-0.035em",
          color,
          opacity,
          textAlign: "center",
          maxWidth,
          whiteSpace: maxWidth ? "normal" : "nowrap",
          scale: `${sx * (1 + 0.05 * ex)} ${sy * (1 + 0.05 * ex)}`,
          rotate: `${tilt - 3 * ex}deg`,
          translate: `0 ${-240 * ex}px`,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ── sparkles at chosen points (motion bible §2.13: pop in, turn 0 → 30°, gone by f16, staggered 2 f) ───────────────
export function SparkPoints({ f, points, k = 1 }: { f: number; points: { x: number; y: number; r: number }[]; k?: number }) {
  if (f < 0 || f > points.length * 2 + 18) return null;
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {points.map((p, i) => {
        const g = f - 2 * i;
        if (g < 0) return null;
        const grow = spring({ frame: g, fps: 30, config: SPRING2.pop });
        const shrink = interpolate(g, [9, 16], [1, 0], clamp);
        const s = Math.max(0, grow * shrink);
        if (s <= 0.001) return null;
        return <Star4 key={i} x={p.x} y={p.y} r={p.r * s} k={k} rot={interpolate(g, [0, 16], [0, 30], clamp)} />;
      })}
    </svg>
  );
}

// ── charm faces ──────────────────────────────────────────────────────────────────────────────────────────────────
/** A face that eases between two looks by `t` (0..1). */
export function mixFace(a: CharmFace, b: CharmFace, t: number): CharmFace {
  const k = Math.max(0, Math.min(1, t));
  const n = (x: number | undefined, d: number) => x ?? d;
  return {
    blink: n(a.blink, 0) + (n(b.blink, 0) - n(a.blink, 0)) * k,
    smile: n(a.smile, 1) + (n(b.smile, 1) - n(a.smile, 1)) * k,
    wide: n(a.wide, 0) + (n(b.wide, 0) - n(a.wide, 0)) * k,
    joy: n(a.joy, 0) + (n(b.joy, 0) - n(a.joy, 0)) * k,
    grin: n(a.grin, 0) + (n(b.grin, 0) - n(a.grin, 0)) * k,
    o: n(a.o, 0) + (n(b.o, 0) - n(a.o, 0)) * k,
    tilt: n(a.tilt, 0) + (n(b.tilt, 0) - n(a.tilt, 0)) * k,
    look: {
      x: n(a.look?.x, 0) + (n(b.look?.x, 0) - n(a.look?.x, 0)) * k,
      y: n(a.look?.y, 0) + (n(b.look?.y, 0) - n(a.look?.y, 0)) * k,
    },
  };
}

export const CHAIN_OF_ROW: Chain[] = ["btc", "evm", "sol"];

