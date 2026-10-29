import { getCleanHint, isTokenId } from "@/lib/data/server";

/** GET /api/clean-history/[id] (kb/90 §9): the server HINT (15 s). Never authoritative: the browser re-checks before Buy. */
export async function GET(_req: Request, ctx: RouteContext<"/api/clean-history/[id]">) {
  const { id } = await ctx.params;
  if (!isTokenId(id)) return Response.json({ error: "token id must be a decimal integer" }, { status: 400 });
  const r = await getCleanHint(id);
  if (!r) return Response.json({ error: `Satchel #${id} doesn't exist` }, { status: 404 });
  return Response.json({ ...r, hint: true }, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
}
