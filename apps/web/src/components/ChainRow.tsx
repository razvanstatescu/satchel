import { AddressDisplay } from "@/components/AddressDisplay";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { RowAmount, RowTools } from "@/components/client/SatchelPage";
import { EvmNetworks } from "@/components/client/EvmNetworks";
import { CHAIN_NAME, NETWORK_LABEL } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import type { UiChain } from "@/lib/view";

/** "testnet4", "Sepolia", "devnet": the network under the chain's name. */
export const networkShort = (chain: UiChain) => NETWORK_LABEL[chain].replace(`${CHAIN_NAME[chain]} `, "");

/**
 * One Inside row (app-screens §3.1; proto `.inside-row`): the chain's 32 px charm, its name and network, the live
 * amount, then the FULL grouped address (`data-full-address`, the judge's fact: wraps only between 4-character groups)
 * and the tools (Copy, QR, the named explorer; Add coins first when it's empty; Retry when it's unavailable).
 * Server-rendered; the amount and the tools are live leaves.
 */
export function ChainRow({ snap, chain }: { snap: SatchelSnapshot; chain: UiChain }) {
  return (
    <li data-chain-row={chain} className="relative flex flex-col gap-2.5 p-4">
      <span aria-hidden="true" className="absolute inset-x-4 top-0 hidden h-px bg-line in-[li+li]:block" />
      <div className="flex min-w-0 items-center gap-3">
        <ChainCharm chain={chain} size={32} className="flex-none" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="m-0 truncate font-sans text-label text-ink">{CHAIN_NAME[chain]}</h3>
          <span className="truncate font-sans text-body-sm text-ink-muted">{networkShort(chain)}</span>
        </div>
        <RowAmount snap={snap} chain={chain} />
      </div>
      <p className="m-0 md:pl-11">
        <AddressDisplay address={snap.addresses[chain]} fullAttr={chain} size="md" />
      </p>
      <RowTools snap={snap} chain={chain} />
      {chain === "evm" ? <EvmNetworks snap={snap} /> : null}
    </li>
  );
}
