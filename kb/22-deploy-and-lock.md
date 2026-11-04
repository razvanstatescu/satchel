# Deploy & lock: immutable testnet contract, storage staking, reproducible build & source verification

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: sdk · Checked: 2026-10-21 · Confidence: high
> Primary sources: testnet rehearsal on `lock1.satchel-spk-sdk-e9ea1a.testnet` and `hello.satchel-spk-sdk-e9ea1a.testnet`
> (`research/spikes/sdk/RESULTS.md` §5–6, logs in `research/spikes/sdk/logs/`); cargo-near `cargo-near-v0.22.0` README;
> NEP-330, NEP-591 (NEPs master); nearcore `2.14.0-rc.5` `core/parameters/res/runtime_configs/*.yaml`; SourceScan
> verification-guide (github.com/SourceScan/verification-guide); live RPC (testnet PV 87 / mainnet PV 86).

## TL;DR — what an implementer must know

1. **The full flow was rehearsed on testnet.** Create the sub-account (0.007 NEAR creation charge), run `cargo near deploy … with-init-call`
   (261.6 KB + init = 23.1 Tgas), use the contract, then delete its only full-access key. After that `near account list-keys` prints an
   empty table and `near account view-account-summary` says **"Access keys: Account is locked (no access keys)"** next to the
   contract's SHA-256. The locked contract kept working: a `sign_for` through the real `v1.signer-prod.testnet` succeeded after the lock. [VERIFIED]
2. **Locking is irreversible.** With no key nobody can redeploy, delete the account or move its NEAR except through contract logic.
   A bug fix needs a **new account**, and a new contract account means **new derived BTC/EVM/SOL addresses** (the MPC derivation
   uses the contract account as predecessor). Funds already in old Satchels stay controlled by the old contract. [VERIFIED lock; SOURCED derivation in kb/10]
3. **So don't lock on Day 2.** Develop on the final account id with its key kept. Redeploying in place keeps every derived address,
   because derivation depends on the account id + path, not the code. Lock once, after the last code change (≈ Day 11–12), then
   mint and fund the demo Satchels. [VERIFIED redeploy keeps state; ASSUMED schedule]
   **Until it's locked, the key holder controls every Satchel's funds.** A full-access key on the contract account can send a tx
   straight to `v1.signer-prod.testnet.sign` with the contract as predecessor and any `satchel/{id}/…` path (`kb/70` §9/§o). Function-call
   keys can't, because they can't attach the required 1 yocto (`kb/10`). So "trustless" claims, the README badge and judge demos only
   apply after the lock.
4. **Storage staking:** the account must always hold `storage_usage × 1e19` yocto. The nft-spike code alone is 262 KB → 2.62 NEAR
   locked. Uncharged state growth uses the liquid balance until calls fail with `LackBalanceForState`. Anyone can top up a
   locked account with a plain transfer. [VERIFIED]
5. **The contract pays for its own state growth unless each call charges for it.** Use measure → flush → `refund_deposit_to_account`
   on mint, `sign_for` (SigRecord), `list` and delegates. NEP-171 transfers can't carry a deposit (exactly 1 yocto) and cost the
   contract +180 B per new owner, so keep a buffer (≥5 NEAR on testnet). [VERIFIED]
6. **The CLI can report false errors.** `delete-keys` printed "Public key … doesn't exist" because its retry hit the key the first
   broadcast had already deleted, and a yielding `sign_for` reported an RPC "Internal server error" after 30 s although it succeeded.
   Always confirm on-chain (`list-keys`, view state, tx status). [VERIFIED]
7. **Reproducible build:** `cargo near build reproducible-wasm` (Docker `sourcescan/cargo-near:0.22.0-rust-1.99.1`, amd64-only image,
   emulated on Apple Silicon) took 5 m 25 s, then 4 m 34 s, and gave **bit-identical** wasm. Deploying it fills NEP-330
   `build_info` (image digest, command, `git+…?rev=<commit>`) in `contract_source_metadata`. [VERIFIED]
