import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { AllowanceFlow } from "@/components/client/AllowanceFlow";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";

/** /s/[id]/allowance — the owner lets another account send up to a daily cap (docs/specs/C5.md). */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${copy.allowance.add.title} · Satchel`, robots: { index: false } };
}

export default async function AllowancePage(props: PageProps<"/s/[id]/allowance">) {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  return (
    <>
      <WalletTab snap={snap} />
      <AllowanceFlow snap={snap} />
    </>
  );
}
