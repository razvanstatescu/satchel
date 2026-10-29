# Testing: near-workspaces sandbox, mock MPC signer (yield/resume + timeout), unit tests, CI
> Owner: sdk · Checked: 2026-10-21 · Confidence: high
> Primary sources: near-workspaces-rs `near-workspaces-v0.23.0` (`534eebad`): `workspaces/src/{operations.rs,network/sandbox.rs,rpc/client.rs}`, `build.rs`;
> near-sandbox-rs `v0.3.16` (`8b1dcf9f`): `src/runner/mod.rs`, `src/lib.rs`; near-sdk-rs `examples/mpc-contract` @ `near-sdk-v5.29.1`;
> near/mpc `crates/contract/src/api/{sign.rs,common.rs}` + `crates/contract/tests/sandbox/common.rs` @ `13f42bf4`;
> spike `research/spikes/sdk/tests/tests/{spike.rs,extra.rs}` and `RESULTS.md` §4.

## TL;DR — what an implementer must know

1. **Use near-workspaces 0.23.0** (stable, Rust 1.93, sandbox nearcore 2.13.4) with feature `unstable`. The 5 core spike tests
   (yield, timeout, hook, sale, transfer_call) also pass against `near_workspaces::sandbox_with_version("2.14.0-rc.5")`, the version
   testnet runs. Don't use 0.24.0-rc (needs Rust 1.95). [VERIFIED]
2. **Yield/resume works in the sandbox.** A ~90-line mock signer (`Promise::new_yield` in `sign`, `YieldId::resume` in `respond`)
   behaves like `v1.signer-prod.testnet`: the pending state shows up ~0.6 s after submit, the tx stays `Pending`, `respond`
   resumes it, and the caller's tx returns the signature JSON. [VERIFIED]
3. **The 200-block yield timeout can be triggered in ~2.4 s** with `worker.fast_forward(250)`. The mock's callback chains to a
   panicking `fail_on_timeout`, the same structure as the real MPC, so Satchel's `on_signed` sees a failed promise and decrements
   `pending_signs`. No need to wait 200 real blocks. [VERIFIED]
4. **Send yielding calls with `transact_async()` and poll `TransactionStatus::status()`**, which returns `Poll::Pending` while
   yielded. `transact()` uses `broadcast_tx_commit` and would block or time out. Poll until `Ready` and the callback's log is present. [VERIFIED]
5. **Running the real MPC contract in the sandbox is possible but not worth it.** near/mpc's own sandbox tests deploy it with
   generated participants, `init_running` and `Attestation::Mock(MockAttestation::Valid)`, but `respond` verifies a real
   threshold signature under the derived key, so you would be writing a fake MPC node. Use the mock. [SOURCED]
6. **The sandbox binary downloads at compile time.** near-workspaces' `build.rs` fetches `near-sandbox.tar.gz` from S3 (28.9 MB
   for Darwin-arm64, 35.2 MB for Linux-x86_64; 71.5 MB unpacked) into `target/debug/build/near-sandbox-*/out/.near/near-sandbox-<ver>/`.
   `cargo clean` deletes it, so CI should cache `target/` or set `NEAR_SANDBOX_BIN_PATH`. **Intel Macs are unsupported**
   (Darwin-arm64 and Linux only). [VERIFIED/SOURCED]
7. **Speed:** a sandbox starts in 0.5–2.2 s; 5 tests run in parallel in ~10 s; 10 tests in 2 binaries take 20.9 s; a cold build +
   test with a fresh target dir took 46.8 s (311 crates). [VERIFIED]
8. **Every pattern the plan's B7 asks for is proven in sandbox tests:** non-owner rejected, transfer voids the old owner,
   approvals cleared, transfer and `list` blocked while pending, frozen blocks signing, cooldown via `fast_forward`, the
   `nft_transfer_call` revert path, storage exhaustion, failed-receipt logs. [VERIFIED]
9. **Mind block-based windows.** One sandbox `transact()` spans ~4 blocks, so a 10-block cooldown elapsed by itself across three txs.
   Use realistic windows (≥100) and move time only with `fast_forward`. [VERIFIED]
10. **JS options:** `near-sandbox@0.3.4` (Sept 2026) works (`Sandbox.start({})` 9 s, nearcore 2.13.4). `near-workspaces` (JS)
    5.0.0 dates from March 2025 and is unmaintained, so avoid it. Unit tests with near-sdk `unit-testing` + `testing_env!` work on
    5.29.1 (0.03 s run, 24 s compile). [VERIFIED]

