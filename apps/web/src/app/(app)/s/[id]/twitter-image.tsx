import { FIXTURE_IDS } from "@/lib/data/fixtures";
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderSatchelOg } from "@/lib/og-card";

/** A1: /s/[id]/twitter-image — the same card as opengraph-image.tsx (og-card.tsx has the shared renderer). Twitter's
 * card reader prefers this file over `openGraph.images` when both are present. */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;

export async function generateStaticParams() {
  return FIXTURE_IDS.map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderSatchelOg(id);
}
