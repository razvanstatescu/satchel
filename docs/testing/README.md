# Testing Satchel

The overview of every test suite: how to run each one, where the coverage maps are, and the latest recorded counts.
Written after the two test-audit rounds (2026-10-30/31); the counts table below was brought up to date on 2026-11-04
from the latest recorded runs (nothing was re-run for that edit). Shorthand (INV-xx, AUDIT-xx, Q-xx, R2-xx, C1–C7):
[docs/GLOSSARY.md](../GLOSSARY.md).

Each area has its own detailed document, with its coverage map:

- [contract.md](contract.md): the Rust contract (unit and sandbox). Coverage map: §2, every public method, callback
  and view (§2.1) and every INV-xx invariant (§2.2), each mapped to its tests. Also the edge cases explored (§3), the
  bugs found and fixed (AUDIT-01 to AUDIT-04, §4) and round two (§7).
- [core-api.md](core-api.md): the shared TypeScript core (`packages/core`), the web app's data layer (`apps/web/src/lib`)
  and the API routes. Coverage map: "Module-by-module inventory" (core, then `apps/web/src/lib`) and "API routes".
- [ui.md](ui.md): the web UI end to end (Playwright). Coverage map: "Coverage matrix (page / flow / state → spec)".

Related: the parser fuzzing and its re-run commands are in [`docs/security/fuzzing.md`](../security/fuzzing.md) §5;
the security reviews are in [`docs/security/`](../security/); live testnet runs (real MPC, real chains) are in
`research/spikes/dev2-live/RESULTS.md`.

The audit ran in two rounds, with one agent per area: round one on 2026-10-30, round two on 2026-10-30/31. Both were
merged into `main`. Every audit count below was measured on the merged `main`, not copied from an agent's report.

## Run everything

Every command runs from the repo root. You need Node 22.22.2 (`.nvmrc`) with pnpm 11, and Rust 1.93.0 with the wasm32
target and cargo-near 0.22.0 (`rust-toolchain.toml`). On the original dev machine (macOS, nvm) each shell needed
`export PATH="$HOME/.cargo/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH";` first.
Heavy suites share the machine's CPU: run one at a time (`CLAUDE.md`, "CPU budget").

