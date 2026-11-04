# NEAR contract stack: near-sdk 5.29, NFT standards, cargo-near, cross-contract patterns

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: sdk · Checked: 2026-10-21 · Confidence: high (everything marked [VERIFIED] was run on this date)
> Primary sources: near-sdk-rs tag `near-sdk-v5.29.1` (commit `421ffb42`), cargo-near tag `cargo-near-v0.22.0` (`108a48d5`),
> near-workspaces-rs `near-workspaces-v0.23.0` (`534eebad`), near-sandbox-rs `v0.3.16` (`8b1dcf9f`), nearcore `2.14.0-rc.5` (`b7b4737c`),
> near/mpc `13f42bf4` (read-only, from the mpc agent's clone), NEPs master (171/177/178/181/297/330/591), live RPC
> `EXPERIMENTAL_protocol_config` (testnet PV 87, mainnet PV 86). Spike code + raw logs: `research/spikes/sdk/` (`RESULTS.md`).

## TL;DR — what an implementer must know

1. **Pin stable, not the 2026-10-19 RCs:** `near-sdk = "=5.29.1"`, `near-contract-standards = "=5.29.1"`, Rust **1.93.0** via
   `rust-toolchain.toml`, cargo-near **0.22.0**, near-workspaces **0.23.0** (sandbox nearcore 2.13.4). The RCs (`5.30.0-rc.1`,
   `0.24.0-rc.2`, cargo-near `0.23.0-rc.2`, near-cli `0.31.0-rc.2`) need Rust 1.95 and include breaking changes
   (unit-test mock rewrite, bls API). If they go stable during Nov 1–14, ignore them. [VERIFIED crates.io]
2. **Rust ≥1.87 is fine now.** nearcore protocol 84+ accepts bulk-memory/reference-types wasm (`reftypes_bulk_memory: true` on
   testnet and mainnet). near-sdk ≥5.28 declares `min_protocol_version = 84`, so cargo-near ≥0.20.3 lifts its old 1.86 ceiling.
   Rust 1.93 output deployed and ran on testnet; it even runs without the wasm-opt pass in the sandbox. [VERIFIED]
3. **Always build with `cargo near build`.** near-sdk ≥5.27 picks real host functions only under `--cfg near`, which cargo-near
   injects. A plain `cargo build --target wasm32-unknown-unknown` compiles but uses "pure-Rust fallbacks. not for on-chain use". [SOURCED]
4. **NFT standard = embed `NonFungibleToken` and implement the five traits by hand.** The `impl_non_fungible_token_*!` macros are
   `#[deprecated]` in 5.29.1. A manual impl gives you the transfer hook for free: wrap `self.tokens.nft_transfer(..)` etc. [SOURCED+VERIFIED]
5. **There are four ownership-change paths.** They are `nft_transfer`, `nft_transfer_call`, the **revert inside `nft_resolve_transfer`**
   (the standard calls `internal_transfer_unguarded`, so your guard never runs there), and your own sale path
   (`self.tokens.internal_transfer(&owner, &buyer, &id, None, memo)`). Bump `delegate_epoch` on all four. [VERIFIED]
6. **NEP-178 approvals are cleared on every transfer.** But **if `nft_transfer_call` reverts, the previous owner's approvals are
   restored.** [VERIFIED]
7. **The `nft_transfer_call` window is a real hole.** While `nft_on_transfer` runs, the receiver contract owns the token and could call
   `sign_for`, `list` or add delegates before handing the token back. A `transfer_call_in_flight` flag (set in `nft_transfer_call`,
   cleared in `nft_resolve_transfer`) blocks this; the receiver's `sign_for` failed with `ERR_TRANSFER_IN_FLIGHT`. [VERIFIED]
8. **Keep `nft_resolve_transfer` small.** near-contract-standards hard-codes **5 Tgas** for it. The spike's resolve (revert,
   approvals restored, epoch bump, event) burned **3.11 Tgas**. If resolve runs out of gas, the token stays with the receiver and
   an in-flight flag would never clear. For more room, implement `nft_transfer_call` by hand (about 15 lines). [VERIFIED]
9. **If you keep a `pending_signs` counter, its callback must never panic.** Don't use a typed `#[callback_result]`: it panics if the
   JSON doesn't parse. Read `env::promise_result_checked(0, 1024)` manually, use `saturating_sub`, reserve static gas (10 Tgas;
   measured 1.7–1.8), and don't grow storage inside the callback. An MPC timeout reaches the callback as a failed promise. [VERIFIED]
   **sec's preferred design (`kb/70` §h) drops the counter:** derive "a sign may be in flight" from
   `height < last_sign_height + 210` and make `sign_for` return the MPC promise with no state-changing callback. That removes this
   failure class entirely. The planner picks one; both are testable with `fast_forward`.
10. **`near_sdk::store::*` collections write lazily.** Call `.flush()` before measuring `env::storage_usage()` for deposit
    accounting: the delta was **0 bytes before flush and 151 after**. Legacy `near_sdk::collections`, which the NFT standard uses
    internally, write immediately. [VERIFIED]
11. **Events:** the standard emits `nft_mint` and `nft_transfer` with `"version":"1.0.0"` (NEP-171 is now 1.2.0) and **never fills
    `authorized_id`** (an inverted filter in `emit_transfer`). Emit custom NEP-297 events with `#[near(event_json(standard = "…"))]`.
    [VERIFIED]
