# Handoff: `contract` (contracts/satchel)

Status: **v1 complete; security fix pass applied 2026-10-23** (§7; docs/security/contract-review.md). Before it: 42 unit tests pass (incl. all 111 shared vectors); the full sandbox suite (71 tests) passes against this wasm; INV-22 OK. Wasm: `target/near/satchel/satchel.wasm` (built with
`cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml`). `near-sdk-env` resolves to 0.1.6.

## 1. Public interface (near-sdk 5.29.1; JSON args)

Encoding: yocto / USDC amounts are `U128` decimal strings; `seq`, `listing_id`, `sig_count`, heights, `timestamp_ms`,
`chain_id`, `nonce`, `vout` are JSON numbers; `amount_sats` / `lamports` are decimal strings; byte strings are lowercase
hex without `0x` in outputs (inputs accept an optional `0x`/`0X` and either case). Enum tags are snake_case.

| Method | Args JSON | Caller | Gas to attach | Deposit | Returns |
|---|---|---|---|---|---|
| `new` (init, **not** private) | `{"mpc":"v1.signer-prod.testnet","usdc":"<id>"\|null,"base_uri":"https://<host>/api/card/"}` | birth batch | 30 Tgas | 0 | — |
| `nft_mint` | `{"receiver_id":"alice.x.testnet"}` (not the contract, the MPC or the configured USDC → `ERR_BAD_RECEIVER`) | anyone | 30 Tgas (20 in the batch) | 0.02 NEAR (measured storage kept, rest refunded to the caller) | NEP-171 `Token` |
| `nft_transfer` | `{"receiver_id","token_id","approval_id"?,"memo"?}` (receiver guard as `nft_mint`) | owner | 30 Tgas | exactly 1 yocto | — |
| `nft_transfer_call` | NEP-171 args | — | — | — | always panics `ERR_TRANSFER_CALL_DISABLED` |
| `sign_for` | `{"token_id":"1","request":{"evm":{"unsigned_tx":"02…"}},"mpc_deposit":null}` · `{"btc":{"preimages":["…"],"outputs":"…"}}` · `{"sol":{"message":"…"}}` | owner | `min(300, 60+20n)` Tgas; floor `30+18n` (`ERR_GAS`) | `0.005 NEAR × n` (charges Δstorage + n × mpc_deposit, refunds the rest) | tx result = `on_signed` value: JSON array, one MPC response (or `null`) per request, in input order |
| `on_signed` | private | self | static `10+2n` Tgas, weight 0 | — | `Vec<Option<Value>>` |
| `list` | `{"token_id":"1","price":"5000000","currency":"near"\|"usdc"}` | owner | 30 Tgas | 0.01 NEAR (≥ 1 yocto; storage kept, rest refunded; the first listing per (seller, currency) also reserves the proceeds slot, ≈ 0.0008 NEAR) | listing id (number) |
| `delist` | `{"token_id":"1"}` | owner | 30 Tgas | **exactly 1 yocto** (else `ERR_DEPOSIT`) | — |
| `buy` | `{"token_id":"1","listing_id":7,"expected_sig_count":4}` | anyone but the seller | 50 Tgas | exactly `price` (yocto) | — |
| `ft_on_transfer` | via `usdc.ft_transfer_call({"receiver_id":"<satchel>","amount":"<price>","msg":"{\"buy\":{\"token_id\":\"1\",\"listing_id\":7,\"expected_sig_count\":4}}"})` | the configured USDC only | 150 Tgas on `ft_transfer_call` | 1 yocto on `ft_transfer_call` | `"0"` (used = all) |
| `withdraw_proceeds` | `{"currency":"near"\|"usdc"}` | anyone owed | 50 Tgas | **exactly 1 yocto** (else `ERR_DEPOSIT`) | tx result = payout chain |
| `on_payout` | private; no-op unless exactly 1 promise result | self | static **10 Tgas** | — | — |

MPC call per request (one single-action receipt each, joined with `promise_and`): `sign({"request":{"path":"satchel/{id}/{btc|evm|sol}","payload_v2":{"Ecdsa":"<hex32>"}|{"Eddsa":"<message hex>"},"domain_id":0|1}})`,
15 Tgas static + unused-gas weight 1, deposit `mpc_deposit` (default 1 yocto, max 0.01 NEAR → `ERR_MPC_DEPOSIT`).
Payout: NEAR `Transfer(price)`; USDC `ft_transfer({"receiver_id","amount","memo":"satchel sale"})` 1 yocto, 15 Tgas; each `.then(on_payout)` 10 Tgas. The payout is detached (never the returned promise) for `buy` / `ft_on_transfer`.