## Verified facts & measurements

| Item | Observed | Evidence |
|---|---|---|
| Pending observable before respond | `token_state.pending_signs = 1` and mock `pending_requests()` has 1 entry **613 ms** after `transact_async` | `yield_resume_happy_path_and_transfer_hook` [VERIFIED] |
| Mock sees the contract as predecessor | `predecessor = <nft contract>`, `path = "satchel/1/evm"` | same [VERIFIED] |
| Tx state while yielded | `TransactionStatus::status()` → `Poll::Pending` | same (assert) [VERIFIED] |
| Callback after respond | `respond` 2 Tgas → tx `Ready`, return value == signature JSON; 8 receipts; 9 Tgas; 2.29 s end-to-end incl. respond | same [VERIFIED] |
| Timeout | `fast_forward(250)` 2.42 s; callback seen at once; `signature_resolved` `ok:false` at block 241 for a request at block 30 (200 + receipt hops); pending 0, `signs_failed` 1; tx success returning `null`; late `respond` fails "unknown request" | `yield_timeout_via_fast_forward` [VERIFIED] |
| Timeout semantics in source | nearcore enqueues the timeout at `apply_state.block_height + yield_timeout_length_in_blocks` (200) | nearcore `runtime/runtime/src/function_call.rs` L160-166 @2.14.0-rc.5 [SOURCED] |
| Blocks per sandbox tx | ~4 blocks per `transact()` | `sale_path_cooldown_and_freeze` [VERIFIED] |
| Sandbox versions | default 2.13.4 (protocol 86, like mainnet); 2.14.0-rc.5 (like testnet): the 5 `spike.rs` tests pass, binary downloaded at runtime (17 s run incl. download) | `test-sandbox-2.14.log` [VERIFIED] |
| Dev accounts | `dev_create_account()` = 100 NEAR each; `root_account()` for more | `network/sandbox.rs` L22 [SOURCED] |
| Download URL | `https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/{Darwin-arm64,Linux-x86_64,Linux-aarch64}/<ver>/near-sandbox.tar.gz` | `runner/mod.rs` L115-125 [SOURCED]; HEAD sizes [VERIFIED] |
| Env vars | `NEAR_SANDBOX_BIN_PATH` (use this binary, skip download), `SANDBOX_ARTIFACT_URL` (override URL), `NEAR_RPC_TIMEOUT_SECS` (default 10), `NEAR_ENABLE_SANDBOX_LOG=1` / `NEAR_SANDBOX_LOG`, `NEAR_SANDBOX_MAX_PAYLOAD_SIZE`, `NEAR_SANDBOX_MAX_FILES`; feature `global_install` → `$HOME/.near` | near-sandbox-rs src [SOURCED] |
| Unit tests | `cargo test -p spike-nft --lib`: 24.3 s compile (near-vm-runner), 0.03 s run; the wasm hash didn't change after adding the dev-dep | `unit-test.log` [VERIFIED] |
| `compile_project` | builds from source inside a test (3.8 s incremental, byte-identical) but **shells out to the installed `cargo near`** (cargo-near-build default feature `build_external`) | `compile_project_from_test`; cargo-near-build Cargo.toml [VERIFIED/SOURCED] |

## Reference — exact APIs, types, commands, tested snippets

### Layout and commands (from the spike)

```
contracts/satchel/          # product contract (crate-type cdylib)
contracts/mock-signer/      # test fixture: mimics v1.signer-prod.testnet sign/respond/timeout
contracts/test-receiver/    # optional: NEP-171 receiver for nft_transfer_call cases
tests/                      # integration-test crate (workspace member), reads target/near/*/*.wasm
```
```toml
# tests/Cargo.toml
[dev-dependencies]
near-workspaces = { version = "=0.23.0", features = ["unstable"] }   # unstable = compile_project
tokio = { version = "1", features = ["full"] }
anyhow = "1"
serde_json = "1"
```
```bash
for c in satchel mock-signer test-receiver; do cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml; done
cargo test -p tests -- --nocapture            # parallel by default; each test owns a sandbox
SANDBOX_VERSION=2.14.0-rc.5 cargo test -p tests  # if setup() honours it (see helper)
```

