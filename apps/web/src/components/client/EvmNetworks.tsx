"use client";

import { ChevronDown } from "lucide-react";
import { ExternalLink, Icon, cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import { useLiveSnapshot } from "@/lib/data/client";
import type { EvmChainBalance, SatchelSnapshot } from "@/lib/data/types";
import { evmAddressLink, evmBalances, evmExplorerName, evmNetworkName, SEPOLIA } from "@/lib/evm-networks";
import { formatAmount } from "@/lib/format";

/**
 * C2 + C3 inside the Ethereum row (app-screens §3.1): USDC on Sepolia when it holds any, then the other three testnets
 * (Base Sepolia, Arbitrum Sepolia, OP Sepolia) behind "Other networks", each with its ETH, its USDC and its explorer.
 * The address is the same on all four. Every amount is in the server HTML (a `<details>` keeps its content in the
 * document even while closed), and follows the shared snapshot poll in the browser.
 */

function amountText(v: string | null, ticker: "ETH" | "USDC"): string {
  if (v === null) return copy.wallet.unavailable;
  return BigInt(v) === 0n ? copy.wallet.zero(ticker) : formatAmount(v, ticker);
}

function hasCoins(r: EvmChainBalance) {
  return (r.wei != null && BigInt(r.wei) > 0n) || (r.usdc != null && BigInt(r.usdc) > 0n);
}

const AMOUNT = "m-0 flex-none text-right font-sans text-[0.9375rem]/5 font-bold whitespace-nowrap t-num";

export function EvmNetworks({ snap }: { snap: SatchelSnapshot }) {
  const live = useLiveSnapshot(snap);
  const rows = evmBalances(live);
  const sepolia = rows.find((r) => r.chain_id === SEPOLIA)!;
  const others = rows.filter((r) => r.chain_id !== SEPOLIA);
  const withCoins = others.filter(hasCoins).length;
  const address = snap.addresses.evm;
  const showUsdc = sepolia.usdc === null || BigInt(sepolia.usdc) > 0n;
  return (
    <div className="flex flex-col gap-2 md:pl-11" data-evm-networks="">
      {showUsdc ? (
        <p className="m-0 flex items-center justify-between gap-3 font-sans text-body-sm text-ink-muted" data-evm-balance={SEPOLIA} data-asset="usdc">
          <span>{copy.nets.usdcOn(evmNetworkName(SEPOLIA))}</span>
          <span className={cx(AMOUNT, sepolia.usdc && BigInt(sepolia.usdc) > 0n ? "text-ink" : "text-ink-muted")}>{amountText(sepolia.usdc, "USDC")}</span>
        </p>
      ) : null}
      <details className="group rounded-sm border border-line bg-surface" open={withCoins > 0 || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 font-sans text-label text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-col py-1.5">
            <span>{copy.nets.other}</span>
            <span className="font-sans text-caption font-normal text-ink-muted">{copy.nets.otherSummary(withCoins)}</span>
          </span>
          <Icon icon={ChevronDown} size={20} className="flex-none text-ink-muted transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <ul className="m-0 list-none p-0">
          {others.map((r) => {
            const name = evmNetworkName(r.chain_id);
            const explorer = evmExplorerName(r.chain_id);
            return (
              <li key={r.chain_id} className="flex flex-col gap-1 border-t border-line px-3 py-2.5" data-evm-network={r.chain_id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[0.9375rem]/5 font-semibold text-ink">{name}</span>
                  <span className={cx(AMOUNT, r.wei && BigInt(r.wei) > 0n ? "text-ink" : "text-ink-muted")} data-evm-balance={r.chain_id} data-asset="eth">
                    {amountText(r.wei, "ETH")}
                  </span>
                </div>
                {r.usdc === null || BigInt(r.usdc) > 0n ? (
                  <div className="flex items-center justify-between gap-3 font-sans text-body-sm text-ink-muted">
                    <span>USDC</span>
                    <span className={cx(AMOUNT, "text-ink")} data-evm-balance={r.chain_id} data-asset="usdc">
                      {amountText(r.usdc, "USDC")}
                    </span>
                  </div>
                ) : null}
                <ExternalLink href={evmAddressLink(r.chain_id, address)} aria-label={copy.nets.viewOnAria(name, explorer)} className="-my-1 min-h-11 self-start font-sans text-[0.875rem]/5 font-semibold">
                  {explorer}
                </ExternalLink>
              </li>
            );
          })}
        </ul>
        <p className="m-0 border-t border-line px-3 py-2.5 font-sans text-caption text-ink-muted">{copy.nets.sameAddress}</p>
      </details>
    </div>
  );
}
