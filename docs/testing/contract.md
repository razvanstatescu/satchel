# Satchel contract: test guide and coverage audit

Status: test audit of 2026-10-30 (branch `test/contract`). Contract source was NOT changed; every finding is a test.

Scope: `contracts/satchel` (unit tests) and `tests/` (sandbox suite, near-workspaces 0.23.0 with the mock signer and
mock FT). The source of truth for intended behaviour is `kb/90-technical-spec.md` §5–§6 and `docs/specs/*.md`.

## 1. How to run the suites

Every command below assumes the toolchain pinned by `rust-toolchain.toml` (Rust 1.93.0). On this machine prefix each
shell with `export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$PATH";`.

| Suite | Command | Needs |
|---|---|---|
| Contract unit tests (incl. parser fuzz/proptest, shared vectors) | `cargo test -p satchel` | nothing (offline) |
| Sandbox suite | build the three wasms, then `cargo test -p satchel-tests` | the wasms in `target/near/` |

Building the wasms for the sandbox (only `cargo near build`, never plain `cargo build`):

```bash
cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml
cargo near build non-reproducible-wasm --manifest-path contracts/mock-signer/Cargo.toml
cargo near build non-reproducible-wasm --manifest-path contracts/mock-ft/Cargo.toml
cargo test -p satchel-tests            # all sandbox files; add `--test sale` for one file
```

- `SATCHEL_WASM=<path>` runs the sandbox suite against another artifact (e.g. the reproducible build).
- `SANDBOX_VERSION=2.14.0-rc.5` runs it against testnet's nearcore instead of the default 2.13.4.
- `tools/check-wasm-imports.sh target/near/satchel/satchel.wasm` is INV-22 (no AddKey / Deploy / DeleteAccount imports).

## 2. Coverage matrix

Legend: U = unit test (`contracts/satchel/src/…`), S = sandbox test (`tests/tests/…`). Names are `file::test`.

### 2.1 Public methods, callbacks and views

