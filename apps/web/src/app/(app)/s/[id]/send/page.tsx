import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { SendFlow } from "@/components/client/SendFlow";
import { getSatchelSnapshot, getSigRecords } from "@/lib/data/server";
import { SOL_SEND_ENABLED } from "@/lib/config";
import { copy } from "@/lib/copy";
import { pickEvmChainId } from "@/lib/evm-networks";

/** /s/[id]/send?chain=btc|evm|sol (sol only with the P2 SOL send flag) — a client flow presented in the FlowShell over the server-rendered Satchel page. */
export const instant = false;

/**
 * The title depends on the route id only, never on `?chain=`. Awaiting searchParams here is runtime data, which blocked
 * the metadata and failed the live production build on ids that are not minted yet (/s/7/send on dev1, 2026-10-29).
 * The flow's dialog still names the chain ("Send Ethereum").
 */
export async function generateMetadata(props: PageProps<"/s/[id]/send">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Send · ${copy.card.name(id)}`, robots: { index: false } };
}

export default async function SendPage(props: PageProps<"/s/[id]/send">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const records = await getSigRecords(id);
  const chain = sp.chain === "evm" ? "evm" : sp.chain === "sol" && SOL_SEND_ENABLED ? "sol" : "btc";
  const intent = typeof sp.intent === "string" ? sp.intent : null;
  return (
    <>
      <WalletTab snap={snap} />
      <SendFlow
        key={intent ?? chain}
        snap={snap}
        initialChain={chain}
        intentId={intent}
        records={records}
        initialNetwork={pickEvmChainId(sp.network)}
        initialAsset={sp.asset === "usdc" ? "usdc" : "eth"}
      />
    </>
  );
}
