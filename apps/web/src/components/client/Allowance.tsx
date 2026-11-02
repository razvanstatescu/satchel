"use client";

import { useState } from "react";
import { Info, LoaderCircle, TriangleAlert, Undo2 } from "lucide-react";
import { SectionHead } from "@/components/Facts";
import { utcShort } from "@/components/Timeline";
import { useViewer } from "@/components/client/SatchelPage";
import { toast } from "@/components/client/Toaster";
import { Button, HelpLink, Icon, Morph, cx } from "@/components/ui";
import { assetTicker, formatCapAmount } from "@/lib/allowanceView";
import { copy, errorCopy } from "@/lib/copy";
import { refreshSnapshot, useLiveSnapshot } from "@/lib/data/client";
import type { SatchelSnapshot } from "@/lib/data/types";
import { calls } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";

/**
 * C5 (docs/specs/C5.md): the public facts list, the owner's management panel (list + Revoke + Add) and the banner a
 * connected account sees when it holds access on a Satchel it doesn't own. All three are CLIENT components reading
 * `useLiveSnapshot` (the same pattern as FactOwner/FactStatus in SatchelPage.tsx): the first render uses the
 * server's `snap` prop (so the judge's no-JS HTML is correct and complete), and once hydrated they follow the live
 * snapshot, which in fixture mode re-reads the in-browser simulation — the only way a client-side set/revoke_allowance
 * is ever visible again, since the sim's sessionStorage never reaches the server (kb/90 §8.1 pattern).
 */

type Note = { who: string; kind: "cancelled" | "error"; text: string } | null;

const MAX_DELEGATES = 4;

/** A public fact (judge-visible, never gated on the viewer): who else can spend from this Satchel, and under what caps. */
export function AllowanceFacts({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const rows = live.allowances;
  return (
    <section aria-labelledby="allowance-title" data-testid="allowance-facts">
      <SectionHead id="allowance-title" title={copy.allowance.sectionTitle} />
      {rows.length === 0 ? (
        <p className="m-0 font-sans text-body-sm text-ink-muted" data-testid="allowance-empty">
          {copy.allowance.none}
        </p>
      ) : (
        <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">
          {rows.map((r) => (
            <li
              key={r.delegate}
              data-allowance={r.delegate}
              data-allowance-status={r.status}
              className="relative flex flex-col gap-1.5 px-4 py-3.5 [li+&]:before:absolute [li+&]:before:inset-x-4 [li+&]:before:top-0 [li+&]:before:h-px [li+&]:before:bg-line"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 font-mono text-[0.9375rem]/5 font-[450] wrap-anywhere">{r.delegate}</span>
                <span className="font-sans text-body-sm text-ink-muted">{copy.allowance.statusWord[r.status]}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-sans text-body-sm text-ink-muted">
                {r.caps.map((c, i) => (
                  <li key={i}>{copy.allowance.capRow(assetTicker(c.asset) ?? "", formatCapAmount(c.asset, c.remaining), formatCapAmount(c.asset, c.limit))}</li>
                ))}
              </ul>
              <span className="font-sans text-body-sm text-ink-muted">{r.expires_at_ms ? copy.allowance.expires(utcShort(r.expires_at_ms)) : copy.allowance.noExpiry}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
      <p className="m-0 font-sans text-body-sm text-ink-muted">
        {copy.allowance.manage.trustNote}
        <HelpLink anchor="q-allow-history" label={copy.questions["q-allow-history"].q} className="ml-1 align-middle" />
      </p>
    </section>
  );
}

/** A connected account that holds access here, but doesn't own it (app-screens: beside the card, above everything else). */
export function DelegateBanner({ snap }: { snap: SatchelSnapshot }) {
  const { isOwner, isDelegate, myAllowance } = useViewer(snap);
  if (isOwner || !isDelegate || !myAllowance) return null;
  // Every cap this access grants, not just the three native chains: a Base/Arbitrum/OP ETH or any USDC cap (C2 + C3) shows here too.
  return (
    <section aria-labelledby="allowance-banner-title" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5" data-testid="delegate-banner">
      <h2 id="allowance-banner-title" className="m-0 font-display text-heading text-ink">
        {copy.allowance.banner.title}
      </h2>
      <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.banner.lede(myAllowance.owner_id)}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 font-sans text-body-sm text-ink">
        {myAllowance.caps.map((cap, i) => (
          <li key={i}>{copy.allowance.send.remaining(formatCapAmount(cap.asset, cap.remaining))}</li>
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
