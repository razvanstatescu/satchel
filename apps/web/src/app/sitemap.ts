import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { getConfig, getMarket } from "@/lib/data/server";
import { sitemapFor } from "@/lib/seo";

/**
 * Every minted Satchel, read through the cached `config()` view (60 s), so a new mint shows up within a minute. A
 * Satchel's /sale page is listed only while it is listed for sale (the market read is cached too, 15 s); if the market
 * can't be read, every /sale page is listed as before.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [config, market] = await Promise.all([getConfig(), getMarket()]);
  const listedIds = market.error ? null : market.entries.map((e) => e.token_id);
  return sitemapFor(APP_URL, config?.next_token_id ?? null, { listedIds });
}
