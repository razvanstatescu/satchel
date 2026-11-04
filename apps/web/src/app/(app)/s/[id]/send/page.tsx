import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { SendFlow } from "@/components/client/SendFlow";
import { getSatchelSnapshot, getSigRecords } from "@/lib/data/server";
import { SOL_SEND_ENABLED } from "@/lib/config";
import { copy } from "@/lib/copy";
import { pickEvmChainId } from "@/lib/evm-networks";
import { hasCoins, holdings } from "@/lib/holdings";

/** /s/[id]/send?chain=btc|evm|sol (sol when SOL_SEND_ENABLED, which the default SOL UI implies, D-46) — a client flow presented in the FlowShell over the server-rendered Satchel page. */
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
  // no ?chain= (the column's Send): open on the first coin it actually holds, with its network and coin; ?chain=evm
  // without a network: the first EVM network that holds something
  const held = holdings(snap).filter((h) => hasCoins(h) && h.place === "chain" && (h.chain !== "sol" || SOL_SEND_ENABLED));
  const asked = sp.chain === "evm" ? "evm" : sp.chain === "sol" && SOL_SEND_ENABLED ? "sol" : sp.chain === "btc" ? "btc" : null;
  const first = held.find((h) => (asked ? h.chain === asked : true)) ?? null;
  const chain = asked ?? first?.chain ?? "btc";
  // only when the link names neither a network nor a coin (an explicit ?asset=usdc keeps its coin)
  const evmDefault = !sp.network && !sp.asset && chain === "evm" && first?.chain === "evm" ? first : null;
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
        initialNetwork={evmDefault ? pickEvmChainId(String(evmDefault.chainId)) : pickEvmChainId(sp.network)}
        initialAsset={evmDefault ? (evmDefault.coin === "USDC" ? "usdc" : "eth") : sp.asset === "usdc" ? "usdc" : "eth"}
      />
    </>
  );
}
