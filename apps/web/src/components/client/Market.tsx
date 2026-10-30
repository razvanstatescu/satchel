"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Hourglass, Info, LoaderCircle, TriangleAlert, Undo2, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { gateModel, type ReportMode } from "@/components/Clean";
import { FlowShell } from "@/components/client/FlowShell";
import { useViewer } from "@/components/client/SatchelPage";
import { toast } from "@/components/client/Toaster";
import { useCleanCheck } from "@/components/client/useCleanCheck";
import { AmountInput, Icon, Morph, Segmented, buttonClass, cx } from "@/components/ui";
import { IS_FIXTURE, SATCHEL_CONTRACT, USDC_CONTRACT } from "@/lib/config";
import { copy, errorCopy } from "@/lib/copy";
import { buyEnabled } from "@/lib/data/clean";
import { refreshSnapshot, useLiveSnapshot } from "@/lib/data/client";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { formatAmount, parseUnits } from "@/lib/format";
import { ATTACH_MARKET, contractViews, FT_STORAGE, marketCalls, offerAcceptBlock, WNEAR_TESTNET, type OfferBlock } from "@/lib/near/contract";
import type { Currency, OfferView } from "@/lib/near/types";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { ftTicker } from "@/lib/view";

/**
 * C6 inside assets + C4 offers (docs/specs/C4-C6.md): the inside coins' amounts and add/take-out controls (shown in
 * the coin sheet, Holdings.tsx) and the offer flow (make / accept / cancel). The server already renders the amounts
 * and the offer list as text (snap.inside, the `offers` prop); these are the live leaves and the mutations, the same
 * house pattern as the holdings list (Holdings.tsx) and the Sell flow (SaleTab.tsx).
 */

type Note = { kind: "error" | "cancelled"; text: string };

function NoteLine({ note }: { note: Note }) {
  if (note.kind === "cancelled")
    return (
      <p className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink" data-note="cancelled">
        <Icon icon={Undo2} size={16} className="mt-0.5 text-ink-muted" />
        <span>{note.text}</span>
      </p>
    );
  return (
    <p role="alert" className="m-0 flex items-start gap-2 font-sans text-body-sm text-danger" data-note="error">
      <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
      <span>{note.text}</span>
    </p>
  );
}

