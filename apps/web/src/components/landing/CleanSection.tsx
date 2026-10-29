import type { ReactNode } from "react";
import { Check, CircleCheck, Lock, PenLine, ScrollText, Send, ShieldCheck, Signature, TriangleAlert } from "lucide-react";
import { ArtCard, ArtIcon, ArtPill, Coin, CoinRow, Initial, Lbl, amountParts } from "@/components/landing/art";
import { CONTAINER, H2, HEAD, SECTION_Y } from "@/components/landing/layout";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";

/**
 * Clean history, the catch (`#clean`, design-spec §4.6; 50 words: the H2 and five beats). Why a wallet sale is normally
 * unsafe, and what Satchel does about it, as a five-frame strip on a full-width surface band: "Without a record"
 * (frames 1–2) and "With Satchel" (frames 3–5), side by side from 1024 (2 : 3), two frames a row from 640, stacked on
 * phones. Each frame is a small desk of real UI with its beat under it; beat 5, the takeaway, is bold with a success
 * check, and its coral Buy is the viewport's one coral (an illustration).
 *
 * The strip *is* the story: with no JS and under reduced motion every frame shows its beat's end. With full motion each
 * frame plays its one change as it scrolls in, in turn (motion/enter.ts). The desks and the chapter chips are
 * `aria-hidden` (their labels are attributes); the visually hidden description and the beats carry the meaning, and
 * the two lists are named after their chapters. The browser-not-contract disclosure is not here: it lives in `#q-proves`.
 */
