import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AddressDisplay } from "@/components/AddressDisplay";
import { FactOwner, FactSignatures, FactStatus } from "@/components/client/SatchelPage";
import { Button, ExternalLink, Icon } from "@/components/ui";
import { CHAIN_NAME, copy, NETWORK_LABEL } from "@/lib/copy";
import { EXPLORERS, SOL_SEND_ENABLED } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { balanceText, UI_CHAINS } from "@/lib/view";

/**
 * The judge's summary (app-screens §1.3, §3.1; kb/90 §8.1): ONE `<dl>` per page, rendered on the server, every value as
 * visible text outside any disclosure, tooltip or hidden node. Owner, status and signatures follow the live snapshot
 * (the server HTML keeps the server's values). The Bitcoin and Ethereum addresses live in the Inside rows; while the
 * Solana UI is off, the Solana address is the last fact here.
 */

export function keysFact(lock: SatchelSnapshot["lock"]): string {
  if (lock.access_keys === null || lock.account_exists === null) return copy.facts.keysUnknown;
  if (lock.locked) return copy.facts.keysNone;
  return copy.facts.keysSome(lock.access_keys);
}

export function codeFact(lock: SatchelSnapshot["lock"]): string {
  if (lock.code_matches === true) return copy.facts.codeMatches;
  if (lock.code_matches === false) return copy.facts.codeMismatch;
  return copy.facts.codeUnchecked;
}

/** A code hash in 8-character groups (the DOM text stays the raw hash). Pure. */
export function hashGroups(hex: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += 8) out.push(hex.slice(i, i + 8));
  return out;
}