function FootNote({ icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink-muted">
      <Icon icon={icon} size={16} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

/** A module-scope wrapper, same as SaleTab.tsx's `clockNow`/SendFlow.tsx's `wallClock`: the react-hooks purity rule
 * flags any `Date.now()` reachable from a component body, even inside an event handler, unless the call itself
 * lives outside the component's static scope. */
const clockNow = () => Date.now();

type Phase = "idle" | "wallet" | "doing";
const phaseLabels = (idle: string, doing: string) => ({
  idle,
  wallet: { label: copy.sign.wallet, icon: LoaderCircle as LucideIcon, spin: true },
  doing: { label: doing, icon: LoaderCircle as LucideIcon, spin: true },
});

/* ── C6: NEAR inside ─────────────────────────────────────────────────────────────────────────── */

/** The "NEAR inside" row's live amount (snap.inside follows the shared poll, same as the chain balances). */
export function InsideNearAmount({ snap, className = "font-sans text-[1rem]/[1.375rem] font-bold" }: { snap: SatchelSnapshot; className?: string }) {
  const live = useLiveSnapshot(snap);
  const b = BigInt(live.inside.near);
  return (
    <span data-testid="inside-near-amount" className={cx("t-num", b === 0n ? "text-ink-muted" : "text-ink", className)}>
      {b === 0n ? copy.inside.zero : formatAmount(b, "NEAR")}
    </span>
  );
}

/** Anyone can add NEAR; only the owner can take it out, and never while listed (docs/specs/C4-C6.md §2.2). */
export function InsideNearActions({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const { isOwner, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  const id = snap.token_id;
  const balance = BigInt(live.inside.near);
  const listed = !!live.listing;

  const add = () => {
    const base = parseUnits(text, 24);
    if (!wallet || !accountId || base === null || base <= 0n || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.depositNear(id, base), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.inside.added(formatAmount(base, "NEAR")));
        setText("");
        refreshSnapshot(id);
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };

  const withdraw = () => {
    if (!wallet || !accountId || balance <= 0n || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.withdrawNear(id, balance), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.inside.withdrawn(formatAmount(balance, "NEAR")));
        refreshSnapshot(id);
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };

  return (
    <div data-testid="inside-near-actions" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <AmountInput
          id="add-near"
          data-testid="add-near-amount"
          ticker="NEAR"
          value={text}
          placeholder="0"
          aria-label={copy.inside.amount}
          onChange={(e) => setText(e.target.value.replace(",", "."))}
          className="min-w-0 flex-1 basis-48 py-2"
        />
        <button
          type="button"
          data-testid="add-near-cta"
          disabled={!wallet || !text.trim() || phase !== "idle"}
          onClick={add}
          className={buttonClass({ variant: "secondary", size: "md", disabled: !wallet || !text.trim(), loading: phase !== "idle" })}
        >
          <Morph value={phase} labels={phaseLabels(copy.inside.add, copy.inside.adding)} />
        </button>
      </div>
      {isOwner ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="withdraw-near"
            disabled={!wallet || balance <= 0n || listed || phase !== "idle"}
            aria-describedby={listed ? "inside-near-why" : undefined}
            onClick={withdraw}
            className={buttonClass({ variant: "link", size: "md", disabled: !wallet || balance <= 0n || listed, loading: phase !== "idle" })}
          >
            <Morph value={phase} labels={phaseLabels(copy.inside.withdraw, copy.inside.withdrawing)} />
          </button>
          {listed ? (
            <span id="inside-near-why" data-testid="withdraw-near-why" className="font-sans text-body-sm text-ink-muted">
              {copy.inside.blockedListed}
            </span>
          ) : null}
        </div>
      ) : null}
      {note ? <NoteLine note={note} /> : null}
    </div>
  );
}

/* ── storage credit (pays storage inside `ft_on_transfer`, docs/specs/C4-C6.md §1, §2.3) ────────── */

/** Polls `storage_credit_of(accountId)`; `refresh()` re-reads it right after a prepay or a withdraw. `for` names
 * whose credit `value` belongs to (the `useMyOffers`/`useMySatchels` pattern), so a signed-out viewer reads null
 * without the effect ever calling setState synchronously for that case. */
function useStorageCredit(accountId: string | null) {
  const [state, setState] = useState<{ for: string | null; value: bigint }>({ for: null, value: 0n });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    void contractViews(dataSource().view, SATCHEL_CONTRACT)
      .storageCreditOf(accountId)
      .then((v) => alive && setState({ for: accountId, value: BigInt(v) }))
      .catch(() => alive && setState({ for: accountId, value: 0n }));
    return () => {
      alive = false;
    };
  }, [accountId, attempt]);
  const credit = accountId && state.for === accountId ? state.value : null;
  return { credit, refresh: () => setAttempt((n) => n + 1) };
}

/**
 * The prepay step a USDC offer or an FT deposit needs when the account's storage credit is short (docs/specs/C4-C6.md
 * §1.2, §3: "a plain sentence" before the real call). Renders nothing once the credit covers `needed`.
 */
function StoragePrepay({ accountId, needed, credit, onPrepaid }: { accountId: string; needed: bigint; credit: bigint | null; onPrepaid: () => void }) {
  const { wallet } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  if (credit === null || credit >= needed) return null;

  const prepay = () => {
    if (!wallet || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.prepayStorage(ATTACH_MARKET.prepayStorage.deposit, accountId), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        onPrepaid();
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id: accountId }) });
    });
  };

  return (
    <div data-testid="storage-prepay" className="flex flex-col gap-2">
      <FootNote icon={Info}>{copy.inside.storage.need(formatAmount(needed, "NEAR"))}</FootNote>
      <button
        type="button"
        data-testid="prepay-storage-cta"
        disabled={!wallet || phase !== "idle"}
        onClick={prepay}
        className={buttonClass({ variant: "secondary", size: "md", disabled: !wallet, loading: phase !== "idle" })}
      >
        <Morph value={phase} labels={phaseLabels(copy.inside.storage.prepay, copy.inside.storage.prepaying)} />
      </button>
      {note ? <NoteLine note={note} /> : null}
    </div>
  );
}

