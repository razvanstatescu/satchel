# Handoff: `sandbox` (contracts/mock-signer, contracts/mock-ft, tests/, tools/check-wasm-imports.sh)

> **Historical record** (2026-10-22, against the v1 wasm `bec41e44…`). The harness, the how-to-run steps (§2) and the
> mock interfaces (§3) still hold. The suite has grown since: 83 tests after the security fix pass (2026-10-23), the
> sprint files `allowance`, `features`, `market` and `review` (2026-10-29), the test audit's `audit`, `round2` and
> `gas_paths` files, and Q-03/Q-04: **137 passed** on 2026-10-31. The §5 INV map stops at INV-31 (the v1 invariants).
> **Current truth:** the latest measured counts are in [`docs/testing/README.md`](../testing/README.md); the full
> method and invariant coverage matrix (including the sprint's INV-34…INV-38) is
> [`docs/testing/contract.md`](../testing/contract.md) §2. Shorthand: [docs/GLOSSARY.md](../GLOSSARY.md).

Status: **suite complete and green** against `satchel.wasm` sha256 `bec41e44…8da584` (2026-10-22). The sections are: (0) results, (1) contract findings, (2) how to run, (3) mock interfaces, (4) deviations, (5) the INV → test map.

## 0. Results (2026-10-22, Apple Silicon)
- `cargo test -p mock-signer -p mock-ft`: 17 + 6 unit tests passed.
- `cargo test -p satchel-tests` on nearcore 2.13.4: **76 passed, 0 failed**, about 142 s wall (warm build).
  - Per file: gas 4 · harness 7 · mock_signer 9 · nft 2 · release 2 · sale 10 · sign 22 · storage 4 · transfer 7 · usdc 7 · views 2.
- `SANDBOX_VERSION=2.14.0-rc.5 cargo test -p satchel-tests`: 73/73 passed. That run predates the 3 checker self-tests added to `harness.rs`.
- `tools/check-wasm-imports.sh`: INV-22 OK. The only promise actions imported are `function_call_weight` and `transfer`.
- Measured:
  - `timeout_never_sticks`: resolved about 2.8 s after `fast_forward(250)`.
  - Keyless birth: 72.4 Tgas burnt.
  - Gas burnt per `sign_for` tx: n = 1 → 13.8 Tgas; n = 2 → 23.6; n = 4 → 42.1; n = 10 → 97.6.
  - Storage per record: EVM 268 B, BTC 241 B per input, SOL 237 B. Mint 638 B, list 185 B.
  - Quiet-period boundary: refused at `listable_at − 1`, accepted at exactly `listable_at`.
  - All 24 accepted shared vectors (`vectors/*.json`) reach the mock with the expected `payload_v2`.

## 1. Findings for `contract` (contracts/satchel)

**No open contract bugs.** Every failure seen while building the suite was on the harness or mock side (below, "harness notes"). F-1 was already handled by the contract (its D2). The F-1 text is kept as background for anyone touching promises.

### F-1 (RESOLVED by contract D2): `near_sdk::Promise` imports every batch action, including AddKey / DeployContract / DeleteAccount

- **Test:** `tools/check-wasm-imports.sh target/near/satchel/satchel.wasm`, the INV-22 static check (spec §6, S-13).
- **Expected:** no import of `promise_batch_action_add_key*`, `promise_batch_action_deploy_contract*` or `promise_batch_action_delete_account`.
- **Actual:** any crate that uses `near_sdk::Promise` imports all of them. near-sdk 5.29.1 `src/promise.rs` L98–150, `impl PromiseAction { fn add(..) { match self { DeployContract => env::promise_batch_action_deploy_contract, AddFullAccessKey => …add_key_with_full_access, DeleteAccount => …delete_account, … } } }`: one function, all variants. Repro: both mock contracts use `Promise` and fail.
  ```
  $ tools/check-wasm-imports.sh target/near/mock_signer/mock_signer.wasm
  FORBIDDEN import: env.promise_batch_action_deploy_contract
  FORBIDDEN import: env.promise_batch_action_add_key_with_full_access
  FORBIDDEN import: env.promise_batch_action_add_key_with_function_call
  FORBIDDEN import: env.promise_batch_action_delete_account
  … (deploy_global_contract*, use_global_contract*)
  ```
- **What triggers it:** anything that builds a `near_sdk::Promise`:
  - `Promise::new(..).transfer(..)` for refunds and payouts;
  - `#[ext_contract]` calls (`ext_mpc::ext(..).sign(..)`, `Self::ext(..).on_signed(..)`);
  - returning `Promise` or `PromiseOrValue<_>` from a `#[near]` method (the generated code links the `Promise` drop path, even if you only ever return `Value`);
  - near-contract-standards helpers that refund, e.g. `NonFungibleToken::internal_mint` / `internal_mint_with_refund` → `refund_deposit_to_account`. LTO drops a helper only if it is never called.
- **Suggested fix (contract-side; your call):** never touch `near_sdk::Promise`. Use the raw host calls in `near_sdk::env`, which import only the functions you call:
  - transfer: `let p = env::promise_batch_create(&acct); env::promise_batch_action_transfer(p, amount);`
  - MPC call with weight: `let p = env::promise_batch_create(&mpc); env::promise_batch_action_function_call_weight(p, "sign", &args, deposit, Gas::from_tgas(15), GasWeight(1));`
  - join and callback: `let j = env::promise_and(&[p0, p1, …]); let cb = env::promise_batch_then(j, &env::current_account_id()); env::promise_batch_action_function_call_weight(cb, "on_signed", &args, NearToken::from_yoctonear(0), Gas::from_tgas(10 + 2 * n), GasWeight(0)); env::promise_return(cb);`
  - mint without the standard's refund: insert into `tokens.owner_by_id`, `token_metadata_by_id` and `tokens_per_owner` directly (they are `pub`), emit `NftMint` yourself, then do your own measured refund.
  - `ft_on_transfer` returns plain `U128` (same JSON on the wire, `"0"`) instead of `PromiseOrValue<U128>`. `nft_transfer_call` can return `bool` and panic. Both keep the NEP method names; the trait impls just aren't used.

  Then re-run `tools/check-wasm-imports.sh --list` to see exactly which promise actions are left: ideally only `create`/`then`/`and`/`return`/`transfer`/`function_call_weight`. `promise_batch_action_create_account`, `delete_key` and `stake` are allowed by INV-22 but would better not be imported either.
- **If this is judged infeasible**, the spec must change INV-22 (e.g. to a reachability argument). The safer option is to keep it, so I have **not** relaxed the checker.

### Spec ambiguities noticed (no action needed, recorded for the spec owner)
- **A-1** `buy` on a token id that doesn't exist returns `ERR_TOKEN_NOT_FOUND`. §5.7 lists `ERR_NOT_LISTED` as the first check, while §5.15 says `ERR_TOKEN_NOT_FOUND` applies to "all token methods". The test accepts either.
- **A-2** Contract deviation D1 (a never-signed token has `listable_at = 0` and lists at once) is relied on by `buy_right_after_list` and the USDC tests. It is consistent with the quiet-period rationale.

### Harness notes (things that bit the tests, not the contract)
- The tx status does not wait for gas-refund receipts, so a balance read right after a tx can still change. Use `settled_balance` for exact balance deltas, or read the Transfer actions via `rpc::transfers` (authoritative).
- `worker.fast_forward(n)` overshoots by about 3 blocks. To land a receipt at an exact height, jump to about 12 blocks before it and then wait for natural block production (`sale.rs::quiet_period_exact_boundary`).
- The mock's auto-reply self-call needs the leftover gas (weight 1): with a 2 Tgas static only, a 150-byte Eddsa reply ran out of gas. Fixed in the mock.

## 2. Running the suite

```bash
for c in satchel mock-signer mock-ft; do cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml; done
cargo test -p mock-signer -p mock-ft             # unit tests (offline)
cargo test -p satchel-tests                       # sandbox suite (near-workspaces 0.23.0, nearcore 2.13.4)
cargo test -p satchel-tests --test mock_signer    # mock-only tests (no satchel.wasm needed)
SANDBOX_VERSION=2.14.0-rc.5 cargo test -p satchel-tests   # testnet's nearcore
SATCHEL_WASM=/path/to/reproducible/satchel.wasm cargo test -p satchel-tests   # R-35
tools/check-wasm-imports.sh [--list] [wasm …]     # INV-22; default target/near/satchel/satchel.wasm
```

## 3. Mock interfaces (for anyone writing sandbox tests)

**mock-signer** (`target/near/mock_signer/mock_signer.wasm`, works without init; mode defaults to `reply`):
- `sign({request:{path, payload_v2:{Ecdsa|Eddsa}, domain_id}})`: the real 3.17.0 shape. Legacy `payload` + `key_version` are accepted too. It checks, in source order, with the live error strings:
  1. domain (0/1 ok; 2 CKD and 3 ForeignTx refused; else "not found");
  2. gas ≥ 15 Tgas;
  3. deposit ≥ 1 yocto (the excess is refunded to the predecessor, with the log `refund <x> to <pred>`);
  4. scheme ("Payload is not Ecdsa/EdDSA");
  5. ECDSA payload < n.

  It then yields with `Promise::new_yield` (7 Tgas callback, weight 0) and returns the yield.
- Yield callback `return_signature_and_clean_state_on_success`: on success it returns the resumed bytes verbatim; on timeout it chains to `fail_on_timeout` → `Request has timed out.`
- `set_mode(mode)`, where mode is one of:
  - `reply`: auto-answers next block with a well-formed fake signature;
  - `manual`: waits for `respond*`;
  - `never`: `respond*` is refused; only the 200-block timeout resolves it;
  - `garbage`: auto-answers with non-JSON bytes;
  - `wrong_shape`: auto-answers with JSON of the wrong shape;
  - `panic`: refuses after the gas/deposit checks.
- `respond(request_id, response)`, `respond_raw(request_id, data)`, `respond_valid(request_id)`, `respond_all_valid()`. A late respond fails `This sign request has timed out, was completed, or never existed.`
- Views:
  - `requests(from_index?, limit?)`: `{request_id, predecessor, signer, path, payload_v2, domain_id, prepaid_gas, attached_deposit, block_height, outcome, response}`;
  - `request_count()`, `pending_requests()`, `version()` → "3.17.0", `fake_signature_for(payload, request_id)`.
- Fake signatures: secp256k1 has a 33-byte `big_r` (02/03 prefix independent of `recovery_id`) and low-S `s`; ed25519 is 64 numbers. Key derivation is **not** implemented (no sandbox test needs it).

**mock-ft** (`target/near/mock_ft/mock_ft.wasm`): near-contract-standards 5.29.1 `FungibleToken` with 6 decimals and storage 0.00125 NEAR (= Circle). `new(name?, symbol?)`. Open `mint(account_id, amount)` registers the account if needed. Standard `ft_transfer`, `ft_transfer_call`, `ft_resolve_transfer`, NEP-145 storage (`storage_unregister` works for the unregistered-seller test) and `ft_metadata`.

## 4. Deviations from the spec (all test-side)

- `tests/Cargo.toml` adds dev-dependencies beyond spec §5.2:
  - `sha2`, `sha3`: independent hash oracles;
  - `reqwest`, `base64`: raw `EXPERIMENTAL_tx_status`, to read refund Transfer amounts (INV-18) and per-receipt action counts (INV-24).

  All of them were already in the lock graph.
- `check-wasm-imports.sh` also forbids `promise_batch_action_deploy_global_contract*` and `use_global_contract*`. They are newer host functions that can also replace an account's code, so this list is a superset of INV-22, which is the safer choice.
- INV-09 refusal tests are split per chain (`refusals_change_nothing_{evm,btc,sol}`) for parallelism.
- No root file was edited. `Cargo.lock` (shared) gained the test-crate dependencies; `near-sdk-env` is still 0.1.6.
- Not done in this wave: running the suite against the **reproducible** wasm (needs Docker; SAT-035/081). Use `SATCHEL_WASM=…` when it exists.

## 5. Invariant → test map (tests/tests/*.rs)
| INV | Tests |
|---|---|
| 01 | `sign::non_owner_rejected` |
| 02 | `transfer::transfer_moves_control`, `sale::buy_moves_control`, `usdc::ft_buy_moves_control` |
| 03 | `transfer::no_approvals_surface` |
| 05 | `transfer::transfer_call_disabled` |
| 06 | `sign::mpc_request_shape_{evm,btc,sol}` |
| 07 | `sign::payload_is_hash_of_preimage`, `sign::payload_is_hash_of_preimage_shared_vectors` |
| 08 | `sign::event_matches_mpc_request` |
| 09 | `sign::refusals_change_nothing_{evm,btc,sol}` |
| 11 | `sign::log_append_only`, `transfer::records_survive_transfer` |
| 12 | `sign::timeout_never_sticks` (mandatory), `sign::garbage_response`, `sign::mpc_panics`, `sign::records_written_before_mpc_call`, `sign::callback_fills_slot` |
| 13 | `sale::quiet_period_and_freeze`, `sale::quiet_period_exact_boundary`, `sale::delist_resumes_signing` |
| 14 | `sale::buy_right_after_list`, `sale::buy_guards` |
| 15 | `sale::buy_happy_path` |
| 16 | `usdc::ft_guards`, `usdc::direct_call_attack`, `usdc::near_listing_refunds`, `usdc::ft_self_buy`, `usdc::usdc_disabled` |
| 17 | `sign::zero_deposit_rejected`, `sale::zero_deposit_rejected`, `transfer::transfer_exactly_one_yocto` |
| 18 | `storage::sign_for_charges_exactly`, `storage::excess_refunded`, `storage::mint_and_list_charge_exactly` |
| 19 | `gas::floor_and_forwarding_{1,2,4,10}` |
| 21 | `nft::ids_sequential_no_burn` (+ `nft::mint_rules_and_metadata`) |
| 22 | `tools/check-wasm-imports.sh` (+ `harness::wasm_import_check_*`) |
| 23 | `sign::btc_records_per_input` |
| 24 | `sign::btc_fanout_partial_failure` (also checks that each MPC `sign` is its own 1-action receipt) |
| 25 | `sale::payout_failure_recredit`, `usdc::unregistered_seller_recredit` |
| 26 | `sign::mpc_deposit_bounds` |
| 27 | `views::config_matches_constants` (+ `views::view_shapes_match_spec`) |
| 28 | `transfer::transfer_during_inflight_sign` |
| 29 | `storage::callback_no_growth` |
| 30 | `transfer::bad_receivers` |
| 31 | `release::keyless_birth_batch`, `release::failed_birth_leaves_nothing` |
| extra | `sign::sol_request`, `sign::callbacks_are_private`, `sale::list_guards`, `mock_signer::*` (9 fixture tests) |
