# Satchel contract: test guide and coverage audit

Status: DRAFT (audit in progress, 2026-10-30). This file is filled in step by step; sections marked TODO are not
finished yet.

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
| `sign_for` (delegate, C5) | `allowance_tests::*` | `allowance::*` |
| `on_signed` | `tests::on_signed_fills_slots_never_panics_and_grows_no_storage` | `sign::callback_fills_slot`, `timeout_never_sticks`, `garbage_response`, `mpc_panics`, `btc_fanout_partial_failure`, `storage::callback_no_growth`, `sign::callbacks_are_private` |
| `list` / `delist` | `tests::quiet_period_and_freeze`, `list_guards`, `list_zero_deposit_rejected`, `fix_s03_*` | `sale::quiet_period_*`, `delist_resumes_signing`, `list_guards`, `zero_deposit_rejected` |
| `buy` | `tests::buy_*`, `security_tests::guard_buy_binding` | `sale::buy_*` |
| `ft_on_transfer` (buy/offer/deposit) | `tests::ft_on_transfer_*`, `market_tests::ft_on_transfer_routing_guards`, `ft_msg_shapes_are_exact`, `prop_ft_msg_garbage_is_refused_cleanly` | `usdc::*`, `market::ft_deposit_storage_credit_and_refunds`, `market::offer_usdc_accept` |
| `withdraw_proceeds` | `tests::payout_failure_recredit_and_withdraw`, `fix_s03_*` | `sale::payout_failure_recredit`, `security::fix_s03_exactly_one_yocto` |
| `on_payout` | `fix_s13_on_payout_needs_exactly_one_promise_result`, `guard_payout_recredit_accounting` | `security::s01_*`, `on_payout_recredit_gas_margin`, `usdc::unregistered_seller_recredit` |
| `set_allowance` / `revoke_allowance` | `allowance_tests::set_allowance_*`, `revoke_guards_and_effect`, … | `allowance::set_allowance_guards_and_charge` |
| `allowances_of` / `allowance` | `allowance_tests::views_for_unknown_tokens_and_delegates` | `allowance::*` (indirect) |
| `deposit_near` / `withdraw_near` | `market_tests::deposit_near_*`, `withdraw_near_*` | `market::deposit_and_withdraw_near`, `withdraw_blocked_while_listed` |
| `withdraw_ft` | `market_tests::withdraw_ft_guards_and_call_shape` | `market::withdraw_failures_recredit` |
| `on_inside_withdraw` | `market_tests::on_inside_withdraw_recredits_only_on_failure_and_never_panics` | `market::withdraw_failures_recredit` |
| `prepay_storage` / `withdraw_storage_credit` / `storage_credit_of` | `market_tests::prepay_and_withdraw_storage_credit` | `market::ft_deposit_storage_credit_and_refunds` |
| `make_offer` / `cancel_offer` / `accept_offer` | `market_tests::*offer*` | `market::offer_*` |
| `offer` / `offers_for` / `offers_by` | `market_tests::offer_indexes_survive_swap_remove` | `market::offer_*` (indirect) |
| `inside_of`, `market_config`, `market_totals` | `market_tests::*`, `prop_accounting_matches_model` | `market::near_solvency_invariant`, `ft_solvency_invariant` |
| `config`, `satchel`, `sig_records`, `listings`, `proceeds_of`, `derived_path` | `tests::views_shapes_and_paging` | `views::view_shapes_match_spec` |
| `history_digest` (C1) | `feature_tests::c1_*` | `features::c1_history_digest_matches_independent_impl`, `review::sr05_history_digest_gas_ceiling` |
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

## 3. Edge cases explored

TODO (in progress).

## 4. Bugs and open questions

TODO (in progress).

## 5. What remains untested and why

TODO (in progress).
