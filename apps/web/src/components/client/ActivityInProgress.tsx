"use client";

import Link from "next/link";
import { ChevronRight, Hourglass, LoaderCircle, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { Button, Icon, KeepWhole, cx } from "@/components/ui";
import { FeedGroup, utcClock, utcDay } from "@/components/Timeline";
import { copy } from "@/lib/copy";
import { useNow } from "@/lib/clock";
import { formatElapsed, MINUS, relativeTime } from "@/lib/format";
import { useIntents } from "@/lib/signing/client";
import type { PendingIntent } from "@/lib/signing/types";

/**
 * Activity's client pieces (app-screens §4): the pinned **In progress** group (this tab's local intents: signing,
 * broadcasting, in the mempool, or signed but not sent), and the two time leaves the server record uses. Both time
 * leaves render the UTC form in the server HTML (deterministic, honest even when the page is stale) and switch to the
 * relative form once the browser knows the time.
 */

const DAY = 86_400_000;

/** A day group's heading: "Oct 20" in the server HTML; "Today" or "Yesterday" (UTC days) in the browser. */
export function DayLabel({ ms }: { ms: number }) {
  const now = useNow();
  const day = Math.floor(ms / DAY);
  const today = now ? Math.floor(now / DAY) : null;
  const label = today === day ? copy.act.today : today === day + 1 ? copy.act.yesterday : utcDay(ms);
  return <time dateTime={new Date(ms).toISOString().slice(0, 10)}>{label}</time>;
}

/** A row's time: "02:40 UTC" in the server HTML; within the last day the browser shows "14 min ago". */
export function RowTime({ ms }: { ms: number }) {
  const now = useNow();
  const recent = now > 0 && now - ms < DAY && now >= ms;
  return (
    <time dateTime={new Date(ms).toISOString()} title={recent ? utcClock(ms) : undefined}>
      {recent ? relativeTime(ms, now) : utcClock(ms)}
    </time>
  );
}

const SHOWN = new Set(["preparing", "awaiting_wallet", "signing", "signed", "broadcasting", "sent", "signed_not_sent"]);

function stageLine(i: PendingIntent, now: number): { line: string; icon: LucideIcon; tone: string; spin?: boolean } {
  const p = copy.act.progress;
  switch (i.stage) {
    case "signing":
      return { line: p.signing(formatElapsed(now ? now - (i.signingAt ?? i.createdAt) : 0)), icon: LoaderCircle, tone: "text-frozen", spin: true };
    case "signed":
    case "broadcasting":
      return { line: p.broadcasting, icon: LoaderCircle, tone: "text-frozen", spin: true };
    case "sent":
      return { line: p.mempool, icon: Hourglass, tone: "text-frozen" };
    default:
      return { line: p.wallet, icon: LoaderCircle, tone: "text-frozen", spin: true };
  }
}

function Lead({ i, icon, tone, spin }: { i: PendingIntent; icon: LucideIcon; tone: string; spin?: boolean }) {
  return (
    <span className="relative grid size-9 flex-none place-items-center">
      <ChainCharm chain={i.chain} size={32} />
      <span className={cx("absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-[1.5px] border-line bg-surface", tone)}>
        <Icon icon={icon} size={12} spin={spin} />
      </span>
    </span>
  );
}

const ROW = "relative flex min-h-16 w-full items-center gap-3 rounded-md py-3 pr-3 pl-4 text-left no-underline in-[li+li]:before:absolute in-[li+li]:before:inset-x-4 in-[li+li]:before:top-0 in-[li+li]:before:h-px in-[li+li]:before:bg-line";

/** The pinned "In progress" group of Activity: nothing in the server HTML (intents live in this browser). */
export function ActivityInProgress({ tokenId }: { tokenId: string }) {
  const now = useNow();
  const intents = useIntents().filter((i) => i.tokenId === tokenId && SHOWN.has(i.stage));
  if (!intents.length) return null;
  return (
    <FeedGroup id="in-progress" heading={copy.act.inProgress}>
      {intents.map((i) => {
        const href = `/s/${tokenId}/send?chain=${i.chain}&intent=${i.id}`;
        const to = i.display?.toShort ?? "";
        const amount = i.display?.amount ? `${MINUS}${i.display.amount}` : null;
        if (i.stage === "signed_not_sent") {
          return (
            <li key={i.id} data-intent={i.id}>
              <div className={cx(ROW, "flex-wrap")}>
                <Lead i={i} icon={TriangleAlert} tone="text-danger" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-sans text-[0.9375rem]/5 font-semibold text-ink">{copy.act.row.notSent}</span>
                  <span className="font-sans text-body-sm text-ink-muted">{copy.act.progress.notSent(to)}</span>
                </span>
                {i.display?.amount ? <span className="flex-none font-sans text-[0.9375rem]/5 font-bold whitespace-nowrap text-ink t-num">{i.display.amount}</span> : null}
                <Button href={href} icon={RefreshCw} className="ml-12 basis-full sm:basis-auto">
                  {copy.sign.notSent.now}
                </Button>
              </div>
            </li>
          );
        }
        const s = stageLine(i, now);
        return (
          <li key={i.id} data-intent={i.id}>
            <Link href={href} className={cx(ROW, "hover:bg-surface-sunken focus-visible:-outline-offset-2")}>
              <Lead i={i} icon={s.icon} tone={s.tone} spin={s.spin} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 font-sans text-[0.9375rem]/5 font-semibold wrap-break-word text-ink">
                  <KeepWhole text={copy.act.row.sending(to)} />
                </span>
                <span className="font-sans text-body-sm text-ink-muted t-num">{s.line}</span>
              </span>
              {amount ? <span className="flex-none font-sans text-[0.9375rem]/5 font-bold whitespace-nowrap text-ink t-num">{amount}</span> : null}
              <Icon icon={ChevronRight} size={20} className="text-ink-muted" />
            </Link>
          </li>
        );
      })}
    </FeedGroup>
  );
}
