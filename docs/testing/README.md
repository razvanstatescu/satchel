# Testing Satchel

This is the overview. Each area has its own detailed document:

- [contract.md](contract.md): the Rust contract (unit and sandbox). It has a coverage matrix of every method and every
  INV-xx invariant, the edge cases explored, and the bugs found (AUDIT-01 to AUDIT-04).
- [core-api.md](core-api.md): the shared TypeScript core (`packages/core`), the web app's data layer (`apps/web/src/lib`)
  and the API routes, with a module-by-module inventory.
- [ui.md](ui.md): the web UI end to end (Playwright), with a page/flow/state coverage matrix.

The audit ran on 2026-10-30, with one agent per area, and was merged into `main` the same day. Every count below was
measured on the merged `main`, not copied from an agent's report.

## Run everything

Every command runs from the repo root. On this machine, prefix each shell with
`export PATH="$HOME/.cargo/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH";`.

| Suite | Command | Needs |
|---|---|---|
| Contract unit tests (parsers, policy, fuzz/proptest, shared vectors) | `cargo test -p satchel` | nothing |
| Contract sandbox (real wasm on a local NEAR node) | build the three wasms, then `cargo test -p satchel-tests` (see [contract.md §1](contract.md#1-how-to-run-the-suites)) | `cargo near build non-reproducible-wasm` for `contracts/{satchel,mock-signer,mock-ft}` |
| Core (TS mirror of the policy, chain builders, clean-history checker) | `pnpm --filter @satchel/core test` | nothing |
| Web unit tests | `pnpm --filter web test` | nothing |
| Tools unit tests | `pnpm --filter @satchel/tools test:unit` | nothing |
| Web end to end (fixture mode: mock wallet plus an in-browser chain simulation, no testnet) | `CI=1 E2E_PORT=3330 pnpm --filter web test:e2e` | a free port; **never 3100** (reserved on the dev machine) |
| Typecheck and lint | `pnpm --filter web typecheck`, `pnpm --filter web lint` | nothing |
| Known-bug tests | `cargo test -p satchel -- --ignored` and `cargo test -p satchel-tests --test audit -- --ignored` | they **fail on purpose** until the fix lands |

The end-to-end suite builds the app (`next build && next start`) in fixture mode and takes about 5 minutes. No suite
signs a testnet transaction. Live testnet runs are separate and documented in `research/spikes/dev2-live/RESULTS.md`.

## Counts on `main` after the audit

| Suite | Before the audit | After | Change |
|---|---|---|---|
| Contract unit | 177 passed | **189 passed, 2 ignored** | +12 tests; 2 ignored known bugs |
| Contract sandbox | 119 passed (16 files) | **122 passed, 3 ignored** (17 files) | +3 tests, +1 file (`audit.rs`); 3 ignored known bugs |
| Core | 467 | **467** | unchanged (judged well covered; see [core-api.md](core-api.md)) |
| Web unit | 486 | **531** | +45 (navigation classifier, price cache, signing intent store, address book) |
| Tools unit | 92 | **92** | unchanged |
| Web end to end | 224 | **263** | +39 (API routes, Send validation, popup edge cases, the new pages at 320 px and in Night with axe) |

The typecheck and lint are clean. One end-to-end test showed a sub-pixel flake during the audit: a theme toggle
measured 43.99994 px against a 44 px minimum. It did not reproduce on the merged run.

## What the audit found

### Fixed during the audit (UI, each with a regression test)

| What | Severity | Fix |
|---|---|---|
| Closing any popup (Escape, Close, or a tap on the background) left keyboard focus on the page body instead of the button that opened it (WCAG 2.4.3) | Medium | `FlowShell` remembers the opener and gives focus back on close |
| The Transactions chain filter made the whole page scroll sideways at 320 px | Low | the filter track scrolls on its own when it can't fit |

### Open: contract bugs (failing tests, marked ignored; the contract was not changed)

Full detail, repro steps and fix options are in [contract.md §4](contract.md#4-bugs-and-open-questions).

| ID | What | Severity | Suggested fix |
|---|---|---|---|
| AUDIT-01 | **A delegate can get around its BTC spending cap.** It asks twice for the same 2-input transaction and understates the other input in each request. Each request is debited about 1 sat, yet together they give valid signatures for the real transaction. BIP143 commits each input's amount only in that input's own signature, and the cap trusts the stated amounts. The owner's own signing and clean history are not affected. | Medium (allowances only) | Let delegates sign BTC with exactly **one input** (the signature then commits to the real amount). Change the TS mirror and `vectors/allowance.json` with it, and make the app's delegate coin selection pick one coin |
| AUDIT-04 | Some events are logged before a later refusal in the same call: `offer_made` before the storage charge, and the sale/accept/transfer events before the solvency check. A refused call's logs stay visible, which breaks the rule in `events.rs` and spec §5.8 | Low | Move each `emit()` after the last check |
| AUDIT-02 | `listings(from_index ≥ 2^32)` returns the first page instead of an empty one: `from_index as usize` truncates on wasm32 | Info | `usize::try_from(from_index)` with a clamp |
| AUDIT-03 | `withdraw_storage_credit` pays with a plain transfer and no callback, so a failed transfer is not re-credited. That needs the caller to delete their own account in that window | Info | none proposed; documented |

The contract freezes on **Nov 9**. All three fixes are small. Each needs the full routine before the rc birth: a
unit test plus a sandbox test (both already written as the ignored tests), the TS mirror and vectors where they
apply, a fuzz run, and a dev deploy.

### Open questions (from the contract audit)

- **Q-01**: which AUDIT-01 fix is acceptable for the product (one input only is the recommendation).
- **Q-03**: `withdraw_near` / `withdraw_ft` accept the MPC signer or the USDC contract as receiver. Intended?
- **Q-04**: `ft_on_transfer` messages accept unknown extra fields. Should parsing be strict?
- **Q-05**: right after a failed payout or withdrawal is re-credited, escrow can briefly exceed the contract's free
  balance, so `ERR_INSOLVENT` can fire spuriously until the refund lands. It is harmless and retryable.
- Q-02, by design: an offer survives a gift or a sale of the Satchel (C4–C6 spec §3). It is now covered by tests.

### Findings judged benign (documented, not bugs)

- `GET /api/satchels/[id]/txs` answers 200 for an id that was never minted, unlike `/api/satchels/[id]` (404): every
  id has derived addresses, so there is nothing to protect.
- `packages/core/src/card` (the brand 1.0 card colours) is no longer imported anywhere. It is a cleanup candidate.
- The server data functions use Next's `"use cache"`, so they can't be unit-tested in plain vitest. The API routes are
  covered end to end instead (`apps/web/test/e2e/api-routes.spec.ts`).

## What is still untested, and why

| Area | Why it isn't tested | How to cover it |
|---|---|---|
| Real wallets (Meteor, Intear, HOT, …): signing, rejection and slow approval | the tests use a mock wallet | manual runs on dev2; each one this week found real bugs |
| Live MPC behavior: latency, timeouts (≈ 1 in 4 under load on 2026-10-27), late signatures | the sandbox uses a mock signer | the `tools/e2e/{evm,btc,sol}.ts --sign-only` live scripts and the dev2 live run (20/20 on 2026-10-30) |
| Real chain timing: testnet4 confirmations (minutes to hours), the Solana 36 s blockhash, the EVM 204,600-gas account creation | the fixture simulation is instant and deterministic | live runs during demo staging; stage BTC early |
| The features added after the dev2 live run on real chains: Take everything out across networks, the Transactions tab sources under load, the address book with a real wallet | fixture-only so far | a short live pass on dev2 before the rc rehearsal |
| The sandbox on nearcore 2.14 | the suite ran on the default sandbox | `SANDBOX_VERSION=2.14.0-rc.5 cargo test -p satchel-tests` before the freeze |
| AUDIT-03 and Q-05 races | they can't be scheduled deterministically in the sandbox | reasoning plus code review (documented) |
| `lib/validate.ts` validators in isolation; the rarer branches of the multi-source NEAR merge behind the buyer's clean-history gate; `lib/signing/retry.ts` on its own | time; they are covered indirectly | the next unit-test targets ([core-api.md](core-api.md#what-remains-untested-and-why)) |
| UI: a dust-amount send, a keyboard-only Send from start to finish, an explicit "balance changes after a send" assertion, wallet rejection in give-by-link, offers and allowances | time | the next end-to-end targets ([ui.md](ui.md#what-remains-untested-and-why)) |
| Rate limits of the free public APIs (Solana devnet, FastNEAR without a key) with many judges at once | not load-tested | a short load test against the deployed site during the rc rehearsal |
