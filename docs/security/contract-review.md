# Satchel contract: adversarial security review

> **Status (2026-11-04): closed.** Every finding was fixed or accepted in the fix pass of 2026-10-23 (the
> [Fix pass](#fix-pass-2026-10-23) table: S-01, S-03–S-07, S-09 and S-13 fixed; S-02 mitigated by operations, and its
> escrow side guarded on-chain since the sprint's M-01 fix; S-08, S-10–S-12 accepted). This review covers the **v1
> contract** (2026-10-23, wasm `aea0b2e9…`). The sprint features C1–C7 were reviewed separately in
> [`sprint-review.md`](sprint-review.md) (2026-10-29), and the test audits of 2026-10-30/31 are in
> [`docs/testing/contract.md`](../testing/contract.md) (AUDIT-01…04, Q-01…Q-05). Line numbers and test counts below are
> those of the reviewed sources, not of today's `main`. Shorthand: [docs/GLOSSARY.md](../GLOSSARY.md).

Reviewed on 2026-10-23. Scope: `contracts/satchel/src/**` (`lib.rs`, `sign.rs`, `mpc.rs`, `parse/{hex,rlp,evm,btc,sol}.rs`, `sale.rs`, `views.rs`, `events.rs`, `errors.rs`, `types.rs`).

The code was checked against the design in kb/90 §5–§7, the kb/70 threat model, `plan/review.md`, and `docs/handoff/{contract,sandbox}.md`. Sandbox runs used the handoff wasm (`satchel.wasm`, sha256 `bec41e44…8da584`; the sources are unchanged since that build). No contract source was edited. The only change to an existing source file is the `#[cfg(test)] mod security_tests;` line in `lib.rs`.

## Summary verdict

**There are no Critical or High findings. There is one Medium finding (S-01). Fix it before the keyless birth.** *(S-01 was fixed the same day; see the Fix pass.)*

The properties behind the product promise hold:
- **No blind signing.** Every path to the MPC goes through a classifier that hashes the exact bytes it parsed.
- **Records come first.** A record is written, and its storage charged, in the same receipt as every MPC promise, before the promise is created.
- **History is append-only.** Records are never deleted, and their safety fields are never rewritten.
- **Sales are bound to what the buyer checked.** Signing is frozen while a token is listed, and each sale is bound to `(listing_id, expected_sig_count)`.
- **Callbacks are private and never panic.**
- **INV-22 holds.** The only promise actions are `function_call_weight` and `transfer`.

**The main weakness is in the money path.** The re-credit for a failed payout is written in a separate callback that needs storage the contract pays for. If the contract's free balance is ever exhausted, that callback fails after the sale has already completed, and the seller's proceeds are orphaned for good: the contract is locked and has no sweep. The sandbox proof reproduces this.

The other findings are griefing vectors, user-error deposit losses and hardening items. Each has a small, local fix.

**Fix first:** S-01, by reserving the proceeds slot when the token is listed. Second, decide on S-04 (D-21 rev). Then take the one-liners: S-03, S-05, S-06 and S-13.

## Fix pass (2026-10-23)

Every finding now has a status (the **Status** column below). The orchestrator made the decisions, delegated by Razvan.

| ID | Status | What changed | Test (all run by default) |
|---|---|---|---|
| S-01 | **Fixed** | `list` reserves `proceeds[(seller, currency)] = 0`, charged to the seller with the listing's storage. `withdraw_proceeds` sets the slot to 0 instead of removing it. `on_payout` only overwrites the fixed-size value. `ON_PAYOUT_GAS_TGAS` 5 → 10 | sandbox `security.rs::s01_failed_payout_is_never_orphaned_when_contract_balance_is_low` (proof, un-ignored); unit `fix_s01_list_reserves_the_proceeds_slot_and_recredits_grow_no_storage` |
| S-02 | **Mitigated (operations)**; escrow protected on-chain since M-01 | D-34: final birth Transfer 10 → 20 NEAR, rc 5 → 10 NEAR (the `tools/deploy/keyless-birth.ts` defaults). `tools/monitor.sh` check [4] fails (alert) below 3 NEAR **spare** (free − `market_totals().escrow_near`) and warns below 5. Since C4/C6 the balance also holds user escrow: the sprint review's M-01 fix adds `ensure_solvent` (`ERR_INSOLVENT`) at the end of `nft_transfer`, `buy`/USDC buy and `accept_offer`, so S-02 storage is paid only by the contract's own NEAR, never by escrow (`docs/specs/C4-C6.md` §2.4) | `tools/test/scripts.test.ts` (free-balance verdicts), `keyless-birth.test.ts` (defaults, parent balance) |
| S-03 | **Fixed** | `delist` and `withdraw_proceeds` require exactly 1 yocto (`ERR_DEPOSIT: attach exactly 1 yocto`) | unit `s03_*` (proofs, un-ignored), `fix_s03_delist_and_withdraw_require_exactly_one_yocto`; sandbox `fix_s03_exactly_one_yocto` |
| S-04 | **Fixed** (D-43, reverses D-21) | Nonce-gap rule: `nonce ≤ max_evm_nonce + 1`, or `≤ 1` for the first EVM record, else `ERR_EVM_NONCE_GAP` (spec §5.9). New `TokenState.max_evm_nonce: Option<u64>`. Mirrored in `@satchel/core/policy` and the web Send builder; the shared vectors carry `state.evm_max_nonce` | unit `s04_far_future_evm_nonce_is_refused` (proof), `fix_s04_nonce_gap_rule`, `fix_s04_first_evm_record_charges_the_nonce_slot`; sandbox `fix_s04_nonce_gap_rule`; 10 `nonce_gap_*` vectors; core `policy.test.ts`; web `evm-nonce-gap.test.ts` |
| S-05 | **Fixed** | `nft_tokens` / `nft_tokens_for_owner`: `limit` defaults to `MAX_PAGE` (50) and is capped there | unit `s05_*` (proof), `fix_s05_nep181_paging_still_works_below_the_cap`; sandbox `fix_s05_nep181_views_are_paged` |
| S-06 | **Fixed** | `nft_mint` applies the receiver guard | unit `s06_*` (proof, now also covering USDC), `fix_s06_s09_receiver_guard_in_mint_and_transfer`; sandbox `fix_s06_s09_receiver_guard` |
| S-07 | **Fixed (checker)** | New item status **`foreign`** (non-blocking): the prevout exists, and its scriptPubKey is none of P2WPKH, P2SH-P2WPKH or P2WSH(P2PKH) of the token's pkh. It costs one `GET /tx/:txid`, only for txids that have an unused or settling input, and fails closed. Spec §7.2/§7.3; UI copy `clean.item.foreign` / `foreignBody` | core `clean-history.test.ts` › "BTC foreign prevouts (review S-07)" (6 cases) |
| S-08 | **Accepted (Info)** | The birth batch is the only init path for rc and final. It runs deploy + `new` in one atomic receipt, so `new` cannot be front-run there. Dev accounts are throwaway and are checked with `config()` before funding | — |
| S-09 | **Fixed (contract part)** | The guard also refuses the configured USDC contract (`nft_mint` and `nft_transfer`). Nonexistent and self-derived receivers stay UI checks (R-18) | unit `fix_s06_s09_*`, `fix_s09_usdc_is_ordinary_when_usdc_is_disabled`; sandbox `fix_s06_s09_receiver_guard` |
| S-10 | **Accepted (Info)** | A late `on_signed` only touches `status`/`signature` (UX fields). The checker already treats every record as issued, so clean history is unaffected | — |
| S-11 | **Accepted (Info)** | Having no admin is the point of a keyless contract. The README and the UI say "never send tokens to the contract" | — |
| S-12 | **Accepted (Info)** | `listings` is a convenience view. The checker pages `sig_records` by `seq` and fails closed unless `0..sig_count` is contiguous (`mergeNearSnapshots` → `records_incomplete`) | — |
| S-13 | **Fixed** | `on_payout` does nothing (a log line only: no credit, no event) unless there is exactly 1 promise result | unit `fix_s13_on_payout_needs_exactly_one_promise_result` |
| F-03 (fuzzing) | **Accepted (Info)** | The chain-invalid shapes that both classifiers accept can't move funds. Each one only adds an `unused` record to the owner's own history | `fuzz_tests.rs::f03_chain_invalid_but_accepted_shapes` (pinned) |

**Interface changes the web app must follow** (details in `docs/handoff/contract.md`):
- `delist` and `withdraw_proceeds` take exactly 1 yocto. `ATTACH.delist/withdraw` already does this.
- `nft_tokens*` return at most 50 tokens per call.
- `nft_mint` and `nft_transfer` to the USDC contract fail with `ERR_BAD_RECEIVER`.
- There is a new error code, `ERR_EVM_NONCE_GAP`.
- The first time a seller lists in a currency, `list` keeps ≈ 0.0008 NEAR more. That is still under `LIST_ATTACH` (0.01 NEAR).

## Findings

Severity combines impact and likelihood for the **locked testnet contract**. Line numbers refer to the sources as reviewed on 2026-10-23 (before the fix pass); `lib.rs` lines include the added test-module line.

| ID | Severity | Status | Location | Description | Exploit scenario | Fix recommendation |
|---|---|---|---|---|---|---|
| **S-01** | **Medium** | **Fixed** | `sale.rs:149-158` (`on_payout`), `sale.rs:58-69`, `lib.rs:43` | **A failed payout can orphan the price.** The sale (`execute_sale`) completes in one receipt and the payout is detached (correct, per kb/51). The only record that the seller is owed the money is written later, in `on_payout`. That write creates a new `proceeds` entry of ≈ 77 B, paid from the **contract's** free balance. If that balance is below ≈ 0.00077 NEAR, `on_payout` fails with `LackBalanceForState`. Its state is reverted, nothing is credited, and the USDC (or NEAR) stays in the contract with no owner. The locked contract has no admin or sweep, so the loss is permanent. A second trigger is the static 5 Tgas: the measured cost is 1.68 Tgas, a 3× margin, so this would take a protocol gas change. | 1. The contract's free balance runs low, through neglect or S-02 griefing. 2. A seller has not registered with Circle USDC (a common case: the UI only *offers* registration), so `ft_transfer` fails. 3. A buyer purchases: the buyer has the NFT and the seller's 5 USDC is stuck forever. **Proof:** `tests/tests/security.rs::s01_*` → `sold=true credited=false escrow=5000000 proceeds_of=[]`, with `on_payout` failing `LackBalanceForState`. The USDC path triggers reliably. A NEAR payout's refund may restore liquidity first, depending on the order the receipts arrive in. | Make `on_payout` unable to grow storage, as `on_signed` already is: **reserve the slot ahead of time.** In `list`, insert `proceeds[(seller, currency)]` with value 0 if it is absent. The seller already pays storage there (`charge_storage`), so this adds ≈ 77 B to `LIST_ATTACH`, which is still under 0.01 NEAR. `on_payout` then only overwrites a fixed-size `u128`. In `withdraw_proceeds`, set the value to 0 instead of `remove`, so a re-credit after a failed withdraw also stays in place. `proceeds_of` already hides zero entries. Optionally also raise `ON_PAYOUT_GAS_TGAS` to 10. |
| S-02 | Low | Mitigated (ops) | `lib.rs:207-213`, `sale.rs:39-40` (standard `internal_transfer`) | **Ownership changes cost the contract storage.** NEP-171 transfers carry exactly 1 yocto, so the new holder's per-owner set is paid from the contract's balance. Measured: a transfer to a fresh 64-character implicit id costs the contract **250 B (0.0025 NEAR)** when the sender keeps another token. A mint costs the minter 490 B. | A griefer mints N tokens and sends each one to a distinct fresh id (or holder). They spend ≈ 0.0049 NEAR plus gas per token, and the contract loses ≈ 0.0025 NEAR. Draining the 5 NEAR liquidity floor takes ≈ 2,000 tokens and ≈ 10 NEAR of free testnet NEAR. Once the balance is exhausted, `nft_transfer` and `buy` to new holders fail until someone tops the contract up, and S-01 becomes possible. | This cannot be charged inside NEP-171. With S-01 fixed, only a recoverable DoS is left, so handle it operationally: fund the final contract generously (e.g. 20 NEAR), and have `tools/monitor.sh` alert below ≈ 3 NEAR free (anyone can top up). Optionally have `nft_mint` charge a fixed extra (≈ 0.003 NEAR) as a pre-paid transfer buffer. |
| S-03 | Low | Fixed | `sale.rs:117` (`delist`), `sale.rs:137` (`withdraw_proceeds`) | **Excess deposits are kept.** Both methods require "≥ 1 yocto" and keep any excess without refunding it. | A wallet or integration attaches a default deposit (e.g. 0.1 NEAR or 1 NEAR) to `delist` or `withdraw_proceeds`, and the user loses it to the contract. **Proof:** unit `s03_*`. | Require exactly 1 yocto (`assert_one_yocto`), as NEP-171 does, or refund `attached − 1` with the existing detached transfer. |
| S-04 | Low (design: D-21) | Fixed (D-43) | `parse/evm.rs:71-77` | **EVM "poison" records can make a token permanently unsellable.** Any nonce below 2^64−1 is accepted. A fresh token's EVM account starts at nonce 0, and only this contract can advance it. A record at nonce 2^64−2 therefore stays `unused` forever, and no future owner can ever pass the Buy gate. D-21 accepted this for "the owner's own token", but the poison **travels with the token** through `nft_transfer`. | Alice signs one transfer at nonce 2^64−2, which costs ≈ 0.004 NEAR. She then gives or OTC-sells the token to Bob (transfers have no gate). Bob can never resell it through the market. Gift recipients already have to trust the giver for live signatures (kb/70 (a)), so the impact is resale value, not funds. **Proof:** unit `s04_*`. | Restore kb/70 TL;DR 2's gap rule: keep `max_evm_nonce: Option<u64>` in `TokenState` (+9 B) and refuse `nonce > max + 1` (and `nonce > 0` when none has been signed). Any poison then costs one record per nonce, and the next owner can clear it by broadcasting the published signatures or replacing them. This reverses D-21, so it needs a human decision (spec §5.9 and the TS mirror). |
| S-05 | Low | Fixed | `lib.rs:240-250` | **The NEP-181 views have no default limit.** `nft_tokens(None, None)` and `nft_tokens_for_owner(…, None)` iterate the entire legacy `TreeMap` or set. Minting is permissionless (≈ 0.005 NEAR) and can target any receiver. | A spammer mints a few thousand tokens. Any SSR, judge page, indexer or wallet that calls these views without a `limit` (or deep-pages them) exceeds the view gas limit. NFT wallets typically do this for `nft_tokens_for_owner` on a victim who was sent spam tokens. **Proof:** unit `s05_*`. | In the wrappers, clamp with `limit.unwrap_or(MAX_PAGE).min(MAX_PAGE)`, like the Satchel views. NEP-181 allows this. |
| S-06 | Info | Fixed | `lib.rs:122-146` | **`nft_mint` has no receiver guard (R-18).** It can mint to the contract itself, to the MPC account, or to any other account (spam). Fresh tokens hold no funds, but anything sent to their addresses later is stranded. | Mostly spam in other people's wallets, which also feeds S-05. **Proof:** unit `s06_*`. | Apply the same `ERR_BAD_RECEIVER` check as `nft_transfer`. |
| S-07 | Low (checker-side) | Fixed (checker) | `parse/btc.rs:102-104`; kb/90 §7.2 | **BTC poison records.** The contract cannot see a prevout's script, and it does not bind the scriptCode pkh to the token, by design (kb/90 §5.9). An owner can therefore log a preimage whose outpoint is a *foreign*, existing UTXO (someone else's, or their own long-dormant one). The resulting signature is useless, but under §7.2 the record reads `unused` until a third party spends that UTXO, which may be never. The result is the same as S-04, for BTC. | The giver logs a foreign outpoint before transferring, and the token can never pass the gate. | **In the checker:** a BTC record is dead (a new "foreign" status) if the preimage's pkh (`p[108..128]`, in the event) ≠ hash160(the token's derived pubkey), **or** the prevout's `scriptpubkey` (from `GET /tx/:txid`) is none of P2WPKH(pkh), P2SH-P2WPKH(pkh) or P2WSH(`76a914{pkh}88ac`). |
| S-08 | Info | Accepted | `lib.rs:89-118` | **`new` is not `#[private]` and does not check its arguments.** This is intentional (R-32) and safe only when deploy and `new` run in one atomic receipt. A dev deploy that calls `new` in a separate tx can be front-run. For example, `usdc = <attacker FT>` lets anyone buy USDC-listed tokens with a worthless token, and `mpc = <attacker>` bricks signing. | A dev or rehearsal account is deployed with `near deploy` and then `near call new`. | Keep the birth batch as the only init path for rc and final. After every deploy, assert `config()` (`mpc_contract_id`, `usdc_contract_id`) before funding anything. Optionally refuse `mpc == usdc` and `mpc/usdc == current_account_id`. |
| S-09 | Info | Fixed (USDC guard); rest accepted | `lib.rs:211` | **The receiver guard covers only the contract itself and the MPC.** Tokens can still be stranded by sending them to the USDC contract, to a nonexistent named account (accepted, as S-02's test shows), or to the token's **own** derived NEAR implicit accounts: hex(SOL ed25519 pk) and the 0x eth-implicit account of its EVM key. Only `sign_for` can produce signatures for those keys, and it never signs NEAR transactions. | The owner pastes their Satchel's own SOL or EVM address as the NEAR receiver. This only harms the owner. | In the UI, keep the `view_account` existence check (R-18) and add "is not one of this token's derived accounts". In the contract, optionally also refuse `usdc`. |
| S-10 | Info | Accepted | `sale.rs:18-20`; `sign.rs:57-78` | **The quiet period starts at the `sign_for` block, not at the start of the MPC yield.** Under receipt congestion, a late `on_signed` can run while the token is already listed. It changes only `status` and `signature`; the safety fields and `sig_count` stay fixed, so clean history is unaffected. The claim in §5.7 that "statuses are final for the whole listing" is not strictly true. | — | The checker must keep treating every record as issued, whatever its status (it does). Reword §5.7. |
| S-11 | Info | Accepted | — | **Stray assets are unrecoverable**, by design (no admin). This covers USDC or other FTs sent with a plain `ft_transfer` (not `ft_transfer_call`), NFTs, and failed-buy leftovers. NEAR becomes the storage buffer. | A user sends USDC to the contract with `ft_transfer`. | Disclose this in the README and the UI ("never send tokens to the contract"). |
| S-12 | Info | Accepted | `views.rs:106-115`, `views.rs:91-103` | **Two pagination caveats.** `listings` pages over an `IterableSet` that uses swap-remove, so a delist or sale between page reads can move an entry: a reader can miss or duplicate a listing. `sig_records` silently skips a missing seq. That cannot happen today, but a checker that counts rows instead of checking `seq` would miss it. | — | Clients must page `sig_records` by `seq` and require `0..sig_count` to be contiguous (fail closed). `listings` is a convenience view; re-read to confirm. |
| S-13 | Info (hardening) | Fixed | `sale.rs:151` | **`on_payout` credits when there is no promise result at all.** `ok = results_count == 1 && …`, so a call with zero results counts as failed and credits an arbitrary `amount`. Only the contract itself can call `on_payout`, so this is unreachable on a keyless account. On any account that still has a key (dev, or a botched birth), the key holder can mint proceeds and drain the contract with `withdraw_proceeds`. | The key holder of an unlocked deployment calls `on_payout(attacker, near, 10 NEAR)`, then `withdraw_proceeds`. | Treat `promise_results_count() != 1` as a no-op (log it, don't credit). This is free defence in depth. |

## Proof tests

All proofs assert the recommended behaviour. At review time they failed, so they were `#[ignore]`d. Since the fix pass (2026-10-23) they are un-ignored and **pass**.

| ID | File · test | Run (since the fix pass: ok) |
|---|---|---|
| S-01 | `tests/tests/security.rs::s01_failed_payout_is_never_orphaned_when_contract_balance_is_low` | `cargo test -p satchel-tests --test security -- --nocapture` |
| S-03 | `contracts/satchel/src/security_tests.rs::s03_delist_does_not_keep_excess_deposit`, `::s03_withdraw_does_not_keep_excess_deposit` | `cargo test -p satchel --lib security_tests` |
| S-04 | `security_tests.rs::s04_far_future_evm_nonce_is_refused` | same |
| S-05 | `security_tests.rs::s05_nft_tokens_default_limit_is_bounded` | same |
| S-06 | `security_tests.rs::s06_nft_mint_refuses_stranding_receivers` | same |

Notes on the proofs:
- **S-01 drains the contract with its own key.** In the sandbox, the contract account still has a key, and the test uses it to bring the free balance down to ≈ 0.0002 NEAR. This stands in for S-02 griefing or for neglect.
- **S-01 has two passing outcomes.** It accepts either "seller credited" or "sale reverted and buyer refunded", so both fix styles make it pass.

**Guards, which pass today.** These pin the attacks the review tried, so a later change cannot silently reopen them.

`security_tests.rs`:
- `guard_evm_rlp_and_typed_tx_tricks`: long-form RLP, padded or leading-zero integers, calldata hidden in a list, a 10th field, back-to-back lists, a list inside a string, overruns, and the type bytes 0x01, 0x03, 0x04 and 0xc0.
- `guard_btc_preimage_inconsistencies`: an incomplete prevout set, duplicate inputs, nSequence ≠ hashSequence, redirected or foreign outputs, the sighash variants `0x80000001`, `0x101`, `0x41` and `0xffffffff`, a P2SH scriptCode, and 0xfe/0xff varints.
- `guard_btc_input_count_before_hex`.
- `guard_sol_message_tricks`:
  - a durable nonce first, last, with trailing data, or through a duplicate System key;
  - 0, 3-account or 13-byte instructions; transfer-with-seed and assign;
  - out-of-range indices; 1 or 17 keys; read-only overflow;
  - v0 messages with an ALT; trailing or truncated bytes;
  - non-canonical and overlong compact-u16.
- `guard_hex_quirks`.
- `guard_mpc_is_only_called_by_sign_for`: no other mutating method ever creates an MPC receipt.
- `guard_records_append_only_across_owners_and_callbacks_scoped`.
- `guard_quiet_period_follows_token_not_owner`: covers D1 and transfers.
- `guard_buy_binding`.
- `guard_payout_recredit_accounting`: a concurrent withdraw plus a failed payout neither loses nor double-counts the credit.

`security.rs`:
- `s02_contract_pays_storage_for_new_holders` (measurement).
- `on_payout_recredit_gas_margin` (measurement: 1.675 Tgas burnt against the 5 Tgas static at review time; the static is now 10 Tgas).

**Sanity runs (2026-10-23):**
- `cargo test -p satchel --lib`: **71 passed, 0 failed, 6 ignored**. The ignored tests are the 5 S-proofs above plus the fuzz agent's `parse::fuzz_tests::f01_*`, which is not part of this review.
- `cargo test -p satchel-tests --test security`: **2 passed, 1 ignored** (`s01_*`).

**After the fix pass (2026-10-23, wasm 290,504 B, sha256 `aea0b2e95d1a45278b7b020c2b7e015a41aea6cf5248b765f5cbb72ede451bd6`, INV-22 OK, 27 imports):**
- `cargo test -p satchel --lib`: **86 passed, 0 failed, 0 ignored.**
- `cargo test -p satchel-tests` (the full sandbox suite, nearcore 2.13.4): **83 passed, 0 failed, 0 ignored**, 3 min 09 s wall.
  - Per file: gas 4 · harness 7 · mock_signer 9 · nft 2 · release 2 · sale 10 · security 7 · sign 22 · storage 4 · transfer 7 · usdc 7 · views 2.
  - The S-01 proof prints `sold=true credited=true escrow=5000000 proceeds_of=[{"amount":"5000000","currency":"usdc"}]` with the contract's free balance drained to ≈ 0.0002 NEAR before the buy.
- One earlier full run had `sign::callbacks_are_private` fail once. It passed alone and in the next two full runs. It is timing-sensitive under load (`fast_forward(250)` plus a 90 s wait), and the fix pass did not touch it.
  - **Hardened (2026-10-23, test only).** Cause: it read `status == "pending"` from the latest block after two txs and a view, but the yield expires 200 blocks (≈ 20 s at the sandbox's ≈ 0.1 s blocks) after the mock's `sign`. Under load the yield timed out on its own first (reproduced with a 30 s delay: `left: "failed", right: "pending"`). Now the check reads `sig_records` pinned at `min(block of the refused calls, created_at + 199)`, fast-forwards only the rest of the window, and polls the record to `failed` before reading the tx. After the change: `--test sign` 5/5 green (22 passed each), full suite 83 passed, 0 failed.

## What was checked and found sound

**Blind signing (classifiers)**
- **Every MPC payload is computed on-chain from parsed bytes.** EVM uses keccak(tx), BTC uses sha256d(preimage) and SOL uses the message itself. No path accepts a hash, and `MpcPayload` is built only in `parse::classify`.
- **Hex parsing is strict.** It takes an optional `0x`/`0X` prefix, needs an even length and ASCII hex digits, and rejects Unicode digits, BOMs and whitespace.
- **The RLP decoder is canonical.** It rejects:
  - a wrapped single byte, long forms for short payloads, and length-of-length with a leading zero (or more than 4 bytes);
  - items that overrun their list or the buffer, trailing bytes, and nesting deeper than 16 (MAX_DEPTH).

  It uses `checked_add` throughout and cannot panic on any input; `tx.len() ≤ 128` bounds all work.
- **The EVM classifier accepts only native Sepolia ETH transfers.** It requires type 0x02 only, exactly 9 items, minimal integers, chain id 11155111 with the width checked before comparison, nonce below 2^64−1, a 20-byte `to`, empty `data` and an empty access list.
  - 0x19 (EIP-191, EIP-712), 0x05 and 0x04 (EIP-7702), type 1 and type 3 are all refused.
  - A transfer to a contract address runs only its fallback with `msg.sender` = the token; it cannot create standing approvals, and it consumes the nonce.
- **The BTC classifier admits only complete SIGHASH_ALL transactions.**
  - Field checks: 182-byte preimages, version 2, a P2WPKH scriptCode, nSequence ≥ `fffffffd`, locktime 0 and sighash exactly `01000000`.
  - Cross-checks: hashPrevouts, hashSequence, hashOutputs and pkh must be shared by all preimages; outpoints must not repeat; sha256d(outpoints), sha256d(sequences) and sha256d(outputs) must match the commitments; outputs are parsed strictly (≤ 1024 B, 1–16 outputs, scripts ≤ 520 B, canonical CompactSize).

  Completeness plus SIGHASH_ALL makes "any input spent ⇒ the request is dead" valid. A 182-byte BIP143 preimage cannot also parse as a legacy sighash preimage (kb/70's offset argument holds). Taproot uses a single tagged SHA-256, so it cannot collide.
  - **A foreign pkh in the scriptCode only yields a useless signature.** This includes a P2WSH output whose witness script is the P2PKH script, with or without OP_CODESEPARATOR: the CHECKSIG still needs a pubkey that hashes to that pkh.
- **The SOL classifier enforces the full legacy layout before any policy check.** It parses the whole message (header, canonical compact-u16, 2–16 keys, in-range indices, no trailing bytes). It then scans *every* instruction for a durable nonce, by System key value with a 4-byte prefix match, which is stricter than the runtime's index-0 rule. It requires exactly one System Transfer: 12-byte data, accounts `[0, k]`, signer index 0, read-only signed = 0, and versioned or off-chain messages refused. The parse is the same one Solana's deserializer performs.
- **The keys are separated.** The domains and derivation paths (`satchel/{id}/{chain}`) differ per chain, token ids are counter-only (never caller-chosen strings), and ids are never reused or burned. This was checked against the near-contract-standards 5.29.1 storage prefixes: `0x00 0x20 …` (TokensPerOwner) cannot collide with `0x00 'v'`/`0x00 'n'` (OwnerById).

**Clean-history integrity**
- **Ordering is atomic.** `sign_for` writes n records, updates `sig_count` and `last_sign_height`, flushes, charges storage exactly (`Δbytes × cost + n·d`), emits `sign_requested`, and only then creates the n MPC receipts (one action each, joined with `promise_and`) plus the callback, all in one receipt. Any later failure, such as gas, reverts the records and the promises together. A signature without a record is impossible: only `sign_for` ever addresses the MPC (guard test), and the account is keyless.
- **Records can't be overwritten or deleted.** They are keyed `(token_id, seq)` with `seq` taken from a monotonically increasing `sig_count`, and no method removes or rewrites `detail`, `payload`, `height` or `requester`. `on_signed` touches only `status` and `signature`, and only while the record is Pending. It reads at most `min(n, results)` results, cannot reach a neighbouring request, and grows no storage (INV-29).
- **The callbacks really are private.** `on_signed` and `on_payout` are `#[private]` through the exported wasm wrapper (predecessor == current account; sandbox `callbacks_are_private`). The contract never makes a self-call with caller-controlled arguments.
- **`on_signed` never panics.** It uses `promise_result_checked` with a bound and typed parsing with `.ok()`, and it handles missing records and bogus counts. The sign-to-callback mapping follows the `promise_and` index order.

**Ownership and access**
- **Every path that changes the owner is guarded.** `nft_transfer` checks the owner first, refuses listed tokens, guards the receiver, and requires exactly 1 yocto. A sale goes through `internal_transfer` with sender = seller = the current owner. `nft_transfer_call` always panics. NEP-178 is absent: no `nft_approve` or `nft_resolve_transfer` export, which was checked against the wasm exports.
- **Signing and listing are owner-only and frozen at the right times.** `sign_for` checks the owner and is refused while listed. `list`, `delist` and `buy` are owner-, listing- and seller-bound.
- **Function-call keys cannot call** any method that signs, lists, delists, buys or withdraws: each needs a deposit.
- **The quiet period belongs to the token.** It survives transfers, and delist → sign → relist restarts it. **D1** (a never-signed token lists at once) **cannot be abused**: `sig_count == 0` means no record and no MPC promise ever existed, because both are created in the same receipt.
- **`new` cannot run twice.** `#[init]` refuses a second init, and `PanicOnDefault` blocks any call before init.

**Sale and money**
- **`buy` checks everything the buyer relies on.** The amount must equal the price exactly, the currency must match, self-purchase is refused, `listing_id` comes from a global counter and is never reused, `expected_sig_count` must equal the token's `sig_count` and the listing's, and the seller must be the owner. A listing is immutable, so `listing_id` also pins the price and the currency.
- **`ft_on_transfer` refunds everything on any mismatch.** It requires predecessor == the configured USDC, a strict `FtMsg` and amount == price, and every mismatch panics (a 100 % FT refund). On success it returns `"0"` and never mutates state before returning a non-zero value.
- **The payout is detached**, so the FT never refunds after the NFT has moved.
- **`on_payout` credits correctly.** It re-credits only on `Failed`, never double-credits, and accumulates correctly when a withdraw races a failed payout (guard test).
- **`withdraw_proceeds` zeroes the balance before paying out.** It removes the entry before creating the payout, so a second withdraw finds nothing owed.
- **Storage is charged exactly** in `nft_mint`, `sign_for` and `list` (INV-18), and every refund goes to the predecessor.
- **The contract's balance cannot be drained.** Payouts equal the deposited price, refunds are `attached − required`, MPC excess returns to the contract, and the only contract-paid costs are S-02's.
- **`mpc_deposit` is bounded** to [1 yocto, 0.01 NEAR].

**Async ordering, DoS and limits**
- **In-flight signs are safe:**
  - Transfer while a sign is in flight: the record stays and `on_signed` still resolves it (INV-28).
  - Listing while a sign is in flight: impossible within the quiet period (S-10 covers late callbacks).
  - Sales and transfers are single receipts.
- **Views are paginated and capped at 50.** The `store::Vector` iterator implements `nth`, so `listings` skips in O(1). The only unbounded views are S-05's.
- **The worst-case `sign_requested` log fits.** With 10 BTC preimages and 1 KB of outputs it is ≈ 8 KB, under the 16 KB `max_total_log_length`. SOL messages of up to 1232 B fit as well.
- **Third parties cannot make a token unsellable or unusable.** No third-party call writes `TokenState`, records or listings. The only paths are the owner's or a previous owner's poison records (S-04, S-07) and contract-wide balance exhaustion (S-02).

**INV-22**
- `tools/check-wasm-imports.sh --list` passes on `target/near/satchel/satchel.wasm`: 27 imports.
- The only promise actions are `promise_batch_action_function_call_weight` and `promise_batch_action_transfer`.
- There is no AddKey, DeployContract, DeleteAccount, Stake or DeleteKey import, and no global-contract import.
- The exports are exactly the spec's interface plus `__contract_abi` and `contract_source_metadata`.
