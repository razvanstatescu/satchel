import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Landing } from "@/components/Landing";
import { APP_URL, CONTRACT_ROLE } from "@/lib/config";
import { faqLd, jsonLdGraph, pageMetadata, siteJsonLd } from "@/lib/seo";
import { faqItems, LANDING_NAMES_SOL, LANDING_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

const description = copy.landing.meta.description(LANDING_NAMES_SOL);

/**
 * `/`: the marketing landing (SSR, every word in the HTML) + the "My Satchels" client island when connected. The title
 * is the D-41 tagline ("An NFT that is a wallet"); og:description is the page's description. A segment's `openGraph`
 * replaces the layout's whole object, including the image from the root's `opengraph-image.png` file convention, so
 * the layout's fields and that image (1200 × 630, served at /opengraph-image.png) are listed again here.
 */
export const metadata: Metadata = pageMetadata({
  path: "/",
  title: copy.landing.meta.title,
  description,
  ogTitle: "Satchel: an NFT that is a wallet",
});

export default async function Home() {
  return (
    <>
      <JsonLd data={siteJsonLd(APP_URL)} />
      {/* the landing's visible Q&A, word for word */}
      <JsonLd data={jsonLdGraph(faqLd(faqItems({ role: CONTRACT_ROLE, sol: LANDING_SOL }).map((it) => ({ q: it.q, a: it.a }))))} />
      <Landing />
    </>
  );
}
