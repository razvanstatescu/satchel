import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { getOffersFor, getSatchelSnapshot } from "@/lib/data/server";
import { FIXTURE_IDS } from "@/lib/data/fixtures";

/** The Wallet tab (the judge page for /s/1). Blocking SSR; every judge fact renders outside any Suspense boundary. */
export const instant = false;

export async function generateStaticParams() {
  return FIXTURE_IDS.map((id) => ({ id }));
}

export default async function WalletPage(props: PageProps<"/s/[id]">) {
  const { id } = await props.params;
  const [snap, offers] = await Promise.all([getSatchelSnapshot(id), getOffersFor(id)]);
  if (!snap) notFound();
  return <WalletTab snap={snap} offers={offers} />;
}
