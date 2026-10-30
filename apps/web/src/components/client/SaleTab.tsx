"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { CircleCheck, Hourglass, Info, Landmark, LoaderCircle, Lock, Package, RefreshCw, Snowflake, Tag, TriangleAlert, Undo2, Wallet, type LucideIcon } from "lucide-react";
import {
  GateLine,
  Record,
  Verdict,
  buyButtonModel,
  checkedAgo,
  gateModel,
  hintModel,
  listedAgo,
  recordRows,
  revealSchedule,
  verdictAllowsBuy,
  verdictModel,
  type BuyPhase,
  type ReportMode,
  type VerdictModel,
} from "@/components/Clean";
import { useConnect } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { Handoff, Receipt } from "@/components/client/Handoff";
import { useViewer, ViewerCard } from "@/components/client/SatchelPage";
import { SoldReceipt, TxValue, useUsdcRegistration } from "@/components/client/SoldReceipt";
import { ObjCol, ObjMain } from "@/components/SatchelWallet";
import { announce, toast, usePinnedBar } from "@/components/client/Toaster";
import { useCleanCheck } from "@/components/client/useCleanCheck";
import { AmountInput, Button, EmptyState, ExternalLink, Icon, Morph, Segmented, buttonClass, cx } from "@/components/ui";
import { useNow } from "@/lib/clock";
import { copy, errorCopy } from "@/lib/copy";
import { CONTRACT_ROLE, FAUCETS } from "@/lib/config";
import { buyEnabled, counts } from "@/lib/data/clean";
import { refreshSnapshot } from "@/lib/data/client";
import { dataSource } from "@/lib/data/source";
import type { CleanReport, SatchelSnapshot } from "@/lib/data/types";
import { formatBlocks, NBSP, parseUnits } from "@/lib/format";
import { readMotionMode, subscribeMotionMode } from "@/lib/motion-flag";
import { EASE, play, stickOnTracks, type Track } from "@/lib/motion/play";
import { calls, contractViews } from "@/lib/near/contract";
import { DEFAULT_BLOCK_MS } from "@/lib/near/constants";
import { usdcBuyUsedAmount } from "@/lib/near/outcome";
import { runCall } from "@/lib/near/run-call";
import type { Currency, Listing } from "@/lib/near/types";
import { useWallet } from "@/lib/near/wallet";
import { cardChips, holdingsSentence, priceText } from "@/lib/view";
import { holdingText, holdings, splitHoldings } from "@/lib/holdings";
import { CoinIcon } from "@/components/brand/CoinIcon";

/**
 * The Sale tab of `/s/[id]` (app-screens §5; proto app-sale.html), inside S's object page: each view brings its column
 * (`ObjCol`) and its main block (`ObjMain`), and Buy's success takes over the whole object view (`data-obj-takeover`).
 * - **Buy** (a visitor on a listed Satchel): the offer, the clean-history verdict, You get, the record. Only the buyer's
 *   BROWSER check enables Buy; the server's check is shown, labelled as the server's, until it lands. Before the call:
 *   a synchronous re-check and a re-read of the listing and `sig_count` (the "This listing changed" interstitial).
 * - **The owner's Sell tab**: Not for sale (the quiet period) or For sale (the one Stop selling, always the tracked
 *   path), then What buyers see from the owner's own browser; `?list=1` opens the Sell sheet.
 * - **Sold**: the seller after a sale (SoldReceipt).
 * The server HTML is the visitor's view (judges): the price, the listing and the server hint in `listing-facts`.
 */
export function SaleTab({ snap, hint, openList, serverNow }: { snap: SatchelSnapshot; hint: CleanReport | null; openList: boolean; serverNow: number }) {
  const { live, isOwner, sale, accountId } = useViewer(snap);
  // Once a purchase starts, stay on the buyer's view: the buyer becomes the owner mid-flow (hand-off + receipt).
  const [buying, setBuying] = useState(false);
  const id = snap.token_id;
  const view = buying ? "buy" : isOwner ? "owner" : sale && accountId ? "sold" : live.listing ? "buy" : "none";
  useTabTitle(view === "owner" ? `${copy.page.tabs.sell} · ${copy.card.name(id)}` : view === "sold" ? `${copy.page.tabs.sold} · ${copy.card.name(id)}` : view === "buy" ? `${copy.page.tabs.buy} · ${copy.card.name(id)}` : `Sale · ${copy.card.name(id)}`);
  if (view === "buy") return <BuyView snap={snap} hint={hint} serverNow={serverNow} onStart={() => setBuying(true)} onStop={() => setBuying(false)} />;
  if (view === "owner") return <OwnerSale snap={snap} openList={openList} />;
  if (view === "sold" && sale && accountId) return <SoldReceipt sale={sale} accountId={accountId} chips={cardChips(live)} />;
  return <NotForSale snap={snap} />;
}

/* ── Shared hooks ───────────────────────────────────────────────────────────────────────────────────────────────── */

const noop = () => () => {};
/** False while hydrating the server HTML (the hint view), true after: the browser's check starts here. */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Reduced motion, live (`<html data-motion>`, the head flag); false on the server, where nothing moves anyway. */
function useReducedMotion() {
  return useSyncExternalStore(subscribeMotionMode, () => readMotionMode() === "reduce", () => false);
}

