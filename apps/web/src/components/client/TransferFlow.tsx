"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { History, Hourglass, Info, LoaderCircle, Lock, Snowflake, TriangleAlert, Undo2, Wallet, type LucideIcon } from "lucide-react";
import { ConnectButton } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { Handoff, Receipt } from "@/components/client/Handoff";
import { useViewer } from "@/components/client/SatchelPage";
import { toast } from "@/components/client/Toaster";
import { SatchelCard } from "@/components/SatchelCard";
import { Avatar, Button, ExternalLink, Icon, Morph, TextInput, Tracker, cx } from "@/components/ui";
import { copy, errorCopy } from "@/lib/copy";
import { EXPLORERS, MPC_CONTRACT, SATCHEL_CONTRACT } from "@/lib/config";
import { refreshSnapshot } from "@/lib/data/client";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { formatAccount, relativeTime, truncateMiddle } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play } from "@/lib/motion/play";
import { calls, contractViews } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { validateNearAccount, type Validation } from "@/lib/validate";
import { cardChips, holdingsSentence } from "@/lib/view";

/**
 * Give (kb/80 R3 §Transfer; app-screens §7): Who gets it → Review gift → the wallet → Giving… → **the hand-off**, only
 * after `nft_token` confirms the new owner (never optimistic) → the receipt. Your own wallet cancel is a neutral note;
 * contract failures are mapped (`errorCopy`). The success screen announces itself, so it fires no toast; if you leave
 * the flow before it lands, a toast tells you it went through.
 */

type Phase = "recipient" | "review" | "wallet" | "processing" | "done";

