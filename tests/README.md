# Sandbox integration suite (`satchel-tests`)

End-to-end tests of the **real compiled wasm** on a local NEAR sandbox, with
[near-workspaces](https://github.com/near/near-workspaces-rs) (its default nearcore sandbox; versions pinned in
`tests/Cargo.toml`). No testnet, no keys, no network beyond the one-time sandbox binary download. Two sandbox-only test doubles stand in for
the external contracts (both in `contracts/`, never deployed):

- `mock-signer` mirrors the `sign` interface of the MPC signer `v1.signer-prod.testnet` (yield/resume, the 200-block
  timeout, the live error strings) and logs every request, so a test can check exactly what the MPC would have been
  asked to sign. Its modes (`reply`, `manual`, `never`, `garbage`, `wrong_shape`, `panic`) drive the failure paths.
- `mock-ft` is a standard NEP-141 standing in for Circle testnet USDC (it is also deployed at `wrap.testnet` to play
  wNEAR in `audit.rs`).

Unit tests of the contract itself (`cargo test -p satchel --lib`) live next to the code in `contracts/satchel/src`.

## Run it

The tests read prebuilt wasm files; they do not build them. Build the three contracts first (only with
`cargo near build`), then run the suite:

```sh
for c in satchel mock-signer mock-ft; do
  cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml
done
cargo test -p satchel-tests                      # whole suite
cargo test -p satchel-tests --test sale          # one file
cargo test -p satchel-tests --test mock_signer   # the mock alone (no satchel.wasm needed)
```

`common::wasm` loads `target/near/<name>/<name>.wasm` from the repo root, where `<name>` is the crate name with `-`
replaced by `_` (`satchel`, `mock_signer`, `mock_ft`). A missing file fails with the build command to run.
Overrides:

- `SATCHEL_WASM=<path>` runs the suite against another Satchel artifact, e.g. the reproducible build (kb/90 §12.3).
- `SANDBOX_VERSION=<nearcore version>` runs it against another nearcore, such as the one testnet runs.

The sandbox binary exists for Linux and Apple Silicon only. `gas.rs`, `gas_paths.rs`, `security.rs` and `review.rs`
print measurements; add `-- --nocapture` to see them.

## Files (`tests/tests/`)

| File | What it covers |
|---|---|
| `common/mod.rs` | Shared harness: wasm loading, sandbox setup (satchel + mock signer + mock FT + funded accounts), call helpers, the attach-gas and deposit formulas callers use |
| `common/payloads.rs` | Byte-exact builders for the EVM, BTC and SOL payloads and independent hash oracles, written from the spec layouts |
| `common/rpc.rs` | Raw `EXPERIMENTAL_tx_status` helpers: receipt actions, refund amounts, one action per MPC receipt |
| `harness.rs` | No sandbox: the payload builders against KB constants, and `tools/check-wasm-imports.sh` (INV-22) on synthetic wasm modules |
| `mock_signer.rs` | The mock signer called directly: yield/resume, the 200-block timeout, response shapes, precondition errors |
| `nft.rs` | NEP-171/177/181 surface: sequential ids and no burn (INV-21), mint deposit, metadata, enumeration |
| `sign.rs` | `sign_for` / `on_signed`: owner check, exact MPC requests, hashes the contract computed, events, refusals that change nothing, append-only log, timeouts and garbage responses that never get stuck, BTC fan-out, SOL, deposits, private callbacks |
| `storage.rs` | Exact storage charging read from receipt Transfer actions (INV-18); `on_signed` never grows storage (INV-29) |
| `gas.rs` | The prepaid-gas floor `30 + 18·n` Tgas and ≥ 15 Tgas forwarded to every MPC `sign` (INV-19) |
| `transfer.rs` | Ownership paths: control moves with the NFT, no approvals, `nft_transfer_call` disabled, records survive a transfer, a transfer while a signature is in flight, refused receivers, exactly 1 yocto |
| `sale.rs` | NEAR sale: quiet period and freeze while listed, buy bound to `listing_id` and `sig_count`, payout and the proceeds fallback |
| `usdc.rs` | USDC sale through `ft_transfer_call`: happy path, every refusal refunded 100 %, direct-call attack, proceeds for a seller who can't receive USDC, `usdc: None` |
| `views.rs` | `config()` equals the compiled constants (INV-27) and the exact JSON shapes of kb/90 §5.14 |
| `release.rs` | Keyless birth: one transaction with CreateAccount, Transfer, DeployContract, `new` and 7 mints, no AddKey (INV-31) |
| `allowance.rs` | C5 spending allowance: a delegate signs within its caps, is refused over them, has no owner powers, is paused while listed and cleared on every ownership change |
| `market.rs` | C4 offers and C6 inside assets: deposits, withdrawals, offers in NEAR and USDC, stale offers, failed transfers that re-credit, solvency invariants I-M1 / I-M3 after every step |
| `features.rs` | C1 history digest, C2 USDC transfers on EVM, C3 four EVM testnets, C7 message signing |
| `security.rs` | Adversarial review (docs/security/contract-review.md): the S-01 proof, fix checks for S-03, S-04, S-05 and S-06/S-09, measurements |
| `review.rs` | Sprint security review (docs/security/sprint-review.md): large injected histories, digest gas, the M-01 solvency proof |
| `audit.rs` | Test audit (docs/testing/contract.md): AUDIT-01, AUDIT-02, AUDIT-04 on the real wasm, wNEAR, sale-path event fields |
| `round2.rs` | Test audit round two: event order on every success path, the delegate path's events, Q-03 / Q-04 refusals |
| `gas_paths.rs` | Gas of the heaviest non-signing paths, printed for before/after comparisons (behaviour-neutral) |

## More detail

- `docs/handoff/sandbox.md`: running the suite, the mock interfaces, test-side deviations, and the invariant → test
  map (§5).
- `docs/testing/contract.md`: how to run every suite, the coverage matrix (every public method and every INV-xx /
  I-Mx mapped to its tests), edge cases, and the audit findings.
- `kb/90-technical-spec.md` §6: the invariants INV-xx, each a named test.