/** The tab's title follows the view (the server's metadata can't know the viewer): "Sell · Satchel #1 · Satchel". */
function useTabTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Satchel`;
  }, [title]);
}

interface Reveal {
  /** The browser result being shown. */
  shown: CleanReport | null;
  /** How many of its rows have resolved (in list order). */
  revealed: number;
  /** The verdict has resolved (the gate line and the verdict show the result). */
  done: boolean;
  /** Buy has risen (only then can a clean result enable it). */
  risen: boolean;
}
const NO_REVEAL: Reveal = { shown: null, revealed: 0, done: false, risen: false };

const sameResult = (a: CleanReport, b: CleanReport) =>
  a.aggregate === b.aggregate && a.items.length === b.items.length && a.items.every((x, i) => x.seq === b.items[i].seq && x.status === b.items[i].status);

/**
 * The staged reveal of a browser result (motion-spec §9): rows resolve in list order 220 ms apart, the verdict 320 ms
 * after the last, Buy rises 160 ms later. Re-checks that find the same result are silent (only the freshness moves); a
 * changed verdict replays its own beat. Reduced motion: everything at once.
 */
function useReveal(report: CleanReport | null, reduce: boolean): Reveal {
  const [st, setSt] = useState<Reveal>(NO_REVEAL);
  const cur = useRef<Reveal>(NO_REVEAL);
  useEffect(() => {
    cur.current = st;
  }, [st]);
  useEffect(() => {
    if (!report) return;
    const c = cur.current;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
    const n = report.items.length;
    if (c.shown && c.done && sameResult(c.shown, report)) {
      at(0, () => setSt((s) => ({ ...s, shown: report })));
    } else if (reduce) {
      at(0, () => setSt({ shown: report, revealed: n, done: true, risen: true }));
    } else {
      const rows = !c.shown; // the first result reveals each row; a changed verdict only replays the verdict
      const plan = revealSchedule(rows ? n : 0);
      at(0, () => setSt({ shown: report, revealed: rows ? 0 : n, done: false, risen: false }));
      if (rows) plan.items.forEach((ms, i) => at(ms, () => setSt((s) => ({ ...s, revealed: Math.max(s.revealed, i + 1) }))));
      at(plan.verdict, () => setSt((s) => ({ ...s, revealed: n, done: true })));
      at(plan.rise, () => setSt((s) => ({ ...s, risen: true })));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [report, reduce]);
  return st;
}

const rollIn = (el: Element): Track<Element>[] => [
  { el, prop: "opacity", frames: [[0, 0], [70, 0, EASE.out], [250, 1]] },
  { el, prop: "translate", frames: [[0, "0 8px"], [70, "0 8px", EASE.out], [250, "0 0"]] },
];

/**
 * The reveal's motion (motion-spec §9), played on the DOM the reveal just committed: a resolved row's marks stick on
 * (from 1.5×, a problem from 1.3×) and an unused one grows its danger bar; the verdict's mark sticks on when clean or
 * lands with a plain thunk when not, its words roll in; Buy rises out of the page into its drop. The verdict is
 * announced once in the polite region (and again only when it changes).
 */
function useRevealMotion(root: RefObject<HTMLElement | null>, st: Reveal, reduce: boolean, buyable: boolean) {
  const prev = useRef<Reveal>(NO_REVEAL);
  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = st;
    const el = root.current;
    if (!el || !st.shown) return;
    const verdictNow = st.done && !(p.done && p.shown === st.shown);
    if (verdictNow) {
      const words = [el.querySelector("[data-verdict-title]")?.textContent, el.querySelector("[data-gate-text]")?.textContent].filter(Boolean).join(" ");
      if (words) announce(words);
    }
    if (reduce) return;
    const tracks: Track<Element>[] = [];
    const from = p.shown === st.shown ? p.revealed : p.shown ? st.revealed : 0;
    for (let i = from; i < st.revealed; i++) {
      const it = st.shown.items[i];
      if (!it) continue;
      const problem = it.status === "unused";
      el.querySelectorAll(`[data-sig="${it.seq}"] [data-mark]`).forEach((m) => tracks.push(...stickOnTracks(m, 0, { from: problem ? 1.3 : 1.5, turn: 0 })));
      el.querySelectorAll(`[data-sig="${it.seq}"] [data-danger-bar]`).forEach((b) => tracks.push({ el: b, prop: "scale", frames: [[0, "1 0"], [80, "1 0", EASE.out], [300, "1 1"]] }));
    }
    if (verdictNow) {
      const agg = st.shown.aggregate;
      const mark = el.querySelector("[data-verdict-mark] [data-mark]");
      if (mark && (agg === "clean" || agg === "empty")) tracks.push(...stickOnTracks(mark, 0, { from: 1.5, turn: 0 }));
      else if (mark && (agg === "blocked" || agg === "unsafe")) {
        tracks.push({ el: mark, prop: "opacity", frames: [[0, 0, EASE.out], [160, 1]] });
        tracks.push({ el: mark, prop: "scale", frames: [[0, "1.15", EASE.out], [220, "1"]] });
      } else if (mark) tracks.push({ el: mark, prop: "opacity", frames: [[0, 0, EASE.out], [160, 1]] });
      el.querySelectorAll("[data-verdict-text], [data-strip-label], [data-gate-text]").forEach((x) => tracks.push(...rollIn(x)));
    }
    if (tracks.length) play(tracks, 320);
    // Buy rises once, when a buyable verdict lands (not again after a cancel brings the button back)
    if (buyable && st.risen && !(p.risen && p.shown === st.shown)) {
      const b = el.querySelector<HTMLElement>('[data-testid="buy"]');
      if (b && typeof b.animate === "function") {
        const shade = getComputedStyle(b).getPropertyValue("--sticker-shade").trim() || "currentColor";
        b.animate(
          [
            { translate: "0 3px", boxShadow: `0 0 0 ${shade}` },
            { translate: "0 0", boxShadow: `0 4px 0 ${shade}` },
          ],
          { duration: 220, easing: EASE.out },
        );
      }
    }
  }, [root, st, reduce, buyable]);
}

/** The wall clock, read in event handlers only (the receipt's time). */
const clockNow = () => Date.now();

/** A refusal (motion-spec §9): pressing a blocked Buy nudges it once. Reduced motion: nothing moves. */
function nudge(el: Element | null) {
  if (!el || readMotionMode() === "reduce") return;
  play([{ el, prop: "translate", frames: [[0, "0 0", EASE.inOut], [50, "-4px 0", EASE.inOut], [110, "4px 0", EASE.inOut], [170, "-3px 0", EASE.inOut], [220, "2px 0", EASE.out], [260, "0 0"]] }], 260);
}

/** The browser check threw before any result: show it as "can't verify" (never as clean), with Check again. */
function unknownReport(snap: SatchelSnapshot): CleanReport {
  return {
    token_id: snap.token_id,
    aggregate: "unknown",
    checked_at: 0,
    sig_count: snap.sig_count,
    listing_id: snap.listing?.id ?? null,
    one_of_two: false,
    role: CONTRACT_ROLE,
    checks: [],
    items: [],
    sources: [],
    unsafe_reason: null,
    encumbered_utxos: [],
    source: "browser",
  };
}

/** The browser report to show: the latest result, or a "can't verify" one when the check failed before any result. */
function useShownReport(snap: SatchelSnapshot, check: { report: CleanReport | null; failed: boolean }) {
  const failed = check.failed && !check.report;
  const fallback = useMemo(() => (failed ? unknownReport(snap) : null), [failed, snap]);
  return { report: check.report ?? fallback, failed };
}

type Note = { kind: "error" | "cancelled"; text: string };

/** Your own cancel is a neutral note (announced once); a failure is an alert in danger (app-screens §1.4). */
function NoteLine({ note, id, className }: { note: Note; id?: string; className?: string }) {
  if (note.kind === "cancelled")
    return (
      <p id={id} className={cx("flex items-start gap-2 font-sans text-body-sm text-ink", className)} data-note="cancelled">
        <Icon icon={Undo2} size={16} className="mt-0.5 text-ink-muted" />
        <span>{note.text}</span>
      </p>
    );
  return (
    <p id={id} role="alert" className={cx("flex items-start gap-2 font-sans text-body-sm text-danger", className)} data-note="error">
      <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
      <span>{note.text}</span>
    </p>
  );
}

/** A muted line with its icon under a pinned primary (proto `.foot-note`). */
function FootNote({ icon, children, id, tone = "muted" }: { icon: LucideIcon; children: ReactNode; id?: string; tone?: "muted" | "danger" }) {
  return (
    <p id={id} className={cx("flex items-start gap-2 font-sans text-body-sm", tone === "danger" ? "text-danger" : "text-ink-muted")}>
      <Icon icon={icon} size={16} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

/** The card in the object column from 1024 (S's `ViewerCard`; the compact header stands in below 1024). */
function ColumnCard({ snap }: { snap: SatchelSnapshot }) {
  return <ViewerCard snap={snap} sub />;
}

const PANEL = "flex flex-col gap-3 rounded-card border border-line bg-surface p-5";

/**
 * The ids this tab references (aria-describedby, aria-labelledby), one set per Satchel: after a client navigation Next
 * keeps the previous route's DOM (hidden), so a bare "gate-line" could resolve to another Satchel's gate line.
 */
const idsFor = (id: string) => ({
  gate: `gate-line-${id}`,
  verdict: `clean-title-${id}`,
  record: `record-title-${id}`,
  youGet: `you-get-${id}`,
  how: `how-buy-${id}`,
  buyersSee: `buyers-see-${id}`,
  salePanel: `sale-panel-title-${id}`,
  listedPanel: `listed-panel-title-${id}`,
  done: `buy-done-title-${id}`,
  listWhy: `list-why-${id}`,
  priceError: `price-error-${id}`,
});

/* ── Buy ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * `onStart` locks the page on the buyer's view while a purchase runs (the buyer becomes the owner mid-flow); `onStop`
 * releases it when the purchase ends without a sale (a cancel, an error, the interstitial's Cancel), so a Satchel that
 * is no longer for sale shows as such instead of its stale offer.
 */
function BuyView({ snap, hint, serverNow, onStart, onStop }: { snap: SatchelSnapshot; hint: CleanReport | null; serverNow: number; onStart: () => void; onStop: () => void }) {
  const { live: liveNow, accountId } = useViewer(snap);
  // freeze the listing we are buying (the live snapshot drops it as soon as the sale lands)
  const [frozen] = useState(() => liveNow);
  const live = liveNow.listing ? liveNow : frozen;
  const id = snap.token_id;
  const { wallet, ready } = useWallet();
  const { connect, connecting } = useConnect(); // Satchel's wallet picker (live) or the sample wallet (fixture)
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const now = useNow();
  const [phase, setPhase] = useState<BuyPhase>("idle");
  const check = useCleanCheck(id, phase !== "done"); // the 10 s re-check stops once it's bought
  const shownReport = useShownReport(snap, check);
  const st = useReveal(shownReport.report, reduce);
  const root = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [done, setDone] = useState<{ hash: string | null; buyer: string; at: number } | null>(null);
  const [again, setAgain] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const listing = live.listing;
  const ids = idsFor(id);
  const price = listing ? priceText(listing.price, listing.currency) : "";
  const mode: ReportMode = !hydrated ? "hint" : st.done && st.shown ? "browser" : "checking";
  const shown = st.shown;
  const t = shown ? checkedAgo(shown.checked_at, now || shown.checked_at) : "";
  const hintT = hint ? checkedAgo(hint.checked_at, now || serverNow) : "";
  const buyable = mode === "browser" && st.risen && !!shown && buyEnabled(shown.aggregate) && (phase === "idle" || phase === "refunded");
  const btn = buyButtonModel({ phase, buyable, ready, signedIn: !!accountId && !!wallet, price, connecting });
  const gate = gateModel(mode, shown, t);
  const verdict: VerdictModel = {
    ...verdictModel({ mode, report: mode === "hint" ? hint : shown, sigCount: live.sig_count, revealed: st.revealed, t: mode === "hint" ? hintT : t }),
    ...(mode === "browser" && shownReport.failed ? { checked: null } : {}),
  };
  useRevealMotion(root, st, reduce, buyable);

  if (!listing) return null; // rendered only while listed (or locked on the listing being bought)

  if (phase === "done" && done) return <BuyDone snap={snap} live={live} listing={listing} buyer={done.buyer} hash={done.hash} at={done.at} />;

  const onBuy = async () => {
    if (btn.busy) return;
    if (!btn.enabled) {
      // a refusal: nudge once and take the reader to the reason (the gate line)
      nudge(root.current?.querySelector('[data-testid="buy"]') ?? null);
      gateRef.current?.querySelector<HTMLElement>("[data-gate]")?.focus();
      return;
    }
    if (!accountId || !wallet) return connect();
    onStart();
    setNote(null);
    setPhase("recheck");
    // 1. the synchronous browser re-check right before Buy (kb/90 §7.5)
    const r = await check.recheck();
    if (!r) {
      setNote({ kind: "error", text: copy.buy.recheckFailed });
      setPhase("idle");
      onStop();
      return;
    }
    if (!buyEnabled(r.aggregate)) {
      setPhase("idle"); // the verdict changed: the reveal shows it and announces it
      onStop();
      return;
    }
    // 2. re-read the listing: (listing_id, expected_sig_count) must still match what was checked
    let s: Awaited<ReturnType<ReturnType<typeof contractViews>["satchel"]>>;
    try {
      s = await contractViews(dataSource().view).satchel(id);
    } catch {
      setNote({ kind: "error", text: copy.buy.readFailed });
      setPhase("idle");
      onStop();
      return;
    }
    if (!s?.listing || s.listing.id !== listing.id || s.sig_count !== r.sig_count) {
      setChanged(s?.listing ? copy.buy.changed(listing.id, price, s.listing.id, priceText(s.listing.price, s.listing.currency)) : copy.buy.delisted(listing.seller, id));
      setPhase("changed");
      return;
    }
    const tx = listing.currency === "usdc" ? calls.buyUsdc(id, listing.id, r.sig_count, listing.price) : calls.buyNear(id, listing.id, r.sig_count, listing.price);
    const res = await runCall(wallet, tx, accountId, (stage) => setPhase(stage === "wallet" ? "wallet" : "buying"));
    if (res.ok) {
      if (listing.currency === "usdc" && usdcBuyUsedAmount(res.value) === "0") {
        // the USDC came straight back (the listing moved first): nothing was bought
        setPhase("refunded");
        announce(`${copy.buy.refundedTitle}. ${copy.buy.refundedBody(price)}`);
        onStop();
        return;
      }
      setDone({ hash: res.hash, buyer: accountId, at: clockNow() });
      setPhase("done");
      // the hand-off is its own success screen; a toast only if the buyer left the page first (app-screens §1.4)
      if (!mounted.current) toast(copy.buy.toast(id));
      refreshSnapshot(id);
    } else if ("cancelled" in res) {
      setNote({ kind: "cancelled", text: copy.buy.cancelled });
      announce(copy.buy.cancelled);
      setPhase("idle");
      onStop();
    } else if (res.failure.code === "ERR_LISTING_CHANGED" || res.failure.code === "ERR_NOT_LISTED") {
      setChanged(copy.buy.delisted(listing.seller, id));
      setPhase("changed");
    } else {
      setNote({ kind: "error", text: errorCopy(res.failure.code, { id }) });
      setPhase("idle");
      onStop();
    }
  };

  const showHint = mode !== "browser" && !!hint;
  const ago = listedAgo(live.height, listing.listed_at, DEFAULT_BLOCK_MS);
  const rows = mode === "hint" ? recordRows(hint?.items ?? []) : shown ? recordRows(shown.items, mode === "browser" ? shown.items.length : st.revealed) : recordRows(hint?.items ?? [], 0);
  const recordSource = mode !== "hint" && shown ? shown : hint;
  const hintLine = (mode === "hint" || !shown) && hint ? hintModel(hint.aggregate, hintT).text : null;
  const target = verdict.target;
  const action =
    mode === "browser" && verdict.action === "see-signature" && target !== null ? (
      <a href={`#sig-${id}-${target}`} className={buttonClass({ variant: "link", className: "self-start" })}>
        {copy.buy.seeSignature}
      </a>
    ) : mode === "browser" && verdict.action === "check-again" ? (
      <Button
        icon={RefreshCw}
        loading={again}
        className="self-start"
        onClick={async () => {
          setAgain(true);
          await check.recheck();
          setAgain(false);
        }}
      >
        {copy.clean.checkAgain}
      </Button>
    ) : null;
  const showOffer = phase !== "changed";

  return (
    <div ref={root} className="contents">
      <ObjCol>
        <ColumnCard snap={snap} />
        {phase === "changed" && changed ? (
          <ChangedNotice
            text={changed}
            onCancel={() => {
              setPhase("idle");
              onStop();
            }}
          />
        ) : null}
        {phase === "refunded" ? (
          <section data-testid="buy-refunded" className="flex items-start gap-3 rounded-md bg-surface-sunken p-4 text-ink">
            <Icon icon={Undo2} size={20} className="mt-0.5" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-sans text-label text-ink">{copy.buy.refundedTitle}</p>
              <p className="font-sans text-body text-ink">{copy.buy.refundedBody(price)}</p>
            </div>
          </section>
        ) : null}
        {showOffer ? (
          <section data-testid="buy-block" aria-label={copy.buy.priceLabel} className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-5">
            <dl data-testid="listing-facts" data-judge-facts className="m-0 flex flex-col gap-1.5">
              <div className="flex flex-col gap-1.5">
                <dt className="flex items-center gap-2 font-sans text-[0.9375rem] leading-5 font-semibold text-ink-muted">
                  <Icon icon={Tag} size={16} />
                  {copy.buy.priceLabel}
                </dt>
                <dd className="m-0 font-display text-balance-hero-sm text-ink t-num">{price}</dd>
              </div>
              <div>
                <dt className="sr-only">{copy.buy.listingLabel}</dt>
                <dd className="m-0 font-sans text-body-sm text-ink-muted">{ago ? copy.buy.listing(listing.id, ago, listing.seller) : copy.buy.listingNoTime(listing.id, listing.seller)}</dd>
              </div>
              {showHint && hint ? (
                <div className="flex flex-wrap items-baseline gap-x-2 font-sans text-body-sm text-ink-muted">
                  <dt>{copy.buy.hintLabel}</dt>
                  <dd className="m-0" data-hint-aggregate={hint.aggregate}>
                    {copy.buy.hintValue(hintT, copy.clean.hintWord[hint.aggregate])}
                  </dd>
                </div>
              ) : null}
            </dl>
            <BuyBar>
              <div ref={gateRef}>
                <GateLine id={ids.gate} model={gate} focusable />
              </div>
              <button
                type="button"
                data-testid="buy"
                aria-describedby={ids.gate}
                aria-disabled={!btn.enabled}
                aria-busy={btn.busy || undefined}
                data-press={btn.enabled ? "" : undefined}
                data-latched={btn.busy ? "" : undefined}
                onClick={() => void onBuy()}
                className={buttonClass({ variant: "primary", size: "lg", block: true, disabled: !btn.enabled && !btn.busy, loading: btn.busy })}
              >
                <Morph
                  value={phase === "recheck" ? "recheck" : phase === "wallet" ? "wallet" : phase === "buying" ? "buying" : btn.connect ? (btn.busy ? "connecting" : "connect") : "buy"}
                  labels={{
                    connect: { label: copy.buy.connect, icon: Wallet },
                    connecting: { label: copy.nav.connecting, icon: LoaderCircle, spin: true },
                    buy: copy.buy.cta(price),
                    recheck: { label: copy.buy.recheck, icon: LoaderCircle, spin: true },
                    wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
                    buying: { label: copy.buy.buying, icon: LoaderCircle, spin: true },
                  }}
                />
              </button>
              {phase === "wallet" ? <p className="font-sans text-body-sm text-ink-muted">{copy.buy.walletHint}</p> : null}
              {note ? <NoteLine note={note} /> : null}
            </BuyBar>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-body-sm text-ink-muted">
              <span>{copy.buy.paidIn(listing.currency === "usdc" ? "USDC" : "NEAR")}</span>
              {listing.currency === "usdc" ? (
                <ExternalLink href={FAUCETS.usdc} className="min-h-11 font-semibold">
                  {copy.buy.getUsdc}
                </ExternalLink>
              ) : null}
            </p>
          </section>
        ) : null}
      </ObjCol>
      <ObjMain>
        {showOffer ? (
          <div className="flex flex-col gap-3">
            <Verdict model={verdict} action={action} titleId={ids.verdict} />
            {liveNow.listing ? <FreezeLine /> : null}
          </div>
        ) : liveNow.listing ? (
          <FreezeLine />
        ) : null}
        <YouGet live={live} encumbered={mode === "browser" && shown ? shown.encumbered_utxos.length : 0} headingId={ids.youGet} />
        {showOffer ? (
          <>
            <Record report={recordSource ?? { checks: [], sources: [] }} rows={rows} tokenId={id} promise={verdictAllowsBuy(mode, shown)} hintLine={hintLine} headingId={ids.record} />
            <HowBuying id={id} seller={listing.seller} headingId={ids.how} />
          </>
        ) : null}
      </ObjMain>
    </div>
  );
}

