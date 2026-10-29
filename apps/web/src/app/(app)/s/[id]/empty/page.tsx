import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { EmptyFlow } from "@/components/client/EmptyFlow";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot, getSigRecords } from "@/lib/data/server";

/** /s/[id]/empty (A3 Empty the Satchel, plan/feature-ideas.md A3) — client flow over the Satchel page. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/empty">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.empty.title(id), robots: { index: false } };
}

export default async function EmptyPage(props: PageProps<"/s/[id]/empty">) {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const records = await getSigRecords(id);
  return (
    <>
      <WalletTab snap={snap} />
      <EmptyFlow snap={snap} records={records} />
    </>
  );
}
