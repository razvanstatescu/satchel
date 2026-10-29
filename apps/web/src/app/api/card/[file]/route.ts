import { cardSvg } from "@/lib/card-svg";
import { getSatchelSnapshot, isTokenId } from "@/lib/data/server";

/**
 * GET /api/card/{id}.svg: the NFT media via base_uri (D-23 rev 2; design-system-impl §8): the 2.0 sticker card with the
 * state pill (Active, Signing, Paused for sale) and sig_count read from contract state. No balances, no owner.
 * s-maxage=60, stale-while-revalidate.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/card/[file]">) {
  const { file } = await ctx.params;
  const m = /^(\d+)\.svg$/.exec(file);
  if (!m || !isTokenId(m[1])) return new Response("not found", { status: 404 });
  const id = m[1];
  const snap = await getSatchelSnapshot(id);
  if (!snap) return new Response("not found", { status: 404 });
  const status = snap.listing ? "listed" : snap.status === "signing" ? "signing" : "active";
  return new Response(cardSvg(id, status, snap.sig_count), {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, s-maxage=60, stale-while-revalidate=600" },
  });
}
