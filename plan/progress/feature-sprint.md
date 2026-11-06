# Feature sprint tracker (started 2026-10-29)

> **Status (2026-11-04): sprint tracker, current.** The feature sprint ran 2026-10-29 → about 11-02. Every chosen feature is merged and pushed (C1–C7, A1–A3); A4 was removed on 2026-10-30. The interface specs are `docs/specs/*.md`; the security review of the sprint diff is `docs/security/sprint-review.md`. Commit ids below are as of the sprint.

> **Scope:** Razvan chose A1, A2, A3, A4 and C1–C7 from `plan/feature-ideas.md` (not A5, A6 or A7).
> **Live log:** `plan/progress/sprint-log.md`. Every agent appends a line per milestone.
> **Status:** the orchestrator updates the table below as work lands.

## Hard dates and the cut rule
- **Contract freeze: Nov 9** (rc rehearsal). **Final keyless birth: Nov 10**, after which the contract can never
  change.
- **Cut rule:** a contract feature that isn't merged into `main` **by Nov 8, 12:00 UTC**, with green unit, sandbox
  and fuzz runs and a closed security review, stays on its branch. The final contract ships without it.
- App-only features (A*) can land until Nov 13.

## Team
| Agent | Role definition | Model / effort | Features | Branch / worktree |
|---|---|---|---|---|
| contract-sign | `satchel-contract` | Opus, high | C1, C2, C3, C7 (signing and parsing, TS policy mirror, vectors, checker) | worktree, `feat/contract-sign` |
| contract-allowance | `satchel-contract` | Opus, high | C5 | worktree, `feat/contract-allowance` |
| contract-market | `satchel-contract` | Opus, high | C4, C6 | worktree, `feat/contract-market` |
| web-share | `satchel-web` | Sonnet, medium | A1, A4 | worktree, `feat/web-share` |
| web-flows | `satchel-web` | Sonnet, medium | A2, A3 | worktree, `feat/web-flows` |
| *(phase 2)* web UIs for C2–C7 | `satchel-web` | Sonnet, medium | after each contract interface spec lands | — |
| *(Nov 6–8)* security review | `satchel-reviewer` | Opus, high | the merged contract diff | — |
| orchestrator (this session) | — | Opus | merges, full suites, the testnet e2e on `dev2.satchelhq.testnet`, this tracker | `main` |

## Status
| ID | Feature | Owner | Status | Notes |
|---|---|---|---|---|
| A1 | A social card per Satchel (OG/Twitter image) | web-share | **merged + pushed** (735699a, on origin since ffd3a42) | `/s/[id]` opengraph + twitter images, branded fallback; unit + 3 Playwright |
| A2 | Give by link (claim link) | web-flows | **merged + pushed** (329af75) | `/s/[id]/give-link`, `/claim` (fragment-only secret, local signer); batch fund + nft_transfer with fallback. Needs a real-wallet test |
| A3 | Empty the Satchel | web-flows | **merged + pushed** (329af75) | `/s/[id]/empty`; per-chain drain, BTC auto-batches ≤10 inputs; hidden while listed |
| A4 | Request coins (BIP-21 / EIP-681 / Solana Pay) | web-share | **removed 2026-10-30 (Razvan)** | was shipped in 735699a; taken out of Add coins as unneeded. The sheet keeps the address QR, Copy and Share. Recover from git history if wanted |
| C1 | `history_digest` view | contract-sign | **contract merged + pushed** (2094200) | SHA-256 over immutable record fields; 3 encoders agree on `vectors/history.json`; ~2,500-record view gas limit |
| C2 | ERC-20 USDC transfers on EVM | contract-sign → web-sign (UI) | **contract + UI merged + pushed** (2f2cda8) | USDC balances and sends per network; ETH-for-fee guard; USDC rows in Activity and clean history |
| C3 | More EVM testnets | contract-sign → web-sign (UI) | **contract + UI merged + pushed** (2f2cda8) | per-network balances (server HTML), network picker in Send and Add coins, per-chain nonce check, EIP-681 `@chainId`; L-05 fixed (`evmByChain` in the live checker) |
| C4 | Offers | contract-market → web-market (UI) | **done: contract + M-01 fix + UI + gaps merged and pushed** | offer sheet with NEAR/USDC (storage prepay), accept/cancel, My offers, storage-credit withdraw, Unlisted Satchels on /market; live on dev2: offer, accept and cancel PASS |
| C5 | Spending allowance (delegated signer) | contract-allowance → web-allowance (UI) | **done: contract + UI + caps merged and pushed** | public allowance facts (no JS), owner add/revoke (max 4 accounts, max 8 caps), caps for BTC, SOL, ETH on 4 networks and USDC on 4 networks; delegate banner lists every cap; cap-gated Send; live on dev2: grant, within-cap, over-cap and revoke PASS |
| C6 | NEAR-side assets inside | contract-market → web-market (UI) | **done: contract + M-01 fix + UI + gaps merged and pushed** | NEAR, USDC and wNEAR inside (deposit with prepay, owner withdraw, blocked while listed); live on dev2: deposit and withdraw PASS. Ops: register the contract at wrap.testnet (runbook updated) |
| C7 | Message signing (EIP-191; Solana off-chain format) | contract-sign → web-sign (UI) | **contract + UI merged + pushed** (2f2cda8) | `/s/[id]/sign`: escaped text + hex + digest flag (L-02, SR-04), live signature verify, message deposit fixed; "Messages (n)" never blocks Buy |