const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function TransferFlow({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner, accountId, mine, status } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const [text, setText] = useState("");
  // validation is pure (derived); the existence lookup is keyed by the account it answered for
  const val: Validation | null = useMemo(() => (text.trim() ? validateNearAccount(text, { self: accountId, contract: SATCHEL_CONTRACT, mpc: MPC_CONTRACT }) : null), [text, accountId]);
  const target = val && val.tier !== "error" ? val.normalized : "";
  const [lookup, setLookup] = useState<{ for: string; ok: boolean; owns: number } | null>(null);
  const exists = !target ? { checking: false, ok: null, owns: 0 } : lookup?.for === target ? { checking: false, ok: lookup.ok as boolean | null, owns: lookup.owns } : { checking: true, ok: null, owns: 0 };
  const [phase, setPhase] = useState<Phase>("recipient");
  const [note, setNote] = useState<{ kind: "cancelled" | "error"; text: string } | null>(null);
  const [receipt, setReceipt] = useState<{ hash: string | null; at: number; to: string; from: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // view_account existence check (debounced 400 ms)
  useEffect(() => {
    if (!target) return;
    let alive = true;
    const t = setTimeout(async () => {
      const src = dataSource();
      const ok = await src.accountExists(target);
      const owns = ok ? await contractViews(src.view).nftSupplyForOwner(target).catch(() => 0) : 0;
      if (alive) setLookup({ for: target, ok, owns });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [target]);

  const canReview = !!target && exists.ok === true;
  const inFlight = mine.find((i) => i.stage === "awaiting_wallet" || i.stage === "signing");
  const now = useNow();
  const busy = phase === "wallet" || phase === "processing";

  const onTransfer = () => {
    if (!wallet || !accountId || phase !== "review") return;
    setNote(null);
    const from = accountId;
    runCall(wallet, calls.nftTransfer(snap.token_id, target), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "processing")).then(async (r) => {
      if (r.ok) {
        // confirm from chain state before the hand-off (never optimistic)
        const t = await contractViews(dataSource().view).nftToken(snap.token_id);
        if (t?.owner_id === target) {
          refreshSnapshot(snap.token_id);
          // the success screen says it (and announces it); a toast only if you left the flow before it landed
          if (!mounted.current) {
            toast(copy.xfer.toast(snap.token_id, target));
            return;
          }
          setReceipt({ hash: r.hash, at: Date.now(), to: target, from });
          setPhase("done");
          return;
        }
        setNote({ kind: "error", text: copy.sign.failed });
        setPhase("review");
      } else if ("cancelled" in r) {
        setNote({ kind: "cancelled", text: copy.xfer.cancelled });
        setPhase("review");
      } else {
        setNote({ kind: "error", text: errorCopy(r.failure.code, { id: snap.token_id }) });
        setPhase("review");
      }
    });
  };

  const balances = holdingsSentence(live);
  const closeHref = `/s/${snap.token_id}`;
  let body: ReactNode;
  let action: ReactNode = null;
  let title = copy.xfer.title(snap.token_id);
  let meta: string | undefined;
  let guarded = false;

  if (phase === "done" && receipt) {
    title = copy.xfer.doneTitle;
    body = (
      <Handoff
        variant="give"
        tokenId={snap.token_id}
        from={receipt.from}
        to={receipt.to}
        chips={cardChips(live)}
        fromStatus={status === "signing" || status === "needs_attention" ? status : "active"}
        sentence={copy.xfer.done(receipt.to, balances)}
        live={copy.xfer.live(receipt.to, balances)}
      >
        <Receipt
          rows={[
            { label: copy.xfer.receipt.from, value: receipt.from, mono: true },
            { label: copy.xfer.receipt.to, value: receipt.to, mono: true },
            {
              label: copy.xfer.receipt.tx,
              value: receipt.hash ? <ExternalLink href={EXPLORERS.nearTx(receipt.hash)}>{truncateMiddle(receipt.hash, 6, 4)}</ExternalLink> : "—",
              mono: true,
            },
            { label: copy.xfer.receipt.time, value: <time dateTime={new Date(receipt.at).toISOString()}>{`${new Date(receipt.at).toISOString().slice(11, 16)} UTC`}</time> },
          ]}
        />
      </Handoff>
    );
    action = (
      <div className="flex flex-col gap-2.5">
        <Button variant="primary" size="lg" block href="/satchels">
          {copy.sign.doneBtn}
        </Button>
        <Button size="lg" block href={closeHref}>
          {copy.xfer.view(snap.token_id)}
        </Button>
      </div>
    );
  } else if (ready && !accountId) {
    guarded = true;
    body = (
      <Guard icon={Wallet} title={copy.send.guard.connectTitle} body={copy.xfer.guard.connectBody(snap.token_id)}>
        <ConnectButton size="lg" />
      </Guard>
    );
  } else if (ready && !isOwner && !busy) {
    // (while it's being given, a fresh snapshot may already name the new owner: that's not a guard, it's the result)
    guarded = true;
    body = (
      <Guard icon={Lock} title={copy.send.guard.notOwnerTitle(snap.token_id)} body={copy.xfer.guard.notOwnerBody(accountId ?? "", live.owner)}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (live.listing && !busy) {
    guarded = true;
    body = (
      <Guard icon={Snowflake} tone="frozen" title={copy.send.guard.listedTitle} body={copy.xfer.blockedListed(snap.token_id)}>
        <Button size="lg" href={`/s/${snap.token_id}/sale`}>
          {copy.send.guard.goToSell}
        </Button>
      </Guard>
    );
  } else if (phase === "recipient") {
    meta = `${copy.app.step(1, 2)} · ${copy.xfer.stepWho}`;
    const err = val?.tier === "error" ? val.message : exists.ok === false ? copy.xfer.err.missing(target) : null;
    body = (
      <>
        <SatchelCard tokenId={snap.token_id} id={`give-card-${snap.token_id}`} size="md" status={status} owned chips={cardChips(live)} headingLevel={3} className="self-center" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="xfer-to" className="font-sans text-label text-ink">
            {copy.xfer.to}
          </label>
          <TextInput
            id="xfer-to"
            mono
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.xfer.placeholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            invalid={!!err}
            aria-describedby="xfer-status"
            data-testid="xfer-to"
          />
          <div id="xfer-status" aria-live="polite" className="flex flex-col gap-2 font-sans text-body-sm">
            {!text.trim() ? (
              <p className="text-ink-muted">{copy.xfer.help}</p>
            ) : err ? (
              <p className="flex items-start gap-1.5 text-danger" data-testid="xfer-error">
                <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                <span className="min-w-0 wrap-anywhere">{err}</span>
              </p>
            ) : exists.checking ? (
              <p className="flex min-h-5 items-center gap-2 text-ink-muted">
                <Icon icon={LoaderCircle} size={16} spin />
                {copy.xfer.checking}
              </p>
            ) : exists.ok && target ? (
              <>
                <div className="flex items-center gap-3 rounded-md bg-surface-sunken px-3.5 py-3" data-testid="recipient-card">
                  <Avatar account={target} size={40} />
                  <span className="flex min-w-0 flex-col">
                    <b className="font-mono text-[0.9375rem] leading-5 font-[450] wrap-anywhere text-ink">{val?.tier === "warning" ? truncateMiddle(target, 8, 5) : target}</b>
                    <span className="text-ink-muted">{copy.xfer.found(exists.owns)}</span>
                  </span>
                </div>
                {val?.tier === "warning" ? (
                  <p className="flex items-start gap-1.5 text-ink">
                    <Icon icon={TriangleAlert} size={16} className="mt-0.5 text-danger" />
                    <span>{val.message}</span>
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </>
    );
    action = (
      <Button variant="primary" size="lg" block disabled={!canReview} aria-describedby="xfer-status" onClick={() => canReview && setPhase("review")} data-testid="xfer-review">
        {copy.send.form.review}
      </Button>
    );
  } else {
    title = copy.xfer.reviewTitle;
    meta = `${copy.app.step(2, 2)} · ${copy.xfer.stepReview}`;
    body = (
      <>
        <GiftCard tokenId={snap.token_id} status={status} chips={cardChips(live)} to={target} lifted={busy} />
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0 font-sans text-[0.9375rem] leading-5.5 text-ink">
          <li className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
            <Avatar account={target} size={32} />
            <span className="wrap-anywhere">{copy.xfer.rows.them(target, balances)}</span>
          </li>
          <li className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
            <Avatar account={accountId ?? "?"} size={32} />
            <span>{copy.xfer.rows.you}</span>
          </li>
          <li className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-surface-sunken text-ink">
              <Icon icon={History} size={16} />
            </span>
            <span>{copy.xfer.rows.history}</span>
          </li>
        </ul>
        {inFlight && now ? (
          <p className="flex items-start gap-3 rounded-md bg-surface-sunken p-4 font-sans text-body text-ink">
            <Icon icon={Hourglass} size={20} className="mt-0.5 text-frozen" />
            <span>{copy.xfer.soft(relativeTime(inFlight.signingAt ?? inFlight.createdAt, now).replace(" ago", ""))}</span>
          </p>
        ) : null}
        {busy ? (
          <Tracker
            label={copy.sign.progress}
            steps={[
              { label: copy.xfer.steps.approve, state: phase === "wallet" ? "active" : "done" },
              { label: copy.xfer.steps.doing, state: phase === "processing" ? "active" : "future" },
              { label: copy.xfer.steps.done, state: "future" },
            ]}
          />
        ) : null}
      </>
    );
    action = (
      <>
        <p className="mb-3 flex items-start gap-2 font-sans text-body-sm font-semibold text-ink wrap-anywhere">
          <Icon icon={Info} size={16} className="mt-0.5 text-ink-muted" />
          {copy.xfer.final(target)}
        </p>
        <Button
          variant="primary"
          size="lg"
          block
          loading={busy}
          spinner="none"
          aria-label={busy ? undefined : copy.xfer.cta(target)}
          aria-describedby={note ? "xfer-note" : undefined}
          onClick={onTransfer}
          data-testid="xfer-cta"
        >
          <Morph
            value={phase === "wallet" ? "wallet" : phase === "processing" ? "giving" : "idle"}
            labels={{
              idle: copy.xfer.cta(formatAccount(target)),
              wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
              giving: { label: copy.xfer.transferring, icon: LoaderCircle, spin: true },
            }}
          />
        </Button>
        {note ? (
          <p
            id="xfer-note"
            role={note.kind === "error" ? "alert" : "status"}
            className={cx("mt-2.5 flex items-start gap-2 font-sans text-body-sm", note.kind === "error" ? "text-danger" : "text-ink")}
            data-testid={note.kind === "cancelled" ? "xfer-cancelled" : "xfer-failed"}
          >
            <Icon icon={note.kind === "error" ? TriangleAlert : Undo2} size={16} className={cx("mt-0.5", note.kind === "cancelled" && "text-ink-muted")} />
            <span>{note.text}</span>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <FlowShell title={title} meta={meta} fill={!guarded} closeHref={closeHref} action={action} testId="transfer-flow">
      <StepIn step={phase === "done" ? "done" : phase === "recipient" ? "recipient" : "review"}>{body}</StepIn>
    </FlowShell>
  );
}

/**
 * The card being given, wearing a lemon gift tag on a string ("To bob.satchelhq.testnet"; decorative, the rows say it).
 * While the wallet is open and the gift goes through it is picked up and held (−8 px, −2°, a 6 px drop; 220 ms), then
 * set down with a 2 px press if it doesn't go (motion-spec §2 "In flight"). Reduced motion: no pick-up.
 */
function GiftCard({ tokenId, status, chips, to, lifted }: { tokenId: string; status: Parameters<typeof SatchelCard>[0]["status"]; chips: ReturnType<typeof cardChips>; to: string; lifted: boolean }) {
  const hydrated = useHydrated();
  const reduce = hydrated && readMotionMode() === "reduce";
  const pressRef = useRef<HTMLDivElement>(null);
  const wasLifted = useRef(lifted);
  useLayoutEffect(() => {
    const was = wasLifted.current;
    wasLifted.current = lifted;
    if (!was || lifted || reduce || !pressRef.current) return;
    // set down: once the card is back on its shadow, a 2 px press and back
    const el = pressRef.current;
    const h = play([{ el, prop: "translate", frames: [[0, "0 0"], [180, "0 0", EASE.fall], [240, "0 2px", EASE.out], [360, "0 0"]] }], 360);
    return () => h.cancel();
  }, [lifted, reduce]);
  return (
    <div className="relative flex flex-col items-center pt-1 pb-7.5">
      <div ref={pressRef} className="w-full max-w-75">
        <SatchelCard tokenId={tokenId} id={`give-card-${tokenId}`} size="md" status={status} owned chips={chips} headingLevel={3} pose={lifted && !reduce ? "lifted" : "rest"} />
      </div>
      <span
        aria-hidden="true"
        className="absolute right-[max(4px,calc(50%-170px))] bottom-0 inline-flex max-w-62.5 items-center gap-2 rounded-[12px_999px_999px_12px] border-2 border-on-brand bg-lemon py-1.5 pr-3 pl-1.5 font-sans text-[0.8125rem] leading-4.5 font-bold text-on-brand transform-[rotate(-3deg)] before:absolute before:-top-5.5 before:left-4.5 before:h-5.5 before:w-0.5 before:bg-sticker before:content-['']"
      >
        <Avatar account={to} size={20} />
        <span className="min-w-0 truncate">{copy.xfer.tag(to)}</span>
      </span>
    </div>
  );
}

/**
 * A new step starts at the top of the sheet, and if the control you pressed went away with the old step (Review →
 * Send), focus returns to the sheet's title instead of falling to the page.
 */
function settleStep(el: HTMLElement) {
  if (el.parentElement) el.parentElement.scrollTop = 0;
  const a = document.activeElement;
  if (!a || a === document.body || !a.isConnected) document.getElementById("flow-title")?.focus({ preventScroll: true });
}

/** A step arriving (motion-spec §4): it slides in 16 px as it fades in (200 ms). The first paint is as drawn. */
function StepIn({ step, children }: { step: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    settleStep(el);
    if (step === "done") return; // the hand-off is its own entrance
    const reduce = readMotionMode() === "reduce";
    const h = play(
      [
        { el, prop: "opacity", frames: [[0, 0, EASE.out], [reduce ? 150 : 200, 1]] },
        ...(reduce ? [] : [{ el, prop: "translate" as const, frames: [[0, "16px 0", EASE.out], [200, "0 0"]] as const }]),
      ],
      200,
    );
    return () => h.cancel();
  }, [step]);
  return (
    <div ref={ref} data-step={step} className="flex flex-col gap-4">
      {children}
    </div>
  );
}

/** A guard: a centred state with an icon tile, a heading, its reason and one action (no step counter, no foot). */
function Guard({ icon, tone = "ink", title, body, children }: { icon: LucideIcon; tone?: "ink" | "frozen"; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center" data-testid="xfer-guard">
      <span className={cx("mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken", tone === "frozen" ? "text-frozen" : "text-ink")}>
        <Icon icon={icon} size={28} />
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