/** A hash that wraps only between its 8-character groups. */
export function HashText({ hex, className }: { hex: string; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap gap-x-[.5ch] font-mono text-[0.875rem]/5 font-[450] ${className ?? ""}`}>
      {hashGroups(hex).map((g, i) => (
        <span key={i} className="whitespace-nowrap">
          {g}
        </span>
      ))}
    </span>
  );
}

const LINK = "text-link underline decoration-1 underline-offset-3 hover:decoration-2";

/** A section heading row (proto `.section-h`): an h2 in heading type, 44 tall, and at most one action. */
export function SectionHead({ id, title, action }: { id: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="m-0 font-display text-heading text-ink">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function FactsGrid({ snap }: { snap: SatchelSnapshot }) {
  const f = copy.facts;
  const rows: [key: string, label: string, value: ReactNode][] = [
    ["owner", f.owner, <FactOwner key="o" snap={snap} />],
    ["status", f.status, <FactStatus key="s" snap={snap} />],
    ["signatures", f.signatures, <FactSignatures key="g" snap={snap} />],
    ["token", f.token, f.tokenValue(snap.token_id)],
    [
      "contract",
      f.contract,
      <ExternalLink key="c" href={EXPLORERS.nearAccount(snap.contract)} className="font-mono text-[0.875rem]/5 font-[450]">
        {snap.contract}
      </ExternalLink>,
    ],
    [
      "keys",
      f.contractKeys,
      <Link key="k" href="/contract" className={LINK}>
        {keysFact(snap.lock)}
      </Link>,
    ],
    [
      "code-hash",
      f.codeHash,
      snap.lock.code_hash_hex ? (
        <span key="h">
          <HashText hex={snap.lock.code_hash_hex} /> <span className="text-body-sm text-ink-muted">({codeFact(snap.lock)})</span>
        </span>
      ) : (
        f.keysUnknown
      ),
    ],
  ];
  if (!UI_CHAINS.includes("sol")) {
    const bal = SOL_SEND_ENABLED ? balanceText(snap, "sol") : null;
    rows.push([
      "address-sol",
      NETWORK_LABEL.sol,
      <span key="sol" className="flex flex-col gap-0.5">
        <AddressDisplay address={snap.addresses.sol} fullAttr="sol" size="md" />
        <span className="text-body-sm text-ink-muted">{SOL_SEND_ENABLED ? `${bal ? `${bal} · ` : ""}${f.solNoteSend}` : f.solNote}</span>
      </span>,
    ]);
  }
  return (
    <section aria-labelledby="facts-title">
      <SectionHead id="facts-title" title={f.title} />
      {/* two columns once the list itself is 480 px wide (a container query: the column is narrow at 1024) */}
      <dl className="@container m-0 rounded-md border border-line bg-surface">
        {rows.map(([key, label, value]) => (
          <div key={key} data-fact={key} className="relative grid gap-0.5 px-4 py-3 @min-[30rem]:grid-cols-[150px_minmax(0,1fr)] @min-[30rem]:gap-x-4">
            <span aria-hidden="true" className="absolute inset-x-4 top-0 hidden h-px bg-line in-[[data-fact]+[data-fact]]:block" />
            <dt className="font-sans text-body-sm text-ink-muted">{label}</dt>
            <dd className="m-0 min-w-0 font-sans text-[0.9375rem]/[1.375rem] text-ink t-num wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Verify these addresses (closed): the contract, its keys and code, each derivation path, the custody line. */
export function VerifyDisclosure({ snap }: { snap: SatchelSnapshot }) {
  const v = copy.verify;
  return (
    <details className="group/verify rounded-md border border-line bg-surface">
      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 font-sans text-[0.9375rem]/5 font-semibold text-ink focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        {v.title}
        <Icon icon={ChevronDown} size={20} className="text-ink-muted transition-transform duration-150 ease-out group-open/verify:rotate-180" />
      </summary>
      <div className="flex flex-col gap-2.5 px-4 pb-4 font-sans text-body-sm text-ink">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <li>
            {copy.facts.contract} <span className="font-mono text-[0.8125rem]/[1.125rem] break-all">{snap.contract}</span>
          </li>
          <li>{snap.lock.locked ? v.keys : `${copy.facts.contractKeys}: ${keysFact(snap.lock)}`}</li>
          <li>{snap.lock.code_matches ? v.code : `${copy.facts.codeHash}: ${codeFact(snap.lock)}`}</li>
          {UI_CHAINS.map((c) => (
            <li key={c}>
              <span className="font-mono text-[0.8125rem]/[1.125rem]">{v.path(snap.token_id, c)}</span> {v.derives(CHAIN_NAME[c])}
            </li>
          ))}
          <li>{v.guarantee}</li>
        </ul>
        <Button variant="link" href="/contract" className="self-start">
          {v.yourself}
        </Button>
      </div>
    </details>
  );
}

/** How it works (visitors only, under Verify): three numbered steps; three columns when the list is 600 px wide. */
export function HowItWorks({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby="how-title" id="how-it-works">
      <div className="mb-3 flex min-h-11 items-center">
        <H id="how-title" className="m-0 font-display text-heading text-ink">
          {copy.home.howTitle}
        </H>
      </div>
      {/* three columns only when the list has room for them (a container query: at 1280 the main column is ~500 px, where
          stacked rows read better than three narrow, ragged columns); every part is top-aligned */}
      <div className="@container">
      <ol className="m-0 grid list-none items-start gap-3 p-0 @min-[37.5rem]:grid-cols-3 @min-[37.5rem]:gap-6">
        {copy.how.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[40px_minmax(0,1fr)] content-start items-start gap-x-3.5 @min-[37.5rem]:grid-cols-1 @min-[37.5rem]:gap-y-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-surface-sunken font-display text-[1.125rem] leading-none font-extrabold text-ink">
              {i + 1}
            </span>
            <div className="flex flex-col">
              <h3 className="m-0 mt-0.5 font-sans text-[0.9375rem]/5 font-semibold text-ink">{s.title}</h3>
              <p className="m-0 font-sans text-[0.9375rem]/[1.375rem] text-ink-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}
