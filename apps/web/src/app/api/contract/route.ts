import { getContractFacts } from "@/lib/data/server";

/** GET /api/contract (kb/90 §9): keyless and verification facts; backs /contract and the README curl. Cached 60 s. */
export async function GET() {
  const f = await getContractFacts();
  return Response.json(f, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
