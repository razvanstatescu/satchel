"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleQuestionMark,
  Gift,
  Handshake,
  Hourglass,
  Info,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Tag,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { checkedAgo, gateText, listedAgo } from "@/components/Clean";
import { SatchelCard } from "@/components/SatchelCard";
import { groupDigits, utcClock, utcDay, utcShort } from "@/components/Timeline";
import { Button, ExternalLink, Icon, RouteTabs, SatchelThumb, StatusPill, cx, type PillKind } from "@/components/ui";
import { CopyButton } from "@/components/client/CopyButton";
import { SignedNotSentCard } from "@/components/client/SigningProgress";
import { toast, usePinnedBar } from "@/components/client/Toaster";
import { useCleanCheck } from "@/components/client/useCleanCheck";
import { useMySale } from "@/components/client/useSale";
import { useNow } from "@/lib/clock";
import { CHAIN_NAME, copy, errorCopy, EXPLORER_NAME, TICKER } from "@/lib/copy";
import { refreshSnapshot, useLiveSnapshot } from "@/lib/data/client";
import type { CleanReport, SatchelSnapshot } from "@/lib/data/types";
import { formatAmount } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, type Track } from "@/lib/motion/play";
import { calls } from "@/lib/near/contract";
import { DEFAULT_BLOCK_MS } from "@/lib/near/constants";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { useIntents } from "@/lib/signing/client";
import { allZero, balanceBase, cardChips, explorerFor, priceText, UI_CHAINS, type UiChain } from "@/lib/view";

/**
 * The viewer-aware pieces of the Satchel object page `/s/[id]` (app-screens §1–§3; proto app-satchel.html). The server
 * HTML renders the VISITOR view (the judge's view: every fact as text, nothing hidden); in the browser the owner's view
 * upgrades it (the h1, the Yours sticker, the actions), and every live value (balances, status, signatures, owner)
 * follows the shared snapshot poll, so the card, the Inside rows and the Facts never disagree.
 */

/* ── The viewer ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Who is looking and what is live: the snapshot (polled), the connected account, whether it owns this Satchel, the
 * status with the owner's local upgrades (Signing while a request is in flight; Needs attention while a signed
 * transaction waits to be broadcast), this tab's intents for the token, and the seller's sale after a sale. Keep the
 * return shape: X (send, give) and C (sale) read it.
 */
export function useViewer(snap: SatchelSnapshot) {
  const live = useLiveSnapshot(snap);
  const { accountId } = useWallet();
  const intents = useIntents();
  const mine = intents.filter((i) => i.tokenId === snap.token_id);
  const isOwner = !!accountId && accountId === live.owner;
  // The seller's view after a sale (app-screens §3.2): the latest `sold` event of this token names us as seller.
  const sale = useMySale(snap.token_id, accountId, live.owner, !!accountId && !isOwner && live.owner !== "unavailable");
  const soldByMe = !!sale && !live.listing;
  const stuck = isOwner ? mine.filter((i) => i.stage === "signed_not_sent") : [];
  const inFlight = mine.some((i) => i.stage === "awaiting_wallet" || i.stage === "signing");
  let status = live.status;
  if (status !== "listed") {
    if (stuck.length) status = "needs_attention";
    else if (inFlight) status = "signing";
  }
  return { live, accountId, isOwner, status, mine, stuck, sale: soldByMe ? sale : null };
}

/** The card's state word: the seller sees Sold after a sale; everyone else the live status. */
const cardStatus = (v: ReturnType<typeof useViewer>): PillKind => (v.sale ? "sold" : v.status);

export type ObjTab = "wallet" | "activity" | "sale";

/** Which tab of the object page is showing (`forced` wins: previews). The flows (send, receive, transfer) sit over the
 * Wallet tab. */
export function useObjTab(tokenId: string, forced?: ObjTab): ObjTab {
  const p = usePathname() ?? "";
  if (forced) return forced;
  const base = `/s/${tokenId}`;
  if (p.startsWith(`${base}/activity`)) return "activity";
  if (p.startsWith(`${base}/sale`)) return "sale";
  return "wallet";
}

