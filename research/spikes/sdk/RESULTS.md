# sdk spike results (Phase 0, 2026-10-21)

THROWAWAY spike code. Never copy into the product repo. Knowledge is distilled in
`kb/20-near-contract-stack.md`, `kb/21-testing-sandbox.md`, `kb/22-deploy-and-lock.md`.

Machine: macOS 26.7.1 arm64 (Apple Silicon), Docker 20.10.16. Toolchain pinned by
`rust-toolchain.toml` → rustc 1.93.0 (254b59607 2026-01-19). cargo-near 0.22.0, near-cli-rs 0.30.1.
Testnet account: `satchel-spk-sdk-e9ea1a.testnet` (+ sub-accounts `hello.`, `lock1.`).

## Layout

| Path | What |
|---|---|
| `Cargo.toml`, `rust-toolchain.toml` | spike workspace (members below), release profile, 1.93.0 pin |
| `contracts/hello` | trivial contract: init/set/view + `env::{block_height, chain_id, sha256, keccak256, storage_byte_cost}` |
| `contracts/mock-signer` | mock of `v1.signer-prod.testnet`: `sign` (yield via `Promise::new_yield`), `respond` (resume), `on_respond` callback, `fail_on_timeout` (mirrors near/mpc `crates/contract/src/api/sign.rs` @13f42bf) |
| `contracts/nft-spike` | NEP-171/177/178/181 via near-contract-standards 5.29.1, transfer hook, `sign_for` → signer with pending counter, never-panicking `on_signed`, `list`/`buy` sale path, custom NEP-297 events, `probe_storage` |
| `contracts/receiver` | NEP-171 receiver for `nft_transfer_call` (`keep` / `return` / `sign_then_return`) |
| `tests/tests/spike.rs` | near-workspaces 0.23.0 tests (yield/resume, timeout, hook, approvals, sale, transfer_call) |
| `tests/tests/extra.rs` | no-wasm-opt deploy, storage exhaustion, enumeration order, compile_project, transfer storage delta |
| `repro-hello/` | standalone git repo for `cargo near build reproducible-wasm` |
| `js/` | `@noble/hashes` keccak cross-check, `near-sandbox` (JS) smoke test |
| `scripts/txgas.py` | per-receipt gas/log dump of a testnet tx (dRPC) |
| `logs/` | raw outputs of every command below (no secrets: only public keys and tx signatures) |
| `.clihome/` | isolated near CLI config (`HOME=.clihome near ...`) whose `testnet` = `https://near-testnet.drpc.org/` |

Re-run everything: `cargo near build non-reproducible-wasm --manifest-path contracts/<c>/Cargo.toml`
for c in hello mock-signer nft-spike receiver, then `cargo test -p spike-tests -- --nocapture`.
`target/` (2.6 GB) can be deleted with `cargo clean`.

## 1. Versions (crates.io API + `git ls-remote`, 2026-10-21)

```
near-sdk 5.29.1 (2026-09-17, msrv 1.93)   5.30.0-rc.1 (2026-10-19, msrv 1.95)
near-contract-standards 5.29.1            5.30.0-rc.1
near-workspaces 0.23.0 (2026-07-09)       0.24.0-rc.2 (2026-10-19, msrv 1.95)
near-sandbox (rs) 0.3.16 (2026-09-04) → nearcore 2.13.4;  0.4.0-rc.2 → 2.14.0-rc.4
cargo-near 0.22.0 (2026-07-14)            0.23.0-rc.2 (2026-10-19, msrv 1.95)
near-cli-rs 0.30.1 (2026-09-02)           0.31.0-rc.2 (2026-10-19)
tags: near-sdk-v5.29.1 = 421ffb4265c2845c4cc1fb2dfdd638dcf67c712c
      near-workspaces-v0.23.0 = 534eebad02f7c78137b8a8ad8632ecd8be3b7a79
      cargo-near-v0.22.0 = 108a48d505148145b419cf1060dc5f3026881984
      near-sandbox-rs v0.3.16 = 8b1dcf9f5685f3305d1ebf5058cec27217b03d61
npm: near-sandbox 0.3.4 (2026-09-04), near-workspaces (JS) 5.0.0 (2025-03-13, stale), near-api-js 7.3.1
```
Live nodes (`status`): testnet `2.14.0-rc.5`, protocol 87 (latest 88); mainnet `2.13.4`, protocol 86.

