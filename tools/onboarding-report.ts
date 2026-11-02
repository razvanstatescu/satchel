/**
 * A compact read-out of the onboarding survey (apps/web/src/app/api/onboarding/route.ts), for Razvan. Run as
 * `pnpm --filter @satchel/tools onboarding:report [N]` (N = how many of the latest responses to list; default 20).
 * No admin web page: this is the only read-out. Reads the same Upstash Redis REST API and env vars the route writes
 * with: KV_REST_API_URL / KV_REST_API_TOKEN (what the Vercel Marketplace Upstash integration injects), falling back
 * to UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 */

interface UpstashConfig {
  url: string;
  token: string;
}

function config(): UpstashConfig {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Set KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) first.");
    process.exit(1);
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function pipeline(cfg: UpstashConfig, commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash pipeline failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { result: unknown }[];
  return body.map((r) => r.result);
}

interface OnboardingResponse {
  ts: number;
  role: string;
  goal?: string[];
  experience?: string | null;
  chains?: string[];
  source?: string | null;
  shareAccount?: boolean;
  accountId?: string | null;
}

async function main() {
  const n = Number(process.argv[2] ?? 20);
  const cfg = config();
  const [countsFlat, responsesRaw] = (await pipeline(cfg, [
    ["HGETALL", "satchel:onboarding:counts"],
    ["LRANGE", "satchel:onboarding:responses", "0", String(n - 1)],
  ])) as [string[] | null, string[] | null];

  const counts = new Map<string, number>();
  for (let i = 0; i + 1 < (countsFlat?.length ?? 0); i += 2) counts.set(countsFlat![i]!, Number(countsFlat![i + 1]));

  const sent = counts.get("responses") ?? 0;
  const skipped = counts.get("skipped") ?? 0;
  const total = sent + skipped;
  console.log("Onboarding survey — counts\n");
  console.log(`sent: ${sent}    skipped: ${skipped}    completion: ${total ? Math.round((100 * sent) / total) : 0}%\n`);

  const byQuestion = new Map<string, { option: string; count: number }[]>();
  for (const [key, count] of counts) {
    if (key === "responses" || key === "skipped") continue;
    const sep = key.indexOf(":");
    if (sep < 0) continue;
    const q = key.slice(0, sep);
    const option = key.slice(sep + 1);
    const rows = byQuestion.get(q) ?? [];
    rows.push({ option, count });
    byQuestion.set(q, rows);
  }
  for (const [q, rows] of byQuestion) {
    console.log(q);
    for (const r of rows.sort((a, b) => b.count - a.count)) console.log(`  ${r.option.padEnd(14)} ${r.count}`);
    console.log("");
  }

  const responses = responsesRaw ?? [];
  console.log(`Latest ${responses.length} response(s) (newest first)\n`);
  for (const raw of responses) {
    try {
      const r = JSON.parse(raw) as OnboardingResponse;
      const when = new Date(r.ts).toISOString();
      console.log(
        `${when}  ${r.role}  goal=${JSON.stringify(r.goal ?? [])}  experience=${r.experience ?? "-"}  chains=${JSON.stringify(r.chains ?? [])}  source=${r.source ?? "-"}  account=${r.accountId ?? "-"}`,
      );
    } catch {
      console.log(raw);
    }
  }
}

void main();