## Interface decisions fixed up front (so parallel branches agree)
Each contract agent first commits `docs/specs/<id>.md` with its exact method signatures and JSON shapes, and logs
it. Phase-2 UI work builds against those specs.

- **C1:** `history_digest(token_id) -> Option<{ sig_count, digest_hex }>`. The digest is SHA-256 over the **immutable**
  fields of the records in `seq` order, never over `status`, which changes in the callback.
- **C2:** an EVM tx with non-empty `data` is allowed only if:
  - the data is exactly `transfer(address,uint256)` (selector `a9059cbb`, 68 bytes);
  - `value == 0`;
  - `to` is on a **hard-coded per-chain token allowlist** (Circle testnet USDC; check the addresses on-chain,
    read-only).

  The record's `detail` names the token, recipient and amount. Clean history needs no new rule (the nonce rule).
- **C3:**
  - Chain ids: Sepolia 11155111, Base Sepolia 84532, Arbitrum Sepolia 421614, OP Sepolia 11155420.
  - The nonce-gap rule (D-43) applies **per chain id**.
  - The checker queries two providers per chain.
  - The address is the same on every chain.
- **C7:**
  - EVM `personal_sign` only: the contract builds the EIP-191 prefix itself, and the message is ≤ 1024 bytes.
  - Solana: only the off-chain message format (`\xffsolana offchain` header), which can never parse as a
    transaction.
  - Never EIP-712. BIP-322 is optional and only if it's simple.
  - Message records are a separate kind; the checker shows them but they never block a sale.
- **C5:**
  - Methods: `set_allowance(token_id, delegate, caps, expires_at_ms?)` and `revoke_allowance`, owner only, 1 yocto.
  - Caps per chain per rolling 24 h, taken from the parsed amounts. Change back to the Satchel's own address
    doesn't count. ERC-20 has its own cap.
  - A delegate may only `sign_for`: never list, transfer or withdraw.
  - **Allowances are cleared on every transfer and sale.**
  - Delegate records show their requester.
  - Listing pauses delegated signing too.
- **C4:**
  - `make_offer(token_id, expected_sig_count, expires_at_ms)`: NEAR attached, or USDC through `ft_on_transfer`
    with an offer message.
  - `cancel_offer` (by the offerer; anyone after expiry, refund to the offerer).
  - `accept_offer(offer_id)` (owner, 1 yocto). It requires:
    - `sig_count == expected_sig_count`;
    - the existing quiet-period rule;
    - for C6, the inside-assets epoch unchanged.

    It pays through the existing payout and proceeds path.