### Views
`config()`, `satchel(token_id)`, `sig_records(token_id, from_seq, limit≤50)`, `listings(from_index, limit≤50)`,
`proceeds_of(account_id)`, `derived_path(token_id, chain)`, plus NEP-171/177/181 (`nft_token`, `nft_metadata`,
`nft_total_supply`, `nft_tokens`, `nft_supply_for_owner`, `nft_tokens_for_owner`) and NEP-330 `contract_source_metadata`.
Shapes are exactly spec §5.14. `limit` above 50 is clamped to 50 (not an error). **Since the fix pass this includes `nft_tokens` and `nft_tokens_for_owner`, whose `limit` also defaults to 50** (page with `from_index`).

### Events (NEP-297, `standard:"satchel"`, `version:"1.0.0"`)
`sign_requested`, `sign_resolved`, `listed`, `delisted`, `sold`, `payout` with the spec §5.13 `data` shapes, plus the
standard `nep171` `nft_mint` / `nft_transfer`. `sign_requested.details[i]`: EVM `{seq, chain_id, nonce}`; BTC
`{seq, txid (display order), vout, amount_sats (string)}`; SOL `{seq, recent_blockhash, lamports (string)}`.
`sign_resolved.count` = number of promise results read (= n).

## 2. Classifier check order (matches docs/handoff/core.md §1 exactly)
- Common: hex first (`ERR_HEX`), empty string = 0 bytes.
- EVM: TOO_LONG → TYPE → RLP (all structure: 9 items, canonical, items 0–6 strings, data string, access list a list, nesting depth ≤ 16) → CHAIN_ID → INT_WIDTH → TO → DATA → ACCESS_LIST → (token state, in `sign_for`) NONCE_GAP.
- BTC: INPUT_COUNT (before hex) → HEX (preimages, then outputs) → PREIMAGE_LEN (all) → per preimage VERSION → SCRIPTCODE → SEQUENCE → LOCKTIME → SIGHASH → MIXED_TX (hashPrevouts, hashSequence, hashOutputs, pkh) → DUPLICATE_INPUT → PREVOUTS_INCOMPLETE → SEQUENCES_MISMATCH → OUTPUTS_MALFORMED → OUTPUTS_MISMATCH.
- SOL: TOO_LONG → VERSION (empty → MALFORMED) → HEADER (right after the 3 header bytes) → MALFORMED → DURABLE_NONCE → INSTRUCTION.
  - **Extra MALFORMED rule (core: please mirror):** `num_required_signatures + num_readonly_unsigned > num_keys` → `ERR_SOL_MALFORMED`.

## 3. Deviations from spec §5 (safer option chosen)
- **D1 quiet period for never-signed tokens.** `list` requires `height ≥ last_sign_height + 250` only when `sig_count > 0`. A token that never signed has nothing in flight, so it lists at once (otherwise a fresh sandbox, whose height starts below 250, could not list a new token). `satchel().listable_at` is `0` for such tokens, else `last_sign_height + 250`.
- **D2 low-level promises.** near-sdk 5.29.1's `Promise` type links `promise_batch_action_add_key*`, `deploy_contract` and `delete_account` into the wasm through its drop glue, which breaks INV-22. The contract builds receipts with `env::promise_*` directly (FunctionCall + Transfer only) and sets results with `promise_return`. Effects: no `ext_contract` traits; `sign_for` and `withdraw_proceeds` are declared `-> ()` in the ABI, but the tx result is still `on_signed` / the payout chain. Release wasm imports (27): no AddKey / DeployContract / DeleteAccount / Stake / DeleteKey.
- **D3 `on_signed` TooLong.** A successful MPC result above 1024 bytes is `unparsed` (not `failed`), with `null` in the output.
- **D4 `on_payout`.** Only `PromiseError::Failed` re-credits; `Ok` or `TooLong` count as paid (never double-credit).

## 4. Known gaps / notes
- Wasm size is ≈ 289 KB (spec planned ≈ 260 KB): ≈ 2.9 NEAR of code stake; the 10 NEAR birth funding still leaves > 5 NEAR liquid.
- Oracles: the 52-byte kb/70 F1 tx and the kb/70 F4 preimage are printed truncated in the KB; the full bytes come from the sec spike's recorded evidence output (data, not code) and are checked against the KB prefix/suffix/hash. An independent bitcoinjs-lib 7.0.4 2-input tx and @solana/web3.js 1.99.0 messages were generated by fresh scratch scripts (not committed) and are embedded as test constants.

