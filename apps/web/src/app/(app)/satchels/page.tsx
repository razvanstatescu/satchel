import type { Metadata } from "next";
import { SatchelsHome } from "@/components/client/MySatchels";
import { copy } from "@/lib/copy";

/**
 * /satchels, the app home (app-screens §2; R4): the Satchels the connected wallet owns, money waiting for you, and
 * Mint. Client data only (no judge facts), so the server HTML is the signed-out frame until the wallet is known.
 */
export const metadata: Metadata = { title: copy.home.list.title, description: copy.home.meta };

export default function SatchelsPage() {
  return <SatchelsHome />;
}
