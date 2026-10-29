"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleDot, CircleQuestionMark, CircleX, Hourglass, LoaderCircle, RefreshCw, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import { useNow } from "@/lib/clock";
import { copy, errorCopy, EXPLORER_NAME, NETWORK_LABEL } from "@/lib/copy";
import { EXPLORERS } from "@/lib/config";
import { clockTime, formatElapsed, truncateMiddle } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, rollTracks, stickOnTracks, type Track } from "@/lib/motion/play";
import { etaKey, trackerRows, type RowState } from "@/lib/signing/machine";
import { blockingIntent } from "@/lib/signing/retry";
import { intentStore } from "@/lib/signing/store";
import { startRunner, useIntents } from "@/lib/signing/client";
import type { PendingIntent, SigningStage } from "@/lib/signing/types";
import { chainTxUrl } from "@/lib/view";
import { announce, toast } from "@/components/client/Toaster";
import { Banner, Button, ExternalLink, Icon, cx } from "@/components/ui";

/**
 * SigningProgress (kb/80 R3; kb/90 §8.6; app-screens §6; motion-spec §6): the four-row tracker that becomes the
 * receipt. Approved in your wallet → Signing with NEAR's signer network (a spinner and an m:ss clock) → Broadcast (the
 * tx and its explorer) → Waiting for 1 confirmation → Confirmed. Honest milestones only: never a percentage, and only
 * the spinner and the clock move while you wait.
 *
 * - A terminal problem **replaces the heading** with its outcome (Not signed · Signed, not sent · Expired · Still
 *   waiting for NEAR · Not sent) and drops "Keep this tab open"; the tracker stays under it as the record. The actions
 *   live in the sheet's pinned foot (`SigningActions`).
 * - Driven by chain state through the intent store (`lib/signing`, untouched here). The rows' `data-row` and
 *   `data-row-state` are the machine's `trackerRows(stage)`, exactly.
 * - One polite status region announces step changes and the 20/60/150 s lines, never the clock.
 */

/** How long each signature took, as this tab saw it (row 1 "in 0:07"). Absent after a reload: then it isn't shown. */
const signedIn = new Map<string, number>();

type Mark = "done" | "active" | "future" | "failed" | "unknown" | "wait";
interface RowView {
  state: RowState;
  mark: Mark;
  label: ReactNode;
  trail?: ReactNode;
  meta?: ReactNode;
}

const OUTCOMES: Partial<Record<SigningStage, { tone: "danger" | "neutral"; icon: LucideIcon }>> = {
  timed_out: { tone: "danger", icon: CircleX },
  signed_not_sent: { tone: "danger", icon: TriangleAlert },
  expired: { tone: "danger", icon: CircleX },
  unknown: { tone: "neutral", icon: CircleQuestionMark },
  failed: { tone: "danger", icon: CircleX },
};

/** EVM nonce gap: "nonce-gap:{n}" (signed, not sent, but an earlier nonce must land first). */
const nonceGap = (i: PendingIntent) => (i.chain === "evm" && i.error?.startsWith("nonce-gap:") ? Number(i.error.split(":")[1]) : null);