## 2. Rust 1.93 build + testnet deploy (P0-1)

```
$ cargo near build non-reproducible-wasm --manifest-path contracts/hello/Cargo.toml
INFO: contract's near-sdk targets protocol version 84; rustc 1.93.0 accepted (bulk-memory opcodes supported by nearcore VM)
Running an optimize for size post-step with wasm-opt --enable-nontrapping-float-to-int --enable-bulk-memory...
Size: 98.7 KB (98696 bytes)  SHA-256 hex cfe10f31...474a   (23 s cold)
$ near account create-account fund-myself hello.satchel-spk-sdk-e9ea1a.testnet '2 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as satchel-spk-sdk-e9ea1a.testnet network-config testnet-fastnear sign-with-legacy-keychain send
  tx 7PX6TLCddZ6vT7nCYdCjitfsKvyXEy9FryymKNiM2bLt (new-account receipt burnt 0.00703 NEAR = 0.007 account_creation_charge + gas)
$ near contract deploy hello.satchel-spk-sdk-e9ea1a.testnet use-file target/near/spike_hello/spike_hello.wasm with-init-call new json-args '{"greeting":"hello from rust 1.93"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet-fastnear sign-with-legacy-keychain send
  tx 6GkvhEMyWE8F2RgMok39Uni86a1VnzBhUamq9t3pakji  "Contract code has been successfully deployed."
$ HOME=.clihome near contract call-function as-transaction hello.satchel-spk-sdk-e9ea1a.testnet set_greeting json-args '{"greeting":"satchel"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as satchel-spk-sdk-e9ea1a.testnet network-config testnet sign-with-legacy-keychain send
  tx D6xZcCZaQm6MWJCNdnz4LBzHfES5ADBRfhP5xMKqFmJy  log "set_greeting by satchel-spk-sdk-e9ea1a.testnet at height 274090099"
$ ... call-function as-read-only hello... info json-args '{}' network-config testnet now
  {"block_height":274090106,"chain_id":"testnet","keccak256_hex":"af94193c...faf5","sha256_hex":"25fd6bc1...e83d",
   "storage_byte_cost":"10000000000000000000","storage_usage":98982, ...}
```
Cross-checks: `printf satchel | shasum -a 256` = `25fd6bc1…e83d`; `@noble/hashes keccak_256('satchel')` = `af94193c…faf5`
(so `env::keccak256` is Ethereum Keccak-256, not SHA3-256 `ccccab0b…`).

## 3. Live protocol parameters (`EXPERIMENTAL_protocol_config`, testnet PV 87 / mainnet PV 86, identical unless noted)