| Method | Unit | Sandbox |
|---|---|---|
| `new` | `tests::config_matches_constants` | `views::config_matches_constants`, `release::keyless_birth_batch` (second `new` fails) |
| `nft_mint` | `tests::ids_sequential_no_approvals_and_mint_charges_exactly`, `security_tests::s06_*`, `fix_s06_s09_*` | `nft::ids_sequential_no_burn`, `nft::mint_rules_and_metadata`, `storage::mint_and_list_charge_exactly` |
| `nft_transfer` | `tests::transfer_guards`, `tests::transfer_keeps_history_and_inflight_resolution`, `fix_s06_s09_*`, `m01_transfer_*` | `transfer::*`, `security::fix_s06_s09_receiver_guard`, `market::m01_transfer_to_new_holder_never_spends_escrow` |
| `nft_transfer_call` | `tests::transfer_guards` | `transfer::transfer_call_disabled` |
| `nft_token`, `nft_total_supply`, `nft_tokens`, `nft_supply_for_owner`, `nft_tokens_for_owner`, `nft_metadata` | `security_tests::s05_*`, `fix_s05_*` | `security::fix_s05_nep181_views_are_paged`, `nft::mint_rules_and_metadata` |
| `sign_for` (EVM/BTC/SOL) | `tests::sign_for_*`, `security_tests::guard_*`, `parse::tests::*`, `parse::fuzz_tests::*` | `sign::*`, `gas::*`, `storage::sign_for_charges_exactly` |
| `sign_for` (C7 messages) | `feature_tests::c7_*` | `features::c7_*` |
| `sign_for` (delegate, C5) | `allowance_tests::*`, `audit01_*` | `allowance::*`, `audit::audit01_*` |
| `on_signed` | `tests::on_signed_fills_slots_never_panics_and_grows_no_storage`, `tests::audit_on_signed_defensive_paths` | `sign::callback_fills_slot`, `timeout_never_sticks`, `garbage_response`, `mpc_panics`, `btc_fanout_partial_failure`, `storage::callback_no_growth`, `sign::callbacks_are_private` |
| `list` / `delist` | `tests::quiet_period_and_freeze`, `list_guards`, `list_zero_deposit_rejected`, `fix_s03_*` | `sale::quiet_period_*`, `delist_resumes_signing`, `list_guards`, `zero_deposit_rejected` |
| `buy` | `tests::buy_*`, `security_tests::guard_buy_binding` | `sale::buy_*` |
| `ft_on_transfer` (buy/offer/deposit) | `tests::ft_on_transfer_*`, `market_tests::ft_on_transfer_routing_guards`, `ft_msg_shapes_are_exact`, `prop_ft_msg_garbage_is_refused_cleanly` | `usdc::*`, `market::ft_deposit_storage_credit_and_refunds`, `market::offer_usdc_accept` |
| `withdraw_proceeds` | `tests::payout_failure_recredit_and_withdraw`, `fix_s03_*` | `sale::payout_failure_recredit`, `security::fix_s03_exactly_one_yocto` |
| `on_payout` | `fix_s13_on_payout_needs_exactly_one_promise_result`, `guard_payout_recredit_accounting` | `security::s01_*`, `on_payout_recredit_gas_margin`, `usdc::unregistered_seller_recredit` |
| `set_allowance` / `revoke_allowance` | `allowance_tests::set_allowance_*`, `revoke_guards_and_effect`, … | `allowance::set_allowance_guards_and_charge` |
| `allowances_of` / `allowance` | `allowance_tests::views_for_unknown_tokens_and_delegates` | `allowance::*` (indirect) |
| `deposit_near` / `withdraw_near` | `market_tests::deposit_near_*`, `withdraw_near_*` | `market::deposit_and_withdraw_near`, `withdraw_blocked_while_listed` |
| `withdraw_ft` | `market_tests::withdraw_ft_guards_and_call_shape` | `market::withdraw_failures_recredit`, `audit::audit_wnear_inside_deposit_withdraw_and_refusals` (wNEAR) |
| `on_inside_withdraw` | `market_tests::on_inside_withdraw_recredits_only_on_failure_and_never_panics` | `market::withdraw_failures_recredit` |
| `prepay_storage` / `withdraw_storage_credit` / `storage_credit_of` | `market_tests::prepay_and_withdraw_storage_credit`, `audit_withdraw_storage_credit_event_and_bare_transfer` | `market::ft_deposit_storage_credit_and_refunds` |
| `make_offer` / `cancel_offer` / `accept_offer` | `market_tests::*offer*` | `market::offer_*` |
| `offer` / `offers_for` / `offers_by` | `market_tests::offer_indexes_survive_swap_remove`, `audit_offer_pages_edges` | `market::offer_*` (indirect) |
| `inside_of`, `market_config`, `market_totals` | `market_tests::*`, `prop_accounting_matches_model` | `market::near_solvency_invariant`, `ft_solvency_invariant` |
| `config`, `satchel`, `sig_records`, `listings`, `proceeds_of`, `derived_path` | `tests::views_shapes_and_paging`, `tests::audit_view_edge_arguments_never_panic` | `views::view_shapes_match_spec`, `audit::audit02_*` |
| `history_digest` (C1) | `feature_tests::c1_*`, `tests::audit_history_digest_moves_only_with_new_records` | `features::c1_history_digest_matches_independent_impl`, `review::sr05_history_digest_gas_ceiling` |
| `max_evm_nonce` (C3) | `feature_tests::c3_*` | `features::c3_nonce_gap_is_per_chain` |

### 2.2 Invariants

