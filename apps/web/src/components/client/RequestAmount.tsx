"use client";

import { ArrowUpRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button, cx } from "@/components/ui";
import { CopyButton } from "@/components/client/CopyButton";
import { copy } from "@/lib/copy";

/**
 * A4 (Request coins): the computed request's pinned actions, over the QR of the payment URI. **Copy payment link**
 * copies the wallet-openable URI (`bitcoin:`/`ethereum:`/`solana:` — what the QR also encodes), for pasting into a
 * wallet that can't scan. **Share** (where the device has a share sheet) shares the app link instead: a raw payment
 * URI means nothing pasted into a chat, but the app link opens Add coins pre-filled in any browser.
 */

const noop = () => () => {};

export function RequestLinkActions({ paymentUri, appLink, shareTitle }: { paymentUri: string; appLink: string; shareTitle: string }) {
  const canShare = useSyncExternalStore(noop, () => typeof navigator !== "undefined" && typeof navigator.share === "function", () => false);
  const share = () => {
    void navigator.share({ title: shareTitle, url: appLink }).catch(() => {
      /* dismissed */
    });
  };
  return (
    <div className={cx(canShare && "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5")}>
      <CopyButton variant="primary" value={paymentUri} label={copy.fund.request.copyUriAria} text={copy.fund.request.copyUri} toastText={copy.fund.request.copiedUri} />
      {canShare ? (
        <Button size="lg" block icon={ArrowUpRight} onClick={share}>
          {copy.fund.request.share}
        </Button>
      ) : null}
    </div>
  );
}
