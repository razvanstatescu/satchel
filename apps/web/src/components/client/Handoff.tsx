"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode, type Ref } from "react";
import { Sparkle } from "@/components/brand/Sparkle";
import { SatchelCard, type CardChip } from "@/components/SatchelCard";
import { Avatar, StatusPill, cx, type PillKind } from "@/components/ui";
import { announce } from "@/components/client/Toaster";
import { copy } from "@/lib/copy";
import { readMotionMode } from "@/lib/motion-flag";
import { handoffTracks } from "@/lib/motion/handoff";
import { play, type MotionHandle } from "@/lib/motion/play";

/**
 * The hand-off, the brand's one signature motion (motion-spec §2; app-screens §7.3; proto/motion-handoff.html).
 *
 * A strap runs between two owners and the card hangs from it on a 22 px stem. Only after a chain-confirmed success
 * (never optimistically) the stem is carried along the strap: the card lags back 5.8°, swings forward 10° when the stem
 * stops, settles in 600 ms like a damped pendulum, and the stem clicks 3 px into the new owner's notch. The giver's
 * **Yours** peels off as it is picked up (`give`, `sold`); the buyer's sticks on as it lands (`buy`). The card's state
 * word rolls (Active → Given; Paused for sale → Bought or Sold), two sparkles pop, then the sentence and whatever
 * follows it (the receipt) fade in, and the sentence takes focus with a polite announcement.
 *
 * - **The static markup is the end frame** (server HTML, no JS, and the end of the motion are the same picture). The
 *   motion animates from the start with WAAPI (`lib/motion`), then cancels itself, so the page rests on plain CSS.
 * - It plays only when the component mounts **after hydration** (a success screen). Mounted during hydration (a page
 *   load), it renders the end frame and doesn't move. `onceKey` limits it to once per device (the Sold receipt).
 * - Reduced motion (`<html data-motion="reduce">`): a 480 ms dip: the card fades out at the giver, fades in at the
 *   receiver, focus at 450 ms.
 * - The stage is decorative (`aria-hidden`): the sentence says it all, and the receipt carries the accounts in full.
 */

export type HandoffVariant = "give" | "buy" | "sold";

const VARIANT: Record<HandoffVariant, { viewer: "from" | "to"; fromStatus: PillKind; toStatus: PillKind; yours: "peel" | "stick" }> = {
  /** the giver's view: Yours comes off; Active → Given */
  give: { viewer: "from", fromStatus: "active", toStatus: "transferred", yours: "peel" },
  /** the buyer's view: Yours sticks on; Paused for sale → Bought */
  buy: { viewer: "to", fromStatus: "listed", toStatus: "bought", yours: "stick" },
  /** the seller's Sold receipt: Yours comes off; Paused for sale → Sold */
  sold: { viewer: "from", fromStatus: "listed", toStatus: "sold", yours: "peel" },
};

export interface HandoffProps {
  /** give (default) · buy · sold. */
  variant?: HandoffVariant;
  tokenId: string;
  /** The account the Satchel leaves (the giver, the seller). */
  from: string;
  /** The account it goes to (the receiver, the buyer). */
  to: string;
  /** The card's charm ledger, as for SatchelCard (`cardChips(live)`). */
  chips: CardChip[];
  /** The headline under the stage (`data-testid="handoff-sentence"`, `tabIndex=-1`): focused once the card lands. */
  sentence: ReactNode;
  /** Its element: `h3` (default, inside a flow sheet), `h2`, `h1` (a page's main heading) or `p`. */
  sentenceAs?: "h1" | "h2" | "h3" | "p";
  /** `md` 22/28 (default; the Give sheet) or `lg` (text-title, a page like Buy done). */
  sentenceSize?: "md" | "lg";
  sentenceId?: string;
  /** One line under the sentence ("You now control …"). */
  sub?: ReactNode;
  /** The polite announcement once it lands (the one status region). Omit to stay quiet. */
  live?: string;
  /** Move focus to the sentence once it lands (default true). */
  focus?: boolean;
  /** false: always render the end frame. Default true (it still plays only when mounted after hydration). */
  animate?: boolean;
  /** Play at most once per device for this key (localStorage; e.g. `seenSaleKey(id, listing)` for the Sold receipt). */
  onceKey?: string;
  /** The card's state before the hand-off, if not the variant's (give: `active`; buy and sold: `listed`). */
  fromStatus?: PillKind;
  /** The receipt and anything else after the sentence: it fades in with it (`data-after`). */
  children?: ReactNode;
  className?: string;
  /** Default "handoff" (flows.spec). */
  testId?: string;
  /**
   * Inside the object page's grid (the Sold tab): from 1024 the stage takes the object column (sticky) and the sentence
   * and children the main column under the tabs, as in proto `sold-*`; below 1024 it is one column, as always.
   */
  split?: boolean;
}

const noop = () => () => {};
/** False while hydrating server HTML, true for a mount after it (a success screen, a client navigation). */
const useMountedAfterHydration = () => useSyncExternalStore(noop, () => true, () => false);