| INV | Unit | Sandbox |
|---|---|---|
| INV-01 non-owner `sign_for` | `tests::sign_for_guards_and_refusals_change_nothing` | `sign::non_owner_rejected` |
| INV-02 control follows ownership | `tests::transfer_keeps_history_*` | `transfer::transfer_moves_control`, `sale::buy_moves_control`, `usdc::ft_buy_moves_control` |
| INV-03 no approvals | `tests::ids_sequential_no_approvals_*` | `transfer::no_approvals_surface` |
| INV-05 transfer_call disabled | `tests::transfer_guards` | `transfer::transfer_call_disabled` |
| INV-06 MPC request shape | `mpc::tests::request_json_shape` | `sign::mpc_request_shape_{evm,btc,sol}` |
| INV-07 payload = hash of bytes | `parse::tests::*payload*`, `shared_vectors` | `sign::payload_is_hash_of_preimage*` |
| INV-08 event matches MPC request | — | `sign::event_matches_mpc_request` |
| INV-09 refusals change nothing | `parse::tests::shared_vectors`, `tests::sign_for_guards_*` | `sign::refusals_change_nothing_{evm,btc,sol}` |
| INV-10 EVM nonce-gap | `security_tests::s04_*`, `fix_s04_*` | `security::fix_s04_nonce_gap_rule` |
| INV-11 append-only log | `security_tests::guard_records_append_only_*` | `sign::log_append_only`, `transfer::records_survive_transfer` |
| INV-12 nothing sticks | `tests::on_signed_fills_slots_*` | `sign::timeout_never_sticks`, `garbage_response`, `mpc_panics` |
| INV-13 quiet period / freeze | `tests::quiet_period_and_freeze` | `sale::quiet_period_and_freeze`, `quiet_period_exact_boundary` |
| INV-14 buy guards | `tests::buy_guards_then_buy_right_after_list`, `buy_currency_mismatch_and_old_listing_id` | `sale::buy_guards`, `buy_right_after_list` |
| INV-15 buy happy path | `tests::buy_guards_then_*` | `sale::buy_happy_path` |
| INV-16 ft_on_transfer refunds | `tests::ft_on_transfer_*` | `usdc::ft_guards`, `direct_call_attack`, `near_listing_refunds`, `ft_self_buy` |
| INV-17 deposits | `tests::list_zero_deposit_rejected`, `fix_s03_*` | `sign::zero_deposit_rejected`, `sale::zero_deposit_rejected`, `security::fix_s03_exactly_one_yocto`, `transfer::transfer_exactly_one_yocto` |
| INV-18 exact storage charge | `tests::sign_for_evm_records_charges_and_calls_mpc`, `feature_tests::c7_long_message_*` | `storage::sign_for_charges_exactly`, `excess_refunded`, `mint_and_list_charge_exactly` |
| INV-19 gas floor | `tests::sign_for_guards_*` | `gas::floor_and_forwarding_{1,2,4,10}` |
| INV-21 ids sequential | `tests::ids_sequential_*` | `nft::ids_sequential_no_burn` |
| INV-22 wasm imports | — | `harness::wasm_import_check_*` (+ `tools/check-wasm-imports.sh`) |
| INV-23 BTC completeness | `parse::tests::btc_*`, `security_tests::guard_btc_*` | `sign::btc_records_per_input` |
| INV-24 BTC fan-out partial failure | `tests::sign_for_btc_fans_out_*` | `sign::btc_fanout_partial_failure` |
| INV-25 payout failure re-credit | `fix_s01_*`, `fix_s13_*` | `sale::payout_failure_recredit`, `usdc::unregistered_seller_recredit`, `security::s01_*` |
| INV-26 mpc_deposit bounds | `tests::sign_for_guards_*` | `sign::mpc_deposit_bounds` |
| INV-27 config = constants | `tests::config_matches_constants` | `views::config_matches_constants` |
| INV-28 transfer during in-flight sign | `tests::transfer_keeps_history_and_inflight_resolution` | `transfer::transfer_during_inflight_sign` |
| INV-29 callback grows no storage | `tests::on_signed_fills_slots_*` | `storage::callback_no_growth` |
| INV-30 receiver guard, NEP-181 paging | `fix_s06_s09_*`, `fix_s09_*`, `fix_s05_*` | `transfer::bad_receivers`, `security::fix_s06_s09_*`, `fix_s05_*` |
| INV-31 keyless birth | — | `release::keyless_birth_batch`, `failed_birth_leaves_nothing` |
| INV-34 delegate authorization | `allowance_tests::*` | `allowance::*` |
| INV-35 ownership change clears allowances | `allowance_tests::transfer_clears_*`, `usdc_sale_clears_too`, `market_tests::delegates_cannot_withdraw_or_accept_and_accept_clears_allowances` | `allowance::transfer_clears_allowances`, `sales_clear_allowances`, `market::offer_accept_clears_allowances_*` |
| INV-36 market solvency (I-M1…I-M8) | `market_tests::m01_*`, `prop_*` | `market::*solvency*`, `m01_*`, `review::m01_*` |
| INV-37 messages never transactions | `parse::msg::tests::signed_bytes_never_parse_as_transactions` | `features::c7_messages_mpc_shape_records_and_refusals` |
| INV-38 per-chain nonce gap | `feature_tests::c3_nonce_gap_is_per_chain` | `features::c3_nonce_gap_is_per_chain` |

