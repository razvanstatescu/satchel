import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { TransferFlow } from "@/components/client/TransferFlow";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";

/** /s/[id]/transfer — Gift / transfer, ending in the handoff. Client flow over the server-rendered Satchel page. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/transfer">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.xfer.title(id), robots: { index: false } };
}

export default async function TransferPage(props: PageProps<"/s/[id]/transfer">) {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  return (
    <>
      <WalletTab snap={snap} />
      <TransferFlow snap={snap} />
    </>
  );
}
