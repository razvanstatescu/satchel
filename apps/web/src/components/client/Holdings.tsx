"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { AddressDisplay } from "@/components/AddressDisplay";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { CopyButton } from "@/components/client/CopyButton";
import { FlowShell } from "@/components/client/FlowShell";
import { InsideFtActions, InsideFtAmount, InsideNearActions, InsideNearAmount } from "@/components/client/Market";
import { useViewer } from "@/components/client/SatchelPage";
import { Button, ExternalLink, Icon, cx } from "@/components/ui";
import { CHAIN_NAME, copy, EXPLORER_NAME } from "@/lib/copy";
import { SOL_SEND_ENABLED } from "@/lib/config";
import { useLiveSnapshot } from "@/lib/data/client";
import type { SatchelSnapshot } from "@/lib/data/types";
import { evmAddressLink, evmExplorerName } from "@/lib/evm-networks";
import { formatAmount } from "@/lib/format";
import { findHolding, hasCoins, holdings, splitHoldings, type Holding } from "@/lib/holdings";
import { overview } from "@/lib/overview";
import { explorerFor } from "@/lib/view";
import { OverviewPanel } from "@/components/Overview";

/**
 * The Wallet tab's one holdings list (Mobbin: Uniswap, Base and Trust Wallet's token rows): every coin a Satchel holds,
 * wherever it is, in one row shape — the coin with its network sticker, the coin's name over where it sits ("Base
 * Sepolia", "Inside on NEAR testnet"), the amount on the right. A row opens that coin's sheet (`/s/[id]/coin/[key]`),
 * where its actions and inputs live; the page itself has no inline inputs. Held coins come first, then the three home
 * coins at zero; the other empty places fold away. Every amount is in the server HTML (a closed `<details>` keeps its
 * content) and follows the shared snapshot poll.
 */

export const coinHref = (tokenId: string, key: string) => `/s/${tokenId}/coin/${key}`;

/** Add coins for a chain holding: the right chain, network and coin preselected. */
export function receiveHref(tokenId: string, h: Holding) {
  const base = `/s/${tokenId}/receive`;
  if (h.chain === "evm") return `${base}?chain=evm&network=${h.chainId}&asset=${h.coin === "USDC" ? "usdc" : "eth"}`;
  return `${base}?chain=${h.chain}`;
}

export function sendHref(tokenId: string, h: Holding) {
  const base = `/s/${tokenId}/send`;
  if (h.chain === "evm") return `${base}?chain=evm&network=${h.chainId}&asset=${h.coin === "USDC" ? "usdc" : "eth"}`;
  return `${base}?chain=${h.chain}`;
}

/** The test and scraping hooks of an amount: the home coins keep `data-balance`, the EVM rows `data-evm-balance` +
 * `data-asset` (C3's, in that order), the inside rows `data-inside`. */
function amountAttrs(h: Holding): Record<string, string> {
  if (h.place === "inside") return { "data-inside": h.coin.toLowerCase() };
  if (h.core && h.chain) return { "data-balance": h.chain };
  return { "data-evm-balance": String(h.chainId), "data-asset": h.coin === "USDC" ? "usdc" : "eth" };
}

function amountText(h: Holding): string {
  if (h.amount === null) return copy.wallet.unavailable;
  return h.amount === 0n ? copy.wallet.zero(h.ticker) : formatAmount(h.amount, h.ticker);
}

/** "0.00189718 BTC"; "0 BTC" and "Balance unavailable" muted; unconfirmed BTC under it. */
function HoldingAmount({ live, h, className }: { live: SatchelSnapshot; h: Holding; className?: string }) {
  const incoming = h.key === "btc" && live.balances.btc ? BigInt(live.balances.btc.unconfirmed_sats) : 0n;
  const muted = !hasCoins(h);
  return (
    <span
      {...amountAttrs(h)}
      data-zero={muted ? "" : undefined}
      className={cx("m-0 flex-none whitespace-nowrap t-num", muted ? "text-ink-muted" : "text-ink", className ?? "text-right font-sans text-[1rem]/[1.375rem] font-bold")}
    >
      {amountText(h)}
      {incoming > 0n ? <small className="block font-sans text-caption font-normal whitespace-normal text-ink-muted">{copy.wallet.incoming(formatAmount(incoming, "BTC"))}</small> : null}
    </span>
  );
}

function HoldingRow({ tokenId, live, h }: { tokenId: string; live: SatchelSnapshot; h: Holding }) {
  return (
    <li data-holding={h.key} className="relative">
      <span aria-hidden="true" className="absolute inset-x-4 top-0 hidden h-px bg-line in-[li+li]:block" />
      <Link
        href={coinHref(tokenId, h.key)}
        className="group/row flex min-h-16 items-center gap-3 rounded-[inherit] px-4 py-3 text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken focus-visible:-outline-offset-2"
      >
        <CoinIcon coin={h.coin} badge={h.badge} size={36} className="flex-none" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-sans text-label text-ink">{h.coinName}</span>
          <span className="truncate font-sans text-body-sm text-ink-muted">{h.networkName}</span>
        </span>
        <HoldingAmount live={live} h={h} />
        <Icon icon={ChevronRight} size={18} className="-mr-1 flex-none text-ink-muted transition-transform duration-120 group-hover/row:translate-x-0.5" />
      </Link>
    </li>
  );
}