/* ── The object page frame (the layout renders these; each tab page brings its ObjCol + ObjMain) ────────────────── */

/**
 * The `<article>`: a flex column below 1024 (head → column → main, gap 20); from 1024 a grid with the column sticky on
 * the left beside the head and the main block: `320 | 1fr` (gap 32) at 1024–1279, where the content is 704 px beside the
 * side nav, then `minmax(320,400) | 1fr` (gap 40) from 1280. (The Wallet tab's main block is the page's one
 * `[data-judge-facts]`, not the article: a flow's sheet lives inside the article and its background must go inert.)
 */
export function ObjArticle({ snap, tab: forced, children }: { snap: SatchelSnapshot; tab?: ObjTab; children: ReactNode }) {
  const tab = useObjTab(snap.token_id, forced);
  return (
    <article
      data-obj
      data-tab={tab}
      data-satchel={snap.token_id}
      className="group/obj flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:[grid-template-areas:'col_head'_'col_main'] xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] xl:gap-x-10"
    >
      {children}
    </article>
  );
}

/**
 * The head: the h1 and the tabs (app-screens §1.2). The Wallet tab: "This NFT is a wallet." + its sub for visitors
 * (the judge's h1), "Satchel #N" for the owner. Activity and Sale: the compact header below 1024 (the 40×25 thumb,
 * "Satchel #N", the state pill); from 1024 the column's card stands in for the thumb and pill. Tabs are links with
 * `aria-current`: Wallet · Activity · Sell (owner) / Buy (listed) / Sold (the seller after a sale).
 */
export function ObjHead({ snap, tab: forced }: { snap: SatchelSnapshot; tab?: ObjTab }) {
  const tab = useObjTab(snap.token_id, forced);
  const v = useViewer(snap);
  const id = snap.token_id;
  const base = `/s/${id}`;
  const t = copy.page.tabs;
  const third = v.isOwner ? t.sell : v.live.listing ? t.buy : v.sale ? t.sold : null;
  const tabs = [
    { href: base, label: t.wallet, current: tab === "wallet" },
    { href: `${base}/activity`, label: t.activity, current: tab === "activity" },
    ...(third ? [{ href: `${base}/sale`, label: third, current: tab === "sale" }] : []),
  ];
  return (
    <div data-obj-head className="flex min-w-0 flex-col gap-4 group-has-data-obj-takeover/obj:hidden lg:[grid-area:head]">
      {tab === "wallet" ? (
        v.isOwner ? (
          <h1 className="m-0 font-display text-title text-ink">{copy.page.ownerH1(id)}</h1>
        ) : (
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-display text-title text-ink">{copy.page.visitorH1}</h1>
            <p className="m-0 max-w-[60ch] font-sans text-body text-ink-muted">{copy.page.visitorSub(id)}</p>
          </div>
        )
      ) : (
        // the name never truncates (at 320 "Satchel #3" lost its number to "Paused for sale"): the gaps tighten below
        // 360, and if it still can't fit the pill wraps under it
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 max-[359px]:gap-x-2">
          <SatchelThumb className="lg:hidden" />
          <h1 className="m-0 shrink-0 font-display text-heading text-ink lg:text-title">{copy.page.ownerH1(id)}</h1>
          <StatusPill status={cardStatus(v)} className="ml-auto lg:hidden" />
        </div>
      )}
      <RouteTabs label={t.label} tabs={tabs} className="-mt-1" />
    </div>
  );
}

/* ── The card ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/** motion-spec §8: a coin that is already on the card celebrates new coins: it peels up 6 px, turns and slaps back. */
function hopTracks(el: Element): Track<Element>[] {
  return [
    { el, prop: "translate", frames: [[0, "0 0", EASE.out], [120, "0 -6px", EASE.fall], [230, "0 1px", EASE.out], [320, "0 0"]] },
    { el, prop: "scale", frames: [[0, "1", EASE.out], [120, "1.18", EASE.inOut], [230, "0.94", EASE.out], [320, "1"]] },
    { el, prop: "rotate", frames: [[0, "0deg", EASE.out], [120, "-12deg", EASE.inOut], [230, "2deg", EASE.out], [320, "0deg"]] },
  ];
}

