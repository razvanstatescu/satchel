import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SaleTab } from "@/components/client/SaleTab";
import { copy } from "@/lib/copy";
import { getCleanHint, getSatchelSnapshot } from "@/lib/data/server";

/**
 * /s/[id]/sale (judge route, app-screens §5): blocking SSR of the listing and the server's clean-history check (a hint,
 * labelled as the server's), so a reader without JavaScript sees the price, the listing and the verdict in
 * `listing-facts`. The buyer's browser check (client) is the only thing that enables Buy.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/sale">): Promise<Metadata> {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  // the server can't know the viewer: a listed Satchel is a Buy page; the owner's view retitles itself ("Sell · …")
  return { title: `${snap?.listing ? copy.page.tabs.buy : "Sale"} · ${copy.card.name(id)}` };
}

/** The request's time: "Server check 2 min ago" is measured per request, not when the hint was cached. */
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export default async function SalePage(props: PageProps<"/s/[id]/sale">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const hint = await getCleanHint(id);
  const serverNow = await requestTime();
  return <SaleTab snap={snap} hint={hint} openList={sp.list != null} serverNow={serverNow} />;
}
