# Keyless birth runbook (spec §5.16, plan §6, SAT-082 / SAT-090)

One transaction from `satchelhq.testnet` creates the contract account, funds it, deploys the wasm, runs `new` and
mints ids 1–7 to `alice.satchelhq.testnet`. It has **no AddKey**, so the account never has a key. If any action
fails, the whole receipt reverts and no account is left behind. A *successful* birth with a wrong argument is
permanent, which is why rc is born first from the identical batch.

Tool: `tools/deploy/keyless-birth.ts` (near-api-js 7.3.1). near-cli-rs 0.30.1 cannot add actions after
`deploy-contract`, so the CLI cannot build this batch. The sandbox test of the same batch is
`tests/tests/release.rs::{keyless_birth_batch, failed_birth_leaves_nothing}` (INV-31). The protocol path was verified
on testnet on 2026-10-21 (`research/spikes/keyless-birth/RESULTS.md`: 11 actions, 78.2 Tgas burnt, atomic on failure).

Approvals:
- **rc** (Day 9): standing approval H-20 (b).
- **final** (Day 10): the human's explicit "yes" (H-15) in the team channel, quoting the receiver and **H**. The tool
  also asks for a typed `yes` in a terminal. It refuses `--yes` and refuses piped stdin.

## 0. Preconditions (all must hold; tick each)

- [ ] `satchelhq.testnet` exists and its key is in `~/.near-credentials/testnet/satchelhq.testnet.json`.
  Check: `near account view-account-summary satchelhq.testnet network-config testnet-fastnear now`.
- [ ] The child does **not** exist: the tool's pre-check prints `PASS <child> does not exist yet`.
  For the final contract, also check that FastNEAR has no history for it:
  `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.satchelhq.testnet"}'` → `"txs_count":0`.
- [ ] `alice.satchelhq.testnet` exists, because the mints go to it.
- [ ] Reproducible wasm built **twice** with an identical SHA-256 **H** (SAT-081):
  `cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml`, then
  `shasum -a 256 target/near/satchel/satchel.wasm` (macOS) or `sha256sum target/near/satchel/satchel.wasm` (Linux).
- [ ] The sandbox suite and `tools/check-wasm-imports.sh` both pass on **that** artifact
  (`SATCHEL_WASM=… cargo test -p satchel-tests`).
- [ ] MPC `version` = `3.17.0` (the tool's pre-check, A-01).
- [ ] App host is final (D-23, H-05). `base_uri` = `https://satchelhq.vercel.app/api/card/` unless H-05 changed;
  it is immutable after birth.
- [ ] H-26 is decided: either USDC init (default) or `--no-usdc`. rc and final must use the **same** init args.
- [ ] The parent balance covers the Transfer, 7 × 0.02 NEAR and the 10× gas hold. The tool prints the requirement:
  about 5.31 NEAR for rc and 10.31 NEAR for final.
- [ ] Final only: the tag `contract-v1.0.0` is on the rc1 commit (R-29) and **H** equals the rc's on-chain code hash.

## 1. Dry run and review (no key needed)

```bash
# rc (Day 9)
pnpm --filter @satchel/tools deploy:keyless-birth \
  --child rc.satchelhq.testnet --base-uri https://satchelhq.vercel.app/api/card/ \
  --expected-sha256 <H>
# final (Day 10): --expected-sha256 is mandatory
pnpm --filter @satchel/tools deploy:keyless-birth \
  --child satchel.satchelhq.testnet --base-uri https://satchelhq.vercel.app/api/card/ \
  --expected-sha256 <H>
```

Review the printout line by line:
- [ ] signer `satchelhq.testnet`, receiver = the child;
- [ ] 11 actions in this order: CreateAccount · Transfer · DeployContract · FunctionCall `new` · FunctionCall
  `nft_mint` ×7, with **no AddKey** (the tool asserts it as well);
- [ ] Transfer is 10 NEAR (rc) or 20 NEAR (final) (D-34, revised after security review S-02);
- [ ] DeployContract sha256 = **H**;
- [ ] `new` args = `{"mpc":"v1.signer-prod.testnet","usdc":"3e2210e1…b8af"|null,"base_uri":"https://<host>/api/card/"}`,
  byte-identical to rc's;
- [ ] 7 × `nft_mint {"receiver_id":"alice.satchelhq.testnet"}` at 20 Tgas and 0.02 NEAR each; 170 Tgas in total;
- [ ] every pre-check is `PASS`.

## 2. Send

```bash
pnpm --filter @satchel/tools deploy:keyless-birth --child <child> --base-uri <uri> --expected-sha256 <H> --send
```

- The tool fetches the nonce and block hash, prints the tx hash, then asks for `yes`. Only a typed `yes` signs.
- It submits with `send_tx` `wait_until: INCLUDED` and tracks the tx to `FINAL` by hash.
- On success it verifies the result: the account exists, it has 0 access keys, its code = **H**, and ids 1–7 belong
  to alice. It then writes `docs/evidence/birth-<child>.json`.
- Record the tx hash and block **A** in the team channel.

## 3. Proofs (spec §5.16 1–6; README "Verify on-chain")

The tool prints commands 1–4 with the hash filled in:
1. `POST /v0/transactions {"tx_hashes":["<hash>"]}` lists CreateAccount, Transfer, DeployContract and FunctionCall ×8.
   It has no AddKey.
2. `near account view-account-summary <child> network-config testnet-fastnear now` →
   `Local Contract (SHA-256 checksum hex)  <H>` and `Access keys  Account is locked (no access keys)`.
   Output checked on a keyless spike account, 2026-10-22.
3. `POST /v0/account {"account_id":"<child>","is_any_signer":true}` → `{"account_txs":[],"txs_count":0}`.
4. `POST /v0/account {"account_id":"<child>","desc":false,"limit":1}` → the birth tx at block **A** is the oldest entry.
5. `cargo near build reproducible-wasm` at tag `contract-v1.0.0` → SHA-256 = **H**. After the repo is public, also
   run `near contract verify deployed-at <child> network-config testnet-fastnear now`.
6. The first `sig_records(id, 0, 1).height` is greater than **A**. Check this once records exist.

`tools/judge-snippets.sh` runs proofs 1–4 automatically once `SATCHEL_BIRTH_TX` and `SATCHEL_EXPECTED_CODE_HASH` are set.

## 4. After the birth

- [ ] USDC `storage_deposit {"account_id":"<child>","registration_only":true}` 0.00125 NEAR from `satchelhq.testnet`
  (skip if `--no-usdc`):
  `near contract call-function as-transaction 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af storage_deposit json-args '{"account_id":"<child>","registration_only":true}' prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as satchelhq.testnet network-config testnet-fastnear sign-with-legacy-keychain send`.
  `e2e:sale-usdc --register` prints and sends the same call.
- [ ] Final: switch the app (`NEXT_PUBLIC_SATCHEL_CONTRACT`, `NEXT_PUBLIC_CONTRACT_ROLE=final`,
  `NEXT_PUBLIC_EXPECTED_CODE_HASH=<H>`), then start demo staging (SAT-091/092).

## 5. Failure handling

- **The tx failed:** nothing exists (the batch is atomic) and only gas was spent. Fix the cause, re-run the dry run,
  get a new "yes", send again.
- **The tx was rejected before execution** (`NotEnoughBalance`): top up the parent and retry.
- **The birth succeeded with a wrong argument:** this is permanent. Fall back to `satchel-v2.satchelhq.testnet` with new
  addresses and new funding (plan §6.9). There is never a key on the account, so no trust window needs disclosing.