### Mock signer (shape mirrors near/mpc `api/sign.rs` @13f42bf; recreate on Nov 1, don't paste)

```rust
// sign({"request":{"path","payload_v2":{"Ecdsa":hex},"domain_id"}}) + 1 yocto, >= 15 Tgas  → yields
#[payable]
pub fn sign(&mut self, request: SignRequestArgs) -> Promise {
    require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "Requires 1 yocto");
    require!(env::prepaid_gas() >= Gas::from_tgas(15), "Insufficient gas");
    let id = self.next_id; self.next_id += 1;
    let (promise, yield_id) = Promise::new_yield("on_respond",
        serde_json::to_vec(&serde_json::json!({ "request_id": id })).unwrap(), Gas::from_tgas(7), GasWeight(0));
    self.pending.insert(id, PendingRequest { request_id: id, predecessor: env::predecessor_account_id(),
        request, yield_id, created_at: env::block_height() });          // IterableMap; view `pending_requests()`
    promise
}
pub fn respond(&mut self, request_id: u64, response: serde_json::Value) -> bool {   // test "MPC node"
    let p = self.pending.get(&request_id).unwrap_or_else(|| env::panic_str("unknown request"));
    p.yield_id.resume(serde_json::to_vec(&response).unwrap()).is_ok()
}
#[private]
pub fn on_respond(&mut self, request_id: u64,
    #[callback_result] response: Result<serde_json::Value, PromiseError>) -> PromiseOrValue<serde_json::Value> {
    self.pending.remove(&request_id);
    match response {
        Ok(v) => PromiseOrValue::Value(v),
        Err(_) => PromiseOrValue::Promise(Self::ext(env::current_account_id())
            .with_static_gas(Gas::from_tgas(2)).with_unused_gas_weight(0).fail_on_timeout().as_return()),
    }
}
#[private] pub fn fail_on_timeout(&self) { env::panic_str("Request has timed out."); }   // live MPC text per kb/10 (spike used a different string)
```
Signature JSON to return from the "node" (real wire shape):
`{"scheme":"Secp256k1","big_r":{"affine_point":"02<64 hex>"},"s":{"scalar":"<64 hex>"},"recovery_id":1}`.
EdDSA (Solana, `domain_id` 1) responds with `{"scheme":"Ed25519","signature":[64 bytes]}` per near/mpc `SignatureResponse`
(`#[serde(tag="scheme")]`) [SOURCED]. Confirm exact shapes against `kb/10-mpc-signer.md` (mpc agent).

Optional mock knobs worth adding: `respond_garbage(id)` (non-JSON payload, to prove `on_signed` never panics), and a
`fail_immediately` flag (panic in `sign`, to prove the immediate-failure path decrements too).

### Test helpers (tested)

```rust
use std::task::Poll;
async fn start_sign(nft: &Contract, who: &Account, id: &str) -> anyhow::Result<TransactionStatus> {
    Ok(who.call(nft.id(), "sign_for")
        .args_json(json!({ "token_id": id, "chain": "evm", "payload_hex": "aa".repeat(32) }))
        .deposit(NearToken::from_yoctonear(1)).gas(Gas::from_tgas(100))
        .transact_async().await?)                      // NOT transact(): it would block on the yield
}
async fn wait_tx(st: &TransactionStatus, max: Duration, done: impl Fn(&ExecutionFinalResult) -> bool)
    -> anyhow::Result<ExecutionFinalResult> {
    let t0 = Instant::now();
    loop {
        if let Poll::Ready(r) = st.status().await? { if done(&r) { return Ok(r); } }
        anyhow::ensure!(t0.elapsed() < max, "timed out waiting for tx");
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}
// done = |r| r.logs().iter().any(|l| l.contains("signature_resolved"))
fn err_text(r: &ExecutionFinalResult) -> String { format!("{:?}", r.clone().into_result().err()) }
// assert!(err_text(&r).contains("ERR_NOT_OWNER"))   ← panic text appears as "Smart contract panicked: ERR_NOT_OWNER"
// receipt-level failures (e.g. inside nft_transfer_call): r.receipt_failures() → format!("{:?}", outcome)
// gas: r.total_gas_burnt.as_gas() as f64 / 1e12 (Tgas; as_tgas() truncates); per receipt: r.receipt_outcomes()[i].gas_burnt
// time travel: worker.fast_forward(n).await?  (~2.4 s for 250 blocks); height: worker.view_block().await?.height()
// version: near_workspaces::sandbox_with_version("2.14.0-rc.5").await?
// tight-balance account: worker.root_account()?.create_subaccount("tight").initial_balance(NearToken::from_millinear(2650)).transact()
```