/** When a chain's balance grows while the card is on screen, its charm re-sticks (never on load; static when reduced). */
function useCoinHop(ref: RefObject<HTMLElement | null>, live: SatchelSnapshot) {
  const prev = useRef<Partial<Record<UiChain, bigint | null>> | null>(null);
  useEffect(() => {
    const now: Partial<Record<UiChain, bigint | null>> = {};
    for (const c of UI_CHAINS) now[c] = balanceBase(live, c);
    const before = prev.current;
    prev.current = now;
    if (!before || readMotionMode() === "reduce") return;
    for (const c of UI_CHAINS) {
      const a = before[c];
      const b = now[c];
      if (a == null || b == null || b <= a) continue;
      const coin = ref.current?.querySelector(`[data-chain="${c}"] svg`);
      if (coin) play(hopTracks(coin), 320);
    }
  }, [live, ref]);
}

/**
 * The live card (lg): the Yours sticker for the owner, the Sold pill for the seller after a sale. `sub` hides it below
 * 1024 (Activity and Sale, where the compact header stands in).
 */
export function ViewerCard({ snap, sub = false }: { snap: SatchelSnapshot; sub?: boolean }) {
  const v = useViewer(snap);
  const ref = useRef<HTMLDivElement>(null);
  useCoinHop(ref, v.live);
  return (
    <div ref={ref} className={sub ? "max-lg:hidden" : undefined}>
      <SatchelCard tokenId={v.live.token_id} size="lg" status={cardStatus(v)} owned={v.isOwner} chips={cardChips(v.live)} id="satchel-card" />
    </div>
  );
}

/* ── The Wallet tab's column ────────────────────────────────────────────────────────────────────────────────────── */

/** The owner's signed-but-not-sent transactions: X's card, at the top of the column (the one thing to do first). */
export function SignedNotSentSlot({ snap }: { snap: SatchelSnapshot }) {
  const { stuck } = useViewer(snap);
  if (!stuck.length) return null;
  return (
    <>
      {stuck.map((i) => (
        <SignedNotSentCard key={i.id} intent={i} />
      ))}
    </>
  );
}

/**
 * The Wallet tab's column (app-screens §3): the attention card, the card, then one block by viewer and state (the
 * owner's for-sale panel; the visitor's offer; the visitor's Add coins panel from 1024; the seller's note after a sale),
 * then the owner's actions.
 */
export function WalletColumn({ snap }: { snap: SatchelSnapshot }) {
  const v = useViewer(snap);
  return (
    <>
      <SignedNotSentSlot snap={snap} />
      <ViewerCard snap={snap} />
      {v.sale ? <SoldNote tokenId={snap.token_id} buyer={v.sale.buyer} /> : null}
      {v.live.listing ? v.isOwner ? <ForSalePanel snap={snap} /> : <OfferOverview snap={snap} /> : !v.isOwner && !v.sale ? <AddCoinsPanel tokenId={snap.token_id} /> : null}
      <OwnerActions snap={snap} />
    </>
  );
}

function SoldNote({ tokenId, buyer }: { tokenId: string; buyer: string }) {
  return (
    <p className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink-muted">
      <Icon icon={Handshake} size={16} className="mt-0.5" />
      <span>
        {copy.page.sold.note(buyer)}{" "}
        <Link href={`/s/${tokenId}/sale`} className="whitespace-nowrap text-link underline decoration-1 underline-offset-3 hover:decoration-2">
          {copy.page.sold.receipt}
        </Link>
      </span>
    </p>
  );
}

