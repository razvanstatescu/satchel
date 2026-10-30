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
- `@satchel/tools`: `test:unit` was killed once (exit 137 = OOM/SIGKILL) under machine load from other agents running
  concurrently in sibling worktrees; re-run in isolation: 92 tests passed, 6 test files.

## Module-by-module inventory (packages/core)

| Module | Test file(s) | Notes |
| --- | --- | --- |
| `bytes.ts` | covered indirectly via btc/evm/sol/near tests | no dedicated unit file |
| `card/index.ts` | `test/card.test.ts` | |
| `chains/btc/*` (build, select, mempool, attach, tx) | `test/btc.test.ts`, fuzz (`test/fuzz/policy-fuzz.test.ts`), `test/fixtures/kb30-btc-fanout.json`, `test/fixtures/testnet4-esplora.json` | |
| `chains/evm/*` (index, networks) | `test/evm.test.ts`, `test/fixtures/sepolia-rpc.json` | |
| `chains/sol/*` | `test/sol.test.ts`, `test/fixtures/solana-devnet.json` | |
| `clean-history/*` (checker, btc, evm, sol, gate, history, messages, sources, util) | `test/clean-history.test.ts`, `test/gate.test.ts`, `test/review-sr01.test.ts` | |
| `derive/index.ts` | `test/derive.test.ts` | |
| `format/index.ts` | `test/format.test.ts` | |
| `near/*` (allowance, constants, market, mpc, sign-request) | `test/near.test.ts`, `test/allowance.test.ts`, `test/market.test.ts` | |
| `policy/*` (allowance, btc, evm, msg, rlp, sol, types) | `test/policy.test.ts`, `test/features-c1-c7.test.ts`, fuzz | |
| full round-trip / sandbox | `test/e2e-local.test.ts`, `test/network/live.network.test.ts` (opt-in, excluded from default run) | |

## Module-by-module inventory (apps/web/src/lib, scope only)

| Module | Test file(s) | Notes |
| --- | --- | --- |
| `holdings.ts` | `test/unit/holdings.test.ts` | |
| `overview.ts` | `test/unit/overview.test.ts` | |
| `prices.ts` | `test/unit/market.test.ts`? verify | needs check — see gaps below |
| `chain-txs.ts` | `test/unit/chain-txs.test.ts` | |
| `fund.ts` | `test/unit/fund.test.ts` | |
| `address-book.ts` | `test/unit/address-book.test.ts` | |
| `nav-pending.ts` | — | check for dedicated test |
| `view.ts` | — | check |
| `format.ts` | — | check (web's own format.ts, distinct from core) |
| `evm-networks.ts` | — | check |
| `validate.ts` | — | check |
| `lib/data/{snapshot,source,server,client,txs,fixture-txs,clean}.ts` | partially via `clean-history-fixtures.test.ts`, `fixture-switches.test.ts`, `live-missing-contract.test.ts` | |
| `lib/chains/send.ts` (prepareSend) | `test/unit/sol-send.test.ts`, `test/unit/evm-nonce-gap.test.ts`, `test/unit/sweep.test.ts` | BTC coin-selection paths via send.ts not obviously covered — see gaps |
| `lib/signing/*` | `test/unit/signing-machine.test.ts`, `test/unit/signing-runner.test.ts` | |
| `lib/near/*` | `test/unit/contract-outcome-format.test.ts`, `test/unit/track-tx.test.ts` | |

(This table is a first pass; being refined as each module is actually opened and cross-checked against its test
file's `describe` blocks, below.)

