import { NextResponse, type NextRequest } from "next/server";
import { nextTokenId, satchelPathId, tokenVerdict } from "@/lib/token-exists";

/**
 * `/s/<id>` for a Satchel that doesn't exist answers HTTP 404 with the not-found page, server-rendered (the same view
 * as any unmatched URL). The status has to be set here: the page streams, and by the time it could throw notFound()
 * the 200 has been sent. If the contract can't be read, the request goes through and the page shows the same view.
 */
export async function proxy(request: NextRequest) {
  const id = satchelPathId(request.nextUrl.pathname);
  if (id === null) return NextResponse.next();
  const want = /^\d{1,10}$/.test(id) ? Number(id) : 0;
  if (tokenVerdict(id, await nextTokenId(want)) !== "missing") return NextResponse.next();
  return NextResponse.rewrite(new URL("/_satchel-not-found", request.url));
}

export const config = { matcher: ["/s/:id", "/s/:id/:path*"] };