/** "My offers" (MySatchels.tsx) and anywhere else that needs it: the account's unused storage credit, with a
 * withdraw button (docs/specs/C4-C6.md §1), visible only while there's something to take out. */
export function StorageCreditRow({ accountId }: { accountId: string }) {
  const { wallet } = useWallet();
  const { credit, refresh } = useStorageCredit(accountId);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  if (!credit || credit <= 0n) return null;

  const withdraw = () => {
    if (!wallet || phase !== "idle" || !credit) return;
    setNote(null);
    const amount = credit;
    runCall(wallet, marketCalls.withdrawStorageCredit(), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.inside.storage.withdrawn(formatAmount(amount, "NEAR")));
        refresh();
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id: accountId }) });
    });
  };

  return (
    <section aria-labelledby="storage-credit-title" data-testid="storage-credit" className="mb-6 flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="storage-credit-title" className="m-0 font-sans text-label text-ink">
          {copy.inside.storage.title}
        </h2>
        <span data-testid="storage-credit-amount" className="font-sans text-body-sm t-num text-ink-muted">
          {copy.inside.storage.balance(formatAmount(credit, "NEAR"))}
        </span>
      </div>
      <button
        type="button"
        data-testid="withdraw-storage-credit"
        disabled={!wallet || phase !== "idle"}
        onClick={withdraw}
        className={buttonClass({ variant: "secondary", size: "md", disabled: !wallet, loading: phase !== "idle" })}
      >
        <Morph value={phase} labels={phaseLabels(copy.inside.storage.withdraw, copy.inside.withdrawing)} />
      </button>
      {note ? <NoteLine note={note} /> : null}
    </section>
  );
}

/* ── C6: FT assets inside a Satchel (USDC, wNEAR) ────────────────────────────────────────────────── */

/** One allowlisted FT's live inside balance (snap.inside.fts follows the shared poll, same as InsideNearAmount). */
export function InsideFtAmount({ snap, ft, className = "font-sans text-[1rem]/[1.375rem] font-bold" }: { snap: SatchelSnapshot; ft: string; className?: string }) {
  const live = useLiveSnapshot(snap);
  const b = BigInt(live.inside.fts.find((f) => f.token === ft)?.amount ?? "0");
  return (
    <span data-testid={`inside-ft-amount-${ft === WNEAR_TESTNET ? "wnear" : "usdc"}`} className={cx("t-num", b === 0n ? "text-ink-muted" : "text-ink", className)}>
      {b === 0n ? copy.inside.zero : formatAmount(b, ftTicker(ft))}
    </span>
  );
}

/** Anyone can deposit an allowlisted FT (`ft_transfer_call`); only the owner can take it out, never while listed
 * (docs/specs/C4-C6.md §2.2). A deposit that would create the token's first slot of this FT needs storage credit
 * first (§1.2); the UI treats "nothing inside yet" as that case, which is conservative but never wrong to over-prepay. */