Before the audit nothing covered: wNEAR end to end (unit only), the `storage_credit_withdrawn` event, the sandbox
fields of `listed`/`sold`/`payout`, view arguments past `u32`, `history_digest` across ownership changes, `on_signed`
replays, and the half-open offer expiry on the accept side. Each now has a test (section 3).

## 3. Edge cases explored

Result key: **covered** (an existing test already pins it), **added** (new test in this audit), **bug** (new test,
`#[ignore = "BUG …"]`, fails today), **untested** (left out, reason given).

### 3.1 Signing (`sign_for`, parsers, `on_signed`)

| Edge case | Result | Where |
|---|---|---|
| Non-owner, delegate, owner of a listed token (`ERR_FROZEN`) | covered | `sign::non_owner_rejected`, `allowance_tests::listing_pauses_then_sale_clears` |
| Gas exactly at `30 + 18·n` and one below; n = 1, 2, 4, 10 | covered | `gas::floor_and_forwarding_*`, `mock_signer::mock_exact_floor_gas_completes` |
| `mpc_deposit` 0, 1, `MAX`, `MAX + 1` | covered | `sign::mpc_deposit_bounds`, `tests::sign_for_guards_*` |
| Deposit 0, 1 yocto, exact, excess refunded | covered | `sign::zero_deposit_rejected`, `storage::sign_for_charges_exactly`, `excess_refunded` |
| BTC 0 and 11 inputs; 181/183-byte preimages; mixed tx; prevouts/sequences/outputs mismatch; duplicate input; SIGHASH NONE/SINGLE/ANYONECANPAY; locktime; version 1; 17 outputs; 521-byte script; > 1024 B outputs; non-canonical varint; trailing bytes | covered | 39 `vectors/btc.json` cases, `parse::fuzz_tests::btc_*`, `security_tests::guard_btc_*` |
| EVM legacy/155/type-1/type-4/7702 auth/EIP-191/EIP-712/raw hash; every chain id; over-wide ints; nonce 2^64−1; 160 vs 161 bytes; trailing byte; non-canonical RLP; depth 16 vs 17; ERC-20 approve/transferFrom/short/long calldata; value on a USDC transfer; wrong chain's USDC | covered | 86 `vectors/evm.json` cases, `feature_tests::c2_*`, `parse::fuzz_tests::evm_*` |
| EVM nonce gap per chain, first request nonce 0/1/2, poison nonce | covered | `security_tests::fix_s04_*`, `feature_tests::c3_*`, `nonce_gap_*` vectors |
| SOL v0 / off-chain `0xff` / durable nonce at ix 0 and 1 / two transfers / compute budget / two signers / readonly / truncated / 1233 bytes | covered | 29 `vectors/sol.json` cases |
| C7 messages: empty, 1 byte, 1024, 1025, NUL, invalid/truncated UTF-8, surrogate, overlong, a raw tx as a message | covered | 29 `vectors/msg.json` cases, `feature_tests::c7_*` |
| Message bytes never parse as a transaction (INV-37) | covered | `parse::msg::tests::signed_bytes_never_parse_as_transactions` |
| `on_signed`: replay cannot upgrade a resolved record; `n` larger than results; missing seqs; `first_seq` near `u64::MAX`; an Ed25519 reply on an EVM record → `unparsed` | added | `tests::audit_on_signed_defensive_paths` |
| `on_signed` TooLong / garbage / panic / timeout | covered | `sign::garbage_response`, `mpc_panics`, `timeout_never_sticks` |
| RLP length-of-length on wasm32 (`usize` = 32 bit) | covered by code review | `read_len` refuses `len_of_len > 4`, so no wrap on wasm32 (contrast AUDIT-02) |