/** Visitors from 1024: what anyone can do here (it fills the column under the card). */
function AddCoinsPanel({ tokenId }: { tokenId: string }) {
  return (
    <section aria-labelledby="add-coins-title" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5 max-lg:hidden md:p-6">
      <h2 id="add-coins-title" className="m-0 font-display text-heading text-ink">
        {copy.wallet.fundcard.title}
      </h2>
      <p className="m-0 font-sans text-body text-ink-muted">{copy.wallet.fundcard.body}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button href={`/s/${tokenId}/receive`} icon={ArrowDown}>
          {copy.page.actions.fund}
        </Button>
        <Button variant="link" href={`/mint?from=/s/${tokenId}`}>
          {copy.page.mintOwn}
        </Button>
      </div>
    </section>
  );
}

/** The listing's age from block heights (C's `listedAgo`, so the Wallet and Sale tabs agree), else its block. */
function listedText(live: SatchelSnapshot, listedAt: number): string {
  return listedAgo(live.height, listedAt, DEFAULT_BLOCK_MS) ?? copy.act.block(groupDigits(listedAt));
}

const TONE_TEXT = { success: "text-success", frozen: "text-frozen", danger: "text-danger", muted: "text-ink-muted" } as const;

/** What a buyer's browser would conclude, said for the seller (app-screens §3.1 "Buyers see"). */
function buyersLine(report: CleanReport | null, now: number): { tone: keyof typeof TONE_TEXT; icon: LucideIcon; spin?: boolean; text: string } {
  const f = copy.page.forSale;
  if (!report || report.aggregate === "checking") return { tone: "frozen", icon: LoaderCircle, spin: true, text: f.checking };
  const count = (s: string) => Math.max(1, report.items.filter((i) => i.status === s).length);
  switch (report.aggregate) {
    case "clean":
    case "empty":
      return { tone: "success", icon: ShieldCheck, text: f.buyers(checkedAgo(report.checked_at, now || report.checked_at)) };
    case "settling":
      return { tone: "frozen", icon: Hourglass, text: f.buyersConfirming(count("settling")) };
    case "blocked":
      return { tone: "danger", icon: ShieldAlert, text: f.buyersBlocked(count("unused")) };
    case "unknown":
      return { tone: "muted", icon: CircleQuestionMark, text: f.buyersUnknown(count("unknown")) };
    case "unsafe":
      return { tone: "danger", icon: ShieldX, text: gateText("unsafe", report, "") };
  }
}

/**
 * The owner's one panel about the sale (`#freeze`; the old FreezeBanner and listed panel merged): the price, the
 * listing and its age, what buyers see (the owner's browser runs the buyers' check while it's for sale, R11 #2) and a
 * link to the listing. Stop selling is in the actions under it (the page's only one).
 */
function ForSalePanel({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner } = useViewer(snap);
  const listing = live.listing;
  const { report } = useCleanCheck(snap.token_id, isOwner && !!listing);
  const now = useNow();
  if (!listing) return null;
  const b = buyersLine(report, now);
  return (
    <section id="freeze" aria-labelledby="freeze-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="freeze-title" className="m-0 flex items-center gap-2.5 font-display text-heading text-ink t-num">
          <Icon icon={Tag} size={20} className="text-frozen" />
          {copy.page.forSale.title(priceText(listing.price, listing.currency))}
        </h2>
        <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.page.forSale.meta(listing.id, listedText(live, listing.listed_at))}</p>
      </div>
      <p className={cx("m-0 flex items-start gap-2 font-sans text-body-sm font-semibold", TONE_TEXT[b.tone])}>
        <Icon icon={b.icon} size={16} spin={b.spin} className="mt-0.5" />
        <span>{b.text}</span>
      </p>
      <Button variant="link" href={`/s/${snap.token_id}/sale`} className="-my-2 self-start">
        {copy.page.forSale.see}
      </Button>
    </section>
  );
}

/**
 * A bar pinned to the bottom of the screen below 1024 keeps the page end clear and keyboard focus out from under it
 * (globals.css §7 reads `--pinned-bar-h` on <html>, with a fallback so the space is kept without JS too), and lifts
 * toasts above it.
 */