8. **Judges can check the code three ways.** (a) `view-account-summary` SHA-256 == `cargo near build reproducible-wasm` SHA-256 at the
   tagged commit. (b) The NearBlocks "Verify and Publish" button (SourceScan), which needs a **public** repo. (c) `near contract verify deployed-at <acct>
   network-config testnet now` (built into near-cli-rs 0.30). It rebuilds in Docker from the on-chain NEP-330 `source_code_snapshot` and printed
   **"The code obtained from the contract account ID and the code calculated from the repository are the same."** (5 m 38 s; run with
   `--use-contract-source-code-path` because the spike repo isn't public). Worth doing once, at the final deploy (P1). [VERIFIED (a)(c), SOURCED (b)]
9. **NEP-591 global contracts don't help.** Deploying "as global hash" makes the code blob immutable but **burns 0.0001 NEAR/byte**
   (10× staking: ~20–26 NEAR for this contract), and the account using it can still switch code while it has a key. Locking is still
   what makes it immutable. Skip. [SOURCED]
10. **RPC reality (2026-10-21):** `rpc.testnet.near.org` answers queries with -429 "THIS ENDPOINT IS DEPRECATED"; FastNEAR's free tier
    (also the near CLI default `archival-rpc.testnet.fastnear.com`) rate-limited our shared IP (14/15 requests -429);
    `https://near-testnet.drpc.org` worked. Add a CLI connection for it. [VERIFIED]

## Verified facts & measurements

| Step | Command (abridged) | Result |
|---|---|---|
| Create sub-account | `near account create-account fund-myself lock1.<acct> '3.5 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as <acct> network-config testnet sign-with-legacy-keychain send` | tx `6iehbDthAYEUuGwMgW7maXFEZ4gBsqRGHQCwKmWka8at`; the new-account receipt burns ~0.00703 NEAR (0.007 `account_creation_charge`, PV 85+) [VERIFIED] |
| Build + deploy + init | `cargo near deploy build-non-reproducible-wasm --manifest-path contracts/nft-spike/Cargo.toml lock1.<acct> with-init-call new json-args '{"signer":"v1.signer-prod.testnet"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send` | tx `AovRm6dMA35mGezv8aGpNT6wa7H5Xos3S2EG5GHTMn4Q`, **23.13 Tgas**, 10 s incl. incremental build; `code_hash` `4XyJQ81n…ks6W` = bs58 SHA-256 from the build [VERIFIED] |
| Use | `nft_mint` with 0.1 NEAR | tx `AdAnrXvv…UGQ9`, 3.91 Tgas, 682 B, excess refunded [VERIFIED] |
| Lock | `near account delete-keys lock1.<acct> public-keys ed25519:5Yjv… network-config testnet sign-with-legacy-keychain send` | tx `8yEpkL3vGbQzCPD6TzbzHwLKmF1q8sUskNCmMQ1azBZE`, 0.63 Tgas; CLI printed a false error (see Gotchas) [VERIFIED] |
| Proof | `near account list-keys lock1.<acct> network-config testnet now` | empty table (output below) [VERIFIED] |
| Proof | `near account view-account-summary lock1.<acct> network-config testnet now` | `Local Contract (SHA-256 checksum hex) 348224c5…754f`, `Access keys  Account is locked (no access keys)`, `Storage used by the account 262.7 KB`, balance 3.504 NEAR [VERIFIED] |
| Still works after lock | owner `sign_for` → real MPC | tx `79w91Sc1Sg5JJfRRiF1bGq2Q48JRQdjShC1qbWHF49kL`, 13.40 Tgas, signature returned, `pending_signs` back to 0 [VERIFIED] |
| Storage staking | `storage_usage` 262,095 B → 2.62095 NEAR must stay on the account; liquid was 0.877 NEAR | `view_account` [VERIFIED] |
| Exhaustion (sandbox) | account with 0.0165 NEAR liquid: 18 uncharged 151 B writes, then `LackBalanceForState {account_id, amount}`; a deposit-funded mint still succeeds; 0.05 NEAR plain transfer → writes work again | `storage_staking_exhaustion_and_topup` [VERIFIED] |
| Transfer growth (sandbox) | first transfer to a new owner +180 B on the contract; emptying an owner set −180 B | `transfer_storage_delta` [VERIFIED] |
| Redeploy keeps state | redeployed `hello.` with the reproducible artifact, `without-init-call`; `get_greeting` still `"satchel"` | tx `2V5M3AguBR2VvdejB9xC8146uwmvudWqgCxUBDkCdrD7` [VERIFIED] |
| Reproducible build | `cargo near build reproducible-wasm` in a standalone repo (`Cargo.lock` committed, clean tree) | run 1 5:25 (incl. image pull), run 2 4:34; both SHA-256 `2699fdba…42807`; inside the container `RUSTUP_TOOLCHAIN=1.99.1` (the repo's `rust-toolchain.toml` is ignored) [VERIFIED] |
| NEP-330 on chain | `contract_source_metadata` | reproducible: `build_info{build_command, build_environment:"sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…", source_code_snapshot:"git+https://github.com/<repo>?rev=<commit>", contract_path:"", output_wasm_path}`, `link:".../tree/<commit>"`; non-reproducible: `build_info: null`, `link` = `package.repository` [VERIFIED] |

Locked `list-keys` output, ready for the README:
```
$ near account list-keys satchel.<team>.testnet network-config testnet now
+---+------------+-------+-------------+
| # | Public Key | Nonce | Permissions |
+---+------------+-------+-------------+
+---+------------+-------+-------------+
```

## Reference — exact APIs, types, commands, tested snippets

### One-time CLI setup (avoids the shared rate-limited default)

```bash
near config add-connection --network-name testnet --connection-name testnet-drpc \
  --rpc-url https://near-testnet.drpc.org/ --wallet-url https://testnet.mynearwallet.com/ \
  --explorer-transaction-url https://testnet.nearblocks.io/txns/        # then use: network-config testnet-drpc
```
[SOURCED: option names from `near config add-connection --help` (near-cli-rs 0.30.1). Other options: `--rpc-api-key`
(FastNEAR paid key) and `--tx-wait-until <TX_WAIT_UNTIL>`. The latter controls how long `send` waits, which may help with long
yielding calls; untested. The spike didn't modify the shared config: it ran the CLI with an isolated `HOME=.clihome` config whose
`testnet` entry points at dRPC. If you do that for `cargo near deploy`, keep `CARGO_HOME`/`RUSTUP_HOME` (and `DOCKER_CONFIG` for
Docker builds) pointing at the real dirs.]

### Final release runbook (Day 11–12; `<team>`/`<acct>` are placeholders)

```bash
# 0. Clean tree, Cargo.lock committed, tag pushed to the public repo (needed for verification links)
git tag v1.0.0 && git push origin v1.0.0
# 1. Account (skip if it already exists: redeploying in place keeps derived addresses)
near account create-account fund-myself satchel.<team>.testnet '10 NEAR' autogenerate-new-keypair \
  save-to-legacy-keychain sign-as <team>.testnet network-config testnet sign-with-legacy-keychain send
# 2. Reproducible build + deploy + init (or `cargo near build reproducible-wasm` then `near contract deploy … use-file`)
cargo near deploy build-reproducible-wasm satchel.<team>.testnet with-init-call new \
  json-args '{"mpc":"v1.signer-prod.testnet","usdc":"<usdc>.testnet"}' prepaid-gas '100.0 Tgas' \
  attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
# 3. Smoke test (mint, sign, transfer) BEFORE locking
# 4. Lock: delete every key (list first; delete all full-access AND function-call keys; comma-separated list per --help)
near account list-keys satchel.<team>.testnet network-config testnet now
near account delete-keys satchel.<team>.testnet public-keys ed25519:<pk1>,ed25519:<pk2> network-config testnet sign-with-legacy-keychain send
# 5. Prove it (README)
near account list-keys satchel.<team>.testnet network-config testnet now                 # empty table
near account view-account-summary satchel.<team>.testnet network-config testnet now      # "Account is locked (no access keys)" + SHA-256
near contract call-function as-read-only satchel.<team>.testnet contract_source_metadata json-args '{}' network-config testnet now
# 6. Optional: NearBlocks → contract → "Contract Code" → "Verify and Publish" → "Verify Contract" (repo must be public)
```
Notes: `cargo near deploy build-reproducible-wasm` additionally requires the commit to be **pushed** to `package.repository`
[SOURCED cargo-near README]. Keep the old key file until step 5 succeeds. **Function-call access keys must be deleted too.**
They can't deploy code, but they can call any method and spend the key's gas allowance. [ASSUMED best practice]

### Storage math (1e19 yocto per byte, 40 B overhead per record)

| Item | Bytes | NEAR |
|---|---|---|
| Contract code (spike, default build) | 261,634 | 2.62 |
| Contract code (cdylib-only, no ABI) | 204,532 | 2.05 |
| Per mint (NFT records + metadata + small state) | 682–708 | 0.0068–0.0071 |
| Per signature record (estimate, flat map) | ~94 | ~0.00094 |
| Per delegate (estimate) | ~145 | ~0.00145 |
| First transfer to a new owner (contract-paid) | 180 | 0.0018 |
| Approval entry (`bytes_for_approved_account_id` = len(account) + 4 + 8) | 12 + len(id) | ~0.0004 for a 30-char id (charged to the owner by `nft_approve`) |

How the contract pays for growth (pattern, see kb/20): measure `env::storage_usage()` before, mutate, `flush()` the store
collections, measure after, and `refund_deposit_to_account(used, payer)`. The latter panics `"Must attach X to cover storage"` if
the deposit is short and refunds the excess. Shrinking state frees the stake back to the contract's liquid balance; refund it to
users only if you track who paid. The NFT standard refunds approvals on revoke but not when transfers clear them. [VERIFIED/SOURCED]

### Pre-lock upgrades (Days 1–11)

- Redeploy code in place: `cargo near deploy build-non-reproducible-wasm satchel.<team>.testnet without-init-call network-config testnet sign-with-legacy-keychain send`.
  The state stays; it must still deserialize. [VERIFIED with `hello.`]
- If the `Contract` struct layout changes: add a `#[private] #[init(ignore_state)] pub fn migrate() -> Self` that reads the old
  struct with `env::state_read::<OldContract>()` and returns the new one, or wipe state by deleting and recreating the account
  (same id → same derived addresses; NFTs are lost and must be re-minted in the same order so ids/paths match). [SOURCED near-sdk `#[init(ignore_state)]` doc; ASSUMED wipe workflow]
- Never rename the contract account between funding and the demo: renaming changes every derived address.

### Source verification paths (§verify)

```bash
# (c) near-cli-rs built-in: rebuilds in Docker per NEP-330 build_info and compares the code hash
near contract verify deployed-at satchel.<team>.testnet network-config testnet now          # clones source_code_snapshot (public repo)
near contract verify --use-contract-source-code-path ./ deployed-at satchel.<team>.testnet network-config testnet now   # local checkout
```
Observed output [VERIFIED on `hello.satchel-spk-sdk-e9ea1a.testnet`, 5 m 38 s under QEMU on Apple Silicon]:
```
The code obtained from the contract account ID and the code calculated from the repository are the same.
  Contract code hash: 3bggckjtTgYXH2q9aWuzrhbNhMehKkRY61RoBqmurkaS
  Contract version: 0.1.0
  Standards used by the contract: [nep330:1.3.0]
  View the contract's source code on: https://github.com/<repo>/tree/<commit>
  Build Environment: sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…
  Build Command: cargo near build non-reproducible-wasm --locked
```
Other options: `--save-contract-source-code-into <dir>` and `--no-image-whitelist` (the image must otherwise be on the CLI's whitelist;
sourcescan images passed). For a README, (a) is the cheapest for judges (no Docker needed to *compare*, only to rebuild).
(c) is the strongest single command.

### Global contracts (NEP-591), for completeness

```bash
near contract deploy-as-global use-file satchel.wasm as-global-hash <payer> network-config testnet sign-with-legacy-keychain send
near contract deploy satchel.<team>.testnet use-global-hash <code_hash> with-init-call new json-args '{…}' …
```
Cost: `global_contract_storage_amount_per_byte = 0.0001 N` (10× `storage_amount_per_byte`) since PV 77 (nearcore `77.yaml`),
**burned** not staked. "Contracts deployed by hash are effectively immutable" (NEP-591), but immutability of the *account* still
requires deleting its keys. [SOURCED; not deployed — would burn ~20–26 NEAR]

## Gotchas & failure modes

- **Irreversibility:** no keys means no upgrade, no `DeleteAccount`, no withdrawal of excess NEAR. Testnet only; never lock a mainnet
  contract before an audit (the plan already says so).
- **False CLI errors:** near-cli-rs's `send` retries `broadcast_tx_commit`. If the first attempt executed (key deleted, or a yielded
  tx later succeeded), the retry reports an error. Check `list-keys`, view state, or `EXPERIMENTAL_tx_status`
  (`POST https://tx.test.fastnear.com/v0/account {"account_id": …}` lists an account's tx hashes).
- **Yielding calls via the CLI:** `sign_for` can outlast the RPC's commit timeout ("Internal server error" after 30 s with dRPC).
  For scripts, send async and poll the tx status.
- **Docker on Apple Silicon:** the images are amd64-only (`WARNING: The requested image's platform (linux/amd64) does not match…`,
  QEMU), so builds take ~5 min. On an x86_64 CI runner it should be faster [ASSUMED]. Docker must be running, and the git tree
  must be clean (cargo-near clones HEAD; uncommitted changes are ignored).
- **NearBlocks testnet lag:** its account API returned no txns ~10 min after ours, so don't make README proof links depend on indexing.
- **Storage stake vs liquid:** `view-account-summary` shows the total balance. The spendable part is `balance − storage_usage×1e19`.
  Watch it on the locked contract (top up with `near tokens <acct> send-near satchel.<team>.testnet '2 NEAR' network-config testnet
  sign-with-legacy-keychain send`; syntax from `--help`).
- **cargo-near and near-cli config ping-pong:** cargo-near 0.22 rewrites `~/Library/Application Support/near-cli/config.toml` as
  "V4" and near-cli 0.30.1 migrates it back to "V5". Content survived; harmless, but expect the messages.

## Recommendations for Satchel (concrete, with priority P0/P1/P2)

- **P0** Don't lock on Day 2. Deploy `satchel.<team>.testnet` on Day 1–2 with the key kept and redeploy in place (with a migration
  when the layout changes). Lock right after the final deploy (feature freeze, Day 10–12), then mint and fund the demo Satchels.
- **P0** README "locked" proof = the `list-keys` empty table + `view-account-summary` "Account is locked (no access keys)" line +
  the contract SHA-256. All three run in seconds for judges.
- **P0** Fund the final contract account with ≥5–10 NEAR (code stake ~2–2.6 NEAR plus a buffer for transfer-time growth).
  Testnet NEAR is free from the faucet.
- **P1** Final deploy from a reproducible build at tag `v1.0.0` on the public repo. Add to the README: "SHA-256 of
  `cargo near build reproducible-wasm` at v1.0.0 = `<hex>` = Local Contract hash shown by `near account view-account-summary`". Click
  "Verify and Publish" on NearBlocks once the repo is public (Nov 13). Budget ~15 min on an Apple Silicon Mac.
- **P1** Build with `crate-type = ["cdylib"]` to cut ~0.5 NEAR of stake and stay well under the 1.5 MiB tx size limit.
- **P2** Skip global contracts.

## Deltas vs plan (near_hackathon.md)

| Plan text | Finding | Change |
|---|---|---|
| B6 Day 2 "deploy + lock" | Locking freezes the code; every later feature (Days 7–10) would need a new account, i.e. new derived addresses and re-funding (BTC testnet4 faucets are slow) | Deploy Day 1–2 **unlocked**; lock at feature freeze / final deploy (Day 10–12) |
| B5 "Lock: delete the full-access key after init; README shows `near account list-keys` returning none" (L192) | Confirmed: the empty table, plus `view-account-summary` "Account is locked (no access keys)" | Use both lines in the README; delete function-call keys too |
| B8 "Locked contract bug → redeploy as `satchel-v2`" | A v2 account derives **different** addresses; old funds stay with v1 (which still works) | Say so in the fallback; keep v1 operational to move funds |
| B7 README step 3 commands | Correct for near-cli-rs 0.30.1 (`… network-config testnet now`) | Add the SHA-256/verification line; warn that the default testnet RPC may rate-limit |
| B2 Phase 1 "locked testnet contract" (L87) | Locked accounts still need balance for storage; anyone can top up by transfer | Add a contract-balance check to the pre-demo checklist |
| Missing | Reproducible build + NEP-330 + NearBlocks verification is ~15 min of work and gives judges a strong signal | Add as P1 on Day 12 |
| Missing | Global contracts (NEP-591) | Not useful for Satchel; skip |

## Open questions / human actions

- **Human:** choose and create the team account `<team>.testnet` and the contract id `satchel.<team>.testnet` (it appears in README,
  derivation and judging). Fund it with ≥10 testnet NEAR.
- **Human:** make the repo public before clicking NearBlocks "Verify and Publish" (Nov 13), and push the release tag before the reproducible deploy.
- **Human:** keep the contract key file (`~/.near-credentials/testnet/satchel.<team>.testnet.json`) until the lock is verified, then
  the key is useless (deleted on-chain) and can be removed.
- **Open:** NearBlocks testnet verification wasn't exercised end-to-end (no public repo in Phase 0). Do a dry run on Day 12 with the real repo.
