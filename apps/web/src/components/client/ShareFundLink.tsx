"use client";

import { Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button, Icon, cx } from "@/components/ui";
import { toast } from "@/components/client/Toaster";
import { copy } from "@/lib/copy";
import { fundUrl, type FundPrefill } from "@/lib/fund";

const noop = () => () => {};

const TOOL =
  "inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-surface-sunken px-3.5 font-sans text-[0.875rem]/5 font-semibold whitespace-nowrap text-ink transition-colors duration-120 hover:bg-line";

/**
 * "Share link": the public Add coins page (`/fund/[id]`, lib/fund.ts), pre-filled with the coin and network of the place
 * it's shared from. The system share sheet where there is one (phones), else the link is copied with a toast. Every
 * place that shows an address or a coin carries one, so the link is never more than a tap away.
 */
export function ShareFundLink({
  tokenId,
  prefill = {},
  variant = "tool",
  className,
}: {
  tokenId: string;
  prefill?: FundPrefill;
  /** `tool`: the rows' pill; `button`: a full-width secondary (sheet feet, panels); `link`: a text link (headers) */
  variant?: "tool" | "button" | "link";
  className?: string;
}) {
  const canShare = useSyncExternalStore(noop, () => typeof navigator !== "undefined" && typeof navigator.share === "function", () => false);
  const url = fundUrl(tokenId, prefill);
  const run = () => {
    if (canShare) {
      void navigator.share({ title: copy.fundPage.shareTitle(tokenId), url }).catch(() => {
        /* dismissed */
      });
      return;
    }
    void navigator.clipboard?.writeText(url).then(
      () => toast(copy.fundPage.copied),
      () => toast(copy.fundPage.copyFailed, { tone: "neutral" }),
    );
  };
  const aria = copy.fundPage.shareAria(tokenId);
  if (variant === "button")
    return (
      <Button size="lg" block icon={Share2} onClick={run} aria-label={aria} data-testid="share-fund-link" className={className}>
        {copy.fundPage.share}
      </Button>
    );
  if (variant === "link")
    return (
      <Button variant="link" icon={Share2} onClick={run} aria-label={aria} data-testid="share-fund-link" className={className}>
        {copy.fundPage.share}
      </Button>
    );
  return (
    <button type="button" onClick={run} aria-label={aria} data-testid="share-fund-link" className={cx(TOOL, className)}>
      <Icon icon={Share2} size={16} />
      {copy.fundPage.share}
    </button>
  );
}
