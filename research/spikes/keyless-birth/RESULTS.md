# Keyless-birth spike (A-17) — RESULTS

> Throwaway Phase 0 spike, run by the orchestrator on 2026-10-21 (~15:00 UTC). Never import into the product.
> Question: can `<team>.testnet` create `satchel.<team>.testnet` **with no access key ever** and, in the same
> transaction, deploy the contract, run `new`, and mint the demo ids (spec §5.16, decision D-02 / D-28)?
> Contract used: the vendored near-workspaces example NFT
> (`research/spikes/sdk/vendor/near-workspaces-rs/examples/res/non_fungible_token.wasm`, 316,080 B,
> SHA-256 `97aecbe063628d270ca5578226f0c8f929dbc24fe053b9089254fd34ec3b5683`).

## Results

| # | Test | Sender → new account | Result | Evidence |
|---|---|---|---|---|
| 1 | **4-action keyless birth via near-cli-rs 0.30.1**: CreateAccount, Transfer 4 NEAR, DeployContract `with-init-call new_default_meta` | `satchel-spk-chain-e9ea1a.testnet` → `kb1.satchel-spk-chain-e9ea1a.testnet` | **PASS**: 16.2 Tgas burnt, ~5 s | tx `2PgLKhA7XfEpLXpRYjV54kkY3Lu1rLUvAXydqsMdSU3K` (`command.txt`, `run-cli4.log`) |
| 2 | **11-action keyless birth via near-api-js 7.3.1**: CreateAccount, Transfer 4 NEAR, DeployContract, FunctionCall `new_default_meta`, FunctionCall `nft_mint` ×7 | same sender → `kb2.satchel-spk-chain-e9ea1a.testnet` | **PASS**: `SuccessValue`, 78.2 Tgas burnt (170 Tgas prepaid), 4.5 s to FINAL; tokens 1–7 minted in order | tx `2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR` (`batch11.mjs`, `run-batch11.log`) |
| 3 | **Atomicity**: the same 11-action batch, but mint #7 attaches 0 deposit | `satchel-spk-web-e9ea1a.testnet` → `kb3.satchel-spk-web-e9ea1a.testnet` | **PASS**: the tx fails at action index 10 (`Must attach 4100000000000000000000 yoctoNEAR to cover storage`). Afterwards `kb3` is `UNKNOWN_ACCOUNT`, and the sender's net cost is only 0.007455 NEAR of gas: the 4 NEAR transfer and the mint deposits were refunded | tx `DdXHj1EQEovfuimwA4dbnnPYYUZh4QrdHbuGQYJU5bph` (`batch11-fail.mjs`, `run-batch11-fail.log`) |
| 3a | (first attempt from the chain account) | — | rejected *before execution* with `InvalidTxError::NotEnoughBalance`: the tx cost of 4.266 NEAR (transfer + deposits + gas hold at 10× price) exceeded the 1.94 NEAR balance. No state change | `run-batch11-fail.log` (overwritten), see this note |

## Proofs for judges, checked on `kb1` (all PASS)

| Check | Command | Output |
|---|---|---|
| Account exists | RPC `view_account` | balance 4.0 NEAR, storage_usage 317,380 |
| No keys | RPC `view_access_key_list` | `0` keys (and `kb2` also has `0` keys) |
| Code = published wasm | base58-decode `code_hash` | `97aecbe0…5683`, equal to `shasum -a 256` of the wasm |
| Birth tx has no AddKey | RPC `tx` | actions `['CreateAccount','Transfer','DeployContract','FunctionCall']`, `SuccessValue` |
| Never signed anything (incl. delegated) | `POST https://tx.test.fastnear.com/v0/account {"account_id":…,"is_any_signer":true}` | `txs_count: 0` |
| No earlier incarnation | same endpoint, unfiltered | exactly 1 tx (the birth, block 274,111,615): `is_receiver: true`, every signer flag false |

## Findings to fold into the spec and plan

1. **A-17 is VERIFIED.** The protocol accepts a keyless multi-action birth: after `CreateAccount`, the receipt acts with the new account's permissions, so `DeployContract` and the follow-up `FunctionCall`s are allowed. Inside the contract, `predecessor` = the sender.
2. **Atomic and refundable.** A failure in any action reverts the whole receipt, including `CreateAccount`, and refunds the Transfer and deposits. A failed birth can be fixed and re-sent under the same name.
3. **near-cli-rs 0.30.1 cannot construct the 11-action form.** After `add-action deploy-contract use-file … with-init-call …|without-init-call`, the only allowed subcommand is `skip`, so no actions can follow DeployContract. The CLI form written in spec §5.16 (`without-init-call` followed by more `add-action`s) fails with `unrecognized subcommand 'add-action'`. Two working options:
   - **(i) CLI-compatible:** 4 actions (CreateAccount, Transfer, DeployContract `with-init-call new`). `new` mints the demo ids itself (e.g. an init argument `genesis_owners: Vec<AccountId>` minting ids 1..k). This is atomic and race-free like the 11-action form, needs no extra tool, and runs as a single CLI command (verified as test 1).
   - **(ii) Script:** a near-api-js 7.3.1 release script that builds the full action list (verified as test 2). This is the plan's fallback tool `tools/deploy/keyless-birth.ts`.
4. **Gas:** 78.2 Tgas burnt for a 316 KB wasm, init and 7 mints, against the spec's estimate of ≈ 50. Keep ≥ 170 Tgas prepaid; 200 Tgas is a comfortable margin. Tx cost accounting: the sender must hold transfer + deposits + prepaid gas × gas price × 10 (the gas hold) in balance, or the tx is rejected up front.
5. **A-20 becomes moot for the keyless path:** an account that never had a key cannot sign anything, delegated actions included. FastNEAR's `is_any_signer` returns 0 as expected.

## Cost
About 8.1 testnet NEAR are locked in the throwaway `kb1` and `kb2` accounts, which are keyless, so the NEAR cannot be recovered. That's harmless on testnet. Gas spent ≈ 0.01 NEAR in total.
