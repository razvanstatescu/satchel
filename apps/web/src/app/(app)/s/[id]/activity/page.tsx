import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { marketing } from "@/lib/copy/marketing";
import { pageMetadata } from "@/lib/seo";
import { getActivity, getSatchelSnapshot } from "@/lib/data/server";
import { ActivityView } from "./ActivityView";

/**
 * Activity (app-screens §4): the record, newest first. SSR renders a page of NEAR events and signatures (FastNEAR tx
 * API; fixtures otherwise); the In progress group is a client island; Show older (`?before=` a block) works without JS.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/activity">): Promise<Metadata> {
  const { id } = await props.params;
  return pageMetadata({
    path: `/s/${id}/activity`,
    title: `${copy.page.tabs.activity} · ${copy.page.title(id)}`,
    description: marketing.meta.activity(id),
    images: false,
  });
}

export default async function ActivityTab(props: PageProps<"/s/[id]/activity">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const act = await getActivity(id);
  const raw = typeof sp.before === "string" ? Number(sp.before) : NaN;
  return <ActivityView snap={snap} act={act} before={Number.isSafeInteger(raw) && raw > 0 ? raw : null} />;
}