export function CleanSection() {
  const c = copy.landing.clean;
  const l = c.labels;
  return (
    <section id="clean" aria-labelledby="clean-title" className={cx(SECTION_Y, "border-y border-line bg-surface")}>
      <div className={CONTAINER}>
        <div className={HEAD}>
          <h2 id="clean-title" className={H2}>
            {c.h2}
          </h2>
        </div>
        <p className="sr-only">{c.alt}</p>
        <div className="mt-9 grid gap-9 md:mt-13 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8" data-story="">
          <div className="flex min-w-0 flex-col gap-3.5">
            <ArtPill tone="danger" icon={TriangleAlert} l={l.without} aria-hidden="true" className="self-start" />
            <ol aria-label={l.without} className="m-0 grid list-none gap-5 p-0 min-[640px]:grid-cols-2 min-[640px]:gap-4">
              <Frame beat={1} desk={<DeskSigned />} />
              <Frame beat={2} desk={<DeskDrained />} />
            </ol>
          </div>
          <div className="flex min-w-0 flex-col gap-3.5">
            <ArtPill tone="success" icon={ShieldCheck} l={l.with} aria-hidden="true" className="self-start" />
            <ol start={3} aria-label={l.with} className="m-0 grid list-none gap-5 p-0 min-[640px]:grid-cols-2 min-[640px]:gap-4 lg:grid-cols-3">
              <Frame beat={3} desk={<DeskRecorded />} />
              <Frame beat={4} desk={<DeskSpotted />} />
              <Frame beat={5} desk={<DeskClean />} />
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One frame: the desk, then its beat (numbered by an attribute-drawn disc; beat 5 wears a check and reads bold). */
function Frame({ beat, desk }: { beat: 1 | 2 | 3 | 4 | 5; desk: ReactNode }) {
  const takeaway = beat === 5;
  return (
    <li className="flex min-w-0 flex-col gap-3" data-beat={beat}>
      {desk}
      <p className={cx("grid grid-cols-[30px_minmax(0,1fr)] items-start gap-2.5 text-[1rem] leading-[23px]", takeaway ? "font-bold" : "font-medium")}>
        {takeaway ? (
          <span aria-hidden="true" className="inline-grid size-7 place-items-center rounded-full bg-success text-surface">
            <ArtIcon icon={Check} className="size-4" />
          </span>
        ) : (
          <Lbl
            l={String(beat)}
            aria-hidden="true"
            className="inline-grid size-7 place-items-center rounded-full bg-surface-sunken font-display text-[0.875rem] leading-none font-extrabold text-ink"
          />
        )}
        <span>{copy.landing.clean.beats[beat - 1]}</span>
      </p>
    </li>
  );
}

/** A desk: the frame's picture (aria-hidden; `data-desk` is what must be 60 % in view before its beat plays). */
function Desk({ variant, children }: { variant?: string; children: ReactNode }) {
  return (
    <div className={cx("lp-desk", variant)} aria-hidden="true" data-desk="">
      {children}
    </div>
  );
}

function SlipRow({ n, strong, children, className, ...data }: { n: number; strong?: boolean; children: ReactNode; className?: string; "data-k"?: string }) {
  return (
    <li className={cx("lp-slip__row", className)} {...data}>
      <Lbl l={copy.landing.desk.sig(n)} className={strong ? "lp-slip__name--strong" : undefined} />
      {children}
    </li>
  );
}

const USED = copy.landing.desk.settled;

/** 1 · A seller signs a transfer and keeps it: the card, with the signed note tucked under it. */
function DeskSigned() {
  const d = copy.landing.desk;
  const l = copy.landing.clean.labels;
  return (
    <Desk variant="lp-desk--top">
      <ArtCard name={d.name}>
        <CoinRow chain="btc" value={d.btc} />
        <CoinRow chain="evm" value={d.eth} />
      </ArtCard>
      <div className="lp-slip lp-note" data-k="note">
        <p className="lp-slip__head">
          <ArtIcon icon={Signature} />
          <Lbl l={l.slipTitle} />
        </p>
        <Lbl l={l.slipWhat} className="lp-note__what" />
        <Lbl l={l.held} className="lp-note__state" />
      </div>
    </Desk>
  );
}

/** 2 · Sent after the sale, it drains the buyer's ETH: the buyer's card at 0.00 ETH, a sad coin, the stamp. */
function DeskDrained() {
  const d = copy.landing.desk;
  const [btc, btcTick] = amountParts(d.btc);
  const [eth, ethTick] = amountParts(d.eth);
  const [eth0] = amountParts(d.eth0);
  return (
    <Desk variant="lp-desk--top lp-desk--bad lp-desk--buyer">
      <span className="lp-owner lp-owner--themed lp-desk__buyer">
        <Initial of={d.buyer} />
        <Lbl l={d.buyer} />
      </span>
      <ArtCard name={d.name}>
        <li className="lp-card__coin">
          <Coin chain="btc" />
          <Lbl l={btc} className="lp-card__amt" />
          <Lbl l={btcTick} className="lp-card__tick" />
        </li>
        <li className="lp-card__coin" data-zero="">
          <span className="lp-stack" data-k="eth-coin">
            <Coin chain="evm" mood="sad" data-k="eth-coin-new" />
            <Coin chain="evm" data-k="eth-coin-old" data-off="" />
          </span>
          <span className="lp-card__amt lp-stack lp-stack--start">
            <Lbl l={eth0} data-k="eth-amt-new" />
            <Lbl l={eth} className="lp-amt-was" data-k="eth-amt-old" data-off="" />
          </span>
          <Lbl l={ethTick} className="lp-card__tick" />
        </li>
      </ArtCard>
      <span className="lp-stamp" data-k="stamp">
        <ArtIcon icon={Send} />
        <Lbl l={copy.landing.clean.labels.moved} />
      </span>
    </Desk>
  );
}

/** 3 · Satchel records every signature on NEAR before it's made: the record, Signature 3 being written. */
function DeskRecorded() {
  return (
    <Desk>
      <div className="lp-slip lp-desk-slip">
        <p className="lp-slip__head">
          <ArtIcon icon={ScrollText} />
          <Lbl l={copy.landing.clean.labels.recorded} />
        </p>
        <ol className="lp-slip__rows">
          <SlipRow n={1}>
            <Lbl l={USED} className="lp-slip__state lp-slip__state--muted" />
          </SlipRow>
          <SlipRow n={2}>
            <Lbl l={USED} className="lp-slip__state lp-slip__state--muted" />
          </SlipRow>
          <SlipRow n={3} strong className="lp-slip__row--hl" data-k="rec-row">
            <span className="lp-slip__state lp-slip__state--frozen">
              <span className="lp-pen" data-k="rec-pen">
                <ArtIcon icon={PenLine} />
              </span>
            </span>
          </SlipRow>
        </ol>
      </div>
    </Desk>
  );
}

/** 4 · The buyer's browser spots it first: 1 unused signature, and Buy stays grey with its lock. */
function DeskSpotted() {
  const d = copy.landing.desk;
  return (
    <Desk>
      <div className="lp-slip lp-desk-slip">
        <p className="lp-slip__head lp-slip__head--danger" data-k="head-4">
          <ArtIcon icon={TriangleAlert} />
          <Lbl l={copy.landing.clean.labels.unusedHead} />
        </p>
        <ol className="lp-slip__rows">
          <SlipRow n={1}>
            <Lbl l={USED} className="lp-slip__state" />
          </SlipRow>
          <SlipRow n={2}>
            <Lbl l={USED} className="lp-slip__state" />
          </SlipRow>
          <SlipRow n={3} strong>
            <span className="lp-slip__state lp-slip__state--danger" data-k="unused-4">
              <ArtIcon icon={TriangleAlert} />
              <Lbl l={d.unused} />
            </span>
          </SlipRow>
        </ol>
      </div>
      <span className="lp-buy lp-buy--off" data-k="buy-4">
        <ArtIcon icon={Lock} />
        <Lbl l={d.buy} />
      </span>
    </Desk>
  );
}

/** 5 · Buy turns on only when no old signature can move the coins: every row Used, Clean history, a coral Buy. */
function DeskClean() {
  const d = copy.landing.desk;
  return (
    <Desk>
      <div className="lp-slip lp-desk-slip">
        <div className="lp-stack lp-stack--block">
          <p className="lp-slip__head lp-slip__head--success" data-k="head-5-new">
            <ArtIcon icon={CircleCheck} />
            <Lbl l={d.clean} />
          </p>
          <p className="lp-slip__head lp-slip__head--danger" data-k="head-5-old" data-off="">
            <ArtIcon icon={TriangleAlert} />
            <Lbl l={copy.landing.clean.labels.unusedHead} />
          </p>
        </div>
        <ol className="lp-slip__rows">
          <SlipRow n={1}>
            <Lbl l={USED} className="lp-slip__state" />
          </SlipRow>
          <SlipRow n={2}>
            <Lbl l={USED} className="lp-slip__state" />
          </SlipRow>
          <SlipRow n={3} strong>
            <span className="lp-stack lp-stack--end">
              <span className="lp-slip__state" data-k="row-5-new">
                <ArtIcon icon={Check} />
                <Lbl l={USED} />
              </span>
              <span className="lp-slip__state lp-slip__state--danger" data-k="row-5-old" data-off="">
                <ArtIcon icon={TriangleAlert} />
                <Lbl l={d.unused} />
              </span>
            </span>
          </SlipRow>
        </ol>
      </div>
      <span className="lp-stack">
        <Lbl l={d.buy} className="lp-buy lp-buy--on" data-k="buy-5-new" />
        <span className="lp-buy lp-buy--off" data-k="buy-5-old" data-off="">
          <ArtIcon icon={Lock} />
          <Lbl l={d.buy} />
        </span>
      </span>
    </Desk>
  );
}