/** The bar that holds the gate line and Buy: pinned to the bottom of the screen below 1024, inline in the offer from 1024. */
function BuyBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  usePinnedBar(ref, true); // toasts sit above it on phones
  // the page pads its bottom by the bar's height, and keyboard focus scrolls clear of it (globals.css §7 reads
  // `--pinned-bar-h` on <html>), so neither the footer nor a focused control ends up under the bar
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.matchMedia !== "function") return;
    const root = document.documentElement;
    const mq = window.matchMedia("(max-width: 63.99rem)");
    const update = () => {
      if (mq.matches) root.style.setProperty("--pinned-bar-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
      else root.style.removeProperty("--pinned-bar-h");
    };
    update();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    mq.addEventListener?.("change", update);
    return () => {
      ro?.disconnect();
      mq.removeEventListener?.("change", update);
      root.style.removeProperty("--pinned-bar-h");
    };
  }, []);
  return (
    <div
      ref={ref}
      data-buybar
      data-pinned-bar
      className="fixed inset-x-0 bottom-0 z-45 border-t border-line bg-surface px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_var(--overlay-shade)] lg:static lg:z-auto lg:mt-1.5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
    >
      <div className="mx-auto flex w-full max-w-flow flex-col gap-2 lg:max-w-none lg:gap-2.5">{children}</div>
    </div>
  );
}