export function InsideFtActions({ snap, ft }: { snap: SatchelSnapshot; ft: string }) {
  const live = useLiveSnapshot(snap);
  const { isOwner, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  const id = snap.token_id;
  const ticker = ftTicker(ft);
  const decimals = ticker === "USDC" ? 6 : 24;
  const balance = BigInt(live.inside.fts.find((f) => f.token === ft)?.amount ?? "0");
  const listed = !!live.listing;
  const isNewSlot = balance === 0n;
  const needed = isNewSlot ? FT_STORAGE.depositFirstSlot : 0n;
  const { credit, refresh: refreshCredit } = useStorageCredit(accountId);
  const short = needed > 0n && (credit === null || credit < needed);

  const add = () => {
    const base = parseUnits(text, decimals);
    if (!wallet || !accountId || base === null || base <= 0n || phase !== "idle" || short) return;
    setNote(null);
    runCall(wallet, marketCalls.ftDeposit(ft, id, base), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.inside.added(formatAmount(base, ticker)));
        setText("");
        refreshSnapshot(id);
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };

  const withdraw = () => {
    if (!wallet || !accountId || balance <= 0n || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.withdrawFt(id, ft, balance), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.inside.withdrawn(formatAmount(balance, ticker)));
        refreshSnapshot(id);
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };

  return (
    <div data-testid={`inside-ft-actions-${ticker === "wNEAR" ? "wnear" : "usdc"}`} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <AmountInput
          id={`add-${ticker}`}
          data-testid={`add-${ticker === "wNEAR" ? "wnear" : "usdc"}-amount`}
          ticker={ticker}
          value={text}
          placeholder="0"
          aria-label={copy.inside.amount}
          onChange={(e) => setText(e.target.value.replace(",", "."))}
          className="min-w-0 flex-1 basis-48 py-2"
        />
        <button
          type="button"
          data-testid={`add-${ticker === "wNEAR" ? "wnear" : "usdc"}-cta`}
          disabled={!wallet || !text.trim() || phase !== "idle" || short}
          onClick={add}
          className={buttonClass({ variant: "secondary", size: "md", disabled: !wallet || !text.trim() || short, loading: phase !== "idle" })}
        >
          <Morph value={phase} labels={phaseLabels(copy.inside.addFt(ticker), copy.inside.adding)} />
        </button>
      </div>
      {accountId && text.trim() ? <StoragePrepay accountId={accountId} needed={needed} credit={credit} onPrepaid={refreshCredit} /> : null}
      {isOwner ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`withdraw-${ticker === "wNEAR" ? "wnear" : "usdc"}`}
            disabled={!wallet || balance <= 0n || listed || phase !== "idle"}
            aria-describedby={listed ? "inside-near-why" : undefined}
            onClick={withdraw}
            className={buttonClass({ variant: "link", size: "md", disabled: !wallet || balance <= 0n || listed, loading: phase !== "idle" })}
          >
            <Morph value={phase} labels={phaseLabels(copy.inside.withdraw, copy.inside.withdrawing)} />
          </button>
          {listed ? (
            <span data-testid="withdraw-ft-why" className="font-sans text-body-sm text-ink-muted">
              {copy.inside.blockedListed}
            </span>
          ) : null}
        </div>
      ) : null}
      {note ? <NoteLine note={note} /> : null}
    </div>
  );
}

/* ── C4: make an offer ───────────────────────────────────────────────────────────────────────── */

const EXPIRY_OPTIONS = [
  { value: "1", label: copy.offers.expiry1, ms: 24 * 3600 * 1000 },
  { value: "7", label: copy.offers.expiry7, ms: 7 * 24 * 3600 * 1000 },
  { value: "30", label: copy.offers.expiry30, ms: 30 * 24 * 3600 * 1000 },
] as const;

/** The `/s/[id]/offer` sheet: make an offer on a Satchel, listed or not. Runs the full clean-history check before
 * allowing it, exactly like Buy (docs/specs/C4-C6.md §3.4). */
