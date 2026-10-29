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
| A1 | A social card per Satchel (OG/Twitter image) | web-share | in progress | |
| A2 | Give by link (claim link) | web-flows | in progress | |
| A3 | Empty the Satchel | web-flows | in progress | |
| A4 | Request coins (BIP-21 / EIP-681 / Solana Pay) | web-share | in progress | |
| C1 | `history_digest` view | contract-sign | in progress | |
| C2 | ERC-20 USDC transfers on EVM | contract-sign | in progress | the UI comes in phase 2 |
| C3 | More EVM testnets | contract-sign | in progress | the UI comes in phase 2 |
| C4 | Offers | contract-market | in progress | the UI comes in phase 2 |
| C5 | Spending allowance (delegated signer) | contract-allowance | in progress | the UI comes in phase 2 |
| C6 | NEAR-side assets inside | contract-market | in progress | the UI comes in phase 2 |
| C7 | Message signing (EIP-191; Solana off-chain format) | contract-sign | in progress | the UI comes in phase 2 |

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
