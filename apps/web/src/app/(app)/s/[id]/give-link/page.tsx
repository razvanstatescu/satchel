import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { GiveLinkFlow } from "@/components/client/GiveLinkFlow";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";

/** /s/[id]/give-link (A2, plan/feature-ideas.md A2) — Give by link, a claim link. Client flow over the Satchel page. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/give-link">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.giveLink.title(id), robots: { index: false } };
}

export default async function GiveLinkPage(props: PageProps<"/s/[id]/give-link">) {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  return (
    <>
      <WalletTab snap={snap} />
      <GiveLinkFlow snap={snap} />
    </>
  );
}