### 3.2 Allowances (C5)

| Edge case | Result | Where |
|---|---|---|
| Cap exactly at the debit and one over; fees counted; ERC-20 + gas; rollover; sliding window; expiry boundary; rate limit 32 | covered | `allowance_tests::cap_edges_*`, `window_rollover`, `sliding_window_*`, `expiry_edge`, `rate_limit_*` |
| Delegate after a transfer / sale / accept; a stale set from a previous owner; paused while listed | covered | `allowance_tests::transfer_clears_*`, `usdc_sale_clears_too`, `stale_set_*`, `market_tests::delegates_cannot_withdraw_or_accept_*` |
| **Two requests for one BTC tx, each understating a different input (BIP143 split amounts)** | **bug AUDIT-01** | `allowance_tests::audit01_btc_split_amount_requests_bypass_the_delegate_cap`, `audit::audit01_*` (both ignored) |
| The same tx with real amounts in one request is debited in full | added | `allowance_tests::audit01_btc_real_amounts_in_one_request_debit_the_full_fee` |

### 3.3 Sale, offers, inside assets, storage (C4/C6, M-01)

| Edge case | Result | Where |
|---|---|---|
| Quiet period at exactly `last_sign_height + 250` and one before | covered | `sale::quiet_period_exact_boundary`, `market_tests::accept_offer_at_the_quiet_period_boundary` |
| Buy: wrong listing id, stale sig count, wrong currency, price ± 1, self-buy, old listing id after relist | covered | `sale::buy_guards`, `tests::buy_*` |
| Payout failure → proceeds; withdraw exactly 1 yocto; `on_payout` with ≠ 1 results | covered | `sale::payout_failure_recredit`, `security::s01_*`, `fix_s13_*` |
| Offer expiry: make at `now` and `now + TTL + 1` refused, `now + TTL` accepted | covered | `market_tests::make_offer_guards_change_nothing` |
| Offer expiry on accept/cancel: accept 1 ms before expiry works, at expiry `ERR_OFFER_EXPIRED`; a stranger's cancel 1 ms before is `ERR_NOT_OFFERER` | added | `market_tests::audit_offer_expiry_boundary_is_half_open` |
| Offer stale after a signature or a withdrawal; offerer became owner (`ERR_SELF_BUY`); self-offer; MPC as offerer; 20-offer cap per account | covered | `market_tests::accept_offer_guards`, `make_offer_guards_change_nothing`, `offer_cap_is_per_offerer_not_per_token` |
| Offer survives a gift; the new owner accepts and is paid | added (by design, C4-C6.md §3 "the new owner may accept them") | `market_tests::audit_offer_survives_a_gift_and_the_new_owner_accepts` |
| Offer made while listed survives a `buy`; the buyer accepts it at once | added | `market_tests::audit_offer_made_while_listed_survives_the_sale` |
| Deposits while listed (NEAR and FT) allowed; withdraw while listed `ERR_LISTED`; withdraw receiver = MPC / USDC accepted, = contract refused | added | `market_tests::audit_deposits_while_listed_and_withdraw_receivers` |
| wNEAR: first deposit without credit refunded; deposit with credit; `buy` and `offer` msgs from wNEAR refunded (`ERR_WRONG_TOKEN`); withdraw to owner; withdraw to an unregistered account re-credited; FT balance equals inside | added | `audit::audit_wnear_inside_deposit_withdraw_and_refusals` |
| `ft_on_transfer` msg: unknown extra fields accepted; two top-level keys, numeric id, wrong case, negative id, missing field, empty refused | added | `market_tests::audit_ft_msg_lenient_and_strict_cases` |
| `withdraw_storage_credit` event fields; it pays with a bare transfer and no callback | added (observation AUDIT-03) | `market_tests::audit_withdraw_storage_credit_event_and_bare_transfer` |
| M-01: transfer / NEAR buy / USDC buy / accept refused at exactly one yocto short; calls that free storage pass | covered | `market_tests::m01_*`, `market::m01_*`, `review::m01_*` |
| **Events logged before a later refusal in the same receipt** | **bug AUDIT-04** | `market_tests::audit04_refused_calls_log_no_events`, `audit::audit04_refused_make_offer_logs_no_offer_made` (both ignored); `audit04_well_ordered_paths_log_nothing_when_refused` (passes) |