export function SigningProgress({ intent }: { intent: PendingIntent }) {
  const now = useNow();
  const stage = intent.stage;
  const amount = intent.display?.amount ?? "";
  const sent = stage === "sent" || stage === "confirmed";
  const signingStart = intent.signingAt ?? intent.walletAt ?? intent.createdAt;
  const elapsed = now ? now - signingStart : 0;
  const eta = copy.sign.mpc[etaKey(elapsed)];
  const waiting = stage === "signing" || stage === "awaiting_wallet";
  const lastAnnounced = useRef("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // how long the signature took, only when this tab saw it happen (the stage leaves `signing` with its signatures back);
  // a tracker opened later, or after a reload, doesn't know, so it doesn't say
  const sigBack = stage === "signed" || stage === "broadcasting" || stage === "sent" || stage === "confirmed" || stage === "signed_not_sent";
  const wasWaiting = useRef(false);
  useEffect(() => {
    if (sigBack && wasWaiting.current && intent.signingAt && !signedIn.has(intent.id)) signedIn.set(intent.id, Date.now() - intent.signingAt);
    wasWaiting.current = stage === "signing" || stage === "awaiting_wallet";
  }, [sigBack, stage, intent.id, intent.signingAt]);

  useEffect(() => {
    const msg = stage === "signing" ? `${copy.sign.steps.mpc.active}. ${eta}` : stage === "sent" ? copy.sign.done(amount) : stage === "confirmed" ? copy.sign.confirmed : "";
    if (msg && msg !== lastAnnounced.current) {
      lastAnnounced.current = msg;
      announce(msg);
    }
    if (stage === "sent") headingRef.current?.focus({ preventScroll: true });
  }, [stage, eta, amount]);

  const rows = rowViews(intent, elapsed, now !== 0);
  const outcome = OUTCOMES[stage];

  return (
    <section aria-labelledby="tracker-title" data-testid="signing-progress" data-stage={stage} className="flex flex-col gap-4">
      {outcome ? (
        <Outcome intent={intent} tone={outcome.tone} icon={outcome.icon} />
      ) : (
        <div className="flex flex-col gap-0.5">
          <h3 id="tracker-title" ref={headingRef} tabIndex={-1} className="m-0 flex items-center gap-2 font-display text-heading text-ink t-num focus:outline-none">
            {sent ? <Icon icon={CircleCheck} size={24} className="text-success" /> : null}
            {sent ? copy.sign.done(amount) : copy.sign.title(amount)}
          </h3>
          {intent.display ? <p className="font-sans text-body-sm text-ink-muted">{copy.sign.doneTo(intent.display.toShort)}</p> : null}
        </div>
      )}
      {waiting ? (
        <p data-testid="eta" className="flex items-start gap-2 rounded-md bg-surface-sunken px-3.5 py-3 font-sans text-label text-ink">
          <Icon icon={Hourglass} size={20} className="text-frozen" />
          <RollText text={eta} />
        </p>
      ) : null}
      <Steps rows={rows} />
      <div className="flex flex-col gap-0.5 font-sans text-caption font-normal text-ink-muted">
        {outcome ? null : <p>{sent ? copy.sign.closeOk : copy.sign.keepOpen}</p>}
        <p>{copy.sign.credit}</p>
      </div>
    </section>
  );
}

/** The four rows as the machine reports them, with this stage's words, times and links. */
function rowViews(intent: PendingIntent, elapsed: number, clock: boolean): RowView[] {
  const stage = intent.stage;
  const [r0, r1, r2, r3] = trackerRows(stage);
  const net = NETWORK_LABEL[intent.chain];
  const receipt = stage === "sent" || stage === "confirmed";
  const s = copy.sign.steps;
  const took = signedIn.get(intent.id);
  const mark = (r: RowState): Mark => r;

  const wallet: RowView = {
    state: r0,
    mark: mark(r0),
    label: r0 === "active" ? s.wallet.active : s.wallet.done,
    meta: receipt && intent.signingAt ? <time dateTime={new Date(intent.signingAt).toISOString()}>{clockTime(intent.signingAt)}</time> : undefined,
  };

  const mpc: RowView = { state: r1, mark: mark(r1), label: s.mpc.future };
  if (stage === "unknown") {
    mpc.mark = "unknown";
    mpc.label = s.mpc.unknown;
  } else if (r1 === "active") {
    mpc.label = intent.payloadHashes.length > 1 ? copy.sign.inputs(intent.payloadHashes.length) : s.mpc.active;
    // the clock ticks under the label (it becomes "NearBlocks · in 0:07" once signed), so the row never wraps at 360
    if (clock) mpc.meta = <span aria-hidden="true">{formatElapsed(elapsed)}</span>;
  } else if (r1 === "done") {
    mpc.label = s.mpc.done;
    if (intent.nearTxHash || took !== undefined) {
      mpc.meta = (
        <>
          {intent.nearTxHash ? <ExternalLink href={EXPLORERS.nearTx(intent.nearTxHash)}>{EXPLORER_NAME.near}</ExternalLink> : null}
          {intent.nearTxHash && took !== undefined ? " · " : null}
          {took !== undefined ? s.mpc.took(formatElapsed(took)) : null}
        </>
      );
    }
  } else if (r1 === "failed") {
    mpc.label = intent.error === "E22" ? s.mpc.mismatch : s.mpc.failed;
  }

  const broadcast: RowView = { state: r2, mark: mark(r2), label: s.broadcast.future(net) };
  if (r2 === "active") broadcast.label = s.broadcast.active(net);
  else if (r2 === "done") {
    broadcast.label = s.broadcast.done(net);
    if (intent.chainTxId) {
      broadcast.meta = (
        <>
          <span className="font-mono text-address">{truncateMiddle(intent.chainTxId, 6, 4)}</span>
          {" · "}
          <ExternalLink href={chainTxUrl(intent.chain, intent.chainTxId)}>{EXPLORER_NAME[intent.chain]}</ExternalLink>
          {intent.sentAt ? (
            <>
              {" · "}
              <time dateTime={new Date(intent.sentAt).toISOString()}>{clockTime(intent.sentAt)}</time>
            </>
          ) : null}
        </>
      );
    }
  } else if (r2 === "failed") broadcast.label = stage === "expired" ? s.broadcast.expired : s.broadcast.notYet;

  const confirm: RowView = { state: r3, mark: mark(r3), label: s.confirm.future };
  if (r3 === "active") {
    confirm.mark = "wait";
    confirm.label = s.confirm.active;
    confirm.meta = intent.chain === "btc" ? copy.sign.sentNote.btc : s.confirm.eta[intent.chain];
  } else if (r3 === "done") {
    confirm.label = s.confirm.done;
    if (intent.confirmedAt) confirm.meta = <time dateTime={new Date(intent.confirmedAt).toISOString()}>{clockTime(intent.confirmedAt)}</time>;
  }
  return [wallet, mpc, broadcast, confirm];
}

const MARK: Record<Exclude<Mark, "active">, { icon: LucideIcon; color: string }> = {
  done: { icon: CircleCheck, color: "text-success" },
  future: { icon: CircleDashed, color: "text-line-strong" },
  failed: { icon: CircleX, color: "text-danger" },
  unknown: { icon: CircleQuestionMark, color: "text-ink-muted" },
  wait: { icon: Hourglass, color: "text-frozen" },
};

function StepMark({ mark }: { mark: Mark }) {
  if (mark === "active")
    return (
      <>
        <LoaderCircle size={24} strokeWidth={2} aria-hidden="true" className="animate-spin text-frozen motion-reduce:hidden" />
        <CircleDot size={24} strokeWidth={2} aria-hidden="true" className="hidden text-frozen motion-reduce:block" />
      </>
    );
  const m = MARK[mark];
  return <Icon icon={m.icon} size={24} className={m.color} />;
}

/**
 * The rows (ui.tsx `Tracker`'s look, plus the test hooks `data-row` / `data-row-state` and the completion motion): a
 * step that completes while you watch has its check stick on (from 1.5×, 320 ms) and its connector fill with success
 * from the top (300 ms, 60 ms later); the next marker fades in. Reduced motion: the check fades, the fill is instant.
 */
function Steps({ rows }: { rows: RowView[] }) {
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const before = useRef<Mark[] | null>(null);
  const key = rows.map((r) => r.mark).join(",");

  useLayoutEffect(() => {
    const prev = before.current;
    const next = key.split(",") as Mark[];
    before.current = next;
    if (!prev) return; // the first paint is the state as drawn
    const reduce = readMotionMode() === "reduce";
    const tracks: Track<HTMLSpanElement>[] = [];
    next.forEach((m, i) => {
      if (m === prev[i]) return;
      const mark = marks.current[i];
      if (m === "done") {
        if (reduce) tracks.push({ el: mark, prop: "opacity", frames: [[0, 0], [150, 1]] });
        else tracks.push(...stickOnTracks(mark, 0, { from: 1.5, turn: 0 }).filter((t) => t.prop !== "rotate"));
        const fill = fills.current[i];
        if (fill && !reduce) tracks.push({ el: fill, prop: "scale", frames: [[0, "1 0"], [60, "1 0", EASE.inOut], [360, "1 1"]] });
      } else {
        // the next marker cross-fades in (dashed → spinner; a failure's X); never a bounce on a money state
        tracks.push({ el: mark, prop: "opacity", frames: [[0, 0], [120, 0, EASE.out], [reduce ? 270 : 280, 1]] });
      }
    });
    if (!tracks.length) return;
    const h = play(tracks, 360);
    return () => h.cancel();
  }, [key]);

  return (
    <ol aria-label={copy.sign.progress} className="m-0 flex list-none flex-col p-0">
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        return (
          <li
            key={i}
            data-row={i}
            data-row-state={r.state}
            aria-current={r.state === "active" ? "step" : undefined}
            className={cx("relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3", !last && "pb-5")}
          >
            {!last ? (
              <span aria-hidden="true" className="absolute top-7 bottom-1 left-2.75 w-0.5 overflow-hidden rounded-[1px] bg-line-strong">
                {r.state === "done" ? <span ref={(el) => void (fills.current[i] = el)} className="absolute inset-0 origin-top bg-success" /> : null}
              </span>
            ) : null}
            <span ref={(el) => void (marks.current[i] = el)} className="grid size-6 place-items-center">
              <StepMark mark={r.mark} />
            </span>
            <span className={cx("flex min-w-0 items-baseline justify-between gap-2 pt-0.5 font-sans text-body", r.state === "active" ? "font-semibold text-ink" : r.state === "done" ? "text-ink" : "text-ink-muted")}>
              <span className="min-w-0">{r.label}</span>
              {r.trail ? <span className="shrink-0 text-body-sm font-normal text-ink-muted t-num">{r.trail}</span> : null}
            </span>
            {r.meta ? <span className="col-start-2 font-sans text-body-sm text-ink-muted t-num">{r.meta}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A line that rolls when it changes (motion-spec §3 "Roll"; it may wrap, unlike a button's `Morph`). Only the
 * current text is DOM text; the leaving one is drawn from `data-l`. Reduced motion: a cross-fade. */
function RollText({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const [leaving, setLeaving] = useState<{ text: string; n: number } | null>(null);
  const cur = useRef<HTMLSpanElement>(null);
  const old = useRef<HTMLSpanElement>(null);
  if (text !== shown) {
    setLeaving({ text: shown, n: (leaving?.n ?? 0) + 1 });
    setShown(text);
  }
  useLayoutEffect(() => {
    if (!leaving) return;
    let alive = true;
    const h = play(rollTracks(old.current, cur.current, 0, readMotionMode() === "reduce"), 250);
    void h.finished.then(() => alive && setLeaving(null));
    return () => {
      alive = false;
      h.cancel();
    };
  }, [leaving]);
  return (
    <span className="grid min-w-0 flex-1">
      {leaving ? <span ref={old} aria-hidden="true" data-l={leaving.text} className="[grid-area:1/1] before:content-[attr(data-l)]" /> : null}
      <span ref={cur} className="[grid-area:1/1]">
        {shown}
      </span>
    </span>
  );
}

/** The outcome that replaces the tracker's heading (app-screens §6; proto `.outcome`). */
function Outcome({ intent, tone, icon }: { intent: PendingIntent; tone: "danger" | "neutral"; icon: LucideIcon }) {
  const stage = intent.stage;
  const gap = nonceGap(intent);
  let title: string;
  let lead: ReactNode;
  const notes: ReactNode[] = [];
  switch (stage) {
    case "timed_out":
      title = copy.sign.timeout.title;
      lead = copy.sign.timeout.body;
      notes.push(copy.sign.timeout.cond, intent.chain === "evm" ? copy.sign.timeout.retry.evm(intent.evmNonce ?? 0) : intent.chain === "btc" ? copy.sign.timeout.retry.btc : copy.sign.timeout.retry.sol);
      break;
    case "signed_not_sent":
      title = copy.sign.notSent.title;
      lead = copy.sign.notSent.body(intent.notSentReason ?? "", intent.tokenId);
      notes.push(copy.sign.notSent.explain);
      break;
    case "expired":
      title = copy.sign.solExpired.title;
      lead = copy.sign.solExpired.body;
      break;
    case "unknown":
      title = copy.sign.unknown.title;
      lead = copy.sign.unknown.body(intent.nearTxHash ? truncateMiddle(intent.nearTxHash, 4, 4) : "");
      break;
    default:
      title = copy.sign.failedTitle;
      lead = intent.error === "E22" ? copy.errors.E22 : errorCopy(intent.error ?? "", { id: intent.tokenId, chain: intent.chain });
  }
  return (
    <div role={tone === "danger" ? "alert" : "status"} data-testid={stage === "expired" ? "sol-expired" : undefined} className="flex flex-col gap-3">
      <span className={cx("grid size-14 place-items-center rounded-md bg-surface-sunken", tone === "danger" ? "text-danger" : "text-ink")}>
        <Icon icon={icon} size={28} />
      </span>
      <h3 id="tracker-title" tabIndex={-1} className="m-0 font-display text-[1.5rem] leading-7.5 font-bold tracking-[-0.015em] text-ink focus:outline-none">
        {title}
      </h3>
      <p className={cx("font-sans text-body text-ink", tone === "danger" && "font-semibold")}>{lead}</p>
      {notes.map((n, i) => (
        <p key={i} className="font-sans text-[0.9375rem] leading-5.5 text-ink-muted">
          {n}
        </p>
      ))}
      {stage === "signed_not_sent" && gap !== null ? (
        <p className="flex items-start gap-2 font-sans text-body-sm text-ink">
          <Icon icon={Hourglass} size={16} className="mt-0.5 text-frozen" />
          {copy.sign.notSent.gap(intent.evmNonce ?? 0, gap)}
        </p>
      ) : null}
      {stage === "signed_not_sent" && intent.display ? <SendDetails intent={intent} /> : null}
    </div>
  );
}

/** "Details": what the signed transaction would do (amount → address · nonce or coins). */
function SendDetails({ intent, plain = false }: { intent: PendingIntent; plain?: boolean }) {
  if (!intent.display) return null;
  return (
    <details className={cx("group", plain ? "" : "rounded-md border border-line bg-surface")}>
      <summary
        className={cx(
          "flex cursor-pointer list-none items-center justify-between gap-3 font-sans font-semibold [&::-webkit-details-marker]:hidden",
          plain ? "min-h-8 text-body-sm text-link" : "min-h-13 px-4 text-label text-ink",
        )}
      >
        {copy.sign.details}
        {plain ? null : <ChevronDownMark />}
      </summary>
      <p className={cx("font-sans text-body-sm text-ink", plain ? "mt-1" : "px-4 pb-4")}>
        {intent.display.amount} → <span className="font-mono text-address">{intent.display.toShort}</span>
        {intent.evmNonce != null ? ` · nonce ${intent.evmNonce}` : null}
        {intent.unsigned.btc ? ` · ${intent.unsigned.btc.inputs.length} coin(s)` : null}
      </p>
    </details>
  );
}

function ChevronDownMark() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" className="text-ink-muted transition-transform duration-150 group-open:rotate-180">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The sheet foot for the tracker (FlowShell `action`): the outcome's one action, stacked over Close; Done and View
 * activity once sent. Nothing while the send is in flight (Minimize is the head's button then).
 */
export function SigningActions({ intent, closeHref }: { intent: PendingIntent; closeHref: string }) {
  const stage = intent.stage;
  const id = intent.tokenId;
  const close = (
    <Button href={closeHref} replace size="lg" block>
      {copy.sign.close}
    </Button>
  );
  let main: ReactNode = null;
  let second: ReactNode = close;
  switch (stage) {
    case "sent":
    case "confirmed":
      main = (
        <Button variant="primary" size="lg" block href={`/s/${id}`} replace>
          {copy.sign.doneBtn}
        </Button>
      );
      second = (
        <Button size="lg" block href={`/s/${id}/activity`}>
          {copy.sign.viewActivity}
        </Button>
      );
      break;
    case "timed_out":
    case "expired":
    case "failed":
      main = (
        <Button variant="primary" size="lg" block icon={RotateCcw} onClick={() => retry(intent)} data-testid="try-again">
          {copy.sign.tryAgain}
        </Button>
      );
      break;
    case "signed_not_sent":
      if (nonceGap(intent) === null) main = <BroadcastAgain intent={intent} size="lg" />;
      break;
    case "unknown":
      main = (
        <Button
          variant="primary"
          size="lg"
          block
          icon={RefreshCw}
          onClick={() => {
            intentStore().dispatch(intent.id, { type: "CHECK_AGAIN", now: Date.now() });
            startRunner(intent.id);
          }}
        >
          {copy.sign.unknown.check}
        </Button>
      );
      second = intent.nearTxHash ? (
        <ExternalLink href={EXPLORERS.nearTx(intent.nearTxHash)} className="min-h-11 self-center font-sans text-button font-semibold">
          {copy.sign.viewNear}
        </ExternalLink>
      ) : null;
      break;
    default:
      return null; // in flight: no foot
  }
  return (
    <div className="flex flex-col gap-2.5">
      {main}
      {second}
    </div>
  );
}

/** Broadcast the saved, signed transaction again (signed, not sent). */
function BroadcastAgain({ intent, size = "md", block = true }: { intent: PendingIntent; size?: "md" | "lg"; block?: boolean }) {
  return (
    <Button
      variant="primary"
      size={size}
      block={block}
      icon={RefreshCw}
      data-testid="broadcast-again"
      onClick={() => {
        intentStore().dispatch(intent.id, { type: "BROADCAST_AGAIN" });
        startRunner(intent.id);
        toast(copy.sign.steps.broadcast.active(NETWORK_LABEL[intent.chain]), { tone: "progress" });
      }}
    >
      {copy.sign.notSent.again}
    </Button>
  );
}

/** The flow owns re-preparation; this just flips the intent back to `preparing` with the same nonce / inputs. */
export function retry(intent: PendingIntent) {
  intentStore().dispatch(intent.id, { type: "RETRY", now: Date.now() });
  window.dispatchEvent(new CustomEvent("satchel:retry", { detail: intent.id }));
}

/**
 * "Signed, not sent" where the owner looks first (the Wallet tab's top slot; Activity's In progress): a danger banner
 * (an icon and a title in danger, never a red fill) with **Broadcast again** and Details (the send's tracker). An EVM
 * nonce gap shows why it can't be broadcast yet instead of the button.
 */
export function SignedNotSentCard({ intent }: { intent: PendingIntent }) {
  const intents = useIntents();
  const gap = nonceGap(intent);
  const blocking = blockingIntent(intents, intent.tokenId, intent.chain)?.id === intent.id;
  return (
    <Banner
      icon={TriangleAlert}
      tone="danger"
      id={`notsent-${intent.id}`}
      title={copy.sign.notSent.title}
      action={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {gap !== null ? <span className="font-sans text-body-sm text-ink-muted">{copy.sign.notSent.gap(intent.evmNonce ?? 0, gap)}</span> : <BroadcastAgain intent={intent} block={false} />}
          {blocking ? (
            <Button variant="link" href={`/s/${intent.tokenId}/send?chain=${intent.chain}&intent=${intent.id}`}>
              {copy.sign.details}
            </Button>
          ) : null}
        </span>
      }
    >
      <p>{copy.sign.notSent.body(intent.notSentReason ?? "", intent.tokenId)}</p>
      <p className="mt-1 text-body-sm text-ink-muted">{copy.sign.notSent.explain}</p>
    </Banner>
  );
}

/** The unsent guard's card in the send flow (app-screens §6 `.unsent-card`): an earlier signed send on this chain. */
export function UnsentCard({ intent }: { intent: PendingIntent }) {
  const stage = intent.stage;
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-4" data-testid="pending-unsent">
      <p className="flex items-center gap-2 font-sans text-label text-danger">
        <Icon icon={TriangleAlert} size={20} />
        {stage === "signed_not_sent" ? copy.sign.notSent.title : copy.sign.title(intent.display?.amount ?? "")}
      </p>
      <p className="font-sans text-body text-ink">{copy.send.guard.unsent}</p>
      {stage === "signed_not_sent" ? (
        <p className="font-sans text-body-sm text-ink-muted">
          {copy.sign.notSent.body(intent.notSentReason ?? "", intent.tokenId)} {copy.sign.notSent.explain}
        </p>
      ) : null}
      <SendDetails intent={intent} plain />
    </div>
  );
}

export { BroadcastAgain };