/** The Wallet tab's "at a glance" (D-50), above the holdings list: the estimate, the bar, the top five coins. */
export function InsideOverview({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  return <OverviewPanel ov={overview(live)} />;
}

const LIST = "m-0 list-none p-0 [&>li:first-child>a]:rounded-t-md [&>li:last-child>a]:rounded-b-md";

export function HoldingsList({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const { shown, empty } = splitHoldings(holdings(live));
  const id = snap.token_id;
  return (
    <div className="flex flex-col gap-2.5" data-holdings="">
      <ul aria-label={copy.coins.listLabel} className={cx(LIST, "rounded-md border border-line bg-surface")}>
        {shown.map((h) => (
          <HoldingRow key={h.key} tokenId={id} live={live} h={h} />
        ))}
      </ul>
      {empty.length ? (
        <details className="group rounded-md border border-line bg-surface" data-holdings-empty="">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 font-sans text-label text-ink transition-colors duration-120 hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 flex-col py-2">
              <span>{copy.coins.more(empty.length)}</span>
              <span className="font-sans text-caption font-normal text-ink-muted">{copy.coins.moreSummary}</span>
            </span>
            <Icon icon={ChevronDown} size={20} className="flex-none text-ink-muted transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <ul aria-label={copy.coins.more(empty.length)} className={cx(LIST, "border-t border-line")}>
            {empty.map((h) => (
              <HoldingRow key={h.key} tokenId={id} live={live} h={h} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/* ── The coin sheet: /s/[id]/coin/[key] ─────────────────────────────────────────────────────────────────────────── */

/** One coin, where it is, and what can be done with it: Add coins and Send for a coin at an address; the add and take-out
 * inputs (C6) for a coin inside. A sheet over the Wallet tab, like every flow. */
export function CoinSheet({ snap, holdingKey }: { snap: SatchelSnapshot; holdingKey: string }) {
  const v = useViewer(snap);
  const h = findHolding(holdings(v.live), holdingKey);
  const id = snap.token_id;
  if (!h) return null;
  const inside = h.place === "inside";
  const listed = !!v.live.listing;
  const canSend = h.chain !== "sol" || SOL_SEND_ENABLED;
  const sendOff = listed || !hasCoins(h);
  const action =
    !inside && h.chain ? (
      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        {v.isOwner && canSend ? (
          <Button href={sendHref(id, h)} variant={sendOff ? "secondary" : "primary"} size="lg" block icon={ArrowUp} disabled={sendOff} data-testid="coin-send">
            {copy.coins.send}
          </Button>
        ) : null}
        <Button href={receiveHref(id, h)} variant={v.isOwner && !sendOff ? "secondary" : "primary"} size="lg" block icon={ArrowDown} data-testid="coin-add">
          {copy.coins.add}
        </Button>
      </div>
    ) : undefined;

  return (
    <FlowShell title={inside ? copy.inside.row(h.ticker) : copy.coins.sheetTitle(h.ticker, h.networkName)} meta={copy.card.name(id)} titleSize="confirm" closeHref={`/s/${id}`} testId="coin-sheet" action={action}>
      <section data-coin-sheet={h.key} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4">
        <CoinIcon coin={h.coin} badge={h.badge} size={56} className="flex-none" />
        <div className="flex min-w-0 flex-col gap-0.5">
          {inside ? (
            h.coin === "NEAR" ? (
              <InsideNearAmount snap={snap} className="font-display text-[1.5rem]/7 font-extrabold tracking-[-0.02em]" />
            ) : (
              <InsideFtAmount snap={snap} ft={h.ft!} className="font-display text-[1.5rem]/7 font-extrabold tracking-[-0.02em]" />
            )
          ) : (
            <HoldingAmount live={v.live} h={h} className="font-display text-[1.5rem]/7 font-extrabold tracking-[-0.02em]" />
          )}
          <span className="font-sans text-body-sm text-ink-muted">{inside ? h.networkName : `${h.coinName} ${copy.coins.on(h.networkName)}`}</span>
        </div>
      </section>
      <p className="m-0 font-sans text-body-sm text-ink-muted">{inside ? copy.coins.insideNote : copy.coins.chainNote(h.networkName)}</p>
      {inside ? (
        <div className="flex flex-col gap-2.5">
          <p className="m-0 font-sans text-body-sm text-ink">{copy.inside.addBody}</p>
          {h.coin === "NEAR" ? <InsideNearActions snap={snap} /> : <InsideFtActions snap={snap} ft={h.ft!} />}
        </div>
      ) : h.chain ? (
        <CoinAddress snap={snap} h={h} />
      ) : null}
    </FlowShell>
  );
}

function CoinAddress({ snap, h }: { snap: SatchelSnapshot; h: Holding }) {
  const chain = h.chain!;
  const address = snap.addresses[chain];
  const name = CHAIN_NAME[chain];
  const explorer = chain === "evm" ? evmExplorerName(h.chainId!) : EXPLORER_NAME[chain];
  const href = chain === "evm" ? evmAddressLink(h.chainId!, address) : explorerFor(chain, address);
  return (
    <section aria-labelledby="coin-address-title" className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3.5">
      <h3 id="coin-address-title" className="m-0 font-sans text-label text-ink-muted">
        {copy.coins.address}
      </h3>
      <p className="m-0">
        <AddressDisplay address={address} size="md" />
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={address} label={copy.wallet.copyAria(name)} toastText={copy.wallet.copiedAria(name)} />
        <ExternalLink href={href} className="min-h-11 px-1.5 font-sans text-[0.875rem]/5 font-semibold">
          {explorer}
        </ExternalLink>
      </div>
    </section>
  );
}
