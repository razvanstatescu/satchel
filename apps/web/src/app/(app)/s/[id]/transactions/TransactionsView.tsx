import { ArrowUpRight, CircleAlert, Hourglass, Info, ShieldX } from "lucide-react";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { ObjCol, ObjMain } from "@/components/SatchelWallet";
import { FeedGroup, utcClock } from "@/components/Timeline";
import { DayLabel } from "@/components/client/ActivityInProgress";
import { OwnerActions, ViewerCard } from "@/components/client/SatchelPage";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { EmptyState, ExternalLink, Icon, Pill, SegmentedLinks, cx } from "@/components/ui";
import { familyOf, TX_FILTERS, type ChainTx, type TxFilter, type TxPage, type TxSourceKey } from "@/lib/chain-txs";
import { copy, NETWORK_LABEL } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import { evmAddressLink, evmNetworkName } from "@/lib/evm-networks";
import { formatAmount, truncateAddress, type Ticker } from "@/lib/format";
import { INSIDE_NETWORK_NAME, type Network } from "@/lib/holdings";

/**
 * The Transactions tab's two grid items: the card and the owner's actions in the column (from 1024), and the list in
 * the main block: the chain filter, the rows in UTC day groups (pending ones first), then what was read and what
 * couldn't be. Each row is one link to that transaction on its explorer.
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
const FEE_TICKER: Record<Network, Ticker> = { bitcoin: "BTC", sepolia: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", solana: "SOL", near: "NEAR" };
const HOME: Partial<Record<Network, string>> = { bitcoin: "BTC", sepolia: "ETH", solana: "SOL" };

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

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
          <span className="font-sans text-caption whitespace-nowrap text-ink-muted t-num">
            {t.timestampMs ? utcClock(t.timestampMs) : x.pending}
          </span>
        </span>
        <Icon icon={ArrowUpRight} size={16} className="-mr-1 flex-none text-ink-muted" />
        <span className="sr-only">{` (${x.opens})`}</span>
      </a>
    </li>
  );
}

export function TransactionsView({ snap, page, filter }: { snap: SatchelSnapshot; page: TxPage; filter: TxFilter }) {
  const id = snap.token_id;
  const x = copy.txs;
  const rows = filter === "all" ? page.txs : page.txs.filter((t) => familyOf(t.network) === filter);
  const pending = rows.filter((t) => t.timestampMs === null);
  const done = rows.filter((t) => t.timestampMs !== null);
  const groups: { day: string; ms: number; rows: ChainTx[] }[] = [];
  for (const t of done) {
    const day = new Date(t.timestampMs!).toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(t);
    else groups.push({ day, ms: t.timestampMs!, rows: [t] });
  }
  const read = page.sources.filter((s) => s.ok).map((s) => SOURCE_NAME[s.key]);
  const unread = page.sources.filter((s) => !s.ok).map((s) => SOURCE_NAME[s.key]);
  const at = utcClock(page.as_of);

  return (
    <>
      <ObjCol lgOnly>
        <ViewerCard snap={snap} />
        <OwnerActions snap={snap} />
      </ObjCol>
      <ObjMain data-transactions="">
        <div className="flex flex-col gap-3">
          <p className="m-0 font-sans text-body text-ink-muted">{x.lead}</p>
          <SegmentedLinks
            label={x.filterLabel}
            size="sm"
            options={TX_FILTERS.map((f) => ({ href: f === "all" ? `/s/${id}/transactions` : `/s/${id}/transactions?filter=${f}`, label: x.filters[f], current: f === filter, replace: true }))}
          />
        </div>
        {unread.length ? (
          <p role="status" className="m-0 flex items-start gap-2.5 rounded-md bg-surface-sunken p-4 font-sans text-body-sm text-ink">
            <Icon icon={CircleAlert} size={16} className="mt-0.5 flex-none" />
            {x.unread(list(unread))}
          </p>
        ) : null}
        {rows.length === 0 ? (
          page.txs.length === 0 ? (
            <EmptyState className="my-4" artSize={72} title={x.empty} body={x.emptyBody} action={<ShareFundLink tokenId={id} variant="button" className="w-auto" />} />
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
          {read.length ? <p className="m-0">{x.readFrom(list(read), at)}</p> : null}
          <p className="m-0">{x.latest}</p>
          {filter === "all" || filter === "ethereum" ? (
            <p className="m-0 flex flex-wrap items-center gap-x-2">
              <Icon icon={Info} size={14} />
              {x.arbitrum}
              <ExternalLink href={evmAddressLink(421614, snap.addresses.evm)} className="min-h-11 font-semibold">
                {x.arbitrumLink}
              </ExternalLink>
            </p>
          ) : null}
        </div>
      </ObjMain>
    </>
  );
}
