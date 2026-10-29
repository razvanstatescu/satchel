import { getSatchelSnapshot, isTokenId } from "@/lib/data/server";

/** GET /api/satchels/[id] (kb/90 §9): the snapshot JSON; "use cache" 15 s inside; 1.5 s bound per upstream. */
export async function GET(_req: Request, ctx: RouteContext<"/api/satchels/[id]">) {
  const { id } = await ctx.params;
  if (!isTokenId(id)) return Response.json({ error: "token id must be a decimal integer" }, { status: 400 });
  const snap = await getSatchelSnapshot(id);
  if (!snap) return Response.json({ error: `Satchel #${id} doesn't exist`, token_id: id }, { status: 404 });
  return Response.json(snap, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
}
