import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { SignMessageFlow } from "@/components/client/SignMessageFlow";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";

/** /s/[id]/sign (C7): Sign a message with the Satchel's Ethereum or Solana address. Owner only; a flow over the Wallet tab. */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/sign">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `${copy.msg.title} · ${copy.card.name(id)}`, robots: { index: false } };
}

export default async function SignPage(props: PageProps<"/s/[id]/sign">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const intent = typeof sp.intent === "string" ? sp.intent : null;
  return (
    <>
      <WalletTab snap={snap} />
      <SignMessageFlow key={intent ?? "new"} snap={snap} intentId={intent} />
    </>
  );
}
