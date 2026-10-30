# Core, data-layer and API test audit

Status: in progress (WIP, committed incrementally). This document inventories existing test coverage for
`packages/core`, `apps/web/src/lib/**` and the API routes under `apps/web/src/app/api/**`, lists edge cases
explored, records bugs found, and explains what remains untested. Another agent covers UI flows (apps/web
Playwright user-journeys) and another covers the Rust contract — this document only covers the scope above.

## How to run each suite

All commands need this PATH prefix on this machine (the shell has no PATH otherwise):

```
export PATH="$HOME/.cargo/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
```

- Core (`packages/core`): `pnpm --filter @satchel/core test` (vitest + a browser-bundle smoke check). Unit-only:
  `pnpm --filter @satchel/core test:unit` if present, else vitest directly excludes `test/network/**` (live network
  tests, opt-in only).
- Web (`apps/web`): unit tests `pnpm --filter web test` (vitest, node env). Playwright e2e:
  `CI=1 E2E_PORT=3332 pnpm --filter web test:e2e` (port 3332 reserved for this agent; 3100 and 3333 belong to other
  agents/projects — never use them).
- Tools (`tools/`): `pnpm --filter @satchel/tools test:unit` (vitest only) or `pnpm --filter @satchel/tools test`
  (vitest + `vectors/gen.ts --check`, which regenerates and diffs the shared `vectors/*.json`).

## Baseline (before this audit's additions)

Captured on a fresh `pnpm install --frozen-lockfile` in the worktree, 2026-10-30:

- `@satchel/core`: 467 tests passed, 16 test files (plus the browser-bundle size check `scripts/check-browser.mjs`,
  which passed for every subpath export).
- `web`: 486 tests passed, 40 test files.
- `@satchel/tools`: `test:unit` was killed (exit 137 = OOM/SIGKILL) under machine load from other agents running
  concurrently in sibling worktrees; to be re-run in isolation and recorded below.

