import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { getConfig } from "@/lib/data/server";
import { sitemapFor } from "@/lib/seo";

/** Every minted Satchel, read through the cached `config()` view (60 s), so a new mint shows up within a minute. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getConfig();
  return sitemapFor(APP_URL, config?.next_token_id ?? null);
}
