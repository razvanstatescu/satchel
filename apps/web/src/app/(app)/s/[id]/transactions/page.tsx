import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { marketing } from "@/lib/copy/marketing";
import { pageMetadata } from "@/lib/seo";
import { parseTxFilter } from "@/lib/chain-txs";
import { getSatchelSnapshot } from "@/lib/data/server";
import { TX_SOURCES } from "@/lib/data/txs";
import { TransactionsView } from "./TransactionsView";

/**
 * Transactions: coins in and out of the Satchel on every chain with a keyless source (lib/chain-txs.ts), newest first,
 * separate from Activity (what the contract decided and signed). The page renders at once from the snapshot; the list
 * fills in from the browser, every source in parallel (TxList). `?filter=` opens it on one chain.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/transactions">): Promise<Metadata> {
  const { id } = await props.params;
  return pageMetadata({
    path: `/s/${id}/transactions`,
    title: `${copy.page.tabs.transactions} · ${copy.page.title(id)}`,
    description: marketing.meta.transactions(id),
    images: false,
  });
}

export default async function TransactionsTab(props: PageProps<"/s/[id]/transactions">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  return <TransactionsView snap={snap} sources={TX_SOURCES} filter={parseTxFilter(sp.filter)} />;
}
