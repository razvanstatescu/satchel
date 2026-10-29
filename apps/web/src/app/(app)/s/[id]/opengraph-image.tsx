import { FIXTURE_IDS } from "@/lib/data/fixtures";
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderSatchelOg } from "@/lib/og-card";

/**
 * A1: /s/[id]/opengraph-image — the social card per Satchel (see og-card.tsx for the shared renderer; twitter-image
 * is the same file re-exported). generateMetadata in layout.tsx no longer sets its own `openGraph.images`, so this
 * file's convention image is what every link preview shows (it previously fell through to the site-wide one).
 */
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