export function MakeOfferFlow({ snap }: { snap: SatchelSnapshot }) {
  const router = useRouter();
  const { isOwner, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const id = snap.token_id;
  const check = useCleanCheck(id, true);
  const mode: ReportMode = check.report ? "browser" : "checking";
  const clean = check.report ? buyEnabled(check.report.aggregate) : false;
  const [currency, setCurrency] = useState<Currency>("near");
  const [text, setText] = useState("");
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7");
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);

  const decimals = currency === "usdc" ? 6 : 24;
  const amount = text.trim() ? parseUnits(text, decimals) : null;
  const amountOk = amount !== null && amount > 0n;
  // USDC offers always charge the offerer's storage credit (docs/specs/C4-C6.md §1.2, §3.1.8); a NEAR offer pays its
  // own storage from the attached deposit, so it never needs a prepay step.
  const { credit, refresh: refreshCredit } = useStorageCredit(accountId);
  const creditNeeded = currency === "usdc" ? FT_STORAGE.offer : 0n;
  const creditShort = creditNeeded > 0n && (credit === null || credit < creditNeeded);
  const canOffer = !isOwner && clean && amountOk && !creditShort && phase === "idle";
  const gate = gateModel(mode, check.report, "");

  const offer = async () => {
    if (!canOffer || !wallet || !accountId || amount === null) return;
    setNote(null);
    // Re-check right before offering, exactly like Buy (spec §3.4): a record made between page load and now would
    // make the offer unacceptable, so there is no point escrowing it.
    const fresh = await check.recheck();
    if (!fresh || !buyEnabled(fresh.aggregate)) {
      setNote({ kind: "error", text: copy.buy.recheckFailed });
      return;
    }
    const views = contractViews(dataSource().view);
    const [sat, inside] = await Promise.all([views.satchel(id), views.insideOf(id)]);
    if (!sat) {
      setNote({ kind: "error", text: copy.buy.readFailed });
      return;
    }
    const now = clockNow();
    const expiresAtMs = now + (EXPIRY_OPTIONS.find((o) => o.value === expiry)?.ms ?? 7 * 24 * 3600 * 1000);
    const terms = { tokenId: id, expectedSigCount: sat.sig_count, expectedInsideEpoch: inside?.inside_epoch ?? 0, expiresAtMs };
    const tx = currency === "usdc" ? marketCalls.makeOfferUsdc(amount, terms, USDC_CONTRACT, SATCHEL_CONTRACT) : marketCalls.makeOfferNear(amount, terms, SATCHEL_CONTRACT);
    const r = await runCall(wallet, tx, accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing"));
    setPhase("idle");
    if (r.ok) {
      toast(copy.offers.offered(formatAmount(amount, currency === "usdc" ? "USDC" : "NEAR")));
      refreshSnapshot(id);
      router.replace(`/s/${id}`);
    } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.offers.cancelled });
    else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
  };

  return (
    <FlowShell
      title={copy.offers.makeTitle(id)}
      meta={copy.offers.makeBody}
      closeHref={`/s/${id}`}
      testId="offer-flow"
      action={
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-testid="offer-cta"
            aria-disabled={!canOffer}
            aria-busy={phase !== "idle" || undefined}
            data-press={canOffer ? "" : undefined}
            onClick={offer}
            className={buttonClass({ variant: "primary", size: "lg", block: true, disabled: !canOffer && phase === "idle", loading: phase !== "idle" })}
          >
            <Morph
              value={phase}
              labels={phaseLabels(amountOk ? copy.offers.cta(formatAmount(amount ?? 0n, currency === "usdc" ? "USDC" : "NEAR")) : copy.offers.make, copy.offers.offering)}
            />
          </button>
          {isOwner ? <FootNote icon={Info}>{copy.offers.selfBuy}</FootNote> : !clean ? <FootNote icon={Hourglass}>{copy.offers.checkNote}</FootNote> : null}
          {note ? <NoteLine note={note} /> : null}
        </div>
      }
    >
      <section aria-labelledby="offer-check-title" className="flex flex-col gap-2.5">
        <h3 id="offer-check-title" className="font-sans text-label text-ink">
          {copy.offers.checkTitle}
        </h3>
        <div data-testid="offer-gate" data-gate={check.report?.aggregate ?? "checking"} className="flex items-center gap-2 rounded-md border border-line bg-surface p-4">
          <Icon icon={clean ? CircleCheck : Hourglass} size={20} className={clean ? "text-success" : "text-frozen"} spin={!clean} />
          <span className="font-sans text-body-sm text-ink">{gate.text}</span>
        </div>
      </section>
      <section aria-labelledby="offer-amount-title" className="flex flex-col gap-2.5">
        <h3 id="offer-amount-title" className="font-sans text-label text-ink">
          {copy.offers.amount}
        </h3>
        <Segmented
          size="sm"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={[
            { value: "near", label: "NEAR" },
            { value: "usdc", label: "USDC" },
          ]}
        />
        <AmountInput id="offer-amount" data-testid="offer-amount" ticker={currency === "usdc" ? "USDC" : "NEAR"} value={text} placeholder="0" onChange={(e) => setText(e.target.value.replace(",", "."))} />
        {!isOwner && accountId && creditShort ? <StoragePrepay accountId={accountId} needed={creditNeeded} credit={credit} onPrepaid={refreshCredit} /> : null}
      </section>
      <section aria-labelledby="offer-expiry-title" className="flex flex-col gap-2.5">
        <h3 id="offer-expiry-title" className="font-sans text-label text-ink">
          {copy.offers.expiry}
        </h3>
        <Segmented size="sm" label={copy.offers.expiry} value={expiry} onChange={setExpiry} options={EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </section>
    </FlowShell>
  );
}