### 3.4 Views, events, NFT

| Edge case | Result | Where |
|---|---|---|
| Unknown / empty / `"01"` token ids in every view; limit 0; limit `u32::MAX`; offsets `u64::MAX`; unsupported chain in `max_evm_nonce`; `derived_path` of a token that does not exist | added | `tests::audit_view_edge_arguments_never_panic`, `market_tests::audit_offer_pages_edges` |
| **`listings(from_index ≥ 2^32)` on wasm32** | **bug AUDIT-02** | `audit::audit02_listings_from_index_does_not_wrap` (ignored) |
| `sig_records` / `offers_*` with offsets ≥ 2^32 on wasm32; NEP-181 offset past the supply refused | added | `audit::audit02_other_paged_views_handle_huge_offsets` |
| `history_digest` unchanged by `on_signed`, transfer, list, delist, sale; changes with a new record | added | `tests::audit_history_digest_moves_only_with_new_records` |
| `listed` / `delisted` / `sold` / `payout` fields on the real wasm; a refused second `list` logs nothing | added | `audit::audit_sale_path_event_fields` |
| Receiver guard (contract, MPC, USDC), `usdc: None` | covered | `security::fix_s06_s09_receiver_guard` |
| Keyless birth, failed birth leaves no account, second `new` fails | covered | `release::*` |

## 4. Bugs and open questions

### AUDIT-01 (Medium, C5): delegate BTC cap bypass with BIP143 split-amount requests

