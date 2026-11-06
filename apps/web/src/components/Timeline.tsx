import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  Handshake,
  MessageSquareText,
  Signature,
  Sparkles,
  Tag,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { AddressDisplay } from "@/components/AddressDisplay";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { DayLabel, RowTime } from "@/components/client/ActivityInProgress";
import { ExternalLink, Icon, ItemPill, KeepWhole, SatchelThumb, cx } from "@/components/ui";
import { CHAIN_NAME, copy, EXPLORER_NAME, NETWORK_LABEL, TICKER } from "@/lib/copy";
import { EXPLORERS } from "@/lib/config";
import type { ActivityRow } from "@/lib/data/types";
import { formatAmount, formatSats, truncateAddress, type Ticker } from "@/lib/format";
import { evmExplorerName, evmNetworkName, evmTxLink, SEPOLIA } from "@/lib/evm-networks";
import { safeMessage } from "@/lib/message";
import { chainTxUrl, priceText } from "@/lib/view";

/** C2: the ticker a row moved (USDC, or the chain's native coin). */
const rowTicker = (r: ActivityRow): Ticker => (r.token === "USDC" ? "USDC" : TICKER[r.chain ?? "evm"]);
/** C3: the row's network ("Base Sepolia"), or the chain's default network label. */
const rowNetwork = (r: ActivityRow): string => (r.chain === "evm" && r.evmChainId && r.evmChainId !== SEPOLIA ? evmNetworkName(r.evmChainId) : r.chain ? NETWORK_LABEL[r.chain] : NETWORK_LABEL.near);
const rowTxUrl = (r: ActivityRow, id: string) => (r.chain === "evm" && r.evmChainId ? evmTxLink(r.evmChainId, id) : chainTxUrl(r.chain!, id));
const rowExplorer = (r: ActivityRow) => (r.chain === "evm" && r.evmChainId ? evmExplorerName(r.evmChainId) : EXPLORER_NAME[r.chain!]);

/**
 * The Activity record (app-screens §4; proto app-activity.html): every NEAR event and every signature, newest first,
 * in UTC day groups. Each row is a `<details>` with a visible chevron that turns when it opens; the row shows the time
 * (relative in the browser for the last day), the expanded receipt the full UTC stamp. Server-rendered: the first page
 * is in the server HTML and works without JS (Show older is a link).
 */

/* ── Pure helpers (unit: test/unit/satchel-object.test.ts) ──────────────────────────────────────────────────────── */

import { utcClock, utcDay, utcLong, utcShort } from "@/lib/utc-time";
export { utcClock, utcDay, utcLong, utcShort };

