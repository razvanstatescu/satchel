import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

const description = copy.landing.meta.description(LANDING_NAMES_SOL);

/**
 * `/`: the marketing landing (SSR, every word in the HTML) + the "My Satchels" client island when connected. The title
 * is the D-41 tagline ("An NFT that is a wallet"); og:description is the page's description. A segment's `openGraph`
 * replaces the layout's whole object, including the image from the root's `opengraph-image.png` file convention, so
 * the layout's fields and that image (1200 × 630, served at /opengraph-image.png) are listed again here.
 */
export const metadata: Metadata = {
  title: copy.landing.meta.title,
  description,
  openGraph: {
    title: copy.app.name,
    description,
    type: "website",
    siteName: copy.app.name,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png", alt: copy.landing.meta.ogAlt }],
  },
};

export default async function Home() {
  return <Landing />;
}
