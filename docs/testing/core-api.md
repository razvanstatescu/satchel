# Core, data-layer and API test audit

> **Test audit record:** round one 2026-10-30, round two 2026-10-31 ("Round two", at the end). Counts are as of those
> dates; the latest recorded counts are in [README.md](README.md#latest-recorded-counts). The unused
> `packages/core/src/card` module (brand 1.0) it flags is still in the tree (checked 2026-11-04).
> Shorthand: [docs/GLOSSARY.md](../GLOSSARY.md).

This document inventories test coverage for `packages/core`, the pure logic and data layer under
`apps/web/src/lib/**`, and the API routes under `apps/web/src/app/api/**`. It lists edge cases explored (with
result), bugs found, and what remains untested and why. Another agent covers UI flows (apps/web Playwright
user-journeys) and another covers the Rust contract — this document only covers the scope above.

## How to run each suite

On the original dev machine (macOS, nvm), every command needed this PATH prefix (the agent's shell otherwise had no
PATH); elsewhere, Node 22.22.2 with pnpm 11 on the PATH is enough:

```
export PATH="$HOME/.cargo/bin:$HOME/.nvm/versions/node/v22.22.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
```

- **Core** (`packages/core`): `pnpm --filter @satchel/core test` — vitest (excludes `test/network/**`, a live-network
  opt-in suite) plus a browser-bundle size check (`scripts/check-browser.mjs`) that every subpath export still
  bundles for the browser.
- **Web unit** (`apps/web`): `pnpm --filter web test` — vitest, `node` environment, `NEXT_PUBLIC_DATA_MODE=fixture`
  (see "A real constraint" below for why this matters).
- **Web e2e** (`apps/web`): `CI=1 E2E_PORT=3332 pnpm --filter web test:e2e` — Playwright against
  `next build && next start` in fixture mode. Port 3332 was reserved for this agent; 3100 and 3333 belong to other
  agents/projects running concurrently on this machine — never use them. Passing a file filter after `--`
  (`pnpm --filter web test:e2e -- test/e2e/api-routes.spec.ts`) did **not** actually scope the run on this machine —
  it still ran the full suite (confirmed: the total test count matched the full-suite count, and the named spec's
  tests showed up correctly inside that run). Budget ~5 minutes for a `next build` + the full suite either way.
- **Tools** (`tools/`): `pnpm --filter @satchel/tools test:unit` (vitest only) or `pnpm --filter @satchel/tools test`
  (vitest + `vectors/gen.ts --check`, which regenerates and diffs the shared `vectors/*.json`).

## A real constraint found early: `lib/data/server.ts` and `lib/data/txs.ts` cannot be unit-tested directly

Both files mark several exports with Next.js's `"use cache"` directive (`getConfig`, `getLock`,
`getSatchelSnapshotStatic`, `getSatchelSnapshot`, `getContractFacts`, `getCleanHint`, `getActivity`, `getTxSource`,
...), each calling `cacheLife(...)`. Calling any of them from plain vitest throws:

```
Error: `cacheLife()` is only available with the `cacheComponents` config.
```

(confirmed by probing `getSatchelSnapshot("1")` and `getContractFacts()` directly in a throwaway test — both threw
immediately). This is **not a bug**: it's why the existing test suite already avoids these functions and instead
tests `buildSnapshot` (in `lib/data/snapshot.ts`, no cache directive) directly with an injected `DataSource`
(`test/unit/live-missing-contract.test.ts`). It does mean the five JSON/SVG API routes under `app/api/**` — which
all import from `server.ts` or `txs.ts` — have **no unit-test path at all**. The only way to exercise them is
through a running Next.js server, i.e. Playwright's `request` fixture against the built app. That's what
`test/e2e/api-routes.spec.ts` (added by this audit) does.

## Suite counts

| Suite | Before this audit | After this audit |
| --- | --- | --- |
| `@satchel/core` (`pnpm --filter @satchel/core test`) | 467 tests, 16 files | 467 tests, 16 files (no core changes: scope note below) |
| `web` unit (`pnpm --filter web test`) | 486 tests, 40 files | 531 tests, 43 files |
| `@satchel/tools` (`pnpm --filter @satchel/tools test:unit`) | 92 tests, 6 files (first run OOM-killed under concurrent-agent load, exit 137; a re-run in isolation was clean) | 92 tests, 6 files (unchanged) |
| `web` e2e (`CI=1 E2E_PORT=3332 pnpm --filter web test:e2e`) | ~232 tests (250 total minus the 18 new ones) | 250 tests, all passing, including the new `test/e2e/api-routes.spec.ts` (18 tests) |

