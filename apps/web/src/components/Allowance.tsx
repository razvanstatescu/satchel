import { SectionHead } from "@/components/Facts";
import { utcShort } from "@/components/Timeline";
import { assetTicker, formatCapAmount } from "@/lib/allowanceView";
import { copy } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";

/**
 * C5 (docs/specs/C5.md §1.2): the public, server-rendered fact that someone other than the owner can (or can't)
 * spend from this Satchel, and under what caps — a judge fact (kb/90 §7, §8.1): no JS, no gating on the viewer.
 * The owner's Add/Revoke controls live beside it in AllowanceManage.tsx (client, owner-only).
 */
export function AllowanceFacts({ snap }: { snap: SatchelSnapshot }) {
  const rows = snap.allowances;
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
