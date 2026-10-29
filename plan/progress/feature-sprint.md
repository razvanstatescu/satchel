# Feature sprint tracker (started 2026-10-29)

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
| A1 | A social card per Satchel (OG/Twitter image) | web-share | **merged + pushed** (1571bf5, on origin since bd94fcc) | `/s/[id]` opengraph + twitter images, branded fallback; unit + 3 Playwright |
| A2 | Give by link (claim link) | web-flows | **merged + pushed** (94428ea) | `/s/[id]/give-link`, `/claim` (fragment-only secret, local signer); batch fund + nft_transfer with fallback. Needs a real-wallet test |
| A3 | Empty the Satchel | web-flows | **merged + pushed** (94428ea) | `/s/[id]/empty`; per-chain drain, BTC auto-batches ≤10 inputs; hidden while listed |
| A4 | Request coins (BIP-21 / EIP-681 / Solana Pay) | web-share | **merged + pushed** (1571bf5, on origin since bd94fcc) | URI builders with vectors, QR, copy/share, `?chain=&amount=` link works without JS |
| C1 | `history_digest` view | contract-sign | **contract merged + pushed** (e985d82) | SHA-256 over immutable record fields; 3 encoders agree on `vectors/history.json`; ~2,500-record view gas limit |
| C2 | ERC-20 USDC transfers on EVM | contract-sign → web-sign (UI) | **contract merged + pushed** (e985d82); UI in progress | 4 Circle USDC verified on-chain; new `ERR_EVM_TOKEN`/`ERR_EVM_VALUE`; EVM limit 160 B |
| C3 | More EVM testnets | contract-sign → web-sign (UI) | **contract merged + pushed** (e985d82); UI in progress | per-chain nonce-gap (`StorageKey::EvmNonces`, last); checker per chain, fail-closed |
| C4 | Offers | contract-market → web-market (UI) | **contract merged** (a512d45); UI in progress | `make_offer` takes an explicit `amount`; 20 open offers per offerer, 90-day max expiry; storage-credit methods for FT paths. Needs a security review |
| C5 | Spending allowance (delegated signer) | contract-allowance → web-allowance (UI) | **contract merged** into main 24a680b; UI in progress | 115 unit, 91 sandbox, 359 core, 55 vectors; wasm 329,320 B `e7ded724…`. Debits include fees; message signing refused for delegates; explicit clear on transfer and sale |
| C6 | NEAR-side assets inside | contract-market → web-market (UI) | **contract merged** (a512d45); UI in progress | USDC + wrap.testnet allowlist; withdraw blocked while listed; invariants I-M1..I-M8; 142 unit, 107 sandbox (on the branch), 371 core |
| C7 | Message signing (EIP-191; Solana off-chain format) | contract-sign → web-sign (UI) | **contract merged + pushed** (e985d82); UI in progress | status `message`, never blocks; refused for delegates; BIP-322 skipped (spec §9) |

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
- 15:55Z: merged `feat/web-share` (A1, A4) into main (1571bf5): web unit 366, Playwright 144/144, tsc and lint clean. **Push to origin was blocked**: pushes need Razvan's explicit yes (CLAUDE.md rule 2), so main stays local until he confirms.
- 16:00Z: merged `feat/contract-allowance` (C5) into main (24a680b): contract unit 115, core 359, tools 72, vectors agree; the sandbox run on merged main is in progress. Sent the merge notes to contract-market and contract-sign. Spawned web-allowance (Sonnet) for the C5 UI from 24a680b.
- 16:00Z: Razvan allowed agents to push to the private repo without asking; main pushed (bd94fcc).
- 16:04Z: the session restarted again. All work up to the stop was committed:
  - contract-sign at 873ed43;
  - contract-market at d04b3f8;
  - web-flows at a98a53a;
  - ui-allowance had no commits yet.

  The four agents were resumed from their transcripts, and the sandbox run on main was restarted. The finished web-share and contract-allowance worktrees were removed; their branches are merged.
- 16:35Z: merged main (A1, A4, C5) verified: sandbox 91/91, wasm 329,320 B `e7ded724…`, INV-22 OK.
- 16:55Z: merged `feat/web-flows` (A2, A3) into main (94428ea). One import conflict in ReceiveSheet was resolved; web unit 379, Playwright 161/161, typecheck and lint clean. Pushed.
- 17:05Z: merged `feat/contract-market` (C4, C6) into main (a512d45), clean, since the branch had already merged C5: contract unit 142, core 371, tools 72. The branch-side wasm was 403,886 B `f5527f72…`; the sandbox run on main is in progress. Spawned web-market (Sonnet) for the C4/C6 UI from a512d45. Asked contract-sign to merge main into its branch and resolve the StorageKey order.
- 16:40Z: session restart #3:
  - contract-sign was mid-merge of main into `feat/contract-sign-on-main`;
  - ui-allowance had its data layer committed (e002cc7) plus uncommitted copy;
  - ui-market had no commits.

  All three were resumed. main's contract/tests/core tree is identical to the tested contract-market branch (sandbox 107/107), so main was pushed (4349840); a confirmation sandbox run is in progress.
- 16:50Z: confirmation run on main (A1–A4, C4, C5, C6): sandbox 107/107, web unit 379, web typecheck clean.
- 17:00Z: merged `feat/contract-sign` (C1, C2, C3, C7) into main (e985d82), clean, since the branch had already merged main: contract unit 172, core 459, tools 72 with all 7 vector files OK, web unit 379, typecheck OK. Pushed. **All seven contract features are now on main**; the merged wasm is 422,562 B `bd5d8e01…` (the agent's build).
- 17:05Z: a Claude authentication outage stopped web-sign, web-market and web-allowance, and two spawns (reviewer, docs) failed on worktree races. Empty worktrees were removed; web-allowance (4 commits) and web-market (uncommitted data layer) were resumed and told to commit, then merge main; reviewer (Opus), web-sign (Sonnet) and docs-spec (Sonnet, kb/90 update) were respawned from e985d82. The full verification on main (wasm, sandbox, e2e) is re-running.
- 17:15–17:30Z: web-allowance and web-market reported file writes and reads refused with "the user doesn't want to take this action … STOP". The orchestrator paused resumes and asked Razvan.
- 17:40Z: Razvan said "continue". Session restart #4. All five agents resumed with the PATH fix (this session's shell lacked cargo, node and pnpm): web-allowance (fd6ce38 + 2 uncommitted), web-market (44a0ae9 + 4 uncommitted), reviewer, web-sign and docs-spec (8 uncommitted). The main verification (wasm, sandbox, e2e) is re-running with PATH set.
- 17:50Z: web-sign handed its build to a nested satchel-web agent (running on `feat/ui-sign`, nothing committed yet). Its survey found web gaps on main that the C2/C3/C7 UI must close:
  - `clean-live.ts` passes only Sepolia `evm` sources, so records on the other three chains would be "unknown" and block Buy;
  - `Clean.tsx` drops "message" items;
  - `send.ts`, `adapter.ts`, the retry intents and `view.allZero()` are Sepolia-only;
  - `buildEip681` hard-codes 11155111;
  - the `notCoveredList` copy says three networks.

  **Release gate:** these must be fixed before the web deploy switches to a contract that has C2, C3 or C7.