All four counts above were captured by actually running the suites in this worktree on 2026-10-30, not estimated.

Core wasn't touched: its 467 tests across 16 files already have deep coverage (btc/evm/sol builders, clean-history
checker/gate, policy, fuzz) and the time budget went to the data layer, signing store and API routes instead, which
had larger, more concrete gaps (see below). If more time is available, `packages/core`'s clean-history NEAR-source
disagreement/merge paths (`mergeNearSnapshots` edge cases: 3+ sources where 2 agree, `near_disagree`,
`near_one_source` with `allowSingleSource` both ways) looked thin in a first read of `checker.ts` and would be the
next place to look.

## Module-by-module inventory (packages/core)

| Module | Test file(s) |
| --- | --- |
| `bytes.ts` | covered indirectly via btc/evm/sol/near tests; no dedicated unit file |
| `card/index.ts` (leather-hue colour math) | `test/card.test.ts` — **but see "Dead code found" below: unused by the actual product** |
| `chains/btc/*` (build, select, mempool, attach, tx) | `test/btc.test.ts`, fuzz (`test/fuzz/policy-fuzz.test.ts`), fixtures `kb30-btc-fanout.json`, `testnet4-esplora.json` |
| `chains/evm/*` (index, networks) | `test/evm.test.ts`, fixture `sepolia-rpc.json` |
| `chains/sol/*` | `test/sol.test.ts`, fixture `solana-devnet.json` |
| `clean-history/*` (checker, btc, evm, sol, gate, history, messages, sources, util) | `test/clean-history.test.ts` (35 `it`s), `test/gate.test.ts` (9), `test/review-sr01.test.ts` (6) |
| `derive/index.ts` | `test/derive.test.ts` |
| `format/index.ts` | `test/format.test.ts` |
| `near/*` (allowance, constants, market, mpc, sign-request) | `test/near.test.ts` (21), `test/allowance.test.ts` (13), `test/market.test.ts` (14) |
| `policy/*` (allowance, btc, evm, msg, rlp, sol, types) | `test/policy.test.ts` (10), `test/features-c1-c7.test.ts` (27), fuzz |
| full round-trip / sandbox | `test/e2e-local.test.ts` (opt-in-ish, part of default run), `test/network/live.network.test.ts` (opt-in, excluded by default — needs real testnet RPCs) |

### Dead code found: `packages/core/src/card/index.ts` (brand 1.0 leather hue)

`card/index.ts` computes a per-token leather hue in OKLCH ("Per-token leather hue, B-04") and is exported as
`@satchel/core/card`. It has its own test file (`test/card.test.ts`, 4 tests, all passing) and its own browser-bundle
budget entry. But grepping the whole of `apps/web/src` and `tools/` for its exports
(`tokenHue`, `LEATHER_HUE`, `oklchToHex`, `fnv1a32`, `BRAND_LEATHER_LIGHT`, `BRAND_SURFACE_NIGHT`) finds **zero
usages**. The actual NFT-media card (`/api/card/{id}.svg`, the current Satchel 2.0 "Sticker S" design, implemented in
`apps/web/src/lib/card-svg.ts`) does its own thing and never imports `@satchel/core/card`. This looks like a brand
1.0 ("Strap S, brass and leather") leftover that outlived the brand it supported: its doc comment still says
"Shared by CSS (inline custom properties) and the /api/card SVG", which is no longer true. Not a functional bug (it
breaks nothing, since nothing calls it) — flagging it as dead, tested code so a cleanup pass can remove both the
module and `test/card.test.ts` together, or confirm the design intends to resurrect per-token hue for something.

## Module-by-module inventory (apps/web/src/lib, scope only)