- **C6:**
  - Deposits: `deposit_near(token_id)` (anyone, payable), and NEP-141 deposits through `ft_on_transfer` with
    `{deposit: token_id}` (allowlisted tokens only).
  - Withdrawals: `withdraw_near` and `withdraw_ft` (owner, 1 yocto), **blocked while listed**. Each withdrawal bumps
    an `inside_epoch` that offers bind to.
  - The balances belong to the token, so they move with transfer and sale.
- **Merging:** each branch keeps its new state in its own module, with new `StorageKey` variants **appended at the
  end**; the orchestrator resolves the order when merging. No branch changes existing method signatures except
  where a spec above says so.

## Integration log (orchestrator)
- 2026-10-29: sprint set up: role definitions in `.claude/agents/`, this tracker, the log, and five agents spawned in
  worktrees.
- 2026-10-29: the role definitions only load at session start, so this run spawns `general-purpose` agents with the
  model set per spawn (Opus for the 3 contract agents, Sonnet for the 2 web agents). Each reads its role file
  first. Effort is inherited from the session in this run; the `effort:` in the role files applies from the next
  session.
- 2026-10-29 14:55Z: the previous session ended while the 5 agents were still reading. They had no commits and no
  changes, so nothing was lost. The empty worktrees and branches were removed, and the agents were respawned under
  the now-loaded role definitions (`satchel-contract` Opus/high, `satchel-web` Sonnet/medium). They are told to
  commit WIP at every milestone, so a session end can't lose work again.
- 2026-10-29 15:27Z: all three contract specs are committed. Phase-2 UI agents start once each contract branch's TS mirror (core) is final, to avoid rework.
- 15:55Z: merged `feat/web-share` (A1, A4) into main (735699a): web unit 366, Playwright 144/144, tsc and lint clean. **Push to origin was blocked**: pushes need Razvan's explicit yes (CLAUDE.md rule 2), so main stays local until he confirms.
- 16:00Z: merged `feat/contract-allowance` (C5) into main (fafcc55): contract unit 115, core 359, tools 72, vectors agree; the sandbox run on merged main is in progress. Sent the merge notes to contract-market and contract-sign. Spawned web-allowance (Sonnet) for the C5 UI from fafcc55.
- 16:00Z: Razvan allowed agents to push to the private repo without asking; main pushed (ffd3a42).
- 16:04Z: the session restarted again. All work up to the stop was committed:
  - contract-sign at 2e679df;
  - contract-market at 1469362;
  - web-flows at 7a04ca0;
  - ui-allowance had no commits yet.

  The four agents were resumed from their transcripts, and the sandbox run on main was restarted. The finished web-share and contract-allowance worktrees were removed; their branches are merged.
- 16:35Z: merged main (A1, A4, C5) verified: sandbox 91/91, wasm 329,320 B `e7ded724…`, INV-22 OK.
- 16:55Z: merged `feat/web-flows` (A2, A3) into main (329af75). One import conflict in ReceiveSheet was resolved; web unit 379, Playwright 161/161, typecheck and lint clean. Pushed.
- 17:05Z: merged `feat/contract-market` (C4, C6) into main (2dc4fa6), clean, since the branch had already merged C5: contract unit 142, core 371, tools 72. The branch-side wasm was 403,886 B `f5527f72…`; the sandbox run on main is in progress. Spawned web-market (Sonnet) for the C4/C6 UI from 2dc4fa6. Asked contract-sign to merge main into its branch and resolve the StorageKey order.
- 16:40Z: session restart #3:
  - contract-sign was mid-merge of main into `feat/contract-sign-on-main`;
  - ui-allowance had its data layer committed (99f010e) plus uncommitted copy;
  - ui-market had no commits.

  All three were resumed. main's contract/tests/core tree is identical to the tested contract-market branch (sandbox 107/107), so main was pushed (eecd3a3); a confirmation sandbox run is in progress.
