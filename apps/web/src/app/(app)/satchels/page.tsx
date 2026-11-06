import type { Metadata } from "next";
import { SatchelsHome } from "@/components/client/MySatchels";
import { copy } from "@/lib/copy";
import { marketing } from "@/lib/copy/marketing";
import { pageMetadata } from "@/lib/seo";

/**
 * /satchels, the app home (app-screens §2; R4): the Satchels the connected wallet owns, money waiting for you, and
 * Mint. Client data only (no judge facts), so the server HTML is the signed-out frame until the wallet is known.
 */
export const metadata: Metadata = pageMetadata({
  path: "/satchels",
  title: copy.home.list.title,
  description: marketing.meta.satchels,
  noindex: true,
});

export default function SatchelsPage() {
  return <SatchelsHome />;
}