/** Keys seen in this page load (storage blocked or not: a remount never replays a once-only hand-off). */
const seenThisLoad = new Set<string>();
function seenBefore(key: string): boolean {
  if (seenThisLoad.has(key)) return true;
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
function markSeen(key: string) {
  seenThisLoad.add(key);
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* blocked: it plays once per load */
  }
}

type MotionWindow = Window & { __satchelMotion?: Record<string, MotionHandle | undefined> };

export function Handoff({
  variant = "give",
  tokenId,
  from,
  to,
  chips,
  sentence,
  sentenceAs = "h3",
  sentenceSize = "md",
  sentenceId,
  sub,
  live,
  focus = true,
  animate = true,
  onceKey,
  fromStatus,
  children,
  className,
  testId = "handoff",
  split = false,
}: HandoffProps) {
  const v = VARIANT[variant];
  const mountedAfterHydration = useMountedAfterHydration();
  // fixed at the first render: a hand-off either plays from the start or is the end frame
  const [phase, setPhase] = useState<"playing" | "landed">(() => (animate && mountedAfterHydration && !(onceKey && seenBefore(onceKey)) ? "playing" : "landed"));
  const playing = phase === "playing";

  const cardRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const toAvatarRef = useRef<HTMLSpanElement>(null);
  const pillFromRef = useRef<HTMLSpanElement>(null);
  const sparkARef = useRef<HTMLSpanElement>(null);
  const sparkBRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sentenceRef = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const settle = useRef({ focus, live });
  useEffect(() => {
    settle.current = { focus, live };
  }, [focus, live]);

  // Before the first paint: the one layout read, then every track from the start of the motion.
  useLayoutEffect(() => {
    if (phase !== "playing") return;
    const card = cardRef.current;
    const box = boxRef.current;
    if (!card || !box) return;
    if (onceKey) markSeen(onceKey);
    const reduce = readMotionMode() === "reduce";
    // the one layout read: how far the card travels (its static place is under the receiver) and where its pill sits
    const dx = card.offsetLeft;
    const pillTo = box.querySelector<HTMLElement>("[data-status]");
    const pillFrom = pillFromRef.current;
    const at = pillTo ? { box: box.getBoundingClientRect(), pill: pillTo.getBoundingClientRect() } : null;
    if (at && pillFrom) {
      pillFrom.style.left = `${at.pill.left - at.box.left}px`;
      pillFrom.style.top = `${at.pill.top - at.box.top}px`;
    }
    const yours = box.querySelector<HTMLElement>("[data-yours]");
    const after = [headRef.current, bodyRef.current].filter((x): x is HTMLDivElement => x !== null);
    const sparks = [sparkARef.current, sparkBRef.current].filter((x): x is HTMLSpanElement => x !== null);
    const plan = handoffTracks<Element>(
      {
        card,
        ghost: ghostRef.current,
        toAvatar: toAvatarRef.current,
        peel: v.yours === "peel" ? yours : null,
        stick: v.yours === "stick" ? yours : null,
        pillFrom: pillTo ? pillFrom : null,
        pillTo,
        sparks,
        after,
      },
      dx,
      { reduce },
    );
    const handle = play(plan.tracks, plan.T);
    const w = window as MotionWindow;
    if (process.env.NODE_ENV !== "production") w.__satchelMotion = { ...w.__satchelMotion, handoff: handle };
    let alive = true;
    let settled = false;
    // focus and announce at `focusAt` (1400 ms; 450 reduced), or at once if the motion ends early (no WAAPI)
    const settleNow = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      const s = settle.current;
      if (s.focus) sentenceRef.current?.focus({ preventScroll: true });
      if (s.live) announce(s.live);
    };
    const timer = window.setTimeout(settleNow, plan.focusAt);
    void handle.finished.then(() => {
      if (!alive) return;
      settleNow();
      setPhase("landed");
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      handle.cancel();
    };
    // the motion is planned once per mount; later prop changes don't restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "playing"]);

  // An end frame from the start (no motion): settle at once.
  useEffect(() => {
    if (phase !== "landed" || !mountedAfterHydration) return;
    const s = settle.current;
    if (s.focus) sentenceRef.current?.focus({ preventScroll: true });
    if (s.live) announce(s.live);
    // once, on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const youFrom = v.viewer === "from";
  const H = sentenceAs;
  // the giver's Yours exists only to peel off; once the card has landed it isn't theirs
  const owned = v.yours === "stick" || playing;

  return (
    <div data-testid={testId} data-variant={variant} data-landed={playing ? undefined : ""} className={cx("flex flex-col gap-5", split && "lg:contents", className)}>
      {/* the stage (decorative: the sentence and the receipt say what happened) */}
      <div aria-hidden="true" className={cx("@container/hook relative pt-1", split && "lg:sticky lg:top-10 lg:min-w-0 lg:self-start lg:[grid-area:col]")}>
        <div className="grid grid-cols-2 items-start gap-4">
          <End role={copy.xfer.stage.from} name={youFrom ? copy.xfer.stage.you : from} account={from} />
          <End role={copy.xfer.stage.to} name={youFrom ? to : copy.xfer.stage.you} account={to} end avatarRef={toAvatarRef} />
        </div>
        <div className="mt-3.5 h-2.5 rounded-pill bg-sticker" />
        <div className="relative h-[165px] @min-[400px]/hook:h-[185px]">
          {/* the empty place it left */}
          <span ref={ghostRef} className="absolute top-0 left-0 h-[153px] w-52 rounded-card border-2 border-dashed border-line-strong opacity-70 @min-[400px]/hook:h-[173px] @min-[400px]/hook:w-60" />
          <span ref={sparkARef} className="absolute top-1.5 right-3.5 size-5.5">
            <Sparkle size={22} />
          </span>
          <span ref={sparkBRef} className="absolute top-13.5 right-[210px] size-4 @min-[400px]/hook:right-[242px]">
            <Sparkle size={16} />
          </span>
          {/* the stem and the card, hanging under the receiver (12 px of swing room before the strap's end) */}
          <div
            ref={cardRef}
            className="absolute top-0 left-[calc(100%-220px)] flex w-52 origin-[50%_0] flex-col items-center @min-[400px]/hook:left-[calc(100%-252px)] @min-[400px]/hook:w-60"
          >
            <span className="h-5.5 w-1 rounded-[2px] bg-sticker" />
            <div ref={boxRef} className="relative w-full">
              <SatchelCard tokenId={tokenId} id={`handoff-card-${tokenId}`} size="sm" status={v.toStatus} owned={owned} chips={chips} headingLevel={3} />
              {playing ? (
                <span ref={pillFromRef} className="absolute top-0 left-0 opacity-0">
                  <StatusPill status={fromStatus ?? v.fromStatus} size="sm" />
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={split ? "flex min-w-0 flex-col gap-5 lg:[grid-area:main]" : "contents"}>
      <div ref={headRef} data-after className="flex flex-col gap-1.5">
        <H
          ref={sentenceRef}
          id={sentenceId}
          tabIndex={-1}
          data-testid="handoff-sentence"
          className={cx("m-0 font-display wrap-anywhere text-ink focus:outline-none", sentenceSize === "lg" ? "text-title" : "text-[1.375rem] leading-7 font-bold tracking-[-0.015em]")}
        >
          {sentence}
        </H>
        {sub ? <p className="font-sans text-body text-ink-muted">{sub}</p> : null}
      </div>
      {children ? (
        <div ref={bodyRef} data-after className={cx("flex flex-col", split ? "gap-5" : "gap-4")}>
          {children}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function End({ role, name, account, end = false, avatarRef }: { role: string; name: string; account: string; end?: boolean; avatarRef?: Ref<HTMLSpanElement> }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", end && "items-end text-right")}>
      <span className="font-sans text-[0.8125rem] leading-4.5 text-ink-muted">{role}</span>
      <span className={cx("flex max-w-full min-w-0 items-center gap-2", end && "flex-row-reverse")}>
        <span ref={avatarRef} className="inline-flex flex-none">
          <Avatar account={account} size={28} />
        </span>
        {/* an account is an address (mono); "You" is a word (sans) */}
        <span className={cx("min-w-0 truncate text-[0.875rem] leading-5 text-ink", name === copy.xfer.stage.you ? "font-sans font-semibold" : "font-mono font-[450]")}>{name}</span>
      </span>
    </div>
  );
}

/**
 * The receipt under a hand-off (proto `.receipt.panel`): a flat panel `dl`, two columns when the receipt is 384 px wide or
 * more and one below, so full accounts and hashes never break mid-word. `mono` for accounts and hashes.
 */
export function Receipt({
  rows,
  className,
  ...rest
}: { rows: readonly { label: ReactNode; value: ReactNode; mono?: boolean; testId?: string }[] } & Omit<ComponentProps<"dl">, "children">) {
  // two columns once the receipt itself is 384 px wide, one below: it follows its own width, not the viewport's (the Sold
  // receipt sits in a 352 px column at 1024, where two columns broke the buyer's account mid-word)
  return (
    <div className="@container/receipt">
      <dl
        className={cx(
          "m-0 grid grid-cols-1 rounded-md border border-line bg-surface p-5 font-sans text-[0.9375rem] leading-5.5 md:p-6 @min-[24rem]/receipt:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] @min-[24rem]/receipt:gap-x-4 @min-[24rem]/receipt:gap-y-2",
          className,
        )}
        {...rest}
      >
        {rows.map((r, i) => (
          <Fragment key={i}>
            <dt className={cx("text-ink-muted @max-[24rem]/receipt:text-[0.8125rem] @max-[24rem]/receipt:leading-4.5", i > 0 && "@max-[24rem]/receipt:mt-2.5")}>{r.label}</dt>
            <dd data-testid={r.testId} className={cx("m-0 min-w-0 t-num wrap-anywhere", r.mono && "font-mono text-[0.875rem] leading-5.5 font-[450]")}>
              {r.value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
