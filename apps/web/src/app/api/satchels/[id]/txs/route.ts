import { isTokenId } from "@/lib/data/server";
import { getTxSource, isTxSource, TX_SOURCES } from "@/lib/data/txs";

/**
 * GET /api/satchels/[id]/txs?source=bitcoin|sepolia|base|optimism|solana|near: one source's transactions for the
 * Transactions tab, which asks for every source at once and shows each as it lands. Without `source`, the list of
 * sources. "use cache" 30 s inside; each source bounded to about 4.5 s.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/satchels/[id]/txs">) {
  const { id } = await ctx.params;
  if (!isTokenId(id)) return Response.json({ error: "token id must be a decimal integer" }, { status: 400 });
  const source = new URL(req.url).searchParams.get("source");
  if (source === null) return Response.json({ sources: TX_SOURCES });
  if (!isTxSource(source)) return Response.json({ error: `unknown source; one of ${TX_SOURCES.join(", ")}` }, { status: 400 });
  try {
    const r = await getTxSource(id, source);
    return Response.json({ ...r, ok: true }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ key: source, ok: false, txs: [], as_of: Date.now() }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