function usePinnedBottom(ref: RefObject<HTMLElement | null>) {
  usePinnedBar(ref, true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--pinned-bar-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    update();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty("--pinned-bar-h");
    };
  }, [ref]);
}

/**
 * The visitor's offer while it's for sale (proto `offer--overview`): from 1024 a panel (For sale, the price, the
 * listing, Buy, the note); below 1024 only its bar, pinned to the bottom (the price, the listing, Buy, the note).
 */
function OfferOverview({ snap }: { snap: SatchelSnapshot }) {
  const { live } = useViewer(snap);
  const bar = useRef<HTMLDivElement>(null);
  usePinnedBottom(bar);
  const listing = live.listing;
  if (!listing) return null;
  const price = priceText(listing.price, listing.currency);
  return (
    <section aria-labelledby="offer-title" className="flex flex-col gap-2.5 max-lg:-mt-4 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-5">
      <p id="offer-title" className="m-0 flex items-center gap-2 font-sans text-label text-ink-muted max-lg:sr-only">
        <Icon icon={Tag} size={16} />
        {copy.buy.forSale}
      </p>
      <p className="m-0 font-display text-balance-hero-sm text-ink t-num max-lg:hidden">{price}</p>
      <p className="m-0 font-sans text-body-sm text-ink-muted max-lg:hidden">{copy.buy.listing(listing.id, listedText(live, listing.listed_at), listing.seller)}</p>
      <div
        ref={bar}
        data-pinned-bar
        className="flex flex-col gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-45 max-lg:border-t max-lg:border-line max-lg:bg-surface max-lg:px-4 max-lg:pt-3 max-lg:pb-[calc(14px+env(safe-area-inset-bottom))] max-lg:shadow-[0_-8px_24px_var(--overlay-shade)] lg:mt-1.5"
      >
        <div className="flex items-center gap-3">
          <p className="m-0 flex min-w-0 flex-col lg:hidden">
            <b className="font-display text-[1.375rem]/[1.625rem] font-extrabold tracking-[-0.02em] whitespace-nowrap text-ink t-num">{price}</b>
            <span className="font-sans text-caption whitespace-nowrap text-ink-muted">{copy.page.offerListing(listing.id)}</span>
          </p>
          <Button variant="primary" size="lg" href={`/s/${snap.token_id}/sale`} iconEnd={ArrowRight} className="max-lg:ml-auto">
            {copy.page.tabs.buy}
          </Button>
        </div>
        <p className="m-0 flex items-center gap-1.5 font-sans text-caption text-ink-muted">
          <Icon icon={ShieldCheck} size={14} />
          {copy.buy.checkNote}
        </p>
      </div>
    </section>
  );
}

/**
 * The owner's actions (app-screens §3.1): four labelled 52 px buttons in a 2×2 grid, one coral at most. Send is the
 * primary (secondary while a signed transaction waits: its Broadcast again is the primary then); with nothing inside,
 * Send is disabled and Add coins is the primary; while it's for sale, Send and Give are disabled and Sell becomes Stop
 * selling (secondary, the page's only one, the tracked call). A disabled action names its reason (`aria-describedby`).
 */
