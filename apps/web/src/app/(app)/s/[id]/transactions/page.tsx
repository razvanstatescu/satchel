import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseTxFilter } from "@/lib/chain-txs";
import { getSatchelSnapshot } from "@/lib/data/server";
import { getTransactions } from "@/lib/data/txs";
import { TransactionsView } from "./TransactionsView";

/**
 * Transactions: coins in and out of the Satchel on every chain with a keyless source (lib/chain-txs.ts), newest first,
 * separate from Activity (what the contract decided and signed). Blocking SSR, so the list is in the server HTML;
 * `?filter=` narrows it to one chain and works without JavaScript.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/transactions">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `${copy.page.tabs.transactions} · ${copy.page.title(id)}` };
}

export default async function TransactionsTab(props: PageProps<"/s/[id]/transactions">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [snap, page] = await Promise.all([getSatchelSnapshot(id), getTransactions(id)]);
  if (!snap || !page) notFound();
  return <TransactionsView snap={snap} page={page} filter={parseTxFilter(sp.filter)} />;
}