```
storage_amount_per_byte 1e19 yocto   max_total_prepaid_gas 1_000_000_000_000_000 (1 PGas)  max_gas_burnt 1 PGas
yield_timeout_length_in_blocks 200   max_yield_payload_size 1024   max_contract_size 4194304   max_transaction_size 1572864
max_number_logs 100   max_total_log_length 16384   max_length_storage_key 2048   max_actions_per_receipt 100
wasm: vm_kind Wasmtime, reftypes_bulk_memory true, yield_with_id_host_fns true, chain_id_host_fn true,
      one_yocto_on_promise true, global_contract_host_fns true, sha3_host_fns true (testnet only)
account_creation_charge 0.007 NEAR, min_gas_purchase_price 1e9 (protocol 85+), burnt_gas_reward 0/1 (testnet PV 87)
storage_usage_config num_extra_bytes_record 40, num_bytes_account 100
```
nearcore `2.14.0-rc.5` `core/parameters/res/runtime_configs/{85,87,88}.yaml` explain the flags
(`one_yocto_on_promise`: "allow attaching exactly 1 yoctoNEAR to a promise function call without requiring
the calling contract to have sufficient balance").

## 4. Sandbox tests (P0-7, P0-9) — all pass

`cargo test -p spike-tests -- --nocapture` (logs/test-final-all.log): 10 tests, 20.9 s wall (two test
binaries; each test starts its own sandbox; 5 parallel tests ≈ 9.5–10.3 s per binary).

| Test | Key observations |
|---|---|
| `yield_resume_happy_path_and_transfer_hook` | non-owner `sign_for` → `ERR_NOT_OWNER`; pending observable 0.61 s after submit (`pending_signs=1`, mock request `path=satchel/1/evm`, `predecessor`=NFT contract); `TransactionStatus::status()` = `Pending` while yielded; `nft_transfer` and `list` → `ERR_PENDING_SIGNS`; `respond` (2 Tgas) → tx Ready, **return value = signature JSON**; 8 receipts, 9 Tgas total; approvals `{carol:1}` → `{}` after transfer; carol `approval_id:1` → "Sender not approved"; old owner → `ERR_NOT_OWNER`; new owner signs OK; test 11.4 s |
| `yield_timeout_via_fast_forward` | yield at height ~32; `worker.fast_forward(250)` took 2.42 s; callback observed immediately: mock `on_respond` "timed out" → `fail_on_timeout` receipt fails → `on_signed` sees failure (`"ok":false`, resolved at block 241 = request+211) → `pending_signs=0`, `signs_failed=1`, tx success with `null`; late `respond` → "unknown request"; test 7.3 s |
| `sale_path_cooldown_and_freeze` | listed: `sign_for` → `ERR_FROZEN`, `nft_transfer` → `ERR_LISTED`, early `buy` → `ERR_COOLDOWN`; one sandbox `transact()` spans ~4 blocks (a 10-block cooldown elapsed naturally across 3 txs — first run failed for that reason); after `fast_forward(105)` `buy` 4.02 Tgas, seller balance +exactly price, listing cleared, epoch 1 |
| `transfer_call_revert_and_inflight_lock` | `msg:"return"` → returns `false`, owner back to alice, **approvals restored** `{carol:1}`, epoch 1→2 (hook runs on transfer and on revert); 8.86 Tgas; resolve receipt 3.11 Tgas of the standard's hard-coded 5 Tgas; `msg:"sign_then_return"` → receiver's `sign_for` fails `ERR_TRANSFER_IN_FLIGHT`, token returns, lock cleared; `msg:"keep"` → `true`, receiver owns |
| `approved_account_transfer_event_and_storage_probe` | approved carol transfers → event `{"old_owner_id":..,"new_owner_id":..,"token_ids":["1"]}` **without `authorized_id`**; `store::LookupMap` insert: storage delta **0 before `flush()`, 151 after** (= 40 + key 7 + value 104) |
| `deploy_without_wasm_opt` | rustc 1.93 wasm with `--no-wasmopt` (324.2 KB) deploys, inits and mints (3.55 Tgas) on nearcore 2.13.4 |
| `storage_staking_exhaustion_and_topup` | contract with 0.0165 NEAR liquid: 18 uncharged 151-byte writes, then `LackBalanceForState`; a paid `nft_mint` still succeeds (deposit covers its bytes); 0.05 NEAR plain transfer top-up → writes work again |
| `nft_tokens_enumeration_order` | `nft_tokens` → `["1","10","11","12","2",...,"9"]` (lexicographic, legacy TreeMap); `nft_tokens_for_owner` → insertion order |
| `compile_project_from_test` | `near_workspaces::compile_project` (feature `unstable`) built hello (98,696 B, identical) in 3.8 s; it shells out to the installed `cargo near` |
| `transfer_storage_delta` | first transfer to a new owner: **+180 bytes** on the contract (no deposit possible: 1 yocto); emptying the sender's set: −180 |
| `failed_receipt_keeps_logs` | `nft_mint` with 1 yocto fails ("Must attach … to cover storage") but its outcome still carries the log `mint storage bytes: 708`; `nft_total_supply` stays `"0"` → indexers must check receipt status |
| unit test (`cargo test -p spike-nft --lib`) | near-sdk `unit-testing` + `testing_env!` works with the hook; compile 24 s, run 0.03 s; wasm hash unchanged after adding the dev-dep |

Gas (sandbox, mock signer): `nft_mint` 3.52 Tgas (708 bytes, 43-char owner); `nft_transfer` ~3 Tgas;
`sign_for` receipt 2.57 Tgas, `on_signed` 1.67 Tgas (of 10 static); `respond` 2 Tgas.

Sandbox binary behaviour: near-workspaces' `build.rs` downloads at **compile time**
`https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/Darwin-arm64/2.13.4/near-sandbox.tar.gz`
(28.9 MB, ~6 s here; Linux-x86_64 35.2 MB) into
`target/debug/build/near-sandbox-<hash>/out/.near/near-sandbox-2.13.4/near-sandbox` (71.5 MB).
`sandbox_with_version("2.14.0-rc.5")` downloads at runtime into the same dir; the 5 `spike.rs` tests also pass on 2.14.0-rc.5 (17 s incl. download; `SANDBOX_VERSION=2.14.0-rc.5 cargo test -p spike-tests --test spike`).
Cold run with fresh `CARGO_TARGET_DIR` (warm registry): compile 32 s (311 crates incl. download) + tests 13.4 s = 46.8 s.
Sandbox start: 2.2 s first, 0.5–1.1 s later. JS `near-sandbox@0.3.4`: `Sandbox.start({})` 9.0 s first run, nearcore 2.13.4, protocol 86.

## 5. Deploy and lock rehearsal on testnet (P0-10)

```
create lock1.satchel-spk-sdk-e9ea1a.testnet (3.5 NEAR)        tx 6iehbDthAYEUuGwMgW7maXFEZ4gBsqRGHQCwKmWka8at
HOME=.clihome CARGO_HOME=~/.cargo RUSTUP_HOME=~/.rustup cargo near deploy build-non-reproducible-wasm \
  --manifest-path contracts/nft-spike/Cargo.toml lock1.satchel-spk-sdk-e9ea1a.testnet \
  with-init-call new json-args '{"signer":"v1.signer-prod.testnet"}' prepaid-gas '100.0 Tgas' \
  attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
                                                               tx AovRm6dMA35mGezv8aGpNT6wa7H5Xos3S2EG5GHTMn4Q (23.13 Tgas, 10 s incl. build)
view_account: code_hash 4XyJQ81nMN8jKLnQ6G7waGQd2DWjWkvwc97fR7xgks6W (= bs58 SHA-256 printed by cargo near), storage_usage 262095
nft_mint by satchel-spk-sdk (0.1 NEAR attached)                tx AdAnrXvvvy5DSxzSzrwqjjXohC2cYFSThdHR8p4TUGQ9 (3.91 Tgas, "mint storage bytes: 682")
near account delete-keys lock1... public-keys ed25519:5Yjv... network-config testnet sign-with-legacy-keychain send
                                                               tx 8yEpkL3vGbQzCPD6TzbzHwLKmF1q8sUskNCmMQ1azBZE (0.63 Tgas)
  NOTE: CLI printed "Error: Public key ... doesn't exist" — the first broadcast had executed and the
  CLI's retry hit the deleted key. Always confirm with list-keys.
near account list-keys lock1.satchel-spk-sdk-e9ea1a.testnet network-config testnet now
  +---+------------+-------+-------------+
  | # | Public Key | Nonce | Permissions |
  +---+------------+-------+-------------+
  +---+------------+-------+-------------+
near account view-account-summary lock1.satchel-spk-sdk-e9ea1a.testnet network-config testnet now
  Native account balance 3.5044888034498067 NEAR | Storage used by the account 262.7 KB
  Local Contract (SHA-256 checksum hex) 348224c5704fe2b61725fde41554d017d2e3ef491212bb72d0f33dbe7da1754f
  Access keys: Account is locked (no access keys)
```
The locked contract still works and calls the REAL signer: owner `sign_for` → `v1.signer-prod.testnet`
tx `79w91Sc1Sg5JJfRRiF1bGq2Q48JRQdjShC1qbWHF49kL` (prepaid 100 Tgas, burnt 13.40 Tgas: sign_for 2.60, MPC `sign` 4.34,
MPC callback 3.48, `on_signed` 1.78). Requested block 274091153, resolved 274091161 (8 blocks, 4.9 s). Return value:
`{"scheme":"Secp256k1","big_r":{"affine_point":"023fc65a…0237"},"s":{"scalar":"0f0eb827…c9b2"},"recovery_id":1}`.
The CLI itself failed after 30 s with `internal error: [Some("Internal server error")]` (dRPC `broadcast_tx_commit`);
state (`token_state` → `signs_ok:1, pending_signs:0`) and the FastNEAR tx API (`POST https://tx.test.fastnear.com/v0/account`)
showed it had succeeded.

## 6. Reproducible build + NEP-330 (P0-10)

`repro-hello/` (own git repo, `Cargo.lock` committed, image `sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…b5bb`):
`cargo near build reproducible-wasm` → run 1: 5 m 25 s (incl. image pull, amd64 under QEMU: "jemalloc … running under QEMU"),
run 2: 4 m 34 s. Both SHA-256 `2699fdba0d4260e78d1542f55c4af8d8c2a9dedb93094bd06185fce5d3a42807` (99.1 KB). The container
uses `RUSTUP_TOOLCHAIN=1.99.1-x86_64-unknown-linux-gnu` (repo's `rust-toolchain.toml` 1.93.0 is ignored).
Redeployed `hello.` with it (tx `2V5M3AguBR2VvdejB9xC8146uwmvudWqgCxUBDkCdrD7`, state kept). `contract_source_metadata`:
`build_info.build_environment = "sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…"`,
`source_code_snapshot = "git+https://github.com/example/satchel-phase0-repro-spike?rev=9d8d0d40…"`, `standards:[nep330 1.3.0]`;
non-reproducible builds report `build_info: null`.

`HOME=.clihome DOCKER_CONFIG=~/.docker near contract verify --use-contract-source-code-path …/repro-hello deployed-at hello.satchel-spk-sdk-e9ea1a.testnet network-config testnet now`
→ 5 m 38 s → "The code obtained from the contract account ID and the code calculated from the repository are the same.
Contract code hash: 3bggckjtTgYXH2q9aWuzrhbNhMehKkRY61RoBqmurkaS … Build Environment: sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…"
(logs/near-contract-verify.log).

cargo-near template (`cargo +1.93.0 near new tmpl-test2`, near-sandbox 0.3 + near-api 0.8): `cargo test` cold 1 m 51 s; 7 unit tests +
`test_contract_is_operational` (builds the wasm via `cargo_near_build::build_with_cli`, `sandbox.fast_forward(200)`) pass, integration 40.4 s.

## 7. Wasm size (P1-11, `cargo near build`, opt-level z + lto + wasm-opt unless noted)

| Variant | hello | nft-spike |
|---|---|---|
| default (cdylib+rlib, ABI embedded) | 98.7 KB | 261.6 KB |
| `--no-abi` (cdylib+rlib) | 97.8 KB | 259.6 KB |
| `--no-wasmopt` | – | 324.2 KB |
| **`crate-type = ["cdylib"]` only**, no ABI | **63.1 KB** | **204.5 KB** |
| cdylib only, near-sdk `default-features=false` (no wee_alloc) | 69.0 KB | – |
| cdylib only, `opt-level="s"` | 64.8 KB | 223.4 KB |
| cdylib only, opt s + no wee_alloc | 70.8 KB | 230.2 KB |

twiggy 0.7 panics on these modules ("should not parse the same key into multiple items").

## 8. Misc observations

- `cargo near new tmpl-test` (run from a dir using the global default nightly-2023-12-11) → `Error: Failed to execute process: cargo update`
  with "Consider adding `cargo-features = ["edition2024"]`" (rustup passes `RUSTUP_TOOLCHAIN` to the child). `cargo +1.93.0 near new tmpl-test2`
  → OK (Cargo.lock created). Template: auction contract, near-sdk 5.29, `rust-toolchain` 1.93.0, image `sourcescan/cargo-near:0.21.1-rust-1.96.0`,
  tests use near-sandbox 0.3.12 + near-api 0.8 + cargo-near-build 0.11; `cargo near build` → 102.9 KB.
- `rpc.testnet.near.org` now returns `{"code":-429,"message":"WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!..."}` for
  queries; `neart.lava.build` and `near-testnet.lava.build` "discontinued"; `rpc.testnet.pagoda.co` deprecated; the near CLI's default
  `testnet` profile (`archival-rpc.testnet.fastnear.com`) and `test.rpc.fastnear.com`/`rpc.testnet.fastnear.com` returned -429 for
  14/15 rapid requests from this (shared) IP; `https://near-testnet.drpc.org` served 15/15 (needs a `User-Agent`, Python urllib got 403).
- cargo-near 0.22 rewrites the near CLI config ("Migrating config.toml from V1 to V2… v4") and near-cli-rs 0.30.1 migrates it back
  ("V4 to V5"); content survived both ways.
- NearBlocks testnet API (`api-testnet.nearblocks.io/v1/account/<id>/txns-only`) returned `{"txns":[]}` for these accounts
  ~10 min after the txs; FastNEAR's tx API had them.
- `twiggy` unusable, `wasm-opt` 112 present at `~/.cargo/bin` (cargo-near uses its own bundled binaryen).
