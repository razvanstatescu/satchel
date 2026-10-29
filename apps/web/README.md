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
