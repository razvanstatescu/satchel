"use client";

import { useState } from "react";
import { Info, LoaderCircle, TriangleAlert, Undo2 } from "lucide-react";
import { useViewer } from "@/components/client/SatchelPage";
import { toast } from "@/components/client/Toaster";
import { Button, Icon, Morph, cx } from "@/components/ui";
import { capForChain, formatCapAmount } from "@/lib/allowanceView";
import { copy, errorCopy } from "@/lib/copy";
import { refreshSnapshot } from "@/lib/data/client";
import type { SatchelSnapshot } from "@/lib/data/types";
import { calls } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { UI_CHAINS } from "@/lib/view";

/**
 * C5 (docs/specs/C5.md): the owner's management panel (list + Revoke + Add) and the banner a connected account sees
 * when it holds access on a Satchel it doesn't own. Both read `live.allowances`, the same public fact the server
 * already rendered (AllowanceFacts.tsx), so there's nothing extra to fetch.
 */

type Note = { who: string; kind: "cancelled" | "error"; text: string } | null;

const MAX_DELEGATES = 4;

export function AllowanceOwnerPanel({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner, accountId } = useViewer(snap);
  const { wallet } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  if (!isOwner) return null;
  const id = snap.token_id;
  const atLimit = live.allowances.length >= MAX_DELEGATES;

  const revoke = (delegate: string) => {
    if (!wallet || !accountId || busy) return;
    setNote(null);
    setBusy(delegate);
    runCall(wallet, calls.revokeAllowance(id, delegate), accountId).then((r) => {
      setBusy(null);
      if (r.ok) {
        toast(copy.allowance.manage.revokedToast(delegate), { tone: "neutral" });
        refreshSnapshot(id);
      } else if ("cancelled" in r) {
        setNote({ who: delegate, kind: "cancelled", text: copy.allowance.manage.revokeCancelled });
      } else {
        setNote({ who: delegate, kind: "error", text: errorCopy(r.failure.code, { id }) });
      }
    });
  };

  return (
    <section aria-labelledby="allowance-manage-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5" data-testid="allowance-manage">
      <h2 id="allowance-manage-title" className="m-0 font-display text-heading text-ink">
        {copy.allowance.manage.title}
      </h2>
      {live.allowances.length === 0 ? (
        <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.none}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {live.allowances.map((a) => (
            <li key={a.delegate} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-[0.875rem]/5 font-[450]">{a.delegate}</span>
                <Button
                  size="md"
                  loading={busy === a.delegate}
                  spinner="none"
                  disabled={!wallet}
                  onClick={() => revoke(a.delegate)}
                  data-testid="revoke-allowance"
                  aria-label={busy === a.delegate ? undefined : `${copy.allowance.manage.revoke} ${a.delegate}`}
                >
                  <Morph
                    value={busy === a.delegate ? "revoking" : "idle"}
                    labels={{ idle: { label: copy.allowance.manage.revoke, icon: Undo2 }, revoking: { label: copy.allowance.manage.revoking, icon: LoaderCircle, spin: true } }}
                  />
                </Button>
              </div>
              {note?.who === a.delegate ? (
                <p role={note.kind === "error" ? "alert" : undefined} className={cx("m-0 flex items-start gap-1.5 font-sans text-body-sm", note.kind === "error" ? "text-danger" : "text-ink-muted")}>
                  <Icon icon={note.kind === "error" ? TriangleAlert : Undo2} size={16} className="mt-0.5" />
                  <span>{note.text}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Button variant="primary" href={`/s/${id}/allowance`} disabled={atLimit} aria-describedby={atLimit ? "allowance-limit" : undefined} data-testid="add-allowance">
        {copy.allowance.manage.add}
      </Button>
      {atLimit ? (
        <p id="allowance-limit" className="m-0 flex items-start gap-1.5 font-sans text-body-sm text-ink-muted">
          <Icon icon={Info} size={16} className="mt-0.5" />
          <span>{copy.allowance.manage.limitReached}</span>
        </p>
      ) : null}
      <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.manage.trustNote}</p>
    </section>
  );
}

/** A connected account that holds access here, but doesn't own it (app-screens: beside the card, above everything else). */
export function DelegateBanner({ snap }: { snap: SatchelSnapshot }) {
  const { isOwner, isDelegate, myAllowance } = useViewer(snap);
  if (isOwner || !isDelegate || !myAllowance) return null;
  const rows = UI_CHAINS.map((c) => ({ chain: c, cap: capForChain(myAllowance, c) })).filter((r) => r.cap);
  return (
    <section aria-labelledby="allowance-banner-title" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5" data-testid="delegate-banner">
      <h2 id="allowance-banner-title" className="m-0 font-display text-heading text-ink">
        {copy.allowance.banner.title}
      </h2>
      <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.banner.lede(myAllowance.owner_id)}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 font-sans text-body-sm text-ink">
        {rows.map(({ chain, cap }) => (
          <li key={chain}>{copy.allowance.send.remaining(formatCapAmount(cap!.asset, cap!.remaining))}</li>
        ))}
      </ul>
      {myAllowance.status === "paused" ? (
        <p className="m-0 flex items-start gap-1.5 font-sans text-body-sm text-ink-muted">
          <Icon icon={Info} size={16} className="mt-0.5" />
          <span>{copy.allowance.banner.paused}</span>
        </p>
      ) : null}
    </section>
  );
}
