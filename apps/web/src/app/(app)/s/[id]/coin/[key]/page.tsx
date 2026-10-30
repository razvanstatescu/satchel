import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { CoinSheet } from "@/components/client/Holdings";
import { copy } from "@/lib/copy";
import { getOffersFor, getSatchelSnapshot } from "@/lib/data/server";
import { findHolding, holdings } from "@/lib/holdings";

/** /s/[id]/coin/[key]: one coin of a Satchel (`lib/holdings.ts` keys: `btc`, `evm-84532-usdc`, `inside-near`…), its
 * amount, where it sits and what can be done with it. A sheet over the server-rendered Wallet tab, like every flow. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/coin/[key]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.card.name(id), robots: { index: false } };
}

export default async function CoinPage(props: PageProps<"/s/[id]/coin/[key]">) {
  const { id, key } = await props.params;
  const [snap, offers] = await Promise.all([getSatchelSnapshot(id), getOffersFor(id)]);
  if (!snap || !findHolding(holdings(snap), key)) notFound();
  return (
    <>
      <WalletTab snap={snap} offers={offers} />
      <CoinSheet snap={snap} holdingKey={key} />
    </>
  );
}
