import type { MetadataRoute } from "next";
import { GROUND } from "@/lib/theme";

/**
 * The 2.0 pack's site.webmanifest with two product corrections: the Day ground as both colours (Day is the default
 * whatever the OS, R12.3, and a manifest can't follow the OS, so an installed app's splash matches the first paint),
 * and the tagline "An NFT that is a wallet." as the description (never "every chain", D-37, D-40).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Satchel",
    short_name: "Satchel",
    description: "An NFT that is a wallet.",
    start_url: "/",
    display: "standalone",
    background_color: GROUND.day,
    theme_color: GROUND.day,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
