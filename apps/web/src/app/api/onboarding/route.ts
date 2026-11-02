import { CONTRACT_ROLE } from "@/lib/config";
import { upstashConfig, upstashPipeline } from "@/lib/onboarding-kv";
import { allowOnboardingRequest } from "@/lib/onboarding-ratelimit";
import { isWithinSizeLimit, MAX_BODY_BYTES, parseOnboardingBody, type OnboardingPayload } from "@/lib/onboarding-validate";

/**
 * POST /api/onboarding (the onboarding build): the optional "about you" survey and its Skip. Strict validation
 * (onboarding-validate.ts), a ~2 KB body cap, a per-IP rate limit (best effort, serverless-instance-local), and a
 * write straight to the Upstash Redis REST API with plain `fetch` — no new dependency. The IP is used only for the
 * in-memory rate limit and is never stored. When KV_REST_API_URL/TOKEN (or their UPSTASH_REDIS_REST_* fallbacks)
 * are unset — fixture mode, e2e, local dev — this answers 204 and stores nothing.
 */

/** How many individual responses are kept (the counts hash keeps every total regardless). */
const MAX_KEPT = 5000;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** One HINCRBY per chosen option, keyed "`question`:`option`" (e.g. "goal:explore"), plus one for the response and
 * one for a skip. Mirrors tools/onboarding-report.ts, which reads the same keys back. */
function countCommands(countsKey: string, data: OnboardingPayload): (string | number)[][] {
  const cmds: (string | number)[][] = [["HINCRBY", countsKey, "responses", 1]];
  for (const g of data.goal) cmds.push(["HINCRBY", countsKey, `goal:${g}`, 1]);
  if (data.experience) cmds.push(["HINCRBY", countsKey, `experience:${data.experience}`, 1]);
  for (const c of data.chains) cmds.push(["HINCRBY", countsKey, `chains:${c}`, 1]);
  if (data.source) cmds.push(["HINCRBY", countsKey, `source:${data.source}`, 1]);
  if (data.shareAccount) cmds.push(["HINCRBY", countsKey, "share_account:true", 1]);
  return cmds;
}

export async function POST(req: Request): Promise<Response> {
  if (!allowOnboardingRequest(clientIp(req))) return Response.json({ error: "too many requests" }, { status: 429 });

  // a declared oversize body is refused before it's read; the text check below catches an undeclared one
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ error: `body must be at most ${MAX_BODY_BYTES} bytes` }, { status: 400 });
  const text = await req.text();
  if (!isWithinSizeLimit(text)) return Response.json({ error: `body must be at most ${MAX_BODY_BYTES} bytes` }, { status: 400 });

  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseOnboardingBody(raw);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { data } = parsed;

  const config = upstashConfig();
  if (!config) return new Response(null, { status: 204 }); // fixture / local / e2e: nothing to write

  const responsesKey = "satchel:onboarding:responses";
  const countsKey = "satchel:onboarding:counts";
  const commands: (string | number)[][] = data.skipped
    ? [["HINCRBY", countsKey, "skipped", 1]]
    : [
        ["LPUSH", responsesKey, JSON.stringify({ ...data, ts: Date.now(), role: CONTRACT_ROLE, v: 1 })],
        ["LTRIM", responsesKey, 0, MAX_KEPT - 1], // the latest answers only; the counts keep the totals
        ...countCommands(countsKey, data),
      ];

  try {
    await upstashPipeline(config, commands);
  } catch {
    /* a lost write never fails the request the user is waiting on */
  }
  return new Response(null, { status: 204 });
}