| Module | Test file(s) before this audit | Changed? |
| --- | --- | --- |
| `holdings.ts` | `test/unit/holdings.test.ts` | no |
| `overview.ts` | `test/unit/overview.test.ts` | no |
| `prices.ts` (parsers) | `test/unit/overview.test.ts` (parse1Click/parseCoinGecko + one fallback call) | **added `test/unit/prices-cache.test.ts`** — the memo/negative-cache TTL and in-flight dedup were untested (see below) |
| `chain-txs.ts` (parseMempool/parseBlockscout/parseSolana/parseInside, mergeTxs, filters) | `test/unit/chain-txs.test.ts` | no — already covers malformed/junk upstream shapes (see below) |
| `fund.ts` | `test/unit/fund.test.ts` | no |
| `address-book.ts` | `test/unit/address-book.test.ts` | **expanded**: detectKinds ambiguity, mainnet-shaped addresses, implicit NEAR, whitespace/empty, separator edge cases |
| `nav-pending.ts` (`classify`) | none (only exercised through `test/e2e/nav-feedback.spec.ts`, a browser test) | **added `test/unit/nav-pending.test.ts`** |
| `view.ts` | covered indirectly via `test/unit/market.test.ts`, `multichain.test.ts` | no |
| `format.ts` (web's own) | covered indirectly via several files (`config-copy-theme`, `multichain`, `allowance`, `contract-outcome-format`, `clean-view`, `satchel-object`) | no |
| `evm-networks.ts` | covered indirectly via `multichain.test.ts`, `allowance.test.ts`, `chain-txs.test.ts` | no |
| `validate.ts` | covered indirectly via `sol-send.test.ts`; EVM/BTC/NEAR validators not obviously unit-tested on their own — see gaps | no (not reached this pass; see below) |
| `lib/data/{snapshot,source,clean}.ts` | `clean-history-fixtures.test.ts`, `fixture-switches.test.ts`, `live-missing-contract.test.ts` | no |
| `lib/data/{server,txs}.ts` ("use cache" wrappers) | **cannot be unit-tested** (see constraint above) | **added `test/e2e/api-routes.spec.ts`** (Playwright, hits the real routes) |
| `lib/chains/send.ts` (prepareSend) | `test/unit/sol-send.test.ts`, `test/unit/evm-nonce-gap.test.ts`, `test/unit/sweep.test.ts` | no (BTC coin-selection via `send.ts`'s fixture path looked thin but core's own `btc.test.ts` covers `buildBtcSend` directly and thoroughly; didn't duplicate it here) |
| `lib/signing/machine.ts` | `test/unit/signing-machine.test.ts` (transitions, illegal-transition handling inside the machine) | no |
| `lib/signing/runner.ts` | `test/unit/signing-runner.test.ts` | no |
| `lib/signing/store.ts` (the persisted intent store) | **none** — only exercised indirectly via the runner test | **added `test/unit/signing-store.test.ts`** |
| `lib/near/*` | `test/unit/contract-outcome-format.test.ts`, `test/unit/track-tx.test.ts` | no |

## API routes (`apps/web/src/app/api/**`)

No test exercised any of these five routes before this audit (confirmed by grepping `test/unit` and `test/e2e` for
`app/api` imports or path hits — none found; `judge.spec.ts` and `transactions.spec.ts` hit *pages*, and
`transactions.spec.ts`'s "endpoint" test calls `getTxSource`-adjacent behaviour through the page, not the route
directly). Added `apps/web/test/e2e/api-routes.spec.ts` (18 tests) covering:

| Route | Covered now |
| --- | --- |
| `GET /api/contract` | 200, JSON shape (lock fields present), 60 s cache header |
| `GET /api/satchels/[id]` | valid existing id (200, full snapshot shape, 15 s cache header); syntactically-valid-but-unknown id (404, `token_id` echoed); every malformed id (`abc`, `0`, `-1`, `1.5`, `1e9`, leading zero, empty, leading/trailing space, non-ASCII digit, >10-digit) → 400, never 404/500; an empty path segment 404s at the Next.js routing layer, not this handler |
| `GET /api/satchels/[id]/txs` | no `?source` → list of sources (not a 400); known source on valid id → 200 + 30 s cache header; unknown `?source` → 400 listing valid sources; malformed id short-circuits before the source check; **a non-existent-but-well-formed id still returns 200 with data** (see finding below, not a bug) |
| `GET /api/card/[file]` | valid id → 200 SVG + 60 s cache header; unknown id → 404; wrong extension / non-numeric / negative / double-extension filename → 404 (the route's own regex, before any data read) |
| `GET /api/clean-history/[id]` | valid id → 200, `hint: true`, 15 s cache header; unknown id → 404; malformed id → 400 |

### Finding (not a bug): `/api/satchels/[id]/txs` never checks whether the Satchel exists

`getTxSource` derives the three chain addresses straight from the numeric id (`satchelAddresses(id)`) and, in fixture
mode, `fixtureTxs(id)` happily synthesizes a plausible-looking transaction history for **any** numeric id, minted or
not (`n = Number(id) || 1`, then builds rows keyed off that). So `GET /api/satchels/999999/txs?source=bitcoin` (a
token that does not exist in the fixture world) returns `200 { ok: true, txs: [...] }` with non-empty synthetic data
— it never 404s the way `/api/satchels/[id]` does. In **live** mode this degrades gracefully (a derived address for
an unminted token is still a valid-looking address; the real explorer would just come back empty for it, so the
behavior converges to `{ ok: true, txs: [] }`), so this isn't a security or correctness bug — but it is a genuine
behavioral asymmetry between the two routes worth knowing about, especially since it's easy to assume (incorrectly)
that every `/api/satchels/[id]/*` route 404s the same way for an unknown id. Documented and pinned by a test rather
than treated as a defect.

## Edge cases explored, with result

### Prices (`lib/prices.ts`)

- parse1Click / parseCoinGecko: missing coin, non-numeric price, zero price, null/garbage input — **covered before**
  (`overview.test.ts`).
- 1Click failing, CoinGecko succeeding; both failing → null — **covered before**.
- 60 s success memo actually suppresses a second network call within the window, and refetches once past it —
  **added now** (`prices-cache.test.ts`), using the function's own `now` parameter to probe the TTL boundary without
  fake timers (real `Date.now()` is still what gets written into the memo, so the test anchors on a `t0` captured
  right before the real call and offsets from it).
- A failed fetch is cached for only ~10 s (so a blip can't hide the estimate for a whole minute), unlike a success's
  full 60 s — **added now**, and confirmed the asymmetry is real (a call 15 s after a failure refetches; the
  equivalent offset after a success would still be served from cache).
- Two concurrent callers (no await between them) share one in-flight request rather than doubling the network calls
  — **added now**.

### Address book / `detectKinds` (`lib/address-book.ts`)

- Each chain's canonical format — **covered before**.
- Genuinely ambiguous input: a base58 string shaped like both a legacy BTC testnet address (`m`/`n`/`2` prefix,
  26–35 chars) and a valid-shaped SOL address (32–44 chars) — **added now**; confirmed `detectKinds` returns
  `["btc", "sol"]` for such a string (by construction: `n4BJRYfnu29GPWdksz7EMUbiqx5CKSZgo`), which is intentional per
  the function's own doc comment ("best guess first, the add form lets the user pick when it's ambiguous").
- A **mainnet**-shaped bech32 BTC address (`bc1...`) is accepted into the `"btc"` kind with no mainnet/testnet
  distinction — **added now**, confirmed, and is **not a bug**: `detectKinds` is a label guesser for the address
  book UI, not a network gate. The real gate (`validateBtc` in `lib/validate.ts`) explicitly rejects `bc1`/`1`/`3`
  prefixes at send time (`copy.send.val.btcMainnet`), so a mainnet-shaped address can be *saved* with a "btc" label
  but can never be *sent to* without being refused first.
- Bare 64-hex NEAR implicit account — **added now**, covered.
- Whitespace trimming and empty-string rejection — **added now**.
- A NEAR-shaped string with a leading/trailing separator (`-bob.testnet`, `bob-.testnet`) is correctly rejected —
  **added now**.

### Transactions parsers (`lib/chain-txs.ts`)

- Already well covered before this audit: a real send/receive shape for each of mempool.space, Blockscout and the
  Solana JSON-RPC batch, confirmed vs. pending, and `parseMempool({ error: 1 }, BTC)` / similarly-garbage inputs for
  the others returning `[]` rather than throwing (`"ignores junk"` tests already present). Did not duplicate this;
  spent the time budget on modules with no coverage instead.

### The intent store (`lib/signing/store.ts`)

- `isPendingIntent`'s shape filter: valid shape accepted; `null`/`undefined`/primitives/`{}`/wrong `chain`/wrong
  field types all rejected — **added now** (no prior dedicated test for this function in isolation).
- Basic CRUD (`upsert` insert vs. replace-by-id, `patch` merge and its no-op-on-unknown-id return value, `remove`,
  `forToken` filtering) — **added now**.
- `dispatch` routes through `transition()`; an **illegal/no-op transition is silently absorbed**: no re-persist, no
  listener notification — **added now**, and confirmed this is deliberate (the store's own code: `if (next !== cur)`
  guards the write).
- **Resume on load**: a store constructed against a KV that already holds a persisted, well-shaped intent resumes it
  exactly — **added now** (previously only implicitly exercised via the runner test, never directly).
- A persisted array containing a mix of well-shaped and garbage entries (`{garbage:true}`, `null`, a string, a
  number) resumes keeping only the well-shaped ones, never throwing — **added now**.
- Invalid JSON, and a non-array top-level value, both resume as an empty list rather than throwing — **added now**.
- `reload()` (the cross-tab-storage-event path) re-reads the backing KV and notifies subscribers — **added now**,
  simulated by writing to the same in-memory KV object "from another tab" and calling `reload()` directly (the
  `window.addEventListener("storage", ...)` wiring itself lives in the `intentStore()` singleton wrapper, not in
  `createIntentStore`, and is a one-liner not worth a browser-level test here — the UI agent's e2e suite is a better
  place for that, if it isn't already covered by `nav-feedback.spec.ts`'s popup-reopen tests).
- Subscribe/unsubscribe: every mutating call notifies exactly once; unsubscribing stops further notifications —
  **added now**.

### Navigation feedback classifier (`lib/nav-pending.ts`)

- `classify()` had zero unit coverage (only reached through a Playwright spec). Added full coverage: every flow slug
  from the same vs. a different satchel, the sale `?list=1` special case (same-satchel only; `list=0`/garbage treated
  as the tab, not the flow), every tab, the bare-satchel-route "wallet tab" default (same-satchel only — a
  cross-satchel bare route is a **page** transition, confirmed by reading the source's `same &&` guard, not
  intuition), the "closing a popup back to wallet suppresses feedback" special case (same-satchel only; a
  cross-satchel "from" is NOT suppressed because `same` short-circuits first), every top-level route including
  `/fund/:id`'s id extraction and `/claim/:id`'s deliberate non-extraction, an unmatched top-level route falling back
  to the generic `"page"` name, a non-numeric `/s/:id` segment falling through to the top-level branch entirely, and
  token id `"0"` being treated as a valid id (no falsy-string bug in the regex path).
- Two of my own initial test expectations were wrong on the first run (I'd assumed `from="/s/9"` with a different
  satchel id would still land on the "wallet tab" + "suppressed" branches) — the actual code gates both behind
  `same` (`fromM?.[1] === id`), so a different-satchel `from` always falls through to the generic page-transition
  branch. Fixed the test expectations to match the real, read code rather than loosening the assertions.

### API routes — see the table above.

## Bugs found

**None that warranted a `BUG:`-skipped test.** The one surprising behavior found (the `/txs` route never 404ing for
a non-existent id) was investigated, confirmed as a deliberate consequence of address derivation rather than a
lookup, and judged not to be a defect — documented above and pinned by a passing test instead of a skipped one.

No live/read-only network checks against public testnet APIs were used in this audit; everything above was
exercised against the fixture-mode in-memory data (per the brief, this was allowed but not needed to find or
confirm anything here).

## What remains untested, and why

- **`lib/validate.ts`'s `validateEvm` / `validateBtc` / `validateSol` / `validateNearAccount`** are not unit-tested
  in isolation in this pass (only reached indirectly, e.g. through `sol-send.test.ts`). They're pure-ish functions
  (BTC and SOL lazy-load a core builder/parser but are otherwise synchronous) and look like good unit-test targets —
  flagged for a follow-up pass rather than rushed here, since getting the EVM checksum-warning branch and the BTC
  mainnet-prefix rejection right deserves focused attention rather than being bolted on at the end of this session.
- **`mergeNearSnapshots` (packages/core clean-history checker)**: the ≥2-RPC-agreement merge logic's less-common
  paths (3+ sources with a minority disagreeing, `records_incomplete`, the `allowSingleSource` policy flag toggling
  the `near_one_source` rejection on and off) weren't traced test-by-test against `gate.test.ts` /
  `clean-history.test.ts` in this pass. Given `checker.ts` is the single most security-relevant file in scope (it
  backs the buyer-facing clean-history gate) and already has 35+9+6 tests across three files, a dedicated follow-up
  should diff its branches against those three files line by line rather than guess from a quick read, which is more
  than this session's remaining budget allowed for safely.
- **`packages/core/src/bytes.ts`** has no dedicated test file; it's small and only reached indirectly. Low risk, not
  pursued.
- **Live/network-dependent paths** (`test/network/live.network.test.ts` in core, and anything that would need a real
  mempool.space/Blockscout/Solana devnet RPC/FastNEAR response) were not run live in this session — fixture mode
  covers the parsing logic, and CLAUDE.md's hard rules (no signing, read-only testnet calls only "if useful") made
  that an easy call to skip given the time available.
- **`apps/web/src/lib/signing/runner.ts` and `retry.ts`** already have a dedicated runner test
  (`signing-runner.test.ts`); `retry.ts`'s own branches weren't independently diffed against that file's coverage in
  this pass.

## Round two

A follow-up pass (2026-10-31, worktree `test/core2`) closing the five items the first pass flagged above. Counts
below were measured by actually running each suite in the worktree, not estimated.

| Suite | After round one | After round two |
| --- | --- | --- |
| `@satchel/core` (`pnpm --filter @satchel/core test`) | 467 tests, 16 files | **540 tests, 18 files** (+2 files: `near-merge.test.ts`, `bytes.test.ts`) |
| `web` unit (`pnpm --filter web test`) | 531 tests, 43 files | **601 tests, 46 files** (+3 files: `validate.test.ts`, `retry.test.ts`, and the WIP commit's file landing as a real addition) |
| `@satchel/tools` (`pnpm --filter @satchel/tools test:unit`) | 92 tests, 6 files | 92 tests, 6 files (unchanged; out of this pass's scope) |
| typecheck (`pnpm --filter web typecheck`) | clean | clean |
| lint (`pnpm --filter web lint`) | clean | clean |

### Target 1: `mergeNearSnapshots` (packages/core clean-history checker)

Added `packages/core/test/near-merge.test.ts` (19 tests), calling `mergeNearSnapshots` directly rather than only
through `checkCleanHistory`, so every branch is pinned independently of the gate logic layered on top. Diffed
against the existing coverage in `clean-history.test.ts` (which only exercised: 2-source agree, 2-source disagree,
records_incomplete with a short count, and both-sources-down) before adding anything, to avoid duplicating what was
already there.

New branches covered:

- **Zero sources** (empty array, and an array of only errors) → `near_unavailable`.
- **3+ sources, 2 agree and 1 minority disagrees** → still `near_disagree`, never "majority wins" — this is the
  wrong-direction case that matters most here: the merge must fail closed on *any* disagreement, not silently drop
  the odd one out.
- **3+ sources, all agree** → `ok`, `sources: 3` (not capped at 2 the way the old tests, which only ever used
  exactly 2 sources, could have left implicit).
- **3 sources, 1 errors, 2 agree** → `ok`, `sources: 2` (errored sources don't count toward the total).
- **`records_incomplete`**, three distinct shapes beyond the one existing "too few records" test: non-contiguous
  seqs (0 and 2, missing 1), a duplicate seq (two seq-0 records, no seq-1), and confirmation that the completeness
  check is **order-independent** (out-of-order records that do cover every seq are accepted).
- **`near_one_source`**: a single readable source is rejected when `allowSingleSource` is `false` (both as the only
  array entry, and as the single survivor after the other source errors) — this branch had zero coverage before;
  the only existing single-source test used the policy default (`allowSingleSource: true`, the "1 of 2 sources" UX),
  so the actual rejecting behavior of the flag had never been exercised.
- **Priority ordering**: when a pair of snapshots is both disagreeing *and* individually incomplete,
  `near_disagree` wins (matches the function's own branch order — disagreement is checked before completeness).
- **Fingerprint sensitivity**: confirmed `status`/`signature` are ignored (the function's documented intent — they
  legitimately lag between RPCs) while `height`, `mpcKeys`, and `accessKeyCount` do trigger disagreement, and that a
  code hash differing only in letter case is normalized and does **not** count as disagreement (via
  `normalizeCodeHash`).

No bug found: every branch already failed closed in the safe direction. The code was correct; it was just untested
in isolation.

### Target 2: `apps/web/src/lib/validate.ts`

Added `apps/web/test/unit/validate.test.ts` (41 tests) covering `validateEvm`, `validateBtc`, `validateSol` and
`validateNearAccount` directly — previously only reached indirectly through `sol-send.test.ts` and
`address-book.test.ts`. Covers: EVM checksum right/wrong/absent (all-lower, all-upper, correct mixed-case, a
single-letter-case typo relative to the real checksum), the zero address, self-send (case-insensitive), BTC mainnet
vs. testnet prefixes across bech32/legacy/P2SH, every BTC testnet script type (bech32 `tb1q`, bech32m taproot
`tb1p`, legacy P2PKH `m`/`n`, P2SH `2`), SOL on-curve vs. off-curve (PDA) addresses and base58-alphabet rejection,
NEAR named vs. 64-hex implicit accounts, the three NEAR reserved-account rejections (self, the contract, the MPC
signer) including the `self: null` (no wallet connected) case, whitespace trimming, unicode lookalikes (full-width
digits, a Cyrillic homoglyph), and empty/boundary-length input on every validator.

This file was authored, lost to a session crash, and restored as a WIP commit by the coordinator with 4 failing
tests (40 total). Fixed before committing further — **all four were bad test fixtures/expectations, not
`validate.ts` bugs**:

- A fabricated taproot address (`tb1p0xlxv…`) that didn't actually decode as valid bech32m — replaced with a real
  one generated from a random valid secp256k1-adjacent x-only pubkey via `bitcoinjs-lib`'s `p2tr` payment and
  round-tripped through `bitcoin.address.toOutputScript` to confirm it decodes.
- A Solana address labelled "a real on-curve devnet wallet address" that was actually **off-curve** (a PDA),
  contradicting its own comment and the two assertions relying on it — replaced with a freshly generated Ed25519
  keypair's pubkey (`@solana/web3.js`'s `Keypair.generate()`), on-curve by construction.
- An uppercase `"0X" + "0".repeat(40)` zero-address case expected to hit the zero-address message — it actually
  fails the format check first, since `validateEvm`'s regex literal `0x` is case-sensitive (only a lowercase `0x`
  prefix is accepted at all; `0X...` is simply malformed input). Split into two tests: the real zero-address case
  (lowercase `0x`) and a new test pinning the `0X` case's actual outcome (a format error), with a comment explaining
  why.

All 41 tests pass after the fix. No `validate.ts` bug was found — the bad fixtures were artifacts of the test
authoring, not the code under test; each was checked by actually decoding/generating the real bytes rather than
guessing a string.

### Target 3: `apps/web/src/lib/signing/retry.ts`

Added `apps/web/test/unit/retry.test.ts` (25 tests). `signing-runner.test.ts` already covered the headline cases
(EVM nonce reuse + fee bump on `timed_out`, BTC input reuse, basic same-chain blocking, the fee-bump and
input-set-comparison helpers on a couple of values) — diffed against that file first and added only what it didn't
reach:

- **`blockingIntent`**: a different `tokenId` never blocks even with everything else matching; a **message intent
  (C7) never blocks** regardless of stage (untested before — message intents use no nonce and no coin, so this is a
  real behavioral guarantee, not an incidental pass); every one of the seven `SPENDABLE_UNSENT` stages blocks
  individually (the old test only tried `signed_not_sent` and `timed_out`); the non-blocking stages including SOL's
  `expired` (which deliberately does *not* block — a dead blockhash can't be spent, so a fresh send is safe); the
  `failed`-with-a-signature edge (`failed` alone doesn't block, but `failed` with at least one non-null signature
  does, since a verify failure after the MPC already signed still leaves a usable signature in the wild); per-EVM
  chain-id scoping (C3) in both directions — an intent on chain 42161 doesn't block a Sepolia send and vice versa —
  plus the "no `evmChainId` recorded = treat as Sepolia" default and the "caller passes no `evmChainId` = match any
  EVM intent regardless of its chain" case; a `replaces` chain only supersedes its exact target, not other
  independently-blocking intents; first-match-wins ordering; and an empty list never blocking.
- **`retryPlan`**: `bumpFees` checked against *every* stage, not just two (true only for `signed_not_sent`,
  `unknown`, `timed_out`; false for everything else including `failed`); the BTC "no inputs to retry" throw (both an
  entirely absent `btc` payload and one with an empty `inputs` array); BTC's `bumpFees` always `false` regardless of
  stage; SOL's `solWaitForExpiry` (true unless the intent is already `expired`) and `solNotBefore` (carries the
  prior `lastValidBlockHeight` through, or `undefined` when there was no prior SOL payload) — none of this SOL
  branch had any coverage before.
- **`bumpEvmFee`**: the ceiling-rounding behavior on values that don't divide evenly by 10 (`1n → 2n`, not `1n`,
  which a naive floor would produce and under-bump below the real 110%), `0n`, and a gwei-scale value.
- **`sameInputSet`**: two empty sets, a length mismatch with overlapping elements, and a same-length-but-not-same-set
  case created by a duplicate in one array (pins the actual `Set`-based implementation's behavior rather than an
  idealized multiset comparison, since the function's own doc comment only promises "order-insensitive", not
  "multiset-exact").

No bug found; every branch behaved as the code's own comments describe.

### Target 4: `packages/core/src/bytes.ts`

Added `packages/core/test/bytes.test.ts` (49 tests) — the file had zero dedicated coverage before, only reached
indirectly through btc/evm/sol/near tests that happen to call `toHex`/`hexToBytesStrict`/etc. as a side effect.
Covers every exported function: `hexToBytesStrict`'s strictness (0x/0X prefix stripped only when leading, odd
length rejected, non-hex rejected including a `0x` appearing mid-string, whitespace rejected, the empty string and
bare `"0x"` both decoding to zero bytes); `toHex`/`to0x`/`strip0x` round-trips; `concatBytes` with zero parts, empty
parts, and non-mutation of its inputs; `equalBytes` (length mismatch, a differing byte, two empty arrays);
`reverseBytes` (non-mutation, empty and single-byte inputs); `u32le`/`u64le`/`readU32le`/`readU64le` — little-endian
byte order, range checks (negative, non-integer, over the max), offset handling, and reading past the end of the
buffer, including a view with a non-zero `byteOffset` into a shared `ArrayBuffer` (confirms `readU32le` goes through
`b.byteOffset` rather than assuming the view starts at 0, which the existing indirect call sites never happened to
exercise); `bytesToBigIntBE`/`bigIntToBytesBE` round-trips across several byte-count boundaries, the minimal
(no-leading-zero) encoding, and the negative-bigint throw; `utf8` on ASCII, a multi-byte character, and the empty
string; and `base64ToBytes`/`bytesToBase64` round-trips plus two known vectors (`"hello"` ↔ `"aGVsbG8="`).

No bug found.

### Target 5: read-only live API smoke against dev2

Built the app in live mode (`next build` with the committed `apps/web/.env.production`: `NEXT_PUBLIC_DATA_MODE=live`,
`NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet`) and ran it with `next start -p 3332` in this worktree. All
calls were plain `GET`s (FastNEAR/dRPC reads only, no `rpc.testnet.near.org`, no transactions, no wallet). Not added
as an automated test — it depends on live testnet/FastNEAR/mempool.space/Solana-devnet availability, which the
existing fixture-mode e2e suite exists precisely to avoid depending on.

| Call | Result |
| --- | --- |
| `GET /api/contract` | 200. `code_hash_hex` and `expected_code_hash` both `9dd652867c96bb4aa40bd1db93077c19223d94503d45e7f56c456049d1ebd9e3`, `code_matches: true`. `account_exists: true`, `locked: false` (dev role, 1 access key — expected pre-birth), `mpc_version: "3.18.0"`, `next_token_id: 5` (4 minted Satchels, matching the "4 Satchels" note in the top-level README). |
| `GET /api/satchels/1` | 200, full snapshot shape: `sig_count: 8`, real BTC/EVM/SOL balances and addresses, live USD prices (source `1click`), `lock.code_matches: true`. |
| `GET /api/satchels/999` | 404, `{"error":"Satchel #999 doesn't exist","token_id":"999"}` — as documented, unlike `/txs` below. |
| `GET /api/satchels/abc` | 400, `{"error":"token id must be a decimal integer"}`. |
| `GET /api/satchels/1/txs` (no `?source`) | 200, `{"sources":["bitcoin","sepolia","base","optimism","solana","near"]}` — note the source key is `sepolia`/`base`/`optimism`, not `ethereum`; a request with `?source=ethereum` correctly 400s (`"unknown source"`). |
| `GET /api/satchels/1/txs?source=bitcoin` | 200, 2 real testnet4 transactions (confirmed, with mempool.space URLs). |
| `GET /api/satchels/1/txs?source=sepolia` | 200, real Sepolia transactions (confirmed, etherscan URLs, real fees). |
| `GET /api/satchels/1/txs?source=solana` | 200, 2 real devnet transactions (confirmed, explorer URLs). |
| `GET /api/satchels/1/txs?source=base`, `?source=optimism`, `?source=near` | 200, each `{"txs":[]}` — no activity recorded yet on those sources for token 1, served cleanly rather than erroring. |
| `GET /api/satchels/999/txs?source=bitcoin` | 200, `{"txs":[]}` — confirms round one's documented finding (this route never 404s for an unminted id) degrades exactly as described in **live** mode: a derived address with no real chain history just comes back empty, not an error. |
| `GET /api/clean-history/1` | 200. `aggregate: "blocked"` (not "clean") — dev2 has a mix of spent/unused/unknown items across chains right now, which is the real, honest state of a dev contract mid-sprint, not a bug; `one_of_two: true` reflects the policy's "1 of 2 sources" allowance; `checks` lists the dev-role lock/code skip as an explicit warning rather than hiding it. |
| `GET /api/card/1.svg` | 200. |

No upstream failures observed (no FastNEAR/dRPC/mempool.space/Solana-devnet timeouts during this pass). No bug
found; every shape matched what round one's fixture-mode tests predicted it should.
