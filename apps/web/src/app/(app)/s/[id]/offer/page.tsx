import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { MakeOfferFlow } from "@/components/client/Market";
import { getOffersFor, getSatchelSnapshot } from "@/lib/data/server";
import { copy } from "@/lib/copy";

/** /s/[id]/offer: make an offer, listed or not (docs/specs/C4-C6.md §3). A client flow presented in the FlowShell
 * over the server-rendered Wallet tab, same shape as /s/[id]/send and /s/[id]/sale?list=1. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/offer">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Offer · ${copy.card.name(id)}`, robots: { index: false } };
}

export default async function OfferPage(props: PageProps<"/s/[id]/offer">) {
  const { id } = await props.params;
  const [snap, offers] = await Promise.all([getSatchelSnapshot(id), getOffersFor(id)]);
  if (!snap) notFound();
  return (
    <>
      <WalletTab snap={snap} offers={offers} />
      <MakeOfferFlow snap={snap} />
    </>
  );
}