| Suite | Command | Needs |
|---|---|---|
| Contract unit tests (parsers, policy, fuzz/proptest, shared vectors) | `cargo test -p satchel` | nothing |
| Contract sandbox (real wasm on a local NEAR node) | build the three wasms, then `cargo test -p satchel-tests` (see [contract.md §1](contract.md#1-how-to-run-the-suites)) | `cargo near build non-reproducible-wasm` for `contracts/{satchel,mock-signer,mock-ft}` |
| Wasm import check (INV-22: no AddKey, DeployContract or DeleteAccount) | `tools/check-wasm-imports.sh target/near/satchel/satchel.wasm` | the built wasm |
| Core (TS mirror of the policy, chain builders, clean-history checker) | `pnpm --filter @satchel/core test` | nothing |
| Core live checks (read-only, real networks; opt-in) | `pnpm --filter @satchel/core test:network` | network access |
| Web unit tests | `pnpm --filter web test` | nothing |
| Tools unit tests | `pnpm --filter @satchel/tools test:unit` (`test` also checks that `vectors/*.json` are fresh) | nothing |
| Web end to end (fixture mode: mock wallet plus an in-browser chain simulation, no testnet) | `CI=1 E2E_PORT=3330 pnpm --filter web test:e2e` | a free port; **never 3100** (reserved on the dev machine, and it is the config's default) |
| Typecheck and lint | `pnpm --filter web typecheck`, `pnpm --filter web lint` | nothing |
| Live signing without funds (real MPC on testnet) | `pnpm --filter @satchel/tools e2e:evm -- --sign-only` (also `e2e:btc`, `e2e:sol`; scripts in `tools/e2e/`) | testnet keys in `~/.near-credentials` |

The end-to-end suite builds the app (`next build && next start`) in fixture mode and takes about 5 minutes. No suite
above signs a testnet transaction, except the live scripts in the last row. Live testnet runs are documented in
`research/spikes/dev2-live/RESULTS.md`.

## Latest recorded counts

The newest count recorded for each suite, with its date and source. The contract code changed on 2026-11-04 with the
round-three review fixes (branch `fix/r3-findings`, [`security/review-round-3.md`](../security/review-round-3.md)).
The README's "Run it locally" table should match this one at the release commit.

| Suite | Latest recorded result | Date | Source |
|---|---|---|---|
| Contract unit, `cargo test -p satchel --lib` | 232 passed, 3 ignored; the 3 ignored (slow `review3_*` proofs) pass with `--ignored` | 2026-11-04 (integration of `fix/r3-findings`) | this file, "Round three integration" |
| Contract sandbox, nearcore 2.13.4 | **139 passed, 0 ignored** (20 files, `review3.rs` included), on the cargo-near wasm `3a73b492…` | 2026-11-04 | this file, "Round three integration" |
| Wasm import check | INV-22 OK on the cargo-near (non-reproducible) wasm `3a73b492…`; the reproducible rc artifact still needs its own check | 2026-11-04 | this file |
| Core | 549 passed | 2026-11-04 | this file |
| Tools (`test`) | 94 passed; vectors regenerate byte-identical | 2026-11-04 | this file |
| Web unit (vitest) | 673 passed | 2026-11-04 | this file |
| Web end to end (Playwright, fixture) | **308 passed** (full suite, mobile and desktop) | 2026-11-04 | this file |
| Deep Rust-vs-TS differential | 1,000,000 cases, 0 disagreements | 2026-10-30/31 | [contract.md §7.2](contract.md#72-results-filled-in-as-each-run-finishes) |

## Round three integration (2026-11-04)

`fix/r3-findings` ([`security/review-round-3.md`](../security/review-round-3.md)) was re-checked and merged into `main`
after a second review of every fix. Every suite in the table above ran on the merged result, plus a live check on dev2.

- **One test fix.** The fix branch made `sign_for` strict (`#[deny_unknown_arguments]`, R3-I-1) but its sandbox suite
  was compiled, not run. One round-two sandbox test, `round2::r2_extra_sign_for_arguments_cannot_relabel_the_requester`,
  still expected extra arguments to be ignored and failed on the new wasm. It now asserts the refusal (nothing written),
  then that the same request without them still names the delegate. The full sandbox then passed, 139/139.
- **Clients checked against the strict parsing.** Every `sign_for` builder (web `calls.signFor`, core `signForArgs`,
  tools `signForPlan`) sends exactly `token_id`, `request` and an optional `mpc_deposit`, with the five request shapes the
  contract accepts.
- **dev2 redeployed** with the cargo-near (non-reproducible) wasm, sha256
  `3a73b492d4142db92e9fd733447df63499d0a74563b2091ac870f7ac8a2f2361`, state kept (no borsh type changed), tx
  `5ZGwNbuaG648Q8rTmywGiKyKfTL5hSWBMSvGzHqZLeJc`. `apps/web/.env.production` expects that hash. Live checks:
  - the code hash matches the wasm; 4 Satchels, #1 still alice's with its signatures;
  - `nft_tokens` pages in mint order (`[1, 2, 3, 4]`; `from_index 2, limit 2` → `[3, 4]`);
  - alice's `sign_for` with an extra `requester` argument is refused ("unknown field `requester`") before anything runs;
  - a normal EVM request through the real MPC signs and recovers to the Satchel's address (`tools/e2e/evm.ts
    --sign-only`, tx `4eigXUFsn5P5xw6U6cbmgM6ko9pGx9uA1xtaUsmRQGjq`; not broadcast, so that record stays unused until
    its nonce is spent).
- **Circle testnet USDC passes the new birth pre-check** (R3-D-1): `ft_metadata` is `USDC`, 6 decimals.

## Counts through the audit (2026-10-30/31)

Measured on `main` after round two, its fixes, and the Q-03/Q-04 contract change (2026-10-31). The web counts have
grown since ("Latest recorded counts" above).

| Suite | Before the audit | After round one | After the round-one fixes | After round two | **After Q-03/Q-04** |
|---|---|---|---|---|---|
| Contract unit | 177 passed | 189 passed, 2 ignored (known bugs) | 194 passed, 0 ignored | 199 passed, 0 ignored | **202 passed, 0 ignored** |
| Contract sandbox (2.13.4) | 119 passed (16 files) | 122 passed, 3 ignored (17 files) | 127 passed, 0 ignored | 136 passed, 0 ignored (19 files) | **137 passed, 0 ignored** (20 files) |
| Contract sandbox (2.14.0-rc.5) | not run | not run | not run | 136 passed (one file at a time) | not re-run |
| Core | 549 passed | 2026-11-04 | this file |
| Web unit | 486 | 531 | 535 | 606 | **606** |
| Tools unit | 92 | 92 | 92 | 92 | **92** |
| Web end to end | 224 | 263 | 265 | 286 (+21) | **286** (app unchanged) |

The typecheck, lint and wasm import check (INV-22) are clean. Two tests were intermittent: a theme toggle measured at
43.99994 px, and an axe contrast reading taken mid-animation. Both are now deterministic: the measurement waits for the
sheet to settle and rounds to 0.01 px, and axe waits for finite animations to end.

**dev2 runs the fixed contract.** `dev2.satchelhq.testnet` was redeployed on 2026-10-30 with wasm sha256
`9dd652867c96bb4aa40bd1db93077c19223d94503d45e7f56c456049d1ebd9e3`. This is a non-reproducible dev build; the reproducible
build is for the rc. The state was kept (4 Satchels, #1 with 8 signatures). `listings(from_index = 2^32)` answers `[]` live.
`apps/web/.env.production` expects that hash. **Redeployed again on 2026-10-31** with the Q-03/Q-04 fixes: wasm sha256
`4dd7cde9da18d6a455993f1e1484c8f0140672144d368153948cc9a10050aed2` (non-reproducible), state kept, tx
`DTRoJfs1UtgR2EEvoDiBBDydaCWcfPjj17WvY9e9FBcd`; `.env.production` now expects that hash.

## Round two (2026-10-30/31)

Details: [contract.md §7](contract.md#7-round-two-2026-10-30-branch-testcontract2-from-main-3272e4c),
[core-api.md "Round two"](core-api.md#round-two), [ui.md "Round two"](ui.md#round-two).

- **Contract.** No contract bug; the contract source is unchanged. 1,000,000 Rust-vs-TS differential cases, 0
  disagreements. New edge cases:
  - a delegate can't meet the one-input rule by splitting a multi-input BTC tx (`ERR_BTC_PREVOUTS_INCOMPLETE`);
  - allowances across owner changes, including a delegate's in-flight request during a transfer;
  - every event is logged once, in the order the app's parsers expect.

  The sandbox passes on nearcore 2.14. The one difference from 2.13.4: on 2.14 the contract gets no share of the gas
  its calls burn (about 0.00006 NEAR per transfer, harmless). Gas is unchanged by the fixes (±0.002 Tgas).
- **Core and data layer.** New tests:
  - the multi-source clean-history merge, every branch, including a single disagreeing source among three still
    blocking;
  - the address validators, with real generated fixtures;
  - the signing-retry planner;
  - the byte helpers.

  A read-only live smoke against dev2 matched the code hash and got the expected answer from every API route.
- **UI.** 21 new end-to-end tests:
  - the page after a send, without a reload;
  - a keyboard-only Send, through the address-book dropdown;
  - wallet rejection in give-by-link, offers, allowances, inside deposit and withdraw, and Empty's skip;
  - the delegate one-coin message;
  - BTC dust and SOL rent floors;
  - the dropdown's search, 320 px, and Night with axe.

### Found in round two, and fixed

| ID | What | Severity | Fix |
|---|---|---|---|
| R2-01 | The live Activity feed never named a delegate who signed: the app read `requester` from the `sign_requested` event, which (by design) doesn't carry it. Fixtures did, so no test saw it | Low (web) | the requester now comes from the signature record, shown only when it wasn't the owner at that block (`liveActivityRows`, unit-tested) |
| R2-03 | An accepted offer showed in Activity as a plain transfer, with no price | Info (web) | `offer_accepted` becomes a sale row with its price and buyer |
| — | A bitcoin amount below dust was refused with core's raw text ("minimum is 294 sats for this recipient") | Cosmetic (web) | coin-selection errors read as sentences ("Send at least 0.00000294 BTC") |
| R2-02 | For a delegate's invalid message the TS mirror returns `ERR_MSG_*` where the contract returns `ERR_ALLOWANCE_KIND`; both refuse | Info (TS mirror) | fixed 2026-11-04 (review round 3): `checkDelegatedSign` refuses any message kind first, before expiry and listing, like `authorize_signer` |

### Decided by Razvan and fixed (contract, 2026-10-31, before the Nov 9 freeze)

- **Q-03 (Low), fixed.** `withdraw_near` to the MPC signer or the USDC contract used to be delivered and lost, and a
  `withdraw_ft` of USDC there was only re-credited until someone registered that receiver. `withdraw_near`,
  `withdraw_ft` and `prepay_storage(account_id)` now refuse the receivers `nft_transfer` already refuses (the contract,
  the MPC, USDC) with `ERR_BAD_RECEIVER`. The UI always withdraws to the owner, so nothing in the app changes.
- **Q-04 (Info), fixed.** Buy and offer messages used to ignore unknown fields (a buy with a `receiver_id` still gave
  the NFT to the sender). Every `ft_on_transfer` message is now strict: an unknown field is `ERR_BAD_MSG` and the FT
  refunds 100 %. No app or tool message carries an extra field.

Details, tests and gas: `docs/testing/contract.md` §7.7.

## What the audit found (round one)

### Fixed during the audit (UI, each with a regression test)

| What | Severity | Fix |
|---|---|---|
| Closing any popup (Escape, Close, or a tap on the background) left keyboard focus on the page body instead of the button that opened it (WCAG 2.4.3) | Medium | `FlowShell` remembers the opener and gives focus back on close |
| The Transactions chain filter made the whole page scroll sideways at 320 px | Low | the filter track scrolls on its own when it can't fit |

### Contract bugs (AUDIT-01, -02 and -04 fixed and merged, 2026-10-30)

Full detail, repro steps and the fixes are in [contract.md §4](contract.md#4-bugs-and-open-questions). The fixed
bugs' tests are no longer ignored; counts after the fixes are in [contract.md §6](contract.md#6-test-counts).
The table below is the audit's original finding.

| ID | What | Severity | Suggested fix |
|---|---|---|---|
| AUDIT-01 | **A delegate can get around its BTC spending cap.** It asks twice for the same 2-input transaction and understates the other input in each request. Each request is debited about 1 sat, yet together they give valid signatures for the real transaction. BIP143 commits each input's amount only in that input's own signature, and the cap trusts the stated amounts. The owner's own signing and clean history are not affected. | Medium (allowances only) | Let delegates sign BTC with exactly **one input** (the signature then commits to the real amount). Change the TS mirror and `vectors/allowance.json` with it, and make the app's delegate coin selection pick one coin |
| AUDIT-04 | Some events are logged before a later refusal in the same call: `offer_made` before the storage charge, and the sale/accept/transfer events before the solvency check. A refused call's logs stay visible, which breaks the rule in `events.rs` and spec §5.8 | Low | Move each `emit()` after the last check |
| AUDIT-02 | `listings(from_index ≥ 2^32)` returns the first page instead of an empty one: `from_index as usize` truncates on wasm32 | Info | `usize::try_from(from_index)` with a clamp |
| AUDIT-03 | `withdraw_storage_credit` pays with a plain transfer and no callback, so a failed transfer is not re-credited. That needs the caller to delete their own account in that window | Info | none proposed; documented |

All three are fixed and merged into `main`, with the full routine: unit and sandbox tests (the formerly ignored tests now
pass), the TS mirror and vectors, the fuzz and property runs, and the dev deploy to dev2. The app side of AUDIT-01 is
done too: a delegate's bitcoin send is built from one coin, and when no single coin can pay, the app says so before the
wallet opens.

### Open questions (from the contract audit)

- **Q-01**: answered. Razvan approved "delegates sign BTC with one input only"; it is implemented and deployed to dev2.
- **Q-03** and **Q-04**: decided and fixed on 2026-10-31; see "Decided by Razvan and fixed" above.
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
| AUDIT-03 and Q-05 races | they can't be scheduled deterministically in the sandbox | reasoning plus code review (documented) |
| A chain balance going down after a send | fixture balances are static by design, so the e2e only sees the signature count change | the live pass on dev2 |
| The delegate-debit differential (Rust vs TS on random C5 requests) | its corpus generator wasn't written | the Rust properties and the shared vectors cover it meanwhile |
| SOL's "a new recipient needs the full rent" rule end to end | fixture mode treats every recipient as existing | a unit test on `prepareSend`, or the live pass |
| Rate limits of the free public APIs (Solana devnet, FastNEAR without a key) with many judges at once | not load-tested | a short load test against the deployed site during the rc rehearsal |