### Test matrix for Satchel (plan B7 + S-criteria), all patterns proven in the spike

| Case | How (spike reference) |
|---|---|
| S-3 non-owner `sign_for` → `ERR_NOT_OWNER` | `yield_resume_happy_path_and_transfer_hook` |
| S-3 owner sign returns signature; pending visible; tx returns signature JSON | same + mock `respond` |
| S-4 transfer A→B: A's `sign_for` fails, B's succeeds | same |
| S-5 approvals `{}` after transfer; stale approval rejected ("Sender not approved") | same |
| hook: `nft_transfer` / `list` blocked while `pending_signs > 0` | same |
| timeout path decrements pending, emits failure, late respond impossible | `yield_timeout_via_fast_forward` |
| S-6 listed: `sign_for` → `ERR_FROZEN`, `nft_transfer` → `ERR_LISTED`, `buy` → `ERR_COOLDOWN` until `fast_forward` | `sale_path_cooldown_and_freeze` |
| S-7 buy pays the seller exactly, clears the listing, bumps the epoch | same |
| `nft_transfer_call` revert: token back, approvals restored, epoch bumped twice; receiver can't sign during the window | `transfer_call_revert_and_inflight_lock` |
| storage: deposit-funded mint OK at the limit; uncharged growth → `LackBalanceForState`; top-up fixes | `storage_staking_exhaustion_and_topup` |
| events from failed receipts still visible (indexer must filter) | `failed_receipt_keeps_logs` |
| S-8 USDC `ft_transfer_call` wrong amount refunded | not spiked; needs a mock FT contract (copy near-sdk `examples/fungible-token`) or the pay agent's FT notes |
| S-10 delegate caps / voided after transfer | not spiked; same epoch pattern as approvals |

### CI (GitHub Actions sketch, ubuntu-latest)

```yaml
- uses: actions/checkout@v4
- run: rustup toolchain install 1.93.0 --profile minimal --target wasm32-unknown-unknown --component rustfmt,clippy
  # explicit; since rustup 1.28 `rustup show` no longer auto-installs the toolchain-file toolchain [ASSUMED from rustup 1.28 notes]
- run: curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/download/cargo-near-v0.22.0/cargo-near-installer.sh | sh
- uses: actions/cache@v4      # caches deps AND the sandbox binary under target/debug/build/near-sandbox-*/out/.near
  with: { path: "~/.cargo/registry\n~/.cargo/git\ntarget", key: "${{ runner.os }}-${{ hashFiles('Cargo.lock') }}" }
- run: for c in satchel mock-signer; do cargo near build non-reproducible-wasm --locked --manifest-path contracts/$c/Cargo.toml; done
- run: cargo test -p tests
```
The installer URL pattern comes from the cargo-near template's `test.yml`
(`releases/download/cargo-near-v<ver>/cargo-near-installer.sh`). [SOURCED]

## Gotchas & failure modes

- **`transact()` on a yielding call** waits on `broadcast_tx_commit` (4 retries, RPC timeout `NEAR_RPC_TIMEOUT_SECS` = 10 s) and
  can't advance blocks while it waits. Always `transact_async()` + poll.
- **`status()` can be `Ready` early**, before callbacks have their logs. The near-sdk `mpc-contract` example has a WORKAROUND
  comment about it. Poll until the callback's event is present.
- **`fast_forward` moves block height for everything:** yields expire, cooldowns pass, `block_timestamp` moves too. Order your
  assertions so the "before" checks happen before the jump.
- **Sandbox tx ≈ 4 blocks**, so block windows shrink quickly in tests.
- **`as_tgas()` truncates** integer Tgas (3.52 → 3).
- **Mock drift:** the mock must keep the real requirements (1 yocto, ≥15 Tgas prepaid, exact JSON shapes, timeout = failed
  promise, ≤1024-byte payload `max_yield_payload_size`). Re-check against `kb/10-mpc-signer.md` on Nov 1.
- **Real MPC in sandbox** needs `init_running` with a participant set and key, mock attestations, and a signer that produces valid
  threshold signatures. Out of scope.
