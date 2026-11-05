# Contracts

Three Rust crates, all members of the root `Cargo.toml` workspace (Rust pinned by `rust-toolchain.toml`,
target `wasm32-unknown-unknown`; near-sdk, exact version in `Cargo.lock`).

| Crate | What it is |
|---|---|
| `satchel/` | **The product.** A NEP-171 NFT contract on NEAR testnet. Each token controls BTC (testnet4), EVM (Sepolia, Base / Arbitrum / OP Sepolia) and SOL (devnet) addresses through NEAR Chain Signatures (MPC signer `v1.signer-prod.testnet`). Every signature is recorded on-chain before the MPC is asked, so a buyer can check the token's whole signing history ("clean history"). |
| `mock-signer/` | Sandbox-only test double of the MPC signer's `sign` interface: same wire format, preconditions and yield/timeout behaviour, fake signatures, plus test knobs (`set_mode`, `respond*`, a request log). Never deployed. |
| `mock-ft/` | Sandbox-only NEP-141 standing in for Circle testnet USDC (6 decimals, 0.00125 NEAR storage), built on near-contract-standards, with an open `mint` for test setup. Never deployed. |

The sandbox suite that drives all three lives in `tests/` (see `tests/README.md`).

## `contracts/satchel/src` at a glance

| File | What it holds |
|---|---|
| `lib.rs` | Contract state (`Contract`, `StorageKey`), constants mirrored in `config()`, `new`, `nft_mint`, the NEP-171/177/181 wrappers (`nft_transfer` is owner-only, refused while listed; `nft_transfer_call` is disabled), the ownership hook `on_owner_change`, `ensure_receiver`, `charge_storage`, and the low-level `promise` module |
| `sign.rs` | `sign_for` (classify → write records → charge storage → `sign_requested` event → MPC fan-out) and the panic-free callback `on_signed` |
| `parse/` | The payload classifiers. `mod.rs` dispatches a `SignRequest` and hashes it; `evm.rs` (type-2 tx: native ETH or a USDC `transfer`, four testnets, nonce-gap rule), `btc.rs` (BIP143 P2WPKH preimages + outputs, one complete tx), `sol.rs` (legacy single-signer System Transfer, no durable nonce), `msg.rs` (C7 message signing: EIP-191 and Solana off-chain v0), `rlp.rs` (canonical RLP decoder), `hex.rs` (strict hex). Tests: `tests.rs` (shared vectors), `fuzz_tests.rs` (proptest oracles and the TS differential) |
| `mpc.rs` | MPC wire types, the derivation path `satchel/{token_id}/{btc\|evm\|sol}`, and the panic-free response parser |
| `types.rs` | Stored types (`SigRecord`, `SigDetail`, `TokenState`, `Listing`, `SignRequest`, `FtMsg`) and the JSON view shapes |
| `views.rs` | `config`, `satchel`, `sig_records`, `listings`, `proceeds_of`, `derived_path` |
| `history.rs` | C1 `history_digest`: one SHA-256 over a token's whole history |
| `evm_nonces.rs` | C3 per-chain EVM nonce state and the `max_evm_nonce` view |
| `sale.rs` | `list` / `delist` (quiet period), `buy` (NEAR), `ft_on_transfer` (USDC buy, USDC offer, FT deposit), `withdraw_proceeds`, `on_payout` |
| `offers.rs` | C4 offers: `make_offer`, `cancel_offer`, `accept_offer`, and the offer views |
| `inside.rs` | C6 NEAR and FTs held inside a Satchel: `deposit_near`, `withdraw_near`, `withdraw_ft`, `on_inside_withdraw`, `inside_of` |
| `market.rs` | State shared by C4 and C6 (`Market`, the FT allowlist, storage credit, escrow totals), `prepay_storage`, `withdraw_storage_credit`, `market_totals`, and the M-01 solvency guard `ensure_solvent` |
| `allowance.rs` | C5 spending allowance: an owner lets a delegate `sign_for` plain transfers up to per-asset caps per rolling 24 h (`set_allowance`, `revoke_allowance`, `allowances_of`, `allowance`) |
| `events.rs` | NEP-297 events (`standard: "satchel"`) |
| `errors.rs` | Stable error codes (`ERR_X: sentence`) |
| `tests.rs`, `security_tests.rs`, `allowance_tests.rs`, `market_tests.rs`, `feature_tests.rs` | Unit tests (`#[cfg(test)]`, near-sdk mocked chain) |
| `review3_{allowance,acl,sign,money}_tests.rs`, `parse/review3_parse_tests.rs` | Round-three review proofs (`docs/security/review-round-3.md`); slow demos and the conservation fuzz are `#[ignore]`d, run them with `--include-ignored` |

