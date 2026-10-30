import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SatchelCard } from "@/components/SatchelCard";
import { FundPicker } from "@/components/client/FundPicker";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";
import { fundChoice, parseFund } from "@/lib/fund";
import { overview } from "@/lib/overview";
import { qrSvg } from "@/lib/qr";

/**
 * /fund/[id]: the public Add coins page (lib/fund.ts). The link a Satchel's owner sends to anyone who should send them
 * coins: pick the coin, then its network, and get that one address (QR, Copy, the network's notes, the live Incoming
 * line), or for a coin held inside, the add field. `?coin=&network=` pre-fills both (every Share link does). The server
 * renders the first view, a pre-filled destination's QR included; the pickers then run in the browser (FundPicker),
 * so a pick never waits on the server. They never guess a network.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/fund/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.fundPage.title(id), description: copy.fundPage.whose(id), robots: { index: false } };
}

export default async function FundPage(props: PageProps<"/fund/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const pick = parseFund(sp.coin, sp.network);
  const place = fundChoice(snap, pick).place;
  const address = place?.chain ? snap.addresses[place.chain] : null;
  const initialQr = address ? { address, svg: await qrSvg(address) } : null;
  const f = copy.fundPage;

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-7" data-fund-page={id}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-title text-ink">{f.title(id)}</h1>
          <p className="m-0 font-sans text-body text-ink-muted">{f.lead}</p>
        </div>
        <SatchelCard tokenId={id} size="sm" status={null} contents={overview(snap)} headingLevel={2} id={`fund-card-${id}`} />
        <p className="m-0 font-sans text-body-sm text-ink-muted">{f.whose(id)}</p>
      </header>
      <FundPicker snap={snap} initial={pick} initialQr={initialQr} />
    </article>
  );
}