- **Intel Macs:** no sandbox binary (`platform()` returns `None` for macos x86_64). Use Linux/Docker or CI.
- **`compile_project`** needs the `cargo-near` CLI on PATH and builds with `no_locked: true` and `skip_rust_version_check: true`.
  Prefer explicit `cargo near build --locked` in CI.
- **Shared IP rate limits** don't affect the sandbox (it's local), but they do affect testnet e2e (see `kb/22-deploy-and-lock.md`).

## Recommendations for Satchel (concrete, with priority P0/P1/P2)

- **P0** Day 1: rebuild the mock signer (from the reference above) and the test crate alongside the contract. The suite takes
  ~20 s, so run it on every change, not from Day 3.
- **P0** Cover the matrix above; always include the **timeout** test (`fast_forward(250)`). It's the only way to prove
  `pending_signs` can't get stuck.
- **P0** `pnpm test:contracts` should = `cargo near build … --locked` for each contract + `cargo test -p tests`. Prerequisites for judges in
  the README: Rust via rustup (the toolchain file installs 1.93.0 + wasm32), cargo-near 0.22.0, macOS arm64 or Linux. A cold run
  takes ~1 min.
- **P1** Add `respond_garbage` and an immediate-fail mode to the mock and assert `on_signed` still decrements.
- **P1** Run the suite once against `sandbox_with_version("2.14.0-rc.5")` (testnet's version) before submission. It passed in Phase 0.
- **P1** CI with cached `target/` (sandbox binary inside) or `NEAR_SANDBOX_BIN_PATH`.
- **P2** JS e2e against the sandbox only if the frontend needs it: `near-sandbox@0.3.4` + near-api-js 7.x. Skip `near-workspaces` (JS).
- **Alternative stack (FYI):** the cargo-near 0.22 template tests with `near-sandbox` 0.3 + `near-api` 0.8 + `cargo_near_build::build_with_cli`
  instead of near-workspaces. It works (template `cargo test` cold 1 m 51 s; integration test 40.4 s incl. in-test build + `fast_forward(200)`)
  [VERIFIED], but near-workspaces 0.23 is less code for yield polling (`transact_async`/`status`). Stick with near-workspaces.
- **If the team adopts sec's counter-free design (`kb/70` §h):** the timeout test becomes "after `fast_forward(250)` the
  `SigRecord` stays logged and `list` is allowed once `height ≥ last_sign_height + 210`". Same harness.

## Deltas vs plan (near_hackathon.md)

| Plan text | Finding | Change |
|---|---|---|
| B7 "near-workspaces-rs with a `mock-signer` contract (the sandbox has no MPC)" | Confirmed. The real MPC can run in the sandbox (near/mpc does it), but only with a hand-built fake node | Keep the mock; mirror the real wire shapes and timeout behaviour |
| B6 Day 3 "Sandbox tests with mock MPC" | Tests are cheap (20 s) and the mock is ~90 lines | Move to Day 1–2, in parallel with `sign_for` |
| B8 "keep `pending_signs` correct on timeout" | Testable in ~2.4 s via `fast_forward(250)` | Make it a required test |
| B7 "`pnpm i && pnpm test:contracts` → see sandbox tests pass (no keys)" | Needs Rust + cargo-near + arm64 macOS/Linux; first run downloads ~29–35 MB | Document the prerequisites, or point judges to a CI run/badge as well |
| B7 "`pnpm e2e:testnet` runs one real ETH sign nightly" | The near CLI's sync send hit a 30 s RPC error on a yielding call although the tx succeeded; FastNEAR's free tier rate-limits | e2e must send async + poll `EXPERIMENTAL_tx_status`; use a non-rate-limited RPC (dRPC worked) or a FastNEAR key |
| Missing | Block-height windows elapse fast in the sandbox (~4 blocks per tx) | Use realistic constants plus `fast_forward` |

## Open questions / human actions

- **Human:** confirm whether any teammate develops on an Intel Mac. If so, they need Linux/Docker for sandbox tests.
- **Human:** decide if CI (GitHub Actions) is part of the submission. A green CI badge is the cheapest "tests pass" proof for judges.
- **Open (mpc agent):** confirm the EdDSA response JSON and any newer `sign` argument changes before the mock is rebuilt on Nov 1.
- **Open:** the plan's USDC buy (S-8) needs a mock NEP-141 in the sandbox. Coordinate with the pay agent on which FT
  (testnet USDC account) and its `ft_transfer_call` semantics.