export function OwnerActions({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner, accountId, stuck } = useViewer(snap);
  const { wallet } = useWallet();
  const [phase, setPhase] = useState<"idle" | "wallet" | "doing">("idle");
  const [note, setNote] = useState<{ danger: boolean; text: string } | null>(null);
  if (!isOwner) return null;
  const id = snap.token_id;
  const base = `/s/${id}`;
  const listed = !!live.listing;
  const zero = allZero(live);
  const a = copy.page.actions;
  const why = "action-reason";
  const reason = phase === "wallet" ? copy.sign.wallet : phase === "doing" ? copy.sell.delisting : listed ? a.paused : zero ? a.noFunds : null;

  const stop = async () => {
    if (!wallet || !accountId || phase !== "idle") return;
    setNote(null);
    const r = await runCall(wallet, calls.delist(id), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing"));
    setPhase("idle");
    if (r.ok) {
      toast(copy.act.row.delisted, { tone: "neutral" });
      refreshSnapshot(id);
    } else if ("cancelled" in r) setNote({ danger: false, text: copy.sell.cancelled });
    else setNote({ danger: true, text: errorCopy(r.failure.code, { id }) });
  };

  return (
    <div data-testid="action-row" className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          href={`${base}/send`}
          variant={!listed && !zero && !stuck.length ? "primary" : "secondary"}
          size="lg"
          block
          icon={ArrowUp}
          disabled={listed || zero}
          aria-describedby={listed || zero ? why : undefined}
        >
          {a.send}
        </Button>
        <Button href={`${base}/receive`} variant={zero && !listed ? "primary" : "secondary"} size="lg" block icon={ArrowDown}>
          {a.fund}
        </Button>
        <Button href={`${base}/transfer`} size="lg" block icon={Gift} disabled={listed} aria-describedby={listed ? why : undefined}>
          {a.transfer}
        </Button>
        {listed ? (
          <Button size="lg" block icon={Undo2} data-testid="delist" loading={phase !== "idle"} onClick={stop} aria-describedby={why}>
            {a.delist}
          </Button>
        ) : (
          <Button href={`${base}/sale?list=1`} size="lg" block icon={Tag}>
            {a.sell}
          </Button>
        )}
      </div>
      {!listed && !zero ? (
        <Button href={`${base}/empty`} size="md" block variant="link" className="justify-center" data-testid="empty-entry">
          {copy.empty.cta}
        </Button>
      ) : null}
      {reason ? (
        <p id={why} className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink-muted">
          <Icon icon={phase === "idle" ? Info : LoaderCircle} size={16} spin={phase !== "idle"} className="mt-0.5" />
          {reason}
        </p>
      ) : null}
      {note ? (
        <p role={note.danger ? "alert" : undefined} className={cx("m-0 flex items-start gap-2 font-sans text-body-sm", note.danger ? "text-danger" : "text-ink")}>
          <Icon icon={note.danger ? ShieldAlert : Undo2} size={16} className="mt-0.5" />
          {note.text}
        </p>
      ) : null}
    </div>
  );
}

/* ── The Wallet tab's main block: live leaves inside the server-rendered Inside rows and Facts ──────────────────── */

/** Anyone can add coins: visitors get the button in Inside's header below 1024 (the owner has it in the actions). */
export function InsideAddCoins({ snap }: { snap: SatchelSnapshot }) {
  const { isOwner } = useViewer(snap);
  if (isOwner) return null;
  return (
    <Button href={`/s/${snap.token_id}/receive`} icon={ArrowDown} className="lg:hidden">
      {copy.page.actions.fund}
    </Button>
  );
}

/** An Inside row's amount: "0.00189718 BTC"; "0 BTC" muted; "Balance unavailable" muted; unconfirmed BTC under it. */
export function RowAmount({ snap, chain }: { snap: SatchelSnapshot; chain: UiChain }) {
  const live = useLiveSnapshot(snap);
  const b = balanceBase(live, chain);
  const incoming = chain === "btc" && live.balances.btc ? BigInt(live.balances.btc.unconfirmed_sats) : 0n;
  const muted = b === null || b === 0n;
  return (
    <p data-balance={chain} data-zero={muted ? "" : undefined} className={cx("m-0 flex-none text-right font-sans text-[1rem]/[1.375rem] font-bold whitespace-nowrap t-num", muted ? "text-ink-muted" : "text-ink")}>
      {b === null ? copy.wallet.unavailable : b === 0n ? copy.wallet.zero(TICKER[chain]) : formatAmount(b, TICKER[chain])}
      {incoming > 0n ? <small className="block font-sans text-caption font-normal whitespace-normal text-ink-muted">{copy.wallet.incoming(formatAmount(incoming, "BTC"))}</small> : null}
    </p>
  );
}

const TOOL =
  "inline-flex min-h-11 flex-none items-center gap-1.5 rounded-pill bg-surface-sunken px-3.5 font-sans text-[0.875rem]/5 font-semibold whitespace-nowrap text-ink no-underline transition-colors duration-120 hover:bg-line";

/**
 * An Inside row's tools (proto `.tools`): Copy, QR (→ Add coins) and the named explorer. An empty row leads with Add coins
 * (the QR lives on that page anyway); an unavailable one ends with Retry.
 */
export function RowTools({ snap, chain }: { snap: SatchelSnapshot; chain: UiChain }) {
  const live = useLiveSnapshot(snap);
  const b = balanceBase(live, chain);
  const name = CHAIN_NAME[chain];
  const address = snap.addresses[chain];
  const receive = `/s/${snap.token_id}/receive?chain=${chain}`;
  return (
    <div className="flex flex-wrap items-center gap-2 md:pl-11">
      {b === 0n ? (
        <Link href={receive} className={TOOL}>
          <Icon icon={ArrowDown} size={16} />
          {copy.wallet.fund}
        </Link>
      ) : null}
      <CopyButton value={address} label={copy.wallet.copyAria(name)} toastText={copy.wallet.copiedAria(name)} />
      {b !== 0n ? (
        <Link href={receive} aria-label={copy.wallet.qrAria(name)} className={TOOL}>
          <Icon icon={QrCode} size={16} />
          {copy.wallet.qr}
        </Link>
      ) : null}
      <ExternalLink href={explorerFor(chain, address)} className="min-h-11 px-1.5 font-sans text-[0.875rem]/5 font-semibold">
        {EXPLORER_NAME[chain]}
      </ExternalLink>
      {b === null ? (
        <button type="button" className={TOOL} onClick={() => refreshSnapshot(snap.token_id)}>
          <Icon icon={RefreshCw} size={16} />
          {copy.wallet.retry}
        </button>
      ) : null}
    </div>
  );
}

/** "Read from NEAR testnet and each chain 12 s ago." (one freshness line; a UTC time in the server HTML). */
export function Freshness({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const now = useNow();
  return (
    <p className="m-0 mt-2.5 font-sans text-body-sm text-ink-muted">
      {copy.facts.source(now ? checkedAgo(live.as_of, now) : copy.facts.at(`${utcClock(live.as_of)}, ${utcDay(live.as_of)}`))}
    </p>
  );
}

const STATUS_WORD: Record<SatchelSnapshot["status"], string> = {
  active: copy.pill.active,
  signing: copy.pill.signing,
  listed: copy.pill.listed,
  needs_attention: copy.pill.needs_attention,
};

/** Facts: the owner, live. */
export function FactOwner({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  return <span className="font-mono text-[0.875rem]/5 font-[450]">{live.owner}</span>;
}

/** Facts: the status, the same word as the card's pill (the owner's local upgrades included). */
export function FactStatus({ snap }: { snap: SatchelSnapshot }) {
  const { status } = useViewer(snap);
  return <>{STATUS_WORD[status]}</>;
}

/** Facts: "2 · last one Oct 20, 02:40 UTC (block 274,240,000)", live. */
export function FactSignatures({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const last = live.last_signature;
  return (
    <>
      <span data-fact-sig-count>{live.sig_count}</span>{" "}
      <span className="text-body-sm text-ink-muted">· {last ? copy.facts.last(utcShort(last.timestamp_ms), groupDigits(last.height)) : copy.facts.noneYet}</span>
    </>
  );
}

/** Renders its children for everyone but the owner (How it works is for visitors). */
export function VisitorOnly({ snap, children }: { snap: SatchelSnapshot; children: ReactNode }) {
  const { isOwner } = useViewer(snap);
  return isOwner ? null : <>{children}</>;
}

/** Renders its children only for the owner. */
export function OwnerOnly({ snap, children }: { snap: SatchelSnapshot; children: ReactNode }) {
  const { isOwner } = useViewer(snap);
  return isOwner ? <>{children}</> : null;
}
