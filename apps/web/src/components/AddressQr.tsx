import type { ReactNode } from "react";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Charm } from "@/components/brand";
import { copy } from "@/lib/copy";

/**
 * The address card of Add coins (app-screens §8; proto app-receive.html), shared by the sheet and the public page
 * (`/fund/[id]`): the Satchel's band, the network with its charm, the QR on a white plate (Day colours in every theme,
 * so any camera reads it), the label and the full grouped address. Server-rendered; `svg` comes from `qrSvg(address)`.
 */
export function AddressQr({
  tokenId,
  address,
  svg,
  network,
  lead,
  fullAttr,
}: {
  tokenId: string;
  address: string;
  /** null while the browser draws it (the public page's instant pickers): a quiet placeholder of the same size */
  svg: string | null;
  /** "Bitcoin testnet4", "Base Sepolia"… */
  network: string;
  /** the charm or coin icon before the network */
  lead: ReactNode;
  /** `data-full-address` ("btc" | "evm" | "sol") */
  fullAttr?: string;
}) {
  return (
    <section aria-labelledby="qr-title" className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex h-13 items-center gap-2.5 border-b-2 border-sticker bg-brand px-4 text-on-brand">
        <p id="qr-title" className="m-0 font-display text-[1.125rem]/6 font-extrabold tracking-[-0.01em]">
          {copy.card.name(tokenId)}
        </p>
        <Charm height={30} className="ml-auto h-7.5 w-auto flex-none" />
      </div>
      <div className="flex flex-col items-center gap-3 px-4 py-5">
        <p className="m-0 inline-flex items-center gap-2 font-sans text-body-sm font-semibold text-ink-muted">
          {lead}
          {network}
        </p>
        {svg ? (
          <div
            data-scheme="day"
            role="img"
            aria-label={copy.fund.qr(address)}
            className="size-55 rounded-[16px] border border-line-strong bg-surface p-2.5 text-ink *:block *:size-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div aria-hidden="true" className="size-55 rounded-[16px] border border-line-strong bg-skeleton motion-safe:animate-pulse" />
        )}
        <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.fund.label(network)}</p>
        <p className="m-0 w-full text-center">
          <AddressDisplay address={address} fullAttr={fullAttr} size="lg" align="center" />
        </p>
      </div>
    </section>
  );
}