/** "274,240,000". */
export function groupDigits(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** The UTC day key of a row ("2026-10-20"), or "unknown" when the event has no timestamp. */
export function dayKey(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "unknown";
}

/** Rows grouped by UTC day, in the order they come (newest first). Pure. */
export function dayGroups<T extends { timestampMs: number | null }>(rows: readonly T[]): { day: string; rows: T[] }[] {
  const out: { day: string; rows: T[] }[] = [];
  for (const r of rows) {
    const k = dayKey(r.timestampMs);
    const last = out[out.length - 1];
    if (last && last.day === k) last.rows.push(r);
    else out.push({ day: k, rows: [r] });
  }
  return out;
}

/** Activity rows per page (Show older). */
export const ACTIVITY_PAGE = 25;

/**
 * One page of rows, newest first: those below the `before` block (all when null), `size` of them, never splitting a
 * block across two pages. `next` is the cursor for Show older (null when nothing is older). Pure.
 */
export function pageRows<T extends { block: number }>(rows: readonly T[], before: number | null, size = ACTIVITY_PAGE): { rows: T[]; next: number | null } {
  const pool = [...rows].sort((a, b) => b.block - a.block).filter((r) => before === null || r.block < before);
  if (pool.length <= size) return { rows: pool, next: null };
  let end = size;
  while (end < pool.length && pool[end].block === pool[end - 1].block) end++;
  return { rows: pool.slice(0, end), next: end < pool.length ? pool[end - 1].block : null };
}

/* ── Rows ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Tone = "success" | "danger" | "frozen" | "ink";
const TONE: Record<Tone, string> = { success: "text-success", danger: "text-danger", frozen: "text-frozen", ink: "text-ink" };

function badge(r: ActivityRow): { icon: LucideIcon; tone: Tone } {
  switch (r.kind) {
    case "sent":
      return { icon: ArrowUpRight, tone: "success" };
    case "received":
      return { icon: ArrowDownLeft, tone: "success" };
    case "issued":
      return r.status === "unused" ? { icon: TriangleAlert, tone: "danger" } : { icon: Signature, tone: "ink" };
    case "message":
      return { icon: MessageSquareText, tone: "ink" };
    case "signed_not_sent":
      return { icon: TriangleAlert, tone: "danger" };
    case "transferred":
      return { icon: ArrowLeftRight, tone: "ink" };
    case "minted":
      return { icon: Sparkles, tone: "ink" };
    case "listed":
      return { icon: Tag, tone: "frozen" };
    case "delisted":
      return { icon: Undo2, tone: "ink" };
    case "sold":
    case "bought":
      return { icon: Handshake, tone: "ink" };
  }
}

const price = (r: ActivityRow) => (r.price && r.currency ? priceText(r.price, r.currency) : "");

function title(r: ActivityRow): string {
  const to = r.to ? truncateAddress(r.to) : "";
  switch (r.kind) {
    case "sent":
      return r.token === "USDC" ? copy.record.sentUsdc(to) : copy.act.row.sent(to);
    case "message":
      return copy.record.signedMessage(CHAIN_NAME[r.chain ?? "evm"]);
    case "received":
      return copy.act.row.received(r.from ?? "");
    case "issued":
      return copy.act.row.issued(r.chain ? CHAIN_NAME[r.chain] : "");
    case "signed_not_sent":
      return copy.act.row.notSent;
    case "transferred":
      return copy.act.row.transferred(r.to ?? "");
    case "minted":
      return copy.act.row.minted(r.from ?? "");
    case "listed":
      return copy.act.row.listed(price(r));
    case "delisted":
      return copy.act.row.delisted;
    case "sold":
    case "bought":
      return copy.act.row.sold(r.to ?? "", price(r));
  }
}

/** The amount a row moved, signed (−0.0001 BTC out), or null. A signature moves nothing: its receipt says what it would. */
function amountOf(r: ActivityRow): string | null {
  if (!r.amount || !r.chain || (r.kind !== "sent" && r.kind !== "received")) return null;
  return formatAmount(r.amount, rowTicker(r), { sign: r.kind === "sent" ? "out" : r.kind === "received" ? "in" : undefined });
}

function Lead({ r }: { r: ActivityRow }) {
  const b = badge(r);
  return (
    <span className="relative grid size-9 flex-none place-items-center">
      {r.chain ? <ChainCharm chain={r.chain} size={32} /> : <SatchelThumb width={36} />}
      <span className={cx("absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-[1.5px] border-line bg-surface", TONE[b.tone])}>
        <Icon icon={b.icon} size={12} />
      </span>
    </span>
  );
}

/** A two-column receipt (one column below 480, so accounts and hashes never break mid-word). */
export function DetailList({ rows }: { rows: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 grid grid-cols-1 font-sans text-body-sm text-ink sm:grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-1.5">
      {rows.map((d, i) => (
        <div key={d.label} className="contents">
          <dt className={cx("text-ink-muted max-sm:text-[0.8125rem]/[1.125rem]", i > 0 && "max-sm:mt-2.5")}>{d.label}</dt>
          <dd className="m-0 min-w-0 t-num">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const linkCls = "min-h-11 font-semibold";

function details(r: ActivityRow, owner?: string): { label: string; value: ReactNode }[] {
  const d = copy.act.detail;
  const out: { label: string; value: ReactNode }[] = [{ label: d.date, value: r.timestampMs ? utcLong(r.timestampMs) : copy.act.block(groupDigits(r.block)) }];
  // C5: a delegate's requester names them (never shown for the owner's own signatures).
  if ((r.kind === "issued" || r.kind === "sent") && r.requester && r.requester !== owner) {
    out.push({ label: d.requestedBy, value: <span className="font-mono text-[0.8125rem]/5 break-all">{r.requester}</span> });
  }
  if (r.kind === "issued" && r.chain && r.amount && r.to) {
    out.push({ label: d.wouldSend, value: d.wouldSendValue(formatAmount(r.amount, rowTicker(r)), truncateAddress(r.to)) });
  }
  // C7: the exact text that was signed, hidden and direction-changing characters shown as codes (SR-04)
  if (r.kind === "message") {
    const s = r.messageText !== undefined ? safeMessage(r.messageText) : null;
    out.push({
      label: copy.record.messageDetail,
      value: <span data-message-text="" className="block wrap-anywhere whitespace-pre-wrap">{s ? s.text : "—"}</span>,
    });
    // L-02: the exact bytes beside the escaped text
    if (s) out.push({ label: copy.msg.hex, value: <code data-message-hex="" className="block font-mono text-[0.75rem]/4 break-all text-ink-muted">{s.hex}</code> });
    out.push({ label: d.status, value: <span className="inline-flex items-center gap-2"><ItemPill status="message" />{copy.record.messageNote}</span> });
  }
  if (r.token === "USDC") out.push({ label: copy.record.token, value: "USDC" });
  if (r.chain === "evm" && r.evmChainId && r.kind !== "message") out.push({ label: copy.record.network, value: evmNetworkName(r.evmChainId) });
  if (r.kind === "issued" && r.status === "unused") out.push({ label: d.status, value: d.unusedNote });
  if (r.kind === "sent" && r.status === "final") out.push({ label: d.status, value: <span className="text-success">{d.confirmed}</span> });
  if (r.fee && r.chain) out.push({ label: d.fee, value: <span className="t-num">{r.chain === "btc" ? formatSats(r.fee) : formatAmount(r.fee, TICKER[r.chain])}</span> });
  if ((r.kind === "listed" || r.kind === "sold") && r.price) out.push({ label: d.price, value: <span className="t-num">{price(r)}</span> });
  if (r.kind === "transferred" && r.from) out.push({ label: d.from, value: <span className="font-mono text-[0.8125rem]/5 break-all">{r.from}</span> });
  if (r.to && (r.kind === "sent" || r.kind === "received")) out.push({ label: d.to, value: <AddressDisplay address={r.to} /> });
  else if (r.to && r.kind !== "issued") out.push({ label: d.to, value: <span className="font-mono text-[0.8125rem]/5 break-all">{r.to}</span> });
  out.push({
    label: d.links,
    value: (
      <span className="-my-2.5 flex flex-col items-start sm:flex-row sm:flex-wrap sm:gap-x-4">
        <ExternalLink href={EXPLORERS.nearTx(r.tx)} className={linkCls}>
          {d.viewOn(EXPLORER_NAME.near)}
        </ExternalLink>
        {r.chainTxId && r.chain ? (
          <ExternalLink href={rowTxUrl(r, r.chainTxId)} className={linkCls}>
            {d.viewOn(rowExplorer(r))}
          </ExternalLink>
        ) : null}
      </span>
    ),
  });
  return out;
}

export function ActivityItem({ r, owner }: { r: ActivityRow; owner?: string }) {
  const amount = amountOf(r);
  const pill = r.status === "unused" ? <ItemPill status="unused" /> : null;
  const network = rowNetwork(r);
  return (
    <li data-activity={r.kind}>
      {/* an unused signature opens by default: what it could still do is the point of the record */}
      <details className="group/row" open={r.status === "unused" || undefined}>
        <summary
          className={cx(
            "relative flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-md py-3 pr-3 pl-4 hover:bg-surface-sunken focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden",
            "in-[li+li]:before:absolute in-[li+li]:before:inset-x-4 in-[li+li]:before:top-0 in-[li+li]:before:h-px in-[li+li]:before:bg-line",
          )}
        >
          <Lead r={r} />
          <span className="flex min-w-0 flex-1 flex-col">
            {/* two lines at most, never cut mid-address ("Sent to tb1qaanv…y8sd" is already short; a phone must not
                clip its end, the part you recognise) */}
            <span className="line-clamp-2 font-sans text-[0.9375rem]/5 font-semibold wrap-break-word text-ink">
              <KeepWhole text={title(r)} />
            </span>
            <span className="font-sans text-body-sm text-ink-muted">
              {network} · {r.timestampMs ? <RowTime ms={r.timestampMs} /> : copy.act.block(groupDigits(r.block))}
            </span>
          </span>
          {amount || pill ? (
            <span className="flex flex-none flex-col items-end gap-0.5">
              {amount ? <span className="font-sans text-[0.9375rem]/5 font-bold whitespace-nowrap text-ink t-num">{amount}</span> : null}
              {pill}
            </span>
          ) : null}
          <Icon icon={ChevronDown} size={20} className="text-ink-muted transition-transform duration-150 ease-out group-open/row:rotate-180" />
        </summary>
        <div className="px-4 pb-4 sm:pl-16">
          <DetailList rows={details(r, owner)} />
        </div>
      </details>
    </li>
  );
}

/** A labelled group of rows (a day, or the client's In progress group): an h2 in muted 14/20, then a flat panel. */
export function FeedGroup({ id, heading, children }: { id: string; heading: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="m-0 font-sans text-body-sm font-semibold text-ink-muted">
        {heading}
      </h2>
      <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">{children}</ul>
    </section>
  );
}

/** The record: day groups, newest first. */
export function Timeline({ rows, owner }: { rows: readonly ActivityRow[]; owner?: string }) {
  return (
    <div className="flex flex-col gap-8" data-timeline>
      {dayGroups(rows).map((g) => (
        <FeedGroup key={g.day} id={`day-${g.day}`} heading={g.day === "unknown" ? copy.act.earlier : <DayLabel ms={g.rows[0].timestampMs!} />}>
          {g.rows.map((r, i) => (
            <ActivityItem key={`${r.tx}-${r.kind}-${i}`} r={r} owner={owner} />
          ))}
        </FeedGroup>
      ))}
    </div>
  );
}
