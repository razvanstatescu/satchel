"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { useNow } from "@/lib/clock";
import { copy } from "@/lib/copy";
import { formatElapsed } from "@/lib/format";
import { resumeOnLoad, useIntents } from "@/lib/signing/client";
import type { PendingIntent } from "@/lib/signing/types";
import { Icon } from "@/components/ui";

/**
 * A send that runs outside its sheet (app-screens §11.5; APP-COMPONENTS #3). Below 1024 px a **pill in the top bar**
 * ("Sending 0.0010 ETH · 0:42", spinner); from 1024 a **card at the bottom right**. "Sent 0.0010 ETH" stays 5 s, and
 * "Signed, not sent · Broadcast now" stays until it is handled. Both link to the send flow with its intent.
 *
 * `PendingIndicator` (the card) is also where every non-terminal intent resumes once per tab (kb/90 §8.6
 * resume-on-load) and where a background tab's title reads "(1) Signing… · …". Mount it once per surface.
 */

const SHOWN = new Set(["preparing", "awaiting_wallet", "signing", "signed", "broadcasting", "sent", "signed_not_sent"]);
const TITLE_PREFIX = /^\(\d+\) Signing… · /;

type Tone = "progress" | "sent" | "attention";

function usePending(): { text: string; href: string; tone: Tone } | null {
  const intents = useIntents();
  const now = useNow();
  const open = intents.filter((i) => SHOWN.has(i.stage) && !(i.stage === "sent" && i.sentAt && now - i.sentAt > 5000));
  const i = open[open.length - 1];
  if (!i || now === 0) return null;
  return {
    text: pendingText(i, now),
    href: `/s/${i.tokenId}/send?chain=${i.chain}&intent=${i.id}`,
    tone: i.stage === "signed_not_sent" ? "attention" : i.stage === "sent" ? "sent" : "progress",
  };
}

function pendingText(i: PendingIntent, now: number): string {
  const amount = i.display?.amount ?? "";
  if (i.stage === "signed_not_sent") return copy.page.pending.notSent;
  if (i.stage === "sent") return copy.page.pending.sent(amount);
  return copy.page.pending.sending(amount, formatElapsed(now - (i.signingAt ?? i.walletAt ?? i.createdAt)));
}

function PendingIcon({ tone, size }: { tone: Tone; size: 16 | 20 }) {
  if (tone === "attention") return <Icon icon={TriangleAlert} size={size} className="text-danger" />;
  if (tone === "sent") return <Icon icon={CircleCheck} size={size} className="text-success" />;
  return <Icon icon={LoaderCircle} size={size} spin className="text-frozen" />;
}

/** The top bar's pill (below 1024). The bar steps its Testnet badge aside while it shows (`[data-pending-pill]`). */
export function PendingPill() {
  const p = usePending();
  if (!p) return null;
  return (
    <Link
      href={p.href}
      data-pending-pill=""
      data-testid="pending-pill"
      className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-pill bg-surface-sunken pr-3 pl-2.5 font-sans text-[0.8125rem] leading-4.5 font-semibold whitespace-nowrap text-ink no-underline t-num transition-colors duration-120 hover:bg-line lg:hidden"
    >
      <PendingIcon tone={p.tone} size={16} />
      <span className="min-w-0 truncate">{p.text}</span>
    </Link>
  );
}

/** The card (from 1024), the resume-on-load and the background-tab title. */
export function PendingIndicator() {
  const intents = useIntents();
  useEffect(() => resumeOnLoad(), []);
  const signingCount = intents.filter((i) => i.stage === "awaiting_wallet" || i.stage === "signing").length;

  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "");
      document.title = document.hidden && signingCount > 0 ? `(${signingCount}) Signing… · ${base}` : base;
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [signingCount]);

  const p = usePending();
  if (!p) return null;
  return (
    <Link
      href={p.href}
      data-testid="pending-card"
      className="fixed right-6 bottom-6 z-50 hidden max-w-[calc(100vw-48px)] min-w-70 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3.5 font-sans text-label text-ink no-underline shadow-overlay t-num transition-colors duration-120 hover:bg-surface-sunken lg:flex"
    >
      <PendingIcon tone={p.tone} size={20} />
      <span className="min-w-0">{p.text}</span>
    </Link>
  );
}
