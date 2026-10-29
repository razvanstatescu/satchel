import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { robotsFor } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return robotsFor(APP_URL);
}