- **Where:** `allowance.rs::btc_debit` (and its TS mirror `allowanceDebits` in `packages/core`).
- **Repro:** a token with 2 P2WPKH UTXOs A and B of 1,000,000 sats each; a delegate with a 1,000-sat BTC cap.
  Build one tx spending A and B with a single 1,000,000-sat output back to the Satchel's own `0014‖pkh`
  (real fee: 1,000,000 sats). Request 1: preimages with A's real amount and B's amount stated as 1 sat. Request 2:
  A stated as 1 sat, B real. Each request's debit is `external (0) + max(0, Σ stated inputs − Σ outputs) = 1` sat,
  so both pass. Signature A from request 1 and signature B from request 2 commit to the real amounts of their own
  inputs and to the same prevouts, sequences and outputs, so together they form a valid tx (the review's "understating
  an amount yields an invalid signature" holds per input only; segwit v0 commits to each input's amount in that
  input's sighash alone, the 2020 segwit fee issue).
- **Impact:** a delegate can burn up to about `(n − 1) × change` of the owner's BTC as miner fee while being debited
  a few sats; with a colluding miner that fee is theft. Bitcoin Core's default `maxfeerate` refuses such a tx at
  `sendrawtransaction`, but consensus accepts it and any node with `-maxfeerate=0` or a miner relays it. Owners are
  not affected (they are trusted); clean history is not affected (every request is recorded before the MPC call).
- **Tests:** `contracts/satchel/src/allowance_tests.rs::audit01_btc_split_amount_requests_bypass_the_delegate_cap`
  (unit) and `tests/tests/audit.rs::audit01_btc_split_amount_requests_bypass_the_delegate_cap` (real wasm), both
  `#[ignore]` and failing today.
- **Suggested fix (pick one before the freeze; the TS mirror and `vectors/allowance.json` must change with it):**
  1. Simplest: delegates may sign BTC only with exactly one input (`n > 1` → `ERR_ALLOWANCE_KIND`). A single sighash
     commits to the only input's amount, so the stated fee is the real fee.
  2. Or, for `n > 1`, debit `Σ stated input amounts` (change counted as spent). Over the n requests needed to obtain
     all n signatures, the debits sum to at least `Σ real input amounts`, which bounds the real outflow.
  3. Or keep an outpoint → amount map per token and refuse a request whose stated amount differs from an earlier
     record of the same outpoint (more storage and code).

### AUDIT-02 (Info): `listings(from_index ≥ 2^32)` returns the first page on wasm32

- **Where:** `views.rs::listings`, `.skip(from_index as usize)`: on wasm32 `usize` is 32 bits, so `2^32` becomes 0.
- **Repro:** one listing; `listings({"from_index": 4294967296, "limit": 50})` returns it instead of `[]`.
  Unit tests (64-bit host) cannot see it; the sandbox does.
- **Impact:** none for the UI (it pages from 0). An offset-paging client could loop or double count.
- **Test:** `tests/tests/audit.rs::audit02_listings_from_index_does_not_wrap` (ignored).
- **Fix:** `usize::try_from(from_index).unwrap_or(usize::MAX)`, or return `[]` when `from_index ≥ listings.len()`.

### AUDIT-04 (Low): events logged before a later refusal in the same receipt

- **Where:** `offers.rs::insert_offer` emits `offer_made` before `make_offer`'s `charge_storage` and `ft_offer`'s
  `charge_credit` can refuse; `sale.rs::execute_sale` (nep171 `nft_transfer`, `allowances_cleared`, `sold`),
  `offers.rs::accept_offer` (`delisted`, `allowances_cleared`, `offer_accepted`) and `lib.rs::nft_transfer` (nep171
  `nft_transfer`, `allowances_cleared`) emit before `ensure_solvent` can refuse `ERR_INSOLVENT`.
- **Why it matters:** `events.rs` and spec §5.8 step 7 say events are emitted after every require, because the logs
  of a failed receipt stay visible. A refused call therefore shows an offer or a sale that never happened. An indexer
  that follows spec §5.13 ("trust events only from successful receipts") is unaffected; anything that greps logs
  (FastNEAR `is_event_log` filters, explorers, the app if it ever reads events without the receipt status) is misled.
- **Repro:** `make_offer` attaching `amount + 1` yocto → `ERR_DEPOSIT`, and the failed receipt logs `offer_made`
  (sandbox `audit04_refused_make_offer_logs_no_offer_made`); an insolvent NEAR buy logs `nft_transfer` + `sold` and
  then panics `ERR_INSOLVENT` (unit `audit04_refused_calls_log_no_events`). Both ignored.
- **Fix:** move the `emit()` calls after `charge_storage` / `charge_credit` / `ensure_solvent` (events are plain
  logs, so this changes no state). Or, if the order is kept, state in spec §5.13 that only successful receipts' events
  count, and check every consumer.

### AUDIT-03 (Info, observation; no change proposed)

`withdraw_storage_credit` zeroes the credit and pays with a bare transfer, without a callback. If that transfer ever
failed (only if the caller's account is deleted between the call and the transfer receipt), the NEAR would return to
the contract as unowned buffer instead of being re-credited, unlike `withdraw_near`, `withdraw_proceeds` and
`cancel_offer`. The caller would have to delete their own account in that window. Pinned by
`market_tests::audit_withdraw_storage_credit_event_and_bare_transfer`.

### Open questions

- **Q-01 (AUDIT-01 fix):** is "delegates sign single-input BTC only" acceptable product-wise (the Send builder picks
  largest-first, so most sends use 1–3 inputs)? If not, option 2 is the smallest safe change.
- **Q-02 (by design, recorded):** offers survive ownership changes (C4-C6.md §3: "the new owner may accept them"), so
  the owner who receives a gift can accept an offer made to the previous owner. Pinned by
  `audit_offer_survives_a_gift_and_the_new_owner_accepts`.
- **Q-03:** `withdraw_near` / `withdraw_ft` refuse only the contract itself as receiver (spec rule 8). Sending inside
  NEAR to the MPC or the USDC contract is accepted and is a user error the UI should catch. Intended?
- **Q-04:** `ft_on_transfer` msgs accept unknown extra fields (serde default). Harmless today (the amount must still
  equal the price); should the parser be strict (`deny_unknown_fields`) to match the TS mirror's exact strings?
- **Q-05:** transient I-M1 window: when a withdrawal or payout transfer fails, `on_inside_withdraw` / `on_payout`
  re-credits escrow while the runtime's refund of the failed transfer may land in a later receipt. Until it lands,
  `market_totals().escrow_near` can exceed `balance − stake` by that amount, and an `ensure_solvent` check in that
  window could refuse with `ERR_INSOLVENT` (harmless, retryable). `market::withdraw_failures_recredit` waits 2 s
  before checking solvency for this reason. Not reproduced deterministically.

## 5. What remains untested and why

- **Real MPC behaviour** (`v1.signer-prod.testnet`): latency, queue-full and timeout rates, real signature validity
  on each chain. The sandbox uses `contracts/mock-signer`; real signing is `tools/e2e/{evm,btc,sol}.ts --sign-only`
  on testnet, which this audit was not allowed to run (no testnet transactions).
- **Live testnet timing:** the quiet period in seconds (block time 0.55–0.57 s), MPC yields of 200 blocks under load,
  late `respond` after a timeout. The sandbox fast-forwards blocks instead.
- **Broadcast validity of BTC/EVM/SOL signatures** on real nodes (AUDIT-01's spendability argument is BIP143 math,
  not a broadcast); no bitcoind / anvil / solana-test-validator in this suite.
- **Circle testnet USDC and the real `wrap.testnet`:** the sandbox uses `contracts/mock-ft` (near-contract-standards
  semantics) at those roles.
- **The TS mirror's agreement with `vectors/*.json`:** the Rust side reads every vector (`parse::tests::shared_vectors`,
  `allowance_tests::shared_allowance_vectors`, `feature_tests::c1_history_shared_vectors`,
  `parse::fuzz_tests::differential_vs_ts_reference`). The vitest side (`packages/core`) was not run: no
  `node_modules` in this worktree, and `packages/core` belongs to another agent. No vector was changed.
- **The reproducible build and the rc/final keyless birth on testnet** (SAT-081, SAT-082): out of scope (no deploys).
- **`withdraw_storage_credit` with a failing transfer** (AUDIT-03) and **Q-05's window**: both need an account
  deletion or receipt-ordering race the sandbox cannot schedule deterministically.
- **`nearcore 2.14` (testnet's version):** the suite runs on the sandbox default 2.13.4; `SANDBOX_VERSION=2.14.0-rc.5`
  re-runs it on 2.14 but was not part of this audit run.

## 6. Test counts (this audit)

TODO: filled in after the final full run.
