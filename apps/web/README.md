# apps/web — the Satchel app (Next.js 16.4.2)

Read `AGENTS.md` and `node_modules/next/dist/docs/` before changing framework code. Design: `kb/80` R3, `kb/81` R3, `brand/`.
Architecture and decisions: `docs/handoff/web.md`.

```bash
pnpm --filter web dev                     # fixture mode by default (.env.example)
pnpm --filter web test                    # vitest (lib/)
pnpm --filter web test:e2e                # Playwright: builds + starts in fixture mode, role final
pnpm --filter web lint && pnpm --filter web typecheck
node apps/web/scripts/check-no-near-org.mjs   # the deprecated near.org RPC must appear nowhere (incl. .next)
```

## Onboarding survey (Upstash Redis)

The optional "about you" survey (first-time onboarding, `src/components/client/Onboarding.tsx`) posts to
`POST /api/onboarding` (`src/app/api/onboarding/route.ts`), which writes straight to the Upstash Redis REST API with
plain `fetch` — no new dependency. Server-only env vars, never `NEXT_PUBLIC_*`:

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — the names the **Vercel Marketplace Upstash integration** injects when it's
  added to the project and connected to an environment. This is the intended path: on Vercel, add the "Upstash for
  Redis" integration to the project and connect it to **Production** (`plan/human-actions-ready.md` has the step).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — fallbacks with the same names the plain Upstash dashboard
  uses, for a database created outside the Vercel integration.

When neither pair is set (fixture mode, e2e, local dev), the route answers `204` and stores nothing — no Redis
needed to develop or test the app.

Data written: `LPUSH satchel:onboarding:responses <json>` (one entry per non-skipped submission: the answers, `ts`,
`role` and `v`, plus `accountId` only when the survey's share-account box was ticked) and
`HINCRBY satchel:onboarding:counts <question>:<option>` / `responses` / `skipped` for the running totals. The IP
address is used only for an in-memory, best-effort per-IP rate limit (`src/lib/onboarding-ratelimit.ts`) and is
never stored — it doesn't survive a cold start or a different serverless instance, which is fine for a 20-second
survey nobody has a reason to script.

Read it back with `pnpm --filter @satchel/tools onboarding:report` (same env vars). There is no admin web page.