## Where the design lives

- `kb/90-technical-spec.md`: the source of truth. §5 is the contract (types §5.3, storage §5.4, constants §5.5,
  interface §5.6, method preconditions §5.7, `sign_for` §5.8, classifiers §5.9, sale §5.12, events §5.13, views
  §5.14, errors §5.15, keyless birth §5.16, sprint additions §5.17); §6 lists the invariants INV-xx, each a named test;
  §7 is the clean-history protocol.
- `docs/specs/C1-C2-C3-C7.md` (history digest, USDC on EVM, four EVM testnets, message signing), `docs/specs/C4-C6.md`
  (offers, assets inside a Satchel, invariants I-Mx), `docs/specs/C5.md` (spending allowance).
- `docs/handoff/contract.md`: public interface summary, classifier check order, deviations from the spec (D1, D2).
- `docs/security/` (contract review S-xx, sprint review SR-xx / M-01, parser fuzzing) and `docs/testing/contract.md`
  (coverage audit, AUDIT-xx, Q-xx). Decisions D-xx are in `plan/decisions.md`.

## Build

Build only with `cargo near build` (the crate is `crate-type = ["cdylib"]`):

```sh
cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml   # → target/near/satchel/satchel.wasm
cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml       # Docker; the deployed code
tools/check-wasm-imports.sh target/near/satchel/satchel.wasm                          # INV-22
```

The reproducible build runs in the Docker image pinned in `contracts/satchel/Cargo.toml`
(`[package.metadata.near.reproducible_build]`); the root `README.md` (Verify on-chain, step 6) compares its SHA-256
with the deployed contract. Build the mocks the same way (`--manifest-path contracts/mock-signer/Cargo.toml`,
`contracts/mock-ft/Cargo.toml`) before running the sandbox suite.

## Test

```sh
cargo test -p satchel --lib            # unit tests, offline: guards, classifiers, shared vectors, fuzz properties
cargo test -p mock-signer -p mock-ft   # the mocks' own unit tests
cargo test -p satchel-tests            # sandbox suite; needs the three wasm files above (tests/README.md)
```

## Safety properties to know first

- **Record before MPC.** `sign_for` writes one `SigRecord` per MPC request, and charges its storage, in the same
  receipt that creates the MPC `sign` calls. A signature can never exist without its record, even if the MPC times out
  (INV-11, INV-12). `on_signed` only fills the status and signature slot and never panics.
- **Structured payloads, never raw hashes.** `sign_for` takes an unsigned EVM type-2 tx, BTC BIP143 preimages plus the
  outputs, a SOL legacy message, or a C7 message body. The contract classifies and hashes the bytes itself
  (`parse/`), so every record says exactly what was signed (INV-07, INV-09).
- **Freeze on list.** While a token is listed, `sign_for` fails `ERR_FROZEN` (owners and delegates alike),
  `nft_transfer` fails `ERR_LISTED`, and inside withdrawals are refused. `list` needs a quiet period of 250 blocks after
  the last signature (INV-13).
- **Buy bound to the history.** `buy` and the USDC buy must name the listing id and the `sig_count` the buyer checked;
  any change fails `ERR_LISTING_CHANGED` (INV-14). Offers bind to `sig_count` and `inside_epoch` the same way.
- **Keyless and immutable.** There are no admin or upgrade methods and `new` runs once. The final account is born
  keyless (kb/90 §5.16, INV-31), and receipts are built with `env::promise_*` FunctionCall and Transfer actions only,
  so the wasm imports no AddKey, DeployContract or DeleteAccount host function (INV-22, checked by
  `tools/check-wasm-imports.sh` in CI).