/* ── C4: the owner's incoming offers ────────────────────────────────────────────────────────────── */

const BLOCK_WORDS: Record<OfferBlock, string> = {
  ERR_SELF_BUY: copy.offers.incoming.blocked.ERR_SELF_BUY,
  ERR_OFFER_EXPIRED: copy.offers.incoming.blocked.ERR_OFFER_EXPIRED,
  ERR_OFFER_STALE: copy.offers.incoming.blocked.ERR_OFFER_STALE,
  ERR_QUIET_PERIOD: copy.offers.incoming.blocked.ERR_QUIET_PERIOD,
};

function OfferRow({ snap, offer, mine }: { snap: SatchelSnapshot; offer: OfferView; mine: boolean }) {
  const live = useLiveSnapshot(snap);
  const { accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  const id = snap.token_id;
  const block = mine
    ? offerAcceptBlock(
        { offerer_id: offer.offerer_id, expected_sig_count: offer.expected_sig_count, expected_inside_epoch: offer.expected_inside_epoch, expires_at_ms: offer.expires_at_ms },
        { owner_id: live.owner, sig_count: live.sig_count, last_sign_height: live.last_sign_height },
        live.inside.inside_epoch,
        { ms: clockNow(), height: live.height ?? 0 },
      )
    : null;

  const accept = () => {
    if (!wallet || !accountId || block || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.acceptOffer(offer.id), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.offers.incoming.accepted(offer.offerer_id));
        refreshSnapshot(id);
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id }) });
    });
  };

  return (
    <li data-testid="offer-row" data-offer-id={offer.id} className="flex flex-col gap-2 border-b border-line p-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-sans text-body text-ink">{copy.offers.incoming.from(offer.offerer_id)}</span>
        <span className="font-sans text-body-sm font-semibold t-num text-ink">{formatAmount(BigInt(offer.amount), offer.currency === "usdc" ? "USDC" : "NEAR")}</span>
      </div>
      {mine ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="accept-offer"
            disabled={!wallet || !!block || phase !== "idle"}
            onClick={accept}
            className={buttonClass({ variant: "secondary", size: "md", disabled: !wallet || !!block, loading: phase !== "idle" })}
          >
            <Morph value={phase} labels={phaseLabels(copy.offers.incoming.accept, copy.offers.incoming.accepting)} />
          </button>
          {block ? (
            <span data-testid="offer-blocked" data-block={block} className="font-sans text-body-sm text-ink-muted">
              {BLOCK_WORDS[block]}
            </span>
          ) : null}
        </div>
      ) : null}
      {note ? <NoteLine note={note} /> : null}
    </li>
  );
}

