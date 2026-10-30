"use client";

import { ArrowUpRight, CircleAlert, Hourglass, Info, LoaderCircle, RefreshCw, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { FeedGroup, utcClock } from "@/components/Timeline";
import { DayLabel } from "@/components/client/ActivityInProgress";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { Button, EmptyState, ExternalLink, Icon, Pill, Segmented, cx } from "@/components/ui";
import { familyOf, mergeTxs, TX_FILTERS, type ChainTx, type TxFilter, type TxSourceKey } from "@/lib/chain-txs";
import { copy, NETWORK_LABEL } from "@/lib/copy";
import { evmAddressLink, evmNetworkName } from "@/lib/evm-networks";
import { formatAmount, truncateAddress, type Ticker } from "@/lib/format";
import { INSIDE_NETWORK_NAME, type Network } from "@/lib/holdings";

/**
 * The Transactions tab's list (lib/chain-txs.ts). The page renders at once; this asks every source in parallel
 * (/api/satchels/[id]/txs?source=, cached 30 s on the server) and merges each one's rows into the timeline the moment
 * it lands, so the fastest chain shows first and a slow one never holds the others. Loading rows until the first
 * source answers; then a "Still reading…" line for the rest; a failed source says so, with Retry. The filter is
 * instant (client state, mirrored to `?filter=` for sharing).
 */

const NETWORK_NAME: Record<Network, string> = {
  bitcoin: NETWORK_LABEL.btc,
  sepolia: evmNetworkName(11155111),
  base: evmNetworkName(84532),
  arbitrum: evmNetworkName(421614),
  optimism: evmNetworkName(11155420),
  solana: NETWORK_LABEL.sol,
  near: INSIDE_NETWORK_NAME,
};
const SOURCE_NAME: Record<TxSourceKey, string> = {
  bitcoin: NETWORK_LABEL.btc,
  sepolia: evmNetworkName(11155111),
  base: evmNetworkName(84532),
  optimism: evmNetworkName(11155420),
  solana: NETWORK_LABEL.sol,
  near: NETWORK_LABEL.near,
};
const SOURCE_FAMILY: Record<TxSourceKey, TxFilter> = { bitcoin: "bitcoin", sepolia: "ethereum", base: "ethereum", optimism: "ethereum", solana: "solana", near: "inside" };
const FEE_TICKER: Record<Network, Ticker> = { bitcoin: "BTC", sepolia: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", solana: "SOL", near: "NEAR" };
const HOME: Partial<Record<Network, string>> = { bitcoin: "BTC", sepolia: "ETH", solana: "SOL" };

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

type SourceState = { status: "loading" | "ok" | "error"; txs: ChainTx[]; as_of?: number };

function TxRow({ t }: { t: ChainTx }) {
  const x = copy.txs;
  const badge = HOME[t.network] === t.coin ? null : t.network;
  const sign = t.direction === "in" ? "+" : t.direction === "out" ? "−" : "";
  const who = t.counterparty ? (t.direction === "in" ? x.from(truncateAddress(t.counterparty)) : x.to(truncateAddress(t.counterparty))) : null;
  return (
    <li className="relative">
      <span aria-hidden="true" className="absolute inset-x-4 top-0 hidden h-px bg-line in-[li+li]:block" />
      <a
        href={t.url}
        target="_blank"
        rel="noreferrer"
        data-tx={t.id}
        data-direction={t.direction}
        data-status={t.status}
        className="group/tx flex min-h-16 items-center gap-3 rounded-[inherit] px-4 py-3 text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken focus-visible:-outline-offset-2"
      >
        <CoinIcon coin={t.coin} badge={badge} size={36} className="flex-none" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-sans text-label text-ink">{t.direction === "in" ? x.in : t.direction === "out" ? x.out : x.self}</span>
            {t.status === "pending" ? (
              <Pill tone="frozen" icon={Hourglass} size="sm">
                {x.pending}
              </Pill>
            ) : t.status === "failed" ? (
              <Pill tone="danger" icon={ShieldX} size="sm">
                {x.failed}
              </Pill>
            ) : null}
          </span>
          {who ? (
            <span className="truncate font-mono text-[0.8125rem] leading-5 text-ink-muted" title={t.counterparty ?? undefined}>
              {who}
            </span>
          ) : null}
          <span className="font-sans text-caption text-ink-muted">
            {NETWORK_NAME[t.network]}
            {t.fee && t.fee !== "0" ? ` · ${x.fee(formatAmount(t.fee, FEE_TICKER[t.network]))}` : null}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-0.5 text-right">
          <span className={cx("font-sans text-[1rem]/[1.375rem] font-bold whitespace-nowrap t-num", t.direction === "in" ? "text-success" : "text-ink", t.status === "failed" && "text-ink-muted line-through")}>
            {sign}
            {formatAmount(t.amount, t.coin)}
          </span>
          <span className="font-sans text-caption whitespace-nowrap text-ink-muted t-num">{t.timestampMs ? utcClock(t.timestampMs) : x.pending}</span>
        </span>
        <Icon icon={ArrowUpRight} size={16} className="-mr-1 flex-none text-ink-muted" />
        <span className="sr-only">{` (${x.opens})`}</span>
      </a>
    </li>
  );
}

/** Placeholder rows while nothing has landed yet (the skeleton token; static under reduced motion). */
function LoadingRows() {
  return (
    <ul aria-hidden="true" data-tx-skeleton="" className="m-0 list-none rounded-md border border-line bg-surface p-0">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="relative flex min-h-16 items-center gap-3 px-4 py-3">
          {i > 0 ? <span className="absolute inset-x-4 top-0 h-px bg-line" /> : null}
          <span className="size-9 flex-none rounded-full bg-skeleton motion-safe:animate-pulse" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-24 rounded-pill bg-skeleton motion-safe:animate-pulse" />
            <span className="h-3 w-40 max-w-full rounded-pill bg-skeleton motion-safe:animate-pulse" />
          </span>
          <span className="h-3.5 w-20 rounded-pill bg-skeleton motion-safe:animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

export function TxList({ tokenId, sources, initialFilter, evmAddress }: { tokenId: string; sources: readonly TxSourceKey[]; initialFilter: TxFilter; evmAddress: string }) {
  const x = copy.txs;
  const [state, setState] = useState<Record<string, SourceState>>(() => Object.fromEntries(sources.map((k) => [k, { status: "loading", txs: [] }])));
  const [filter, setFilter] = useState<TxFilter>(initialFilter);

  const read = useCallback(
    (key: TxSourceKey) => {
      fetch(`/api/satchels/${tokenId}/txs?source=${key}`)
        .then((r) => r.json() as Promise<{ ok?: boolean; txs?: ChainTx[]; as_of?: number }>)
        .then((j) => setState((s) => ({ ...s, [key]: j.ok ? { status: "ok", txs: j.txs ?? [], as_of: j.as_of } : { status: "error", txs: [] } })))
        .catch(() => setState((s) => ({ ...s, [key]: { status: "error", txs: [] } })));
    },
    [tokenId],
  );

  // every source at once, on mount (each lands on its own)
  useEffect(() => {
    for (const k of sources) read(k);
  }, [read, sources]);

  const retry = (keys: TxSourceKey[]) => {
    setState((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, { status: "loading", txs: [] }])) }));
    for (const k of keys) read(k);
  };

  const pick = (f: TxFilter) => {
    setFilter(f);
    const url = f === "all" ? `/s/${tokenId}/transactions` : `/s/${tokenId}/transactions?filter=${f}`;
    window.history.replaceState(window.history.state, "", url);
  };

  const inView = (k: TxSourceKey) => filter === "all" || SOURCE_FAMILY[k] === filter;
  const keys = sources.filter(inView);
  const loading = keys.filter((k) => state[k]?.status === "loading");
  const failed = keys.filter((k) => state[k]?.status === "error");
  const done = keys.filter((k) => state[k]?.status === "ok");
  const rows = useMemo(() => mergeTxs(sources.map((k) => state[k]?.txs ?? [])).filter((t) => filter === "all" || familyOf(t.network) === filter), [state, sources, filter]);
  const pending = rows.filter((t) => t.timestampMs === null);
  const groups: { day: string; ms: number; rows: ChainTx[] }[] = [];
  for (const t of rows) {
    if (t.timestampMs === null) continue;
    const day = new Date(t.timestampMs).toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(t);
    else groups.push({ day, ms: t.timestampMs, rows: [t] });
  }
  const asOf = Math.max(0, ...done.map((k) => state[k]?.as_of ?? 0));

  return (
    <div className="flex flex-col gap-6" data-tx-list="" data-tx-loading={loading.length ? "" : undefined}>
      <Segmented label={x.filterLabel} size="sm" value={filter} onChange={pick} optionAttr="tx-filter" options={TX_FILTERS.map((f) => ({ value: f, label: x.filters[f] }))} className="self-start" />

      <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        {loading.length && rows.length ? (
          <p className="m-0 flex items-center gap-2 font-sans text-body-sm text-ink-muted" data-tx-reading="">
            <Icon icon={LoaderCircle} size={16} spin />
            {x.reading(list(loading.map((k) => SOURCE_NAME[k])))}
          </p>
        ) : null}
        {failed.length ? (
          <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-surface-sunken p-4 font-sans text-body-sm text-ink" data-tx-failed="">
            <span className="flex min-w-0 flex-1 items-start gap-2.5">
              <Icon icon={CircleAlert} size={16} className="mt-0.5 flex-none" />
              {x.unread(list(failed.map((k) => SOURCE_NAME[k])))}
            </span>
            <Button size="md" icon={RefreshCw} onClick={() => retry(failed)}>
              {x.retry}
            </Button>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        loading.length ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 flex items-center gap-2 font-sans text-body-sm text-ink-muted">
              <Icon icon={LoaderCircle} size={16} spin />
              {x.reading(list(loading.map((k) => SOURCE_NAME[k])))}
            </p>
            <LoadingRows />
          </div>
        ) : failed.length === keys.length ? null : filter === "all" ? (
          <EmptyState className="my-4" artSize={72} title={x.empty} body={x.emptyBody} action={<ShareFundLink tokenId={tokenId} variant="button" className="w-auto" />} />
        ) : (
          <p className="m-0 font-sans text-body text-ink-muted">{x.emptyFilter}</p>
        )
      ) : (
        <div className="flex flex-col gap-8" aria-label={x.listLabel} role="region">
          {pending.length ? (
            <FeedGroup id="tx-pending" heading={x.pending}>
              {pending.map((t) => (
                <TxRow key={t.id} t={t} />
              ))}
            </FeedGroup>
          ) : null}
          {groups.map((g) => (
            <FeedGroup key={g.day} id={`tx-day-${g.day}`} heading={<DayLabel ms={g.ms} />}>
              {g.rows.map((t) => (
                <TxRow key={t.id} t={t} />
              ))}
            </FeedGroup>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 font-sans text-body-sm text-ink-muted" data-tx-sources="">
        {done.length ? <p className="m-0">{x.readFrom(list(done.map((k) => SOURCE_NAME[k])), asOf ? utcClock(asOf) : "")}</p> : null}
        <p className="m-0">{x.latest}</p>
        {filter === "all" || filter === "ethereum" ? (
          <p className="m-0 flex flex-wrap items-center gap-x-2">
            <Icon icon={Info} size={14} />
            {x.arbitrum}
            <ExternalLink href={evmAddressLink(421614, evmAddress)} className="min-h-11 font-semibold">
              {x.arbitrumLink}
            </ExternalLink>
          </p>
        ) : null}
      </div>
    </div>
  );
}