/** The interstitial when the listing changed under the buyer (kb/90 §7.5): it replaces the offer. */
function ChangedNotice({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <section role="alert" className="flex items-start gap-3 rounded-md bg-surface-sunken p-4 text-ink">
      <Icon icon={TriangleAlert} size={20} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="font-sans text-body text-ink">{text}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            {copy.buy.reviewNew}
          </Button>
          <Button onClick={onCancel}>{copy.buy.cancel}</Button>
        </div>
      </div>
    </section>
  );
}

/** The freeze note (proto `.freeze-line`): what the pause guarantees a buyer. */
function FreezeLine() {
  return (
    <p id="freeze" className="flex items-start gap-2.5 rounded-md bg-surface-sunken px-4 py-3.5 font-sans text-[0.9375rem] leading-5.5 text-ink">
      <Icon icon={Snowflake} size={20} className="mt-px text-frozen" />
      <span>
        <b className="font-semibold text-frozen">{copy.freeze.title}.</b> {copy.freeze.buyer}
      </span>
    </p>
  );
}

/** You get: the native amounts (a summary of the card's ledger), never fiat; unconfirmed deposits never count. */
function YouGet({ live, encumbered, headingId }: { live: SatchelSnapshot; encumbered: number; headingId: string }) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center">
        <h2 id={headingId} className="font-display text-heading text-ink">
          {copy.buy.youGet}
        </h2>
      </div>
      {/* every coin it holds, on every network and inside (lib/holdings.ts), then the home coins still at zero */}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {splitHoldings(holdings(live)).shown.map((h) => {
          const zero = h.amount === 0n;
          return (
            <li key={h.key} data-chain={h.core ? (h.chain ?? undefined) : undefined} data-holding={h.key} className="flex items-center gap-3">
              <CoinIcon coin={h.coin} badge={h.badge} size={30} className="flex-none" />
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span className={cx("font-display text-[1.375rem] leading-6.5 font-extrabold tracking-[-0.02em] t-num", h.amount === null || zero ? "text-ink-muted" : "text-ink")}>
                  {h.amount === null ? "—" : (holdingText(h, false) ?? "—")}
                </span>
                {/* the no-break space keeps "0.0005 BTC" one phrase in the text layer, out of the flow (as the card's ledger) */}
                <span className="sr-only">{NBSP}</span>
                <span className="font-sans text-[0.875rem] leading-5 font-semibold text-ink-muted">{h.ticker}</span>
                <span className="w-full font-sans text-caption text-ink-muted">{h.networkName}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="font-sans text-body-sm text-ink-muted">
        {copy.buy.addressesToo} {copy.buy.unconfirmed}
      </p>
      {encumbered > 0 ? (
        <p className="flex items-start gap-2 font-sans text-body-sm text-ink">
          <Icon icon={TriangleAlert} size={16} className="mt-0.5 text-danger" />
          <span>{copy.buy.encumbered(encumbered)}</span>
        </p>
      ) : null}
    </section>
  );
}

function HowBuying({ id, seller, headingId }: { id: string; seller: string; headingId: string }) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center">
        <h2 id={headingId} className="font-display text-heading text-ink">
          {copy.buy.how.title}
        </h2>
      </div>
      <ol className="m-0 grid list-none gap-2.5 p-0 xl:grid-cols-3">
        {copy.buy.how.steps(id, seller).map((s, i) => (
          <li key={s} className="flex items-center gap-3 rounded-md bg-surface-sunken px-4 py-3.5 font-sans text-[0.9375rem] leading-5.5 text-ink xl:items-start">
            <span aria-hidden="true" className="grid size-7 flex-none place-items-center rounded-full bg-surface font-display text-[0.9375rem] leading-none font-extrabold">
              {i + 1}
            </span>
            <span className="min-w-0 wrap-anywhere">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Bought: the buyer's hand-off (Yours sticks on), the sentence, the receipt and Open your Satchel, as one centred column. */
function BuyDone({ snap, live, listing, buyer, hash, at }: { snap: SatchelSnapshot; live: SatchelSnapshot; listing: Listing; buyer: string; hash: string | null; at: number }) {
  const id = snap.token_id;
  const price = priceText(listing.price, listing.currency);
  const holdings = holdingsSentence(live);
  useTabTitle(copy.buy.done(id).replace(/\.$/, ""));
  // the takeover replaces a long page: show it from its top (the hand-off), wherever the buyer pressed Buy from; Buy
  // can be pressed far down the page (the 1280 column is sticky, the phone's bar is pinned) and the page gets shorter
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);
  return (
    <section data-obj-takeover data-testid="buy-done" aria-labelledby={idsFor(id).done} className="mx-auto flex w-full max-w-140 flex-col gap-5 lg:col-span-full lg:row-span-full">
      <Handoff
        variant="buy"
        tokenId={id}
        from={listing.seller}
        to={buyer}
        chips={cardChips(live)}
        sentence={copy.buy.done(id)}
        sentenceAs="h1"
        sentenceSize="lg"
        sentenceId={idsFor(id).done}
        sub={copy.buy.doneBody(holdings)}
        live={`${copy.buy.done(id)} ${copy.buy.doneBody(holdings)}`}
      >
        <Receipt
          rows={[
            { label: copy.buy.receipt.price, value: <span className="t-num">{price}</span> },
            { label: copy.buy.receipt.seller, value: listing.seller, mono: true },
            { label: copy.buy.receipt.listing, value: `#${listing.id}` },
            { label: copy.buy.receipt.tx, value: <TxValue hash={hash} at={at} /> },
          ]}
        />
        <Button variant="primary" size="lg" block href={`/s/${id}`}>
          {copy.buy.open}
        </Button>
      </Handoff>
    </section>
  );
}

/** A visitor on a Satchel that isn't listed (or no longer is). */
function NotForSale({ snap }: { snap: SatchelSnapshot }) {
  const id = snap.token_id;
  return (
    <>
      <ObjCol lgOnly>
        <ColumnCard snap={snap} />
      </ObjCol>
      <ObjMain>
        <EmptyState
          className="my-6"
          artSize={72}
          title={copy.buy.notForSale(id)}
          body={copy.buy.notForSaleBody}
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button variant="primary" size="lg" href="/market">
                {copy.buy.seeForSale}
              </Button>
              <Button size="lg" href={`/s/${id}`}>
                {copy.buy.lookInside}
              </Button>
            </div>
          }
        />
      </ObjMain>
    </>
  );
}

/* ── The owner's Sell tab ───────────────────────────────────────────────────────────────────────────────────────── */

/** Blocks until the quiet period lets it be listed: 0 = ready, null = unknown (no height read). */
function blocksLeft(live: SatchelSnapshot): number | null {
  if (live.height == null) return null;
  if (live.last_sign_height === 0) return 0;
  return Math.max(0, live.listable_at - live.height);
}

/** The quiet period's progress (n of 250 blocks), a coral line on sunken. */
function QuietBar({ left, quiet }: { left: number; quiet: number }) {
  const done = Math.max(0, quiet - left);
  return (
    <div
      role="progressbar"
      aria-label={copy.sell.quiet.name}
      aria-valuemin={0}
      aria-valuemax={quiet}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${quiet} blocks`}
      className="h-2 w-full overflow-hidden rounded-pill bg-surface-sunken"
    >
      <span className="block h-full rounded-[inherit] bg-brand-line" style={{ width: `${Math.round((done / Math.max(1, quiet)) * 100)}%` }} />
    </div>
  );
}

function OwnerSale({ snap, openList }: { snap: SatchelSnapshot; openList: boolean }) {
  const { live } = useViewer(snap);
  const id = snap.token_id;
  const reduce = useReducedMotion();
  const now = useNow();
  // R11.2: the owner's browser runs the same check on the Sell tab (fixes inventory 6b: it never ran before)
  const check = useCleanCheck(id, true);
  const shownReport = useShownReport(snap, check);
  const st = useReveal(shownReport.report, reduce);
  const root = useRef<HTMLDivElement>(null);
  const [again, setAgain] = useState(false);
  useRevealMotion(root, st, reduce, false);
  const ids = idsFor(id);
  const mode: ReportMode = st.done && st.shown ? "browser" : "checking";
  const shown = st.shown;
  const t = shown ? checkedAgo(shown.checked_at, now || shown.checked_at) : "";
  const verdict: VerdictModel = {
    ...verdictModel({ mode, report: shown, sigCount: live.sig_count, revealed: st.revealed, t }),
    ...(mode === "browser" && shownReport.failed ? { checked: null } : {}),
  };
  const rows = shown ? recordRows(shown.items, mode === "browser" ? shown.items.length : st.revealed) : [];
  const action =
    mode === "browser" && verdict.action === "see-signature" && verdict.target !== null ? (
      <a href={`#sig-${id}-${verdict.target}`} className={buttonClass({ variant: "link", className: "self-start" })}>
        {copy.buy.seeSignature}
      </a>
    ) : mode === "browser" && verdict.action === "check-again" ? (
      <Button
        icon={RefreshCw}
        loading={again}
        className="self-start"
        onClick={async () => {
          setAgain(true);
          await check.recheck();
          setAgain(false);
        }}
      >
        {copy.clean.checkAgain}
      </Button>
    ) : null;
  return (
    <div ref={root} className="contents">
      <ObjCol>
        <ColumnCard snap={snap} />
        {live.listing ? <ListedPanel snap={snap} /> : <NotListedPanel snap={snap} />}
      </ObjCol>
      <ObjMain>
        <section aria-labelledby={ids.buyersSee} className="flex flex-col gap-3">
          <div>
            <div className="flex min-h-11 items-center">
              <h2 id={ids.buyersSee} className="font-display text-heading text-ink">
                {copy.sell.buyersSee}
              </h2>
            </div>
            <p className="font-sans text-body text-ink-muted">{copy.sell.buyersSeeNote}</p>
          </div>
          <Verdict model={verdict} action={action} headingLevel={3} titleId={ids.verdict} />
        </section>
        <Record report={shown ?? { checks: [], sources: [] }} rows={rows} tokenId={id} promise={verdictAllowsBuy(mode, shown)} clearHref={`/s/${id}/activity`} headingId={ids.record} />
      </ObjMain>
      {openList && !live.listing ? <SellFlow snap={snap} report={mode === "browser" ? shown : null} /> : null}
    </div>
  );
}

function NotListedPanel({ snap }: { snap: SatchelSnapshot }) {
  const { live } = useViewer(snap);
  const id = snap.token_id;
  const left = blocksLeft(live);
  return (
    <section aria-labelledby={idsFor(id).salePanel} className={PANEL} data-testid="sale-panel">
      <h2 id={idsFor(id).salePanel} className="flex items-center gap-2.5 font-display text-heading text-ink">
        <Icon icon={Tag} size={20} className="text-ink-muted" />
        {copy.sell.tab.notListed}
      </h2>
      {left === null ? null : left > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2 font-sans text-[0.875rem] leading-5 font-semibold text-frozen">
            <Icon icon={Hourglass} size={16} className="mt-0.5" />
            {copy.sell.quiet.wait(formatBlocks(left, DEFAULT_BLOCK_MS))}
          </p>
          <QuietBar left={left} quiet={live.quiet_period_blocks} />
        </div>
      ) : (
        <p className="flex items-start gap-2 font-sans text-[0.875rem] leading-5 font-semibold text-success">
          <Icon icon={CircleCheck} size={16} className="mt-0.5" />
          {copy.sell.tab.ready}
        </p>
      )}
      <p className="font-sans text-body-sm text-ink-muted">{copy.sell.quiet.why}</p>
      <Button variant="primary" size="lg" href={`/s/${id}/sale?list=1`} scroll={false} className="mt-1 self-start" data-testid="list-for-sale">
        {copy.sell.tab.list}
      </Button>
    </section>
  );
}

/** For sale: the price and listing, what stopping does, and the page's one Stop selling (the tracked path). */
function ListedPanel({ snap }: { snap: SatchelSnapshot }) {
  const { live, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const id = snap.token_id;
  const [phase, setPhase] = useState<"idle" | "wallet" | "doing">("idle");
  const [note, setNote] = useState<Note | null>(null);
  const listing = live.listing;
  if (!listing) return null;
  const price = priceText(listing.price, listing.currency);
  const stop = () => {
    if (!wallet || !accountId || phase !== "idle") return;
    setNote(null);
    runCall(wallet, calls.delist(id), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.sell.delistedShort, { tone: "neutral" });
        announce(copy.sell.delisted);
        refreshSnapshot(id);
      } else if ("cancelled" in r) {
        setNote({ kind: "cancelled", text: copy.sell.cancelled });
        announce(copy.sell.cancelled);
      } else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };
  return (
    <section id="freeze" aria-labelledby={idsFor(id).listedPanel} className={PANEL} data-testid="listed-panel">
      <h2 id={idsFor(id).listedPanel} className="flex items-start gap-2.5 font-display text-heading text-ink t-num">
        <Icon icon={Tag} size={20} className="mt-0.75 text-frozen" />
        <span className="t-num">{copy.sell.panel(price, listing.id)}</span>
      </h2>
      <p className="font-sans text-body-sm text-ink">{copy.sell.delistNote}</p>
      <p className="font-sans text-body-sm text-ink-muted">{copy.sell.reprice}</p>
      <Button size="lg" className="mt-1 self-start" loading={phase !== "idle"} spinner="none" disabled={!wallet} onClick={stop} data-testid="delist">
        <Morph
          value={phase}
          labels={{
            idle: { label: copy.freeze.delist, icon: Undo2 },
            wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
            doing: { label: copy.sell.delisting, icon: LoaderCircle, spin: true },
          }}
        />
      </Button>
      {phase === "wallet" ? <p className="font-sans text-body-sm text-ink-muted">{copy.buy.walletHint}</p> : null}
      {note ? <NoteLine note={note} /> : null}
    </section>
  );
}

/* ── The Sell sheet (`?list=1`) ─────────────────────────────────────────────────────────────────────────────────── */

const CHECK_ROW = "relative flex items-start gap-3 px-4 py-3 [li+&]:before:absolute [li+&]:before:inset-x-4 [li+&]:before:top-0 [li+&]:before:h-px [li+&]:before:bg-line";

function SellFlow({ snap, report }: { snap: SatchelSnapshot; report: CleanReport | null }) {
  const router = useRouter();
  const { live, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const id = snap.token_id;
  const [currency, setCurrency] = useState<Currency>("near"); // NEAR first and the default (the landing promise, H-26)
  const [text, setText] = useState("");
  const usdc = useUsdcRegistration(currency, accountId);
  const [phase, setPhase] = useState<"idle" | "wallet" | "listing">("idle");
  const [note, setNote] = useState<Note | null>(null);
  const ticker = currency === "usdc" ? "USDC" : "NEAR";
  const base = text.trim() ? parseUnits(text, currency === "usdc" ? 6 : 24) : null;
  const invalid = text.trim() !== "" && base === null;
  const left = blocksLeft(live);
  const quietOk = left === 0;
  const usdcOk = currency === "near" || usdc.registered === true;
  const priceOk = base !== null && base > 0n;
  const canList = quietOk && usdcOk && priceOk && phase === "idle";
  const priceShown = priceText(priceOk ? base.toString() : "0", currency);
  const c = report ? counts(report.items) : null;
  const agg = report?.aggregate ?? null;
  const risky = agg === "blocked" || agg === "settling" || agg === "unknown" || agg === "unsafe";
  const reason = phase !== "idle" ? null : !quietOk ? (left === null ? null : { icon: Hourglass, text: copy.sell.quiet.waitWhy(formatBlocks(left, DEFAULT_BLOCK_MS)) }) : !usdcOk ? { icon: Info, text: copy.sell.usdc.first } : !priceOk ? { icon: Info, text: copy.sell.form.priceWhy } : null;

  const list = () => {
    if (!canList || !wallet || !accountId || base === null) return;
    setNote(null);
    runCall(wallet, calls.list(id, base.toString(), currency), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "listing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.sell.listedShort(priceShown));
        announce(copy.sell.listedToast(priceShown));
        refreshSnapshot(id);
        router.replace(`/s/${id}`);
      } else if ("cancelled" in r) {
        setNote({ kind: "cancelled", text: copy.sell.cancelled });
        announce(copy.sell.cancelled);
      } else setNote({ kind: "error", text: r.failure.code === "ERR_QUIET_PERIOD" ? copy.sell.errQuiet(formatBlocks(left ?? live.quiet_period_blocks, DEFAULT_BLOCK_MS)) : errorCopy(r.failure.code, { id }) });
    });
  };

  const muted = "font-sans text-body-sm text-ink-muted";
  const history = !report || !c ? (
    <span className={muted}>{copy.sell.history.checking}</span>
  ) : agg === "blocked" ? (
    <span className={muted}>
      {copy.sell.history.blocked(Math.max(1, c.unused))}{" "}
      <Link href={`/s/${id}/activity`} className="font-semibold text-link underline decoration-1 underline-offset-3 hover:decoration-2">
        {copy.sell.history.howToSettle}
      </Link>
    </span>
  ) : agg === "settling" ? (
    <span className={muted}>{copy.sell.history.settling(Math.max(1, c.settling))}</span>
  ) : agg === "unknown" ? (
    <span className={muted}>{copy.sell.history.unknown(Math.max(1, c.unknown || report.sig_count - report.items.length))}</span>
  ) : agg === "unsafe" ? (
    <span className={muted}>{verdictModel({ mode: "browser", report, sigCount: report.sig_count, t: "" }).title}</span>
  ) : report.sig_count === 0 ? (
    <span className={muted}>{copy.sell.quiet.never}</span>
  ) : (
    <span className={muted}>{copy.sell.history.ok(report.sig_count)}</span>
  );
  const historyIcon: { icon: LucideIcon; cls: string; spin?: boolean } = !report
    ? { icon: LoaderCircle, cls: "text-frozen", spin: true }
    : agg === "blocked" || agg === "unsafe"
      ? { icon: TriangleAlert, cls: "text-danger" }
      : agg === "settling"
        ? { icon: Hourglass, cls: "text-frozen" }
        : agg === "unknown"
          ? { icon: Info, cls: "text-ink-muted" }
          : { icon: CircleCheck, cls: "text-success" };

  return (
    <FlowShell
      title={copy.sell.title(id)}
      meta={copy.sell.holds(holdingsSentence(live))}
      thumb
      closeHref={`/s/${id}/sale`}
      testId="sell-flow"
      action={
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-testid="list-cta"
            aria-disabled={!canList}
            aria-busy={phase !== "idle" || undefined}
            aria-describedby={reason ? idsFor(id).listWhy : undefined}
            data-press={canList ? "" : undefined}
            data-latched={phase !== "idle" ? "" : undefined}
            onClick={list}
            className={buttonClass({ variant: "primary", size: "lg", block: true, disabled: !canList && phase === "idle", loading: phase !== "idle" })}
          >
            <Morph
              value={phase}
              labels={{
                idle: copy.sell.cta(priceShown),
                wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
                listing: { label: copy.sell.listing, icon: LoaderCircle, spin: true },
              }}
            />
          </button>
          {phase === "wallet" ? <FootNote icon={Info}>{copy.buy.walletHint}</FootNote> : null}
          {reason ? (
            <FootNote id={idsFor(id).listWhy} icon={reason.icon}>
              {reason.text}
            </FootNote>
          ) : null}
          {risky && phase === "idle" ? <FootNote icon={TriangleAlert}>{copy.sell.history.warn}</FootNote> : null}
          {note ? <NoteLine note={note} /> : null}
        </div>
      }
    >
      <section aria-labelledby="sell-check-title" className="flex flex-col gap-2.5">
        <h3 id="sell-check-title" className="font-sans text-label text-ink">
          {copy.sell.checkTitle}
        </h3>
        <ul data-testid="list-checklist" className="m-0 list-none rounded-md border border-line bg-surface p-0">
          <li data-check="quiet" className={CHECK_ROW}>
            <Icon icon={quietOk ? CircleCheck : Hourglass} size={20} className={cx("mt-0.5", quietOk ? "text-success" : "text-frozen")} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-sans text-body text-ink">{copy.sell.quiet.name}</span>
              <span className="font-sans text-body-sm text-ink-muted">
                {left === null ? "…" : quietOk ? (live.last_sign_height === 0 ? copy.sell.quiet.never : copy.sell.quiet.done(live.quiet_period_blocks)) : copy.sell.quiet.wait(formatBlocks(left, DEFAULT_BLOCK_MS))}
              </span>
              {left !== null && left > 0 ? (
                <div className="mt-2">
                  <QuietBar left={left} quiet={live.quiet_period_blocks} />
                </div>
              ) : null}
            </div>
          </li>
          <li data-check="history" className={CHECK_ROW}>
            <Icon icon={historyIcon.icon} size={20} spin={historyIcon.spin} className={cx("mt-0.5", historyIcon.cls)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-sans text-body text-ink">{copy.sell.history.name}</span>
              {history}
            </div>
          </li>
          {currency === "usdc" ? (
            <li data-check="usdc" className={cx(CHECK_ROW, "flex-wrap")}>
              <Icon icon={usdc.registered ? CircleCheck : Landmark} size={20} className={cx("mt-0.5", usdc.registered ? "text-success" : "text-frozen")} />
              <div className="flex min-w-40 flex-1 flex-col">
                <span className="font-sans text-body text-ink">{copy.sell.usdc.name}</span>
                <span className="font-sans text-body-sm text-ink-muted">{usdc.registered === null ? "…" : usdc.registered ? copy.sell.usdc.ok : copy.sell.usdc.missing}</span>
              </div>
              {usdc.registered === false ? (
                <Button
                  loading={usdc.phase !== "idle"}
                  spinner="none"
                  disabled={!wallet}
                  onClick={usdc.register}
                  aria-label={usdc.phase === "idle" ? copy.sell.usdc.registerAria : undefined}
                  className="ml-8"
                  data-testid="usdc-register"
                >
                  <Morph
                    value={usdc.phase}
                    labels={{
                      idle: copy.sell.usdc.register,
                      wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
                      registering: { label: copy.sell.usdc.registering, icon: LoaderCircle, spin: true },
                    }}
                  />
                </Button>
              ) : null}
              {usdc.error ? <NoteLine note={{ kind: usdc.error.cancelled ? "cancelled" : "error", text: usdc.error.text }} className="basis-full pl-8" /> : null}
            </li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="sell-price-title" className="flex flex-col gap-2.5">
        <h3 id="sell-price-title" className="font-sans text-label text-ink">
          {copy.sell.form.price}
        </h3>
        <Segmented
          size="sm"
          label={copy.sell.form.currency}
          value={currency}
          onChange={(v) => {
            setCurrency(v);
            setNote(null);
          }}
          options={[
            { value: "near", label: "NEAR" },
            { value: "usdc", label: "USDC" },
          ]}
        />
        <AmountInput
          id="price"
          data-testid="price"
          ticker={ticker}
          value={text}
          placeholder="0"
          invalid={invalid}
          aria-label={copy.sell.form.priceIn(ticker)}
          aria-describedby={invalid ? idsFor(id).priceError : undefined}
          onChange={(e) => setText(e.target.value.replace(",", "."))}
          available={copy.sell.form.buyerGets(holdingsSentence(live))}
        />
        {invalid ? (
          <p id={idsFor(id).priceError} role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
            <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
            <span>{copy.sell.form.invalid}</span>
          </p>
        ) : null}
        <dl className="m-0 flex flex-col gap-2.5 font-sans text-[0.9375rem] leading-5.5">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{copy.sell.form.price}</dt>
            <dd className="m-0 text-right t-num">{priceShown}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{copy.sell.form.fee}</dt>
            <dd className="m-0 text-right">{copy.sell.form.feeNone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{copy.sell.form.deposit}</dt>
            <dd className="m-0 text-right t-num">
              {copy.sell.form.depositValue}
              <small className="block font-sans text-caption font-normal text-ink-muted">{copy.sell.form.depositNote}</small>
            </dd>
          </div>
          <div className="flex justify-between gap-4 font-bold">
            <dt className="text-ink">{copy.sell.form.receive}</dt>
            <dd className="m-0 text-right t-num">{priceShown}</dd>
          </div>
        </dl>
        <p className="font-sans text-body-sm text-ink-muted">{copy.sell.form.paid(accountId ?? "")}</p>
      </section>

      <section aria-labelledby="sell-while-title" className="flex flex-col gap-2.5">
        <h3 id="sell-while-title" className="font-sans text-label text-ink">
          {copy.sell.while.title}
        </h3>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {copy.sell.while.rows(id, priceShown).map((r, i) => (
            <li key={r} className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
              <Icon icon={[Lock, Tag, Package, Undo2][i] ?? Info} size={16} className="mt-0.5 text-ink-muted" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>
    </FlowShell>
  );
}