12. **Size and cost:** use `crate-type = ["cdylib"]`. The template's `["cdylib","rlib"]` inflated the wasm by 27–55%
    (nft-spike 261.6 KB → 204.5 KB). Storage costs 1e19 yocto/byte (100 KB = 1 NEAR). The max prepaid gas per tx is now
    **1 PGas**. One real-MPC `sign_for` burned 13.4 Tgas in total, so attach 50–100 Tgas. [VERIFIED]

## Verified facts & measurements

| Fact | Value | Evidence |
|---|---|---|
| Latest stable near-sdk / near-contract-standards | 5.29.1 (2026-09-17), MSRV 1.93, edition 2024 | crates.io API; `git ls-remote` tag `near-sdk-v5.29.1` → `421ffb42` [VERIFIED] |
| RC | 5.30.0-rc.1 (2026-10-19), MSRV **1.95**, "declare protocol 88", "[breaking] back the mock with nearcore's host functions" | `CHANGELOG.md` @ tag [SOURCED] |
| near-workspaces | 0.23.0 stable (2026-07-09, MSRV 1.93, near-primitives 0.37, `near-sandbox ^0.3.12` → 0.3.16 → nearcore **2.13.4**); 0.24.0-rc.2 (MSRV 1.95, nearcore crates 0.38.0-rc.4, sandbox 2.14.0-rc.4) | sparse index deps [VERIFIED] |
| cargo-near | 0.22.0 stable (2026-07-14; adds `cargo near check`, prints wasm size); 0.23.0-rc.2 (MSRV 1.95) | crates.io, CHANGELOG [VERIFIED] |
| Network versions | testnet nearcore `2.14.0-rc.5`, protocol **87** (supports 88); mainnet `2.13.4`, protocol **86** | RPC `status` [VERIFIED] |
| Rust 1.93 accepted | `INFO: contract's near-sdk targets protocol version 84; rustc 1.93.0 accepted (bulk-memory opcodes supported by nearcore VM)` | `cargo near build` output [VERIFIED] |
| Live VM | `vm_kind: Wasmtime`, `reftypes_bulk_memory: true`, `yield_with_id_host_fns: true`, `chain_id_host_fn: true`, `one_yocto_on_promise: true` | `EXPERIMENTAL_protocol_config` testnet+mainnet [VERIFIED] |
| Limits | `max_total_prepaid_gas` 1 PGas; `yield_timeout_length_in_blocks` 200; `max_yield_payload_size` 1024 B; `max_contract_size` 4 MiB; `max_transaction_size` 1.5 MiB; `max_number_logs` 100; `max_total_log_length` 16384; `max_length_storage_key` 2048 | same [VERIFIED] |
| Storage price | `storage_amount_per_byte` = 1e19 yocto (= `env::storage_byte_cost()` on testnet); record overhead `num_extra_bytes_record` 40 | RPC + contract view [VERIFIED] |
| Account creation | `account_creation_charge` 0.007 NEAR since PV 85; observed new-account receipt burned 0.00703 NEAR | RPC + tx `7PX6TLCd…` [VERIFIED] |
| Upfront gas purchase | gas price 1e8 yocto/gas (testnet and mainnet), but attached gas is bought at `max(gas_price, min_gas_purchase_price = 1e9)` and the difference refunded after execution, so **100 Tgas attached reserves ~0.1 NEAR** of free balance | RPC `gas_price`; nearcore `runtime/runtime/src/config.rs` L529-533 @2.14.0-rc.5: "Gas attached to the receipt is purchased at a price which should be at least as large as min_gas_purchase_price" [VERIFIED+SOURCED] |
| `env::keccak256` | Ethereum Keccak-256 (`keccak256("satchel") = af94193c…faf5`, matches `@noble/hashes`) | testnet view [VERIFIED] |
| Gas, sandbox (mock signer) | `nft_mint` 3.52 Tgas (708 B); `nft_transfer` ~3; `buy` 4.02; `nft_transfer_call` revert 8.86 (resolve 3.11 of 5); `sign_for` receipt 2.57, `on_signed` 1.67 | `tests/tests/spike.rs` [VERIFIED] |
| Gas, testnet (real `v1.signer-prod.testnet` v3.17.0) | prepaid 100, burned **13.40 Tgas**: sign_for 2.60, MPC `sign` 4.34, MPC callback 3.48, `on_signed` 1.78. 8 blocks / 4.9 s (one sample; the mpc agent's 44-request series: p50 6.7 s, 0 timeouts, ~12.4 Tgas, see `kb/10-mpc-signer.md`) | tx `79w91Sc1…` [VERIFIED] |
| MPC gas requirements (live `config`) | `sign_call_gas_attachment_requirement_tera_gas` 15, `return_signature_and_clean_state_on_success_call_tera_gas` 7, `fail_on_timeout_tera_gas` 2, deposit 1 yocto | view `config` on `v1.signer-prod.testnet` [VERIFIED] |
| Storage per mint | 682 B (testnet, 30-char owner) / 708 B (sandbox, 43-char owner), including NFT records, metadata and a small TokenState | spike logs [VERIFIED] |
| Storage per transfer | first transfer to a new owner **+180 B, paid by the contract**; sender's set emptied −180 B | `transfer_storage_delta` [VERIFIED] |
| Enumeration order | `nft_tokens` is lexicographic: `["1","10","11","12","2",…]`; `nft_tokens_for_owner` is insertion order | `nft_tokens_enumeration_order` [VERIFIED] |

## Reference — exact APIs, types, commands, tested snippets

### Cargo.toml / toolchain (recommended for the product, Nov 1)

```toml
# rust-toolchain.toml (repo root)
[toolchain]
channel = "1.93.0"
components = ["rustfmt", "clippy"]
targets = ["wasm32-unknown-unknown"]
```

```toml
# contracts/satchel/Cargo.toml
[package]
name = "satchel"
version = "1.0.0"
edition = "2024"
rust-version = "1.93"
repository = "https://github.com/<team>/<repo>"   # NEP-330 `link`; must be the public repo for verification

[lib]
crate-type = ["cdylib"]          # NOT ["cdylib","rlib"]: +27..55% wasm size [VERIFIED]

[dependencies]
near-sdk = "=5.29.1"             # default features keep wee_alloc (smaller than default allocator: 63.1 vs 69.0 KB)
near-contract-standards = "=5.29.1"   # pulls near-sdk feature "legacy" (NFT uses near_sdk::collections)

[dev-dependencies]
near-sdk = { version = "=5.29.1", features = ["unit-testing"] }   # only if you write #[cfg(test)] unit tests

[package.metadata.near.reproducible_build]       # see kb/22-deploy-and-lock.md
image = "sourcescan/cargo-near:0.22.0-rust-1.99.1"
image_digest = "sha256:c9655eaf7436b90c87ea8b25739f91063032c5c30ba24cfeafe72c142943b5bb"
passed_env = []
container_build_command = ["cargo", "near", "build", "non-reproducible-wasm", "--locked"]

[lints.rust.unexpected_cfgs]
level = "warn"
check-cfg = ['cfg(near)']

# workspace root Cargo.toml holds the profile (members' profiles are ignored)
[profile.release]
codegen-units = 1
opt-level = "z"      # "s" was larger for the NFT contract (223.4 vs 204.5 KB)
lto = true
debug = false
panic = "abort"
overflow-checks = true
```
Integration tests go in a separate workspace member (`tests/` crate with `near-workspaces = { version = "=0.23.0", features = ["unstable"] }`),
see `kb/21-testing-sandbox.md`. The dev-dependency feature does not leak into the wasm: the hash stayed identical after adding it. [VERIFIED]

### cargo-near 0.22.0 commands

```bash
cargo near new satchel                          # template: near-sdk 5.29, rust 1.93.0 pin, tests use near-sandbox + near-api (not near-workspaces)
cargo near build non-reproducible-wasm          # → target/near/<crate>/<crate>.wasm (+ _abi.json, embedded _abi.zst)
cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml --locked
cargo near build non-reproducible-wasm --no-abi # ~2 KB smaller; keep ABI unless size-bound
cargo near build reproducible-wasm              # Docker, committed git state only (kb/22)
cargo near check [--clippy]                     # same env as build, no wasm
cargo near deploy build-non-reproducible-wasm <account> with-init-call new json-args '{...}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
cargo near deploy build-reproducible-wasm <account> ...   # requires clean tree AND commit pushed to `repository`
```
Notes: `--locked` is opt-in for local builds (the flag `--no-locked` doesn't exist). `--no-wasmopt` gives −19% size, not
correctness (the help text's "required for correctness on rustc >= 1.82" is stale for PV ≥84). `RUSTFLAGS` from the shell is
ignored; pass `--env 'RUSTFLAGS=…'`. [VERIFIED/SOURCED cargo-near README]

### Contract state, storage keys, init (5.29 idioms, from the spike)

```rust
use near_sdk::{env, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue};
use near_sdk::store::{LazyOption, LookupMap};

#[derive(BorshStorageKey)]
#[near]                                   // borsh by default; 1-byte prefixes
enum StorageKey { OwnerById, TokenMetadata, Enumeration, Approval, ContractMetadata, TokenState }

#[near(serializers = [json, borsh])]      // replaces manual #[derive(BorshSerialize, Serialize...)] + #[borsh(crate=..)]
#[derive(Clone, Debug, Default)]
pub struct TokenState { pub pending_signs: u32, pub epoch: u32, pub listed_price: Option<NearToken>,
                        pub listed_at: Option<u64>, pub transfer_call_in_flight: bool }

#[near(contract_state)]                   // replaces #[near_bindgen] + borsh derives
#[derive(PanicOnDefault)]
pub struct Contract {
    tokens: NonFungibleToken,                         // legacy collections inside
    metadata: LazyOption<NFTContractMetadata>,        // store::LazyOption: new(prefix, Some(v)); get() -> &Option<T>
    signer: AccountId,
    state: LookupMap<TokenId, TokenState>,            // store::LookupMap: get/get_mut/insert/remove/flush
    next_token_id: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new(signer: AccountId) -> Self {
        let metadata = NFTContractMetadata { spec: NFT_METADATA_SPEC.into(), name: "Satchel".into(),
            symbol: "SATCHEL".into(), icon: None, base_uri: None, reference: None, reference_hash: None };
        metadata.assert_valid();
        Self {
            tokens: NonFungibleToken::new(StorageKey::OwnerById, env::current_account_id(),
                Some(StorageKey::TokenMetadata), Some(StorageKey::Enumeration), Some(StorageKey::Approval)),
            metadata: LazyOption::new(StorageKey::ContractMetadata, Some(metadata)),
            signer, state: LookupMap::new(StorageKey::TokenState), next_token_id: 1,
        }
    }
}
```
The second argument of `NonFungibleToken::new` (`owner_id`) is used only by the deprecated `mint`; with `internal_mint*`
it has no authority. [SOURCED core_impl.rs L272-293]

### Collections: `store` vs legacy `collections`

| | `near_sdk::store` (use these) | `near_sdk::collections` (legacy) |
|---|---|---|
| Availability in 5.29.1 | always: `LookupMap`, `IterableMap`, `IterableSet`, `LookupSet`, `Vector`, `LazyOption`, `Lazy`; `UnorderedMap`/`UnorderedSet` are **deprecated** (use `IterableMap`/`IterableSet`); `TreeMap` behind feature `unstable` | behind feature **`legacy`** (near-contract-standards enables it) |
| Write semantics | cached; written on `flush()` or when dropped at the end of the call → **`flush()` before `env::storage_usage()` deltas** | immediate writes |
| Used by NFT standard | – | `TreeMap<TokenId, AccountId>` (owner_by_id → lexicographic `nft_tokens`), `LookupMap` (metadata, approvals `HashMap<AccountId,u64>`), `LookupMap<AccountId, UnorderedSet<TokenId>>` (per-owner) |
| Record cost | `40 + len(key) + len(value)` bytes per entry: probe `insert("k1", "x"*100)` = 40 + 7 + 104 = **151** B [VERIFIED] | same formula |

Satchel guidance: prefer **flat** maps keyed by tuples over collections nested inside values (e.g.
`LookupMap<(TokenId, u32), SigRecord>` with a counter in `TokenState`, instead of a `Vector` inside each `SatchelState`). Nested
store collections need unique per-token prefixes and flush ordering. A flat map makes the per-record cost easy to predict. [ASSUMED best practice]

Cost estimates at 1e19 yocto/B (formula above; borsh sizes): `SigRecord{chain:u8, payload_hash:[u8;32], requested_at:u64, status:u8}`
= 42 B value + ~12 B key + 40 → **~94 B ≈ 0.00094 NEAR**; `Delegate{chain, daily_cap:u128, spent:u128, day:u64, expires_at_ms:u64}`
≈ 49 B + key `(String id, u32 epoch, AccountId)` ~55 B + 40 → **~145 B ≈ 0.00145 NEAR**; `TokenState` with a listing ≈ 45 B + ~6 B + 40 ≈ 0.0009 NEAR.
Mint measured 682–708 B ≈ **0.007 NEAR**. [VERIFIED formula, ASSUMED struct layouts]

### Types and JSON encodings

| Type | Use | JSON |
|---|---|---|
| `AccountId` (`near_sdk::AccountId`, near-account-id 2.6) | validated on deserialize | `"alice.testnet"` |
| `NearToken` (replaces the removed `Balance` alias) | `from_yoctonear/from_millinear/from_near`, `as_yoctonear`, `saturating_*`, `checked_sub`, `exact_amount_display` | decimal **string of yocto** `"10000000000000000000"` [VERIFIED] |
| `Gas` (= `near_gas::NearGas`) | `Gas::from_tgas(15)`, `as_gas()`, `as_tgas()` (integer division) | decimal string of gas units [SOURCED near-gas serde impl] |
| `U128` / `U64` (`near_sdk::json_types`) | u128/u64 in JSON args (JS can't hold u64) | `"123"` |
| `Base64VecU8` | metadata hashes | base64 string |
| `TokenId` = `String` | NFT ids (`"1"`, `"2"`, …) | string |
| `YieldId` | `Promise::new_yield` handle | base64 string (e.g. `"foCD89KIagrO…="`) [VERIFIED] |

### `env` cheat sheet (5.29.1)

`env::predecessor_account_id()` (caller; use for ownership), `env::signer_account_id()` (tx signer; don't use for auth),
`env::current_account_id()`, `env::attached_deposit() -> NearToken`, `env::prepaid_gas()/used_gas() -> Gas`,
`env::block_height() -> u64` (≈0.61 s/block on testnet: 8 blocks = 4.9 s [VERIFIED]), `env::block_timestamp_ms()`,
`env::sha256(&[u8]) -> Vec<u8>` / `env::sha256_array -> [u8;32]`, `env::keccak256(..)`/`keccak256_array` (Ethereum Keccak),
`env::storage_usage()`, `env::storage_byte_cost()`, `env::account_balance()`, `env::chain_id()` (5.29.0+, PV 85+, returns `"testnet"`),
`env::promise_result_checked(idx, max_len) -> Result<Vec<u8>, PromiseError>` (`promise_result` is **deprecated**),
`env::log_str`, `log!(..)`, `require!(cond, "ERR_X")`, `env::panic_str("ERR_X")` → failure text `Smart contract panicked: ERR_X`. [VERIFIED/SOURCED env.rs]

### NFT standard embedding with a transfer hook (tested pattern, condensed from `contracts/nft-spike`)

```rust
fn assert_transferable(&self, id: &TokenId, is_sale: bool) {
    let s = self.state.get(id).cloned().unwrap_or_default();
    require!(s.pending_signs == 0, "ERR_PENDING_SIGNS");
    require!(s.listed_price.is_none() || is_sale, "ERR_LISTED");
    require!(!s.transfer_call_in_flight, "ERR_TRANSFER_IN_FLIGHT");
}
fn after_owner_change(&mut self, id: &TokenId) {          // runs on ALL 4 paths
    if let Some(s) = self.state.get_mut(id) { s.epoch += 1; s.listed_price = None; s.listed_at = None; }
}

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]                                            // standard asserts exactly 1 yocto inside
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        self.assert_transferable(&token_id, false);
        self.tokens.nft_transfer(receiver_id, token_id.clone(), approval_id, memo);   // clears approvals, emits nft_transfer
        self.after_owner_change(&token_id);
    }
    #[payable]
    fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>,
                         memo: Option<String>, msg: String) -> PromiseOrValue<bool> {
        self.assert_transferable(&token_id, false);
        let r = self.tokens.nft_transfer_call(receiver_id, token_id.clone(), approval_id, memo, msg);
        self.after_owner_change(&token_id);
        if let Some(s) = self.state.get_mut(&token_id) { s.transfer_call_in_flight = true; }
        r
    }
    fn nft_token(&self, token_id: TokenId) -> Option<Token> { self.tokens.nft_token(token_id) }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]                                            // MUST: only self
    fn nft_resolve_transfer(&mut self, previous_owner_id: AccountId, receiver_id: AccountId, token_id: TokenId,
                            approved_account_ids: Option<HashMap<AccountId, u64>>) -> bool {
        if let Some(s) = self.state.get_mut(&token_id) { s.transfer_call_in_flight = false; }
        let kept = self.tokens.nft_resolve_transfer(previous_owner_id, receiver_id, token_id.clone(), approved_account_ids);
        if !kept { self.after_owner_change(&token_id); }  // reverted via internal_transfer_unguarded (no guard!)
        kept
    }
}
// NonFungibleTokenApproval / NonFungibleTokenEnumeration / NonFungibleTokenMetadataProvider: one-line delegations
// to self.tokens.* (see spike lib.rs). nft_approve/nft_revoke/nft_revoke_all are #[payable].

// Sale path (only transfer allowed while listed):
self.assert_transferable(&id, true);
self.tokens.internal_transfer(&owner, &buyer, &id, None, Some("sale".into())); // sender=owner → authorized; clears approvals; emits event
self.after_owner_change(&id);
Promise::new(owner).transfer(price).detach();
```
Source facts behind the pattern (`near-contract-standards/src/non_fungible_token/core/core_impl.rs` @ 5.29.1):
- `internal_transfer`: `let approved_account_ids = self.approvals_by_id.as_mut().map(|by_id| by_id.remove(token_id).unwrap_or_default());`
  "clear approvals, if using Approval Management extension; this will be rolled back by a panic if sending fails" (L212-215);
  `require!(&owner_id != receiver_id, "Current and next owner must differ")`. Removed approvals are **not refunded** on a plain
  transfer; that storage stays with the contract. [SOURCED]
- `nft_transfer_call`: transfers first, then `nft_on_transfer` with `.with_unused_gas_weight(1)`, then `nft_resolve_transfer` with
  `.with_static_gas(GAS_FOR_RESOLVE_TRANSFER /* 5 Tgas */).with_unused_gas_weight(0)` (L23, L403-413). [SOURCED]
- `nft_resolve_transfer`: `must_revert` unless the receiver returned `false`. If the current owner ≠ receiver it returns `true`
  (can't return). Otherwise `internal_transfer_unguarded(&token_id, &receiver_id, &previous_owner_id)`, refunds and removes the
  receiver's new approvals, **re-inserts the previous owner's approvals**, and emits a reverse `nft_transfer` (L428-482). [SOURCED+VERIFIED]
- `emit_transfer` sets `authorized_id: sender_id.filter(|sender_id| *sender_id == owner_id)`, but `sender_id` is only `Some` when
  the sender ≠ owner, so `authorized_id` is **always absent** (L266). [SOURCED+VERIFIED]
- Macros `impl_non_fungible_token_core!/approval!/enumeration!` are `#[deprecated(note = "implement the … traits manually instead.")]`
  (macros.rs). [SOURCED]

### Mint with storage deposit

`internal_mint(id, owner, Some(meta))` refunds the excess to the **predecessor** after measuring only the NFT records, and emits
`nft_mint`. To also charge for your own per-token state, call `internal_mint_with_refund(id, owner, Some(meta), None)` (no
refund, no event), insert your state, **flush**, measure, then refund once:

```rust
#[payable]
pub fn nft_mint(&mut self, receiver_id: AccountId) -> Token {
    let initial = env::storage_usage();
    let token_id = self.next_token_id.to_string(); self.next_token_id += 1;
    let meta = TokenMetadata { title: Some(format!("Satchel #{token_id}")),
        media: Some(format!("https://<host>/api/card/{token_id}.svg")), ..Default::default() };
    let token = self.tokens.internal_mint_with_refund(token_id.clone(), receiver_id, Some(meta), None);
    self.state.insert(token_id.clone(), TokenState::default());
    self.state.flush();                                        // store::* is lazy
    refund_deposit_to_account(env::storage_usage() - initial, env::predecessor_account_id()); // panics "Must attach X to cover storage"
    NftMint { owner_id: &token.owner_id, token_ids: &[&token.token_id], memo: None }.emit();
    token
}
```
`refund_deposit_to_account` panics if the attached deposit < cost and transfers the rest if > 1 yocto. Measured: 682 B
(0.00682 NEAR). The UI should attach 0.01–0.02 NEAR; the excess comes back. [VERIFIED]

### Metadata (NEP-177) and the dynamic SVG

- `TokenMetadata.media` can be an absolute URL (`https://…/api/card/1.svg`) with `media_hash: None`. The standard impl never calls
  `TokenMetadata::assert_valid()` on mint (which would require `media.is_some() == media_hash.is_some()`). [SOURCED+VERIFIED mint output]
- The NEP-177 text says `media_hash` is "Required if `media` is included", so a changing SVG is a known spec deviation
  (common in practice). Alternative: put the SVG endpoint in `NFTContractMetadata.base_uri` and a relative `media`. [SOURCED nep-0177.md L52-53, L86]
- NEP-171 **1.2.0** defines `nft_metadata_update` (`{"token_ids":[…], "memo"?}`). Emit it manually when the card's content changes
  meaningfully (e.g. after a sale) so indexers and wallets refetch: `env::log_str(r#"EVENT_JSON:{"standard":"nep171","version":"1.2.0","event":"nft_metadata_update","data":[{"token_ids":["1"]}]}"#)`. [SOURCED nep-0171.md L225-290]

### Events (NEP-297)

```rust
#[near(event_json(standard = "satchel"))]
pub enum SatchelEvent {
    #[event_version("1.0.0")]
    SignatureRequested { token_id: String, path: String, payload_hex: String, block: u64 },
    #[event_version("1.0.0")]
    SignatureResolved { token_id: String, ok: bool, requested_at: u64, block: u64 },
}
SatchelEvent::SignatureResolved { token_id, ok, requested_at, block: env::block_height() }.emit();
```
Output [VERIFIED]: `EVENT_JSON:{"standard":"satchel_spike","version":"1.0.0","event":"signature_resolved","data":{"token_id":"1","ok":true,"requested_at":33,"block":46}}`.
Variant names become snake_case `event`; `data` is an object for struct variants. The standard NFT events look like
`EVENT_JSON:{"standard":"nep171","version":"1.0.0","event":"nft_transfer","data":[{"old_owner_id":…,"new_owner_id":…,"token_ids":["1"],"memo":"sale"}]}`.
Limits per receipt: 100 logs, 16 KB in total. **Logs emitted before a panic stay in the failed receipt's outcome** (nearcore
`runtime/runtime/src/function_call.rs` L149 `result.logs.extend(outcome.logs)` runs on both success and failure), while the
state changes revert. Indexers must only trust `EVENT_JSON` from receipts whose status is `SuccessValue`/`SuccessReceiptId`.
Emit events after all `require!` checks. [VERIFIED/SOURCED]

### Cross-contract calls, callbacks, yield

```rust
#[ext_contract(ext_signer)]
pub trait Signer { fn sign(&mut self, request: serde_json::Value); }   // args serialize as {"request": …}

#[payable]
pub fn sign_for(&mut self, token_id: TokenId, chain: String, payload_hex: String) -> Promise {
    require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "ERR_DEPOSIT");
    /* owner / frozen / in-flight checks; s.pending_signs += 1; emit SignatureRequested */
    ext_signer::ext(self.signer.clone())
        .with_attached_deposit(NearToken::from_yoctonear(1))     // forward EXACTLY 1 yocto (excess would refund to the contract, not the user)
        .with_static_gas(Gas::from_tgas(15))                     // MPC requires prepaid >= 15 Tgas
        .with_unused_gas_weight(1)                               // leftover gas goes to the MPC call
        .sign(serde_json::json!({ "path": format!("satchel/{token_id}/{chain}"),
                                  "payload_v2": { "Ecdsa": payload_hex }, "domain_id": 0 }))
        .then(Self::ext(env::current_account_id())
            .with_static_gas(Gas::from_tgas(10))                 // reserved for the callback; measured 1.7-1.8
            .with_unused_gas_weight(0)
            .on_signed(token_id, env::block_height()))
}

#[private]                                                       // only the contract itself may call
pub fn on_signed(&mut self, token_id: TokenId, requested_at: u64) -> Option<serde_json::Value> {
    let parsed = env::promise_result_checked(0, 1024).ok()      // Err on failure/timeout OR > 1024 bytes
        .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok());
    if let Some(s) = self.state.get_mut(&token_id) { s.pending_signs = s.pending_signs.saturating_sub(1); }
    /* emit SignatureResolved { ok: parsed.is_some(), .. } */
    parsed                                                       // becomes the tx's final return value [VERIFIED]
}
```
- Returning `Promise` makes the callback's value the transaction's return value. The real MPC signature came back as
  `{"scheme":"Secp256k1","big_r":{"affine_point":"02…"},"s":{"scalar":"…"},"recovery_id":1}`. [VERIFIED tx `79w91Sc1…`]
- `#[callback_result] x: Result<T, PromiseError>` panics with "Failed to deserialize callback using JSON" if the promise
  succeeded but `T` doesn't match; only the `Err` branch is panic-free. `#[callback_unwrap]` panics on failure.
  `#[callback_result(max_bytes = N)]` bounds the read. [SOURCED near-sdk-macros attr_sig_info.rs L245-346]
- `Promise` is `#[must_use = "return or detach explicitly via .detach()"]`. A dropped promise still schedules its actions;
  call `.detach()` for fire-and-forget refunds and payouts. [SOURCED promise.rs L346, L951]
- `Self::ext(account)` is the generated `ContractExt`; `Self::ext_self()` exists since 5.25.0. `PromiseOrValue::Promise(p.as_return())`
  / `PromiseOrValue::Value(v)` return either. [VERIFIED mock-signer / SOURCED CHANGELOG]
- Yield API (only needed for the mock signer): `let (promise, yield_id) = Promise::new_yield("cb", args, Gas::from_tgas(7), GasWeight(0));`
  store `yield_id` (serde/borsh), later `yield_id.resume(bytes)` returns `Result<(), ResumeError>`. Timeout is 200 blocks; the
  callback then gets `PromiseError`. `promise_yield_create_with_id` (caller-chosen 32-byte id) needs PV 85+ (live). [VERIFIED/SOURCED]
- How the real MPC times out (near/mpc `api/sign.rs` @13f42bf): `return_signature_and_clean_state_on_success` gets `Err` and returns
  `PromiseOrValue::Promise(ext_self.fail_on_timeout())`, which panics. **Your callback sees a failed promise (not a value) on
  timeout.** The mock reproduces this and the spike's `on_signed` handled it. [SOURCED+VERIFIED]

**The never-fail callback, checklist:**
1. Reserve static gas for the callback (10 Tgas) with weight 0, and give the external call weight 1 so a big prepaid amount can't
   starve the callback.
2. No panicking code paths: no `unwrap`/`expect`/`require!` and no typed `#[callback_result]`; use `saturating_sub` and `if let`.
3. **No storage growth in the callback.** Write the `SigRecord` in `sign_for` (paid by the caller's deposit) and only flip a status
   byte in the callback. A callback that needs new bytes fails with `LackBalanceForState` once the contract's liquid balance is
   used up, which reverts the decrement. [VERIFIED for normal writes; callback case follows from the same rule]
4. Keep a liquid balance buffer on the contract account (it pays for transfer-time growth, +180 B per new owner).
5. Optional escape hatch (sec decides): store `requested_at` per pending request and allow a permissionless
   `expire_pending(request)` after `requested_at + 200 + margin` blocks. A callback that hasn't run by then never will.

### What changed in 5.x vs older tutorials

| Old | 5.29.1 |
|---|---|
| `#[near_bindgen]` + `#[derive(BorshDeserialize, BorshSerialize)]` | `#[near(contract_state)]` on the struct, `#[near]` on impls, `#[near(serializers=[json, borsh])]` on types (`near_bindgen` still exported, documented as deprecated) |
| `Balance` (u128), `Gas(u64)` tuple | `NearToken`, `Gas::from_tgas()` (`Balance` alias removed) |
| `env::promise_result(i)` | `env::promise_result_checked(i, max_len)` (old one `#[deprecated]`) |
| `near_sdk::collections::*` | `near_sdk::store::*` (legacy needs feature `legacy`); `store::UnorderedMap` deprecated → `IterableMap` |
| `impl_non_fungible_token_core!(Contract, tokens)` | manual trait impls (macros deprecated) |
| `ext_contract` free functions `ext_x::f(.., account, deposit, gas)` | builder `ext_x::ext(account).with_attached_deposit(..).with_static_gas(..).f(..)` |
| Rust 1.81/1.86 pins, edition 2021 | Rust ≥1.93 (MSRV), edition 2024, `cfg(near)` lint entry, cargo-near required |
| max 300 Tgas per tx | **1 PGas** (`max_total_prepaid_gas`) |
| 30% of burned gas paid to the contract | 0% on testnet PV 87 (`burnt_gas_reward 0/1`) |

## Gotchas & failure modes

- **Guard bypass on revert:** `nft_resolve_transfer` moves the token back with `internal_transfer_unguarded`, so the hook must
  run in your resolve wrapper. Never `require!` in resolve: a panic there leaves the token with the receiver.
- **Resolve gas is fixed at 5 Tgas** by near-contract-standards. Every extra read, write or event in your resolve wrapper counts
  against it (measured 3.11).
- **Restored approvals:** after a reverted `nft_transfer_call`, the previous owner's approvals come back. That follows the standard,
  but don't assume "approvals are always empty after a transfer attempt".
- **`authorized_id` never present** in `nft_transfer` events (upstream bug), and events carry version `1.0.0`, not `1.2.0`.
  Indexers must not rely on either.
- **Failed receipts still show their logs.** An indexer that reads `EVENT_JSON` without checking the receipt status records
  events that never happened. That matters for `signature_issued` in the clean-history log.
- **Lexicographic `nft_tokens`:** sort numerically in the UI, or page with `nft_tokens_for_owner`.
- **Lazy `store` writes:** measure storage only after `flush()`. Forgetting this makes you charge 0 bytes.
- **Contract-paid growth:** NEP-171 transfers carry exactly 1 yocto, so the contract pays +180 B for each new owner set.
  Approvals removed on transfer aren't refunded. Keep a liquid buffer.
- **`#[callback_result]` typed parse panics**, and `#[payable]` is missing by default: a non-payable method panics with
  "Method X doesn't accept deposit" when NEAR is attached.
- **Forward exactly 1 yocto to MPC.** Deposits above the minimum are refunded to the predecessor, which is your contract.
- **Plain `cargo build` silently produces fallback code.** Use `cargo near build`.
- **`cargo near new` on a machine whose default toolchain is old** (this Mac: nightly-2023-12-11) fails at its inner `cargo update`
  ("Consider adding `cargo-features = ["edition2024"]`"). The rustup proxy passes `RUSTUP_TOOLCHAIN` to child processes, which
  overrides the new project's `rust-toolchain.toml`. Use `cargo +1.93.0 near new <dir>` (worked) or run `cargo update` in the
  new dir afterwards. cargo-near also sends an anonymous PostHog event on `new` (language/version/OS). [VERIFIED/SOURCED]
- **`as_tgas()` truncates** (3.5 Tgas prints as 3); use `as_gas() as f64 / 1e12` in logs.

## Recommendations for Satchel (concrete, with priority P0/P1/P2)

- **P0** Pin the versions and Cargo.toml above on Nov 1 and commit `Cargo.lock` plus `rust-toolchain.toml`. Use `crate-type = ["cdylib"]`.
- **P0** Implement the five NFT traits manually with `assert_transferable` + `after_owner_change` on all four ownership paths, plus
  a `transfer_call_in_flight` lock that `sign_for`, `list`, `add_delegate` and `nft_approve` all check.
- **P0** `sign_for`: forward exactly 1 yocto, static 15 Tgas to MPC with weight 1, and write the `SigRecord` at request time.
  UI attaches 50–100 Tgas. **Default to sec's design** (`kb/70`): `last_sign_height` instead of a counter, and no state-changing
  callback. If the team keeps `pending_signs`, use the tested callback pattern above (10 Tgas static, weight 0, manual
  `promise_result_checked(0, 1024)`, no storage growth, always decrement).
- **P0** Charge storage on every state-growing user call (`nft_mint`, `sign_for`, `add_delegate`, `list`) with the
  measure-flush-refund pattern. Keep ≥1 NEAR liquid buffer on the testnet contract for transfer growth.
- **P1** Implement `nft_transfer_call` by hand (copy core_impl.rs L390-415, using `internal_transfer` + `ext_nft_receiver` +
  `ext_nft_resolver`) with **≥20 Tgas** static resolve gas and weight 0 (matches `kb/70` F24/§i), so resolve has margin. If time
  is short, keep the standard (5 Tgas) and keep the resolve wrapper O(1) (measured 3.11 Tgas).
- **P1** Flat storage layout: `LookupMap<(TokenId,u32), SigRecord>`, delegates keyed `(TokenId, AccountId)` with the epoch in the
  value (overwritten on re-add, so stale delegates don't leak storage).
- **P1** Custom events: `signature_requested`, `signature_resolved`, `listed`, `delisted`, `sold`, `delegate_added`,
  `delegate_removed`, plus the standard `nft_metadata_update` 1.2.0 after sales. `data` stays small (<1 KB).
- **P2** If the README advertises standards, add `#[near(contract_state, contract_metadata(standard(standard = "nep171", version = "1.2.0"), …))]`
  so `contract_source_metadata` lists them (today it shows only nep330).

## Deltas vs plan (near_hackathon.md)

| Plan text | Finding | Change |
|---|---|---|
| "Rust with near-sdk 5.x and cargo-near, near-workspaces" (A, L59); "Pin on Nov 1" (L60) | Confirmed. Stable is 5.29.1 / cargo-near 0.22.0 / near-workspaces 0.23.0; RCs dropped 2026-10-19 with MSRV 1.95 | Pin the exact versions above; don't adopt RCs mid-hackathon |
| B5 struct: `#[near(serializers = [borsh])] SatchelState { …, sig_log: Vector<SigRecord> }` inside `LookupMap<TokenId, SatchelState>` | Works, but nests a `store::Vector` inside a map value (per-token prefix + flush ordering) | Flat `LookupMap<(TokenId,u32), SigRecord>` + `sig_count` in state |
| B5: `#[private] pub fn on_signed(…, #[callback_result] r: Result<SignatureResponse, PromiseError>)` | Typed `#[callback_result]` panics on parse mismatch → `pending_signs` stuck → token can't transfer | Read the result manually (pattern above) or use `Result<serde_json::Value, _>` |
| B5: "Transfer hook: require !listed \|\| is_sale and pending_signs == 0; bump delegate_epoch" | Missing: the `nft_resolve_transfer` revert path (unguarded) and the transfer_call window | Hook all four paths; add an in-flight lock |
| B5: `.with_static_gas(Gas::from_tgas(15))`, "Attach about 50 Tgas to sign_for (estimate)" | Confirmed: MPC needs ≥15 Tgas prepaid. Real run burned 13.4 Tgas total; tx cap is 1 PGas | Keep 15 static to MPC, add a 10 Tgas callback reservation, attach 50–100 Tgas |
| B5 Costs: "about 0.005 NEAR per sign (estimate)" | Gas burned ≈ 13.4 Tgas ≈ 0.0013 NEAR at 1e8/gas; plus storage ~0.001 NEAR per `SigRecord`; the upfront gas purchase uses `min_gas_purchase_price` 1e9 (100 Tgas → 0.1 NEAR reserved, refunded) [VERIFIED+SOURCED] | ≈0.0025 NEAR all-in per sign; users need ~0.1 NEAR of free balance (the UI's "insufficient balance" copy should say so) |
| B3 S-1 "minter pays storage, excess refunded" | Confirmed: ~0.007 NEAR per mint | UI attaches 0.02 NEAR |
| B3 S-5 "approvals empty after transfer" | True for `nft_transfer` and sales. A **reverted** `nft_transfer_call` restores them | Mention in tests and README |
| B4 dynamic SVG card (`/api/card/:id.svg`) | NEP-177 wants `media_hash` with `media`; a dynamic URL can't have a stable hash | Set `media_hash: None` (accepted deviation) and emit `nft_metadata_update` |
| Missing | `nft_tokens` is lexicographic; transfers make the contract pay +180 B; `authorized_id` never emitted | Notes for the web/pay/indexer agents |

## Open questions / human actions

- **Human/planner:** decide whether Satchel supports `nft_transfer_call` at all (recommended: yes, with the in-flight lock),
  and whether the escape-hatch `expire_pending` is wanted (sec agent).
- **Human:** keep ≥5 NEAR on the final testnet contract account; it pays transfer-time storage.
- **Open:** should approvals (NEP-178 marketplaces) be allowed at all on a wallet-NFT? An approved marketplace can move the token
  whenever it's neither listed nor pending, so it bypasses Satchel's clean-history UX. This is a sec/product decision.
- **Open:** NEP-199 payouts (`nft_transfer_payout`) aren't implemented by near-contract-standards. Only needed if external
  marketplaces must sell Satchels.
