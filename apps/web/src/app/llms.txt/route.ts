import { APP_URL } from "@/lib/config";
import { llmsTxt } from "@/lib/seo";

/**
 * /llms.txt (llmstxt.org): a short, hand-written map of the site for coding agents and answer engines. Built from the
 * marketing registry (ready pages only) by the pure `llmsTxt` in seo.ts. Static: it has no request-time input.
 */
export function GET() {
  return new Response(llmsTxt(APP_URL), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