/**
 * The server renders the initial `offers` (the no-JS judge fact). Fixture mode's offers only ever exist in THIS
 * browser's sessionStorage simulation (sim.ts), which a Node server request can never see, so a client-side
 * mutation (make/accept/cancel) needs its own refresh here — the same reason `useLiveSnapshot` re-derives the
 * snapshot client-side in fixture mode instead of trusting a server re-fetch after a sim mutation.
 */
function useOffersFor(tokenId: string, initial: OfferView[]): OfferView[] {
  const [offers, setOffers] = useState(initial);
  useEffect(() => {
    if (!IS_FIXTURE) return; // live mode: the server prop is a real contract read, refreshed on navigation
    let alive = true;
    const tick = () =>
      contractViews(dataSource().view, SATCHEL_CONTRACT)
        .offersFor(tokenId, 0, 50)
        .then((list) => alive && setOffers(list))
        .catch(() => undefined);
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tokenId]);
  return offers;
}

export function IncomingOffers({ snap, offers: initial }: { snap: SatchelSnapshot; offers: OfferView[] }) {
  const { isOwner } = useViewer(snap);
  const offers = useOffersFor(snap.token_id, initial);
  if (!offers.length) return null;
  return (
    <section aria-labelledby="offers-title" data-testid="incoming-offers" className="flex flex-col gap-2.5">
      <h2 id="offers-title" className="m-0 font-sans text-label text-ink">
        {copy.offers.incoming.title}
      </h2>
      <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">
        {offers.map((o) => (
          <OfferRow key={o.id} snap={snap} offer={o} mine={isOwner} />
        ))}
      </ul>
    </section>
  );
}

/* ── C4: "My offers" (the offerer's view), client-only like My Satchels ─────────────────────────── */

export function MyOfferRow({ offer, onChanged }: { offer: OfferView; onChanged: () => void }) {
  const { wallet, accountId } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<Note | null>(null);
  const expired = clockNow() >= offer.expires_at_ms;

  const cancel = () => {
    if (!wallet || !accountId || phase !== "idle") return;
    setNote(null);
    runCall(wallet, marketCalls.cancelOffer(offer.id), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setPhase("idle");
      if (r.ok) {
        toast(copy.offers.mine.cancelledToast);
        onChanged();
      } else if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.sell.cancelled });
      else setNote({ kind: "error", text: errorCopy(r.failure.code, { id: offer.token_id }) });
    });
  };

  return (
    <li data-testid="my-offer-row" data-offer-id={offer.id} className="flex flex-col gap-2 border-b border-line p-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/s/${offer.token_id}`} className="font-sans text-body font-semibold text-link underline decoration-1 underline-offset-3 hover:decoration-2">
          {copy.offers.mine.on(offer.token_id)}
        </Link>
        <span className="font-sans text-body-sm font-semibold t-num text-ink">{formatAmount(BigInt(offer.amount), offer.currency === "usdc" ? "USDC" : "NEAR")}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-sans text-body-sm text-ink-muted">{expired ? copy.offers.mine.status.expired : copy.offers.mine.status.open}</span>
        <button type="button" data-testid="cancel-offer" disabled={!wallet || phase !== "idle"} onClick={cancel} className={buttonClass({ variant: "link", size: "md", loading: phase !== "idle" })}>
          <Morph value={phase} labels={phaseLabels(copy.offers.mine.cancel, copy.offers.mine.cancelling)} />
        </button>
      </div>
      {note ? <NoteLine note={note} /> : null}
    </li>
  );
}