## 5. Test status (2026-10-22)
- `cargo test -p satchel --lib`: 42 passed. Includes the KB oracles (kb/31 48-byte tx → `bc657845…c377`, kb/70 F1 → `8cb1b816…f6a1a9`, kb/70 F4 sha256d == bitcoinjs), every §12.2 refusal case, and `parse::tests::shared_vectors` (111 vectors from `vectors/{evm,btc,sol}.json`, 0 failures).
- `cargo test -p satchel-tests` (the sandbox agent's suite, nearcore 2.13.4): 71 passed (gas 4, harness 4, mock_signer 9, nft 2, release 2, sale 9, sign 21, storage 4, transfer 7, usdc 7, views 2).
- `tools/check-wasm-imports.sh`: INV-22 OK. The only promise actions imported are `function_call_weight` and `transfer`.
- Wasm 289,125 B, sha256 `bec41e446df0944d07ea3029c3101b9e7507094d26401a4f396e0b36b68da584` (non-reproducible, host build).

## 6. Sandbox findings
- **F-1 (INV-22): fixed** by deviation D2 (no `near_sdk::Promise` anywhere; `ft_on_transfer` still returns `PromiseOrValue::Value(U128(0))`; the checker confirms no forbidden import).
- Note for unit tests: `#[private]` lives in the exported wasm wrapper, so `on_signed` / `on_payout` privacy is covered only by the sandbox suite.

## 7. Security fix pass (2026-10-23)

Findings and tests: `docs/security/contract-review.md` (§Fix pass) and `docs/security/fuzzing.md` (§0).

**Interface changes (the web app and tools must follow them):**
- `delist` and `withdraw_proceeds` take **exactly 1 yocto**. Anything else is `ERR_DEPOSIT: attach exactly 1 yocto` (S-03). `@satchel/core` `ATTACH.delist/withdraw` already attach 1 yocto.
- **Nonce-gap rule** (S-04, D-43, spec §5.9). `sign_for` refuses an EVM request with `ERR_EVM_NONCE_GAP: nonce must be ≤ N (highest signed nonce + 1)` unless `nonce ≤ max_evm_nonce + 1`, or `nonce ≤ 1` when the token has no EVM record yet.
  - The check runs after every classifier rule and before any state change.
  - `max_evm_nonce` covers every EVM record of the token, whatever its status, and survives transfers and sales.
  - Clients derive it from `sig_records` with `@satchel/core/policy` `maxSignedEvmNonce`. `classifySignRequest(req, { evmMaxSignedNonce })` mirrors `sign_for` exactly; without the context it is the stateless classifier.
  - The web Send builder (`apps/web/src/lib/chains/send.ts`) refuses to build a gap.
- **NEP-181 views are paged** (S-05): `nft_tokens` and `nft_tokens_for_owner` return at most 50 tokens. A missing `limit` means 50.
- **Receiver guard** (S-06, S-09). `nft_mint` and `nft_transfer` refuse the contract itself, the MPC account and the configured USDC contract (`ERR_BAD_RECEIVER`). The UI keeps its existence and self-derived-account checks.
- **`list` reserves the proceeds slot** (S-01). The first listing per (seller, currency) stores `proceeds[(seller, currency)] = 0` and charges it to the seller (≈ 77 B, still under `LIST_ATTACH`). `withdraw_proceeds` zeroes the slot instead of removing it. `on_payout` can therefore never need contract-paid storage. `proceeds_of` still hides zero entries.
- `on_payout` static gas is 5 → **10 Tgas**. It does nothing (a log line only) unless there is exactly 1 promise result (S-13).

**State layout:** `TokenState` gained `max_evm_nonce: Option<u64>` at the end. That is +1 B per mint, and +8 B on the first EVM record, charged to the requester. No deployment exists yet, so nothing needs migrating.

**Tests after the fix pass:**
- `cargo test -p satchel --lib`: 86 passed, 0 ignored.
- The sandbox suite: see `docs/security/contract-review.md` §Sanity runs.
- 124 shared vectors (EVM 56, incl. 10 `nonce_gap_*` and 3 RLP-depth vectors; the EVM vectors can carry a `state`, below).

**Wasm:** 290,504 B, sha256 `aea0b2e95d1a45278b7b020c2b7e015a41aea6cf5248b765f5cbb72ede451bd6` (non-reproducible host build). INV-22 OK, 27 imports.

**Vector schema addition:** an EVM vector may carry `"state": {"evm_max_nonce": "<decimal>" | null}`. Absent means null, which is a token with no EVM record. Runners apply the nonce-gap rule after the classifier, as `sign_for` does.