- 16:50Z: confirmation run on main (A1–A4, C4, C5, C6): sandbox 107/107, web unit 379, web typecheck clean.
- 17:00Z: merged `feat/contract-sign` (C1, C2, C3, C7) into main (2094200), clean, since the branch had already merged main: contract unit 172, core 459, tools 72 with all 7 vector files OK, web unit 379, typecheck OK. Pushed. **All seven contract features are now on main**; the merged wasm is 422,562 B `bd5d8e01…` (the agent's build).
- 17:05Z: a Claude authentication outage stopped web-sign, web-market and web-allowance, and two spawns (reviewer, docs) failed on worktree races. Empty worktrees were removed; web-allowance (4 commits) and web-market (uncommitted data layer) were resumed and told to commit, then merge main; reviewer (Opus), web-sign (Sonnet) and docs-spec (Sonnet, kb/90 update) were respawned from 2094200. The full verification on main (wasm, sandbox, e2e) is re-running.
- 17:15–17:30Z: web-allowance and web-market reported file writes and reads refused with "the user doesn't want to take this action … STOP". The orchestrator paused resumes and asked Razvan.
- 17:40Z: Razvan said "continue". Session restart #4. All five agents resumed with the PATH fix (this session's shell lacked cargo, node and pnpm): web-allowance (7ad8bfb + 2 uncommitted), web-market (157485e + 4 uncommitted), reviewer, web-sign and docs-spec (8 uncommitted). The main verification (wasm, sandbox, e2e) is re-running with PATH set.
- 17:50Z: web-sign handed its build to a nested satchel-web agent (running on `feat/ui-sign`, nothing committed yet). Its survey found web gaps on main that the C2/C3/C7 UI must close:
  - `clean-live.ts` passes only Sepolia `evm` sources, so records on the other three chains would be "unknown" and block Buy;
  - `Clean.tsx` drops "message" items;
  - `send.ts`, `adapter.ts`, the retry intents and `view.allZero()` are Sepolia-only;
  - `buildEip681` hard-codes 11155111;
  - the `notCoveredList` copy says three networks.

  **Release gate:** these must be fixed before the web deploy switches to a contract that has C2, C3 or C7.
- 18:05Z: the other agents hit the same refusals. The C2/C3/C7 nested agent, web-market and web-allowance all report Read/Edit/Write refused with "the user doesn't want to take this action … STOP", even after Razvan's "continue". All are paused pending Razvan's choice: allow agent file edits, orchestrator does the UI, or stop the UI work.
  - `feat/ui-allowance`: 7b18472, with a **merge of main in progress** (`sim.ts` and `mock-wallet.ts` still conflicted).
  - `feat/ui-market`: c8ec239 (data layer, copy, server-rendered inside balances; typecheck and lint clean).
  - `feat/ui-sign`: one uncommitted types change, plus fixture vectors in the agent's report.
- 18:10Z: merged `docs/kb90-sprint` (kb/90 §2/§5.4/§5.5/§5.9/§5.17/§6.1/§7/§13/§14, README, judge-snippets) into main. **Corrected its inferred StorageKey order** to the real enum in `lib.rs`: Allowances 8, Inside…StorageCredit 9–16, EvmNonces 17 (2cfdb49). Pushed.
- 18:20Z: **the security reviewer reported provisional findings and was then blocked**: its Write of `tests/tests/review.rs` was refused, so nothing is committed yet. The review is about 60% done. It ran contract unit 172/172, the sandbox (exit 0) and a fresh differential fuzz (120k cases, 0 disagreements). Wasm 422,562 B `bd5d8e01…`, INV-22 OK. **No Critical or High.**
  - **M-01 (Medium): contract-paid storage can consume user escrow.** `nft_transfer`, `buy` and `accept_offer` to a new holder cost the contract about 250 B (S-02). Since C4/C6, the balance also holds inside NEAR, NEAR offers, storage credit and NEAR proceeds, so that growth can come out of escrow. I-M1 then breaks, and the last `withdraw_near` hits `LackBalanceForState`. The monitor's free-balance check counts escrow as free.
    - Proposed fix: a `proceeds_near` total, plus `ensure_solvent` (free ≥ inside + offers + credit + NEAR proceeds) at the end of `nft_transfer`, `execute_sale` and `accept_offer`.
    - The monitor should also subtract `market_totals`.
    - **Verdict: C4/C6 ship only with this fix.**
  - **L-01:** C5's delegate debit ignores the OP-stack L1 data fee on Base and OP Sepolia. The impact is bounded (≤ 160 B tx). Reserve a margin or document it.
  - **L-02:** a C7 32-byte body can be ground to look like an `eth_sign` digest, relevant only if the Satchel address is ever a Safe owner. Buy-tab hardening: show the hex, escape control and bidi characters, flag digest-like bodies.
  - **L-03:** `history_digest` view gas, estimated ~0.1 Tgas per record, needs a sandbox measurement.
  - **Info:** unlimited 1-yocto offers clutter `offers_for`; `withdraw_storage_credit` has no re-credit; `prepay_storage(contract)` credit is unwithdrawable; wrap.testnet trust is bounded; an OP/Base portal deposit can bump the L2 nonce.
  - **Provisional verdicts:**
    - C1 ships (pending L-03);
    - C2 and C3 ship;
    - C5 ships (L-01 documented);
    - C7 ships (with L-02 UI hardening);
    - **C4/C6 need the M-01 fix.**
- 20:00Z (local 22:00): Razvan said "you can continue". Verified main 2094200: wasm 422,562 B `bd5d8e01…`, INV-22 OK, Playwright 161/161 (the sandbox is 112/112 per the reviewer on the same tree). Resumed web-allowance, web-market, the nested web-sign agent (C2/C3/C7 UI, told to wire `evmByChain` and escape message text) and the reviewer (told M-01 is fixed elsewhere). Spawned **contract-fix-m01** (Opus) on `fix/m01-solvency` in a manually created worktree `.claude/worktrees/fix-m01`, since harness worktree creation keeps racing: failing test first, then `ensure_solvent()` plus an escrow-total view, plus a monitor update.
- 20:30Z: **security review complete** (`docs/security/sprint-review.md`), merged into main (43a698e) and pushed. No Critical or High.
  - **M-01, Medium:** the escrow solvency issue. The fix is in progress on `fix/m01-solvency`; the proof `review.rs::m01_…` is `#[ignore]`d until it lands.
  - **L-01:** OP-stack L1 fee, documented.
  - **L-02:** message display hardening; assigned to web-sign.
  - **L-03:** `history_digest` ceiling measured (≈ 3,000 small or 2,000 1-KiB records; ~1,500 cross-contract), docs corrected.
  - **L-04 (SR-01):** fixed, `evmConfirmationsByChain` (Base and OP 30, Arbitrum 240).
  - **L-05:** the web app's `evmByChain` and `mapCoreReport`; assigned to web-sign; the release gate for L2 sends.
  - **I-01..I-09:** accepted or documented.

  Verdicts: C1, C2, C5 ship; C3 ships (app needs L-05); C7 ships (L-02 UI); **C4/C6 ship with the M-01 fix**.

  Suites on the review branch: contract unit 172, sandbox 115 + 1 ignored, core 465, tools 72, differential fuzz 400k with 0 disagreements.
- 21:05Z: merged `feat/ui-allowance` (C5 UI) into main (f080f48). Fixed its reported stale Add-sheet bug (reset form on each <Activity> showing) and replaced the e2e workaround with a regression check. Web unit 396, Playwright 169/169 on merged main. Pushed.
- 21:40Z: merged `fix/m01-solvency` into main (778172a). **M-01 is closed**: the reviewer's proof is un-ignored and passes. Contract unit 177, core 467, tools 72, web unit 396. The branch-side sandbox was 119/119 with an identical contract and tests tree. Wasm 423,977 B `10c6a8e9…` (branch build). The root state layout changed again, so deploy to a fresh devN.
- 21:50Z: merged `feat/ui-sign` (C2, C3, C7 UI, plus review L-02 and L-05) into main (2f2cda8): web unit 422, typecheck and lint clean, Playwright 183/183. Pushed. The sandbox and wasm rebuild on final main are running. **Only web-market (C4/C6 UI) remains.**
- 22:40Z: merged `feat/ui-market` (C4/C6 UI) into main. 5 additive conflicts were resolved by keeping both sides; `MarketTotalsView` gained the M-01 fields. **All sprint features are now merged**:
  - A1–A4;
  - C1–C7 contract and UI;
  - M-01 fixed;
  - the security review merged.

  **Final main:** contract unit 177; sandbox **119/119** (0 ignored); core 467; tools 72; web unit 443; Playwright **194/194**; typecheck and lint clean. Wasm **423,977 B `10c6a8e9096b682791f4ebe282861314b0f51b8be0c54e11b7f057c53353614a`**, INV-22 OK.

  **Open:**
  - Live testnet verification on a fresh `dev2` (never in place over dev1). It covers L2 sends, USDC, message signatures, offers and inside, and allowances.
  - Real-wallet tests by Razvan.
  - The small UI gaps listed above (USDC offers and deposits).
  - The Day-9 reproducible build.
- 22:55Z: live phase.
  - Deleted `smoke1` (4.0 NEAR back to satchelhq; satchelhq now 19.8 NEAR).
  - Created **`dev2.satchelhq.testnet`** (5.5 NEAR): wasm `10c6a8e9…` (main 915a467), init with USDC and base_uri usesatchel.xyz, registered at USDC and wrap.testnet, #1–#3 minted to alice.
  - Funded dev2 #1 from dev1 #1 through `sign_for`:
    - Sepolia 0.02 ETH, `0x12649022…`, gas 207,391;
    - devnet 0.2 SOL, `4gwTkeub…`;
    - 300k testnet4 sats, `68a0ee8a…`, unconfirmed.
  - **Switching production to dev2 needs Razvan.** Committing `apps/web/.env.production` was blocked by the auto-mode classifier (credential-leakage rule for `.env*`). Vercel's env must be set to `NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet` and `NEXT_PUBLIC_EXPECTED_CODE_HASH=10c6a8e9096b682791f4ebe282861314b0f51b8be0c54e11b7f057c53353614a`, then redeployed. Until then, the live site (on dev1, the pre-sprint contract) will show errors for the new views if it is redeployed from main.
  - Spawned **tools-live** (Sonnet): extends `tools/e2e` (multi-chain/USDC EVM, message, market, allowance, history) and runs it live on dev2 within caps, producing `research/spikes/dev2-live/RESULTS.md`.
  - Spawned **web-gaps** (Sonnet): USDC offers with storage prepay, FT deposits and withdrawals, storage-credit withdraw, `/market` offer entry.
- 2026-10-30 08:10Z: session restart. Razvan allowed pushing `.env.production` updates. **Production now points at dev2** (3415e01: `NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet`, `NEXT_PUBLIC_EXPECTED_CODE_HASH=10c6a8e9…`). Public values only. tools-live and web-gaps had made no changes before the restart (dev2 untouched: `sig_count` 0); both were resumed from scratch. dev2 #1's BTC funding confirmed at block 158101.
- 08:50Z: merged `feat/tools-live` into main. **Live dev2 run: 20/20 flows PASS** (`research/spikes/dev2-live/RESULTS.md`), with 8 real MPC `sign_for` calls at 5.4–6.1 s each and no timeouts:
  - EVM Sepolia send; Base Sepolia and USDC sign-only;
  - EVM and SOL messages with real verification;
  - `history_digest` recompute = view;
  - SOL and BTC sends;
  - C6 deposit and withdraw;
  - C4 offer, accept and cancel, with I-M1 and I-M8 holding live;
  - C5 grant, within-cap, over-cap (`ERR_ALLOWANCE_EXCEEDED`, byte-identical to the local mirror) and revoke;
  - the checker on #1/#2/#3 as expected.

  Three tool bugs were fixed: the stale view read-back, the tools checker's per-chain EVM sources (C3), and the BTC self-sweep in the allowance demo. Tools 92 tests. Spend within caps (0.002 ETH, 5k sats, 0.001 SOL, ≈ 0.35 NEAR moved).
- 09:20Z: merged `feat/ui-gaps` into main: USDC offers with storage prepay, FT deposits and withdrawals, the storage-credit row, Unlisted Satchels on /market. Core 467, web unit 455, Playwright **205/205**, typecheck and lint clean. Added the wrap.testnet registration step to the keyless-birth runbook and launch checklist E-02. **The sprint scope (A1–A4, C1–C7) is complete.**
- 10:30Z: merged `feat/allowance-caps` into main: the Add sheet now offers USDC caps (4 networks) and Base/Arbitrum/OP ETH caps, enforces the 8-cap limit, and the delegate banner lists every cap. Web unit 463, Playwright 207/207 (identical tree on the branch), typecheck and lint clean. **Every sprint item is done, merged and pushed.**
- 2026-10-30 (UI notes from Razvan): **one holdings list**. Every coin is now one row shape: BTC; ETH and USDC on 4 EVM networks; SOL; NEAR, USDC and wNEAR inside. A row has a coin icon with a lettered network sticker, the coin name, where it sits, and the amount. Held coins come first, then the home coins at zero; the empty places fold behind a disclosure. Each row opens `/s/[id]/coin/[key]`, a sheet that holds the actions and the inside add/take-out inputs, so the page has no inline inputs. The addresses moved to their own section, and the judge facts are unchanged. "Make an offer" moved into the left column: a visitor panel when unlisted, and next to Buy when listed. Fixed the Add coins request-row overflow (`AmountInput` `w-0`, form stacks on mobile). The card ledger now shows the top 3 holdings with network stickers, plus a "+N more" coin stack; "You get" lists everything held. New: `lib/holdings.ts` and `CoinIcon`. Web unit 474, Playwright **207/207**, typecheck and lint clean.
- 2026-10-30 (Razvan, D-50): **a Satchel at a glance**. Each Satchel shows a labelled estimate, "≈ $X · at mainnet prices", with a value bar and its top coins. Coins are grouped across networks and inside, and ranked by value. It appears on the card (3 legend coins from 352 px, 2 below, "+N"), in a Wallet tab panel (top 5 with amounts and shares), on market cards and in "You get". Prices come from 1Click `/v0/tokens`, with CoinGecko as the fallback (both checked live today); they are cached 60 s with a 1.5 s bound and read wherever the snapshot is built. Fixture prices keep the tests offline. Without prices the overview shows "{n} coins on {m} networks". Native amounts stay in the card's text layer, so the judge test still reads them. New: `lib/prices.ts`, `lib/overview.ts` and `components/Overview.tsx`. Web unit 479, Playwright **207/207**, typecheck and lint clean.
- 2026-10-30 (Razvan): **A4 "Request an amount" removed** from the Add coins sheet. Deleted: the request form and its payment-link QR, `?amount=`, `RequestAmount.tsx`, `lib/payment-uri.ts` and their unit/e2e tests. The multichain e2e now checks the network and coin picker only. Web unit 461, Playwright **200/200**, typecheck and lint clean.
- 2026-10-30 (Razvan's UI notes, round 3):
  - **Public Add coins page `/fund/[id]`.** The sender picks the coin, then the network, and gets the address (QR, Copy, notes, faucet, Incoming). For a coin held inside, they get the add field. Server-rendered, and it never guesses a network. `?coin=&network=` pre-fills both.
  - **"Share link" (system share sheet, or copy plus toast).** It appears in the Inside header, each address row, each coin popup and the Add coins popup, pre-filled for that place.
  - **Smaller fixes:**
    - Make an offer and Add coins are stacked full width.
    - The testnet-only labels ("at mainnet prices", the value note) are hidden unless `IS_TESTNET`; `NEXT_PUBLIC_NETWORK` now accepts `mainnet` for this.
    - The coin popup's address box is white, so the Copy pill lines up with the address.
    - The ETH address row shows four explorer links on one line.
    - The value bar has a hover/tap tooltip with the coin, amount, share and ≈ $ value.
  - Web unit 466, Playwright **208/208**, typecheck and lint clean.
- 2026-10-30 (Razvan): **a Transactions tab** (`/s/[id]/transactions`), separate from Activity. Activity keeps the contract's decisions and signatures.
  - **Content:** coins in and out on each chain with a keyless source.
  - **Sources (each checked live today):**
    - Bitcoin testnet4: mempool.space.
    - Ethereum Sepolia and Base Sepolia: Blockscout, for ETH and the network's Circle USDC only (spam tokens never show).
    - OP Sepolia: Optimism's own explorer.
    - Solana devnet: one batched RPC request.
    - Inside: the contract's `inside_deposit` / `inside_withdraw` events.
  - **Arbitrum Sepolia is not listed:** its Blockscout is behind a bot check, so the tab links to Arbiscan instead.
  - **Behaviour:**
    - Server-rendered, with each source bounded on its own and an unread source reported; cached 30 s.
    - Filters: All, Bitcoin, Ethereum, Solana, Inside.
    - Pending first, then UTC days; each row links to its explorer.
  - **Checks:** the parsers were checked against dev2 #1's real history, and fixture history keeps the tests offline.
  - Web unit 477, Playwright **210/210**.
- 2026-10-30 (Razvan: "server rendering doesn't create a good UX"):
  - **Transactions.** The page renders at once. The list loads in the browser: every source in parallel through `/api/satchels/[id]/txs?source=`, cached 30 s per source, with failures never cached.
    - Loading rows show until the first source answers, then "Reading Base Sepolia…" for the rest.
    - A failed source says so, with Try again.
    - The filter is instant client state, mirrored to `?filter=`.
  - **`/fund`.** The server renders only the first view, including a pre-filled destination's QR. Coin and network picks are now instant client state: no server round trip (e2e-checked), and the URL is mirrored for sharing.
    - All three addresses' QR codes are drawn in the background on load.
    - A pick scrolls the destination into view on phones.
    - The tiles stay real links, so a new tab or no JavaScript still works.
  - Web unit 477, Playwright **213/213**.
- 2026-10-30 (Razvan's real-wallet notes):
  - **Send:** without `?chain=` it opens on the first coin the Satchel holds, including the right EVM network and coin. An empty chain's "Nothing to send yet" now offers "Send ETH on Base Sepolia"-style switches to the coins it does hold.
  - **Take everything out:** the plan now covers every holding (BTC; USDC then ETH on each EVM network; SOL; NEAR, USDC and wNEAR inside, back to the owner's account).
    - The plan is frozen at Review, so balance updates can't shift the queue (a latent bug).
    - On each EVM network the ETH sweep waits for the USDC send to confirm.
    - USDC on a network with no ETH for the fee is named, not planned.
  - **Stuck popups:** a reused (`<Activity>`) flow kept its closing flag and exit animation (an invisible panel over the scrim). Flows now reset on every show, and the background lock and scroll lock are reference-counted, so the last flow out always unlocks.
  - **"Satchel doesn't exist" after mint:** a missing snapshot was cached for 15 s. It now gets `revalidate: 0`; the prerendered social-card route keeps its own read.
  - **Loading feedback:** in-app links now show feedback at once (direct loads keep their server-rendered facts and no Suspense):
    - a top progress bar;
    - a skeleton popup naming the popup and what it's reading;
    - a tab-area skeleton for Activity, Transactions and Sell;
    - a page-area skeleton for Market, My Satchels and others.
  - Web unit 481, Playwright **221/221**.
- 2026-10-30 (Razvan):
  - **Balances follow a send without a refresh.** `refreshSnapshot` now rebuilds the snapshot in the browser from the chains, bypassing the server cache and the CDN's stale-while-revalidate (which could lag over a minute). It re-reads at 0 s, 3 s, 8 s, 15 s, 30 s, 60 s and 120 s.
    - A shell-mounted watcher triggers it when any send reaches "sent" or "confirmed"; NEAR actions already call it.
    - Outgoing BTC in the mempool comes off the balance at once, shown as "−X leaving · unconfirmed".
  - **Address book** (`/address-book`, in the nav). Entries are saved in this browser (localStorage), with an optional name; the kind (BTC, EVM, SOL, NEAR) is detected and editable when ambiguous.
    - **Pickers, each listing only its own kind:** Send's To field (all EVM networks share one entry), each Empty address field, Give, and the allowance account field.
    - **Save from use:** the Send receipt, the Give receipt, and a one-tap save on Transactions rows.
    - **Names shown:** on Send's resolved recipient, and on Transactions rows.
  - Web unit 486, Playwright 224/224, with the address book, responsive and a11y specs re-run after the nav change.
