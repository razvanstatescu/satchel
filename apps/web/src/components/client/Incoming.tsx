"use client";

import { CircleCheck, Hourglass, LoaderCircle, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { CopyButton } from "@/components/client/CopyButton";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { announce } from "@/components/client/Toaster";
import { CHAIN_NAME, copy, TICKER } from "@/lib/copy";
import { useLiveSnapshot } from "@/lib/data/client";
import type { SatchelSnapshot } from "@/lib/data/types";
import type { FundPrefill } from "@/lib/fund";
import { formatAmount } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, stickOnTracks, type Track } from "@/lib/motion/play";
import { balanceBase, type UiChain } from "@/lib/view";

/**
 * Add coins' client pieces (app-screens §8; proto app-receive.html): the Incoming line, which follows the live balance
 * (waiting → in the mempool → received), and the pinned actions (Copy address, plus Share where the device has a share
 * sheet). The address, the QR and the notes are server-rendered by the page.
 */

export type IncomingState = "waiting" | "mempool" | "received";

const LOOK: Record<IncomingState, { icon: LucideIcon; tone: string; spin?: boolean }> = {
  waiting: { icon: LoaderCircle, tone: "text-ink-muted", spin: true },
  mempool: { icon: Hourglass, tone: "text-frozen" },
  received: { icon: CircleCheck, tone: "text-success" },
};

/** The words of each state (pure). `amount` is what arrived; `total` what the Satchel now holds on that chain. */
export function incomingLines(state: IncomingState, chain: UiChain, tokenId: string, amount: bigint, total: bigint | null): { title: string; help: string } {
  const f = copy.fund.incoming;
  const t = TICKER[chain];
  if (state === "mempool") return { title: f.mempool(formatAmount(amount, t)), help: f.pendingHelp };
  if (state === "received") return { title: f.received(formatAmount(amount, t)), help: total === null ? f.waitingHelp : f.receivedHelp(tokenId, formatAmount(total, t)) };
  return { title: f.waiting, help: f.waitingHelp };
}

/** The Incoming line as drawn (a presentational component: the live one is `Incoming`). */
export function IncomingView({ state, chain, tokenId, amount = 0n, total = null }: { state: IncomingState; chain: UiChain; tokenId: string; amount?: bigint; total?: bigint | null }) {
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(state);
  // motion-spec §8: news arrives calmly: the in-mempool line fades up; "Received" sticks on (from 1.25×, no turn).
  useLayoutEffect(() => {
    if (last.current === state) return;
    last.current = state;
    const el = box.current;
    if (!el || state === "waiting") return;
    const reduce = readMotionMode() === "reduce";
    const tracks: Track<HTMLElement>[] =
      state === "received" && !reduce
        ? stickOnTracks(el, 0, { from: 1.25, turn: 0 })
        : [
            { el, prop: "opacity", frames: [[0, 0, EASE.out], [reduce ? 150 : 200, 1]] },
            ...(reduce ? [] : [{ el, prop: "translate" as const, frames: [[0, "0 6px", EASE.out], [200, "0 0"]] as const }]),
          ];
    const h = play(tracks, state === "received" && !reduce ? 320 : reduce ? 150 : 200);
    return () => h.cancel();
  }, [state]);
  const look = LOOK[state];
  const words = incomingLines(state, chain, tokenId, amount, total);
  return (
    <section aria-labelledby="incoming-title" className="flex flex-col gap-2">
      <h3 id="incoming-title" className="m-0 font-sans text-label text-ink-muted">
        {copy.fund.incoming.title}
      </h3>
      <div ref={box} data-incoming={state} className="flex items-center gap-3 rounded-md bg-surface-sunken px-4 py-3.5">
        <Icon icon={look.icon} size={20} spin={look.spin} className={look.tone} />
        <span className="flex min-w-0 flex-col">
          <span className="font-sans text-[0.9375rem]/5 font-semibold text-ink t-num">{words.title}</span>
          <span className="font-sans text-caption font-normal text-ink-muted t-num">{words.help}</span>
        </span>
      </div>
    </section>
  );
}

/**
 * The live Incoming line: a delta against the first balance this sheet saw (per chain), so it reads "+x · in mempool"
 * while BTC is unconfirmed and "Received x" once the confirmed balance grows. It never carries a judge fact. Changes
 * are announced in the one status region.
 */
export function Incoming({ snap, chain }: { snap: SatchelSnapshot; chain: UiChain }) {
  const live = useLiveSnapshot(snap);
  const confirmed = balanceBase(live, chain);
  const unconfirmed = chain === "btc" && live.balances.btc ? BigInt(live.balances.btc.unconfirmed_sats) : 0n;
  // the baseline is the first balance this view saw (per chain); adjusted during render, not in an effect
  const [start, setStart] = useState<{ chain: UiChain; value: bigint } | null>(null);
  if (confirmed !== null && (start === null || start.chain !== chain)) setStart({ chain, value: confirmed });
  const base = start && start.chain === chain ? start.value : null;
  const state: IncomingState = base === null || confirmed === null ? "waiting" : unconfirmed > 0n ? "mempool" : confirmed > base ? "received" : "waiting";
  const amount = state === "mempool" ? unconfirmed : state === "received" && base !== null && confirmed !== null ? confirmed - base : 0n;
  const said = useRef<IncomingState>("waiting");
  useLayoutEffect(() => {
    if (said.current === state) return;
    said.current = state;
    if (state === "waiting") return;
    const w = incomingLines(state, chain, snap.token_id, amount, confirmed);
    announce(`${w.title}. ${w.help}`);
  }, [state, chain, snap.token_id, amount, confirmed]);
  return <IncomingView state={state} chain={chain} tokenId={snap.token_id} amount={amount} total={confirmed} />;
}

/**
 * The sheet's pinned foot: **Copy address** (the primary; its visible label is "Copy address", and it rolls to "Copied")
 * and **Share link** (3 : 2): the public Add coins page pre-filled with this coin and network, through the share sheet
 * where there is one, else copied.
 */
export function ReceiveActions({ address, chain, tokenId, prefill }: { address: string; chain: UiChain; tokenId: string; prefill?: FundPrefill }) {
  const name = CHAIN_NAME[chain];
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2.5">
      <CopyButton variant="primary" value={address} label={copy.fund.copy} text={copy.fund.copy} toastText={copy.wallet.copiedAria(name)} />
      <ShareFundLink tokenId={tokenId} prefill={prefill} variant="button" />
    </div>
  );
}
